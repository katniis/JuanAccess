# Backend integration research

Accessed 2026-10-12.

## PhilHealth

PhilHealth's public online-services page describes Claims Eligibility Checking for providers and links to eClaims services. The official eClaims circular describes provider eligibility checking, electronic claim submission, claim tracking, and reimbursement workflows. The published materials do not provide a general public prior-authorization API, so the application keeps prior authorization and appeals in manual review until the clinic has an accredited facility integration and credentials.

- https://www.philhealth.gov.ph/services/
- https://www.philhealth.gov.ph/circulars/2016/circ2016-016.pdf
- https://www.philhealth.gov.ph/downloads/

## Application limits

The insurer adapter is server-side and defaults to manual mode. Credentials, account keys, facility identifiers, payer contracts, and production endpoint paths must be supplied by the clinic before live requests are enabled. No patient records or Synthea data are included in this integration work.
