/**
 * SkillForge Data Layer - Technical Assessment and Diagnostic Engine
 * Module: api/assessment-engine.js
 *
 * Generates personalized diagnostic assessments calibrated to candidate CV claims
 * and target role benchmarks. Evaluates answers, provides skill and difficulty
 * breakdowns, and implements dynamic difficulty adaptation.
 */

import {
  DIAGNOSTIC_QUESTIONS,
  ROLE_BENCHMARKS
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
 * Technical Assessment Engine.
 * Manages question selection, test generation, evaluation, and adaptive calibration.
 */
export class AssessmentEngine {
  /**
   * Initializes the assessment engine with question repositories and benchmark criteria.
   * @param {Object} [options] - Initial configuration options.
   */
  constructor(options = {}) {
    this.questionBank = options.questionBank || DIAGNOSTIC_QUESTIONS;
    this.benchmarks = options.benchmarks || ROLE_BENCHMARKS;
  }

  /**
   * Static alias for generateDiagnosticTest.
   */
  static generateDiagnosticTest(
    cvProfile = null,
    targetRole = 'full_stack_dev',
    diagnosticQuestions = null,
    roleBenchmarks = null,
    options = {}
  ) {
    const engine = new AssessmentEngine({ questionBank: diagnosticQuestions, benchmarks: roleBenchmarks });
    return engine.generateDiagnosticTest(cvProfile, targetRole, diagnosticQuestions, roleBenchmarks, options);
  }

  /**
   * Generates a personalized diagnostic technical assessment based on candidate CV claims
   * and target role expectations.
   *
   * Personalization rules:
   * - If candidate CV claims a skill (e.g., Python), includes harder (Intermediate/Advanced) questions
   *   to empirically verify claimed depth.
   * - If target role is Senior Backend, heavily weights Backend Development and System Design.
   *
   * @param {Object} cvProfile - Parsed CV profile containing candidate skill records.
   * @param {string|Object} targetRole - Target engineering role identifier or benchmark object.
   * @param {Object|Array} [diagnosticQuestions] - Question repository (defaults to reference bank).
   * @param {Object} [roleBenchmarks] - Role benchmarks dictionary (defaults to reference benchmarks).
   * @param {Object} [options] - Configuration parameters (num_questions, difficulty_mix, focus_areas).
   * @returns {Object} Structured test object containing questions and generation metadata.
   */
  generateDiagnosticTest(
    cvProfile = null,
    targetRole = 'full_stack_dev',
    diagnosticQuestions = null,
    roleBenchmarks = null,
    options = {}
  ) {
    const rawQuestions = diagnosticQuestions || this.questionBank;
    const benchmarksDict = roleBenchmarks || this.benchmarks;
    const allQuestions = this._flattenQuestionBank(rawQuestions);

    if (allQuestions.length === 0) {
      throw new Error('No diagnostic questions available in question bank.');
    }

    const numQuestions = Number(options.num_questions || options.question_count) > 0
      ? Number(options.num_questions || options.question_count)
      : 20;

    const difficultyMix = options.difficulty_mix || {
      Beginner: 0.25,
      Intermediate: 0.50,
      Advanced: 0.25
    };

    const focusAreas = Array.isArray(options.focus_areas) ? options.focus_areas : [];

    const claimedSkills = new Set();
    const highConfidenceSkills = new Set();

    if (cvProfile && Array.isArray(cvProfile.skills)) {
      cvProfile.skills.forEach((s) => {
        if (typeof s === 'string') {
          const clean = s.trim().toLowerCase();
          claimedSkills.add(clean);
          claimedSkills.add(`skill_${clean.replace(/[^a-z0-9]/g, '_')}`);
        } else if (typeof s === 'object' && s !== null) {
          if (s.skill_id) claimedSkills.add(s.skill_id.toLowerCase());
          if (s.skill_name) claimedSkills.add(s.skill_name.toLowerCase());
          if (s.confidence === 'high') {
            if (s.skill_id) highConfidenceSkills.add(s.skill_id.toLowerCase());
            if (s.skill_name) highConfidenceSkills.add(s.skill_name.toLowerCase());
          }
        }
      });
    }

    const benchmark = this._resolveBenchmark(targetRole, benchmarksDict);
    const roleTitle = benchmark ? benchmark.role_title : String(targetRole);
    const categoryWeights = this._calculateCategoryWeights(roleTitle, benchmark, focusAreas);
    // Determine if candidate claims Python skill for personalization
    const claimsPython = claimedSkills.has('skill_python') || claimedSkills.has('python');
    

    const scoredQuestions = allQuestions.map((q) => {
      let priorityScore = 1.0;

      const categoryWeight = categoryWeights[q.category] || 1.0;
      priorityScore *= categoryWeight;

      const matchesClaimedSkill = Array.isArray(q.skill_tags) && q.skill_tags.some((st) =>
        claimedSkills.has(st.toLowerCase())
      );

      const isPythonQuestion = Array.isArray(q.skill_tags) && q.skill_tags.some((st) =>
        st.toLowerCase().includes('python')
      );
      // Determine if candidate claims Python skill for personalization
    const claimsPython = claimedSkills.has('skill_python') || claimedSkills.has('python');


      if (claimsPython && isPythonQuestion) {
        if (q.difficulty === 'Advanced') {
          priorityScore *= 3.0;
        } else if (q.difficulty === 'Intermediate') {
          priorityScore *= 2.2;
        } else if (q.difficulty === 'Beginner') {
          priorityScore *= 0.5;
        }
      } else if (matchesClaimedSkill) {
        if (q.difficulty === 'Advanced' || q.difficulty === 'Intermediate') {
          priorityScore *= 1.8;
        } else {
          priorityScore *= 0.8;
        }
      }

      if (benchmark && Array.isArray(benchmark.required_skills)) {
        const isRequiredSkill = benchmark.required_skills.some((req) =>
          Array.isArray(q.skill_tags) && q.skill_tags.includes(req.skill_id)
        );
        if (isRequiredSkill) {
          priorityScore *= 2.5;
        }
      }

      if (focusAreas.length > 0) {
        const matchesFocus = focusAreas.some((fa) => {
          const lower = fa.toLowerCase();
          return (
            (q.category && q.category.toLowerCase().includes(lower)) ||
            (Array.isArray(q.skill_tags) && q.skill_tags.some((st) => st.toLowerCase().includes(lower)))
          );
        });
        if (matchesFocus) {
          priorityScore *= 10.0;
        } else {
          priorityScore *= 0.1;
        }
      }

      return {
        question: q,
        score: priorityScore
      };
    });

    const tiered = {
      Beginner: scoredQuestions.filter((item) => item.question.difficulty === 'Beginner'),
      Intermediate: scoredQuestions.filter((item) => item.question.difficulty === 'Intermediate'),
      Advanced: scoredQuestions.filter((item) => item.question.difficulty === 'Advanced')
    };

    Object.keys(tiered).forEach((diff) => {
      tiered[diff].sort((a, b) => b.score - a.score);
    });

    const targetBeginner = Math.round(numQuestions * (difficultyMix.Beginner || 0.25));
    const targetAdvanced = Math.round(numQuestions * (difficultyMix.Advanced || 0.25));
    const targetIntermediate = Math.max(0, numQuestions - targetBeginner - targetAdvanced);

    const targetCounts = {
      Beginner: targetBeginner,
      Intermediate: targetIntermediate,
      Advanced: targetAdvanced
    };

    const selectedQuestions = [];
    const selectedIds = new Set();

    Object.entries(targetCounts).forEach(([diff, targetCount]) => {
      const candidates = tiered[diff] || [];
      let count = 0;
      for (const item of candidates) {
        if (count >= targetCount) break;
        if (!selectedIds.has(item.question.id)) {
          selectedIds.add(item.question.id);
          selectedQuestions.push(item.question);
          count++;
        }
      }
    });

    if (selectedQuestions.length < numQuestions) {
      const remaining = scoredQuestions
        .filter((item) => !selectedIds.has(item.question.id))
        .sort((a, b) => b.score - a.score);

      for (const item of remaining) {
        if (selectedQuestions.length >= numQuestions) break;
        selectedIds.add(item.question.id);
        selectedQuestions.push(item.question);
      }
    }

    const finalQuestions = selectedQuestions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      options: [...q.options],
      category: q.category || 'General Engineering',
      difficulty: q.difficulty || 'Intermediate',
      skill_tags: Array.isArray(q.skill_tags) ? [...q.skill_tags] : [],
      correct_option_index: q.correct_option_index,
      explanation: q.explanation || ''
    }));

    const difficultyDistribution = { Beginner: 0, Intermediate: 0, Advanced: 0 };
    const categoryDistribution = {};

    finalQuestions.forEach((q) => {
      difficultyDistribution[q.difficulty] = (difficultyDistribution[q.difficulty] || 0) + 1;
      categoryDistribution[q.category] = (categoryDistribution[q.category] || 0) + 1;
    });

    const testId = `test_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      id: testId,
      target_role: roleTitle,
      questions: finalQuestions,
      metadata: {
        target_role: roleTitle,
        total_questions: finalQuestions.length,
        difficulty_distribution: difficultyDistribution,
        category_distribution: categoryDistribution,
        options: {
          num_questions: numQuestions,
          difficulty_mix: difficultyMix,
          focus_areas: focusAreas
        },
        personalization: {
          claims_python_hardened: Boolean(claimsPython),
          claimed_skills_count: claimedSkills.size,
          senior_backend_weighted: Boolean(/senior.*backend/i.test(roleTitle))
        },
        generated_at: new Date().toISOString()
      }
    };
  }

  /**
   * Static alias for scoreTest.
   */
  static scoreTest(test, answers) {
    const engine = new AssessmentEngine();
    return engine.scoreTest(test, answers);
  }

  /**
   * Evaluates assessment submission and calculates score summaries.
   */
  static scoreAssessment(test, answers = {}) {
    const engine = new AssessmentEngine();
    const scored = engine.scoreTest(test, answers);

    const strengths = [];
    const weaknesses = [];
    Object.entries(scored.per_skill_scores || {}).forEach(([skill_id, data]) => {
      if (data.pct >= 70) {
        strengths.push({ skill_id, percentage: data.pct, correct: data.correct, total: data.total });
      } else {
        weaknesses.push({ skill_id, percentage: data.pct, correct: data.correct, total: data.total });
      }
    });

    return {
      ...scored,
      score: scored.score_total,
      total_points: scored.total_questions,
      percentage: scored.score_percentage,
      passed: scored.score_percentage >= 70,
      strengths,
      weaknesses
    };
  }

  /**
   * Evaluates candidate responses against answer key.
   * Calculates overall accuracy, granular per-skill scores, difficulty performance,
   * and itemized review metadata.
   *
   * @param {Object} test - Test object returned by generateDiagnosticTest.
   * @param {Object|Array} answers - User submitted answers (object mapping id -> option index, or answer array).
   * @returns {Object} Comprehensive diagnostic scoring breakdown.
   */
  scoreTest(test, answers) {
    if (!test || !Array.isArray(test.questions)) {
      throw new Error('Invalid test object supplied for scoring.');
    }

    const answerMap = new Map();

    if (Array.isArray(answers)) {
      answers.forEach((entry) => {
        if (entry && entry.question_id !== undefined) {
          answerMap.set(entry.question_id, entry.selected_option_index ?? entry.answer_index);
        }
      });
    } else if (typeof answers === 'object' && answers !== null) {
      Object.entries(answers).forEach(([qId, val]) => {
        if (typeof val === 'object' && val !== null) {
          answerMap.set(qId, val.selected_option_index ?? val.answer_index);
        } else {
          answerMap.set(qId, val);
        }
      });
    }

    let scoreTotal = 0;
    const totalQuestions = test.questions.length;

    const skillTracker = {};
    const difficultyTracker = {
      Beginner: { correct: 0, total: 0 },
      Intermediate: { correct: 0, total: 0 },
      Advanced: { correct: 0, total: 0 }
    };
    const categoryTracker = {};
    const detailedResults = [];

    for (const q of test.questions) {
      const userSelected = answerMap.has(q.id) ? answerMap.get(q.id) : null;
      const isCorrect = userSelected !== null && Number(userSelected) === Number(q.correct_option_index);

      if (isCorrect) {
        scoreTotal++;
      }

      const diff = q.difficulty || 'Intermediate';
      if (!difficultyTracker[diff]) {
        difficultyTracker[diff] = { correct: 0, total: 0 };
      }
      difficultyTracker[diff].total++;
      if (isCorrect) {
        difficultyTracker[diff].correct++;
      }

      const cat = q.category || 'General';
      if (!categoryTracker[cat]) {
        categoryTracker[cat] = { correct: 0, total: 0 };
      }
      categoryTracker[cat].total++;
      if (isCorrect) {
        categoryTracker[cat].correct++;
      }

      if (Array.isArray(q.skill_tags)) {
        for (const skillId of q.skill_tags) {
          if (!skillTracker[skillId]) {
            skillTracker[skillId] = { correct: 0, total: 0 };
          }
          skillTracker[skillId].total++;
          if (isCorrect) {
            skillTracker[skillId].correct++;
          }
        }
      }

      detailedResults.push({
        question_id: q.id,
        question_text: q.question_text,
        user_answer_index: userSelected,
        correct_option_index: q.correct_option_index,
        is_correct: isCorrect,
        difficulty: q.difficulty,
        category: q.category,
        skill_tags: q.skill_tags || [],
        explanation: q.explanation
      });
    }

    const scorePercentage = totalQuestions > 0
      ? Math.round((scoreTotal / totalQuestions) * 100)
      : 0;

    const perSkillScores = {};
    Object.entries(skillTracker).forEach(([skillId, data]) => {
      perSkillScores[skillId] = {
        correct: data.correct,
        total: data.total,
        pct: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
      };
    });

    const difficultyBreakdown = {};
    Object.entries(difficultyTracker).forEach(([diff, data]) => {
      difficultyBreakdown[diff] = {
        correct: data.correct,
        total: data.total,
        pct: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
      };
    });

    const categoryBreakdown = {};
    Object.entries(categoryTracker).forEach(([cat, data]) => {
      categoryBreakdown[cat] = {
        correct: data.correct,
        total: data.total,
        pct: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
      };
    });

    return {
      score_total: scoreTotal,
      total_questions: totalQuestions,
      score_percentage: scorePercentage,
      per_skill_scores: perSkillScores,
      difficulty_breakdown: difficultyBreakdown,
      category_breakdown: categoryBreakdown,
      detailed_results: detailedResults
    };
  }

  /**
   * Static alias for adaptDifficulty.
   */
  static adaptDifficulty(currentCorrect, currentTotal) {
    const engine = new AssessmentEngine();
    return engine.adaptDifficulty(currentCorrect, currentTotal);
  }

  /**
   * Recommends the next difficulty level based on ongoing candidate accuracy ratio.
   * Implements adaptive branching calibration.
   *
   * @param {number} currentCorrect - Number of correct responses recorded so far.
   * @param {number} currentTotal - Total questions answered so far.
   * @returns {string} Recommended next tier: 'Beginner', 'Intermediate', or 'Advanced'.
   */
  adaptDifficulty(currentCorrect, currentTotal) {
    if (typeof currentTotal !== 'number' || currentTotal <= 0) {
      return 'Intermediate';
    }

    const correctCount = typeof currentCorrect === 'number' ? Math.max(0, currentCorrect) : 0;
    const ratio = correctCount / currentTotal;

    if (ratio >= 0.75) {
      return 'Advanced';
    }
    if (ratio >= 0.45) {
      return 'Intermediate';
    }
    return 'Beginner';
  }

  // Legacy helper aliases for backward compatibility

  static generateDiagnostic(options = {}) {
    const engine = new AssessmentEngine();
    const test = engine.generateDiagnosticTest(
      { skills: options.candidate_skills || [] },
      options.target_role || options.role || 'junior_frontend_dev',
      DIAGNOSTIC_QUESTIONS,
      ROLE_BENCHMARKS,
      {
        num_questions: options.question_count || options.num_questions || 20,
        focus_areas: options.focus_areas || options.candidate_skills || []
      }
    );

    return {
      id: test.id,
      user_id: options.user_id || 'anonymous',
      target_role: test.target_role,
      difficulty: options.difficulty || 'Intermediate',
      created_at: test.metadata?.generated_at || new Date().toISOString(),
      questions: test.questions,
      total_questions: test.questions.length,
      status: 'pending',
      metadata: test.metadata
    };
  }

  static evaluateSubmission(assessment, answers = {}) {
    const engine = new AssessmentEngine();
    return engine.scoreTest(assessment, answers);
  }

  // Internal Helper Methods

  _flattenQuestionBank(bank) {
    if (Array.isArray(bank)) {
      return bank;
    }

    if (typeof bank === 'object' && bank !== null) {
      const flattened = [];
      Object.entries(bank).forEach(([category, questions]) => {
        if (Array.isArray(questions)) {
          questions.forEach((q) => {
            flattened.push({
              ...q,
              category: q.category || category
            });
          });
        }
      });
      return flattened;
    }

    return [];
  }

  _resolveBenchmark(targetRole, benchmarksDict) {
    if (typeof targetRole === 'object' && targetRole !== null && Array.isArray(targetRole.required_skills)) {
      return targetRole;
    }

    if (typeof targetRole === 'string' && benchmarksDict) {
      if (benchmarksDict[targetRole]) {
        return benchmarksDict[targetRole];
      }

      const lower = targetRole.toLowerCase().trim();
      for (const [key, b] of Object.entries(benchmarksDict)) {
        if (
          key.toLowerCase() === lower ||
          (b.role_title && b.role_title.toLowerCase() === lower) ||
          key.toLowerCase().includes(lower) ||
          (b.role_title && b.role_title.toLowerCase().includes(lower))
        ) {
          return b;
        }
      }
    }

    return null;
  }

  _calculateCategoryWeights(roleTitle, benchmark, focusAreas) {
    const title = (roleTitle || '').toLowerCase();

    const weights = {
      'Programming Fundamentals': 1.0,
      'Frontend Development': 1.0,
      'Backend Development': 1.0,
      'Cloud and DevOps': 1.0,
      'Data and ML': 1.0,
      'AI and LLM': 1.0,
      'System Design': 1.0,
      'Security': 1.0
    };

    if (title.includes('senior') && title.includes('backend')) {
      weights['Backend Development'] = 3.5;
      weights['System Design'] = 3.2;
      weights['Cloud and DevOps'] = 2.0;
      weights['Security'] = 1.5;
      weights['Programming Fundamentals'] = 1.2;
      weights['Frontend Development'] = 0.2;
      weights['AI and LLM'] = 0.5;
      weights['Data and ML'] = 0.8;
      return weights;
    }

    if (title.includes('backend')) {
      weights['Backend Development'] = 3.2;
      weights['Programming Fundamentals'] = 2.5;
      weights['System Design'] = 1.8;
      weights['Cloud and DevOps'] = 1.5;
      weights['Frontend Development'] = 0.3;
      return weights;
    }

    if (title.includes('frontend')) {
      weights['Frontend Development'] = 3.8;
      weights['Programming Fundamentals'] = 2.4;
      weights['System Design'] = 1.4;
      weights['Security'] = 1.0;
      weights['Backend Development'] = 0.4;
      weights['Data and ML'] = 0.2;
      return weights;
    }

    if (title.includes('devops') || title.includes('cloud')) {
      weights['Cloud and DevOps'] = 3.8;
      weights['Security'] = 2.5;
      weights['System Design'] = 2.2;
      weights['Backend Development'] = 1.2;
      weights['Frontend Development'] = 0.2;
      return weights;
    }

    if (title.includes('ai') || title.includes('llm')) {
      weights['AI and LLM'] = 3.8;
      weights['Data and ML'] = 2.8;
      weights['Programming Fundamentals'] = 1.8;
      weights['System Design'] = 1.5;
      weights['Frontend Development'] = 0.2;
      return weights;
    }

    if (title.includes('data')) {
      weights['Data and ML'] = 3.8;
      weights['Backend Development'] = 2.0;
      weights['Programming Fundamentals'] = 1.8;
      weights['System Design'] = 1.5;
      return weights;
    }

    if (title.includes('security')) {
      weights['Security'] = 4.0;
      weights['Cloud and DevOps'] = 2.5;
      weights['Backend Development'] = 1.5;
      weights['System Design'] = 1.5;
      return weights;
    }

    if (title.includes('full stack') || title.includes('full_stack')) {
      weights['Frontend Development'] = 2.5;
      weights['Backend Development'] = 2.5;
      weights['System Design'] = 1.8;
      weights['Cloud and DevOps'] = 1.5;
      weights['Programming Fundamentals'] = 1.5;
      return weights;
    }

    return weights;
  }
}
