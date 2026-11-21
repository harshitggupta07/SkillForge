/**
 * SkillForge Legal and Regulatory Documentation Module
 * Formally structured Privacy Policy and Terms and Conditions
 *
 * Exports:
 * - renderPrivacyPolicy(container)
 * - renderTerms(container)
 * - initPrivacy()
 * - initTerms()
 *
 * Compliant with statutory mandates including the Digital Personal Data Protection Act, 2023 (DPDPA 2023).
 */

// =============================================================================
// SHARED STYLES AND LAYOUT HELPERS
// =============================================================================

/**
 * Escapes plain text for safe HTML rendering.
 * @param {*} value - Raw string value.
 * @returns {string} Sanitized string.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates the common navigation header for legal documents.
 * @param {'privacy'|'terms'} activeDoc - Identifier for active legal document.
 * @returns {string} HTML string for navigation header.
 */
function renderLegalHeader(activeDoc) {
  return `
    <div style="
      background-color: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      padding: 16px 24px;
      margin-bottom: 32px;
    ">
      <div style="
        max-width: 960px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
      ">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px;">
            SkillForge Compliance and Legal Directorate
          </div>
          <div style="font-size: 14px; font-weight: 600; color: #1E293B;">
            Governance Documentation Repository
          </div>
        </div>

        <div style="display: flex; gap: 8px;">
          <a
            href="#/privacy-policy"
            id="nav-link-privacy"
            style="
              display: inline-block;
              padding: 6px 14px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 500;
              text-decoration: none;
              background-color: ${activeDoc === 'privacy' ? '#1E293B' : '#F5F6F8'};
              color: ${activeDoc === 'privacy' ? '#FFFFFF' : '#334155'};
              border: 1px solid ${activeDoc === 'privacy' ? '#1E293B' : '#CBD5E1'};
              transition: all 150ms ease-in-out;
            "
          >
            Privacy Policy
          </a>
          <a
            href="#/terms-and-conditions"
            id="nav-link-terms"
            style="
              display: inline-block;
              padding: 6px 14px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 500;
              text-decoration: none;
              background-color: ${activeDoc === 'terms' ? '#1E293B' : '#F5F6F8'};
              color: ${activeDoc === 'terms' ? '#FFFFFF' : '#334155'};
              border: 1px solid ${activeDoc === 'terms' ? '#1E293B' : '#CBD5E1'};
              transition: all 150ms ease-in-out;
            "
          >
            Terms and Conditions
          </a>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates the common document footer with contact channels.
 * @param {'privacy'|'terms'} activeDoc - Identifier for active legal document.
 * @returns {string} HTML string for document footer.
 */
function renderLegalFooter(activeDoc) {
  const contactEmail = activeDoc === 'privacy' ? 'support@skillforge.dev' : 'legal@skillforge.dev';

  return `
    <div style="
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #E2E8F0;
      font-size: 13px;
      color: #64748B;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    ">
      <div>
        Direct legal inquiries and notices to:
        <a href="mailto:${contactEmail}" style="color: #3B82F6; text-decoration: none; font-weight: 500;">
          ${contactEmail}
        </a>
      </div>
      <div style="font-size: 12px; color: #64748B;">
        Document revision 2.4 (Published January 2025). All rights reserved.
      </div>
    </div>
  `;
}

// =============================================================================
// PRIVACY POLICY IMPLEMENTATION (#/privacy-policy)
// =============================================================================

/**
 * Primary export: renders the formal Privacy Policy document into container.
 * @param {HTMLElement} container - Target host DOM element.
 */
export function renderPrivacyPolicy(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="legal-document-wrapper" style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F5F6F8;
      color: #1E293B;
      min-height: 100vh;
      padding-bottom: 64px;
      box-sizing: border-box;
    ">
      ${renderLegalHeader('privacy')}

      <div style="max-width: 960px; margin: 0 auto; padding: 0 24px;">
        <!-- Document Card -->
        <div style="
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 40px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        ">
          <!-- Document Header -->
          <div style="border-bottom: 2px solid #1E293B; padding-bottom: 20px; margin-bottom: 32px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
              <div>
                <h1 style="font-size: 26px; font-weight: 700; color: #1E293B; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                  SkillForge Privacy Policy
                </h1>
                <div style="font-size: 13px; color: #64748B;">
                  Statutory Data Protection, Client-Side Handling, and Processing Specifications
                </div>
              </div>
              <div style="text-align: right;">
                <span style="
                  background-color: #EBF5F0;
                  color: #2D6A4F;
                  padding: 4px 10px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: 600;
                  display: inline-block;
                ">
                  In Effect: January 2025
                </span>
                <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Version 2.4</div>
              </div>
            </div>
          </div>

          <!-- Document Body -->
          <div style="font-size: 14px; line-height: 1.7; color: #334155;">

            <!-- Section 1 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                1. Scope and Organizational Commitment
              </h2>
              <p style="margin: 0 0 12px 0;">
                This Privacy Policy establishes the technical, operational, and regulatory standards applied by SkillForge ("the Platform", "we", "us", or "our") concerning the collection, local processing, storage, and retention of personal and diagnostic technical data. This policy applies to all registered candidates, engineering professionals, students, instructors, and system administrators interacting with our assessment runtime.
              </p>
              <p style="margin: 0;">
                SkillForge is designed upon privacy-by-design principles, prioritizing decentralized local client-side processing over centralized data accumulation. By accessing the Platform, you acknowledge the data handling practices set forth herein.
              </p>
            </section>

            <!-- Section 2 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                2. Categories of Account Data Collected
              </h2>
              <p style="margin: 0 0 12px 0;">
                When establishing an authenticated account or participating in diagnostic benchmarking, the Platform processes the following distinct categories of personal data:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Identity and Registration Attributes:</strong> Full legal name, verified email address, cryptographic password hashes (PBKDF2 or SHA-256), assigned system role (student, employee, trainer, administrator), and unique account identifiers.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Professional and Educational Baseline Data:</strong> Self-reported current job title, target engineering role, verified years of software development experience, declared academic degree qualifications, and institution names.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Technical Skill Self-Declarations:</strong> Categorized programming languages, application frameworks, cloud platforms, and tooling competencies indicated during onboarding or profile editing.
                </li>
                <li>
                  <strong>Session Telemetry:</strong> Account creation timestamps, last active access timestamps, and authenticated session state markers.
                </li>
              </ul>
            </section>

            <!-- Section 3 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                3. Curriculum Vitae (CV) Handling and Local Processing Architecture
              </h2>
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 14px 16px; margin-bottom: 14px;">
                <strong style="color: #1E293B; display: block; margin-bottom: 4px;">Local-First Processing Principle</strong>
                <span>Any resume, curriculum vitae, or portfolio document submitted to SkillForge is parsed and processed directly within your browser runtime environment. Document binaries are never transmitted to unencrypted centralized file servers without affirmative authorization.</span>
              </div>
              <p style="margin: 0 0 12px 0;">
                The specific technical safeguards governing CV file handling include:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>In-Browser Parsing Engine:</strong> Text extraction, semantic entity recognition, regex pattern matching, and section boundary detection execute entirely on your device via client-side JavaScript.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Client-Side Document Storage:</strong> Extracted candidate attributes (such as identified technical proficiencies, work history segments, and education history) are stored in client-side IndexedDB databases within the local browser sandbox.
                </li>
                <li>
                  <strong>Raw File Preservation:</strong> Original document file blobs, when retained for user review, remain isolated within browser-managed object stores under the direct control of the user.
                </li>
              </ul>
            </section>

            <!-- Section 4 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                4. Diagnostic Assessment and Evaluation Telemetry
              </h2>
              <p style="margin: 0 0 12px 0;">
                Participation in diagnostic evaluations generates analytical records necessary to formulate technical competency profiles and training curricula. These records encompass:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Evaluation Matrices:</strong> Selected diagnostic questions, submitted answer indices, duration spent per assessment section, and test completion timestamps.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Calculated Performance Scores:</strong> Algorithmic domain scores, percentile rankings calibrated against role benchmarks, identified technical deficiencies, and proficiency tier assignments.
                </li>
                <li>
                  <strong>Historical Progression Indices:</strong> Longitudinal comparative records tracking diagnostic improvement across multiple testing sessions.
                </li>
              </ul>
            </section>

            <!-- Section 5 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                5. Third-Party Large Language Model (LLM) Integration
              </h2>
              <p style="margin: 0 0 12px 0;">
                SkillForge provides optional features that interface with external Large Language Model APIs (such as OpenAI or Anthropic endpoints) for dynamic test item authoring and contextual syllabus summarization. Where these features are engaged:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>PII Sanitization:</strong> All candidate personal identifiers (including candidate names, email addresses, phone numbers, and organizational affiliations) are programmatically redacted prior to any payload dispatch.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Zero Data Retention Mandate:</strong> API requests to upstream providers are configured under commercial agreements prohibiting the retention of payload data for foundational model training or continuous indexing.
                </li>
                <li>
                  <strong>User Agency:</strong> Utilization of external LLM services is optional. Candidates and administrators may utilize deterministic algorithmic evaluation modes without transmitting data to external AI models.
                </li>
              </ul>
            </section>

            <!-- Section 6 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                6. Data Storage in IndexedDB and Local Persistence
              </h2>
              <p style="margin: 0 0 12px 0;">
                All operational state, including user records, CV profiles, assessment banks, course catalog indexes, and market trend models, is persisted using the browser's native IndexedDB storage subsystem (database namespace: <code>SkillForgeDB</code>).
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Sandbox Isolation:</strong> Stored data is physically bounded by the browser's Same-Origin Policy and cannot be accessed by external origins or unauthenticated browser tabs.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Physical Location:</strong> Data resides physically upon the candidate's local workstation or terminal device.
                </li>
                <li>
                  <strong>Autonomous Deletion:</strong> Users retain the unilateral ability to completely eradicate all stored records at any time by utilizing browser cache clearing commands or within-app data purges.
                </li>
              </ul>
            </section>

            <!-- Section 7 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                7. Enforceable Rights of the Data Principal
              </h2>
              <p style="margin: 0 0 12px 0;">
                SkillForge guarantees all users comprehensive data rights, enforceable through self-service profile controls or formal contact with our support directorate:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Right of Access and Inspection:</strong> Candidates may inspect their complete stored profile, CV extraction records, and diagnostic attempt histories at any time.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Right of Rectification:</strong> Users have the right to correct inaccurate, outdated, or incomplete technical details and role targets.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Right of Erasure ("Right to be Forgotten"):</strong> Users may execute immediate deactivation or complete permanent deletion of their account records.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Right to Data Portability:</strong> Users may download their complete assessment telemetry and profile dossiers in standardized RFC 4180 CSV or JSON formats.
                </li>
                <li>
                  <strong>Right to Withdraw Consent:</strong> Where processing relies upon user consent, that consent may be revoked at any time with immediate forward effect.
                </li>
              </ul>
            </section>

            <!-- Section 8 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                8. Compliance with Digital Personal Data Protection Act, 2023 (DPDPA 2023)
              </h2>
              <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 4px; padding: 14px 16px; margin-bottom: 14px;">
                <strong style="color: #1E293B; display: block; margin-bottom: 4px;">Statutory Indian Legal Reference</strong>
                <span>SkillForge operations strictly adhere to the obligations set forth in the Digital Personal Data Protection Act, 2023 (DPDPA 2023) of India, governing the lawful processing of digital personal data.</span>
              </div>
              <p style="margin: 0 0 12px 0;">
                In accordance with DPDPA 2023 statutory obligations:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Fiduciary Classification:</strong> SkillForge functions as a Data Fiduciary regarding user authentication credentials and system configuration, recognizing registered individuals as Data Principals.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Notice Mandate:</strong> This Privacy Policy serves as statutory notice under Section 5 of DPDPA 2023, specifying the exact nature of data processed and the precise technical evaluation purposes served.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Purpose Limitation:</strong> Personal data is processed exclusively for technical diagnostic assessment, curriculum calibration, and career benchmarking. Data is never repurposed, sold, or shared for behavioral advertising.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Security Safeguards:</strong> In accordance with Section 8(5) of DPDPA 2023, SkillForge implements robust technical safeguards to prevent unauthorized data access, leakage, or security breaches.
                </li>
                <li>
                  <strong>Statutory Grievance Redressal:</strong> Data Principals possess an absolute right under Section 13 of DPDPA 2023 to register grievances regarding personal data handling, with guaranteed response timelines not exceeding thirty business days.
                </li>
              </ul>
            </section>

            <!-- Section 9 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                9. Data Security and Technical Protections
              </h2>
              <p style="margin: 0 0 12px 0;">
                SkillForge maintains rigorous technical controls to protect records against unauthorized interception, destruction, or compromise:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Cryptographic Hashing:</strong> Passwords are never stored in plaintext format; standard salted SHA-256 or PBKDF2 hashing routines protect authentication tokens.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Input Sanitization:</strong> All user inputs and text extractions undergo strict programmatic HTML entity escaping to prevent cross-site scripting (XSS) and injection vectors.
                </li>
                <li>
                  <strong>Transport Layer Security:</strong> All external network calls execute exclusively over encrypted HTTPS/TLS 1.3 channels.
                </li>
              </ul>
            </section>

            <!-- Section 10 -->
            <section>
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                10. Supervisory Contact and Grievance Officer
              </h2>
              <p style="margin: 0 0 12px 0;">
                For formal privacy inquiries, statutory DPDPA notices, data erasure requests, or technical data audit requests, contact our designated Grievance Redressal Officer:
              </p>
              <div style="
                background-color: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 4px;
                padding: 16px;
                font-size: 13px;
                color: #334155;
              ">
                <div style="font-weight: 600; color: #1E293B; margin-bottom: 4px;">Data Protection and Grievance Officer</div>
                <div>SkillForge Engineering Governance</div>
                <div style="margin-top: 6px;">
                  Official Email:
                  <a href="mailto:support@skillforge.dev" style="color: #3B82F6; text-decoration: none; font-weight: 500;">
                    support@skillforge.dev
                  </a>
                </div>
                <div style="margin-top: 4px; color: #64748B;">Response Window: Maximum 30 business days from receipt.</div>
              </div>
            </section>

          </div>

          ${renderLegalFooter('privacy')}
        </div>
      </div>
    </div>
  `;
}

// =============================================================================
// TERMS AND CONDITIONS IMPLEMENTATION (#/terms-and-conditions)
// =============================================================================

/**
 * Primary export: renders the formal Terms and Conditions document into container.
 * @param {HTMLElement} container - Target host DOM element.
 */
export function renderTerms(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="legal-document-wrapper" style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F5F6F8;
      color: #1E293B;
      min-height: 100vh;
      padding-bottom: 64px;
      box-sizing: border-box;
    ">
      ${renderLegalHeader('terms')}

      <div style="max-width: 960px; margin: 0 auto; padding: 0 24px;">
        <!-- Document Card -->
        <div style="
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 40px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        ">
          <!-- Document Header -->
          <div style="border-bottom: 2px solid #1E293B; padding-bottom: 20px; margin-bottom: 32px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
              <div>
                <h1 style="font-size: 26px; font-weight: 700; color: #1E293B; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                  SkillForge Terms and Conditions
                </h1>
                <div style="font-size: 13px; color: #64748B;">
                  Master Platform Agreement, Acceptable Use Standards, and Disclaimers
                </div>
              </div>
              <div style="text-align: right;">
                <span style="
                  background-color: #EBF5F0;
                  color: #2D6A4F;
                  padding: 4px 10px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: 600;
                  display: inline-block;
                ">
                  In Effect: January 2025
                </span>
                <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Version 2.4</div>
              </div>
            </div>
          </div>

          <!-- Document Body -->
          <div style="font-size: 14px; line-height: 1.7; color: #334155;">

            <!-- Section 1 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                1. Acceptance of Terms and Binding Agreement
              </h2>
              <p style="margin: 0 0 12px 0;">
                By navigating to, registering an account upon, or utilizing the services provided by SkillForge ("the Platform", "the Service", "we", "us", or "our"), you ("User", "Candidate", or "Subscriber") agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these terms in their entirety, you must terminate access to the Platform immediately.
              </p>
              <p style="margin: 0;">
                These Terms constitute a legally enforceable agreement between you and SkillForge. Use of the Platform by an individual on behalf of an enterprise or educational institution constitutes a representation that the individual possesses legal authority to bind that entity to these provisions.
              </p>
            </section>

            <!-- Section 2 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                2. Platform Description and Technical Capabilities
              </h2>
              <p style="margin: 0 0 12px 0;">
                SkillForge is an enterprise engineering diagnostic and curriculum planning system. The Platform provides:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  Standardized technical diagnostic examinations calibrated against industry role benchmarks.
                </li>
                <li style="margin-bottom: 6px;">
                  Client-side automated parsing of engineering resumes and curriculum vitae.
                </li>
                <li style="margin-bottom: 6px;">
                  Skill gap identification algorithms matching candidate proficiencies against role requirements.
                </li>
                <li style="margin-bottom: 6px;">
                  Curated technical course catalog indexing external training resources.
                </li>
                <li>
                  Real-time engineering market demand telemetry and longitudinal tracking.
                </li>
              </ul>
            </section>

            <!-- Section 3 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                3. User Account Governance and Role Access
              </h2>
              <p style="margin: 0 0 12px 0;">
                Access to Platform features is governed by strict Role-Based Access Control (RBAC). The following standards govern account ownership:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Accuracy of Registration:</strong> Users must submit authentic, verifiable contact credentials. The establishment of deceptive, fraudulent, or impersonating accounts is strictly prohibited.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Credential Confidentiality:</strong> Users bear exclusive responsibility for maintaining the confidentiality of their authentication credentials. Any activity executed under an authenticated session is legally attributable to the registered account holder.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Role Boundaries:</strong> Standard candidate accounts (students, employees) may not access administrative or trainer consoles. Any unauthorized probe, bypass attempt, or security boundary escalation constitutes grounds for immediate, permanent account termination.
                </li>
                <li>
                  <strong>Deactivation Authority:</strong> Platform administrators maintain the unilateral right to suspend or deactivate accounts found in violation of these Terms or engaged in malicious scanning.
                </li>
              </ul>
            </section>

            <!-- Section 4 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                4. Curriculum Vitae (CV) Upload and Parsing Terms
              </h2>
              <p style="margin: 0 0 12px 0;">
                When submitting a resume or curriculum vitae for diagnostic parsing:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Ownership Warranty:</strong> You represent and warrant that you are the lawful owner of the submitted document or have received express written authorization from the data subject to submit it for analysis.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Proprietary Information Disclaimer:</strong> Users must not upload documents containing trade secrets, confidential source code, classified governmental data, or materials subject to active non-disclosure agreements with current or former employers.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Local Execution Acknowledgment:</strong> You acknowledge that parsing algorithms execute locally within browser memory. While SkillForge utilizes advanced heuristic regex algorithms, SkillForge does not warrant that non-standard document formatting will be parsed without minor omission or typographical variance.
                </li>
                <li>
                  <strong>Non-Retention:</strong> SkillForge does not claim intellectual property rights over any candidate resume or work history submitted to the Platform.
                </li>
              </ul>
            </section>

            <!-- Section 5 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                5. Technical Assessment and Diagnostic Disclaimer
              </h2>
              <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 4px; padding: 14px 16px; margin-bottom: 14px;">
                <strong style="color: #B45309; display: block; margin-bottom: 4px;">Notice of Diagnostic Non-Certification</strong>
                <span style="color: #92400E;">Evaluations, percentile ranks, and readiness indicators generated by SkillForge represent diagnostic estimation benchmarks only. They do not constitute accredited professional certifications or guarantees of employment.</span>
              </div>
              <p style="margin: 0 0 12px 0;">
                Users explicitly acknowledge and agree to the following limitations:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>No Guarantee of Hiring:</strong> Attaining a high competence score or completing recommended training modules does not guarantee recruitment, interview selection, employment offers, or salary increases with any enterprise.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Standardized Estimation:</strong> Diagnostic questions evaluate conceptual and practical engineering knowledge according to generalized industry standards. Actual commercial performance involves multidimensional factors beyond automated testing.
                </li>
                <li>
                  <strong>No Official Licensing:</strong> SkillForge is not an accredited collegiate institution, licensing board, or statutory certifying body.
                </li>
              </ul>
            </section>

            <!-- Section 6 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                6. Artificial Intelligence and Algorithmic Content Notice
              </h2>
              <p style="margin: 0 0 12px 0;">
                Certain assessment items, skill gap analyses, and curriculum recommendations may be generated or enhanced through algorithmic modeling or Large Language Models (LLMs).
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Potential Inaccuracies:</strong> Generative models and heuristic engines may occasionally produce inaccurate question formulations, technical rationales, or outdated library syntax. Users should exercise professional technical judgment.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Human Oversight:</strong> Educational institutions and enterprise trainers utilizing the Assessment Bank are advised to conduct editorial review of newly added diagnostic items prior to mandatory candidate deployment.
                </li>
                <li>
                  <strong>Algorithmic Neutrality:</strong> Benchmarking models evaluate technical competence based on defined taxonomic criteria without regard to demographic identity.
                </li>
              </ul>
            </section>

            <!-- Section 7 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                7. Course Recommendations and External Catalog Disclaimer
              </h2>
              <p style="margin: 0 0 12px 0;">
                The SkillForge Course Catalog aggregates references, durations, difficulty ratings, and hyperlinks to third-party educational providers (such as Frontend Masters, Coursera, official language documentations, and independent academies).
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Independent Educational Providers:</strong> External courses are owned and administered by third-party publishers. SkillForge exercises no operational control over external course syllabi, instructor qualifications, access pricing, or availability.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Absence of Endorsement:</strong> Inclusion of a course within our recommendation catalog does not constitute an official endorsement, joint venture, or warranty by SkillForge.
                </li>
                <li>
                  <strong>Commercial Independence:</strong> SkillForge does not collect tuition or enrollment fees on behalf of third-party course providers unless explicitly designated under enterprise procurement agreements.
                </li>
              </ul>
            </section>

            <!-- Section 8 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                8. Third-Party Hyperlinks and External Services
              </h2>
              <p style="margin: 0 0 12px 0;">
                The Platform may contain hyperlinks to external sites, repositories, or technical documentations not operated by SkillForge.
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  SkillForge accepts no liability or responsibility for the privacy practices, technical integrity, or content of third-party domains.
                </li>
                <li>
                  Users access external websites at their own risk and are subject to the independent terms and privacy conditions of those destination platforms.
                </li>
              </ul>
            </section>

            <!-- Section 9 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                9. Intellectual Property Rights and Proprietary Assets
              </h2>
              <p style="margin: 0 0 12px 0;">
                All elements of the SkillForge platform, including but not limited to the software architecture, user interface source code, diagnostic question taxonomies, database schemas, scoring heuristics, graphic layouts, and technical documentation, are the exclusive intellectual property of SkillForge and its licensors.
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  <strong>Limited License:</strong> Users receive a revocable, non-exclusive, non-sublicensable, and non-transferable license to utilize the Platform strictly for personal career development or authorized institutional training.
                </li>
                <li style="margin-bottom: 6px;">
                  <strong>Prohibited Exploitation:</strong> Users shall not decompile, reverse engineer, scrape, automatedly harvest, redistribute, or resell the assessment questions, taxonomy data, or underlying codebase without prior written authorization.
                </li>
                <li>
                  <strong>Trademarks:</strong> "SkillForge" and associated logos are proprietary trademarks. No right or license is granted to utilize these marks without express authorization.
                </li>
              </ul>
            </section>

            <!-- Section 10 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                10. Limitation of Liability and Disclaimer of Warranties
              </h2>
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 14px 16px; margin-bottom: 14px;">
                <strong style="color: #1E293B; display: block; margin-bottom: 4px;">"As Is" Statutory Warranty Disclaimer</strong>
                <span>The SkillForge platform is provided on an "as is" and "as available" basis without warranties of any variety, whether express, statutory, or implied, including merchantability, fitness for a particular purpose, or uninterrupted availability.</span>
              </div>
              <p style="margin: 0 0 12px 0;">
                To the maximum extent permissible under applicable law:
              </p>
              <ul style="margin: 0 0 12px 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">
                  In no event shall SkillForge, its directors, developers, or affiliates be liable for indirect, incidental, punitive, exemplary, or consequential damages, including loss of profits, loss of data, career interruption, or employment rejection.
                </li>
                <li>
                  The aggregate cumulative liability of SkillForge for all claims arising out of or relating to the Service shall not exceed the amount paid by the user to SkillForge in the twelve months preceding the dispute, or fifty US dollars ($50.00), whichever is lesser.
                </li>
              </ul>
            </section>

            <!-- Section 11 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                11. Governing Law, Jurisdiction, and Dispute Resolution
              </h2>
              <p style="margin: 0 0 12px 0;">
                These Terms and Conditions shall be interpreted, construed, and enforced in accordance with the substantive laws governing enterprise software licensing, without giving effect to conflict of law principles.
              </p>
              <p style="margin: 0 0 12px 0;">
                Any controversy, dispute, or claim arising out of or relating to these Terms or breach thereof shall be resolved first through good-faith executive negotiation. If unresolved after thirty business days, the dispute shall be submitted to the exclusive jurisdiction of the competent courts of competent jurisdiction.
              </p>
              <p style="margin: 0;">
                To the extent permitted by applicable law, all claims must be resolved on an individual basis. Class action proceedings, collective arbitrations, or consolidated claims are strictly waived.
              </p>
            </section>

            <!-- Section 12 -->
            <section style="margin-bottom: 32px;">
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                12. Modifications to the Service and Terms
              </h2>
              <p style="margin: 0 0 12px 0;">
                SkillForge reserves the right to modify, amend, or replace these Terms at any time. Material revisions will be posted directly within this legal documentation repository with an updated effective revision date.
              </p>
              <p style="margin: 0;">
                Continued access or utilization of the Platform following publication of amended Terms constitutes binding acceptance of all revised stipulations.
              </p>
            </section>

            <!-- Section 13 -->
            <section>
              <h2 style="font-size: 17px; font-weight: 700; color: #1E293B; margin: 0 0 12px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
                13. Legal Department Contact Channels
              </h2>
              <p style="margin: 0 0 12px 0;">
                For formal contract notices, intellectual property infringement reports, or corporate governance inquiries:
              </p>
              <div style="
                background-color: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 4px;
                padding: 16px;
                font-size: 13px;
                color: #334155;
              ">
                <div style="font-weight: 600; color: #1E293B; margin-bottom: 4px;">Legal and Corporate Affairs Directorate</div>
                <div>SkillForge Platform Operations</div>
                <div style="margin-top: 6px;">
                  Official Email:
                  <a href="mailto:legal@skillforge.dev" style="color: #3B82F6; text-decoration: none; font-weight: 500;">
                    legal@skillforge.dev
                  </a>
                </div>
                <div style="margin-top: 4px; color: #64748B;">Formal service of notices accepted electronically via the official contact channel.</div>
              </div>
            </section>

          </div>

          ${renderLegalFooter('terms')}
        </div>
      </div>
    </div>
  `;
}

// =============================================================================
// INITIALIZATION LIFECYCLE ROUTINES
// =============================================================================

/**
 * Initializes interactive behaviors for the Privacy Policy route (#/privacy-policy).
 * Sets up document scroll position and navigation listeners.
 */
export function initPrivacy() {
  if (typeof window !== 'undefined') {
    window.scrollTo(0, 0);
  }
}

/**
 * Initializes interactive behaviors for the Terms and Conditions route (#/terms-and-conditions).
 * Sets up document scroll position and navigation listeners.
 */
export function initTerms() {
  if (typeof window !== 'undefined') {
    window.scrollTo(0, 0);
  }
}

export default {
  renderPrivacyPolicy,
  renderTerms,
  initPrivacy,
  initTerms
};
