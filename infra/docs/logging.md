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
# All backend logs
{service="backend"}

# Errors only
{service="backend"} | json | level >= 50

# Slow requests (>500ms)
{service="backend"} | json | responseTime > 500

# Logs for a specific request ID
{service="backend"} | json | req_id="<uuid>"

# 4xx responses
{service="backend"} | json | res_statusCode >= 400 | res_statusCode < 500

# 5xx responses
{service="backend"} | json | res_statusCode >= 500
```

### Useful label selectors

| Label             | Values                                | Description                |
| ----------------- | ------------------------------------- | -------------------------- |
| `service`         | `backend`, `frontend`                 | Compose service name       |
| `container`       | container name                        | Full Docker container name |
| `compose_project` | `station`                             | Compose project name       |
| `job`             | `station-backend`, `station-frontend` | Promtail job name          |

---

## Infrastructure

| Service  | Image                    | Port (internal)  | Data                  |
| -------- | ------------------------ | ---------------- | --------------------- |
| Loki     | `grafana/loki:3.4.2`     | `127.0.0.1:3100` | `loki_data` volume    |
| Promtail | `grafana/promtail:3.4.2` | —                | reads Docker socket   |
| Grafana  | `grafana/grafana:11.6.1` | `127.0.0.1:3010` | `grafana_data` volume |

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

# 3. Add the secret to GitHub (production environment):
#    GF_SECURITY_ADMIN_PASSWORD = <strong random password>
#    Then trigger a deploy so .env.production is rewritten with the new secret.
#
# Note: DOCKER_HOST_SOCKET does NOT need to be added as a GitHub secret.
# The release workflow SSHs into the VPS, runs `id -u` to get the deploy
# user's UID, and writes the correct socket path into .env.production
# automatically on every deploy.
```

Loki is pre-configured as the default Grafana data source via provisioning — no manual setup required after the containers start.
