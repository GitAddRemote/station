# Station: Gaming Guild and Organization Portal

Station is a modern full-stack monorepo application for managing gaming guilds and organizations with sophisticated role-based access control, member management, and secure authentication.

## 🚀 Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Material-UI v6** for beautiful, accessible UI components
- **React Router v6** for client-side routing
- **Axios** for API communication

### Backend

- **NestJS 10** with TypeScript
- **PostgreSQL** with TypeORM
- **Redis** for caching (with in-memory fallback)
- **JWT Authentication** with refresh token rotation
- **Swagger/OpenAPI** documentation at `/api/docs`
- **Passport.js** for authentication strategies
- **bcrypt** for secure password hashing

### DevOps & Infrastructure

- **pnpm** workspace monorepo
- **Turbo** for fast, cached builds
- **Docker** & Docker Compose
- **Kubernetes** manifests for AWS EKS
- **GitHub Actions** CI/CD pipelines
- **Husky** pre-commit hooks
- **lint-staged** for code quality
- **Monitoring**: Prometheus & Grafana (configs available)
- **Logging**: ELK Stack (configs available)

## 📁 Project Structure

```
station/
├── backend/          # NestJS backend application
├── frontend/         # React + Vite frontend application
├── k8s/             # Kubernetes deployment manifests
├── .github/         # GitHub Actions workflows
└── .husky/          # Git hooks configuration
```

## 🎯 Key Features

### Multi-Role Organization System

- Users can have multiple roles across multiple organizations
- Flexible JSONB-based permissions per role
- Optimized database queries with composite indexes
- Permission aggregation service with Redis caching

### Enhanced User Profiles

- Extended user profile fields (firstName, lastName, phoneNumber, bio)
- Profile management API with validation
- Phone number validation (E.164 format)

### Performance & Caching

- Redis-based caching layer for frequently accessed data
- Automatic cache invalidation on data updates
- Graceful fallback to in-memory caching
- TTL-based cache expiration (5min for organization members, 15min for permissions)

### Security

- JWT access tokens (15-minute expiry)
- Refresh token rotation (7-day expiry)
- Secure password hashing with bcrypt
- Protected API endpoints with JWT guards
- CORS enabled
- Standardized error response format
- Input validation with class-validator

### Modern UI/UX

- Dark theme with gitaddremote.com inspired styling
- Medium blue accent color (#4A9EFF) with glowing effects
- Protected dashboard and profile pages
- Responsive Material-UI components
- Enhanced landing page with hero section

### Developer Experience

- Swagger API documentation with bearer auth
- TypeScript across the stack
- Hot module replacement with Vite
- Pre-commit hooks for code quality
- Monorepo with shared tooling
- Standardized API response transformation

## 🛠️ Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose (for PostgreSQL and Redis)

### Quick Start with Docker

1. **Clone the repository**

   ```bash
   git clone https://github.com/YourUsername/station.git
   cd station
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Start infrastructure services (PostgreSQL & Redis)**

   ```bash
   docker-compose up -d
   ```

   This starts:
   - PostgreSQL on port 5433
   - Redis on port 6379

4. **Set up environment variables**

   The `backend/.env` file should already exist. If not, copy from the example:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Default configuration:

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

5. **Run database migrations**
   ```bash
   cd backend
   pnpm typeorm migration:run -d src/data-source.ts
   ```

### Development

Run both frontend and backend in development mode:

```bash
# From root directory
pnpm dev

# Or individually:
cd backend && pnpm dev    # Backend on http://localhost:3001
cd frontend && pnpm dev   # Frontend on http://localhost:5173
```

**Note**: Redis is optional. The application will fall back to in-memory caching if Redis is unavailable.

### Building for Production

```bash
# Build all packages
pnpm build

# Build specific package
cd backend && pnpm build
cd frontend && pnpm build
```

## 📚 API Documentation

Once the backend is running, visit:

- **Swagger UI**: http://localhost:3001/api/docs
- **Frontend**: http://localhost:5173

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Backend tests
cd backend
pnpm test          # Unit tests
pnpm test:e2e      # E2E tests
pnpm test:cov      # Coverage report
```

## 📦 Available Scripts

From root directory:

- `pnpm dev` - Run all packages in development mode
- `pnpm build` - Build all packages
- `pnpm test` - Run tests across all packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Type-check all packages

## 🔐 Authentication Flow

1. **Register**: `POST /auth/register`
2. **Login**: `POST /auth/login` → Returns `access_token` + `refresh_token`
3. **Access Protected Routes**: Include `Authorization: Bearer <access_token>`
4. **Refresh Token**: `POST /auth/refresh` with `Authorization: Bearer <refresh_token>`
5. **Logout**: `POST /auth/logout` → Revokes refresh token

## 🗄️ Database Schema

- **Users**: User accounts with hashed passwords
- **Organizations**: Gaming guilds/organizations
- **Roles**: Role definitions with JSONB permissions
- **UserOrganizationRoles**: Junction table linking users to organizations with roles
- **RefreshTokens**: Secure refresh token storage

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

Pre-commit hooks will automatically run linting and formatting.
