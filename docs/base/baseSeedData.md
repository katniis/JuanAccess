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

---

# Additional Seed Data — Tables Not Covered Above

The tables below had **no seed rows** in the sections above. Everything here is
mock/reference data that respects the foreign keys already established:

- Hand-built IDs above: `rooms` (1–4), `equipment` (1–3), `providers` (1–5),
  `visit_types` (1–6), `insurance_plans` (1–3), `clinical_guidelines` (1),
  `fee_schedule` (procedure codes), `users` staff (1–3).
- `patients` / `conditions` / `labs` / `medications` would normally be imported
  from the Synthea CSVs in `docs/csv/`; the rows below are **hand-written
  stand-ins** so the demo scenarios work without running the importer.
- Insert order matters: `patients` → `users` (patient) → `patient_coverage` →
  `appointments` → `prior_authorizations` → `appeals` → `procedures_performed`
  → `pre_visit_summaries` → `bills` → `bill_line_items` → `dispute_letters` →
  `waitlist_entries` → `notifications` → `audit_log`.

## Patients

_(Synthea stand-ins. `synthea_patient_id` mimics the CSV `Id` column.)_

| id  | first_name | last_name | date_of_birth | gender | contact_email              | contact_phone    | is_new_patient | synthea_patient_id                   | intake_reason_note                                               |
| --- | ---------- | --------- | ------------- | ------ | -------------------------- | ---------------- | -------------- | ------------------------------------ | ---------------------------------------------------------------- |
| 1   | Maria      | Santos    | 1978-04-12    | female | maria.santos@patient.test  | +63-917-2200-118 | FALSE          | 4f2a9c11-8b3d-4e77-9a01-2c5e7b9d1101 | —                                                                |
| 2   | Juan       | Dela Cruz | 1991-11-03    | male   | juan.delacruz@patient.test | +63-920-4410-772 | TRUE           | 7b0e5d92-1c4a-4f88-b3ef-9d2a6c8e5502 | Persistent lower back pain, referred by Dr. Reyes for evaluation |
| 3   | Ana        | Reyes     | 1985-07-22    | female | ana.reyes@patient.test     | +63-915-7788-340 | FALSE          | 1a6f3b84-5d2c-4a19-8e70-6f4b1c9d3303 | —                                                                |
| 4   | Grace      | Lim       | 1996-02-17    | female | grace.lim@patient.test     | +63-926-3021-559 | FALSE          | 9c8d2e47-3a6b-41d5-bb12-0e7f5a2c4404 | —                                                                |

## Patient Accounts (users)

_Continues the staff accounts (`id` 1–3) from the section above.
`password_hash` values are placeholders — hash with bcrypt before use._

| id  | email                      | role        | patient_id | provider_id | display_name      |
| --- | -------------------------- | ----------- | ---------- | ----------- | ----------------- |
| 1   | front.desk@clinic.test     | staff       | —          | —           | Jenny Reyes       |
| 2   | billing.admin@clinic.test  | staff_admin | —          | —           | Mark Villanueva   |
| 3   | dr.torres@clinic.test      | staff_admin | —          | 1           | Dr. Amanda Torres |
| 4   | maria.santos@patient.test  | patient     | 1          | —           | Maria Santos      |
| 5   | juan.delacruz@patient.test | patient     | 2          | —           | Juan Dela Cruz    |
| 6   | ana.reyes@patient.test     | patient     | 3          | —           | Ana Reyes         |
| 7   | grace.lim@patient.test     | patient     | 4          | —           | Grace Lim         |

## Patient Coverage

| id  | patient_id | insurance_plan_id        | policy_number | status     | effective_date |
| --- | ---------- | ------------------------ | ------------- | ---------- | -------------- |
| 1   | 1 (Maria)  | 1 (PhilHealth Standard)  | PH-8842137    | active     | 2026-01-01     |
| 2   | 2 (Juan)   | 2 (Maxicare Premium HMO) | MX-5522991    | unverified | 2026-09-20     |
| 3   | 3 (Ana)    | 2 (Maxicare Premium HMO) | MX-4410238    | active     | 2025-06-01     |
| 4   | 4 (Grace)  | 3 (Intellicare Basic)    | IL-3390188    | active     | 2026-03-15     |

## Clinical Guidelines (additional)

_Complements guideline id 1 (Knee MRI) already documented above._

| id  | title                             | applicable_visit_type_id | applicable_diagnosis_code | source_citation                           | excerpt_text                                                                                                                                                                                                                    |
| --- | --------------------------------- | ------------------------ | ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Knee Pain Imaging Appropriateness | 3 (MRI - Knee)           | M23.2                     | Adapted from ACR Appropriateness Criteria | "MRI is considered appropriate as the initial imaging study for suspected internal derangement of the knee when clinical exam findings are inconclusive and conservative management has not resolved symptoms after 4-6 weeks." |
| 2   | Chest Radiograph Appropriateness  | 6 (X-Ray - Chest)        | R05.9                     | Adapted from ACR Appropriateness Criteria | "Chest radiography is appropriate for evaluation of acute cough with red-flag features (hemoptysis, weight loss, fever unresponsive to therapy); routine imaging for uncomplicated acute bronchitis is not indicated."          |

## Appointments

| id  | patient_id | provider_id           | room_id             | equipment_id    | visit_type_id          | scheduled_start     | scheduled_end       | status    | insurance_status |
| --- | ---------- | --------------------- | ------------------- | --------------- | ---------------------- | ------------------- | ------------------- | --------- | ---------------- |
| 1   | 1 (Maria)  | 4 (Webb, Ortho)       | 4 (Imaging Suite A) | 1 (MRI Machine) | 3 (MRI - Knee)         | 2026-10-06 09:00+08 | 2026-10-06 09:45+08 | scheduled | active           |
| 2   | 3 (Ana)    | 1 (Torres, Int. Med)  | 1 (Exam Room 1)     | —               | 2 (Follow-up)          | 2026-08-14 10:00+08 | 2026-08-14 10:15+08 | completed | active           |
| 3   | 2 (Juan)   | 3 (Kim, Family Med)   | 2 (Exam Room 2)     | —               | 4 (New Patient Intake) | 2026-10-08 11:00+08 | 2026-10-08 11:45+08 | scheduled | unverified       |
| 4   | 1 (Maria)  | 2 (Patel, Cardiology) | 1 (Exam Room 1)     | —               | 5 (Cardiology Consult) | 2026-08-28 14:00+08 | 2026-08-28 14:30+08 | completed | active           |
| 5   | 4 (Grace)  | 5 (Nguyen, Derm)      | 3 (Exam Room 3)     | —               | 1 (Annual Physical)    | 2026-10-15 09:00+08 | 2026-10-15 09:30+08 | scheduled | active           |

## Conditions

_(Normally from Synthea `conditions.csv`.)_

| id  | patient_id | condition_code | description                                    | diagnosed_date | resolved_date | synthea_condition_id |
| --- | ---------- | -------------- | ---------------------------------------------- | -------------- | ------------- | -------------------- |
| 1   | 1 (Maria)  | M23.2          | Derangement of meniscus due to old tear        | 2026-06-10     | —             | cond-4f2a9c11-001    |
| 2   | 1 (Maria)  | I10            | Essential (primary) hypertension               | 2019-03-02     | —             | cond-4f2a9c11-002    |
| 3   | 1 (Maria)  | E11.9          | Type 2 diabetes mellitus without complications | 2021-09-15     | —             | cond-4f2a9c11-003    |
| 4   | 3 (Ana)    | J45.909        | Unspecified asthma, uncomplicated              | 2010-05-20     | —             | cond-1a6f3b84-001    |

## Chart Notes

| id  | patient_id | appointment_id | provider_id | encounter_date      | note_text                                                                                                                                                                                                                                                                                                               | synthea_encounter_id |
| --- | ---------- | -------------- | ----------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | 1 (Maria)  | 4              | 2 (Patel)   | 2026-08-28 14:00+08 | "52F with HTN, T2DM presents with persistent right knee pain x 6 weeks after fall. Conservative management (NSAIDs, PT) without resolution. Clinical exam suggests possible meniscal tear. Recommending MRI knee without contrast to evaluate for internal derangement. Cardiac follow-up stable; continue lisinopril." | enc-4f2a9c11-001     |
| 2   | 3 (Ana)    | 2              | 1 (Torres)  | 2026-08-14 10:00+08 | "35F established patient follow-up. Asthma well controlled. Reviewed inhaler technique. Routine office visit; no acute concerns. BMP ordered for annual monitoring."                                                                                                                                                    | enc-1a6f3b84-001     |

## Labs

_(Normally from Synthea `observations.csv`.)_

| id  | patient_id | appointment_id | test_name             | result_value | unit  | reference_range | result_date         |
| --- | ---------- | -------------- | --------------------- | ------------ | ----- | --------------- | ------------------- |
| 1   | 1 (Maria)  | 4              | Hemoglobin A1c        | 7.1          | %     | 4.0–5.6         | 2026-08-28 14:20+08 |
| 2   | 1 (Maria)  | 4              | LDL Cholesterol       | 132          | mg/dL | <100            | 2026-08-28 14:20+08 |
| 3   | 1 (Maria)  | 4              | Serum Creatinine      | 0.9          | mg/dL | 0.6–1.1         | 2026-08-28 14:20+08 |
| 4   | 3 (Ana)    | 2              | Basic Metabolic Panel | normal       | —     | —               | 2026-08-14 10:10+08 |

## Medications

_(Normally from Synthea `medications.csv`.)_

| id  | patient_id | medication_name   | dose       | start_date | end_date   | prescribing_provider_id |
| --- | ---------- | ----------------- | ---------- | ---------- | ---------- | ----------------------- |
| 1   | 1 (Maria)  | Metformin         | 500 mg BID | 2021-09-20 | —          | 1 (Torres)              |
| 2   | 1 (Maria)  | Lisinopril        | 10 mg QD   | 2019-03-10 | —          | 2 (Patel)               |
| 3   | 1 (Maria)  | Ibuprofen         | 400 mg TID | 2026-07-01 | 2026-07-15 | 4 (Webb)                |
| 4   | 3 (Ana)    | Albuterol inhaler | 90 mcg PRN | 2010-05-25 | —          | 1 (Torres)              |

## Procedures Performed

_(System-recorded reference used by bill dispute comparison. Matches the
2026-08-14 Dr. Torres visit described in the demo data above.)_

| id  | appointment_id | procedure_code | description                       | performed_at        |
| --- | -------------- | -------------- | --------------------------------- | ------------------- |
| 1   | 2              | 99213          | Office visit, established patient | 2026-08-14 10:05+08 |

## Pre-Visit Summaries

| id  | appointment_id   | summary_text                                                                                                                                                                                                                                                                                                                                                                                      | raw_data_snapshot                                                    | generated_at        |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------- |
| 1   | 1 (Maria, MRI)   | "Maria Santos is a 48-year-old female with hypertension and type 2 diabetes presenting for an MRI of the right knee. Six weeks of persistent pain following a fall have not resolved with conservative management; clinical exam raises concern for a meniscal tear. Recent labs (08/28) show HbA1c 7.1% and LDL 132 mg/dL. Current medications: metformin, lisinopril. No anticoagulants noted." | `{"encounters":["2026-08-28"],"labs":[1,2,3],"medications":[1,2,3]}` | 2026-09-29 08:12+08 |
| 2   | 3 (Juan, intake) | _NULL — new patient with no prior encounters; UI shows fallback: "New patient — no prior chart history available. Reason for visit: Persistent lower back pain, referred by Dr. Reyes for evaluation."_                                                                                                                                                                                           | _NULL_                                                               | 2026-09-29 08:12+08 |

## Prior Authorizations

| id  | appointment_id        | status | justification_text                                                                                                                                                                                                                                                                     | ai_generated_at     | reviewed_by | submitted_by | submitted_at        | decision_at         | denial_reason                                                                                    |
| --- | --------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------- | ------------ | ------------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | 1 (Maria, MRI - Knee) | denied | "Patient has a suspected internal derangement of the right knee (ICD-10 M23.2) with persistent pain for 6 weeks despite conservative management. MRI is requested to evaluate for meniscal or ligamentous injury to guide surgical planning. Clinical exam findings are inconclusive." | 2026-09-29 08:15+08 | 3 (Torres)  | 3 (Torres)   | 2026-09-29 09:00+08 | 2026-09-30 11:30+08 | "Request does not demonstrate failed conservative therapy documentation within required window." |

## Appeals

| id  | prior_authorization_id | guideline_id           | chart_justification_text                                                                                                                                                        | appeal_letter_text                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | status  | reviewed_by     | submitted_by | submitted_at | decision_at |
| --- | ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ------------ | ------------ | ----------- |
| 1   | 1                      | 1 (Knee MRI guideline) | "Chart documents 6 weeks of persistent right knee pain post-fall, NSAIDs and physical therapy without resolution, and inconclusive exam findings concerning for meniscal tear." | "To Whom It May Concern: We are appealing the denial of prior authorization for MRI of the right knee (CPT 73721) for patient Maria Santos. Per the ACR Appropriateness Criteria, MRI is appropriate as the initial imaging study for suspected internal derangement of the knee when clinical exam findings are inconclusive and conservative management has not resolved symptoms after 4-6 weeks. The chart documents a 6-week course of conservative management with NSAIDs and physical therapy without improvement. We respectfully request reconsideration." | drafted | 1 (Jenny Reyes) | —            | —            | —           |

## Bills

| id  | patient_id | appointment_id | uploaded_file_url                | upload_date         | status   |
| --- | ---------- | -------------- | -------------------------------- | ------------------- | -------- |
| 1   | 3 (Ana)    | 2              | /uploads/bills/ana-reyes-aug.pdf | 2026-08-20 09:41+08 | disputed |

## Bill Line Items

_(Bill id 1 deliberately contains two planted errors, per the demo data above.)_

| id  | bill_id | procedure_code | description                       | amount  | is_flagged | flag_reason                                                    |
| --- | ------- | -------------- | --------------------------------- | ------- | ---------- | -------------------------------------------------------------- |
| 1   | 1       | 99213          | Office visit, level 3             | 1200.00 | FALSE      | —                                                              |
| 2   | 1       | 80053          | Comprehensive metabolic panel     | 950.00  | TRUE       | Not performed — no matching procedure on record for this visit |
| 3   | 1       | 99213          | Office visit, level 3 (duplicate) | 1200.00 | TRUE       | Duplicate charge — same code and day already billed (line 1)   |

## Dispute Letters

| id  | bill_id | letter_text                                                                                                                                                                                                                                                                                                                                                                                                                                 | generated_at        | patient_edited | downloaded_at |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------- | ------------- |
| 1   | 1       | "Dear Billing Department, I am disputing charges on my bill dated 2026-08-14. Line 2 (Comprehensive metabolic panel, ₱950) does not correspond to any service performed during my visit. Line 3 duplicates the office visit already billed on line 1 (₱1,200). I request a corrected statement removing the duplicate office visit charge and the panel that was not performed, totaling ₱2,150 in disputed charges. Sincerely, Ana Reyes." | 2026-08-20 09:42+08 | FALSE          | —             |

## Waitlist Entries

| id  | patient_id | provider_id | visit_type_id       | preferred_date_start | preferred_date_end | preferred_time_start | preferred_time_end | status  | offered_appointment_id | offer_expires_at    |
| --- | ---------- | ----------- | ------------------- | -------------------- | ------------------ | -------------------- | ------------------ | ------- | ---------------------- | ------------------- |
| 1   | 3 (Ana)    | —           | 2 (Follow-up)       | 2026-10-12           | 2026-10-16         | 09:00                | 12:00              | waiting | —                      | —                   |
| 2   | 4 (Grace)  | 5 (Nguyen)  | 1 (Annual Physical) | 2026-10-13           | 2026-10-17         | 08:00                | 12:00              | offered | 5                      | 2026-09-29 12:00+08 |

## Notifications

| id  | user_id   | type               | message                                                                               | is_read | created_at          |
| --- | --------- | ------------------ | ------------------------------------------------------------------------------------- | ------- | ------------------- |
| 1   | 4 (Maria) | prior_auth_denied  | "Your prior authorization for MRI - Knee was denied. An appeal is being prepared."    | FALSE   | 2026-09-30 11:31+08 |
| 2   | 5 (Juan)  | appointment_booked | "Your New Patient Intake appointment with Dr. Kim is confirmed for 2026-10-08 11:00." | FALSE   | 2026-09-29 08:05+08 |
| 3   | 6 (Ana)   | dispute_ready      | "We found 2 issues on your uploaded bill. Your dispute letter is ready to review."    | TRUE    | 2026-08-20 09:42+08 |
| 4   | 7 (Grace) | waitlist_offer     | "A matching slot opened for your Annual Physical. Confirm within the offer window."   | FALSE   | 2026-09-29 10:00+08 |

## Audit Log

| id  | entity_type          | entity_id | action         | changed_by | changed_at          | old_value                | new_value                |
| --- | -------------------- | --------- | -------------- | ---------- | ------------------- | ------------------------ | ------------------------ |
| 1   | prior_authorizations | 1         | status_changed | 3 (Torres) | 2026-09-29 09:00+08 | `{"status":"drafted"}`   | `{"status":"submitted"}` |
| 2   | prior_authorizations | 1         | status_changed | 3 (Torres) | 2026-09-30 11:30+08 | `{"status":"submitted"}` | `{"status":"denied"}`    |
| 3   | appeals              | 1         | created        | 1 (Jenny)  | 2026-09-30 11:45+08 | `null`                   | `{"status":"drafted"}`   |
| 4   | bills                | 1         | status_changed | 6 (Ana)    | 2026-08-20 09:42+08 | `{"status":"processed"}` | `{"status":"disputed"}`  |
