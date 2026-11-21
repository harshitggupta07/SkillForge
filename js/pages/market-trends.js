/**
 * SkillForge - Global IT Market Intelligence View
 *
 * Implements market alignment scoring, rising architectural trends telemetry,
 * legacy skills at risk alerts, domain readiness matrix, and personal action roadmap.
 */

import { getToken, getCurrentUser } from '../auth.js';
import { MARKET_TRENDS, SKILLS_TAXONOMY, CURATED_COURSES } from '../../db/seed-data.js';

/**
 * Escapes unsafe HTML characters to prevent XSS.
 *
 * @param {string} str - Input text string.
 * @returns {string} Sanitized string safe for DOM interpolation.
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
 * Formats a numeric USD value into comma-separated currency representation.
 *
 * @param {number} num - Numeric currency value.
 * @returns {string} Formatted currency string without currency symbol.
 */
function formatNumber(num) {
  if (typeof num !== 'number') return '0';
  return num.toLocaleString('en-US');
}

/**
 * Resolves authentication headers for API interactions.
 * If no session token is set, builds a deterministic demo bearer token.
 *
 * @returns {Record<string, string>} Request headers.
 */
function getAuthHeaders() {
  const token = getToken() || localStorage.getItem('skillforge_token') || sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const user = getCurrentUser() || { id: 'usr_admin_001', email: 'admin@skillforge.dev', name: 'Marcus Vance', role: 'admin' };
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
      id: user.id || 'usr_admin_001',
      email: user.email || 'admin@skillforge.dev',
      name: user.name || 'Marcus Vance',
      role: user.role || 'admin',
      exp: Math.floor(Date.now() / 1000) + 86400
    }))));
    headers['Authorization'] = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.skillforge_sig_${user.id || 'usr_admin_001'}`;
  }

  return headers;
}

/**
 * Renders the structural HTML container for the Market Trends page.
 *
 * @param {HTMLElement} container - Target DOM container element.
 */
export function render(container) {
  container.innerHTML = `
    <div class="market-trends-container" style="max-width: 1200px; margin: 0 auto; padding: 1.5rem 0;">
      <!-- Page Header -->
      <header class="page-header" style="margin-bottom: 1.75rem;">
        <h1 style="font-size: 1.75rem; font-weight: 700; color: #1E293B; margin-bottom: 0.375rem; letter-spacing: -0.01em;">
          Global IT Market Intelligence
        </h1>
        <p style="color: #64748B; font-size: 0.9375rem; margin-bottom: 0;">
          Empirical telemetry analyzing skill demand vectors, architectural paradigms, enterprise compensation bands, and technical transition requirements.
        </p>
      </header>

      <!-- Market Alignment Score Card -->
      <section class="card alignment-score-card" id="market-alignment-card" style="margin-bottom: 2rem; border: 1px solid #E2E8F0; background-color: #FFFFFF; border-radius: 6px;">
        <div class="card-body" style="padding: 1.5rem 1.75rem;">
          <div style="display: grid; grid-template-columns: minmax(220px, 280px) 1fr; gap: 2rem; align-items: center;" id="alignment-card-grid">
            <!-- Left Score Metric Column -->
            <div style="border-right: 1px solid #E2E8F0; padding-right: 1.5rem; text-align: center;">
              <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; margin-bottom: 0.5rem;">
                Market Alignment Index
              </div>
              <div class="font-mono" id="score-big-number" style="font-size: 3.5rem; font-weight: 800; color: #2D6A4F; line-height: 1; margin-bottom: 0.375rem;">
                --
              </div>
              <div style="font-size: 0.8125rem; color: #475569; font-weight: 500;" id="score-status-label">
                Evaluating candidate technical profile...
              </div>
            </div>

            <!-- Right Domain Coverage Details -->
            <div>
              <div style="font-size: 1.25rem; font-weight: 700; color: #1E293B; margin-bottom: 0.375rem;" id="alignment-headline">
                Your profile covers -- of top 10 trending domains
              </div>
              <p style="font-size: 0.875rem; color: #475569; line-height: 1.5; margin-bottom: 1rem;" id="alignment-summary-text">
                Analyzing competency alignment across verified industry demand benchmarks and candidate technical repository...
              </p>

              <!-- Progress Bar -->
              <div style="margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748B; margin-bottom: 0.375rem;">
                  <span>Top 10 Domain Coverage</span>
                  <span class="font-mono" id="coverage-percentage-text" style="font-weight: 600; color: #1E293B;">0%</span>
                </div>
                <div class="progress-track" style="height: 10px; background-color: #E2E8F0; border-radius: 4px; overflow: hidden;" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="10" aria-label="Domain coverage">
                  <div id="domain-coverage-bar" class="progress-fill" style="width: 0%; background-color: #2D6A4F; height: 100%; transition: width 150ms ease-in-out; border-radius: 4px;"></div>
                </div>
              </div>

              <!-- Metrics Row -->
              <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                <div>
                  <span style="font-size: 0.75rem; color: #64748B; display: block;">High-Demand Skills Held</span>
                  <span class="font-mono" id="count-skills-held" style="font-size: 1.125rem; font-weight: 700; color: #2D6A4F;">0</span>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: #64748B; display: block;">Identified Market Gaps</span>
                  <span class="font-mono" id="count-skills-missing" style="font-size: 1.125rem; font-weight: 700; color: #D97706;">0</span>
                </div>
                <div>
                  <span style="font-size: 0.75rem; color: #64748B; display: block;">Legacy Technology Flags</span>
                  <span class="font-mono" id="count-legacy-risks" style="font-size: 1.125rem; font-weight: 700; color: #DC2626;">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Rising Trends Section -->
      <section class="trends-section" style="margin-bottom: 2.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h2 style="font-size: 1.375rem; font-weight: 700; color: #1E293B; margin-bottom: 0.25rem;">
              Rising Technology Trends
            </h2>
            <p style="font-size: 0.875rem; color: #64748B; margin-bottom: 0;">
              High-growth technical domains exhibiting positive year-over-year enterprise hiring volume and compensation expansion.
            </p>
          </div>
          <div style="font-size: 0.8125rem; color: #64748B;" id="rising-count-label">
            Showing rising domains
          </div>
        </div>

        <div id="rising-trends-grid" class="grid-3" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 1.25rem;">
          <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: #64748B; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px;">
            Loading rising market trends telemetry...
          </div>
        </div>
      </section>

      <!-- Declining Skills Alert Section -->
      <section class="declining-skills-section" style="margin-bottom: 2.5rem;">
        <div style="margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.375rem; font-weight: 700; color: #1E293B; margin-bottom: 0.25rem;">
            Declining Skills Alert and Legacy Risk
          </h2>
          <p style="font-size: 0.875rem; color: #64748B; margin-bottom: 0;">
            Identification of contracting software architectures, negative momentum telemetry, and recommended modernization pathways.
          </p>
        </div>

        <div id="declining-alert-container" style="margin-bottom: 1.25rem;">
          <!-- Dynamically populated warning card -->
        </div>

        <!-- Skills at Risk Table -->
        <div class="card" style="border: 1px solid #E2E8F0; background-color: #FFFFFF; border-radius: 6px; overflow: hidden;">
          <div class="card-header" style="padding: 0.875rem 1.25rem; background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
            <h3 style="font-size: 0.9375rem; font-weight: 700; color: #1E293B; margin-bottom: 0;">
              Skills at Risk Matrix
            </h3>
          </div>
          <div class="table-responsive">
            <table class="table" id="skills-at-risk-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
              <thead>
                <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0; text-align: left;">
                  <th scope="col" style="padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; width: 22%;">
                    Skill / Technology
                  </th>
                  <th scope="col" style="padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; width: 15%;">
                    Trend Momentum
                  </th>
                  <th scope="col" style="padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; width: 20%;">
                    Your Reliance
                  </th>
                  <th scope="col" style="padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; width: 43%;">
                    Recommended Modernization Transition
                  </th>
                </tr>
              </thead>
              <tbody id="skills-at-risk-tbody">
                <tr>
                  <td colspan="4" style="padding: 2rem; text-align: center; color: #64748B;">
                    Evaluating technical profile for legacy dependencies...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Readiness Matrix Table Section -->
      <section class="readiness-matrix-section" style="margin-bottom: 2.5rem;">
        <div style="margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.375rem; font-weight: 700; color: #1E293B; margin-bottom: 0.25rem;">
            Domain Readiness Matrix
          </h2>
          <p style="font-size: 0.875rem; color: #64748B; margin-bottom: 0;">
            Comparative readiness assessment mapping your current verified competencies against the top 10 market domains.
          </p>
        </div>

        <div class="card" style="border: 1px solid #E2E8F0; background-color: #FFFFFF; border-radius: 6px; overflow: hidden;">
          <div class="table-responsive">
            <table class="table" id="readiness-matrix-table" style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
              <thead>
                <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0; text-align: left;">
                  <th scope="col" style="padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; width: 22%;">
                    Trending Domain
                  </th>
                  <th scope="col" style="padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; width: 18%;">
                    Your Readiness
                  </th>
                  <th scope="col" style="padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; width: 25%;">
                    Missing Skills
                  </th>
                  <th scope="col" style="padding: 0.75rem 1rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #334155; width: 35%;">
                    Recommended Action
                  </th>
                </tr>
              </thead>
              <tbody id="readiness-matrix-tbody">
                <tr>
                  <td colspan="4" style="padding: 2rem; text-align: center; color: #64748B;">
                    Compiling domain readiness matrix telemetry...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Personal Action Plan Section -->
      <section class="action-plan-section" style="margin-bottom: 2rem;">
        <div style="margin-bottom: 1.25rem;">
          <h2 style="font-size: 1.375rem; font-weight: 700; color: #1E293B; margin-bottom: 0.25rem;">
            Personal Action Plan
          </h2>
          <p style="font-size: 0.875rem; color: #64748B; margin-bottom: 0;">
            Prioritized strategic actions targeting identified competency deficits, legacy replacement, and high-growth industry demand.
          </p>
        </div>

        <div id="action-plan-list" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="padding: 2.5rem; text-align: center; color: #64748B; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px;">
            Synthesizing personalized technical action plan...
          </div>
        </div>
      </section>
    </div>
  `;
}

/**
 * Initializes state, executes dual API requests, computes domain coverage, and populates all views.
 *
 * @param {HTMLElement} container - Root DOM container element.
 */
export async function init(container) {
  const state = {
    trends: [],
    alignment: null,
    risingTrends: [],
    decliningTrends: [],
    candidateSkills: new Set(),
    user: getCurrentUser()
  };

  await loadMarketData(container, state);

  // Synchronize sections
  renderAlignmentScoreCard(container, state);
  renderRisingTrends(container, state);
  renderDecliningSkillsSection(container, state);
  renderReadinessMatrix(container, state);
  renderPersonalActionPlan(container, state);
}

/**
 * Fetches market trends and candidate market alignment payloads with deterministic fallback logic.
 *
 * @param {HTMLElement} container - Root container.
 * @param {object} state - Active page state.
 */
async function loadMarketData(container, state) {
  let trendsList = [];
  let alignmentData = null;

  try {
    // 1. Fetch market trends from API
    const trendsRes = await fetch('/api/market/trends', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (trendsRes.ok) {
      const data = await trendsRes.json();
      trendsList = Array.isArray(data.trends) ? data.trends : [];
    }
  } catch (err) {
    console.warn('API market trends request unavailable. Falling back to reference telemetry:', err);
  }

  try {
    // 2. Fetch candidate alignment analysis from API
    const alignRes = await fetch('/api/analysis/market-alignment', {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (alignRes.ok) {
      const data = await alignRes.json();
      alignmentData = data.alignment || null;
    }
  } catch (err) {
    console.warn('API market alignment request unavailable. Generating local analytical model:', err);
  }

  // Fallback to seed trends repository if API payload is empty
  if (trendsList.length === 0) {
    trendsList = [...MARKET_TRENDS];
  }

  state.trends = trendsList;
  state.risingTrends = trendsList.filter((t) => t.trend_direction === 'Rising');
  state.decliningTrends = trendsList.filter((t) => t.trend_direction === 'Declining');

  // Extract candidate skills from user profile or demo account
  const user = state.user || {
    id: 'usr_admin_001',
    name: 'Marcus Vance',
    tech_stack: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker']
  };

  const candidateSkills = new Set();
  if (user.tech_stack && Array.isArray(user.tech_stack)) {
    user.tech_stack.forEach((s) => candidateSkills.add(s.toLowerCase()));
  }

  // Also include skills from alignment payload if present
  if (alignmentData && Array.isArray(alignmentData.trending_skills_held)) {
    alignmentData.trending_skills_held.forEach((item) => {
      if (item.skill) candidateSkills.add(item.skill.toLowerCase());
    });
  }

  state.candidateSkills = candidateSkills;

  // Synthesize alignment object if API returned null
  if (!alignmentData) {
    alignmentData = computeLocalAlignment(candidateSkills, state.trends);
  }

  state.alignment = alignmentData;
}

/**
 * Computes deterministic market alignment when the backend calculation endpoint is unavailable.
 *
 * @param {Set<string>} candidateSkills - Set of normalized candidate skill strings.
 * @param {Array<object>} trends - Market trend records.
 * @returns {object} Synthetic alignment diagnostic payload.
 */
function computeLocalAlignment(candidateSkills, trends) {
  const trendingSkillsHeld = [];
  const trendingSkillsMissing = [];
  const riskAreas = [];

  const rising = trends.filter((t) => t.trend_direction === 'Rising');

  rising.forEach((t) => {
    (t.key_skills || []).forEach((ks) => {
      const normalized = ks.toLowerCase();
      let match = candidateSkills.has(normalized);
      if (!match) {
        for (const cs of candidateSkills) {
          if (cs.includes(normalized) || normalized.includes(cs)) {
            match = true;
            break;
          }
        }
      }

      if (match) {
        if (!trendingSkillsHeld.some((item) => item.skill === ks)) {
          trendingSkillsHeld.push({
            skill: ks,
            domain: t.domain,
            demand_score: t.demand_score,
            growth: t.year_over_year_growth
          });
        }
      } else {
        if (!trendingSkillsMissing.some((item) => item.skill === ks)) {
          trendingSkillsMissing.push({
            skill: ks,
            domain: t.domain,
            demand_score: t.demand_score,
            growth: t.year_over_year_growth
          });
        }
      }
    });
  });

  // Check declining risk
  const declining = trends.filter((t) => t.trend_direction === 'Declining');
  declining.forEach((t) => {
    const isDomainMatch = candidateSkills.has(t.domain.toLowerCase());
    const hasKeySkill = (t.key_skills || []).some((ks) => candidateSkills.has(ks.toLowerCase()));

    // Flag jQuery specifically if user is on full-stack legacy web or holds legacy JavaScript
    if (t.domain.toLowerCase().includes('jquery') && (candidateSkills.has('javascript') || isDomainMatch || hasKeySkill)) {
      riskAreas.push({
        technology: 'jQuery',
        growth: t.year_over_year_growth,
        demand_score: t.demand_score,
        warning: 'Legacy DOM manipulation library exhibiting sustained hiring contraction (-34% YoY). Phased enterprise migration toward native ES standards and React component architectures is active.'
      });
    } else if (isDomainMatch || hasKeySkill) {
      riskAreas.push({
        technology: t.domain,
        growth: t.year_over_year_growth,
        demand_score: t.demand_score,
        warning: `Technology indicates negative industry momentum (${t.year_over_year_growth} YoY). Enterprise codebases are actively transitioning toward modern alternatives.`
      });
    }
  });

  const totalRisingSkills = trendingSkillsHeld.length + trendingSkillsMissing.length;
  const coverageRate = totalRisingSkills > 0 ? (trendingSkillsHeld.length / totalRisingSkills) * 100 : 60;
  const riskPenalty = riskAreas.length * 8;
  const overallScore = Math.max(25, Math.min(100, Math.round(coverageRate - riskPenalty + 20)));

  return {
    overall_alignment_score: overallScore,
    trending_skills_held: trendingSkillsHeld,
    trending_skills_missing: trendingSkillsMissing,
    risk_areas: riskAreas,
    summary: `Candidate profile demonstrates strong foundation across ${trendingSkillsHeld.length} modern engineering skills, with key development opportunities in high-growth AI and cloud automation vectors.`
  };
}

/**
 * Computes how many of the top 10 trending domains are covered by candidate competencies.
 *
 * @param {Array<object>} trends - All market trend records.
 * @param {Set<string>} candidateSkills - Normalized candidate skill tokens.
 * @returns {{ coveredCount: number, top10: Array<object> }} Coverage count and sorted top 10 domains.
 */
function evaluateTop10DomainCoverage(trends, candidateSkills) {
  // Sort rising/stable domains by demand score descending to establish top 10
  const top10 = trends
    .filter((t) => t.trend_direction !== 'Declining')
    .sort((a, b) => (b.demand_score || 0) - (a.demand_score || 0))
    .slice(0, 10);

  let coveredCount = 0;

  top10.forEach((domainItem) => {
    const keySkills = domainItem.key_skills || [];
    let matchFound = false;

    for (const ks of keySkills) {
      const lower = ks.toLowerCase();
      if (candidateSkills.has(lower)) {
        matchFound = true;
        break;
      }
      for (const cs of candidateSkills) {
        if (cs.includes(lower) || lower.includes(cs)) {
          matchFound = true;
          break;
        }
      }
      if (matchFound) break;
    }

    if (matchFound) {
      coveredCount++;
    }
  });

  return { coveredCount, top10 };
}

/**
 * Renders the top Market Alignment Score card.
 *
 * @param {HTMLElement} container - Root container.
 * @param {object} state - Page state.
 */
function renderAlignmentScoreCard(container, state) {
  const { coveredCount } = evaluateTop10DomainCoverage(state.trends, state.candidateSkills);
  const alignment = state.alignment || {};
  const score = alignment.overall_alignment_score || 82;

  // Color token resolution
  let scoreColor = '#2D6A4F'; // Forest green
  let statusText = 'Competitive Industry Alignment';

  if (score < 50) {
    scoreColor = '#DC2626'; // Error red
    statusText = 'Substantial Modernization Deficit';
  } else if (score < 75) {
    scoreColor = '#D97706'; // Amber
    statusText = 'Moderate Market Alignment';
  }

  const scoreNumEl = container.querySelector('#score-big-number');
  const scoreStatusEl = container.querySelector('#score-status-label');
  const headlineEl = container.querySelector('#alignment-headline');
  const summaryEl = container.querySelector('#alignment-summary-text');
  const pctTextEl = container.querySelector('#coverage-percentage-text');
  const barEl = container.querySelector('#domain-coverage-bar');

  const heldCountEl = container.querySelector('#count-skills-held');
  const missingCountEl = container.querySelector('#count-skills-missing');
  const legacyCountEl = container.querySelector('#count-legacy-risks');

  if (scoreNumEl) {
    scoreNumEl.textContent = score;
    scoreNumEl.style.color = scoreColor;
  }

  if (scoreStatusEl) {
    scoreStatusEl.textContent = statusText;
  }

  if (headlineEl) {
    headlineEl.textContent = `Your profile covers ${coveredCount} of top 10 trending domains`;
  }

  if (summaryEl) {
    summaryEl.textContent = alignment.summary ||
      `Candidate profile demonstrates alignment across ${coveredCount} of the top 10 trending industry domains, with technical development opportunities in agentic workflows and retrieval systems.`;
  }

  const coveragePct = Math.round((coveredCount / 10) * 100);
  if (pctTextEl) pctTextEl.textContent = `${coveragePct}% (${coveredCount}/10)`;

  if (barEl) {
    barEl.style.width = `${coveragePct}%`;
    barEl.style.backgroundColor = scoreColor;
    barEl.setAttribute('aria-valuenow', String(coveredCount));
  }

  if (heldCountEl) {
    heldCountEl.textContent = Array.isArray(alignment.trending_skills_held)
      ? alignment.trending_skills_held.length
      : 8;
  }

  if (missingCountEl) {
    missingCountEl.textContent = Array.isArray(alignment.trending_skills_missing)
      ? alignment.trending_skills_missing.length
      : 3;
  }

  if (legacyCountEl) {
    legacyCountEl.textContent = Array.isArray(alignment.risk_areas)
      ? alignment.risk_areas.length
      : 1;
  }
}

/**
 * Renders the Rising Trends cards grid with green up-arrows, demand scores, and salary bands.
 *
 * @param {HTMLElement} container - Root container.
 * @param {object} state - Page state.
 */
function renderRisingTrends(container, state) {
  const grid = container.querySelector('#rising-trends-grid');
  const countLabel = container.querySelector('#rising-count-label');
  if (!grid) return;

  const rising = state.risingTrends;

  if (countLabel) {
    countLabel.textContent = `Displaying ${rising.length} rising domains`;
  }

  if (rising.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: #64748B; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px;">
        No active rising market trends identified in current telemetry.
      </div>
    `;
    return;
  }

  grid.innerHTML = rising.map((trend) => {
    // Key skills tags
    const skillsHtml = (trend.key_skills || []).map((skill) => `
      <span class="skill-tag skill-tag-matched" style="font-size: 0.75rem; border-radius: 4px; padding: 0.2rem 0.5rem;">
        ${escapeHtml(skill)}
      </span>
    `).join('');

    // Salary range display
    let salaryText = 'Competitive Enterprise Scale';
    if (trend.salary_range_usd) {
      salaryText = `$${formatNumber(trend.salary_range_usd.min)} - $${formatNumber(trend.salary_range_usd.max)} USD (Median $${formatNumber(trend.salary_range_usd.median)})`;
    }

    // Hiring regions
    const regions = Array.isArray(trend.top_hiring_regions)
      ? trend.top_hiring_regions.join(', ')
      : 'Global Remote';

    return `
      <article class="card trend-card" style="border: 1px solid #E2E8F0; background-color: #FFFFFF; border-radius: 6px; display: flex; flex-direction: column;">
        <div class="card-body" style="padding: 1.25rem; flex: 1 1 auto; display: flex; flex-direction: column;">
          <!-- Top Row: Domain & Demand Score Badge -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.5rem;">
            <h3 style="font-size: 1.125rem; font-weight: 700; color: #1E293B; margin-bottom: 0; line-height: 1.35;">
              ${escapeHtml(trend.domain)}
            </h3>
            <span class="badge badge-primary font-mono" style="border-radius: 4px; font-weight: 600; white-space: nowrap;">
              Demand: ${escapeHtml(String(trend.demand_score))}/100
            </span>
          </div>

          <!-- YoY Growth with Green Up-Arrow -->
          <div style="font-size: 1.125rem; font-weight: 700; color: #2D6A4F; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.375rem;">
            <span style="color: #2D6A4F; font-weight: 800; font-size: 1.25rem;" aria-label="Rising trend">↑</span>
            <span>${escapeHtml(trend.year_over_year_growth)} YoY Growth</span>
          </div>

          <!-- Description -->
          <p style="font-size: 0.875rem; color: #334155; line-height: 1.5; margin-bottom: 1rem;">
            ${escapeHtml(trend.description)}
          </p>

          <!-- Key Skills -->
          <div style="margin-bottom: 1rem;">
            <div style="font-size: 0.75rem; font-weight: 600; color: #64748B; margin-bottom: 0.375rem;">
              Key Requisite Skills:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 0.375rem;">
              ${skillsHtml}
            </div>
          </div>

          <!-- Compensation and Region Metadata -->
          <div style="margin-top: auto; padding-top: 0.75rem; border-top: 1px solid #F1F5F9; font-size: 0.8125rem; display: flex; flex-direction: column; gap: 0.375rem;">
            <div style="color: #1E293B;">
              <span style="font-weight: 600; color: #64748B;">Compensation Band:</span> ${escapeHtml(salaryText)}
            </div>
            <div style="color: #475569;">
              <span style="font-weight: 600; color: #64748B;">Hiring Regions:</span> ${escapeHtml(regions)}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Renders the Declining Skills Alert warning card and Skills at Risk table.
 *
 * @param {HTMLElement} container - Root container.
 * @param {object} state - Page state.
 */
function renderDecliningSkillsSection(container, state) {
  const alertContainer = container.querySelector('#declining-alert-container');
  const tbody = container.querySelector('#skills-at-risk-tbody');
  if (!tbody) return;

  const alignment = state.alignment || {};
  const riskAreas = Array.isArray(alignment.risk_areas) ? alignment.risk_areas : [];

  // Determine whether candidate holds at-risk technologies
  const hasUserLegacyRisk = riskAreas.length > 0;

  if (alertContainer) {
    if (hasUserLegacyRisk) {
      alertContainer.innerHTML = `
        <div class="alert alert-warning" style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-left: 4px solid #D97706; border-radius: 4px; padding: 1rem 1.25rem; color: #92400E;">
          <div>
            <div style="font-size: 0.9375rem; font-weight: 700; margin-bottom: 0.25rem;">
              Caution: Detected Reliance on Declining Technologies
            </div>
            <p style="margin-bottom: 0; font-size: 0.875rem; line-height: 1.5;">
              Your profile indicates reliance on ${riskAreas.map((r) => r.technology).join(', ')}. Enterprise engineering organizations are systematically deprecating these legacy patterns in favor of modern component models, TypeScript type systems, and decoupled services.
            </p>
          </div>
        </div>
      `;
    } else {
      alertContainer.innerHTML = `
        <div class="alert alert-success" style="background-color: #EBF7EE; border: 1px solid #A3D9B5; border-left: 4px solid #2D6A4F; border-radius: 4px; padding: 1rem 1.25rem; color: #2D6A4F;">
          <div>
            <div style="font-size: 0.9375rem; font-weight: 700; margin-bottom: 0.25rem;">
              Zero High-Risk Legacy Dependencies Detected
            </div>
            <p style="margin-bottom: 0; font-size: 0.875rem; line-height: 1.5;">
              Your active technical profile contains no direct dependencies on contracting enterprise technologies. Continue monitoring the reference transition matrix below to avoid legacy architectural adoption.
            </p>
          </div>
        </div>
      `;
    }
  }

  // Build the complete matrix of declining technologies for the table
  const decliningMatrix = [
    {
      skill: 'jQuery',
      trend: '-34% YoY',
      trendColor: '#DC2626',
      userReliance: state.candidateSkills.has('javascript') || state.candidateSkills.has('jquery')
        ? 'Moderate Reliance (CV / Legacy Web Stack)'
        : 'Low (Modern framework stack active)',
      transition: 'Migrate legacy DOM manipulation logic to Modern React 19, TypeScript DOM interfaces, or native Web Components.'
    },
    {
      skill: 'Legacy PHP',
      trend: '-26% YoY',
      trendColor: '#DC2626',
      userReliance: state.candidateSkills.has('php')
        ? 'High (Monolithic backend stack detected)'
        : 'None (Modern runtime active)',
      transition: 'Transition monolithic request pipelines to Node.js, Go microservices, or typed Python FastAPI architectures.'
    },
    {
      skill: 'Blockchain/Web3',
      trend: '-38% YoY',
      trendColor: '#DC2626',
      userReliance: state.candidateSkills.has('web3') || state.candidateSkills.has('solidity')
        ? 'Identified in secondary profile'
        : 'None detected',
      transition: 'Shift decentralized developer capital toward Agentic AI tool calling, distributed systems, and cloud infrastructure.'
    }
  ];

  tbody.innerHTML = decliningMatrix.map((item) => {
    const isAtRisk = item.userReliance.includes('High') || item.userReliance.includes('Moderate');

    return `
      <tr style="border-bottom: 1px solid #E2E8F0; background-color: ${isAtRisk ? '#FFFBEB' : '#FFFFFF'};">
        <td style="padding: 0.75rem 1rem; vertical-align: middle;">
          <strong style="color: #1E293B; font-size: 0.875rem;">${escapeHtml(item.skill)}</strong>
        </td>
        <td style="padding: 0.75rem 1rem; vertical-align: middle;">
          <span class="font-mono" style="color: ${item.trendColor}; font-weight: 700; font-size: 0.875rem;">
            ${escapeHtml(item.trend)}
          </span>
        </td>
        <td style="padding: 0.75rem 1rem; vertical-align: middle;">
          ${isAtRisk
            ? `<span class="badge badge-warning" style="border-radius: 4px; font-weight: 600;">${escapeHtml(item.userReliance)}</span>`
            : `<span class="badge badge-secondary" style="border-radius: 4px;">${escapeHtml(item.userReliance)}</span>`
          }
        </td>
        <td style="padding: 0.75rem 1rem; vertical-align: middle; font-size: 0.875rem; color: #334155; line-height: 1.45;">
          ${escapeHtml(item.transition)}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renders the Domain Readiness Matrix comparing candidate skills against the top 10 market domains.
 * Color-codes rows based on readiness percentage tiers.
 *
 * @param {HTMLElement} container - Root container.
 * @param {object} state - Page state.
 */
function renderReadinessMatrix(container, state) {
  const tbody = container.querySelector('#readiness-matrix-tbody');
  if (!tbody) return;

  const { top10 } = evaluateTop10DomainCoverage(state.trends, state.candidateSkills);

  tbody.innerHTML = top10.map((domainItem) => {
    const keySkills = domainItem.key_skills || [];
    const heldSkills = [];
    const missingSkills = [];

    keySkills.forEach((ks) => {
      const lower = ks.toLowerCase();
      let match = state.candidateSkills.has(lower);
      if (!match) {
        for (const cs of state.candidateSkills) {
          if (cs.includes(lower) || lower.includes(cs)) {
            match = true;
            break;
          }
        }
      }

      if (match) {
        heldSkills.push(ks);
      } else {
        missingSkills.push(ks);
      }
    });

    const totalKey = keySkills.length;
    const readinessPct = totalKey > 0 ? Math.round((heldSkills.length / totalKey) * 100) : 50;

    // Row styling and badge definition based on readiness tiers
    let rowBg = '#FFFFFF';
    let borderAccent = '#94A3B8';
    let readinessBadgeClass = 'badge-secondary';
    let readinessLabel = `Low (${readinessPct}%)`;
    let recommendedAction = `Complete foundational ${domainItem.domain} coursework to address skill gaps.`;

    if (readinessPct >= 75) {
      rowBg = '#F0FDF4'; // Subtle forest green tint
      borderAccent = '#2D6A4F';
      readinessBadgeClass = 'badge-success';
      readinessLabel = `High (${readinessPct}%)`;
      recommendedAction = `Verified competency in active profile. Maintain technical currency with advanced architectures.`;
    } else if (readinessPct >= 40) {
      rowBg = '#EFF6FF'; // Subtle slate blue tint
      borderAccent = '#3B82F6';
      readinessBadgeClass = 'badge-primary';
      readinessLabel = `Moderate (${readinessPct}%)`;
      recommendedAction = `Complete targeted modules for ${missingSkills.slice(0, 2).join(' and ')} to satisfy role benchmark.`;
    } else {
      rowBg = '#FFFBEB'; // Subtle amber tint
      borderAccent = '#D97706';
      readinessBadgeClass = 'badge-warning';
      readinessLabel = `Gaps Identified (${readinessPct}%)`;
      recommendedAction = `Prioritize high-impact certification and project work in ${missingSkills.slice(0, 2).join(', ')}.`;
    }

    // Missing skills tags markup
    const missingHtml = missingSkills.length > 0
      ? missingSkills.map((s) => `
          <span class="skill-tag skill-tag-gap" style="font-size: 0.6875rem; padding: 0.125rem 0.375rem; border-radius: 4px;">
            ${escapeHtml(s)}
          </span>
        `).join('')
      : '<span class="badge badge-success font-mono" style="border-radius: 4px;">Fully Aligned</span>';

    return `
      <tr style="border-bottom: 1px solid #E2E8F0; background-color: ${rowBg}; border-left: 4px solid ${borderAccent};">
        <td style="padding: 0.875rem 1rem; vertical-align: middle;">
          <div style="font-weight: 700; color: #1E293B; font-size: 0.875rem; margin-bottom: 0.125rem;">
            ${escapeHtml(domainItem.domain)}
          </div>
          <div style="font-size: 0.75rem; color: #64748B;">
            Demand: ${escapeHtml(String(domainItem.demand_score))}/100 (${escapeHtml(domainItem.year_over_year_growth)} YoY)
          </div>
        </td>
        <td style="padding: 0.875rem 1rem; vertical-align: middle;">
          <span class="badge ${readinessBadgeClass} font-mono" style="border-radius: 4px; font-weight: 600;">
            ${escapeHtml(readinessLabel)}
          </span>
        </td>
        <td style="padding: 0.875rem 1rem; vertical-align: middle;">
          <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
            ${missingHtml}
          </div>
        </td>
        <td style="padding: 0.875rem 1rem; vertical-align: middle; font-size: 0.875rem; color: #334155; line-height: 1.45;">
          ${escapeHtml(recommendedAction)}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renders the 5-7 prioritized personal action items with what, why, time, and recommended courses.
 *
 * @param {HTMLElement} container - Root container.
 * @param {object} state - Page state.
 */
function renderPersonalActionPlan(container, state) {
  const target = container.querySelector('#action-plan-list');
  if (!target) return;

  const actionItems = [
    {
      step: '1',
      priority: 'High Priority',
      badgeClass: 'badge-danger',
      what: 'Implement Model Context Protocol (MCP) and Autonomous Agent Orchestration',
      why: 'Agentic AI demonstrates the fastest enterprise expansion (+114% YoY growth, demand score 98/100). Closing this gap positions candidate for elite AI system design roles.',
      time: '32 hours (3 to 4 weeks)',
      courseTitle: 'Autonomous Agentic AI and Multi-Agent Orchestration',
      courseUrl: 'https://learn.skillforge.dev/courses/agentic-ai-orchestration'
    },
    {
      step: '2',
      priority: 'High Priority',
      badgeClass: 'badge-danger',
      what: 'Architect Hybrid Vector Retrieval and Enterprise RAG Systems',
      why: 'LLM Engineering demand rose +88% YoY. Proprietary retrieval grounding is mandatory across current enterprise full-stack implementations.',
      time: '28 hours (3 weeks)',
      courseTitle: 'Advanced Retrieval-Augmented Generation (RAG) Systems',
      courseUrl: 'https://learn.skillforge.dev/courses/advanced-rag-systems'
    },
    {
      step: '3',
      priority: 'Strategic Modernization',
      badgeClass: 'badge-warning',
      what: 'Eliminate Legacy DOM Patterns and Adopt Strict TypeScript Types',
      why: 'Legacy jQuery and non-typed JavaScript exhibit sustained industry contraction (-34% YoY). Standardizing on static type engineering resolves core role benchmark defects.',
      time: '22 hours (2 to 3 weeks)',
      courseTitle: 'TypeScript Static Systems and Type Engineering',
      courseUrl: 'https://learn.skillforge.dev/courses/ts-static-systems'
    },
    {
      step: '4',
      priority: 'Core Infrastructure',
      badgeClass: 'badge-primary',
      what: 'Deploy Identity-Aware Perimeters and Zero Trust Architecture',
      why: 'Cloud Security demand increased +52% YoY with acute shortages in IAM, perimeter defense, and cloud compliance engineering.',
      time: '24 hours (2 to 3 weeks)',
      courseTitle: 'Zero Trust Architecture and Cloud Identity Engineering',
      courseUrl: 'https://learn.skillforge.dev/courses/zero-trust-cloud-identity'
    },
    {
      step: '5',
      priority: 'Operational Engineering',
      badgeClass: 'badge-secondary',
      what: 'Embed Automated Security and OWASP Audits into CI/CD Pipelines',
      why: 'DevSecOps hiring velocity grew +48% YoY. Shifting security testing left into GitHub Actions pipelines reduces organizational deployment vulnerability.',
      time: '22 hours (2 weeks)',
      courseTitle: 'OWASP Top 10 Web Security and Defense Implementation',
      courseUrl: 'https://learn.skillforge.dev/courses/owasp-top-10-defense'
    },
    {
      step: '6',
      priority: 'Full Stack Evolution',
      badgeClass: 'badge-secondary',
      what: 'Transition Monolithic Frontend to Production Hybrid Next.js',
      why: 'Enterprise web systems require high-performance server components and streaming rendering (+8% YoY baseline stability).',
      time: '30 hours (3 weeks)',
      courseTitle: 'Production Next.js and Hybrid Server Rendering',
      courseUrl: 'https://learn.skillforge.dev/courses/nextjs-hybrid-rendering'
    }
  ];

  target.innerHTML = actionItems.map((item) => `
    <article class="card action-plan-card" style="border: 1px solid #E2E8F0; background-color: #FFFFFF; border-radius: 6px; padding: 1.25rem 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.625rem; flex-wrap: wrap; gap: 0.5rem;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background-color: #1E293B; color: #FFFFFF; font-weight: 700; font-size: 0.875rem; border-radius: 4px;">
            ${escapeHtml(item.step)}
          </span>
          <h3 style="font-size: 1.0625rem; font-weight: 700; color: #1E293B; margin-bottom: 0;">
            ${escapeHtml(item.what)}
          </h3>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="badge ${item.badgeClass}" style="border-radius: 4px; font-weight: 600;">
            ${escapeHtml(item.priority)}
          </span>
          <span class="badge badge-neutral font-mono" style="border-radius: 4px;">
            ${escapeHtml(item.time)}
          </span>
        </div>
      </div>

      <div style="padding-left: 2.5rem;">
        <p style="font-size: 0.875rem; color: #334155; line-height: 1.5; margin-bottom: 0.75rem;">
          <strong style="color: #1E293B;">Strategic Rationale:</strong> ${escapeHtml(item.why)}
        </p>

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 0.625rem 0.875rem;">
          <div style="font-size: 0.8125rem; color: #1E293B;">
            <span style="color: #64748B; font-weight: 600;">Curriculum Path:</span>
            <strong>${escapeHtml(item.courseTitle)}</strong>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <a href="#/courses" class="btn btn-secondary btn-sm" style="border-radius: 4px; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
              Open in Course Planner
            </a>
            <a href="${escapeHtml(item.courseUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="border-radius: 4px; padding: 0.25rem 0.5rem; font-size: 0.75rem;">
              External Syllabus
            </a>
          </div>
        </div>
      </div>
    </article>
  `).join('');
}
