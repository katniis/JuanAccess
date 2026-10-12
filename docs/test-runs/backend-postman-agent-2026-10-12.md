# Aceso Postman Agent rerun — 2026-10-12

## Attempt

- Surface: Postman web UI in Chrome, Aceso collection, connected Desktop Agent
- Attempt time: `2026-10-12T11:22:56+08:00`
- Prompt submitted: rerun every Aceso endpoint and edge case against `http://localhost:3000`, use synthetic data, show every request and response, and leave saved collection items unchanged
- Visible result: no agent response or request execution started after the prompt was submitted
- Visible blocker: `Your AI credit limit has been exhausted and will refresh in 4 hours.`

The Chrome UI still shows the Aceso collection with five saved requests. The live Agent conversation contains the earlier five-request smoke run, unauthenticated route checks, validation checks, and an unfinished booking request. This attempt did not create or modify database records.

## Available evidence

The full 89-request Postman collection run against the actual local API/database is recorded in [backend-postman-2026-10-12-full.md](C:/Users/jbree/untitled/docs/test-runs/backend-postman-2026-10-12-full.md). That run passed 90 assertions and cleaned its synthetic records, but it was executed by the local Postman CLI after the Agent reached its credit limit. It is not being represented as a successful Agent rerun.

The Aceso Agent cannot complete the requested every-endpoint rerun until its credit allowance refreshes or the workspace receives additional Postman AI credits.
