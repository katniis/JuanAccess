# Backend integration research

Accessed 2026-10-12.

## PhilHealth

PhilHealth's public online-services page describes Claims Eligibility Checking for providers and links to eClaims services. The official eClaims circular describes provider eligibility checking, electronic claim submission, claim tracking, and reimbursement workflows.

- https://www.philhealth.gov.ph/services/
- https://www.philhealth.gov.ph/circulars/2016/circ2016-016.pdf
- https://www.philhealth.gov.ph/downloads/

The published materials do not provide a general public prior-authorization API. The application therefore uses a clearly labeled local insurance-plan simulation for demo accept/reject decisions; it does not claim to submit or appeal a real payer request.

## Application limits

The insurer adapter is server-side. Eligibility remains manual unless PhilHealth credentials, account keys, facility identifiers, and a supplied endpoint path are configured. Prior authorization decisions are local demo outcomes, and insurance-company appeals are out of scope. No patient records or Synthea data are included in this integration work.

## Gemini document extraction

Gemini's `generateContent` API accepts inline PDF and image bytes and can return structured JSON. The patient-scoped `/bills/ocr` endpoint sends a document to Gemini for line-item extraction, returns the rows for review, and falls back to an empty manual-review result when the key or provider is unavailable. Document bytes are not logged or stored by the API.

- https://ai.google.dev/gemini-api/docs/generate-content/document-processing
