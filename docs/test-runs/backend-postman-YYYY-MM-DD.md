# Backend Postman verification log template

Copy this file to `docs/test-runs/backend-postman-YYYY-MM-DD.md` after a disposable local/staging run.

## Run metadata

- Date/time:
- API base URL:
- Database environment: disposable local/staging
- Collection exit code:
- Postman CLI version:
- `io_log_mode`: `full` for synthetic test data only

## Results

- Requests executed:
- Passed:
- Failed:
- Skipped:
- Booking automation result: `needs_draft` → `drafted`
- Draft source: `gemini` or `fallback`
- Patient rows before/after:
- Appointment rows before/after:

## Failures

| Test ID | Method | Path | Expected | Actual | Input/output summary | Reproduction |
| ------- | ------ | ---- | -------: | -----: | -------------------- | ------------ |
| _none_  |        |      |          |        |                      |              |

## Security checks

- Secrets redacted:
- Cross-patient access rejected:
- Browser-level database access denied:
- Private Storage bucket confirmed:
- Signed URL authorization confirmed:

## Notes

Do not commit raw production responses, credentials, cookies, document bytes, or unrestricted clinical data.
