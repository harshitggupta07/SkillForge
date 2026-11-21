/**
 * SkillForge - Identity and Session Management
 *
 * Handles client-side session persistence via sessionStorage, authentication state,
 * role-based permission verification, and rendered authentication views.
 */

const USER_KEY = 'skillforge_user';
const TOKEN_KEY = 'skillforge_token';

/**
 * Retrieves the currently active user profile from session storage.
 *
 * @returns {object|null} Parsed user profile object or null.
 */
export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the stored authentication token string from session storage.
 *
 * @returns {string|null} Bearer token string or null.
 */
export function getToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Determines whether an authenticated session is currently established.
 *
 * @returns {boolean} True if both valid user record and token exist.
 */
export function isAuthenticated() {
  return getCurrentUser() !== null && getToken() !== null;
}

/**
 * Validates whether the active session user possesses the required role privilege.
 * Admin users inherit global privileges across all protected resources.
 *
 * @param {string} role - The target role name to verify (e.g. 'admin', 'employee', 'student', 'trainer').
 * @returns {boolean} True if the user satisfies the role requirement.
 */
export function hasRole(role) {
  const user = getCurrentUser();
  if (!user) return false;

  const userRole = (user.role || user.user_type || '').toLowerCase();
  const targetRole = String(role || '').toLowerCase();

  if (userRole === 'admin') {
    return true;
  }

  return userRole === targetRole;
}

/**
 * Persists an authenticated user session to sessionStorage and broadcasts
 * the state change across the application.
 *
 * @param {object|null} user - Sanitized user profile payload.
 * @param {string|null} token - Issued JWT or Bearer token string.
 */
export function setSession(user, token) {
  try {
    if (user && token) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Session persistence failed:', err);
  }

  window.dispatchEvent(new CustomEvent('skillforge:auth-change', {
    detail: { user: user || null, token: token || null }
  }));
}

/**
 * Clears the active authentication session and redirects user to the login screen.
 */
export function logout() {
  setSession(null, null);
  window.location.hash = '#/login';
}

/**
 * Renders the Authentication Login screen into the designated container element.
 *
 * @param {HTMLElement} container - Target DOM container for page insertion.
 */
export function renderLoginPage(container) {
  container.innerHTML = `
    <div class="auth-page-wrapper" style="max-width: 440px; margin: 2rem auto;">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Account Authentication</h2>
            <p class="card-subtitle">Sign in to access competency profiles, diagnostic quizzes, and analytics</p>
          </div>
        </div>

        <div class="card-body">
          <div id="login-error-alert" class="alert alert-danger d-none" role="alert">
            <span id="login-error-message">Invalid credentials provided.</span>
          </div>

          <form id="login-form" novalidate>
            <div class="form-group">
              <label for="login-email" class="form-label form-label-required">Email Address</label>
              <input
                type="email"
                id="login-email"
                name="email"
                class="form-control"
                placeholder="name@example.com"
                required
                autocomplete="email"
              >
            </div>

            <div class="form-group">
              <label for="login-password" class="form-label form-label-required">Password</label>
              <input
                type="password"
                id="login-password"
                name="password"
                class="form-control"
                placeholder="Enter password"
                required
                autocomplete="current-password"
              >
            </div>

            <div class="form-group" style="margin-top: 1.5rem;">
              <button type="submit" id="login-submit-btn" class="btn btn-primary btn-block">
                Sign In
              </button>
            </div>
          </form>

          <div style="margin-top: 1.25rem; text-align: center; font-size: 0.875rem;">
            <span class="text-muted">Need an account?</span>
            <a href="#/register" style="font-weight: 500; margin-left: 0.25rem;">Create Account</a>
          </div>
        </div>

        <div class="card-footer" style="flex-direction: column; align-items: stretch; gap: 0.75rem;">
          <div style="font-size: 0.75rem; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
            Standard Test Credentials
          </div>
          <div class="grid-2" style="gap: 0.5rem;">
            <button type="button" class="btn btn-sm btn-secondary quick-login-btn" data-email="admin@skillforge.dev" data-pass="Admin@2025">
              Admin (Marcus)
            </button>
            <button type="button" class="btn btn-sm btn-secondary quick-login-btn" data-email="dev.employee@skillforge.dev" data-pass="Employee@2025">
              Employee (David)
            </button>
            <button type="button" class="btn btn-sm btn-secondary quick-login-btn" data-email="cs.student@skillforge.dev" data-pass="Student@2025">
              Student (Aaliyah)
            </button>
            <button type="button" class="btn btn-sm btn-secondary quick-login-btn" data-email="trainer@skillforge.dev" data-pass="Trainer@2025">
              Trainer (Elena)
            </button>
            <button type="button" class="btn btn-sm btn-secondary quick-login-btn" data-email="ml.engineer@skillforge.dev" data-pass="MLEngineer@2025">
              ML Engineer
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Form Submission
  const form = container.querySelector('#login-form');
  const emailInput = container.querySelector('#login-email');
  const passwordInput = container.querySelector('#login-password');
  const errorAlert = container.querySelector('#login-error-alert');
  const errorMessage = container.querySelector('#login-error-message');
  const submitBtn = container.querySelector('#login-submit-btn');

  // Quick Login Credential Buttons
  const quickButtons = container.querySelectorAll('.quick-login-btn');
  quickButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      emailInput.value = btn.getAttribute('data-email') || '';
      passwordInput.value = btn.getAttribute('data-pass') || '';
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    });
  });

  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    errorAlert.classList.add('d-none');

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      errorMessage.textContent = 'Email and password credentials are required.';
      errorAlert.classList.remove('d-none');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying credentials...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication rejected by security provider.');
      }

      setSession(data.user, data.token);
      window.location.hash = '#/dashboard';
    } catch (err) {
      errorMessage.textContent = err.message || 'Authentication failed. Please verify credentials.';
      errorAlert.classList.remove('d-none');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign In';
    }
  });
}

/**
 * Standard benchmark target roles list for user registration options.
 */
const TARGET_ROLES = [
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
 * Renders the Account Registration screen into the designated container element.
 *
 * @param {HTMLElement} container - Target DOM container for page insertion.
 */
export function renderRegisterPage(container) {
  const roleOptionsHtml = TARGET_ROLES.map((r) => `<option value="${r}">${r}</option>`).join('');

  container.innerHTML = `
    <div class="auth-page-wrapper" style="max-width: 560px; margin: 2rem auto;">
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Candidate Registration</h2>
            <p class="card-subtitle">Establish your competency profile and select benchmark career targets</p>
          </div>
        </div>

        <div class="card-body">
          <div id="register-error-alert" class="alert alert-danger d-none" role="alert">
            <span id="register-error-message">Registration validation failed.</span>
          </div>

          <form id="register-form" novalidate>
            <!-- User Type Selector -->
            <div class="form-group">
              <label class="form-label">Profile Profile Classification</label>
              <div class="btn-group-toggle" id="user-type-toggle" role="radiogroup" aria-label="Profile classification">
                <button type="button" class="toggle-btn active" data-type="employee" role="radio" aria-checked="true">
                  Industry Professional
                </button>
                <button type="button" class="toggle-btn" data-type="student" role="radio" aria-checked="false">
                  Academic Student
                </button>
              </div>
              <input type="hidden" id="register-user-type" name="user_type" value="employee">
            </div>

            <!-- Full Name -->
            <div class="form-group">
              <label for="register-name" class="form-label form-label-required">Full Name</label>
              <input
                type="text"
                id="register-name"
                name="name"
                class="form-control"
                placeholder="e.g. Jordan Miller"
                required
                autocomplete="name"
              >
            </div>

            <!-- Email Address -->
            <div class="form-group">
              <label for="register-email" class="form-label form-label-required">Email Address</label>
              <input
                type="email"
                id="register-email"
                name="email"
                class="form-control"
                placeholder="jordan.miller@example.com"
                required
                autocomplete="email"
              >
            </div>

            <!-- Password -->
            <div class="form-group">
              <label for="register-password" class="form-label form-label-required">Password</label>
              <input
                type="password"
                id="register-password"
                name="password"
                class="form-control"
                placeholder="Minimum 6 characters"
                required
                minlength="6"
                autocomplete="new-password"
              >
              <span class="form-text">Must be at least 6 characters in length.</span>
            </div>

            <!-- Target Benchmark Role -->
            <div class="form-group">
              <label for="register-target-role" class="form-label form-label-required">Target Benchmark Role</label>
              <select id="register-target-role" name="target_role" class="form-select" required>
                ${roleOptionsHtml}
              </select>
              <span class="form-text">Used to compute competency gap benchmarks and recommended course paths.</span>
            </div>

            <!-- Dynamic Fields: Employee View -->
            <div id="employee-specific-fields">
              <div class="grid-2">
                <div class="form-group">
                  <label for="register-current-role" class="form-label">Current Role Title</label>
                  <input
                    type="text"
                    id="register-current-role"
                    name="current_role"
                    class="form-control"
                    placeholder="e.g. Backend Developer"
                    value="Software Engineer"
                  >
                </div>
                <div class="form-group">
                  <label for="register-experience-years" class="form-label">Years of Experience</label>
                  <input
                    type="number"
                    id="register-experience-years"
                    name="experience_years"
                    class="form-control"
                    min="0"
                    max="40"
                    value="3"
                  >
                </div>
              </div>
            </div>

            <!-- Dynamic Fields: Student View -->
            <div id="student-specific-fields" class="d-none">
              <div class="grid-2">
                <div class="form-group">
                  <label for="register-education" class="form-label">Academic Program</label>
                  <input
                    type="text"
                    id="register-education"
                    name="education"
                    class="form-control"
                    placeholder="e.g. B.S. in Computer Science"
                    value="B.S. in Computer Science"
                  >
                </div>
                <div class="form-group">
                  <label for="register-grad-year" class="form-label">Graduation Year</label>
                  <input
                    type="number"
                    id="register-grad-year"
                    name="grad_year"
                    class="form-control"
                    min="2020"
                    max="2035"
                    value="2027"
                  >
                </div>
              </div>
            </div>

            <!-- Primary Tech Stack -->
            <div class="form-group">
              <label for="register-tech-stack" class="form-label">Current Technologies (Comma-Separated)</label>
              <input
                type="text"
                id="register-tech-stack"
                name="tech_stack"
                class="form-control"
                placeholder="JavaScript, Python, React, PostgreSQL"
                value="JavaScript, React, Node.js"
              >
            </div>

            <div class="form-group" style="margin-top: 1.5rem;">
              <button type="submit" id="register-submit-btn" class="btn btn-primary btn-block">
                Complete Registration
              </button>
            </div>
          </form>

          <div style="margin-top: 1.25rem; text-align: center; font-size: 0.875rem;">
            <span class="text-muted">Already have a profile?</span>
            <a href="#/login" style="font-weight: 500; margin-left: 0.25rem;">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind Form Interactivity
  const form = container.querySelector('#register-form');
  const typeToggle = container.querySelector('#user-type-toggle');
  const typeHidden = container.querySelector('#register-user-type');
  const employeeFields = container.querySelector('#employee-specific-fields');
  const studentFields = container.querySelector('#student-specific-fields');
  const errorAlert = container.querySelector('#register-error-alert');
  const errorMessage = container.querySelector('#register-error-message');
  const submitBtn = container.querySelector('#register-submit-btn');

  // Toggle Employee / Student Modes
  typeToggle.querySelectorAll('.toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      typeToggle.querySelectorAll('.toggle-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');

      const selectedType = btn.getAttribute('data-type');
      typeHidden.value = selectedType;

      if (selectedType === 'student') {
        employeeFields.classList.add('d-none');
        studentFields.classList.remove('d-none');
      } else {
        employeeFields.classList.remove('d-none');
        studentFields.classList.add('d-none');
      }
    });
  });

  // Handle Submission
  form.addEventListener('submit', async (evt) => {
    evt.preventDefault();
    errorAlert.classList.add('d-none');

    const name = container.querySelector('#register-name').value.trim();
    const email = container.querySelector('#register-email').value.trim();
    const password = container.querySelector('#register-password').value;
    const userType = typeHidden.value;
    const targetRole = container.querySelector('#register-target-role').value;
    const techStackRaw = container.querySelector('#register-tech-stack').value;

    if (!name || !email || !password) {
      errorMessage.textContent = 'Name, email, and password fields are required.';
      errorAlert.classList.remove('d-none');
      return;
    }

    if (password.length < 6) {
      errorMessage.textContent = 'Password must contain at least 6 characters.';
      errorAlert.classList.remove('d-none');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    const techStack = techStackRaw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload = {
      name,
      email,
      password,
      role: userType,
      user_type: userType,
      target_role: targetRole,
      tech_stack: techStack
    };

    if (userType === 'employee') {
      payload.current_role = container.querySelector('#register-current-role').value.trim() || 'Software Engineer';
      payload.experience_years = Number(container.querySelector('#register-experience-years').value) || 0;
    } else {
      payload.education = container.querySelector('#register-education').value.trim() || 'B.S. in Computer Science';
      payload.current_role = 'Student';
      payload.experience_years = 0;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setSession(data.user, data.token);
      window.location.hash = '#/onboarding';
    } catch (err) {
      errorMessage.textContent = err.message || 'Registration could not be completed.';
      errorAlert.classList.remove('d-none');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Registration';
    }
  });
}
