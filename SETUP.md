# Station Setup & Troubleshooting Guide

This guide will help you get the Station application up and running.

## Prerequisites Checklist

Before starting, ensure you have:

- ✅ Node.js >= 18 installed (`node --version`)
- ✅ pnpm >= 8 installed (`pnpm --version`)
- ✅ Docker and Docker Compose installed (`docker --version` && `docker-compose --version`)

## Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd station
pnpm install
```

### 2. Start Infrastructure Services

**Important**: Start Docker services BEFORE running the application.

```bash
# Start PostgreSQL and Redis in detached mode
docker-compose up -d

# Verify services are running
docker-compose ps

# You should see:
# - database (postgres:13) running on port 5433
# - redis (redis:7-alpine) running on port 6379
```

**Troubleshooting Docker Services:**

```bash
# Check if services are healthy
docker-compose ps

# View logs if services aren't starting
docker-compose logs database
docker-compose logs redis

# Restart services if needed
docker-compose restart

# Stop and remove everything (if you need to start fresh)
docker-compose down -v
docker-compose up -d
```

### 3. Verify Environment Variables

The `backend/.env` file should already exist. Verify it has the correct values:

```bash
cat backend/.env
```

Expected content:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_USER=stationDbUser
DATABASE_PASSWORD=stationDbPassword1
DATABASE_NAME=stationDb
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3001
APP_NAME=STATION BACKEND
```

If the file doesn't exist:

```bash
cp backend/.env.example backend/.env
```

### 4. Run Database Migrations

**Important**: Only run migrations AFTER PostgreSQL is running.

```bash
cd backend
pnpm typeorm migration:run -d src/data-source.ts
cd ..
```

Expected output:

```
Data Source has been initialized
4 migrations have been executed successfully
```

If you see errors:

- Make sure PostgreSQL is running: `docker-compose ps`
- Check PostgreSQL logs: `docker-compose logs database`
- Verify connection: `docker exec -it station-database-1 psql -U stationDbUser -d stationDb -c "SELECT 1"`

### 5. Start the Application

```bash
# From the root directory
pnpm dev
```

This starts:

- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

You should see output like:

```
backend:dev: Data Source has been initialized!
backend:dev: ✅ Redis cache connected successfully
backend:dev: 🚀 Application 'STATION BACKEND' is running on: http://localhost:3001
backend:dev: 📚 Swagger documentation available at: http://localhost:3001/api/docs
frontend:dev: ➜  Local:   http://localhost:5173/
```

### 6. Verify Everything Works

1. **Check backend health**:

   ```bash
   curl http://localhost:3001
   ```

   Should return: `{"success":true,"statusCode":200,"timestamp":"...","data":"Hello from Station API!"}`

2. **Access Swagger docs**: http://localhost:3001/api/docs

3. **Access frontend**: http://localhost:5173

4. **Test registration**:
   - Go to http://localhost:5173
   - Click "Get Started" or "Sign Up"
   - Fill in the registration form
   - Should successfully create an account and redirect to dashboard

## Common Issues & Solutions

### Issue: "Couldn't connect to server" when registering

**Cause**: Backend is not running on port 3001.

**Solution**:

1. Check if backend is running: `curl http://localhost:3001`
2. If not, check if Docker services are running: `docker-compose ps`
3. Ensure `backend/.env` file exists with correct PORT=3001
4. Restart the application: Stop `pnpm dev` (Ctrl+C) and run it again

### Issue: "Connection refused" to PostgreSQL

**Cause**: PostgreSQL is not running.

**Solution**:

```bash
# Start Docker services
docker-compose up -d

# Verify PostgreSQL is running
docker-compose ps

# Check PostgreSQL logs
docker-compose logs database
```

### Issue: Registration shows white box instead of dark theme

**Cause**: Theme not applied correctly.

**Solution**: This should be fixed in the latest version. Make sure you've pulled the latest changes.

### Issue: "Duplicate migrations" error

**Cause**: Old migration configuration.

**Solution**: This is already fixed in `backend/src/data-source.ts` with explicit migration imports.

### Issue: Redis connection failed warning

**Cause**: Redis is not running.

**Impact**: The application will still work with in-memory caching.

**Solution** (optional):

```bash
# Start Redis
docker-compose up -d redis

# Verify Redis is running
docker exec -it station-redis-1 redis-cli ping
# Should return: PONG
```

### Issue: Frontend shows 404 for /auth/register

**Cause**: API proxy not working or backend not running.

**Solution**:

1. Verify backend is running on port 3001
2. Check `frontend/vite.config.ts` has correct proxy configuration
3. Restart frontend dev server

### Issue: Port already in use

**Backend port 3001**:

```bash
# Find process using port 3001
lsof -i :3001
# Kill the process
kill -9 <PID>
```

**Frontend port 5173**:

```bash
# Find process using port 5173
lsof -i :5173
# Kill the process
kill -9 <PID>
```

## Useful Commands

### Docker Management

```bash
# View running containers
docker-compose ps

# View logs (follow mode)
docker-compose logs -f

# View specific service logs
docker-compose logs -f database
docker-compose logs -f redis

# Restart services
docker-compose restart

# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (complete reset)
docker-compose down -v
```

### Database Management

```bash
# Access PostgreSQL shell
docker exec -it station-database-1 psql -U stationDbUser -d stationDb

# Run migrations
cd backend && pnpm typeorm migration:run -d src/data-source.ts

# Revert last migration
cd backend && pnpm typeorm migration:revert -d src/data-source.ts

# Generate new migration
cd backend && pnpm typeorm migration:generate src/migrations/MigrationName -d src/data-source.ts
```

### Redis Management

```bash
# Access Redis CLI
docker exec -it station-redis-1 redis-cli

# Check if Redis is responding
docker exec -it station-redis-1 redis-cli ping

# View all keys
docker exec -it station-redis-1 redis-cli KEYS '*'

# Clear all cache
docker exec -it station-redis-1 redis-cli FLUSHALL
```

### Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck
```

## Testing the Complete Flow

### 1. Registration Flow

1. Navigate to http://localhost:5173
2. Click "Get Started" or navigate to /register
3. Fill in:
   - Username: testuser
   - Email: test@example.com
   - Password: Test123!@#
4. Click "Register"
5. Should automatically redirect to /dashboard

### 2. Login Flow

1. Navigate to http://localhost:5173/login
2. Enter credentials
3. Click "Login"
4. Should redirect to /dashboard

### 3. Profile Update

1. Login and navigate to http://localhost:5173/profile
2. Update profile fields (firstName, lastName, phoneNumber, bio)
3. Click "Update Profile"
4. Should see success message

### 4. API Testing with Swagger

1. Navigate to http://localhost:3001/api/docs
2. Click "Authorize" and enter your JWT token
3. Test various endpoints

## Environment Configuration

### Backend Environment Variables

| Variable            | Description            | Default                |
| ------------------- | ---------------------- | ---------------------- |
| `DATABASE_HOST`     | PostgreSQL host        | localhost              |
| `DATABASE_PORT`     | PostgreSQL port        | 5433                   |
| `DATABASE_USER`     | Database user          | stationDbUser          |
| `DATABASE_PASSWORD` | Database password      | stationDbPassword1     |
| `DATABASE_NAME`     | Database name          | stationDb              |
| `JWT_SECRET`        | Secret for JWT signing | (change in production) |
| `REDIS_HOST`        | Redis host             | localhost              |
| `REDIS_PORT`        | Redis port             | 6379                   |
| `PORT`              | Backend server port    | 3001                   |
| `APP_NAME`          | Application name       | STATION BACKEND        |

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

## Architecture Notes

### Ports

- **Frontend**: 5173 (Vite dev server)
- **Backend**: 3001 (NestJS)
- **PostgreSQL**: 5433 (mapped from container's 5432)
- **Redis**: 6379

### Database Migrations

Migrations are explicitly imported in `backend/src/data-source.ts`:

1. `CreateUsersTable1716956654528`
2. `CreateOrganizationsRolesAndJunctionTable1730841000000`
3. `CreateRefreshTokenTable1731715200000`
4. `AddUserProfileFields1732000000000`

### Caching Strategy

- **Organization members**: 5 minutes TTL
- **User permissions**: 15 minutes TTL
- **Fallback**: Automatic in-memory cache if Redis unavailable

### API Response Format

All API responses follow this format:

```json
{
  "success": true,
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/auth/register",
  "method": "POST",
  "message": "Validation failed",
  "errors": [ ... ]
}
```

## Production Deployment Notes

Before deploying to production:

1. **Change JWT Secret**: Update `JWT_SECRET` in `.env` to a strong random value
2. **Use Production Database**: Configure production PostgreSQL credentials
3. **Use Production Redis**: Configure production Redis instance
4. **Enable HTTPS**: Configure SSL/TLS certificates
5. **Set NODE_ENV**: `NODE_ENV=production`
6. **Review CORS**: Update CORS settings for production domain
7. **Database Migrations**: Run migrations in production: `pnpm typeorm migration:run`
8. **Build Assets**: Run `pnpm build` to create optimized production builds

## Getting Help

If you encounter issues not covered in this guide:

1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Check backend logs in the terminal running `pnpm dev`
4. Review the Swagger API docs: http://localhost:3001/api/docs
5. Check the GitHub repository for issues

## Next Steps

After successful setup:

1. Explore the Swagger documentation
2. Create test organizations and roles
3. Test the permission system
4. Review the codebase structure
5. Read the contribution guidelines
6. Start building your features!
