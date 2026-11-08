A healthcare automation platform that handles the administrative work around a patient visit — from booking to billing — so staff don't have to manually shuttle information between disconnected systems.

**Step by step, here's what happens:**

1. **A patient needs an appointment.** Instead of a staff member checking room availability, provider schedules, and equipment separately, the system automatically finds the one slot where everything lines up and books it. If that appointment later gets cancelled, it automatically fills the gap from a waitlist instead of leaving it empty.
2. **The moment it's booked, the system checks the boring but critical stuff automatically:** Is this patient's insurance active? Will this specific visit need prior authorization from their insurer? If yes, it immediately starts generating that request — pulling justification straight from the patient's chart — instead of someone realizing it's needed three days before the visit.
3. **Before the visit happens,** it automatically pulls together the patient's relevant history, recent labs, and medication changes into a short summary for the doctor, so they're not spending 10 minutes digging through the chart before walking in the room.
4. **If the prior authorization gets denied,** it automatically drafts and files the appeal, citing the right clinical guidelines — instead of a staff member starting from scratch.
5. **After the visit, if something's wrong with the bill** (overcharge, coding error, a charge for something not covered), a patient can upload it and the system flags the issues and drafts a dispute letter for them.

**The core value in one sentence**

It removes the manual, repetitive work of matching people to resources and chasing paperwork through insurance — the stuff that eats staff hours and causes surprise bills — by automating it end-to-end, with AI handling the parts that require reading messy real-world text (chart notes, bills, denial letters) and generating the right document in response.

---

# PROJECT PLAN

## 1. Architecture — Single App, Role-Based Routing

One React app, one login screen. On login, the account's role (`patient`, `staff`, `staff_admin`) determines which routes/nav items are available:

- A `patient` account lands on the Patient dashboard and only ever sees patient routes.
- A `staff` or `staff_admin` account lands on the Staff dashboard and only ever sees staff routes.
- Route guards live both in the frontend (hide/redirect) and the backend (reject the API call regardless of what the UI shows) — the frontend guard is for UX, the backend guard is the actual security boundary.

This trades a bit of frontend routing/permission logic (conditional nav, protected route wrappers) for a simpler setup overall: one codebase, one deploy, one shared component library with no duplication.

## 2. Roles & Auth

| Role                             | Can do                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Patient                          | Books appointments, manages their own waitlist entries, views their own insurance/prior-auth status, uploads bills, views their own disputes |
| Staff (basic)                    | Views everything: schedules, prior-auth queue, appeal queue, doctor lookup, patient disputes. Cannot submit anything to the insurer          |
| Staff (elevated / `staff_admin`) | Everything basic staff can, plus the final "submit" action on prior-auth requests and appeals                                                |

Auth: email/password with JWT sessions. Role stored on the `users` table, checked on every protected route (frontend) and every protected endpoint (backend middleware).

---

## 3. Patient-Side Routes & Content

### `/login`, `/register`

Standard auth. Registering links the account to a patient record (seeded from synthetic data) so there's chart history to work with.

### `/patient` (Dashboard)

- Upcoming appointment(s)
- Active waitlist entries and status (waiting / offered — claim now! / expired)
- Insurance & prior-auth status summary for upcoming visits
- Quick actions: "Book an appointment," "Upload a bill"

### `/patient/book`

- Step 1: pick visit reason/type (e.g. "Annual physical," "MRI — knee," "Follow-up")
- Step 2: pick a preferred date range and optional time-of-day preference
- Step 3: system returns matching available slots (room/equipment matching happens invisibly server-side)
- Step 4: confirm a slot → booking created
- If nothing matches: offer to join the waitlist with the same criteria

### `/patient/waitlist`

- Active waitlist entries with live status
- When a slot opens and matches, entry flips to "Offered — claim within [countdown]" with Confirm / Decline
- History of past waitlist entries

### `/patient/appointments`

- Upcoming/past appointments
- Per-appointment: date/time/provider, insurance eligibility status, prior-auth status if applicable (not needed / pending / submitted / denied / appealed / approved) — view only

### `/patient/bills`

- Upload a bill (PDF or image)
- System extracts line items automatically, displayed in a table
- Flagged items marked with a reason (not covered / duplicate / coding mismatch)
- Click a line item → plain-language explanation of that charge/service
- If issues are found, a dispute letter is drafted automatically for the patient to review and edit. The patient can submit it to clinic staff, where it appears in the read-only Disputes page, or download it.
- History of past uploads and outcomes

---

## 4. Staff-Side Routes & Content

### `/staff` (Dashboard)

- Today's snapshot: appointments today, pending prior-auths, pending appeals, waitlists with open slots
- Search a doctor by name → jump to their schedule
- Search a patient by name/ID

### `/staff/schedule`

- Select or search a provider → see their day/week: time, patient, visit type
- Click an appointment → pre-visit summary panel: auto-generated narrative (built the moment the booking is confirmed) plus the raw pulled data underneath — recent encounters, labs, medication changes

### `/staff/slots`

- Room/provider/equipment utilization view for a given day
- Manual override (cancel/reschedule — triggers waitlist auto-fill)
- Waitlist monitor: open slots and who's currently been offered a match

### `/staff/prior-auth`

- Bookings flagged as needing prior auth, grouped by status: Needs Draft → Drafted (pending review) → Submitted → Approved / Denied
- Each entry shows a drafted justification pulled from the chart, editable
- Basic staff can edit; elevated staff can submit to the (mock) insurer

### `/staff/appeals`

- Denied prior-auths needing an appeal
- Each entry shows the matched clinical guideline excerpt, the chart justification, and a drafted appeal letter citing that guideline
- Basic staff can edit; elevated staff can submit

### `/staff/disputes`

- Read-only list of patient-submitted disputes and their flagged issues, for staff visibility

---

# How to Use

## As a Patient

### 1. Log in / Register

You land on the single login screen. Since you registered as a patient, the system links your account to a seeded patient record (fake chart history, insurance info, past visits — all synthetic).

### 2. You land on your Dashboard

This is your home base. At a glance: any upcoming appointment, any waitlist entries you're on, and two big buttons — **"Book an Appointment"** and **"Upload a Bill."** Nothing to do yet unless something's already in motion.

### 3. You need an appointment — click "Book an Appointment"

- Pick a reason (say, "Follow-up — knee pain")
- Pick a preferred date range (e.g. "next 2 weeks") and maybe a time preference
- The system shows you a list of actual open slots — behind the scenes it already checked which rooms, providers, and equipment line up, but you just see clean options like "Dr. Kim, Tuesday 2pm"
- You pick one → booked. Done.

### 4. What happens invisibly right after booking

You don't do anything here, but this is worth knowing: the system checks if your insurance is active, and whether this visit type needs prior authorization. If it does, it starts drafting that request in the background on the staff side. You'll just see the status update on your **My Appointments** page later (e.g. "Prior auth: pending").

### 5. If no slot matched what you wanted — Waitlist

Instead of giving up, you join the waitlist with your criteria (provider, type, date range, time range). You go check the **Waitlist** page anytime to see status. If a matching slot opens from someone else cancelling, you get notified and have a short window to **Confirm** or **Decline** — miss it, and it offers to the next person in line.

### 6. Checking on things — My Appointments

This is your read-only status page: date, provider, insurance status, and prior-auth status if relevant (pending / submitted / denied / appealed / approved). You're not doing anything here except watching progress.

### 7. After a visit, something looks off on your bill — Bill Upload

You upload a photo or PDF of the bill. The system reads it, pulls out each line item into a table, and flags anything suspicious (overcharge, duplicate, something not covered). Don't recognize a charge? Click it — you get a plain-language explanation of what that service actually was. If real issues are flagged, a dispute letter is already drafted for you — review and edit it, then submit it to clinic staff. It appears in their read-only Disputes page. You can also download a copy.

> **That's the full patient loop:** book → (system handles insurance/prior-auth quietly) → attend visit → dispute a bill if needed.

---

## As Staff

### 1. Log in

Same login screen, but your account is a staff account, so you land on the **Staff Dashboard** instead — the screenshot you showed me a minute ago.

### 2. Dashboard — your daily snapshot

Four stat cards tell you the shape of your day: today's appointments, pending prior-auths, pending appeals, open waitlist slots. Two search bars let you jump straight to a doctor or a patient.

### 3. A doctor asks "what's my day look like?" — Doctor Schedule

You search their name, and see their full day: time, patient, visit type. Click any appointment and a panel opens with the **pre-visit summary** — an AI-written short paragraph pulling together the patient's relevant history, recent labs, and med changes, with the raw data sitting right below it in case the doctor wants to double-check. This was generated automatically the moment the patient's booking was confirmed — nobody had to request it.

### 4. Managing the schedule itself — Slot Management

This is where you'd see room/provider/equipment utilization, and manually cancel or reschedule something if needed. If you cancel a slot, that's what triggers the waitlist auto-fill — the system finds the next matching waitlisted patient and sends them the offer automatically.

### 5. A prior-auth needs handling — Prior Auth Queue

This is grouped by status: **Needs Draft → Drafted → Submitted → Approved/Denied.** You open one, see the AI-drafted justification pulled from the patient's chart, and can edit it. If you're basic staff, that's as far as you go. If you're elevated staff, you'll also see an active **"Submit to Insurer"** button — basic staff sees it grayed out.

### 6. It got denied — Appeals Queue

Same idea, but the detail view shows three things stacked: the matched clinical guideline excerpt, the chart justification, and the AI-drafted appeal letter citing that guideline. Review, edit, and — if you're elevated — submit.

### 7. Checking on billing disputes — Disputes (view-only)

You can see disputes patients have submitted, along with the flagged issues and the letter they filed. The page is read-only for staff.

---

# Handling New Patients (No Existing Records)

Most of the plan assumes a patient already has history (Synthea-seeded charts, insurance on file). A genuinely new patient — no records, no insurance on file, no chart history — needs a few specific fallbacks so the automation doesn't break or produce empty/nonsensical output.

> **Scope:** This only needs special handling before a patient's first-ever appointment; from their first visit onward, they behave like any other patient in the system.

---

## Registration / Intake

New patients fill a short intake form at registration (existing seeded patients skip this): demographics, insurance info entered manually (provider, plan, policy number), and a free-text "reason for seeking care" / referral note. This creates a real but thin record — no encounters, labs, or medications yet.

## Insurance eligibility

There's no external insurer API to verify a new patient's self-entered insurance against, so it's marked **"Unverified — pending staff confirmation"** at intake, and a staff member manually flips it to **Active/Inactive** once checked. This mirrors what actually happens in real clinics with new patients (a manual verification call), rather than pretending the system can validate something it has no ground truth for.

## Prior authorization

Still works normally — the rule table only needs **visit type + insurance plan**, both captured at intake. What changes is the justification draft: with no chart history to pull from, Gemini drafts the justification from the **intake reason/referral note** instead. Same mechanism, thinner input.

## Pre-visit summary

If a patient has zero prior encounters, **skip the AI call entirely** and show a simple fallback message instead:

> "New patient — no prior chart history available. Reason for visit: [intake reason/referral note]."

This is more useful to the doctor than an empty or broken summary panel, and avoids wasting an AI call on nothing to summarize.

## Bills / disputes

No special handling needed — this only ever depends on a specific visit's bill, which works the same regardless of patient history.

---

## 5. Core Feature Logic — Rule vs. AI vs. Human Gate

| Feature                  | Rule (deterministic)                                       | AI (Gemini)                                                            | Human gate                                                               |
| ------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Slot matching            | Query rooms ∩ providers ∩ equipment ∩ patient window       | —                                                                      | none needed                                                              |
| Waitlist auto-fill       | FCFS match on cancellation, countdown cascade              | —                                                                      | patient confirms/declines                                                |
| Insurance eligibility    | Lookup stored coverage status                              | —                                                                      | none                                                                     |
| Prior-auth requirement   | Rule table: visit-type × plan → required?                  | —                                                                      | none                                                                     |
| Prior-auth justification | Rule table decides _if_ needed                             | Drafts justification text from chart data                              | Staff reviews, elevated staff submits                                    |
| Pre-visit summary        | Query last N encounters/labs/meds                          | Turns pulled data into narrative                                       | Doctor/staff verify against raw data shown alongside                     |
| Appeal guideline match   | Rule table: visit-type/diagnosis → guideline doc           | Drafts appeal citing the matched guideline                             | Staff reviews, elevated staff submits                                    |
| Bill line-item flagging  | Compare extracted items vs. recorded procedures + coverage | Extracts items from PDF/image, explains charges, drafts dispute letter | Patient reviews/edits, then submits it to staff; staff view is read-only |

Guiding principle: **rules decide _what_ goes into a decision or document; AI only handles turning that into readable text.** Every AI touchpoint stays explainable because it never makes the actual determination.

---

## 6. Tech Stack (PERN, Single App)

- **PostgreSQL** — relational fit: patients, appointments, rooms, providers, equipment, insurance, prior-auths, appeals, disputes are all linked, and slot booking needs transactional integrity so nothing double-books.
- **Express** — REST API, one route module per domain: appointments, waitlist, patients, prior-auth, appeals, billing, auth. Middleware enforces role checks per route.
- **React** — one app, one router (e.g. React Router), route guards/wrappers based on role from the auth context; shared component library used across both patient and staff views, no duplication needed.
- **Node.js** — backend runtime, plus a simple background job (e.g. `node-cron` or a lightweight queue) for: pre-visit summary generation on booking-confirm, and waitlist-offer countdown expiry.
- **Gemini API** — called server-side only. Used for: prior-auth justification drafts, pre-visit summary narratives, appeal letter drafts, bill line-item extraction (vision), plain-language charge explanations, dispute letter drafts.

### Suggested DB tables

`users`, `patients`, `providers`, `rooms`, `equipment`, `visit_types`, `appointments`, `waitlist_entries`, `insurance_plans`, `patient_coverage`, `prior_auth_rules`, `prior_authorizations`, `clinical_guidelines`, `appeals`, `bills`, `bill_line_items`, `dispute_letters`, `chart_notes`, `labs`, `medications`.

---

## 7. Data & Mocking Strategy

- **Synthea** (MITRE's open-source synthetic patient generator) for patients, encounters, labs, medications, conditions.
- **Insurance/coverage** — self-seeded table with active/inactive/expired statuses.
- **Prior-auth rule table** — team-defined (e.g. "MRI + any plan → required," "annual physical + any plan → not required").
- **Mock insurer** — a fake internal endpoint that always rejects, so the denial → appeal path is reliably demoable.
- **Clinical guidelines** — 2–3 curated real or realistic excerpts, tagged by visit-type/diagnosis.
- **Sample bills** — 5–10 hand-crafted or AI-generated bill PDFs/images with deliberate errors.

---

## 8. Non-Functional Notes

- Passwords hashed, sessions expire, HTTPS assumed even locally.
- Role checks enforced server-side, not just hidden UI.
- Simple "who changed this and when" trail on prior-auths and appeals — full audit logging is stretch, not MVP.
- No real patient data anywhere — everything is synthetic, sidestepping real privacy/compliance concerns for the project itself.

---

## 9. Handling New Patients (No Existing Records)

Most of the plan assumes a patient already has history (Synthea-seeded charts, insurance on file). A genuinely new patient — no records, no insurance on file, no chart history — needs a few specific fallbacks so the automation doesn't break or produce empty/nonsensical output. This only needs special handling **before a patient's first-ever appointment**; from their first visit onward, they behave like any other patient in the system.

**Registration / Intake**
New patients fill a short intake form at registration (existing seeded patients skip this): demographics, insurance info entered manually (provider, plan, policy number), and a free-text "reason for seeking care" / referral note. This creates a real but thin record — no encounters, labs, or medications yet.

**Insurance eligibility**
There's no external insurer API to verify a new patient's self-entered insurance against, so it's marked **"Unverified — pending staff confirmation"** at intake, and a staff member manually flips it to Active/Inactive once checked. This mirrors what actually happens in real clinics with new patients (a manual verification call), rather than pretending the system can validate something it has no ground truth for.

**Prior authorization**
Still works normally — the rule table only needs visit type + insurance plan, both captured at intake. What changes is the **justification draft**: with no chart history to pull from, Gemini drafts the justification from the intake reason/referral note instead. Same mechanism, thinner input.

**Pre-visit summary**
If a patient has zero prior encounters, skip the AI call entirely and show a simple fallback message instead: "New patient — no prior chart history available. Reason for visit: [intake reason/referral note]." This is more useful to the doctor than an empty or broken summary panel, and avoids wasting an AI call on nothing to summarize.

**Bills / disputes**
No special handling needed — this only ever depends on a specific visit's bill, which works the same regardless of patient history.

---

## 10. MVP vs. Stretch

**MVP** is everything above.

**Stretch**, if time allows later in the semester:

- Smarter mock insurer (random approve/deny with a reason, not always-reject)
- Real OCR fallback alongside AI-based bill reading
- Real email notifications for waitlist offers, not just in-app
- A true constraint-solver scheduling algorithm as an "advanced mode"
- A staff-facing analytics view (avg. time-to-prior-auth, dispute volume trends)
