# OAuth 2.0 Machine-to-Machine (M2M) Guide

Station supports the OAuth 2.0 **Client Credentials** grant (RFC 6749 §4.4) for machine-to-machine API access. This is how Station-Bot authenticates to the Station backend — no human login required.

---

## What Client Credentials is and when to use it

Client Credentials is an OAuth 2.0 grant type for server-to-server calls where there is no human user involved. A client (e.g. Station-Bot) identifies itself with a `client_id` and `client_secret`, and the authorization server issues an access token scoped to what that client is allowed to do.

Use it when:

- A service needs to call the Station API on its own behalf (not on behalf of a user)
- The caller can securely store a long-lived secret (i.e., it runs on a server, not in a browser)

Do **not** use it for user-facing authentication — use the login endpoint instead.

---

## Token endpoint

```
POST /auth/token
Content-Type: application/json
```

---

## Full request/response cycle

### JSON body (simplest)

```bash
curl -s -X POST https://api.drdnt.org/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "station-bot",
    "client_secret": "your-client-secret-here"
  }'
```

### Authorization: Basic header (RFC 6749 §2.3.1)

```bash
# Base64-encode client_id:client_secret
CREDENTIALS=$(printf 'station-bot:your-client-secret-here' | base64 -w0)

curl -s -X POST https://api.drdnt.org/auth/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic ${CREDENTIALS}" \
  -d '{"grant_type": "client_credentials"}'
```

### With explicit scope

```bash
curl -s -X POST https://api.drdnt.org/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "station-bot",
    "client_secret": "your-client-secret-here",
    "scope": "read:inventory"
  }'
```

If `scope` is omitted, the token is issued with the client's full registered scope. If scope is provided, every requested scope must be in the client's registered set — unknown scopes are rejected with 401.

### Successful response

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Tokens expire after **1 hour**. The `expires_in` value is in seconds.

### Error response

```json
{
  "success": false,
  "statusCode": 401,
  "timestamp": "2026-05-18T12:00:00.000Z",
  "path": "/auth/token",
  "method": "POST",
  "message": "Invalid client credentials"
}
```

---

## How Station-Bot uses the token

1. **Token acquisition**: On startup (or on 401 response), POST to `/auth/token` with stored credentials
2. **Caching**: The token is cached in memory for `expires_in - 60` seconds (60-second buffer before expiry)
3. **Usage**: All API requests include `Authorization: Bearer <token>` header
4. **Refresh**: On 401 from any API call, discard the cached token and re-acquire
5. **No refresh tokens**: Client Credentials does not use refresh tokens — just re-request a new token

Example usage after acquiring a token:

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -s https://api.drdnt.org/some-protected-endpoint \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Registering a new OAuth client

The `/oauth-clients` endpoint is protected by an internal API key (`INTERNAL_API_KEY` environment variable). This key is never exposed to the public and is only used from the VPS or during setup.

```bash
# Generate a strong secret first (44 chars, satisfies 32-char minimum)
CLIENT_SECRET=$(openssl rand -base64 32)

# Register station-bot as an OAuth client
curl -s -X POST https://api.drdnt.org/oauth-clients \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: ${INTERNAL_API_KEY}" \
  -d "{
    \"clientId\": \"station-bot\",
    \"clientSecret\": \"${CLIENT_SECRET}\",
    \"scopes\": [\"read:inventory\", \"write:inventory\"]
  }"
```

Response:

```json
{
  "id": "uuid-here",
  "clientId": "station-bot",
  "scopes": ["read:inventory", "write:inventory"]
}
```

The `clientSecret` is hashed with bcrypt before storage. The plaintext secret is never stored — record it securely (e.g., in GitHub Secrets or a password manager) immediately after registration. It cannot be retrieved later.

### Generating a strong secret

```bash
openssl rand -base64 32
```

---

## Revoking a client

There is no dedicated revoke endpoint. To revoke a client:

1. SSH into the VPS
2. Connect to the database:
   ```bash
   export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"
   DB_USER=$(grep ^DATABASE_USER= /opt/station/.env.production | cut -d= -f2)
   DB_NAME=$(grep ^DATABASE_NAME= /opt/station/.env.production | cut -d= -f2)
   docker compose --env-file /opt/station/.env.production \
     -f /opt/station/docker-compose.prod.yml \
     exec -T postgres psql -U "${DB_USER}" -d "${DB_NAME}"
   ```
3. Set the client inactive:
   ```sql
   UPDATE oauth_clients SET "isActive" = false WHERE "clientId" = 'station-bot';
   ```

Any in-flight tokens issued to that client will remain valid until they expire (maximum 1 hour). Plan revocations accordingly.

---

## Security properties

| Property          | Detail                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secret storage    | bcrypt-hashed in PostgreSQL; plaintext never stored                                                                                                                                                                                                                                                                                                                                                      |
| Token lifetime    | 1 hour (`expires_in: 3600`)                                                                                                                                                                                                                                                                                                                                                                              |
| Token type        | JWT, signed with `JWT_SECRET`                                                                                                                                                                                                                                                                                                                                                                            |
| Scope enforcement | Requested scopes must be a subset of registered scopes; extra scopes → 401                                                                                                                                                                                                                                                                                                                               |
| Rate limiting     | 10 requests per 60 seconds (`AUTH_TOKEN_THROTTLE_TTL_MS` / `AUTH_TOKEN_THROTTLE_LIMIT`; hardcoded at these defaults in deployed environments — the release workflow does not write these vars). Note: `trust proxy` is not configured in `main.ts`, so the throttle tracks the Nginx proxy address rather than individual client IPs — the limit is effectively shared across all clients in production. |
| Transport         | HTTPS only in production (Nginx TLS termination)                                                                                                                                                                                                                                                                                                                                                         |
| No refresh tokens | Client Credentials flow; re-request a new token on expiry                                                                                                                                                                                                                                                                                                                                                |
