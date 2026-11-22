import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../contexts/useAuth.js';
import { getHomePathForRole } from '../utils/authRoutes.js';

// Keep in sync with PRIVACY_POLICY_VERSION in server/src/utils/privacyPolicy.js.
export const PRIVACY_POLICY_VERSION = '2026-11-22-draft';

// Approved policy wording: present it differently, never edit it here.
const SECTIONS = [
   {
      id: 'what-we-collect',
      title: 'What we collect',
      body: (
         <ul>
            <li>
               Account details: email address, password (stored only as a
               one-way hash), and display name.
            </li>
            <li>
               Profile details: name, date of birth, gender, phone number, and
               address.
            </li>
            <li>
               Insurance details: insurer, plan, policy and member numbers, and
               coverage dates.
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
      ),
   },
   {
      id: 'why-we-use-it',
      title: 'Why we use it',
      body: (
         <>
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
         </>
      ),
   },
   {
      id: 'ai-processing',
      title: 'AI processing by Google Gemini',
      body: (
         <p>
            Some drafts, such as pre-visit summaries, prior authorization
            letters, and bill dispute letters, are generated with Google’s
            Gemini AI service. To do this, the relevant parts of your record are
            sent to Google for processing. AI output is always a draft: clinic
            staff or you review and edit it before it is used. Gemini does not
            make decisions about your care, coverage, or bills.
         </p>
      ),
   },
   {
      id: 'storage-and-access',
      title: 'Where it is stored and who can see it',
      body: (
         <ul>
            <li>
               Your records are stored in the clinic’s database. Uploaded bills
               may be stored with Supabase Storage.
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
      ),
   },
   {
      id: 'how-long',
      title: 'How long we keep it',
      body: (
         <p>
            We keep medical and billing records for as long as the law and
            clinic policy require, then dispose of them securely.
         </p>
      ),
   },
   {
      id: 'your-rights',
      title: 'Your rights',
      body: (
         <p>
            Under RA 10173 you have the right to be informed, to access, to
            object, to correct, to erasure or blocking, to data portability, to
            file a complaint, and to damages. You may withdraw consent, but this
            may limit what the portal can do for you.
         </p>
      ),
   },
   {
      id: 'contact',
      title: 'Contact',
      body: (
         <p>
            To exercise your rights or ask a question, contact the clinic’s Data
            Protection Officer at the clinic front desk. You may also file a
            complaint with the National Privacy Commission.
         </p>
      ),
   },
   {
      id: 'changes',
      title: 'Changes to this policy',
      body: (
         <p>
            When this policy changes, we will ask you to read and accept the new
            version the next time you sign in.
         </p>
      ),
   },
];

function openSection(id) {
   const section = document.getElementById(id);
   if (section?.tagName !== 'DETAILS') return;
   section.open = true;
   section.scrollIntoView({ block: 'start' });
   section.querySelector('summary').focus({ preventScroll: true });
}

function PrivacyPolicy() {
   const navigate = useNavigate();
   const location = useLocation();
   const { user } = useAuth();
   const articleRef = useRef(null);
   // React Router stores the in-app history index; 0 or missing means this
   // tab started here (direct URL or a new tab from the consent pop-up).
   const hasHistory = window.history.state?.idx > 0;
   const fallbackPath = user ? getHomePathForRole(user.role) : '/login';
   const backLabel = hasHistory
      ? 'Back'
      : user
        ? 'Back to portal'
        : 'Back to sign in';

   function goBack() {
      if (window.history.state?.idx > 0) navigate(-1);
      else navigate(fallbackPath, { replace: true });
   }

   function setAllOpen(open) {
      articleRef.current
         ?.querySelectorAll('details')
         .forEach((section) => (section.open = open));
   }

   // Deep links such as /privacy#your-rights open and show that section.
   useEffect(() => {
      if (location.hash) openSection(location.hash.slice(1));
   }, [location.hash]);

   return (
      <main className="privacy-policy privacy-page">
         <header className="privacy-page-topbar">
            <button
               className="button button-light"
               type="button"
               onClick={goBack}>
               <Icon name="chevron-left" />
               {backLabel}
            </button>
            <Link className="auth-brand-mark" to="/" aria-label="JuanAccess">
               <img src="/juanaccess-logo.svg" alt="JuanAccess" />
            </Link>
         </header>

         <div className="privacy-page-layout">
            <nav className="privacy-page-toc" aria-label="Policy sections">
               <h2>On this page</h2>
               <ol>
                  {SECTIONS.map((section) => (
                     <li key={section.id}>
                        <a
                           href={`#${section.id}`}
                           onClick={(event) => {
                              // Keep the URL and history as is so Back still leaves the page.
                              event.preventDefault();
                              openSection(section.id);
                           }}>
                           {section.title}
                        </a>
                     </li>
                  ))}
               </ol>
            </nav>

            <article ref={articleRef}>
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
                  JuanAccess is the clinic’s patient and staff portal. This
                  policy explains how we handle your personal and sensitive
                  personal information under the Data Privacy Act of 2012
                  (Republic Act No. 10173), its Implementing Rules and
                  Regulations, and issuances of the National Privacy Commission
                  (NPC).
               </p>

               <section
                  className="privacy-page-glance"
                  aria-labelledby="privacy-glance-title">
                  <h2 id="privacy-glance-title">At a glance</h2>
                  <ul>
                     <li>
                        We collect your account, profile, insurance, and health
                        details, plus records of your activity in the portal.
                     </li>
                     <li>
                        We use them for your appointments, insurance checks,
                        pre-visit summaries, and bill reviews, and to keep the
                        portal secure.
                     </li>
                     <li>
                        Your records are stored in the clinic’s database. Staff
                        see them only through signed-in accounts, and changes
                        are logged.
                     </li>
                     <li>
                        Some drafts are generated with Google’s Gemini AI.
                        Clinic staff or you review every draft, and Gemini does
                        not make decisions about your care, coverage, or bills.
                     </li>
                     <li>We do not sell your information.</li>
                     <li>
                        You have rights under RA 10173. Ask the clinic’s Data
                        Protection Officer at the front desk.
                     </li>
                  </ul>
               </section>

               <div className="privacy-page-controls">
                  <h2>Full policy</h2>
                  <div className="button-row">
                     <button
                        className="button button-outline button-small"
                        type="button"
                        onClick={() => setAllOpen(true)}>
                        Expand all
                     </button>
                     <button
                        className="button button-quiet button-small"
                        type="button"
                        onClick={() => setAllOpen(false)}>
                        Collapse all
                     </button>
                  </div>
               </div>

               {SECTIONS.map((section, index) => (
                  <details
                     key={section.id}
                     id={section.id}
                     className="privacy-page-section"
                     open={index === 0}>
                     <summary>
                        <span
                           className="privacy-page-section-number"
                           aria-hidden="true">
                           {index + 1}
                        </span>
                        <h2>{section.title}</h2>
                        <Icon
                           name="chevron-down"
                           className="privacy-page-section-chevron"
                        />
                     </summary>
                     <div className="privacy-page-section-body">
                        {section.body}
                     </div>
                  </details>
               ))}
            </article>
         </div>
      </main>
   );
}

export default PrivacyPolicy;
