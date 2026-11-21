/**
 * SkillForge - Profile Onboarding and CV Telemetry Interface
 * Module: js/pages/onboarding.js
 *
 * Provides a structured 3-step technical onboarding workflow:
 * Step 1: Profile setup for IT Employees and IT Students
 * Step 2: Technical CV document upload, drag-and-drop parsing, and telemetry extraction
 * Step 3: Competency review and assessment routing
 */

import { apiRouter } from '../../api/api-router.js';
import { getCurrentUser, getToken, setSession } from '../auth.js';

// Ensure API request interceptor is installed for browser fetch operations
if (typeof window !== 'undefined' && apiRouter && !apiRouter.installed) {
  apiRouter.install();
}

/**
 * Standard technical engineering roles matching the platform benchmark catalog.
 */
const BENCHMARK_ROLES = [
  'Junior Frontend Dev',
  'Senior Frontend Dev',
  'Junior Backend Dev',
  'Senior Backend Dev',
  'Full Stack Dev',
  'DevOps Engineer',
  'Cloud Architect',
  'Data Engineer',
  'ML Engineer',
  'AI/LLM Engineer',
  'Security Engineer',
  'Mobile Developer',
  'Engineering Manager'
];

/**
 * Internal state for the onboarding workflow.
 */
const state = {
  currentStep: 1,
  userType: 'employee',
  user: null,
  token: null,
  profile: {
    current_role: '',
    company: '',
    experience_years: 3,
    tech_stack: '',
    target_role: 'Junior Frontend Dev',
    degree: '',
    university: '',
    grad_year: new Date().getFullYear(),
    specialization: ''
  },
  cvFile: null,
  parsedProfile: null,
  isUploading: false,
  uploadError: null,
  validationError: null
};

/**
 * Resolves or creates an active authentication session.
 * Fallbacks to default engineering profile if session is uninitialized.
 *
 * @returns {string} Valid authentication Bearer token.
 */
function ensureAuthSession() {
  let token = getToken();
  let user = getCurrentUser();

  if (!token || !user) {
    const fallbackUser = {
      id: 'usr_employee_003',
      name: 'David Chen',
      email: 'dev.employee@skillforge.dev',
      role: 'employee',
      user_type: 'employee',
      current_role: 'Backend Dev',
      target_role: 'Senior Backend Dev',
      experience_years: 4,
      tech_stack: ['Python', 'Django', 'PostgreSQL', 'Docker', 'Redis'],
      education: 'B.S. in Computer Science, San Jose State University'
    };

    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = {
      ...fallbackUser,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    };
    const payloadEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const signature = btoa(`skillforge_sig_${fallbackUser.id}`);
    token = `${header}.${payloadEncoded}.${signature}`;

    setSession(fallbackUser, token);
    state.user = fallbackUser;
    state.token = token;
  } else {
    state.user = user;
    state.token = token;
  }

  return token;
}

/**
 * Sanitizes unsafe HTML special characters to prevent injection.
 *
 * @param {string} str - Raw input text.
 * @returns {string} Escaped string.
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a file size in bytes into human-readable metric units (KB or MB).
 *
 * @param {number} bytes - Raw byte length.
 * @returns {string} Formatted size string.
 */
function formatFileSize(bytes) {
  const num = Number(bytes) || 0;
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Generates markup for the step progress indicator.
 *
 * @param {number} activeStep - Currently active step number (1, 2, or 3).
 * @returns {string} Step indicator HTML string.
 */
function renderStepIndicator(activeStep) {
  const steps = [
    { number: 1, title: 'Profile Setup', subtitle: 'Role and target attributes' },
    { number: 2, title: 'CV Upload', subtitle: 'Technical taxonomy extraction' },
    { number: 3, title: 'Review', subtitle: 'Competency and assessment routing' }
  ];

  const itemsHtml = steps.map((s) => {
    let statusClass = 'step-upcoming';
    let badgeText = String(s.number);

    if (s.number < activeStep) {
      statusClass = 'step-completed';
      badgeText = '[v]';
    } else if (s.number === activeStep) {
      statusClass = 'step-active';
    }

    return `
      <div class="onboarding-step-item ${statusClass}">
        <div class="step-badge">${badgeText}</div>
        <div class="step-meta">
          <span class="step-title">${escapeHtml(s.title)}</span>
          <span class="step-subtitle">${escapeHtml(s.subtitle)}</span>
        </div>
      </div>
    `;
  }).join('<div class="step-connector"></div>');

  return `
    <div class="onboarding-stepper-container mb-3" aria-label="Onboarding Progress">
      ${itemsHtml}
    </div>
  `;
}

/**
 * Generates options markup for the target role selector.
 *
 * @param {string} selectedRole - The role currently selected.
 * @returns {string} HTML option tags.
 */
function renderRoleOptions(selectedRole) {
  return BENCHMARK_ROLES.map((role) => {
    const isSelected = (role.toLowerCase() === (selectedRole || '').toLowerCase()) ? 'selected' : '';
    return `<option value="${escapeHtml(role)}" ${isSelected}>${escapeHtml(role)}</option>`;
  }).join('');
}

/**
 * Renders the Step 1 (Profile) view markup.
 *
 * @returns {string} Step 1 HTML string.
 */
function renderStep1() {
  const p = state.profile;
  const isEmployee = state.userType === 'employee';

  return `
    <div class="card onboarding-card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Step 1: Technical Profile Setup</h2>
          <p class="card-subtitle">Configure your engineering specialization, experience background, and benchmark target.</p>
        </div>
      </div>

      <div class="card-body">
        ${state.validationError ? `
          <div class="alert alert-danger mb-2" role="alert">
            <span>${escapeHtml(state.validationError)}</span>
          </div>
        ` : ''}

        <!-- User Type Toggle -->
        <div class="form-group mb-3">
          <label class="form-label form-label-required">Profile Classification</label>
          <div class="btn-group-toggle" role="group" aria-label="Profile Classification Toggle">
            <button
              type="button"
              class="toggle-btn ${isEmployee ? 'active' : ''}"
              id="toggle-user-employee"
              data-type="employee"
            >
              IT Employee
            </button>
            <button
              type="button"
              class="toggle-btn ${!isEmployee ? 'active' : ''}"
              id="toggle-user-student"
              data-type="student"
            >
              IT Student
            </button>
          </div>
          <span class="form-text">Select your current professional standing to customize required profile attributes.</span>
        </div>

        <form id="onboarding-profile-form" novalidate>
          <!-- IT Employee Field Group -->
          <div id="employee-fields" class="${isEmployee ? '' : 'd-none'}">
            <div class="grid-2 mb-2">
              <div class="form-group">
                <label for="emp-current-role" class="form-label form-label-required">Current Engineering Role</label>
                <input
                  type="text"
                  id="emp-current-role"
                  name="current_role"
                  class="form-control"
                  placeholder="e.g. Backend Dev, Systems Engineer"
                  value="${escapeHtml(p.current_role || '')}"
                  required
                >
              </div>

              <div class="form-group">
                <label for="emp-company" class="form-label form-label-required">Current Employer or Organization</label>
                <input
                  type="text"
                  id="emp-company"
                  name="company"
                  class="form-control"
                  placeholder="e.g. Acme Technologies, Apex Systems"
                  value="${escapeHtml(p.company || '')}"
                  required
                >
              </div>
            </div>

            <div class="grid-2 mb-2">
              <div class="form-group">
                <label for="emp-experience-years" class="form-label form-label-required">Professional Experience (Years)</label>
                <input
                  type="number"
                  id="emp-experience-years"
                  name="experience_years"
                  class="form-control"
                  min="0"
                  max="40"
                  placeholder="e.g. 4"
                  value="${escapeHtml(String(p.experience_years ?? 3))}"
                  required
                >
              </div>

              <div class="form-group">
                <label for="emp-target-role" class="form-label form-label-required">Target Career Benchmark Role</label>
                <select id="emp-target-role" name="target_role" class="form-select" required>
                  ${renderRoleOptions(p.target_role)}
                </select>
              </div>
            </div>

            <div class="form-group mb-2">
              <label for="emp-tech-stack" class="form-label form-label-required">Core Technical Stack</label>
              <input
                type="text"
                id="emp-tech-stack"
                name="tech_stack"
                class="form-control"
                placeholder="e.g. Python, Django, PostgreSQL, Docker, Redis"
                value="${escapeHtml(Array.isArray(p.tech_stack) ? p.tech_stack.join(', ') : (p.tech_stack || ''))}"
                required
              >
              <span class="form-text">Comma-separated list of programming languages, frameworks, databases, and runtime tools.</span>
            </div>
          </div>

          <!-- IT Student Field Group -->
          <div id="student-fields" class="${!isEmployee ? '' : 'd-none'}">
            <div class="grid-2 mb-2">
              <div class="form-group">
                <label for="stu-degree" class="form-label form-label-required">Academic Degree Program</label>
                <input
                  type="text"
                  id="stu-degree"
                  name="degree"
                  class="form-control"
                  placeholder="e.g. B.S. in Computer Science"
                  value="${escapeHtml(p.degree || '')}"
                  required
                >
              </div>

              <div class="form-group">
                <label for="stu-university" class="form-label form-label-required">University or Academic Institution</label>
                <input
                  type="text"
                  id="stu-university"
                  name="university"
                  class="form-control"
                  placeholder="e.g. Georgia Institute of Technology"
                  value="${escapeHtml(p.university || '')}"
                  required
                >
              </div>
            </div>

            <div class="grid-2 mb-2">
              <div class="form-group">
                <label for="stu-grad-year" class="form-label form-label-required">Expected Graduation Year</label>
                <input
                  type="number"
                  id="stu-grad-year"
                  name="grad_year"
                  class="form-control"
                  min="2020"
                  max="2035"
                  placeholder="e.g. 2026"
                  value="${escapeHtml(String(p.grad_year ?? 2026))}"
                  required
                >
              </div>

              <div class="form-group">
                <label for="stu-specialization" class="form-label form-label-required">Field of Specialization</label>
                <input
                  type="text"
                  id="stu-specialization"
                  name="specialization"
                  class="form-control"
                  placeholder="e.g. Distributed Systems, Machine Learning"
                  value="${escapeHtml(p.specialization || '')}"
                  required
                >
              </div>
            </div>

            <div class="form-group mb-2">
              <label for="stu-target-role" class="form-label form-label-required">Target Graduate Role</label>
              <select id="stu-target-role" name="target_role" class="form-select" required>
                ${renderRoleOptions(p.target_role)}
              </select>
            </div>
          </div>

          <div class="form-actions mt-3 flex-row justify-between align-center">
            <span class="text-muted" style="font-size: 0.8125rem;">All fields marked with an asterisk are required to proceed.</span>
            <button type="submit" id="step1-continue-btn" class="btn btn-primary">
              Continue to CV Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Renders the Step 2 (CV Upload and Extraction) view markup.
 *
 * @returns {string} Step 2 HTML string.
 */
function renderStep2() {
  const parsed = state.parsedProfile;
  const file = state.cvFile;
  const isUploading = state.isUploading;

  return `
    <div class="card onboarding-card">
      <div class="card-header flex-row justify-between align-center">
        <div>
          <h2 class="card-title">Step 2: Technical CV Document Upload</h2>
          <p class="card-subtitle">Upload your resume to automatically extract skills, employment history, and academic telemetry.</p>
        </div>
        <div>
          <button type="button" id="cv-skip-btn" class="btn btn-outline btn-sm">
            Skip for Now
          </button>
        </div>
      </div>

      <div class="card-body">
        ${state.uploadError ? `
          <div class="alert alert-danger mb-2" role="alert">
            <span>${escapeHtml(state.uploadError)}</span>
          </div>
        ` : ''}

        <!-- Upload Drop Zone (Visible when no parsed data is locked in) -->
        ${!parsed ? `
          <div class="drop-zone-wrapper mb-3">
            <div
              id="cv-drop-zone"
              class="drop-zone"
              tabindex="0"
              role="button"
              aria-label="Upload CV document"
            >
              <input
                type="file"
                id="cv-file-input"
                class="d-none"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              >
              <div class="drop-zone-icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <polyline points="9 15 12 12 15 15"></polyline>
                </svg>
              </div>
              <h3 class="drop-zone-title">Drag and drop your CV document here</h3>
              <p class="drop-zone-hint">Supported formats: PDF, DOCX, TXT. File size limit: 10 MB.</p>
              <div class="mt-2">
                <button type="button" id="cv-browse-btn" class="btn btn-secondary btn-sm">
                  Select File
                </button>
              </div>
            </div>

            <!-- Selected File Information Bar -->
            ${file ? `
              <div class="drop-zone-file-info mt-2" id="cv-selected-file-info">
                <div class="flex-row align-center gap-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" stroke-width="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <div>
                    <strong style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(file.name)}</strong>
                    <span class="text-muted" style="font-size: 0.75rem; margin-left: 0.5rem;">(${formatFileSize(file.size)})</span>
                  </div>
                </div>
                <button type="button" id="cv-clear-file-btn" class="btn btn-outline btn-sm" style="padding: 0.25rem 0.5rem;">
                  Change File
                </button>
              </div>
            ` : ''}
          </div>

          <!-- Processing State Banner -->
          ${isUploading ? `
            <div class="processing-state-panel p-3 mb-3" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px;">
              <div class="flex-row align-center gap-2 mb-2">
                <div class="spinner"></div>
                <div>
                  <strong style="color: #1E293B;">Processing CV Document</strong>
                  <p class="text-muted" style="margin: 0; font-size: 0.8125rem;">Extracting technical taxonomy, verifying credentials, and parsing career tenure...</p>
                </div>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: 75%; background-color: #3B82F6;"></div>
              </div>
            </div>
          ` : ''}

          <!-- Action Trigger Buttons -->
          <div class="flex-row justify-between align-center mt-3">
            <button type="button" id="step2-back-btn" class="btn btn-secondary">
              Back to Profile
            </button>
            <button
              type="button"
              id="cv-upload-trigger-btn"
              class="btn btn-primary"
              ${!file || isUploading ? 'disabled' : ''}
            >
              ${isUploading ? 'Parsing Document...' : 'Upload and Parse CV'}
            </button>
          </div>
        ` : `
          <!-- Parsed Extraction Results Display -->
          <div class="cv-parsed-results">
            <div class="alert alert-success mb-3">
              <strong>CV Successfully Parsed.</strong> Verified technical telemetry extracted and indexed below.
            </div>

            <!-- Skills Tags -->
            <div class="mb-3">
              <h3 style="font-size: 1rem; color: #1E293B; margin-bottom: 0.5rem;">
                Detected Technical Skills (${(parsed.skills || []).length})
              </h3>
              <div class="flex-row flex-wrap gap-1">
                ${(parsed.skills && parsed.skills.length > 0) ? parsed.skills.map((s) => {
                  const name = typeof s === 'string' ? s : (s.skill_name || s.name || s.skill_id);
                  const confidence = typeof s === 'object' && s.confidence ? s.confidence : 'Verified';
                  return `
                    <span class="skill-tag skill-tag-matched">
                      <span>${escapeHtml(name)}</span>
                      <span class="badge badge-neutral" style="font-size: 0.6875rem;">${escapeHtml(confidence)}</span>
                    </span>
                  `;
                }).join('') : '<span class="text-muted">No explicit technical skills identified.</span>'}
              </div>
            </div>

            <!-- Employment Experience List -->
            <div class="mb-3">
              <h3 style="font-size: 1rem; color: #1E293B; margin-bottom: 0.5rem;">Professional Experience</h3>
              ${(parsed.experience && parsed.experience.length > 0) ? `
                <div class="table-responsive">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Job Title</th>
                        <th>Company / Organization</th>
                        <th>Tenure / Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${parsed.experience.map((exp) => `
                        <tr>
                          <td><strong>${escapeHtml(exp.title || 'Software Engineer')}</strong></td>
                          <td>${escapeHtml(exp.company || 'Technology Company')}</td>
                          <td class="font-mono text-muted">${escapeHtml(exp.duration || 'Not specified')}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : `
                <p class="text-muted" style="font-size: 0.875rem;">Total recorded tenure: ${escapeHtml(String(parsed.experience_years || 0))} years.</p>
              `}
            </div>

            <!-- Academic Education List -->
            <div class="mb-3">
              <h3 style="font-size: 1rem; color: #1E293B; margin-bottom: 0.5rem;">Academic Education</h3>
              ${(parsed.education && Array.isArray(parsed.education) && parsed.education.length > 0) ? `
                <div class="table-responsive">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Degree Program</th>
                        <th>University / Institution</th>
                        <th>Graduation Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${parsed.education.map((edu) => `
                        <tr>
                          <td><strong>${escapeHtml(edu.degree || 'B.S. in Computer Science')}</strong></td>
                          <td>${escapeHtml(edu.university || edu.institution || 'University')}</td>
                          <td class="font-mono text-muted">${escapeHtml(String(edu.year || edu.graduation_year || 'Completed'))}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : `
                <p class="text-muted" style="font-size: 0.875rem;">${escapeHtml(typeof parsed.education === 'string' ? parsed.education : 'No explicit degree record extracted.')}</p>
              `}
            </div>

            <!-- Industry Certifications -->
            <div class="mb-3">
              <h3 style="font-size: 1rem; color: #1E293B; margin-bottom: 0.5rem;">Industry Certifications</h3>
              ${(parsed.certifications && parsed.certifications.length > 0) ? `
                <div class="flex-row flex-wrap gap-1">
                  ${parsed.certifications.map((cert) => `
                    <span class="badge badge-success">${escapeHtml(cert)}</span>
                  `).join('')}
                </div>
              ` : `
                <p class="text-muted" style="font-size: 0.875rem;">No verified third-party industry certifications detected.</p>
              `}
            </div>

            <!-- Confirm or Re-upload Actions -->
            <div class="flex-row justify-between align-center mt-3 pt-2" style="border-top: 1px solid #E2E8F0;">
              <button type="button" id="cv-reupload-btn" class="btn btn-secondary">
                Re-upload CV Document
              </button>
              <button type="button" id="cv-confirm-proceed-btn" class="btn btn-primary">
                Confirm Profile and Continue
              </button>
            </div>
          </div>
        `}
      </div>
    </div>
  `;
}

/**
 * Renders the Step 3 (Review and Assessment Routing) view markup.
 *
 * @returns {string} Step 3 HTML string.
 */
function renderStep3() {
  const p = state.profile;
  const parsed = state.parsedProfile;
  const isEmployee = state.userType === 'employee';

  // Consolidate skills from profile input and CV parsing
  const skillsSet = new Set();
  if (Array.isArray(p.tech_stack)) {
    p.tech_stack.forEach((s) => s && skillsSet.add(s.trim()));
  } else if (typeof p.tech_stack === 'string') {
    p.tech_stack.split(',').forEach((s) => s.trim() && skillsSet.add(s.trim()));
  }

  if (parsed && Array.isArray(parsed.skills)) {
    parsed.skills.forEach((s) => {
      const name = typeof s === 'string' ? s : (s.skill_name || s.name || s.skill_id);
      if (name) skillsSet.add(name);
    });
  }

  const consolidatedSkills = Array.from(skillsSet);

  return `
    <div class="card onboarding-card">
      <div class="card-header">
        <div>
          <h2 class="card-title">Step 3: Technical Profile and Skills Review</h2>
          <p class="card-subtitle">Verify your profile summary, claimed competencies, and benchmark alignment before launching your diagnostic assessment.</p>
        </div>
      </div>

      <div class="card-body">
        <div class="alert alert-info mb-3">
          Profile configuration ready. Your verified technical taxonomy is indexed for benchmark gap analysis.
        </div>

        <!-- Profile Attributes Summary -->
        <div class="grid-2 mb-3">
          <div class="card p-2" style="background-color: #FAFAFC; border: 1px solid #E2E8F0;">
            <h3 style="font-size: 0.9375rem; color: #1E293B; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em;">Candidate Standing</h3>
            <div class="attribute-row mb-1">
              <span class="text-muted" style="font-size: 0.8125rem;">Classification:</span>
              <strong style="color: #1E293B; font-size: 0.875rem;">${isEmployee ? 'IT Employee' : 'IT Student'}</strong>
            </div>
            ${isEmployee ? `
              <div class="attribute-row mb-1">
                <span class="text-muted" style="font-size: 0.8125rem;">Current Role:</span>
                <strong style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(p.current_role || 'Software Engineer')}</strong>
              </div>
              <div class="attribute-row mb-1">
                <span class="text-muted" style="font-size: 0.8125rem;">Organization:</span>
                <span style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(p.company || 'Not specified')}</span>
              </div>
              <div class="attribute-row mb-1">
                <span class="text-muted" style="font-size: 0.8125rem;">Total Tenure:</span>
                <span style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(String(p.experience_years || 0))} years</span>
              </div>
            ` : `
              <div class="attribute-row mb-1">
                <span class="text-muted" style="font-size: 0.8125rem;">Degree Program:</span>
                <strong style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(p.degree || 'Computer Science')}</strong>
              </div>
              <div class="attribute-row mb-1">
                <span class="text-muted" style="font-size: 0.8125rem;">Institution:</span>
                <span style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(p.university || 'University')}</span>
              </div>
              <div class="attribute-row mb-1">
                <span class="text-muted" style="font-size: 0.8125rem;">Graduation Year:</span>
                <span style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(String(p.grad_year || 2026))}</span>
              </div>
              <div class="attribute-row mb-1">
                <span class="text-muted" style="font-size: 0.8125rem;">Specialization:</span>
                <span style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(p.specialization || 'General Systems')}</span>
              </div>
            `}
          </div>

          <div class="card p-2" style="background-color: #FAFAFC; border: 1px solid #E2E8F0;">
            <h3 style="font-size: 0.9375rem; color: #1E293B; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em;">Target Benchmark Target</h3>
            <div class="attribute-row mb-1">
              <span class="text-muted" style="font-size: 0.8125rem;">Target Role:</span>
              <strong style="color: #3B82F6; font-size: 0.9375rem;">${escapeHtml(p.target_role || 'Senior Backend Dev')}</strong>
            </div>
            <div class="attribute-row mb-1">
              <span class="text-muted" style="font-size: 0.8125rem;">CV Telemetry:</span>
              <span class="badge ${parsed ? 'badge-success' : 'badge-neutral'}">
                ${parsed ? 'Document Indexed' : 'Self-Reported Only'}
              </span>
            </div>
            <div class="attribute-row mb-1">
              <span class="text-muted" style="font-size: 0.8125rem;">Identified Competencies:</span>
              <span style="color: #1E293B; font-size: 0.875rem;">${consolidatedSkills.length} technical skills</span>
            </div>
          </div>
        </div>

        <!-- Consolidated Skills Inventory -->
        <div class="mb-3">
          <h3 style="font-size: 1rem; color: #1E293B; margin-bottom: 0.5rem;">Consolidated Skills Taxonomy</h3>
          <div class="flex-row flex-wrap gap-1">
            ${consolidatedSkills.length > 0 ? consolidatedSkills.map((skill) => `
              <span class="skill-tag skill-tag-matched">
                <span>${escapeHtml(skill)}</span>
              </span>
            `).join('') : '<span class="text-muted">No competencies registered.</span>'}
          </div>
        </div>

        <!-- Routing and Next Step CTAs -->
        <div class="flex-row justify-between align-center mt-3 pt-2" style="border-top: 1px solid #E2E8F0;">
          <button type="button" id="review-back-to-cv-btn" class="btn btn-secondary">
            Back to CV Upload
          </button>
          <div class="flex-row gap-1">
            <button type="button" id="review-go-dashboard-btn" class="btn btn-secondary">
              Go to Dashboard
            </button>
            <button type="button" id="review-start-assessment-btn" class="btn btn-primary">
              Start Diagnostic Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Resolves a DOM container element from an element or string query selector.
 *
 * @param {HTMLElement|string} target - Target element or selector string.
 * @returns {HTMLElement|null} Resolved DOM element.
 */
function resolveContainer(target) {
  if (!target) return null;
  if (typeof target === 'string') {
    return document.querySelector(target);
  }
  return target;
}

/**
 * Primary render function for the onboarding view.
 *
 * @param {HTMLElement|string} container - Target container.
 */
export function render(container) {
  const el = resolveContainer(container);
  if (!el) return;

  ensureAuthSession();

  // Prepopulate state with existing user profile if not yet modified
  if (state.user && !state.profile.current_role && state.user.current_role) {
    state.userType = (state.user.user_type === 'student' || state.user.role === 'student') ? 'student' : 'employee';
    state.profile.current_role = state.user.current_role || '';
    state.profile.company = state.user.company || '';
    state.profile.experience_years = state.user.experience_years ?? 3;
    state.profile.target_role = state.user.target_role || 'Junior Frontend Dev';
    state.profile.tech_stack = state.user.tech_stack || [];
    state.profile.degree = state.user.degree || (typeof state.user.education === 'string' ? state.user.education : '');
    state.profile.university = state.user.university || '';
    state.profile.grad_year = state.user.grad_year || 2026;
    state.profile.specialization = state.user.specialization || '';
  }

  let stepMarkup = '';
  if (state.currentStep === 1) {
    stepMarkup = renderStep1();
  } else if (state.currentStep === 2) {
    stepMarkup = renderStep2();
  } else if (state.currentStep === 3) {
    stepMarkup = renderStep3();
  }

  el.innerHTML = `
    <div class="onboarding-page-wrapper" style="max-width: 880px; margin: 1.5rem auto;">
      ${renderStepIndicator(state.currentStep)}
      <div id="onboarding-step-content">
        ${stepMarkup}
      </div>
    </div>
  `;
}

/**
 * Handles file selection and updates internal state and UI.
 *
 * @param {File} file - Selected file instance.
 * @param {HTMLElement} container - Page container.
 */
function handleFileSelected(file, container) {
  if (!file) return;

  const validExtensions = ['.pdf', '.docx', '.txt'];
  const fileName = (file.name || '').toLowerCase();
  const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

  if (!isValid) {
    state.uploadError = 'Invalid document format. Please upload a .pdf, .docx, or .txt file.';
    render(container);
    bindEvents(container);
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    state.uploadError = 'File size exceeds 10 MB limit. Please upload a smaller document.';
    render(container);
    bindEvents(container);
    return;
  }

  state.cvFile = file;
  state.uploadError = null;
  render(container);
  bindEvents(container);
}

/**
 * Executes CV document upload and parsing via POST /api/users/cv.
 *
 * @param {HTMLElement} container - Page container.
 */
async function uploadAndParseCV(container) {
  if (!state.cvFile) {
    state.uploadError = 'Please select a CV document file before submitting.';
    render(container);
    bindEvents(container);
    return;
  }

  state.isUploading = true;
  state.uploadError = null;
  render(container);
  bindEvents(container);

  try {
    const token = ensureAuthSession();
    const formData = new FormData();
    formData.append('file', state.cvFile);

    const res = await fetch('/api/users/cv', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to parse CV document.');
    }

    state.parsedProfile = data.profile || {};
    state.isUploading = false;
    render(container);
    bindEvents(container);

  } catch (err) {
    console.error('CV upload and parsing error:', err);
    state.isUploading = false;
    state.uploadError = `Parsing failure: ${err.message}. You may re-upload or skip to manual review.`;
    render(container);
    bindEvents(container);
  }
}

/**
 * Submits updated user profile attributes to PUT /api/users/:id.
 *
 * @param {HTMLElement} container - Page container.
 */
async function saveProfileStep1(container) {
  state.validationError = null;

  if (state.userType === 'employee') {
    const roleEl = container.querySelector('#emp-current-role');
    const compEl = container.querySelector('#emp-company');
    const expEl = container.querySelector('#emp-experience-years');
    const targetEl = container.querySelector('#emp-target-role');
    const stackEl = container.querySelector('#emp-tech-stack');

    const currentRole = roleEl ? roleEl.value.trim() : '';
    const company = compEl ? compEl.value.trim() : '';
    const expYears = expEl ? Number(expEl.value) : 0;
    const targetRole = targetEl ? targetEl.value : '';
    const techStackRaw = stackEl ? stackEl.value.trim() : '';

    if (!currentRole || !company || !targetRole || !techStackRaw) {
      state.validationError = 'Please complete all required fields for the IT Employee profile.';
      render(container);
      bindEvents(container);
      return;
    }

    const techStack = techStackRaw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

    state.profile.current_role = currentRole;
    state.profile.company = company;
    state.profile.experience_years = expYears;
    state.profile.target_role = targetRole;
    state.profile.tech_stack = techStack;

  } else {
    const degreeEl = container.querySelector('#stu-degree');
    const univEl = container.querySelector('#stu-university');
    const gradEl = container.querySelector('#stu-grad-year');
    const specEl = container.querySelector('#stu-specialization');
    const targetEl = container.querySelector('#stu-target-role');

    const degree = degreeEl ? degreeEl.value.trim() : '';
    const university = univEl ? univEl.value.trim() : '';
    const gradYear = gradEl ? Number(gradEl.value) : new Date().getFullYear();
    const specialization = specEl ? specEl.value.trim() : '';
    const targetRole = targetEl ? targetEl.value : '';

    if (!degree || !university || !specialization || !targetRole) {
      state.validationError = 'Please complete all required fields for the IT Student profile.';
      render(container);
      bindEvents(container);
      return;
    }

    state.profile.degree = degree;
    state.profile.university = university;
    state.profile.grad_year = gradYear;
    state.profile.specialization = specialization;
    state.profile.target_role = targetRole;
  }

  // Persist attributes to user record
  try {
    const token = ensureAuthSession();
    const userId = state.user.id || 'usr_employee_003';

    const payload = state.userType === 'employee' ? {
      user_type: 'employee',
      current_role: state.profile.current_role,
      company: state.profile.company,
      experience_years: state.profile.experience_years,
      target_role: state.profile.target_role,
      tech_stack: state.profile.tech_stack
    } : {
      user_type: 'student',
      degree: state.profile.degree,
      university: state.profile.university,
      grad_year: state.profile.grad_year,
      specialization: state.profile.specialization,
      target_role: state.profile.target_role
    };

    await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    // Update active session user
    const updatedUser = { ...state.user, ...payload };
    setSession(updatedUser, token);
    state.user = updatedUser;

  } catch (err) {
    console.warn('Profile background synchronization notice:', err);
  }

  // Advance to Step 2
  state.currentStep = 2;
  render(container);
  bindEvents(container);
}

/**
 * Attaches interactive event handlers to the onboarding markup.
 *
 * @param {HTMLElement} container - Page container.
 */
function bindEvents(container) {
  // Step 1: User Type Toggles
  const empToggle = container.querySelector('#toggle-user-employee');
  const stuToggle = container.querySelector('#toggle-user-student');
  const empFields = container.querySelector('#employee-fields');
  const stuFields = container.querySelector('#student-fields');

  if (empToggle && stuToggle) {
    empToggle.addEventListener('click', () => {
      state.userType = 'employee';
      empToggle.classList.add('active');
      stuToggle.classList.remove('active');
      if (empFields) empFields.classList.remove('d-none');
      if (stuFields) stuFields.classList.add('d-none');
    });

    stuToggle.addEventListener('click', () => {
      state.userType = 'student';
      stuToggle.classList.add('active');
      empToggle.classList.remove('active');
      if (stuFields) stuFields.classList.remove('d-none');
      if (empFields) empFields.classList.add('d-none');
    });
  }

  // Step 1: Form Submission
  const profileForm = container.querySelector('#onboarding-profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProfileStep1(container);
    });
  }

  // Step 2: Drag and Drop & File Selection
  const dropZone = container.querySelector('#cv-drop-zone');
  const fileInput = container.querySelector('#cv-file-input');
  const browseBtn = container.querySelector('#cv-browse-btn');
  const clearFileBtn = container.querySelector('#cv-clear-file-btn');
  const uploadTriggerBtn = container.querySelector('#cv-upload-trigger-btn');
  const step2BackBtn = container.querySelector('#step2-back-btn');
  const skipBtn = container.querySelector('#cv-skip-btn');
  const reuploadBtn = container.querySelector('#cv-reupload-btn');
  const confirmProceedBtn = container.querySelector('#cv-confirm-proceed-btn');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', (e) => {
      if (e.target !== browseBtn) {
        fileInput.click();
      }
    });

    if (browseBtn) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        handleFileSelected(fileInput.files[0], container);
      }
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drop-zone-active');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drop-zone-active');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drop-zone-active');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelected(e.dataTransfer.files[0], container);
      }
    });
  }

  if (clearFileBtn) {
    clearFileBtn.addEventListener('click', () => {
      state.cvFile = null;
      render(container);
      bindEvents(container);
    });
  }

  if (uploadTriggerBtn) {
    uploadTriggerBtn.addEventListener('click', () => {
      uploadAndParseCV(container);
    });
  }

  if (step2BackBtn) {
    step2BackBtn.addEventListener('click', () => {
      state.currentStep = 1;
      render(container);
      bindEvents(container);
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      state.currentStep = 3;
      render(container);
      bindEvents(container);
    });
  }

  if (reuploadBtn) {
    reuploadBtn.addEventListener('click', () => {
      state.parsedProfile = null;
      state.cvFile = null;
      render(container);
      bindEvents(container);
    });
  }

  if (confirmProceedBtn) {
    confirmProceedBtn.addEventListener('click', () => {
      state.currentStep = 3;
      render(container);
      bindEvents(container);
    });
  }

  // Step 3: Navigation Buttons
  const reviewBackBtn = container.querySelector('#review-back-to-cv-btn');
  const reviewDashboardBtn = container.querySelector('#review-go-dashboard-btn');
  const reviewAssessmentBtn = container.querySelector('#review-start-assessment-btn');

  if (reviewBackBtn) {
    reviewBackBtn.addEventListener('click', () => {
      state.currentStep = 2;
      render(container);
      bindEvents(container);
    });
  }

  if (reviewDashboardBtn) {
    reviewDashboardBtn.addEventListener('click', () => {
      window.location.hash = '#/dashboard';
    });
  }

  if (reviewAssessmentBtn) {
    reviewAssessmentBtn.addEventListener('click', () => {
      window.location.hash = '#/assessments';
    });
  }
}

/**
 * Initializes the onboarding controller and event listeners.
 *
 * @param {HTMLElement|string} container - Target container.
 */
export function init(container) {
  const el = resolveContainer(container);
  if (!el) return;

  render(el);
  bindEvents(el);
}

export default {
  render,
  init
};
