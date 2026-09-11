# Arcanium Documentation

> This is the root of the Arcanium technical documentation. Every spec, API contract, architecture decision, and feature blueprint lives here.
> If it affects how the system is built, it is documented here.

---

## How to Use These Docs

- **Starting fresh?** Begin with the [Architecture Overview](#architecture) to understand how the system fits together.
- **Building a feature?** Check [Features](#features) for the relevant blueprint, then follow the [API Contracts](#api) for the endpoints you need.
- **Making a big decision?** Open an [ADR](#architecture-decision-records-adrs) first.
- **Setting up locally?** Go straight to [Guides](#guides).

The source of truth for engineering *rules* and *philosophy* is the [CONSTITUTION.md](../CONSTITUTION.md) at the repository root. These docs cover *what* the system does; the Constitution covers *how* we build it.

---

## Directory Structure

```
docs/
├── README.md                          # This file — documentation index
│
├── architecture/                      # System-level design documents
│   ├── monorepo-and-deployment.md     # Monorepo layout + Phase 1 -> Phase 2 migration path
│   ├── ai-housekeeper.md              # AI architecture: function calling, tool definitions, flow
│   ├── authentication-flow.md         # Google OAuth flow, JWT lifecycle, refresh strategy
│   ├── offline-and-sync.md            # Service Worker, IndexedDB, cache invalidation strategy
│   └── data-model.md                  # Prisma schema overview, entity relationships
│
├── api/                               # Backend API contracts (request/response shapes)
│   ├── README.md                      # API conventions, versioning, error envelope
│   ├── auth.md                        # /api/v1/auth/* endpoints
│   ├── library.md                     # /api/v1/library/* endpoints
│   ├── explore.md                     # /api/v1/explore/* endpoints
│   ├── ai.md                          # /api/v1/ai/* endpoints and tool definitions
│   └── community.md                   # /api/v1/community/* endpoints
│
├── features/                          # Feature blueprints (product + engineering spec per feature)
│   ├── ai-housekeeper.md              # AI Housekeeper — scope, UX flow, function-call tools
│   ├── explore-engine.md              # Universal Explore & Reader Engine — aggregation, formatting
│   ├── library.md                     # Modular Library — structure, offline caching, sync
│   └── community.md                   # Community Layer — ratings, reviews, creator publishing
│
├── guides/                            # Developer how-to guides
│   ├── local-setup.md                 # Getting the monorepo running locally
│   ├── adding-a-feature.md            # Step-by-step guide to scaffolding a new feature
│   ├── environment-variables.md       # Full reference for all environment variables
│   ├── docker-deployment.md           # Phase 2: building and deploying Docker containers to a KVM VPS
│   └── database-migrations.md         # Running and writing Prisma migrations
│
└── adrs/                              # Architecture Decision Records
    ├── README.md                      # ADR index and template
    └── ADR-0001-monorepo-tooling.md   # Example: why pnpm workspaces
```

---

## Architecture

| Document | Description |
|---|---|
| [Monorepo and Deployment](./architecture/monorepo-and-deployment.md) | How the monorepo is structured, and how we migrate from Phase 1 managed hosting to Phase 2 Dockerized VPS |
| [AI Housekeeper Architecture](./architecture/ai-housekeeper.md) | Function-calling architecture, tool definitions, security model |
| [Authentication Flow](./architecture/authentication-flow.md) | Google OAuth 2.0 flow, JWT issuance, refresh tokens |
| [Offline and Sync](./architecture/offline-and-sync.md) | Service Worker strategy, IndexedDB schema, cache invalidation |
| [Data Model](./architecture/data-model.md) | Prisma schema walkthrough, entity relationship overview |

---

## API

All API documentation follows the conventions defined in [pi/README.md](./api/README.md).

| Document | Endpoints Covered |
|---|---|
| [Auth](./api/auth.md) | /api/v1/auth/google, /api/v1/auth/refresh, /api/v1/auth/logout |
| [Library](./api/library.md) | /api/v1/library — CRUD for user library entries |
| [Explore](./api/explore.md) | /api/v1/explore — search, source aggregation, content fetch |
| [AI](./api/ai.md) | /api/v1/ai/chat — Housekeeper conversation endpoint and tool definitions |
| [Community](./api/community.md) | /api/v1/community — ratings, reviews, creator endpoints |

---

## Features

| Document | Pillar |
|---|---|
| [AI Housekeeper](./features/ai-housekeeper.md) | Pillar 1 — Agentic AI |
| [Explore Engine](./features/explore-engine.md) | Pillar 2 — Universal Reader |
| [Library](./features/library.md) | Pillar 3 — Modular Library |
| [Community](./features/community.md) | Pillar 4 — Community Layer |

---

## Guides

| Document | When to Use |
|---|---|
| [Local Setup](./guides/local-setup.md) | First time setting up the project |
| [Adding a Feature](./guides/adding-a-feature.md) | Scaffolding a new feature end-to-end |
| [Environment Variables](./guides/environment-variables.md) | Full reference for all .env keys |
| [Docker Deployment](./guides/docker-deployment.md) | Phase 2 self-hosted deployment on a KVM VPS |
| [Database Migrations](./guides/database-migrations.md) | Creating and running Prisma migrations |

---

## Architecture Decision Records (ADRs)

ADRs document *why* we made significant architectural choices. See [drs/README.md](./adrs/README.md) for the template and process. To propose a new ADR, follow the [Amendment Process](../CONSTITUTION.md#12-amendment-process).

| ADR | Decision |
|---|---|
| [ADR-0001](./adrs/ADR-0001-monorepo-tooling.md) | pnpm workspaces as monorepo tooling |

---

*Maintained by the Arcanium engineering team.*