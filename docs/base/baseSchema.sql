-- ============================================================
-- Healthcare Automation Platform — Revised Database Schema
-- Changes from original: added conditions table, added
-- coverage_pct to insurance_plans. Everything else unchanged.
-- ============================================================

CREATE TABLE patients (
    id                  SERIAL PRIMARY KEY,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    date_of_birth       DATE NOT NULL,
    gender              VARCHAR(20),
    contact_email       VARCHAR(255),
    contact_phone       VARCHAR(30),
    address             TEXT,
    synthea_patient_id  VARCHAR(100),
    is_new_patient      BOOLEAN NOT NULL DEFAULT TRUE,
    intake_reason_note  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id                  SERIAL PRIMARY KEY,
    email               VARCHAR(255) UNIQUE NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    role                VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'staff', 'staff_admin')),
    patient_id          INTEGER REFERENCES patients(id),
    provider_id         INTEGER,
    display_name        VARCHAR(150) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rooms (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    room_type           VARCHAR(50)
);

CREATE TABLE equipment (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    equipment_type      VARCHAR(50),
    room_id             INTEGER REFERENCES rooms(id)
);

CREATE TABLE providers (
    id                  SERIAL PRIMARY KEY,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    specialty           VARCHAR(100),
    npi_number          VARCHAR(20),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users
    ADD CONSTRAINT fk_users_provider FOREIGN KEY (provider_id) REFERENCES providers(id);

CREATE TABLE provider_availability (
    id                  SERIAL PRIMARY KEY,
    provider_id         INTEGER NOT NULL REFERENCES providers(id),
    day_of_week         SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time          TIME NOT NULL,
    end_time            TIME NOT NULL
);

CREATE TABLE visit_types (
    id                      SERIAL PRIMARY KEY,
    name                    VARCHAR(150) NOT NULL,
    description             TEXT,
    duration_minutes        INTEGER NOT NULL DEFAULT 30,
    required_specialty      VARCHAR(100),
    required_equipment_id   INTEGER REFERENCES equipment(id)
);

CREATE TABLE appointments (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(id),
    provider_id         INTEGER NOT NULL REFERENCES providers(id),
    room_id             INTEGER NOT NULL REFERENCES rooms(id),
    equipment_id        INTEGER REFERENCES equipment(id),
    visit_type_id       INTEGER NOT NULL REFERENCES visit_types(id),
    scheduled_start     TIMESTAMPTZ NOT NULL,
    scheduled_end       TIMESTAMPTZ NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    insurance_status    VARCHAR(20) NOT NULL DEFAULT 'unverified'
                            CHECK (insurance_status IN ('active', 'inactive', 'unverified')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE waitlist_entries (
    id                      SERIAL PRIMARY KEY,
    patient_id              INTEGER NOT NULL REFERENCES patients(id),
    provider_id             INTEGER REFERENCES providers(id),
    visit_type_id           INTEGER NOT NULL REFERENCES visit_types(id),
    preferred_date_start    DATE NOT NULL,
    preferred_date_end      DATE NOT NULL,
    preferred_time_start    TIME,
    preferred_time_end      TIME,
    status                  VARCHAR(20) NOT NULL DEFAULT 'waiting'
                                CHECK (status IN ('waiting', 'offered', 'confirmed', 'expired', 'cancelled')),
    offered_appointment_id  INTEGER REFERENCES appointments(id),
    offer_expires_at        TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CHANGED: added coverage_pct so patient responsibility can actually be
-- calculated against the fee_schedule for the reference-bill logic.
CREATE TABLE insurance_plans (
    id                  SERIAL PRIMARY KEY,
    payer_name          VARCHAR(150) NOT NULL,
    plan_name           VARCHAR(150) NOT NULL,
    plan_type           VARCHAR(50),
    coverage_pct        NUMERIC(5,2)
);

CREATE TABLE patient_coverage (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(id),
    insurance_plan_id   INTEGER NOT NULL REFERENCES insurance_plans(id),
    policy_number       VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'unverified'
                            CHECK (status IN ('active', 'inactive', 'unverified')),
    effective_date      DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prior_auth_rules (
    id                      SERIAL PRIMARY KEY,
    visit_type_id           INTEGER NOT NULL REFERENCES visit_types(id),
    insurance_plan_id       INTEGER REFERENCES insurance_plans(id),
    requires_prior_auth     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE prior_authorizations (
    id                  SERIAL PRIMARY KEY,
    appointment_id      INTEGER NOT NULL REFERENCES appointments(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'needs_draft'
                            CHECK (status IN ('needs_draft', 'drafted', 'submitted', 'approved', 'denied')),
    justification_text  TEXT,
    ai_generated_at     TIMESTAMPTZ,
    reviewed_by         INTEGER REFERENCES users(id),
    submitted_by        INTEGER REFERENCES users(id),
    submitted_at        TIMESTAMPTZ,
    decision_at         TIMESTAMPTZ,
    denial_reason       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clinical_guidelines (
    id                          SERIAL PRIMARY KEY,
    title                       VARCHAR(255) NOT NULL,
    excerpt_text                TEXT NOT NULL,
    applicable_visit_type_id    INTEGER REFERENCES visit_types(id),
    applicable_diagnosis_code   VARCHAR(50),
    source_citation             VARCHAR(255)
);

CREATE TABLE appeals (
    id                      SERIAL PRIMARY KEY,
    prior_authorization_id  INTEGER NOT NULL REFERENCES prior_authorizations(id),
    guideline_id            INTEGER REFERENCES clinical_guidelines(id),
    chart_justification_text TEXT,
    appeal_letter_text      TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'drafted'
                                CHECK (status IN ('drafted', 'submitted', 'approved', 'denied')),
    reviewed_by             INTEGER REFERENCES users(id),
    submitted_by            INTEGER REFERENCES users(id),
    submitted_at            TIMESTAMPTZ,
    decision_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NEW: structured diagnosis data, imported from Synthea's conditions.csv.
-- This is what clinical_guidelines.applicable_diagnosis_code actually
-- matches against, and what AI justification/summary drafting reads from,
-- instead of relying only on free-text chart_notes.
CREATE TABLE conditions (
    id                      SERIAL PRIMARY KEY,
    patient_id              INTEGER NOT NULL REFERENCES patients(id),
    condition_code          VARCHAR(20) NOT NULL,
    description             VARCHAR(255) NOT NULL,
    diagnosed_date          DATE,
    resolved_date           DATE,
    synthea_condition_id    VARCHAR(100)
);

CREATE TABLE chart_notes (
    id                      SERIAL PRIMARY KEY,
    patient_id              INTEGER NOT NULL REFERENCES patients(id),
    appointment_id          INTEGER REFERENCES appointments(id),
    provider_id             INTEGER REFERENCES providers(id),
    note_text               TEXT NOT NULL,
    encounter_date          TIMESTAMPTZ NOT NULL,
    synthea_encounter_id    VARCHAR(100)
);

CREATE TABLE labs (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(id),
    appointment_id      INTEGER REFERENCES appointments(id),
    test_name           VARCHAR(150) NOT NULL,
    result_value        VARCHAR(100),
    unit                VARCHAR(30),
    reference_range     VARCHAR(100),
    result_date         TIMESTAMPTZ NOT NULL
);

CREATE TABLE medications (
    id                      SERIAL PRIMARY KEY,
    patient_id              INTEGER NOT NULL REFERENCES patients(id),
    medication_name         VARCHAR(150) NOT NULL,
    dose                    VARCHAR(100),
    start_date              DATE NOT NULL,
    end_date                DATE,
    prescribing_provider_id INTEGER REFERENCES providers(id)
);

CREATE TABLE procedures_performed (
    id                  SERIAL PRIMARY KEY,
    appointment_id      INTEGER NOT NULL REFERENCES appointments(id),
    procedure_code      VARCHAR(20) NOT NULL,
    description         VARCHAR(255) NOT NULL,
    performed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fee_schedule (
    id                  SERIAL PRIMARY KEY,
    procedure_code      VARCHAR(20) UNIQUE NOT NULL,
    description         VARCHAR(255) NOT NULL,
    standard_cost       NUMERIC(10,2) NOT NULL
);

CREATE TABLE pre_visit_summaries (
    id                  SERIAL PRIMARY KEY,
    appointment_id      INTEGER UNIQUE NOT NULL REFERENCES appointments(id),
    summary_text        TEXT,
    raw_data_snapshot   JSONB,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bills (
    id                  SERIAL PRIMARY KEY,
    patient_id          INTEGER NOT NULL REFERENCES patients(id),
    appointment_id      INTEGER REFERENCES appointments(id),
    uploaded_file_url   VARCHAR(500) NOT NULL,
    upload_date         TIMESTAMPTZ NOT NULL DEFAULT now(),
    status              VARCHAR(20) NOT NULL DEFAULT 'processing'
                            CHECK (status IN ('processing', 'processed', 'disputed', 'resolved'))
);

CREATE TABLE bill_line_items (
    id                  SERIAL PRIMARY KEY,
    bill_id             INTEGER NOT NULL REFERENCES bills(id),
    procedure_code      VARCHAR(20),
    description         VARCHAR(255),
    amount              NUMERIC(10,2) NOT NULL,
    is_flagged          BOOLEAN NOT NULL DEFAULT FALSE,
    flag_reason         VARCHAR(255)
);

CREATE TABLE dispute_letters (
    id                  SERIAL PRIMARY KEY,
    bill_id             INTEGER UNIQUE NOT NULL REFERENCES bills(id),
    letter_text         TEXT NOT NULL,
    generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    patient_edited      BOOLEAN NOT NULL DEFAULT FALSE,
    downloaded_at       TIMESTAMPTZ
);

CREATE TABLE notifications (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    type                VARCHAR(50) NOT NULL,
    message             TEXT NOT NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id                  SERIAL PRIMARY KEY,
    entity_type         VARCHAR(50) NOT NULL,
    entity_id           INTEGER NOT NULL,
    action              VARCHAR(50) NOT NULL,
    changed_by          INTEGER REFERENCES users(id),
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_value           JSONB,
    new_value           JSONB
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_provider_time ON appointments(provider_id, scheduled_start);
CREATE INDEX idx_waitlist_status ON waitlist_entries(status);
CREATE INDEX idx_prior_auth_status ON prior_authorizations(status);
CREATE INDEX idx_appeals_status ON appeals(status);
CREATE INDEX idx_bills_patient ON bills(patient_id);
CREATE INDEX idx_chart_notes_patient ON chart_notes(patient_id);
CREATE INDEX idx_labs_patient ON labs(patient_id);
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_conditions_patient ON conditions(patient_id);