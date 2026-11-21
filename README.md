# SkillForge

## Description
IT Competency Assessment, CV Gap Analysis, and Market-Aligned Course Planner

SkillForge provides an enterprise-grade evaluation platform for software engineers, IT professionals, students, and technical recruiters. It automates technical CV parsing, executes diagnostic competency benchmarks, cross-references candidate capabilities against role benchmarks, models market alignment trends, and constructs customized educational training tracks.

---

## Features

- **Profile Onboarding and CV Telemetry:**
  - Multi-step onboarding workflow supporting industry professionals and academic students.
  - Client-side drag-and-drop document parsing for PDF, DOCX, TXT, and Markdown files.
  - Automated skill extraction against a normalized taxonomy of 115+ IT skills, frameworks, and developer tools.
  - Confidence scoring and contextual phrase validation.

- **Diagnostic Assessments and Adaptive Testing:**
  - Role-calibrated diagnostic evaluations covering Frontend, Backend, DevOps, Data, Cloud, Security, and System Design.
  - Dynamic difficulty adaptation adjusting test complexity based on real-time performance.
  - Empirical verification of candidate claims with question-by-question scoring and rationale breakdowns.

- **Document Assessment Studio (Quiz Generator):**
  - Instant text segmentation and chunking for technical whitepapers, documentation, and architecture manuals.
  - Algorithmic multiple-choice question generation with distractors and source citations.
  - Optional Large Language Model (LLM) REST endpoint integration.

- **Competency Dashboard and Gap Analysis:**
  - Quantitative role readiness scoring comparing actual candidate performance against required standards.
  - Categorized breakdown of verified strengths, critical skill gaps, and secondary competencies.
  - Historical diagnostic attempt tracking and activity timelines.

- **Curated Course Curriculum Planning:**
  - Targeted gap-fixing recommendations directly addressing failed assessment items.
  - Future-readiness course planning aligned with high-growth industry architectures.
  - Interactive enrollment progress tracking, course completion telemetry, and estimated training hours.

- **Global IT Market Intelligence:**
  - Empirical demand telemetry analyzing rising and declining technical competencies.
  - Domain coverage readiness scoring across Cloud, AI/ML, Microservices, and Security.
  - Personalized action plans providing concrete technical milestones.

- **Administrative Console:**
  - Management interfaces for candidates, assessment question banks, courses, and market indicators.
  - In-place row editing, active status toggling, and multi-format CSV import and export.
  - Role-based access control protecting administrative endpoints.

- **Client-Side Export Service:**
  - Downloadable reports in CSV, formatted JSON, and printable HTML formats.
  - Self-contained styling suitable for archival and physical printouts.

---

## Quick Start / How to Run

SkillForge runs entirely in modern web browsers without external servers, node packages, or build compilers.

1. Clone or download the repository to your workstation.
2. Open `index.html` directly in any modern desktop web browser (Chrome, Edge, Firefox, or Safari).
   - Alternatively, serve using any lightweight static file server:
     ```bash
     python -m http.server 8000
     ```
     Then navigate to `http://localhost:8000` in your browser.

---

## Demo Credentials

The platform includes pre-seeded user accounts across multiple organizational roles. You can authenticate using the quick login buttons on the Sign In page or by entering the credentials below:

| Name | Email Address | Password | Role / Profile Type | Benchmark Target |
| :--- | :--- | :--- | :--- | :--- |
| Marcus Vance | admin@skillforge.dev | admin123 | System Administrator | Engineering Manager |
| David Chen | dev.employee@skillforge.dev | password | Industry Professional (Employee) | Senior Backend Dev |
| Aaliyah Patel | cs.student@skillforge.dev | password | Academic Student | Junior Frontend Dev |
| Elena Rostova | trainer@skillforge.dev | password | Technical Lead / Trainer | Staff Engineer |

---

## System Architecture

SkillForge is built on pure browser-native architectural standards:

1. **Client Storage Layer (`db/database.js`):**
   - Implements an IndexedDB storage engine (`SkillForgeDB`, version 1).
   - Encapsulates 10 distinct object stores: users, skills taxonomy, assessments, quizzes, quiz attempts, courses, documents, market trends, CV profiles, and course progress.
   - Provides transactional CRUD operations, multi-index queries, and automated initial seeding.

2. **Network Emulation Layer (`api/api-router.js`):**
   - Intercepts native browser `window.fetch` requests matching `/api/*`.
   - Simulates RESTful HTTP responses, status codes, and JSON payloads with zero network latency.
   - Generates and verifies HMAC-style JWT bearer tokens persisted across browser sessions.

3. **Single Page Application Routing (`js/router.js`):**
   - Hash-based navigation engine (`#/dashboard`, `#/assessments`, `#/courses`, `#/market-trends`, `#/admin`, `#/onboarding`, `#/login`, `#/register`, `#/privacy-policy`, `#/terms-and-conditions`).
   - Implements authentication guards, role validation (`admin`), and title synchronization.

4. **Design System (`css/main.css`):**
   - Clean, high-contrast palette: white (`#FFFFFF`), light gray (`#F5F6F8`), slate gray (`#64748B`), dark slate (`#334155`), deep navy (`#1E293B`), muted forest green (`#2D6A4F`), slate blue (`#3B82F6`), amber (`#D97706`), and error red (`#DC2626`).
   - Rectangular geometric controls (4px and 6px border radii). No pill buttons.
   - Fast UI transitions (maximum 150ms duration) without superfluous animations.

---

## Large Language Model (LLM) Configuration

The Document Quiz Studio (`api/quiz-generator.js`) operates by default in a deterministic offline rule-based mode. It can optionally be configured to delegate question synthesis to an external OpenAI-compatible or Google Gemini REST endpoint.

### Configuring External LLM Endpoints

To connect an external language model:

1. Open `api/api-router.js` or initialize `QuizGenerator` with your endpoint configuration:
   ```javascript
   import { QuizGenerator } from './api/quiz-generator.js';

   const quizGenerator = new QuizGenerator({
     llmEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
     apiKey: 'YOUR_API_KEY_HERE',
     defaultChunkSize: 800
   });
   ```

2. When making client requests to `/api/quizzes/generate`, pass the execution mode:
   ```javascript
   const response = await fetch('/api/quizzes/generate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       content: 'Technical document text...',
       mode: 'llm', // or 'mock' for deterministic offline generation
       model: 'gemini-1.5-flash',
       difficulty: 'Intermediate',
       question_count: 5
     })
   });
   ```

3. **Deterministic Fallback:**
   If no API key is configured or if the external REST request fails (e.g. rate limits or network offline), the engine automatically reverts to local rule-based template generation without breaking the user experience.
