/**
 * SkillForge Data Layer - Technical Competency Analysis Engine
 * Module: api/analysis-engine.js
 *
 * Cross-references candidate CV claims against empirical assessment scores,
 * benchmark thresholds, and industry market telemetry to produce actionable
 * readiness evaluations and targeted learning recommendations.
 */

import {
  ROLE_BENCHMARKS,
  CURATED_COURSES,
  MARKET_TRENDS,
  SKILLS_TAXONOMY
} from '../db/seed-data.js';

/**
 * Standard Design System Palette Constants.
 */
export const DESIGN_PALETTE = Object.freeze({
  white: '#FFFFFF',
  lightGray: '#F5F6F8',
  slateGray: '#64748B',
  darkSlate: '#334155',
  deepNavy: '#1E293B',
  forestGreen: '#2D6A4F',
  slateBlue: '#3B82F6',
  amber: '#D97706',
  errorRed: '#DC2626'
});

/**
 * Enterprise Analysis Engine for candidate evaluation, gap identification,
 * and market alignment scoring.
 */
export class AnalysisEngine {
  /**
   * Initializes the analysis engine with reference data dependencies.
   * @param {Object} [options] - Configuration overrides.
   */
  constructor(options = {}) {
    this.benchmarks = options.benchmarks || ROLE_BENCHMARKS;
    this.courses = options.courses || CURATED_COURSES;
    this.trends = options.trends || MARKET_TRENDS;
    this.taxonomy = options.taxonomy || SKILLS_TAXONOMY;
  }

  /**
   * Static alias for analyzeStrengthsWeaknesses.
   */
  static analyzeStrengthsWeaknesses(cvProfile, testScores, targetRole, roleBenchmarks = null) {
    const engine = new AnalysisEngine({ benchmarks: roleBenchmarks });
    return engine.analyzeStrengthsWeaknesses(cvProfile, testScores, targetRole, roleBenchmarks);
  }

  /**
   * Cross-references CV claims against empirical diagnostic test scores for a target role.
   * Calculates overall readiness score, classifies readiness level, and categorizes competencies.
   *
   * @param {Object} cvProfile - Parsed CV profile containing extracted skills.
   * @param {Object} testScores - Diagnostic test results (per-skill scores or score map).
   * @param {string|Object} targetRole - Target role key or role benchmark definition.
   * @param {Object} [roleBenchmarks] - Role benchmarks dictionary (defaults to reference benchmarks).
   * @returns {Object} Comprehensive strengths and weaknesses analysis report.
   */
  analyzeStrengthsWeaknesses(cvProfile, testScores, targetRole, roleBenchmarks = null) {
    const benchmarksDict = roleBenchmarks || this.benchmarks;
    const benchmark = this._resolveBenchmark(targetRole, benchmarksDict);

    if (!benchmark) {
      throw new Error(`Target role benchmark not found for: ${JSON.stringify(targetRole)}`);
    }

    const cvSkillsMap = new Map();
    if (cvProfile && Array.isArray(cvProfile.skills)) {
      cvProfile.skills.forEach((skill) => {
        if (skill.skill_id) {
          cvSkillsMap.set(skill.skill_id, skill);
        }
        if (skill.skill_name) {
          cvSkillsMap.set(skill.skill_name.toLowerCase(), skill);
        }
      });
    }

    const verifiedStrengths = [];
    const skillGaps = [];
    const niceToHaveMatches = [];

    let weightedScoreAccumulator = 0;
    let totalWeightAccumulator = 0;

    for (const req of benchmark.required_skills) {
      const skillId = req.skill_id;
      const minScore = req.min_score;
      const weight = typeof req.weight === 'number' ? req.weight : 0.20;
      totalWeightAccumulator += weight;

      const skillMeta = this._getSkillMetadata(skillId);
      const skillName = skillMeta ? skillMeta.name : skillId;

      const cvClaim = cvSkillsMap.get(skillId) || cvSkillsMap.get(skillName.toLowerCase());
      const testScore = this._extractSkillScore(testScores, skillId);

      if (testScore !== null && testScore !== undefined) {
        if (testScore >= minScore) {
          verifiedStrengths.push({
            skill_id: skillId,
            skill_name: skillName,
            test_score: testScore,
            benchmark_min: minScore,
            weight,
            cv_present: Boolean(cvClaim),
            confidence: cvClaim ? cvClaim.confidence : 'verified',
            status: 'verified_strength',
            context_snippet: cvClaim ? cvClaim.context_snippet : null
          });
          const performanceRatio = Math.min(1.2, testScore / minScore);
          weightedScoreAccumulator += performanceRatio * weight * 85;
        } else {
          const deficit = minScore - testScore;
          const severity = deficit >= 20 ? 'Critical' : 'Moderate';
          const reason = cvClaim
            ? `Assessed score of ${testScore}% is ${deficit}% below the required benchmark (${minScore}%) despite CV claim.`
            : `Assessed score of ${testScore}% does not meet the benchmark minimum of ${minScore}%.`;

          skillGaps.push({
            skill_id: skillId,
            skill_name: skillName,
            test_score: testScore,
            benchmark_min: minScore,
            deficit,
            weight,
            gap_severity: severity,
            cv_present: Boolean(cvClaim),
            reason,
            status: 'skill_gap'
          });
          const partialRatio = testScore / minScore;
          weightedScoreAccumulator += partialRatio * weight * 85;
        }
      } else {
        if (cvClaim) {
          skillGaps.push({
            skill_id: skillId,
            skill_name: skillName,
            test_score: null,
            benchmark_min: minScore,
            deficit: minScore,
            weight,
            gap_severity: 'Moderate',
            cv_present: true,
            reason: `Claimed on CV (${cvClaim.confidence} confidence) but lacks empirical diagnostic verification.`,
            status: 'unverified_claim'
          });
          weightedScoreAccumulator += 0.55 * weight * 85;
        } else {
          skillGaps.push({
            skill_id: skillId,
            skill_name: skillName,
            test_score: 0,
            benchmark_min: minScore,
            deficit: minScore,
            weight,
            gap_severity: 'Critical',
            cv_present: false,
            reason: `Required core competency not found on CV and not demonstrated in assessment.`,
            status: 'missing_competency'
          });
        }
      }
    }

    let niceToHaveBonus = 0;
    if (Array.isArray(benchmark.nice_to_have_skills)) {
      for (const niceId of benchmark.nice_to_have_skills) {
        const meta = this._getSkillMetadata(niceId);
        const name = meta ? meta.name : niceId;
        const cvClaim = cvSkillsMap.get(niceId) || cvSkillsMap.get(name.toLowerCase());
        const score = this._extractSkillScore(testScores, niceId);

        if (score !== null && score >= 65) {
          niceToHaveMatches.push({
            skill_id: niceId,
            skill_name: name,
            score,
            status: 'verified'
          });
          niceToHaveBonus += 3.75;
        } else if (cvClaim) {
          niceToHaveMatches.push({
            skill_id: niceId,
            skill_name: name,
            score: null,
            status: 'claimed_on_cv'
          });
          niceToHaveBonus += 2.5;
        }
      }
    }

    const normalizedBase = totalWeightAccumulator > 0
      ? (weightedScoreAccumulator / totalWeightAccumulator)
      : 0;

    const rawReadinessScore = Math.min(100, Math.round(normalizedBase + Math.min(15, niceToHaveBonus)));
    const overallReadinessScore = Math.max(0, rawReadinessScore);

    let readinessLevel;
    if (overallReadinessScore >= 85) {
      readinessLevel = 'Job Ready';
    } else if (overallReadinessScore >= 70) {
      readinessLevel = 'Near Ready';
    } else if (overallReadinessScore >= 50) {
      readinessLevel = 'Significant Gaps';
    } else {
      readinessLevel = 'Major Development Needed';
    }

    const summary = this._generateAnalysisSummary(
      benchmark.role_title,
      overallReadinessScore,
      readinessLevel,
      verifiedStrengths,
      skillGaps
    );

    return {
      target_role: benchmark.role_title,
      role_key: benchmark.role_key || targetRole,
      overall_readiness_score: overallReadinessScore,
      readiness_level: readinessLevel,
      verified_strengths: verifiedStrengths,
      skill_gaps: skillGaps,
      nice_to_have_matches: niceToHaveMatches,
      summary
    };
  }

  /**
   * Static alias for generateCourseRecommendations.
   */
  static generateCourseRecommendations(analysisReport, courses = null, marketTrends = null) {
    const engine = new AnalysisEngine({ courses, trends: marketTrends });
    return engine.generateCourseRecommendations(analysisReport, courses, marketTrends);
  }

  /**
   * Generates prioritized course recommendations targeting skill gaps and future market demands.
   *
   * @param {Object} analysisReport - Report produced by analyzeStrengthsWeaknesses.
   * @param {Array<Object>} [courses] - Curated courses catalogue (defaults to reference courses).
   * @param {Array<Object>} [marketTrends] - Market telemetry records (defaults to reference trends).
   * @returns {Object} Segregated gap fixing and future readiness learning paths.
   */
  generateCourseRecommendations(analysisReport, courses = null, marketTrends = null) {
    const courseList = Array.isArray(courses) ? courses : this.courses;
    const trendList = Array.isArray(marketTrends) ? marketTrends : this.trends;

    const gapSkillsSet = new Map();
    if (analysisReport && Array.isArray(analysisReport.skill_gaps)) {
      analysisReport.skill_gaps.forEach((gap) => {
        gapSkillsSet.set(gap.skill_id, gap);
      });
    }

    const gapFixingCourses = [];
    const futureReadinessCourses = [];
    const seenGapCourseIds = new Set();
    const seenFutureCourseIds = new Set();

    for (const course of courseList) {
      const matchingGaps = [];
      if (Array.isArray(course.skill_ids)) {
        for (const skillId of course.skill_ids) {
          if (gapSkillsSet.has(skillId)) {
            matchingGaps.push(gapSkillsSet.get(skillId));
          }
        }
      }

      if (matchingGaps.length > 0 && !seenGapCourseIds.has(course.id)) {
        seenGapCourseIds.add(course.id);

        const hasCritical = matchingGaps.some((g) => g.gap_severity === 'Critical');
        const priority = hasCritical ? 'High' : 'Medium';

        const matchedNames = matchingGaps.map((g) => g.skill_name || g.skill_id).join(', ');
        const reason = `Addresses verified competency deficit in ${matchedNames} required for ${analysisReport.target_role || 'target role'} benchmark.`;

        gapFixingCourses.push({
          course,
          reason,
          priority,
          matched_skills: matchingGaps.map((g) => g.skill_id)
        });
      }
    }

    const risingTrends = trendList.filter((t) => t.trend_direction === 'Rising');

    for (const course of courseList) {
      if (course.category === 'future-readiness' && !seenFutureCourseIds.has(course.id)) {
        const matchedTrend = risingTrends.find((trend) => {
          if (!Array.isArray(trend.key_skills)) return false;
          return trend.key_skills.some((ts) => {
            const normalizedTrendSkill = ts.toLowerCase();
            return (
              (course.skill_ids && course.skill_ids.some((cs) => cs.toLowerCase().includes(normalizedTrendSkill))) ||
              (course.relevance_tags && course.relevance_tags.some((rt) => rt.toLowerCase().includes(normalizedTrendSkill))) ||
              course.title.toLowerCase().includes(normalizedTrendSkill)
            );
          });
        });

        const priority = matchedTrend && matchedTrend.demand_score >= 92 ? 'High' : 'Medium';
        const trendContext = matchedTrend
          ? `${matchedTrend.domain} (${matchedTrend.year_over_year_growth} YoY growth, demand score ${matchedTrend.demand_score}/100)`
          : 'high-growth market segments';

        const reason = `Aligns with advancing market demand in ${trendContext} to enhance forward technical viability.`;

        seenFutureCourseIds.add(course.id);
        futureReadinessCourses.push({
          course,
          reason,
          priority,
          matched_skills: course.skill_ids || []
        });
      }
    }

    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
    gapFixingCourses.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
    futureReadinessCourses.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    return {
      gap_fixing_courses: gapFixingCourses,
      future_readiness_courses: futureReadinessCourses
    };
  }

  /**
   * Static alias for compareWithMarket.
   */
  static compareWithMarket(cvProfile, testScores, marketTrends = null) {
    const engine = new AnalysisEngine({ trends: marketTrends });
    return engine.compareWithMarket(cvProfile, testScores, marketTrends);
  }

  /**
   * Compares candidate technical profile and scores against active market trends.
   * Identifies high-demand competencies held, missing market skills, and legacy risk factors.
   *
   * @param {Object} cvProfile - Parsed CV profile.
   * @param {Object} testScores - Diagnostic test results.
   * @param {Array<Object>} [marketTrends] - Market trend records.
   * @returns {Object} Market alignment report with coverage score and breakdown.
   */
  compareWithMarket(cvProfile, testScores, marketTrends = null) {
    const trendList = Array.isArray(marketTrends) ? marketTrends : this.trends;
    const candidateSkills = new Set();

    if (cvProfile && Array.isArray(cvProfile.skills)) {
      cvProfile.skills.forEach((s) => {
        if (s.skill_id) candidateSkills.add(s.skill_id.toLowerCase());
        if (s.skill_name) candidateSkills.add(s.skill_name.toLowerCase());
      });
    }

    if (testScores) {
      if (testScores.per_skill_scores) {
        Object.keys(testScores.per_skill_scores).forEach((sid) => {
          if (testScores.per_skill_scores[sid].pct >= 60) {
            candidateSkills.add(sid.toLowerCase());
            const meta = this._getSkillMetadata(sid);
            if (meta) candidateSkills.add(meta.name.toLowerCase());
          }
        });
      } else {
        Object.keys(testScores).forEach((sid) => {
          if (typeof testScores[sid] === 'number' && testScores[sid] >= 60) {
            candidateSkills.add(sid.toLowerCase());
            const meta = this._getSkillMetadata(sid);
            if (meta) candidateSkills.add(meta.name.toLowerCase());
          }
        });
      }
    }

    const trendingSkillsHeld = [];
    const trendingSkillsMissing = [];
    const riskAreas = [];

    let risingDemandMatches = 0;
    let risingDemandTotal = 0;

    for (const trend of trendList) {
      if (trend.trend_direction === 'Rising') {
        if (Array.isArray(trend.key_skills)) {
          for (const keySkill of trend.key_skills) {
            risingDemandTotal++;
            const hasSkill = this._hasSkillMatch(candidateSkills, keySkill);
            if (hasSkill) {
              risingDemandMatches++;
              if (!trendingSkillsHeld.some((item) => item.skill === keySkill)) {
                trendingSkillsHeld.push({
                  skill: keySkill,
                  domain: trend.domain,
                  demand_score: trend.demand_score,
                  growth: trend.year_over_year_growth
                });
              }
            } else {
              if (!trendingSkillsMissing.some((item) => item.skill === keySkill)) {
                trendingSkillsMissing.push({
                  skill: keySkill,
                  domain: trend.domain,
                  demand_score: trend.demand_score,
                  growth: trend.year_over_year_growth
                });
              }
            }
          }
        }
      } else if (trend.trend_direction === 'Declining') {
        const domainMatch = candidateSkills.has(trend.domain.toLowerCase());
        let matchedLegacySkills = [];

        if (Array.isArray(trend.key_skills)) {
          matchedLegacySkills = trend.key_skills.filter((ks) =>
            this._hasSkillMatch(candidateSkills, ks)
          );
        }

        if (domainMatch || matchedLegacySkills.length > 0) {
          riskAreas.push({
            technology: trend.domain,
            growth: trend.year_over_year_growth,
            demand_score: trend.demand_score,
            warning: `Technology indicates negative industry momentum (${trend.year_over_year_growth} YoY). Enterprise codebases are actively transitioning toward modern alternatives.`
          });
        }
      }
    }

    const baseCoverage = risingDemandTotal > 0
      ? (risingDemandMatches / risingDemandTotal) * 100
      : 50;

    const riskPenalty = riskAreas.length * 8;
    const overallAlignmentScore = Math.max(0, Math.min(100, Math.round(baseCoverage - riskPenalty)));

    let marketSummary = `Candidate demonstrates alignment with ${trendingSkillsHeld.length} rising market competencies, including ${trendingSkillsHeld.slice(0, 3).map((s) => s.skill).join(', ') || 'none recorded'}. `;
    if (trendingSkillsMissing.length > 0) {
      marketSummary += `Identified ${trendingSkillsMissing.length} high-growth skills absent from the current profile, notably in ${trendingSkillsMissing.slice(0, 2).map((s) => s.domain).join(' and ')}. `;
    }
    if (riskAreas.length > 0) {
      marketSummary += `Caution: identified reliance on declining technologies (${riskAreas.map((r) => r.technology).join(', ')}). `;
    }
    marketSummary += `Overall market alignment evaluated at ${overallAlignmentScore}/100.`;

    return {
      overall_alignment_score: overallAlignmentScore,
      trending_skills_held: trendingSkillsHeld,
      trending_skills_missing: trendingSkillsMissing,
      risk_areas: riskAreas,
      summary: marketSummary
    };
  }

  // Legacy helper alias for backward compatibility

  static generateProfileReport(user, cvProfile = null, assessments = [], roleBenchmarks = ROLE_BENCHMARKS) {
    const engine = new AnalysisEngine({ benchmarks: roleBenchmarks });
    const targetRoleKey = (user.target_role || 'junior_frontend_dev')
      .toLowerCase()
      .replace(/[\s-]+/g, '_');

    // Aggregate diagnostic assessment scores
    const assessedSkillScores = {};
    for (const asm of assessments) {
      if (asm.results && asm.results.per_skill_scores) {
        for (const [skillId, data] of Object.entries(asm.results.per_skill_scores)) {
          const pct = typeof data === 'object' && data !== null ? (data.pct ?? 0) : Number(data);
          assessedSkillScores[skillId] = pct;
        }
      }
      if (asm.results && asm.results.strengths) {
        for (const str of asm.results.strengths) {
          assessedSkillScores[str.skill_id] = Math.max(assessedSkillScores[str.skill_id] || 0, str.percentage || 80);
        }
      }
      if (asm.results && asm.results.weaknesses) {
        for (const w of asm.results.weaknesses) {
          assessedSkillScores[w.skill_id] = Math.min(assessedSkillScores[w.skill_id] || 100, w.percentage || 45);
        }
      }
    }

    return engine.analyzeStrengthsWeaknesses(cvProfile, assessedSkillScores, targetRoleKey, roleBenchmarks);
  }

  static getCourseRecommendations(user, cvProfile = null, assessments = [], courses = null) {
    const report = AnalysisEngine.generateProfileReport(user, cvProfile, assessments);
    return AnalysisEngine.generateCourseRecommendations(report, courses);
  }

  static getMarketAlignment(user, cvProfile = null, marketTrends = null) {
    return AnalysisEngine.compareWithMarket(cvProfile, null, marketTrends);
  }

  // Internal Helper Methods

  _resolveBenchmark(targetRole, benchmarksDict) {
    if (typeof targetRole === 'object' && targetRole !== null && Array.isArray(targetRole.required_skills)) {
      return targetRole;
    }

    if (typeof targetRole === 'string') {
      if (benchmarksDict[targetRole]) {
        return { ...benchmarksDict[targetRole], role_key: targetRole };
      }

      const targetLower = targetRole.toLowerCase().trim();
      for (const [key, b] of Object.entries(benchmarksDict)) {
        if (
          key.toLowerCase() === targetLower ||
          (b.role_title && b.role_title.toLowerCase() === targetLower)
        ) {
          return { ...b, role_key: key };
        }
      }

      for (const [key, b] of Object.entries(benchmarksDict)) {
        if (
          key.toLowerCase().includes(targetLower) ||
          (b.role_title && b.role_title.toLowerCase().includes(targetLower))
        ) {
          return { ...b, role_key: key };
        }
      }
    }

    const firstKey = Object.keys(benchmarksDict)[0];
    return firstKey ? { ...benchmarksDict[firstKey], role_key: firstKey } : null;
  }

  _extractSkillScore(testScores, skillId) {
    if (!testScores) return null;

    if (testScores.per_skill_scores && testScores.per_skill_scores[skillId]) {
      return typeof testScores.per_skill_scores[skillId].pct === 'number'
        ? testScores.per_skill_scores[skillId].pct
        : null;
    }

    if (typeof testScores[skillId] === 'number') {
      return testScores[skillId];
    }

    const meta = this._getSkillMetadata(skillId);
    if (meta && typeof testScores[meta.name] === 'number') {
      return testScores[meta.name];
    }

    return null;
  }

  _hasSkillMatch(candidateSkills, targetSkill) {
    const target = targetSkill.toLowerCase();
    if (candidateSkills.has(target)) return true;
    for (const skill of candidateSkills) {
      if (skill.includes(target) || target.includes(skill)) return true;
    }
    return false;
  }

  _getSkillMetadata(skillId) {
    return this.taxonomy.find((s) => s.id === skillId) || null;
  }

  _generateAnalysisSummary(roleTitle, score, level, strengths, gaps) {
    const strengthCount = strengths.length;
    const gapCount = gaps.length;
    const criticalGaps = gaps.filter((g) => g.gap_severity === 'Critical');

    let text = `Candidate evaluated against ${roleTitle} benchmark. Readiness score is ${score}% (${level}). `;
    text += `Identified ${strengthCount} verified technical strengths`;

    if (strengthCount > 0) {
      const topStrengths = strengths.slice(0, 3).map((s) => `${s.skill_name} (${s.test_score}%)`).join(', ');
      text += ` including ${topStrengths}. `;
    } else {
      text += '. ';
    }

    if (gapCount > 0) {
      text += `Identified ${gapCount} skill gaps requiring development`;
      if (criticalGaps.length > 0) {
        const criticalNames = criticalGaps.map((g) => g.skill_name).join(', ');
        text += `, with critical priority on ${criticalNames}.`;
      } else {
        text += '.';
      }
    } else {
      text += 'No critical benchmark skill gaps identified.';
    }

    return text;
  }
}
