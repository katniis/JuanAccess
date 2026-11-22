import { Link } from 'react-router-dom';

// Keep in sync with PRIVACY_POLICY_VERSION in server/src/utils/privacyPolicy.js.
export const PRIVACY_POLICY_VERSION = '2026-11-22-draft';

function PrivacyPolicy() {
   return (
      <main className="privacy-policy">
         <header className="auth-brand">
            <Link className="auth-brand-mark" to="/" aria-label="JuanAccess">
               <img src="/juanaccess-logo.svg" alt="JuanAccess" />
            </Link>
         </header>

         <article>
            <h1>Privacy Policy</h1>
            <p className="privacy-policy-version">
               Version {PRIVACY_POLICY_VERSION}
            </p>
            <p className="privacy-policy-draft" role="note">
               <strong>Draft for review.</strong> This text has not yet been
               reviewed or approved by the clinic’s Data Protection Officer
               (DPO). It may change before it takes effect.
            </p>

            <p>
               JuanAccess is the clinic’s patient and staff portal. This policy
               explains how we handle your personal and sensitive personal
               information under the Data Privacy Act of 2012 (Republic Act No.
               10173), its Implementing Rules and Regulations, and issuances of
               the National Privacy Commission (NPC).
            </p>

            <h2>What we collect</h2>
            <ul>
               <li>
                  Account details: email address, password (stored only as a
                  one-way hash), and display name.
               </li>
               <li>
                  Profile details: name, date of birth, gender, phone number,
                  and address.
               </li>
               <li>
                  Insurance details: insurer, plan, policy and member numbers,
                  and coverage dates.
               </li>
               <li>
                  Health information: appointments, visit reasons, chart notes,
                  conditions, medications, lab results, procedures, prior
                  authorizations, and bills you upload.
               </li>
               <li>
                  Activity records: sign-ins, changes made to your records, and
                  notifications sent to you.
               </li>
            </ul>

            <h2>Why we use it</h2>
            <ul>
               <li>To book, change, and remind you about appointments.</li>
               <li>
                  To check insurance coverage and request prior authorizations.
               </li>
               <li>
                  To prepare pre-visit summaries for the clinicians who see you.
               </li>
               <li>To review bills and prepare dispute letters with you.</li>
               <li>
                  To keep the portal secure and to meet our legal obligations.
               </li>
            </ul>
            <p>
               We process health information because it is needed for your
               medical treatment and with your consent, as allowed by Sections
               12 and 13 of RA 10173.
            </p>

            <h2>AI processing by Google Gemini</h2>
            <p>
               Some drafts, such as pre-visit summaries, prior authorization
               letters, and bill dispute letters, are generated with Google’s
               Gemini AI service. To do this, the relevant parts of your record
               are sent to Google for processing. AI output is always a draft:
               clinic staff or you review and edit it before it is used. Gemini
               does not make decisions about your care, coverage, or bills.
            </p>

            <h2>Where it is stored and who can see it</h2>
            <ul>
               <li>
                  Your records are stored in the clinic’s database. Uploaded
                  bills may be stored with Supabase Storage.
               </li>
               <li>Emails to you are sent through the Resend email service.</li>
               <li>
                  Clinic staff can see your records only through signed-in staff
                  accounts, and changes to your records are logged.
               </li>
               <li>
                  Insurance details are shared with your insurer when we check
                  coverage or request prior authorization.
               </li>
               <li>We do not sell your information.</li>
            </ul>

            <h2>How long we keep it</h2>
            <p>
               We keep medical and billing records for as long as the law and
               clinic policy require, then dispose of them securely.
            </p>

            <h2>Your rights</h2>
            <p>
               Under RA 10173 you have the right to be informed, to access, to
               object, to correct, to erasure or blocking, to data portability,
               to file a complaint, and to damages. You may withdraw consent,
               but this may limit what the portal can do for you.
            </p>

            <h2>Contact</h2>
            <p>
               To exercise your rights or ask a question, contact the clinic’s
               Data Protection Officer at the clinic front desk. You may also
               file a complaint with the National Privacy Commission.
            </p>

            <h2>Changes to this policy</h2>
            <p>
               When this policy changes, we will ask you to read and accept the
               new version the next time you sign in.
            </p>
         </article>
      </main>
   );
}

export default PrivacyPolicy;
