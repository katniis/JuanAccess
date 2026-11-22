import 'dotenv/config';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const plan = {
   payerName: 'PhilHealth',
   planName: 'YAKAP (Yaman ng Kalusugan Program)',
   planType: 'government',
};

const guideline = {
   title: 'Quality Standards on the Diagnosis and Management of Dengue (Adult and Children)',
   sourceCitation: 'PhilHealth Circular No. 2026-0009 (2026)',
   excerptText:
      'Assessment uses medical history, physical examination, and indicated investigations. A complete blood count with platelet count is important during acute dengue; warning signs or severe disease require timely hospital care.',
};
const dengueDiagnosisCodes = ['A90', 'A91'];

const sql = postgres(databaseUrl, { prepare: false });

try {
   const result = await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(0, hashtext('ph-public-reference-data-v1'))`;

      const matchingPlans = await tx`
         select id from insurance_plans
         where lower(trim(payer_name)) = lower(${plan.payerName})
            and lower(trim(plan_name)) = lower(${plan.planName})
         order by id
      `;
      if (matchingPlans.length > 1) {
         throw new Error(
            'Duplicate PhilHealth YAKAP plan identities already exist',
         );
      }
      const [insurancePlan] = matchingPlans.length
         ? await tx`
              update insurance_plans
              set payer_name = ${plan.payerName},
                  plan_name = ${plan.planName},
                  plan_type = ${plan.planType},
                  coverage_pct = null
              where id = ${matchingPlans[0].id}
              returning id
           `
         : await tx`
              insert into insurance_plans (payer_name, plan_name, plan_type, coverage_pct)
              values (${plan.payerName}, ${plan.planName}, ${plan.planType}, null)
              on conflict (payer_name, plan_name) do update
                 set plan_type = excluded.plan_type,
                     coverage_pct = null
              returning id
           `;

      const visitTypeId = null;
      const clinicalGuidelineIds = [];

      for (const diagnosisCode of dengueDiagnosisCodes) {
         const matchingGuidelines = await tx`
            select id from clinical_guidelines
            where lower(trim(title)) = lower(${guideline.title})
               and source_citation = ${guideline.sourceCitation}
               and applicable_visit_type_id is null
               and applicable_diagnosis_code = ${diagnosisCode}
            order by id
         `;
         if (matchingGuidelines.length > 1) {
            throw new Error(
               `Duplicate dengue guideline identity already exists for ${diagnosisCode}`,
            );
         }

         const [clinicalGuideline] = matchingGuidelines.length
            ? await tx`
                 update clinical_guidelines
                 set excerpt_text = ${guideline.excerptText}
                 where id = ${matchingGuidelines[0].id}
                 returning id
              `
            : await tx`
                 insert into clinical_guidelines (
                    title,
                    excerpt_text,
                    applicable_visit_type_id,
                    applicable_diagnosis_code,
                    source_citation
                 ) values (
                    ${guideline.title},
                    ${guideline.excerptText},
                    ${visitTypeId},
                    ${diagnosisCode},
                    ${guideline.sourceCitation}
                 )
                 returning id
              `;
         clinicalGuidelineIds.push(clinicalGuideline.id);

         const guidelineDuplicates = await tx`
            select count(*)::int as count
            from clinical_guidelines
            where lower(trim(title)) = lower(${guideline.title})
               and source_citation = ${guideline.sourceCitation}
               and applicable_visit_type_id is null
               and applicable_diagnosis_code = ${diagnosisCode}
         `;
         if (guidelineDuplicates[0].count !== 1) {
            throw new Error(
               `Dengue guideline identity is not unique for ${diagnosisCode}`,
            );
         }
      }

      const planDuplicates = await tx`
         select count(*)::int as count
         from insurance_plans
         where lower(trim(payer_name)) = lower(${plan.payerName})
            and lower(trim(plan_name)) = lower(${plan.planName})
      `;
      if (planDuplicates[0].count !== 1) {
         throw new Error('PhilHealth YAKAP plan identity is not unique');
      }

      return {
         insurancePlanId: insurancePlan.id,
         clinicalGuidelineIds,
      };
   });

   console.log(
      JSON.stringify({
         seeded: ['insurance_plans', 'clinical_guidelines'],
         insurancePlanId: result.insurancePlanId,
         clinicalGuidelineIds: result.clinicalGuidelineIds,
         dengueDiagnosisCodes,
         duplicateCheck: 'passed',
      }),
   );
} finally {
   await sql.end();
}
