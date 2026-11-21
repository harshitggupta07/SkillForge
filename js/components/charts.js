/**
 * SkillForge - Visualization and Telemetry Components
 *
 * Lightweight, DOM-based charting and metric presentation primitives.
 * Operates without external charting libraries or canvas overhead.
 */

/**
 * Maps a numeric percentage score (0-100) to its designated design system token color.
 *
 * @param {number|string} score - Score value between 0 and 100.
 * @returns {string} Hex color code string.
 */
export function getScoreColor(score) {
  const num = Number(score) || 0;
  if (num >= 75) {
    return '#2D6A4F'; // Muted forest green
  }
  if (num >= 50) {
    return '#D97706'; // Amber warning
  }
  return '#DC2626'; // Error red
}

/**
 * Resolves a DOM container from an element instance or CSS selector string.
 *
 * @param {HTMLElement|string} target - Target DOM element or query selector.
 * @returns {HTMLElement|null} Resolved HTML element.
 */
function resolveContainer(target) {
  if (!target) return null;
  if (typeof target === 'string') {
    return document.querySelector(target);
  }
  return target;
}

/**
 * Renders an accessible, styled linear progress bar.
 *
 * @param {HTMLElement|string} container - Target DOM element or selector.
 * @param {number} value - Current value.
 * @param {number} [max=100] - Maximum value scale.
 * @param {string} [label=''] - Text description for the metric.
 * @param {string|null} [color=null] - Optional hex color override.
 * @returns {HTMLElement|null} The generated progress wrapper element.
 */
export function renderProgressBar(container, value, max = 100, label = '', color = null) {
  const el = resolveContainer(container);
  if (!el) return null;

  const numericValue = Number(value) || 0;
  const numericMax = Number(max) || 100;
  const percentage = Math.min(100, Math.max(0, Math.round((numericValue / numericMax) * 100)));
  const fillColor = color || getScoreColor(percentage);

  const wrapper = document.createElement('div');
  wrapper.className = 'progress-wrapper';

  let headerHtml = '';
  if (label || label === '') {
    headerHtml = `
      <div class="progress-header">
        <span class="progress-label">${escapeHtml(label)}</span>
        <span class="progress-value font-mono">${percentage}%</span>
      </div>
    `;
  }

  wrapper.innerHTML = `
    ${headerHtml}
    <div class="progress-track" role="progressbar" aria-valuenow="${numericValue}" aria-valuemin="0" aria-valuemax="${numericMax}" aria-label="${escapeHtml(label || 'Progress')}">
      <div class="progress-fill" style="width: ${percentage}%; background-color: ${fillColor};"></div>
    </div>
  `;

  el.appendChild(wrapper);
  return wrapper;
}

/**
 * Renders horizontal comparative telemetry bars evaluating actual candidate skills
 * against role benchmark standards.
 *
 * @param {HTMLElement|string} container - Target DOM element or selector.
 * @param {Array<object>} skills - Array of skill assessment telemetry records.
 * @returns {HTMLElement|null} The generated comparison list container element.
 */
export function renderSkillComparison(container, skills = []) {
  const el = resolveContainer(container);
  if (!el) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'skill-comparison-list';

  if (!Array.isArray(skills) || skills.length === 0) {
    wrapper.innerHTML = `
      <div class="alert alert-info">
        <span>No comparative skill data recorded for this profile.</span>
      </div>
    `;
    el.appendChild(wrapper);
    return wrapper;
  }

  const itemsHtml = skills.map((item) => {
    const name = item.name || item.skill_name || item.skill_id || 'Technical Skill';
    const actual = Math.min(100, Math.max(0, Number(item.actual_score ?? item.score ?? item.user_score ?? 0)));
    const benchmark = Math.min(100, Math.max(0, Number(item.benchmark_score ?? item.benchmark ?? item.min_score ?? 70)));
    const gap = actual - benchmark;
    const gapSign = gap > 0 ? `+${gap}` : `${gap}`;
    const gapColor = gap >= 0 ? '#2D6A4F' : '#DC2626';
    const barColor = getScoreColor(actual);

    return `
      <div class="skill-comparison-item">
        <div class="skill-comparison-meta">
          <span class="skill-comparison-name">${escapeHtml(name)}</span>
          <span class="skill-comparison-stats">
            <span>Score: <strong>${actual}%</strong></span>
            <span class="text-muted"> / Req: ${benchmark}%</span>
            <span style="color: ${gapColor}; font-weight: 600; margin-left: 0.5rem;">(${gapSign}%)</span>
          </span>
        </div>
        <div class="skill-comparison-bars" title="Actual: ${actual}%, Benchmark: ${benchmark}%">
          <div class="skill-bar-actual" style="width: ${actual}%; background-color: ${barColor};">
            ${actual >= 20 ? `${actual}%` : ''}
          </div>
          <div class="skill-benchmark-marker" style="left: ${benchmark}%;" title="Benchmark requirement: ${benchmark}%">
            <span class="skill-benchmark-label">${benchmark}%</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  wrapper.innerHTML = itemsHtml;
  el.appendChild(wrapper);
  return wrapper;
}

/**
 * Returns an HTML string rendering a directional trend telemetry badge.
 *
 * @param {string} direction - Trend movement direction: 'up', 'down', 'stable', or 'flat'.
 * @param {string|number} [value=''] - Delta value or metric string (e.g. '+14.2%').
 * @returns {string} Semantic HTML markup string.
 */
export function renderTrendIndicator(direction, value = '') {
  const dir = String(direction || '').toLowerCase();
  let arrow = '->';
  let color = '#64748B'; // Slate gray
  let label = 'Stable';

  if (dir === 'up' || dir === 'increasing' || dir === 'growth' || dir === 'positive') {
    arrow = '^';
    color = '#2D6A4F'; // Muted forest green
    label = 'Upward trend';
  } else if (dir === 'down' || dir === 'decreasing' || dir === 'decline' || dir === 'negative') {
    arrow = 'v';
    color = '#DC2626'; // Error red
    label = 'Downward trend';
  }

  const formattedValue = value !== '' ? ` ${escapeHtml(String(value))}` : '';

  return `<span class="trend-indicator font-mono" style="color: ${color}; font-weight: 600;" title="${label}" aria-label="${label}: ${formattedValue}">[${arrow}]${formattedValue}</span>`;
}

/**
 * Renders a standardized metric score card displaying a numeric result,
 * semantic color coding, and descriptive labels.
 *
 * @param {HTMLElement|string} container - Target DOM element or selector.
 * @param {number|string} score - Score value (0-100 or numeric total).
 * @param {string} label - Primary card label.
 * @param {string} [sublabel=''] - Secondary descriptive context.
 * @returns {HTMLElement|null} The generated card element.
 */
export function renderScoreCard(container, score, label, sublabel = '') {
  const el = resolveContainer(container);
  if (!el) return null;

  const numericScore = Number(score) || 0;
  const scoreColor = getScoreColor(numericScore);

  const card = document.createElement('div');
  card.className = 'stat-card';
  card.style.borderTop = `3px solid ${scoreColor}`;

  card.innerHTML = `
    <div class="stat-value" style="color: ${scoreColor};">${escapeHtml(String(score))}</div>
    <div class="stat-label">${escapeHtml(label)}</div>
    ${sublabel ? `<div class="stat-sublabel">${escapeHtml(sublabel)}</div>` : ''}
  `;

  el.appendChild(card);
  return card;
}

/**
 * Sanitizes unsafe HTML special characters to prevent injection attacks.
 *
 * @param {string} str - Raw input string.
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
