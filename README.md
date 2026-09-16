# Todo

Todo is a modern, multi-user task manager built according to the architecture in
[`docs/TODO_APP_DEVELOPMENT_PLAN.md`](./docs/TODO_APP_DEVELOPMENT_PLAN.md).

The current implementation is a Next.js modular monolith with Prisma and
PostgreSQL. A separate Python/FastAPI backend is intentionally not used: it
would duplicate the existing API boundary and add operational complexity without
current product value.

## Current capabilities

- Direct entry to the task workspace at `/` and `/tasks`
- Local demo mode when no database/session is configured
- Create, edit, complete/uncomplete, and delete tasks
- Notes, priorities, due dates, categories, and tags
- Search, status/priority/category filters, views, and sorting
- Auth.js credentials authentication and registration API
- PostgreSQL/Prisma persistence path for configured environments

Demo mode stores data only in this browser's local storage. It is useful for
reviewing the interface, but it is not multi-user storage and must not be used
for production data.

## Local development

### Prerequisites

- Node.js 24 LTS (or the version specified by the deployment environment)
- npm
- SQLite for local development; PostgreSQL/Neon remains the planned hosted provider

### Setup

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run db:migrate -- --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For authentication, set `AUTH_SECRET` in `.env.local`. The repository now
configures `DATABASE_URL="file:./dev.db"` for local Prisma development.

If the local database is unavailable, the task workspace falls back to clearly
labeled browser demo mode. Demo tasks are stored in browser local storage and
are not shared or deployed.

Run `npm run db:migrate -- --name init` and `npm run db:seed` to create and seed
the local database. Hosted Neon deployment still requires a PostgreSQL-specific
schema migration and pooled/direct connection variables.

## Available routes

| Route                   | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `/`                     | Redirects directly to the task workspace |
| `/tasks`                | Task workspace                           |
| `/login`                | Auth.js credentials sign-in              |
| `/register`             | Account registration                     |
| `/api/tasks`            | Authenticated task list/create API       |
| `/api/tasks/:id`        | Authenticated task update/delete API     |
| `/api/v1/auth/register` | Account registration API                 |

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

The CI workflow runs these checks for pushes to `main` and pull requests.

## Dependency and architecture policy

Every dependency must earn its place by having a clear purpose, active
maintenance, framework compatibility, acceptable security/license posture, and
reasonable runtime impact. Before adding a package:

1. Check whether the platform or an existing utility already solves the problem.
2. Avoid adding multiple libraries for the same concern.
3. Record significant choices in the development plan's tech-stack or external-library sections.
4. Run the relevant lint, type-check, build, and tests after the change.

The project currently prefers native React/Next.js behavior and small internal
components. Rich drag-and-drop, command palettes, animations, toast libraries,
offline synchronization, analytics, and calendar integrations remain optional
until a clear requirement and reliable design justify them.

## Accessibility and performance

- Use semantic HTML, visible focus, keyboard operation, labels, and accessible status messages.
- Respect `prefers-reduced-motion` if animations are introduced.
- Measure bundle, page, and database performance before optimizing.
- Use backend/database search and pagination for production-scale datasets.
- Automated checks do not replace manual keyboard and screen-reader review.

## Project documentation

- [Development plan](./docs/TODO_APP_DEVELOPMENT_PLAN.md)
- [Next.js documentation](https://nextjs.org/docs)
- [Neon documentation](https://neon.tech/docs)
