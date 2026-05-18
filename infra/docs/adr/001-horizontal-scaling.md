# ADR-001: Horizontal Scaling Path for Station

**Date:** 2026-05-17
**Status:** Accepted
**Deciders:** Demian (gitaddremote)

---

## Context

Station v0.2.0 runs on a single Linode VPS (4 GB RAM, 2 vCPU, `g6-standard-2`) using Docker Compose. All services are co-located: NestJS backend, React frontend, PostgreSQL, and Redis.

The NestJS backend is already stateless — all session state is in Redis (permissions cache, token revocation) and all persistent data is in PostgreSQL. Nothing is stored in the backend process itself. This means horizontal scaling is achievable without backend code changes.

This ADR documents when and how to scale beyond a single server, so the decision is pre-made before a traffic event forces improvisation.

---

## Current capacity estimate

| Resource                        | Approximate limit                        |
| ------------------------------- | ---------------------------------------- |
| Concurrent users                | ~200–500 (depends on request complexity) |
| PostgreSQL connections          | ~100 (`max_connections` default)         |
| Free memory after base services | ~1.5 GB                                  |
| Disk                            | 80 GB SSD (data + Docker images)         |

### Scaling trigger thresholds

Monitor these in Grafana / UptimeRobot. When sustained for >30 minutes, it is time to act:

- CPU consistently >80%
- Memory consistently >85%
- Response time p95 >500ms
- PostgreSQL connection count >80

---

## Decision: vertical first, then horizontal

Scale in steps, in this order. Each step is independent and progressive — do not skip to a later step without exhausting the earlier ones.

### Step 0 — Vertical scaling (available today, no architecture change)

Resize the Linode in the Cloud Manager dashboard:

```
4 GB (current) → 8 GB → 16 GB → 32 GB
```

- Takes ~2 minutes with a brief reboot
- No code changes, no infrastructure changes
- Doubles capacity at roughly double cost ($24 → $48 → $96/month)
- This is almost always the fastest and cheapest intervention

**Do this first.**

### Step 1 — Separate the database (trigger: DB CPU or connection saturation)

Move PostgreSQL to Linode Managed Database.

- Removes database load from the app VPS
- Gives managed backups, automatic failover, point-in-time recovery
- Frees ~512 MB RAM on the app VPS for more backend capacity
- Cost: ~$15/month for the smallest tier (1 vCPU, 1 GB RAM, 25 GB SSD)

Steps:

1. Provision Linode Managed PostgreSQL (same region as VPS)
2. `pg_dump` current database and restore into the managed instance
3. Update `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` in GitHub Secrets
4. Update `docker-compose.prod.yml`: remove the `postgres` service block, the `postgres_data` volume, and the `depends_on.postgres` entry from the `backend` service; then redeploy
5. Remove the `postgres_data` volume from the VPS. The volume name is prefixed by the Compose project name (`station`), so use: `docker volume rm station_postgres_data`
6. Update `infra/scripts/backup-db.sh` and `restore-db.sh`: these currently run `docker compose exec -T postgres` — they must be updated to connect to the managed database host directly (e.g. via `psql -h $DATABASE_HOST`) before removing the local postgres service, as the release workflow requires a successful pre-deploy backup.

After this step, the VPS hosts only: backend, frontend, Redis.

### Step 2 — Separate Redis (trigger: before adding a second app server)

Move Redis to [Upstash](https://upstash.com/) (serverless Redis).

- **Required before Step 3**: both app servers must share a single Redis instance for permission cache consistency and token revocation to work correctly
- Upstash uses TLS — the current Redis client (`createClient` with plain TCP socket options) will need TLS enabled: add `socket: { tls: true }` to the `createClient` call in `backend/src/modules/auth/auth.module.ts`
- Free tier: 10,000 commands/day; then $0.20/100K commands

Steps:

1. Create an Upstash Redis instance (select the same AWS region closest to your Linode region)
2. Enable TLS in the Redis client: set `socket.tls = true` in `auth.module.ts`
3. The release workflow hardcodes `REDIS_HOST=redis` and `REDIS_PORT=6379` when writing `.env.production` — update the workflow's `Write production environment file` step to use the `REDIS_HOST` and `REDIS_PORT` secrets instead of hardcoded values
4. Update `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` in GitHub Secrets with the Upstash connection details
5. Update `docker-compose.prod.yml`: remove the `redis` service block, the `redis_aof` volume, and the `depends_on.redis` entry from the `backend` service
6. Redeploy; remove the `redis_aof` volume from the VPS: `docker volume rm station_redis_aof`

### Step 3 — Add second app server + NodeBalancer (trigger: CPU/memory saturated after Steps 0–1)

Architecture after Step 3:

```
Internet
    │
NodeBalancer ($10/month, Linode-managed)
    ├── VPS-1: backend + frontend (same Docker images, same env vars)
    └── VPS-2: backend + frontend (same Docker images, same env vars)

Both VPS instances connect to:
    ├── Linode Managed PostgreSQL (Step 1)
    └── Upstash Redis (Step 2)
```

Steps:

1. Provision VPS-2 using Terraform (copy the existing `linode_instance` resource, add `_2` suffix)
2. Run `bootstrap-vps.sh` on VPS-2
3. Sync the production environment to VPS-2 before deploying: the release workflow writes `.env.production` and `rclone.conf` only to the primary `VPS_HOST`. Update the workflow to also write these files to `VPS_HOST_2`, or add a secrets-sync step before the deploy step.
4. Add VPS-2 as a second deploy target in the release workflow:
   ```yaml
   - name: Deploy to VPS-2
     run: ssh deploy@${{ secrets.VPS_HOST_2 }} "cd /opt/station && STATION_VERSION=${VERSION} bash infra/scripts/deploy.sh"
   ```
5. Provision a Linode NodeBalancer in Terraform. The NodeBalancer must front **Nginx on each VPS** (not the Docker containers directly) to preserve host-based routing — Nginx on each VPS maps `api.drdnt.org → :3001` and `station.drdnt.org → :3000`. Configure the NodeBalancer with a single backend port (443) pointing to both VPS instances; TLS termination remains at Nginx.
6. Update the `api` and `station` DNS A records in Terraform to point to the NodeBalancer IP instead of VPS-1

**No backend or frontend code changes required.** The app is already stateless.

### Step 4 — Kubernetes / ECS (trigger: >3 app nodes, or need auto-scaling)

Do not use Kubernetes before this step. The operational overhead — etcd, control plane, Helm, RBAC, pod scheduling, image registry integration — is not justified until manual instance management becomes the bottleneck.

Typical trigger: >3 servers, or a requirement for automated scale-up on traffic spikes without manual intervention.

Options at this stage:

| Option         | When to choose                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Linode LKE** | Already on Linode, want managed Kubernetes control plane, node pools, and existing Linode Terraform provider support |
| **AWS ECS**    | Simpler than Kubernetes for 3–10 services; native ECR image integration; managed autoscaling                         |
| **AWS EKS**    | Need full Kubernetes ecosystem (Helm, KEDA, etc.) and willing to pay for the complexity                              |

---

## Consequences

- The current single-VPS setup is appropriate for <500 concurrent users
- The NestJS backend requires no code changes to support horizontal scaling (already stateless)
- PostgreSQL separation (Step 1) and Redis separation (Step 2) are prerequisites for Step 3 — they cannot be skipped
- This ADR should be reviewed when any scaling trigger threshold is consistently breached for >30 minutes
- Terraform module additions for VPS-2 and the NodeBalancer are not implemented yet — they are a deliverable of Step 3 when needed

---

## Alternatives considered

### Why not Kubernetes now?

The app currently fits comfortably on a single 4 GB VPS. Kubernetes control plane overhead alone consumes ~2 GB RAM. The operational complexity (certificate management, ingress controllers, rolling updates, node pools) would dominate engineering time without providing meaningful capacity benefits at current traffic levels.

### Why not AWS from the start?

Linode is simpler, cheaper at low scale (~$24/month vs ~$60+/month for a comparable EC2 instance with managed Postgres and ElastiCache), and the Terraform provider is well-maintained. Migration to AWS is straightforward when (if) the operational requirements justify it.

### Why Upstash for Redis (Step 2) instead of another Linode VPS?

A standalone Redis VPS adds ~$12/month and requires maintenance. Upstash is serverless, zero-maintenance, and has a generous free tier. The TLS-over-TCP latency from Linode to Upstash (same AWS region) is typically <5ms — acceptable for cache TTLs of 5–15 minutes.
