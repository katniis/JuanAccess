# Backend Postman run: 2026-10-12

## Run metadata

- API: `http://localhost:3000`
- Runner: Postman CLI 7.56.1
- Database: configured project database; read-only smoke request only
- I/O mode: `full` for synthetic smoke data; no credentials or patient data were sent

## Results

- Requests executed: 1
- Passed: 1
- Failed: 0
- Request: `GET /api/health`
- Response: `200 {"status":"ok"}`
- Visible Postman verbose input/output: confirmed

## Booking automation

- Jest chart-aware fallback test: passed
- Booking-to-draft Postman scenario: not run against this database because it creates patient and appointment rows
- Full collection: ready at `tools/postman/backend.postman_collection.json`

## Safety checks

- No patient rows created, deleted, or modified by this run.
- Write-heavy collection runs must use a disposable local or staging database.
- Secrets, cookies, document bytes, and unrestricted clinical text are redacted by the collection logger.
