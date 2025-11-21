# Station Portal System - Architecture & Infrastructure

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Project:** Station - Modular Portal Application Platform
**Technology Stack:** NestJS, React, PostgreSQL, Redis, RabbitMQ

---

> **[AI Context Note]:** This document describes the complete infrastructure and architecture of the Station application, a modular portal-based platform where feature areas are built as self-contained "portlet" applications. When this document is provided as context, assume you are working within this established architecture and should follow these patterns and conventions.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Docker Services Architecture](#docker-services-architecture)
4. [Database Schema](#database-schema)
5. [Technology Stack](#technology-stack)
6. [Network & Communication](#network-communication)
7. [Security Architecture](#security-architecture)
8. [Deployment & Operations](#deployment-operations)

---

## Executive Summary

Station is a **monorepo-based web application** that implements a **managed plugin architecture** where each major feature area is developed as an independent "portlet" (small portal application). These portlets are:

- **Self-contained modules** with their own frontend components and backend APIs
- **Installed at build-time** via pnpm workspaces (not runtime uploaded)
- **Enabled per-organization** via database configuration
- **Loosely coupled** via an event bus (RabbitMQ) for inter-portlet communication

**Key Architectural Decisions:**

1. ✅ **Monorepo over microservices** - All code in one repository for simplicity
2. ✅ **Managed plugins over JSR portlets** - Build-time installation, not runtime code upload
3. ✅ **RabbitMQ over Redis Streams** - Purpose-built messaging with dead letter queues
4. ✅ **PostgreSQL for persistence** - Single database with proper table namespacing
5. ✅ **Security-first design** - Framework-level enforcement, not portlet-level

> **[AI Note]:** When working on this codebase, always assume portlets are built at compile-time and deployed as part of the main application. Never suggest runtime code upload or JSR portlet patterns.

---

## System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React SPA  │  │ Portal Widget│  │ Portal Widget│      │
│  │  (Dashboard) │  │   (Tasks)    │  │    (CRM)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / REST API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              NestJS Backend (Port 3000)               │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │ Core Modules │  │Portal System │  │  Portlets  │ │  │
│  │  │              │  │              │  │            │ │  │
│  │  │ • Auth       │  │ • Registry   │  │ • Tasks    │ │  │
│  │  │ • Users      │  │ • Instances  │  │ • CRM      │ │  │
│  │  │ • Orgs       │  │ • Event Bus  │  │ • Analytics│ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└───────┬────────────────┬────────────────┬────────────────────┘
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │  │   RabbitMQ   │
│  (Database)  │  │   (Cache)    │  │ (Event Bus)  │
│  Port: 5432  │  │  Port: 6379  │  │  Port: 5672  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Monorepo Structure

```
station/
├── backend/                    # NestJS API server
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # JWT authentication
│   │   │   ├── users/         # User management
│   │   │   ├── organizations/ # Multi-tenancy
│   │   │   └── portals/       # Portal system
│   │   │       ├── portal-registry.service.ts
│   │   │       ├── event-bus/
│   │   │       │   ├── rabbitmq.service.ts
│   │   │       │   └── rabbitmq-event-bus.service.ts
│   │   │       └── entities/
│   │   └── main.ts
│   └── package.json
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   └── PortalDashboard.tsx
│   │   ├── portals/
│   │   │   └── PortalRegistry.ts
│   │   └── App.tsx
│   └── package.json
│
├── portlets/                   # All portlet packages
│   ├── portlet-tasks/
│   │   ├── src/
│   │   │   ├── index.ts       # Portlet definition
│   │   │   ├── frontend/
│   │   │   │   ├── TasksWidget.tsx
│   │   │   │   └── TasksApp.tsx
│   │   │   └── backend/
│   │   │       ├── tasks.module.ts
│   │   │       ├── tasks.service.ts
│   │   │       └── tasks.controller.ts
│   │   └── package.json
│   │
│   ├── portlet-crm/
│   │   └── [same structure]
│   │
│   └── portlet-analytics/
│       └── [same structure]
│
├── packages/                   # Shared libraries
│   └── portlet-sdk/           # Portlet interface definitions
│       ├── src/
│       │   ├── types.ts
│       │   └── decorators.ts
│       └── package.json
│
├── docs/                       # Documentation
│   ├── 01-architecture-and-infrastructure.pdf
│   ├── 02-portal-system-design.pdf
│   └── 03-implementation-guide.pdf
│
├── docker-compose.yml          # Local development services
├── pnpm-workspace.yaml         # Workspace configuration
└── turbo.json                  # Build orchestration
```

> **[AI Note]:** This is a pnpm workspace monorepo. All packages reference each other using `workspace:*` protocol. When adding dependencies between packages, use this format in package.json.

---

## Docker Services Architecture

### Complete Docker Compose Configuration

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16
    container_name: station-postgres
    hostname: postgres
    environment:
      POSTGRES_DB: station
      POSTGRES_USER: station
      POSTGRES_PASSWORD: station
      POSTGRES_INITDB_ARGS: "--encoding=UTF8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U station"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - station-network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: station-redis
    hostname: redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - station-network

  # RabbitMQ Message Broker
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    container_name: station-rabbitmq
    hostname: rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: station
      RABBITMQ_DEFAULT_PASS: station
      RABBITMQ_DEFAULT_VHOST: /
      RABBITMQ_ERLANG_COOKIE: "station-secret-cookie"
    ports:
      - "5672:5672"    # AMQP protocol
      - "15672:15672"  # Management UI
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - station-network

  # Backend API (NestJS)
  backend:
    build:
      context: .
      dockerfile: ./backend/Dockerfile
    container_name: station-backend
    hostname: backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://station:station@postgres:5432/station
      REDIS_HOST: redis
      REDIS_PORT: 6379
      RABBITMQ_URL: amqp://station:station@rabbitmq:5672
      RABBITMQ_EXCHANGE: portal.events
      JWT_SECRET: your-super-secret-jwt-key-change-in-production
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    volumes:
      - ./backend:/app/backend
      - /app/backend/node_modules
    networks:
      - station-network
    restart: unless-stopped

  # Frontend (React + Vite)
  frontend:
    build:
      context: .
      dockerfile: ./frontend/Dockerfile
    container_name: station-frontend
    hostname: frontend
    environment:
      VITE_API_URL: http://localhost:3000
    ports:
      - "5173:5173"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app/frontend
      - /app/frontend/node_modules
    networks:
      - station-network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  rabbitmq_data:
    driver: local

networks:
  station-network:
    driver: bridge
```

### Service Dependency Graph

```
Frontend Container
    │
    └─▶ depends_on: Backend Container
                        │
                        ├─▶ depends_on: PostgreSQL (healthy)
                        ├─▶ depends_on: Redis (healthy)
                        └─▶ depends_on: RabbitMQ (healthy)
```

### Container Communication Matrix

| From Container | To Container | Protocol | Port | Purpose |
|----------------|--------------|----------|------|---------|
| Frontend | Backend | HTTP | 3000 | REST API calls |
| Backend | PostgreSQL | TCP | 5432 | Database queries |
| Backend | Redis | TCP | 6379 | Caching |
| Backend | RabbitMQ | AMQP | 5672 | Event publishing/consuming |
| Host | Frontend | HTTP | 5173 | Web browser access |
| Host | Backend | HTTP | 3000 | API access (dev) |
| Host | RabbitMQ | HTTP | 15672 | Management UI |
| Host | PostgreSQL | TCP | 5432 | DB admin tools |
| Host | Redis | TCP | 6379 | Redis CLI |

### Resource Allocation

#### Development Environment

```yaml
Resources per container:

  PostgreSQL:
    CPU: 0.5 cores
    Memory: 512 MB
    Disk: 10 GB (volume)

  Redis:
    CPU: 0.25 cores
    Memory: 256 MB
    Disk: 1 GB (volume)

  RabbitMQ:
    CPU: 0.5 cores
    Memory: 512 MB
    Disk: 5 GB (volume)

  Backend:
    CPU: 1 core
    Memory: 1 GB
    Disk: N/A (stateless)

  Frontend:
    CPU: 0.5 cores
    Memory: 512 MB
    Disk: N/A (stateless)

Total Resources Required:
  CPU: 2.75 cores
  Memory: 2.78 GB
  Disk: 16 GB
```

#### Production Environment

```yaml
Resources per container:

  PostgreSQL:
    CPU: 2 cores
    Memory: 4 GB
    Disk: 100 GB (SSD)
    Replicas: 1 primary + 2 read replicas

  Redis:
    CPU: 1 core
    Memory: 2 GB
    Disk: 10 GB
    Replicas: 1 primary + 1 replica

  RabbitMQ:
    CPU: 2 cores
    Memory: 4 GB
    Disk: 50 GB
    Replicas: 3 (cluster)

  Backend:
    CPU: 2 cores
    Memory: 2 GB
    Disk: N/A
    Replicas: 3+ (auto-scaling)

  Frontend:
    CPU: 0.5 cores
    Memory: 512 MB
    Disk: N/A
    Replicas: 2+ (behind CDN)

Total Resources Required:
  CPU: 21+ cores
  Memory: 37+ GB
  Disk: 160 GB
```

> **[AI Note]:** In production, backend and frontend should be horizontally scaled based on load. PostgreSQL should use managed services (AWS RDS, GCP Cloud SQL) for better reliability and automated backups.

---

## Database Schema

### Core Schema Overview

The database is organized into three major areas:

1. **Core Tables** - User authentication, organizations, roles
2. **Portal System Tables** - Portal registry, instances, preferences
3. **Portlet-Specific Tables** - Each portlet's data (namespaced)

### Table Naming Conventions

```
Core tables:           {table_name}
                       Examples: users, organizations, roles

Portal system tables:  portal_{table_name}
                       Examples: portal_definitions, portal_instances

Portlet tables:        portal_{portlet_id}_{table_name}
                       Examples: portal_tasks_tasks, portal_crm_contacts

Event bus tables:      portal_{table_name}
                       Examples: portal_events, portal_event_logs
```

> **[AI Note]:** When creating new portlet tables, ALWAYS use the `portal_{portlet_id}_` prefix to avoid naming conflicts. ALWAYS include `organization_id` column for multi-tenancy.

### Core Tables

#### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
```

#### organizations

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_active ON organizations(is_active) WHERE is_active = true;
```

#### roles

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_role_per_org UNIQUE (organization_id, name)
);

CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_roles_permissions ON roles USING gin(permissions);
```

#### user_organization_roles

```sql
CREATE TABLE user_organization_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),

  CONSTRAINT unique_user_org_role UNIQUE (user_id, organization_id, role_id)
);

CREATE INDEX idx_uor_user ON user_organization_roles(user_id);
CREATE INDEX idx_uor_org ON user_organization_roles(organization_id);
CREATE INDEX idx_uor_role ON user_organization_roles(role_id);
```

### Portal System Tables

#### portal_definitions

Metadata about available portlets (synced from code at startup).

```sql
CREATE TABLE portal_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portlet_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  version VARCHAR(20) NOT NULL,
  category VARCHAR(50),
  icon_name VARCHAR(50),
  author VARCHAR(100),
  tags TEXT[],
  config_schema JSONB,
  default_config JSONB DEFAULT '{}'::jsonb,
  default_permissions JSONB DEFAULT '{
    "view": [],
    "use": [],
    "admin": []
  }'::jsonb,
  app_route VARCHAR(200) NOT NULL,
  api_prefix VARCHAR(200),
  is_available BOOLEAN DEFAULT true,
  requires_backend BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_portlet_id CHECK (portlet_id ~ '^[a-z][a-z0-9-]*$'),
  CONSTRAINT valid_version CHECK (version ~ '^\d+\.\d+\.\d+$'),
  CONSTRAINT unique_app_route UNIQUE (app_route)
);

CREATE INDEX idx_portal_definitions_category ON portal_definitions(category);
CREATE INDEX idx_portal_definitions_available ON portal_definitions(is_available);
```

#### portal_instances

Tracks which portlets are enabled for which organizations.

```sql
CREATE TABLE portal_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portlet_id VARCHAR(50) NOT NULL REFERENCES portal_definitions(portlet_id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  permissions JSONB DEFAULT '{}'::jsonb,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER,
  max_api_calls_per_minute INTEGER DEFAULT 100,
  max_storage_mb INTEGER DEFAULT 1000,
  installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  installed_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id),
  last_accessed_at TIMESTAMP,

  CONSTRAINT unique_portlet_per_org UNIQUE (portlet_id, organization_id)
);

CREATE INDEX idx_portal_instances_org ON portal_instances(organization_id);
CREATE INDEX idx_portal_instances_portlet ON portal_instances(portlet_id);
CREATE INDEX idx_portal_instances_enabled ON portal_instances(organization_id, enabled);
```

#### user_portal_preferences

User-specific portlet settings and dashboard layout.

```sql
CREATE TABLE user_portal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  portlet_id VARCHAR(50) NOT NULL REFERENCES portal_definitions(portlet_id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  visible BOOLEAN DEFAULT true,
  pinned BOOLEAN DEFAULT false,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 4,
  height INTEGER DEFAULT 3,
  config JSONB DEFAULT '{}'::jsonb,
  collapsed BOOLEAN DEFAULT false,
  last_refreshed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_portlet UNIQUE (user_id, portlet_id, organization_id),
  CONSTRAINT valid_width CHECK (width >= 1 AND width <= 12),
  CONSTRAINT valid_height CHECK (height >= 1 AND height <= 12),
  CONSTRAINT valid_position CHECK (position_x >= 0 AND position_y >= 0)
);

CREATE INDEX idx_user_portal_prefs_user ON user_portal_preferences(user_id);
CREATE INDEX idx_user_portal_prefs_portlet ON user_portal_preferences(portlet_id);
CREATE INDEX idx_user_portal_prefs_visible ON user_portal_preferences(user_id, visible);
```

#### portal_permissions

Maps permissions to portlets (integrates with RBAC).

```sql
CREATE TABLE portal_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portlet_id VARCHAR(50) NOT NULL REFERENCES portal_definitions(portlet_id) ON DELETE CASCADE,
  permission_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_portlet_permission UNIQUE (portlet_id, permission_name),
  CONSTRAINT valid_permission_name CHECK (permission_name ~ '^portlet\.[a-z-]+\.[a-z]+$')
);

CREATE INDEX idx_portal_permissions_portlet ON portal_permissions(portlet_id);
CREATE INDEX idx_portal_permissions_name ON portal_permissions(permission_name);
```

#### portal_audit_logs

Tracks all portlet activity for security and compliance.

```sql
CREATE TABLE portal_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portlet_id VARCHAR(50) NOT NULL REFERENCES portal_definitions(portlet_id),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_action CHECK (action IN (
    'installed', 'uninstalled', 'enabled', 'disabled',
    'configured', 'accessed', 'data_created', 'data_updated', 'data_deleted'
  ))
);

CREATE INDEX idx_portal_audit_logs_portlet ON portal_audit_logs(portlet_id, created_at DESC);
CREATE INDEX idx_portal_audit_logs_user ON portal_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_portal_audit_logs_org ON portal_audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_portal_audit_logs_created ON portal_audit_logs(created_at DESC);
```

#### portal_usage_metrics

Tracks usage for analytics and billing.

```sql
CREATE TABLE portal_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portlet_id VARCHAR(50) NOT NULL REFERENCES portal_definitions(portlet_id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  api_calls INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration_seconds INTEGER DEFAULT 0,
  storage_used_mb DECIMAL(10,2) DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  popular_features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_period UNIQUE (portlet_id, organization_id, period_start),
  CONSTRAINT valid_period CHECK (period_end > period_start)
);

CREATE INDEX idx_portal_usage_metrics_portlet_period ON portal_usage_metrics(portlet_id, period_start DESC);
CREATE INDEX idx_portal_usage_metrics_org_period ON portal_usage_metrics(organization_id, period_start DESC);
```

### Event Bus Tables

#### portal_event_logs

Persistent log of all events published to the bus.

```sql
CREATE TABLE portal_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(100) NOT NULL,
  portlet_id VARCHAR(50) NOT NULL REFERENCES portal_definitions(portlet_id),
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  payload JSONB NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  correlation_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  published_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_portal_event_logs_portlet ON portal_event_logs(portlet_id, published_at DESC);
CREATE INDEX idx_portal_event_logs_type ON portal_event_logs(event_type, published_at DESC);
CREATE INDEX idx_portal_event_logs_org ON portal_event_logs(organization_id, published_at DESC);
CREATE INDEX idx_portal_event_logs_correlation ON portal_event_logs(correlation_id);
```

### Example Portlet Tables

#### Tasks Portlet

```sql
-- Projects
CREATE TABLE portal_tasks_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_project_name_per_org UNIQUE (organization_id, name)
);

CREATE INDEX idx_portal_tasks_projects_org ON portal_tasks_projects(organization_id);

-- Tasks
CREATE TABLE portal_tasks_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  project_id UUID REFERENCES portal_tasks_projects(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES portal_tasks_tasks(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to UUID REFERENCES users(id),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE INDEX idx_portal_tasks_tasks_org ON portal_tasks_tasks(organization_id, created_at DESC);
CREATE INDEX idx_portal_tasks_tasks_assigned ON portal_tasks_tasks(assigned_to, status);
CREATE INDEX idx_portal_tasks_tasks_status ON portal_tasks_tasks(organization_id, status);
CREATE INDEX idx_portal_tasks_tasks_project ON portal_tasks_tasks(project_id);

-- Row-level security
ALTER TABLE portal_tasks_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tasks ON portal_tasks_tasks
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);
```

#### CRM Portlet

```sql
-- Contacts
CREATE TABLE portal_crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(200),
  title VARCHAR(100),
  lead_source VARCHAR(50),
  status VARCHAR(50) DEFAULT 'lead',
  assigned_to UUID REFERENCES users(id),
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_contacted_at TIMESTAMP,

  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_portal_crm_contacts_org ON portal_crm_contacts(organization_id);
CREATE INDEX idx_portal_crm_contacts_email ON portal_crm_contacts(organization_id, email);
CREATE INDEX idx_portal_crm_contacts_assigned ON portal_crm_contacts(assigned_to);

-- Deals
CREATE TABLE portal_crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  contact_id UUID REFERENCES portal_crm_contacts(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  amount DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  stage VARCHAR(50) DEFAULT 'prospect',
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,

  CONSTRAINT valid_probability CHECK (probability >= 0 AND probability <= 100)
);

CREATE INDEX idx_portal_crm_deals_org ON portal_crm_deals(organization_id);
CREATE INDEX idx_portal_crm_deals_stage ON portal_crm_deals(organization_id, stage);
CREATE INDEX idx_portal_crm_deals_contact ON portal_crm_deals(contact_id);
```

### Entity Relationship Diagram

```
┌─────────────────────┐
│  organizations      │
└──────────┬──────────┘
           │ 1:N
           ├─────────────────────────┐
           │                         │
           ▼                         ▼
┌──────────────────────┐    ┌──────────────────────┐
│  portal_instances    │    │        roles         │
│  ─────────────────── │    │  ─────────────────── │
│  - portlet_id (FK)   │    │  - organization_id   │
│  - organization_id   │    │  - permissions[]     │
│  - enabled           │    └──────────┬───────────┘
│  - config            │               │
└──────────┬───────────┘               │ 1:N
           │                           │
           │ N:1                       ▼
           │              ┌─────────────────────────┐
           │              │ user_organization_roles │
           │              │  ─────────────────────  │
           │              │  - user_id (FK)         │
           │              │  - organization_id (FK) │
           │              │  - role_id (FK)         │
           │              └───────────┬─────────────┘
           │                          │
           │                          │ N:1
           │                          │
           ▼                          ▼
┌─────────────────────┐      ┌─────────────────────┐
│ portal_definitions  │      │       users         │
│ ─────────────────── │      │  ─────────────────  │
│ - portlet_id (PK)   │      │  - id (PK)          │
│ - name              │      │  - email            │
│ - version           │      │  - password_hash    │
│ - config_schema     │      └──────────┬──────────┘
└──────────┬──────────┘                 │
           │                            │ 1:N
           │ 1:N                        │
           │                            ▼
           ▼              ┌──────────────────────────┐
┌─────────────────────┐  │ user_portal_preferences  │
│ portal_event_logs   │  │  ──────────────────────  │
│  ─────────────────  │  │  - user_id (FK)          │
│  - portlet_id (FK)  │  │  - portlet_id (FK)       │
│  - event_type       │  │  - visible               │
│  - payload          │  │  - position_x/y          │
│  - organization_id  │  │  - width/height          │
└─────────────────────┘  └──────────────────────────┘


PORTLET-SPECIFIC TABLES:

┌────────────────────────┐
│ portal_tasks_projects  │
│  ────────────────────  │
│  - organization_id (FK)│
│  - name                │
└──────────┬─────────────┘
           │ 1:N
           ▼
┌────────────────────────┐
│ portal_tasks_tasks     │
│  ────────────────────  │
│  - organization_id (FK)│
│  - project_id (FK)     │
│  - assigned_to (FK)    │
│  - parent_task_id (FK) │
└────────────────────────┘

┌────────────────────────┐
│ portal_crm_contacts    │
│  ────────────────────  │
│  - organization_id (FK)│
│  - assigned_to (FK)    │
└──────────┬─────────────┘
           │ 1:N
           ▼
┌────────────────────────┐
│ portal_crm_deals       │
│  ────────────────────  │
│  - organization_id (FK)│
│  - contact_id (FK)     │
└────────────────────────┘
```

> **[AI Note]:** All portlet-specific tables MUST include `organization_id` as a foreign key for multi-tenancy. Always create indexes starting with `organization_id` for query performance.

---

## Technology Stack

### Backend Stack

```yaml
Runtime:
  - Node.js: v20 LTS
  - pnpm: 10.22+

Framework:
  - NestJS: 10.x
  - Express: 4.x (under NestJS)

Database:
  - PostgreSQL: 16
  - TypeORM: 0.3.x

Caching:
  - Redis: 7.x
  - cache-manager: 5.x

Message Queue:
  - RabbitMQ: 3.12.x
  - amqplib: 0.10.x

Authentication:
  - Passport.js: 0.7.x
  - jsonwebtoken: 9.x
  - bcrypt: 5.x

Validation:
  - class-validator: 0.14.x
  - class-transformer: 0.5.x

Testing:
  - Jest: 29.x
  - Supertest: 6.x

API Documentation:
  - Swagger/OpenAPI: 7.x
```

### Frontend Stack

```yaml
Runtime:
  - Node.js: v20 LTS
  - pnpm: 10.22+

Build Tool:
  - Vite: 5.x

Framework:
  - React: 18.x
  - TypeScript: 5.x

Routing:
  - React Router: 6.x

UI Library:
  - Material-UI (MUI): 6.x
  - Emotion: 11.x (CSS-in-JS)

State Management:
  - React Hooks (useState, useContext)
  - React Query: 5.x (for server state)

HTTP Client:
  - Axios: 1.x

Testing:
  - Vitest: 1.x
  - Testing Library: 14.x
```

### DevOps Stack

```yaml
Containerization:
  - Docker: 24.x
  - Docker Compose: 2.x

Orchestration (Production):
  - Kubernetes: 1.28+
  - Helm: 3.x

CI/CD:
  - GitHub Actions
  - Turbo: 2.3.x (monorepo builds)

Monitoring:
  - Prometheus (metrics)
  - Grafana (dashboards)
  - Sentry (error tracking)

Logging:
  - Winston: 3.x
  - Loki (log aggregation)
```

### Development Tools

```yaml
Code Quality:
  - ESLint: 8.x
  - Prettier: 3.x
  - Husky: 9.x (git hooks)
  - lint-staged: 15.x

Version Control:
  - Git
  - Conventional Commits

Package Management:
  - pnpm workspaces
  - Turbo (build caching)
```

---

## Network & Communication

### Internal Container Network

All containers communicate via Docker's bridge network: `station-network`

```
Container Hostnames (DNS):
  - postgres    → station-postgres:5432
  - redis       → station-redis:6379
  - rabbitmq    → station-rabbitmq:5672
  - backend     → station-backend:3000
  - frontend    → station-frontend:5173
```

### Port Mapping

```
Host Port → Container Port → Service

5173      → 5173           → Frontend (Vite Dev Server)
3000      → 3000           → Backend (NestJS API)
5432      → 5432           → PostgreSQL
6379      → 6379           → Redis
5672      → 5672           → RabbitMQ (AMQP)
15672     → 15672          → RabbitMQ (Management UI)
```

### API Communication Patterns

#### REST API (Frontend ↔ Backend)

```typescript
// Frontend makes HTTP requests to backend
axios.get('http://localhost:3000/api/users/profile')

// Backend responds with JSON
{
  "id": "...",
  "username": "...",
  "email": "..."
}
```

#### Event Bus (Backend ↔ RabbitMQ ↔ Backend)

```typescript
// Portlet publishes event
await eventBus.publish({
  sourcePortletId: 'crm',
  eventType: 'crm.contact.created',
  payload: { contactId: '...' }
});

// RabbitMQ routes to subscribers
// Tasks portlet receives event
async handleEvent(event: PortalEvent) {
  // Process event
}
```

#### Caching (Backend ↔ Redis)

```typescript
// Check cache first
const cached = await cacheManager.get(`user:${id}`);
if (cached) return cached;

// Fetch from database
const user = await userRepo.findOne({ where: { id } });

// Store in cache
await cacheManager.set(`user:${id}`, user, 3600);
```

### Network Security

```yaml
Development:
  - All ports exposed to host (localhost)
  - No SSL/TLS (HTTP only)
  - Default credentials (change in production)

Production:
  - Only frontend and backend exposed publicly
  - Database, Redis, RabbitMQ in private network
  - SSL/TLS required (HTTPS)
  - Strong credentials (secrets management)
  - Rate limiting on API gateway
  - DDoS protection (CloudFlare/AWS Shield)
```

---

## Security Architecture

### Authentication Flow

```
1. User Login
   └─▶ POST /api/auth/login
       ├─ Username + Password
       └─▶ Backend validates credentials
           ├─ bcrypt.compare(password, hash)
           └─▶ Generate JWT tokens
               ├─ Access Token (15 min)
               └─ Refresh Token (7 days)

2. Subsequent Requests
   └─▶ Authorization: Bearer {access_token}
       └─▶ Backend validates JWT
           ├─ Verify signature
           ├─ Check expiration
           └─▶ Extract user info
               └─▶ Process request

3. Token Refresh
   └─▶ POST /api/auth/refresh
       ├─ Refresh Token
       └─▶ Issue new Access Token
```

### Authorization (RBAC)

```
User → UserOrganizationRole → Role → Permissions[]

Example:
  User: john@example.com
  Organization: Acme Corp
  Role: Project Manager
  Permissions: [
    'users.read',
    'projects.create',
    'projects.update',
    'portlet.tasks.view',
    'portlet.tasks.use'
  ]
```

### Multi-Tenancy (Row-Level Security)

Every portlet table includes `organization_id`:

```sql
-- Automatically enforced in queries
SELECT * FROM portal_tasks_tasks
WHERE organization_id = current_setting('app.current_org_id')::uuid;

-- PostgreSQL RLS policy
CREATE POLICY tenant_isolation ON portal_tasks_tasks
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);
```

> **[AI Note]:** NEVER write queries without filtering by `organization_id`. Use the `PortalRepository` base class which automatically adds this filter.

### Input Validation

All inputs validated using class-validator:

```typescript
export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
```

### SQL Injection Prevention

- ✅ Use TypeORM query builders (parameterized queries)
- ✅ Never concatenate user input into SQL
- ❌ Avoid raw SQL queries unless absolutely necessary

```typescript
// ✅ SAFE - Parameterized query
await repo.findOne({ where: { email: userInput } });

// ❌ UNSAFE - SQL injection vulnerable
await repo.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

### XSS Prevention

- ✅ React automatically escapes JSX content
- ✅ Use DOMPurify for any HTML content
- ❌ Never use `dangerouslySetInnerHTML` without sanitization

```typescript
// ✅ SAFE - React escapes
<div>{userInput}</div>

// ❌ UNSAFE - XSS vulnerable
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ SAFE - Sanitized
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### CSRF Protection

- ✅ SameSite cookies
- ✅ CSRF tokens for state-changing operations
- ✅ Origin validation

### Rate Limiting

```typescript
// Global rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Per-portlet rate limiting (from portal_instances table)
max_api_calls_per_minute: 100
```

---

## Deployment & Operations

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/yourorg/station.git
cd station

# 2. Install dependencies
pnpm install

# 3. Start Docker services
docker-compose up -d

# 4. Run database migrations
cd backend
pnpm run migration:run

# 5. Seed database (optional)
pnpm run seed

# 6. Start backend
pnpm run dev

# 7. Start frontend (in new terminal)
cd ../frontend
pnpm run dev

# Access application
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
# RabbitMQ UI: http://localhost:15672
```

### Production Deployment (Kubernetes)

```yaml
# Simplified production architecture

Load Balancer (Ingress)
    │
    ├─▶ Frontend (CDN + Static Hosting)
    │
    └─▶ Backend (3+ replicas)
        │
        ├─▶ PostgreSQL (RDS/Cloud SQL)
        ├─▶ Redis (ElastiCache/MemoryStore)
        └─▶ RabbitMQ (CloudAMQP/Managed Service)
```

### Environment Variables

```bash
# backend/.env.production

# Database
DATABASE_URL=postgresql://user:pass@db-host:5432/station

# Redis
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=strong-password

# RabbitMQ
RABBITMQ_URL=amqp://user:pass@rabbitmq-host:5672
RABBITMQ_EXCHANGE=portal.events

# JWT
JWT_SECRET=very-strong-secret-key-change-this
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Application
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://station.example.com

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
```

### Health Checks

```typescript
// GET /health
{
  "status": "ok",
  "timestamp": "2025-11-20T10:30:00Z",
  "uptime": 3600,
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "rabbitmq": "healthy"
  }
}
```

### Backup Strategy

```yaml
PostgreSQL:
  - Automated daily backups (AWS RDS)
  - Point-in-time recovery (up to 7 days)
  - Manual snapshot before major releases

RabbitMQ:
  - Queue definitions backed up daily
  - Messages are ephemeral (not backed up)
  - Can replay events from portal_event_logs table

Redis:
  - Persistence enabled (AOF + RDB)
  - Not critical (cache can be rebuilt)
```

### Monitoring & Alerting

```yaml
Metrics to Monitor:
  - API response time (p50, p95, p99)
  - Error rate (4xx, 5xx)
  - Database connection pool usage
  - RabbitMQ queue depth
  - Redis cache hit rate
  - Memory usage per container
  - CPU usage per container

Alerts:
  - API error rate > 1%
  - Database connections > 80%
  - RabbitMQ queue depth > 10,000
  - Disk usage > 85%
  - Any service health check failing
```

### Scaling Guidelines

```yaml
Scale Frontend:
  - Add more replicas (stateless)
  - Use CDN for static assets
  - Enable gzip compression

Scale Backend:
  - Horizontal scaling (add replicas)
  - Trigger: CPU > 70% or Memory > 80%
  - Min replicas: 3
  - Max replicas: 20

Scale Database:
  - Read replicas for read-heavy queries
  - Connection pooling (pgBouncer)
  - Vertical scaling (increase RAM/CPU)

Scale Redis:
  - Use Redis Cluster for > 10GB data
  - Separate cache instances per concern

Scale RabbitMQ:
  - Use RabbitMQ cluster (3 nodes min)
  - Separate exchanges per environment
  - Increase queue consumers if lag > 5 seconds
```

---

## Appendix

### Glossary

**Portlet** - A self-contained module that provides a specific feature area (e.g., Tasks, CRM). Includes frontend components (widget + full app) and backend APIs.

**Portal Instance** - An enabled portlet for a specific organization. Tracked in `portal_instances` table.

**Widget** - The compact card view of a portlet shown on the dashboard.

**Full App** - The expanded view of a portlet when user clicks "expand" on the widget.

**Event Bus** - RabbitMQ-based messaging system that allows portlets to communicate via events.

**Multi-tenancy** - Architecture pattern where single application instance serves multiple organizations (tenants) with data isolation.

**Row-Level Security (RLS)** - PostgreSQL feature that enforces tenant isolation at database level.

### Common Commands

```bash
# Docker
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f backend    # View backend logs
docker-compose restart backend    # Restart backend

# Database
pnpm run migration:generate       # Generate migration from entities
pnpm run migration:run            # Run pending migrations
pnpm run migration:revert         # Revert last migration

# Development
pnpm install                      # Install dependencies
pnpm run build                    # Build all packages
pnpm run dev                      # Start dev server
pnpm run test                     # Run tests
pnpm run lint                     # Lint code

# RabbitMQ Management
# View queues: http://localhost:15672
# Username: station, Password: station
```

### Troubleshooting

**Backend won't start:**
```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready -U station

# Check if RabbitMQ is ready
docker-compose exec rabbitmq rabbitmq-diagnostics -q ping

# Check backend logs
docker-compose logs backend
```

**Database connection errors:**
```bash
# Verify connection string
echo $DATABASE_URL

# Test connection
docker-compose exec postgres psql -U station -d station -c "SELECT 1"

# Check if migrations ran
docker-compose exec backend npm run migration:show
```

**RabbitMQ connection errors:**
```bash
# Check RabbitMQ status
docker-compose exec rabbitmq rabbitmqctl status

# View connections
# http://localhost:15672/#/connections

# Check if exchange exists
docker-compose exec rabbitmq rabbitmqctl list_exchanges
```

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-20 | Initial architecture document | AI Assistant |

---

> **[AI Context Summary]:** This document describes Station, a monorepo-based web application with a managed plugin (portlet) architecture. Key facts: Uses NestJS backend, React frontend, PostgreSQL database, Redis cache, and RabbitMQ event bus. Portlets are installed at build-time via pnpm workspaces, not runtime uploaded. All portlet tables must be namespaced with `portal_{portlet_id}_` prefix and include `organization_id` for multi-tenancy. Communication between portlets happens via RabbitMQ event bus using topic exchanges.

---

**End of Document**
