# Backend Postman run: 2026-10-12

## Run metadata

- API: `http://localhost:3000`
- Runner: Postman web Agent Mode through the connected Postman Desktop Agent
- Collection: `Aceso` in Sha Chi's Workspace
- Database: configured project database; no patient or credential records were used
- I/O mode: full synthetic request/response output was visible in the Postman agent; no secrets or patient data were sent

## Results

- Requests executed: 12 (1 health smoke request, 5 saved Aceso requests with inferred paths, 4 corrected route checks, and 2 validation checks)
- Passed: 8 route/behavior checks; 4 saved requests exposed a URL configuration problem
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

The Postman agent displayed the request URL, query/body input, status, selected response headers, and response body for the corrected route and validation checks. All request bodies were `{}` or no body. No bearer token was generated or logged.

## Booking automation

- Jest chart-aware fallback test: passed
- Booking-to-draft Postman scenario: not run against this database because it would require creating or using a patient identity and appointment row
- Full repository collection: available at `tools/postman/backend.postman_collection.json`, but this run intentionally used the user's `Aceso` collection

## Safety checks

- No patient rows created, deleted, or modified by this run.
- Write-heavy collection runs must use a disposable local or staging database.
- Secrets, cookies, document bytes, and unrestricted clinical text are redacted by the collection logger.
- Aceso currently contains five saved requests with empty URL fields, so it cannot by itself run authenticated booking or verify the post-booking prior-authorization draft automation.
