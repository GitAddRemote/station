# Logging

## Architecture

```
NestJS (pino-http) → Docker stdout
```

The backend writes structured JSON logs to stdout via `pino-http`. Docker captures stdout from each container. Log shipping to a centralised store (Grafana Loki) is planned as a follow-up.

## Log levels

| Environment | Level  | Rationale                                    |
| ----------- | ------ | -------------------------------------------- |
| production  | info+  | Full request context without debug verbosity |
| development | debug+ | Full verbosity for local troubleshooting     |
| test        | silent | No output during test runs                   |

Pino numeric levels: `10`=trace, `20`=debug, `30`=info, `40`=warn, `50`=error, `60`=fatal.

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

Redaction: `req.headers.authorization` is actively redacted on every request. `req.body.password` is listed in the redact config as a safety guard, but `pino-http` does not serialize the request body by default so it will not appear in logs unless body logging is explicitly enabled.

## Viewing logs locally

```bash
# Follow backend logs with pretty printing (pino-pretty active in development)
pnpm dev:backend

# Raw JSON from a running container
docker compose logs -f backend
```
