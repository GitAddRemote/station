# Rootless Docker Migration — station-bot VPS

**Date:** 2026-05-07
**Host:** Cloud VPS (Ubuntu 24.04.4 LTS)
**Scope:** Migrated the `deploy` user's containers from the root Docker daemon to rootless Docker, removing `docker` group membership.

---

## Why

The `docker` group is root-equivalent. Any process that can reach `/var/run/docker.sock` can mount the host filesystem, run privileged containers, and escalate to root. If the deploy SSH key were ever leaked, an attacker would have had full root access to the host.

Rootless Docker runs the daemon entirely inside the deploy user's own namespace. The socket lives at `/run/user/<uid>/docker.sock` and is inaccessible to every other user. A compromised deploy key can only affect the deploy user's containers — nothing else on the host.

---

## What changed

- Rootless Docker daemon installed and running as the `deploy` user via `systemd --user`
- `DOCKER_HOST` and `PATH` written to `~deploy/.bashrc` so interactive sessions use the rootless socket automatically
- `deploy` removed from the `docker` group
- All containers (postgres, discord-bot) migrated to the rootless daemon with data intact
- Postgres data preserved via `pg_dump` / `psql` restore across daemons

---

## Prerequisites installed

```bash
apt install -y uidmap dbus-user-session
loginctl enable-linger deploy
```

- **`uidmap`** — provides `newuidmap`/`newgidmap`, the kernel tools that make user namespace ID mapping work. Required by rootlesskit, which underlies rootless Docker.
- **`dbus-user-session`** — enables per-user D-Bus sessions, which `systemd --user` needs to manage user-scoped services like the rootless Docker daemon.
- **`loginctl enable-linger`** — keeps the deploy user's systemd session alive after logout so the Docker daemon stays running without an active SSH session.

---

## AppArmor profile

Ubuntu 24.04 sets `/proc/sys/kernel/apparmor_restrict_unprivileged_userns=1` by default, which blocks rootlesskit from creating user namespaces. An explicit AppArmor profile is required to allow it:

```bash
cat <<EOT | sudo tee "/etc/apparmor.d/home.deploy.bin.rootlesskit"
abi <abi/4.0>,
include <tunables/global>

/home/deploy/bin/rootlesskit flags=(unconfined) {
  userns,
  include if exists <local/home.deploy.bin.rootlesskit>
}
EOT
sudo systemctl restart apparmor.service
```

This grants rootlesskit permission to use user namespaces without granting broader privileges.

---

## Migration steps (for reference on future VPS)

See the full runbook in [`vps-setup.md`](./vps-setup.md#migrating-an-existing-vps-to-rootless-docker).

Summary:

1. Install prerequisites as root (no downtime)
2. Install rootless Docker as deploy (no downtime)
3. `pg_dump` while root daemon still running (no downtime)
4. `docker compose down`, activate rootless in session, start rootless daemon (downtime starts)
5. Write `.bashrc`, start postgres under rootless, restore data, start bot (downtime ends ~2 min)
6. `gpasswd -d deploy docker` as root, verify in a fresh SSH session

---

## Verification

After migration, in a fresh SSH session as deploy:

```bash
docker info | grep -i rootless   # should output: rootless
groups                           # docker should NOT appear
docker compose -f /opt/station-bot/docker-compose.prod.yml ps
```

---

## Effect on deployments

No change to the deployment workflow. SSH in as deploy, run the usual docker compose commands. `.bashrc` sets `DOCKER_HOST` automatically on login.

---

## Post-mortem

### Issue 1 — `set -a; source .env.production` executed non-variable lines as shell commands

**What happened:** The `.env.production` file contains human-readable comments and descriptive text without `#` prefixes. Sourcing it with `set -a` caused bash to attempt to execute those lines as commands, producing errors like `Member: command not found`.

**Fix:** Extract only the needed variables directly:

```bash
POSTGRES_USER=$(grep '^POSTGRES_USER=' .env.production | cut -d= -f2)
POSTGRES_DB=$(grep '^POSTGRES_DB=' .env.production | cut -d= -f2)
```

**Lesson:** `set -a; source` assumes every non-comment line is a valid variable assignment. It's brittle against env files written for human readability. Either enforce strict `KEY=value` formatting in env files, or extract specific variables when sourcing them in scripts.

---

### Issue 2 — `FORCE_ROOTLESS_INSTALL=1` prefix only applied to `curl`, not to `sh`

**What happened:** Running `FORCE_ROOTLESS_INSTALL=1 curl ... | sh` sets the variable in `curl`'s environment, not in the piped `sh` process. The installer still aborted.

**Fix:** Place the variable before `sh`:

```bash
curl -fsSL https://get.docker.com/rootless | FORCE_ROOTLESS_INSTALL=1 sh
```

**Lesson:** In a pipeline, each process inherits from the shell — not from the previous process in the pipe. Environment variable prefixes only apply to the command they immediately precede.

---

### Issue 3 — AppArmor blocked rootlesskit on Ubuntu 24.04

**What happened:** Ubuntu 24.04 restricts unprivileged user namespaces via AppArmor by default. The rootless Docker installer failed with `fork/exec /proc/self/exe: permission denied`. The installer printed the fix but the AppArmor profile wasn't created before the first install attempt.

**Fix:** Create the AppArmor profile for rootlesskit and restart the apparmor service before installing rootless Docker. See the profile above.

**Lesson:** Ubuntu 24.04 is more locked down than previous LTS versions in this regard. The rootless Docker docs mention this but it's easy to miss. On any new Ubuntu 24.04 VPS, create the AppArmor profile as a prerequisite step before attempting rootless Docker installation.

---

### Issue 4 — Partial failed install blocked the retry

**What happened:** After the AppArmor fix, the installer detected the partial installation from the first failed attempt and refused to proceed.

**Fix:** Clean up the partial install before retrying:

```bash
systemctl --user stop docker
/home/deploy/bin/dockerd-rootless-setuptool.sh uninstall -f
rm -f /home/deploy/bin/dockerd
rm -rf /home/deploy/.local/share/docker
```

**Lesson:** The rootless Docker installer is not idempotent when a previous run failed partway through. Always clean up before retrying a failed install.

---

### Issue 5 — Post-install, docker commands targeted the rootless daemon instead of root daemon

**What happened:** The installer switched the Docker CLI context to "rootless" on completion. Phase 3 (pg_dump) runs against the root daemon where station-bot's containers live, but after install `docker exec` was hitting the empty rootless daemon, producing `No such container`.

**Fix:** Explicitly target the root daemon socket for Phase 3 commands:

```bash
DOCKER_HOST=unix:///var/run/docker.sock docker exec station-bot-postgres pg_dump ...
```

**Lesson:** After installing rootless Docker, the CLI context changes immediately. Any commands that still need to reach the root daemon must override `DOCKER_HOST` explicitly until the cutover is complete.
