/**
 * SkillForge Data Layer - Export Service
 *
 * Provides client-side document and dataset export functionality across
 * multiple industry-standard formats: CSV, formatted JSON, and printable HTML.
 * All operations run purely within the browser and trigger automated downloads.
 */

/**
 * Technical data and report export utility class.
 */
export class ExportService {
  /**
   * Triggers a browser download for a given Blob object.
   * Creates an ephemeral anchor element, executes the download, and cleans up resources.
   * @param {Blob} blob - Binary large object to download.
   * @param {string} filename - Target filename for the saved file.
   * @returns {Blob} The downloaded blob instance.
   */
  static triggerDownload(blob, filename) {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      return blob;
    }

    const objectUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = objectUrl;
    downloadAnchor.download = filename;
    downloadAnchor.style.display = 'none';

    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      if (document.body.contains(downloadAnchor)) {
        document.body.removeChild(downloadAnchor);
      }
      URL.revokeObjectURL(objectUrl);
    }, 1000);

    return blob;
  }

  /**
   * Sanitizes a string for CSV cell inclusion according to RFC 4180.
   * @param {*} value - Raw cell value.
   * @returns {string} Escaped CSV string.
   */
  static _escapeCsvValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    let stringValue = '';
    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    // If cell contains commas, double quotes, or newlines, enclose in double quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Exports tabular dataset as a standard CSV file download.
   * @param {Array<object>|string} data - Array of row objects or raw CSV string.
   * @param {string} [filename='export.csv'] - Target filename.
   * @returns {Blob} Created Blob instance.
   */
  static exportAsCSV(data, filename = 'export.csv') {
    let csvContent = '';

    if (typeof data === 'string') {
      csvContent = data;
    } else if (Array.isArray(data) && data.length > 0) {
      // Collect unique keys across all records
      const columnHeaders = [];
      const headerSet = new Set();

      for (const item of data) {
        if (item && typeof item === 'object') {
          for (const key of Object.keys(item)) {
            if (!headerSet.has(key)) {
              headerSet.add(key);
              columnHeaders.push(key);
            }
          }
        }
      }

      // Build header row
      const headerRow = columnHeaders.map((col) => ExportService._escapeCsvValue(col)).join(',');

      // Build data rows
      const dataRows = data.map((item) => {
        if (!item || typeof item !== 'object') {
          return ExportService._escapeCsvValue(item);
        }
        return columnHeaders.map((col) => ExportService._escapeCsvValue(item[col])).join(',');
      });

      csvContent = [headerRow, ...dataRows].join('\r\n');
    } else if (Array.isArray(data) && data.length === 0) {
      csvContent = 'No data available\r\n';
    } else if (data && typeof data === 'object') {
      // Single object export
      const keys = Object.keys(data);
      const headers = keys.map((k) => ExportService._escapeCsvValue(k)).join(',');
      const values = keys.map((k) => ExportService._escapeCsvValue(data[k])).join(',');
      csvContent = `${headers}\r\n${values}\r\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return ExportService.triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  }

  /**
   * Exports data payload as a formatted JSON file download.
   * @param {*} data - Raw data structure to serialize.
   * @param {string} [filename='export.json'] - Target filename.
   * @returns {Blob} Created Blob instance.
   */
  static exportAsJSON(data, filename = 'export.json') {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    return ExportService.triggerDownload(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
  }

  /**
   * Generates and downloads a clean, printable HTML document representing arbitrary data.
   * Complies with the strict design system: Slate and Navy palette, border-radius 4px or 6px.
   * @param {object|Array} data - Data structure to render.
   * @param {string} [title='SkillForge Document'] - Report heading title.
   * @param {string} [filename='document.html'] - Target filename.
   * @returns {Blob} Created Blob instance.
   */
  static exportAsPrintableHTML(data, title = 'SkillForge Document', filename = 'document.html') {
    const generatedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let contentHtml = '';
    if (Array.isArray(data)) {
      if (data.length === 0) {
        contentHtml = '<p class="empty-state">No records available to display.</p>';
      } else {
        const columns = Object.keys(data[0] || {});
        contentHtml = `
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  ${columns.map((col) => `<th>${col.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.map((row) => `
                  <tr>
                    ${columns.map((col) => `<td>${ExportService._renderCellValue(row[col])}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } else if (data && typeof data === 'object') {
      contentHtml = `
        <div class="property-grid">
          ${Object.entries(data).map(([key, val]) => `
            <div class="property-item">
              <span class="property-key">${key.replace(/_/g, ' ')}</span>
              <span class="property-val">${ExportService._renderCellValue(val)}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      contentHtml = `<div class="plain-content"><pre>${String(data)}</pre></div>`;
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg-primary: #FFFFFF;
      --bg-secondary: #F5F6F8;
      --text-primary: #1E293B;
      --text-secondary: #334155;
      --text-muted: #64748B;
      --border-color: #CBD5E1;
      --accent-blue: #3B82F6;
      --success-green: #2D6A4F;
      --warning-amber: #D97706;
      --error-red: #DC2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      padding: 32px 16px;
      line-height: 1.5;
    }
    .document-container {
      max-width: 960px;
      margin: 0 auto;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 36px;
    }
    .document-header {
      border-bottom: 2px solid var(--text-primary);
      padding-bottom: 20px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header-titles h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }
    .header-titles p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .header-actions button {
      background: var(--text-primary);
      color: #FFFFFF;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 120ms ease;
    }
    .header-actions button:hover { opacity: 0.9; }
    .table-container {
      overflow-x: auto;
      margin-top: 16px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    .data-table th {
      background-color: var(--bg-secondary);
      color: var(--text-secondary);
      font-weight: 600;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-color);
    }
    .data-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
    }
    .data-table tr:last-child td { border-bottom: none; }
    .property-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .property-item {
      padding: 14px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
    }
    .property-key {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .property-val {
      font-size: 14px;
      color: var(--text-primary);
      font-weight: 500;
    }
    .empty-state {
      padding: 24px;
      text-align: center;
      color: var(--text-muted);
      font-size: 14px;
    }
    .document-footer {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .document-container { border: none; padding: 0; }
      .header-actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="document-container">
    <header class="document-header">
      <div class="header-titles">
        <h1>${title}</h1>
        <p>Generated: ${generatedDate} UTC</p>
      </div>
      <div class="header-actions">
        <button onclick="window.print()">Print Document</button>
      </div>
    </header>
    <main>
      ${contentHtml}
    </main>
    <footer class="document-footer">
      <span>SkillForge Technical Intelligence System</span>
      <span>Confidential Evaluation Record</span>
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    return ExportService.triggerDownload(blob, filename.endsWith('.html') ? filename : `${filename}.html`);
  }

  /**
   * Helper to format cell values for tabular preview.
   * @param {*} value - Raw value.
   * @returns {string} Formatted text or badges.
   */
  static _renderCellValue(value) {
    if (value === null || value === undefined) {
      return '<span style="color:#64748B;">None</span>';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Exports an engineering competency profile report as a comprehensive printable HTML document.
   * Includes candidate overview, verified strengths, identified skill gaps, and curated roadmap.
   * @param {object} report - Profile report data structure.
   * @param {string} [filename='profile-report.html'] - Target filename.
   * @returns {Blob} Created Blob instance.
   */
  static exportProfileReport(report, filename = 'profile-report.html') {
    const candidateName = report.user_name || report.name || 'Candidate';
    const targetRole = report.target_role || 'Software Engineering Role';
    const currentRole = report.current_role || 'Developer';
    const readinessScore = typeof report.readiness_score === 'number' ? report.readiness_score : 0;
    const generatedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const strengths = report.strengths || [];
    const gaps = report.gaps || report.weaknesses || [];
    const recommendations = report.recommended_courses || report.recommendations || [];

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Competency Evaluation Report: ${candidateName}</title>
  <style>
    :root {
      --bg-primary: #FFFFFF;
      --bg-secondary: #F5F6F8;
      --text-primary: #1E293B;
      --text-secondary: #334155;
      --text-muted: #64748B;
      --border-color: #CBD5E1;
      --accent-blue: #3B82F6;
      --success-green: #2D6A4F;
      --warning-amber: #D97706;
      --error-red: #DC2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      padding: 32px 16px;
      line-height: 1.5;
    }
    .report-card {
      max-width: 960px;
      margin: 0 auto;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 36px;
    }
    .header-bar {
      border-bottom: 2px solid var(--text-primary);
      padding-bottom: 24px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-title h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .header-title p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .print-button {
      background: var(--text-primary);
      color: #FFFFFF;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 120ms ease;
    }
    .print-button:hover { opacity: 0.9; }
    .summary-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }
    .profile-details {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .metric-box {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 20px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .metric-value {
      font-size: 40px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }
    .metric-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      margin-top: 8px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
    }
    .detail-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .detail-value {
      font-size: 14px;
      color: var(--text-primary);
      font-weight: 600;
      margin-top: 2px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 14px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 6px;
    }
    .section-block {
      margin-bottom: 32px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      overflow: hidden;
    }
    .data-table th {
      background-color: var(--bg-secondary);
      color: var(--text-secondary);
      font-weight: 600;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-color);
    }
    .data-table td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-primary);
    }
    .data-table tr:last-child td { border-bottom: none; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success { background: #E8F5E9; color: var(--success-green); border: 1px solid #C8E6C9; }
    .badge-warning { background: #FEF3C7; color: var(--warning-amber); border: 1px solid #FDE68A; }
    .badge-danger { background: #FEE2E2; color: var(--error-red); border: 1px solid #FECACA; }
    .report-footer {
      border-top: 1px solid var(--border-color);
      padding-top: 18px;
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .report-card { border: none; padding: 0; }
      .print-button { display: none; }
    }
  </style>
</head>
<body>
  <div class="report-card">
    <header class="header-bar">
      <div class="header-title">
        <h1>Competency Evaluation Report</h1>
        <p>Target Benchmark: ${targetRole}</p>
      </div>
      <button class="print-button" onclick="window.print()">Print Report</button>
    </header>

    <div class="summary-grid">
      <div class="profile-details">
        <div class="detail-item">
          <span class="detail-label">Candidate Name</span>
          <span class="detail-value">${candidateName}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Current Role</span>
          <span class="detail-value">${currentRole}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Target Role</span>
          <span class="detail-value">${targetRole}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Evaluation Date</span>
          <span class="detail-value">${generatedDate} UTC</span>
        </div>
      </div>
      <div class="metric-box">
        <div class="metric-value">${readinessScore}%</div>
        <div class="metric-label">Role Readiness Index</div>
      </div>
    </div>

    <div class="section-block">
      <h2 class="section-title">Verified Technical Competencies</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Competency</th>
            <th>Proficiency Level</th>
            <th>Verification Status</th>
          </tr>
        </thead>
        <tbody>
          ${strengths.length > 0 ? strengths.map((s) => `
            <tr>
              <td><strong>${typeof s === 'string' ? s : s.name || s.skill_id}</strong></td>
              <td>${typeof s === 'object' && s.level ? s.level : 'Proficient'}</td>
              <td><span class="badge badge-success">Verified</span></td>
            </tr>
          `).join('') : '<tr><td colspan="3" style="text-align:center;color:#64748B;">No confirmed competencies recorded.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section-block">
      <h2 class="section-title">Identified Gaps and Skill Deficits</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Required Skill</th>
            <th>Target Benchmark</th>
            <th>Current Level</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          ${gaps.length > 0 ? gaps.map((g) => `
            <tr>
              <td><strong>${typeof g === 'string' ? g : g.name || g.skill_id}</strong></td>
              <td>${typeof g === 'object' && g.benchmark ? g.benchmark + '%' : 'Threshold 70%'}</td>
              <td>${typeof g === 'object' && g.current_score !== undefined ? g.current_score + '%' : 'Unverified'}</td>
              <td><span class="badge badge-warning">${typeof g === 'object' && g.priority ? g.priority : 'High'}</span></td>
            </tr>
          `).join('') : '<tr><td colspan="4" style="text-align:center;color:#64748B;">No critical skill deficits identified. Candidate satisfies baseline benchmark.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="section-block">
      <h2 class="section-title">Recommended Remediation Curriculum</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>Course Module</th>
            <th>Provider</th>
            <th>Difficulty</th>
            <th>Target Competency</th>
          </tr>
        </thead>
        <tbody>
          ${recommendations.length > 0 ? recommendations.map((r) => `
            <tr>
              <td><strong>${r.title || r.course_title || 'Technical Course'}</strong></td>
              <td>${r.provider || 'SkillForge Curated'}</td>
              <td>${r.difficulty || 'Intermediate'}</td>
              <td>${r.target_skill || r.category || 'General'}</td>
            </tr>
          `).join('') : '<tr><td colspan="4" style="text-align:center;color:#64748B;">No remediation courses required.</td></tr>'}
        </tbody>
      </table>
    </div>

    <footer class="report-footer">
      <span>SkillForge Technical Intelligence Engine</span>
      <span>Document Ref: SF-EVAL-${Date.now().toString(36).toUpperCase()}</span>
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    return ExportService.triggerDownload(blob, filename.endsWith('.html') ? filename : `${filename}.html`);
  }

  /**
   * Exports document quiz assessment results and candidate breakdown as a printable HTML report.
   * Complies with the strict design system: Slate and Navy palette, border-radius 4px or 6px.
   * @param {object} quiz - Quiz metadata and question structure.
   * @param {object} attempt - Candidate attempt data containing scores and answers.
   * @param {string} [filename='quiz-results.html'] - Target filename.
   * @returns {Blob} Created Blob instance.
   */
  static exportQuizResults(quiz, attempt, filename = 'quiz-results.html') {
    const quizTitle = quiz.title || 'Technical Assessment';
    const totalQuestions = quiz.total_questions || (quiz.questions ? quiz.questions.length : 0);
    const score = attempt.score !== undefined ? attempt.score : 0;
    const percentage = attempt.percentage !== undefined ? attempt.percentage : Math.round((score / (totalQuestions || 1)) * 100);
    const submittedDate = attempt.submitted_at || new Date().toISOString();
    const candidateAnswers = attempt.answers || {};

    const passed = percentage >= 70;

    const questionsHtml = (quiz.questions || []).map((q, idx) => {
      const candidateSelected = Array.isArray(candidateAnswers) ? candidateAnswers[idx] : candidateAnswers[q.id];
      const isCorrect = candidateSelected === q.correct_option_index;

      return `
        <div class="question-card ${isCorrect ? 'card-correct' : 'card-incorrect'}">
          <div class="question-header">
            <span class="question-num">Question ${idx + 1} (${q.difficulty || 'Intermediate'})</span>
            <span class="badge ${isCorrect ? 'badge-success' : 'badge-danger'}">
              ${isCorrect ? 'Correct' : 'Incorrect'}
            </span>
          </div>
          <div class="question-body">
            <p class="question-text">${q.question_text}</p>
            <div class="options-list">
              ${(q.options || []).map((opt, optIdx) => {
                let optClass = 'opt-default';
                let indicator = '';

                if (optIdx === q.correct_option_index) {
                  optClass = 'opt-correct';
                  indicator = ' (Correct Answer)';
                } else if (optIdx === candidateSelected && !isCorrect) {
                  optClass = 'opt-selected-wrong';
                  indicator = ' (Your Answer)';
                }

                return `
                  <div class="option-item ${optClass}">
                    <span class="opt-letter">${String.fromCharCode(65 + optIdx)}.</span>
                    <span class="opt-label">${opt}${indicator}</span>
                  </div>
                `;
              }).join('')}
            </div>
            ${q.source_reference ? `
              <div class="citation-box">
                <span class="citation-label">Source Citation:</span> ${q.source_reference}
              </div>
            ` : ''}
            ${q.explanation ? `
              <div class="explanation-box">
                <span class="explanation-label">Technical Explanation:</span> ${q.explanation}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assessment Results: ${quizTitle}</title>
  <style>
    :root {
      --bg-primary: #FFFFFF;
      --bg-secondary: #F5F6F8;
      --text-primary: #1E293B;
      --text-secondary: #334155;
      --text-muted: #64748B;
      --border-color: #CBD5E1;
      --accent-blue: #3B82F6;
      --success-green: #2D6A4F;
      --warning-amber: #D97706;
      --error-red: #DC2626;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-secondary);
      color: var(--text-primary);
      padding: 32px 16px;
      line-height: 1.5;
    }
    .results-container {
      max-width: 960px;
      margin: 0 auto;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 36px;
    }
    .header-bar {
      border-bottom: 2px solid var(--text-primary);
      padding-bottom: 24px;
      margin-bottom: 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .header-title h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .header-title p {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .print-button {
      background: var(--text-primary);
      color: #FFFFFF;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
      transition: opacity 120ms ease;
    }
    .print-button:hover { opacity: 0.9; }
    .metrics-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .metric-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 18px;
      text-align: center;
    }
    .metric-number {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }
    .metric-sub {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-top: 6px;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-success { background: #E8F5E9; color: var(--success-green); border: 1px solid #C8E6C9; }
    .badge-danger { background: #FEE2E2; color: var(--error-red); border: 1px solid #FECACA; }
    .badge-warning { background: #FEF3C7; color: var(--warning-amber); border: 1px solid #FDE68A; }
    .question-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .card-correct { border-left: 4px solid var(--success-green); }
    .card-incorrect { border-left: 4px solid var(--error-red); }
    .question-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .question-num {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .question-text {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 16px;
    }
    .options-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 14px;
    }
    .option-item {
      display: flex;
      align-items: flex-start;
      padding: 10px 14px;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      font-size: 13px;
    }
    .opt-default { background: var(--bg-secondary); color: var(--text-secondary); }
    .opt-correct { background: #E8F5E9; border-color: #81C784; color: var(--success-green); font-weight: 600; }
    .opt-selected-wrong { background: #FEE2E2; border-color: #E57373; color: var(--error-red); font-weight: 600; }
    .opt-letter { font-weight: 700; margin-right: 8px; min-width: 18px; }
    .citation-box, .explanation-box {
      font-size: 12px;
      padding: 10px 14px;
      border-radius: 4px;
      margin-top: 8px;
    }
    .citation-box {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      color: var(--text-secondary);
    }
    .citation-label, .explanation-label {
      font-weight: 700;
      color: var(--text-primary);
    }
    .explanation-box {
      background: #E8F5E9;
      border: 1px solid #C8E6C9;
      color: #1B4D3E;
    }
    .results-footer {
      border-top: 1px solid var(--border-color);
      padding-top: 18px;
      margin-top: 36px;
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body { background: #FFFFFF; padding: 0; }
      .results-container { border: none; padding: 0; }
      .print-button { display: none; }
    }
  </style>
</head>
<body>
  <div class="results-container">
    <header class="header-bar">
      <div class="header-title">
        <h1>Assessment Score Report</h1>
        <p>Test Subject: ${quizTitle} | Submitted: ${submittedDate.replace('T', ' ').substring(0, 19)} UTC</p>
      </div>
      <button class="print-button" onclick="window.print()">Print Report</button>
    </header>

    <div class="metrics-summary">
      <div class="metric-card">
        <div class="metric-number">${score} / ${totalQuestions}</div>
        <div class="metric-sub">Points Scored</div>
      </div>
      <div class="metric-card">
        <div class="metric-number">${percentage}%</div>
        <div class="metric-sub">Performance Score</div>
      </div>
      <div class="metric-card">
        <div class="metric-number" style="font-size:24px;line-height:32px;">
          <span class="badge ${passed ? 'badge-success' : 'badge-warning'}">
            ${passed ? 'Benchmark Met' : 'Requires Review'}
          </span>
        </div>
        <div class="metric-sub">Outcome Status</div>
      </div>
      <div class="metric-card">
        <div class="metric-number">${totalQuestions}</div>
        <div class="metric-sub">Total Items</div>
      </div>
    </div>

    <main class="questions-section">
      ${questionsHtml}
    </main>

    <footer class="results-footer">
      <span>SkillForge Examination Proctor</span>
      <span>Result Verification ID: SF-RES-${Date.now().toString(36).toUpperCase()}</span>
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    return ExportService.triggerDownload(blob, filename.endsWith('.html') ? filename : `${filename}.html`);
  }
}

export default ExportService;
