/**
 * SkillForge Document Assessment Module - Quiz Generator
 *
 * Provides text extraction, content chunking, and multiple-choice question
 * generation from uploaded technical documentation and curriculum materials.
 */

/**
 * Text chunk data structure representing a segmented section of source content.
 */
class DocumentChunk {
  /**
   * @param {number} index - Zero-based sequence index.
   * @param {string} text - Chunk text content.
   */
  constructor(index, text) {
    this.index = index;
    this.text = text;
    this.char_count = text.length;
  }

  /**
   * Enables automatic string conversion when accessed directly.
   * @returns {string} Chunk text content.
   */
  toString() {
    return this.text;
  }
}

/**
 * Technical keyword extraction dictionary and domain distractor bank.
 */
const DOMAIN_DISTRACTORS = {
  javascript: [
    'Executes tasks synchronously on the main thread without event queue scheduling',
    'Bypasses lexical scoping by allocating variables in global thread contexts',
    'Restricts memory reclamation to explicit manual deallocation routines',
    'Converts asynchronous promises into blocking kernel interrupts'
  ],
  architecture: [
    'Enforces monolithic single-binary deployment across distributed clusters',
    'Replaces stateless HTTP communication with persistent binary bus queues',
    'Disables horizontal autoscaling in favor of static thread pools',
    'Bypasses reverse proxy routing by opening direct database socket connections'
  ],
  database: [
    'Requires distributed two-phase commits for all read-only transaction queries',
    'Disables write-ahead logging to maximize ephemeral memory write throughput',
    'Restricts index lookups to unindexed sequential table scans',
    'Stores records without schema definitions or relational constraint enforcement'
  ],
  cloud: [
    'Mandates hardcoded IP address assignments for containerized pods',
    'Eliminates TLS certificate verification across public network boundaries',
    'Requires manual physical disk provisioning before scaling application replicas',
    'Routes ingress network traffic through single unredundant gateway endpoints'
  ],
  security: [
    'Stores user authentication secrets in unencrypted browser local storage',
    'Transmits session tokens across insecure plain HTTP query parameters',
    'Disables cross-origin resource sharing headers to permit unrestricted domain access',
    'Bypasses input sanitization in favor of client-side validation scripts'
  ],
  general: [
    'Allocates fixed static memory buffers prior to runtime compilation',
    'Restricts execution to single-core hardware threads without task scheduling',
    'Suppresses standard error streams without logging diagnostic telemetry',
    'Requires full application server restarts to propagate environment updates'
  ]
};

/**
 * Generates unique identifiers with domain prefix.
 * @param {string} prefix - Domain prefix string.
 * @returns {string} Unique identifier.
 */
function generateUniqueId(prefix = 'qiz') {
  const timestamp = Date.now().toString(36);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${randomSuffix}`;
}

/**
 * Multiple-choice question generator and content analyzer.
 */
export class QuizGenerator {
  /**
   * Initializes quiz generator instance.
   * @param {object} [config={}] - Optional generator configuration.
   */
  constructor(config = {}) {
    this.defaultChunkSize = config.defaultChunkSize || 800;
    this.llmEndpoint = config.llmEndpoint || '';
    this.apiKey = config.apiKey || '';
  }

  /**
   * Extracts plain text content from a File, Blob, or raw string input.
   * Employs the browser FileReader API for File/Blob inputs.
   * @param {File|Blob|string} file - Target input source.
   * @returns {Promise<string>} Resolves with extracted text content.
   */
  async extractText(file) {
    if (!file) {
      return '';
    }

    // Direct string input
    if (typeof file === 'string') {
      if (file.startsWith('data:')) {
        // Base64 or URL encoded data string
        const commaIndex = file.indexOf(',');
        if (commaIndex !== -1) {
          const metadata = file.substring(0, commaIndex);
          const dataContent = file.substring(commaIndex + 1);
          if (metadata.includes('base64')) {
            try {
              return atob(dataContent);
            } catch {
              return decodeURIComponent(escape(atob(dataContent)));
            }
          }
          return decodeURIComponent(dataContent);
        }
      }
      return file;
    }

    // Modern Blob.text() API support
    if (typeof file.text === 'function') {
      try {
        const text = await file.text();
        return text;
      } catch {
        // Fallback to FileReader below
      }
    }

    // Standard FileReader implementation for browser compatibility
    if (typeof FileReader !== 'undefined' && (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File))) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = reader.result;
          resolve(typeof result === 'string' ? result : '');
        };

        reader.onerror = () => {
          reject(new Error(`Failed to read file '${file.name || 'document'}': ${reader.error?.message || 'FileReader error'}`));
        };

        reader.onabort = () => {
          reject(new Error(`File reading aborted for '${file.name || 'document'}'.`));
        };

        reader.readAsText(file);
      });
    }

    return String(file);
  }

  /**
   * Splits normalized text content into semantically coherent chunks.
   * Preserves paragraph and sentence boundaries within the 500-1000 character target window.
   * @param {string} text - Source plain text.
   * @param {number} [chunkSize=800] - Nominal target chunk size in characters.
   * @returns {Array<DocumentChunk>} Array of segmented chunk objects.
   */
  chunkText(text, chunkSize = 800) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const minChunk = 500;
    const maxChunk = 1000;
    const nominalChunk = Math.min(Math.max(chunkSize, minChunk), maxChunk);

    // Normalize newline sequences and excessive whitespace
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rawParagraphs = normalized.split(/\n\s*\n+/).map((p) => p.trim()).filter((p) => p.length > 0);

    if (rawParagraphs.length === 0) {
      if (normalized.trim().length > 0) {
        return [new DocumentChunk(0, normalized.trim())];
      }
      return [];
    }

    const chunks = [];
    let currentBuffer = '';

    for (const paragraph of rawParagraphs) {
      // If paragraph itself exceeds maxChunk, split it by sentence boundaries
      if (paragraph.length > maxChunk) {
        // Flush current buffer if present
        if (currentBuffer.length >= minChunk) {
          chunks.push(new DocumentChunk(chunks.length, currentBuffer.trim()));
          currentBuffer = '';
        }

        const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [paragraph];
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (!trimmedSentence) continue;

          if (currentBuffer.length + trimmedSentence.length + 1 > maxChunk && currentBuffer.length >= minChunk) {
            chunks.push(new DocumentChunk(chunks.length, currentBuffer.trim()));
            currentBuffer = trimmedSentence;
          } else {
            currentBuffer = currentBuffer ? `${currentBuffer} ${trimmedSentence}` : trimmedSentence;
          }
        }
      } else {
        // Evaluate combining with current buffer
        const prospectiveLength = currentBuffer.length + paragraph.length + 2;

        if (prospectiveLength > maxChunk && currentBuffer.length >= minChunk) {
          chunks.push(new DocumentChunk(chunks.length, currentBuffer.trim()));
          currentBuffer = paragraph;
        } else if (prospectiveLength >= nominalChunk) {
          currentBuffer = currentBuffer ? `${currentBuffer}\n\n${paragraph}` : paragraph;
          chunks.push(new DocumentChunk(chunks.length, currentBuffer.trim()));
          currentBuffer = '';
        } else {
          currentBuffer = currentBuffer ? `${currentBuffer}\n\n${paragraph}` : paragraph;
        }
      }
    }

    // Flush any remaining content in buffer
    if (currentBuffer.trim().length > 0) {
      if (chunks.length > 0 && currentBuffer.trim().length < minChunk) {
        // Append small tail to previous chunk if total stays under limit
        const prevIndex = chunks.length - 1;
        const combined = `${chunks[prevIndex].text}\n\n${currentBuffer.trim()}`;
        if (combined.length <= maxChunk * 1.25) {
          chunks[prevIndex] = new DocumentChunk(prevIndex, combined);
        } else {
          chunks.push(new DocumentChunk(chunks.length, currentBuffer.trim()));
        }
      } else {
        chunks.push(new DocumentChunk(chunks.length, currentBuffer.trim()));
      }
    }

    return chunks;
  }

  /**
   * Extracts salient technical terms, definitions, and key phrases from text content.
   * @param {string} text - Source chunk text.
   * @returns {Array<object>} Extracted candidate facts and key concepts.
   */
  _extractKeyConcepts(text) {
    const concepts = [];
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [];

    for (const rawSentence of sentences) {
      const sentence = rawSentence.trim();
      if (sentence.length < 35 || sentence.length > 280) {
        continue;
      }

      // Pattern 1: Definitions with "is defined as", "is a", "refers to", "denotes"
      const defMatch = sentence.match(/^([A-Z][A-Za-z0-9_\s-]{2,30})\s+(?:is defined as|is a|is an|refers to|denotes|represents)\s+(.+)$/i);
      if (defMatch) {
        concepts.push({
          type: 'definition',
          term: defMatch[1].trim(),
          predicate: defMatch[2].trim().replace(/[.!?]+$/, ''),
          sentence
        });
        continue;
      }

      // Pattern 2: Functionality with "provides", "manages", "enables", "ensures", "handles"
      const funcMatch = sentence.match(/^([A-Z][A-Za-z0-9_\s-]{2,30})\s+(?:provides|manages|enables|ensures|handles|implements|controls)\s+(.+)$/i);
      if (funcMatch) {
        concepts.push({
          type: 'functionality',
          term: funcMatch[1].trim(),
          predicate: funcMatch[2].trim().replace(/[.!?]+$/, ''),
          sentence
        });
        continue;
      }

      // Pattern 3: Key technical nouns and properties
      const keywordMatch = sentence.match(/\b([A-Z][a-zA-Z0-9]{2,20}(?:\s+[A-Z][a-zA-Z0-9]{2,20})?)\b/);
      if (keywordMatch && !['However', 'Therefore', 'Furthermore', 'According', 'Additionally', 'First', 'Second'].includes(keywordMatch[1])) {
        concepts.push({
          type: 'property',
          term: keywordMatch[1].trim(),
          predicate: sentence.replace(/[.!?]+$/, ''),
          sentence
        });
      }
    }

    return concepts;
  }

  /**
   * Generates multiple-choice questions from text chunks.
   * Supports rule-based keyword templates in mock mode and direct LLM calls in real mode.
   * @param {Array<DocumentChunk|string>} chunks - Segmented text chunks.
   * @param {object} [options={}] - Generation parameters.
   * @param {string} [options.mode='mock'] - Execution mode: 'mock' or 'real'/'llm'.
   * @param {string} [options.difficulty='Intermediate'] - Target difficulty level.
   * @param {number} [options.questionsPerChunk=1] - Number of questions per chunk.
   * @param {string} [options.apiKey=''] - Optional API key for LLM invocation.
   * @param {string} [options.model=''] - Optional LLM model identifier.
   * @returns {Promise<Array<object>>} Resolves with array of formatted MCQ objects.
   */
  async generateMCQsFromChunks(chunks, options = {}) {
    if (!chunks || chunks.length === 0) {
      return [];
    }

    const mode = options.mode || 'mock';
    const apiKey = options.apiKey || this.apiKey;
    const difficulty = options.difficulty || 'Intermediate';

    // Real mode using LLM REST endpoint if credentials and mode are provided
    if ((mode === 'real' || mode === 'llm') && apiKey && this.llmEndpoint) {
      try {
        const questions = await this._generateViaLLM(chunks, options);
        if (questions && questions.length > 0) {
          return questions;
        }
      } catch (err) {
        console.warn('Real mode LLM invocation failed, reverting to deterministic template generation:', err.message);
      }
    }

    // Default mock mode: deterministic rule-based template generation
    const questions = [];
    const questionsPerChunk = Math.max(1, options.questionsPerChunk || 1);
    const targetCount = options.num_questions || options.question_count || options.targetQuestionCount || 0;

    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const rawChunk = chunks[chunkIdx];
      const chunkText = typeof rawChunk === 'string' ? rawChunk : rawChunk.text;
      const concepts = this._extractKeyConcepts(chunkText);

      let chunkQuestionsGenerated = 0;

      for (let conceptIdx = 0; conceptIdx < concepts.length && chunkQuestionsGenerated < questionsPerChunk; conceptIdx++) {
        const concept = concepts[conceptIdx];
        const itemDiff = difficulty === 'Mixed' ? ['Basic', 'Intermediate', 'Advanced'][questions.length % 3] : difficulty;
        const mcq = this._buildTemplateQuestion(concept, chunkText, chunkIdx, itemDiff);
        if (mcq) {
          questions.push(mcq);
          chunkQuestionsGenerated++;
        }
      }

      // If no formal concept matched, construct fallback question from prominent sentence
      if (chunkQuestionsGenerated === 0) {
        const itemDiff = difficulty === 'Mixed' ? ['Basic', 'Intermediate', 'Advanced'][questions.length % 3] : difficulty;
        const fallbackMCQ = this._buildFallbackQuestion(chunkText, chunkIdx, itemDiff);
        if (fallbackMCQ) {
          questions.push(fallbackMCQ);
        }
      }
    }

    // If target question count is specified and more questions are needed
    if (targetCount > 0 && questions.length < targetCount) {
      const allSentences = [];
      for (let i = 0; i < chunks.length; i++) {
        const cText = typeof chunks[i] === 'string' ? chunks[i] : chunks[i].text;
        const sents = cText.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 25);
        sents.forEach((s) => allSentences.push({ sentence: s, chunkIdx: i }));
      }

      let sentIdx = 0;
      while (questions.length < targetCount && sentIdx < allSentences.length) {
        const item = allSentences[sentIdx++];
        const itemDiff = difficulty === 'Mixed' ? ['Basic', 'Intermediate', 'Advanced'][questions.length % 3] : difficulty;
        const q = this._buildFallbackQuestion(item.sentence, item.chunkIdx, itemDiff);
        if (q && !questions.some((existing) => existing.explanation === q.explanation)) {
          questions.push(q);
        }
      }
    }

    if (targetCount > 0 && questions.length > targetCount) {
      questions.length = targetCount;
    }

    return questions;
  }

  /**
   * Constructs a formatted MCQ object from an identified concept.
   * @param {object} concept - Extracted concept descriptor.
   * @param {string} chunkText - Source chunk text.
   * @param {number} chunkIdx - Chunk index number.
   * @param {string} difficulty - Target difficulty.
   * @returns {object} Structured MCQ item.
   */
  _buildTemplateQuestion(concept, chunkText, chunkIdx, difficulty) {
    let questionText = '';
    let correctAnswer = '';

    if (concept.type === 'definition') {
      questionText = `According to the documentation, how is '${concept.term}' formally defined?`;
      correctAnswer = concept.predicate.charAt(0).toUpperCase() + concept.predicate.slice(1);
    } else if (concept.type === 'functionality') {
      questionText = `What is the operational responsibility of '${concept.term}' as described in the text?`;
      correctAnswer = `Provides, manages, or handles ${concept.predicate}`;
    } else {
      questionText = `Which statement accurately characterizes '${concept.term}' based on the source text?`;
      correctAnswer = concept.sentence.charAt(0).toUpperCase() + concept.sentence.slice(1).replace(/[.!?]+$/, '');
    }

    // Select plausible domain distractors
    const distractorPool = [
      ...DOMAIN_DISTRACTORS.general,
      ...DOMAIN_DISTRACTORS.architecture,
      ...DOMAIN_DISTRACTORS.javascript
    ];

    // Pick 3 unique distractors distinct from correct answer
    const selectedDistractors = [];
    const shuffledPool = [...distractorPool].sort(() => 0.5 - Math.random());

    for (const item of shuffledPool) {
      if (item.toLowerCase() !== correctAnswer.toLowerCase() && !selectedDistractors.includes(item)) {
        selectedDistractors.push(item);
        if (selectedDistractors.length === 3) break;
      }
    }

    // Assemble options and shuffle placement
    const rawOptions = [correctAnswer, ...selectedDistractors];
    const correctIndex = Math.floor(Math.random() * 4);

    // Swap correct answer to randomized index
    const options = [...rawOptions];
    const temp = options[0];
    options[0] = options[correctIndex];
    options[correctIndex] = temp;

    const sourceExcerpt = concept.sentence.length > 160
      ? `${concept.sentence.substring(0, 157)}...`
      : concept.sentence;

    return {
      id: generateUniqueId('mcq'),
      question_text: questionText,
      options,
      correct_option_index: correctIndex,
      source_reference: `Section ${chunkIdx + 1}: "${sourceExcerpt}"`,
      explanation: `Verified by source material: ${concept.sentence}`,
      difficulty
    };
  }

  /**
   * Constructs a fallback MCQ from generic chunk content when formal grammar patterns do not match.
   * @param {string} chunkText - Source chunk text.
   * @param {number} chunkIdx - Chunk index number.
   * @param {string} difficulty - Target difficulty.
   * @returns {object} Structured MCQ item.
   */
  _buildFallbackQuestion(chunkText, chunkIdx, difficulty) {
    const sentences = chunkText.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 25);
    if (sentences.length === 0) {
      return null;
    }

    const anchorSentence = sentences[0];
    const correctAnswer = anchorSentence.charAt(0).toUpperCase() + anchorSentence.slice(1);

    const distractors = [
      'Executes asynchronously via isolated browser worker threads without DOM access',
      'Requires explicit two-phase schema migration before runtime initialization',
      'Suppresses internal telemetry logs when operating under nominal cluster loads'
    ];

    const correctIndex = Math.floor(Math.random() * 4);
    const options = [...distractors];
    options.splice(correctIndex, 0, correctAnswer);

    const excerpt = anchorSentence.length > 140
      ? `${anchorSentence.substring(0, 137)}...`
      : anchorSentence;

    return {
      id: generateUniqueId('mcq'),
      question_text: `Based on the provided section, which of the following statements is factual?`,
      options,
      correct_option_index: correctIndex,
      source_reference: `Section ${chunkIdx + 1}: "${excerpt}"`,
      explanation: `Direct excerpt from documentation: ${anchorSentence}.`,
      difficulty
    };
  }

  /**
   * Issues prompt to external LLM REST endpoint for question synthesis.
   * @param {Array<DocumentChunk|string>} chunks - Segmented text chunks.
   * @param {object} options - Generation parameters.
   * @returns {Promise<Array<object>>} Resolves with array of generated questions.
   */
  async _generateViaLLM(chunks, options) {
    const combinedContent = chunks
      .slice(0, 6)
      .map((c, i) => `[SECTION ${i + 1}]\n${typeof c === 'string' ? c : c.text}`)
      .join('\n\n');

    const prompt = `You are a technical assessment author. Generate ${options.questionsPerChunk || 1} multiple-choice question(s) per section based STRICTLY on the text below.
Return a valid JSON array of objects with fields:
- question_text (string)
- options (array of 4 distinct strings)
- correct_option_index (integer 0 to 3)
- source_reference (string citation from text)
- explanation (string explaining correct answer)
- difficulty ("Beginner" | "Intermediate" | "Advanced")

CONTENT:
${combinedContent}`;

    const response = await fetch(this.llmEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.apiKey || this.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'gemini-1.5-flash',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`LLM endpoint responded with HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rawContent = payload.choices?.[0]?.message?.content || payload.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({
        id: generateUniqueId('mcq'),
        question_text: String(item.question_text || ''),
        options: Array.isArray(item.options) && item.options.length === 4 ? item.options : ['A', 'B', 'C', 'D'],
        correct_option_index: typeof item.correct_option_index === 'number' ? item.correct_option_index : 0,
        source_reference: String(item.source_reference || 'Document excerpt'),
        explanation: String(item.explanation || 'Verified from documentation'),
        difficulty: item.difficulty || options.difficulty || 'Intermediate'
      }));
    }

    return [];
  }

  /**
   * Executes the complete end-to-end quiz generation pipeline.
   * Performs text extraction, content chunking, and multiple-choice question synthesis.
   * @param {File|Blob|string} file - Source document input.
   * @param {object} [options={}] - Pipeline options.
   * @param {string} [options.title] - Custom assessment title.
   * @param {number} [options.chunkSize=800] - Target chunk length.
   * @param {string} [options.mode='mock'] - Execution mode: 'mock' or 'real'.
   * @param {string} [options.difficulty='Intermediate'] - Question difficulty.
   * @returns {Promise<object>} Resolves with full quiz record.
   */
  async generateQuiz(file, options = {}) {
    // 1. Text extraction
    const rawText = await this.extractText(file);
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Provided document contains no readable text content.');
    }

    // 2. Semantic chunking
    const chunkSize = options.chunkSize || this.defaultChunkSize;
    const chunks = this.chunkText(rawText, chunkSize);
    if (chunks.length === 0) {
      throw new Error('Unable to extract valid content chunks from the provided document.');
    }

    // 3. Question generation
    const questions = await this.generateMCQsFromChunks(chunks, options);
    if (questions.length === 0) {
      throw new Error('Failed to synthesize diagnostic questions from document content.');
    }

    // 4. Assemble final quiz model
    const sourceName = (file && typeof file === 'object' && file.name)
      ? file.name
      : (options.title || 'Technical Document');

    const quizRecord = {
      id: generateUniqueId('qiz'),
      title: options.title || `Assessment: ${sourceName.replace(/\.[^/.]+$/, '')}`,
      document_name: sourceName,
      total_questions: questions.length,
      questions,
      created_at: new Date().toISOString(),
      metadata: {
        source_name: sourceName,
        chunk_count: chunks.length,
        character_count: rawText.length,
        difficulty: options.difficulty || 'Intermediate',
        generation_mode: options.mode || 'mock'
      }
    };

    return quizRecord;
  }
}

export default QuizGenerator;
