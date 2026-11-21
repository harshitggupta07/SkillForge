/**
 * SkillForge Data Layer - CV and Resume Parsing Engine
 * Module: api/cv-parser.js
 *
 * Provides client-side text extraction, comprehensive skills extraction with
 * taxonomy cross-referencing, education parsing, work experience extraction,
 * and certification discovery without external server dependencies.
 */

import { SKILLS_TAXONOMY } from '../db/seed-data.js';

/**
 * Standard Design System Palette Constants.
 * Strictly adheres to enterprise color constraints.
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
 * Comprehensive Keyword Map for 115+ Enterprise IT Skills, Frameworks, and Tools.
 * Each entry defines canonical id, display name, category, and alias variations.
 */
export const SKILL_KEYWORD_MAP = Object.freeze([
  // Programming Languages
  {
    id: 'skill_javascript',
    name: 'JavaScript',
    category: 'Programming',
    variations: ['javascript', 'js', 'ecmascript', 'es6', 'es2020', 'es2022', 'vanilla js']
  },
  {
    id: 'skill_typescript',
    name: 'TypeScript',
    category: 'Programming',
    variations: ['typescript', 'ts']
  },
  {
    id: 'skill_python',
    name: 'Python',
    category: 'Programming',
    variations: ['python', 'python3', 'py', 'cpython']
  },
  {
    id: 'skill_java',
    name: 'Java',
    category: 'Programming',
    variations: ['java', 'java 8', 'java 11', 'java 17', 'java 21', 'openjdk', 'jvm']
  },
  {
    id: 'skill_go',
    name: 'Go',
    category: 'Programming',
    variations: ['golang', 'go language', 'go programming', 'go-lang']
  },
  {
    id: 'skill_rust',
    name: 'Rust',
    category: 'Programming',
    variations: ['rust', 'rustlang', 'cargo']
  },
  {
    id: 'skill_cpp',
    name: 'C++',
    category: 'Programming',
    variations: ['c++', 'cpp', 'c/c++']
  },
  {
    id: 'skill_csharp',
    name: 'C#',
    category: 'Programming',
    variations: ['c#', 'csharp', 'c sharp', '.net c#']
  },
  {
    id: 'skill_kotlin',
    name: 'Kotlin',
    category: 'Programming',
    variations: ['kotlin', 'kotlin/jvm', 'kotlin multiplatform']
  },
  {
    id: 'skill_swift',
    name: 'Swift',
    category: 'Programming',
    variations: ['swift', 'swiftui', 'swift5']
  },
  {
    id: 'skill_php',
    name: 'PHP',
    category: 'Programming',
    variations: ['php', 'php7', 'php8', 'lamp stack']
  },
  {
    id: 'skill_ruby',
    name: 'Ruby',
    category: 'Programming',
    variations: ['ruby', 'ruby on rails', 'rails', 'mri ruby']
  },
  {
    id: 'skill_sql',
    name: 'SQL',
    category: 'Programming',
    variations: ['sql', 'ansi sql', 't-sql', 'pl/sql', 'structured query language']
  },
  {
    id: 'skill_r',
    name: 'R',
    category: 'Programming',
    variations: ['r programming', 'r-lang', 'rstats', 'rstudio']
  },
  {
    id: 'skill_c',
    name: 'C',
    category: 'Programming',
    variations: ['c programming', 'ansi c', 'c language', 'embedded c']
  },
  {
    id: 'skill_dart',
    name: 'Dart',
    category: 'Programming',
    variations: ['dart', 'dartlang']
  },
  {
    id: 'skill_scala',
    name: 'Scala',
    category: 'Programming',
    variations: ['scala', 'scala 3', 'akka']
  },
  {
    id: 'skill_bash',
    name: 'Bash/Shell',
    category: 'Programming',
    variations: ['bash', 'shell script', 'shell scripting', 'zsh', 'powershell', 'sh']
  },

  // Frontend Libraries and Frameworks
  {
    id: 'skill_react',
    name: 'React',
    category: 'Frontend',
    variations: ['react', 'react.js', 'reactjs', 'react 18', 'react 19']
  },
  {
    id: 'skill_angular',
    name: 'Angular',
    category: 'Frontend',
    variations: ['angular', 'angular.js', 'angularjs', 'angular 2+', 'angular 17']
  },
  {
    id: 'skill_vue',
    name: 'Vue.js',
    category: 'Frontend',
    variations: ['vue', 'vue.js', 'vuejs', 'vue 3', 'vuex', 'pinia']
  },
  {
    id: 'skill_nextjs',
    name: 'Next.js',
    category: 'Frontend',
    variations: ['next.js', 'nextjs', 'next js', 'next 14', 'next 15']
  },
  {
    id: 'skill_svelte',
    name: 'Svelte',
    category: 'Frontend',
    variations: ['svelte', 'sveltekit', 'svelte.js']
  },
  {
    id: 'skill_html_css',
    name: 'HTML5/CSS3',
    category: 'Frontend',
    variations: ['html5', 'html', 'css3', 'css', 'html5/css3', 'css grid', 'flexbox']
  },
  {
    id: 'skill_tailwind',
    name: 'Tailwind CSS',
    category: 'Frontend',
    variations: ['tailwind', 'tailwindcss', 'tailwind css']
  },
  {
    id: 'skill_webassembly',
    name: 'WebAssembly',
    category: 'Frontend',
    variations: ['webassembly', 'wasm', 'wabt']
  },
  {
    id: 'skill_redux',
    name: 'Redux',
    category: 'Frontend',
    variations: ['redux', 'redux toolkit', 'rtk', 'redux-saga']
  },
  {
    id: 'skill_sass',
    name: 'Sass/SCSS',
    category: 'Frontend',
    variations: ['sass', 'scss']
  },
  {
    id: 'skill_bootstrap',
    name: 'Bootstrap',
    category: 'Frontend',
    variations: ['bootstrap', 'bootstrap 5', 'bootstrap 4']
  },
  {
    id: 'skill_material_ui',
    name: 'Material UI',
    category: 'Frontend',
    variations: ['material-ui', 'material ui', 'mui']
  },
  {
    id: 'skill_webpack',
    name: 'Webpack',
    category: 'Frontend',
    variations: ['webpack', 'vite', 'rollup', 'esbuild', 'parcel', 'turbopack']
  },

  // Backend Frameworks and Runtimes
  {
    id: 'skill_nodejs',
    name: 'Node.js',
    category: 'Backend',
    variations: ['node.js', 'nodejs', 'node js', 'node runtime', 'node']
  },
  {
    id: 'skill_express',
    name: 'Express',
    category: 'Backend',
    variations: ['express', 'express.js', 'expressjs']
  },
  {
    id: 'skill_fastapi',
    name: 'FastAPI',
    category: 'Backend',
    variations: ['fastapi', 'fast-api']
  },
  {
    id: 'skill_django',
    name: 'Django',
    category: 'Backend',
    variations: ['django', 'django rest framework', 'drf']
  },
  {
    id: 'skill_spring_boot',
    name: 'Spring Boot',
    category: 'Backend',
    variations: ['spring boot', 'spring framework', 'spring mvc', 'spring cloud']
  },
  {
    id: 'skill_dotnet_core',
    name: '.NET Core',
    category: 'Backend',
    variations: ['.net core', '.net', 'asp.net', 'asp.net core', 'dotnet core']
  },
  {
    id: 'skill_graphql',
    name: 'GraphQL',
    category: 'Backend',
    variations: ['graphql', 'apollo server', 'apollo client', 'relay']
  },
  {
    id: 'skill_grpc',
    name: 'gRPC',
    category: 'Backend',
    variations: ['grpc', 'protocol buffers', 'protobuf']
  },
  {
    id: 'skill_flask',
    name: 'Flask',
    category: 'Backend',
    variations: ['flask', 'flask restfull']
  },
  {
    id: 'skill_nestjs',
    name: 'NestJS',
    category: 'Backend',
    variations: ['nestjs', 'nest.js']
  },
  {
    id: 'skill_microservices',
    name: 'Microservices',
    category: 'Backend',
    variations: ['microservices', 'microservice architecture', 'soa']
  },
  {
    id: 'skill_rest_api',
    name: 'REST APIs',
    category: 'Backend',
    variations: ['rest api', 'restful api', 'restful services', 'openapi', 'swagger']
  },
  {
    id: 'skill_websockets',
    name: 'WebSockets',
    category: 'Backend',
    variations: ['websockets', 'websocket', 'socket.io', 'wss']
  },

  // Cloud and Virtualization
  {
    id: 'skill_aws',
    name: 'AWS',
    category: 'Cloud',
    variations: ['aws', 'amazon web services', 'ec2', 's3', 'aws lambda', 'cloudformation', 'ecs', 'eks', 'fargate', 'iam']
  },
  {
    id: 'skill_azure',
    name: 'Azure',
    category: 'Cloud',
    variations: ['azure', 'microsoft azure', 'azure devops', 'azure functions', 'azure blob', 'aks']
  },
  {
    id: 'skill_gcp',
    name: 'GCP',
    category: 'Cloud',
    variations: ['gcp', 'google cloud platform', 'google cloud', 'bigquery', 'cloud run', 'gke', 'cloud storage']
  },
  {
    id: 'skill_docker',
    name: 'Docker',
    category: 'Cloud',
    variations: ['docker', 'docker compose', 'dockerfile', 'containerization', 'containerized']
  },
  {
    id: 'skill_kubernetes',
    name: 'Kubernetes',
    category: 'Cloud',
    variations: ['kubernetes', 'k8s', 'kube', 'kubectl', 'helm']
  },
  {
    id: 'skill_terraform',
    name: 'Terraform',
    category: 'Cloud',
    variations: ['terraform', 'hashicorp terraform', 'hcl', 'opentofu']
  },
  {
    id: 'skill_ansible',
    name: 'Ansible',
    category: 'Cloud',
    variations: ['ansible', 'ansible playbooks']
  },
  {
    id: 'skill_linux',
    name: 'Linux',
    category: 'Cloud',
    variations: ['linux', 'ubuntu', 'debian', 'centos', 'redhat', 'rhel', 'alpine linux']
  },
  {
    id: 'skill_nginx',
    name: 'Nginx',
    category: 'Cloud',
    variations: ['nginx', 'reverse proxy', 'nginx configuration']
  },

  // DevOps and CI/CD
  {
    id: 'skill_cicd',
    name: 'CI/CD',
    category: 'DevOps',
    variations: ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment', 'continuous delivery']
  },
  {
    id: 'skill_github_actions',
    name: 'GitHub Actions',
    category: 'DevOps',
    variations: ['github actions', 'gh actions', 'github workflows']
  },
  {
    id: 'skill_gitlab_ci',
    name: 'GitLab CI',
    category: 'DevOps',
    variations: ['gitlab ci', 'gitlab-ci', 'gitlab pipelines']
  },
  {
    id: 'skill_jenkins',
    name: 'Jenkins',
    category: 'DevOps',
    variations: ['jenkins', 'jenkins pipeline', 'jenkinsfile']
  },
  {
    id: 'skill_argocd',
    name: 'ArgoCD',
    category: 'DevOps',
    variations: ['argocd', 'argo cd', 'gitops']
  },
  {
    id: 'skill_prometheus',
    name: 'Prometheus',
    category: 'DevOps',
    variations: ['prometheus', 'promql']
  },
  {
    id: 'skill_grafana',
    name: 'Grafana',
    category: 'DevOps',
    variations: ['grafana', 'grafana dashboards']
  },
  {
    id: 'skill_datadog',
    name: 'Datadog',
    category: 'DevOps',
    variations: ['datadog', 'datadog apm']
  },
  {
    id: 'skill_opentelemetry',
    name: 'OpenTelemetry',
    category: 'DevOps',
    variations: ['opentelemetry', 'otel', 'distributed tracing']
  },
  {
    id: 'skill_git',
    name: 'Git',
    category: 'DevOps',
    variations: ['git', 'version control', 'github', 'gitlab', 'bitbucket']
  },

  // Data Engineering and Databases
  {
    id: 'skill_postgresql',
    name: 'PostgreSQL',
    category: 'Database',
    variations: ['postgresql', 'postgres', 'pgsql']
  },
  {
    id: 'skill_mongodb',
    name: 'MongoDB',
    category: 'Database',
    variations: ['mongodb', 'mongo', 'mongoose']
  },
  {
    id: 'skill_redis',
    name: 'Redis',
    category: 'Database',
    variations: ['redis', 'redis cache', 'redis clusters']
  },
  {
    id: 'skill_elasticsearch',
    name: 'Elasticsearch',
    category: 'Database',
    variations: ['elasticsearch', 'elastic search', 'elk stack', 'opensearch']
  },
  {
    id: 'skill_dynamodb',
    name: 'DynamoDB',
    category: 'Database',
    variations: ['dynamodb', 'amazon dynamodb']
  },
  {
    id: 'skill_neo4j',
    name: 'Neo4j',
    category: 'Database',
    variations: ['neo4j', 'graph database', 'cypher query']
  },
  {
    id: 'skill_mysql',
    name: 'MySQL',
    category: 'Database',
    variations: ['mysql', 'mariadb']
  },
  {
    id: 'skill_sqlite',
    name: 'SQLite',
    category: 'Database',
    variations: ['sqlite', 'sqlite3']
  },
  {
    id: 'skill_cassandra',
    name: 'Apache Cassandra',
    category: 'Database',
    variations: ['cassandra', 'apache cassandra', 'cql']
  },
  {
    id: 'skill_spark',
    name: 'Apache Spark',
    category: 'Data',
    variations: ['spark', 'apache spark', 'pyspark', 'spark streaming']
  },
  {
    id: 'skill_kafka',
    name: 'Apache Kafka',
    category: 'Data',
    variations: ['kafka', 'apache kafka', 'kafka streams', 'confluent kafka']
  },
  {
    id: 'skill_airflow',
    name: 'Apache Airflow',
    category: 'Data',
    variations: ['airflow', 'apache airflow', 'airflow dags']
  },
  {
    id: 'skill_dbt',
    name: 'dbt',
    category: 'Data',
    variations: ['dbt', 'data build tool', 'dbt core']
  },
  {
    id: 'skill_snowflake',
    name: 'Snowflake',
    category: 'Data',
    variations: ['snowflake', 'snowflake data warehouse', 'snowpark']
  },
  {
    id: 'skill_pandas',
    name: 'Pandas',
    category: 'Data',
    variations: ['pandas', 'pd dataframe']
  },
  {
    id: 'skill_numpy',
    name: 'NumPy',
    category: 'Data',
    variations: ['numpy']
  },
  {
    id: 'skill_rabbitmq',
    name: 'RabbitMQ',
    category: 'Data',
    variations: ['rabbitmq', 'amqp']
  },

  // Artificial Intelligence and Machine Learning
  {
    id: 'skill_tensorflow',
    name: 'TensorFlow',
    category: 'AI/ML',
    variations: ['tensorflow', 'tf', 'tensorflow 2', 'keras']
  },
  {
    id: 'skill_pytorch',
    name: 'PyTorch',
    category: 'AI/ML',
    variations: ['pytorch', 'torch', 'torchvision']
  },
  {
    id: 'skill_scikit_learn',
    name: 'Scikit-learn',
    category: 'AI/ML',
    variations: ['scikit-learn', 'scikit learn', 'sklearn']
  },
  {
    id: 'skill_opencv',
    name: 'OpenCV',
    category: 'AI/ML',
    variations: ['opencv', 'computer vision']
  },
  {
    id: 'skill_huggingface',
    name: 'Hugging Face',
    category: 'AI/ML',
    variations: ['hugging face', 'huggingface', 'transformers', 'tokenizers']
  },
  {
    id: 'skill_langchain',
    name: 'LangChain',
    category: 'AI/ML',
    variations: ['langchain', 'lang-chain', 'langchain framework']
  },
  {
    id: 'skill_llamaindex',
    name: 'LlamaIndex',
    category: 'AI/ML',
    variations: ['llamaindex', 'llama-index', 'gpt index']
  },
  {
    id: 'skill_rag',
    name: 'RAG Architecture',
    category: 'AI/ML',
    variations: ['rag', 'retrieval-augmented generation', 'retrieval augmented generation']
  },
  {
    id: 'skill_prompt_eng',
    name: 'Prompt Engineering',
    category: 'AI/ML',
    variations: ['prompt engineering', 'prompt tuning', 'system prompt design', 'few-shot prompting']
  },
  {
    id: 'skill_fine_tuning',
    name: 'Model Fine-Tuning',
    category: 'AI/ML',
    variations: ['fine-tuning', 'fine tuning', 'peft', 'lora', 'qlora']
  },
  {
    id: 'skill_agentic_ai',
    name: 'Agentic AI',
    category: 'AI/ML',
    variations: ['agentic ai', 'ai agents', 'autonomous agents', 'agent workflows', 'multi-agent']
  },
  {
    id: 'skill_mcp',
    name: 'MCP',
    category: 'AI/ML',
    variations: ['mcp', 'model context protocol']
  },
  {
    id: 'skill_vector_db',
    name: 'Vector Databases',
    category: 'AI/ML',
    variations: ['vector database', 'vector db', 'pinecone', 'weaviate', 'milvus', 'chroma', 'chromadb', 'qdrant', 'faiss']
  },

  // Security and Governance
  {
    id: 'skill_owasp',
    name: 'OWASP Security',
    category: 'Security',
    variations: ['owasp', 'owasp top 10', 'web application security', 'appsec']
  },
  {
    id: 'skill_zero_trust',
    name: 'Zero Trust',
    category: 'Security',
    variations: ['zero trust', 'zero-trust', 'zta', 'least privilege']
  },
  {
    id: 'skill_iam',
    name: 'IAM',
    category: 'Security',
    variations: ['iam', 'identity and access management', 'oauth', 'oauth2', 'openid connect', 'oidc', 'saml', 'rbac']
  },
  {
    id: 'skill_devsecops',
    name: 'DevSecOps',
    category: 'Security',
    variations: ['devsecops', 'security automation', 'sast', 'dast', 'trivy', 'snyk']
  },
  {
    id: 'skill_sonarqube',
    name: 'SonarQube',
    category: 'Security',
    variations: ['sonarqube', 'sonarcloud', 'static code analysis']
  },

  // Mobile and Cross-Platform
  {
    id: 'skill_react_native',
    name: 'React Native',
    category: 'Mobile',
    variations: ['react native', 'react-native', 'rn', 'expo']
  },
  {
    id: 'skill_flutter',
    name: 'Flutter',
    category: 'Mobile',
    variations: ['flutter', 'flutter sdk']
  },

  // Testing and QA
  {
    id: 'skill_jest',
    name: 'Jest',
    category: 'Testing',
    variations: ['jest', 'jest test runner', 'ts-jest']
  },
  {
    id: 'skill_cypress',
    name: 'Cypress',
    category: 'Testing',
    variations: ['cypress', 'cypress.io', 'cypress e2e']
  },
  {
    id: 'skill_playwright',
    name: 'Playwright',
    category: 'Testing',
    variations: ['playwright', 'playwright e2e']
  },
  {
    id: 'skill_selenium',
    name: 'Selenium',
    category: 'Testing',
    variations: ['selenium', 'selenium webdriver']
  },
  {
    id: 'skill_postman',
    name: 'Postman',
    category: 'Testing',
    variations: ['postman', 'postman collections', 'newman']
  },

  // Architecture and Systems
  {
    id: 'skill_system_design',
    name: 'System Design',
    category: 'Architecture',
    variations: ['system design', 'distributed systems', 'high availability', 'scalability', 'fault tolerance']
  },
  {
    id: 'skill_prisma',
    name: 'Prisma ORM',
    category: 'Backend',
    variations: ['prisma', 'prisma orm', 'typeorm', 'hibernate']
  },
  {
    id: 'skill_firebase',
    name: 'Firebase',
    category: 'Cloud',
    variations: ['firebase', 'firestore', 'firebase authentication']
  },
  {
    id: 'skill_supabase',
    name: 'Supabase',
    category: 'Cloud',
    variations: ['supabase']
  },
  {
    id: 'skill_splunk',
    name: 'Splunk',
    category: 'DevOps',
    variations: ['splunk', 'splunk enterprise']
  }
]);

/**
 * Technical Certification Reference Patterns.
 */
const CERTIFICATION_PATTERNS = [
  /AWS Certified (?:Solutions Architect|Developer|SysOps|DevOps Engineer|Cloud Practitioner|Security)/i,
  /Google Cloud Certified (?:Professional Cloud Architect|Professional Data Engineer|Associate Cloud Engineer)/i,
  /Microsoft Certified: (?:Azure Solutions Architect|Azure Administrator|Azure Developer|DevOps Engineer)/i,
  /Certified Kubernetes (?:Administrator|Application Developer|Security Specialist)|\b(?:CKA|CKAD|CKS)\b/,
  /Certified Information Systems Security Professional|\bCISSP\b/,
  /CompTIA (?:Security\+|Network\+|A\+|CySA\+|Cloud\+)/i,
  /HashiCorp Certified:? Terraform Associate/i,
  /Project Management Professional|\bPMP\b/,
  /Certified Scrum (?:Master|Product Owner)|\b(?:CSM|CSPO|PSM I|PSM II)\b/,
  /Offensive Security Certified Professional|\bOSCP\b/,
  /Certified Ethical Hacker|\bCEH\b/,
  /Oracle Certified Professional/i,
  /Red Hat Certified (?:Engineer|System Administrator)|\b(?:RHCE|RHCSA)\b/
];

/**
 * CV and Resume Parsing Engine.
 * Extracts technical competencies, career history, academic background,
 * and industry certifications from plain text, PDF, and DOCX documents.
 */
export class CVParser {
  /**
   * Initializes parser instance with internal taxonomy mappings.
   * @param {Array<Object>} [customTaxonomy] - Optional supplementary taxonomy array.
   */
  constructor(customTaxonomy = []) {
    this.taxonomy = Array.isArray(customTaxonomy) && customTaxonomy.length > 0
      ? customTaxonomy
      : (SKILLS_TAXONOMY || SKILL_KEYWORD_MAP);
  }

  /**
   * Static alias for full parsing pipeline.
   */
  static async parse(file, skillsTaxonomy = null) {
    const profile = await CVParser.buildProfile(file, skillsTaxonomy);
    const rawText = profile.raw_text || '';
    return {
      ...profile,
      skill_details: profile.skills,
      experience_years: CVParser.extractExperienceYears(rawText),
      current_role: CVParser.extractCurrentRole(rawText)
    };
  }

  /**
   * Static alias for parseFile.
   */
  static async parseFile(file) {
    const parser = new CVParser();
    return parser.parseFile(file);
  }

  /**
   * Legacy static alias for backward compatibility.
   */
  static async extractText(file) {
    const parser = new CVParser();
    return parser.parseFile(file);
  }

  /**
   * Takes a File or Blob object, reads its contents, and extracts the raw text.
   * Supports plain text (.txt, .md), basic PDF extraction, and DOCX text extraction.
   * @param {File|Blob|string} file - The uploaded document file or raw text string.
   * @returns {Promise<string>} Cleaned raw text representation.
   */
  async parseFile(file) {
    if (typeof file === 'string') {
      if (file.startsWith('data:')) {
        const commaIndex = file.indexOf(',');
        if (commaIndex !== -1) {
          const content = file.substring(commaIndex + 1);
          try {
            return atob(content);
          } catch {
            return decodeURIComponent(escape(atob(content)));
          }
        }
      }
      return file;
    }

    if (!file) {
      return '';
    }

    const fileName = (file.name || '').toLowerCase();
    const fileType = (file.type || '').toLowerCase();

    // Plain text formats
    if (
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.json') ||
      fileType.startsWith('text/')
    ) {
      return this._readAsText(file);
    }

    // PDF documents
    if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
      return this._extractTextFromPdf(file);
    }

    // DOCX documents
    if (
      fileName.endsWith('.docx') ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return this._extractTextFromDocx(file);
    }

    // Fallback: check file.text()
    if (typeof file.text === 'function') {
      try {
        const t = await file.text();
        if (t && t.trim().length > 0) {
          return t;
        }
      } catch {
        // Fallback to FileReader below
      }
    }

    // Fallback: attempt standard text read
    try {
      const text = await this._readAsText(file);
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch {
      // Proceed to array buffer extraction
    }

    // Binary inspection fallback
    const buffer = await this._readAsArrayBuffer(file);
    return this._extractAsciiStrings(buffer);
  }

  /**
   * Static alias for extractSkills.
   */
  static extractSkills(text, skillsTaxonomy = null) {
    const parser = new CVParser(skillsTaxonomy);
    return parser.extractSkills(text, skillsTaxonomy);
  }

  /**
   * Scans document text for technical skills using regex patterns and taxonomy dictionaries.
   * Identifies common variations (e.g. React.js, ReactJS, React) and assigns confidence ratings.
   * @param {string} text - Raw document text.
   * @param {Array<Object>} [skillsTaxonomy] - Optional taxonomy dataset.
   * @returns {Array<Object>} Detected skills with skill_id, skill_name, confidence, and context_snippet.
   */
  extractSkills(text, skillsTaxonomy = null) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const activeTaxonomy = Array.isArray(skillsTaxonomy) && skillsTaxonomy.length > 0
      ? skillsTaxonomy
      : this.taxonomy;

    const detected = new Map();
    const cleanText = text.replace(/\r\n/g, '\n');

    // Identify sections likely containing dense skill listings
    const skillsSectionMatch = cleanText.match(
      /(?:skills|technical skills|technologies|tech stack|core competencies|tools|proficiencies)[\s\S]{1,1200}?(?=\n\s*(?:experience|employment|work history|education|certifications|projects)|$)/i
    );
    const skillsSectionText = skillsSectionMatch ? skillsSectionMatch[0].toLowerCase() : '';

    // Build lookup map combining taxonomy and keyword map
    const combinedSkills = new Map();

    // 1. Seed with SKILL_KEYWORD_MAP entries
    for (const item of SKILL_KEYWORD_MAP) {
      combinedSkills.set(item.id, { ...item });
    }

    // 2. Augment with active taxonomy entries
    for (const item of activeTaxonomy) {
      const id = item.id || `skill_${(item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (combinedSkills.has(id)) {
        const existing = combinedSkills.get(id);
        const set = new Set([...existing.variations, (item.name || '').toLowerCase()]);
        existing.variations = Array.from(set);
      } else {
        combinedSkills.set(id, {
          id,
          name: item.name || id,
          category: item.category || 'Engineering',
          variations: [(item.name || '').toLowerCase()]
        });
      }
    }

    for (const skill of combinedSkills.values()) {
      const skillId = skill.id;
      const skillName = skill.name || skillId;

      const variations = new Set();
      if (skill.name) variations.add(skill.name.toLowerCase());
      if (Array.isArray(skill.variations)) {
        skill.variations.forEach((v) => {
          if (v) variations.add(v.toLowerCase());
        });
      }

      // Add common automatic variations (e.g. React.js, ReactJS, React)
      if (skillName.endsWith('.js')) {
        const base = skillName.slice(0, -3).toLowerCase();
        variations.add(base);
        variations.add(`${base}js`);
        variations.add(`${base}.js`);
      } else if (skillName.toLowerCase() === 'react') {
        variations.add('react.js');
        variations.add('reactjs');
      } else if (skillName.toLowerCase() === 'vue' || skillName.toLowerCase() === 'vue.js') {
        variations.add('vue');
        variations.add('vue.js');
        variations.add('vuejs');
      } else if (skillName.toLowerCase() === 'node' || skillName.toLowerCase() === 'node.js') {
        variations.add('node.js');
        variations.add('nodejs');
        variations.add('node js');
      }

      let bestMatch = null;
      let totalOccurrences = 0;

      for (const variation of variations) {
        if (!variation || variation.length === 0) continue;

        let regex;
        if (variation === 'go') {
          regex = /\b(?:golang|go\s+language|go\s+programming)\b|\bgo\b(?=[\s,/|]+(?:python|java|rust|c\+\+|docker|backend))/gi;
        } else if (variation === 'r') {
          regex = /\b(?:r\s+programming|r-lang|rstats|rstudio)\b|\br\b(?=[\s,/|]+(?:python|sql|sas|matlab|statistics))/gi;
        } else if (variation === 'c') {
          regex = /\b(?:c\s+programming|ansi\s+c|c\s+language|embedded\s+c)\b|\bc\b(?=\s*\/\s*c\+\+)/gi;
        } else if (variation === 'mcp') {
          regex = /\b(?:model\s+context\s+protocol|mcp)\b/gi;
        } else if (variation === 'rag') {
          regex = /\b(?:retrieval[- ]augmented\s+generation|rag)\b/gi;
        } else if (variation === 'dbt') {
          regex = /\b(?:data\s+build\s+tool|dbt)\b/gi;
        } else if (variation === 'iam') {
          regex = /\b(?:identity\s+and\s+access\s+management|iam)\b/gi;
        } else {
          const escaped = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          regex = new RegExp(`(^|[^a-zA-Z0-9_#+])${escaped}(?=[^a-zA-Z0-9_#+]|$)`, 'gi');
        }

        let match;
        while ((match = regex.exec(cleanText)) !== null) {
          totalOccurrences++;
          if (!bestMatch) {
            const matchIndex = match.index + (match[1] ? match[1].length : 0);
            bestMatch = {
              index: matchIndex,
              length: variation.length,
              matchedText: variation
            };
          }
        }
      }

      if (bestMatch) {
        const snippetStart = Math.max(0, bestMatch.index - 50);
        const snippetEnd = Math.min(cleanText.length, bestMatch.index + bestMatch.length + 50);
        let snippet = cleanText
          .slice(snippetStart, snippetEnd)
          .replace(/\s+/g, ' ')
          .trim();

        if (snippetStart > 0) snippet = `...${snippet}`;
        if (snippetEnd < cleanText.length) snippet = `${snippet}...`;

        let confidence = 'medium';
        const inSkillsSection = skillsSectionText && skillsSectionText.includes(bestMatch.matchedText.toLowerCase());
        const isDistinctive = bestMatch.matchedText.length >= 6 ||
          /kubernetes|typescript|postgresql|terraform|docker|fastapi|next\.?js|pytorch|tensorflow/i.test(bestMatch.matchedText);

        if (inSkillsSection || (isDistinctive && totalOccurrences >= 1) || totalOccurrences >= 3) {
          confidence = 'high';
        } else if (bestMatch.matchedText.length <= 3 && totalOccurrences === 1) {
          confidence = 'low';
        }

        detected.set(skillId, {
          skill_id: skillId,
          skill_name: skillName,
          confidence,
          context_snippet: snippet,
          occurrences: totalOccurrences
        });
      }
    }

    return Array.from(detected.values());
  }

  /**
   * Static alias for extractEducation.
   */
  static extractEducation(text) {
    const parser = new CVParser();
    return parser.extractEducation(text);
  }

  /**
   * Extracts academic credentials, institution names, and graduation years.
   * @param {string} text - Raw document text.
   * @returns {Array<Object>} List of structured education entries (degree, university, year).
   */
  extractEducation(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const educationEntries = [];
    const cleanText = text.replace(/\r\n/g, '\n');

    const sectionMatch = cleanText.match(
      /(?:education|academic background|academic history|qualifications)[\s\S]{1,1500}?(?=\n\s*(?:experience|skills|certifications|projects|employment)|$)/i
    );
    const targetText = sectionMatch ? sectionMatch[0] : cleanText;

    const degreeRegex = /(?:Bachelor(?:'s)?(?:\s+(?:of|in)\s+[\w\s&]+)?|B\.?S\.?(?:\s+(?:of|in)\s+[\w\s&]+)?|B\.?Sc\.?|B\.?Tech\.?|B\.?E\.?|Master(?:'s)?(?:\s+(?:of|in)\s+[\w\s&]+)?|M\.?S\.?(?:\s+(?:of|in)\s+[\w\s&]+)?|M\.?Sc\.?|M\.?Tech\.?|M\.?E\.?|MBA|Ph\.?D\.?|Doctorate|Associate(?:'s)?(?:\s+(?:of|in)\s+[\w\s&]+)?|Diploma(?:\s+(?:of|in)\s+[\w\s&]+)?)/gi;
    const institutionRegex = /([A-Z][\w\s&,.'-]{2,60}(?:\bUniversity\b|\bCollege\b|\bInstitute\b|\bAcademy\b|\bSchool\b|\bPolytechnic\b|\bIIT\b|\bNIT\b|\bMIT\b|\bStanford\b|\bBerkeley\b|\bCaltech\b|\bOxford\b|\bCambridge\b))/g;
    const yearRegex = /\b((?:19|20)\d{2}(?:\s*[-/to\s]+\s*(?:(?:19|20)\d{2}|Present|Current))?)\b/g;

    const lines = targetText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const degreeMatch = line.match(degreeRegex);

      if (degreeMatch) {
        const degree = degreeMatch[0].trim();
        let university = 'Not specified';
        let year = 'Not specified';

        const windowText = [lines[i - 1] || '', line, lines[i + 1] || ''].join(' ');
        const instMatch = windowText.match(institutionRegex);
        if (instMatch) {
          university = instMatch[0].trim().replace(/^[,.\s]+|[,.\s]+$/g, '');
        }

        const yearMatch = windowText.match(yearRegex);
        if (yearMatch) {
          year = yearMatch[0].trim();
        }

        educationEntries.push({
          degree,
          university,
          year
        });
      }
    }

    if (educationEntries.length === 0) {
      let instMatch;
      while ((instMatch = institutionRegex.exec(targetText)) !== null) {
        const inst = instMatch[0].trim();
        const snippet = targetText.slice(Math.max(0, instMatch.index - 40), instMatch.index + 120);
        const yMatch = snippet.match(yearRegex);

        educationEntries.push({
          degree: 'Degree / Course of Study',
          university: inst,
          year: yMatch ? yMatch[0].trim() : 'Not specified'
        });
      }
    }

    return educationEntries;
  }

  /**
   * Static alias for extractExperience.
   */
  static extractExperience(text) {
    const parser = new CVParser();
    return parser.extractExperience(text);
  }

  /**
   * Extracts professional employment history including job title, company, and tenure.
   * @param {string} text - Raw document text.
   * @returns {Array<Object>} List of structured job entries (title, company, duration).
   */
  extractExperience(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const jobEntries = [];
    const cleanText = text.replace(/\r\n/g, '\n');

    const titlePattern = /\b((?:Senior|Lead|Principal|Junior|Staff|Associate|Director|Head of)?\s*(?:Software Engineer|Frontend Engineer|Frontend Developer|Backend Engineer|Backend Developer|Full Stack Engineer|Full Stack Developer|DevOps Engineer|Cloud Architect|Data Engineer|ML Engineer|Machine Learning Engineer|AI Engineer|Security Engineer|Systems Architect|Software Architect|Technical Lead|Engineering Manager|QA Engineer|Mobile Developer|Android Developer|iOS Developer|Platform Engineer|Database Administrator))\b/gi;
    const durationPattern = /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}\/\d{4}|\d{4})\s*(?:[-to\s]+)\s*(?:Present|Current|\d{4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}\/\d{4})))\b/i;

    const lines = cleanText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const titleMatch = line.match(titlePattern);

      if (titleMatch) {
        const title = titleMatch[0].trim();
        let company = 'Enterprise Organization';
        let duration = 'Duration not specified';

        const atCompanyMatch = line.match(/(?:at|@)\s+([A-Z0-9][\w\s&.,'-]{2,40})/i);
        const pipeCompanyMatch = line.match(/(?:\||-)\s*([A-Z0-9][\w\s&.,'-]{2,40})/);

        if (atCompanyMatch) {
          company = atCompanyMatch[1].trim();
        } else if (pipeCompanyMatch && !pipeCompanyMatch[1].toLowerCase().includes(title.toLowerCase())) {
          company = pipeCompanyMatch[1].trim();
        } else if (lines[i - 1] && lines[i - 1].length < 60 && !lines[i - 1].match(titlePattern)) {
          company = lines[i - 1];
        } else if (lines[i + 1] && lines[i + 1].length < 60 && !lines[i + 1].match(durationPattern)) {
          company = lines[i + 1];
        }

        const searchScope = [line, lines[i + 1] || '', lines[i + 2] || '', lines[i - 1] || ''].join(' ');
        const durMatch = searchScope.match(durationPattern);
        if (durMatch) {
          duration = durMatch[0].trim();
        }

        jobEntries.push({
          title,
          company: company.replace(/^[,.\s|]+|[,.\s|]+$/g, ''),
          duration
        });
      }
    }

    return jobEntries;
  }

  /**
   * Static alias for extractCertifications.
   */
  static extractCertifications(text) {
    const parser = new CVParser();
    return parser.extractCertifications(text);
  }

  /**
   * Scans document for verified industry certifications and accreditations.
   * @param {string} text - Raw document text.
   * @returns {Array<string>} List of certification titles.
   */
  extractCertifications(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const certs = new Set();
    const cleanText = text.replace(/\r\n/g, '\n');

    for (const pattern of CERTIFICATION_PATTERNS) {
      const matches = cleanText.match(pattern);
      if (matches) {
        certs.add(matches[0].trim());
      }
    }

    const certSectionMatch = cleanText.match(
      /(?:certifications|licenses & certifications|accreditations|credentials)[\s\S]{1,1000}?(?=\n\s*(?:experience|skills|education|projects)|$)/i
    );

    if (certSectionMatch) {
      const sectionLines = certSectionMatch[0].split('\n').map((l) => l.trim());
      for (const line of sectionLines) {
        const bulletMatch = line.match(/^[-*•]\s*([A-Za-z0-9][\w\s&:+/-]{5,70})/);
        if (bulletMatch) {
          certs.add(bulletMatch[1].trim());
        }
      }
    }

    return Array.from(certs);
  }

  /**
   * Static alias for buildProfile.
   */
  static async buildProfile(file, skillsTaxonomy = null) {
    const parser = new CVParser(skillsTaxonomy);
    return parser.buildProfile(file, skillsTaxonomy);
  }

  /**
   * Orchestrates the complete CV parsing pipeline.
   * Extracts skills, education, employment, certifications, and candidate metadata.
   * @param {File|Blob|string} file - Document input.
   * @param {Array<Object>} [skillsTaxonomy] - Optional taxonomy data.
   * @returns {Promise<Object>} Structured candidate CV profile.
   */
  async buildProfile(file, skillsTaxonomy = null) {
    const rawText = await this.parseFile(file);
    const skills = this.extractSkills(rawText, skillsTaxonomy);
    const education = this.extractEducation(rawText);
    const experience = this.extractExperience(rawText);
    const certifications = this.extractCertifications(rawText);

    const emailMatch = rawText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const phoneMatch = rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);

    const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    let candidateName = 'Engineering Candidate';
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const testLine = lines[i];
      if (
        !/curriculum|resume|vitae|email|phone|profile|summary|address/i.test(testLine) &&
        testLine.length > 2 &&
        testLine.length < 50 &&
        !testLine.includes('@')
      ) {
        candidateName = testLine;
        break;
      }
    }

    let summary = '';
    const summaryMatch = rawText.match(
      /(?:summary|professional summary|profile|executive summary|about me)[\s\S]{1,600}?(?=\n\s*(?:skills|experience|education|certifications)|$)/i
    );
    if (summaryMatch) {
      summary = summaryMatch[0]
        .replace(/^(?:summary|professional summary|profile|executive summary|about me)[:\s]*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return {
      candidate_name: candidateName,
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0] : null,
      raw_text: rawText,
      summary,
      skills,
      education,
      experience,
      certifications,
      parsed_at: new Date().toISOString()
    };
  }

  // Legacy helper aliases for backward compatibility

  static extractExperienceYears(text) {
    if (!text || typeof text !== 'string') return 0;
    let detectedYears = 0;
    const explicitMatches = text.matchAll(/(\d{1,2})\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp|engineering)?/gi);
    for (const match of explicitMatches) {
      const parsed = parseInt(match[1], 10);
      if (parsed > detectedYears && parsed <= 40) detectedYears = parsed;
    }
    const currentYear = new Date().getFullYear();
    const rangeMatches = text.matchAll(/\b(20[0-2]\d|199\d)\s*[-/]\s*(20[0-2]\d|present|current)\b/gi);
    let spanYears = 0;
    for (const match of rangeMatches) {
      const startYear = parseInt(match[1], 10);
      const endYear = /present|current/i.test(match[2]) ? currentYear : parseInt(match[2], 10);
      if (endYear >= startYear && endYear <= currentYear + 1) {
        spanYears += (endYear - startYear);
      }
    }
    if (spanYears > detectedYears && spanYears <= 40) detectedYears = spanYears;
    return detectedYears;
  }

  static extractCurrentRole(text) {
    if (!text || typeof text !== 'string') return 'Software Engineer';
    const standardRoles = [
      'Engineering Manager', 'Solutions Architect', 'Cloud Architect',
      'DevOps Engineer', 'Security Engineer', 'Senior Backend Dev',
      'Senior Frontend Dev', 'Junior Backend Dev', 'Junior Frontend Dev',
      'Full Stack Dev', 'ML Engineer', 'Data Engineer'
    ];
    for (const role of standardRoles) {
      if (new RegExp(`\\b${role}\\b`, 'i').test(text)) return role;
    }
    return 'Software Engineer';
  }

  // Internal Helper Methods

  _readAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = () => reject(reader.error || new Error('FileReader failed to read document.'));
      reader.readAsText(file);
    });
  }

  _readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read binary file.'));
      reader.readAsArrayBuffer(file);
    });
  }

  async _extractTextFromPdf(file) {
    const arrayBuffer = await this._readAsArrayBuffer(file);
    const bytes = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder('latin1');
    const content = decoder.decode(bytes);

    const textPieces = [];
    const textBlockRegex = /BT[\s\S]*?ET/g;
    let block;

    while ((block = textBlockRegex.exec(content)) !== null) {
      const blockStr = block[0];
      const tjRegex = /\(([^)]*)\)\s*(?:Tj|'|")/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(blockStr)) !== null) {
        textPieces.push(this._unescapePdfString(tjMatch[1]));
      }

      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let arrayMatch;
      while ((arrayMatch = tjArrayRegex.exec(blockStr)) !== null) {
        const inner = arrayMatch[1];
        const innerStrRegex = /\(([^)]*)\)/g;
        let innerMatch;
        const arrayParts = [];
        while ((innerMatch = innerStrRegex.exec(inner)) !== null) {
          arrayParts.push(this._unescapePdfString(innerMatch[1]));
        }
        if (arrayParts.length > 0) {
          textPieces.push(arrayParts.join(' '));
        }
      }
    }

    if (textPieces.length > 10) {
      return textPieces.join('\n');
    }

    return this._extractAsciiStrings(arrayBuffer);
  }

  async _extractTextFromDocx(file) {
    const arrayBuffer = await this._readAsArrayBuffer(file);
    const bytes = new Uint8Array(arrayBuffer);

    try {
      const inflatedText = await this._unzipDocxXml(bytes);
      if (inflatedText && inflatedText.trim().length > 0) {
        return inflatedText;
      }
    } catch {
      // Proceed to XML tag fallback
    }

    const decoder = new TextDecoder('latin1');
    const raw = decoder.decode(bytes);
    const xmlTextMatches = raw.match(/<w:t[^>]*>(.*?)<\/w:t>/g);

    if (xmlTextMatches && xmlTextMatches.length > 0) {
      return xmlTextMatches
        .map((tag) => tag.replace(/<[^>]+>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return this._extractAsciiStrings(arrayBuffer);
  }

  async _unzipDocxXml(bytes) {
    let offset = 0;
    while (offset < bytes.length - 30) {
      if (
        bytes[offset] === 0x50 &&
        bytes[offset + 1] === 0x4b &&
        bytes[offset + 2] === 0x03 &&
        bytes[offset + 3] === 0x04
      ) {
        const compressionMethod = bytes[offset + 8] | (bytes[offset + 9] << 8);
        const compressedSize =
          bytes[offset + 18] |
          (bytes[offset + 19] << 8) |
          (bytes[offset + 20] << 16) |
          (bytes[offset + 21] << 24);
        const fileNameLength = bytes[offset + 26] | (bytes[offset + 27] << 8);
        const extraFieldLength = bytes[offset + 28] | (bytes[offset + 29] << 8);

        const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLength);
        const fileName = new TextDecoder().decode(fileNameBytes);

        const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

        if (fileName === 'word/document.xml') {
          const fileData = bytes.subarray(dataOffset, dataOffset + compressedSize);

          if (compressionMethod === 0) {
            const xml = new TextDecoder('utf-8').decode(fileData);
            return this._stripXmlTags(xml);
          }

          if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(fileData);
            writer.close();
            const response = new Response(ds.readable);
            const decompressedBuffer = await response.arrayBuffer();
            const xml = new TextDecoder('utf-8').decode(decompressedBuffer);
            return this._stripXmlTags(xml);
          }
        }

        offset = dataOffset + compressedSize;
      } else {
        offset++;
      }
    }
    return '';
  }

  _stripXmlTags(xml) {
    return xml
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:br\/>/g, '\n')
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
  }

  _unescapePdfString(str) {
    return str
      .replace(/\\([()\\])/g, '$1')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\b/g, '\b')
      .replace(/\\f/g, '\f');
  }

  _extractAsciiStrings(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const chunks = [];
    let current = [];

    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
        current.push(String.fromCharCode(b));
      } else {
        if (current.length >= 4) chunks.push(current.join(''));
        current = [];
      }
    }

    if (current.length >= 4) chunks.push(current.join(''));
    return chunks.join('\n');
  }
}
