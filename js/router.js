/**
 * SkillForge - Hash-Based SPA Router
 *
 * Directs view transitions, enforces authentication and role authorization guards,
 * updates document title headers, and synchronizes navigation link highlights.
 */

import { isAuthenticated, hasRole, getCurrentUser } from './auth.js';

/**
 * Route definition descriptor.
 * @typedef {object} RouteConfig
 * @property {Function} render - Function receiving container element to render markup.
 * @property {Function} [init] - Lifecycle hook executed after DOM injection.
 * @property {string} title - Document title segment.
 * @property {boolean} [requiresAuth=false] - Whether authentication is mandatory.
 * @property {Array<string>} [roles=[]] - Role restrictions (e.g. ['admin']).
 */

export class Router {
  /**
   * Initializes router state and container references.
   *
   * @param {string} [contentContainerId='main-content-area'] - Main viewport container ID.
   */
  constructor(contentContainerId = 'main-content-area') {
    this.containerId = contentContainerId;
    this.routes = new Map();
    this.currentRoute = null;
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
  }

  /**
   * Registers a hash path route configuration.
   *
   * @param {string} path - Hash route string (e.g. '#/dashboard').
   * @param {RouteConfig} config - Route parameters and render handlers.
   * @returns {Router} Instance reference for chaining.
   */
  register(path, config) {
    const normalizedPath = this.normalizePath(path);
    this.routes.set(normalizedPath, {
      requiresAuth: false,
      roles: [],
      title: 'SkillForge',
      ...config
    });
    return this;
  }

  /**
   * Normalizes hash string format (ensuring leading '#' and '/').
   *
   * @param {string} path - Raw path.
   * @returns {string} Normalized path.
   */
  normalizePath(path) {
    if (!path) return '#/';
    let clean = path.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    const hashPart = clean.slice(1);
    if (!hashPart.startsWith('/')) {
      clean = '#/' + hashPart;
    }
    // Remove trailing slash if longer than '#/'
    if (clean.length > 2 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  }

  /**
   * Navigates the application window to a specific hash route.
   *
   * @param {string} path - Destination hash path.
   */
  navigate(path) {
    const normalized = this.normalizePath(path);
    if (window.location.hash !== normalized) {
      window.location.hash = normalized;
    } else {
      this.resolve();
    }
  }

  /**
   * Resolves the current window hash, checks authorization guards,
   * updates the document title, and invokes view handlers.
   */
  async resolve() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Router viewport container '#${this.containerId}' not found in DOM.`);
      return;
    }

    const rawHash = window.location.hash || (isAuthenticated() ? '#/dashboard' : '#/login');
    const [pathPart, queryPart] = rawHash.split('?');
    const normalizedPath = this.normalizePath(pathPart);
    const queryParams = new URLSearchParams(queryPart || '');

    // Default redirect: if not authenticated go to login, otherwise dashboard
    if (normalizedPath === '#/' || normalizedPath === '#') {
      window.location.hash = isAuthenticated() ? '#/dashboard' : '#/login';
      return;
    }

    const routeConfig = this.routes.get(normalizedPath);

    // 1. Handle Unregistered Routes (404)
    if (!routeConfig) {
      this.render404(container, normalizedPath);
      this.updateTitle('404 Not Found');
      this.updateNavigation(normalizedPath);
      return;
    }

    // 2. Authentication Guards
    if (routeConfig.requiresAuth && !isAuthenticated()) {
      window.location.hash = `#/login?redirect=${encodeURIComponent(normalizedPath)}`;
      return;
    }

    // 3. Guest-only Route Guard (redirect authenticated users away from login/register)
    if ((normalizedPath === '#/login' || normalizedPath === '#/register') && isAuthenticated()) {
      window.location.hash = '#/dashboard';
      return;
    }

    // 4. Role Authorization Guards
    if (routeConfig.roles && routeConfig.roles.length > 0) {
      const isAuthorized = routeConfig.roles.some((requiredRole) => hasRole(requiredRole));
      if (!isAuthorized) {
        this.render403(container, routeConfig.roles);
        this.updateTitle('403 Forbidden');
        this.updateNavigation(normalizedPath);
        return;
      }
    }

    // 5. Title & Navigation State Synchronization
    this.updateTitle(routeConfig.title);
    this.updateNavigation(normalizedPath);

    // 6. Execute View Render and Initialization Hooks
    try {
      this.currentRoute = normalizedPath;
      container.innerHTML = '';

      if (typeof routeConfig.render === 'function') {
        await routeConfig.render(container, {
          path: normalizedPath,
          query: queryParams,
          user: getCurrentUser()
        });
      }

      if (typeof routeConfig.init === 'function') {
        await routeConfig.init(container, {
          path: normalizedPath,
          query: queryParams,
          user: getCurrentUser()
        });
      }

      window.scrollTo(0, 0);
    } catch (err) {
      console.error(`Route render error at '${normalizedPath}':`, err);
      container.innerHTML = `
        <div class="alert alert-danger" style="margin-top: 2rem;">
          <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem; color: #DC2626;">View Execution Error</h3>
          <p style="margin-bottom: 0;">An unhandled exception occurred while loading this interface: ${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  /**
   * Synchronizes active visual state across primary navigation links.
   *
   * @param {string} currentPath - Current active normalized hash route.
   */
  updateNavigation(currentPath) {
    const navLinks = document.querySelectorAll('.site-nav .nav-link, .header-brand .brand-link');
    navLinks.forEach((link) => {
      const routeAttr = link.getAttribute('data-route') || link.getAttribute('href');
      if (!routeAttr) return;

      const normalizedAttr = this.normalizePath(routeAttr.split('?')[0]);
      if (normalizedAttr === currentPath) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * Sets document title metadata.
   *
   * @param {string} pageTitle - View title descriptor.
   */
  updateTitle(pageTitle) {
    if (pageTitle) {
      document.title = `SkillForge - ${pageTitle}`;
    } else {
      document.title = 'SkillForge - IT Competency Assessment, CV Gap Analysis, and Market-Aligned Course Planner';
    }
  }

  /**
   * Renders standardized 404 Not Found error state.
   *
   * @param {HTMLElement} container - Target container element.
   * @param {string} attemptedPath - Missing route identifier.
   */
  render404(container, attemptedPath) {
    container.innerHTML = `
      <div class="error-view-wrapper" style="max-width: 540px; margin: 3rem auto; text-align: center;">
        <div class="card">
          <div class="card-header" style="justify-content: center;">
            <h2 class="card-title" style="color: #DC2626;">404 - Route Not Found</h2>
          </div>
          <div class="card-body">
            <p>The requested route <code class="font-mono">${escapeHtml(attemptedPath)}</code> does not correspond to an active interface within SkillForge.</p>
            <p class="text-muted" style="font-size: 0.875rem;">Verify the address path or return to your competency dashboard.</p>
            <div style="margin-top: 1.5rem;">
              <a href="#/dashboard" class="btn btn-primary">Return to Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders standardized 403 Forbidden error state.
   *
   * @param {HTMLElement} container - Target container element.
   * @param {Array<string>} requiredRoles - List of authorized role titles.
   */
  render403(container, requiredRoles) {
    const roleList = requiredRoles.join(', ');
    container.innerHTML = `
      <div class="error-view-wrapper" style="max-width: 540px; margin: 3rem auto; text-align: center;">
        <div class="card">
          <div class="card-header" style="justify-content: center;">
            <h2 class="card-title" style="color: #D97706;">403 - Access Prohibited</h2>
          </div>
          <div class="card-body">
            <p>Your current user profile does not hold the authorization credentials required to access this interface.</p>
            <p class="text-muted" style="font-size: 0.875rem;">Required Role Level: <strong>${escapeHtml(roleList)}</strong></p>
            <div style="margin-top: 1.5rem; display: flex; justify-content: center; gap: 0.75rem;">
              <a href="#/dashboard" class="btn btn-primary">Return to Dashboard</a>
              <button type="button" class="btn btn-secondary" onclick="window.location.hash='#/login'">Switch Account</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Binds browser window hashchange events and triggers initial route resolution.
   */
  init() {
    window.addEventListener('hashchange', () => {
      this.resolve();
    });

    // Handle initial route on startup
    this.resolve();
  }
}

/**
 * Escapes HTML characters for defensive view rendering.
 *
 * @param {string} str - Raw string.
 * @returns {string} Sanitized string.
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
 * Application singleton router instance.
 */
export const router = new Router('main-content-area');

/**
 * Helper shortcut to register routes onto singleton.
 */
export const registerRoute = router.register.bind(router);

/**
 * Helper shortcut to navigate using singleton.
 */
export const navigate = router.navigate.bind(router);

export default router;
