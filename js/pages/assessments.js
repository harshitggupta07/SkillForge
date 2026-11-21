/**
 * SkillForge Assessment & Quiz Studio
 * Module: js/pages/assessments.js
 *
 * Implements two assessment tabs:
 * 1. Diagnostic Assessment: Configurable CV-calibrated and general engineering evaluations,
 *    question card proctoring, granular category/skill results, and historical records.
 * 2. Document Quiz Studio: Document upload (PDF, DOCX, TXT), technical concept extraction,
 *    custom MCQ synthesis, interactive test taking, and multi-format exports.
 *
 * Strictly adheres to SkillForge design guidelines:
 * - Color palette: White, Light Gray, Slate Gray, Dark Slate, Deep Navy, Muted Forest Green, Slate Blue, Amber, Error Red.
 * - Zero emojis, zero em dashes, max 150ms transitions, border-radius 4px/6px.
 */

import { apiRouter } from '../../api/api-router.js';
import { CVParser } from '../../api/cv-parser.js';
import { ExportService } from '../../api/export-service.js';
import { getToken, getCurrentUser } from '../auth.js';

/**
 * Standard Design System Palette Constants.
 */
const PALETTE = Object.freeze({
  white: '#FFFFFF',
  lightGray: '#F5F6F8',
  slateGray: '#64748B',
  darkSlate: '#334155',
  deepNavy: '#1E293B',
  forestGreen: '#2D6A4F',
  forestGreenLight: '#E8F5E9',
  forestGreenBorder: '#A3D9C9',
  slateBlue: '#3B82F6',
  slateBlueLight: '#EFF6FF',
  slateBlueBorder: '#BFDBFE',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  amberBorder: '#FDE68A',
  errorRed: '#DC2626',
  errorRedLight: '#FEE2E2',
  errorRedBorder: '#FECACA',
  borderColor: '#CBD5E1',
  borderLight: '#E2E8F0'
});

/**
 * Technical Assessment Categories.
 */
const ASSESSMENT_CATEGORIES = [
  'Programming Fundamentals',
  'Frontend Development',
  'Backend Development',
  'Cloud and DevOps',
  'Data and ML',
  'AI and LLM',
  'System Design',
  'Security'
];

/**
 * Standard Role Benchmark Profiles.
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
 * Application State Container.
 */
const state = {
  activeTab: 'diagnostic', // 'diagnostic' | 'quiz-studio'
  user: null,

  // Tab 1: Diagnostic Assessment State
  diagnostic: {
    view: 'config', // 'config' | 'taking' | 'results'
    targetRole: 'Senior Backend Dev',
    questionCount: 20,
    mode: 'CV-Calibrated', // 'CV-Calibrated' | 'General'
    focusAreas: [...ASSESSMENT_CATEGORIES],
    currentAssessment: null,
    currentQuestionIndex: 0,
    selectedOption: null,
    isSubmitted: false,
    userAnswers: {}, // questionId -> optionIndex
    submissionResult: null,
    history: [],
    loading: false,
    errorMessage: ''
  },

  // Tab 2: Document Quiz Studio State
  quizStudio: {
    view: 'config', // 'config' | 'taking' | 'results'
    file: null,
    fileName: '',
    fileSize: 0,
    fileType: '',
    extractedText: '',
    questionCount: 10,
    difficulty: 'Intermediate', // 'Basic' | 'Intermediate' | 'Advanced' | 'Mixed'
    focusTopic: '',
    currentQuiz: null,
    currentQuestionIndex: 0,
    selectedOption: null,
    isSubmitted: false,
    userAnswers: {}, // questionId -> optionIndex
    submissionResult: null,
    loading: false,
    errorMessage: ''
  }
};

/**
 * Injects required stylesheet rules into document head.
 */
function injectStyles() {
  const styleId = 'skillforge-assessments-styles';
  if (document.getElementById(styleId)) {
    return;
  }

  const styleEl = document.createElement('style');
  styleEl.id = styleId;
  styleEl.textContent = `
    .sf-container {
      max-width: 1120px;
      margin: 0 auto;
      padding: 24px 16px 48px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: ${PALETTE.deepNavy};
      line-height: 1.5;
    }

    .sf-header {
      margin-bottom: 24px;
      border-bottom: 1px solid ${PALETTE.borderLight};
      padding-bottom: 16px;
    }

    .sf-header h1 {
      font-size: 24px;
      font-weight: 700;
      color: ${PALETTE.deepNavy};
      letter-spacing: -0.01em;
      margin: 0 0 6px 0;
    }

    .sf-header p {
      font-size: 14px;
      color: ${PALETTE.slateGray};
      margin: 0;
    }

    /* Tabs Navigation */
    .sf-tab-bar {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid ${PALETTE.borderColor};
      margin-bottom: 24px;
    }

    .sf-tab-btn {
      background: none;
      border: none;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      color: ${PALETTE.slateGray};
      cursor: pointer;
      border-bottom: 2px solid transparent;
      border-radius: 4px 4px 0 0;
      transition: color 120ms ease, border-color 120ms ease, background-color 120ms ease;
    }

    .sf-tab-btn:hover {
      color: ${PALETTE.deepNavy};
      background-color: ${PALETTE.lightGray};
    }

    .sf-tab-btn.active {
      color: ${PALETTE.deepNavy};
      border-bottom-color: ${PALETTE.slateBlue};
      background-color: ${PALETTE.white};
    }

    /* Panels & Cards */
    .sf-panel {
      background: ${PALETTE.white};
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 6px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .sf-panel-title {
      font-size: 18px;
      font-weight: 700;
      color: ${PALETTE.deepNavy};
      margin: 0 0 4px 0;
    }

    .sf-panel-subtitle {
      font-size: 13px;
      color: ${PALETTE.slateGray};
      margin: 0 0 20px 0;
    }

    /* Form Grid */
    .sf-form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .sf-field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sf-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: ${PALETTE.darkSlate};
    }

    .sf-sublabel {
      font-size: 12px;
      color: ${PALETTE.slateGray};
      margin-top: -2px;
    }

    .sf-input, .sf-select {
      background: ${PALETTE.white};
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 4px;
      padding: 9px 12px;
      font-size: 14px;
      color: ${PALETTE.deepNavy};
      transition: border-color 120ms ease;
    }

    .sf-input:focus, .sf-select:focus {
      outline: none;
      border-color: ${PALETTE.slateBlue};
    }

    /* Checkbox Grid */
    .sf-checkbox-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .sf-checkbox-actions {
      display: flex;
      gap: 8px;
    }

    .sf-btn-link {
      background: none;
      border: none;
      padding: 0;
      color: ${PALETTE.slateBlue};
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
    }

    .sf-btn-link:hover {
      color: ${PALETTE.deepNavy};
    }

    .sf-checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 10px;
      background: ${PALETTE.lightGray};
      border: 1px solid ${PALETTE.borderLight};
      border-radius: 4px;
      padding: 14px;
    }

    .sf-checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: ${PALETTE.darkSlate};
      cursor: pointer;
    }

    .sf-checkbox-item input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: ${PALETTE.slateBlue};
      cursor: pointer;
    }

    /* Radio Group */
    .sf-radio-group {
      display: flex;
      gap: 16px;
      background: ${PALETTE.lightGray};
      border: 1px solid ${PALETTE.borderLight};
      border-radius: 4px;
      padding: 10px 14px;
    }

    .sf-radio-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: ${PALETTE.darkSlate};
      cursor: pointer;
    }

    .sf-radio-item input[type="radio"] {
      width: 16px;
      height: 16px;
      accent-color: ${PALETTE.slateBlue};
      cursor: pointer;
    }

    /* Buttons */
    .sf-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 4px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: background-color 120ms ease, opacity 120ms ease;
    }

    .sf-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sf-btn-primary {
      background: ${PALETTE.deepNavy};
      color: ${PALETTE.white};
    }

    .sf-btn-primary:hover:not(:disabled) {
      background: ${PALETTE.darkSlate};
    }

    .sf-btn-accent {
      background: ${PALETTE.slateBlue};
      color: ${PALETTE.white};
    }

    .sf-btn-accent:hover:not(:disabled) {
      background: #2563EB;
    }

    .sf-btn-outline {
      background: ${PALETTE.white};
      border-color: ${PALETTE.borderColor};
      color: ${PALETTE.darkSlate};
    }

    .sf-btn-outline:hover:not(:disabled) {
      background: ${PALETTE.lightGray};
      color: ${PALETTE.deepNavy};
    }

    .sf-btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 4px;
    }

    /* Alert / Error Box */
    .sf-alert-error {
      background: ${PALETTE.errorRedLight};
      border: 1px solid ${PALETTE.errorRedBorder};
      color: ${PALETTE.errorRed};
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 13px;
      margin-bottom: 16px;
    }

    /* Test Taking View */
    .sf-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: ${PALETTE.slateGray};
    }

    .sf-progress-bar-track {
      width: 100%;
      height: 6px;
      background: ${PALETTE.borderLight};
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 24px;
    }

    .sf-progress-bar-fill {
      height: 100%;
      background: ${PALETTE.slateBlue};
      border-radius: 4px;
      transition: width 150ms ease;
    }

    .sf-question-card {
      background: ${PALETTE.white};
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 6px;
      padding: 24px;
      margin-bottom: 20px;
    }

    .sf-question-meta {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .sf-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .sf-badge-neutral {
      background: ${PALETTE.lightGray};
      color: ${PALETTE.darkSlate};
      border: 1px solid ${PALETTE.borderLight};
    }

    .sf-badge-success {
      background: ${PALETTE.forestGreenLight};
      color: ${PALETTE.forestGreen};
      border: 1px solid ${PALETTE.forestGreenBorder};
    }

    .sf-badge-warning {
      background: ${PALETTE.amberLight};
      color: ${PALETTE.amber};
      border: 1px solid ${PALETTE.amberBorder};
    }

    .sf-badge-error {
      background: ${PALETTE.errorRedLight};
      color: ${PALETTE.errorRed};
      border: 1px solid ${PALETTE.errorRedBorder};
    }

    .sf-badge-accent {
      background: ${PALETTE.slateBlueLight};
      color: ${PALETTE.slateBlue};
      border: 1px solid ${PALETTE.slateBlueBorder};
    }

    .sf-question-text {
      font-size: 16px;
      font-weight: 600;
      color: ${PALETTE.deepNavy};
      margin: 0 0 20px 0;
      line-height: 1.5;
    }

    /* Option Cards */
    .sf-options-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 24px;
    }

    .sf-option-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 16px;
      background: ${PALETTE.white};
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 4px;
      cursor: pointer;
      transition: border-color 120ms ease, background-color 120ms ease;
    }

    .sf-option-card:hover:not(.disabled) {
      border-color: ${PALETTE.slateBlue};
      background-color: #F8FAFC;
    }

    .sf-option-card.selected {
      border-color: ${PALETTE.slateBlue};
      background-color: ${PALETTE.slateBlueLight};
      border-width: 2px;
      padding: 13px 15px;
    }

    .sf-option-card.correct {
      border-color: ${PALETTE.forestGreen};
      background-color: ${PALETTE.forestGreenLight};
      border-width: 2px;
      padding: 13px 15px;
    }

    .sf-option-card.incorrect {
      border-color: ${PALETTE.errorRed};
      background-color: ${PALETTE.errorRedLight};
      border-width: 2px;
      padding: 13px 15px;
    }

    .sf-option-card.disabled {
      cursor: default;
    }

    .sf-option-letter {
      min-width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${PALETTE.lightGray};
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      color: ${PALETTE.darkSlate};
    }

    .sf-option-card.selected .sf-option-letter {
      background: ${PALETTE.slateBlue};
      border-color: ${PALETTE.slateBlue};
      color: ${PALETTE.white};
    }

    .sf-option-card.correct .sf-option-letter {
      background: ${PALETTE.forestGreen};
      border-color: ${PALETTE.forestGreen};
      color: ${PALETTE.white};
    }

    .sf-option-card.incorrect .sf-option-letter {
      background: ${PALETTE.errorRed};
      border-color: ${PALETTE.errorRed};
      color: ${PALETTE.white};
    }

    .sf-option-body {
      flex: 1;
      font-size: 14px;
      color: ${PALETTE.deepNavy};
      line-height: 1.45;
    }

    /* Explanation & Feedback Callouts */
    .sf-feedback-banner {
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sf-feedback-banner.correct {
      background: ${PALETTE.forestGreenLight};
      border: 1px solid ${PALETTE.forestGreenBorder};
      color: ${PALETTE.forestGreen};
    }

    .sf-feedback-banner.incorrect {
      background: ${PALETTE.errorRedLight};
      border: 1px solid ${PALETTE.errorRedBorder};
      color: ${PALETTE.errorRed};
    }

    .sf-explanation-box {
      background: ${PALETTE.lightGray};
      border-left: 4px solid ${PALETTE.slateBlue};
      border-top: 1px solid ${PALETTE.borderLight};
      border-right: 1px solid ${PALETTE.borderLight};
      border-bottom: 1px solid ${PALETTE.borderLight};
      border-radius: 4px;
      padding: 14px 16px;
      margin-bottom: 20px;
    }

    .sf-explanation-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: ${PALETTE.darkSlate};
      margin: 0 0 6px 0;
    }

    .sf-explanation-text {
      font-size: 13px;
      color: ${PALETTE.deepNavy};
      margin: 0;
      line-height: 1.5;
    }

    .sf-citation-box {
      background: #F1F5F9;
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 4px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 12px;
      color: ${PALETTE.darkSlate};
    }

    .sf-citation-label {
      font-weight: 700;
      color: ${PALETTE.deepNavy};
    }

    .sf-action-row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    /* Results Dashboard */
    .sf-results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .sf-stat-card {
      background: ${PALETTE.lightGray};
      border: 1px solid ${PALETTE.borderLight};
      border-radius: 4px;
      padding: 18px;
      text-align: center;
    }

    .sf-stat-value {
      font-size: 32px;
      font-weight: 700;
      color: ${PALETTE.deepNavy};
      line-height: 1;
      margin-bottom: 6px;
    }

    .sf-stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: ${PALETTE.slateGray};
    }

    /* Tables */
    .sf-table-wrapper {
      overflow-x: auto;
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 4px;
      margin-bottom: 24px;
    }

    .sf-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    .sf-table th {
      background: ${PALETTE.lightGray};
      color: ${PALETTE.darkSlate};
      font-weight: 700;
      padding: 10px 14px;
      border-bottom: 1px solid ${PALETTE.borderColor};
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.03em;
    }

    .sf-table td {
      padding: 10px 14px;
      border-bottom: 1px solid ${PALETTE.borderLight};
      color: ${PALETTE.deepNavy};
    }

    .sf-table tr:last-child td {
      border-bottom: none;
    }

    .sf-table tr:hover td {
      background: #F8FAFC;
    }

    /* Skills Grid */
    .sf-skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .sf-skill-card {
      background: ${PALETTE.white};
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 4px;
      padding: 12px 14px;
    }

    .sf-skill-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .sf-skill-title {
      font-size: 13px;
      font-weight: 600;
      color: ${PALETTE.deepNavy};
    }

    .sf-skill-ratio {
      font-size: 12px;
      color: ${PALETTE.slateGray};
    }

    /* Download Dropdown */
    .sf-dropdown {
      position: relative;
      display: inline-block;
    }

    .sf-dropdown-menu {
      display: none;
      position: absolute;
      right: 0;
      top: 100%;
      margin-top: 4px;
      background: ${PALETTE.white};
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 4px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      min-width: 160px;
      z-index: 50;
    }

    .sf-dropdown-menu.show {
      display: block;
    }

    .sf-dropdown-item {
      display: block;
      width: 100%;
      padding: 8px 14px;
      text-align: left;
      font-size: 13px;
      color: ${PALETTE.darkSlate};
      background: none;
      border: none;
      cursor: pointer;
      transition: background-color 120ms ease;
    }

    .sf-dropdown-item:hover {
      background-color: ${PALETTE.lightGray};
      color: ${PALETTE.deepNavy};
    }

    /* Drag & Drop Zone */
    .sf-dropzone {
      border: 2px dashed ${PALETTE.borderColor};
      background: #F8FAFC;
      border-radius: 6px;
      padding: 36px 20px;
      text-align: center;
      cursor: pointer;
      transition: border-color 120ms ease, background-color 120ms ease;
      margin-bottom: 16px;
    }

    .sf-dropzone:hover, .sf-dropzone.dragover {
      border-color: ${PALETTE.slateBlue};
      background-color: ${PALETTE.slateBlueLight};
    }

    .sf-dropzone-icon {
      margin-bottom: 10px;
      color: ${PALETTE.slateGray};
    }

    .sf-dropzone-title {
      font-size: 15px;
      font-weight: 600;
      color: ${PALETTE.deepNavy};
      margin: 0 0 4px 0;
    }

    .sf-dropzone-desc {
      font-size: 12px;
      color: ${PALETTE.slateGray};
      margin: 0;
    }

    .sf-file-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: ${PALETTE.white};
      border: 1px solid ${PALETTE.borderColor};
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }

    .sf-file-details {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sf-file-name {
      font-size: 13px;
      font-weight: 600;
      color: ${PALETTE.deepNavy};
    }

    .sf-file-meta {
      font-size: 12px;
      color: ${PALETTE.slateGray};
    }

    /* Modal */
    .sf-modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(30, 41, 59, 0.6);
      z-index: 100;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .sf-modal-overlay.show {
      display: flex;
    }

    .sf-modal-card {
      background: ${PALETTE.white};
      border-radius: 6px;
      border: 1px solid ${PALETTE.borderColor};
      max-width: 800px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .sf-modal-header {
      padding: 18px 24px;
      border-bottom: 1px solid ${PALETTE.borderColor};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sf-modal-header h3 {
      font-size: 18px;
      font-weight: 700;
      color: ${PALETTE.deepNavy};
      margin: 0;
    }

    .sf-modal-close {
      background: none;
      border: none;
      font-size: 20px;
      color: ${PALETTE.slateGray};
      cursor: pointer;
      line-height: 1;
    }

    .sf-modal-close:hover {
      color: ${PALETTE.deepNavy};
    }

    .sf-modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }

    .sf-modal-footer {
      padding: 14px 24px;
      border-top: 1px solid ${PALETTE.borderColor};
      display: flex;
      justify-content: flex-end;
      background: ${PALETTE.lightGray};
    }
  `;

  document.head.appendChild(styleEl);
}

/**
 * Formats ISO date string to human-readable format.
 * @param {string} isoString - ISO date representation.
 * @returns {string} Formatted date.
 */
function formatDate(isoString) {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hr = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yr}-${mo}-${day} ${hr}:${min}`;
  } catch {
    return String(isoString).substring(0, 16);
  }
}

/**
 * Returns authentication token from browser storage if present.
 * @returns {string|null} Authentication token.
 */
function getAuthToken() {
  try {
    const token = typeof getToken === 'function' ? getToken() : null;
    if (token) return token;
    return (
      sessionStorage.getItem('skillforge_token') ||
      localStorage.getItem('skillforge_token') ||
      sessionStorage.getItem('token') ||
      localStorage.getItem('token') ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Renders the primary HTML shell into the target container.
 * @param {HTMLElement} container - DOM container element.
 */
export function render(container) {
  if (!container) return;

  injectStyles();

  container.innerHTML = `
    <div class="sf-container">
      <header class="sf-header">
        <h1>Assessments and Quiz Studio</h1>
        <p>Technical diagnostic evaluations and custom document-based assessment studio.</p>
      </header>

      <!-- Navigation Tabs -->
      <nav class="sf-tab-bar" aria-label="Assessment Navigation">
        <button id="tab-btn-diagnostic" class="sf-tab-btn active" type="button">
          Diagnostic Assessment
        </button>
        <button id="tab-btn-quiz" class="sf-tab-btn" type="button">
          Document Quiz Studio
        </button>
      </nav>

      <!-- Global Alert Container -->
      <div id="sf-global-alert" style="display: none;"></div>

      <!-- TAB 1: Diagnostic Assessment Panel -->
      <div id="tab-panel-diagnostic">
        <!-- 1. Config View -->
        <div id="diag-config-view">
          <div class="sf-panel">
            <h2 class="sf-panel-title">Diagnostic Assessment Configuration</h2>
            <p class="sf-panel-subtitle">Configure evaluation parameters to generate a targeted technical assessment.</p>

            <form id="diag-config-form">
              <div class="sf-form-grid">
                <!-- Target Role -->
                <div class="sf-field-group">
                  <label class="sf-label" for="diag-target-role">Target Role</label>
                  <select id="diag-target-role" class="sf-select">
                    ${BENCHMARK_ROLES.map((r) => `<option value="${r}">${r}</option>`).join('')}
                  </select>
                  <span class="sf-sublabel" id="diag-role-source-hint">Benchmark role criteria</span>
                </div>

                <!-- Number of Questions -->
                <div class="sf-field-group">
                  <label class="sf-label" for="diag-question-count">Question Count</label>
                  <select id="diag-question-count" class="sf-select">
                    <option value="20" selected>20 Questions (Standard)</option>
                    <option value="30">30 Questions (Comprehensive)</option>
                    <option value="40">40 Questions (Deep Assessment)</option>
                  </select>
                </div>

                <!-- Evaluation Mode -->
                <div class="sf-field-group">
                  <label class="sf-label">Evaluation Mode</label>
                  <div class="sf-radio-group">
                    <label class="sf-radio-item">
                      <input type="radio" name="diag-mode" value="CV-Calibrated" checked />
                      <span>CV-Calibrated</span>
                    </label>
                    <label class="sf-radio-item">
                      <input type="radio" name="diag-mode" value="General" />
                      <span>General</span>
                    </label>
                  </div>
                  <span class="sf-sublabel">CV mode prioritizes verification of candidate claimed skills.</span>
                </div>
              </div>

              <!-- Focus Areas -->
              <div class="sf-field-group" style="margin-bottom: 24px;">
                <div class="sf-checkbox-header">
                  <span class="sf-label">Focus Areas</span>
                  <div class="sf-checkbox-actions">
                    <button type="button" id="diag-focus-all" class="sf-btn-link">Select All</button>
                    <span>|</span>
                    <button type="button" id="diag-focus-clear" class="sf-btn-link">Clear</button>
                  </div>
                </div>
                <div class="sf-checkbox-grid" id="diag-focus-grid">
                  ${ASSESSMENT_CATEGORIES.map((cat, idx) => `
                    <label class="sf-checkbox-item">
                      <input type="checkbox" name="diag-focus" value="${cat}" id="diag-cat-${idx}" checked />
                      <span>${cat}</span>
                    </label>
                  `).join('')}
                </div>
              </div>

              <!-- Submit Button -->
              <div>
                <button type="submit" id="diag-generate-btn" class="sf-btn sf-btn-primary">
                  Generate Assessment
                </button>
              </div>
            </form>
          </div>

          <!-- History Table -->
          <div class="sf-panel">
            <h2 class="sf-panel-title">Assessment History</h2>
            <p class="sf-panel-subtitle">Past completed and pending diagnostic evaluations.</p>
            <div id="diag-history-table-container">
              <p style="font-size: 13px; color: ${PALETTE.slateGray};">Loading assessment history...</p>
            </div>
          </div>
        </div>

        <!-- 2. Test Taking View (Hidden initially) -->
        <div id="diag-taking-view" style="display: none;">
          <div class="sf-progress-header">
            <span id="diag-progress-label">Question 1 of 20</span>
            <span id="diag-progress-pct">0% Completed</span>
          </div>
          <div class="sf-progress-bar-track">
            <div id="diag-progress-fill" class="sf-progress-bar-fill" style="width: 0%;"></div>
          </div>

          <div id="diag-question-container"></div>
        </div>

        <!-- 3. Results View (Hidden initially) -->
        <div id="diag-results-view" style="display: none;"></div>
      </div>

      <!-- TAB 2: Document Quiz Studio Panel -->
      <div id="tab-panel-quiz-studio" style="display: none;">
        <!-- 1. Upload & Config View -->
        <div id="quiz-config-view">
          <div class="sf-panel">
            <h2 class="sf-panel-title">Document Quiz Studio</h2>
            <p class="sf-panel-subtitle">Upload technical documentation to automatically synthesize an evaluation quiz.</p>

            <form id="quiz-config-form">
              <!-- Upload Dropzone -->
              <div id="quiz-dropzone" class="sf-dropzone">
                <input type="file" id="quiz-file-input" accept=".pdf,.docx,.txt,text/plain" style="display: none;" />
                <div class="sf-dropzone-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <div class="sf-dropzone-title">Drag and drop document here, or click to browse</div>
                <div class="sf-dropzone-desc">Accepted formats: PDF (.pdf), Word (.docx), Plain Text (.txt)</div>
              </div>

              <!-- Uploaded File Info -->
              <div id="quiz-file-info" class="sf-file-info" style="display: none;">
                <div class="sf-file-details">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${PALETTE.darkSlate}" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  <div>
                    <div id="quiz-file-name" class="sf-file-name">filename.txt</div>
                    <div id="quiz-file-meta" class="sf-file-meta">0 KB, 0 characters</div>
                  </div>
                </div>
                <button type="button" id="quiz-remove-file" class="sf-btn sf-btn-outline sf-btn-sm">
                  Remove File
                </button>
              </div>

              <!-- Raw Text Paste Option -->
              <div class="sf-field-group" style="margin-bottom: 20px;">
                <label class="sf-label" for="quiz-raw-text">Or Paste Document Text Directly</label>
                <textarea id="quiz-raw-text" class="sf-input" rows="4" placeholder="Paste technical documentation or article content here..."></textarea>
              </div>

              <!-- Configuration Grid -->
              <div class="sf-form-grid">
                <!-- Question Count -->
                <div class="sf-field-group">
                  <label class="sf-label" for="quiz-question-count">Question Count</label>
                  <select id="quiz-question-count" class="sf-select">
                    <option value="5">5 Questions</option>
                    <option value="10" selected>10 Questions</option>
                    <option value="15">15 Questions</option>
                    <option value="20">20 Questions</option>
                  </select>
                </div>

                <!-- Difficulty -->
                <div class="sf-field-group">
                  <label class="sf-label" for="quiz-difficulty">Difficulty Tier</label>
                  <select id="quiz-difficulty" class="sf-select">
                    <option value="Basic">Basic</option>
                    <option value="Intermediate" selected>Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Mixed">Mixed (All Tiers)</option>
                  </select>
                </div>

                <!-- Focus Topic Input -->
                <div class="sf-field-group">
                  <label class="sf-label" for="quiz-focus-topic">Focus Topic</label>
                  <input type="text" id="quiz-focus-topic" class="sf-input" placeholder="e.g., PostgreSQL Indexing" />
                  <span class="sf-sublabel">Optional topic filter or assessment title.</span>
                </div>
              </div>

              <!-- Submit Button -->
              <div>
                <button type="submit" id="quiz-generate-btn" class="sf-btn sf-btn-primary">
                  Generate Quiz
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- 2. Quiz Taking View (Hidden initially) -->
        <div id="quiz-taking-view" style="display: none;">
          <div class="sf-progress-header">
            <span id="quiz-progress-label">Question 1 of 10</span>
            <span id="quiz-progress-pct">0% Completed</span>
          </div>
          <div class="sf-progress-bar-track">
            <div id="quiz-progress-fill" class="sf-progress-bar-fill" style="width: 0%;"></div>
          </div>

          <div id="quiz-question-container"></div>
        </div>

        <!-- 3. Quiz Results View (Hidden initially) -->
        <div id="quiz-results-view" style="display: none;"></div>
      </div>

      <!-- Report Modal for Detailed View -->
      <div id="sf-report-modal" class="sf-modal-overlay">
        <div class="sf-modal-card">
          <div class="sf-modal-header">
            <h3 id="sf-modal-title">Comprehensive Assessment Report</h3>
            <button type="button" id="sf-modal-close-btn" class="sf-modal-close" aria-label="Close modal">&times;</button>
          </div>
          <div id="sf-modal-body" class="sf-modal-body"></div>
          <div class="sf-modal-footer">
            <button type="button" id="sf-modal-dismiss-btn" class="sf-btn sf-btn-outline sf-btn-sm">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Initializes controller state, registers event listeners, and executes initial fetch routines.
 * @param {HTMLElement} container - Root DOM container.
 */
export async function init(container) {
  if (!container) return;

  // Ensure window.fetch API interceptor is installed
  if (apiRouter && typeof apiRouter.install === 'function') {
    apiRouter.install();
  }

  // Bind Tab Navigation
  const tabBtnDiagnostic = container.querySelector('#tab-btn-diagnostic');
  const tabBtnQuiz = container.querySelector('#tab-btn-quiz');
  const panelDiagnostic = container.querySelector('#tab-panel-diagnostic');
  const panelQuiz = container.querySelector('#tab-panel-quiz-studio');

  function switchTab(tab) {
    state.activeTab = tab;
    if (tab === 'diagnostic') {
      tabBtnDiagnostic.classList.add('active');
      tabBtnQuiz.classList.remove('active');
      panelDiagnostic.style.display = 'block';
      panelQuiz.style.display = 'none';
    } else {
      tabBtnDiagnostic.classList.remove('active');
      tabBtnQuiz.classList.add('active');
      panelDiagnostic.style.display = 'none';
      panelQuiz.style.display = 'block';
    }
  }

  tabBtnDiagnostic.addEventListener('click', () => switchTab('diagnostic'));
  tabBtnQuiz.addEventListener('click', () => switchTab('quiz-studio'));

  // Load User Data & Role
  await loadUserData(container);

  // Load Past Assessments History
  await loadAssessmentHistory(container);

  // Bind Diagnostic Configuration View
  initDiagnosticConfig(container);

  // Bind Document Quiz Studio View
  initQuizStudio(container);

  // Bind Report Modal Close Handlers
  const modal = container.querySelector('#sf-report-modal');
  const modalCloseBtn = container.querySelector('#sf-modal-close-btn');
  const modalDismissBtn = container.querySelector('#sf-modal-dismiss-btn');
  const closeModal = () => modal.classList.remove('show');

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalDismissBtn) modalDismissBtn.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}

/**
 * Loads authenticated user profile and defaults role select.
 * @param {HTMLElement} container - Root DOM container.
 */
async function loadUserData(container) {
  const token = getAuthToken();
  const roleSelect = container.querySelector('#diag-target-role');
  const roleHint = container.querySelector('#diag-role-source-hint');

  if (!token) {
    if (roleHint) roleHint.textContent = 'Default engineering benchmark criteria';
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      const data = await res.json();
      state.user = data.user;
      if (data.user?.target_role && roleSelect) {
        roleSelect.value = data.user.target_role;
        state.diagnostic.targetRole = data.user.target_role;
        if (roleHint) {
          roleHint.textContent = `Calibrated to your target role (${data.user.target_role})`;
        }
      }
    }
  } catch (err) {
    console.warn('User profile retrieval bypassed:', err.message);
  }
}

/**
 * Fetches and renders past diagnostic assessment history.
 * @param {HTMLElement} container - Root DOM container.
 */
async function loadAssessmentHistory(container) {
  const historyContainer = container.querySelector('#diag-history-table-container');
  if (!historyContainer) return;

  const token = getAuthToken();

  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch('/api/assessments', { headers });

    if (!res.ok) {
      historyContainer.innerHTML = `<p style="font-size: 13px; color: ${PALETTE.errorRed};">Failed to load past assessments.</p>`;
      return;
    }

    const data = await res.json();
    state.diagnostic.history = data.assessments || [];
    renderAssessmentHistory(container);
  } catch (err) {
    historyContainer.innerHTML = `<p style="font-size: 13px; color: ${PALETTE.slateGray};">No previous assessment history recorded.</p>`;
  }
}

/**
 * Renders the assessment history table.
 * @param {HTMLElement} container - Root DOM container.
 */
function renderAssessmentHistory(container) {
  const historyContainer = container.querySelector('#diag-history-table-container');
  if (!historyContainer) return;

  const history = state.diagnostic.history || [];

  if (history.length === 0) {
    historyContainer.innerHTML = `
      <p style="font-size: 13px; color: ${PALETTE.slateGray}; margin: 8px 0;">
        No previous assessments recorded. Configure and generate an assessment above to begin.
      </p>
    `;
    return;
  }

  const rowsHtml = history.map((item) => {
    const scoreText = item.score !== undefined
      ? `${item.percentage || 0}% (${item.score}/${item.total_points || item.total_questions || 0})`
      : 'Incomplete';

    const typeLabel = item.type || (item.mode === 'General' ? 'General' : 'CV-Calibrated');

    return `
      <tr>
        <td>${formatDate(item.created_at || item.completed_at)}</td>
        <td><span class="sf-badge sf-badge-neutral">${typeLabel}</span></td>
        <td><strong>${item.target_role || 'Engineering Role'}</strong></td>
        <td>
          <span class="sf-badge ${item.percentage >= 70 ? 'sf-badge-success' : 'sf-badge-warning'}">
            ${scoreText}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="sf-btn sf-btn-outline sf-btn-sm diag-hist-view-btn" data-id="${item.id}">
              Review
            </button>
            <button type="button" class="sf-btn sf-btn-outline sf-btn-sm diag-hist-csv-btn" data-id="${item.id}">
              CSV
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  historyContainer.innerHTML = `
    <div class="sf-table-wrapper">
      <table class="sf-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Target Role</th>
            <th>Score</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  // Attach history action listeners
  historyContainer.querySelectorAll('.diag-hist-view-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const assessmentId = btn.getAttribute('data-id');
      await loadPastAssessment(container, assessmentId);
    });
  });

  historyContainer.querySelectorAll('.diag-hist-csv-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const assessmentId = btn.getAttribute('data-id');
      await downloadAssessmentExport(assessmentId, 'csv');
    });
  });
}

/**
 * Loads a past assessment record into results review view.
 * @param {HTMLElement} container - Root DOM container.
 * @param {string} assessmentId - Primary ID of assessment.
 */
async function loadPastAssessment(container, assessmentId) {
  try {
    const res = await fetch(`/api/assessments/${assessmentId}`);
    if (!res.ok) throw new Error('Failed to load assessment details.');
    const data = await res.json();
    state.diagnostic.currentAssessment = data.assessment;
    state.diagnostic.submissionResult = data.assessment.results || {
      score_total: data.assessment.score || 0,
      total_questions: data.assessment.total_questions || data.assessment.questions?.length || 0,
      score_percentage: data.assessment.percentage || 0,
      category_breakdown: {},
      per_skill_scores: {},
      detailed_results: []
    };
    renderDiagnosticResults(container);
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

/**
 * Downloads assessment export data using API or ExportService.
 * @param {string} assessmentId - Target ID.
 * @param {string} format - 'csv' | 'json' | 'html'.
 */
async function downloadAssessmentExport(assessmentId, format = 'csv') {
  try {
    const res = await fetch(`/api/assessments/${assessmentId}/export?format=${format}`);
    if (!res.ok) throw new Error('Export request failed.');
  } catch (err) {
    console.error('Export download error:', err);
  }
}

// =============================================================================
// TAB 1: DIAGNOSTIC ASSESSMENT CONTROLLERS
// =============================================================================

/**
 * Initializes the Diagnostic Assessment configuration panel.
 * @param {HTMLElement} container - Root DOM container.
 */
function initDiagnosticConfig(container) {
  const form = container.querySelector('#diag-config-form');
  const roleSelect = container.querySelector('#diag-target-role');
  const countSelect = container.querySelector('#diag-question-count');
  const focusAllBtn = container.querySelector('#diag-focus-all');
  const focusClearBtn = container.querySelector('#diag-focus-clear');
  const generateBtn = container.querySelector('#diag-generate-btn');

  // Focus Area helper buttons
  if (focusAllBtn) {
    focusAllBtn.addEventListener('click', () => {
      container.querySelectorAll('input[name="diag-focus"]').forEach((cb) => { cb.checked = true; });
    });
  }

  if (focusClearBtn) {
    focusClearBtn.addEventListener('click', () => {
      container.querySelectorAll('input[name="diag-focus"]').forEach((cb) => { cb.checked = false; });
    });
  }

  // Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const targetRole = roleSelect ? roleSelect.value : state.diagnostic.targetRole;
      const questionCount = countSelect ? parseInt(countSelect.value, 10) : 20;

      const modeRadio = container.querySelector('input[name="diag-mode"]:checked');
      const mode = modeRadio ? modeRadio.value : 'CV-Calibrated';

      const checkedCategories = [];
      container.querySelectorAll('input[name="diag-focus"]:checked').forEach((cb) => {
        checkedCategories.push(cb.value);
      });

      if (checkedCategories.length === 0) {
        alert('Please select at least one focus area category.');
        return;
      }

      state.diagnostic.targetRole = targetRole;
      state.diagnostic.questionCount = questionCount;
      state.diagnostic.mode = mode;
      state.diagnostic.focusAreas = checkedCategories;

      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating Assessment...';

      try {
        const token = getAuthToken();
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        };

        const res = await fetch('/api/assessments/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            target_role: targetRole,
            num_questions: questionCount,
            question_count: questionCount,
            mode,
            focus_areas: checkedCategories
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to generate diagnostic assessment.');
        }

        const data = await res.json();
        if (!data || !data.assessment || !Array.isArray(data.assessment.questions) || data.assessment.questions.length === 0) {
          throw new Error('No assessment questions were returned. Please check the selected configuration.');
        }
        state.diagnostic.currentAssessment = data.assessment;
        state.diagnostic.currentQuestionIndex = 0;
        state.diagnostic.selectedOption = null;
        state.diagnostic.isSubmitted = false;
        state.diagnostic.userAnswers = {};

        startDiagnosticTaking(container);
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Assessment';
      }
    });
  }
}

/**
 * Transitions view into Diagnostic test-taking proctor interface.
 * @param {HTMLElement} container - Root DOM container.
 */
function startDiagnosticTaking(container) {
  const configView = container.querySelector('#diag-config-view');
  const takingView = container.querySelector('#diag-taking-view');
  const resultsView = container.querySelector('#diag-results-view');

  configView.style.display = 'none';
  resultsView.style.display = 'none';
  takingView.style.display = 'block';

  renderDiagnosticQuestion(container);
}

/**
 * Renders the active question in the Diagnostic proctor interface.
 * @param {HTMLElement} container - Root DOM container.
 */
function renderDiagnosticQuestion(container) {
  const assessment = state.diagnostic.currentAssessment;
  if (!assessment || !Array.isArray(assessment.questions) || assessment.questions.length === 0) return;

  const questions = assessment.questions;
  const index = state.diagnostic.currentQuestionIndex;
  const total = questions.length;
  const currentQ = questions[index];
  if (!currentQ) return;

  // Update Progress Bar
  const progressLabel = container.querySelector('#diag-progress-label');
  const progressPct = container.querySelector('#diag-progress-pct');
  const progressFill = container.querySelector('#diag-progress-fill');

  const pct = Math.round((index / total) * 100);
  if (progressLabel) progressLabel.textContent = `Question ${index + 1} of ${total}`;
  if (progressPct) progressPct.textContent = `${pct}% Completed`;
  if (progressFill) progressFill.style.width = `${pct}%`;

  const questionContainer = container.querySelector('#diag-question-container');
  if (!questionContainer) return;

  state.diagnostic.selectedOption = null;
  state.diagnostic.isSubmitted = false;

  const optionsHtml = (currentQ.options || []).map((opt, optIdx) => `
    <div class="sf-option-card" data-idx="${optIdx}">
      <span class="sf-option-letter">${String.fromCharCode(65 + optIdx)}</span>
      <div class="sf-option-body">${opt}</div>
    </div>
  `).join('');

  questionContainer.innerHTML = `
    <div class="sf-question-card">
      <div class="sf-question-meta">
        <span class="sf-badge sf-badge-neutral">${currentQ.category || 'General'}</span>
        <span class="sf-badge sf-badge-accent">${currentQ.difficulty || 'Intermediate'}</span>
      </div>
      <h3 class="sf-question-text">${currentQ.question_text}</h3>
      <div class="sf-options-list" id="diag-options-list">
        ${optionsHtml}
      </div>

      <div id="diag-feedback-area"></div>

      <div class="sf-action-row">
        <button type="button" id="diag-submit-answer-btn" class="sf-btn sf-btn-primary" disabled>
          Submit Answer
        </button>
        <button type="button" id="diag-next-question-btn" class="sf-btn sf-btn-accent" style="display: none;">
          ${index < total - 1 ? 'Next Question' : 'Complete Assessment'}
        </button>
      </div>
    </div>
  `;

  // Bind Option Card Selection
  const optionCards = questionContainer.querySelectorAll('.sf-option-card');
  const submitBtn = questionContainer.querySelector('#diag-submit-answer-btn');
  const nextBtn = questionContainer.querySelector('#diag-next-question-btn');
  const feedbackArea = questionContainer.querySelector('#diag-feedback-area');

  optionCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (state.diagnostic.isSubmitted) return;

      optionCards.forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      state.diagnostic.selectedOption = parseInt(card.getAttribute('data-idx'), 10);
      submitBtn.disabled = false;
    });
  });

  // Bind Submit Answer
  submitBtn.addEventListener('click', () => {
    if (state.diagnostic.selectedOption === null || state.diagnostic.isSubmitted) return;

    state.diagnostic.isSubmitted = true;
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'inline-flex';

    const selectedIdx = state.diagnostic.selectedOption;
    const correctIdx = currentQ.correct_option_index;
    const isCorrect = selectedIdx === correctIdx;

    // Record Answer
    state.diagnostic.userAnswers[currentQ.id] = selectedIdx;

    // Lock options and apply styling
    optionCards.forEach((card) => {
      card.classList.add('disabled');
      const idx = parseInt(card.getAttribute('data-idx'), 10);
      if (idx === correctIdx) {
        card.classList.add('correct');
      } else if (idx === selectedIdx && !isCorrect) {
        card.classList.add('incorrect');
      }
    });

    // Render Feedback & Explanation
    feedbackArea.innerHTML = `
      <div class="sf-feedback-banner ${isCorrect ? 'correct' : 'incorrect'}">
        <span>${isCorrect ? 'Correct response.' : `Incorrect response. Correct answer is option ${String.fromCharCode(65 + correctIdx)}.`}</span>
      </div>
      <div class="sf-explanation-box">
        <div class="sf-explanation-title">Technical Explanation</div>
        <p class="sf-explanation-text">${currentQ.explanation || 'Verification derived from standard technical reference.'}</p>
      </div>
    `;
  });

  // Bind Next Question
  nextBtn.addEventListener('click', async () => {
    if (state.diagnostic.currentQuestionIndex < total - 1) {
      state.diagnostic.currentQuestionIndex++;
      renderDiagnosticQuestion(container);
    } else {
      // Completed all questions, submit full assessment
      await completeDiagnosticAssessment(container);
    }
  });
}

/**
 * Finalizes assessment, submits responses, and transitions to results view.
 * @param {HTMLElement} container - Root DOM container.
 */
async function completeDiagnosticAssessment(container) {
  const assessment = state.diagnostic.currentAssessment;
  if (!assessment) return;

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  try {
    const res = await fetch(`/api/assessments/${assessment.id}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answers: state.diagnostic.userAnswers })
    });

    if (!res.ok) {
      throw new Error('Failed to evaluate assessment submission.');
    }

    const data = await res.json();
    state.diagnostic.currentAssessment = data.assessment;
    state.diagnostic.submissionResult = data.results || data.assessment.results;

    // Refresh history
    await loadAssessmentHistory(container);

    renderDiagnosticResults(container);
  } catch (err) {
    alert(`Submission error: ${err.message}`);
  }
}

/**
 * Renders the diagnostic results breakdown view.
 * @param {HTMLElement} container - Root DOM container.
 */
function renderDiagnosticResults(container) {
  const configView = container.querySelector('#diag-config-view');
  const takingView = container.querySelector('#diag-taking-view');
  const resultsView = container.querySelector('#diag-results-view');

  configView.style.display = 'none';
  takingView.style.display = 'none';
  resultsView.style.display = 'block';

  const assessment = state.diagnostic.currentAssessment;
  const results = state.diagnostic.submissionResult || {};

  const totalQuestions = results.total_questions || assessment.questions?.length || 0;
  const scoreTotal = results.score_total !== undefined ? results.score_total : (assessment.score || 0);
  const percentage = results.score_percentage !== undefined ? results.score_percentage : (assessment.percentage || 0);
  const passed = percentage >= 70;

  // Category Breakdown Table Rows
  const catBreakdown = results.category_breakdown || {};
  const catRowsHtml = Object.entries(catBreakdown).map(([cat, data]) => `
    <tr>
      <td><strong>${cat}</strong></td>
      <td>${data.total}</td>
      <td>${data.correct}</td>
      <td>
        <span class="sf-badge ${data.pct >= 70 ? 'sf-badge-success' : 'sf-badge-warning'}">
          ${data.pct}%
        </span>
      </td>
    </tr>
  `).join('');

  // Per Skill Breakdown Cards
  const skillScores = results.per_skill_scores || {};
  const skillCardsHtml = Object.entries(skillScores).map(([skill, data]) => `
    <div class="sf-skill-card">
      <div class="sf-skill-card-header">
        <span class="sf-skill-title">${skill.replace(/^skill_/, '').replace(/_/g, ' ').toUpperCase()}</span>
        <span class="sf-badge ${data.pct >= 70 ? 'sf-badge-success' : 'sf-badge-warning'}">${data.pct}%</span>
      </div>
      <div class="sf-skill-ratio">${data.correct} of ${data.total} correct</div>
    </div>
  `).join('');

  resultsView.innerHTML = `
    <div class="sf-panel">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div>
          <h2 class="sf-panel-title">Diagnostic Evaluation Results</h2>
          <p class="sf-panel-subtitle">Target Role: ${assessment.target_role || 'Engineering Role'} | Mode: ${assessment.type || assessment.mode || 'CV-Calibrated'}</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="diag-new-test-btn" class="sf-btn sf-btn-outline sf-btn-sm">
            Take Another Test
          </button>
          <div class="sf-dropdown" id="diag-download-dropdown">
            <button type="button" id="diag-download-toggle-btn" class="sf-btn sf-btn-primary sf-btn-sm">
              Download Report
            </button>
            <div class="sf-dropdown-menu" id="diag-download-menu">
              <button type="button" class="sf-dropdown-item" id="diag-dl-csv">Download CSV</button>
              <button type="button" class="sf-dropdown-item" id="diag-dl-json">Download JSON</button>
              <button type="button" class="sf-dropdown-item" id="diag-dl-print">Print Report</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="sf-results-grid">
        <div class="sf-stat-card">
          <div class="sf-stat-value">${scoreTotal} / ${totalQuestions}</div>
          <div class="sf-stat-label">Total Points</div>
        </div>
        <div class="sf-stat-card">
          <div class="sf-stat-value">${percentage}%</div>
          <div class="sf-stat-label">Overall Accuracy</div>
        </div>
        <div class="sf-stat-card">
          <div style="margin-bottom: 6px;">
            <span class="sf-badge ${passed ? 'sf-badge-success' : 'sf-badge-warning'}" style="font-size: 13px; padding: 6px 12px;">
              ${passed ? 'Benchmark Met' : 'Requires Review'}
            </span>
          </div>
          <div class="sf-stat-label">Outcome Assessment</div>
        </div>
      </div>

      <!-- Per-Category Performance Table -->
      <h3 style="font-size: 15px; font-weight: 700; color: ${PALETTE.deepNavy}; margin: 0 0 12px 0;">
        Category Breakdown
      </h3>
      <div class="sf-table-wrapper">
        <table class="sf-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Questions</th>
              <th>Correct</th>
              <th>Score%</th>
            </tr>
          </thead>
          <tbody>
            ${catRowsHtml || '<tr><td colspan="4" style="text-align:center;color:#64748B;">No category metrics recorded.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Per-Skill Competency Breakdown -->
      ${Object.keys(skillScores).length > 0 ? `
        <h3 style="font-size: 15px; font-weight: 700; color: ${PALETTE.deepNavy}; margin: 24px 0 12px 0;">
          Granular Skill Verification
        </h3>
        <div class="sf-skills-grid">
          ${skillCardsHtml}
        </div>
      ` : ''}

      <!-- View Full Report Link -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid ${PALETTE.borderLight}; display: flex; justify-content: space-between; align-items: center;">
        <button type="button" id="diag-view-full-report-btn" class="sf-btn-link" style="font-size: 14px;">
          View Full Itemized Report
        </button>
        <span style="font-size: 12px; color: ${PALETTE.slateGray};">
          Evaluation Reference: ${assessment.id}
        </span>
      </div>
    </div>
  `;

  // Bind Buttons
  container.querySelector('#diag-new-test-btn').addEventListener('click', () => {
    configView.style.display = 'block';
    takingView.style.display = 'none';
    resultsView.style.display = 'none';
  });

  // Dropdown Handling
  const dropdownToggle = container.querySelector('#diag-download-toggle-btn');
  const dropdownMenu = container.querySelector('#diag-download-menu');

  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });

  // Download Action Listeners
  container.querySelector('#diag-dl-csv').addEventListener('click', () => {
    downloadAssessmentExport(assessment.id, 'csv');
  });

  container.querySelector('#diag-dl-json').addEventListener('click', () => {
    downloadAssessmentExport(assessment.id, 'json');
  });

  container.querySelector('#diag-dl-print').addEventListener('click', () => {
    ExportService.exportAsPrintableHTML(assessment, `Diagnostic Assessment: ${assessment.target_role}`, `${assessment.id}_report.html`);
  });

  // View Full Report Modal Trigger
  container.querySelector('#diag-view-full-report-btn').addEventListener('click', () => {
    openFullReportModal(container, assessment, results);
  });
}

/**
 * Displays full itemized question report in the modal view.
 * @param {HTMLElement} container - Root DOM container.
 * @param {object} assessment - Assessment record.
 * @param {object} results - Evaluation results.
 */
function openFullReportModal(container, assessment, results) {
  const modal = container.querySelector('#sf-report-modal');
  const modalTitle = container.querySelector('#sf-modal-title');
  const modalBody = container.querySelector('#sf-modal-body');

  modalTitle.textContent = `Full Assessment Report: ${assessment.target_role || 'Diagnostic'}`;

  const questions = assessment.questions || [];
  const detailed = results.detailed_results || [];

  const itemsHtml = questions.map((q, idx) => {
    const detail = detailed.find((d) => d.question_id === q.id) || {};
    const userAnsIdx = detail.user_answer_index ?? state.diagnostic.userAnswers[q.id];
    const isCorrect = userAnsIdx !== undefined && Number(userAnsIdx) === Number(q.correct_option_index);

    return `
      <div style="border-bottom: 1px solid ${PALETTE.borderLight}; padding-bottom: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: ${PALETTE.slateGray};">QUESTION ${idx + 1} (${q.category || 'General'})</span>
          <span class="sf-badge ${isCorrect ? 'sf-badge-success' : 'sf-badge-error'}">${isCorrect ? 'Correct' : 'Incorrect'}</span>
        </div>
        <p style="font-size: 14px; font-weight: 600; color: ${PALETTE.deepNavy}; margin-bottom: 10px;">${q.question_text}</p>
        <div style="font-size: 13px; color: ${PALETTE.darkSlate}; margin-bottom: 8px;">
          <div><strong>Your Answer:</strong> ${userAnsIdx !== undefined && q.options[userAnsIdx] ? q.options[userAnsIdx] : 'Unanswered'}</div>
          <div><strong>Correct Answer:</strong> ${q.options[q.correct_option_index] || 'N/A'}</div>
        </div>
        <div style="background: ${PALETTE.lightGray}; border-left: 3px solid ${PALETTE.slateBlue}; padding: 8px 12px; font-size: 12px; border-radius: 4px;">
          <strong>Explanation:</strong> ${q.explanation || 'Direct curriculum reference.'}
        </div>
      </div>
    `;
  }).join('');

  modalBody.innerHTML = `
    <div style="margin-bottom: 20px;">
      <div style="font-size: 13px; color: ${PALETTE.slateGray}; margin-bottom: 4px;">Assessment ID: ${assessment.id}</div>
      <div style="font-size: 15px; font-weight: 600; color: ${PALETTE.deepNavy};">
        Score: ${results.score_total ?? assessment.score ?? 0} / ${results.total_questions ?? questions.length} (${results.score_percentage ?? assessment.percentage ?? 0}%)
      </div>
    </div>
    ${itemsHtml}
  `;

  modal.classList.add('show');
}

// =============================================================================
// TAB 2: DOCUMENT QUIZ STUDIO CONTROLLERS
// =============================================================================

/**
 * Initializes the Document Quiz Studio tab.
 * @param {HTMLElement} container - Root DOM container.
 */
function initQuizStudio(container) {
  const form = container.querySelector('#quiz-config-form');
  const dropzone = container.querySelector('#quiz-dropzone');
  const fileInput = container.querySelector('#quiz-file-input');
  const fileInfo = container.querySelector('#quiz-file-info');
  const fileNameDisplay = container.querySelector('#quiz-file-name');
  const fileMetaDisplay = container.querySelector('#quiz-file-meta');
  const removeFileBtn = container.querySelector('#quiz-remove-file');
  const rawTextArea = container.querySelector('#quiz-raw-text');
  const generateBtn = container.querySelector('#quiz-generate-btn');

  // Drag and drop event handlers
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await processUploadedFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files.length > 0) {
        await processUploadedFile(fileInput.files[0]);
      }
    });
  }

  // File parsing processor
  async function processUploadedFile(file) {
    state.quizStudio.file = file;
    state.quizStudio.fileName = file.name;
    state.quizStudio.fileSize = file.size;
    state.quizStudio.fileType = file.type || file.name.split('.').pop();

    try {
      const extracted = await CVParser.extractText(file);
      state.quizStudio.extractedText = extracted;

      const sizeKb = Math.round(file.size / 1024);
      const charCount = extracted.length;

      if (fileNameDisplay) fileNameDisplay.textContent = file.name;
      if (fileMetaDisplay) fileMetaDisplay.textContent = `${sizeKb} KB, ${charCount} characters extracted`;
      if (fileInfo) fileInfo.style.display = 'flex';
      if (dropzone) dropzone.style.display = 'none';

      // Auto-populate raw text area as preview
      if (rawTextArea && !rawTextArea.value) {
        rawTextArea.value = extracted.substring(0, 1000) + (extracted.length > 1000 ? '...' : '');
      }
    } catch (err) {
      alert(`Error reading file '${file.name}': ${err.message}`);
    }
  }

  // Remove File Button
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      state.quizStudio.file = null;
      state.quizStudio.fileName = '';
      state.quizStudio.extractedText = '';
      if (fileInput) fileInput.value = '';
      if (fileInfo) fileInfo.style.display = 'none';
      if (dropzone) dropzone.style.display = 'block';
      if (rawTextArea) rawTextArea.value = '';
    });
  }

  // Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const textSource = state.quizStudio.extractedText || (rawTextArea ? rawTextArea.value.trim() : '');
      if (!textSource) {
        alert('Please upload a document (.pdf, .docx, .txt) or paste technical documentation text.');
        return;
      }

      const countSelect = container.querySelector('#quiz-question-count');
      const diffSelect = container.querySelector('#quiz-difficulty');
      const topicInput = container.querySelector('#quiz-focus-topic');

      const questionCount = countSelect ? parseInt(countSelect.value, 10) : 10;
      const difficulty = diffSelect ? diffSelect.value : 'Intermediate';
      const focusTopic = topicInput ? topicInput.value.trim() : '';

      state.quizStudio.questionCount = questionCount;
      state.quizStudio.difficulty = difficulty;
      state.quizStudio.focusTopic = focusTopic;

      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating Quiz...';

      try {
        const token = getAuthToken();
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        };

        const res = await fetch('/api/quizzes/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: textSource,
            file: textSource,
            title: focusTopic ? `Quiz: ${focusTopic}` : (state.quizStudio.fileName || 'Document Assessment'),
            num_questions: questionCount,
            question_count: questionCount,
            difficulty,
            focus_topic: focusTopic
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to generate quiz from document.');
        }

        const data = await res.json();
        state.quizStudio.currentQuiz = data.quiz;
        state.quizStudio.currentQuestionIndex = 0;
        state.quizStudio.selectedOption = null;
        state.quizStudio.isSubmitted = false;
        state.quizStudio.userAnswers = {};

        startQuizTaking(container);
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Quiz';
      }
    });
  }
}

/**
 * Transitions into Document Quiz test-taking proctor interface.
 * @param {HTMLElement} container - Root DOM container.
 */
function startQuizTaking(container) {
  const configView = container.querySelector('#quiz-config-view');
  const takingView = container.querySelector('#quiz-taking-view');
  const resultsView = container.querySelector('#quiz-results-view');

  configView.style.display = 'none';
  resultsView.style.display = 'none';
  takingView.style.display = 'block';

  renderQuizQuestion(container);
}

/**
 * Renders active question in Document Quiz proctor interface.
 * @param {HTMLElement} container - Root DOM container.
 */
function renderQuizQuestion(container) {
  const quiz = state.quizStudio.currentQuiz;
  if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) return;

  const questions = quiz.questions;
  const index = state.quizStudio.currentQuestionIndex;
  const total = questions.length;
  const currentQ = questions[index];
  if (!currentQ) return;

  // Update Progress Bar
  const progressLabel = container.querySelector('#quiz-progress-label');
  const progressPct = container.querySelector('#quiz-progress-pct');
  const progressFill = container.querySelector('#quiz-progress-fill');

  const pct = Math.round((index / total) * 100);
  if (progressLabel) progressLabel.textContent = `Question ${index + 1} of ${total}`;
  if (progressPct) progressPct.textContent = `${pct}% Completed`;
  if (progressFill) progressFill.style.width = `${pct}%`;

  const questionContainer = container.querySelector('#quiz-question-container');
  if (!questionContainer) return;

  state.quizStudio.selectedOption = null;
  state.quizStudio.isSubmitted = false;

  const optionsHtml = (currentQ.options || []).map((opt, optIdx) => `
    <div class="sf-option-card" data-idx="${optIdx}">
      <span class="sf-option-letter">${String.fromCharCode(65 + optIdx)}</span>
      <div class="sf-option-body">${opt}</div>
    </div>
  `).join('');

  questionContainer.innerHTML = `
    <div class="sf-question-card">
      <div class="sf-question-meta">
        <span class="sf-badge sf-badge-neutral">Document Assessment</span>
        <span class="sf-badge sf-badge-accent">${currentQ.difficulty || 'Intermediate'}</span>
      </div>
      <h3 class="sf-question-text">${currentQ.question_text}</h3>
      <div class="sf-options-list" id="quiz-options-list">
        ${optionsHtml}
      </div>

      <div id="quiz-feedback-area"></div>

      <div class="sf-action-row">
        <button type="button" id="quiz-submit-answer-btn" class="sf-btn sf-btn-primary" disabled>
          Submit Answer
        </button>
        <button type="button" id="quiz-next-question-btn" class="sf-btn sf-btn-accent" style="display: none;">
          ${index < total - 1 ? 'Next Question' : 'Complete Quiz'}
        </button>
      </div>
    </div>
  `;

  // Bind Option Card Selection
  const optionCards = questionContainer.querySelectorAll('.sf-option-card');
  const submitBtn = questionContainer.querySelector('#quiz-submit-answer-btn');
  const nextBtn = questionContainer.querySelector('#quiz-next-question-btn');
  const feedbackArea = questionContainer.querySelector('#quiz-feedback-area');

  optionCards.forEach((card) => {
    card.addEventListener('click', () => {
      if (state.quizStudio.isSubmitted) return;

      optionCards.forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      state.quizStudio.selectedOption = parseInt(card.getAttribute('data-idx'), 10);
      submitBtn.disabled = false;
    });
  });

  // Bind Submit Answer
  submitBtn.addEventListener('click', () => {
    if (state.quizStudio.selectedOption === null || state.quizStudio.isSubmitted) return;

    state.quizStudio.isSubmitted = true;
    submitBtn.style.display = 'none';
    nextBtn.style.display = 'inline-flex';

    const selectedIdx = state.quizStudio.selectedOption;
    const correctIdx = currentQ.correct_option_index;
    const isCorrect = selectedIdx === correctIdx;

    state.quizStudio.userAnswers[currentQ.id] = selectedIdx;

    optionCards.forEach((card) => {
      card.classList.add('disabled');
      const idx = parseInt(card.getAttribute('data-idx'), 10);
      if (idx === correctIdx) {
        card.classList.add('correct');
      } else if (idx === selectedIdx && !isCorrect) {
        card.classList.add('incorrect');
      }
    });

    feedbackArea.innerHTML = `
      <div class="sf-feedback-banner ${isCorrect ? 'correct' : 'incorrect'}">
        <span>${isCorrect ? 'Correct response.' : `Incorrect response. Correct answer is option ${String.fromCharCode(65 + correctIdx)}.`}</span>
      </div>
      ${currentQ.source_reference ? `
        <div class="sf-citation-box">
          <span class="sf-citation-label">Source Citation:</span> ${currentQ.source_reference}
        </div>
      ` : ''}
      <div class="sf-explanation-box">
        <div class="sf-explanation-title">Technical Explanation</div>
        <p class="sf-explanation-text">${currentQ.explanation || 'Verified from documentation context.'}</p>
      </div>
    `;
  });

  // Bind Next Question
  nextBtn.addEventListener('click', async () => {
    if (state.quizStudio.currentQuestionIndex < total - 1) {
      state.quizStudio.currentQuestionIndex++;
      renderQuizQuestion(container);
    } else {
      await completeQuizAssessment(container);
    }
  });
}

/**
 * Finalizes quiz submission and renders quiz outcomes.
 * @param {HTMLElement} container - Root DOM container.
 */
async function completeQuizAssessment(container) {
  const quiz = state.quizStudio.currentQuiz;
  if (!quiz) return;

  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  try {
    const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answers: state.quizStudio.userAnswers })
    });

    if (!res.ok) {
      throw new Error('Failed to evaluate quiz submission.');
    }

    const data = await res.json();
    state.quizStudio.submissionResult = data.results || data.attempt;

    renderQuizResults(container);
  } catch (err) {
    alert(`Quiz submission error: ${err.message}`);
  }
}

/**
 * Renders the Document Quiz Studio results view.
 * @param {HTMLElement} container - Root DOM container.
 */
function renderQuizResults(container) {
  const configView = container.querySelector('#quiz-config-view');
  const takingView = container.querySelector('#quiz-taking-view');
  const resultsView = container.querySelector('#quiz-results-view');

  configView.style.display = 'none';
  takingView.style.display = 'none';
  resultsView.style.display = 'block';

  const quiz = state.quizStudio.currentQuiz;
  const results = state.quizStudio.submissionResult || {};

  const totalQuestions = results.total_questions || quiz.questions?.length || 0;
  const score = results.score !== undefined ? results.score : 0;
  const percentage = results.percentage !== undefined ? results.percentage : Math.round((score / (totalQuestions || 1)) * 100);
  const passed = percentage >= 70;

  // Question review items
  const questions = quiz.questions || [];
  const detailed = results.detailed_results || [];

  const itemsHtml = questions.map((q, idx) => {
    const detail = detailed.find((d) => d.question_id === q.id) || {};
    const candidateSelected = detail.selected_option ?? state.quizStudio.userAnswers[q.id];
    const isCorrect = candidateSelected !== undefined && Number(candidateSelected) === Number(q.correct_option_index);

    return `
      <div style="border-bottom: 1px solid ${PALETTE.borderLight}; padding-bottom: 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: ${PALETTE.slateGray};">QUESTION ${idx + 1}</span>
          <span class="sf-badge ${isCorrect ? 'sf-badge-success' : 'sf-badge-error'}">${isCorrect ? 'Correct' : 'Incorrect'}</span>
        </div>
        <p style="font-size: 14px; font-weight: 600; color: ${PALETTE.deepNavy}; margin-bottom: 8px;">${q.question_text}</p>
        <div style="font-size: 13px; color: ${PALETTE.darkSlate}; margin-bottom: 8px;">
          <div><strong>Your Answer:</strong> ${candidateSelected !== undefined && q.options[candidateSelected] ? q.options[candidateSelected] : 'Unanswered'}</div>
          <div><strong>Correct Answer:</strong> ${q.options[q.correct_option_index] || 'N/A'}</div>
        </div>
        ${q.source_reference ? `
          <div style="font-size: 12px; color: ${PALETTE.darkSlate}; margin-bottom: 6px;">
            <strong>Citation:</strong> ${q.source_reference}
          </div>
        ` : ''}
        <div style="background: ${PALETTE.lightGray}; border-left: 3px solid ${PALETTE.slateBlue}; padding: 8px 12px; font-size: 12px; border-radius: 4px;">
          <strong>Explanation:</strong> ${q.explanation || 'Verified from source text.'}
        </div>
      </div>
    `;
  }).join('');

  resultsView.innerHTML = `
    <div class="sf-panel">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <div>
          <h2 class="sf-panel-title">Document Quiz Results</h2>
          <p class="sf-panel-subtitle">Assessment Subject: ${quiz.title || 'Technical Document'}</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="quiz-new-test-btn" class="sf-btn sf-btn-outline sf-btn-sm">
            Create Another Quiz
          </button>
          <div class="sf-dropdown" id="quiz-download-dropdown">
            <button type="button" id="quiz-download-toggle-btn" class="sf-btn sf-btn-primary sf-btn-sm">
              Download Report
            </button>
            <div class="sf-dropdown-menu" id="quiz-download-menu">
              <button type="button" class="sf-dropdown-item" id="quiz-dl-csv">Download CSV</button>
              <button type="button" class="sf-dropdown-item" id="quiz-dl-json">Download JSON</button>
              <button type="button" class="sf-dropdown-item" id="quiz-dl-print">Print Report</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="sf-results-grid">
        <div class="sf-stat-card">
          <div class="sf-stat-value">${score} / ${totalQuestions}</div>
          <div class="sf-stat-label">Points Scored</div>
        </div>
        <div class="sf-stat-card">
          <div class="sf-stat-value">${percentage}%</div>
          <div class="sf-stat-label">Performance Score</div>
        </div>
        <div class="sf-stat-card">
          <div style="margin-bottom: 6px;">
            <span class="sf-badge ${passed ? 'sf-badge-success' : 'sf-badge-warning'}" style="font-size: 13px; padding: 6px 12px;">
              ${passed ? 'Benchmark Met' : 'Requires Review'}
            </span>
          </div>
          <div class="sf-stat-label">Outcome Status</div>
        </div>
      </div>

      <!-- Question Review List -->
      <h3 style="font-size: 15px; font-weight: 700; color: ${PALETTE.deepNavy}; margin: 24px 0 16px 0;">
        Itemized Question Review
      </h3>
      <div>
        ${itemsHtml}
      </div>
    </div>
  `;

  // Bind Buttons
  container.querySelector('#quiz-new-test-btn').addEventListener('click', () => {
    configView.style.display = 'block';
    takingView.style.display = 'none';
    resultsView.style.display = 'none';
  });

  // Dropdown Handling
  const dropdownToggle = container.querySelector('#quiz-download-toggle-btn');
  const dropdownMenu = container.querySelector('#quiz-download-menu');

  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });

  // Download Actions
  container.querySelector('#quiz-dl-csv').addEventListener('click', () => {
    downloadQuizExport(quiz.id, 'csv');
  });

  container.querySelector('#quiz-dl-json').addEventListener('click', () => {
    downloadQuizExport(quiz.id, 'json');
  });

  container.querySelector('#quiz-dl-print').addEventListener('click', () => {
    ExportService.exportQuizResults(quiz, { score, percentage, answers: state.quizStudio.userAnswers }, `${quiz.id}_report.html`);
  });
}

/**
 * Downloads document quiz export data.
 * @param {string} quizId - Target Quiz ID.
 * @param {string} format - 'csv' | 'json' | 'html'.
 */
async function downloadQuizExport(quizId, format = 'csv') {
  try {
    const res = await fetch(`/api/quizzes/${quizId}/export?format=${format}`);
    if (!res.ok) throw new Error('Quiz export request failed.');
  } catch (err) {
    console.error('Quiz export download error:', err);
  }
}
