# Backend integration research

Accessed 2026-10-12.

## Insurance simulation

PhilHealth's public materials describe provider eligibility checking and eClaims workflows, but the project does not call those services. The application uses a clearly labeled local insurance-plan simulation for staff-selected active/inactive coverage and synthetic prior-authorization decisions; it does not submit or appeal a real payer request.

- https://www.philhealth.gov.ph/services/
- https://www.philhealth.gov.ph/circulars/2016/circ2016-016.pdf
- https://www.philhealth.gov.ph/downloads/

## Application limits

The insurer adapter is server-side and local-only. New coverage remains `unverified` until staff selects `active` or `inactive`; prior authorization defaults to `approved` unless staff chooses another synthetic outcome. Insurance-company appeals are out of scope. No patient records or Synthea data are included in this integration work.

## Bill files

Bill uploads use the private Supabase Storage bucket `patient-bills` under `patients/{patientId}/bills/{uuid}`. The API returns a short-lived signed preview URL only after patient or staff authorization. Gemini OCR returns draft line items requiring review, and raw document bytes are not written to Postgres or application logs.

## Gemini document extraction

Gemini's `generateContent` API accepts inline PDF and image bytes and can return structured JSON. The patient-scoped `/bills/ocr` endpoint sends a document to Gemini for line-item extraction, returns the rows for review, and falls back to an empty manual-review result when the key or provider is unavailable. Document bytes are not logged or stored by the API.

- https://ai.google.dev/gemini-api/docs/generate-content/document-processing

## Prior-authorization drafting

When a booking matches a prior-authorization rule, the API commits the appointment first and then generates a chart-aware justification draft in a post-booking job. The job reads only the appointment's documented clinical context, uses Gemini when available, falls back to a deterministic review draft on provider failure, and never submits or approves the request. Pending `needs_draft` records are retried by the server worker, while staff edits remain authoritative.

Postman verification artifacts under `tools/postman/` exercise the live API against disposable environments. Full synthetic request and response bodies are available only when `io_log_mode=full`; secrets are always redacted.
