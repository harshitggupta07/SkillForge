/**
 * SkillForge Data Layer - Reference and Seed Dataset
 *
 * Contains taxonomy definitions, role benchmarks, initial user records,
 * curated learning resources, market trend telemetry, and diagnostic questions.
 */

/**
 * Generates an array of the first N prime numbers.
 * @param {number} count - Total primes needed.
 * @returns {Array<number>}
 */
function getFirstPrimes(count) {
  const primes = [];
  let candidate = 2;
  while (primes.length < count) {
    let isPrime = true;
    for (let i = 2; i * i <= candidate; i++) {
      if (candidate % i === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) {
      primes.push(candidate);
    }
    candidate++;
  }
  return primes;
}

/**
 * Pure JavaScript SHA-256 calculation for environments without Web Crypto.
 * Derived from the FIPS 180-4 standard specification.
 * @param {string} input - UTF-8 string input.
 * @returns {string} 64-character lowercase hex digest.
 */
function computeSha256Fallback(input) {
  const primes64 = getFirstPrimes(64);
  const roundConstants = new Uint32Array(64);
  for (let idx = 0; idx < 64; idx++) {
    const frac = Math.cbrt(primes64[idx]) - Math.floor(Math.cbrt(primes64[idx]));
    roundConstants[idx] = (frac * 4294967296) >>> 0;
  }

  const initialHash = new Uint32Array(8);
  for (let idx = 0; idx < 8; idx++) {
    const frac = Math.sqrt(primes64[idx]) - Math.floor(Math.sqrt(primes64[idx]));
    initialHash[idx] = (frac * 4294967296) >>> 0;
  }

  const utf8Bytes = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code < 0x80) {
      utf8Bytes.push(code);
    } else if (code < 0x800) {
      utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else {
      utf8Bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }

  const originalBitLength = utf8Bytes.length * 8;
  utf8Bytes.push(0x80);
  while ((utf8Bytes.length % 64) !== 56) {
    utf8Bytes.push(0x00);
  }

  const highBits = Math.floor(originalBitLength / 0x100000000);
  const lowBits = originalBitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) {
    utf8Bytes.push((highBits >>> shift) & 0xff);
  }
  for (let shift = 24; shift >= 0; shift -= 8) {
    utf8Bytes.push((lowBits >>> shift) & 0xff);
  }

  const rotR = (value, shift) => (value >>> shift) | (value << (32 - shift));

  const words = new Uint32Array(64);
  const hashState = new Uint32Array(initialHash);

  for (let blockOffset = 0; blockOffset < utf8Bytes.length; blockOffset += 64) {
    for (let t = 0; t < 16; t++) {
      const p = blockOffset + t * 4;
      words[t] =
        (utf8Bytes[p] << 24) |
        (utf8Bytes[p + 1] << 16) |
        (utf8Bytes[p + 2] << 8) |
        utf8Bytes[p + 3];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotR(words[t - 15], 7) ^ rotR(words[t - 15], 18) ^ (words[t - 15] >>> 3);
      const s1 = rotR(words[t - 2], 17) ^ rotR(words[t - 2], 19) ^ (words[t - 2] >>> 10);
      words[t] = (words[t - 16] + s0 + words[t - 7] + s1) >>> 0;
    }

    let a = hashState[0];
    let b = hashState[1];
    let c = hashState[2];
    let d = hashState[3];
    let e = hashState[4];
    let f = hashState[5];
    let g = hashState[6];
    let h = hashState[7];

    for (let t = 0; t < 64; t++) {
      const sigma1 = rotR(e, 6) ^ rotR(e, 11) ^ rotR(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + sigma1 + ch + roundConstants[t] + words[t]) >>> 0;
      const sigma0 = rotR(a, 2) ^ rotR(a, 13) ^ rotR(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (sigma0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    hashState[0] = (hashState[0] + a) >>> 0;
    hashState[1] = (hashState[1] + b) >>> 0;
    hashState[2] = (hashState[2] + c) >>> 0;
    hashState[3] = (hashState[3] + d) >>> 0;
    hashState[4] = (hashState[4] + e) >>> 0;
    hashState[5] = (hashState[5] + f) >>> 0;
    hashState[6] = (hashState[6] + g) >>> 0;
    hashState[7] = (hashState[7] + h) >>> 0;
  }

  let hexResult = '';
  for (let idx = 0; idx < 8; idx++) {
    hexResult += hashState[idx].toString(16).padStart(8, '0');
  }
  return hexResult;
}

/**
 * Computes the SHA-256 digest of a plaintext string.
 * Employs Web Crypto API when present, with pure JS algorithm fallback.
 * @param {string} str - Raw password string.
 * @returns {Promise<string>} Hex digest representation.
 */
export async function hashPassword(str) {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const buffer = new TextEncoder().encode(str);
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      return computeSha256Fallback(str);
    }
  }
  return computeSha256Fallback(str);
}


/**
 * Enterprise IT Skills Taxonomy
 * 64 distinct skills categorized across core software engineering domains.
 */
export const SKILLS_TAXONOMY = [
  // Programming Languages
  {
    id: 'skill_javascript',
    name: 'JavaScript',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'High',
    avg_salary_impact: 18000,
    description: 'Dynamic scripting language standard for browser clients and asynchronous server execution runtimes.'
  },
  {
    id: 'skill_typescript',
    name: 'TypeScript',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'High',
    avg_salary_impact: 22000,
    description: 'Statically typed syntactic superset of JavaScript providing compile-time type validation.'
  },
  {
    id: 'skill_python',
    name: 'Python',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'High',
    avg_salary_impact: 24000,
    description: 'Interpreted high-level language standard for data analysis, machine learning, and automation.'
  },
  {
    id: 'skill_java',
    name: 'Java',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'High',
    avg_salary_impact: 20000,
    description: 'Object-oriented class-based language and virtual machine environment for enterprise backends.'
  },
  {
    id: 'skill_go',
    name: 'Go',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'High',
    avg_salary_impact: 28000,
    description: 'Statically typed compiled language with first-class concurrency primitives for cloud microservices.'
  },
  {
    id: 'skill_rust',
    name: 'Rust',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'High',
    avg_salary_impact: 32000,
    description: 'Memory-safe systems language providing zero-cost abstractions without a tracing garbage collector.'
  },
  {
    id: 'skill_cpp',
    name: 'C++',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'Medium',
    avg_salary_impact: 22000,
    description: 'Performance-critical compiled language for low-level system programming, game engines, and runtimes.'
  },
  {
    id: 'skill_csharp',
    name: 'C#',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'High',
    avg_salary_impact: 19000,
    description: 'Type-safe object-oriented programming language designed for the cross-platform .NET runtime.'
  },
  {
    id: 'skill_kotlin',
    name: 'Kotlin',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'Medium',
    avg_salary_impact: 21000,
    description: 'Concise statically typed language fully interoperable with Java, favored for Android development.'
  },
  {
    id: 'skill_swift',
    name: 'Swift',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'Medium',
    avg_salary_impact: 23000,
    description: 'General-purpose compiled programming language optimized for Apple OS ecosystems.'
  },
  {
    id: 'skill_php',
    name: 'PHP',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'Low',
    avg_salary_impact: 10000,
    description: 'Server-side scripting language primarily deployed for web content management platforms.'
  },
  {
    id: 'skill_ruby',
    name: 'Ruby',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'Low',
    avg_salary_impact: 14000,
    description: 'Dynamic object-oriented programming language popular with convention-over-configuration web frameworks.'
  },
  {
    id: 'skill_sql',
    name: 'SQL',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'High',
    avg_salary_impact: 17000,
    description: 'Domain-specific language used for managing and querying structured relational databases.'
  },
  {
    id: 'skill_r',
    name: 'R',
    category: 'Programming',
    subcategory: 'Languages',
    demand_level: 'Low',
    avg_salary_impact: 15000,
    description: 'Programming environment tailored for statistical computations, bioinformatics, and data mining.'
  },

  // Frontend Development
  {
    id: 'skill_react',
    name: 'React',
    category: 'Frontend',
    subcategory: 'UI Libraries',
    demand_level: 'High',
    avg_salary_impact: 20000,
    description: 'Declarative component-based UI library based on virtual DOM reconciliation and hooks state models.'
  },
  {
    id: 'skill_angular',
    name: 'Angular',
    category: 'Frontend',
    subcategory: 'Frameworks',
    demand_level: 'Medium',
    avg_salary_impact: 18000,
    description: 'Structured TypeScript frontend platform offering two-way data binding and dependency injection.'
  },
  {
    id: 'skill_vue',
    name: 'Vue.js',
    category: 'Frontend',
    subcategory: 'UI Libraries',
    demand_level: 'Medium',
    avg_salary_impact: 17000,
    description: 'Progressive JavaScript framework featuring reactivity based on ES Proxies and single-file components.'
  },
  {
    id: 'skill_nextjs',
    name: 'Next.js',
    category: 'Frontend',
    subcategory: 'Frameworks',
    demand_level: 'High',
    avg_salary_impact: 24000,
    description: 'Full-stack React framework providing hybrid server-side rendering and static site generation.'
  },
  {
    id: 'skill_svelte',
    name: 'Svelte',
    category: 'Frontend',
    subcategory: 'Frameworks',
    demand_level: 'Medium',
    avg_salary_impact: 19000,
    description: 'Compiler-based frontend system compiling declarative markup into direct DOM manipulation code.'
  },
  {
    id: 'skill_html_css',
    name: 'HTML5/CSS3',
    category: 'Frontend',
    subcategory: 'Web Standards',
    demand_level: 'High',
    avg_salary_impact: 12000,
    description: 'Foundational web standards encompassing semantic layout, CSS flexbox, grid, and media queries.'
  },
  {
    id: 'skill_tailwind',
    name: 'Tailwind CSS',
    category: 'Frontend',
    subcategory: 'Styling',
    demand_level: 'High',
    avg_salary_impact: 14000,
    description: 'Utility-first CSS framework enabling component composition directly within template markup.'
  },
  {
    id: 'skill_webassembly',
    name: 'WebAssembly',
    category: 'Frontend',
    subcategory: 'Runtimes',
    demand_level: 'Medium',
    avg_salary_impact: 26000,
    description: 'Low-level bytecode standard for running high-speed binary modules inside client web browsers.'
  },

  // Backend Development
  {
    id: 'skill_nodejs',
    name: 'Node.js',
    category: 'Backend',
    subcategory: 'Runtimes',
    demand_level: 'High',
    avg_salary_impact: 20000,
    description: 'Event-driven non-blocking I/O runtime built on Chrome V8 JavaScript engine.'
  },
  {
    id: 'skill_express',
    name: 'Express',
    category: 'Backend',
    subcategory: 'Frameworks',
    demand_level: 'High',
    avg_salary_impact: 15000,
    description: 'Minimalist web application framework for routing and middleware pipelines in Node.js.'
  },
  {
    id: 'skill_fastapi',
    name: 'FastAPI',
    category: 'Backend',
    subcategory: 'Frameworks',
    demand_level: 'High',
    avg_salary_impact: 25000,
    description: 'High-performance Python web framework based on standard type hints, Starlette, and Pydantic.'
  },
  {
    id: 'skill_django',
    name: 'Django',
    category: 'Backend',
    subcategory: 'Frameworks',
    demand_level: 'Medium',
    avg_salary_impact: 18000,
    description: 'Batteries-included Python framework providing ORM, authentication, and administrative UI.'
  },
  {
    id: 'skill_spring_boot',
    name: 'Spring Boot',
    category: 'Backend',
    subcategory: 'Frameworks',
    demand_level: 'High',
    avg_salary_impact: 22000,
    description: 'Convention-over-configuration Java framework for building production-grade enterprise microservices.'
  },
  {
    id: 'skill_dotnet_core',
    name: '.NET Core',
    category: 'Backend',
    subcategory: 'Frameworks',
    demand_level: 'High',
    avg_salary_impact: 20000,
    description: 'High-throughput cross-platform Microsoft framework for cloud-native web APIs.'
  },
  {
    id: 'skill_graphql',
    name: 'GraphQL',
    category: 'Backend',
    subcategory: 'API Architecture',
    demand_level: 'High',
    avg_salary_impact: 22000,
    description: 'Query language and runtime allowing clients to fetch exact requested fields through a typed schema.'
  },
  {
    id: 'skill_grpc',
    name: 'gRPC',
    category: 'Backend',
    subcategory: 'API Architecture',
    demand_level: 'High',
    avg_salary_impact: 25000,
    description: 'Universal RPC framework using Protocol Buffers and HTTP/2 for high-performance service communication.'
  },

  // Cloud and DevOps
  {
    id: 'skill_aws',
    name: 'AWS',
    category: 'Cloud/DevOps',
    subcategory: 'Cloud Platforms',
    demand_level: 'High',
    avg_salary_impact: 26000,
    description: 'Comprehensive public cloud suite offering distributed compute, storage, VPC, and managed services.'
  },
  {
    id: 'skill_azure',
    name: 'Azure',
    category: 'Cloud/DevOps',
    subcategory: 'Cloud Platforms',
    demand_level: 'High',
    avg_salary_impact: 24000,
    description: 'Microsoft enterprise cloud platform integrated with active directory and enterprise data solutions.'
  },
  {
    id: 'skill_gcp',
    name: 'GCP',
    category: 'Cloud/DevOps',
    subcategory: 'Cloud Platforms',
    demand_level: 'High',
    avg_salary_impact: 25000,
    description: 'Google Cloud Platform specialized in managed Kubernetes, analytics, and AI infrastructure.'
  },
  {
    id: 'skill_docker',
    name: 'Docker',
    category: 'Cloud/DevOps',
    subcategory: 'Containerization',
    demand_level: 'High',
    avg_salary_impact: 18000,
    description: 'Container virtualization standard for packaging software with dependencies into isolated units.'
  },
  {
    id: 'skill_kubernetes',
    name: 'Kubernetes',
    category: 'Cloud/DevOps',
    subcategory: 'Orchestration',
    demand_level: 'High',
    avg_salary_impact: 30000,
    description: 'Container orchestration engine for automated deployment, scaling, and self-healing of workloads.'
  },
  {
    id: 'skill_terraform',
    name: 'Terraform',
    category: 'Cloud/DevOps',
    subcategory: 'Infrastructure as Code',
    demand_level: 'High',
    avg_salary_impact: 27000,
    description: 'Declarative infrastructure-as-code tool for provisioning multi-cloud cloud infrastructure state.'
  },
  {
    id: 'skill_cicd',
    name: 'CI/CD',
    category: 'Cloud/DevOps',
    subcategory: 'Automation',
    demand_level: 'High',
    avg_salary_impact: 19000,
    description: 'Continuous integration and continuous delivery pipelines for automated testing and release cycles.'
  },
  {
    id: 'skill_github_actions',
    name: 'GitHub Actions',
    category: 'Cloud/DevOps',
    subcategory: 'Automation',
    demand_level: 'High',
    avg_salary_impact: 18000,
    description: 'Repository-native workflow automation platform for running builds, linters, and deployments.'
  },

  // Data and Machine Learning
  {
    id: 'skill_tensorflow',
    name: 'TensorFlow',
    category: 'Data/ML',
    subcategory: 'Deep Learning',
    demand_level: 'Medium',
    avg_salary_impact: 24000,
    description: 'Open-source software framework for numerical computation and large-scale machine learning training.'
  },
  {
    id: 'skill_pytorch',
    name: 'PyTorch',
    category: 'Data/ML',
    subcategory: 'Deep Learning',
    demand_level: 'High',
    avg_salary_impact: 30000,
    description: 'Deep learning library with dynamic autograd computation graphs, widely used in research and production.'
  },
  {
    id: 'skill_pandas',
    name: 'Pandas',
    category: 'Data/ML',
    subcategory: 'Data Processing',
    demand_level: 'High',
    avg_salary_impact: 16000,
    description: 'Python data manipulation library providing DataFrame structures for structured relational analysis.'
  },
  {
    id: 'skill_spark',
    name: 'Spark',
    category: 'Data/ML',
    subcategory: 'Distributed Computing',
    demand_level: 'High',
    avg_salary_impact: 28000,
    description: 'Unified distributed analytics engine for large-scale data processing and stream analytics.'
  },
  {
    id: 'skill_kafka',
    name: 'Kafka',
    category: 'Data/ML',
    subcategory: 'Event Streaming',
    demand_level: 'High',
    avg_salary_impact: 29000,
    description: 'Distributed event store and streaming platform for high-throughput real-time message pipelines.'
  },
  {
    id: 'skill_airflow',
    name: 'Airflow',
    category: 'Data/ML',
    subcategory: 'Orchestration',
    demand_level: 'High',
    avg_salary_impact: 23000,
    description: 'Workflow management platform for authoring, scheduling, and monitoring complex data pipeline DAGs.'
  },
  {
    id: 'skill_dbt',
    name: 'dbt',
    category: 'Data/ML',
    subcategory: 'Transformation',
    demand_level: 'High',
    avg_salary_impact: 25000,
    description: 'Transformation framework enabling analytics engineers to model data using SQL and version control.'
  },
  {
    id: 'skill_snowflake',
    name: 'Snowflake',
    category: 'Data/ML',
    subcategory: 'Data Warehousing',
    demand_level: 'High',
    avg_salary_impact: 27000,
    description: 'Cloud data warehouse decoupling compute and storage for high-concurrency analytical queries.'
  },

  // AI and LLM Engineering
  {
    id: 'skill_langchain',
    name: 'LangChain',
    category: 'AI/LLM',
    subcategory: 'Frameworks',
    demand_level: 'High',
    avg_salary_impact: 32000,
    description: 'Software framework for assembling applications utilizing language models, agents, and external tools.'
  },
  {
    id: 'skill_llamaindex',
    name: 'LlamaIndex',
    category: 'AI/LLM',
    subcategory: 'Data Frameworks',
    demand_level: 'High',
    avg_salary_impact: 31000,
    description: 'Data framework connecting custom knowledge sources and document stores to language models.'
  },
  {
    id: 'skill_rag',
    name: 'RAG Architecture',
    category: 'AI/LLM',
    subcategory: 'Architecture',
    demand_level: 'High',
    avg_salary_impact: 35000,
    description: 'Retrieval-Augmented Generation pattern pairing semantic document search with generative responses.'
  },
  {
    id: 'skill_prompt_eng',
    name: 'Prompt Engineering',
    category: 'AI/LLM',
    subcategory: 'Methodologies',
    demand_level: 'High',
    avg_salary_impact: 20000,
    description: 'Techniques for structured prompt composition, in-context learning, and model response calibration.'
  },
  {
    id: 'skill_fine_tuning',
    name: 'Fine-Tuning',
    category: 'AI/LLM',
    subcategory: 'Model Optimization',
    demand_level: 'High',
    avg_salary_impact: 34000,
    description: 'Parameter-efficient fine-tuning (LoRA, QLoRA) on foundational open weights for specialized domain tasks.'
  },
  {
    id: 'skill_agentic_ai',
    name: 'Agentic AI',
    category: 'AI/LLM',
    subcategory: 'Autonomous Systems',
    demand_level: 'High',
    avg_salary_impact: 38000,
    description: 'Autonomous systems utilizing reasoning loops, tool invocation, memory, and multi-agent coordination.'
  },
  {
    id: 'skill_mcp',
    name: 'MCP',
    category: 'AI/LLM',
    subcategory: 'Protocol Standards',
    demand_level: 'High',
    avg_salary_impact: 33000,
    description: 'Model Context Protocol standardizing communication between AI clients, servers, and runtime tools.'
  },
  {
    id: 'skill_vector_db',
    name: 'Vector Databases',
    category: 'AI/LLM',
    subcategory: 'Storage',
    demand_level: 'High',
    avg_salary_impact: 30000,
    description: 'Specialized vector indexing systems executing approximate nearest neighbor searches on high-dimensional vectors.'
  },

  // Security
  {
    id: 'skill_owasp',
    name: 'OWASP',
    category: 'Security',
    subcategory: 'Application Security',
    demand_level: 'High',
    avg_salary_impact: 24000,
    description: 'Core application security baseline covering injection, broken authentication, and sensitive data exposure.'
  },
  {
    id: 'skill_zero_trust',
    name: 'Zero Trust',
    category: 'Security',
    subcategory: 'Network Architecture',
    demand_level: 'High',
    avg_salary_impact: 28000,
    description: 'Security architecture enforcing continuous verification, minimal privilege, and assumed breach.'
  },
  {
    id: 'skill_iam',
    name: 'IAM',
    category: 'Security',
    subcategory: 'Access Governance',
    demand_level: 'High',
    avg_salary_impact: 25000,
    description: 'Identity and Access Management policies, role-based controls, and cryptographic credential delegation.'
  },
  {
    id: 'skill_devsecops',
    name: 'DevSecOps',
    category: 'Security',
    subcategory: 'Pipeline Security',
    demand_level: 'High',
    avg_salary_impact: 29000,
    description: 'Integrating automated vulnerability scanners (SAST, DAST, SCA) into development deployment pipelines.'
  },

  // Databases
  {
    id: 'skill_postgresql',
    name: 'PostgreSQL',
    category: 'Databases',
    subcategory: 'Relational',
    demand_level: 'High',
    avg_salary_impact: 24000,
    description: 'Extensible open-source relational database supporting ACID transactions, JSONB, and advanced indexing.'
  },
  {
    id: 'skill_mongodb',
    name: 'MongoDB',
    category: 'Databases',
    subcategory: 'Document Store',
    demand_level: 'Medium',
    avg_salary_impact: 18000,
    description: 'Document-oriented database storing JSON-style records with dynamic schemas and horizontal partitioning.'
  },
  {
    id: 'skill_redis',
    name: 'Redis',
    category: 'Databases',
    subcategory: 'In-Memory Store',
    demand_level: 'High',
    avg_salary_impact: 22000,
    description: 'In-memory key-value data structure store utilized for distributed caching, session state, and messaging.'
  },
  {
    id: 'skill_elasticsearch',
    name: 'Elasticsearch',
    category: 'Databases',
    subcategory: 'Search Engine',
    demand_level: 'High',
    avg_salary_impact: 23000,
    description: 'Distributed Lucene-based search engine for real-time document indexing, log filtering, and text querying.'
  },
  {
    id: 'skill_dynamodb',
    name: 'DynamoDB',
    category: 'Databases',
    subcategory: 'Managed NoSQL',
    demand_level: 'High',
    avg_salary_impact: 25000,
    description: 'Serverless key-value cloud database engineered for predictable single-digit millisecond latency at scale.'
  },
  {
    id: 'skill_neo4j',
    name: 'Neo4j',
    category: 'Databases',
    subcategory: 'Graph Database',
    demand_level: 'Medium',
    avg_salary_impact: 22000,
    description: 'Native property graph database supporting Cypher declarative querying for densely connected datasets.'
  }
];


/**
 * Standard Role Benchmark Profiles
 * Mappings of technical engineering roles to benchmark expectations,
 * required skill thresholds, and supplementary competencies.
 */
export const ROLE_BENCHMARKS = {
  junior_frontend_dev: {
    role_title: 'Junior Frontend Dev',
    experience_range: '0-2 years',
    required_skills: [
      { skill_id: 'skill_javascript', min_score: 70, weight: 0.30 },
      { skill_id: 'skill_html_css', min_score: 75, weight: 0.25 },
      { skill_id: 'skill_react', min_score: 65, weight: 0.25 },
      { skill_id: 'skill_typescript', min_score: 60, weight: 0.20 }
    ],
    nice_to_have_skills: ['skill_tailwind', 'skill_nextjs', 'skill_cicd']
  },
  senior_frontend_dev: {
    role_title: 'Senior Frontend Dev',
    experience_range: '5-8+ years',
    required_skills: [
      { skill_id: 'skill_typescript', min_score: 85, weight: 0.25 },
      { skill_id: 'skill_react', min_score: 85, weight: 0.25 },
      { skill_id: 'skill_nextjs', min_score: 80, weight: 0.20 },
      { skill_id: 'skill_html_css', min_score: 90, weight: 0.15 },
      { skill_id: 'skill_webassembly', min_score: 65, weight: 0.15 }
    ],
    nice_to_have_skills: ['skill_tailwind', 'skill_graphql', 'skill_cicd', 'skill_owasp']
  },
  junior_backend_dev: {
    role_title: 'Junior Backend Dev',
    experience_range: '0-2 years',
    required_skills: [
      { skill_id: 'skill_python', min_score: 70, weight: 0.25 },
      { skill_id: 'skill_sql', min_score: 70, weight: 0.25 },
      { skill_id: 'skill_nodejs', min_score: 65, weight: 0.25 },
      { skill_id: 'skill_docker', min_score: 60, weight: 0.25 }
    ],
    nice_to_have_skills: ['skill_express', 'skill_postgresql', 'skill_redis']
  },
  senior_backend_dev: {
    role_title: 'Senior Backend Dev',
    experience_range: '5-8+ years',
    required_skills: [
      { skill_id: 'skill_go', min_score: 80, weight: 0.20 },
      { skill_id: 'skill_postgresql', min_score: 85, weight: 0.20 },
      { skill_id: 'skill_docker', min_score: 80, weight: 0.20 },
      { skill_id: 'skill_grpc', min_score: 75, weight: 0.20 },
      { skill_id: 'skill_redis', min_score: 80, weight: 0.20 }
    ],
    nice_to_have_skills: ['skill_kubernetes', 'skill_kafka', 'skill_aws', 'skill_owasp']
  },
  full_stack_dev: {
    role_title: 'Full Stack Dev',
    experience_range: '3-6 years',
    required_skills: [
      { skill_id: 'skill_typescript', min_score: 75, weight: 0.20 },
      { skill_id: 'skill_react', min_score: 75, weight: 0.20 },
      { skill_id: 'skill_nodejs', min_score: 75, weight: 0.20 },
      { skill_id: 'skill_postgresql', min_score: 70, weight: 0.20 },
      { skill_id: 'skill_docker', min_score: 70, weight: 0.20 }
    ],
    nice_to_have_skills: ['skill_nextjs', 'skill_aws', 'skill_graphql', 'skill_tailwind']
  },
  devops_engineer: {
    role_title: 'DevOps Engineer',
    experience_range: '3-6 years',
    required_skills: [
      { skill_id: 'skill_docker', min_score: 85, weight: 0.25 },
      { skill_id: 'skill_kubernetes', min_score: 80, weight: 0.25 },
      { skill_id: 'skill_terraform', min_score: 80, weight: 0.25 },
      { skill_id: 'skill_cicd', min_score: 85, weight: 0.25 }
    ],
    nice_to_have_skills: ['skill_aws', 'skill_github_actions', 'skill_python', 'skill_devsecops']
  },
  cloud_architect: {
    role_title: 'Cloud Architect',
    experience_range: '7-10+ years',
    required_skills: [
      { skill_id: 'skill_aws', min_score: 90, weight: 0.25 },
      { skill_id: 'skill_kubernetes', min_score: 85, weight: 0.25 },
      { skill_id: 'skill_terraform', min_score: 85, weight: 0.25 },
      { skill_id: 'skill_zero_trust', min_score: 80, weight: 0.25 }
    ],
    nice_to_have_skills: ['skill_azure', 'skill_gcp', 'skill_iam', 'skill_kafka']
  },
  data_engineer: {
    role_title: 'Data Engineer',
    experience_range: '3-6 years',
    required_skills: [
      { skill_id: 'skill_python', min_score: 85, weight: 0.20 },
      { skill_id: 'skill_sql', min_score: 85, weight: 0.20 },
      { skill_id: 'skill_spark', min_score: 80, weight: 0.20 },
      { skill_id: 'skill_kafka', min_score: 75, weight: 0.20 },
      { skill_id: 'skill_dbt', min_score: 75, weight: 0.20 }
    ],
    nice_to_have_skills: ['skill_snowflake', 'skill_airflow', 'skill_postgresql', 'skill_docker']
  },
  ml_engineer: {
    role_title: 'ML Engineer',
    experience_range: '3-6 years',
    required_skills: [
      { skill_id: 'skill_python', min_score: 90, weight: 0.25 },
      { skill_id: 'skill_pytorch', min_score: 85, weight: 0.25 },
      { skill_id: 'skill_pandas', min_score: 85, weight: 0.25 },
      { skill_id: 'skill_docker', min_score: 75, weight: 0.25 }
    ],
    nice_to_have_skills: ['skill_tensorflow', 'skill_fastapi', 'skill_airflow', 'skill_vector_db']
  },
  ai_llm_engineer: {
    role_title: 'AI/LLM Engineer',
    experience_range: '3-6 years',
    required_skills: [
      { skill_id: 'skill_python', min_score: 85, weight: 0.20 },
      { skill_id: 'skill_rag', min_score: 85, weight: 0.20 },
      { skill_id: 'skill_langchain', min_score: 80, weight: 0.20 },
      { skill_id: 'skill_vector_db', min_score: 80, weight: 0.20 },
      { skill_id: 'skill_agentic_ai', min_score: 75, weight: 0.20 }
    ],
    nice_to_have_skills: ['skill_llamaindex', 'skill_prompt_eng', 'skill_fine_tuning', 'skill_mcp']
  },
  security_engineer: {
    role_title: 'Security Engineer',
    experience_range: '4-7 years',
    required_skills: [
      { skill_id: 'skill_owasp', min_score: 85, weight: 0.25 },
      { skill_id: 'skill_zero_trust', min_score: 80, weight: 0.25 },
      { skill_id: 'skill_iam', min_score: 85, weight: 0.25 },
      { skill_id: 'skill_devsecops', min_score: 80, weight: 0.25 }
    ],
    nice_to_have_skills: ['skill_docker', 'skill_kubernetes', 'skill_aws', 'skill_python']
  },
  mobile_developer: {
    role_title: 'Mobile Developer',
    experience_range: '3-5 years',
    required_skills: [
      { skill_id: 'skill_kotlin', min_score: 80, weight: 0.35 },
      { skill_id: 'skill_swift', min_score: 80, weight: 0.35 },
      { skill_id: 'skill_react', min_score: 70, weight: 0.30 }
    ],
    nice_to_have_skills: ['skill_typescript', 'skill_graphql', 'skill_cicd']
  },
  engineering_manager: {
    role_title: 'Engineering Manager',
    experience_range: '8-12+ years',
    required_skills: [
      { skill_id: 'skill_cicd', min_score: 75, weight: 0.25 },
      { skill_id: 'skill_aws', min_score: 70, weight: 0.25 },
      { skill_id: 'skill_devsecops', min_score: 70, weight: 0.25 },
      { skill_id: 'skill_postgresql', min_score: 70, weight: 0.25 }
    ],
    nice_to_have_skills: ['skill_kubernetes', 'skill_docker', 'skill_python', 'skill_typescript']
  }
};

/**
 * Seed User Profiles
 * Initial accounts with pre-calculated SHA-256 password digests.
 */
export const SEED_USERS = [
  {
    id: 'usr_admin_001',
    name: 'Marcus Vance',
    email: 'admin@skillforge.dev',
    password_hash: 'fcf7bb6d546cfb82d2e55486984ae7a1862a666acb441e0cf8b4ed34a4fcf9d7',
    role: 'admin',
    user_type: 'admin',
    current_role: 'Full Stack Lead',
    target_role: 'Engineering Manager',
    experience_years: 10,
    tech_stack: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
    education: 'B.S. in Computer Science, University of Washington',
    cv_uploaded: true,
    created_at: '2025-01-10T08:00:00.000Z'
  },
  {
    id: 'usr_trainer_002',
    name: 'Elena Rostova',
    email: 'trainer@skillforge.dev',
    password_hash: '229c215cab170e3c4d375d3fd7e456b1e624b525ffc092d5413f7652af57230b',
    role: 'trainer',
    user_type: 'trainer',
    current_role: 'Senior Engineer',
    target_role: 'Staff Engineer',
    experience_years: 8,
    tech_stack: ['Python', 'FastAPI', 'Kubernetes', 'AWS', 'PostgreSQL', 'PyTorch'],
    education: 'M.S. in Software Engineering, Georgia Tech',
    cv_uploaded: true,
    created_at: '2025-01-12T09:30:00.000Z'
  },
  {
    id: 'usr_employee_003',
    name: 'David Chen',
    email: 'dev.employee@skillforge.dev',
    password_hash: '859f3b00fa2c6b0a8f0764a521689e2515ddd57a261e34de9fa95dd9e61f79c4',
    role: 'employee',
    user_type: 'employee',
    current_role: 'Backend Dev',
    target_role: 'Senior Backend Dev',
    experience_years: 3,
    tech_stack: ['Node.js', 'Express', 'SQL', 'PostgreSQL', 'Docker', 'Redis'],
    education: 'B.S. in Information Technology, San Jose State University',
    cv_uploaded: true,
    created_at: '2025-01-15T10:15:00.000Z'
  },
  {
    id: 'usr_student_004',
    name: 'Aaliyah Patel',
    email: 'cs.student@skillforge.dev',
    password_hash: '5be783dbe0f33f235f09d65d5d8d988668ebf7b8da01f916e4e38b3fe12907b2',
    role: 'student',
    user_type: 'student',
    current_role: 'CS Senior',
    target_role: 'Junior Full Stack Dev',
    experience_years: 0,
    tech_stack: ['JavaScript', 'HTML5/CSS3', 'Python', 'SQL', 'React'],
    education: 'Candidate for B.S. in Computer Science, UIUC',
    cv_uploaded: false,
    created_at: '2025-01-20T14:00:00.000Z'
  },
  {
    id: 'usr_mle_005',
    name: 'Kiran Subramanian',
    email: 'ml.engineer@skillforge.dev',
    password_hash: '3640b4f16ff93f459ac6c0e5ad0cc0f0084b684941d572f8674bd8681ac93fc6',
    role: 'employee',
    user_type: 'employee',
    current_role: 'ML Engineer',
    target_role: 'AI/LLM Engineer',
    experience_years: 4,
    tech_stack: ['Python', 'PyTorch', 'Pandas', 'Docker', 'FastAPI', 'AWS'],
    education: 'M.S. in Data Science, Columbia University',
    cv_uploaded: true,
    created_at: '2025-01-22T11:45:00.000Z'
  }
];


/**
 * Curated Technical Courses
 * 32 courses aligned with skill gap mitigation and future capability development.
 */
export const CURATED_COURSES = [
  {
    id: 'course_001',
    title: 'TypeScript Static Systems and Type Engineering',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_typescript', 'skill_javascript'],
    difficulty: 'Intermediate',
    duration: '22 hours',
    url: 'https://learn.skillforge.dev/courses/ts-static-systems',
    description: 'Comprehensive study of generic constraints, conditional types, mapped types, and AST transformations.',
    category: 'gap-fixing',
    relevance_tags: ['Web Development', 'Type Safety', 'Enterprise Frontend']
  },
  {
    id: 'course_002',
    title: 'Modern React Architecture and Concurrency Primitives',
    provider: 'Frontend Masters',
    skill_ids: ['skill_react'],
    difficulty: 'Intermediate',
    duration: '28 hours',
    url: 'https://learn.skillforge.dev/courses/react-architecture',
    description: 'Deep dive into concurrent transitions, suspense boundaries, custom state reducer patterns, and DOM diffing mechanics.',
    category: 'gap-fixing',
    relevance_tags: ['Frontend', 'UI Engineering', 'Reactive Systems']
  },
  {
    id: 'course_003',
    title: 'Production Next.js and Hybrid Server Rendering',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_nextjs', 'skill_react', 'skill_typescript'],
    difficulty: 'Advanced',
    duration: '30 hours',
    url: 'https://learn.skillforge.dev/courses/nextjs-hybrid-rendering',
    description: 'Server components, streaming rendering, edge route handlers, and multi-region deployment topologies.',
    category: 'future-readiness',
    relevance_tags: ['SSR', 'Full Stack', 'Cloud Frontend']
  },
  {
    id: 'course_004',
    title: 'Semantic HTML5 and Advanced CSS Layout Systems',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_html_css'],
    difficulty: 'Beginner',
    duration: '16 hours',
    url: 'https://learn.skillforge.dev/courses/html5-css-systems',
    description: 'CSS Grid, Flexbox, container queries, viewport units, accessibility ARIA landmarks, and performance audits.',
    category: 'gap-fixing',
    relevance_tags: ['CSS', 'Accessibility', 'Core Web']
  },
  {
    id: 'course_005',
    title: 'High-Velocity Tailwind CSS Component Architecture',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_tailwind', 'skill_html_css'],
    difficulty: 'Beginner',
    duration: '14 hours',
    url: 'https://learn.skillforge.dev/courses/tailwind-architecture',
    description: 'Design token configuration, JIT compilation mechanics, responsive modifiers, and design system integration.',
    category: 'gap-fixing',
    relevance_tags: ['Styling', 'UI Design', 'Design Systems']
  },
  {
    id: 'course_006',
    title: 'WebAssembly Compilation Pipelines with Rust',
    provider: 'Systems Engineering Institute',
    skill_ids: ['skill_webassembly', 'skill_rust'],
    difficulty: 'Advanced',
    duration: '35 hours',
    url: 'https://learn.skillforge.dev/courses/wasm-rust-pipelines',
    description: 'Compiling native Rust algorithms to Wasm bytecode, shared memory buffers, and canvas rendering optimizations.',
    category: 'future-readiness',
    relevance_tags: ['WebAssembly', 'Low Level', 'Browser Performance']
  },
  {
    id: 'course_007',
    title: 'Node.js Runtime Internals and Event Loop Mechanics',
    provider: 'Node Advisory Board',
    skill_ids: ['skill_nodejs'],
    difficulty: 'Intermediate',
    duration: '24 hours',
    url: 'https://learn.skillforge.dev/courses/nodejs-runtime-internals',
    description: 'Libuv thread pool mechanics, V8 heap lifecycle, buffer streams, worker threads, and memory profiling.',
    category: 'gap-fixing',
    relevance_tags: ['Backend', 'Runtime Architecture', 'Async I/O']
  },
  {
    id: 'course_008',
    title: 'FastAPI High-Throughput REST and Async Pipelines',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_fastapi', 'skill_python'],
    difficulty: 'Intermediate',
    duration: '20 hours',
    url: 'https://learn.skillforge.dev/courses/fastapi-async-pipelines',
    description: 'Asynchronous route definitions, Pydantic data validation schemas, dependency injection, and OpenAPI contract generation.',
    category: 'gap-fixing',
    relevance_tags: ['Python', 'REST', 'Microservices']
  },
  {
    id: 'course_009',
    title: 'Enterprise Microservices with Spring Boot 3',
    provider: 'Enterprise Java Forum',
    skill_ids: ['skill_spring_boot', 'skill_java'],
    difficulty: 'Advanced',
    duration: '40 hours',
    url: 'https://learn.skillforge.dev/courses/springboot3-enterprise',
    description: 'GraalVM native compilation, virtual threads (Project Loom), Spring Cloud Eureka registry, and Resilience4j circuits.',
    category: 'gap-fixing',
    relevance_tags: ['Java', 'Enterprise Architecture', 'Distributed Systems']
  },
  {
    id: 'course_010',
    title: 'High-Concurrency Backend Engineering with Go',
    provider: 'Go Developer Guild',
    skill_ids: ['skill_go'],
    difficulty: 'Intermediate',
    duration: '26 hours',
    url: 'https://learn.skillforge.dev/courses/go-concurrency-backend',
    description: 'Goroutines, buffered channel semantics, context propagation, sync package sync primitives, and pprof profiling.',
    category: 'gap-fixing',
    relevance_tags: ['Go', 'Concurrency', 'Cloud Backend']
  },
  {
    id: 'course_011',
    title: 'gRPC Inter-Service Communication and Protobuf',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_grpc', 'skill_go'],
    difficulty: 'Advanced',
    duration: '18 hours',
    url: 'https://learn.skillforge.dev/courses/grpc-protobuf-systems',
    description: 'Protocol Buffers proto3 definitions, bidirectional streaming, metadata interceptors, and load-balancing strategies.',
    category: 'future-readiness',
    relevance_tags: ['RPC', 'Microservices', 'High Performance']
  },
  {
    id: 'course_012',
    title: 'GraphQL Schema Design and Subgraph Federation',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_graphql', 'skill_nodejs'],
    difficulty: 'Intermediate',
    duration: '22 hours',
    url: 'https://learn.skillforge.dev/courses/graphql-federation',
    description: 'Resolver composition, DataLoader batching to prevent N+1 queries, schema directives, and distributed federated gateways.',
    category: 'gap-fixing',
    relevance_tags: ['API Design', 'Federation', 'Data Layer']
  },
  {
    id: 'course_013',
    title: 'Docker Production Containerization and Image Hardening',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_docker'],
    difficulty: 'Intermediate',
    duration: '18 hours',
    url: 'https://learn.skillforge.dev/courses/docker-production-hardening',
    description: 'Multi-stage Dockerfiles, non-root user execution, cgroup resource limits, vulnerability scanning, and minimal base layers.',
    category: 'gap-fixing',
    relevance_tags: ['DevOps', 'Containers', 'Security']
  },
  {
    id: 'course_014',
    title: 'Kubernetes Cluster Administration and Operations',
    provider: 'Cloud Native Computing Group',
    skill_ids: ['skill_kubernetes', 'skill_docker'],
    difficulty: 'Advanced',
    duration: '38 hours',
    url: 'https://learn.skillforge.dev/courses/kubernetes-cluster-operations',
    description: 'Control plane mechanics, etcd consensus, custom resource definitions (CRDs), ingress controllers, and network policies.',
    category: 'gap-fixing',
    relevance_tags: ['DevOps', 'Orchestration', 'Kubernetes']
  },
  {
    id: 'course_015',
    title: 'AWS Cloud Infrastructure Architecture and Design',
    provider: 'Cloud Architecture Institute',
    skill_ids: ['skill_aws', 'skill_iam'],
    difficulty: 'Advanced',
    duration: '42 hours',
    url: 'https://learn.skillforge.dev/courses/aws-cloud-architecture',
    description: 'Multi-tier VPC topologies, IAM policy evaluation logic, transit gateways, KMS encryption, and auto-scaling fleets.',
    category: 'gap-fixing',
    relevance_tags: ['AWS', 'Cloud Architecture', 'Infrastructure']
  },
  {
    id: 'course_016',
    title: 'Multi-Cloud Infrastructure as Code with Terraform',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_terraform', 'skill_aws'],
    difficulty: 'Intermediate',
    duration: '24 hours',
    url: 'https://learn.skillforge.dev/courses/terraform-iac-multicloud',
    description: 'HCL module authoring, remote state locking, state migration strategies, workspace segregation, and drift detection.',
    category: 'gap-fixing',
    relevance_tags: ['IaC', 'Terraform', 'Automation']
  },
  {
    id: 'course_017',
    title: 'Modern CI/CD Engineering with GitHub Actions',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_github_actions', 'skill_cicd'],
    difficulty: 'Beginner',
    duration: '16 hours',
    url: 'https://learn.skillforge.dev/courses/github-actions-cicd',
    description: 'Matrix builds, caching dependencies, OpenID Connect authentication with cloud providers, and reusable workflow templates.',
    category: 'gap-fixing',
    relevance_tags: ['CI/CD', 'GitHub', 'DevOps']
  },
  {
    id: 'course_018',
    title: 'PostgreSQL Advanced Tuning and Query Plan Optimization',
    provider: 'Database Systems Group',
    skill_ids: ['skill_postgresql', 'skill_sql'],
    difficulty: 'Advanced',
    duration: '30 hours',
    url: 'https://learn.skillforge.dev/courses/postgresql-tuning-plans',
    description: 'EXPLAIN ANALYZE interpretation, B-Tree and GIN indexes, MVCC mechanics, VACUUM tuning, and connection pool sizing.',
    category: 'gap-fixing',
    relevance_tags: ['Databases', 'SQL', 'PostgreSQL']
  },
  {
    id: 'course_019',
    title: 'Distributed In-Memory Storage Patterns with Redis',
    provider: 'Cache Engineering Forum',
    skill_ids: ['skill_redis'],
    difficulty: 'Intermediate',
    duration: '20 hours',
    url: 'https://learn.skillforge.dev/courses/redis-distributed-patterns',
    description: 'Redis data structures, eviction policies (LRU/LFU), Pub/Sub, Redis Cluster partitioning, and Redlock distributed locks.',
    category: 'gap-fixing',
    relevance_tags: ['Caching', 'Redis', 'NoSQL']
  },
  {
    id: 'course_020',
    title: 'Real-Time Event Streaming with Apache Kafka',
    provider: 'Distributed Systems Academy',
    skill_ids: ['skill_kafka'],
    difficulty: 'Advanced',
    duration: '32 hours',
    url: 'https://learn.skillforge.dev/courses/kafka-event-streaming',
    description: 'Log compaction, consumer group rebalancing, exactly-once processing semantics, Schema Registry, and Kafka Streams.',
    category: 'gap-fixing',
    relevance_tags: ['Streaming', 'Kafka', 'Data Engineering']
  },
  {
    id: 'course_021',
    title: 'Distributed Analytics at Scale with Apache Spark',
    provider: 'Data Systems Institute',
    skill_ids: ['skill_spark', 'skill_python'],
    difficulty: 'Intermediate',
    duration: '34 hours',
    url: 'https://learn.skillforge.dev/courses/spark-distributed-analytics',
    description: 'Catalyst optimizer internals, lazy execution plans, broadcast joins, shuffle partitioning, and PySpark DataFrame APIs.',
    category: 'gap-fixing',
    relevance_tags: ['Big Data', 'Spark', 'Python']
  },
  {
    id: 'course_022',
    title: 'Modern Analytics Engineering with dbt and Snowflake',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_dbt', 'skill_snowflake', 'skill_sql'],
    difficulty: 'Intermediate',
    duration: '24 hours',
    url: 'https://learn.skillforge.dev/courses/dbt-snowflake-analytics',
    description: 'Modular SQL transformations, Jinja macros, incremental materialization, data testing schemas, and warehouse scaling.',
    category: 'gap-fixing',
    relevance_tags: ['Analytics Engineering', 'dbt', 'Snowflake']
  },
  {
    id: 'course_023',
    title: 'Data Pipeline Orchestration with Apache Airflow',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_airflow', 'skill_python'],
    difficulty: 'Intermediate',
    duration: '22 hours',
    url: 'https://learn.skillforge.dev/courses/airflow-orchestration',
    description: 'Authoring Python DAGs, custom operators, dynamic task mapping, TaskFlow API, sensor patterns, and Celery executors.',
    category: 'gap-fixing',
    relevance_tags: ['Data Pipelines', 'Airflow', 'Orchestration']
  },
  {
    id: 'course_024',
    title: 'Deep Learning Engineering with PyTorch',
    provider: 'Machine Learning Institute',
    skill_ids: ['skill_pytorch', 'skill_python'],
    difficulty: 'Intermediate',
    duration: '36 hours',
    url: 'https://learn.skillforge.dev/courses/pytorch-deep-learning',
    description: 'Tensor operations, custom nn.Module architectures, loss functions, optimizers, learning rate schedulers, and GPU training.',
    category: 'gap-fixing',
    relevance_tags: ['Deep Learning', 'PyTorch', 'ML']
  },
  {
    id: 'course_025',
    title: 'Retrieval-Augmented Generation Architecture and Evaluation',
    provider: 'AI Engineering Institute',
    skill_ids: ['skill_rag', 'skill_vector_db', 'skill_python'],
    difficulty: 'Advanced',
    duration: '28 hours',
    url: 'https://learn.skillforge.dev/courses/rag-architecture-evaluation',
    description: 'Document chunking hierarchies, cross-encoder reranking, vector similarity metrics, hybrid keyword-vector search, and RAGAS metrics.',
    category: 'future-readiness',
    relevance_tags: ['RAG', 'Vector Search', 'LLMs']
  },
  {
    id: 'course_026',
    title: 'Building LLM Applications with LangChain and LlamaIndex',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_langchain', 'skill_llamaindex'],
    difficulty: 'Intermediate',
    duration: '26 hours',
    url: 'https://learn.skillforge.dev/courses/langchain-llamaindex-apps',
    description: 'LCEL expression language, index routing, multi-document synthesis, tool execution chains, and conversational memory stores.',
    category: 'future-readiness',
    relevance_tags: ['LangChain', 'LlamaIndex', 'AI Applications']
  },
  {
    id: 'course_027',
    title: 'Autonomous Agentic AI and Multi-Agent Orchestration',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_agentic_ai', 'skill_python'],
    difficulty: 'Advanced',
    duration: '32 hours',
    url: 'https://learn.skillforge.dev/courses/agentic-ai-orchestration',
    description: 'Plan-and-solve routines, ReAct reflection loops, stateful human-in-the-loop controls, and multi-agent collaborative graphs.',
    category: 'future-readiness',
    relevance_tags: ['Agents', 'Autonomous Systems', 'AI']
  },
  {
    id: 'course_028',
    title: 'Model Context Protocol (MCP) Standards and Implementations',
    provider: 'SkillForge Academy',
    skill_ids: ['skill_mcp', 'skill_typescript', 'skill_python'],
    difficulty: 'Intermediate',
    duration: '20 hours',
    url: 'https://learn.skillforge.dev/courses/mcp-standards',
    description: 'MCP client architecture, JSON-RPC schema validation, context server exposure, tool registering, and security boundaries.',
    category: 'future-readiness',
    relevance_tags: ['MCP', 'Protocols', 'AI Tooling']
  },
  {
    id: 'course_029',
    title: 'Foundation Model Fine-Tuning with LoRA and QLoRA',
    provider: 'Hugging Face Engineering',
    skill_ids: ['skill_fine_tuning', 'skill_pytorch'],
    difficulty: 'Advanced',
    duration: '30 hours',
    url: 'https://learn.skillforge.dev/courses/lora-qlora-finetuning',
    description: 'Quantization mechanics (4-bit normal float), low-rank adaptation matrix rank selection, dataset tokenization, and SFT trainers.',
    category: 'future-readiness',
    relevance_tags: ['Fine-Tuning', 'PEFT', 'Foundation Models']
  },
  {
    id: 'course_030',
    title: 'OWASP Top 10 Web Security and Defense Implementation',
    provider: 'Application Security Guild',
    skill_ids: ['skill_owasp', 'skill_devsecops'],
    difficulty: 'Intermediate',
    duration: '22 hours',
    url: 'https://learn.skillforge.dev/courses/owasp-top-10-defense',
    description: 'SQLi, XSS, CSRF, SSRF, broken object level authorization (BOLA), cryptographic failures, and automated defensive headers.',
    category: 'gap-fixing',
    relevance_tags: ['Security', 'OWASP', 'AppSec']
  },
  {
    id: 'course_031',
    title: 'Zero Trust Network Architecture and Cloud Identity',
    provider: 'Enterprise Security Forum',
    skill_ids: ['skill_zero_trust', 'skill_iam'],
    difficulty: 'Advanced',
    duration: '28 hours',
    url: 'https://learn.skillforge.dev/courses/zero-trust-cloud-identity',
    description: 'Micro-segmentation, continuous adaptive risk evaluation, identity-aware proxies, mutual TLS, and conditional access policies.',
    category: 'future-readiness',
    relevance_tags: ['Zero Trust', 'IAM', 'Security Architecture']
  },
  {
    id: 'course_032',
    title: 'Native Android Modern Architecture with Kotlin',
    provider: 'Mobile Engineering Guild',
    skill_ids: ['skill_kotlin'],
    difficulty: 'Intermediate',
    duration: '30 hours',
    url: 'https://learn.skillforge.dev/courses/kotlin-android-modern',
    description: 'Jetpack Compose declarative UI, Coroutines and StateFlow, Room local database caching, and Hilt dependency injection.',
    category: 'gap-fixing',
    relevance_tags: ['Android', 'Kotlin', 'Mobile']
  }
];

/**
 * Technical Market Trends Telemetry
 * 16 domain trend records monitoring market direction, demand velocity, and hiring patterns.
 */
export const MARKET_TRENDS = [
  {
    id: 'trend_001',
    domain: 'Agentic AI',
    trend_direction: 'Rising',
    demand_score: 98,
    year_over_year_growth: '+114%',
    key_skills: ['Agentic AI', 'MCP', 'Python', 'LangChain'],
    description: 'Transition from single-turn chat interfaces to autonomous goal-directed systems utilizing tools and multi-step reasoning.',
    top_hiring_regions: ['North America', 'Western Europe', 'Remote', 'APAC'],
    salary_range_usd: { min: 165000, max: 245000, median: 195000 }
  },
  {
    id: 'trend_002',
    domain: 'LLM Engineering',
    trend_direction: 'Rising',
    demand_score: 96,
    year_over_year_growth: '+88%',
    key_skills: ['RAG Architecture', 'Vector Databases', 'Prompt Engineering', 'Python'],
    description: 'Enterprise integration of proprietary datasets with foundational models through hybrid retrieval and orchestration.',
    top_hiring_regions: ['North America', 'Western Europe', 'Remote'],
    salary_range_usd: { min: 160000, max: 235000, median: 190000 }
  },
  {
    id: 'trend_003',
    domain: 'MLOps',
    trend_direction: 'Rising',
    demand_score: 92,
    year_over_year_growth: '+64%',
    key_skills: ['PyTorch', 'Docker', 'Kubernetes', 'Airflow'],
    description: 'Standardization of model training pipelines, automated evaluation benchmarks, and low-latency inference serving.',
    top_hiring_regions: ['North America', 'Western Europe', 'APAC'],
    salary_range_usd: { min: 150000, max: 220000, median: 180000 }
  },
  {
    id: 'trend_004',
    domain: 'Cloud Security',
    trend_direction: 'Rising',
    demand_score: 94,
    year_over_year_growth: '+52%',
    key_skills: ['Zero Trust', 'IAM', 'AWS', 'Azure'],
    description: 'Heightened enterprise demand for identity-first perimeter defense, cloud posture management, and access governance.',
    top_hiring_regions: ['North America', 'Western Europe', 'APAC'],
    salary_range_usd: { min: 155000, max: 225000, median: 185000 }
  },
  {
    id: 'trend_005',
    domain: 'DevSecOps',
    trend_direction: 'Rising',
    demand_score: 91,
    year_over_year_growth: '+48%',
    key_skills: ['DevSecOps', 'CI/CD', 'OWASP', 'GitHub Actions'],
    description: 'Shifting security left by embedding static analysis, dependency vulnerability scans, and container audits directly in pipelines.',
    top_hiring_regions: ['North America', 'Western Europe', 'Remote'],
    salary_range_usd: { min: 145000, max: 210000, median: 175000 }
  },
  {
    id: 'trend_006',
    domain: 'Data Engineering',
    trend_direction: 'Rising',
    demand_score: 93,
    year_over_year_growth: '+42%',
    key_skills: ['dbt', 'Snowflake', 'Spark', 'SQL', 'Python'],
    description: 'Growth of the modern data stack emphasizing modular SQL transformations, analytical warehousing, and stream ingestion.',
    top_hiring_regions: ['North America', 'Western Europe', 'APAC'],
    salary_range_usd: { min: 140000, max: 205000, median: 170000 }
  },
  {
    id: 'trend_007',
    domain: 'Platform Engineering',
    trend_direction: 'Rising',
    demand_score: 90,
    year_over_year_growth: '+58%',
    key_skills: ['Kubernetes', 'Terraform', 'CI/CD', 'Docker'],
    description: 'Creation of internal developer platforms (IDPs) to reduce cognitive load and provide automated self-service infrastructure.',
    top_hiring_regions: ['North America', 'Western Europe', 'Remote'],
    salary_range_usd: { min: 150000, max: 220000, median: 180000 }
  },
  {
    id: 'trend_008',
    domain: 'Rust Systems',
    trend_direction: 'Rising',
    demand_score: 87,
    year_over_year_growth: '+66%',
    key_skills: ['Rust', 'WebAssembly', 'C++'],
    description: 'Adoption of Rust across high-throughput backend services, OS kernels, and infrastructure tooling due to memory safety guarantees.',
    top_hiring_regions: ['North America', 'Western Europe', 'Remote'],
    salary_range_usd: { min: 160000, max: 230000, median: 190000 }
  },
  {
    id: 'trend_009',
    domain: 'Edge Computing',
    trend_direction: 'Rising',
    demand_score: 85,
    year_over_year_growth: '+44%',
    key_skills: ['WebAssembly', 'Go', 'Docker', 'Kubernetes'],
    description: 'Decentralized compute workloads executing at CDN edge pops and IoT gateways to minimize roundtrip network latency.',
    top_hiring_regions: ['North America', 'Western Europe', 'APAC'],
    salary_range_usd: { min: 145000, max: 215000, median: 175000 }
  },
  {
    id: 'trend_010',
    domain: 'Full Stack Development',
    trend_direction: 'Stable',
    demand_score: 88,
    year_over_year_growth: '+8%',
    key_skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    description: 'Consistent industry requirement for engineers capable of delivering end-to-end user-facing products and API services.',
    top_hiring_regions: ['North America', 'Western Europe', 'Latin America', 'APAC'],
    salary_range_usd: { min: 120000, max: 180000, median: 150000 }
  },
  {
    id: 'trend_011',
    domain: 'Mobile Development',
    trend_direction: 'Stable',
    demand_score: 82,
    year_over_year_growth: '+5%',
    key_skills: ['Kotlin', 'Swift', 'React'],
    description: 'Steady enterprise demand for native iOS and Android application maintainability, performance, and hardware integrations.',
    top_hiring_regions: ['North America', 'Western Europe', 'APAC'],
    salary_range_usd: { min: 125000, max: 185000, median: 155000 }
  },
  {
    id: 'trend_012',
    domain: 'Event-Driven Architecture',
    trend_direction: 'Rising',
    demand_score: 89,
    year_over_year_growth: '+36%',
    key_skills: ['Kafka', 'Redis', 'Go', 'AWS'],
    description: 'Migration from synchronous request-response bottlenecks toward decoupled asynchronous pub-sub architectures.',
    top_hiring_regions: ['North America', 'Western Europe', 'Remote'],
    salary_range_usd: { min: 145000, max: 210000, median: 175000 }
  },
  {
    id: 'trend_013',
    domain: 'Cloud-Native Microservices',
    trend_direction: 'Stable',
    demand_score: 86,
    year_over_year_growth: '+10%',
    key_skills: ['Docker', 'Kubernetes', 'gRPC', 'Go'],
    description: 'Established microservice architectures prioritizing containerized deployability and resilient service meshes.',
    top_hiring_regions: ['North America', 'Western Europe', 'APAC'],
    salary_range_usd: { min: 135000, max: 195000, median: 165000 }
  },
  {
    id: 'trend_014',
    domain: 'jQuery',
    trend_direction: 'Declining',
    demand_score: 28,
    year_over_year_growth: '-34%',
    key_skills: ['JavaScript', 'HTML5/CSS3'],
    description: 'Legacy DOM manipulation library being systematically phased out in favor of modern standard DOM APIs and component frameworks.',
    top_hiring_regions: ['Legacy Enterprise Maintenance'],
    salary_range_usd: { min: 75000, max: 115000, median: 92000 }
  },
  {
    id: 'trend_015',
    domain: 'Legacy PHP',
    trend_direction: 'Declining',
    demand_score: 35,
    year_over_year_growth: '-26%',
    key_skills: ['PHP', 'SQL'],
    description: 'Monolithic legacy PHP codebases undergoing active migration to modern Node.js, Python, or Go microservices.',
    top_hiring_regions: ['Legacy Web Hosting', 'Regional Agencies'],
    salary_range_usd: { min: 70000, max: 110000, median: 88000 }
  },
  {
    id: 'trend_016',
    domain: 'Blockchain/Web3',
    trend_direction: 'Declining',
    demand_score: 42,
    year_over_year_growth: '-38%',
    key_skills: ['Rust', 'Go'],
    description: 'Marked contraction in speculative cryptocurrency ventures, shifting developer capital toward applied AI and cloud engineering.',
    top_hiring_regions: ['Remote Boutique Studios'],
    salary_range_usd: { min: 110000, max: 175000, median: 140000 }
  }
];


/**
 * Technical Diagnostic Assessment Question Bank
 * 64 rigorous questions distributed across 8 core IT engineering categories.
 */
export const DIAGNOSTIC_QUESTIONS = {
  'Programming Fundamentals': [
    {
      id: 'q_prog_001',
      question_text: 'What is the average and worst-case time complexity of hash table lookup under separate chaining?',
      options: [
        'Average O(1), Worst-case O(n)',
        'Average O(log n), Worst-case O(n)',
        'Average O(1), Worst-case O(log n)',
        'Average O(1), Worst-case O(1)'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_javascript', 'skill_python', 'skill_java'],
      explanation: 'Under uniform hashing, average lookup is O(1). If all keys collide into the same bucket chain, lookup degrades to O(n).'
    },
    {
      id: 'q_prog_002',
      question_text: 'In the JavaScript event loop, when is the microtask queue executed relative to the macrotask queue?',
      options: [
        'Immediately after each macrotask completes and before browser rendering',
        'Only after all macrotasks in the queue have completed execution',
        'In parallel with macrotasks using background worker threads',
        'At fixed intervals determined by the browser timer resolution'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_javascript', 'skill_nodejs'],
      explanation: 'Microtasks (Promises, queueMicrotask) execute exhaustively after the current macrotask finishes and before the next rendering or macrotask.'
    },
    {
      id: 'q_prog_003',
      question_text: 'What is the fundamental architectural distinction between stack and heap memory allocation?',
      options: [
        'Stack handles LIFO call frames and local primitives; heap handles dynamically allocated reference objects managed by GC',
        'Stack memory persists across thread lifecycles; heap memory is local to individual function frames',
        'Stack allocation requires explicit system calls; heap allocation is executed automatically by CPU registers',
        'Stack size grows dynamically without bounds; heap size is fixed at program startup'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_cpp', 'skill_rust', 'skill_go'],
      explanation: 'Stack memory is organized as contiguous LIFO frames for local scopes; heap memory accommodates dynamic structures requiring garbage collection or manual release.'
    },
    {
      id: 'q_prog_004',
      question_text: 'Why does immutability prevent race conditions in concurrent multi-threaded execution?',
      options: [
        'Immutable data structures cannot be mutated in place, allowing safe concurrent reads without synchronization locks',
        'Immutable variables automatically allocate dedicated thread-local cache lines in L1 cache',
        'Immutability forces threads to execute serially through kernel mutex barriers',
        'Immutable objects bypass RAM and exist solely within CPU instruction registers'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_rust', 'skill_java', 'skill_go'],
      explanation: 'Race conditions require concurrent write operations. Because immutable data cannot be altered after creation, concurrent readers never observe corrupted state.'
    },
    {
      id: 'q_prog_005',
      question_text: 'What mathematical property does the bitwise expression (n & (n - 1)) === 0 evaluate for positive integer n?',
      options: [
        'Tests whether n is an exact power of two',
        'Tests whether n is an odd integer',
        'Calculates the parity bit of n in constant time',
        'Tests whether n is divisible by four'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_cpp', 'skill_rust', 'skill_python'],
      explanation: 'A power of two has exactly one bit set. Subtracting 1 flips that bit and sets all lower bits. Performing bitwise AND yields 0.'
    },
    {
      id: 'q_prog_006',
      question_text: 'Which sorting algorithm guarantees O(n log n) worst-case time complexity without auxiliary O(n) memory allocation?',
      options: [
        'Heapsort',
        'Quicksort',
        'Mergesort',
        'Radix Sort'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_cpp', 'skill_java', 'skill_python'],
      explanation: 'Heapsort operates in-place using O(1) auxiliary space and guarantees O(n log n) worst-case bounds, unlike Quicksort (O(n^2)) or Mergesort (O(n) auxiliary space).'
    },
    {
      id: 'q_prog_007',
      question_text: 'Which of the following is NOT one of the four necessary Coffman conditions for system deadlock?',
      options: [
        'Asynchronous I/O polling',
        'Mutual exclusion',
        'Hold and wait',
        'Circular wait'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_go', 'skill_rust', 'skill_java'],
      explanation: 'The four Coffman conditions are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Asynchronous I/O polling is unrelated.'
    },
    {
      id: 'q_prog_008',
      question_text: 'In languages like Java and JavaScript, how are object references handled when passed as function arguments?',
      options: [
        'The reference pointer itself is passed by value; rebinding the parameter does not affect the caller variable',
        'Objects are deep-copied by value into the callee stack frame',
        'The caller variable is passed by reference; rebinding the parameter updates the caller variable',
        'Objects are converted into immutable proxies prior to stack frame invocation'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_javascript', 'skill_java'],
      explanation: 'These languages are strictly pass-by-value. When an object is passed, the value passed is the memory reference; modifying object properties reflects, but reassigning the parameter does not.'
    }
  ],

  'Frontend Development': [
    {
      id: 'q_front_001',
      question_text: 'What role does the "key" prop serve during React virtual DOM reconciliation on dynamic lists?',
      options: [
        'Provides a stable identity across render cycles so React matches virtual elements with corresponding DOM nodes',
        'Directly maps the component instance to browser localStorage cache keys',
        'Forces React to re-mount the component subtree on every state change',
        'Encrypts the component props before sending them to the browser rendering engine'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_react', 'skill_javascript'],
      explanation: 'Keys allow React to identify which items have changed, been added, or removed, avoiding unnecessary DOM re-creation.'
    },
    {
      id: 'q_front_002',
      question_text: 'Which resource is render-blocking by default during browser critical rendering path processing?',
      options: [
        'Synchronous external CSS stylesheets linked in the document head',
        'Images loaded via standard HTML img tags',
        'Web fonts loaded via CSS font-face declarations',
        'Asynchronous JavaScript scripts marked with the async attribute'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_html_css', 'skill_javascript'],
      explanation: 'Browsers block rendering until CSSOM construction is complete to prevent flash of unstyled content (FOUC).'
    },
    {
      id: 'q_front_003',
      question_text: 'Between CSS selectors "#main .card" and "body div.container .card a.active", which rule takes precedence and why?',
      options: [
        '#main .card takes precedence because ID selectors carry higher specificity weight (0,1,1,0 vs 0,0,3,2)',
        'body div.container .card a.active takes precedence due to greater total class selector count',
        'The selector declared later in the CSS document always wins regardless of selector weights',
        'Both have identical specificity and browser resolves by document order'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_html_css', 'skill_tailwind'],
      explanation: 'Specificity is calculated as (Inline, ID, Class/Attribute/Pseudo-class, Element). One ID outweighs any number of class or element selectors.'
    },
    {
      id: 'q_front_004',
      question_text: 'When is a React useEffect cleanup function executed by the runtime?',
      options: [
        'Immediately before re-running the effect on state change, and when the component unmounts',
        'Only once when the browser window closes or navigates away',
        'Synchronously during the initial render before DOM painting completes',
        'In a background Web Worker after all event handlers finish'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_react', 'skill_typescript'],
      explanation: 'React executes the previous effect cleanup function prior to executing the effect on subsequent renders, as well as on component unmount.'
    },
    {
      id: 'q_front_005',
      question_text: 'What is the correct sequential order of DOM event propagation phases?',
      options: [
        'Capturing phase, Target phase, Bubbling phase',
        'Bubbling phase, Target phase, Capturing phase',
        'Target phase, Bubbling phase, Capturing phase',
        'Capturing phase, Bubbling phase, Target phase'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_javascript', 'skill_html_css'],
      explanation: 'DOM events travel from the window down through ancestors (capture), arrive at target, then propagate back upward (bubble).'
    },
    {
      id: 'q_front_006',
      question_text: 'How do Web Workers communicate data with the main browser UI thread?',
      options: [
        'Via postMessage utilizing the structured clone algorithm or transferable objects without shared memory contention',
        'By directly modifying shared global window objects across execution contexts',
        'Through synchronous IPC pipe handles managed by the operating system kernel',
        'Via synchronous cookie updates read during requestAnimationFrame callbacks'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_javascript', 'skill_webassembly'],
      explanation: 'Web Workers run in isolated thread contexts without direct DOM access, passing messages via postMessage using structured cloning or ArrayBuffer transfers.'
    },
    {
      id: 'q_front_007',
      question_text: 'What is a core operational distinction of React Server Components (RSC) compared to client components?',
      options: [
        'RSC execute exclusively on the server, generating virtual DOM descriptions without shipping JavaScript dependencies to the client bundle',
        'RSC require client-side hydration for all interactive state hooks including useState and useReducer',
        'RSC can only return static HTML strings and cannot be composed with client components',
        'RSC bypass HTTP protocols and require raw WebSocket connections'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_nextjs', 'skill_react'],
      explanation: 'React Server Components execute only on the server, emitting serialized UI representations that do not contribute to client JS bundle size.'
    },
    {
      id: 'q_front_008',
      question_text: 'Which condition triggers a Cross-Origin Resource Sharing (CORS) preflight OPTIONS request?',
      options: [
        'Sending an HTTP request with custom headers like "Authorization" or methods other than GET, HEAD, POST',
        'Making any cross-origin GET request regardless of header composition',
        'Loading an image asset from a third-party CDN using an img tag',
        'Embedding an external stylesheet through a standard link tag'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_javascript', 'skill_react'],
      explanation: 'Requests that use non-simple methods (PUT, DELETE, PATCH) or non-simple headers (Authorization, Content-Type: application/json) trigger preflight checks.'
    }
  ],

  'Backend Development': [
    {
      id: 'q_back_001',
      question_text: 'Which standard HTTP methods are specified as idempotent by the RFC 9110 specification?',
      options: [
        'GET, HEAD, PUT, DELETE',
        'GET, POST, PUT, DELETE',
        'POST, PUT, PATCH',
        'GET, POST, OPTIONS'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_nodejs', 'skill_fastapi', 'skill_express'],
      explanation: 'Idempotency means multiple identical requests produce the same side-effects on the server. GET, HEAD, PUT, and DELETE are idempotent; POST is not.'
    },
    {
      id: 'q_back_002',
      question_text: 'What causes the "N+1 query problem" in relational ORM systems and how is it resolved?',
      options: [
        'Iterating over N parent records and issuing individual queries for each related child; resolved via eager loading joins',
        'Allocating N+1 database connection pools during concurrency peaks; resolved by horizontal connection proxies',
        'Using N primary keys with 1 foreign key index; resolved by composite index rebuilding',
        'Sending N HTTP requests for 1 API resource; resolved by HTTP/2 server push'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_sql', 'skill_postgresql', 'skill_django'],
      explanation: 'The N+1 problem occurs when an application queries 1 parent query and N subsequent queries for associated relations. Eager loading (JOIN/subquery) fixes it.'
    },
    {
      id: 'q_back_003',
      question_text: 'Which ANSI SQL transaction isolation level guarantees prevention of phantom read anomalies?',
      options: [
        'Serializable',
        'Repeatable Read',
        'Read Committed',
        'Read Uncommitted'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_postgresql', 'skill_sql'],
      explanation: 'Serializable isolation enforces transaction ordering indistinguishable from sequential execution, preventing dirty reads, non-repeatable reads, and phantom reads.'
    },
    {
      id: 'q_back_004',
      question_text: 'Why does gRPC offer significant performance advantages over standard JSON REST APIs in microservices?',
      options: [
        'Uses binary Protocol Buffers serialization over multiplexed HTTP/2 connections with smaller payloads and fast parsing',
        'Bypasses TCP flow control and transmits unverified UDP datagrams across private VPC networks',
        'Pre-compiles all backend database queries into CPU assembly instructions',
        'Eliminates TLS encryption overhead across public network boundaries'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_grpc', 'skill_go'],
      explanation: 'gRPC utilizes Protocol Buffers for compact binary serialization and HTTP/2 for multiplexing multiple calls over single TCP connections.'
    },
    {
      id: 'q_back_005',
      question_text: 'What is the primary architectural trade-off when using purely stateless JWT authentication tokens?',
      options: [
        'Tokens cannot be instantly revoked prior to expiration without maintaining a stateful server-side revocation store',
        'Tokens require synchronous database reads on every incoming HTTP verification',
        'JWT tokens cannot be cryptographically signed by backend servers',
        'Tokens can only be parsed by the specific physical server instance that issued them'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_nodejs', 'skill_fastapi', 'skill_owasp'],
      explanation: 'Because stateless JWT verification relies only on signature validation, revoking compromised tokens immediately requires an external blacklist store.'
    },
    {
      id: 'q_back_006',
      question_text: 'What primary condition results in database connection pool starvation under high concurrent traffic?',
      options: [
        'Worker threads holding active connections open while awaiting slow external network I/O or microservice calls',
        'Too many read-only queries executing against read replicas simultaneously',
        'Using connection pools exceeding operating system file descriptor limits',
        'Configuring transaction isolation level to Read Committed'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_postgresql', 'skill_nodejs', 'skill_spring_boot'],
      explanation: 'Connection starvation occurs when application code retains database connections across non-database asynchronous delays, exhausting the pool for waiting threads.'
    },
    {
      id: 'q_back_007',
      question_text: 'How do Server-Sent Events (SSE) compare architecturally to WebSockets for real-time data delivery?',
      options: [
        'SSE provides unidirectional server-to-client streaming over standard HTTP; WebSockets provide bidirectional full-duplex TCP framing',
        'SSE requires dedicated TCP ports; WebSockets operate over standard HTTP port 80',
        'SSE supports binary byte stream transmission; WebSockets only support UTF-8 text',
        'SSE requires browser plugins; WebSockets are native HTML5 standards'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_nodejs', 'skill_fastapi', 'skill_javascript'],
      explanation: 'SSE operates over standard HTTP connections streaming text/event-stream data unidirectionally from server to client with native browser reconnection.'
    },
    {
      id: 'q_back_008',
      question_text: 'In reactive asynchronous stream processing, what is the purpose of backpressure mechanisms?',
      options: [
        'Allows a slower consuming downstream service to signal its processing capacity to upstream producers to prevent buffer exhaustion',
        'Forces upstream publishers to drop all incoming messages when network bandwidth drops below 10Mbps',
        'Encrypts stream payloads during transmission across unauthenticated public networks',
        'Compresses message batches using gzip algorithms during high traffic volume'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_nodejs', 'skill_go', 'skill_kafka'],
      explanation: 'Backpressure ensures consumer services control publisher delivery rates, preventing out-of-memory errors caused by unbounded in-flight queues.'
    }
  ],

  'Cloud and DevOps': [
    {
      id: 'q_cloud_001',
      question_text: 'In Kubernetes, what does a pod status of CrashLoopBackOff signify to an operations engineer?',
      options: [
        'The container initiates, crashes or terminates with an error code, and kubelet restarts it with exponential backoff delay',
        'The worker node has lost network connectivity to the cluster etcd control plane',
        'The pod definition violates admission controller security context constraints and is rejected',
        'The pod is waiting for persistent volume claims to complete dynamic storage provisioning'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_kubernetes', 'skill_docker'],
      explanation: 'CrashLoopBackOff indicates the container process exits repeatedly with an error; kubelet enforces progressively longer delay before each restart attempt.'
    },
    {
      id: 'q_cloud_002',
      question_text: 'Why are multi-stage Docker builds standard practice for containerized production releases?',
      options: [
        'Build tools and intermediate compilation dependencies remain in builder stages, producing minimal and hardened runtime images',
        'Multi-stage builds allow containers to share kernel execution memory across multiple host machines',
        'They bypass Docker layer caching to guarantee fresh package installation on every build',
        'They automatically encrypt container images before pushing to public artifact registries'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_docker', 'skill_cicd'],
      explanation: 'Multi-stage builds isolate build tooling (compilers, SDKs) in transient containers, copying only final production binaries into minimal base runtime images.'
    },
    {
      id: 'q_cloud_003',
      question_text: 'What critical operational failure does remote state locking prevent in Terraform workflows?',
      options: [
        'Prevents simultaneous team executions from conflicting and corrupting cloud resource state files',
        'Prevents cloud providers from charging for idle infrastructure resources',
        'Locks cloud provider API keys inside encrypted hardware security modules',
        'Prevents terraform plan from displaying sensitive environment variables'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_terraform', 'skill_aws'],
      explanation: 'State locking (e.g., using DynamoDB with S3 backend) prevents concurrent execution runs from colliding and creating unrecoverable state corruption.'
    },
    {
      id: 'q_cloud_004',
      question_text: 'How does a canary release deployment strategy differ from a blue-green deployment strategy?',
      options: [
        'Canary routes a small percentage of production traffic to the new version to validate telemetry; blue-green switches 100% traffic across dual environments',
        'Canary requires two identical full-scale production environments active at all times; blue-green requires only one',
        'Canary deployment is only applicable to frontend assets; blue-green applies exclusively to relational databases',
        'Canary deployments bypass integration testing and deploy straight to live users'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_cicd', 'skill_kubernetes'],
      explanation: 'Canary strategies test new versions in production against a minor slice of live user traffic before full rollout; blue-green utilizes side-by-side full environments.'
    },
    {
      id: 'q_cloud_005',
      question_text: 'What is the key functional distinction between Continuous Delivery and Continuous Deployment?',
      options: [
        'Continuous Delivery requires manual operational approval before production release; Continuous Deployment releases automatically upon passing tests',
        'Continuous Delivery tests code in staging; Continuous Deployment skips staging and tests on local machines',
        'Continuous Delivery applies to container workloads; Continuous Deployment applies solely to bare-metal servers',
        'Continuous Delivery requires nightly batch builds; Continuous Deployment builds every 30 minutes'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_cicd', 'skill_github_actions'],
      explanation: 'Continuous Delivery automates the release pipeline up to production readiness requiring human sign-off; Continuous Deployment deploys every commit that passes automated gates.'
    },
    {
      id: 'q_cloud_006',
      question_text: 'In Kubernetes networking, what is the behavior of a Service configured with type ClusterIP?',
      options: [
        'Exposes the service on a cluster-internal IP accessible only from within the cluster pods and nodes',
        'Exposes the service externally on an open static port across every cluster worker node',
        'Provisions a cloud provider network load balancer with an external public IP',
        'Routes traffic directly to host machine loopback interfaces'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_kubernetes'],
      explanation: 'ClusterIP is the default Kubernetes Service type; it assigns an internal virtual IP address reachable only by components within the cluster.'
    },
    {
      id: 'q_cloud_007',
      question_text: 'Why should cloud compute workloads assume IAM roles rather than storing long-lived access keys in code?',
      options: [
        'IAM roles utilize short-lived temporary security tokens rotated automatically by AWS STS, reducing credential leak exposure',
        'IAM roles provide unlimited root administrative privileges to running EC2 instances',
        'Access keys cause network bandwidth bottlenecks during AWS API requests',
        'IAM roles store access keys in plaintext configuration files for rapid debugging'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_aws', 'skill_iam', 'skill_zero_trust'],
      explanation: 'IAM roles dispense temporary credentials through AWS STS with automatic rotation, eliminating the security vulnerability of static leaked access keys.'
    },
    {
      id: 'q_cloud_008',
      question_text: 'In distributed tracing systems like OpenTelemetry, how are Trace IDs and Span IDs utilized?',
      options: [
        'Trace ID represents the end-to-end user request path; Span ID represents an individual unit of work within a specific service',
        'Trace ID encrypts log data; Span ID compresses metrics in time-series databases',
        'Trace ID is unique to physical servers; Span ID is assigned to container processes',
        'Trace IDs are discarded after request completion; Span IDs persist indefinitely'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_cicd', 'skill_kubernetes', 'skill_aws'],
      explanation: 'A Trace ID correlates all downstream microservice calls involved in fulfilling one client request; each operation within a service generates its own Span ID.'
    }
  ],

  'Data and ML': [
    {
      id: 'q_data_001',
      question_text: 'In machine learning supervised model evaluation, what does high variance indicate about model behavior?',
      options: [
        'The model is overfitting to training noise and fails to generalize effectively to unseen validation datasets',
        'The model is too simplistic to capture the underlying data patterns (underfitting)',
        'The dataset contains excessive missing values in independent feature columns',
        'The learning rate is too low to converge toward global minimum loss'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_python', 'skill_pytorch', 'skill_pandas'],
      explanation: 'High variance indicates the model fits training data nuances and noise too closely, performing exceptionally on training data but poorly on test data.'
    },
    {
      id: 'q_data_002',
      question_text: 'How does a Star Schema differ from a Snowflake Schema in analytical data warehouse modeling?',
      options: [
        'Star schema denormalizes dimension tables for simpler queries and faster joins; Snowflake schema normalizes dimension tables into hierarchies',
        'Star schema uses columnar compression; Snowflake schema uses row-oriented storage',
        'Star schema is only supported by PostgreSQL; Snowflake schema requires cloud warehouses',
        'Star schema prohibits foreign key relationships; Snowflake schema requires multiple fact tables'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_sql', 'skill_snowflake', 'skill_dbt'],
      explanation: 'Star schemas connect central fact tables directly to denormalized dimensions; Snowflake schemas decompose dimensions into normalized sub-tables.'
    },
    {
      id: 'q_data_003',
      question_text: 'What characterizes Apache Spark lazy evaluation when executing DataFrame transformations?',
      options: [
        'Transformations build an execution lineage graph (DAG) without running; computation only executes when an action (e.g. count, collect) is called',
        'Spark delays query compilation until the cluster memory utilization reaches 90%',
        'Transformations are executed immediately in memory while actions are queued to disk',
        'Lazy evaluation refers to worker nodes falling asleep when executor queues are empty'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_spark', 'skill_python'],
      explanation: 'Spark records transformations in a Directed Acyclic Graph (DAG) and defers execution until an action forces evaluation, allowing Catalyst query optimizations.'
    },
    {
      id: 'q_data_004',
      question_text: 'When training a machine learning model for fraud detection where positive cases are rare (1%), which metric is most reliable?',
      options: [
        'Precision-Recall Area Under Curve (PR-AUC)',
        'Raw classification accuracy percentage',
        'Mean Squared Error (MSE)',
        'R-squared goodness of fit'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_python', 'skill_pandas', 'skill_pytorch'],
      explanation: 'In highly imbalanced datasets, accuracy is deceptive (a model predicting 100% negative achieves 99% accuracy). PR-AUC evaluates true positive vs false positive trade-offs.'
    },
    {
      id: 'q_data_005',
      question_text: 'What is the operational difference between data drift and concept drift in production ML pipelines?',
      options: [
        'Data drift involves changes in input feature distributions P(X); concept drift involves changes in the relationship between features and labels P(Y|X)',
        'Data drift occurs during training; concept drift occurs during model inference',
        'Data drift affects unstructured text only; concept drift affects numerical tables',
        'Data drift represents hardware failures; concept drift represents software bugs'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_python', 'skill_pytorch'],
      explanation: 'Data drift means the distribution of incoming input features shifts over time; concept drift means the real-world statistical mapping between inputs and targets changes.'
    },
    {
      id: 'q_data_006',
      question_text: 'How does log compaction function in Apache Kafka topic partitions?',
      options: [
        'Kafka retains the latest message value for each message key within a partition, pruning obsolete earlier versions',
        'Kafka compresses log segments using zstandard algorithms when disk capacity drops below 10%',
        'Kafka automatically deletes all messages older than 24 hours regardless of key',
        'Kafka merges separate topic partitions into a single consolidated log file'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_kafka'],
      explanation: 'Log compaction ensures Kafka retains at least the last known value for each message key within the log of data for a topic partition.'
    },
    {
      id: 'q_data_007',
      question_text: 'What optimization does a dbt "incremental" model materialization strategy provide?',
      options: [
        'Transforms and inserts only records that have arrived or changed since the previous dbt run, reducing query costs and compute time',
        'Creates temporary views that re-execute raw queries on every analytical dashboard request',
        'Drops and re-creates entire warehouse database tables on each pipeline execution',
        'Converts structured SQL tables into unstructured JSON document stores'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_dbt', 'skill_snowflake', 'skill_sql'],
      explanation: 'Incremental models transform only new or updated records since the previous run using filtered timestamps, dramatically decreasing compute overhead.'
    },
    {
      id: 'q_data_008',
      question_text: 'In Apache Airflow DAG scheduling, what does the "logical_date" (formerly execution_date) represent?',
      options: [
        'The beginning of the data time interval that the DAG run is processing, not the actual wall-clock execution time',
        'The exact millisecond timestamp when the task worker begins execution',
        'The deadline timestamp before which the DAG will trigger an SLA alert',
        'The date and time the Airflow webserver service was restarted'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_airflow', 'skill_python'],
      explanation: 'Airflow runs operate on data intervals; logical_date identifies the start of the data period being processed, which is generally one interval behind execution time.'
    }
  ],

  'AI and LLM': [
    {
      id: 'q_ai_001',
      question_text: 'In Retrieval-Augmented Generation (RAG), what is the risk of selecting an excessively large chunk size for document embedding?',
      options: [
        'Injects irrelevant noise and dilution into retrieved context, reducing semantic search precision and overflowing LLM attention focus',
        'Causes vector embeddings to exceed standard 1536 floating-point dimensions',
        'Forces the vector database to switch to brute-force kNN searches exclusively',
        'Prevents language models from generating valid JSON responses'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_rag', 'skill_vector_db'],
      explanation: 'Excessively large chunks encompass multiple unrelated topics, diluting the embedding specificity and cluttering LLM context windows with extraneous text.'
    },
    {
      id: 'q_ai_002',
      question_text: 'How does Hierarchical Navigable Small World (HNSW) indexing accelerate vector database nearest neighbor retrieval?',
      options: [
        'Constructs a multi-layered proximity graph where upper layers execute fast coarse hops and bottom layers refine precise neighbors in O(log n)',
        'Converts all floating-point vector embeddings into 1-bit boolean strings',
        'Partitions the vector space into rigid hypercubes using binary decision trees',
        'Executes exact dot products against every vector row in parallel using GPU kernels'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_vector_db', 'skill_rag'],
      explanation: 'HNSW builds multi-layer graph structures where search begins at sparse top layers for long-range navigation and progresses to dense layers for local fine search.'
    },
    {
      id: 'q_ai_003',
      question_text: 'Which architectural combination most effectively mitigates factual hallucination in enterprise LLM applications?',
      options: [
        'RAG with verified domain knowledge chunks, system role constraints, low temperature, and automated response grounding checks',
        'Setting generation temperature to 1.5 with high top_k sampling parameters',
        'Increasing context window size to 1 million tokens without filtering input documents',
        'Relying purely on few-shot prompts without grounding external reference documents'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_rag', 'skill_prompt_eng'],
      explanation: 'Grounding the model with high-precision retrieved facts, low decoding temperature, strict system prompts, and citation verification minimizes hallucinations.'
    },
    {
      id: 'q_ai_004',
      question_text: 'In language model generation sampling, how does top_p (nucleus) sampling differ from top_k sampling?',
      options: [
        'Top_p samples from the dynamic smallest subset of tokens whose cumulative probability exceeds p; top_k selects a fixed number of tokens k',
        'Top_p limits token length; top_k limits vocabulary dictionary size',
        'Top_p alters model weights during inference; top_k freezes attention matrices',
        'Top_p operates only on greedy decoding; top_k operates on beam search'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_prompt_eng', 'skill_python'],
      explanation: 'Top-k restricts sampling to a fixed count of top candidate tokens; top-p dynamically adjusts candidate pool size based on cumulative probability mass.'
    },
    {
      id: 'q_ai_005',
      question_text: 'What is the foundational mathematical mechanism behind Low-Rank Adaptation (LoRA) parameter-efficient fine-tuning?',
      options: [
        'Freezes pre-trained base model weights and decomposes weight update matrices into two low-rank matrices (A and B) with rank r << d',
        'Deletes 50% of foundation model attention heads to accelerate backpropagation',
        'Quantizes 16-bit floating-point weights into 8-bit integers without additional parameters',
        'Trains a secondary classification model to filter foundation model output tokens'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_fine_tuning', 'skill_pytorch'],
      explanation: 'LoRA freezes base weights W0 and represents the update delta W as the product of two low-rank matrices B * A, reducing trainable parameters by over 99%.'
    },
    {
      id: 'q_ai_006',
      question_text: 'In the Model Context Protocol (MCP) architecture, what is the role of an MCP Server?',
      options: [
        'Exposes standardized tools, prompt templates, and resource contexts to MCP Clients via JSON-RPC protocol messages',
        'Runs foundation model inference weights directly in the client browser',
        'Acts as a hardware load balancer between internet users and cloud VPCs',
        'Stores application database backups in encrypted cold storage buckets'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_mcp', 'skill_agentic_ai'],
      explanation: 'MCP servers provide programmatic interfaces exposing external tools, database access, and document resources that MCP clients (like AI assistants) can query.'
    },
    {
      id: 'q_ai_007',
      question_text: 'What execution pattern defines the ReAct (Reasoning and Acting) autonomous agent framework?',
      options: [
        'An iterative loop interleaving chain-of-thought reasoning steps with environment tool actions and observation evaluations',
        'Executing all possible API actions simultaneously in parallel before evaluating outputs',
        'Fine-tuning foundation weights using reinforcement learning on every user turn',
        'Converting user prompts into SQL statements executed directly against system tables'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_agentic_ai', 'skill_langchain'],
      explanation: 'ReAct alternates between generating reasoning thoughts (Reason) and calling tools (Act) to observe real-world feedback before determining subsequent steps.'
    },
    {
      id: 'q_ai_008',
      question_text: 'In advanced RAG pipelines, why is a cross-encoder model deployed as a reranker following initial vector retrieval?',
      options: [
        'Cross-encoders process query and candidate document simultaneously through cross-attention layers, yielding superior relevance scores than bi-encoder embeddings',
        'Cross-encoders compress long documents into single-word vector representations',
        'Cross-encoders translate non-English documents into English prior to generation',
        'Cross-encoders generate synthetic user queries to expand vector search coverage'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_rag', 'skill_vector_db'],
      explanation: 'Bi-encoders encode queries and documents independently for fast retrieval; cross-encoders analyze joint interactions via self-attention for high-accuracy reranking.'
    }
  ],

  'System Design': [
    {
      id: 'q_sys_001',
      question_text: 'According to the CAP Theorem, how must a distributed data system behave when a network partition (P) occurs?',
      options: [
        'The system must trade off between returning the most recent consistent data (C) or remaining available to accept reads and writes (A)',
        'The system can maintain full Consistency and Availability simultaneously by enabling data compression',
        'The partition forces all database instances to shut down to prevent split-brain states',
        'The network partition automatically resolves within 500ms using Raft consensus'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_postgresql', 'skill_redis', 'skill_dynamodb'],
      explanation: 'In the presence of a network partition (P), a distributed system cannot achieve both Consistency (C) and Availability (A); it must sacrifice one.'
    },
    {
      id: 'q_sys_002',
      question_text: 'How does the Cache-Aside (Lazy Loading) caching pattern handle read operations?',
      options: [
        'Application checks cache; on miss, loads from primary database, writes back to cache, and returns result to client',
        'Application writes data directly to cache, and cache writes asynchronously to database in background',
        'All client requests query database directly, and database triggers cache invalidation webhook',
        'Cache intercepts network packets at DNS layer before reaching application code'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_redis', 'skill_nodejs', 'skill_postgresql'],
      explanation: 'In Cache-Aside, the application first checks the cache. On a cache miss, it reads from storage, updates the cache, and returns the response.'
    },
    {
      id: 'q_sys_003',
      question_text: 'What major benefit does Consistent Hashing provide when scaling distributed caching or database node clusters?',
      options: [
        'Adding or removing a node requires remapping only K/N keys on average rather than remapping all keys',
        'Guarantees zero network latency across multi-region cloud VPC connections',
        'Encrypts cache keys using AES-256 before hashing into circular rings',
        'Eliminates the requirement for backup replica nodes in high-availability clusters'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_redis', 'skill_dynamodb'],
      explanation: 'Consistent hashing maps both nodes and keys to a circular ring. Adding or removing a node affects only adjacent keys (K/N), avoiding massive cluster rebalancing.'
    },
    {
      id: 'q_sys_004',
      question_text: 'How does the Token Bucket rate-limiting algorithm operate under sudden client request bursts?',
      options: [
        'Allows request bursts up to the configured bucket capacity while maintaining a steady continuous refill rate',
        'Drops all requests immediately if the incoming request rate exceeds the 1-second rolling average',
        'Delays burst requests by holding open socket connections until traffic decreases',
        'Doubles the server CPU allocation dynamically during incoming traffic spikes'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_redis', 'skill_nodejs', 'skill_go'],
      explanation: 'Tokens are added to a bucket at a fixed rate up to capacity. Incoming requests consume tokens. Bursts are permitted up to current bucket fullness.'
    },
    {
      id: 'q_sys_005',
      question_text: 'What is the primary operational consequence of database sharding hot-spotting?',
      options: [
        'Uneven distribution of traffic causes one specific shard node to exhaust CPU and I/O while other shards remain underutilized',
        'The database cluster runs out of memory across all nodes simultaneously',
        'Cross-shard joins are converted automatically into single-node queries',
        'Sharded tables lose ACID transaction guarantees permanently'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_postgresql', 'skill_dynamodb', 'skill_mongodb'],
      explanation: 'Hot-spotting occurs when a poorly chosen shard key directs disproportionate traffic (e.g. celebrity accounts or timestamps) to a single database server.'
    },
    {
      id: 'q_sys_006',
      question_text: 'Why do message queues (e.g. Kafka, RabbitMQ) enhance system resilience in microservice architectures?',
      options: [
        'Decouple producers from consumers, buffering traffic spikes and preventing cascading failures if downstream consumers fail',
        'Ensure real-time synchronous HTTP response delivery within 10 milliseconds',
        'Eliminate the need for relational databases in backend application architectures',
        'Automatically fix syntax errors in payload JSON serialization schemas'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_kafka', 'skill_go', 'skill_nodejs'],
      explanation: 'Asynchronous message queues buffer requests during traffic surges and isolate downstream service outages, allowing consumers to process at their own pace.'
    },
    {
      id: 'q_sys_007',
      question_text: 'How does an Active-Passive database cluster architecture handle failure of the primary leader node?',
      options: [
        'Automated health monitor detects leader failure, promotes a standby replica to leader, and redirects client writes via DNS or VIP',
        'The cluster permanently converts all databases into read-only static archives',
        'All client requests fail until manual intervention re-creates database disk partitions',
        'Passive replicas take over client writes without electing a single primary leader'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_postgresql', 'skill_aws'],
      explanation: 'Failover mechanisms detect primary node failure, promote a synchronized passive replica to become the new primary, and update routing targets.'
    },
    {
      id: 'q_sys_008',
      question_text: 'What mechanism do Content Delivery Networks (CDNs) utilize to reduce origin server latency for dynamic web assets?',
      options: [
        'Terminate TLS handshakes geographically close to the user at edge points of presence (PoPs) and maintain persistent origin connections',
        'Re-compile backend server application code directly inside edge router firmware',
        'Replace all backend relational database queries with client-side indexedDB storage',
        'Bypass TCP flow control by broadcasting web assets over public satellite frequencies'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_aws', 'skill_nextjs'],
      explanation: 'Edge PoPs terminate client TLS connections locally (reducing round-trip times) and utilize warm connection pools and caching to reduce origin load.'
    }
  ],

  'Security': [
    {
      id: 'q_sec_001',
      question_text: 'Why do parameterized queries (prepared statements) reliably prevent SQL Injection vulnerabilities?',
      options: [
        'Database engine treats parameterized user inputs strictly as literal values rather than executable SQL syntax commands',
        'Parameterized queries strip all single quote and semicolon characters from input strings',
        'They encrypt the SQL statement using TLS before sending to the database engine',
        'They compile SQL queries into native binary files stored in browser cookie jars'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_sql', 'skill_postgresql', 'skill_owasp'],
      explanation: 'Prepared statements pre-compile the SQL query structure on the database server; user inputs are bound as parameters and cannot alter SQL command logic.'
    },
    {
      id: 'q_sec_002',
      question_text: 'How does Stored Cross-Site Scripting (XSS) differ from Reflected XSS?',
      options: [
        'Stored XSS permanently saves the malicious payload in database storage; Reflected XSS immediately reflects the payload from the current HTTP request',
        'Stored XSS affects only backend servers; Reflected XSS affects client web browsers',
        'Stored XSS requires administrative credentials; Reflected XSS requires no network access',
        'Stored XSS is mitigated by HTTPS; Reflected XSS requires database field encryption'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_owasp', 'skill_javascript'],
      explanation: 'Stored XSS persists malicious code in data stores (e.g. comment fields), affecting all subsequent viewers. Reflected XSS reflects payloads off query parameters.'
    },
    {
      id: 'q_sec_003',
      question_text: 'Which cookie configuration attribute provides strong defense against Cross-Site Request Forgery (CSRF)?',
      options: [
        'SameSite=Strict (or Lax)',
        'HttpOnly=true',
        'Path=/admin',
        'Secure=false'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_owasp', 'skill_nodejs'],
      explanation: 'SameSite=Strict ensures the browser never sends the cookie in cross-site requests, preventing attackers from forging authenticated actions.'
    },
    {
      id: 'q_sec_004',
      question_text: 'What are the three core principles of the Zero Trust Security architecture model?',
      options: [
        'Verify explicitly, Use least privilege access, Assume breach',
        'Trust internal networks, Block external traffic, Encrypt data at rest',
        'Require biometrics, Mandate static passwords, Disable VPN tunnels',
        'Scan source code, Run nightly penetration tests, Eliminate firewalls'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_zero_trust', 'skill_iam'],
      explanation: 'NIST Zero Trust architecture is founded on: Verify Explicitly (continuous auth), Least Privilege Access (minimal permissions), and Assume Breach.'
    },
    {
      id: 'q_sec_005',
      question_text: 'Why should passwords be hashed using algorithms like Argon2id or bcrypt rather than fast cryptographic hashes like SHA-256?',
      options: [
        'Argon2id and bcrypt are computationally expensive adaptive algorithms with configurable salt and memory hardness that resist GPU/ASIC cracking',
        'SHA-256 has been mathematically broken and reverse-computed in linear time',
        'Argon2id stores passwords in reversible encrypted format for user recovery',
        'bcrypt hashes can be decoded without knowing the original salt value'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_owasp', 'skill_nodejs', 'skill_python'],
      explanation: 'Fast hashes (SHA-256) allow attackers to calculate billions of guesses per second on GPUs. Adaptive hashes (bcrypt, Argon2id) force heavy CPU and memory costs.'
    },
    {
      id: 'q_sec_006',
      question_text: 'What is the operational distinction between SAST (Static Analysis) and DAST (Dynamic Analysis) in DevSecOps pipelines?',
      options: [
        'SAST inspects source code white-box without running the application; DAST tests running applications black-box from the outside',
        'SAST tests running Kubernetes pods; DAST tests local developer IDE plugins',
        'SAST detects network firewall misconfigurations; DAST checks git commit signatures',
        'SAST runs only after production deployment; DAST runs during code compilation'
      ],
      correct_option_index: 0,
      difficulty: 'Intermediate',
      skill_tags: ['skill_devsecops', 'skill_cicd', 'skill_owasp'],
      explanation: 'Static Application Security Testing (SAST) analyzes static code repositories for flaws; Dynamic Testing (DAST) attacks running apps from an external perspective.'
    },
    {
      id: 'q_sec_007',
      question_text: 'How does asymmetric cryptography facilitate the initial handshake in Transport Layer Security (TLS)?',
      options: [
        'Authenticates server identity via digital certificate and establishes a shared symmetric session key for fast bulk payload encryption',
        'Encrypts every continuous network packet throughout the entire session using the server private key',
        'Generates plaintext passwords verified by external DNS authority servers',
        'Transmits the server private key to client browsers across initial TCP handshakes'
      ],
      correct_option_index: 0,
      difficulty: 'Advanced',
      skill_tags: ['skill_owasp', 'skill_zero_trust'],
      explanation: 'Asymmetric encryption (RSA/ECC) verifies server certificate authenticity and exchanges keys; fast symmetric encryption (AES-GCM/ChaCha20) then handles payload traffic.'
    },
    {
      id: 'q_sec_008',
      question_text: 'What does the Principle of Least Privilege mandate when configuring cloud IAM policies for microservices?',
      options: [
        'Service accounts must be granted only the minimal specific permissions and resource scopes required to perform designated tasks',
        'All developer accounts should inherit AdministratorAccess for rapid incident triage',
        'Permissions should be granted at the root organization level rather than individual resource roles',
        'Microservices must share a single generic IAM role across development and production environments'
      ],
      correct_option_index: 0,
      difficulty: 'Beginner',
      skill_tags: ['skill_iam', 'skill_aws', 'skill_zero_trust'],
      explanation: 'Least privilege ensures users and service identities possess only the minimal set of authorizations necessary to execute their required function, limiting blast radius.'
    }
  ]
};
