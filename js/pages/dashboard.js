/**
 * SkillForge - Primary Analytics Dashboard View
 * Module: js/pages/dashboard.js
 *
 * Implements candidate competency telemetry, role readiness scoring,
 * verified strengths and priority skill gap matrices, CV profile summary,
 * quick platform actions, and chronological activity tracking.
 */

import { apiRouter } from '../../api/api-router.js';
import { getCurrentUser, getToken, setSession } from '../auth.js';
import { getScoreColor } from '../components/charts.js';

// Ensure API request interceptor is installed for browser fetch operations
if (typeof window !== 'undefined' && apiRouter && !apiRouter.installed) {
  apiRouter.install();
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
 * Sanitizes unsafe HTML special characters to prevent injection attacks.
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
 * Resolves or establishes an active authentication session.
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
    return token;
  }

  return token;
}

/**
 * Formats an ISO 8601 date string into human-readable relative or standard date.
 *
 * @param {string} isoString - Date string.
 * @returns {string} Formatted timestamp string.
 */
function formatActivityTime(isoString) {
  if (!isoString) return 'Recent';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recent';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Recent';
  }
}

/**
 * Renders the structural skeleton of the dashboard view into the target container.
 *
 * @param {HTMLElement|string} container - Target DOM container.
 */
export function render(container) {
  const el = resolveContainer(container);
  if (!el) return;

  ensureAuthSession();
  const user = getCurrentUser() || {
    name: 'David Chen',
    current_role: 'Backend Dev',
    target_role: 'Senior Backend Dev'
  };

  el.innerHTML = `
    <div class="dashboard-page-wrapper" style="max-width: 1200px; margin: 1.5rem auto;">
      <!-- 1. Welcome Card -->
      <div class="card mb-3" id="dashboard-welcome-card">
        <div class="card-body flex-row justify-between align-center flex-wrap gap-2">
          <div>
            <h1 style="font-size: 1.5rem; margin-bottom: 0.25rem; color: #1E293B;">
              Welcome back, <span id="welcome-user-name">${escapeHtml(user.name || 'Candidate')}</span>
            </h1>
            <p class="text-muted" style="margin-bottom: 0; font-size: 0.875rem;">
              Current Role: <strong style="color: #1E293B;" id="welcome-current-role">${escapeHtml(user.current_role || 'Software Engineer')}</strong>
              <span style="margin: 0 0.5rem; color: #94A3B8;">|</span>
              Target Role: <strong style="color: #3B82F6;" id="welcome-target-role">${escapeHtml(user.target_role || 'Senior Software Engineer')}</strong>
            </p>
          </div>
          <div class="flex-row gap-1">
            <button type="button" class="btn btn-secondary btn-sm" id="welcome-update-profile-btn">
              Update Profile
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="welcome-take-assessment-btn">
              Start Assessment
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Stats Cards Row (4 cards) -->
      <div class="grid-4 mb-3" id="dashboard-stats-grid">
        <!-- Readiness Score Card -->
        <div class="stat-card" id="card-readiness-score" style="border-top: 3px solid #64748B;">
          <div class="stat-value font-mono" id="stat-readiness-val">--</div>
          <div class="stat-label">Readiness Score</div>
          <div class="stat-sublabel" id="stat-readiness-level">Target benchmark alignment</div>
        </div>

        <!-- Verified Strengths Card -->
        <div class="stat-card" id="card-verified-strengths" style="border-top: 3px solid #2D6A4F;">
          <div class="stat-value font-mono" id="stat-strengths-val" style="color: #2D6A4F;">--</div>
          <div class="stat-label">Verified Strengths</div>
          <div class="stat-sublabel">Benchmark validated competencies</div>
        </div>

        <!-- Skill Gaps Card -->
        <div class="stat-card" id="card-skill-gaps" style="border-top: 3px solid #D97706;">
          <div class="stat-value font-mono" id="stat-gaps-val" style="color: #D97706;">--</div>
          <div class="stat-label">Skill Gaps</div>
          <div class="stat-sublabel">Priority development deficits</div>
        </div>

        <!-- Market Alignment Card -->
        <div class="stat-card" id="card-market-alignment" style="border-top: 3px solid #3B82F6;">
          <div class="stat-value font-mono" id="stat-market-val" style="color: #3B82F6;">--</div>
          <div class="stat-label">Market Alignment</div>
          <div class="stat-sublabel">Industry taxonomy coverage index</div>
        </div>
      </div>

      <!-- Assessment Prompt Banner (Shown when no assessment has been completed) -->
      <div id="assessment-prompt-banner" class="mb-3 d-none">
        <div class="card p-3" style="background-color: #F8FAFC; border: 1px solid #CBD5E1;">
          <div class="flex-row justify-between align-center flex-wrap gap-2">
            <div>
              <h2 style="font-size: 1.125rem; color: #1E293B; margin-bottom: 0.25rem;">
                Diagnostic Assessment Required
              </h2>
              <p class="text-muted" style="margin-bottom: 0; font-size: 0.875rem;">
                No completed assessment found for your profile. Take a diagnostic assessment to empirically verify your skills against the <strong style="color: #1E293B;">${escapeHtml(user.target_role || 'Target')}</strong> benchmark.
              </p>
            </div>
            <div>
              <button type="button" class="btn btn-primary btn-sm" id="banner-take-assessment-btn">
                Take Diagnostic Assessment
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Two-Column Strengths and Weaknesses -->
      <div class="grid-2 mb-3" id="strengths-gaps-section">
        <!-- LEFT: Verified Strengths Table -->
        <div class="card">
          <div class="card-header flex-row justify-between align-center">
            <div>
              <h2 class="card-title">Verified Strengths</h2>
              <p class="card-subtitle">Core competencies meeting or exceeding benchmark thresholds</p>
            </div>
            <span class="badge badge-success" id="strengths-count-badge">0 verified</span>
          </div>
          <div class="card-body p-0" id="verified-strengths-container">
            <div class="p-3 text-muted text-center">Loading verified competencies...</div>
          </div>
        </div>

        <!-- RIGHT: Priority Skill Gaps Table -->
        <div class="card">
          <div class="card-header flex-row justify-between align-center">
            <div>
              <h2 class="card-title">Priority Skill Gaps</h2>
              <p class="card-subtitle">Required competencies where assessed performance is below benchmark</p>
            </div>
            <span class="badge badge-warning" id="gaps-count-badge">0 deficits</span>
          </div>
          <div class="card-body p-0" id="priority-gaps-container">
            <div class="p-3 text-muted text-center">Loading skill gap telemetry...</div>
          </div>
        </div>
      </div>

      <!-- 4. CV Profile Summary (if uploaded) -->
      <div class="card mb-3" id="cv-profile-summary-card">
        <div class="card-header flex-row justify-between align-center">
          <div>
            <h2 class="card-title">CV Profile Summary</h2>
            <p class="card-subtitle">Technical resume credentials and extracted career telemetry</p>
          </div>
          <div id="cv-summary-action-area">
            <button type="button" class="btn btn-secondary btn-sm" id="cv-reupload-btn">
              Re-upload CV
            </button>
          </div>
        </div>
        <div class="card-body" id="cv-summary-container">
          <div class="text-muted text-center p-3">Loading CV profile telemetry...</div>
        </div>
      </div>

      <!-- 5. Quick Actions Row -->
      <div class="card mb-3">
        <div class="card-header">
          <h2 class="card-title">Quick Actions</h2>
          <p class="card-subtitle">Direct platform utilities and analytical workflows</p>
        </div>
        <div class="card-body">
          <div class="grid-4" id="quick-actions-grid">
            <div class="quick-action-tile card p-2" style="background-color: #FAFAFC; border: 1px solid #E2E8F0;">
              <h3 style="font-size: 0.9375rem; color: #1E293B; margin-bottom: 0.25rem;">Diagnostic Test</h3>
              <p class="text-muted" style="font-size: 0.8125rem; margin-bottom: 0.75rem;">Evaluate core competencies against benchmark standards.</p>
              <button type="button" class="btn btn-primary btn-sm btn-block" id="qa-take-assessment-btn">
                Take Assessment
              </button>
            </div>

            <div class="quick-action-tile card p-2" style="background-color: #FAFAFC; border: 1px solid #E2E8F0;">
              <h3 style="font-size: 0.9375rem; color: #1E293B; margin-bottom: 0.25rem;">Technical CV</h3>
              <p class="text-muted" style="font-size: 0.8125rem; margin-bottom: 0.75rem;">Upload or update your technical resume document.</p>
              <button type="button" class="btn btn-secondary btn-sm btn-block" id="qa-upload-cv-btn">
                Upload CV
              </button>
            </div>

            <div class="quick-action-tile card p-2" style="background-color: #FAFAFC; border: 1px solid #E2E8F0;">
              <h3 style="font-size: 0.9375rem; color: #1E293B; margin-bottom: 0.25rem;">Curated Courses</h3>
              <p class="text-muted" style="font-size: 0.8125rem; margin-bottom: 0.75rem;">Explore courses mapped to address priority skill gaps.</p>
              <button type="button" class="btn btn-secondary btn-sm btn-block" id="qa-browse-courses-btn">
                Browse Courses
              </button>
            </div>

            <div class="quick-action-tile card p-2" style="background-color: #FAFAFC; border: 1px solid #E2E8F0;">
              <h3 style="font-size: 0.9375rem; color: #1E293B; margin-bottom: 0.25rem;">Market Trends</h3>
              <p class="text-muted" style="font-size: 0.8125rem; margin-bottom: 0.75rem;">Review tech demand shifts, salary impacts, and trends.</p>
              <button type="button" class="btn btn-secondary btn-sm btn-block" id="qa-view-trends-btn">
                View Market Trends
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. Recent Activity List -->
      <div class="card mb-3">
        <div class="card-header">
          <h2 class="card-title">Recent Activity</h2>
          <p class="card-subtitle">Chronological audit log of assessment attempts, CV indexing, and progression</p>
        </div>
        <div class="card-body p-0" id="recent-activity-container">
          <div class="p-3 text-muted text-center">Loading recent activity records...</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the Verified Strengths table markup.
 *
 * @param {Array<object>} strengths - List of verified strength records.
 * @returns {string} HTML table string.
 */
function renderVerifiedStrengthsTable(strengths) {
  if (!Array.isArray(strengths) || strengths.length === 0) {
    return `
      <div class="p-3 text-muted text-center" style="font-size: 0.875rem;">
        No verified strengths recorded yet. Complete diagnostic assessments to validate competencies against role benchmarks.
      </div>
    `;
  }

  const rows = strengths.map((s) => {
    const skillName = s.skill_name || s.skill_id || 'Technical Competency';
    const cvClaimed = s.cv_present;
    const testScore = typeof s.test_score === 'number' ? `${s.test_score}%` : '--';
    const benchmark = typeof s.benchmark_min === 'number' ? `${s.benchmark_min}%` : '70%';

    return `
      <tr>
        <td><strong>${escapeHtml(skillName)}</strong></td>
        <td>
          <span class="badge ${cvClaimed ? 'badge-primary' : 'badge-neutral'}">
            ${cvClaimed ? 'Claimed' : 'Not Claimed'}
          </span>
        </td>
        <td class="font-mono" style="color: #2D6A4F; font-weight: 600;">${escapeHtml(testScore)}</td>
        <td class="font-mono text-muted">${escapeHtml(benchmark)}</td>
        <td>
          <span class="badge badge-success">Verified Strength</span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Skill</th>
            <th>CV Claimed</th>
            <th>Test Score</th>
            <th>Benchmark</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Renders the Priority Skill Gaps table markup.
 *
 * @param {Array<object>} gaps - List of skill gap records.
 * @param {string} targetRole - Candidate target role title.
 * @returns {string} HTML table string.
 */
function renderPrioritySkillGapsTable(gaps, targetRole) {
  if (!Array.isArray(gaps) || gaps.length === 0) {
    return `
      <div class="p-3 text-muted text-center" style="font-size: 0.875rem;">
        All required competencies currently meet or exceed role benchmark thresholds. No priority skill gaps detected.
      </div>
    `;
  }

  const rows = gaps.map((g) => {
    const skillName = g.skill_name || g.skill_id || 'Technical Competency';
    const requiredFor = targetRole || 'Target Role';
    const scoreVal = (g.test_score !== null && g.test_score !== undefined) ? `${g.test_score}%` : 'Not Assessed';
    const benchmarkVal = typeof g.benchmark_min === 'number' ? `${g.benchmark_min}%` : '70%';
    const deficitVal = typeof g.deficit === 'number' ? `-${g.deficit}%` : '--';

    const isCritical = (g.gap_severity === 'Critical') || (g.deficit && g.deficit >= 20);
    const badgeClass = isCritical ? 'badge-danger' : 'badge-warning';
    const badgeLabel = isCritical ? 'Critical' : 'Moderate';

    return `
      <tr>
        <td><strong>${escapeHtml(skillName)}</strong></td>
        <td class="text-muted" style="font-size: 0.8125rem;">${escapeHtml(requiredFor)}</td>
        <td class="font-mono">${escapeHtml(scoreVal)}</td>
        <td class="font-mono text-muted">${escapeHtml(benchmarkVal)}</td>
        <td class="font-mono" style="color: ${isCritical ? '#DC2626' : '#D97706'}; font-weight: 600;">${escapeHtml(deficitVal)}</td>
        <td>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>Skill</th>
            <th>Required For</th>
            <th>Your Score</th>
            <th>Benchmark</th>
            <th>Gap</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Renders the CV Profile Summary section markup.
 *
 * @param {object|null} cv - Latest CV profile record.
 * @returns {string} HTML string.
 */
function renderCVSummary(cv) {
  if (!cv || !cv.skills || cv.skills.length === 0) {
    return `
      <div class="p-2">
        <div class="alert alert-info mb-2">
          <span>No technical CV document on file. Upload your CV to extract and benchmark technical competencies.</span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="cv-empty-upload-btn">
          Upload CV Document
        </button>
      </div>
    `;
  }

  const skillsList = cv.skills || [];
  const experienceList = cv.experience || [];
  const educationList = cv.education || [];

  return `
    <div class="cv-summary-content">
      <!-- Skills Tags Row -->
      <div class="mb-3">
        <h3 style="font-size: 0.9375rem; color: #1E293B; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em;">
          Indexed Skills (${skillsList.length})
        </h3>
        <div class="flex-row flex-wrap gap-1">
          ${skillsList.map((s) => {
            const name = typeof s === 'string' ? s : (s.skill_name || s.name || s.skill_id);
            const conf = typeof s === 'object' && s.confidence ? s.confidence : 'Verified';
            return `
              <span class="skill-tag skill-tag-matched">
                <span>${escapeHtml(name)}</span>
                <span class="badge badge-neutral" style="font-size: 0.6875rem;">${escapeHtml(conf)}</span>
              </span>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Experience & Education Grid -->
      <div class="grid-2">
        <!-- Experience Column -->
        <div>
          <h3 style="font-size: 0.9375rem; color: #1E293B; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em;">
            Experience Timeline
          </h3>
          ${(Array.isArray(experienceList) && experienceList.length > 0) ? `
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${experienceList.map((exp) => `
                <li class="mb-2 p-2" style="background-color: #FAFAFC; border: 1px solid #E2E8F0; border-radius: 4px;">
                  <strong style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(exp.title || 'Software Engineer')}</strong>
                  <div class="flex-row justify-between text-muted" style="font-size: 0.8125rem; margin-top: 0.25rem;">
                    <span>${escapeHtml(exp.company || 'Technology Organization')}</span>
                    <span class="font-mono">${escapeHtml(exp.duration || 'Tenure not specified')}</span>
                  </div>
                </li>
              `).join('')}
            </ul>
          ` : `
            <p class="text-muted" style="font-size: 0.875rem;">
              Total recognized experience tenure: ${escapeHtml(String(cv.experience_years || 0))} years.
            </p>
          `}
        </div>

        <!-- Academic Credentials Column -->
        <div>
          <h3 style="font-size: 0.9375rem; color: #1E293B; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.04em;">
            Academic Credentials
          </h3>
          ${(Array.isArray(educationList) && educationList.length > 0) ? `
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${educationList.map((edu) => `
                <li class="mb-2 p-2" style="background-color: #FAFAFC; border: 1px solid #E2E8F0; border-radius: 4px;">
                  <strong style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(edu.degree || 'Degree Program')}</strong>
                  <div class="flex-row justify-between text-muted" style="font-size: 0.8125rem; margin-top: 0.25rem;">
                    <span>${escapeHtml(edu.university || edu.institution || 'University')}</span>
                    <span class="font-mono">${escapeHtml(String(edu.year || edu.graduation_year || 'Completed'))}</span>
                  </div>
                </li>
              `).join('')}
            </ul>
          ` : `
            <p class="text-muted" style="font-size: 0.875rem;">
              ${escapeHtml(typeof cv.education === 'string' ? cv.education : 'No explicit degree records parsed.')}
            </p>
          `}
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the Recent Activity audit list markup.
 *
 * @param {Array<object>} activities - Normalized activity items.
 * @returns {string} HTML table string.
 */
function renderRecentActivityList(activities) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return `
      <div class="p-3 text-muted text-center" style="font-size: 0.875rem;">
        No recent platform activities recorded. Actions such as taking assessments or uploading CV documents will be audited here.
      </div>
    `;
  }

  const rows = activities.map((item) => {
    let badgeClass = 'badge-neutral';
    if (item.status === 'Completed' || item.status === 'Indexed') badgeClass = 'badge-success';
    if (item.status === 'In Progress') badgeClass = 'badge-warning';

    return `
      <tr>
        <td class="font-mono text-muted" style="font-size: 0.8125rem; white-space: nowrap;">
          ${escapeHtml(formatActivityTime(item.timestamp))}
        </td>
        <td>
          <strong style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(item.title)}</strong>
          <div class="text-muted" style="font-size: 0.8125rem;">${escapeHtml(item.description)}</div>
        </td>
        <td>
          <span class="badge ${badgeClass}">${escapeHtml(item.status || 'Logged')}</span>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th style="width: 140px;">Timestamp</th>
            <th>Activity Description</th>
            <th style="width: 110px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Assembles recent platform activity records from available database resources.
 *
 * @param {object} user - Current user account.
 * @param {object|null} cv - Latest CV record.
 * @param {Array<object>} assessments - Completed user assessments.
 * @returns {Array<object>} Chronological activity array.
 */
function buildActivityRecords(user, cv, assessments) {
  const records = [];

  if (Array.isArray(assessments)) {
    assessments.forEach((asm) => {
      records.push({
        timestamp: asm.created_at || asm.completed_at || new Date().toISOString(),
        title: 'Diagnostic Assessment Completed',
        description: `Assessment for target competency evaluated with overall score ${asm.results ? asm.results.overall_score || 0 : 0}%.`,
        status: 'Completed'
      });
    });
  }

  if (cv) {
    records.push({
      timestamp: cv.created_at || new Date().toISOString(),
      title: 'Technical CV Document Indexed',
      description: `Extracted ${(cv.skills || []).length} technical competencies and validated career timeline.`,
      status: 'Indexed'
    });
  }

  if (user && user.created_at) {
    records.push({
      timestamp: user.created_at,
      title: 'Profile Initialized',
      description: `Account registered with target benchmark role ${user.target_role || 'Junior Frontend Dev'}.`,
      status: 'Completed'
    });
  }

  // Sort descending by timestamp
  return records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

/**
 * Fetches analytics telemetry and populates the dashboard view.
 *
 * @param {HTMLElement} container - Page container.
 */
async function loadDashboardData(container) {
  const token = ensureAuthSession();
  const user = getCurrentUser() || {
    id: 'usr_employee_003',
    name: 'David Chen',
    current_role: 'Backend Dev',
    target_role: 'Senior Backend Dev'
  };

  try {
    // 1. Fetch Profile Analysis Report
    const reportPromise = fetch('/api/analysis/profile-report', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then((r) => r.json()).catch(() => ({ report: null }));

    // 2. Fetch Market Alignment Telemetry
    const marketPromise = fetch('/api/analysis/market-alignment', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then((r) => r.json()).catch(() => ({ alignment: null }));

    // 3. Fetch Latest CV Profile
    const cvPromise = fetch('/api/users/cv', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then((r) => r.json()).catch(() => ({ profile: null }));

    // 4. Fetch User Assessments
    const assessmentsPromise = fetch('/api/assessments', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then((r) => r.json()).catch(() => ({ assessments: [] }));

    const [reportData, marketData, cvData, assessmentsData] = await Promise.all([
      reportPromise,
      marketPromise,
      cvPromise,
      assessmentsPromise
    ]);

    const report = reportData.report || {};
    const alignment = marketData.alignment || {};
    const cv = cvData.profile || null;
    const assessments = assessmentsData.assessments || [];

    const completedAssessments = assessments.filter(
      (a) => a.user_id === user.id && a.status === 'completed'
    );

    // Update Welcome Meta
    const welcomeNameEl = container.querySelector('#welcome-user-name');
    const welcomeCurrentRoleEl = container.querySelector('#welcome-current-role');
    const welcomeTargetRoleEl = container.querySelector('#welcome-target-role');

    if (welcomeNameEl) welcomeNameEl.textContent = user.name || 'Candidate';
    if (welcomeCurrentRoleEl) welcomeCurrentRoleEl.textContent = user.current_role || 'Software Engineer';
    if (welcomeTargetRoleEl) welcomeTargetRoleEl.textContent = report.target_role || user.target_role || 'Senior Backend Dev';

    // 2. Update Stats Cards (Readiness, Strengths, Gaps, Market Alignment)
    const readinessScore = typeof report.overall_readiness_score === 'number' ? report.overall_readiness_score : 0;
    const strengthsCount = Array.isArray(report.verified_strengths) ? report.verified_strengths.length : 0;
    const gapsCount = Array.isArray(report.skill_gaps) ? report.skill_gaps.length : 0;
    const marketScore = typeof alignment.overall_alignment_score === 'number' ? alignment.overall_alignment_score : 70;

    const readinessValEl = container.querySelector('#stat-readiness-val');
    const readinessLevelEl = container.querySelector('#stat-readiness-level');
    const strengthsValEl = container.querySelector('#stat-strengths-val');
    const gapsValEl = container.querySelector('#stat-gaps-val');
    const marketValEl = container.querySelector('#stat-market-val');
    const readinessCard = container.querySelector('#card-readiness-score');

    if (readinessValEl) {
      readinessValEl.textContent = `${readinessScore}%`;
      readinessValEl.style.color = getScoreColor(readinessScore);
    }
    if (readinessCard) {
      readinessCard.style.borderTopColor = getScoreColor(readinessScore);
    }
    if (readinessLevelEl) {
      readinessLevelEl.textContent = report.readiness_level || 'Target benchmark alignment';
    }
    if (strengthsValEl) {
      strengthsValEl.textContent = String(strengthsCount);
    }
    if (gapsValEl) {
      gapsValEl.textContent = String(gapsCount);
    }
    if (marketValEl) {
      marketValEl.textContent = `${marketScore}%`;
    }

    // 3. Assessment Prompt Banner Display Logic
    const promptBanner = container.querySelector('#assessment-prompt-banner');
    const hasNoCompletedAssessments = completedAssessments.length === 0;

    if (promptBanner) {
      if (hasNoCompletedAssessments) {
        promptBanner.classList.remove('d-none');
      } else {
        promptBanner.classList.add('d-none');
      }
    }

    // 3. Two-Column Strengths and Weaknesses Tables
    const strengthsContainer = container.querySelector('#verified-strengths-container');
    const gapsContainer = container.querySelector('#priority-gaps-container');
    const strengthsBadge = container.querySelector('#strengths-count-badge');
    const gapsBadge = container.querySelector('#gaps-count-badge');

    if (strengthsBadge) strengthsBadge.textContent = `${strengthsCount} verified`;
    if (gapsBadge) gapsBadge.textContent = `${gapsCount} deficit${gapsCount !== 1 ? 's' : ''}`;

    if (strengthsContainer) {
      strengthsContainer.innerHTML = renderVerifiedStrengthsTable(report.verified_strengths || []);
    }

    if (gapsContainer) {
      const targetRoleTitle = report.target_role || user.target_role || 'Target Role';
      gapsContainer.innerHTML = renderPrioritySkillGapsTable(report.skill_gaps || [], targetRoleTitle);
    }

    // 4. CV Profile Summary
    const cvContainer = container.querySelector('#cv-summary-container');
    if (cvContainer) {
      cvContainer.innerHTML = renderCVSummary(cv);
    }

    // 6. Recent Activity List
    const activityContainer = container.querySelector('#recent-activity-container');
    if (activityContainer) {
      const activities = buildActivityRecords(user, cv, completedAssessments);
      activityContainer.innerHTML = renderRecentActivityList(activities);
    }

  } catch (err) {
    console.error('Failed to load dashboard telemetry:', err);
    const strengthsContainer = container.querySelector('#verified-strengths-container');
    if (strengthsContainer) {
      strengthsContainer.innerHTML = `
        <div class="p-3 text-muted text-center">
          Failed to load profile telemetry: ${escapeHtml(err.message)}
        </div>
      `;
    }
  }
}

/**
 * Attaches button and action navigation handlers to dashboard elements.
 *
 * @param {HTMLElement} container - Page container.
 */
function bindDashboardEvents(container) {
  const updateProfileBtn = container.querySelector('#welcome-update-profile-btn');
  const takeAssessmentBtn = container.querySelector('#welcome-take-assessment-btn');
  const bannerAssessmentBtn = container.querySelector('#banner-take-assessment-btn');
  const reuploadCvBtn = container.querySelector('#cv-reupload-btn');
  const emptyUploadCvBtn = container.querySelector('#cv-empty-upload-btn');

  const qaTakeAssessmentBtn = container.querySelector('#qa-take-assessment-btn');
  const qaUploadCvBtn = container.querySelector('#qa-upload-cv-btn');
  const qaBrowseCoursesBtn = container.querySelector('#qa-browse-courses-btn');
  const qaViewTrendsBtn = container.querySelector('#qa-view-trends-btn');

  if (updateProfileBtn) {
    updateProfileBtn.addEventListener('click', () => {
      window.location.hash = '#/onboarding';
    });
  }

  if (takeAssessmentBtn) {
    takeAssessmentBtn.addEventListener('click', () => {
      window.location.hash = '#/assessments';
    });
  }

  if (bannerAssessmentBtn) {
    bannerAssessmentBtn.addEventListener('click', () => {
      window.location.hash = '#/assessments';
    });
  }

  if (reuploadCvBtn) {
    reuploadCvBtn.addEventListener('click', () => {
      window.location.hash = '#/onboarding';
    });
  }

  if (emptyUploadCvBtn) {
    emptyUploadCvBtn.addEventListener('click', () => {
      window.location.hash = '#/onboarding';
    });
  }

  if (qaTakeAssessmentBtn) {
    qaTakeAssessmentBtn.addEventListener('click', () => {
      window.location.hash = '#/assessments';
    });
  }

  if (qaUploadCvBtn) {
    qaUploadCvBtn.addEventListener('click', () => {
      window.location.hash = '#/onboarding';
    });
  }

  if (qaBrowseCoursesBtn) {
    qaBrowseCoursesBtn.addEventListener('click', () => {
      window.location.hash = '#/courses';
    });
  }

  if (qaViewTrendsBtn) {
    qaViewTrendsBtn.addEventListener('click', () => {
      window.location.hash = '#/market-trends';
    });
  }
}

/**
 * Initializes the dashboard lifecycle, executes API data retrieval, and binds handlers.
 *
 * @param {HTMLElement|string} container - Target DOM container.
 */
export async function init(container) {
  const el = resolveContainer(container);
  if (!el) return;

  render(el);
  bindDashboardEvents(el);
  await loadDashboardData(el);
  bindDashboardEvents(el);
}

export default {
  render,
  init
};
