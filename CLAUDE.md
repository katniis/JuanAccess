# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

JuanAccess: a patient/clinic-staff web app covering a visit end to end (booking and waitlist, insurance coverage and prior auth, pre-visit chart summaries, bill review and dispute letters). Insurer decisions are simulated (`mockInsurerService`); Gemini drafting, Resend email, and Supabase Storage are optional integrations with fallbacks. Product intent is in `docs/docs.md`. `AGENTS.md` has repo conventions (style, PR expectations); read it too.

## Commands

Run from the package directory (Node 24; set up `.env` from `.env.example` in both `server/` and `client/`).

- Server (`cd server`): `npm run dev` (nodemon), `npm test`, `npm run lint`, `npm run format:check`, `npm run generate` (new Drizzle migration), `npm run migrate`, `npm run seed:ph-public-data`, `npm run import:data`, `npm run security:check`.
- Single server test: `npm test -- src/__tests__/waitlist.test.js` (add `-t "name"` to filter). The script already passes `--experimental-vm-modules` for ESM Jest.
- Client (`cd client`): `npm run dev` (Vite, :5173), `npm run build`, `npm run lint`, `npm run format:check`. There is no client test suite.
- Root: `npm run format:check`. Husky runs `lint-staged` (Prettier) on commit. CI workflows are in `.github/workflows/` (client: lint + format + build; server: lint/format/test).

## Architecture

**Server** (`server/src`, Express 5, ESM, Drizzle + `postgres`): `routes/*.route.js` → `controller/` → `services/`, mounted in `app.js` under `/auth`, `/appointment`, `/waitlist`, `/insurance`, `/prior-auth`, `/staff`, `/bills`, `/notifications`, plus `/api/health`. Auth is JWT in cookies (`middleware/verifyToken`, with `requireStaff` / `requireStaffAdmin` role gates). `app.js` sets `process.env.TZ` from `CLINIC_TIME_ZONE`; clinic-day logic uses the Manila helpers in `utils/` — use them rather than raw `Date` day math. Drizzle tables live in `db/schema/` (one file per table) with SQL migrations in `server/drizzle/`; `docs/base/` is reference only, so change the live schema plus a migration. Cross-cutting services: `recordAudit`, `insertNotification`, `createBill`, `createPriorAuthorizationForAppointment`, `verifyCoverage` → `mockInsurerService`, Gemini draft generation.

**Server tests** (`__tests__/`) never hit Postgres. `helpers.js` mocks `db/index.js` and the email service via `jest.unstable_mockModule`; queries resolve from a FIFO `mockQueryQueue`, so each test must enqueue results in the exact order the code under test issues queries. Adding or reordering a query in a controller/service breaks tests that queue results for it.

**Client** (`client/src`, React 19, Vite 8, React Router 7, Tailwind 4, GSAP): `pages/patient/` and `pages/staff/` split by role, with `layouts/`, `contexts/` (`AuthContext`, `PortalFeedbackProvider`), and `services/` as the API layer (`patientRequest` / `staffRequest` wrappers; `getHomePathForRole` routes by role). Request helpers talk to the API with credentials, so the server's `CLIENT_ORIGIN` must match the client origin. Vercel rewrites route API calls to the server in production.

## Domain invariants

Appointment booking and waitlist offers rely on transactions and conflict checks (provider availability, rooms, equipment); preserve them when editing. Waitlist offers expire after `WAITLIST_OFFER_MINUTES`. Tests and examples must use synthetic patient data.

# When answering

- Answer concisely
