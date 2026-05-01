# Monitoring

Station uses two complementary monitoring tools:

- **UptimeRobot** — external uptime monitoring from outside the VPS; triggers alerts when the API or frontend is unreachable
- **Sentry** — in-process error tracking; captures stack traces for 5xx errors with full request context

---

## Health endpoint

`GET https://api.drdnt.org/health`

Returns HTTP **200** when the database is reachable:

```json
{
  "status": "ok",
  "info": { "database": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" } }
}
```

Returns HTTP **503** when the database is down — UptimeRobot treats any non-2xx as "down" and fires an alert automatically.

---

## UptimeRobot

**Login:** uptimerobot.com → account credentials in 1Password under `Station / UptimeRobot`

### Monitors

| Name               | URL                            | Interval |
| ------------------ | ------------------------------ | -------- |
| Station API Health | `https://api.drdnt.org/health` | 5 min    |
| Station Frontend   | `https://station.drdnt.org`    | 5 min    |

### Alert contacts

- Email: configured during account setup
- Discord: Settings → Alert Contacts → Add → Webhook → paste the Discord server webhook URL

To test: open a monitor → **Edit** → **Test Alert** button.

### Status page

Public URL: `https://status.drdnt.org` (CNAME → `stats.uptimerobot.com`)

To configure: UptimeRobot → **Status Pages** → New Status Page → add both monitors → set custom domain to `status.drdnt.org`.

---

## Sentry

**Login:** sentry.io → account credentials in 1Password under `Station / Sentry`

### What gets captured

- All **5xx** errors with full stack trace, request URL, and user context
- **4xx** errors are intentionally excluded — they are user/client errors, not app bugs

### DSN setup

`SENTRY_DSN` is stored as a GitHub environment secret in both `staging` and `production` environments. The release workflow passes it automatically via the environment file written to the VPS.

When `SENTRY_DSN` is absent (local dev, CI) the SDK is a no-op — the app starts normally and no errors are thrown.

### Triaging an error

1. Open Sentry → **Issues** → filter by `production` or `staging` environment
2. Click an issue to see the stack trace, request context, and breadcrumbs
3. Assign it, add a comment, or mark it **Resolved** once fixed
4. Set up **Alerts** (Sentry → Alerts → Create Alert) to receive email/Discord notifications for new issues

---

## When an alert fires

Follow this decision tree:

1. **Check UptimeRobot** — is the monitor down or just slow? Look at the response time graph.
2. **Check Sentry** — are there new 5xx errors with a matching timestamp? The stack trace usually identifies the root cause.
3. **SSH to VPS** — if neither tool shows the cause:
   ```bash
   ssh user@api.drdnt.org
   cd /opt/station
   docker compose ps          # are all containers running?
   docker compose logs --tail=100 backend   # recent backend logs
   docker compose logs --tail=50 postgres   # database logs
   ```
4. **Restart if needed:**
   ```bash
   docker compose restart backend
   # or full stack:
   docker compose down && docker compose up -d
   ```
5. If the database is the problem, check disk space (`df -h`) and PostgreSQL logs before restarting.
