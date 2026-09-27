# Example Seed Data — Matching the Revised Schema

Reference values for populating the hand-built tables (rooms, equipment, providers, visit types, insurance plans, prior-auth rules, guidelines, fee schedule, staff accounts). IDs referenced below assume rows are inserted in this order (auto-incrementing `SERIAL` primary keys).

---

## Rooms

| id  | name            | room_type |
| --- | --------------- | --------- |
| 1   | Exam Room 1     | exam      |
| 2   | Exam Room 2     | exam      |
| 3   | Exam Room 3     | exam      |
| 4   | Imaging Suite A | imaging   |

## Equipment

| id  | name               | equipment_type | room_id |
| --- | ------------------ | -------------- | ------- |
| 1   | MRI Machine        | imaging        | 4       |
| 2   | X-Ray Machine      | imaging        | 4       |
| 3   | Ultrasound Machine | imaging        | 4       |

## Providers

| id  | first_name | last_name | specialty         |
| --- | ---------- | --------- | ----------------- |
| 1   | Amanda     | Torres    | Internal Medicine |
| 2   | James      | Patel     | Cardiology        |
| 3   | Lisa       | Kim       | Family Medicine   |
| 4   | Marcus     | Webb      | Orthopedics       |
| 5   | Sarah      | Nguyen    | Dermatology       |

## Provider Availability

(day_of_week: 0=Sun … 6=Sat)

| provider_id | day_of_week           | start_time | end_time |
| ----------- | --------------------- | ---------- | -------- |
| 1 (Torres)  | 1–5 (Mon–Fri)         | 08:00      | 16:00    |
| 2 (Patel)   | 1, 3, 5 (Mon/Wed/Fri) | 09:00      | 17:00    |
| 3 (Kim)     | 1–6 (Mon–Sat)         | 08:00      | 14:00    |
| 4 (Webb)    | 2, 4 (Tue/Thu)        | 10:00      | 18:00    |
| 5 (Nguyen)  | 1–5 (Mon–Fri)         | 09:00      | 15:00    |

## Visit Types

| id  | name               | duration_min | required_specialty | required_equipment_id |
| --- | ------------------ | ------------ | ------------------ | --------------------- |
| 1   | Annual Physical    | 30           | Internal Medicine  | none                  |
| 2   | Follow-up          | 15           | any                | none                  |
| 3   | MRI - Knee         | 45           | Orthopedics        | 1 (MRI Machine)       |
| 4   | New Patient Intake | 45           | any                | none                  |
| 5   | Cardiology Consult | 30           | Cardiology         | none                  |
| 6   | X-Ray - Chest      | 20           | any                | 2 (X-Ray Machine)     |

## Insurance Plans

| id  | payer_name  | plan_name   | plan_type  | coverage_pct |
| --- | ----------- | ----------- | ---------- | ------------ |
| 1   | PhilHealth  | Standard    | government | 70.00        |
| 2   | Maxicare    | Premium HMO | hmo        | 90.00        |
| 3   | Intellicare | Basic       | hmo        | 60.00        |

## Prior-Auth Rules

| visit_type_id          | insurance_plan_id        | requires_prior_auth |
| ---------------------- | ------------------------ | ------------------- |
| 3 (MRI - Knee)         | 1 (PhilHealth Standard)  | TRUE                |
| 3 (MRI - Knee)         | 2 (Maxicare Premium HMO) | FALSE               |
| 3 (MRI - Knee)         | 3 (Intellicare Basic)    | TRUE                |
| 5 (Cardiology Consult) | 1 (PhilHealth Standard)  | TRUE                |
| 1 (Annual Physical)    | any                      | FALSE               |
| 2 (Follow-up)          | any                      | FALSE               |
| 6 (X-Ray - Chest)      | any                      | FALSE               |

## Clinical Guideline Excerpt (example — curate 2–3 total)

```
title: Knee Pain Imaging Appropriateness (adapted excerpt)
applicable_visit_type_id: 3 (MRI - Knee)
applicable_diagnosis_code: M23.2
source_citation: Adapted from ACR Appropriateness Criteria
excerpt_text:
  "MRI is considered appropriate as the initial imaging study for
  suspected internal derangement of the knee (e.g., meniscal or
  ligamentous injury) when clinical exam findings are inconclusive
  and conservative management has not resolved symptoms after 4-6 weeks."
```

## Fee Schedule

_(Illustrative placeholder values — verify against real Synthea cost tables or CMS Physician Fee Schedule ranges before finalizing.)_

| procedure_code | description                       | standard_cost |
| -------------- | --------------------------------- | ------------- |
| 99213          | Office visit, established patient | ₱1,200.00     |
| 73721          | MRI knee without contrast         | ₱8,500.00     |
| 73722          | MRI knee with contrast            | ₱12,000.00    |
| 80048          | Basic metabolic panel             | ₱650.00       |
| 80053          | Comprehensive metabolic panel     | ₱950.00       |
| 71046          | X-ray, chest                      | ₱900.00       |
| 99395          | Annual physical exam              | ₱1,500.00     |

## Staff Accounts

_(`password_hash` values are placeholders — hash real passwords with bcrypt before inserting.)_

| email                     | role        | provider_id | display_name      |
| ------------------------- | ----------- | ----------- | ----------------- |
| front.desk@clinic.test    | staff       | —           | Jenny Reyes       |
| billing.admin@clinic.test | staff_admin | —           | Mark Villanueva   |
| dr.torres@clinic.test     | staff_admin | 1 (Torres)  | Dr. Amanda Torres |

---

## Demo-Specific Data (hand-crafted, not part of core seed)

**Bill dispute pair**

```
Reference (system-recorded, from procedures_performed):
  Visit: appointment linked to patient, 2026-08-14, Dr. Torres
  Procedure: 99213 (Office visit) — ₱1,200

Actual bill (uploaded PDF, deliberately wrong):
  Line 1: Office visit, level 3 ......... ₱1,200
  Line 2: Comprehensive metabolic panel .. ₱950   ← planted error, not performed
  Line 3: Office visit, level 3 (dup) .... ₱1,200 ← planted error, duplicate
```

**Denial → appeal scenario**

```
Patient: Maria Santos
Visit type: MRI - Knee
Insurance: PhilHealth Standard (requires prior auth per rule table)
Diagnosis: M23.2 (matches the seeded guideline excerpt above)
Chart note: "Suspected meniscus tear, persistent pain 6 weeks post
             conservative treatment"
Expected flow: prior auth drafted → submitted → mock insurer auto-denies
  → appeal drafted citing the guideline → staff reviews → submits
```

**New-patient scenario**

```
New patient: Juan Dela Cruz
is_new_patient: TRUE
intake_reason_note: "Persistent lower back pain, referred by Dr. Reyes
                      for evaluation"
Insurance entered: Maxicare Premium HMO — status: unverified
No rows in conditions/chart_notes yet → pre-visit summary falls back to
  intake_reason_note instead of calling AI on empty chart data
```
