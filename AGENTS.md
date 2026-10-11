# Repository Guidelines

## Project Structure

- `client/` contains the React 19 and Vite app. Source and static assets live in `client/src/` and `client/public/`.
- `server/src/` contains the Express 5 API. Organize request handling as routes → controllers → services; Drizzle tables are in `server/src/db/schema/`.
- `server/src/__tests__/` holds Jest API tests. SQL migrations are in `server/drizzle/`.
- `docs/docs.md` describes product intent. `docs/base/` contains the reference schema and seed notes; check the live Drizzle schema before changing database code.

## Development Commands

Run commands from the named package directory:

- API: `cd server; npm run dev` starts the server; `npm test`, `npm run lint`, and `npm run format:check` run tests and checks.
- Client: `cd client; npm run dev` starts Vite; `npm run build`, `npm run lint`, and `npm run format:check` validate the app.
- Root: `npm run format:check` checks formatting across the repository.
- Database: from `server/`, use `npm run generate` to create a Drizzle migration and `npm run migrate` to apply pending migrations.

## Style and Naming

Use ES modules and existing JavaScript conventions. Prettier is configured for three-space indentation, semicolons, single quotes, trailing commas, and LF endings. Name route, controller, and service files by domain, such as `appointment.route.js` and `appointment.controller.js`. Tests use `*.test.js` under `server/src/__tests__/`.

## Testing and Review

Run the relevant package checks before opening a pull request. API tests use Jest and mocked Drizzle queries; do not assume they connect to PostgreSQL. Client CI runs lint, formatting checks, and a production build. Describe behavior changes, database migrations, and manual checks in the PR. Use concise Conventional Commit prefixes found in the history, such as `feat:`, `fix:`, and `chore:`.

## Security and Data

Keep credentials in ignored `.env` files; never commit secrets or real patient data. Use synthetic records in tests and examples. Preserve appointment and waitlist transaction and conflict checks. Treat `docs/base/` as reference material, not a substitute for updating the Drizzle schema and migration.
