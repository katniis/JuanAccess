# Backend Postman verification — 2026-10-12

This is the full local/staging-style Postman CLI run against the actual local Express API and database. The cloud Aceso Agent could not continue after its AI-credit limit, so the saved Aceso requests were left unchanged and normal Postman UI smoke checks were run separately.

- Requests: 89
- Assertions: 90
- Request failures: 0
- Assertion failures: 0
- Synthetic records cleaned after the run: users, patients, appointments, coverage, prior authorizations, appeals, notifications, bills, waitlist entries, and test reference rows
- UI smoke checks: `GET /api/health` → 200; unauthenticated `GET /appointment/visit-type` → 401

All request and response bodies below are redacted for credentials and patient-identifying or clinical fields. The source run used synthetic data only.

## 001 — Health

- Timestamp: 2026-10-12T03:16:19.794Z
- Role: public
- Duration: 45 ms
- Request: `GET http://localhost:3000/api/health`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "status": "ok"
   }
   ```

## 002 — Register patient

- Timestamp: 2026-10-12T03:16:20.383Z
- Role: public
- Duration: 481 ms
- Request: `POST http://localhost:3000/auth/register`
- Request body:
   ```json
   {
      "email": "[REDACTED]",
      "password": "[REDACTED]",
      "first_name": "[REDACTED]",
      "last_name": "[REDACTED]",
      "date_of_birth": "[REDACTED]",
      "gender": "female",
      "contact_phone": "[REDACTED]",
      "intake_reason_note": "[REDACTED]"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "message": "User and patient registered successfully.",
      "user": {
         "id": 24,
         "email": "[REDACTED]",
         "role": "patient",
         "patientId": 7,
         "providerId": null,
         "displayName": "[REDACTED]"
      },
      "patient": {
         "id": 7
      }
   }
   ```

## 003 — Register duplicate patient

- Timestamp: 2026-10-12T03:16:20.487Z
- Role: public
- Duration: 5 ms
- Request: `POST http://localhost:3000/auth/register`
- Request body:
   ```json
   {
      "email": "[REDACTED]",
      "password": "[REDACTED]",
      "first_name": "[REDACTED]",
      "last_name": "[REDACTED]"
   }
   ```
- Response status: 400
- Response body:
   ```json
   {
      "message": "Missing required fields."
   }
   ```

## 004 — Login staff

- Timestamp: 2026-10-12T03:16:20.771Z
- Role: public
- Duration: 204 ms
- Request: `POST http://localhost:3000/auth/login`
- Request body:
   ```json
   {
      "email": "[REDACTED]",
      "password": "[REDACTED]"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "user": {
         "id": 22,
         "email": "[REDACTED]",
         "role": "staff",
         "patientId": null,
         "providerId": null,
         "displayName": "[REDACTED]"
      }
   }
   ```

## 005 — Login staff admin

- Timestamp: 2026-10-12T03:16:21.074Z
- Role: public
- Duration: 216 ms
- Request: `POST http://localhost:3000/auth/login`
- Request body:
   ```json
   {
      "email": "[REDACTED]",
      "password": "[REDACTED]"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "user": {
         "id": 23,
         "email": "[REDACTED]",
         "role": "staff_admin",
         "patientId": null,
         "providerId": null,
         "displayName": "[REDACTED]"
      }
   }
   ```

## 006 — Admin creates or updates prior-auth rule

- Timestamp: 2026-10-12T03:16:21.487Z
- Role: admin
- Duration: 322 ms
- Request: `PUT http://localhost:3000/prior-auth/rules`
- Request body:
   ```json
   {
      "visit_type_id": "3",
      "insurance_plan_id": null,
      "requires_prior_auth": true
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "rule": {
         "id": 20,
         "visitTypeId": 3,
         "insurancePlanId": null,
         "requiresPriorAuth": true
      }
   }
   ```

## 007 — Login patient

- Timestamp: 2026-10-12T03:16:21.764Z
- Role: public
- Duration: 195 ms
- Request: `POST http://localhost:3000/auth/login`
- Request body:
   ```json
   {
      "email": "[REDACTED]",
      "password": "[REDACTED]"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "user": {
         "id": 24,
         "email": "[REDACTED]",
         "role": "patient",
         "patientId": 7,
         "providerId": null,
         "displayName": "[REDACTED]"
      }
   }
   ```

## 008 — Login invalid credentials

- Timestamp: 2026-10-12T03:16:22.057Z
- Role: public
- Duration: 195 ms
- Request: `POST http://localhost:3000/auth/login`
- Request body:
   ```json
   {
      "email": "[REDACTED]",
      "password": "[REDACTED]"
   }
   ```
- Response status: 401
- Response body:
   ```json
   {
      "message": "Invalid credentials."
   }
   ```

## 009 — Current patient session

- Timestamp: 2026-10-12T03:16:22.224Z
- Role: patient
- Duration: 83 ms
- Request: `GET http://localhost:3000/auth/me`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "user": {
         "id": 24,
         "email": "[REDACTED]",
         "role": "patient",
         "patientId": 7,
         "providerId": null,
         "displayName": "[REDACTED]"
      }
   }
   ```

## 010 — Logout patient

- Timestamp: 2026-10-12T03:16:22.317Z
- Role: patient
- Duration: 4 ms
- Request: `POST http://localhost:3000/auth/logout`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "message": "Logged out successfully."
   }
   ```

## 011 — Accept staff invitation

- Timestamp: 2026-10-12T03:16:22.407Z
- Role: public
- Duration: 4 ms
- Request: `POST http://localhost:3000/auth/accept-invite`
- Request body:
   ```json
   {
      "token": "[REDACTED]",
      "password": "[REDACTED]"
   }
   ```
- Response status: 400
- Response body:
   ```json
   {
      "message": "A valid token and password are required."
   }
   ```

## 012 — Register provider as admin

- Timestamp: 2026-10-12T03:16:23.025Z
- Role: admin
- Duration: 527 ms
- Request: `POST http://localhost:3000/auth/register/provider`
- Request body:
   ```json
   {
      "email": "[REDACTED]",
      "password": "[REDACTED]",
      "first_name": "[REDACTED]",
      "last_name": "[REDACTED]",
      "specialty": "Internal Medicine"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "message": "User and provider registered successfully.",
      "user": {
         "id": 25,
         "email": "[REDACTED]",
         "role": "staff",
         "patientId": null,
         "providerId": 13,
         "displayName": "[REDACTED]"
      },
      "provider": {
         "id": 13
      }
   }
   ```

## 013 — Add patient coverage

- Timestamp: 2026-10-12T03:16:23.508Z
- Role: patient
- Duration: 410 ms
- Request: `POST http://localhost:3000/insurance/mine`
- Request body:
   ```json
   {
      "insurer_name": "Synthetic Plan",
      "plan_name": "Demo Active",
      "policy_number": "[REDACTED]",
      "member_id": "[REDACTED]",
      "coverage_start": "2030-01-01",
      "coverage_end": "2030-12-31"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "coverage": {
         "id": 8,
         "status": "unverified"
      }
   }
   ```

## 014 — List my coverage

- Timestamp: 2026-10-12T03:16:23.740Z
- Role: patient
- Duration: 160 ms
- Request: `GET http://localhost:3000/insurance/mine`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "coverages": [
         {
            "id": 8,
            "insurerName": "Synthetic Plan",
            "planName": "Demo Active",
            "policyNumber": "[REDACTED]",
            "memberId": "[REDACTED]",
            "coverageStart": "2030-01-01",
            "coverageEnd": "2030-12-31",
            "status": "unverified",
            "verifiedAt": null,
            "createdAt": "2026-10-12T03:16:21.840Z"
         }
      ]
   }
   ```

## 015 — Staff reads patient coverage

- Timestamp: 2026-10-12T03:16:23.832Z
- Role: staff
- Duration: 5 ms
- Request: `GET http://localhost:3000/insurance/patients/`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot GET /insurance/patients/</pre>\n</body>\n</html>\n"
   ```

## 016 — Staff simulates inactive coverage

- Timestamp: 2026-10-12T03:16:24.266Z
- Role: staff
- Duration: 346 ms
- Request: `PATCH http://localhost:3000/insurance/coverage/8/verify`
- Request body:
   ```json
   {
      "status": "inactive"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "coverage": {
         "id": 8,
         "status": "inactive",
         "verifiedAt": "2026-10-12T03:16:24.027Z"
      }
   }
   ```

## 017 — Invalid coverage status

- Timestamp: 2026-10-12T03:16:24.434Z
- Role: staff
- Duration: 79 ms
- Request: `PATCH http://localhost:3000/insurance/coverage/8/verify`
- Request body:
   ```json
   {
      "status": "pending"
   }
   ```
- Response status: 400
- Response body:
   ```json
   {
      "error": "Status must be active or inactive"
   }
   ```

## 018 — Staff simulates active coverage

- Timestamp: 2026-10-12T03:16:24.840Z
- Role: staff
- Duration: 318 ms
- Request: `PATCH http://localhost:3000/insurance/coverage/8/verify`
- Request body:
   ```json
   {
      "status": "active"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "coverage": {
         "id": 8,
         "status": "active",
         "verifiedAt": "2026-10-12T03:16:24.630Z"
      }
   }
   ```

## 019 — List visit types

- Timestamp: 2026-10-12T03:16:25.041Z
- Role: patient
- Duration: 124 ms
- Request: `GET http://localhost:3000/appointment/visit-type`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "visitTypes": [
         {
            "id": 1,
            "name": "Annual Physical",
            "description": null,
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": null
         },
         {
            "id": 2,
            "name": "Follow-up",
            "description": null,
            "durationMinutes": 15,
            "requiredSpecialty": null,
            "requiredEquipmentId": null
         },
         {
            "id": 3,
            "name": "MRI - Knee",
            "description": null,
            "durationMinutes": 45,
            "requiredSpecialty": "Orthopedics",
            "requiredEquipmentId": 1
         },
         {
            "id": 4,
            "name": "New Patient Intake",
            "description": null,
            "durationMinutes": 45,
            "requiredSpecialty": null,
            "requiredEquipmentId": null
         },
         {
            "id": 5,
            "name": "Cardiology Consult",
            "description": null,
            "durationMinutes": 30,
            "requiredSpecialty": "Cardiology",
            "requiredEquipmentId": null
         },
         {
            "id": 6,
            "name": "X-Ray - Chest",
            "description": null,
            "durationMinutes": 20,
            "requiredSpecialty": null,
            "requiredEquipmentId": 2
         },
         {
            "id": 7,
            "name": "Primary Care Consultation",
            "description": "Routine assessment and management of common outpatient conditions",
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": null
         },
         {
            "id": 8,
            "name": "ECG - Resting",
            "description": "Resting 12-lead electrocardiogram",
            "durationMinutes": 20,
            "requiredSpecialty": "Cardiology",
            "requiredEquipmentId": 4
         },
         {
            "id": 9,
            "name": "Spirometry",
            "description": "Office lung-function testing",
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": 5
         },
         {
            "id": 10,
            "name": "Ultrasound - Abdomen",
            "description": "Diagnostic abdominal ultrasonography",
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": 3
         },
         {
            "id": 11,
            "name": "DEXA Scan",
            "description": "Bone mineral density assessment",
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": 6
         },
         {
            "id": 12,
            "name": "Laboratory Diagnostics",
            "description": "Outpatient laboratory collection and review",
            "durationMinutes": 20,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": null
         },
         {
            "id": 13,
            "name": "Prenatal Consultation",
            "description": "Prenatal care and pregnancy risk review",
            "durationMinutes": 30,
            "requiredSpecialty": "Obstetrics and Gynecology",
            "requiredEquipmentId": null
         },
         {
            "id": 14,
            "name": "Pediatric Consultation",
            "description": "Pediatric primary-care assessment",
            "durationMinutes": 30,
            "requiredSpecialty": "Pediatrics",
            "requiredEquipmentId": null
         }
      ]
   }
   ```

## 020 — Get visit type

- Timestamp: 2026-10-12T03:16:25.285Z
- Role: patient
- Duration: 159 ms
- Request: `GET http://localhost:3000/appointment/visit-type/1`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "visitType": {
         "id": 1,
         "name": "Annual Physical",
         "description": null,
         "durationMinutes": 30,
         "requiredSpecialty": "Internal Medicine",
         "requiredEquipmentId": null
      }
   }
   ```

## 021 — Invalid visit type ID

- Timestamp: 2026-10-12T03:16:25.722Z
- Role: patient
- Duration: 357 ms
- Request: `GET http://localhost:3000/appointment/visit-type/not-an-id`
- Request body:
   ```json
   null
   ```
- Response status: 400
- Response body:
   ```json
   {
      "message": "Visit type ID must be a positive integer."
   }
   ```

## 022 — Search available slots

- Timestamp: 2026-10-12T03:16:26.242Z
- Role: patient
- Duration: 398 ms
- Request: `GET http://localhost:3000/appointment/available-slots?visit_type_id=1&range_start=2030-01-03&range_end=2030-01-04`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "visit_type": "Annual Physical",
      "slots": [
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T00:00:00.000Z",
            "end": "2030-01-03T00:30:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T00:45:00.000Z",
            "end": "2030-01-03T01:15:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T01:30:00.000Z",
            "end": "2030-01-03T02:00:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T02:15:00.000Z",
            "end": "2030-01-03T02:45:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T03:00:00.000Z",
            "end": "2030-01-03T03:30:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T03:45:00.000Z",
            "end": "2030-01-03T04:15:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T04:30:00.000Z",
            "end": "2030-01-03T05:00:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T05:15:00.000Z",
            "end": "2030-01-03T05:45:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T06:00:00.000Z",
            "end": "2030-01-03T06:30:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T06:45:00.000Z",
            "end": "2030-01-03T07:15:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-03T07:30:00.000Z",
            "end": "2030-01-03T08:00:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T00:00:00.000Z",
            "end": "2030-01-04T00:30:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T00:45:00.000Z",
            "end": "2030-01-04T01:15:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T01:30:00.000Z",
            "end": "2030-01-04T02:00:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T02:15:00.000Z",
            "end": "2030-01-04T02:45:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T03:00:00.000Z",
            "end": "2030-01-04T03:30:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T03:45:00.000Z",
            "end": "2030-01-04T04:15:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T04:30:00.000Z",
            "end": "2030-01-04T05:00:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T05:15:00.000Z",
            "end": "2030-01-04T05:45:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T06:00:00.000Z",
            "end": "2030-01-04T06:30:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T06:45:00.000Z",
            "end": "2030-01-04T07:15:00.000Z"
         },
         {
            "provider_id": 1,
            "provider_name": "Amanda Torres",
            "start": "2030-01-04T07:30:00.000Z",
            "end": "2030-01-04T08:00:00.000Z"
         }
      ]
   }
   ```

## 023 — Book appointment requiring prior auth

- Timestamp: 2026-10-12T03:16:27.611Z
- Role: patient
- Duration: 1280 ms
- Request: `POST http://localhost:3000/appointment`
- Request body:
   ```json
   {
      "visit_type_id": "3",
      "provider_id": "4",
      "start": "2030-01-03T02:00:00.000Z",
      "end": "2030-01-03T02:45:00.000Z"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "id": 7,
      "patientId": 7,
      "providerId": 4,
      "roomId": 4,
      "equipmentId": 1,
      "visitTypeId": 3,
      "scheduledStart": "2030-01-03T02:00:00.000Z",
      "scheduledEnd": "2030-01-03T02:45:00.000Z",
      "status": "scheduled",
      "insuranceStatus": "active",
      "createdAt": "2026-10-12T03:16:25.071Z",
      "updatedAt": "2026-10-12T03:16:25.071Z",
      "priorAuthorizationStatus": "[REDACTED]"
   }
   ```

## 024 — Book invalid duration

- Timestamp: 2026-10-12T03:16:27.986Z
- Role: patient
- Duration: 294 ms
- Request: `POST http://localhost:3000/appointment`
- Request body:
   ```json
   {
      "visit_type_id": "1",
      "provider_id": "4",
      "start": "2030-01-03T02:00:00.000Z",
      "end": "2030-01-03T03:00:00.000Z"
   }
   ```
- Response status: 400
- Response body:
   ```json
   {
      "error": "Appointment duration does not match visit type"
   }
   ```

## 025 — List patient appointments

- Timestamp: 2026-10-12T03:16:28.244Z
- Role: patient
- Duration: 157 ms
- Request: `GET http://localhost:3000/appointment/mine`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   [
      {
         "id": 7,
         "patientId": 7,
         "providerId": 4,
         "roomId": 4,
         "equipmentId": 1,
         "visitTypeId": 3,
         "scheduledStart": "2030-01-03T02:00:00.000Z",
         "scheduledEnd": "2030-01-03T02:45:00.000Z",
         "status": "scheduled",
         "insuranceStatus": "active",
         "priorAuthorizationStatus": "[REDACTED]",
         "providerFirst": "Marcus",
         "providerLast": "Webb",
         "visitTypeName": "MRI - Knee"
      }
   ]
   ```

## 026 — Cancel own appointment

- Timestamp: 2026-10-12T03:16:29.410Z
- Role: patient
- Duration: 1076 ms
- Request: `DELETE http://localhost:3000/appointment/7`
- Request body:
   ```json
   null
   ```
- Response status: 204
- Response body:
   ```json
   ""
   ```

## 027 — Patient prior-auth statuses

- Timestamp: 2026-10-12T03:16:29.668Z
- Role: patient
- Duration: 171 ms
- Request: `GET http://localhost:3000/prior-auth/mine`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "priorAuthorizations": "[REDACTED]"
   }
   ```

## 028 — Staff lists prior-auth rules

- Timestamp: 2026-10-12T03:16:29.871Z
- Role: staff
- Duration: 121 ms
- Request: `GET http://localhost:3000/prior-auth/rules`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "rules": [
         {
            "id": 5,
            "visitTypeId": 1,
            "visitType": "Annual Physical",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 4,
            "visitTypeId": 5,
            "visitType": "Cardiology Consult",
            "insurancePlanId": 1,
            "insurerName": "PhilHealth",
            "planName": "Standard",
            "requiresPriorAuth": true
         },
         {
            "id": 12,
            "visitTypeId": 11,
            "visitType": "DEXA Scan",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 9,
            "visitTypeId": 8,
            "visitType": "ECG - Resting",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 6,
            "visitTypeId": 2,
            "visitType": "Follow-up",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 13,
            "visitTypeId": 12,
            "visitType": "Laboratory Diagnostics",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 3,
            "visitTypeId": 3,
            "visitType": "MRI - Knee",
            "insurancePlanId": 3,
            "insurerName": "Intellicare",
            "planName": "Basic",
            "requiresPriorAuth": true
         },
         {
            "id": 2,
            "visitTypeId": 3,
            "visitType": "MRI - Knee",
            "insurancePlanId": 2,
            "insurerName": "Maxicare",
            "planName": "Premium HMO",
            "requiresPriorAuth": false
         },
         {
            "id": 1,
            "visitTypeId": 3,
            "visitType": "MRI - Knee",
            "insurancePlanId": 1,
            "insurerName": "PhilHealth",
            "planName": "Standard",
            "requiresPriorAuth": true
         },
         {
            "id": 20,
            "visitTypeId": 3,
            "visitType": "MRI - Knee",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": true
         },
         {
            "id": 15,
            "visitTypeId": 14,
            "visitType": "Pediatric Consultation",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 14,
            "visitTypeId": 13,
            "visitType": "Prenatal Consultation",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 8,
            "visitTypeId": 7,
            "visitType": "Primary Care Consultation",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 10,
            "visitTypeId": 9,
            "visitType": "Spirometry",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 11,
            "visitTypeId": 10,
            "visitType": "Ultrasound - Abdomen",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         },
         {
            "id": 7,
            "visitTypeId": 6,
            "visitType": "X-Ray - Chest",
            "insurancePlanId": null,
            "insurerName": null,
            "planName": null,
            "requiresPriorAuth": false
         }
      ]
   }
   ```

## 029 — Staff reads appointment prior auth

- Timestamp: 2026-10-12T03:16:30.114Z
- Role: staff
- Duration: 164 ms
- Request: `GET http://localhost:3000/prior-auth/appointments/7`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "priorAuthorization": "[REDACTED]"
   }
   ```

## 030 — Staff reads prior-auth detail

- Timestamp: 2026-10-12T03:16:30.533Z
- Role: staff
- Duration: 338 ms
- Request: `GET http://localhost:3000/staff/prior-auth/7`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "priorAuthorization": "[REDACTED]",
      "conditions": [],
      "coverage": {
         "policyNumber": "[REDACTED]",
         "memberId": "[REDACTED]",
         "status": "active",
         "coverageStart": "2030-01-01",
         "coverageEnd": "2030-12-31",
         "insurerName": "Synthetic Plan",
         "planName": "Demo Active"
      }
   }
   ```

## 031 — Poll automatic prior-auth draft

- Timestamp: 2026-10-12T03:16:30.958Z
- Role: staff
- Duration: 333 ms
- Request: `GET http://localhost:3000/staff/prior-auth/7`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "priorAuthorization": "[REDACTED]",
      "conditions": [],
      "coverage": {
         "policyNumber": "[REDACTED]",
         "memberId": "[REDACTED]",
         "status": "active",
         "coverageStart": "2030-01-01",
         "coverageEnd": "2030-12-31",
         "insurerName": "Synthetic Plan",
         "planName": "Demo Active"
      }
   }
   ```

## 032 — Basic staff cannot submit prior auth

- Timestamp: 2026-10-12T03:16:31.127Z
- Role: staff
- Duration: 78 ms
- Request: `POST http://localhost:3000/staff/prior-auth/7/submit`
- Request body:
   ```json
   null
   ```
- Response status: 403
- Response body:
   ```json
   {
      "error": "Staff administrator access required"
   }
   ```

## 033 — Admin submits prior auth as denied

- Timestamp: 2026-10-12T03:16:31.686Z
- Role: admin
- Duration: 478 ms
- Request: `POST http://localhost:3000/staff/prior-auth/7/submit`
- Request body:
   ```json
   {
      "plan_decision": "denied"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "message": "Prior authorization processed by the local insurance-plan simulation: outcome is denied",
      "priorAuthorization": "[REDACTED]"
   }
   ```

## 034 — Prior-auth queue

- Timestamp: 2026-10-12T03:16:31.931Z
- Role: staff
- Duration: 165 ms
- Request: `GET http://localhost:3000/staff/prior-auth?status=needs_draft`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "priorAuthorizations": "[REDACTED]"
   }
   ```

## 035 — Appeals queue

- Timestamp: 2026-10-12T03:16:32.163Z
- Role: staff
- Duration: 151 ms
- Request: `GET http://localhost:3000/staff/appeals?status=all`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "appeals": []
   }
   ```

## 036 — Appeal detail

- Timestamp: 2026-10-12T03:16:32.375Z
- Role: staff
- Duration: 123 ms
- Request: `GET http://localhost:3000/staff/appeals/`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "appeals": []
   }
   ```

## 037 — Create appeal draft

- Timestamp: 2026-10-12T03:16:33.618Z
- Role: staff
- Duration: 1158 ms
- Request: `POST http://localhost:3000/staff/appeals`
- Request body:
   ```json
   {
      "prior_authorization_id": "[REDACTED]"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "message": "Appeal created successfully",
      "appeal": {
         "id": 1,
         "priorAuthorizationId": "[REDACTED]",
         "guidelineId": null,
         "chartJustificationText": "[REDACTED]",
         "appealLetterText": "[REDACTED]",
         "status": "drafted",
         "reviewedBy": 22,
         "submittedBy": null,
         "submittedAt": null,
         "decisionAt": null,
         "createdAt": "2026-10-12T03:16:31.862Z",
         "updatedAt": "2026-10-12T03:16:31.862Z"
      }
   }
   ```

## 038 — Update appeal draft

- Timestamp: 2026-10-12T03:16:33.926Z
- Role: staff
- Duration: 251 ms
- Request: `PATCH http://localhost:3000/staff/appeals/1`
- Request body:
   ```json
   {
      "appeal_letter_text": "[REDACTED]"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "message": "Appeal draft updated successfully",
      "appeal": {
         "id": 1,
         "priorAuthorizationId": "[REDACTED]",
         "guidelineId": null,
         "chartJustificationText": "[REDACTED]",
         "appealLetterText": "[REDACTED]",
         "status": "drafted",
         "reviewedBy": 22,
         "submittedBy": null,
         "submittedAt": null,
         "decisionAt": null,
         "createdAt": "2026-10-12T03:16:31.862Z",
         "updatedAt": "2026-10-12T03:16:33.824Z"
      }
   }
   ```

## 039 — Submit appeal

- Timestamp: 2026-10-12T03:16:34.571Z
- Role: admin
- Duration: 569 ms
- Request: `POST http://localhost:3000/staff/appeals/1/submit`
- Request body:
   ```json
   {
      "mock_outcome": "approved"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "message": "Appeal submitted to insurer: outcome is approved",
      "appeal": {
         "id": 1,
         "priorAuthorizationId": "[REDACTED]",
         "guidelineId": null,
         "chartJustificationText": "[REDACTED]",
         "appealLetterText": "[REDACTED]",
         "status": "approved",
         "reviewedBy": 22,
         "submittedBy": 23,
         "submittedAt": "2026-10-12T03:16:34.185Z",
         "decisionAt": "2026-10-12T03:16:34.144Z",
         "createdAt": "2026-10-12T03:16:31.862Z",
         "updatedAt": "2026-10-12T03:16:34.185Z"
      }
   }
   ```

## 040 — Appeal decision override

- Timestamp: 2026-10-12T03:16:35.232Z
- Role: admin
- Duration: 577 ms
- Request: `PATCH http://localhost:3000/staff/appeals/1/decision`
- Request body:
   ```json
   {
      "status": "denied"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "message": "Appeal decision recorded as denied",
      "appeal": {
         "id": 1,
         "priorAuthorizationId": "[REDACTED]",
         "guidelineId": null,
         "chartJustificationText": "[REDACTED]",
         "appealLetterText": "[REDACTED]",
         "status": "denied",
         "reviewedBy": 22,
         "submittedBy": 23,
         "submittedAt": "2026-10-12T03:16:34.185Z",
         "decisionAt": "2026-10-12T03:16:34.845Z",
         "createdAt": "2026-10-12T03:16:31.862Z",
         "updatedAt": "2026-10-12T03:16:34.845Z"
      }
   }
   ```

## 041 — Admin overrides prior-auth decision

- Timestamp: 2026-10-12T03:16:35.818Z
- Role: admin
- Duration: 512 ms
- Request: `PATCH http://localhost:3000/staff/prior-auth/7/decision`
- Request body:
   ```json
   {
      "status": "approved"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "message": "Prior authorization marked as approved",
      "priorAuthorization": "[REDACTED]"
   }
   ```

## 042 — Admin submits prior auth as approved

- Timestamp: 2026-10-12T03:16:36.051Z
- Role: admin
- Duration: 166 ms
- Request: `POST http://localhost:3000/staff/prior-auth/7/submit`
- Request body:
   ```json
   {
      "plan_decision": "approved"
   }
   ```
- Response status: 409
- Response body:
   ```json
   {
      "error": "Cannot submit prior authorization from status approved. Must be drafted first."
   }
   ```

## 043 — Invalid prior-auth transition

- Timestamp: 2026-10-12T03:16:36.250Z
- Role: staff
- Duration: 165 ms
- Request: `PATCH http://localhost:3000/prior-auth/7/status`
- Request body:
   ```json
   {
      "status": "approved"
   }
   ```
- Response status: 409
- Response body:
   ```json
   {
      "error": "Cannot change status from approved to approved"
   }
   ```

## 044 — Join waitlist

- Timestamp: 2026-10-12T03:16:36.590Z
- Role: patient
- Duration: 247 ms
- Request: `POST http://localhost:3000/waitlist`
- Request body:
   ```json
   {
      "visit_type_id": "1",
      "preferred_date_start": "2030-01-03",
      "preferred_date_end": "2030-01-04"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "waitlistEntry": {
         "id": 7,
         "patientId": 7,
         "providerId": null,
         "visitTypeId": 1,
         "preferredDateStart": "2030-01-03",
         "preferredDateEnd": "2030-01-04",
         "preferredTimeStart": null,
         "preferredTimeEnd": null,
         "status": "waiting",
         "offeredAppointmentId": null,
         "offerExpiresAt": null,
         "createdAt": "2026-10-12T03:16:35.164Z"
      }
   }
   ```

## 045 — List my waitlist

- Timestamp: 2026-10-12T03:16:36.829Z
- Role: patient
- Duration: 174 ms
- Request: `GET http://localhost:3000/waitlist/mine`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "waitlistEntries": [
         {
            "id": 7,
            "providerId": null,
            "providerFirstName": "[REDACTED]",
            "providerLastName": "[REDACTED]",
            "visitTypeId": 1,
            "visitTypeName": "Annual Physical",
            "preferredDateStart": "2030-01-03",
            "preferredDateEnd": "2030-01-04",
            "preferredTimeStart": null,
            "preferredTimeEnd": null,
            "status": "waiting",
            "offeredAppointmentId": null,
            "offerExpiresAt": null,
            "createdAt": "2026-10-12T03:16:35.164Z",
            "scheduledStart": null,
            "scheduledEnd": null
         }
      ]
   }
   ```

## 046 — Cancel waitlist entry

- Timestamp: 2026-10-12T03:16:36.920Z
- Role: patient
- Duration: 3 ms
- Request: `DELETE http://localhost:3000/waitlist/`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot DELETE /waitlist/</pre>\n</body>\n</html>\n"
   ```

## 047 — Confirm waitlist offer

- Timestamp: 2026-10-12T03:16:37.006Z
- Role: patient
- Duration: 3 ms
- Request: `POST http://localhost:3000/waitlist//confirm`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /waitlist//confirm</pre>\n</body>\n</html>\n"
   ```

## 048 — Decline waitlist offer

- Timestamp: 2026-10-12T03:16:37.099Z
- Role: patient
- Duration: 3 ms
- Request: `POST http://localhost:3000/waitlist//decline`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /waitlist//decline</pre>\n</body>\n</html>\n"
   ```

## 049 — OCR JSON fallback or Gemini

- Timestamp: 2026-10-12T03:16:37.271Z
- Role: patient
- Duration: 90 ms
- Request: `POST http://localhost:3000/bills/ocr`
- Request body:
   ```json
   {
      "document_base64": "[REDACTED]",
      "mime_type": "application/pdf"
   }
   ```
- Response status: 400
- Response body:
   ```json
   {
      "error": "document_base64 and mime_type are required"
   }
   ```

## 050 — Upload bill PDF

- Timestamp: 2026-10-12T03:16:37.455Z
- Role: patient
- Duration: 94 ms
- Request: `POST http://localhost:3000/bills/upload`
- Request body:
   ```json
   "[multipart/form-data]"
   ```
- Response status: 400
- Response body:
   ```json
   {
      "error": "A bill file is required"
   }
   ```

## 051 — Create reviewed bill

- Timestamp: 2026-10-12T03:16:37.624Z
- Role: patient
- Duration: 87 ms
- Request: `POST http://localhost:3000/bills`
- Request body:
   ```json
   {
      "appointment_id": "7",
      "uploaded_file_url": "",
      "line_items": [
         {
            "procedure_code": "93000",
            "description": "Resting ECG",
            "amount": 500
         }
      ]
   }
   ```
- Response status: 400
- Response body:
   ```json
   {
      "error": "uploaded_file_url and line_items are required"
   }
   ```

## 052 — List my bills

- Timestamp: 2026-10-12T03:16:37.878Z
- Role: patient
- Duration: 173 ms
- Request: `GET http://localhost:3000/bills/mine`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   []
   ```

## 053 — Get my bill

- Timestamp: 2026-10-12T03:16:38.057Z
- Role: patient
- Duration: 90 ms
- Request: `GET http://localhost:3000/bills/`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot GET /bills/</pre>\n</body>\n</html>\n"
   ```

## 054 — Explain my bill

- Timestamp: 2026-10-12T03:16:38.208Z
- Role: patient
- Duration: 78 ms
- Request: `GET http://localhost:3000/bills//explanation`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot GET /bills//explanation</pre>\n</body>\n</html>\n"
   ```

## 055 — Edit dispute letter

- Timestamp: 2026-10-12T03:16:38.382Z
- Role: patient
- Duration: 84 ms
- Request: `PATCH http://localhost:3000/bills//dispute-letter`
- Request body:
   ```json
   {
      "letter_text": "Synthetic review request."
   }
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot PATCH /bills//dispute-letter</pre>\n</body>\n</html>\n"
   ```

## 056 — Mark dispute downloaded

- Timestamp: 2026-10-12T03:16:38.556Z
- Role: patient
- Duration: 94 ms
- Request: `POST http://localhost:3000/bills//dispute-letter/downloaded`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot POST /bills//dispute-letter/downloaded</pre>\n</body>\n</html>\n"
   ```

## 057 — List my notifications

- Timestamp: 2026-10-12T03:16:38.791Z
- Role: patient
- Duration: 162 ms
- Request: `GET http://localhost:3000/notifications/mine`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "notifications": [
         {
            "id": 16,
            "userId": 24,
            "type": "appointment_created",
            "message": "Your appointment was booked successfully.",
            "isRead": false,
            "createdAt": "2026-10-12T03:16:25.071Z",
            "emailStatus": "[REDACTED]",
            "emailAttempts": "[REDACTED]",
            "emailNextAttemptAt": "[REDACTED]",
            "emailSentAt": "[REDACTED]",
            "emailLastError": "[REDACTED]"
         },
         {
            "id": 17,
            "userId": 24,
            "type": "appointment_cancelled",
            "message": "Your appointment was cancelled.",
            "isRead": false,
            "createdAt": "2026-10-12T03:16:27.331Z",
            "emailStatus": "[REDACTED]",
            "emailAttempts": "[REDACTED]",
            "emailNextAttemptAt": "[REDACTED]",
            "emailSentAt": "[REDACTED]",
            "emailLastError": "[REDACTED]"
         },
         {
            "id": 18,
            "userId": 24,
            "type": "prior_authorization_draft_ready",
            "message": "A prior-authorization draft is ready for staff review.",
            "isRead": false,
            "createdAt": "2026-10-12T03:16:27.679Z",
            "emailStatus": "[REDACTED]",
            "emailAttempts": "[REDACTED]",
            "emailNextAttemptAt": "[REDACTED]",
            "emailSentAt": "[REDACTED]",
            "emailLastError": "[REDACTED]"
         },
         {
            "id": 19,
            "userId": 24,
            "type": "prior_authorization_decision",
            "message": "Your prior authorization was processed as denied.",
            "isRead": false,
            "createdAt": "2026-10-12T03:16:30.039Z",
            "emailStatus": "[REDACTED]",
            "emailAttempts": "[REDACTED]",
            "emailNextAttemptAt": "[REDACTED]",
            "emailSentAt": "[REDACTED]",
            "emailLastError": "[REDACTED]"
         },
         {
            "id": 20,
            "userId": 24,
            "type": "appeal_draft_available",
            "message": "A prior-authorization appeal draft is available for review.",
            "isRead": false,
            "createdAt": "2026-10-12T03:16:31.862Z",
            "emailStatus": "[REDACTED]",
            "emailAttempts": "[REDACTED]",
            "emailNextAttemptAt": "[REDACTED]",
            "emailSentAt": "[REDACTED]",
            "emailLastError": "[REDACTED]"
         },
         {
            "id": 21,
            "userId": 24,
            "type": "appeal_decision",
            "message": "Your local plan appeal was processed as approved.",
            "isRead": false,
            "createdAt": "2026-10-12T03:16:32.820Z",
            "emailStatus": "[REDACTED]",
            "emailAttempts": "[REDACTED]",
            "emailNextAttemptAt": "[REDACTED]",
            "emailSentAt": "[REDACTED]",
            "emailLastError": "[REDACTED]"
         },
         {
            "id": 22,
            "userId": 24,
            "type": "appeal_decision",
            "message": "Your local plan appeal was marked as denied.",
            "isRead": false,
            "createdAt": "2026-10-12T03:16:33.480Z",
            "emailStatus": "[REDACTED]",
            "emailAttempts": "[REDACTED]",
            "emailNextAttemptAt": "[REDACTED]",
            "emailSentAt": "[REDACTED]",
            "emailLastError": "[REDACTED]"
         },
         {
            "id": 23,
            "userId": 24,
            "type": "prior_authorization_decision",
            "message": "Your prior authorization was marked as approved.",
            "isRead": false,
            "createdAt": "2026-10-12T03:16:34.124Z",
            "emailStatus": "[REDACTED]",
            "emailAttempts": "[REDACTED]",
            "emailNextAttemptAt": "[REDACTED]",
            "emailSentAt": "[REDACTED]",
            "emailLastError": "[REDACTED]"
         }
      ]
   }
   ```

## 058 — Mark notification read

- Timestamp: 2026-10-12T03:16:38.981Z
- Role: patient
- Duration: 94 ms
- Request: `PATCH http://localhost:3000/notifications//read`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot PATCH /notifications//read</pre>\n</body>\n</html>\n"
   ```

## 059 — Process pending emails

- Timestamp: 2026-10-12T03:16:39.140Z
- Role: admin
- Duration: 81 ms
- Request: `POST http://localhost:3000/notifications/process-email`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "sent": 0,
      "skipped": true
   }
   ```

## 060 — SMTP delivery status

- Timestamp: 2026-10-12T03:16:39.363Z
- Role: admin
- Duration: 127 ms
- Request: `GET http://localhost:3000/notifications/email/status`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "smtpConfigured": false,
      "counts": {
         "pending": 8,
         "sent": 0,
         "failed": 0
      }
   }
   ```

## 061 — Staff dashboard

- Timestamp: 2026-10-12T03:16:39.931Z
- Role: staff
- Duration: 495 ms
- Request: `GET http://localhost:3000/staff/dashboard`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "snapshot": {
         "todayAppointmentsCount": 0,
         "pendingPriorAuthsCount": 0,
         "pendingAppealsCount": 0,
         "openWaitlistSlotsCount": 1
      },
      "todayAppointments": []
   }
   ```

## 062 — Search doctors

- Timestamp: 2026-10-12T03:16:40.222Z
- Role: staff
- Duration: 203 ms
- Request: `GET http://localhost:3000/staff/doctors?search=`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "doctors": [
         {
            "id": 7,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Obstetrics and Gynecology",
            "npiNumber": null,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "availability": [
               {
                  "dayOfWeek": 1,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 2,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 3,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 4,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 5,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               }
            ]
         },
         {
            "id": 3,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Family Medicine",
            "npiNumber": null,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "availability": [
               {
                  "dayOfWeek": 1,
                  "startTime": "08:00:00",
                  "endTime": "14:00:00"
               },
               {
                  "dayOfWeek": 2,
                  "startTime": "08:00:00",
                  "endTime": "14:00:00"
               },
               {
                  "dayOfWeek": 3,
                  "startTime": "08:00:00",
                  "endTime": "14:00:00"
               },
               {
                  "dayOfWeek": 4,
                  "startTime": "08:00:00",
                  "endTime": "14:00:00"
               },
               {
                  "dayOfWeek": 5,
                  "startTime": "08:00:00",
                  "endTime": "14:00:00"
               },
               {
                  "dayOfWeek": 6,
                  "startTime": "08:00:00",
                  "endTime": "14:00:00"
               }
            ]
         },
         {
            "id": 5,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Dermatology",
            "npiNumber": null,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "availability": [
               {
                  "dayOfWeek": 1,
                  "startTime": "09:00:00",
                  "endTime": "15:00:00"
               },
               {
                  "dayOfWeek": 2,
                  "startTime": "09:00:00",
                  "endTime": "15:00:00"
               },
               {
                  "dayOfWeek": 3,
                  "startTime": "09:00:00",
                  "endTime": "15:00:00"
               },
               {
                  "dayOfWeek": 4,
                  "startTime": "09:00:00",
                  "endTime": "15:00:00"
               },
               {
                  "dayOfWeek": 5,
                  "startTime": "09:00:00",
                  "endTime": "15:00:00"
               }
            ]
         },
         {
            "id": 2,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Cardiology",
            "npiNumber": null,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "availability": [
               {
                  "dayOfWeek": 1,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 3,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 5,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               }
            ]
         },
         {
            "id": 13,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Internal Medicine",
            "npiNumber": null,
            "createdAt": "2026-10-12T03:16:21.433Z",
            "availability": []
         },
         {
            "id": 1,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Internal Medicine",
            "npiNumber": null,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "availability": [
               {
                  "dayOfWeek": 1,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               },
               {
                  "dayOfWeek": 2,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               },
               {
                  "dayOfWeek": 3,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               },
               {
                  "dayOfWeek": 4,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               },
               {
                  "dayOfWeek": 5,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               }
            ]
         },
         {
            "id": 6,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Pediatrics",
            "npiNumber": null,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "availability": [
               {
                  "dayOfWeek": 1,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               },
               {
                  "dayOfWeek": 2,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               },
               {
                  "dayOfWeek": 3,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               },
               {
                  "dayOfWeek": 4,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               },
               {
                  "dayOfWeek": 5,
                  "startTime": "08:00:00",
                  "endTime": "16:00:00"
               }
            ]
         },
         {
            "id": 4,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Orthopedics",
            "npiNumber": null,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "availability": [
               {
                  "dayOfWeek": 1,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 1,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 1,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 1,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 1,
                  "startTime": "09:00:00",
                  "endTime": "17:00:00"
               },
               {
                  "dayOfWeek": 2,
                  "startTime": "10:00:00",
                  "endTime": "18:00:00"
               },
               {
                  "dayOfWeek": 4,
                  "startTime": "10:00:00",
                  "endTime": "18:00:00"
               }
            ]
         }
      ]
   }
   ```

## 063 — Doctor schedule

- Timestamp: 2026-10-12T03:16:40.483Z
- Role: staff
- Duration: 168 ms
- Request: `GET http://localhost:3000/staff/doctors/4/schedule?date=2030-01-03`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "providerId": 4,
      "schedule": []
   }
   ```

## 064 — Search patients

- Timestamp: 2026-10-12T03:16:40.729Z
- Role: staff
- Duration: 161 ms
- Request: `GET http://localhost:3000/staff/patients?search=`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "patients": [
         {
            "id": 7,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "dateOfBirth": "[REDACTED]",
            "gender": "female",
            "contactEmail": "[REDACTED]",
            "contactPhone": "[REDACTED]",
            "isNewPatient": true,
            "intakeReasonNote": "[REDACTED]",
            "createdAt": "2026-10-12T03:16:18.788Z"
         }
      ]
   }
   ```

## 065 — Patient detail

- Timestamp: 2026-10-12T03:16:40.995Z
- Role: staff
- Duration: 171 ms
- Request: `GET http://localhost:3000/staff/patients/`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "patients": [
         {
            "id": 7,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "dateOfBirth": "[REDACTED]",
            "gender": "female",
            "contactEmail": "[REDACTED]",
            "contactPhone": "[REDACTED]",
            "isNewPatient": true,
            "intakeReasonNote": "[REDACTED]",
            "createdAt": "2026-10-12T03:16:18.788Z"
         }
      ]
   }
   ```

## 066 — Appointment pre-visit data

- Timestamp: 2026-10-12T03:16:41.721Z
- Role: staff
- Duration: 645 ms
- Request: `GET http://localhost:3000/staff/appointments/7/pre-visit-data`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "appointment": {
         "id": 7,
         "scheduledStart": "2030-01-03T02:00:00.000Z",
         "scheduledEnd": "2030-01-03T02:45:00.000Z",
         "status": "cancelled",
         "insuranceStatus": "active",
         "patientId": 7,
         "patientFirstName": "[REDACTED]",
         "patientLastName": "[REDACTED]",
         "patientDob": "[REDACTED]",
         "isNewPatient": true,
         "intakeReasonNote": "[REDACTED]",
         "providerId": 4,
         "providerFirstName": "[REDACTED]",
         "providerLastName": "[REDACTED]",
         "providerSpecialty": "Orthopedics",
         "visitTypeId": 3,
         "visitTypeName": "MRI - Knee",
         "visitTypeDescription": null,
         "roomId": 4,
         "roomName": "Imaging Suite A",
         "equipmentId": 1,
         "equipmentName": "MRI Machine"
      },
      "isFallbackNotice": true,
      "aiSource": "fallback",
      "fallbackSummary": "New patient — no prior chart history available. Reason for visit: MRI - Knee.",
      "preVisitSummary": "New patient — no prior chart history available. Reason for visit: MRI - Knee.",
      "clinicalData": "[REDACTED]"
   }
   ```

## 067 — Appointment procedures

- Timestamp: 2026-10-12T03:16:41.984Z
- Role: staff
- Duration: 167 ms
- Request: `GET http://localhost:3000/staff/appointments/7/procedures`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "procedures": []
   }
   ```

## 068 — Record performed procedure

- Timestamp: 2026-10-12T03:16:42.308Z
- Role: staff
- Duration: 250 ms
- Request: `POST http://localhost:3000/staff/appointments/7/procedures`
- Request body:
   ```json
   {
      "procedure_code": "93000",
      "description": "Synthetic ECG"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "id": 5,
      "appointmentId": 7,
      "procedureCode": "93000",
      "description": "Synthetic ECG",
      "performedAt": "2026-10-12T03:16:40.883Z"
   }
   ```

## 069 — Staff disputes

- Timestamp: 2026-10-12T03:16:42.531Z
- Role: staff
- Duration: 160 ms
- Request: `GET http://localhost:3000/staff/disputes`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "disputes": []
   }
   ```

## 070 — Staff fee schedule

- Timestamp: 2026-10-12T03:16:42.739Z
- Role: staff
- Duration: 125 ms
- Request: `GET http://localhost:3000/staff/fee-schedule`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "feeSchedule": [
         {
            "id": 16,
            "procedureCode": "59425",
            "description": "Prenatal care first package",
            "standardCost": "3500.00"
         },
         {
            "id": 17,
            "procedureCode": "59426",
            "description": "Prenatal care subsequent package",
            "standardCost": "3000.00"
         },
         {
            "id": 6,
            "procedureCode": "71046",
            "description": "Chest X-ray",
            "standardCost": "900.00"
         },
         {
            "id": 2,
            "procedureCode": "73721",
            "description": "MRI knee without contrast",
            "standardCost": "8500.00"
         },
         {
            "id": 3,
            "procedureCode": "73722",
            "description": "MRI knee with contrast",
            "standardCost": "12000.00"
         },
         {
            "id": 10,
            "procedureCode": "76700",
            "description": "Complete abdominal ultrasound",
            "standardCost": "2500.00"
         },
         {
            "id": 11,
            "procedureCode": "77080",
            "description": "DEXA bone-density study",
            "standardCost": "2500.00"
         },
         {
            "id": 4,
            "procedureCode": "80048",
            "description": "Basic metabolic panel",
            "standardCost": "650.00"
         },
         {
            "id": 5,
            "procedureCode": "80053",
            "description": "Comprehensive metabolic panel",
            "standardCost": "950.00"
         },
         {
            "id": 14,
            "procedureCode": "80061",
            "description": "Lipid panel",
            "standardCost": "800.00"
         },
         {
            "id": 12,
            "procedureCode": "81001",
            "description": "Urinalysis",
            "standardCost": "250.00"
         },
         {
            "id": 13,
            "procedureCode": "83036",
            "description": "Hemoglobin A1c",
            "standardCost": "600.00"
         },
         {
            "id": 15,
            "procedureCode": "85025",
            "description": "Complete blood count",
            "standardCost": "500.00"
         },
         {
            "id": 8,
            "procedureCode": "93000",
            "description": "Resting electrocardiogram",
            "standardCost": "800.00"
         },
         {
            "id": 9,
            "procedureCode": "94010",
            "description": "Spirometry",
            "standardCost": "1000.00"
         },
         {
            "id": 1,
            "procedureCode": "99213",
            "description": "Office visit established patient",
            "standardCost": "1200.00"
         },
         {
            "id": 7,
            "procedureCode": "99395",
            "description": "Annual physical exam",
            "standardCost": "1500.00"
         }
      ]
   }
   ```

## 071 — Slot utilization

- Timestamp: 2026-10-12T03:16:43.204Z
- Role: staff
- Duration: 370 ms
- Request: `GET http://localhost:3000/staff/slots/utilization?date=2030-01-03`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "date": "2030-01-03",
      "totalBookedAppointments": 0,
      "rooms": [
         {
            "id": 1,
            "name": "Exam Room 1",
            "roomType": "exam",
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 2,
            "name": "Exam Room 2",
            "roomType": "exam",
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 3,
            "name": "Exam Room 3",
            "roomType": "exam",
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 4,
            "name": "Imaging Suite A",
            "roomType": "imaging",
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 5,
            "name": "Cardiac Diagnostics",
            "roomType": "diagnostics",
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 6,
            "name": "Pulmonary Testing",
            "roomType": "diagnostics",
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 7,
            "name": "Bone Density Suite",
            "roomType": "imaging",
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         }
      ],
      "equipment": [
         {
            "id": 1,
            "name": "MRI Machine",
            "equipmentType": "imaging",
            "roomId": 4,
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 2,
            "name": "X-Ray Machine",
            "equipmentType": "imaging",
            "roomId": 4,
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 3,
            "name": "Ultrasound Machine",
            "equipmentType": "imaging",
            "roomId": 4,
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 4,
            "name": "ECG Machine",
            "equipmentType": "diagnostic",
            "roomId": 5,
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 5,
            "name": "Spirometer",
            "equipmentType": "diagnostic",
            "roomId": 6,
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         },
         {
            "id": 6,
            "name": "DEXA Scanner",
            "equipmentType": "imaging",
            "roomId": 7,
            "appointmentsCount": 0,
            "bookedMinutes": 0,
            "appointments": []
         }
      ],
      "providers": [
         {
            "id": 1,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Internal Medicine",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "isScheduledToWork": true,
            "availableMinutes": 480,
            "bookedMinutes": 0,
            "utilizationPct": 0,
            "appointmentsCount": 0
         },
         {
            "id": 2,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Cardiology",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "isScheduledToWork": false,
            "availableMinutes": 0,
            "bookedMinutes": 0,
            "utilizationPct": 0,
            "appointmentsCount": 0
         },
         {
            "id": 3,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Family Medicine",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "isScheduledToWork": true,
            "availableMinutes": 360,
            "bookedMinutes": 0,
            "utilizationPct": 0,
            "appointmentsCount": 0
         },
         {
            "id": 4,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Orthopedics",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "isScheduledToWork": true,
            "availableMinutes": 480,
            "bookedMinutes": 0,
            "utilizationPct": 0,
            "appointmentsCount": 0
         },
         {
            "id": 5,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Dermatology",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "isScheduledToWork": true,
            "availableMinutes": 360,
            "bookedMinutes": 0,
            "utilizationPct": 0,
            "appointmentsCount": 0
         },
         {
            "id": 6,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Pediatrics",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "isScheduledToWork": true,
            "availableMinutes": 480,
            "bookedMinutes": 0,
            "utilizationPct": 0,
            "appointmentsCount": 0
         },
         {
            "id": 7,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Obstetrics and Gynecology",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z",
            "isScheduledToWork": true,
            "availableMinutes": 480,
            "bookedMinutes": 0,
            "utilizationPct": 0,
            "appointmentsCount": 0
         },
         {
            "id": 13,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Internal Medicine",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T03:16:21.433Z",
            "isScheduledToWork": false,
            "availableMinutes": 0,
            "bookedMinutes": 0,
            "utilizationPct": 0,
            "appointmentsCount": 0
         }
      ]
   }
   ```

## 072 — Staff cancel appointment

- Timestamp: 2026-10-12T03:16:43.557Z
- Role: staff
- Duration: 284 ms
- Request: `PATCH http://localhost:3000/staff/appointments/7/cancel`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   {
      "error": "Appointment not found or cannot be cancelled"
   }
   ```

## 073 — Staff reschedule appointment

- Timestamp: 2026-10-12T03:16:43.710Z
- Role: staff
- Duration: 87 ms
- Request: `PATCH http://localhost:3000/staff/appointments/7/reschedule`
- Request body:
   ```json
   {
      "start": "2030-01-03T02:00:00.000Z",
      "end": "2030-01-03T02:45:00.000Z"
   }
   ```
- Response status: 400
- Response body:
   ```json
   {
      "error": "new_start and new_end are required"
   }
   ```

## 074 — Waitlist monitor

- Timestamp: 2026-10-12T03:16:43.951Z
- Role: staff
- Duration: 162 ms
- Request: `GET http://localhost:3000/staff/waitlist?status=waiting`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "waitlist": [
         {
            "id": 7,
            "patientId": 7,
            "patientFirstName": "[REDACTED]",
            "patientLastName": "[REDACTED]",
            "patientContactPhone": "[REDACTED]",
            "providerId": null,
            "providerFirstName": "[REDACTED]",
            "providerLastName": "[REDACTED]",
            "visitTypeId": 1,
            "visitTypeName": "Annual Physical",
            "preferredDateStart": "2030-01-03",
            "preferredDateEnd": "2030-01-04",
            "preferredTimeStart": null,
            "preferredTimeEnd": null,
            "status": "waiting",
            "offeredAppointmentId": null,
            "offerExpiresAt": null,
            "createdAt": "2026-10-12T03:16:35.164Z"
         }
      ]
   }
   ```

## 075 — List clinical guidelines

- Timestamp: 2026-10-12T03:16:44.188Z
- Role: staff
- Duration: 0 ms
- Request: `GET http://localhost:3000/staff/guidelines`
- Request body:
   ```json
   "[TRUNCATED BY POSTMAN CLI OUTPUT]"
   ```
- Response status: 200
- Note: response body was truncated by the Postman CLI display; the request still passed its status assertion.
- Response body:
   ```json
   "[TRUNCATED BY POSTMAN CLI OUTPUT]"
   ```

## 076 — Create clinical guideline

- Timestamp: 2026-10-12T03:16:44.449Z
- Role: admin
- Duration: 170 ms
- Request: `POST http://localhost:3000/staff/guidelines`
- Request body:
   ```json
   {
      "title": "Postman synthetic guideline",
      "excerpt_text": "Synthetic test excerpt."
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "guideline": {
         "id": 48,
         "title": "Postman synthetic guideline",
         "excerptText": "Synthetic test excerpt.",
         "applicableVisitTypeId": null,
         "applicableDiagnosisCode": null,
         "sourceCitation": null
      }
   }
   ```

## 077 — List unverified coverage

- Timestamp: 2026-10-12T03:16:44.697Z
- Role: staff
- Duration: 166 ms
- Request: `GET http://localhost:3000/staff/insurance/unverified`
- Request body:
   ```json
   "[TRUNCATED BY POSTMAN CLI OUTPUT]"
   ```
- Response status: 200
- Note: response body was truncated by the Postman CLI display; the request still passed its status assertion.
- Response body:
   ```json
   "[TRUNCATED BY POSTMAN CLI OUTPUT]"
   ```

## 078 — List admin users

- Timestamp: 2026-10-12T03:16:44.915Z
- Role: admin
- Duration: 125 ms
- Request: `GET http://localhost:3000/staff/admin/users`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "users": [
         {
            "id": 22,
            "email": "[REDACTED]",
            "role": "staff",
            "patientId": null,
            "providerId": null,
            "displayName": "[REDACTED]",
            "isActive": true,
            "createdAt": "2026-10-12T03:16:10.840Z"
         },
         {
            "id": 23,
            "email": "[REDACTED]",
            "role": "staff_admin",
            "patientId": null,
            "providerId": null,
            "displayName": "[REDACTED]",
            "isActive": true,
            "createdAt": "2026-10-12T03:16:10.840Z"
         },
         {
            "id": 24,
            "email": "[REDACTED]",
            "role": "patient",
            "patientId": 7,
            "providerId": null,
            "displayName": "[REDACTED]",
            "isActive": true,
            "createdAt": "2026-10-12T03:16:18.788Z"
         },
         {
            "id": 25,
            "email": "[REDACTED]",
            "role": "staff",
            "patientId": null,
            "providerId": 13,
            "displayName": "[REDACTED]",
            "isActive": true,
            "createdAt": "2026-10-12T03:16:21.433Z"
         }
      ]
   }
   ```

## 079 — Create staff invitation

- Timestamp: 2026-10-12T03:16:45.241Z
- Role: admin
- Duration: 248 ms
- Request: `POST http://localhost:3000/staff/admin/invitations`
- Request body:
   ```json
   {
      "email": "[REDACTED]",
      "role": "staff",
      "first_name": "[REDACTED]",
      "last_name": "[REDACTED]"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "invitation": {
         "id": 6,
         "email": "[REDACTED]",
         "expiresAt": "2026-10-14T03:16:45.158Z"
      },
      "invitation_token": "[REDACTED]"
   }
   ```

## 080 — Update admin user

- Timestamp: 2026-10-12T03:16:45.406Z
- Role: admin
- Duration: 84 ms
- Request: `PATCH http://localhost:3000/staff/admin/users/`
- Request body:
   ```json
   {
      "is_active": false
   }
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot PATCH /staff/admin/users/</pre>\n</body>\n</html>\n"
   ```

## 081 — Update provider

- Timestamp: 2026-10-12T03:16:45.671Z
- Role: admin
- Duration: 173 ms
- Request: `PATCH http://localhost:3000/staff/admin/providers/4`
- Request body:
   ```json
   {
      "specialty": "Internal Medicine"
   }
   ```
- Response status: 200
- Response body:
   ```json
   {
      "id": 4,
      "firstName": "[REDACTED]",
      "lastName": "[REDACTED]",
      "specialty": "Internal Medicine",
      "npiNumber": null,
      "isActive": true,
      "createdAt": "2026-10-12T01:24:14.158Z"
   }
   ```

## 082 — List admin reference data

- Timestamp: 2026-10-12T03:16:46.093Z
- Role: admin
- Duration: 343 ms
- Request: `GET http://localhost:3000/staff/admin/reference-data`
- Request body:
   ```json
   null
   ```
- Response status: 200
- Response body:
   ```json
   {
      "providers": [
         {
            "id": 7,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Obstetrics and Gynecology",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z"
         },
         {
            "id": 3,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Family Medicine",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z"
         },
         {
            "id": 5,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Dermatology",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z"
         },
         {
            "id": 2,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Cardiology",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z"
         },
         {
            "id": 13,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Internal Medicine",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T03:16:21.433Z"
         },
         {
            "id": 1,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Internal Medicine",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z"
         },
         {
            "id": 6,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Pediatrics",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z"
         },
         {
            "id": 4,
            "firstName": "[REDACTED]",
            "lastName": "[REDACTED]",
            "specialty": "Internal Medicine",
            "npiNumber": null,
            "isActive": true,
            "createdAt": "2026-10-12T01:24:14.158Z"
         }
      ],
      "availability": [
         {
            "id": 2,
            "providerId": 1,
            "dayOfWeek": 2,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 3,
            "providerId": 1,
            "dayOfWeek": 3,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 1,
            "providerId": 1,
            "dayOfWeek": 1,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 4,
            "providerId": 1,
            "dayOfWeek": 4,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 5,
            "providerId": 1,
            "dayOfWeek": 5,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 6,
            "providerId": 2,
            "dayOfWeek": 1,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 7,
            "providerId": 2,
            "dayOfWeek": 3,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 8,
            "providerId": 2,
            "dayOfWeek": 5,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 9,
            "providerId": 3,
            "dayOfWeek": 1,
            "startTime": "08:00:00",
            "endTime": "14:00:00"
         },
         {
            "id": 10,
            "providerId": 3,
            "dayOfWeek": 2,
            "startTime": "08:00:00",
            "endTime": "14:00:00"
         },
         {
            "id": 11,
            "providerId": 3,
            "dayOfWeek": 3,
            "startTime": "08:00:00",
            "endTime": "14:00:00"
         },
         {
            "id": 12,
            "providerId": 3,
            "dayOfWeek": 4,
            "startTime": "08:00:00",
            "endTime": "14:00:00"
         },
         {
            "id": 13,
            "providerId": 3,
            "dayOfWeek": 5,
            "startTime": "08:00:00",
            "endTime": "14:00:00"
         },
         {
            "id": 14,
            "providerId": 3,
            "dayOfWeek": 6,
            "startTime": "08:00:00",
            "endTime": "14:00:00"
         },
         {
            "id": 36,
            "providerId": 4,
            "dayOfWeek": 1,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 15,
            "providerId": 4,
            "dayOfWeek": 2,
            "startTime": "10:00:00",
            "endTime": "18:00:00"
         },
         {
            "id": 16,
            "providerId": 4,
            "dayOfWeek": 4,
            "startTime": "10:00:00",
            "endTime": "18:00:00"
         },
         {
            "id": 32,
            "providerId": 4,
            "dayOfWeek": 1,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 33,
            "providerId": 4,
            "dayOfWeek": 1,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 34,
            "providerId": 4,
            "dayOfWeek": 1,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 35,
            "providerId": 4,
            "dayOfWeek": 1,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 21,
            "providerId": 5,
            "dayOfWeek": 5,
            "startTime": "09:00:00",
            "endTime": "15:00:00"
         },
         {
            "id": 20,
            "providerId": 5,
            "dayOfWeek": 4,
            "startTime": "09:00:00",
            "endTime": "15:00:00"
         },
         {
            "id": 19,
            "providerId": 5,
            "dayOfWeek": 3,
            "startTime": "09:00:00",
            "endTime": "15:00:00"
         },
         {
            "id": 18,
            "providerId": 5,
            "dayOfWeek": 2,
            "startTime": "09:00:00",
            "endTime": "15:00:00"
         },
         {
            "id": 17,
            "providerId": 5,
            "dayOfWeek": 1,
            "startTime": "09:00:00",
            "endTime": "15:00:00"
         },
         {
            "id": 22,
            "providerId": 6,
            "dayOfWeek": 1,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 23,
            "providerId": 6,
            "dayOfWeek": 2,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 24,
            "providerId": 6,
            "dayOfWeek": 3,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 25,
            "providerId": 6,
            "dayOfWeek": 4,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 26,
            "providerId": 6,
            "dayOfWeek": 5,
            "startTime": "08:00:00",
            "endTime": "16:00:00"
         },
         {
            "id": 31,
            "providerId": 7,
            "dayOfWeek": 5,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 30,
            "providerId": 7,
            "dayOfWeek": 4,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 29,
            "providerId": 7,
            "dayOfWeek": 3,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 28,
            "providerId": 7,
            "dayOfWeek": 2,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         },
         {
            "id": 27,
            "providerId": 7,
            "dayOfWeek": 1,
            "startTime": "09:00:00",
            "endTime": "17:00:00"
         }
      ],
      "rooms": [
         {
            "id": 1,
            "name": "Exam Room 1",
            "roomType": "exam"
         },
         {
            "id": 2,
            "name": "Exam Room 2",
            "roomType": "exam"
         },
         {
            "id": 3,
            "name": "Exam Room 3",
            "roomType": "exam"
         },
         {
            "id": 4,
            "name": "Imaging Suite A",
            "roomType": "imaging"
         },
         {
            "id": 5,
            "name": "Cardiac Diagnostics",
            "roomType": "diagnostics"
         },
         {
            "id": 6,
            "name": "Pulmonary Testing",
            "roomType": "diagnostics"
         },
         {
            "id": 7,
            "name": "Bone Density Suite",
            "roomType": "imaging"
         }
      ],
      "equipment": [
         {
            "id": 1,
            "name": "MRI Machine",
            "equipmentType": "imaging",
            "roomId": 4
         },
         {
            "id": 2,
            "name": "X-Ray Machine",
            "equipmentType": "imaging",
            "roomId": 4
         },
         {
            "id": 3,
            "name": "Ultrasound Machine",
            "equipmentType": "imaging",
            "roomId": 4
         },
         {
            "id": 4,
            "name": "ECG Machine",
            "equipmentType": "diagnostic",
            "roomId": 5
         },
         {
            "id": 5,
            "name": "Spirometer",
            "equipmentType": "diagnostic",
            "roomId": 6
         },
         {
            "id": 6,
            "name": "DEXA Scanner",
            "equipmentType": "imaging",
            "roomId": 7
         }
      ],
      "visitTypes": [
         {
            "id": 1,
            "name": "Annual Physical",
            "description": null,
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": null
         },
         {
            "id": 2,
            "name": "Follow-up",
            "description": null,
            "durationMinutes": 15,
            "requiredSpecialty": null,
            "requiredEquipmentId": null
         },
         {
            "id": 3,
            "name": "MRI - Knee",
            "description": null,
            "durationMinutes": 45,
            "requiredSpecialty": "Orthopedics",
            "requiredEquipmentId": 1
         },
         {
            "id": 4,
            "name": "New Patient Intake",
            "description": null,
            "durationMinutes": 45,
            "requiredSpecialty": null,
            "requiredEquipmentId": null
         },
         {
            "id": 5,
            "name": "Cardiology Consult",
            "description": null,
            "durationMinutes": 30,
            "requiredSpecialty": "Cardiology",
            "requiredEquipmentId": null
         },
         {
            "id": 6,
            "name": "X-Ray - Chest",
            "description": null,
            "durationMinutes": 20,
            "requiredSpecialty": null,
            "requiredEquipmentId": 2
         },
         {
            "id": 7,
            "name": "Primary Care Consultation",
            "description": "Routine assessment and management of common outpatient conditions",
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": null
         },
         {
            "id": 8,
            "name": "ECG - Resting",
            "description": "Resting 12-lead electrocardiogram",
            "durationMinutes": 20,
            "requiredSpecialty": "Cardiology",
            "requiredEquipmentId": 4
         },
         {
            "id": 9,
            "name": "Spirometry",
            "description": "Office lung-function testing",
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": 5
         },
         {
            "id": 10,
            "name": "Ultrasound - Abdomen",
            "description": "Diagnostic abdominal ultrasonography",
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": 3
         },
         {
            "id": 11,
            "name": "DEXA Scan",
            "description": "Bone mineral density assessment",
            "durationMinutes": 30,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": 6
         },
         {
            "id": 12,
            "name": "Laboratory Diagnostics",
            "description": "Outpatient laboratory collection and review",
            "durationMinutes": 20,
            "requiredSpecialty": "Internal Medicine",
            "requiredEquipmentId": null
         },
         {
            "id": 13,
            "name": "Prenatal Consultation",
            "description": "Prenatal care and pregnancy risk review",
            "durationMinutes": 30,
            "requiredSpecialty": "Obstetrics and Gynecology",
            "requiredEquipmentId": null
         },
         {
            "id": 14,
            "name": "Pediatric Consultation",
            "description": "Pediatric primary-care assessment",
            "durationMinutes": 30,
            "requiredSpecialty": "Pediatrics",
            "requiredEquipmentId": null
         }
      ],
      "insurancePlans": [
         {
            "id": 3,
            "payerName": "Intellicare",
            "planName": "Basic",
            "planType": "hmo",
            "coveragePct": "60.00"
         },
         {
            "id": 2,
            "payerName": "Maxicare",
            "planName": "Premium HMO",
            "planType": "hmo",
            "coveragePct": "90.00"
         },
         {
            "id": 1,
            "payerName": "PhilHealth",
            "planName": "Standard",
            "planType": "government",
            "coveragePct": "70.00"
         },
         {
            "id": 5,
            "payerName": "Synthetic Plan",
            "planName": "Demo Active",
            "planType": null,
            "coveragePct": null
         }
      ]
   }
   ```

## 083 — Create room reference

- Timestamp: 2026-10-12T03:16:46.342Z
- Role: admin
- Duration: 163 ms
- Request: `POST http://localhost:3000/staff/admin/reference/rooms`
- Request body:
   ```json
   {
      "name": "Postman Room",
      "roomType": "exam"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "id": 13,
      "name": "Postman Room",
      "roomType": "exam"
   }
   ```

## 084 — Create equipment reference

- Timestamp: 2026-10-12T03:16:46.574Z
- Role: admin
- Duration: 172 ms
- Request: `POST http://localhost:3000/staff/admin/reference/equipment`
- Request body:
   ```json
   {
      "name": "Postman Equipment",
      "equipmentType": "diagnostic",
      "roomId": ""
   }
   ```
- Response status: 409
- Response body:
   ```json
   {
      "error": "Reference data could not be created"
   }
   ```

## 085 — Create visit type reference

- Timestamp: 2026-10-12T03:16:46.835Z
- Role: admin
- Duration: 169 ms
- Request: `POST http://localhost:3000/staff/admin/reference/visit-types`
- Request body:
   ```json
   {
      "name": "Postman Visit",
      "durationMinutes": 30,
      "requiredSpecialty": "Internal Medicine"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "id": 20,
      "name": "Postman Visit",
      "description": null,
      "durationMinutes": 30,
      "requiredSpecialty": "Internal Medicine",
      "requiredEquipmentId": null
   }
   ```

## 086 — Create insurance-plan reference

- Timestamp: 2026-10-12T03:16:47.067Z
- Role: admin
- Duration: 164 ms
- Request: `POST http://localhost:3000/staff/admin/reference/insurance-plans`
- Request body:
   ```json
   {
      "payerName": "Postman Payer",
      "planName": "Postman Plan",
      "planType": "demo",
      "coveragePct": "80.00"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "id": 17,
      "payerName": "Postman Payer",
      "planName": "Postman Plan",
      "planType": "demo",
      "coveragePct": "80.00"
   }
   ```

## 087 — Create availability reference

- Timestamp: 2026-10-12T03:16:47.588Z
- Role: admin
- Duration: 444 ms
- Request: `POST http://localhost:3000/staff/admin/reference/availability`
- Request body:
   ```json
   {
      "providerId": "4",
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "id": 37,
      "providerId": 4,
      "dayOfWeek": 1,
      "startTime": "09:00:00",
      "endTime": "17:00:00"
   }
   ```

## 088 — Create fee-schedule reference

- Timestamp: 2026-10-12T03:16:47.841Z
- Role: admin
- Duration: 164 ms
- Request: `POST http://localhost:3000/staff/admin/reference/fee-schedule`
- Request body:
   ```json
   {
      "procedureCode": "POSTMAN-001",
      "description": "Synthetic procedure",
      "standardCost": "100.00"
   }
   ```
- Response status: 201
- Response body:
   ```json
   {
      "id": 23,
      "procedureCode": "POSTMAN-001",
      "description": "Synthetic procedure",
      "standardCost": "100.00"
   }
   ```

## 089 — Delete reference record

- Timestamp: 2026-10-12T03:16:47.997Z
- Role: admin
- Duration: 80 ms
- Request: `DELETE http://localhost:3000/staff/admin/reference/rooms/`
- Request body:
   ```json
   null
   ```
- Response status: 404
- Response body:
   ```json
   "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>Error</title>\n</head>\n<body>\n<pre>Cannot DELETE /staff/admin/reference/rooms/</pre>\n</body>\n</html>\n"
   ```
