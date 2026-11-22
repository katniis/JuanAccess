# JuanAccess

A patient and clinic-staff portal covering a clinic visit end to end: booking, coverage, pre-visit prep, and billing.

## Scheduling

**Procedure**:
A single billable test or service (e.g. CBC, chest X-ray, ECG, physical exam) with its own price and its own offered days and capacity.
_Avoid_: Test, service, exam (when meaning one item)

**APE Package**:
A named bundle of Procedures sold together as an Annual Physical Examination, with its own Package Price.
_Avoid_: APE appointment, checkup bundle

**Arrival Window**:
The block of time on a chosen date (e.g. 7–10 AM) in which an APE patient arrives and moves through the Procedures in a station queue.
_Avoid_: Slot (slots are timed and tied to one Practitioner)

**Practitioner**:
A clinic professional who performs Procedures or sees patients, identified by their Profession.
_Avoid_: Provider, doctor (unless the Profession is physician)

**Profession**:
The kind of Practitioner — physician, nurse, medical technologist, radiologic technologist — which determines which Procedures they may perform.
_Avoid_: Role (role means portal access level), specialty (a physician's field)

**Duty Schedule**:
The weekly recurring hours a Practitioner works, adjusted by date-specific overrides for leave or swaps.
_Avoid_: Availability, roster

**Station Assignment**:
The day-of choice, made by staff, of which on-duty Practitioner performs a Procedure for an APE patient.
_Avoid_: Doctor assignment

**APE Booking**:
An Appointment for an APE Package on a date and Arrival Window, with no Practitioner, room, or timed slot until the day itself; it has no waitlist.
_Avoid_: APE slot

## Patients

**Sex at Birth**:
The clinical sex (female or male) used to pick sex-specific Procedures and reference ranges.
_Avoid_: Gender (that is the patient's self-described identity, recorded separately)

## Staff Access

**Second Factor**:
The rotating 6-digit code from a staff member's authenticator app, required with their password to sign in to the staff portal.
_Avoid_: PIN, staff ID code, OTP (when meaning emailed codes)

**Recovery Code**:
A single-use code shown once at Second Factor setup, used to sign in when the authenticator app is lost.
_Avoid_: Backup PIN

**Enrolment Code**:
A one-time code a staff_admin issues so a staff member can start Second Factor setup; it expires after 24 hours and issuing a new one cancels the old.
_Avoid_: Invite code, PIN

## Cancellations

**Cancellation Reason**:
The category chosen (from a fixed list for patients, a separate list for staff) when an appointment is cancelled, with required free text when the category is "Other".
_Avoid_: Cancel note, comment

**Cancellation Letter**:
An AI-drafted, human-edited message about a cancellation: from staff to the patient (reason, apology, other dates) or from the patient to the clinic (polished from their rough reason).
_Avoid_: Cancellation email, notice

## Transparency

**Doctor Profile**:
The public record of a physician Practitioner: specialization, education, credentials, practice start year, and background.
_Avoid_: Provider bio

**Doctor Directory**:
The public list of Doctor Profiles patients can browse before booking.
_Avoid_: Meet Our Doctors (UI label only)

**Price List**:
The public list of cash prices for every Procedure and APE Package, in PHP.
_Avoid_: Fee schedule (the internal source table), rates

**Consultation Fee**:
A physician's own price for a regular consult, shown on their Doctor Profile and the Price List.
_Avoid_: Professional fee, PF

**Package Price**:
The price of an APE Package as a whole, shown next to the itemized sum of its Procedures.
_Avoid_: Bundle discount

## Privacy

**Consent Record**:
A patient's acceptance of a specific Privacy Policy version, with when they accepted it.
_Avoid_: Agreement, opt-in
