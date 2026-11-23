# JuanAccess

A patient and clinic-staff portal covering a clinic visit end to end: booking, coverage, pre-visit prep, and billing.

## Scheduling

**Procedure**:
A single billable test or service (e.g. CBC, chest X-ray, ECG, physical exam) with its own price.
_Avoid_: Test, service, exam (when meaning one item)

**Practitioner**:
A clinic professional who performs Procedures or sees patients, identified by their Profession.
_Avoid_: Provider, doctor (unless the Profession is physician)

**Profession**:
The kind of Practitioner — physician, nurse, medical technologist, radiologic technologist. Only physicians are booked for consults.
_Avoid_: Role (role means portal access level), specialty (a physician's field)

**Duty Schedule**:
The weekly recurring hours a Practitioner works.
_Avoid_: Availability, roster

## Patients

**Sex at Birth**:
The clinical sex (female or male), a required clinical field recorded at registration.
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
A physician Practitioner's profile: specialization, education, credentials, practice start year, background, and Consultation Fee. Shown to signed-in users from the booking page (the provider on each available slot opens it); never public.
_Avoid_: Provider bio, Doctor Directory (there is no public list of doctors)

**Price List**:
The public list of cash prices for every Procedure, in PHP. It names no doctors.
_Avoid_: Fee schedule (the internal source table), rates

**Consultation Fee**:
A physician's own price for a regular consult, shown to signed-in patients on each available booking slot and on the Doctor Profile.
_Avoid_: Professional fee, PF

## Privacy

**Consent Record**:
A patient's acceptance of a specific Privacy Policy version, with when they accepted it.
_Avoid_: Agreement, opt-in
