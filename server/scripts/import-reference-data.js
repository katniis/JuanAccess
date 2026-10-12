import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../..',
);
const dataDir = path.join(root, 'docs', 'data');
const replaceDemo = process.argv.includes('--replace-demo');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is required');

function parseCsv(text) {
   const rows = [];
   let row = [];
   let value = '';
   let quoted = false;
   for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (char === '"' && quoted && next === '"') {
         value += '"';
         index += 1;
      } else if (char === '"') {
         quoted = !quoted;
      } else if (char === ',' && !quoted) {
         row.push(value);
         value = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
         if (char === '\r' && next === '\n') index += 1;
         row.push(value);
         if (row.some((cell) => cell !== '')) rows.push(row);
         row = [];
         value = '';
      } else {
         value += char;
      }
   }
   if (value || row.length) {
      row.push(value);
      rows.push(row);
   }
   const [headers, ...data] = rows;
   return data.map((cells) =>
      Object.fromEntries(
         headers.map((header, index) => [header, cells[index] ?? '']),
      ),
   );
}

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;
const normalize = (value) => (value === '' ? null : value);
const asNumber = (value) => (value === '' ? null : Number(value));
const asBoolean = (value) => value?.toLowerCase() === 'true';

const files = [
   ['rooms.csv', 'rooms', ['id', 'name', 'room_type']],
   ['equipment.csv', 'equipment', ['id', 'name', 'equipment_type', 'room_id']],
   [
      'providers.csv',
      'providers',
      ['id', 'first_name', 'last_name', 'specialty', 'npi_number'],
   ],
   [
      'provider_availability.csv',
      'provider_availability',
      ['id', 'provider_id', 'day_of_week', 'start_time', 'end_time'],
   ],
   [
      'visit_types.csv',
      'visit_types',
      [
         'id',
         'name',
         'description',
         'duration_minutes',
         'required_specialty',
         'required_equipment_id',
      ],
   ],
   [
      'insurance_plans.csv',
      'insurance_plans',
      ['id', 'payer_name', 'plan_name', 'plan_type', 'coverage_pct'],
   ],
   [
      'prior_auth_rules.csv',
      'prior_auth_rules',
      ['id', 'visit_type_id', 'insurance_plan_id', 'requires_prior_auth'],
   ],
   [
      'clinical_guidelines.csv',
      'clinical_guidelines',
      [
         'id',
         'title',
         'applicable_visit_type_id',
         'applicable_diagnosis_code',
         'source_citation',
         'excerpt_text',
      ],
   ],
   [
      'fee_schedule.csv',
      'fee_schedule',
      ['id', 'procedure_code', 'description', 'standard_cost'],
   ],
];

const integerColumns = new Set([
   'id',
   'room_id',
   'provider_id',
   'day_of_week',
   'duration_minutes',
   'required_equipment_id',
   'visit_type_id',
   'insurance_plan_id',
   'applicable_visit_type_id',
]);
const booleanColumns = new Set(['requires_prior_auth']);
const numericColumns = new Set(['coverage_pct', 'standard_cost']);

function valueFor(column, value) {
   if (integerColumns.has(column)) return asNumber(value);
   if (booleanColumns.has(column)) return asBoolean(value);
   if (numericColumns.has(column)) return normalize(value);
   return normalize(value);
}

async function assertDemoFingerprint(sql) {
   const expectedCounts = {
      patients: 1,
      users: 4,
      providers: 5,
      equipment: 3,
      rooms: 4,
      visit_types: 6,
      appointments: 1,
      provider_availability: 21,
      notifications: 0,
      waitlist_entries: 0,
      insurance_plans: 1,
      patient_coverage: 1,
      prior_auth_rules: 6,
      prior_authorizations: 1,
      clinical_guidelines: 3,
      appeals: 0,
      conditions: 0,
      chart_notes: 0,
      labs: 0,
      medications: 0,
      audit_log: 0,
      procedures_performed: 0,
      fee_schedule: 0,
      pre_visit_summaries: 0,
      bills: 0,
      bill_line_items: 0,
      dispute_letters: 0,
   };
   for (const [table, expected] of Object.entries(expectedCounts)) {
      const [{ count }] = await sql.unsafe(
         `select count(*)::int as count from ${quoteIdentifier(table)}`,
      );
      if (count !== expected) {
         throw new Error(
            `Refusing demo reset: ${table} has ${count} rows; expected ${expected}.`,
         );
      }
   }
   const users = await sql`select email from users order by email`;
   const expectedUsers = [
      'billing.admin@clinic.test',
      'dr.torres@clinic.test',
      'front.desk@clinic.test',
      'juan.delacruz@test.com',
   ];
   if (users.map((user) => user.email).join('|') !== expectedUsers.join('|')) {
      throw new Error(
         'Refusing demo reset: user emails do not match the demo fingerprint.',
      );
   }
}

async function importFile(sql, fileName, table, columns) {
   const text = await fs.readFile(path.join(dataDir, fileName), 'utf8');
   const rows = parseCsv(text);
   const quotedTable = quoteIdentifier(table);
   const quotedColumns = columns.map(quoteIdentifier).join(', ');
   const updateColumns = columns
      .filter((column) => column !== 'id')
      .map(
         (column) =>
            `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`,
      )
      .join(', ');

   for (const row of rows) {
      const values = columns.map((column) =>
         valueFor(column, row[column] ?? ''),
      );
      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      await sql.unsafe(
         `insert into ${quotedTable} (${quotedColumns}) values (${placeholders}) on conflict ("id") do update set ${updateColumns}`,
         values,
      );
   }
}

async function resetAndImport() {
   const sql = postgres(databaseUrl, { prepare: false });
   try {
      await sql.begin(async (tx) => {
         if (replaceDemo) await assertDemoFingerprint(tx);
         if (replaceDemo) {
            await tx.unsafe(`
               truncate table
                  notifications, waitlist_entries, appeals, prior_authorizations,
                  patient_coverage, appointments, conditions, chart_notes, labs,
                  medications, patients, users, prior_auth_rules, clinical_guidelines,
                  provider_availability, providers, visit_types, equipment, rooms,
                  insurance_plans, audit_log, procedures_performed, fee_schedule,
                  pre_visit_summaries, bills, bill_line_items, dispute_letters
               restart identity cascade
            `);
         }
         for (const [fileName, table, columns] of files) {
            await importFile(tx, fileName, table, columns);
         }
         for (const [, table] of files) {
            await tx.unsafe(
               `select setval(pg_get_serial_sequence('${table}', 'id'), coalesce((select max(id) from ${quoteIdentifier(table)}), 1), true)`,
            );
         }
      });
   } finally {
      await sql.end();
   }
}

await resetAndImport();
console.log(
   replaceDemo
      ? 'Demo data replaced and reference CSVs imported.'
      : 'Reference CSVs imported.',
);
