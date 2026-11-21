/**
 * SkillForge - Application Entrypoint and Core Orchestration
 * Module: js/app.js
 *
 * Bootstraps the application, mounts API interception, configures SPA route mappings,
 * seeds database persistence stores, and synchronizes global header credentials.
 */

import { skillForgeDB, STORES } from '../db/database.js';
import { apiRouter } from '../api/api-router.js';
import {
  getCurrentUser,
  getToken,
  isAuthenticated,
  hasRole,
  setSession,
  logout,
  renderLoginPage,
  renderRegisterPage
} from './auth.js';
import { router } from './router.js';
import * as DashboardPage from './pages/dashboard.js';
import * as OnboardingPage from './pages/onboarding.js';
import * as AssessmentsPage from './pages/assessments.js';
import * as CoursesPage from './pages/courses.js';
import * as MarketTrendsPage from './pages/market-trends.js';
import * as AdminPage from './pages/admin.js';
import {
  renderPrivacyPolicy,
  renderTerms,
  initPrivacy,
  initTerms
} from './pages/legal.js';
import {
  getScoreColor,
  renderProgressBar,
  renderSkillComparison,
  renderTrendIndicator,
  renderScoreCard
} from './components/charts.js';

/**
 * Standardized API fetch wrapper attaching active authorization tokens.
 *
 * @param {string} endpoint - Relative API endpoint path.
 * @param {object} [options={}] - Fetch configuration options.
 * @returns {Promise<Response>} Native browser Response instance.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  return fetch(endpoint, {
    ...options,
    headers
  });
}

/**
 * Synchronizes header user display elements with active session credentials.
 */
export function updateHeaderUserPanel() {
  const nameEl = document.getElementById('user-display-name');
  const roleEl = document.getElementById('user-display-role');
  const authBtn = document.getElementById('auth-action-btn');
  const adminLink = document.getElementById('nav-admin-link');

  const user = getCurrentUser();

  if (user) {
    if (nameEl) nameEl.textContent = user.name || 'Candidate';
    if (roleEl) {
      roleEl.textContent = user.role || user.user_type || 'Employee';
      roleEl.className = 'badge badge-primary';
    }
    if (authBtn) {
      authBtn.textContent = 'Sign Out';
      authBtn.onclick = () => {
        logout();
        updateHeaderUserPanel();
        window.location.hash = '#/login';
      };
    }
    if (adminLink) {
      if ((user.role || '').toLowerCase() === 'admin') {
        adminLink.classList.remove('d-none');
      } else {
        adminLink.classList.add('d-none');
      }
    }
  } else {
    if (nameEl) nameEl.textContent = 'Guest';
    if (roleEl) {
      roleEl.textContent = 'Not authenticated';
      roleEl.className = 'badge badge-neutral';
    }
    if (authBtn) {
      authBtn.textContent = 'Sign In';
      authBtn.onclick = () => {
        window.location.hash = '#/login';
      };
    }
    if (adminLink) adminLink.classList.add('d-none');
  }
}

/**
 * Initializes application routing table, seeds local database, and triggers initial viewport resolution.
 */
export async function initApplication() {
  // Ensure API router is installed for fetch interception
  if (apiRouter && !apiRouter.installed) {
    apiRouter.install();
  }

  // Ensure persistent database stores are initialized with seed catalog
  try {
    await skillForgeDB.seedInitialDataIfEmpty();
  } catch (err) {
    console.warn('Initial database seed check failed:', err.message);
  }

  // If no active session, redirect to login screen on first load
  if (!getToken() && (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#/dashboard')) {
    window.location.hash = '#/login';
  }

  // Register SPA View Handlers
  router.register('#/dashboard', {
    title: 'Competency Dashboard',
    requiresAuth: true,
    render: DashboardPage.render,
    init: DashboardPage.init
  });

  router.register('#/onboarding', {
    title: 'Profile Onboarding and CV Setup',
    requiresAuth: true,
    render: OnboardingPage.render,
    init: OnboardingPage.init
  });

  router.register('#/assessments', {
    title: 'Assessments and Quiz Studio',
    requiresAuth: true,
    render: AssessmentsPage.render,
    init: AssessmentsPage.init
  });

  router.register('#/courses', {
    title: 'Course Curriculum and Training Plans',
    requiresAuth: true,
    render: CoursesPage.render,
    init: CoursesPage.init
  });

  router.register('#/market-trends', {
    title: 'Global IT Market Intelligence',
    requiresAuth: true,
    render: MarketTrendsPage.render,
    init: MarketTrendsPage.init
  });

  router.register('#/admin', {
    title: 'System Administration',
    requiresAuth: true,
    roles: ['admin'],
    render: AdminPage.render,
    init: AdminPage.init
  });

  router.register('#/login', {
    title: 'Sign In',
    requiresAuth: false,
    render: renderLoginPage
  });

  router.register('#/register', {
    title: 'Candidate Registration',
    requiresAuth: false,
    render: renderRegisterPage
  });

  router.register('#/privacy-policy', {
    title: 'Privacy Policy',
    requiresAuth: false,
    render: renderPrivacyPolicy,
    init: initPrivacy
  });

  router.register('#/terms-and-conditions', {
    title: 'Terms and Conditions',
    requiresAuth: false,
    render: renderTerms,
    init: initTerms
  });

  // Listen for session changes to update header state
  window.addEventListener('skillforge:auth-change', () => {
    updateHeaderUserPanel();
  });

  updateHeaderUserPanel();

  // Initialize router lifecycle
  router.init();
}

// Auto-run initialization when DOM is loaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApplication);
  } else {
    initApplication();
  }
}

export {
  skillForgeDB,
  STORES,
  apiRouter,
  router,
  getCurrentUser,
  getToken,
  isAuthenticated,
  hasRole,
  logout,
  renderLoginPage,
  renderRegisterPage,
  DashboardPage,
  OnboardingPage,
  AssessmentsPage,
  CoursesPage,
  MarketTrendsPage,
  AdminPage,
  renderPrivacyPolicy,
  renderTerms,
  getScoreColor,
  renderProgressBar,
  renderSkillComparison,
  renderTrendIndicator,
  renderScoreCard
};

export default {
  apiFetch,
  updateHeaderUserPanel,
  initApplication,
  skillForgeDB,
  STORES,
  apiRouter,
  router
};
