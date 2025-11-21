# Station Portal System - Implementation Guide

**Document Version:** 1.0
**Last Updated:** 2025-11-20
**Project:** Station - Modular Portal Application Platform
**Document Type:** Implementation & Development Guide

---

> **[AI Context Note]:** This document provides step-by-step implementation instructions for building portlets, setting up the development environment, and deploying the Station platform. Use this as a practical guide when implementing new portlets or onboarding new developers. This is the "how to build it" companion to the architecture and design documents.

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Building Your First Portlet](#building-your-first-portlet)
3. [Frontend Development](#frontend-development)
4. [Backend Development](#backend-development)
5. [Database Migrations](#database-migrations)
6. [Event Bus Integration](#event-bus-integration)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Common Tasks](#common-tasks)

---

## Environment Setup

### Prerequisites

```bash
# Required software
- Node.js: v20 LTS or higher
- pnpm: 10.22 or higher
- Docker: 24.x or higher
- Docker Compose: 2.x or higher
- Git: 2.x or higher

# Optional (recommended)
- VS Code with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Docker
```

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourorg/station.git
cd station

# 2. Install pnpm (if not already installed)
npm install -g pnpm@10.22

# 3. Install dependencies for all workspace packages
pnpm install

# 4. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 5. Start Docker services
docker-compose up -d

# 6. Wait for services to be healthy (30-60 seconds)
docker-compose ps

# Expected output:
# NAME                STATUS              PORTS
# station-postgres    Up (healthy)        5432->5432
# station-redis       Up (healthy)        6379->6379
# station-rabbitmq    Up (healthy)        5672->5672, 15672->15672

# 7. Run database migrations
cd backend
pnpm run migration:run

# 8. Seed database with initial data (optional)
pnpm run seed

# 9. Start backend development server
pnpm run dev

# 10. In a new terminal, start frontend
cd ../frontend
pnpm run dev
```

### Verify Installation

```bash
# Check backend is running
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"...","services":{"database":"healthy",...}}

# Check frontend is running
# Open browser: http://localhost:5173

# Check RabbitMQ Management UI
# Open browser: http://localhost:15672
# Username: station, Password: station

# Check if portlets are registered
curl http://localhost:3000/api/portals/available

# Expected: Array of available portlets
```

### Project Structure

```
station/
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── main.ts            # Entry point
│   │   ├── app.module.ts      # Root module
│   │   └── modules/           # Feature modules
│   │       ├── auth/
│   │       ├── users/
│   │       ├── organizations/
│   │       └── portals/       # Portal system
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── main.tsx           # Entry point
│   │   ├── App.tsx            # Root component
│   │   ├── pages/             # Page components
│   │   └── portals/           # Portal registry
│   ├── package.json
│   └── vite.config.ts
│
├── portlets/                   # All portlet packages
│   ├── portlet-tasks/
│   ├── portlet-crm/
│   └── portlet-analytics/
│
├── packages/                   # Shared packages
│   └── portlet-sdk/           # Portlet interface
│
├── docs/                       # Documentation
├── docker-compose.yml          # Dev services
├── pnpm-workspace.yaml         # Workspace config
└── turbo.json                  # Build config
```

> **[AI Note]:** This is a pnpm workspace monorepo. All packages can reference each other using `workspace:*` protocol. Changes to one package are immediately reflected in dependent packages during development.

---

## Building Your First Portlet

Let's build a simple "Notes" portlet step-by-step.

### Step 1: Create Portlet Package

```bash
# Navigate to portlets directory
cd portlets

# Create new portlet directory
mkdir portlet-notes
cd portlet-notes

# Initialize package.json
pnpm init

# Edit package.json
```

```json
{
  "name": "@station/portlet-notes",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@station/portlet-sdk": "workspace:*",
    "@mui/material": "^6.0.0",
    "@mui/icons-material": "^6.0.0",
    "react": "^18.0.0"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "typeorm": "^0.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

```bash
# Create TypeScript config
cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# Create directory structure
mkdir -p src/frontend
mkdir -p src/backend
mkdir -p src/backend/dto
mkdir -p src/backend/migrations
```

### Step 2: Define Portlet Interface

```typescript
// src/index.ts

import { Portlet } from '@station/portlet-sdk';
import { NotesWidget } from './frontend/NotesWidget';
import { NotesApp } from './frontend/NotesApp';
import { NotesModule } from './backend/notes.module';
import NoteIcon from '@mui/icons-material/Note';
import { CreateNotesTable1700000001 } from './backend/migrations/1700000001-CreateNotesTable';

export const NotesPortlet: Portlet = {
  metadata: {
    id: 'notes',
    name: 'Notes',
    description: 'Quick notes and reminders',
    version: '1.0.0',
    author: 'Your Name',
    icon: <NoteIcon />,
    category: 'productivity',
    tags: ['notes', 'productivity', 'reminders'],
  },

  frontend: {
    widget: {
      component: NotesWidget,
      defaultSize: {
        width: 4,
        height: 3,
        minWidth: 3,
        minHeight: 2,
      },
      configurable: true,
    },
    app: {
      route: '/apps/notes',
      component: NotesApp,
    },
  },

  backend: {
    module: NotesModule,
    apiPrefix: '/portals/notes',
    migrations: [CreateNotesTable1700000001],
  },

  permissions: {
    view: ['portlet.notes.view'],
    use: ['portlet.notes.use'],
    admin: ['portlet.notes.admin'],
  },

  configSchema: {
    showArchived: {
      type: 'boolean',
      label: 'Show Archived Notes',
      description: 'Display archived notes in the widget',
      default: false,
    },
    maxNotes: {
      type: 'number',
      label: 'Maximum Notes to Display',
      description: 'Number of notes to show in widget',
      default: 5,
      min: 1,
      max: 20,
    },
  },
};
```

### Step 3: Create Backend Entity

```typescript
// src/backend/note.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '@/modules/organizations/organization.entity';
import { User } from '@/modules/users/user.entity';

@Entity('portal_notes_notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Multi-tenancy (REQUIRED)
  @Column({ type: 'uuid' })
  organization_id: string;

  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  // Ownership
  @Column({ type: 'uuid' })
  created_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  // Note data
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string; // Hex color

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'boolean', default: false })
  is_archived: boolean;

  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### Step 4: Create DTOs

```typescript
// src/backend/dto/create-note.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  Matches,
} from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid hex color (e.g., #FF5733)',
  })
  color?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
```

```typescript
// src/backend/dto/update-note.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateNoteDto } from './create-note.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNoteDto extends PartialType(CreateNoteDto) {
  @IsOptional()
  @IsBoolean()
  is_pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  is_archived?: boolean;
}
```

### Step 5: Create Service

```typescript
// src/backend/notes.service.ts

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from './note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { EventBus } from '@station/portlet-sdk';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private noteRepo: Repository<Note>,
    @Inject('EVENT_BUS')
    private eventBus: EventBus,
  ) {}

  async findAll(organizationId: string, showArchived = false) {
    const query = this.noteRepo
      .createQueryBuilder('note')
      .where('note.organization_id = :organizationId', { organizationId })
      .orderBy('note.is_pinned', 'DESC')
      .addOrderBy('note.updated_at', 'DESC');

    if (!showArchived) {
      query.andWhere('note.is_archived = false');
    }

    return query.getMany();
  }

  async findOne(id: string, organizationId: string) {
    const note = await this.noteRepo.findOne({
      where: { id, organization_id: organizationId },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return note;
  }

  async create(
    createDto: CreateNoteDto,
    userId: string,
    organizationId: string,
  ) {
    // Create note
    const note = await this.noteRepo.save({
      ...createDto,
      organization_id: organizationId,
      created_by: userId,
    });

    // Publish event
    await this.eventBus.publish({
      sourcePortletId: 'notes',
      eventType: 'notes.note.created',
      entityType: 'note',
      entityId: note.id,
      payload: {
        noteId: note.id,
        title: note.title,
      },
      organizationId,
      userId,
    });

    return note;
  }

  async update(
    id: string,
    updateDto: UpdateNoteDto,
    userId: string,
    organizationId: string,
  ) {
    const note = await this.findOne(id, organizationId);

    Object.assign(note, updateDto);
    const updated = await this.noteRepo.save(note);

    // Publish event
    await this.eventBus.publish({
      sourcePortletId: 'notes',
      eventType: 'notes.note.updated',
      entityType: 'note',
      entityId: note.id,
      payload: {
        noteId: note.id,
        changes: updateDto,
      },
      organizationId,
      userId,
    });

    return updated;
  }

  async remove(id: string, userId: string, organizationId: string) {
    const note = await this.findOne(id, organizationId);
    await this.noteRepo.remove(note);

    // Publish event
    await this.eventBus.publish({
      sourcePortletId: 'notes',
      eventType: 'notes.note.deleted',
      entityType: 'note',
      entityId: id,
      payload: { noteId: id },
      organizationId,
      userId,
    });
  }
}
```

### Step 6: Create Controller

```typescript
// src/backend/notes.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Controller('portals/notes')
@UseGuards(AuthGuard('jwt'))
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async findAll(
    @Req() req,
    @Query('showArchived') showArchived?: string,
  ) {
    const organizationId = req.user.organizationId;
    return this.notesService.findAll(
      organizationId,
      showArchived === 'true',
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.notesService.findOne(id, req.user.organizationId);
  }

  @Post()
  async create(@Body() createDto: CreateNoteDto, @Req() req) {
    return this.notesService.create(
      createDto,
      req.user.id,
      req.user.organizationId,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateNoteDto,
    @Req() req,
  ) {
    return this.notesService.update(
      id,
      updateDto,
      req.user.id,
      req.user.organizationId,
    );
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    await this.notesService.remove(id, req.user.id, req.user.organizationId);
    return { success: true };
  }
}
```

### Step 7: Create Module

```typescript
// src/backend/notes.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { Note } from './note.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Note])],
  controllers: [NotesController],
  providers: [NotesService],
  exports: [NotesService],
})
export class NotesModule {}
```

### Step 8: Create Migration

```typescript
// src/backend/migrations/1700000001-CreateNotesTable.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotesTable1700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE portal_notes_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id),
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        color VARCHAR(7),
        is_pinned BOOLEAN DEFAULT false,
        is_archived BOOLEAN DEFAULT false,
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_portal_notes_notes_org
        ON portal_notes_notes(organization_id, updated_at DESC);

      CREATE INDEX idx_portal_notes_notes_pinned
        ON portal_notes_notes(organization_id, is_pinned, updated_at DESC);

      CREATE INDEX idx_portal_notes_notes_archived
        ON portal_notes_notes(organization_id, is_archived);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS portal_notes_notes CASCADE;`);
  }
}
```

### Step 9: Create Frontend Widget

```typescript
// src/frontend/NotesWidget.tsx

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { OpenInFull, Refresh, Add } from '@mui/icons-material';
import { PortalWidgetProps } from '@station/portlet-sdk';
import { getNotes } from './api';

interface Note {
  id: string;
  title: string;
  content: string;
  color?: string;
  is_pinned: boolean;
  tags: string[];
  updated_at: string;
}

export const NotesWidget: React.FC<PortalWidgetProps> = ({
  userId,
  organizationId,
  config,
  onExpand,
  onRefresh,
}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const showArchived = config?.showArchived ?? false;
  const maxNotes = config?.maxNotes ?? 5;

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await getNotes({ showArchived, limit: maxNotes });
      setNotes(data);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [organizationId, showArchived, maxNotes]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="Notes"
        action={
          <Box>
            <IconButton size="small" onClick={fetchNotes}>
              <Refresh />
            </IconButton>
            <IconButton size="small" onClick={onExpand}>
              <OpenInFull />
            </IconButton>
          </Box>
        }
      />
      <CardContent sx={{ flexGrow: 1, overflow: 'auto', pt: 0 }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading notes...
          </Typography>
        ) : notes.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No notes yet
            </Typography>
            <IconButton color="primary" onClick={onExpand}>
              <Add />
            </IconButton>
          </Box>
        ) : (
          <List dense>
            {notes.map((note) => (
              <ListItem
                key={note.id}
                sx={{
                  borderLeft: note.color ? `4px solid ${note.color}` : 'none',
                  mb: 1,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={note.is_pinned ? 'bold' : 'normal'}>
                        {note.title}
                      </Typography>
                      {note.is_pinned && <Chip label="Pinned" size="small" />}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" noWrap>
                      {note.content}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};
```

### Step 10: Create Frontend App

```typescript
// src/frontend/NotesApp.tsx

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { ArrowBack, Add, Edit, Delete, PushPin } from '@mui/icons-material';
import { PortalAppProps } from '@station/portlet-sdk';
import { getNotes, createNote, updateNote, deleteNote } from './api';

export const NotesApp: React.FC<PortalAppProps> = ({
  userId,
  organizationId,
  onNavigateBack,
}) => {
  const [notes, setNotes] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    const data = await getNotes({});
    setNotes(data);
  };

  const handleCreate = async () => {
    await createNote(formData);
    setDialogOpen(false);
    setFormData({ title: '', content: '' });
    await loadNotes();
  };

  const handleUpdate = async () => {
    await updateNote(editingNote.id, formData);
    setDialogOpen(false);
    setEditingNote(null);
    setFormData({ title: '', content: '' });
    await loadNotes();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this note?')) {
      await deleteNote(id);
      await loadNotes();
    }
  };

  const handlePin = async (note: any) => {
    await updateNote(note.id, { is_pinned: !note.is_pinned });
    await loadNotes();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        {onNavigateBack && (
          <Button startIcon={<ArrowBack />} onClick={onNavigateBack}>
            Back to Dashboard
          </Button>
        )}
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Notes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          New Note
        </Button>
      </Box>

      <Grid container spacing={2}>
        {notes.map((note) => (
          <Grid item xs={12} sm={6} md={4} key={note.id}>
            <Card
              sx={{
                borderLeft: note.color ? `4px solid ${note.color}` : 'none',
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {note.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {note.content}
                </Typography>
              </CardContent>
              <CardActions>
                <IconButton
                  size="small"
                  onClick={() => handlePin(note)}
                  color={note.is_pinned ? 'primary' : 'default'}
                >
                  <PushPin />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingNote(note);
                    setFormData({ title: note.title, content: note.content });
                    setDialogOpen(true);
                  }}
                >
                  <Edit />
                </IconButton>
                <IconButton size="small" onClick={() => handleDelete(note.id)}>
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingNote ? 'Edit Note' : 'New Note'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Content"
            fullWidth
            multiline
            rows={4}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={editingNote ? handleUpdate : handleCreate} variant="contained">
            {editingNote ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
```

### Step 11: Create API Client

```typescript
// src/frontend/api.ts

import axios from 'axios';

const API_BASE = '/api/portals/notes';

export async function getNotes(params: { showArchived?: boolean; limit?: number }) {
  const { data } = await axios.get(API_BASE, { params });
  return data;
}

export async function createNote(note: { title: string; content: string }) {
  const { data } = await axios.post(API_BASE, note);
  return data;
}

export async function updateNote(id: string, updates: any) {
  const { data } = await axios.patch(`${API_BASE}/${id}`, updates);
  return data;
}

export async function deleteNote(id: string) {
  await axios.delete(`${API_BASE}/${id}`);
}
```

### Step 12: Register Portlet

```bash
# Install dependencies
cd ../..
pnpm install
```

```typescript
// backend/src/main.ts

import { NotesPortlet } from '@station/portlet-notes';

async function bootstrap() {
  // ... existing code ...

  const registry = app.get(PortalRegistryService);
  registry.register(NotesPortlet);  // Add this line

  await app.listen(3000);
}
```

```typescript
// backend/src/app.module.ts

import { NotesModule } from '@station/portlet-notes/backend';

@Module({
  imports: [
    // ... existing imports ...
    NotesModule,  // Add this line
  ],
})
export class AppModule {}
```

```typescript
// frontend/src/App.tsx

import { NotesPortlet } from '@station/portlet-notes';

portalRegistry.register(NotesPortlet);  // Add this line
```

### Step 13: Test Portlet

```bash
# Build portlet
cd portlets/portlet-notes
pnpm run build

# Start backend (from backend/)
cd ../../backend
pnpm run dev

# Start frontend (from frontend/)
cd ../frontend
pnpm run dev

# Access application
# http://localhost:5173

# Enable portlet for your organization
# POST /api/portals/instances
# {
#   "portletId": "notes",
#   "organizationId": "<your-org-id>",
#   "enabled": true
# }
```

> **[AI Note]:** This completes a minimal but functional portlet. The pattern is: (1) Create entities and DTOs, (2) Create service and controller, (3) Create React components, (4) Register portlet. All portlets follow this same pattern.

---

## Frontend Development

### Widget Best Practices

```typescript
// ✅ GOOD - Lightweight widget
export const TasksWidget: React.FC<PortalWidgetProps> = (props) => {
  const [tasks, setTasks] = useState([]);

  // Load only what's needed for widget
  useEffect(() => {
    loadTasks({ limit: 5, status: 'pending' });
  }, []);

  return (
    <Card>
      <CardHeader title="My Tasks" action={<IconButton onClick={props.onExpand}><OpenInFull /></IconButton>} />
      <CardContent>
        <List>
          {tasks.slice(0, 5).map(task => (
            <ListItem key={task.id}>
              <ListItemText primary={task.title} />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

// ❌ BAD - Heavy widget
export const TasksWidget = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});

  // Loading too much data
  useEffect(() => {
    loadAllTasks();
    loadAllProjects();
    loadAllUsers();
    calculateStatistics();
  }, []);

  // Complex UI in widget
  return (
    <Card>
      <ComplexChartComponent />
      <DataTable data={tasks} />
      <FilterPanel />
    </Card>
  );
};
```

### Responsive Design

```typescript
// Use MUI Grid for responsive layout
import { Grid } from '@mui/material';

export const PortalDashboard = () => {
  return (
    <Container maxWidth="xl">
      <Grid container spacing={3}>
        {portlets.map((portlet) => (
          <Grid
            item
            key={portlet.id}
            xs={12}           // Full width on mobile
            sm={6}            // Half width on tablet
            md={portlet.width} // Custom width on desktop
          >
            <PortletWidget portlet={portlet} />
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};
```

### Error Handling

```typescript
// Use error boundaries for widget failures
import { ErrorBoundary } from 'react-error-boundary';

function PortalWidget({ portlet }: { portlet: Portlet }) {
  return (
    <ErrorBoundary
      fallback={
        <Card>
          <CardContent>
            <Typography color="error">
              Failed to load {portlet.metadata.name}
            </Typography>
          </CardContent>
        </Card>
      }
      onError={(error) => {
        console.error(`Widget error (${portlet.metadata.id}):`, error);
      }}
    >
      <portlet.frontend.widget.component {...props} />
    </ErrorBoundary>
  );
}
```

### State Management

```typescript
// For simple state, use useState
const [notes, setNotes] = useState([]);

// For server state, use React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useNotes() {
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: getNotes,
  });

  const createMutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  return { notes, isLoading, create: createMutation.mutate };
}

// Usage
const { notes, isLoading, create } = useNotes();
```

---

## Backend Development

### Controller Patterns

```typescript
// ✅ GOOD - Use @PortalController decorator
import { PortalController } from '@station/portlet-sdk';

@PortalController('tasks')
export class TasksController {
  // Automatically has:
  // - JWT authentication
  // - Permission guards
  // - Audit logging
}

// ❌ BAD - Manual decorators (easy to forget)
@Controller('portals/tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  // Missing permission guards
  // Missing audit logging
}
```

### Service Patterns

```typescript
// ✅ GOOD - Inject user context
@Injectable({ scope: Scope.REQUEST })
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @Inject(REQUEST)
    private request: any,
  ) {}

  async findAll() {
    // Automatically filtered by current org
    return this.taskRepo.find({
      where: { organization_id: this.request.user.organizationId },
    });
  }
}

// ❌ BAD - Organization ID passed everywhere
export class TasksService {
  async findAll(organizationId: string) {
    // Easy to forget to pass organizationId
    return this.taskRepo.find({ where: { organization_id: organizationId } });
  }
}
```

### Repository Patterns

```typescript
// ✅ GOOD - Use PortalRepository base class
import { PortalRepository } from '@station/portlet-sdk';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: PortalRepository<Task>,
  ) {}

  async findAll() {
    // Automatically filtered by organization_id
    return this.taskRepo.find();
  }
}

// ❌ BAD - Forget to filter by organization
export class TasksService {
  async findAll() {
    // Returns ALL tasks from ALL organizations! Security issue!
    return this.taskRepo.find();
  }
}
```

### Validation Patterns

```typescript
// ✅ GOOD - Comprehensive validation
export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['low', 'medium', 'high', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsUUID()
  @IsOptional()
  assigned_to?: string;
}

// ❌ BAD - No validation
export class CreateTaskDto {
  title: string;  // Could be empty, too long, not a string, etc.
  description?: string;
  priority?: string;  // Could be invalid value
}
```

---

## Database Migrations

### Creating Migrations

```bash
# Generate migration from entity changes
cd backend
pnpm run migration:generate -- -n AddTaskPriority

# Create empty migration
pnpm run migration:create -- -n AddCustomIndexes
```

### Migration Template

```typescript
// src/migrations/1700000002-AddTaskPriority.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskPriority1700000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add column
    await queryRunner.query(`
      ALTER TABLE portal_tasks_tasks
      ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
    `);

    // Add constraint
    await queryRunner.query(`
      ALTER TABLE portal_tasks_tasks
      ADD CONSTRAINT valid_priority
      CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    `);

    // Add index
    await queryRunner.query(`
      CREATE INDEX idx_portal_tasks_tasks_priority
      ON portal_tasks_tasks(organization_id, priority);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_portal_tasks_tasks_priority;
    `);

    await queryRunner.query(`
      ALTER TABLE portal_tasks_tasks
      DROP CONSTRAINT IF EXISTS valid_priority;
    `);

    await queryRunner.query(`
      ALTER TABLE portal_tasks_tasks
      DROP COLUMN IF EXISTS priority;
    `);
  }
}
```

### Running Migrations

```bash
# Run all pending migrations
pnpm run migration:run

# Revert last migration
pnpm run migration:revert

# Show migration status
pnpm run migration:show
```

> **[AI Note]:** ALWAYS write both `up` and `down` migrations. NEVER modify existing migrations after they've been committed. Create a new migration to fix issues.

---

## Event Bus Integration

### Publishing Events

```typescript
// In your service
@Injectable()
export class TasksService {
  constructor(
    @Inject('EVENT_BUS')
    private eventBus: EventBus,
  ) {}

  async create(dto: CreateTaskDto, userId: string, orgId: string) {
    // 1. Save to database
    const task = await this.taskRepo.save({
      ...dto,
      organization_id: orgId,
      created_by: userId,
    });

    // 2. Publish event (after commit)
    await this.eventBus.publish({
      sourcePortletId: 'tasks',
      eventType: 'tasks.task.created',
      entityType: 'task',
      entityId: task.id,
      payload: {
        taskId: task.id,
        title: task.title,
        assignedTo: task.assigned_to,
        projectId: task.project_id,
      },
      organizationId: orgId,
      userId: userId,
    });

    return task;
  }
}
```

### Subscribing to Events

```typescript
// In your module
@Module({
  imports: [TypeOrmModule.forFeature([Task])],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule implements OnModuleInit {
  constructor(
    @Inject('EVENT_BUS')
    private eventBus: EventBus,
    private tasksService: TasksService,
  ) {}

  async onModuleInit() {
    // Subscribe to events
    await this.eventBus.subscribe(
      'tasks',
      [
        'crm.contact.created',
        'crm.deal.*',
        'projects.project.created',
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

        case 'crm.contact.created':
          await this.tasksService.onContactCreated(event);
          break;

        default:
          console.log(`Unhandled event: ${event.eventType}`);
      }
    } catch (error) {
      console.error(`Error handling ${event.eventType}:`, error);
      throw error;  // Will be retried by RabbitMQ
    }
  }
}
```

### Event Handler Implementation

```typescript
// In your service
export class TasksService {
  async onDealCreated(event: PortalEvent) {
    const { dealId, dealName, contactId } = event.payload;

    // Auto-create follow-up task
    await this.taskRepo.save({
      organization_id: event.organizationId,
      created_by: event.userId,
      title: `Follow up on: ${dealName}`,
      description: `New deal created in CRM. Reach out to discuss next steps.`,
      priority: 'high',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    console.log(`Auto-created task for deal ${dealId}`);
  }
}
```

---

## Testing

### Unit Tests

```typescript
// src/backend/notes.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { Note } from './note.entity';

describe('NotesService', () => {
  let service: NotesService;
  let mockRepo: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        {
          provide: getRepositoryToken(Note),
          useValue: mockRepo,
        },
        {
          provide: 'EVENT_BUS',
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  it('should create a note', async () => {
    const dto = { title: 'Test', content: 'Content' };
    const savedNote = { id: '1', ...dto };

    mockRepo.save.mockResolvedValue(savedNote);

    const result = await service.create(dto, 'user-1', 'org-1');

    expect(result).toEqual(savedNote);
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'notes.note.created',
        entityId: '1',
      }),
    );
  });

  it('should filter by organization', async () => {
    await service.findAll('org-1');

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { organization_id: 'org-1' },
      // ...
    });
  });
});
```

### Integration Tests

```typescript
// src/backend/notes.controller.spec.ts

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('NotesController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Login and get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'test', password: 'test' });

    authToken = loginResponse.body.accessToken;
  });

  it('POST /api/portals/notes', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/portals/notes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Note',
        content: 'Test content',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      title: 'Test Note',
      content: 'Test content',
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Frontend Tests

```typescript
// src/frontend/NotesWidget.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { NotesWidget } from './NotesWidget';
import * as api from './api';

jest.mock('./api');

describe('NotesWidget', () => {
  it('renders loading state', () => {
    (api.getNotes as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<NotesWidget userId="1" organizationId="1" config={{}} />);

    expect(screen.getByText('Loading notes...')).toBeInTheDocument();
  });

  it('renders notes', async () => {
    (api.getNotes as jest.Mock).mockResolvedValue([
      { id: '1', title: 'Test Note', content: 'Content' },
    ]);

    render(<NotesWidget userId="1" organizationId="1" config={{}} />);

    await waitFor(() => {
      expect(screen.getByText('Test Note')).toBeInTheDocument();
    });
  });
});
```

---

## Deployment

### Production Build

```bash
# Build all packages
pnpm run build

# This builds:
# - All portlet packages
# - Backend
# - Frontend
```

### Docker Build

```dockerfile
# backend/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Copy all packages
COPY packages ./packages
COPY portlets ./portlets
COPY backend ./backend

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Kubernetes Deployment

```yaml
# k8s/backend-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: station-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: station-backend
  template:
    metadata:
      labels:
        app: station-backend
    spec:
      containers:
      - name: backend
        image: your-registry/station-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: station-secrets
              key: database-url
        - name: RABBITMQ_URL
          valueFrom:
            secretKeyRef:
              name: station-secrets
              key: rabbitmq-url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 10.22

      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm run test

      - name: Build
        run: pnpm run build

      - name: Build Docker images
        run: |
          docker build -t your-registry/station-backend:${{ github.sha }} ./backend
          docker build -t your-registry/station-frontend:${{ github.sha }} ./frontend

      - name: Push Docker images
        run: |
          docker push your-registry/station-backend:${{ github.sha }}
          docker push your-registry/station-frontend:${{ github.sha }}

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/station-backend \
            backend=your-registry/station-backend:${{ github.sha }}
```

---

## Common Tasks

### Adding a New Portlet

```bash
# 1. Create portlet structure
cd portlets
mkdir portlet-yourfeature
cd portlet-yourfeature

# 2. Follow the "Building Your First Portlet" guide above

# 3. Install dependencies
cd ../..
pnpm install

# 4. Register portlet
# - Add to backend/src/main.ts
# - Add to backend/src/app.module.ts
# - Add to frontend/src/App.tsx

# 5. Test
pnpm run dev
```

### Debugging

```bash
# Backend debugging
cd backend
pnpm run dev:debug

# Attach debugger in VS Code (launch.json):
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Backend",
  "port": 9229,
  "restart": true
}

# Frontend debugging
# Use browser DevTools
# React DevTools extension

# RabbitMQ debugging
# Open management UI: http://localhost:15672
# Check queues, exchanges, bindings
# View message rates and consumers
```

### Database Reset

```bash
# ⚠️ WARNING: This deletes all data!

# Stop backend
# Drop database
docker-compose exec postgres psql -U station -c "DROP DATABASE station;"
docker-compose exec postgres psql -U station -c "CREATE DATABASE station;"

# Run migrations
cd backend
pnpm run migration:run

# Seed database
pnpm run seed

# Restart backend
pnpm run dev
```

### Updating Dependencies

```bash
# Update all dependencies
pnpm update --recursive

# Update specific package
pnpm update package-name

# Check for outdated packages
pnpm outdated
```

---

## Troubleshooting

### Portlet Not Showing on Dashboard

1. Check if portlet is registered:
   ```bash
   curl http://localhost:3000/api/portals/available
   ```

2. Check if portlet is enabled for org:
   ```bash
   curl http://localhost:3000/api/portals/enabled?organizationId=<id>
   ```

3. Enable portlet:
   ```bash
   curl -X POST http://localhost:3000/api/portals/instances \
     -H "Content-Type: application/json" \
     -d '{"portletId":"notes","organizationId":"<id>","enabled":true}'
   ```

### Events Not Being Delivered

1. Check RabbitMQ connection:
   ```bash
   curl http://localhost:15672/api/healthchecks/node
   ```

2. Check queue bindings:
   - Open http://localhost:15672
   - Go to Queues tab
   - Click on `portlet.<your-portlet>`
   - Check bindings

3. Check consumer is connected:
   - In queue details, look for "Consumers" section
   - Should show at least 1 consumer

### Migration Errors

```bash
# Check migration status
pnpm run migration:show

# If migration failed halfway:
# 1. Check database state
# 2. Manually fix inconsistencies
# 3. Revert migration
pnpm run migration:revert

# 4. Fix migration file
# 5. Re-run
pnpm run migration:run
```

---

## Appendix

### Useful Scripts

```json
// package.json scripts

{
  "scripts": {
    "dev": "concurrently \"pnpm:dev:backend\" \"pnpm:dev:frontend\"",
    "dev:backend": "cd backend && pnpm run dev",
    "dev:frontend": "cd frontend && pnpm run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "migration:generate": "cd backend && pnpm run migration:generate",
    "migration:run": "cd backend && pnpm run migration:run",
    "migration:revert": "cd backend && pnpm run migration:revert"
  }
}
```

### VS Code Configuration

```json
// .vscode/settings.json

{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Environment Variables Reference

```bash
# Backend (.env)
DATABASE_URL=postgresql://station:station@localhost:5432/station
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_URL=amqp://station:station@localhost:5672
RABBITMQ_EXCHANGE=portal.events
JWT_SECRET=your-secret-key
PORT=3000
NODE_ENV=development

# Frontend (.env)
VITE_API_URL=http://localhost:3000
```

---

## Document Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-20 | Initial implementation guide | AI Assistant |

---

> **[AI Context Summary]:** This document provides step-by-step instructions for implementing portlets in the Station platform. The standard portlet structure includes: (1) Backend entity, service, controller, module; (2) Frontend widget and full app components; (3) Database migration; (4) Event bus integration. All portlets follow this same pattern. When helping developers implement portlets, reference the "Building Your First Portlet" section as the canonical example.

---

**End of Document**
