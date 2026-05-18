# Logging

## Architecture

```
NestJS (pino-http) → Docker stdout → Promtail → Loki → Grafana
```

The backend writes structured JSON logs to stdout via `pino-http`. Promtail scrapes Docker container stdout by compose service label and ships to Loki. Grafana provides the query UI at `https://grafana.drdnt.org`.

---

## Log levels

| Environment | Level  | Rationale                                    |
| ----------- | ------ | -------------------------------------------- |
| production  | info+  | Full request context without debug verbosity |
| development | debug+ | Full verbosity for local troubleshooting     |
| test        | silent | No output during test runs                   |

Pino numeric levels: `10`=trace, `20`=debug, `30`=info, `40`=warn, `50`=error, `60`=fatal.

---

## Structured fields

In production, each log line is a JSON object written to stdout. In development, `pino-pretty` transforms the same JSON into human-readable coloured output — the underlying data is identical, only the presentation differs.

Key fields emitted by `pino-http`:

- `level` — numeric severity
- `msg` — log message
- `time` — Unix timestamp (ms)
- `req.id` — UUID v4 assigned per request
- `req.method` / `req.url` — HTTP method and path
- `res.statusCode` — response status
- `responseTime` — request duration in ms

Redaction: `req.headers.authorization` and `req.headers.cookie` are actively redacted on every request — cookies carry the auth tokens in this app and will never appear in logs. `req.body.password` is listed in the redact config as a safety guard, but `pino-http` does not serialize the request body by default so it will not appear in logs unless body logging is explicitly enabled.

---

## Viewing logs locally

```bash
# Follow backend logs with pretty printing (pino-pretty active in development)
pnpm dev:backend

# Raw JSON from a running container
docker compose logs -f backend
```

---

## Grafana Loki (production)

Grafana is accessible at **https://grafana.drdnt.org**. Log in with username `admin` and the `GF_SECURITY_ADMIN_PASSWORD` secret.

### Loki query examples

Open **Explore → Loki** in Grafana and use these LogQL queries:

```logql
# All backend logs (production only — compose_project scopes out staging)
{compose_project="station", service="backend"}

# Errors only
{compose_project="station", service="backend"} | json | level >= 50

# Slow requests (>500ms)
{compose_project="station", service="backend"} | json | responseTime > 500

# Logs for a specific request ID
{compose_project="station", service="backend"} | json req_id="req.id" | req_id="<uuid>"

# 4xx responses
{compose_project="station", service="backend"} | json statusCode="res.statusCode" | statusCode >= 400 | statusCode < 500

# 5xx responses
{compose_project="station", service="backend"} | json statusCode="res.statusCode" | statusCode >= 500
```

> **Note:** Always include `compose_project="station"` in your label selectors. Staging (`station-staging`) runs on the same VPS and Promtail only scrapes the production project, but including the label makes queries unambiguous and dashboard-safe.

### Useful label selectors

| Label             | Values                                | Description                |
| ----------------- | ------------------------------------- | -------------------------- |
| `service`         | `backend`, `frontend`                 | Compose service name       |
| `container`       | container name                        | Full Docker container name |
| `compose_project` | `station`                             | Compose project name       |
| `job`             | `station-backend`, `station-frontend` | Promtail job name          |

---

## Grafana alerting

> **Prerequisite:** This section requires the Grafana/Loki/Promtail stack from PR #172 (merged into `main` as of commit `95f33b3`). Ensure `docker-compose.prod.yml` includes the `loki`, `promtail`, and `grafana` services before these alert rules will evaluate.

Alert rules, contact points, and notification policies are defined as code in `infra/grafana/provisioning/alerting/` and provisioned automatically on container start — no manual Grafana UI configuration is required.

### Active alert rules

| Alert                         | Condition                                                      | Severity |
| ----------------------------- | -------------------------------------------------------------- | -------- |
| **Backend Error Spike**       | >10 error-level logs (pino `level >= 50`) in a 5-minute window | warning  |
| **Backend Producing No Logs** | <1 log entry in the last 10 minutes (container may be down)    | critical |

### Notification channel

Alerts are sent by email to the address in `GF_ALERT_EMAIL`. Grafana uses its built-in SMTP. To receive emails you must also configure SMTP in `GF_SMTP_*` environment variables (host, port, user, password) — see [Grafana SMTP docs](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/#smtp).

Alternatively, replace the email contact point in `contact-points.yaml` with a webhook (e.g., Discord, Slack, PagerDuty) — Grafana supports all standard contact point types.

### Silencing during planned deployments

To suppress alerts during a deploy:

1. Open Grafana → **Alerting → Silences**
2. Click **Add silence**
3. Set a duration (e.g., 15 minutes)
4. Add matcher: `service = backend`
5. Click **Submit**

The silence expires automatically. No alerts fire during the silence window even if conditions are met.

### Modifying alert rules

Edit `infra/grafana/provisioning/alerting/rules.yaml` and redeploy. Grafana re-reads provisioning files on container restart.

To change the error spike threshold (default: 10 errors / 5 min), update the `evaluator.params` value in the `backend-error-spike` rule:

```yaml
evaluator:
  params:
    - 20 # change this number
  type: gt
```

---

## Infrastructure

| Service  | Image                    | Host bind        | Container port | Data                  |
| -------- | ------------------------ | ---------------- | -------------- | --------------------- |
| Loki     | `grafana/loki:3.4.2`     | `127.0.0.1:3100` | `3100`         | `loki_data` volume    |
| Promtail | `grafana/promtail:3.4.2` | —                | —              | reads Docker socket   |
| Grafana  | `grafana/grafana:11.6.1` | `127.0.0.1:3010` | `3000`         | `grafana_data` volume |

Nginx proxies `grafana.drdnt.org → 127.0.0.1:3010`. TLS via Let's Encrypt (same Certbot setup as other subdomains).

---

## First-time setup on the VPS

After deploying with the updated compose file, run once on the VPS:

```bash
# 1. Install the Nginx config
sudo cp /opt/station/infra/nginx/grafana.drdnt.org.conf \
  /etc/nginx/sites-available/grafana.drdnt.org
sudo ln -s /etc/nginx/sites-available/grafana.drdnt.org \
  /etc/nginx/sites-enabled/grafana.drdnt.org
sudo nginx -t && sudo systemctl reload nginx

# 2. Issue TLS certificate
sudo certbot --nginx -d grafana.drdnt.org

# 3. Add secrets to GitHub (production environment) before the next deploy:
#    GF_SECURITY_ADMIN_PASSWORD = <strong random password>
#    GF_ALERT_EMAIL = your@email.com
#    GF_SMTP_HOST, GF_SMTP_USER, GF_SMTP_PASSWORD (if using email alerts)
#
# Note: DOCKER_HOST_SOCKET does NOT need to be added as a GitHub secret.
# The release workflow SSHs into the VPS, runs `id -u` to get the deploy
# user's UID, and writes the correct socket path into .env.production
# automatically on every deploy.
```

Loki is pre-configured as the default Grafana data source via provisioning — no manual setup required after the containers start.
