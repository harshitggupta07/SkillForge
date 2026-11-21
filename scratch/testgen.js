const { AssessmentEngine } = require('../api/assessment-engine.js');
try {
  const test = AssessmentEngine.generateDiagnosticTest({skills: []}, 'full_stack_dev');
  console.log('Generated test with', test.questions.length, 'questions');
} catch(e) {
  console.error('Error:', e.message);
}
