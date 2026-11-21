/**
 * SkillForge Administration Console
 * Enterprise Governance and Content Management Interface
 *
 * Supported Tabs:
 * 1. User Management: Directory inspection, role elevation, account deactivation.
 * 2. Assessment Bank: Question taxonomy management, authoring, active state toggling, RFC 4180 export.
 * 3. Course Catalog: Curriculum management with inline editing, addition, deletion, and CSV import.
 * 4. Market Trends: Telemetry index inspection, directional tracking, and metric updates.
 *
 * All operations execute through browser window.fetch() calls against the API router.
 */

import { apiRouter } from '../../api/api-router.js';

// =============================================================================
// STATE DEFINITIONS
// =============================================================================

const state = {
  container: null,
  activeTab: 'users', // 'users' | 'assessment' | 'courses' | 'market'
  userRole: 'admin', // Current user role
  isAuthorized: true,

  // Tab 1: User Management
  users: {
    data: [],
    loading: false,
    error: null,
    searchQuery: '',
    roleFilter: 'all',
    typeFilter: 'all',
    cvFilter: 'all',
    sortColumn: 'name',
    sortAscending: true,
    selectedUser: null
  },

  // Tab 2: Assessment Bank
  assessment: {
    data: [],
    loading: false,
    error: null,
    searchQuery: '',
    categoryFilter: 'all',
    difficultyFilter: 'all',
    statusFilter: 'all',
    sortColumn: 'id',
    sortAscending: true,
    editingQuestion: null,
    showAddModal: false
  },

  // Tab 3: Course Catalog
  courses: {
    data: [],
    loading: false,
    error: null,
    searchQuery: '',
    categoryFilter: 'all',
    difficultyFilter: 'all',
    providerFilter: 'all',
    sortColumn: 'title',
    sortAscending: true,
    editingCourseId: null,
    inlineForm: {},
    showAddModal: false,
    showImportModal: false
  },

  // Tab 4: Market Trends
  market: {
    data: [],
    loading: false,
    error: null,
    searchQuery: '',
    directionFilter: 'all',
    sortColumn: 'domain',
    sortAscending: true,
    lastUpdated: null,
    editingTrend: null,
    showAddModal: false
  },

  // Global notification banner
  notification: null
};

// =============================================================================
// UTILITY HELPERS
// =============================================================================

/**
 * Escapes plain text for safe HTML rendering.
 * @param {*} value - Value to escape.
 * @returns {string} Sanitized HTML string.
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
 * Formats ISO timestamps into human-readable UTC representations.
 * @param {string} isoString - ISO date string.
 * @returns {string} Formatted date.
 */
function formatDate(isoString) {
  if (!isoString) return 'Not recorded';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const mins = String(d.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins} UTC`;
  } catch {
    return String(isoString);
  }
}

/**
 * Displays an ephemeral notification banner.
 * @param {string} message - Notification message.
 * @param {'success'|'warning'|'error'} [type='success'] - Severity level.
 */
function showNotification(message, type = 'success') {
  state.notification = { message, type };
  renderNotification();
  setTimeout(() => {
    if (state.notification && state.notification.message === message) {
      state.notification = null;
      renderNotification();
    }
  }, 4000);
}

/**
 * Renders or updates the notification banner in the container.
 */
function renderNotification() {
  if (!state.container) return;
  const slot = state.container.querySelector('#admin-notification-slot');
  if (!slot) return;

  if (!state.notification) {
    slot.innerHTML = '';
    return;
  }

  const { message, type } = state.notification;
  let bg = '#2D6A4F'; // Success
  if (type === 'warning') bg = '#D97706';
  if (type === 'error') bg = '#DC2626';

  slot.innerHTML = `
    <div style="
      background-color: ${bg};
      color: #FFFFFF;
      padding: 10px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: all 150ms ease-in-out;
    ">
      <span>${escapeHtml(message)}</span>
      <button type="button" id="btn-close-notification" style="
        background: transparent;
        border: none;
        color: #FFFFFF;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        padding: 0 4px;
      ">&times;</button>
    </div>
  `;

  const closeBtn = slot.querySelector('#btn-close-notification');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      state.notification = null;
      renderNotification();
    });
  }
}

/**
 * Verifies if active user role meets administrative or trainer permissions.
 * @returns {boolean} True if authorized.
 */
function checkAuthorization() {
  try {
    const storedUserRaw = localStorage.getItem('skillforge_user') || sessionStorage.getItem('skillforge_user');
    if (storedUserRaw) {
      const user = JSON.parse(storedUserRaw);
      const role = (user.role || user.user_type || '').toLowerCase();
      state.userRole = role;
      state.isAuthorized = role === 'admin' || role === 'trainer';
      return state.isAuthorized;
    }
  } catch {
    // Continue with default administrative privileges in simulated browser context
  }

  // Default to administrator in standalone environment
  state.userRole = 'admin';
  state.isAuthorized = true;
  return true;
}

// =============================================================================
// API DATA FETCHING ROUTINES (Pure fetch() operations)
// =============================================================================

/**
 * Fetches user accounts from the server via GET /api/users.
 */
async function fetchUsers() {
  state.users.loading = true;
  state.users.error = null;
  renderTabContent();

  try {
    const res = await fetch('/api/users');
    if (!res.ok) {
      throw new Error(`Failed to load users: HTTP ${res.status}`);
    }
    const data = await res.json();
    state.users.data = Array.isArray(data.users) ? data.users : [];
  } catch (err) {
    state.users.error = err.message;
  } finally {
    state.users.loading = false;
    renderTabContent();
  }
}

/**
 * Updates a user role via PUT /api/users/:id.
 * @param {string} userId - Target user identifier.
 * @param {string} newRole - Target role string.
 */
async function updateUserRole(userId, newRole) {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole, user_type: newRole })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Update failed with status ${res.status}`);
    }
    const data = await res.json();
    const updated = data.user;

    // Synchronize local state
    const index = state.users.data.findIndex((u) => u.id === userId);
    if (index !== -1 && updated) {
      state.users.data[index] = { ...state.users.data[index], ...updated };
    }
    showNotification(`User '${userId}' role updated to ${newRole}.`, 'success');
    renderTabContent();
  } catch (err) {
    showNotification(`Error updating role: ${err.message}`, 'error');
  }
}

/**
 * Toggles user active state via PUT /api/users/:id.
 * @param {string} userId - Target user identifier.
 * @param {boolean} currentActive - Active status before toggle.
 */
async function toggleUserActive(userId, currentActive) {
  const newActive = !currentActive;
  const newStatus = newActive ? 'active' : 'inactive';

  try {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: newActive, status: newStatus })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Update failed with status ${res.status}`);
    }
    const data = await res.json();
    const updated = data.user;

    const index = state.users.data.findIndex((u) => u.id === userId);
    if (index !== -1) {
      state.users.data[index] = {
        ...state.users.data[index],
        active: newActive,
        status: newStatus,
        ...(updated || {})
      };
    }
    showNotification(
      newActive ? `User account '${userId}' activated.` : `User account '${userId}' deactivated.`,
      newActive ? 'success' : 'warning'
    );
    renderTabContent();
  } catch (err) {
    showNotification(`Error changing user status: ${err.message}`, 'error');
  }
}

/**
 * Fetches assessment questions from the server via GET /api/questions.
 */
async function fetchQuestions() {
  state.assessment.loading = true;
  state.assessment.error = null;
  renderTabContent();

  try {
    const res = await fetch('/api/questions');
    if (!res.ok) {
      throw new Error(`Failed to load question bank: HTTP ${res.status}`);
    }
    const data = await res.json();
    state.assessment.data = Array.isArray(data.questions) ? data.questions : [];
  } catch (err) {
    state.assessment.error = err.message;
  } finally {
    state.assessment.loading = false;
    renderTabContent();
  }
}

/**
 * Creates a new assessment question via POST /api/questions.
 * @param {object} questionData - Structured question payload.
 */
async function createQuestion(questionData) {
  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questionData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    state.assessment.data.unshift(data.question);
    state.assessment.showAddModal = false;
    showNotification('New diagnostic question registered successfully.', 'success');
    renderTabContent();
  } catch (err) {
    showNotification(`Failed to create question: ${err.message}`, 'error');
  }
}

/**
 * Updates an assessment question via PUT /api/questions/:id.
 * @param {string} id - Question identifier.
 * @param {object} updates - Fields to merge.
 */
async function updateQuestion(id, updates) {
  try {
    const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const index = state.assessment.data.findIndex((q) => q.id === id);
    if (index !== -1) {
      state.assessment.data[index] = { ...state.assessment.data[index], ...data.question };
    }
    state.assessment.editingQuestion = null;
    showNotification(`Question '${id}' updated successfully.`, 'success');
    renderTabContent();
  } catch (err) {
    showNotification(`Failed to update question: ${err.message}`, 'error');
  }
}

/**
 * Toggles question active state via PUT /api/questions/:id.
 * @param {string} id - Question identifier.
 * @param {boolean} currentActive - Active state before toggle.
 */
async function toggleQuestionActive(id, currentActive) {
  const newActive = !currentActive;
  await updateQuestion(id, { active: newActive });
}

/**
 * Fetches course catalog from the server via GET /api/courses.
 */
async function fetchCourses() {
  state.courses.loading = true;
  state.courses.error = null;
  renderTabContent();

  try {
    const res = await fetch('/api/courses');
    if (!res.ok) {
      throw new Error(`Failed to load courses: HTTP ${res.status}`);
    }
    const data = await res.json();
    state.courses.data = Array.isArray(data.courses) ? data.courses : [];
  } catch (err) {
    state.courses.error = err.message;
  } finally {
    state.courses.loading = false;
    renderTabContent();
  }
}

/**
 * Creates a course via POST /api/courses.
 * @param {object} courseData - Course attributes.
 */
async function createCourse(courseData) {
  try {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courseData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    state.courses.data.unshift(data.course);
    state.courses.showAddModal = false;
    showNotification('Course registered in catalog.', 'success');
    renderTabContent();
  } catch (err) {
    showNotification(`Failed to create course: ${err.message}`, 'error');
  }
}

/**
 * Updates a course record via PUT /api/courses/:id.
 * @param {string} id - Course identifier.
 * @param {object} updates - Course attributes.
 */
async function updateCourse(id, updates) {
  try {
    const res = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const index = state.courses.data.findIndex((c) => c.id === id);
    if (index !== -1) {
      state.courses.data[index] = { ...state.courses.data[index], ...data.course };
    }
    state.courses.editingCourseId = null;
    state.courses.inlineForm = {};
    showNotification(`Course '${id}' updated successfully.`, 'success');
    renderTabContent();
  } catch (err) {
    showNotification(`Failed to update course: ${err.message}`, 'error');
  }
}

/**
 * Deletes a course record via DELETE /api/courses/:id.
 * @param {string} id - Course identifier.
 */
async function deleteCourse(id) {
  if (!confirm(`Confirm deletion of course record '${id}'? This action cannot be reversed.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    state.courses.data = state.courses.data.filter((c) => c.id !== id);
    showNotification(`Course '${id}' removed from catalog.`, 'warning');
    renderTabContent();
  } catch (err) {
    showNotification(`Failed to delete course: ${err.message}`, 'error');
  }
}

/**
 * Bulk imports courses from parsed CSV payload via POST /api/courses/bulk.
 * @param {Array<object>} coursesList - Array of course objects.
 */
async function bulkImportCourses(coursesList) {
  try {
    const res = await fetch('/api/courses/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courses: coursesList })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    state.courses.showImportModal = false;
    showNotification(data.message || `Imported ${coursesList.length} courses successfully.`, 'success');
    await fetchCourses();
  } catch (err) {
    showNotification(`Bulk import failed: ${err.message}`, 'error');
  }
}

/**
 * Fetches market trends from the server via GET /api/market/trends.
 */
async function fetchMarketTrends() {
  state.market.loading = true;
  state.market.error = null;
  renderTabContent();

  try {
    const res = await fetch('/api/market/trends');
    if (!res.ok) {
      throw new Error(`Failed to load market trends: HTTP ${res.status}`);
    }
    const data = await res.json();
    state.market.data = Array.isArray(data.trends) ? data.trends : [];
    state.market.lastUpdated = new Date().toISOString();
  } catch (err) {
    state.market.error = err.message;
  } finally {
    state.market.loading = false;
    renderTabContent();
  }
}

/**
 * Creates a market trend entry via POST /api/market/trends.
 * @param {object} trendData - Market trend payload.
 */
async function createMarketTrend(trendData) {
  try {
    const res = await fetch('/api/market/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trendData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    state.market.data.unshift(data.trend);
    state.market.lastUpdated = new Date().toISOString();
    state.market.showAddModal = false;
    showNotification('Market trend index registered.', 'success');
    renderTabContent();
  } catch (err) {
    showNotification(`Failed to create market trend: ${err.message}`, 'error');
  }
}

/**
 * Updates a market trend entry via PUT /api/market/trends/:id.
 * @param {string} id - Trend identifier.
 * @param {object} updates - Trend attributes.
 */
async function updateMarketTrend(id, updates) {
  try {
    const res = await fetch(`/api/market/trends/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const index = state.market.data.findIndex((t) => t.id === id);
    if (index !== -1) {
      state.market.data[index] = { ...state.market.data[index], ...data.trend };
    }
    state.market.lastUpdated = new Date().toISOString();
    state.market.editingTrend = null;
    showNotification(`Market trend '${id}' updated successfully.`, 'success');
    renderTabContent();
  } catch (err) {
    showNotification(`Failed to update trend: ${err.message}`, 'error');
  }
}

// =============================================================================
// CSV EXPORT / IMPORT CLIENT ROUTINES
// =============================================================================

/**
 * Escapes cell content for RFC 4180 CSV serialization.
 * @param {*} val - Cell value.
 * @returns {string} Escaped string.
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates an RFC 4180 CSV file from current questions bank and triggers download.
 */
function exportQuestionsToCsv() {
  const headers = ['ID', 'Category', 'Difficulty', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Index', 'Skill Tags', 'Explanation', 'Active'];
  const rows = state.assessment.data.map((q) => {
    const opts = q.options || [];
    return [
      escapeCsv(q.id),
      escapeCsv(q.category),
      escapeCsv(q.difficulty),
      escapeCsv(q.question_text),
      escapeCsv(opts[0] || ''),
      escapeCsv(opts[1] || ''),
      escapeCsv(opts[2] || ''),
      escapeCsv(opts[3] || ''),
      escapeCsv(q.correct_option_index ?? 0),
      escapeCsv(Array.isArray(q.skill_tags) ? q.skill_tags.join(';') : (q.skill_tags || '')),
      escapeCsv(q.explanation || ''),
      escapeCsv(q.active !== false ? 'Active' : 'Inactive')
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `skillforge_assessment_bank_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);

  showNotification(`Exported ${state.assessment.data.length} questions to CSV.`, 'success');
}

/**
 * Parses raw CSV string into array of course records.
 * @param {string} text - Raw CSV text.
 * @returns {Array<object>} Parsed courses.
 */
function parseCoursesCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
  const parsed = [];

  for (let i = 1; i < lines.length; i++) {
    // Regex matches CSV cells supporting quotes
    const pattern = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const values = [];
    let match;
    while ((match = pattern.exec(lines[i])) !== null) {
      let val = match[1];
      if (val === undefined) break;
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"');
      }
      values.push(val.trim());
      if (match.index === pattern.lastIndex) pattern.lastIndex++;
    }

    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;

    const record = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] || '';
    });

    const title = record.title || record['course title'] || record.name;
    if (!title) continue;

    parsed.push({
      title,
      provider: record.provider || 'Imported Curriculum',
      category: record.category || 'general',
      difficulty: record.difficulty || 'Intermediate',
      duration: record.duration || '10 hours',
      url: record.url || '#',
      description: record.description || '',
      skills: record.skills || record.skill_ids || ''
    });
  }

  return parsed;
}

// =============================================================================
// TAB 1: USER MANAGEMENT RENDERING
// =============================================================================

function renderUsersTab() {
  const { data, loading, error, searchQuery, roleFilter, typeFilter, cvFilter, sortColumn, sortAscending, selectedUser } = state.users;

  // Filter users
  let filtered = data.filter((u) => {
    if (roleFilter !== 'all' && (u.role || '').toLowerCase() !== roleFilter.toLowerCase()) {
      return false;
    }
    if (typeFilter !== 'all' && (u.user_type || '').toLowerCase() !== typeFilter.toLowerCase()) {
      return false;
    }
    if (cvFilter === 'uploaded' && !u.cv_uploaded) {
      return false;
    }
    if (cvFilter === 'pending' && u.cv_uploaded) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const target = (u.target_role || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !target.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Sort users
  filtered.sort((a, b) => {
    let valA = a[sortColumn] ?? '';
    let valB = b[sortColumn] ?? '';
    if (sortColumn === 'last_active') {
      valA = a.last_active || a.created_at || '';
      valB = b.last_active || b.created_at || '';
    }
    if (typeof valA === 'boolean') {
      valA = valA ? 1 : 0;
      valB = valB ? 1 : 0;
    }
    const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
    return sortAscending ? cmp : -cmp;
  });

  const sortIndicator = (col) => {
    if (sortColumn !== col) return '<span style="color: #64748B; font-size: 11px; margin-left: 4px;">&udarr;</span>';
    return sortAscending
      ? '<span style="color: #3B82F6; font-size: 11px; margin-left: 4px;">&uarr;</span>'
      : '<span style="color: #3B82F6; font-size: 11px; margin-left: 4px;">&darr;</span>';
  };

  return `
    <div>
      <!-- Controls Toolbar -->
      <div style="
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 16px;
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; flex: 1; min-width: 280px;">
          <input
            type="text"
            id="users-search-input"
            placeholder="Search candidate name, email, target role..."
            value="${escapeHtml(searchQuery)}"
            style="
              flex: 1;
              min-width: 220px;
              padding: 8px 12px;
              border: 1px solid #CBD5E1;
              border-radius: 4px;
              font-size: 13px;
              color: #1E293B;
              outline: none;
              transition: border-color 150ms ease-in-out;
            "
          />
          <select id="users-role-filter" style="
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            font-size: 13px;
            color: #1E293B;
            background-color: #FFFFFF;
            cursor: pointer;
          ">
            <option value="all" ${roleFilter === 'all' ? 'selected' : ''}>All Roles</option>
            <option value="admin" ${roleFilter === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="trainer" ${roleFilter === 'trainer' ? 'selected' : ''}>Trainer</option>
            <option value="employee" ${roleFilter === 'employee' ? 'selected' : ''}>Employee</option>
            <option value="student" ${roleFilter === 'student' ? 'selected' : ''}>Student</option>
          </select>
          <select id="users-cv-filter" style="
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            font-size: 13px;
            color: #1E293B;
            background-color: #FFFFFF;
            cursor: pointer;
          ">
            <option value="all" ${cvFilter === 'all' ? 'selected' : ''}>All CV Status</option>
            <option value="uploaded" ${cvFilter === 'uploaded' ? 'selected' : ''}>CV Uploaded</option>
            <option value="pending" ${cvFilter === 'pending' ? 'selected' : ''}>CV Pending</option>
          </select>
        </div>
        <div style="font-size: 13px; color: #64748B; font-weight: 500;">
          Showing ${filtered.length} of ${data.length} registered accounts
        </div>
      </div>

      <!-- Users Table Container -->
      <div style="
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        overflow-x: auto;
      ">
        ${loading ? `
          <div style="padding: 40px; text-align: center; color: #64748B; font-size: 14px;">
            Retrieving candidate records from database...
          </div>
        ` : error ? `
          <div style="padding: 24px; text-align: center; color: #DC2626; font-size: 14px;">
            Error loading user records: ${escapeHtml(error)}
          </div>
        ` : filtered.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: #64748B; font-size: 14px;">
            No accounts match the selected search or filter parameters.
          </div>
        ` : `
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
                <th class="sortable-user-header" data-col="name" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  Name ${sortIndicator('name')}
                </th>
                <th class="sortable-user-header" data-col="email" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  Email ${sortIndicator('email')}
                </th>
                <th class="sortable-user-header" data-col="user_type" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  Type ${sortIndicator('user_type')}
                </th>
                <th class="sortable-user-header" data-col="role" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  Role ${sortIndicator('role')}
                </th>
                <th class="sortable-user-header" data-col="target_role" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  Target ${sortIndicator('target_role')}
                </th>
                <th class="sortable-user-header" data-col="cv_uploaded" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  CV Uploaded ${sortIndicator('cv_uploaded')}
                </th>
                <th class="sortable-user-header" data-col="last_active" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  Last Active ${sortIndicator('last_active')}
                </th>
                <th style="padding: 12px 16px; font-weight: 600; color: #334155; text-align: right;">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((u) => {
                const isActive = u.active !== false && u.status !== 'inactive';
                const cvBadge = u.cv_uploaded
                  ? '<span style="background-color: #EBF5F0; color: #2D6A4F; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">Yes</span>'
                  : '<span style="background-color: #F1F5F9; color: #64748B; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">No</span>';
                const role = (u.role || 'employee').toLowerCase();
                const lastActiveStr = formatDate(u.last_active || u.created_at);

                return `
                  <tr style="
                    border-bottom: 1px solid #F1F5F9;
                    background-color: ${isActive ? '#FFFFFF' : '#F8FAFC'};
                    opacity: ${isActive ? '1' : '0.75'};
                    transition: background-color 150ms ease-in-out;
                  " class="user-row-item" data-id="${escapeHtml(u.id)}">
                    <td style="padding: 12px 16px; font-weight: 600; color: #1E293B;">
                      <a href="javascript:void(0)" class="btn-view-profile" data-id="${escapeHtml(u.id)}" style="color: #3B82F6; text-decoration: none;">
                        ${escapeHtml(u.name || 'Anonymous User')}
                      </a>
                    </td>
                    <td style="padding: 12px 16px; color: #475569;">
                      ${escapeHtml(u.email || 'N/A')}
                    </td>
                    <td style="padding: 12px 16px; color: #475569; text-transform: capitalize;">
                      ${escapeHtml(u.user_type || u.role || 'employee')}
                    </td>
                    <td style="padding: 12px 16px;">
                      <select class="user-role-select" data-id="${escapeHtml(u.id)}" style="
                        padding: 4px 8px;
                        font-size: 12px;
                        border: 1px solid #CBD5E1;
                        border-radius: 4px;
                        background-color: #FFFFFF;
                        color: #1E293B;
                        cursor: pointer;
                      ">
                        <option value="student" ${role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="employee" ${role === 'employee' ? 'selected' : ''}>Employee</option>
                        <option value="trainer" ${role === 'trainer' ? 'selected' : ''}>Trainer</option>
                        <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                      </select>
                    </td>
                    <td style="padding: 12px 16px; color: #334155;">
                      ${escapeHtml(u.target_role || 'General')}
                    </td>
                    <td style="padding: 12px 16px;">
                      ${cvBadge}
                    </td>
                    <td style="padding: 12px 16px; color: #64748B; font-size: 12px;">
                      ${escapeHtml(lastActiveStr)}
                    </td>
                    <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
                      <button
                        type="button"
                        class="btn-toggle-user-active"
                        data-id="${escapeHtml(u.id)}"
                        data-active="${isActive ? 'true' : 'false'}"
                        style="
                          background-color: ${isActive ? '#FFF1F2' : '#F0FDF4'};
                          color: ${isActive ? '#DC2626' : '#2D6A4F'};
                          border: 1px solid ${isActive ? '#FECDD3' : '#BBF7D0'};
                          padding: 4px 10px;
                          border-radius: 4px;
                          font-size: 12px;
                          font-weight: 500;
                          cursor: pointer;
                          transition: all 150ms ease-in-out;
                        "
                      >
                        ${isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- User Profile Modal -->
      ${selectedUser ? `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(30, 41, 59, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        ">
          <div style="
            background-color: #FFFFFF;
            border-radius: 6px;
            width: 100%;
            max-width: 580px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          ">
            <div style="
              background-color: #F8FAFC;
              padding: 16px 20px;
              border-bottom: 1px solid #E2E8F0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1E293B;">
                User Profile Dossier
              </h3>
              <button type="button" id="btn-close-profile-modal" style="
                background: transparent;
                border: none;
                font-size: 20px;
                color: #64748B;
                cursor: pointer;
                line-height: 1;
              ">&times;</button>
            </div>
            <div style="padding: 20px; font-size: 13px; color: #334155; max-height: 70vh; overflow-y: auto;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 4px;">Candidate Name</div>
                  <div style="font-weight: 600; color: #1E293B; font-size: 14px;">${escapeHtml(selectedUser.name || 'N/A')}</div>
                </div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 4px;">Email Address</div>
                  <div>${escapeHtml(selectedUser.email || 'N/A')}</div>
                </div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 4px;">System ID</div>
                  <div style="font-family: monospace; font-size: 12px; color: #475569;">${escapeHtml(selectedUser.id)}</div>
                </div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 4px;">Assigned Role / Type</div>
                  <div style="text-transform: capitalize;">${escapeHtml(selectedUser.role)} (${escapeHtml(selectedUser.user_type || selectedUser.role)})</div>
                </div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 4px;">Current Role</div>
                  <div>${escapeHtml(selectedUser.current_role || 'Not specified')}</div>
                </div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 4px;">Target Role</div>
                  <div style="font-weight: 600; color: #1E293B;">${escapeHtml(selectedUser.target_role || 'Not specified')}</div>
                </div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 4px;">Years of Experience</div>
                  <div>${escapeHtml(selectedUser.experience_years ?? '0')} years</div>
                </div>
                <div>
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 4px;">CV Status</div>
                  <div>${selectedUser.cv_uploaded ? 'Verified on file' : 'Pending submission'}</div>
                </div>
              </div>

              <div style="margin-bottom: 16px;">
                <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 4px;">Academic Background</div>
                <div>${escapeHtml(selectedUser.education || 'No formal degree recorded')}</div>
              </div>

              <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; margin-bottom: 6px;">Technical Stack Competencies</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${Array.isArray(selectedUser.tech_stack) && selectedUser.tech_stack.length > 0
                    ? selectedUser.tech_stack.map((t) => `
                        <span style="background-color: #F1F5F9; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">
                          ${escapeHtml(t)}
                        </span>
                      `).join('')
                    : '<span style="color: #64748B;">No skills cataloged</span>'}
                </div>
              </div>
            </div>
            <div style="
              background-color: #F8FAFC;
              padding: 12px 20px;
              border-top: 1px solid #E2E8F0;
              text-align: right;
            ">
              <button type="button" id="btn-close-profile-footer" style="
                background-color: #334155;
                color: #FFFFFF;
                border: none;
                padding: 6px 14px;
                border-radius: 4px;
                font-size: 13px;
                cursor: pointer;
                transition: background-color 150ms ease-in-out;
              ">
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// =============================================================================
// TAB 2: ASSESSMENT BANK RENDERING
// =============================================================================

function renderAssessmentTab() {
  const { data, loading, error, searchQuery, categoryFilter, difficultyFilter, statusFilter, sortColumn, sortAscending, editingQuestion, showAddModal } = state.assessment;

  // Extract distinct categories
  const categories = Array.from(new Set(data.map((q) => q.category).filter(Boolean))).sort();

  // Filter questions
  let filtered = data.filter((q) => {
    if (categoryFilter !== 'all' && (q.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (difficultyFilter !== 'all' && (q.difficulty || '').toLowerCase() !== difficultyFilter.toLowerCase()) {
      return false;
    }
    if (statusFilter === 'active' && q.active === false) {
      return false;
    }
    if (statusFilter === 'inactive' && q.active !== false) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const text = (q.question_text || '').toLowerCase();
      const id = (q.id || '').toLowerCase();
      const skills = Array.isArray(q.skill_tags) ? q.skill_tags.join(' ').toLowerCase() : '';
      if (!text.includes(query) && !id.includes(query) && !skills.includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Sort questions
  filtered.sort((a, b) => {
    const valA = a[sortColumn] ?? '';
    const valB = b[sortColumn] ?? '';
    const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
    return sortAscending ? cmp : -cmp;
  });

  const sortIndicator = (col) => {
    if (sortColumn !== col) return '<span style="color: #64748B; font-size: 11px; margin-left: 4px;">&udarr;</span>';
    return sortAscending
      ? '<span style="color: #3B82F6; font-size: 11px; margin-left: 4px;">&uarr;</span>'
      : '<span style="color: #3B82F6; font-size: 11px; margin-left: 4px;">&darr;</span>';
  };

  return `
    <div>
      <!-- Controls Toolbar -->
      <div style="
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 16px;
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; flex: 1; min-width: 300px;">
          <input
            type="text"
            id="questions-search-input"
            placeholder="Search questions by text, ID, or skill tag..."
            value="${escapeHtml(searchQuery)}"
            style="
              flex: 1;
              min-width: 200px;
              padding: 8px 12px;
              border: 1px solid #CBD5E1;
              border-radius: 4px;
              font-size: 13px;
              color: #1E293B;
              outline: none;
            "
          />
          <select id="questions-category-filter" style="
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            font-size: 13px;
            color: #1E293B;
            background-color: #FFFFFF;
            cursor: pointer;
          ">
            <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            ${categories.map((cat) => `<option value="${escapeHtml(cat)}" ${categoryFilter === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}
          </select>
          <select id="questions-difficulty-filter" style="
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            font-size: 13px;
            color: #1E293B;
            background-color: #FFFFFF;
            cursor: pointer;
          ">
            <option value="all" ${difficultyFilter === 'all' ? 'selected' : ''}>All Difficulties</option>
            <option value="Beginner" ${difficultyFilter === 'Beginner' ? 'selected' : ''}>Beginner</option>
            <option value="Intermediate" ${difficultyFilter === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
            <option value="Advanced" ${difficultyFilter === 'Advanced' ? 'selected' : ''}>Advanced</option>
          </select>
          <select id="questions-status-filter" style="
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            font-size: 13px;
            color: #1E293B;
            background-color: #FFFFFF;
            cursor: pointer;
          ">
            <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Status</option>
            <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>

        <div style="display: flex; gap: 8px;">
          <button
            type="button"
            id="btn-export-questions"
            style="
              background-color: #FFFFFF;
              color: #334155;
              border: 1px solid #CBD5E1;
              padding: 8px 14px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              transition: all 150ms ease-in-out;
            "
          >
            Bulk Export
          </button>
          <button
            type="button"
            id="btn-open-add-question"
            style="
              background-color: #3B82F6;
              color: #FFFFFF;
              border: none;
              padding: 8px 14px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 150ms ease-in-out;
            "
          >
            Add Question
          </button>
        </div>
      </div>

      <!-- Questions Table -->
      <div style="
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        overflow-x: auto;
      ">
        ${loading ? `
          <div style="padding: 40px; text-align: center; color: #64748B; font-size: 14px;">
            Loading assessment question bank...
          </div>
        ` : error ? `
          <div style="padding: 24px; text-align: center; color: #DC2626; font-size: 14px;">
            Failed to query question bank: ${escapeHtml(error)}
          </div>
        ` : filtered.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: #64748B; font-size: 14px;">
            No questions found matching current criteria.
          </div>
        ` : `
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
                <th class="sortable-question-header" data-col="id" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 110px;">
                  ID ${sortIndicator('id')}
                </th>
                <th class="sortable-question-header" data-col="question_text" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  Question ${sortIndicator('question_text')}
                </th>
                <th class="sortable-question-header" data-col="category" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 170px;">
                  Category ${sortIndicator('category')}
                </th>
                <th class="sortable-question-header" data-col="difficulty" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 110px;">
                  Difficulty ${sortIndicator('difficulty')}
                </th>
                <th style="padding: 12px 16px; font-weight: 600; color: #334155; width: 180px;">
                  Skills
                </th>
                <th style="padding: 12px 16px; font-weight: 600; color: #334155; width: 90px;">
                  Status
                </th>
                <th style="padding: 12px 16px; font-weight: 600; color: #334155; text-align: right; width: 140px;">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((q) => {
                const isActive = q.active !== false;
                const truncated = (q.question_text || '').length > 75
                  ? (q.question_text || '').substring(0, 75) + '...'
                  : (q.question_text || '');

                let diffBadge = 'background-color: #F1F5F9; color: #334155;';
                if (q.difficulty === 'Beginner') diffBadge = 'background-color: #EFF6FF; color: #1D4ED8;';
                if (q.difficulty === 'Intermediate') diffBadge = 'background-color: #FEF3C7; color: #B45309;';
                if (q.difficulty === 'Advanced') diffBadge = 'background-color: #F1F5F9; color: #334155;';

                const skillsList = Array.isArray(q.skill_tags) ? q.skill_tags : [];

                return `
                  <tr style="
                    border-bottom: 1px solid #F1F5F9;
                    background-color: ${isActive ? '#FFFFFF' : '#F8FAFC'};
                    opacity: ${isActive ? '1' : '0.75'};
                    transition: background-color 150ms ease-in-out;
                  ">
                    <td style="padding: 12px 16px; font-family: monospace; font-size: 12px; color: #475569;">
                      ${escapeHtml(q.id)}
                    </td>
                    <td style="padding: 12px 16px; color: #1E293B; font-weight: 500;" title="${escapeHtml(q.question_text)}">
                      ${escapeHtml(truncated)}
                    </td>
                    <td style="padding: 12px 16px; color: #475569;">
                      ${escapeHtml(q.category || 'General')}
                    </td>
                    <td style="padding: 12px 16px;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; ${diffBadge}">
                        ${escapeHtml(q.difficulty || 'Intermediate')}
                      </span>
                    </td>
                    <td style="padding: 12px 16px;">
                      <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${skillsList.slice(0, 3).map((s) => `
                          <span style="background-color: #F1F5F9; color: #475569; padding: 1px 6px; border-radius: 4px; font-size: 10px;">
                            ${escapeHtml(s.replace(/^skill_/, ''))}
                          </span>
                        `).join('')}
                        ${skillsList.length > 3 ? `<span style="color: #64748B; font-size: 10px;">+${skillsList.length - 3}</span>` : ''}
                      </div>
                    </td>
                    <td style="padding: 12px 16px;">
                      ${isActive
                        ? '<span style="background-color: #EBF5F0; color: #2D6A4F; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">Active</span>'
                        : '<span style="background-color: #F1F5F9; color: #64748B; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;">Inactive</span>'}
                    </td>
                    <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
                      <button
                        type="button"
                        class="btn-edit-question"
                        data-id="${escapeHtml(q.id)}"
                        style="
                          background: transparent;
                          border: 1px solid #CBD5E1;
                          color: #334155;
                          padding: 4px 8px;
                          border-radius: 4px;
                          font-size: 11px;
                          cursor: pointer;
                          margin-right: 4px;
                        "
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="btn-toggle-question-active"
                        data-id="${escapeHtml(q.id)}"
                        data-active="${isActive ? 'true' : 'false'}"
                        style="
                          background-color: ${isActive ? '#FFF1F2' : '#F0FDF4'};
                          color: ${isActive ? '#DC2626' : '#2D6A4F'};
                          border: 1px solid ${isActive ? '#FECDD3' : '#BBF7D0'};
                          padding: 4px 8px;
                          border-radius: 4px;
                          font-size: 11px;
                          cursor: pointer;
                        "
                      >
                        ${isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- Add / Edit Question Modal -->
      ${(showAddModal || editingQuestion) ? `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(30, 41, 59, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        ">
          <div style="
            background-color: #FFFFFF;
            border-radius: 6px;
            width: 100%;
            max-width: 620px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          ">
            <div style="
              background-color: #F8FAFC;
              padding: 14px 20px;
              border-bottom: 1px solid #E2E8F0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #1E293B;">
                ${editingQuestion ? 'Edit Assessment Question' : 'Register New Diagnostic Question'}
              </h3>
              <button type="button" id="btn-close-question-modal" style="
                background: transparent;
                border: none;
                font-size: 20px;
                color: #64748B;
                cursor: pointer;
                line-height: 1;
              ">&times;</button>
            </div>
            <form id="form-question-modal" style="padding: 20px; font-size: 13px; max-height: 75vh; overflow-y: auto;">
              <div style="margin-bottom: 14px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">
                  Question Text *
                </label>
                <textarea
                  id="q-modal-text"
                  required
                  rows="3"
                  style="
                    width: 100%;
                    box-sizing: border-box;
                    padding: 8px 10px;
                    border: 1px solid #CBD5E1;
                    border-radius: 4px;
                    font-size: 13px;
                    color: #1E293B;
                    outline: none;
                  "
                >${escapeHtml(editingQuestion?.question_text || '')}</textarea>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                <div>
                  <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Category *</label>
                  <input
                    type="text"
                    id="q-modal-category"
                    required
                    value="${escapeHtml(editingQuestion?.category || 'Programming Fundamentals')}"
                    style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 13px;"
                  />
                </div>
                <div>
                  <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Difficulty *</label>
                  <select id="q-modal-difficulty" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 13px; background-color: #FFFFFF;">
                    <option value="Beginner" ${editingQuestion?.difficulty === 'Beginner' ? 'selected' : ''}>Beginner</option>
                    <option value="Intermediate" ${!editingQuestion || editingQuestion?.difficulty === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                    <option value="Advanced" ${editingQuestion?.difficulty === 'Advanced' ? 'selected' : ''}>Advanced</option>
                  </select>
                </div>
              </div>

              <div style="margin-bottom: 14px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">
                  Multiple Choice Options (4 Required) *
                </label>
                ${[0, 1, 2, 3].map((idx) => `
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <input
                      type="radio"
                      name="q-modal-correct-opt"
                      value="${idx}"
                      ${(editingQuestion?.correct_option_index ?? 0) === idx ? 'checked' : ''}
                      title="Select as correct option"
                    />
                    <input
                      type="text"
                      class="q-modal-option-input"
                      data-index="${idx}"
                      required
                      placeholder="Option ${String.fromCharCode(65 + idx)}"
                      value="${escapeHtml((editingQuestion?.options || [])[idx] || '')}"
                      style="flex: 1; padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 13px;"
                    />
                  </div>
                `).join('')}
                <div style="font-size: 11px; color: #64748B;">Radio button marks the correct answer.</div>
              </div>

              <div style="margin-bottom: 14px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">
                  Skill Tags (comma separated)
                </label>
                <input
                  type="text"
                  id="q-modal-skills"
                  placeholder="e.g. javascript, react, algorithm"
                  value="${escapeHtml(Array.isArray(editingQuestion?.skill_tags) ? editingQuestion.skill_tags.join(', ') : '')}"
                  style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 13px;"
                />
              </div>

              <div style="margin-bottom: 14px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">
                  Technical Explanation
                </label>
                <textarea
                  id="q-modal-explanation"
                  rows="2"
                  placeholder="Explain why the selected option is correct according to specifications."
                  style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px; font-size: 13px;"
                >${escapeHtml(editingQuestion?.explanation || '')}</textarea>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <input
                  type="checkbox"
                  id="q-modal-active"
                  ${editingQuestion?.active !== false ? 'checked' : ''}
                />
                <label for="q-modal-active" style="font-size: 13px; color: #334155; cursor: pointer;">
                  Active for assessment generation
                </label>
              </div>

              <div style="
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
                gap: 8px;
              ">
                <button
                  type="button"
                  id="btn-cancel-question-modal"
                  style="background-color: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 6px 14px; border-radius: 4px; font-size: 13px; cursor: pointer;"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style="background-color: #3B82F6; border: none; color: #FFFFFF; padding: 6px 14px; border-radius: 4px; font-size: 13px; font-weight: 500; cursor: pointer;"
                >
                  ${editingQuestion ? 'Save Changes' : 'Register Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// =============================================================================
// TAB 3: COURSE CATALOG RENDERING
// =============================================================================

function renderCoursesTab() {
  const { data, loading, error, searchQuery, categoryFilter, difficultyFilter, providerFilter, sortColumn, sortAscending, editingCourseId, inlineForm, showAddModal, showImportModal } = state.courses;

  // Extract distinct categories and providers
  const categories = Array.from(new Set(data.map((c) => c.category).filter(Boolean))).sort();
  const providers = Array.from(new Set(data.map((c) => c.provider).filter(Boolean))).sort();

  // Filter courses
  let filtered = data.filter((c) => {
    if (categoryFilter !== 'all' && (c.category || '').toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (difficultyFilter !== 'all' && (c.difficulty || '').toLowerCase() !== difficultyFilter.toLowerCase()) {
      return false;
    }
    if (providerFilter !== 'all' && (c.provider || '').toLowerCase() !== providerFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = (c.title || '').toLowerCase();
      const provider = (c.provider || '').toLowerCase();
      const desc = (c.description || '').toLowerCase();
      if (!title.includes(q) && !provider.includes(q) && !desc.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Sort courses
  filtered.sort((a, b) => {
    const valA = a[sortColumn] ?? '';
    const valB = b[sortColumn] ?? '';
    const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
    return sortAscending ? cmp : -cmp;
  });

  const sortIndicator = (col) => {
    if (sortColumn !== col) return '<span style="color: #64748B; font-size: 11px; margin-left: 4px;">&udarr;</span>';
    return sortAscending
      ? '<span style="color: #3B82F6; font-size: 11px; margin-left: 4px;">&uarr;</span>'
      : '<span style="color: #3B82F6; font-size: 11px; margin-left: 4px;">&darr;</span>';
  };

  return `
    <div>
      <!-- Controls Toolbar -->
      <div style="
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 16px;
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; flex: 1; min-width: 300px;">
          <input
            type="text"
            id="courses-search-input"
            placeholder="Search courses by title, provider, or topic..."
            value="${escapeHtml(searchQuery)}"
            style="
              flex: 1;
              min-width: 200px;
              padding: 8px 12px;
              border: 1px solid #CBD5E1;
              border-radius: 4px;
              font-size: 13px;
              color: #1E293B;
              outline: none;
            "
          />
          <select id="courses-category-filter" style="
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            font-size: 13px;
            color: #1E293B;
            background-color: #FFFFFF;
            cursor: pointer;
          ">
            <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>All Categories</option>
            ${categories.map((cat) => `<option value="${escapeHtml(cat)}" ${categoryFilter === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`).join('')}
          </select>
          <select id="courses-difficulty-filter" style="
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            font-size: 13px;
            color: #1E293B;
            background-color: #FFFFFF;
            cursor: pointer;
          ">
            <option value="all" ${difficultyFilter === 'all' ? 'selected' : ''}>All Difficulties</option>
            <option value="Beginner" ${difficultyFilter === 'Beginner' ? 'selected' : ''}>Beginner</option>
            <option value="Intermediate" ${difficultyFilter === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
            <option value="Advanced" ${difficultyFilter === 'Advanced' ? 'selected' : ''}>Advanced</option>
          </select>
          <select id="courses-provider-filter" style="
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            font-size: 13px;
            color: #1E293B;
            background-color: #FFFFFF;
            cursor: pointer;
          ">
            <option value="all" ${providerFilter === 'all' ? 'selected' : ''}>All Providers</option>
            ${providers.map((p) => `<option value="${escapeHtml(p)}" ${providerFilter === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
          </select>
        </div>

        <div style="display: flex; gap: 8px;">
          <button
            type="button"
            id="btn-open-import-csv"
            style="
              background-color: #FFFFFF;
              color: #334155;
              border: 1px solid #CBD5E1;
              padding: 8px 14px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              transition: all 150ms ease-in-out;
            "
          >
            Import CSV
          </button>
          <button
            type="button"
            id="btn-open-add-course"
            style="
              background-color: #3B82F6;
              color: #FFFFFF;
              border: none;
              padding: 8px 14px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 150ms ease-in-out;
            "
          >
            Add Course
          </button>
        </div>
      </div>

      <!-- Courses Table -->
      <div style="
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        overflow-x: auto;
      ">
        ${loading ? `
          <div style="padding: 40px; text-align: center; color: #64748B; font-size: 14px;">
            Retrieving course catalog...
          </div>
        ` : error ? `
          <div style="padding: 24px; text-align: center; color: #DC2626; font-size: 14px;">
            Failed to query course catalog: ${escapeHtml(error)}
          </div>
        ` : filtered.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: #64748B; font-size: 14px;">
            No courses found matching selected filters.
          </div>
        ` : `
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
                <th class="sortable-course-header" data-col="title" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  Title ${sortIndicator('title')}
                </th>
                <th class="sortable-course-header" data-col="provider" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 160px;">
                  Provider ${sortIndicator('provider')}
                </th>
                <th class="sortable-course-header" data-col="category" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 130px;">
                  Category ${sortIndicator('category')}
                </th>
                <th class="sortable-course-header" data-col="difficulty" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 110px;">
                  Difficulty ${sortIndicator('difficulty')}
                </th>
                <th class="sortable-course-header" data-col="duration" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 100px;">
                  Duration ${sortIndicator('duration')}
                </th>
                <th style="padding: 12px 16px; font-weight: 600; color: #334155; text-align: right; width: 160px;">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((c) => {
                const isEditing = editingCourseId === c.id;

                if (isEditing) {
                  return `
                    <tr style="background-color: #F8FAFC; border-bottom: 1px solid #CBD5E1;">
                      <td style="padding: 8px 12px;">
                        <input
                          type="text"
                          id="inline-edit-title"
                          value="${escapeHtml(inlineForm.title ?? c.title)}"
                          style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #3B82F6; border-radius: 4px; font-size: 13px;"
                        />
                      </td>
                      <td style="padding: 8px 12px;">
                        <input
                          type="text"
                          id="inline-edit-provider"
                          value="${escapeHtml(inlineForm.provider ?? c.provider)}"
                          style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #3B82F6; border-radius: 4px; font-size: 13px;"
                        />
                      </td>
                      <td style="padding: 8px 12px;">
                        <input
                          type="text"
                          id="inline-edit-category"
                          value="${escapeHtml(inlineForm.category ?? c.category)}"
                          style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #3B82F6; border-radius: 4px; font-size: 13px;"
                        />
                      </td>
                      <td style="padding: 8px 12px;">
                        <select id="inline-edit-difficulty" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #3B82F6; border-radius: 4px; font-size: 13px; background-color: #FFFFFF;">
                          <option value="Beginner" ${(inlineForm.difficulty ?? c.difficulty) === 'Beginner' ? 'selected' : ''}>Beginner</option>
                          <option value="Intermediate" ${(inlineForm.difficulty ?? c.difficulty) === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
                          <option value="Advanced" ${(inlineForm.difficulty ?? c.difficulty) === 'Advanced' ? 'selected' : ''}>Advanced</option>
                        </select>
                      </td>
                      <td style="padding: 8px 12px;">
                        <input
                          type="text"
                          id="inline-edit-duration"
                          value="${escapeHtml(inlineForm.duration ?? c.duration)}"
                          style="width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #3B82F6; border-radius: 4px; font-size: 13px;"
                        />
                      </td>
                      <td style="padding: 8px 12px; text-align: right; white-space: nowrap;">
                        <button
                          type="button"
                          class="btn-save-inline-course"
                          data-id="${escapeHtml(c.id)}"
                          style="background-color: #2D6A4F; color: #FFFFFF; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500; cursor: pointer; margin-right: 4px;"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          class="btn-cancel-inline-course"
                          style="background-color: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  `;
                }

                return `
                  <tr style="border-bottom: 1px solid #F1F5F9; transition: background-color 150ms ease-in-out;">
                    <td style="padding: 12px 16px;">
                      <div style="font-weight: 600; color: #1E293B;">
                        ${escapeHtml(c.title)}
                      </div>
                      ${c.description ? `<div style="font-size: 11px; color: #64748B; margin-top: 2px;">${escapeHtml(c.description.slice(0, 80))}${c.description.length > 80 ? '...' : ''}</div>` : ''}
                    </td>
                    <td style="padding: 12px 16px; color: #475569;">
                      ${escapeHtml(c.provider || 'Internal')}
                    </td>
                    <td style="padding: 12px 16px; color: #475569; text-transform: capitalize;">
                      ${escapeHtml(c.category || 'General')}
                    </td>
                    <td style="padding: 12px 16px;">
                      <span style="background-color: #F1F5F9; color: #334155; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;">
                        ${escapeHtml(c.difficulty || 'Intermediate')}
                      </span>
                    </td>
                    <td style="padding: 12px 16px; color: #64748B; font-size: 12px;">
                      ${escapeHtml(c.duration || 'Flexible')}
                    </td>
                    <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
                      <button
                        type="button"
                        class="btn-start-inline-edit"
                        data-id="${escapeHtml(c.id)}"
                        style="background: transparent; border: 1px solid #CBD5E1; color: #334155; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; margin-right: 4px;"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="btn-delete-course"
                        data-id="${escapeHtml(c.id)}"
                        style="background-color: #FFF1F2; border: 1px solid #FECDD3; color: #DC2626; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- Add Course Modal -->
      ${showAddModal ? `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(30, 41, 59, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        ">
          <div style="
            background-color: #FFFFFF;
            border-radius: 6px;
            width: 100%;
            max-width: 580px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          ">
            <div style="
              background-color: #F8FAFC;
              padding: 14px 20px;
              border-bottom: 1px solid #E2E8F0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #1E293B;">
                Add Course to Catalog
              </h3>
              <button type="button" id="btn-close-course-modal" style="
                background: transparent;
                border: none;
                font-size: 20px;
                color: #64748B;
                cursor: pointer;
                line-height: 1;
              ">&times;</button>
            </div>
            <form id="form-add-course" style="padding: 20px; font-size: 13px;">
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Course Title *</label>
                <input type="text" id="course-add-title" required style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;" />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div>
                  <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Provider *</label>
                  <input type="text" id="course-add-provider" required placeholder="e.g. SkillForge Academy" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;" />
                </div>
                <div>
                  <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Category *</label>
                  <input type="text" id="course-add-category" required placeholder="e.g. gap-fixing" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;" />
                </div>
                <div>
                  <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Difficulty *</label>
                  <select id="course-add-difficulty" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px; background-color: #FFFFFF;">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate" selected>Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Duration</label>
                  <input type="text" id="course-add-duration" placeholder="e.g. 24 hours" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;" />
                </div>
              </div>
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Syllabus Link (URL)</label>
                <input type="url" id="course-add-url" placeholder="https://..." style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;" />
              </div>
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Skills Covered (comma separated)</label>
                <input type="text" id="course-add-skills" placeholder="skill_typescript, skill_react" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;" />
              </div>
              <div style="margin-bottom: 16px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Description</label>
                <textarea id="course-add-desc" rows="2" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;"></textarea>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button type="button" id="btn-cancel-course-modal" style="background-color: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 6px 14px; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button type="submit" style="background-color: #3B82F6; border: none; color: #FFFFFF; padding: 6px 14px; border-radius: 4px; font-weight: 500; cursor: pointer;">Save Course</button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}

      <!-- Import CSV Modal -->
      ${showImportModal ? `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(30, 41, 59, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        ">
          <div style="
            background-color: #FFFFFF;
            border-radius: 6px;
            width: 100%;
            max-width: 580px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          ">
            <div style="
              background-color: #F8FAFC;
              padding: 14px 20px;
              border-bottom: 1px solid #E2E8F0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #1E293B;">
                Import Courses from CSV
              </h3>
              <button type="button" id="btn-close-import-modal" style="
                background: transparent;
                border: none;
                font-size: 20px;
                color: #64748B;
                cursor: pointer;
                line-height: 1;
              ">&times;</button>
            </div>
            <div style="padding: 20px; font-size: 13px;">
              <p style="color: #64748B; margin-top: 0; line-height: 1.5;">
                Select a formatted CSV file or paste raw CSV records below. Columns supported:
                <code style="background-color: #F1F5F9; padding: 2px 4px; border-radius: 4px;">Title, Provider, Category, Difficulty, Duration, Skills, Description</code>.
              </p>

              <div style="margin-bottom: 14px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 6px;">Select Local CSV File</label>
                <input type="file" id="courses-file-input" accept=".csv,text/csv" style="font-size: 13px; color: #475569;" />
              </div>

              <div style="margin-bottom: 16px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 6px;">Or Paste Raw CSV Text</label>
                <textarea
                  id="courses-csv-paste"
                  rows="6"
                  placeholder="Title,Provider,Category,Difficulty,Duration,Skills&#10;Systems Architecture,SkillForge,Architecture,Advanced,30 hours,skill_system_design"
                  style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px; font-family: monospace; font-size: 12px;"
                ></textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button type="button" id="btn-cancel-import-modal" style="background-color: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 6px 14px; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button type="button" id="btn-submit-csv-import" style="background-color: #3B82F6; border: none; color: #FFFFFF; padding: 6px 14px; border-radius: 4px; font-weight: 500; cursor: pointer;">Execute Import</button>
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// =============================================================================
// TAB 4: MARKET TRENDS RENDERING
// =============================================================================

function renderMarketTab() {
  const { data, loading, error, searchQuery, directionFilter, sortColumn, sortAscending, lastUpdated, editingTrend, showAddModal } = state.market;

  // Filter trends
  let filtered = data.filter((t) => {
    if (directionFilter !== 'all' && (t.trend_direction || '').toLowerCase() !== directionFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const domain = (t.domain || '').toLowerCase();
      const skills = Array.isArray(t.key_skills) ? t.key_skills.join(' ').toLowerCase() : '';
      if (!domain.includes(q) && !skills.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Sort trends
  filtered.sort((a, b) => {
    let valA = a[sortColumn] ?? '';
    let valB = b[sortColumn] ?? '';
    if (sortColumn === 'demand_score') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortAscending ? valA - valB : valB - valA;
    }
    const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
    return sortAscending ? cmp : -cmp;
  });

  const sortIndicator = (col) => {
    if (sortColumn !== col) return '<span style="color: #64748B; font-size: 11px; margin-left: 4px;">&udarr;</span>';
    return sortAscending
      ? '<span style="color: #3B82F6; font-size: 11px; margin-left: 4px;">&uarr;</span>'
      : '<span style="color: #3B82F6; font-size: 11px; margin-left: 4px;">&darr;</span>';
  };

  return `
    <div>
      <!-- Controls Toolbar -->
      <div style="
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        padding: 16px;
        margin-bottom: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; flex: 1; min-width: 280px;">
          <input
            type="text"
            id="market-search-input"
            placeholder="Search domain or key technology skill..."
            value="${escapeHtml(searchQuery)}"
            style="
              flex: 1;
              min-width: 220px;
              padding: 8px 12px;
              border: 1px solid #CBD5E1;
              border-radius: 4px;
              font-size: 13px;
              color: #1E293B;
              outline: none;
            "
          />
          <select id="market-direction-filter" style="
            padding: 8px 12px;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            font-size: 13px;
            color: #1E293B;
            background-color: #FFFFFF;
            cursor: pointer;
          ">
            <option value="all" ${directionFilter === 'all' ? 'selected' : ''}>All Trajectories</option>
            <option value="Rising" ${directionFilter === 'Rising' ? 'selected' : ''}>Rising</option>
            <option value="Accelerating" ${directionFilter === 'Accelerating' ? 'selected' : ''}>Accelerating</option>
            <option value="Stable" ${directionFilter === 'Stable' ? 'selected' : ''}>Stable</option>
            <option value="Declining" ${directionFilter === 'Declining' ? 'selected' : ''}>Declining</option>
          </select>
        </div>

        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="font-size: 12px; color: #64748B;">
            Last synced: <span style="font-weight: 600; color: #334155;">${formatDate(lastUpdated)}</span>
          </div>
          <button
            type="button"
            id="btn-open-add-trend"
            style="
              background-color: #3B82F6;
              color: #FFFFFF;
              border: none;
              padding: 8px 14px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 150ms ease-in-out;
            "
          >
            Add Trend Index
          </button>
        </div>
      </div>

      <!-- Trends Table -->
      <div style="
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 6px;
        overflow-x: auto;
      ">
        ${loading ? `
          <div style="padding: 40px; text-align: center; color: #64748B; font-size: 14px;">
            Loading market telemetry records...
          </div>
        ` : error ? `
          <div style="padding: 24px; text-align: center; color: #DC2626; font-size: 14px;">
            Failed to query market trends: ${escapeHtml(error)}
          </div>
        ` : filtered.length === 0 ? `
          <div style="padding: 40px; text-align: center; color: #64748B; font-size: 14px;">
            No market telemetry points found.
          </div>
        ` : `
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
            <thead>
              <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
                <th class="sortable-trend-header" data-col="domain" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none;">
                  Domain / Technology ${sortIndicator('domain')}
                </th>
                <th class="sortable-trend-header" data-col="trend_direction" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 140px;">
                  Trajectory ${sortIndicator('trend_direction')}
                </th>
                <th class="sortable-trend-header" data-col="demand_score" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 130px;">
                  Demand Index ${sortIndicator('demand_score')}
                </th>
                <th class="sortable-trend-header" data-col="year_over_year_growth" style="padding: 12px 16px; font-weight: 600; color: #334155; cursor: pointer; user-select: none; width: 120px;">
                  YoY Growth ${sortIndicator('year_over_year_growth')}
                </th>
                <th style="padding: 12px 16px; font-weight: 600; color: #334155;">
                  Key Associated Skills
                </th>
                <th style="padding: 12px 16px; font-weight: 600; color: #334155; width: 140px;">
                  Last Modified
                </th>
                <th style="padding: 12px 16px; font-weight: 600; color: #334155; text-align: right; width: 90px;">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((t) => {
                let badgeStyle = 'background-color: #F1F5F9; color: #334155;';
                if (t.trend_direction === 'Rising') badgeStyle = 'background-color: #EBF5F0; color: #2D6A4F;';
                if (t.trend_direction === 'Accelerating') badgeStyle = 'background-color: #EFF6FF; color: #1D4ED8;';
                if (t.trend_direction === 'Declining') badgeStyle = 'background-color: #FEF3C7; color: #B45309;';

                const skills = Array.isArray(t.key_skills) ? t.key_skills : [];
                const updatedStr = formatDate(t.updated_at || lastUpdated);

                return `
                  <tr style="border-bottom: 1px solid #F1F5F9; transition: background-color 150ms ease-in-out;">
                    <td style="padding: 12px 16px; font-weight: 600; color: #1E293B;">
                      ${escapeHtml(t.domain)}
                      ${t.description ? `<div style="font-size: 11px; font-weight: normal; color: #64748B; margin-top: 2px;">${escapeHtml(t.description)}</div>` : ''}
                    </td>
                    <td style="padding: 12px 16px;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; ${badgeStyle}">
                        ${escapeHtml(t.trend_direction || 'Stable')}
                      </span>
                    </td>
                    <td style="padding: 12px 16px; font-weight: 600; color: #1E293B;">
                      ${escapeHtml(t.demand_score ?? 0)} / 100
                    </td>
                    <td style="padding: 12px 16px; font-family: monospace; color: #2D6A4F; font-weight: 600;">
                      ${escapeHtml(t.year_over_year_growth || '0%')}
                    </td>
                    <td style="padding: 12px 16px;">
                      <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                        ${skills.map((s) => `
                          <span style="background-color: #F1F5F9; color: #475569; padding: 1px 6px; border-radius: 4px; font-size: 11px;">
                            ${escapeHtml(s)}
                          </span>
                        `).join('')}
                      </div>
                    </td>
                    <td style="padding: 12px 16px; color: #64748B; font-size: 11px;">
                      ${escapeHtml(updatedStr)}
                    </td>
                    <td style="padding: 12px 16px; text-align: right; white-space: nowrap;">
                      <button
                        type="button"
                        class="btn-edit-trend"
                        data-id="${escapeHtml(t.id)}"
                        style="background: transparent; border: 1px solid #CBD5E1; color: #334155; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- Add / Edit Trend Modal -->
      ${(showAddModal || editingTrend) ? `
        <div style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(30, 41, 59, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        ">
          <div style="
            background-color: #FFFFFF;
            border-radius: 6px;
            width: 100%;
            max-width: 540px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          ">
            <div style="
              background-color: #F8FAFC;
              padding: 14px 20px;
              border-bottom: 1px solid #E2E8F0;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #1E293B;">
                ${editingTrend ? 'Edit Market Trend Data' : 'Add Market Trend Domain'}
              </h3>
              <button type="button" id="btn-close-trend-modal" style="
                background: transparent;
                border: none;
                font-size: 20px;
                color: #64748B;
                cursor: pointer;
                line-height: 1;
              ">&times;</button>
            </div>
            <form id="form-trend-modal" style="padding: 20px; font-size: 13px;">
              <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Domain Name *</label>
                <input
                  type="text"
                  id="trend-modal-domain"
                  required
                  value="${escapeHtml(editingTrend?.domain || '')}"
                  style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;"
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                <div>
                  <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Trajectory *</label>
                  <select id="trend-modal-direction" style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px; background-color: #FFFFFF;">
                    <option value="Rising" ${editingTrend?.trend_direction === 'Rising' ? 'selected' : ''}>Rising</option>
                    <option value="Accelerating" ${editingTrend?.trend_direction === 'Accelerating' ? 'selected' : ''}>Accelerating</option>
                    <option value="Stable" ${editingTrend?.trend_direction === 'Stable' ? 'selected' : ''}>Stable</option>
                    <option value="Declining" ${editingTrend?.trend_direction === 'Declining' ? 'selected' : ''}>Declining</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Demand Score (0-100)</label>
                  <input
                    type="number"
                    id="trend-modal-score"
                    min="0"
                    max="100"
                    value="${escapeHtml(editingTrend?.demand_score ?? 75)}"
                    style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;"
                  />
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Year over Year Growth (e.g. +85%)</label>
                <input
                  type="text"
                  id="trend-modal-growth"
                  placeholder="+50%"
                  value="${escapeHtml(editingTrend?.year_over_year_growth || '+0%')}"
                  style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;"
                />
              </div>

              <div style="margin-bottom: 12px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Key Skills (comma separated)</label>
                <input
                  type="text"
                  id="trend-modal-skills"
                  value="${escapeHtml(Array.isArray(editingTrend?.key_skills) ? editingTrend.key_skills.join(', ') : '')}"
                  style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;"
                />
              </div>

              <div style="margin-bottom: 16px;">
                <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Description</label>
                <textarea
                  id="trend-modal-desc"
                  rows="2"
                  style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 4px;"
                >${escapeHtml(editingTrend?.description || '')}</textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 8px;">
                <button type="button" id="btn-cancel-trend-modal" style="background-color: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 6px 14px; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button type="submit" style="background-color: #3B82F6; border: none; color: #FFFFFF; padding: 6px 14px; border-radius: 4px; font-weight: 500; cursor: pointer;">
                  ${editingTrend ? 'Save Updates' : 'Add Trend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// =============================================================================
// MAIN RENDERING CONTROLLER
// =============================================================================

function renderTabContent() {
  if (!state.container) return;
  const contentSlot = state.container.querySelector('#admin-tab-content-slot');
  if (!contentSlot) return;

  if (state.activeTab === 'users') {
    contentSlot.innerHTML = renderUsersTab();
    bindUsersEvents();
  } else if (state.activeTab === 'assessment') {
    contentSlot.innerHTML = renderAssessmentTab();
    bindAssessmentEvents();
  } else if (state.activeTab === 'courses') {
    contentSlot.innerHTML = renderCoursesTab();
    bindCoursesEvents();
  } else if (state.activeTab === 'market') {
    contentSlot.innerHTML = renderMarketTab();
    bindMarketEvents();
  }
}

/**
 * Primary export: renders the admin panel into the designated container element.
 * @param {HTMLElement} container - DOM host element.
 */
export function render(container) {
  if (!container) return;
  state.container = container;

  // Authorization check
  checkAuthorization();

  if (!state.isAuthorized) {
    container.innerHTML = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background-color: #F5F6F8;
        min-height: 80vh;
        padding: 40px 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          background-color: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 6px;
          padding: 32px;
          max-width: 480px;
          text-align: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        ">
          <div style="
            background-color: #FFF1F2;
            color: #DC2626;
            display: inline-block;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
          ">
            Access Restricted
          </div>
          <h2 style="font-size: 20px; font-weight: 700; color: #1E293B; margin-top: 0; margin-bottom: 8px;">
            Administrative Privileges Required
          </h2>
          <p style="font-size: 14px; color: #64748B; line-height: 1.5; margin-bottom: 24px;">
            The administration and curriculum management console is strictly restricted to accounts with Admin or Trainer roles. Your active session does not possess the requisite security classification.
          </p>
          <a
            href="#/login"
            style="
              display: inline-block;
              background-color: #3B82F6;
              color: #FFFFFF;
              text-decoration: none;
              padding: 8px 18px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 500;
              transition: background-color 150ms ease-in-out;
            "
          >
            Authenticate with Elevated Credentials
          </a>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="admin-page-container" style="
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F5F6F8;
      color: #1E293B;
      min-height: 100vh;
      padding: 32px 24px;
      box-sizing: border-box;
    ">
      <div style="max-width: 1200px; margin: 0 auto;">
        <!-- Page Header -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
            <div>
              <h1 style="font-size: 24px; font-weight: 700; color: #1E293B; margin: 0 0 6px 0;">
                Administration Console
              </h1>
              <p style="font-size: 14px; color: #64748B; margin: 0;">
                Governance portal for user authorization, diagnostic assessment items, curriculum catalog, and market indices.
              </p>
            </div>
            <div style="
              background-color: #FFFFFF;
              border: 1px solid #CBD5E1;
              border-radius: 4px;
              padding: 6px 12px;
              font-size: 12px;
              color: #334155;
              font-weight: 500;
            ">
              Session: <span style="color: #2D6A4F; font-weight: 600; text-transform: uppercase;">${escapeHtml(state.userRole)}</span>
            </div>
          </div>
        </div>

        <!-- Notification Banner Container -->
        <div id="admin-notification-slot"></div>

        <!-- Tab Navigation Bar -->
        <div style="
          display: flex;
          gap: 4px;
          border-bottom: 1px solid #E2E8F0;
          margin-bottom: 24px;
        ">
          <button
            type="button"
            class="admin-nav-tab"
            data-tab="users"
            style="
              background-color: ${state.activeTab === 'users' ? '#FFFFFF' : 'transparent'};
              color: ${state.activeTab === 'users' ? '#1E293B' : '#64748B'};
              font-weight: ${state.activeTab === 'users' ? '600' : '500'};
              border: 1px solid ${state.activeTab === 'users' ? '#E2E8F0' : 'transparent'};
              border-bottom-color: ${state.activeTab === 'users' ? '#FFFFFF' : 'transparent'};
              margin-bottom: -1px;
              padding: 10px 18px;
              border-radius: 6px 6px 0 0;
              font-size: 14px;
              cursor: pointer;
              transition: all 150ms ease-in-out;
            "
          >
            User Management
          </button>

          <button
            type="button"
            class="admin-nav-tab"
            data-tab="assessment"
            style="
              background-color: ${state.activeTab === 'assessment' ? '#FFFFFF' : 'transparent'};
              color: ${state.activeTab === 'assessment' ? '#1E293B' : '#64748B'};
              font-weight: ${state.activeTab === 'assessment' ? '600' : '500'};
              border: 1px solid ${state.activeTab === 'assessment' ? '#E2E8F0' : 'transparent'};
              border-bottom-color: ${state.activeTab === 'assessment' ? '#FFFFFF' : 'transparent'};
              margin-bottom: -1px;
              padding: 10px 18px;
              border-radius: 6px 6px 0 0;
              font-size: 14px;
              cursor: pointer;
              transition: all 150ms ease-in-out;
            "
          >
            Assessment Bank
          </button>

          <button
            type="button"
            class="admin-nav-tab"
            data-tab="courses"
            style="
              background-color: ${state.activeTab === 'courses' ? '#FFFFFF' : 'transparent'};
              color: ${state.activeTab === 'courses' ? '#1E293B' : '#64748B'};
              font-weight: ${state.activeTab === 'courses' ? '600' : '500'};
              border: 1px solid ${state.activeTab === 'courses' ? '#E2E8F0' : 'transparent'};
              border-bottom-color: ${state.activeTab === 'courses' ? '#FFFFFF' : 'transparent'};
              margin-bottom: -1px;
              padding: 10px 18px;
              border-radius: 6px 6px 0 0;
              font-size: 14px;
              cursor: pointer;
              transition: all 150ms ease-in-out;
            "
          >
            Course Catalog
          </button>

          <button
            type="button"
            class="admin-nav-tab"
            data-tab="market"
            style="
              background-color: ${state.activeTab === 'market' ? '#FFFFFF' : 'transparent'};
              color: ${state.activeTab === 'market' ? '#1E293B' : '#64748B'};
              font-weight: ${state.activeTab === 'market' ? '600' : '500'};
              border: 1px solid ${state.activeTab === 'market' ? '#E2E8F0' : 'transparent'};
              border-bottom-color: ${state.activeTab === 'market' ? '#FFFFFF' : 'transparent'};
              margin-bottom: -1px;
              padding: 10px 18px;
              border-radius: 6px 6px 0 0;
              font-size: 14px;
              cursor: pointer;
              transition: all 150ms ease-in-out;
            "
          >
            Market Trends
          </button>
        </div>

        <!-- Active Tab Dynamic View Slot -->
        <div id="admin-tab-content-slot"></div>
      </div>
    </div>
  `;

  bindTabNavigationEvents();
  renderTabContent();
}

// =============================================================================
// DOM EVENT BINDINGS
// =============================================================================

function bindTabNavigationEvents() {
  if (!state.container) return;
  const tabButtons = state.container.querySelectorAll('.admin-nav-tab');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      if (targetTab === state.activeTab) return;
      state.activeTab = targetTab;
      render(state.container);
      loadActiveTabData();
    });
  });
}

function bindUsersEvents() {
  if (!state.container) return;

  // Search input
  const searchInput = state.container.querySelector('#users-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.users.searchQuery = e.target.value;
      renderTabContent();
    });
  }

  // Role filter
  const roleFilter = state.container.querySelector('#users-role-filter');
  if (roleFilter) {
    roleFilter.addEventListener('change', (e) => {
      state.users.roleFilter = e.target.value;
      renderTabContent();
    });
  }

  // CV filter
  const cvFilter = state.container.querySelector('#users-cv-filter');
  if (cvFilter) {
    cvFilter.addEventListener('change', (e) => {
      state.users.cvFilter = e.target.value;
      renderTabContent();
    });
  }

  // Sortable headers
  const sortHeaders = state.container.querySelectorAll('.sortable-user-header');
  sortHeaders.forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.users.sortColumn === col) {
        state.users.sortAscending = !state.users.sortAscending;
      } else {
        state.users.sortColumn = col;
        state.users.sortAscending = true;
      }
      renderTabContent();
    });
  });

  // View profile click
  const viewProfileLinks = state.container.querySelectorAll('.btn-view-profile');
  viewProfileLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = e.currentTarget.dataset.id;
      const user = state.users.data.find((u) => u.id === id);
      state.users.selectedUser = user || null;
      renderTabContent();
    });
  });

  // Close profile modal buttons
  const closeProfileHeader = state.container.querySelector('#btn-close-profile-modal');
  if (closeProfileHeader) {
    closeProfileHeader.addEventListener('click', () => {
      state.users.selectedUser = null;
      renderTabContent();
    });
  }
  const closeProfileFooter = state.container.querySelector('#btn-close-profile-footer');
  if (closeProfileFooter) {
    closeProfileFooter.addEventListener('click', () => {
      state.users.selectedUser = null;
      renderTabContent();
    });
  }

  // Change role dropdown
  const roleSelects = state.container.querySelectorAll('.user-role-select');
  roleSelects.forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const newRole = e.target.value;
      updateUserRole(id, newRole);
    });
  });

  // Toggle user active
  const toggleActiveBtns = state.container.querySelectorAll('.btn-toggle-user-active');
  toggleActiveBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const currentActive = e.currentTarget.dataset.active === 'true';
      toggleUserActive(id, currentActive);
    });
  });
}

function bindAssessmentEvents() {
  if (!state.container) return;

  // Search input
  const searchInput = state.container.querySelector('#questions-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.assessment.searchQuery = e.target.value;
      renderTabContent();
    });
  }

  // Category filter
  const catFilter = state.container.querySelector('#questions-category-filter');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      state.assessment.categoryFilter = e.target.value;
      renderTabContent();
    });
  }

  // Difficulty filter
  const diffFilter = state.container.querySelector('#questions-difficulty-filter');
  if (diffFilter) {
    diffFilter.addEventListener('change', (e) => {
      state.assessment.difficultyFilter = e.target.value;
      renderTabContent();
    });
  }

  // Status filter
  const statusFilter = state.container.querySelector('#questions-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      state.assessment.statusFilter = e.target.value;
      renderTabContent();
    });
  }

  // Sort headers
  const sortHeaders = state.container.querySelectorAll('.sortable-question-header');
  sortHeaders.forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.assessment.sortColumn === col) {
        state.assessment.sortAscending = !state.assessment.sortAscending;
      } else {
        state.assessment.sortColumn = col;
        state.assessment.sortAscending = true;
      }
      renderTabContent();
    });
  });

  // Export questions button
  const exportBtn = state.container.querySelector('#btn-export-questions');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportQuestionsToCsv);
  }

  // Open add question modal
  const openAddBtn = state.container.querySelector('#btn-open-add-question');
  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
      state.assessment.showAddModal = true;
      state.assessment.editingQuestion = null;
      renderTabContent();
    });
  }

  // Edit question button
  const editBtns = state.container.querySelectorAll('.btn-edit-question');
  editBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const q = state.assessment.data.find((item) => item.id === id);
      if (q) {
        state.assessment.editingQuestion = q;
        state.assessment.showAddModal = false;
        renderTabContent();
      }
    });
  });

  // Toggle active button
  const toggleActiveBtns = state.container.querySelectorAll('.btn-toggle-question-active');
  toggleActiveBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const currentActive = e.currentTarget.dataset.active === 'true';
      toggleQuestionActive(id, currentActive);
    });
  });

  // Close question modal
  const closeBtn = state.container.querySelector('#btn-close-question-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      state.assessment.showAddModal = false;
      state.assessment.editingQuestion = null;
      renderTabContent();
    });
  }
  const cancelBtn = state.container.querySelector('#btn-cancel-question-modal');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      state.assessment.showAddModal = false;
      state.assessment.editingQuestion = null;
      renderTabContent();
    });
  }

  // Form submission
  const form = state.container.querySelector('#form-question-modal');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = state.container.querySelector('#q-modal-text')?.value.trim();
      const category = state.container.querySelector('#q-modal-category')?.value.trim();
      const difficulty = state.container.querySelector('#q-modal-difficulty')?.value;
      const skillsRaw = state.container.querySelector('#q-modal-skills')?.value || '';
      const explanation = state.container.querySelector('#q-modal-explanation')?.value.trim();
      const active = state.container.querySelector('#q-modal-active')?.checked;

      const optionInputs = state.container.querySelectorAll('.q-modal-option-input');
      const options = Array.from(optionInputs).map((opt) => opt.value.trim());

      const selectedOptRadio = state.container.querySelector('input[name="q-modal-correct-opt"]:checked');
      const correctOptionIndex = selectedOptRadio ? Number(selectedOptRadio.value) : 0;

      const skillTags = skillsRaw.split(',').map((s) => s.trim()).filter(Boolean);

      const payload = {
        question_text: text,
        category,
        difficulty,
        options,
        correct_option_index: correctOptionIndex,
        skill_tags: skillTags,
        explanation,
        active
      };

      if (state.assessment.editingQuestion) {
        updateQuestion(state.assessment.editingQuestion.id, payload);
      } else {
        createQuestion(payload);
      }
    });
  }
}

function bindCoursesEvents() {
  if (!state.container) return;

  // Search input
  const searchInput = state.container.querySelector('#courses-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.courses.searchQuery = e.target.value;
      renderTabContent();
    });
  }

  // Category filter
  const catFilter = state.container.querySelector('#courses-category-filter');
  if (catFilter) {
    catFilter.addEventListener('change', (e) => {
      state.courses.categoryFilter = e.target.value;
      renderTabContent();
    });
  }

  // Difficulty filter
  const diffFilter = state.container.querySelector('#courses-difficulty-filter');
  if (diffFilter) {
    diffFilter.addEventListener('change', (e) => {
      state.courses.difficultyFilter = e.target.value;
      renderTabContent();
    });
  }

  // Provider filter
  const provFilter = state.container.querySelector('#courses-provider-filter');
  if (provFilter) {
    provFilter.addEventListener('change', (e) => {
      state.courses.providerFilter = e.target.value;
      renderTabContent();
    });
  }

  // Sort headers
  const sortHeaders = state.container.querySelectorAll('.sortable-course-header');
  sortHeaders.forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.courses.sortColumn === col) {
        state.courses.sortAscending = !state.courses.sortAscending;
      } else {
        state.courses.sortColumn = col;
        state.courses.sortAscending = true;
      }
      renderTabContent();
    });
  });

  // Open Add Course Modal
  const openAddBtn = state.container.querySelector('#btn-open-add-course');
  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
      state.courses.showAddModal = true;
      renderTabContent();
    });
  }
  const closeAddBtn = state.container.querySelector('#btn-close-course-modal');
  if (closeAddBtn) {
    closeAddBtn.addEventListener('click', () => {
      state.courses.showAddModal = false;
      renderTabContent();
    });
  }
  const cancelAddBtn = state.container.querySelector('#btn-cancel-course-modal');
  if (cancelAddBtn) {
    cancelAddBtn.addEventListener('click', () => {
      state.courses.showAddModal = false;
      renderTabContent();
    });
  }

  // Form Add Course Submit
  const formAddCourse = state.container.querySelector('#form-add-course');
  if (formAddCourse) {
    formAddCourse.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = state.container.querySelector('#course-add-title')?.value.trim();
      const provider = state.container.querySelector('#course-add-provider')?.value.trim();
      const category = state.container.querySelector('#course-add-category')?.value.trim();
      const difficulty = state.container.querySelector('#course-add-difficulty')?.value;
      const duration = state.container.querySelector('#course-add-duration')?.value.trim();
      const url = state.container.querySelector('#course-add-url')?.value.trim();
      const skillsRaw = state.container.querySelector('#course-add-skills')?.value || '';
      const description = state.container.querySelector('#course-add-desc')?.value.trim();

      const skills = skillsRaw.split(',').map((s) => s.trim()).filter(Boolean);

      createCourse({
        title,
        provider,
        category,
        difficulty,
        duration: duration || 'Flexible',
        url: url || '#',
        skill_ids: skills,
        description
      });
    });
  }

  // Open Import CSV Modal
  const openImportBtn = state.container.querySelector('#btn-open-import-csv');
  if (openImportBtn) {
    openImportBtn.addEventListener('click', () => {
      state.courses.showImportModal = true;
      renderTabContent();
    });
  }
  const closeImportBtn = state.container.querySelector('#btn-close-import-modal');
  if (closeImportBtn) {
    closeImportBtn.addEventListener('click', () => {
      state.courses.showImportModal = false;
      renderTabContent();
    });
  }
  const cancelImportBtn = state.container.querySelector('#btn-cancel-import-modal');
  if (cancelImportBtn) {
    cancelImportBtn.addEventListener('click', () => {
      state.courses.showImportModal = false;
      renderTabContent();
    });
  }

  // Execute CSV Import
  const submitCsvBtn = state.container.querySelector('#btn-submit-csv-import');
  if (submitCsvBtn) {
    submitCsvBtn.addEventListener('click', () => {
      const fileInput = state.container.querySelector('#courses-file-input');
      const pastedText = state.container.querySelector('#courses-csv-paste')?.value;

      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
          const parsed = parseCoursesCsv(evt.target.result);
          if (parsed.length === 0) {
            showNotification('Could not parse any courses from CSV file. Verify header schema.', 'error');
            return;
          }
          bulkImportCourses(parsed);
        };
        reader.readAsText(file);
      } else if (pastedText && pastedText.trim().length > 0) {
        const parsed = parseCoursesCsv(pastedText);
        if (parsed.length === 0) {
          showNotification('Could not parse any courses from text. Verify header schema.', 'error');
          return;
        }
        bulkImportCourses(parsed);
      } else {
        showNotification('Please choose a CSV file or paste valid CSV data.', 'warning');
      }
    });
  }

  // Start Inline Edit
  const startEditBtns = state.container.querySelectorAll('.btn-start-inline-edit');
  startEditBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const c = state.courses.data.find((item) => item.id === id);
      if (c) {
        state.courses.editingCourseId = id;
        state.courses.inlineForm = {
          title: c.title,
          provider: c.provider,
          category: c.category,
          difficulty: c.difficulty,
          duration: c.duration
        };
        renderTabContent();
      }
    });
  });

  // Save Inline Edit
  const saveInlineBtn = state.container.querySelector('.btn-save-inline-course');
  if (saveInlineBtn) {
    saveInlineBtn.addEventListener('click', () => {
      const id = saveInlineBtn.dataset.id;
      const title = state.container.querySelector('#inline-edit-title')?.value.trim();
      const provider = state.container.querySelector('#inline-edit-provider')?.value.trim();
      const category = state.container.querySelector('#inline-edit-category')?.value.trim();
      const difficulty = state.container.querySelector('#inline-edit-difficulty')?.value;
      const duration = state.container.querySelector('#inline-edit-duration')?.value.trim();

      updateCourse(id, {
        title,
        provider,
        category,
        difficulty,
        duration
      });
    });
  }

  // Cancel Inline Edit
  const cancelInlineBtn = state.container.querySelector('.btn-cancel-inline-course');
  if (cancelInlineBtn) {
    cancelInlineBtn.addEventListener('click', () => {
      state.courses.editingCourseId = null;
      state.courses.inlineForm = {};
      renderTabContent();
    });
  }

  // Delete Course
  const deleteBtns = state.container.querySelectorAll('.btn-delete-course');
  deleteBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      deleteCourse(id);
    });
  });
}

function bindMarketEvents() {
  if (!state.container) return;

  // Search input
  const searchInput = state.container.querySelector('#market-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.market.searchQuery = e.target.value;
      renderTabContent();
    });
  }

  // Direction filter
  const dirFilter = state.container.querySelector('#market-direction-filter');
  if (dirFilter) {
    dirFilter.addEventListener('change', (e) => {
      state.market.directionFilter = e.target.value;
      renderTabContent();
    });
  }

  // Sort headers
  const sortHeaders = state.container.querySelectorAll('.sortable-trend-header');
  sortHeaders.forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.market.sortColumn === col) {
        state.market.sortAscending = !state.market.sortAscending;
      } else {
        state.market.sortColumn = col;
        state.market.sortAscending = true;
      }
      renderTabContent();
    });
  });

  // Open add trend modal
  const openAddBtn = state.container.querySelector('#btn-open-add-trend');
  if (openAddBtn) {
    openAddBtn.addEventListener('click', () => {
      state.market.showAddModal = true;
      state.market.editingTrend = null;
      renderTabContent();
    });
  }

  // Edit trend button
  const editBtns = state.container.querySelectorAll('.btn-edit-trend');
  editBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const t = state.market.data.find((item) => item.id === id);
      if (t) {
        state.market.editingTrend = t;
        state.market.showAddModal = false;
        renderTabContent();
      }
    });
  });

  // Close trend modal
  const closeBtn = state.container.querySelector('#btn-close-trend-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      state.market.showAddModal = false;
      state.market.editingTrend = null;
      renderTabContent();
    });
  }
  const cancelBtn = state.container.querySelector('#btn-cancel-trend-modal');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      state.market.showAddModal = false;
      state.market.editingTrend = null;
      renderTabContent();
    });
  }

  // Form submit
  const form = state.container.querySelector('#form-trend-modal');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const domain = state.container.querySelector('#trend-modal-domain')?.value.trim();
      const direction = state.container.querySelector('#trend-modal-direction')?.value;
      const score = Number(state.container.querySelector('#trend-modal-score')?.value || 50);
      const growth = state.container.querySelector('#trend-modal-growth')?.value.trim();
      const skillsRaw = state.container.querySelector('#trend-modal-skills')?.value || '';
      const desc = state.container.querySelector('#trend-modal-desc')?.value.trim();

      const skills = skillsRaw.split(',').map((s) => s.trim()).filter(Boolean);

      const payload = {
        domain,
        trend_direction: direction,
        demand_score: score,
        year_over_year_growth: growth,
        key_skills: skills,
        description: desc
      };

      if (state.market.editingTrend) {
        updateMarketTrend(state.market.editingTrend.id, payload);
      } else {
        createMarketTrend(payload);
      }
    });
  }
}

// =============================================================================
// LIFECYCLE AND INITIALIZATION
// =============================================================================

/**
 * Loads data for the active tab via fetch().
 */
async function loadActiveTabData() {
  if (state.activeTab === 'users' && state.users.data.length === 0) {
    await fetchUsers();
  } else if (state.activeTab === 'assessment' && state.assessment.data.length === 0) {
    await fetchQuestions();
  } else if (state.activeTab === 'courses' && state.courses.data.length === 0) {
    await fetchCourses();
  } else if (state.activeTab === 'market' && state.market.data.length === 0) {
    await fetchMarketTrends();
  }
}

/**
 * Primary export: initializes administrative panel state and triggers network fetch.
 * @param {HTMLElement} container - DOM host element.
 */
export async function init(container) {
  // Ensure the client fetch interceptor is installed
  if (apiRouter && typeof apiRouter.install === 'function') {
    apiRouter.install();
  }

  state.container = container;
  render(container);
  await loadActiveTabData();
}

export default {
  render,
  init
};
