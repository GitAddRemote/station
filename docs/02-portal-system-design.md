# Station Portal System - Design & Architecture

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Project:** Station - Modular Portal Application Platform
**Document Type:** System Design Specification

---

> **[AI Context Note]:** This document describes the portal system design patterns, the event bus architecture, security hardening measures, and portlet interoperability patterns. When provided as context, use these patterns for all portlet development and inter-portlet communication. This is the "how it works" companion to the infrastructure document.

---

## Table of Contents

1. [Portal System Overview](#portal-system-overview)
2. [Managed Plugin Architecture](#managed-plugin-architecture)
3. [Event Bus Architecture](#event-bus-architecture)
4. [Security & Hardening](#security-hardening)
5. [Portlet Interoperability](#portlet-interoperability)
6. [Portal Lifecycle](#portal-lifecycle)
7. [Best Practices & Patterns](#best-practices-patterns)

---

## Portal System Overview

### What is a Portlet?

A **portlet** is a self-contained module that provides a specific feature area within the Station platform. Each portlet consists of:

1. **Dashboard Widget** - A compact card view shown on the user's dashboard
2. **Full Application** - An expanded view accessed when user clicks the widget
3. **Backend APIs** - RESTful endpoints for data operations
4. **Database Tables** - Namespaced tables for portlet data
5. **Event Handlers** - Subscribers to relevant events from other portlets

### Portlet Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    PORTLET PACKAGE                         │
│                 @station/portlet-tasks                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  src/                                                      │
│  ├── index.ts                  # Portlet definition       │
│  │                                                         │
│  ├── frontend/                 # React components         │
│  │   ├── TasksWidget.tsx       # Dashboard widget         │
│  │   ├── TasksApp.tsx          # Full application         │
│  │   └── api.ts                # API client                │
│  │                                                         │
│  └── backend/                  # NestJS module            │
│      ├── tasks.module.ts       # Module definition        │
│      ├── tasks.controller.ts   # HTTP endpoints           │
│      ├── tasks.service.ts      # Business logic           │
│      ├── tasks.entity.ts       # TypeORM entities         │
│      ├── dto/                  # Data transfer objects    │
│      └── migrations/           # Database migrations      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Self-Contained** - Each portlet is a complete feature with minimal external dependencies
2. **Loosely Coupled** - Portlets communicate via events, not direct calls
3. **Multi-Tenant** - All data scoped to organizations
4. **Secure by Default** - Framework enforces permissions, not portlet code
5. **Observable** - All actions logged and auditable
6. **Configurable** - Both org-level and user-level configuration

> **[AI Note]:** When building portlets, prioritize loose coupling. Portlets should publish events when their state changes and subscribe to events they care about. Never import code directly from other portlets.

---

## Managed Plugin Architecture

### Why Not JSR Portlets?

**Decision:** Use managed plugin architecture instead of JSR 168/286/362 portlet specifications.

**Rationale:**

| Aspect | JSR Portlets | Managed Plugins |
|--------|--------------|-----------------|
| **Installation** | Runtime upload | Build-time integration |
| **Security** | ❌ Arbitrary code execution | ✅ Code reviewed in CI/CD |
| **Dependencies** | ❌ Version conflicts | ✅ Single dependency tree |
| **Performance** | ❌ Runtime overhead | ✅ Optimized single bundle |
| **Developer Experience** | ❌ Complex lifecycle | ✅ Standard npm/TypeScript |
| **Maintainability** | ❌ Hard to debug | ✅ Clear boundaries |

> **[AI Note]:** Never suggest runtime code upload, JSR portlets, or dynamic plugin loading patterns. All portlets are installed at build-time via pnpm workspaces.

### Portlet SDK Interface

All portlets implement the `Portlet` interface from `@station/portlet-sdk`:

```typescript
// packages/portlet-sdk/src/types.ts

export interface Portlet {
  metadata: PortalMetadata;      // Name, version, description
  frontend: PortalFrontend;       // Widget + app components
  backend?: PortalBackend;        // NestJS module + migrations
  permissions?: PortalPermissions;// Required permissions
  configSchema?: Record<string, PortalConfigSchema>;  // Config options
}

export interface PortalMetadata {
  id: string;                     // Unique ID (e.g., 'tasks')
  name: string;                   // Display name
  description: string;
  version: string;                // Semver
  author?: string;
  icon: ReactNode;                // MUI Icon or SVG
  category?: 'productivity' | 'analytics' | 'crm' | 'communication' | 'custom';
  tags?: string[];
}

export interface PortalFrontend {
  widget: {
    component: ComponentType<PortalWidgetProps>;
    defaultSize: PortalSize;      // Grid dimensions
    configurable?: boolean;
  };
  app: {
    route: string;                // e.g., '/apps/tasks'
    component: ComponentType<PortalAppProps>;
  };
}

export interface PortalBackend {
  module: Module;                 // NestJS module
  apiPrefix?: string;             // API route prefix
  migrations?: any[];             // TypeORM migrations
}
```

### Example Portlet Definition

```typescript
// portlets/portlet-tasks/src/index.ts

import { Portlet } from '@station/portlet-sdk';
import { TasksWidget } from './frontend/TasksWidget';
import { TasksApp } from './frontend/TasksApp';
import { TasksModule } from './backend/tasks.module';
import AssignmentIcon from '@mui/icons-material/Assignment';

export const TasksPortlet: Portlet = {
  metadata: {
    id: 'tasks',
    name: 'Task Manager',
    description: 'Manage your tasks and to-dos',
    version: '1.0.0',
    author: 'Station Team',
    icon: <AssignmentIcon />,
    category: 'productivity',
    tags: ['tasks', 'todo', 'productivity'],
  },

  frontend: {
    widget: {
      component: TasksWidget,
      defaultSize: {
        width: 4,      // 4 columns (of 12)
        height: 3,     // 3 rows
        minWidth: 3,
        minHeight: 2,
      },
      configurable: true,
    },
    app: {
      route: '/apps/tasks',
      component: TasksApp,
    },
  },

  backend: {
    module: TasksModule,
    apiPrefix: '/portals/tasks',
    migrations: [
      CreateTasksTables1700000001,
      AddTaskComments1700000002,
    ],
  },

  permissions: {
    view: ['portlet.tasks.view'],
    use: ['portlet.tasks.use'],
    admin: ['portlet.tasks.admin'],
  },

  configSchema: {
    showCompleted: {
      type: 'boolean',
      label: 'Show Completed Tasks',
      description: 'Display completed tasks in the widget',
      default: true,
    },
    defaultView: {
      type: 'select',
      label: 'Default View',
      options: [
        { value: 'list', label: 'List View' },
        { value: 'board', label: 'Board View' },
      ],
      default: 'list',
    },
  },
};
```

### Portlet Registration

Portlets are registered at application startup:

```typescript
// backend/src/main.ts

import { PortalRegistryService } from './modules/portals/portal-registry.service';
import { TasksPortlet } from '@station/portlet-tasks';
import { CrmPortlet } from '@station/portlet-crm';
import { AnalyticsPortlet } from '@station/portlet-analytics';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get portal registry service
  const registry = app.get(PortalRegistryService);

  // Register all portlets
  registry.register(TasksPortlet);
  registry.register(CrmPortlet);
  registry.register(AnalyticsPortlet);

  await app.listen(3000);
}
```

```typescript
// frontend/src/App.tsx

import { portalRegistry } from './portals/PortalRegistry';
import { TasksPortlet } from '@station/portlet-tasks';
import { CrmPortlet } from '@station/portlet-crm';
import { AnalyticsPortlet } from '@station/portlet-analytics';

// Register portlets on frontend
portalRegistry.register(TasksPortlet);
portalRegistry.register(CrmPortlet);
portalRegistry.register(AnalyticsPortlet);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<PortalDashboard />} />

        {/* Dynamic routes for all registered portlets */}
        {portalRegistry.getAll().map((portlet) => (
          <Route
            key={portlet.metadata.id}
            path={portlet.frontend.app.route}
            element={<portlet.frontend.app.component />}
          />
        ))}
      </Routes>
    </BrowserRouter>
  );
}
```

### Portal Registry Service

The registry maintains the list of available portlets and their enablement:

```typescript
// backend/src/modules/portals/portal-registry.service.ts

@Injectable()
export class PortalRegistryService implements OnModuleInit {
  private portlets = new Map<string, Portlet>();

  /**
   * Register a portlet (called at startup)
   */
  register(portlet: Portlet): void {
    // Validate portlet structure
    this.validatePortlet(portlet);

    // Check for conflicts
    if (this.portlets.has(portlet.metadata.id)) {
      throw new Error(`Portlet ${portlet.metadata.id} already registered`);
    }

    this.portlets.set(portlet.metadata.id, portlet);
    this.logger.log(`✓ Registered portlet: ${portlet.metadata.name}`);
  }

  /**
   * Get all registered portlets
   */
  getAllPortlets(): Portlet[] {
    return Array.from(this.portlets.values());
  }

  /**
   * Get enabled portlets for an organization
   */
  async getEnabledPortlets(organizationId: string): Promise<PortalInstance[]> {
    return this.portalInstanceRepository.find({
      where: {
        organizationId,
        enabled: true,
      },
    });
  }

  /**
   * Sync registered portlets to database
   */
  async onModuleInit() {
    for (const portlet of this.getAllPortlets()) {
      // Ensure portlet exists in portal_definitions table
      await this.syncPortletDefinition(portlet);

      // Run portlet migrations
      if (portlet.backend?.migrations) {
        await this.runPortletMigrations(portlet);
      }
    }
  }
}
```

> **[AI Note]:** The registry automatically syncs portlet metadata to the `portal_definitions` table and runs migrations on startup. Portlet developers don't need to manually manage this.

---

## Event Bus Architecture

### Why RabbitMQ?

**Decision:** Use RabbitMQ for the event bus instead of Redis Streams or database polling.

**Rationale:**

| Feature | Database Polling | Redis Streams | RabbitMQ | Kafka |
|---------|------------------|---------------|----------|-------|
| **Setup Complexity** | ⭐ Simple | ⭐⭐ Easy | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ Complex |
| **Throughput** | 1k/sec | 100k/sec | 50k/sec | 1M+/sec |
| **Latency** | 1-5 sec | <100ms | <50ms | <10ms |
| **Dead Letter Queue** | Manual | Manual | ✅ Built-in | Manual |
| **Management UI** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Topic Routing** | Manual | Manual | ✅ Native | ✅ Native |

RabbitMQ is the sweet spot: production-ready, feature-rich, not overkill.

### Event Bus Pattern

Portlets communicate via **publish-subscribe pattern** using RabbitMQ topic exchanges:

```
┌─────────────┐                     ┌─────────────┐
│ CRM Portlet │                     │RabbitMQ     │
│             │   Publish Event     │Exchange:    │
│ Contact     │─────────────────────▶portal.events│
│ Created     │  crm.contact.created│(type: topic)│
└─────────────┘                     └──────┬──────┘
                                           │
                        ┌──────────────────┼──────────────────┐
                        │                  │                  │
                   Route to            Route to          Route to
                   Subscribers        Subscribers       Subscribers
                        │                  │                  │
                        ▼                  ▼                  ▼
                  ┌──────────┐      ┌──────────┐      ┌──────────┐
                  │  Tasks   │      │Analytics │      │  Email   │
                  │ Portlet  │      │ Portlet  │      │ Portlet  │
                  │          │      │          │      │          │
                  │ Queue:   │      │ Queue:   │      │ Queue:   │
                  │ portlet. │      │ portlet. │      │ portlet. │
                  │ tasks    │      │ analytics│      │ email    │
                  └──────────┘      └──────────┘      └──────────┘
                       │                  │                  │
                       │                  │                  │
                  Process Event      Process Event    Process Event
                       │                  │                  │
                       ▼                  ▼                  ▼
              Create follow-up      Log to dashboard   Send welcome
                  task                                     email
```

### Event Naming Convention

Events follow a hierarchical naming pattern:

```
{portlet_id}.{entity}.{action}

Examples:
  crm.contact.created
  crm.contact.updated
  crm.contact.deleted
  crm.deal.created
  crm.deal.stage_changed
  tasks.task.created
  tasks.task.completed
  tasks.project.archived
  analytics.report.generated
```

This enables wildcard subscriptions:

```typescript
// Subscribe to all CRM events
eventBus.subscribe('tasks', ['crm.*'], handler);

// Subscribe to all "created" events
eventBus.subscribe('analytics', ['*.created'], handler);

// Subscribe to specific entity across all actions
eventBus.subscribe('notifications', ['*.contact.*'], handler);
```

### Event Structure

```typescript
export interface PortalEvent {
  // Unique event ID
  id?: string;

  // Source information
  sourcePortletId: string;        // e.g., 'crm'
  eventType: string;              // e.g., 'crm.contact.created'

  // Entity information
  entityType?: string;            // e.g., 'contact'
  entityId?: string;              // UUID of entity

  // Event payload
  payload: Record<string, any>;   // Event-specific data

  // Context
  organizationId?: string;        // Which org
  userId?: string;                // Who triggered it

  // Tracing
  correlationId?: string;         // Group related events
  causationId?: string;           // Event that caused this

  // Metadata
  timestamp?: Date;
  metadata?: Record<string, any>;
}
```

### Publishing Events

```typescript
// portlets/portlet-crm/src/backend/contacts.service.ts

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
    @Inject('EVENT_BUS')
    private eventBus: EventBus,
  ) {}

  async create(createDto: CreateContactDto, userId: string, orgId: string) {
    // 1. Create contact in database
    const contact = await this.contactRepo.save({
      ...createDto,
      organization_id: orgId,
      created_by: userId,
    });

    // 2. Publish event
    await this.eventBus.publish({
      sourcePortletId: 'crm',
      eventType: 'crm.contact.created',
      entityType: 'contact',
      entityId: contact.id,
      payload: {
        contactId: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        companyId: contact.company_id,
      },
      organizationId: orgId,
      userId: userId,
    });

    return contact;
  }
}
```

> **[AI Note]:** Always publish events AFTER the database transaction commits. Never publish events inside a transaction that might be rolled back.

### Subscribing to Events

```typescript
// portlets/portlet-tasks/src/backend/tasks.module.ts

@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule implements OnModuleInit {
  constructor(
    @Inject('EVENT_BUS')
    private eventBus: EventBus,
    private tasksService: TasksService,
  ) {}

  async onModuleInit() {
    // Subscribe to relevant events
    await this.eventBus.subscribe(
      'tasks',
      [
        'crm.contact.*',      // All contact events
        'crm.deal.created',   // Specific deal event
      ],
      this.handleEvent.bind(this),
    );
  }

  private async handleEvent(event: PortalEvent) {
    try {
      switch (event.eventType) {
        case 'crm.deal.created':
          await this.tasksService.onDealCreated(event);
          break;

        case 'crm.contact.updated':
          await this.tasksService.onContactUpdated(event);
          break;

        default:
          this.logger.debug(`Received event: ${event.eventType}`);
      }
    } catch (error) {
      this.logger.error(`Error handling event: ${event.eventType}`, error);
      throw error;  // Will be retried by RabbitMQ
    }
  }
}
```

### RabbitMQ Configuration

```typescript
// backend/src/modules/portals/event-bus/rabbitmq.service.ts

@Injectable()
export class RabbitMQService implements OnModuleInit {
  async onModuleInit() {
    // Connect to RabbitMQ
    this.connection = await amqp.connect(this.config.rabbitmqUrl);
    this.channel = await this.connection.createChannel();

    // Set QoS (prefetch)
    await this.channel.prefetch(10);  // Process 10 messages at a time

    // Create topic exchange
    await this.channel.assertExchange('portal.events', 'topic', {
      durable: true,  // Survive broker restart
    });

    // Create dead letter exchange for failed messages
    await this.channel.assertExchange('portal.events.dlx', 'topic', {
      durable: true,
    });
  }
}
```

### Retry & Error Handling

RabbitMQ automatically retries failed messages with exponential backoff:

```
Message fails
    │
    ├─ Attempt 1: Immediate retry
    │  └─ Still fails
    │
    ├─ Attempt 2: Retry after 2 seconds
    │  └─ Still fails
    │
    ├─ Attempt 3: Retry after 4 seconds
    │  └─ Still fails (max retries exceeded)
    │
    └─ Send to Dead Letter Queue
       └─ Requires manual investigation
```

```typescript
// Automatic retry logic in event bus
const retryCount = msg.properties.headers?.['x-retry-count'] || 0;
const maxRetries = 3;

if (retryCount < maxRetries) {
  // Retry with exponential backoff
  setTimeout(() => {
    channel.publish(exchange, routingKey, msg.content, {
      headers: { 'x-retry-count': retryCount + 1 },
    });
  }, Math.pow(2, retryCount) * 1000);
} else {
  // Send to Dead Letter Queue
  channel.nack(msg, false, false);
}
```

### Event Logging

All events are logged to `portal_event_logs` table for audit and replay:

```sql
SELECT
  event_type,
  portlet_id,
  payload,
  published_at
FROM portal_event_logs
WHERE organization_id = '...'
  AND published_at >= NOW() - INTERVAL '24 hours'
ORDER BY published_at DESC;
```

> **[AI Note]:** The event log table allows you to replay events if needed. To replay, read events from the table and re-publish them to RabbitMQ.

---

## Security & Hardening

### Threat Model

Potential threats in a managed plugin architecture:

1. **Config Injection** - Malicious JSON in portlet config
2. **Permission Bypass** - Portlet forgets to check permissions
3. **Data Leakage** - Portlet queries wrong organization's data
4. **Route Conflicts** - Two portlets use same route
5. **XSS** - Portlet renders unsanitized user input
6. **SQL Injection** - Portlet uses raw SQL with user input

### Mitigation: Import Boundaries

Prevent portlets from importing core code or other portlets:

```javascript
// .eslintrc.json

{
  "overrides": [
    {
      "files": ["portlets/**/*"],
      "rules": {
        "no-restricted-imports": ["error", {
          "patterns": [
            {
              "group": ["../../backend/*", "../../frontend/*"],
              "message": "Portlets cannot import from core backend/frontend. Use portlet-sdk only."
            },
            {
              "group": ["../../portlets/*/"],
              "message": "Portlets cannot import from other portlets. Use event bus for communication."
            }
          ]
        }]
      }
    }
  ]
}
```

### Mitigation: Framework-Level Permissions

Enforce permissions at decorator level, not in portlet code:

```typescript
// packages/portlet-sdk/src/decorators/portal-controller.decorator.ts

export function PortalController(portletId: string, basePath?: string) {
  return applyDecorators(
    Controller(basePath || `portals/${portletId}`),
    UseGuards(AuthGuard('jwt')),           // Always require auth
    UseGuards(PortalPermissionGuard),      // Always check permissions
    UseInterceptors(AuditLogInterceptor),  // Always log actions
  );
}

// Portlet controller MUST use this decorator
@PortalController('tasks')
export class TasksController {
  // Permissions automatically enforced
}
```

Custom ESLint rule to enforce:

```javascript
// Ensure portlet controllers use @PortalController
module.exports = {
  create(context) {
    return {
      ClassDeclaration(node) {
        if (isPortletController(node) && !hasPortalControllerDecorator(node)) {
          context.report({
            node,
            message: 'Portlet controllers must use @PortalController decorator'
          });
        }
      }
    };
  }
};
```

### Mitigation: Database Isolation

All portlet repositories automatically filter by `organization_id`:

```typescript
// packages/portlet-sdk/src/base-repository.ts

@Injectable({ scope: Scope.REQUEST })
export class PortalRepository<T extends PortalBaseEntity> extends Repository<T> {
  constructor(
    @Inject(REQUEST) private request: any,
  ) {
    super();
  }

  private get currentOrgId(): string {
    return this.request.user?.organizationId;
  }

  // Override find to inject organizationId
  async find(options?: any): Promise<T[]> {
    return super.find({
      ...options,
      where: {
        ...options?.where,
        organizationId: this.currentOrgId,  // ALWAYS filtered
      }
    });
  }

  // Override all query methods similarly...
}
```

PostgreSQL Row-Level Security (defense in depth):

```sql
-- Enable RLS on all portlet tables
ALTER TABLE portal_tasks_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON portal_tasks_tasks
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);
```

### Mitigation: Config Validation

Validate all config against JSON Schema:

```typescript
// packages/portlet-sdk/src/config-validator.ts

import Ajv from 'ajv';

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: 'all',  // Strip unknown properties
  useDefaults: true,
  coerceTypes: true,
});

export function validatePortalConfig<T>(
  config: unknown,
  schema: object,
): T {
  const validate = ajv.compile(schema);

  if (!validate(config)) {
    throw new Error(`Invalid config: ${ajv.errorsText(validate.errors)}`);
  }

  // Additional sanitization
  return sanitizeConfig(config) as T;
}

function sanitizeConfig(config: any): any {
  if (typeof config === 'string') {
    return DOMPurify.sanitize(config);
  }
  if (Array.isArray(config)) {
    return config.map(sanitizeConfig);
  }
  if (typeof config === 'object' && config !== null) {
    return Object.fromEntries(
      Object.entries(config).map(([k, v]) => [k, sanitizeConfig(v)])
    );
  }
  return config;
}
```

### Mitigation: Content Security Policy

```typescript
// backend/src/main.ts

import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // For MUI
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));
```

### Mitigation: Automated Security Scanning

```yaml
# .github/workflows/portlet-security.yml

on:
  pull_request:
    paths:
      - 'portlets/**'

jobs:
  security-scan:
    steps:
      # Dependency vulnerabilities
      - name: npm audit
        run: pnpm audit --audit-level=high

      # Static analysis
      - name: Semgrep
        uses: returntocorp/semgrep-action@v1

      # Check for dangerous patterns
      - name: Dangerous code check
        run: |
          grep -r "eval(" portlets/ && exit 1
          grep -r "dangerouslySetInnerHTML" portlets/ && exit 1
          echo "✓ No dangerous patterns"
```

### Security Checklist

Every portlet PR must pass this checklist:

```markdown
## Portlet Security Review

### Authentication & Authorization
- [ ] All API endpoints use `@PortalController` decorator
- [ ] No hardcoded credentials or API keys

### Data Access
- [ ] All entities extend `PortalBaseEntity`
- [ ] All repositories use `PortalRepository`
- [ ] No raw SQL queries

### Input Validation
- [ ] All user inputs validated with DTOs
- [ ] Config schema defined and validated
- [ ] No `eval()`, `Function()`, or `dangerouslySetInnerHTML`

### Dependencies
- [ ] Only imports from `@station/portlet-sdk`
- [ ] No vulnerable dependencies (`pnpm audit` passes)

### Error Handling
- [ ] No sensitive data in error messages
- [ ] All errors logged

### Testing
- [ ] Unit tests cover security-critical paths
- [ ] Integration tests verify permission enforcement
```

> **[AI Note]:** When reviewing portlet code, always check against this security checklist. Reject PRs that don't follow these patterns.

---

## Portlet Interoperability

### Pattern 1: Event Bus (Primary Method)

Portlets communicate via events - the recommended approach:

```typescript
// CRM creates deal
const deal = await dealRepo.save({ /* ... */ });

// Publish event
await eventBus.publish({
  sourcePortletId: 'crm',
  eventType: 'crm.deal.created',
  payload: {
    dealId: deal.id,
    dealName: deal.name,
    contactId: deal.contact_id,
    amount: deal.amount,
  },
});

// Tasks portlet subscribes and auto-creates project
@EventHandler('crm.deal.created')
async onDealCreated(event: PortalEvent) {
  const project = await projectRepo.save({
    name: `Project: ${event.payload.dealName}`,
    organization_id: event.organizationId,
  });
}
```

**Pros:**
- ✅ Loose coupling
- ✅ Async (non-blocking)
- ✅ Multiple subscribers
- ✅ Auditable (all events logged)

**Cons:**
- ⚠️ Eventual consistency (not immediate)
- ⚠️ More complex to debug

### Pattern 2: Entity Registry (For References)

Central registry for cross-portlet entity references:

```sql
-- Universal entity registry
CREATE TABLE portal_entity_registry (
  id UUID PRIMARY KEY,
  portlet_id VARCHAR(50) NOT NULL,
  organization_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  url VARCHAR(500),
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(portlet_id, entity_type, entity_id)
);

-- Cross-portlet links
CREATE TABLE portal_entity_links (
  id UUID PRIMARY KEY,
  from_portlet_id VARCHAR(50),
  from_entity_id UUID,
  to_portlet_id VARCHAR(50),
  to_entity_id UUID,
  link_type VARCHAR(50),
  organization_id UUID NOT NULL,

  FOREIGN KEY (from_portlet_id, from_entity_id)
    REFERENCES portal_entity_registry(portlet_id, entity_id),
  FOREIGN KEY (to_portlet_id, to_entity_id)
    REFERENCES portal_entity_registry(portlet_id, entity_id)
);
```

```typescript
// CRM registers contact
await entityRegistry.register({
  portletId: 'crm',
  entityType: 'contact',
  entityId: contact.id,
  displayName: `${contact.first_name} ${contact.last_name}`,
  url: `/apps/crm/contacts/${contact.id}`,
});

// Tasks links task to contact
await entityRegistry.link({
  from: { portletId: 'tasks', entityId: task.id },
  to: { portletId: 'crm', entityId: contact.id },
  linkType: 'assigned_to',
});

// Query all tasks for a contact
const linkedTasks = await entityRegistry.getLinkedEntities({
  portletId: 'crm',
  entityId: contact.id,
  linkedPortletId: 'tasks',
});
```

**Pros:**
- ✅ Direct references
- ✅ Queryable relationships
- ✅ Type safety

**Cons:**
- ⚠️ Tighter coupling
- ⚠️ More complex schema

### Pattern 3: Shared Tables (For Common Entities)

Some entities are truly shared:

```sql
-- Shared companies table
CREATE TABLE portal_shared_companies (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  website VARCHAR(500),
  -- ...
);

-- CRM contact references shared company
CREATE TABLE portal_crm_contacts (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES portal_shared_companies(id),
  -- ...
);

-- Tasks project also references same company
CREATE TABLE portal_tasks_projects (
  id UUID PRIMARY KEY,
  client_company_id UUID REFERENCES portal_shared_companies(id),
  -- ...
);
```

**Pros:**
- ✅ No data duplication
- ✅ Single source of truth

**Cons:**
- ⚠️ Breaks portlet isolation
- ⚠️ Schema changes affect multiple portlets

**Use sparingly** - only for truly universal entities (companies, files, tags).

### Recommendation

For most use cases, use **Event Bus** (Pattern 1) as the primary communication mechanism. Use **Entity Registry** (Pattern 2) when you need direct references and queryable relationships. Only use **Shared Tables** (Pattern 3) for truly universal entities.

> **[AI Note]:** Default to event bus for portlet communication. Only suggest entity registry or shared tables if the user explicitly needs direct relationships or queries across portlets.

---

## Portal Lifecycle

### Portlet Development Workflow

```
1. Create Portlet Package
   └─▶ cd portlets/
       └─▶ mkdir portlet-newfeature
           └─▶ pnpm init

2. Implement Portlet
   └─▶ Create frontend components
   └─▶ Create backend module
   └─▶ Define portlet interface
   └─▶ Write migrations

3. Register Portlet
   └─▶ Import in backend/src/main.ts
   └─▶ Import in frontend/src/App.tsx

4. Test Locally
   └─▶ pnpm install (creates workspace links)
   └─▶ pnpm run dev

5. Deploy
   └─▶ git push
   └─▶ CI/CD builds and deploys
```

### Portlet Installation (Per Organization)

```
1. Organization Admin Enables Portlet
   └─▶ POST /api/portals/instances
       {
         "portletId": "tasks",
         "organizationId": "...",
         "enabled": true
       }

2. Backend Creates Portal Instance
   └─▶ INSERT INTO portal_instances ...

3. Users See Portlet on Dashboard
   └─▶ GET /api/portals/my-dashboard
       └─▶ Returns enabled portlets for user's org

4. User Customizes Widget
   └─▶ PATCH /api/portals/preferences/tasks
       {
         "visible": true,
         "position": { x: 0, y: 0 },
         "config": { "showCompleted": false }
       }
```

### Portlet Upgrade

```
1. Developer Updates Portlet Code
   └─▶ Increment version in metadata
   └─▶ Add new migration if schema changes

2. Deploy to Production
   └─▶ git push
   └─▶ CI/CD rebuilds and deploys

3. Backend Detects New Version
   └─▶ PortalRegistryService.onModuleInit()
       └─▶ Syncs metadata to portal_definitions
       └─▶ Runs new migrations

4. Users Get New Features
   └─▶ No action needed
   └─▶ Widget/app automatically updated
```

### Portlet Deactivation

```
1. Organization Admin Disables Portlet
   └─▶ PATCH /api/portals/instances/:id
       { "enabled": false }

2. Portlet Removed from Dashboard
   └─▶ Widget no longer shown
   └─▶ Full app still accessible (data preserved)

3. Optional: Uninstall (Delete Data)
   └─▶ DELETE /api/portals/instances/:id
       └─▶ Cascades to portlet-specific tables
```

---

## Best Practices & Patterns

### Portlet Design Guidelines

1. **Keep Widgets Lightweight**
   - Load quickly (< 500ms)
   - Show summary data only
   - Provide "expand" button for details

2. **Design for Multi-Tenancy**
   - ALWAYS filter by `organization_id`
   - Never expose data across orgs
   - Test with multiple orgs

3. **Handle Errors Gracefully**
   - Show user-friendly error messages
   - Don't break the dashboard
   - Log errors for debugging

4. **Make Config Optional**
   - Provide sensible defaults
   - Don't require config to work
   - Validate config schema

5. **Document Permissions**
   - Clearly state required permissions
   - Test with different roles
   - Provide permission denied UI

### Event Design Guidelines

1. **Event Names Should Be Past Tense**
   ```typescript
   ✅ 'crm.contact.created'
   ❌ 'crm.contact.create'
   ```

2. **Include Minimal But Sufficient Data**
   ```typescript
   ✅ { contactId, firstName, lastName, email }
   ❌ { /* entire 50-field object */ }
   ```

3. **Always Include Context**
   ```typescript
   ✅ { organizationId, userId, timestamp }
   ❌ { /* no context */ }
   ```

4. **Use Correlation IDs for Workflows**
   ```typescript
   // Link related events
   const correlationId = generateUuid();

   await eventBus.publish({
     correlationId,
     eventType: 'crm.deal.created',
     // ...
   });

   await eventBus.publish({
     correlationId,  // Same ID
     causationId: event.id,  // Previous event
     eventType: 'tasks.project.created',
     // ...
   });
   ```

### Testing Guidelines

1. **Unit Tests**
   - Test business logic in services
   - Mock dependencies
   - Test error cases

2. **Integration Tests**
   - Test API endpoints
   - Test database interactions
   - Test event publishing/subscribing

3. **E2E Tests**
   - Test full user workflows
   - Test cross-portlet interactions
   - Test permission enforcement

### Performance Guidelines

1. **Database Queries**
   - Always index on `(organization_id, ...)`
   - Use pagination for lists
   - Avoid N+1 queries

2. **Caching**
   - Cache frequently-read data
   - Invalidate on updates
   - Use Redis for shared cache

3. **Event Payloads**
   - Keep payloads small (< 1MB)
   - Don't send large arrays
   - Link to entities, don't embed

### Monitoring Guidelines

1. **Log Important Actions**
   - User actions (create, update, delete)
   - Event publishing/handling
   - Errors and exceptions

2. **Track Metrics**
   - API response times
   - Event processing times
   - Error rates

3. **Alert on Anomalies**
   - High error rates
   - Slow responses
   - Queue depth growing

---

## Appendix

### Common Patterns

#### Pattern: Transactional Outbox

Ensure events are only published if database commit succeeds:

```typescript
async createTask(dto: CreateTaskDto) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Save to database
    const task = await queryRunner.manager.save(Task, dto);

    // Commit transaction
    await queryRunner.commitTransaction();

    // Only publish after successful commit
    await this.eventBus.publish({
      eventType: 'tasks.task.created',
      entityId: task.id,
      // ...
    });

    return task;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

#### Pattern: Event Replay

Replay events from audit log:

```typescript
async replayEvents(portletId: string, fromDate: Date) {
  const events = await eventLogRepo.find({
    where: {
      portletId,
      publishedAt: MoreThanOrEqual(fromDate),
    },
    order: { publishedAt: 'ASC' },
  });

  for (const event of events) {
    await eventBus.publish({
      ...event,
      metadata: {
        ...event.metadata,
        isReplay: true,
      },
    });
  }
}
```

#### Pattern: Saga/Workflow

Coordinate multi-step workflows across portlets:

```typescript
// Workflow: Deal Created → Project Created → Task Created

// Step 1: CRM creates deal
await eventBus.publish({
  correlationId,
  eventType: 'crm.deal.created',
  payload: { dealId, dealName },
});

// Step 2: Tasks creates project
@EventHandler('crm.deal.created')
async onDealCreated(event: PortalEvent) {
  const project = await createProject(event.payload.dealName);

  await eventBus.publish({
    correlationId: event.correlationId,
    causationId: event.id,
    eventType: 'tasks.project.created',
    payload: { projectId: project.id },
  });
}

// Step 3: Tasks creates initial task
@EventHandler('tasks.project.created')
async onProjectCreated(event: PortalEvent) {
  await createTask({
    projectId: event.payload.projectId,
    title: 'Project kickoff',
  });
}
```

### Troubleshooting

**Events Not Being Delivered:**

1. Check RabbitMQ queue bindings: `http://localhost:15672/#/queues`
2. Check if consumer is connected
3. Check event routing key matches subscription pattern
4. Check for errors in consumer logs

**Data Leaking Across Organizations:**

1. Verify all queries include `organization_id` filter
2. Check if using `PortalRepository` base class
3. Test with multiple organizations
4. Enable PostgreSQL RLS as defense in depth

**Performance Issues:**

1. Check database query performance (EXPLAIN ANALYZE)
2. Verify indexes exist on `(organization_id, ...)`
3. Check for N+1 queries
4. Profile RabbitMQ queue depth

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-20 | Initial design document | AI Assistant |

---

> **[AI Context Summary]:** This document describes the portal system design for Station. Key patterns: (1) Managed plugins installed at build-time, not runtime; (2) RabbitMQ event bus for loose coupling between portlets; (3) Framework-level security enforcement; (4) Multi-tenancy via `organization_id` filtering. When building portlets, always follow the event bus pattern for communication, use the `@PortalController` decorator for API endpoints, and extend `PortalBaseEntity` for database entities.

---

**End of Document**
