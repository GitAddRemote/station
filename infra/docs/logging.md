# Logging

## Architecture

```
NestJS (pino-http) → Docker stdout → Vector → Logtail
```

The backend writes structured JSON logs to stdout via `pino-http`. Docker captures stdout from the container. Vector reads Docker logs, parses the pino JSON, filters by severity, and ships matching lines to Logtail over HTTPS.

## Log levels

| Environment | Level shipped | Rationale                                          |
| ----------- | ------------- | -------------------------------------------------- |
| production  | warn+         | Keeps volume within Logtail free tier (1 GB/month) |
| development | debug+        | Full verbosity for local troubleshooting           |
| test        | silent        | No output during test runs                         |

Pino numeric levels: `10`=trace, `20`=debug, `30`=info, `40`=warn, `50`=error, `60`=fatal.

In production the app itself emits `warn` and above (set in `LoggerModule.forRoot()`). Vector's `filter_level` transform enforces the same threshold at the pipeline level, so only level 40, 50, and 60 lines are forwarded to Logtail.

## Searching logs in Logtail

Vector parses each pino JSON line into structured fields before shipping, so Logtail receives the pino fields at the top level. Useful filters:

- **By level**: `level:50` (errors only), `level:40` (warnings)
- **By URL**: `req.url:/api/auth`
- **By request ID**: `req.id:<uuid>`
- **By time range**: use the date picker in the top-right corner
- **Full-text**: any keyword matches against the `msg` field

## Temporarily increasing verbosity

Because the app level is set to `warn` in production, shipping `info` logs requires updating both the app config and Vector, then redeploying:

1. In `backend/src/app.module.ts`, change the production pino level from `'warn'` to `'info'`.
2. In `infra/vector.toml`, change the `filter_level` condition threshold from `40` to `30`.
3. Redeploy the backend and restart Vector.
4. Revert both changes and redeploy again when done.

## Free tier limits

- **Ingestion**: 1 GB/month
- **Retention**: 3 days
- **Alert budget**: apply source-level sampling in `vector.toml` if approaching the limit

## Alert setup

Recommended alert in Logtail → Alerts → New Alert:

- **Name**: Error spike
- **Query**: `level:50`
- **Condition**: count > 10 in last 5 minutes
- **Action**: email your on-call address or team alias

This fires when the error rate spikes, which typically indicates a deployment regression or upstream outage.
