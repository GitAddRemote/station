# Logging

## Architecture

```
NestJS (pino-http) → Docker stdout → Vector → Logtail
```

The backend writes structured JSON logs to stdout via `pino-http`. Docker captures stdout from the container. Vector reads Docker logs, filters by severity, and ships matching lines to Logtail over HTTPS.

## Log levels

| Environment | Level shipped | Rationale                                          |
| ----------- | ------------- | -------------------------------------------------- |
| production  | warn+         | Keeps volume within Logtail free tier (1 GB/month) |
| development | debug+        | Full verbosity for local troubleshooting           |
| test        | silent        | No output during test runs                         |

Pino numeric levels: `10`=trace, `20`=debug, `30`=info, `40`=warn, `50`=error, `60`=fatal.

In production the app itself emits `warn` and above. Vector's filter (`filter_level` transform in `infra/vector.toml`) enforces the same threshold at the pipeline level, so only level 40, 50, and 60 lines are forwarded to Logtail even if the app level is ever lowered temporarily.

## Searching logs in Logtail

Logtail ingests each log line as a JSON document. Useful filters:

- **By level**: `level:50` (errors only), `level:40` (warnings)
- **By URL**: `req.url:/api/auth`
- **By request ID**: `req.id:<uuid>`
- **By time range**: use the date picker in the top-right corner
- **Full-text**: any keyword matches against the `msg` field

## Temporarily increasing verbosity

To ship `info`-level logs without redeploying the backend:

1. Edit `infra/vector.toml` — change the filter condition to include `"level":30`.
2. Restart Vector only: `docker compose -f docker-compose.prod.yml restart vector`
3. Revert the change and restart Vector again when done.

The backend process does not need to restart because it always emits `info` lines in production; they are simply not forwarded under the default filter.

## Free tier limits

- **Ingestion**: 1 GB/month
- **Retention**: 3 days
- **Alert budget**: apply source-level sampling in `vector.toml` if approaching the limit

## Alert setup

Recommended alert in Logtail → Alerts → New Alert:

- **Name**: Error spike
- **Query**: `level:50`
- **Condition**: count > 10 in last 5 minutes
- **Action**: email `demian@gitaddremote.com`

This fires when the error rate spikes, which typically indicates a deployment regression or upstream outage.
