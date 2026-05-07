# VPS Setup — Deploy User Hardening

## Overview

The deploy SSH key lives in GitHub Secrets and is used on every deployment. If it were leaked, the attacker should only be able to run deploy-related Docker operations — nothing more. This is achieved with rootless Docker: the deploy user runs their own Docker daemon entirely within their user namespace, with no root socket and no docker group membership. A compromised key cannot escalate to root or affect any other service on the host.

## Approach: rootless Docker

The deploy user's Docker daemon runs unprivileged inside a user namespace. There is no `/var/run/docker.sock` accessible to the deploy user — the socket lives at `/run/user/<uid>/docker.sock` and is owned entirely by that user.

`bootstrap-vps.sh` handles the full setup:

- Installs `uidmap` and `dbus-user-session` prerequisites
- Enables linger so the deploy user's systemd session persists without an active login
- Sets `DOCKER_HOST` and `PATH` in `~deploy/.bashrc`
- Installs rootless Docker via `curl -fsSL https://get.docker.com/rootless | sh` (run as the deploy user)
- Enables and starts the `docker` systemd user service

The deploy scripts (`deploy.sh`, `backup-db.sh`, etc.) call `docker compose` directly — no `sudo` required.

## Pre-check results (recorded 2026-05-07)

| Check                                         | Result                                  |
| --------------------------------------------- | --------------------------------------- |
| `/proc/sys/kernel/unprivileged_userns_clone`  | `1` ✓                                   |
| `newuidmap` installed                         | No — installed via `uidmap` apt package |
| `unshare --user sh -c "echo namespaces work"` | `namespaces work` ✓                     |

## Verification

After running `bootstrap-vps.sh`, SSH in as the deploy user and confirm:

```bash
# Docker daemon is running
systemctl --user status docker

# Docker works without sudo or docker group
docker run hello-world

# No root socket access
ls /var/run/docker.sock   # deploy user should get permission denied
groups                    # should NOT include 'docker'
```

## Security properties

| Capability                     | Before (docker group) | After (rootless) |
| ------------------------------ | --------------------- | ---------------- |
| Run containers                 | ✓                     | ✓                |
| Access root Docker socket      | ✓ (root-equivalent)   | ✗                |
| Escalate to root via Docker    | ✓                     | ✗                |
| Affect other users' containers | ✓                     | ✗                |
| Survive deploy key compromise  | ✗                     | ✓                |

## Reproducing on a fresh VPS

`bootstrap-vps.sh` is fully automated. Prerequisites, linger, rootless install, and service enable/start are all handled. After the script completes, verify with the commands above.
