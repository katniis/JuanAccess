# Clinical-guideline seed research

Accessed 2026-10-12. This note supports the CSV seed files in `docs/data/`.

## Scope

The seed is a curated outpatient demo set of 42 rows covering the app’s imaging, cardiology, primary-care, laboratory, pediatric, and prenatal workflows. It is not a complete clinical library and is not insurance policy. Excerpts are short paraphrases rather than copied guideline text.

The database table only stores a title, excerpt, visit-type ID, diagnosis code, and source citation. Age, sex, pregnancy status, evidence grade, recommendation strength, and contraindications therefore remain in the title or excerpt where needed. Those limits should be addressed before production use.

## Philippine sources

- [DOH Omnibus Health Guidelines](https://doh.gov.ph/dpcb/omnibus-health-guidelines) and the [DOH National Practice Guidelines Platform](https://doh-gabay.telehealth.ph/guideline.php?type=ohg): primary-care, adult, child, and life-stage guidance, including preventive care, respiratory disease, tuberculosis, pregnancy, and common outpatient conditions.
- [DOH Guidelines for Community-Acquired Pneumonia](https://caro.doh.gov.ph/wp-content/uploads/2018/04/PNF-Manual-for-Primary-Healthcare.pdf): chest radiography guidance when the clinical picture supports suspected pneumonia.
- [DOH National Tuberculosis Program](https://ntp.doh.gov.ph/guidelines/): tuberculosis screening, diagnostic pathways, and referral considerations.
- [Philippine Society for Microbiology and Infectious Diseases CPGs](https://psmid.org/category/cpg/): community-acquired pneumonia, acute infectious diarrhea, adult immunization, and infectious-disease guidance.
- [Philippine Rheumatology Association CPGs](https://www.rheumatologyph.org/cpg): knee osteoarthritis, gout, osteoporosis, and fragility-fracture prevention.
- [Philippine Society of Nephrology CPG index](https://psn.org.ph/education/clinical-practice-guideline-and-protocols/): hypertension, dyslipidemia, kidney disease, and related specialty guidance.
- [Philippine Diabetes Association / Diabetes Philippines CPG](https://www.diabetesphilippines.org/HOME/pdf/clinical_practice_guidelines_draft.pdf): diabetes, prediabetes, and diabetes in pregnancy.
- [Philippine College of Chest Physicians COPD guidance](https://www.philchest.org.ph/PCCP/COPD.html) and its published asthma consensus report: asthma, COPD, spirometry, and respiratory follow-up.
- [Philippine Academy of Family Physicians CPG compendium](https://thepafp.org/compendium-of-doh-approved-clinic-practice-guidelines/): periodic health examination, mental-health primary care, screening, and family-medicine pathways.
- [Philippine Lipid and Atherosclerosis Society guidance](https://www.philippinelipid.org.ph/guidelines.html): dyslipidemia and cardiovascular-risk management.

## International fallbacks

The following rows are explicitly labeled `International guideline; not Philippine CPG` in `clinical_guidelines.csv` because no directly applicable Philippine CPG was identified during this pass:

- Suspected meniscal/internal derangement MRI: [AAOS Acute Isolated Meniscal Pathology guideline](https://www.aaos.org/quality/quality-programs/acute-isolated-meniscal-pathology/). This is an international fallback and is not Philippine policy.
- GERD: [American College of Gastroenterology guideline](https://gi.org/guideline/diagnosis-and-management-of-gastroesophageal-reflux-disease/).
- Low-back pain: [American College of Physicians guideline index](https://www.acponline.org/clinical-information/guidelines).
- Migraine, dermatitis, and anxiety: international primary-care guidance used only as a clearly marked fallback.
- Chest-pain and atrial-fibrillation ECG assessment: international cardiology guidance used only as a clearly marked fallback.

These rows must not be presented as Philippine policy. They provide demo coverage while a local source is unavailable.

## Applicability limits

- The CSV contains synthetic IDs and internal reference costs. PhilHealth publishes package-specific fixed fees, including selected ECG, imaging, and laboratory services, in [Circular PC2025-0020](https://www.philhealth.gov.ph/circulars/2025/PC2025-0020.pdf); those package rates are not a universal private-clinic, HMO, or hospital fee schedule, so the imported `fee_schedule` values remain illustrative until the clinic supplies its own contract rates.
- Diagnosis codes are ICD-10-style values matching the hand-built condition records. Synthea’s raw `conditions.csv` uses SNOMED-CT codes and is not silently converted here.
- Guideline text is decision support only. It does not replace examination, clinician judgment, local referral pathways, emergency triage, or patient-specific contraindication review.
- The pediatric and prenatal rows identify their population in the title or excerpt because the existing table has no population columns.
- The meniscal MRI row is explicitly international and not Philippine authorization policy. The chest row is the Philippine DOH paraphrase and does not recommend an X-ray for every cough.
