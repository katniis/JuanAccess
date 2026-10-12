# Backend Postman run: 2026-10-12

## Run metadata

- API: `http://localhost:3000`
- Runner: Postman web Agent Mode through the connected Postman Desktop Agent
- Collection: `Aceso` in Sha Chi's Workspace
- Database: configured project database; one disposable synthetic patient was created for the authenticated run and removed after verification
- I/O mode: full synthetic request/response output was visible in the Postman agent; no secrets or patient data were sent

## Results

- Requests executed: 17 visible checks (the original 12 plus five authenticated Aceso requests)
- Passed: 13 route/behavior checks; 4 saved requests exposed a URL configuration problem
- Failed: 0 server failures; the 5 saved requests have blank URLs and their inferred `/api` paths returned expected `404`s
- Visible Postman verbose input/output: confirmed for every request below

### Visible request/response log

|   # | Request input                                                                                                                          | Response output                                         | Result                                       |
| --: | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
|   1 | `GET http://localhost:3000/api/health`                                                                                                 | `200`; `{"status":"ok"}`                                | Pass                                         |
|   2 | Aceso `Login` (saved URL empty; agent inferred `POST http://localhost:3000/api/auth/login`)                                            | `404`; `Cannot POST /api/auth/login`                    | Collection URL/path issue                    |
|   3 | Aceso `Me` (saved URL empty; agent inferred `GET http://localhost:3000/api/auth/me`)                                                   | `404`; `Cannot GET /api/auth/me`                        | Collection URL/path issue                    |
|   4 | Aceso `Book Appointment` (saved URL empty; agent inferred `POST http://localhost:3000/api/appointment`)                                | `404`; `Cannot POST /api/appointment`                   | Collection URL/path issue                    |
|   5 | Aceso `GET /appointment/visit-type` (saved URL empty; agent inferred `GET http://localhost:3000/api/appointment/visit-type`)           | `404`; `Cannot GET /api/appointment/visit-type`         | Collection URL/path issue                    |
|   6 | Aceso `GET /appointment/available-slots` (saved URL empty; agent inferred `GET http://localhost:3000/api/appointment/available-slots`) | `404`; `Cannot GET /api/appointment/available-slots`    | Collection URL/path issue                    |
|   7 | `GET http://localhost:3000/appointment/visit-type`                                                                                     | `401`; `{"message":"Not authorized: no token."}`        | Pass: route and auth boundary                |
|   8 | `GET http://localhost:3000/appointment/available-slots?visit_type_id=1&range_start=2026-10-13&range_end=2026-10-14`                    | `401`; `{"message":"Not authorized: no token."}`        | Pass: query accepted, auth boundary enforced |
|   9 | `GET http://localhost:3000/auth/me`                                                                                                    | `401`; `{"message":"Not authorized: no token."}`        | Pass: auth boundary                          |
|  10 | `GET http://localhost:3000/appointment/mine`                                                                                           | `401`; `{"message":"Not authorized: no token."}`        | Pass: ownership/auth boundary                |
|  11 | `POST http://localhost:3000/auth/login`, `Content-Type: application/json`, body `{}`                                                   | `400`; `{"message":"Email and password are required."}` | Pass: input validation                       |
|  12 | `POST http://localhost:3000/appointment`, `Content-Type: application/json`, body `{}`, no `Authorization` header                       | `401`; `{"message":"Not authorized: no token."}`        | Pass: auth checked before booking validation |

The Postman agent displayed the request URL, query/body input, status, selected response headers, and response body for the corrected route and validation checks. All request bodies were `{}` or no body. Tokens were redacted in this file.

### Authenticated Aceso run

The agent created one disposable synthetic patient and reused its HttpOnly cookie for these requests. The displayed results were:

| Request input                                                                                                  | Response output                                                | Result |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------ |
| `POST /auth/register` with synthetic registration JSON                                                         | `201 Created`; user/patient created and HttpOnly cookie issued | Pass   |
| `GET /auth/me` with the cookie                                                                                 | `200 OK`; patient identity returned                            | Pass   |
| `GET /appointment/visit-type` with the cookie                                                                  | `200 OK`; 14 visit types returned                              | Pass   |
| `GET /appointment/available-slots?visit_type_id=1&range_start=2026-10-13&range_end=2026-10-14` with the cookie | `200 OK`; 22 available slots returned                          | Pass   |
| `GET /appointment/mine` with the cookie                                                                        | `200 OK`; empty list for a new patient                         | Pass   |

The same paths without a cookie returned `401` with `{"message":"Not authorized: no token."}`. No Aceso collection item was modified.

## Booking automation

- Jest chart-aware fallback test: passed
- Booking-to-draft through the Aceso agent: not completed because the Postman Agent exhausted its AI-credit allowance after the authenticated run
- Supplemental local HTTP booking check (same disposable patient, synthetic PhilHealth Standard coverage, MRI Knee slot): `POST /insurance/mine` → `201` (`unverified`), `POST /appointment` → `201` (`priorAuthorizationStatus: needs_draft`), then `GET /prior-auth/mine` polled to `drafted`; the draft contained 313 characters and was deterministic fallback text, and `prior_authorization_draft_ready` was added alongside `appointment_created`
- Full repository collection: available at `tools/postman/backend.postman_collection.json`, but this run intentionally used the user's `Aceso` collection

## Safety checks

- The temporary synthetic user, patient, coverage, appointment, prior authorization, notifications, summaries, and audit rows were deleted after the run. Final counts: `users=0`, `patients=0`, `appointments=0`, `prior_authorizations=0`, `notifications=0`, `patient_coverage=0`, `audit_log=0`.
- Operational reference data remained intact (`visit_types=14`, `providers=7`).
- Write-heavy collection runs must use a disposable local or staging database.
- Secrets, cookies, document bytes, and unrestricted clinical text are redacted by the collection logger.
- Aceso currently contains five saved requests with empty URL fields. The agent can run ad-hoc requests with the correct paths, but saved collection items need URLs before they can be used as a repeatable full suite.
