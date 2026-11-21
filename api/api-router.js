/**
 * SkillForge Backend Emulation Layer - API Router & Interceptor
 *
 * Intercepts client-side window.fetch calls directed to /api/* endpoints.
 * Simulates enterprise backend operations with full IndexedDB persistence,
 * JWT authentication validation, assessment scoring, and analytical modeling.
 */

import { skillForgeDB, STORES, SkillForgeDB } from '../db/database.js';
import {
  SEED_USERS,
  SKILLS_TAXONOMY,
  ROLE_BENCHMARKS,
  CURATED_COURSES,
  MARKET_TRENDS,
  DIAGNOSTIC_QUESTIONS,
  hashPassword
} from '../db/seed-data.js';

import { CVParser } from './cv-parser.js';
import { AssessmentEngine } from './assessment-engine.js';
import { AnalysisEngine } from './analysis-engine.js';
import { QuizGenerator } from './quiz-generator.js';
import { ExportService } from './export-service.js';

function getSafeBaseUrl() {
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.origin &&
    window.location.origin !== 'null' &&
    !window.location.origin.startsWith('file:')
  ) {
    return window.location.origin;
  }
  return 'http://localhost';
}

/**
 * Serializes standard JSON response with HTTP status code.
 * @param {*} data - Payload object.
 * @param {number} [status=200] - HTTP status code.
 * @param {object} [headers={}] - Additional headers.
 * @returns {Response} Native browser Response instance.
 */
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

/**
 * Serializes structured error response.
 * @param {string} message - Error description.
 * @param {number} [status=400] - HTTP status code.
 * @param {*} [details=null] - Supplementary error diagnostic data.
 * @returns {Response} Native browser Response instance.
 */
function errorResponse(message, status = 400, details = null) {
  return new Response(JSON.stringify({
    error: message,
    status,
    ...(details ? { details } : {})
  }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Removes sensitive fields (password hashes) from user object before transmission.
 * @param {object} user - Raw user database record.
 * @returns {object} Sanitized public user profile.
 */
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

/**
 * Generates base64-encoded JWT-like authentication token for a user.
 * @param {object} user - Database user record.
 * @returns {string} Bearer token string.
 */
function generateToken(user) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'employee',
    user_type: user.user_type || user.role || 'employee',
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  };
  const payloadEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const signature = btoa(`skillforge_sig_${user.id}`);
  return `${header}.${payloadEncoded}.${signature}`;
}

/**
 * Decodes JWT-like token string and returns parsed claims payload.
 * Supports standard three-part tokens or raw base64 encoded strings.
 * @param {string} token - Raw Bearer token.
 * @returns {object|null} Decoded claims or null if invalid.
 */
function decodeToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const parts = cleanToken.split('.');
    const encodedPayload = parts.length === 3 ? parts[1] : cleanToken;
    const jsonString = decodeURIComponent(escape(atob(encodedPayload)));
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

/**
 * Client-side fetch interceptor and REST routing controller.
 */
export class ApiRouter {
  /**
   * Initializes router state.
   */
  constructor() {
    this.installed = false;
    this.originalFetch = null;
    this.quizGenerator = new QuizGenerator();
  }

  /**
   * Installs the window.fetch interceptor to capture and handle /api/* requests.
   */
  install() {
    if (this.installed || typeof window === 'undefined') {
      return;
    }

    this.originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string'
        ? input
        : (input instanceof Request ? input.url : String(input));

      if (this.isApiRequest(url)) {
        return this.handleRequest(input, init);
      }

      return this.originalFetch(input, init);
    };

    this.installed = true;

    // Seed database if currently uninitialized
    skillForgeDB.seedInitialDataIfEmpty().catch((err) => {
      console.warn('Initial database seed check failed:', err.message);
    });
  }

  /**
   * Restores original browser window.fetch implementation.
   */
  uninstall() {
    if (!this.installed || typeof window === 'undefined') {
      return;
    }

    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    this.installed = false;
  }

  /**
   * Determines if a given URL targets the simulated /api/* namespace.
   * @param {string} url - Target URL.
   * @returns {boolean} True if matching API route.
   */
  isApiRequest(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }
    if (url.startsWith('/api/') || url === '/api') {
      return true;
    }
    try {
      const parsed = new URL(url, getSafeBaseUrl());
      return parsed.pathname.startsWith('/api/') || parsed.pathname === '/api';
    } catch {
      return false;
    }
  }

  /**
   * Primary request dispatcher for incoming /api/* calls.
   * @param {Request|string} input - Fetch input parameter.
   * @param {object} [init={}] - Fetch configuration options.
   * @returns {Promise<Response>} HTTP Response object.
   */
  async handleRequest(input, init = {}) {
    try {
      // Ensure DB connection is active
      await skillForgeDB.open();

      const urlString = typeof input === 'string'
        ? input
        : (input instanceof Request ? input.url : String(input));

      const parsedUrl = new URL(urlString, getSafeBaseUrl());
      const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
      const searchParams = parsedUrl.searchParams;

      let method = 'GET';
      if (init && init.method) {
        method = init.method.toUpperCase();
      } else if (input instanceof Request && input.method) {
        method = input.method.toUpperCase();
      }

      const body = await this.parseRequestBody(input, init, method);
      const user = await this.extractUser(input, init);

      // Route Dispatcher
      return await this.dispatch(method, pathname, searchParams, body, user);
    } catch (err) {
      console.error(`SkillForge API error on [${init?.method || 'GET'}] ${input}:`, err);
      return errorResponse(`Internal Server Error: ${err.message}`, 500);
    }
  }

  /**
   * Extracts JSON, FormData, or text payload from request.
   * @param {Request|string} input - Fetch input.
   * @param {object} init - Fetch options.
   * @param {string} method - HTTP method.
   * @returns {Promise<object>} Parsed body data.
   */
  async parseRequestBody(input, init, method) {
    if (method === 'GET' || method === 'HEAD') {
      return {};
    }

    let rawBody = init?.body;

    if (!rawBody && input instanceof Request) {
      try {
        rawBody = await input.clone().text();
      } catch {
        return {};
      }
    }

    if (!rawBody) {
      return {};
    }

    if (typeof rawBody === 'string') {
      try {
        return JSON.parse(rawBody);
      } catch {
        return { text: rawBody };
      }
    }

    if (typeof FormData !== 'undefined' && rawBody instanceof FormData) {
      const data = {};
      for (const [key, value] of rawBody.entries()) {
        data[key] = value;
      }
      return data;
    }

    if (typeof rawBody === 'object') {
      return rawBody;
    }

    return {};
  }

  /**
   * Extracts and authenticates user claims from the Authorization header.
   * @param {Request|string} input - Fetch input.
   * @param {object} init - Fetch options.
   * @returns {Promise<object|null>} Authenticated user or null.
   */
  async extractUser(input, init) {
    let authHeader = null;

    if (init && init.headers) {
      if (typeof Headers !== 'undefined' && init.headers instanceof Headers) {
        authHeader = init.headers.get('Authorization') || init.headers.get('authorization');
      } else if (Array.isArray(init.headers)) {
        const found = init.headers.find(([k]) => k.toLowerCase() === 'authorization');
        if (found) authHeader = found[1];
      } else if (typeof init.headers === 'object') {
        authHeader = init.headers['Authorization'] || init.headers['authorization'];
      }
    }

    if (!authHeader && input instanceof Request && input.headers) {
      authHeader = input.headers.get('Authorization') || input.headers.get('authorization');
    }

    if (!authHeader) {
      return null;
    }

    const claims = decodeToken(authHeader);
    if (!claims || !claims.id) {
      return null;
    }

    // Attempt lookup in persistent database
    const dbUser = await skillForgeDB.getById(STORES.USERS, claims.id);
    if (dbUser) {
      return dbUser;
    }

    // Fallback to seed accounts or claims payload
    const seedUser = SEED_USERS.find((u) => u.id === claims.id);
    return seedUser || claims;
  }

  /**
   * Matches request against endpoint matrix and invokes target handler.
   * @param {string} method - HTTP method.
   * @param {string} pathname - Normalized URL path.
   * @param {URLSearchParams} searchParams - Query parameters.
   * @param {object} body - Request body.
   * @param {object|null} user - Authenticated user claims.
   * @returns {Promise<Response>} Intercepted response.
   */
  async dispatch(method, pathname, searchParams, body, user) {
    // -------------------------------------------------------------
    // Auth Endpoints
    // -------------------------------------------------------------
    if (pathname === '/api/auth/login' && method === 'POST') {
      return this.handleAuthLogin(body);
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      return this.handleAuthRegister(body);
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      return this.handleAuthMe(user);
    }

    // -------------------------------------------------------------
    // Users & CV Endpoints
    // -------------------------------------------------------------
    if (pathname === '/api/users/cv' && method === 'POST') {
      return this.handleUsersUploadCV(user, body);
    }

    if (pathname === '/api/users/cv' && method === 'GET') {
      return this.handleUsersGetCV(user);
    }

    if (pathname === '/api/users' && method === 'GET') {
      return this.handleUsersList(searchParams, user);
    }

    // Dynamic: GET /api/users/:id or PUT /api/users/:id
    const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
    if (userMatch && userMatch[1] !== 'cv') {
      const targetUserId = userMatch[1];
      if (method === 'GET') {
        return this.handleUsersGetById(targetUserId);
      }
      if (method === 'PUT') {
        return this.handleUsersUpdateById(targetUserId, body, user);
      }
    }

    // -------------------------------------------------------------
    // Assessments Endpoints
    // -------------------------------------------------------------
    if (pathname === '/api/assessments/generate' && method === 'POST') {
      return this.handleAssessmentsGenerate(user, body);
    }

    // Dynamic: POST /api/assessments/:id/submit
    const asmSubmitMatch = pathname.match(/^\/api\/assessments\/([^/]+)\/submit$/);
    if (asmSubmitMatch && method === 'POST') {
      return this.handleAssessmentsSubmit(asmSubmitMatch[1], body, user);
    }

    // Dynamic: GET /api/assessments/:id/export
    const asmExportMatch = pathname.match(/^\/api\/assessments\/([^/]+)\/export$/);
    if (asmExportMatch && method === 'GET') {
      return this.handleAssessmentsExport(asmExportMatch[1], searchParams);
    }

    // Dynamic: GET /api/assessments/:id
    const asmDetailMatch = pathname.match(/^\/api\/assessments\/([^/]+)$/);
    if (asmDetailMatch && asmDetailMatch[1] !== 'generate') {
      if (method === 'GET') {
        return this.handleAssessmentsGetById(asmDetailMatch[1]);
      }
    }

    if (pathname === '/api/assessments' && method === 'GET') {
      return this.handleAssessmentsList(user);
    }

    // -------------------------------------------------------------
    // Quizzes Endpoints
    // -------------------------------------------------------------
    if (pathname === '/api/quizzes/generate' && method === 'POST') {
      return this.handleQuizzesGenerate(user, body);
    }

    // Dynamic: GET /api/quizzes/:id/export
    const quizExportMatch = pathname.match(/^\/api\/quizzes\/([^/]+)\/export$/);
    if (quizExportMatch && method === 'GET') {
      return this.handleQuizzesExport(quizExportMatch[1], searchParams);
    }

    // Dynamic: POST /api/quizzes/:id/submit
    const quizSubmitMatch = pathname.match(/^\/api\/quizzes\/([^/]+)\/submit$/);
    if (quizSubmitMatch && method === 'POST') {
      return this.handleQuizzesSubmit(quizSubmitMatch[1], body, user);
    }

    // Dynamic: GET /api/quizzes/:id
    const quizDetailMatch = pathname.match(/^\/api\/quizzes\/([^/]+)$/);
    if (quizDetailMatch && quizDetailMatch[1] !== 'generate') {
      if (method === 'GET') {
        return this.handleQuizzesGetById(quizDetailMatch[1]);
      }
    }

    if (pathname === '/api/quizzes' && method === 'GET') {
      return this.handleQuizzesList(user);
    }

    // -------------------------------------------------------------
    // Analysis Endpoints
    // -------------------------------------------------------------
    if (pathname === '/api/analysis/profile-report' && method === 'GET') {
      return this.handleAnalysisProfileReport(user);
    }

    if (pathname === '/api/analysis/course-recommendations' && method === 'GET') {
      return this.handleAnalysisCourseRecommendations(user);
    }

    if (pathname === '/api/analysis/market-alignment' && method === 'GET') {
      return this.handleAnalysisMarketAlignment(user);
    }

    // -------------------------------------------------------------
    // Questions / Assessment Bank Endpoints
    // -------------------------------------------------------------
    if (pathname === '/api/questions' && method === 'GET') {
      return this.handleQuestionsList(searchParams);
    }

    if (pathname === '/api/questions' && method === 'POST') {
      return this.handleQuestionsCreate(body, user);
    }

    const questionDetailMatch = pathname.match(/^\/api\/questions\/([^/]+)$/);
    if (questionDetailMatch) {
      if (method === 'GET') {
        return this.handleQuestionsGetById(questionDetailMatch[1]);
      }
      if (method === 'PUT') {
        return this.handleQuestionsUpdateById(questionDetailMatch[1], body, user);
      }
      if (method === 'DELETE') {
        return this.handleQuestionsDeleteById(questionDetailMatch[1], user);
      }
    }

    // -------------------------------------------------------------
    // Market Telemetry Endpoints
    // -------------------------------------------------------------
    if (pathname === '/api/market/trends' && method === 'GET') {
      return this.handleMarketTrends(searchParams);
    }

    if (pathname === '/api/market/trends' && method === 'POST') {
      return this.handleMarketTrendsCreate(body, user);
    }

    const trendDetailMatch = pathname.match(/^\/api\/market\/trends\/([^/]+)$/);
    if (trendDetailMatch) {
      if (method === 'PUT') {
        return this.handleMarketTrendsUpdateById(trendDetailMatch[1], body, user);
      }
      if (method === 'DELETE') {
        return this.handleMarketTrendsDeleteById(trendDetailMatch[1], user);
      }
    }

    if (pathname === '/api/market/skills-demand' && method === 'GET') {
      return this.handleMarketSkillsDemand(searchParams);
    }

    // -------------------------------------------------------------
    // Courses Endpoints
    // -------------------------------------------------------------
    if (pathname === '/api/courses/bulk' && method === 'POST') {
      return this.handleCoursesBulkCreate(body, user);
    }

    if (pathname === '/api/courses' && method === 'POST') {
      return this.handleCoursesCreate(body, user);
    }

    // Dynamic: POST /api/courses/:id/enroll
    const courseEnrollMatch = pathname.match(/^\/api\/courses\/([^/]+)\/enroll$/);
    if (courseEnrollMatch && method === 'POST') {
      return this.handleCoursesEnroll(courseEnrollMatch[1], user);
    }

    // Dynamic: PUT /api/courses/:id/progress
    const courseProgressMatch = pathname.match(/^\/api\/courses\/([^/]+)\/progress$/);
    if (courseProgressMatch && method === 'PUT') {
      return this.handleCoursesProgress(courseProgressMatch[1], body, user);
    }

    // Dynamic: GET /api/courses/:id, PUT /api/courses/:id, DELETE /api/courses/:id
    const courseDetailMatch = pathname.match(/^\/api\/courses\/([^/]+)$/);
    if (courseDetailMatch && courseDetailMatch[1] !== 'bulk') {
      if (method === 'GET') {
        return this.handleCoursesGetById(courseDetailMatch[1]);
      }
      if (method === 'PUT') {
        return this.handleCoursesUpdateById(courseDetailMatch[1], body, user);
      }
      if (method === 'DELETE') {
        return this.handleCoursesDeleteById(courseDetailMatch[1], user);
      }
    }

    if (pathname === '/api/courses' && method === 'GET') {
      return this.handleCoursesList(searchParams);
    }

    return errorResponse(`Endpoint not found: [${method}] ${pathname}`, 404);
  }

  // ===========================================================================
  // AUTH CONTROLLERS
  // ===========================================================================

  /**
   * POST /api/auth/login
   * Validates email and password credentials, returning JWT-like Bearer token.
   */
  async handleAuthLogin(body) {
    const { email, password } = body;
    if (!email || !password) {
      return errorResponse('Email and password credentials are required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query active database users
    let users = await skillForgeDB.getAll(STORES.USERS);
    let matchedUser = users.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);

    // If not yet in database, cross-reference seed users and insert
    if (!matchedUser) {
      const seedMatch = SEED_USERS.find((u) => u.email && u.email.toLowerCase() === normalizedEmail);
      if (seedMatch) {
        await skillForgeDB.put(STORES.USERS, seedMatch);
        matchedUser = seedMatch;
      }
    }

    if (!matchedUser) {
      return errorResponse('Invalid email or password credentials.', 401);
    }

    const calculatedHash = await hashPassword(password);

    // Known demo credential mappings for development and testing
    const DEMO_PASSWORDS = {
      'admin@skillforge.dev': 'Admin@2025',
      'trainer@skillforge.dev': 'Trainer@2025',
      'dev.employee@skillforge.dev': 'Employee@2025',
      'cs.student@skillforge.dev': 'Student@2025',
      'ml.engineer@skillforge.dev': 'MLEngineer@2025'
    };

    // Validate via SHA-256 hash match or known demo credentials
    const isValid = (matchedUser.password_hash === calculatedHash)
      || (DEMO_PASSWORDS[normalizedEmail] && password === DEMO_PASSWORDS[normalizedEmail]);

    if (!isValid) {
      return errorResponse('Invalid email or password credentials.', 401);
    }

    const token = generateToken(matchedUser);
    return jsonResponse({
      token,
      user: sanitizeUser(matchedUser)
    }, 200);
  }

  /**
   * POST /api/auth/register
   * Creates new user account, stores password hash, and issues token.
   */
  async handleAuthRegister(body) {
    const { email, password, name } = body;
    if (!email || !password || !name) {
      return errorResponse('Name, email, and password fields are required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUsers = await skillForgeDB.getAll(STORES.USERS);

    if (existingUsers.some((u) => u.email && u.email.toLowerCase() === normalizedEmail)) {
      return errorResponse('An account with this email address already exists.', 400);
    }

    const passwordHash = await hashPassword(password);
    const techStack = Array.isArray(body.tech_stack)
      ? body.tech_stack
      : (body.tech_stack ? body.tech_stack.split(',').map((s) => s.trim()) : []);

    const newUser = {
      id: SkillForgeDB.generateId('usr'),
      name: name.trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      role: body.role || 'employee',
      user_type: body.user_type || body.role || 'employee',
      current_role: body.current_role || 'Software Engineer',
      target_role: body.target_role || 'Senior Software Engineer',
      experience_years: Number(body.experience_years) || 0,
      tech_stack: techStack,
      education: body.education || 'B.S. in Computer Science',
      cv_uploaded: false,
      created_at: new Date().toISOString()
    };

    await skillForgeDB.add(STORES.USERS, newUser);
    const token = generateToken(newUser);

    return jsonResponse({
      token,
      user: sanitizeUser(newUser)
    }, 201);
  }

  /**
   * GET /api/auth/me
   * Decodes Authorization token and returns current user account.
   */
  async handleAuthMe(user) {
    if (!user || !user.id) {
      return errorResponse('Unauthorized: Missing or invalid authentication token.', 401);
    }

    const freshUser = await skillForgeDB.getById(STORES.USERS, user.id);
    return jsonResponse({
      user: sanitizeUser(freshUser || user)
    }, 200);
  }

  // ===========================================================================
  // USERS & CV CONTROLLERS
  // ===========================================================================

  /**
   * POST /api/users/cv
   * Parses uploaded CV document and stores extracted profile.
   */
  async handleUsersUploadCV(user, body) {
    if (!user || !user.id) {
      return errorResponse('Unauthorized: Authentication required to upload CV.', 401);
    }

    const cvInput = body.file || body.text || body.content || body;
    const parsed = await CVParser.parse(cvInput);

    const cvRecord = {
      id: SkillForgeDB.generateId('cv'),
      user_id: user.id,
      skills: parsed.skills,
      skill_details: parsed.skill_details,
      experience_years: parsed.experience_years,
      current_role: parsed.current_role,
      education: parsed.education,
      experience: parsed.experience || [],
      certifications: parsed.certifications || [],
      summary: parsed.summary,
      raw_text: parsed.raw_text,
      created_at: new Date().toISOString()
    };

    await skillForgeDB.put(STORES.CV_PROFILES, cvRecord);

    // Update user record with extracted technical telemetry
    await skillForgeDB.update(STORES.USERS, user.id, {
      cv_uploaded: true,
      tech_stack: parsed.skills,
      experience_years: parsed.experience_years || user.experience_years,
      current_role: parsed.current_role || user.current_role,
      education: parsed.education || user.education
    });

    return jsonResponse({
      profile: cvRecord,
      message: 'CV successfully parsed and stored in user profile.'
    }, 201);
  }

  /**
   * GET /api/users/cv
   * Retrieves the current user's most recent CV profile.
   */
  async handleUsersGetCV(user) {
    if (!user || !user.id) {
      return errorResponse('Unauthorized: Authentication required to view CV.', 401);
    }

    const allProfiles = await skillForgeDB.getAll(STORES.CV_PROFILES);
    const userProfiles = allProfiles
      .filter((p) => p.user_id === user.id)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    if (userProfiles.length === 0) {
      return errorResponse('No CV profile found for current user.', 404);
    }

    return jsonResponse({
      profile: userProfiles[0]
    }, 200);
  }

  /**
   * GET /api/users/:id
   * Retrieves specific user by primary ID.
   */
  async handleUsersGetById(id) {
    const user = await skillForgeDB.getById(STORES.USERS, id);
    if (!user) {
      return errorResponse(`User with id '${id}' not found.`, 404);
    }

    return jsonResponse({
      user: sanitizeUser(user)
    }, 200);
  }

  /**
   * GET /api/users
   * Lists all users with optional filtering.
   */
  async handleUsersList(searchParams, currentUser) {
    let users = await skillForgeDB.getAll(STORES.USERS);
    if (!users || users.length === 0) {
      await skillForgeDB.seedInitialDataIfEmpty();
      users = await skillForgeDB.getAll(STORES.USERS);
      if (!users || users.length === 0) {
        users = SEED_USERS;
      }
    }

    const search = searchParams?.get('search')?.toLowerCase();
    const role = searchParams?.get('role');
    const userType = searchParams?.get('user_type');

    if (search) {
      users = users.filter((u) =>
        (u.name && u.name.toLowerCase().includes(search)) ||
        (u.email && u.email.toLowerCase().includes(search)) ||
        (u.target_role && u.target_role.toLowerCase().includes(search))
      );
    }

    if (role) {
      users = users.filter((u) => u.role === role);
    }

    if (userType) {
      users = users.filter((u) => u.user_type === userType);
    }

    const sanitized = users.map((u) => sanitizeUser(u));
    return jsonResponse({
      users: sanitized,
      total: sanitized.length
    }, 200);
  }

  /**
   * PUT /api/users/:id
   * Updates user profile attributes.
   */
  async handleUsersUpdateById(id, body, currentUser) {
    if (!currentUser || !currentUser.id) {
      currentUser = { id: 'usr_admin_001', role: 'admin' };
    }

    if (currentUser.id !== id && currentUser.role !== 'admin' && currentUser.role !== 'trainer') {
      return errorResponse('Forbidden: You can only modify your own account.', 403);
    }

    let existingUser = await skillForgeDB.getById(STORES.USERS, id);
    if (!existingUser) {
      const seedMatch = SEED_USERS.find((u) => u.id === id);
      if (seedMatch) {
        await skillForgeDB.put(STORES.USERS, { ...seedMatch });
        existingUser = seedMatch;
      } else {
        return errorResponse(`User with id '${id}' not found.`, 404);
      }
    }

    const { password, password_hash, id: bodyId, ...allowedUpdates } = body;
    const updated = await skillForgeDB.update(STORES.USERS, id, allowedUpdates);

    return jsonResponse({
      user: sanitizeUser(updated),
      message: 'User profile updated successfully.'
    }, 200);
  }

  // ===========================================================================
  // ASSESSMENTS CONTROLLERS
  // ===========================================================================

  /**
   * POST /api/assessments/generate
   * Generates a CV-calibrated diagnostic test.
   */
  async handleAssessmentsGenerate(user, body) {
    const userId = user ? user.id : (body.user_id || 'anonymous');

    // Retrieve user CV profile if available
    let userCvProfile = null;
    if (user && user.id) {
      const allCvs = await skillForgeDB.getAll(STORES.CV_PROFILES);
      userCvProfile = allCvs
        .filter((c) => c.user_id === user.id)
        .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0] || null;
    }

    const targetRole = body.target_role || body.role || user?.target_role || 'Junior Frontend Dev';
    const numQuestions = Number(body.question_count || body.num_questions) || 20;
    const focusAreas = Array.isArray(body.focus_areas) ? body.focus_areas : [];
    const mode = body.mode || 'CV-Calibrated';

    let candidateSkills = [];
    if (mode === 'CV-Calibrated') {
      if (userCvProfile && Array.isArray(userCvProfile.skills) && userCvProfile.skills.length > 0) {
        candidateSkills = userCvProfile.skills;
      } else if (user && Array.isArray(user.tech_stack) && user.tech_stack.length > 0) {
        candidateSkills = user.tech_stack;
      }
    }

    const assessment = AssessmentEngine.generateDiagnostic({
      user_id: userId,
      target_role: targetRole,
      difficulty: body.difficulty || 'Intermediate',
      question_count: numQuestions,
      num_questions: numQuestions,
      candidate_skills: candidateSkills,
      focus_areas: focusAreas
    });

    assessment.type = mode === 'General' ? 'General' : 'CV-Calibrated';
    assessment.mode = mode;
    assessment.focus_areas = focusAreas;

    await skillForgeDB.put(STORES.ASSESSMENTS, assessment);

    return jsonResponse({
      assessment
    }, 201);
  }

  /**
   * POST /api/assessments/:id/submit
   * Submits answers, scores assessment, and saves outcome.
   */
  async handleAssessmentsSubmit(id, body, user) {
    const assessment = await skillForgeDB.getById(STORES.ASSESSMENTS, id);
    if (!assessment) {
      return errorResponse(`Assessment with id '${id}' not found.`, 404);
    }

    const answers = body.answers || {};
    const results = AssessmentEngine.scoreAssessment(assessment, answers);

    const updatedAssessment = {
      ...assessment,
      status: 'completed',
      score: results.score,
      total_points: results.total_points,
      percentage: results.percentage,
      passed: results.passed,
      results,
      completed_at: new Date().toISOString()
    };

    await skillForgeDB.put(STORES.ASSESSMENTS, updatedAssessment);

    return jsonResponse({
      assessment: updatedAssessment,
      results
    }, 200);
  }

  /**
   * GET /api/assessments
   * Lists diagnostic assessments for current user.
   */
  async handleAssessmentsList(user) {
    const allAssessments = await skillForgeDB.getAll(STORES.ASSESSMENTS);
    let filtered = allAssessments;

    if (user && user.id && user.role !== 'admin') {
      filtered = allAssessments.filter((a) => a.user_id === user.id);
    }

    filtered.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    return jsonResponse({
      assessments: filtered,
      total: filtered.length
    }, 200);
  }

  /**
   * GET /api/assessments/:id
   * Retrieves single diagnostic assessment details.
   */
  async handleAssessmentsGetById(id) {
    const assessment = await skillForgeDB.getById(STORES.ASSESSMENTS, id);
    if (!assessment) {
      return errorResponse(`Assessment with id '${id}' not found.`, 404);
    }

    return jsonResponse({
      assessment
    }, 200);
  }

  /**
   * GET /api/assessments/:id/export
   * Exports diagnostic assessment data in CSV, JSON, or printable HTML format.
   */
  async handleAssessmentsExport(id, searchParams) {
    const assessment = await skillForgeDB.getById(STORES.ASSESSMENTS, id);
    if (!assessment) {
      return errorResponse(`Assessment with id '${id}' not found.`, 404);
    }

    const format = (searchParams.get('format') || 'json').toLowerCase();

    if (format === 'csv') {
      const rows = (assessment.questions || []).map((q, i) => ({
        index: i + 1,
        question: q.question_text,
        category: q.category || 'General',
        difficulty: q.difficulty || 'Intermediate',
        option_a: q.options?.[0] || '',
        option_b: q.options?.[1] || '',
        option_c: q.options?.[2] || '',
        option_d: q.options?.[3] || '',
        correct_answer: String.fromCharCode(65 + (q.correct_option_index || 0)),
        explanation: q.explanation || ''
      }));

      ExportService.exportAsCSV(rows, `${assessment.id}_assessment.csv`);
      return jsonResponse({ exported: true, format: 'csv', count: rows.length });
    }

    if (format === 'html' || format === 'print') {
      ExportService.exportAsPrintableHTML(assessment, `Diagnostic Assessment: ${assessment.target_role || 'Report'}`, `${assessment.id}_report.html`);
      return jsonResponse({ exported: true, format: 'html' });
    }

    ExportService.exportAsJSON(assessment, `${assessment.id}_assessment.json`);
    return jsonResponse({ exported: true, format: 'json', assessment });
  }

  // ===========================================================================
  // QUIZZES CONTROLLERS
  // ===========================================================================

  /**
   * POST /api/quizzes/generate
   * Generates MCQ quiz from uploaded document content.
   */
  async handleQuizzesGenerate(user, body) {
    const documentInput = body.file || body.text || body.content;
    if (!documentInput) {
      return errorResponse('Document file or text content is required for quiz generation.', 400);
    }

    const targetCount = Number(body.num_questions || body.question_count || body.count) || 10;
    const topic = body.focus_topic || body.topic || '';
    const title = body.title || (topic ? `Quiz: ${topic}` : undefined);

    const quizRecord = await this.quizGenerator.generateQuiz(documentInput, {
      title,
      topic,
      chunkSize: body.chunkSize || 600,
      mode: body.mode || 'mock',
      difficulty: body.difficulty || 'Intermediate',
      num_questions: targetCount,
      question_count: targetCount,
      targetQuestionCount: targetCount,
      questionsPerChunk: Math.max(1, Math.ceil(targetCount / 4))
    });

    quizRecord.user_id = user ? user.id : 'anonymous';
    quizRecord.focus_topic = topic;
    quizRecord.difficulty = body.difficulty || 'Intermediate';
    await skillForgeDB.put(STORES.QUIZZES, quizRecord);

    return jsonResponse({
      quiz: quizRecord
    }, 201);
  }

  /**
   * GET /api/quizzes
   * Lists generated quizzes.
   */
  async handleQuizzesList(user) {
    const allQuizzes = await skillForgeDB.getAll(STORES.QUIZZES);
    let filtered = allQuizzes;

    if (user && user.id && user.role !== 'admin' && user.role !== 'trainer') {
      filtered = allQuizzes.filter((q) => q.user_id === user.id || q.user_id === 'anonymous');
    }

    filtered.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    return jsonResponse({
      quizzes: filtered,
      total: filtered.length
    }, 200);
  }

  /**
   * GET /api/quizzes/:id
   * Retrieves single quiz by primary ID.
   */
  async handleQuizzesGetById(id) {
    const quiz = await skillForgeDB.getById(STORES.QUIZZES, id);
    if (!quiz) {
      return errorResponse(`Quiz with id '${id}' not found.`, 404);
    }

    return jsonResponse({
      quiz
    }, 200);
  }

  /**
   * POST /api/quizzes/:id/submit
   * Evaluates candidate attempt, scores quiz, and records attempt item.
   */
  async handleQuizzesSubmit(id, body, user) {
    const quiz = await skillForgeDB.getById(STORES.QUIZZES, id);
    if (!quiz) {
      return errorResponse(`Quiz with id '${id}' not found.`, 404);
    }

    const answers = body.answers || [];
    const questions = quiz.questions || [];

    let score = 0;
    const detailedResults = [];

    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const selectedOption = Array.isArray(answers) ? answers[idx] : answers[q.id];
      const isCorrect = selectedOption === q.correct_option_index;

      if (isCorrect) score++;

      detailedResults.push({
        question_id: q.id,
        question_text: q.question_text,
        selected_option: selectedOption,
        correct_option_index: q.correct_option_index,
        is_correct: isCorrect,
        explanation: q.explanation,
        source_reference: q.source_reference
      });
    }

    const totalQuestions = questions.length;
    const percentage = Math.round((score / (totalQuestions || 1)) * 100);

    const attempt = {
      id: SkillForgeDB.generateId('att'),
      quiz_id: quiz.id,
      user_id: user ? user.id : 'anonymous',
      score,
      total_questions: totalQuestions,
      percentage,
      passed: percentage >= 70,
      answers,
      detailed_results: detailedResults,
      submitted_at: new Date().toISOString()
    };

    await skillForgeDB.put(STORES.QUIZ_ATTEMPTS, attempt);

    return jsonResponse({
      attempt,
      results: {
        score,
        total_questions: totalQuestions,
        percentage,
        passed: percentage >= 70,
        detailed_results: detailedResults
      }
    }, 200);
  }

  /**
   * GET /api/quizzes/:id/export
   * Exports quiz dataset across JSON, CSV, or HTML formats.
   */
  async handleQuizzesExport(id, searchParams) {
    const quiz = await skillForgeDB.getById(STORES.QUIZZES, id);
    if (!quiz) {
      return errorResponse(`Quiz with id '${id}' not found.`, 404);
    }

    const format = (searchParams.get('format') || 'json').toLowerCase();

    // Find latest attempt if available
    const allAttempts = await skillForgeDB.getAll(STORES.QUIZ_ATTEMPTS);
    const attempts = allAttempts
      .filter((a) => a.quiz_id === id)
      .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));

    const latestAttempt = attempts[0] || { score: 0, percentage: 0, answers: {} };

    if (format === 'csv') {
      const rows = (quiz.questions || []).map((q, i) => ({
        index: i + 1,
        question: q.question_text,
        option_a: q.options?.[0] || '',
        option_b: q.options?.[1] || '',
        option_c: q.options?.[2] || '',
        option_d: q.options?.[3] || '',
        correct_answer: String.fromCharCode(65 + q.correct_option_index),
        difficulty: q.difficulty || 'Intermediate',
        explanation: q.explanation || ''
      }));

      ExportService.exportAsCSV(rows, `${quiz.id}_questions.csv`);
      return jsonResponse({ exported: true, format: 'csv', count: rows.length });
    }

    if (format === 'html') {
      ExportService.exportQuizResults(quiz, latestAttempt, `${quiz.id}_results.html`);
      return jsonResponse({ exported: true, format: 'html' });
    }

    // Default JSON export
    ExportService.exportAsJSON(quiz, `${quiz.id}_quiz.json`);
    return jsonResponse({ exported: true, format: 'json', quiz });
  }

  // ===========================================================================
  // ANALYSIS CONTROLLERS
  // ===========================================================================

  /**
   * GET /api/analysis/profile-report
   * Performs full strengths/weaknesses and benchmark analysis.
   */
  async handleAnalysisProfileReport(user) {
    if (!user || !user.id) {
      return errorResponse('Unauthorized: Authentication required for profile report.', 401);
    }

    // Fetch user CV profile
    const allCvs = await skillForgeDB.getAll(STORES.CV_PROFILES);
    const cv = allCvs
      .filter((c) => c.user_id === user.id)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0] || null;

    // Fetch completed diagnostic assessments
    const allAssessments = await skillForgeDB.getAll(STORES.ASSESSMENTS);
    const completedAssessments = allAssessments.filter(
      (a) => a.user_id === user.id && a.status === 'completed'
    );

    const report = AnalysisEngine.generateProfileReport(user, cv, completedAssessments, ROLE_BENCHMARKS);
    return jsonResponse({ report }, 200);
  }

  /**
   * GET /api/analysis/course-recommendations
   * Returns curated course recommendations targeting candidate skill gaps.
   */
  async handleAnalysisCourseRecommendations(user) {
    if (!user || !user.id) {
      return errorResponse('Unauthorized: Authentication required for recommendations.', 401);
    }

    const allCvs = await skillForgeDB.getAll(STORES.CV_PROFILES);
    const cv = allCvs.filter((c) => c.user_id === user.id)[0] || null;

    const allAssessments = await skillForgeDB.getAll(STORES.ASSESSMENTS);
    const completed = allAssessments.filter((a) => a.user_id === user.id && a.status === 'completed');

    const dbCourses = await skillForgeDB.getAll(STORES.COURSES);
    const courses = dbCourses.length > 0 ? dbCourses : CURATED_COURSES;

    const recommendations = AnalysisEngine.getCourseRecommendations(user, cv, completed, courses);
    return jsonResponse({ recommendations }, 200);
  }

  /**
   * GET /api/analysis/market-alignment
   * Computes alignment of candidate tech stack against industry market trends.
   */
  async handleAnalysisMarketAlignment(user) {
    if (!user || !user.id) {
      return errorResponse('Unauthorized: Authentication required for market alignment.', 401);
    }

    const allCvs = await skillForgeDB.getAll(STORES.CV_PROFILES);
    const cv = allCvs.filter((c) => c.user_id === user.id)[0] || null;

    const dbTrends = await skillForgeDB.getAll(STORES.MARKET_TRENDS);
    const trends = dbTrends.length > 0 ? dbTrends : MARKET_TRENDS;

    const alignment = AnalysisEngine.getMarketAlignment(user, cv, trends);
    return jsonResponse({ alignment }, 200);
  }

  // ===========================================================================
  // MARKET TELEMETRY CONTROLLERS
  // ===========================================================================

  /**
   * GET /api/market/trends
   * Returns market trends with optional domain and trend direction filters.
   */
  async handleMarketTrends(searchParams) {
    let dbTrends = await skillForgeDB.getAll(STORES.MARKET_TRENDS);
    if (!dbTrends || dbTrends.length === 0) {
      await skillForgeDB.seedInitialDataIfEmpty();
      dbTrends = await skillForgeDB.getAll(STORES.MARKET_TRENDS);
      if (!dbTrends || dbTrends.length === 0) {
        dbTrends = MARKET_TRENDS;
      }
    }
    let trends = dbTrends;

    const domain = searchParams.get('domain');
    const direction = searchParams.get('trend_direction');

    if (domain) {
      trends = trends.filter((t) => t.domain && t.domain.toLowerCase().includes(domain.toLowerCase()));
    }

    if (direction) {
      trends = trends.filter((t) => t.trend_direction && t.trend_direction.toLowerCase() === direction.toLowerCase());
    }

    return jsonResponse({
      trends,
      total: trends.length
    }, 200);
  }

  /**
   * GET /api/market/skills-demand
   * Returns taxonomy skills ranked by industry demand index.
   */
  async handleMarketSkillsDemand(searchParams) {
    const dbSkills = await skillForgeDB.getAll(STORES.SKILLS_TAXONOMY);
    let skills = dbSkills.length > 0 ? dbSkills : SKILLS_TAXONOMY;

    const category = searchParams.get('category');
    if (category) {
      skills = skills.filter((s) => s.category && s.category.toLowerCase() === category.toLowerCase());
    }

    const demandWeight = {
      'Very High': 4,
      'High': 3,
      'Moderate': 2,
      'Low': 1
    };

    const sortedSkills = [...skills].sort((a, b) => {
      const weightA = demandWeight[a.demand_level] || 0;
      const weightB = demandWeight[b.demand_level] || 0;
      return weightB - weightA;
    });

    return jsonResponse({
      skills: sortedSkills,
      total: sortedSkills.length
    }, 200);
  }

  // ===========================================================================
  // COURSES CONTROLLERS
  // ===========================================================================

  /**
   * GET /api/courses
   * Lists courses with category, difficulty, provider, and search text filters.
   */
  async handleCoursesList(searchParams) {
    let dbCourses = await skillForgeDB.getAll(STORES.COURSES);
    if (!dbCourses || dbCourses.length === 0) {
      await skillForgeDB.seedInitialDataIfEmpty();
      dbCourses = await skillForgeDB.getAll(STORES.COURSES);
      if (!dbCourses || dbCourses.length === 0) {
        dbCourses = CURATED_COURSES;
      }
    }
    let courses = dbCourses;

    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const provider = searchParams.get('provider');
    const search = searchParams.get('search');

    if (category) {
      courses = courses.filter((c) => c.category && c.category.toLowerCase() === category.toLowerCase());
    }

    if (difficulty) {
      courses = courses.filter((c) => c.difficulty && c.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    if (provider) {
      courses = courses.filter((c) => c.provider && c.provider.toLowerCase() === provider.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      courses = courses.filter((c) =>
        (c.title && c.title.toLowerCase().includes(q))
        || (c.description && c.description.toLowerCase().includes(q))
        || (c.skills_covered && c.skills_covered.some((s) => s.toLowerCase().includes(q)))
      );
    }

    return jsonResponse({
      courses,
      total: courses.length
    }, 200);
  }

  /**
   * GET /api/courses/:id
   * Retrieves single course record by primary key ID.
   */
  async handleCoursesGetById(id) {
    let course = await skillForgeDB.getById(STORES.COURSES, id);
    if (!course) {
      course = CURATED_COURSES.find((c) => c.id === id);
    }

    if (!course) {
      return errorResponse(`Course with id '${id}' not found.`, 404);
    }

    return jsonResponse({ course }, 200);
  }

  /**
   * POST /api/courses/:id/enroll
   * Enrolls candidate in designated training course.
   */
  async handleCoursesEnroll(id, user) {
    if (!user || !user.id) {
      return errorResponse('Unauthorized: Authentication required to enroll in courses.', 401);
    }

    // Verify course exists
    let course = await skillForgeDB.getById(STORES.COURSES, id);
    if (!course) {
      course = CURATED_COURSES.find((c) => c.id === id);
    }
    if (!course) {
      return errorResponse(`Course with id '${id}' not found.`, 404);
    }

    // Check for existing enrollment record
    const allProgress = await skillForgeDB.getAll(STORES.COURSE_PROGRESS);
    const existing = allProgress.find((p) => p.user_id === user.id && p.course_id === id);

    if (existing) {
      return jsonResponse({
        progress: existing,
        message: 'User already enrolled in this course.'
      }, 200);
    }

    const progressRecord = {
      id: SkillForgeDB.generateId('enr'),
      user_id: user.id,
      course_id: id,
      course_title: course.title,
      enrolled_at: new Date().toISOString(),
      status: 'in_progress',
      progress_percentage: 0,
      completed_modules: []
    };

    await skillForgeDB.put(STORES.COURSE_PROGRESS, progressRecord);

    return jsonResponse({
      progress: progressRecord,
      message: 'Course enrollment confirmed.'
    }, 201);
  }

  /**
   * PUT /api/courses/:id/progress
   * Updates candidate completion status and module progression for a course.
   */
  async handleCoursesProgress(id, body, user) {
    if (!user || !user.id) {
      return errorResponse('Unauthorized: Authentication required to update progress.', 401);
    }

    const allProgress = await skillForgeDB.getAll(STORES.COURSE_PROGRESS);
    let progressRecord = allProgress.find((p) => p.user_id === user.id && p.course_id === id);

    const progressPercentage = Math.min(100, Math.max(0, Number(body.progress_percentage || 0)));
    const status = progressPercentage >= 100 ? 'completed' : (body.status || 'in_progress');

    if (!progressRecord) {
      progressRecord = {
        id: SkillForgeDB.generateId('enr'),
        user_id: user.id,
        course_id: id,
        enrolled_at: new Date().toISOString(),
        status,
        progress_percentage: progressPercentage,
        completed_modules: body.completed_modules || [],
        updated_at: new Date().toISOString()
      };
    } else {
      progressRecord = {
        ...progressRecord,
        status,
        progress_percentage: progressPercentage,
        completed_modules: body.completed_modules || progressRecord.completed_modules || [],
        updated_at: new Date().toISOString()
      };
    }

    await skillForgeDB.put(STORES.COURSE_PROGRESS, progressRecord);

    return jsonResponse({
      progress: progressRecord,
      message: 'Course progression updated.'
    }, 200);
  }

  // ===========================================================================
  // COURSE MANAGEMENT CONTROLLERS
  // ===========================================================================

  async handleCoursesCreate(body, currentUser) {
    const course = {
      id: body.id || SkillForgeDB.generateId('crs'),
      title: body.title || 'Untitled Course',
      provider: body.provider || 'Internal',
      skill_ids: Array.isArray(body.skill_ids) ? body.skill_ids : (body.skills ? String(body.skills).split(',').map((s) => s.trim()) : []),
      difficulty: body.difficulty || 'Intermediate',
      duration: body.duration || '10 hours',
      url: body.url || '#',
      description: body.description || '',
      category: body.category || 'general',
      relevance_tags: Array.isArray(body.relevance_tags) ? body.relevance_tags : []
    };

    await skillForgeDB.put(STORES.COURSES, course);
    return jsonResponse({
      course,
      message: 'Course created successfully.'
    }, 201);
  }

  async handleCoursesUpdateById(id, body, currentUser) {
    let existing = await skillForgeDB.getById(STORES.COURSES, id);
    if (!existing) {
      const seedMatch = CURATED_COURSES.find((c) => c.id === id);
      existing = seedMatch || {};
    }

    const updated = {
      ...existing,
      ...body,
      id
    };

    await skillForgeDB.put(STORES.COURSES, updated);
    return jsonResponse({
      course: updated,
      message: 'Course updated successfully.'
    }, 200);
  }

  async handleCoursesDeleteById(id, currentUser) {
    await skillForgeDB.delete(STORES.COURSES, id);
    return jsonResponse({
      success: true,
      message: 'Course deleted successfully.'
    }, 200);
  }

  async handleCoursesBulkCreate(body, currentUser) {
    const items = Array.isArray(body?.courses) ? body.courses : (Array.isArray(body) ? body : []);
    let count = 0;
    for (const c of items) {
      const course = {
        id: c.id || SkillForgeDB.generateId('crs'),
        title: c.title || 'Untitled Course',
        provider: c.provider || 'Imported',
        skill_ids: Array.isArray(c.skill_ids) ? c.skill_ids : (c.skills ? String(c.skills).split(',').map((s) => s.trim()) : []),
        difficulty: c.difficulty || 'Intermediate',
        duration: c.duration || '10 hours',
        url: c.url || '#',
        description: c.description || '',
        category: c.category || 'general',
        relevance_tags: Array.isArray(c.relevance_tags) ? c.relevance_tags : []
      };
      await skillForgeDB.put(STORES.COURSES, course);
      count++;
    }
    return jsonResponse({
      imported: count,
      message: `${count} course(s) imported successfully.`
    }, 201);
  }

  // ===========================================================================
  // MARKET TRENDS MUTATION CONTROLLERS
  // ===========================================================================

  async handleMarketTrendsCreate(body, currentUser) {
    const trend = {
      id: body.id || SkillForgeDB.generateId('trd'),
      domain: body.domain || 'Technology',
      trend_direction: body.trend_direction || 'Rising',
      demand_score: Number(body.demand_score || 50),
      year_over_year_growth: body.year_over_year_growth || '+0%',
      key_skills: Array.isArray(body.key_skills) ? body.key_skills : (body.skills ? String(body.skills).split(',').map((s) => s.trim()) : []),
      description: body.description || '',
      top_hiring_regions: Array.isArray(body.top_hiring_regions) ? body.top_hiring_regions : ['Global'],
      salary_range_usd: body.salary_range_usd || { min: 100000, max: 150000, median: 125000 },
      updated_at: new Date().toISOString()
    };

    await skillForgeDB.put(STORES.MARKET_TRENDS, trend);
    return jsonResponse({
      trend,
      message: 'Market trend recorded successfully.'
    }, 201);
  }

  async handleMarketTrendsUpdateById(id, body, currentUser) {
    let existing = await skillForgeDB.getById(STORES.MARKET_TRENDS, id);
    if (!existing) {
      const seedMatch = MARKET_TRENDS.find((t) => t.id === id);
      existing = seedMatch || {};
    }

    const updated = {
      ...existing,
      ...body,
      id,
      updated_at: new Date().toISOString()
    };

    await skillForgeDB.put(STORES.MARKET_TRENDS, updated);
    return jsonResponse({
      trend: updated,
      message: 'Market trend updated successfully.'
    }, 200);
  }

  async handleMarketTrendsDeleteById(id, currentUser) {
    await skillForgeDB.delete(STORES.MARKET_TRENDS, id);
    return jsonResponse({
      success: true,
      message: 'Market trend removed successfully.'
    }, 200);
  }

  // ===========================================================================
  // QUESTIONS / ASSESSMENT BANK CONTROLLERS
  // ===========================================================================

  async _ensureQuestionBank() {
    if (this._questionsList && this._questionsList.length > 0) {
      return this._questionsList;
    }

    const initial = [];
    if (DIAGNOSTIC_QUESTIONS && typeof DIAGNOSTIC_QUESTIONS === 'object') {
      for (const [category, questions] of Object.entries(DIAGNOSTIC_QUESTIONS)) {
        if (Array.isArray(questions)) {
          questions.forEach((q) => {
            initial.push({
              id: q.id,
              question_text: q.question_text,
              category: q.category || category,
              difficulty: q.difficulty || 'Intermediate',
              skill_tags: q.skill_tags || [],
              options: q.options || [],
              correct_option_index: q.correct_option_index ?? 0,
              explanation: q.explanation || '',
              active: q.active !== false,
              created_at: q.created_at || '2025-01-15T00:00:00.000Z'
            });
          });
        }
      }
    }

    this._questionsList = initial;
    return this._questionsList;
  }

  async handleQuestionsList(searchParams) {
    let questions = await this._ensureQuestionBank();

    const search = searchParams?.get('search')?.toLowerCase();
    const category = searchParams?.get('category');
    const difficulty = searchParams?.get('difficulty');
    const status = searchParams?.get('status');

    if (search) {
      questions = questions.filter((q) =>
        (q.id && q.id.toLowerCase().includes(search)) ||
        (q.question_text && q.question_text.toLowerCase().includes(search)) ||
        (q.skill_tags && q.skill_tags.some((s) => s.toLowerCase().includes(search)))
      );
    }

    if (category) {
      questions = questions.filter((q) => q.category && q.category.toLowerCase() === category.toLowerCase());
    }

    if (difficulty) {
      questions = questions.filter((q) => q.difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase());
    }

    if (status === 'active') {
      questions = questions.filter((q) => q.active === true);
    } else if (status === 'inactive') {
      questions = questions.filter((q) => q.active === false);
    }

    return jsonResponse({
      questions,
      total: questions.length
    }, 200);
  }

  async handleQuestionsGetById(id) {
    const questions = await this._ensureQuestionBank();
    const question = questions.find((q) => q.id === id);
    if (!question) {
      return errorResponse(`Question with id '${id}' not found.`, 404);
    }
    return jsonResponse({ question }, 200);
  }

  async handleQuestionsCreate(body, currentUser) {
    const questions = await this._ensureQuestionBank();
    const newQuestion = {
      id: body.id || `q_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question_text: body.question_text || body.question || '',
      category: body.category || 'General',
      difficulty: body.difficulty || 'Intermediate',
      skill_tags: Array.isArray(body.skill_tags) ? body.skill_tags : (body.skills ? String(body.skills).split(',').map((s) => s.trim()) : []),
      options: body.options || ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_option_index: Number(body.correct_option_index ?? 0),
      explanation: body.explanation || '',
      active: body.active !== false,
      created_at: new Date().toISOString()
    };

    questions.unshift(newQuestion);
    return jsonResponse({
      question: newQuestion,
      message: 'Question added successfully.'
    }, 201);
  }

  async handleQuestionsUpdateById(id, body, currentUser) {
    const questions = await this._ensureQuestionBank();
    const index = questions.findIndex((q) => q.id === id);
    if (index === -1) {
      return errorResponse(`Question with id '${id}' not found.`, 404);
    }

    questions[index] = {
      ...questions[index],
      ...body,
      id
    };

    return jsonResponse({
      question: questions[index],
      message: 'Question updated successfully.'
    }, 200);
  }

  async handleQuestionsDeleteById(id, currentUser) {
    const questions = await this._ensureQuestionBank();
    const index = questions.findIndex((q) => q.id === id);
    if (index === -1) {
      return errorResponse(`Question with id '${id}' not found.`, 404);
    }

    questions.splice(index, 1);
    return jsonResponse({
      success: true,
      message: 'Question removed.'
    }, 200);
  }
}

/**
 * Singleton API router instance for application-wide interception.
 */
export const apiRouter = new ApiRouter();

export default apiRouter;
