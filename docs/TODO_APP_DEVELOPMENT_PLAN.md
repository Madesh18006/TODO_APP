# Todo Application Development Plan

**Document status:** Approved implementation blueprint  
**Scope:** Initial multi-user web application (MVP) with a clean path to future enhancements  
**Implementation constraint:** This document defines the plan only. No application source code is included.

## 1. Project Overview

### Purpose

Build a modern, responsive Todo application that lets authenticated users capture, organize, find, prioritize, and complete personal tasks from desktop and mobile browsers.

### Target users

- Individuals managing personal work, study, household, and recurring responsibilities.
- Users who want more structure than a plain checklist but do not need a full project-management suite.

### Problem being solved

Users need a dependable place to record tasks, understand what needs attention next, and quickly update progress without losing data or navigating a complicated workflow.

### Core functionality

- Account registration, sign-in, and sign-out.
- Create, view, edit, complete/uncomplete, and delete tasks.
- Priority, due date, status, category, and tags.
- Search, filtering, sorting, and useful task counts.
- Persistent server-side storage and a responsive user interface.

### Expected user experience

- Opening the app immediately shows the current user's task list and a clear primary “Add task” action.
- Creating a simple task requires only a title; optional organization can be added inline or in an edit form.
- Changes provide immediate visual feedback, remain correct after refresh, and clearly surface errors.
- The interface is calm and focused: sensible defaults, keyboard-friendly controls, concise feedback, and no unnecessary project-management complexity.

### Assumptions and decisions

The following defaults resolve currently unspecified requirements and should be confirmed during project kickoff:

| Area            | Initial decision                                                                                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployment      | One web application deployed on Vercel with Neon managed PostgreSQL                                                                                                                                                                                             |
| Users           | Each account owns private tasks; no collaboration in the initial release. Local/demo mode may open the workspace without authentication and uses browser-only storage when no database is configured, but production must enable the protected layout and APIs. |
| Time zones      | Store timestamps in UTC; store a task due date as a calendar date interpreted in the user's configured time zone                                                                                                                                                |
| Task hierarchy  | Flat tasks only; no subtasks initially                                                                                                                                                                                                                          |
| Password reset  | Included in MVP using a transactional email provider                                                                                                                                                                                                            |
| Email delivery  | Transactional email provider selected during implementation; provider credentials remain deployment secrets                                                                                                                                                     |
| Recurrence      | Deferred                                                                                                                                                                                                                                                        |
| Offline mode    | Deferred; show reliable retry behavior instead                                                                                                                                                                                                                  |
| Categories      | A user can create, rename, and delete personal categories                                                                                                                                                                                                       |
| Tags            | Personal, reusable many-to-many labels                                                                                                                                                                                                                          |
| Delete behavior | Soft deletion is not exposed in the UI; API deletion is idempotent and permanently removes the task after authorization                                                                                                                                         |
| Pagination      | Cursor-based API pagination, with a practical default page size of 50                                                                                                                                                                                           |

## 2. Functional Requirements

### Authentication and account

1. A user can register with a unique email address and password.
2. A user can sign in and sign out.
3. Authenticated requests can access only the current user's data.
4. The application provides a safe password-reset flow in a later MVP increment if email delivery is available; otherwise registration and sign-in should be completed first and password reset tracked explicitly.
5. A user can configure a display name and time zone; email changes and account deletion are outside the initial scope.

### Task lifecycle

Each task has a required title and optional details.

- **Create:** Title is required; default status is `todo`, default priority is `none`, and no due date is assigned.
- **Read:** List and detail views show title, status, priority, due date, category, tags, and timestamps.
- **Edit:** Update any editable field with validation.
- **Complete/uncomplete:** The dedicated completion action sets status to `completed` or returns it to `todo`; preserve completion timestamp when completed and clear it when uncompleted. Moving to or from `in_progress` is an edit operation.
- **Delete:** Require an explicit confirmation for a task with content; support keyboard access and an undo notification where feasible.
- **Status:** Initial statuses are `todo`, `in_progress`, and `completed`. “Overdue” is a derived display state, not a stored status.
- **Notes:** Optional plain-text description, with a bounded maximum length.

### Organization

- **Priority:** `none`, `low`, `medium`, `high`; display consistently by text and accessible visual cues, not color alone.
- **Due date:** Optional date-only value; offer quick choices such as today and tomorrow; show overdue and due-today indicators.
- **Categories:** One optional category per task. Users can create, rename, and delete their own categories; deleting a category sets associated tasks to uncategorized rather than deleting tasks.
- **Tags:** Zero or more user-owned tags per task. Tag names are normalized for uniqueness per user, while preserving a display label.
- **Task counts:** Show counts for all, active, completed, due today, and overdue where the current filter context makes those counts meaningful.

### Discovery and list controls

- **Search:** Case-insensitive search across title and notes, with debounced requests or client-side filtering of the loaded result set.
- **Filtering:** Filter by status, priority, category, tag, due-date range, and overdue state. Filters are represented in the URL so views can be bookmarked and refreshed.
- **Sorting:** Sort by due date, priority, created date, updated date, or title; specify ascending/descending behavior and a deterministic ID tie-breaker.
- **Views:** Default “All tasks” view plus focused views for active, completed, today, and overdue tasks.
- **Clear controls:** Make active filters visible and provide a one-action reset.

### Feedback and usability

- Inline validation before submission and server validation for every mutation.
- Loading, empty, error, and success states for list and mutation operations.
- Retry action for recoverable network/server failures.
- Toast or inline confirmation for saves, completion changes, and deletion.
- Preserve unsaved form input when a request fails.

## 3. Non-Functional Requirements

| Concern         | Requirement and target                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance     | Initial usable view should target <2 seconds on a typical broadband connection; list endpoints should target p95 <500 ms under expected MVP load. Debounce search and paginate results.                 |
| Security        | HTTPS in production, secure cookie-based sessions, server-side authorization on every task/category/tag query, strict validation, rate limiting on authentication endpoints, and safe security headers. |
| Accessibility   | WCAG 2.2 AA-oriented implementation: semantic HTML, keyboard operation, visible focus, labels, sufficient contrast, screen-reader status announcements, and no color-only meaning.                      |
| Responsiveness  | Mobile-first layout supporting approximately 320 px through large desktop widths without horizontal scrolling.                                                                                          |
| Maintainability | TypeScript throughout application code, feature-oriented modules, shared schemas, consistent formatting/linting, and documented API contracts.                                                          |
| Reliability     | Database transactions for multi-table mutations, idempotent safe operations, structured server logs, health checks, and graceful error states.                                                          |
| Scalability     | Stateless web/API processes, indexed queries, cursor pagination, and a repository/service boundary that can scale independently without premature microservices.                                        |
| Observability   | Request IDs, structured error logs, basic latency/error metrics, and production alerting for elevated 5xx responses.                                                                                    |
| Privacy         | Collect only account and task data required for the product; never log passwords, session tokens, or full sensitive task content unnecessarily.                                                         |

## 4. Recommended Tech Stack

### Primary choices

| Layer                | Choice                                                                                                         | Why                                                                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full-stack framework | Next.js with App Router and TypeScript                                                                         | Provides a mature React UI, server-side route handlers, predictable deployment, and one codebase appropriate for a small product.                                                                                                                                              |
| UI                   | React with server-rendered shell and client components for interactive task controls                           | Keeps initial navigation fast while allowing focused interactive components.                                                                                                                                                                                                   |
| Styling              | Tailwind CSS plus a small internal component layer                                                             | Fast responsive styling with consistent tokens; avoids adopting an oversized design system.                                                                                                                                                                                    |
| Validation/contracts | Zod                                                                                                            | Shared runtime validation for API inputs, query parameters, environment configuration, and typed response boundaries.                                                                                                                                                          |
| Database             | PostgreSQL (Neon)                                                                                              | Strong relational modeling for users, tasks, categories, tags, and join tables; excellent indexing and transaction support with managed backups and branching options.                                                                                                         |
| ORM/migrations       | Prisma 6                                                                                                       | Type-safe database access and versioned migrations with low ceremony for this domain; use Neon’s pooled URL at runtime and direct URL for migrations.                                                                                                                          |
| Authentication       | Auth.js with JWT sessions and email/password credentials initially                                             | Credentials authentication is supported reliably with JWT sessions; Auth.js handles session cryptography and callback plumbing. Password hashing uses Argon2id through a maintained library. Database-backed adapter tables remain available for future OAuth/email providers. |
| State/data fetching  | TanStack Query for client server state; URL search parameters for list view state; local React state for forms | Separates server cache from UI state and avoids a global store that would add little value.                                                                                                                                                                                    |
| API                  | Versioned Next.js Route Handlers under `/api/v1` using JSON                                                    | Keeps a clear boundary for future clients while remaining simple to deploy.                                                                                                                                                                                                    |
| Testing              | Vitest, Testing Library, Playwright, and an API test harness                                                   | Covers pure logic, accessible component behavior, end-to-end flows, and HTTP/database integration.                                                                                                                                                                             |
| Tooling              | npm, ESLint, Prettier, TypeScript strict mode, GitHub Actions                                                  | Reproducible installs, early type/style feedback, and automated checks; npm is used for the current deployment/build environment.                                                                                                                                              |
| Deployment           | Managed Next.js host plus managed PostgreSQL, with environment secrets                                         | Minimizes operational burden while retaining production-grade database backups and TLS.                                                                                                                                                                                        |

### Deliberately excluded initially

- Redux or another global state store: server state and URL state cover the needs.
- Microservices: the domain is small and a modular monolith is easier to change.
- WebSockets: task changes are private to a user and do not require real-time collaboration.
- Redis: add only when measured rate limiting, queues, or caching needs justify it.

### External Libraries & Extensions

Every additional dependency must solve a demonstrated product or engineering
problem and pass maintenance, compatibility, license, security, bundle-size,
and overlap review. Current decisions:

| Library or capability                     | Purpose                                                | Decision                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Auth.js                                   | Credentials sessions and authentication handlers       | Adopted; avoids hand-rolled session security.                                                                                       |
| Prisma                                    | PostgreSQL client, schema, and migrations              | Adopted; keeps relational access typed and maintainable.                                                                            |
| Zod                                       | Runtime request and form validation                    | Adopted; shared validation boundary.                                                                                                |
| Argon2                                    | Password hashing                                       | Adopted; appropriate password-hashing primitive.                                                                                    |
| Native React/Next.js controls             | Forms, dialogs, theme control, and basic notifications | Prefer initially to avoid dependency bloat.                                                                                         |
| UI/icon/animation/drag-and-drop libraries | Richer interaction primitives                          | Deferred until a concrete accessibility or UX need is demonstrated.                                                                 |
| Python/FastAPI/SQLAlchemy/Alembic         | Alternative backend stack                              | Deferred; duplicating the current Next.js API and Prisma stack would increase operational complexity without a current requirement. |

## 5. Application Architecture

### Overall shape

Use a modular monolith:

```text
Browser
  -> Next.js pages/layouts and client components
  -> TanStack Query / fetch
  -> /api/v1 route handlers
  -> authentication/session middleware
  -> feature services and Zod schemas
  -> Prisma repositories
  -> PostgreSQL
```

### Frontend structure and data flow

1. The authenticated layout obtains the current session and renders navigation.
2. The task page derives filters and sort from URL parameters.
3. A task query calls the API with those parameters and caches by the complete query key.
4. Mutations validate locally, call the API, invalidate or update affected query caches, and show a status message.
5. Forms remain controlled locally; they do not duplicate the entire server dataset.
6. Server components handle stable page structure; client components handle forms, filters, menus, dialogs, and query-backed interactions.

### Backend structure

- Route handlers translate HTTP requests into validated command/query inputs and standardized responses.
- Services contain business rules such as ownership checks, completion timestamps, tag normalization, and category deletion behavior.
- Repositories contain Prisma queries and transaction composition; UI code never accesses Prisma directly.
- Shared domain types and schemas prevent request/response drift.
- A centralized error mapper converts known validation, authorization, not-found, conflict, and database errors into safe API responses.

### Authentication flow

1. Auth.js handles credential verification and JWT session creation.
2. Passwords are hashed with Argon2id; plaintext passwords are never stored or logged.
3. The browser receives an HTTP-only, Secure, SameSite cookie containing the Auth.js JWT in production.
4. Route handlers resolve the session and user ID before calling services.
5. Authorization is repeated in the data query (`WHERE user_id = session.user.id`) so an omitted UI check cannot expose another user's data.

### Important architectural decisions

- Use date-only due dates (`DATE`/`YYYY-MM-DD`) instead of midnight timestamps to avoid daylight-saving ambiguity.
- Use database transactions for task-plus-tag updates and category deletion.
- Keep API responses consistent and never return internal ORM errors or sensitive authentication details.
- Use cursor pagination for stable results when tasks change while a user scrolls.
- Treat optimistic completion toggles as an enhancement; first implement reliable pessimistic updates, then add rollback-capable optimistic behavior if interaction latency warrants it.

## 6. Proposed Project Folder Structure

```text
todo-app/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── tasks/page.tsx
│   │   ├── tasks/[taskId]/page.tsx
│   │   └── settings/page.tsx
│   ├── api/v1/
│   │   ├── auth/register/route.ts
│   │   ├── tasks/route.ts
│   │   ├── tasks/[taskId]/route.ts
│   │   ├── tasks/[taskId]/complete/route.ts
│   │   ├── categories/route.ts
│   │   ├── categories/[categoryId]/route.ts
│   │   ├── tags/route.ts
│   │   └── health/route.ts
│   ├── error.tsx
│   ├── loading.tsx
│   ├── not-found.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                 # Buttons, inputs, dialog, menu, toast, spinner
│   ├── layout/             # Header, sidebar, mobile navigation
│   ├── tasks/              # TaskList, TaskRow, TaskForm, TaskFilters, TaskToolbar
│   └── organization/       # CategoryManager, TagPicker
├── features/
│   ├── auth/               # Auth schemas, queries, and presentation helpers
│   ├── tasks/              # Domain types, schemas, query keys, service-facing hooks
│   ├── categories/
│   └── tags/
├── lib/
│   ├── auth.ts             # Auth.js configuration and session helpers
│   ├── db.ts               # Prisma client lifecycle
│   ├── api-client.ts       # Typed fetch wrapper
│   ├── errors.ts           # Application error types and response mapper
│   ├── dates.ts            # Date-only and time-zone-safe helpers
│   ├── pagination.ts
│   └── validation.ts
├── server/
│   ├── services/
│   ├── repositories/
│   └── authorization/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── public/
├── .env.example
├── eslint.config.*
├── next.config.*
├── package.json
├── pnpm-lock.yaml
├── playwright.config.ts
├── tsconfig.json
└── README.md
```

The `app` directory owns routing and page composition; `components` contains reusable presentation; `features` groups client-facing domain behavior; `server` owns business and persistence logic; `lib` contains cross-cutting infrastructure; and `prisma` is the schema/migration source of truth. Tests are separated by execution scope rather than duplicated beside every component.

## 7. Database Design

Use PostgreSQL with UUID primary keys, UTC timestamps, and foreign keys. Prisma maps application models to these tables.

### Tables

#### `users`

| Column          | Type         | Constraints                            |
| --------------- | ------------ | -------------------------------------- |
| `id`            | UUID         | Primary key, generated                 |
| `email`         | VARCHAR(320) | Not null, unique, normalized lowercase |
| `password_hash` | TEXT         | Not null for credentials users         |
| `display_name`  | VARCHAR(100) | Not null                               |
| `time_zone`     | VARCHAR(64)  | Not null, valid IANA zone, default UTC |
| `created_at`    | TIMESTAMPTZ  | Not null, default now                  |
| `updated_at`    | TIMESTAMPTZ  | Not null, updated by application       |

#### `tasks`

| Column         | Type         | Constraints                                                |
| -------------- | ------------ | ---------------------------------------------------------- |
| `id`           | UUID         | Primary key                                                |
| `user_id`      | UUID         | Not null, FK to `users(id)` on delete cascade              |
| `category_id`  | UUID         | Nullable, FK to `categories(id)` on delete set null        |
| `title`        | VARCHAR(200) | Not null after trimming                                    |
| `notes`        | TEXT         | Nullable, bounded by API validation (suggested max 10,000) |
| `status`       | VARCHAR/enum | Not null, `todo`, `in_progress`, or `completed`            |
| `priority`     | VARCHAR/enum | Not null, `none`, `low`, `medium`, or `high`               |
| `due_date`     | DATE         | Nullable                                                   |
| `completed_at` | TIMESTAMPTZ  | Nullable; set only for completed tasks                     |
| `created_at`   | TIMESTAMPTZ  | Not null, default now                                      |
| `updated_at`   | TIMESTAMPTZ  | Not null, updated by application                           |

#### `categories`

| Column            | Type        | Constraints                                   |
| ----------------- | ----------- | --------------------------------------------- |
| `id`              | UUID        | Primary key                                   |
| `user_id`         | UUID        | Not null, FK to `users(id)` on delete cascade |
| `name`            | VARCHAR(50) | Not null                                      |
| `normalized_name` | VARCHAR(50) | Not null, lowercase/trimmed comparison value  |
| `created_at`      | TIMESTAMPTZ | Not null, default now                         |
| `updated_at`      | TIMESTAMPTZ | Not null                                      |

Unique constraint: `(user_id, normalized_name)`, where `normalized_name` is a lowercase/trimmed comparison value maintained by the service.

#### `tags`

| Column            | Type        | Constraints                                   |
| ----------------- | ----------- | --------------------------------------------- |
| `id`              | UUID        | Primary key                                   |
| `user_id`         | UUID        | Not null, FK to `users(id)` on delete cascade |
| `name`            | VARCHAR(40) | Not null                                      |
| `normalized_name` | VARCHAR(40) | Not null                                      |
| `created_at`      | TIMESTAMPTZ | Not null, default now                         |

Unique constraint: `(user_id, normalized_name)`.

#### `task_tags`

| Column    | Type | Constraints                         |
| --------- | ---- | ----------------------------------- |
| `task_id` | UUID | FK to `tasks(id)` on delete cascade |
| `tag_id`  | UUID | FK to `tags(id)` on delete cascade  |

Primary key: `(task_id, tag_id)`.

#### Authentication support tables

If using Auth.js database sessions, include its adapter tables (`accounts`, `sessions`, and `verification_tokens`) using the adapter's documented schema and migrations. Do not hand-roll a competing session model.

### Indexes

- `tasks(user_id, updated_at DESC, id)` for default list pagination.
- `tasks(user_id, status, due_date)` for active/today/overdue views.
- `tasks(user_id, priority, due_date)` for priority and due-date sorting.
- `tasks(user_id, category_id, updated_at DESC)` for category filtering.
- `task_tags(tag_id, task_id)` for tag filtering.
- Unique indexes described above.
- Add full-text search indexes only after measuring search needs; initially use a bounded `ILIKE` query or PostgreSQL search strategy appropriate to observed data volume.

## 8. API Design

All endpoints return JSON, use `/api/v1`, require an authenticated session unless noted, and include a request ID in response headers. Dates use `YYYY-MM-DD`; timestamps use ISO 8601 UTC.

### Response conventions

Success:

```json
{
  "data": {},
  "meta": { "requestId": "req_..." }
}
```

Paginated list:

```json
{
  "data": [],
  "meta": {
    "nextCursor": "opaque-cursor-or-null",
    "hasMore": false,
    "counts": {
      "all": 0,
      "active": 0,
      "completed": 0,
      "dueToday": 0,
      "overdue": 0
    },
    "requestId": "req_..."
  }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "fields": { "title": "Title is required." }
  },
  "meta": { "requestId": "req_..." }
}
```

Never expose stack traces, SQL, hashes, or whether another user's resource exists.

### Endpoints

| Method and path                   | Purpose                         | Request/query                                                                                                | Auth                                            |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `POST /api/v1/auth/register`      | Create account                  | `{ email, password, displayName, timeZone? }`                                                                | Public; rate limited                            |
| `GET /api/v1/tasks`               | List tasks                      | `cursor`, `limit` (1–100), `search`, `status`, `priority`, `categoryId`, `tagId`, `due`, `sort`, `direction` | Required                                        |
| `POST /api/v1/tasks`              | Create task                     | `{ title, notes?, status?, priority?, dueDate?, categoryId?, tagIds? }`                                      | Required                                        |
| `GET /api/v1/tasks/:id`           | Read one task                   | None                                                                                                         | Required, owner only                            |
| `PATCH /api/v1/tasks/:id`         | Partial update                  | Any editable task fields; use a defined schema                                                               | Required, owner only                            |
| `POST /api/v1/tasks/:id/complete` | Toggle completion               | `{ completed: boolean }`                                                                                     | Required, owner only                            |
| `DELETE /api/v1/tasks/:id`        | Delete task                     | None                                                                                                         | Required, owner only                            |
| `GET /api/v1/categories`          | List categories                 | Optional search                                                                                              | Required                                        |
| `POST /api/v1/categories`         | Create category                 | `{ name }`                                                                                                   | Required                                        |
| `PATCH /api/v1/categories/:id`    | Rename category                 | `{ name }`                                                                                                   | Required, owner only                            |
| `DELETE /api/v1/categories/:id`   | Remove category                 | None; tasks become uncategorized                                                                             | Required, owner only                            |
| `GET /api/v1/tags`                | List tags for the picker        | Optional `search`                                                                                            | Required                                        |
| `POST /api/v1/tags`               | Create or return normalized tag | `{ name }`                                                                                                   | Required                                        |
| `GET /api/v1/health`              | Liveness/readiness signal       | None                                                                                                         | Public or internal, based on host configuration |

### Status codes and validation

- `200` successful reads/updates, `201` creates, `204` deletion with no body.
- `400` malformed JSON or invalid query structure.
- `401` missing/expired session.
- `403` authenticated but not permitted (use sparingly; resource ownership failures may be `404`).
- `404` resource not found or not visible to the user.
- `409` normalized category/tag/email conflict.
- `422` semantically invalid field values if the API distinguishes this from malformed input.
- `429` rate limit exceeded.
- `500` unexpected server/database failure with a safe message.

Limit payload sizes, reject unknown or unsafe values, trim strings, normalize email/tag/category comparison values, and validate referenced IDs as UUIDs before database access.

## 9. UI/UX Plan

### Screens and navigation

- Public landing/sign-in/register screens.
- Authenticated dashboard with task list and summary counts.
- Task detail/edit screen or modal, depending on responsive layout.
- Settings screen for display name and time zone.
- Navigation: desktop sidebar, mobile bottom bar or compact menu; active destination must be announced and visually clear.

### Key components

- `AppShell`, `Header`, `Sidebar`, `MobileNavigation`
- `TaskToolbar`, `SearchInput`, `FilterMenu`, `SortMenu`
- `TaskList`, `TaskRow`, `TaskStatusControl`, `PriorityBadge`, `DueDateLabel`
- `TaskForm`, `CategorySelect`, `TagPicker`
- `ConfirmDialog`, `ToastRegion`, `InlineError`, `EmptyState`, `LoadingSkeleton`

### Task creation/edit experience

- Primary add action is always discoverable.
- Quick-add accepts a title and creates with defaults.
- Full form exposes notes, status, priority, due date, category, and tags.
- On edit, focus the first invalid field after validation; preserve values on failure.
- Completion uses a button with an accessible name that includes the task title and current state.
- Destructive deletion requires a confirmation dialog; focus is trapped and returned to the triggering control.

### States

- **Loading:** skeleton rows that match the final layout, not a blank screen.
- **Empty:** explain why the list is empty and offer “Add your first task”; filtered-empty states offer “Clear filters.”
- **Error:** concise explanation, retry action, and no fabricated success state.
- **Offline/network interruption:** retain local form values and offer retry; do not silently discard edits.
- **Confirmation:** deletion and potentially bulk actions use explicit dialogs; completion does not require confirmation.

### Responsive and accessibility behavior

- On small screens, filters open in a full-width sheet and task metadata wraps without clipping.
- Touch targets are at least approximately 44×44 CSS pixels.
- Use semantic headings, landmarks, labels, `aria-live` for non-blocking status, and `aria-describedby` for validation.
- Keyboard users can create, edit, filter, complete, and delete without pointer-only controls.
- Respect reduced-motion preferences and do not rely on hover to reveal essential actions.

## 10. Development Phases

### Phase 0 — Confirm scope and bootstrap

**Objective:** Establish a reproducible baseline before feature work.

**Tasks and likely files:**

- Confirm assumptions in this document (account model, password reset timing, deployment target).
- Initialize Next.js/TypeScript project and npm scripts (npm is used in this environment; pnpm remains an acceptable equivalent for contributors).
- Add Tailwind, ESLint, Prettier, Vitest, Testing Library, and Playwright configuration.
- Create `.env.example`, `README.md`, and CI workflow.

**Dependencies:** Node.js LTS, pnpm, PostgreSQL development instance.  
**Expected result:** Clean app shell, documented setup, lint/type/test commands.  
**Testing:** CI runs formatting check, lint, type check, and a smoke test.

### Phase 1 — Domain model and persistence

**Objective:** Create the durable data foundation.

**Tasks and files:** `prisma/schema.prisma`, migrations, `lib/db.ts`, seed script, repository skeletons.

- Define tables, enums, constraints, indexes, and Auth.js adapter models.
- Apply migration and seed a development user/category/task fixture.
- Verify cascade/set-null behavior and transaction boundaries.

**Dependencies:** Phase 0.  
**Expected result:** Reproducible schema and safe database connection lifecycle.  
**Testing:** Migration-from-empty-database test, repository tests, constraint tests.

### Phase 2 — Authentication and authorization

**Objective:** Secure account access and isolate user data.

**Tasks and files:** `lib/auth.ts`, auth pages, registration route/schema, session helpers, middleware as appropriate.

- Implement registration with Argon2id hashing and rate limiting strategy.
- Configure sign-in/sign-out and protected layouts/routes.
- Add ownership-aware service/repository helpers.

**Dependencies:** Phase 1.  
**Expected result:** A user can register, sign in, sign out, and cannot access another user's records.  
**Testing:** Password verification, duplicate email, unauthorized requests, session expiry, cross-user access attempts, cookie flags.

### Phase 3 — Task CRUD vertical slice

**Objective:** Deliver the smallest useful end-to-end product.

**Tasks and files:** task schemas/types, task repository/service, task route handlers, dashboard page, `TaskList`, `TaskRow`, `TaskForm`.

- Implement create/read/edit/delete and completion toggle.
- Add server and client validation, loading/error/empty states, and refresh persistence.
- Use transactions for completion timestamp consistency.

**Dependencies:** Phases 1–2.  
**Expected result:** An authenticated user can manage tasks end to end.  
**Testing:** API integration and primary UI flow tests.

### Phase 4 — Organization and discovery

**Objective:** Make a growing task list manageable.

**Tasks and files:** category/tag schema/services/routes, filter/search/sort controls, URL state helpers.

- Add priority, due dates, statuses, categories, tags, pagination, search, filters, and deterministic sorting.
- Add required indexes and verify query plans on representative seed data.

**Dependencies:** Phase 3.  
**Expected result:** Users can quickly locate and prioritize tasks.  
**Testing:** Query combinations, date/time-zone cases, pagination consistency, normalization conflicts, category deletion behavior.

### Phase 5 — UX, accessibility, and resilience hardening

**Objective:** Make the product polished and dependable.

**Tasks and files:** shared UI components, dialogs/toasts, responsive styles, error boundaries, logging/request IDs, health route.

- Complete keyboard/screen-reader behavior and responsive layouts.
- Add retry flows, safe error mapping, focus management, and deletion confirmation.
- Add basic metrics/logging and production configuration checks.

**Dependencies:** Phases 3–4.  
**Expected result:** Usable experience across supported browsers and network conditions.  
**Testing:** Accessibility audit, responsive Playwright runs, error injection, and visual review.

### Phase 6 — Release and operational readiness

**Objective:** Deploy safely and establish maintenance practices.

**Tasks and files:** CI/CD workflow, deployment configuration, migration procedure, runbook in `README.md` or deployment docs.

- Configure production secrets, database backups, TLS, domains, and environment validation.
- Run migrations as a controlled release step.
- Verify health checks, logs, rollback procedure, and account/data privacy.

**Dependencies:** Phases 0–5.  
**Expected result:** Repeatable staging and production deployment.  
**Testing:** Full CI, staging smoke tests, migration rollback rehearsal where supported, and post-deploy checks.

## 11. Testing Strategy

### Unit tests

- Date-only parsing, due/overdue calculations, sorting comparators, normalization, pagination cursors, and validation schemas.
- Service rules: completion timestamps, category deletion, tag deduplication, and authorization predicates.

### Integration tests

- Route handlers against a test PostgreSQL database.
- CRUD, filters, pagination, transaction rollback, constraint conflicts, and authentication boundaries.
- Run migrations before the suite and isolate test data per test or suite.

### Component/UI tests

- Render task rows and forms with accessible labels.
- Verify validation, keyboard interactions, filter URL synchronization, loading/error/empty states, and focus behavior.

### End-to-end tests

At minimum:

1. Register, sign in, create a task, refresh, and see it persist.
2. Edit title/details and verify the updated list.
3. Complete and uncomplete a task.
4. Apply status/priority/category/tag/date filters and clear them.
5. Search and sort across multiple pages.
6. Delete after confirmation and verify it is gone.
7. Attempt unauthenticated and cross-user access.
8. Simulate a failed mutation and verify input is preserved with a retry path.

### Edge and browser coverage

- Empty database, maximum lengths, Unicode and whitespace, duplicate normalized names, invalid IDs, invalid dates, time-zone transitions, rapid repeated toggles, stale pagination cursors, and network timeouts.
- Test current supported Chromium, Firefox, and WebKit through Playwright at mobile and desktop viewport sizes.
- Include automated accessibility checks plus manual keyboard and screen-reader verification before release.

## 12. Error Handling

| Failure                         | Handling                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid form/query input        | Inline field errors; return `400`/`422`; do not call the database for obviously malformed input.                                                                                |
| Expired session                 | Return `401`; client redirects to sign-in while preserving a safe return path.                                                                                                  |
| Unauthorized resource           | Return `404` or `403` according to the chosen information-disclosure policy; never leak ownership.                                                                              |
| Duplicate email/category/tag    | Return stable `409` code; explain the actionable correction.                                                                                                                    |
| Missing referenced category/tag | Return validation/not-found error; do not partially save task changes.                                                                                                          |
| Network timeout                 | Show retry and preserve local form data; prevent duplicate submissions with pending state.                                                                                      |
| Database outage/timeout         | Log request ID and details server-side, return a generic `500`/service-unavailable response, and do not claim success.                                                          |
| Unexpected client render error  | Use an error boundary with recovery/reload action and telemetry.                                                                                                                |
| Concurrent update conflict      | Include `updatedAt` or a version token in mutation checks if conflict frequency warrants it; otherwise define last-write-wins explicitly and show refreshed data after failure. |

Centralize error codes and mapping. Do not use broad catches that silently convert failures into empty lists or successful mutations.

## 13. Security

- Enforce HTTPS and secure, HTTP-only, SameSite session cookies in production.
- Hash passwords with Argon2id and use a strong password policy without exposing account enumeration details.
- Rate limit registration, sign-in, and password-reset requests; add progressive defenses if abuse appears.
- Validate and normalize all input on the server; use Prisma parameters rather than string-built SQL.
- Enforce user ownership in every repository query and mutation, including categories, tags, and join-table writes.
- Protect state-changing routes against CSRF according to the Auth.js/session strategy; verify same-origin behavior and origin checks where applicable.
- Escape rendered user content; treat notes as plain text and do not render arbitrary HTML.
- Set CSP and other security headers appropriate to Next.js deployment.
- Limit request body size and pagination bounds.
- Do not log passwords, cookies, authorization headers, or unnecessary full task notes.
- Keep dependencies patched, lock versions, scan dependencies in CI, and store secrets only in the deployment secret manager.
- Back up PostgreSQL, restrict database network access, and test restoration procedures.

## 14. Edge Cases and Explicit Policies

| Edge case                      | Policy                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Duplicate task titles          | Allowed; titles are not identifiers. A warning is unnecessary because legitimate duplicates are common.                      |
| Empty/whitespace title         | Reject after trimming; show required-field error.                                                                            |
| Very long title/notes          | Enforce documented limits client- and server-side; show remaining/maximum guidance where useful.                             |
| Unicode, emoji, and mixed case | Preserve display text; normalize only comparison fields; use Unicode-safe length handling.                                   |
| Invalid/past due date          | Past dates are allowed and become overdue; malformed or impossible dates are rejected.                                       |
| Time-zone changes              | Store the date value as entered; use the user's current time zone only when deriving today/overdue.                          |
| Completion with due date       | Keep due date when completed; completed overdue tasks remain historically visible but are not counted as active overdue.     |
| Deleted category               | Set task `category_id` to null in a transaction.                                                                             |
| Deleted tag                    | Remove join rows; do not delete tasks.                                                                                       |
| Refresh/navigation during save | Disable duplicate submit, await mutation state, and reconcile from server after completion.                                  |
| Network failure                | Keep edits in the form, show failure, and allow explicit retry.                                                              |
| Simultaneous updates           | Start with documented last-write-wins behavior; add optimistic concurrency/version checks if user testing exposes data loss. |
| Stale cursor                   | Restart from the first page when the API rejects a cursor, rather than silently showing inconsistent data.                   |
| Invalid API request            | Reject unknown/invalid fields and return structured errors; never trust client-only validation.                              |
| Database failure               | Surface a retryable generic error, log diagnostic context, and preserve data integrity through transactions.                 |

## 15. Future Enhancements

Do not include these in the initial implementation unless a requirement changes:

- Recurring tasks and reminders/notifications.
- Subtasks, checklists, dependencies, and project/workspace hierarchies.
- Shared lists, collaboration, comments, and role-based permissions.
- Offline-first support, background sync, and conflict-resolution UI.
- Calendar integration, email ingestion, and native mobile/desktop clients.
- Bulk edit/delete, drag-and-drop ordering, and custom saved views.
- Attachments, rich text, voice input, and AI task extraction.
- Audit history, data export/import, and advanced analytics.
- SSO/OAuth providers, passkeys, and enterprise administration.
- Redis-backed jobs/cache and service decomposition, only when measured scale requires them.

## 16. Implementation Checklist

### Product and setup

- [ ] Confirm assumptions and MVP acceptance criteria.
- [ ] Initialize Next.js, TypeScript strict mode, pnpm, Tailwind, linting, formatting, and test runners.
- [ ] Document local setup, required environment variables, and supported browsers.
- [ ] Add CI checks for install, format, lint, type check, unit/integration tests, and build.

### Data and backend

- [ ] Define Prisma schema, constraints, indexes, and Auth.js adapter tables.
- [ ] Create and test migrations from an empty database.
- [ ] Implement database client lifecycle and environment validation.
- [ ] Implement shared schemas, API response/error conventions, request IDs, and error mapping.
- [ ] Implement repositories with ownership predicates and transaction boundaries.
- [ ] Add health/readiness behavior without exposing secrets or database internals.

### Authentication

- [ ] Implement registration, password hashing, credential sign-in, sign-out, and protected routes.
- [ ] Configure secure cookies, session expiration, and rate limiting.
- [ ] Test duplicate accounts, invalid credentials, session expiry, and cross-user access.
- [ ] Decide and document password reset before release if it is part of the MVP promise.

### Task features

- [ ] Implement task create/read/update/delete and completion toggle.
- [ ] Implement status, priority, date, category, tags, search, filters, sorting, and cursor pagination.
- [ ] Add normalization and length/date validation on both client and server.
- [ ] Add category rename/delete and tag creation behavior.
- [ ] Verify indexes and representative query performance.

### Frontend and UX

- [ ] Build authenticated shell and responsive navigation.
- [ ] Build task list, task row, quick add, full edit form, filters, sorting, and search.
- [ ] Add loading skeletons, empty states, error/retry states, toasts, and confirmation dialogs.
- [ ] Synchronize list state with URL parameters and preserve safe navigation on sign-in.
- [ ] Implement keyboard navigation, focus management, labels, announcements, contrast, and reduced motion.

### Verification and release

- [ ] Add unit, integration, component, API, and end-to-end coverage for the flows in the testing strategy.
- [ ] Test mobile/desktop layouts and supported browsers.
- [ ] Run dependency/security checks and inspect production headers/cookies.
- [ ] Configure staging and production secrets, migrations, backups, monitoring, and rollback.
- [ ] Run staging smoke tests and verify post-deploy health.
- [ ] Review this plan and update it if implementation decisions materially change the architecture.

## 17. Copilot Development Rules

When implementation begins, GitHub Copilot or another coding agent must:

1. Follow the architecture, API conventions, data ownership rules, and phase order in this document.
2. Do not introduce unnecessary dependencies, framework changes, global state, microservices, or infrastructure.
3. Keep components, services, repositories, and validation schemas modular and single-purpose.
4. Search for and reuse existing utilities, UI primitives, schemas, and error handling before adding new ones.
5. Validate user input on the server even when client validation exists.
6. Handle loading, error, empty, retry, disabled, and success states for every asynchronous user flow.
7. Preserve accessibility, responsive behavior, keyboard operation, and semantic HTML in every UI change.
8. Enforce authentication and ownership at the service/repository boundary; never rely on UI hiding.
9. Use transactions for related database changes and avoid leaking ORM/database errors.
10. Write focused tests for new behavior, including relevant edge cases and authorization paths.
11. Keep code readable and typed; avoid unnecessary casts, broad catches, silent fallbacks, and duplicated logic.
12. Do not modify unrelated files or rewrite existing behavior without a direct requirement.
13. Before making a significant architectural change, explain the trade-off, impact, migration path, and testing plan, then obtain approval if the change affects documented contracts.
14. Update this document whenever a material architecture, data model, API, security, or deployment decision changes.
15. Run the smallest relevant formatter, linter, type check, test, and build commands after each coherent change; resolve failures before proceeding.
16. Never commit secrets, credentials, generated production data, or unreviewed migrations.
17. Keep API responses and error codes backward-compatible within a version; introduce a new API version for incompatible changes.
18. Finish each implementation phase with a working, tested increment before starting the next phase.
