# Todo Application Feature Audit

Audit date: 2026-09-09

## Architecture Finding

The repository does not contain a FastAPI, SQLAlchemy, or Alembic backend. The implemented architecture is a Next.js modular monolith:

`React UI -> Next.js client fetch -> Route Handler -> Auth.js session -> Prisma -> PostgreSQL`

Adding a second FastAPI backend would duplicate the existing API and create two competing authentication and persistence paths. This audit therefore evaluates the implemented Next.js/Prisma path.

## Feature Matrix

| Feature | UI exists | Backend exists | API verified | Database path | End-to-end status |
| --- | --- | --- | --- | --- | --- |
| Registration | Yes | Yes | Validation and unauthenticated responses verified | Prisma `User` | Ready; requires configured database |
| Login | Yes | Yes | Auth.js route present | Prisma `User` | Ready; requires configured database |
| Logout | Yes | Yes | Auth.js sign-out verified in browser | JWT session | Verified: redirects to `/login` |
| Current user | Partial | Yes | Session callback provides user ID | Prisma user lookup | Ready for authenticated flow |
| Create task | Yes | Yes | Demo flow verified; API contract reviewed | Prisma transaction | Fixed and verified in demo mode |
| Read tasks | Yes | Yes | 401 fallback verified | User-scoped Prisma query | Ready with database |
| Edit task | Yes | Yes | Demo flow implemented | Ownership-scoped transaction | Ready |
| Complete/restore | Yes | Yes | Demo flow implemented | Status and `completedAt` update | Ready |
| Delete task | Yes | Yes | Confirmation and demo deletion implemented | Ownership-scoped delete | Ready |
| Projects/categories | Yes | Yes | Create/update through task API | User-scoped category upsert | Ready |
| Tags | Yes | Yes | Create/update through task API | User-scoped tag upsert | Ready |
| Search | Yes | Yes | Client and API query support | Prisma text filters | Ready |
| Filtering | Yes | Yes | Today/completed/active/category/tag paths | Prisma where clauses | Ready |
| Sorting | Yes | Yes | Visible sort field/direction controls verified | Prisma orderBy | Verified in demo; database path uses same query contract |
| Dashboard | Yes | Yes | Browser rendered and populated demo data | Counts from Prisma groupBy | Ready |
| Today | Yes | Yes | Browser navigation verified | Date filter | Ready |
| Upcoming | Yes | Yes | Browser navigation verified | Active task/date filter | Ready |
| Completed | Yes | Yes | Navigation and status filter present | Status filter | Ready |
| Settings | Yes | N/A | Browser save flow verified | Browser local storage | Implemented for local preferences |
| Theme switching | Yes | N/A | Browser theme selector present | Local preference | Verified |
| Demo mode | Yes | N/A | Local storage create/refresh verified | Browser only | Verified and clearly labeled |
| Responsive navigation | Yes | N/A | Mobile menu and scrim implemented | N/A | Implemented; device matrix remains |
| Task editor/detail | Yes | Yes | Create/edit modal implemented | Prisma PATCH/POST | Ready |
| Quick add | Yes | Yes | Opens shared editor | Same task API | Implemented |
| Command palette | No | No | N/A | N/A | Not implemented |
| Notifications/toasts | Partial | N/A | Inline success/error status exists | N/A | Preferences control is local; browser notifications are not implemented |
| API error handling | Yes | Yes | 401 and validation paths handled | Prisma errors propagate | Hardened |

## Create Task Root-Cause Review

The task form uses `preventDefault`, required title validation, a shared submit handler, and the correct `POST /api/tasks` endpoint. In demo mode, the 401 response intentionally switches to browser storage and writes the task before reloading the list.

The production route:

1. Resolves the authenticated user with Auth.js.
2. Rejects unauthenticated requests with `401`.
3. Validates the request with Zod.
4. Upserts categories and tags inside one Prisma transaction.
5. Creates the task using the authenticated `userId`, never a client-supplied owner.
6. Commits and returns the created task with relations.

The transaction callback provides rollback semantics if any nested write fails. Invalid JSON now returns a visible `400` response instead of an opaque server failure. Client mutations now preserve the server's error message when the response is JSON or plain text.

## Automated Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run test:api`: passed (unauthenticated and validation contracts).
- `npm run test:e2e`: passed public-route smoke test; database regression test is skipped without `DATABASE_URL`.
- No FastAPI backend, Python test runner, SQLAlchemy models, or Alembic migrations exist in this repository, so FastAPI-specific tests are not applicable.

## Remaining Production Blockers

- Configure `DATABASE_URL` and `DIRECT_URL`, run the Prisma migration, and seed a development database.
- Add automated API and browser tests for authenticated database-backed flows.
- Run the authenticated PostgreSQL regression flow against an isolated configured test database.
- Restore an authenticated dashboard guard before production deployment; public demo access is only suitable for local review.
- Add a browser automation dependency such as Playwright if full DOM-level E2E coverage is required in CI.
