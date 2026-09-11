# atelier. Client Project Dashboard

An internal agency dashboard built with Vite + React/TypeScript, Express, Prisma, PostgreSQL, Socket.IO, and node-cron.

## Local setup

Requirements: Node 20+, Docker Desktop, and npm.

```bash
copy .env.example .env
docker compose up -d
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

The Vite client runs at `http://localhost:5173`; the API and Socket.IO server runs at `http://localhost:4000`.

Seed accounts all use `atelier-demo`: `alex@atelier.test` (Admin), `pm1@atelier.test` and `pm2@atelier.test` (Project Managers), and `dev1@atelier.test` through `dev4@atelier.test` (Developers).

## Architecture

The client is a Vite React TypeScript app. The server is an Express API with one centralized structured error handler. Prisma models users, clients, projects, tasks, persisted activity events, notifications, and hashed refresh-token records. Every protected route runs JWT middleware and then a role/scope check. PM queries are constrained by `project.ownerId`; developer queries are constrained by `task.developerId`, so changing a client-side role or URL cannot broaden access.

Socket.IO was chosen over native WebSocket because it provides authenticated rooms, reconnect behavior, and presence events with less protocol code. On connection, the server derives project rooms from the same database scope rules. Status changes are committed with an Activity row, then emitted to the project room. The activity endpoint returns the latest 20 persisted rows for offline catch-up. Refresh tokens are HttpOnly cookies; short-lived access tokens are returned in JSON and are never stored by the server in localStorage.

node-cron runs an hourly overdue sweep. This is sufficient for the small agency workload and keeps deployment simple; Bull would be the next step if retries and distributed workers became necessary. Indexes cover project ownership, task project/status, task developer/status, due dates, activity timelines, and unread notifications.

## Database shape

`User 1—N Project`, `Client 1—N Project`, `Project 1—N Task`, `User 1—N Task`, `Project 1—N Activity`, `Task 1—N Activity`, and `User 1—N Notification`. Foreign keys use cascading deletion for project-owned activity/tasks and user-owned notifications/tokens.

## Explanation (185 words)

The hardest problem was keeping the real-time feed consistent with authorization. A socket connection cannot be treated as a trusted UI session: the server verifies its access token, looks up the user’s project scope, and joins only the rooms that scope permits. Admins join every project, project managers join projects where they are the owner, and developers join rooms containing their assigned tasks. The REST activity endpoint applies the same scope and returns the latest twenty database rows, which gives an offline user deterministic catch-up after reconnecting instead of relying on an in-memory buffer. A task status update is handled in one transaction: the task changes, an immutable activity row is stored, and any review notification is created before the Socket.IO event is emitted.

The other important boundary is the API, not the dashboard. PM ownership and developer assignment are rechecked inside the status mutation route, so a forged role claim or guessed task ID cannot expose another team’s data. Access tokens are short-lived and refresh tokens are hashed in PostgreSQL while the raw refresh token stays in an HttpOnly cookie.

I would do differently for a larger deployment: replace node-cron with BullMQ and add an outbox table so database commits and event delivery can be retried independently.

## Known limitations

- The included overview is a polished seeded client view; production wiring should connect its data cards to `/api/dashboard` and pass the login access token to the Socket.IO client.
- Vercel can host the Vite build, but the long-lived Socket.IO API should run on a persistent Node host rather than a serverless function.
- Refresh-token rotation and CSRF protection should be added before internet-facing deployment.# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
