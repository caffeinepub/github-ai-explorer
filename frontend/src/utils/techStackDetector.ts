import type { TechStackBadge } from '../types/github';

const TECH_COLORS: Record<string, string> = {
  'JavaScript': '#f7df1e',
  'TypeScript': '#3178c6',
  'Python': '#3776ab',
  'Rust': '#ce422b',
  'Go': '#00add8',
  'Java': '#ed8b00',
  'C++': '#00599c',
  'C': '#555555',
  'C#': '#239120',
  'Ruby': '#cc342d',
  'PHP': '#777bb4',
  'Swift': '#fa7343',
  'Kotlin': '#7f52ff',
  'Dart': '#0175c2',
  'Scala': '#dc322f',
  'Elixir': '#6e4a7e',
  'Haskell': '#5d4f85',
  'Clojure': '#5881d8',
  'Shell': '#89e051',
  'HTML': '#e34c26',
  'CSS': '#563d7c',
  'Vue': '#42b883',
  'React': '#61dafb',
  'Angular': '#dd0031',
  'Svelte': '#ff3e00',
  'Node.js': '#339933',
  'Docker': '#2496ed',
  'Kubernetes': '#326ce5',
  'PostgreSQL': '#336791',
  'MySQL': '#4479a1',
  'MongoDB': '#47a248',
  'Redis': '#dc382d',
  'GraphQL': '#e10098',
  'Next.js': '#000000',
  'Nuxt.js': '#00dc82',
  'Django': '#092e20',
  'Flask': '#000000',
  'FastAPI': '#009688',
  'Spring': '#6db33f',
  'Rails': '#cc0000',
  'Laravel': '#ff2d20',
  'Terraform': '#7b42bc',
  'AWS': '#ff9900',
  'GCP': '#4285f4',
  'Azure': '#0078d4',
};

function getColor(name: string): string {
  return TECH_COLORS[name] || '#6b7280';
}

export function detectTechStack(
  language: string | null,
  topics: string[],
  filePaths: string[]
): TechStackBadge[] {
  const badges: TechStackBadge[] = [];
  const seen = new Set<string>();

  const add = (name: string) => {
    if (!seen.has(name)) {
      seen.add(name);
      badges.push({ name, color: getColor(name) });
    }
  };

  // Primary language
  if (language) add(language);

  // Detect from file paths
  const fileSet = new Set(filePaths.map(f => f.toLowerCase()));

  if (fileSet.has('package.json')) {
    if (!seen.has('JavaScript') && !seen.has('TypeScript')) add('Node.js');
  }
  if (filePaths.some(f => f.endsWith('tsconfig.json'))) add('TypeScript');
  if (fileSet.has('dockerfile') || filePaths.some(f => f.toLowerCase() === 'dockerfile')) add('Docker');
  if (fileSet.has('docker-compose.yml') || fileSet.has('docker-compose.yaml')) add('Docker');
  if (fileSet.has('requirements.txt') || fileSet.has('setup.py') || fileSet.has('pyproject.toml')) {
    if (!seen.has('Python')) add('Python');
  }
  if (fileSet.has('cargo.toml')) {
    if (!seen.has('Rust')) add('Rust');
  }
  if (fileSet.has('go.mod')) {
    if (!seen.has('Go')) add('Go');
  }
  if (fileSet.has('gemfile')) {
    if (!seen.has('Ruby')) add('Ruby');
  }
  if (fileSet.has('pom.xml') || fileSet.has('build.gradle')) {
    if (!seen.has('Java')) add('Java');
  }
  if (fileSet.has('kubernetes') || filePaths.some(f => f.includes('k8s/'))) add('Kubernetes');
  if (fileSet.has('terraform') || filePaths.some(f => f.endsWith('.tf'))) add('Terraform');

  // Detect from topics
  const topicMap: Record<string, string> = {
    'react': 'React',
    'vue': 'Vue',
    'angular': 'Angular',
    'svelte': 'Svelte',
    'nextjs': 'Next.js',
    'next-js': 'Next.js',
    'nuxtjs': 'Nuxt.js',
    'django': 'Django',
    'flask': 'Flask',
    'fastapi': 'FastAPI',
    'spring': 'Spring',
    'rails': 'Rails',
    'laravel': 'Laravel',
    'nodejs': 'Node.js',
    'node-js': 'Node.js',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'postgresql': 'PostgreSQL',
    'mysql': 'MySQL',
    'mongodb': 'MongoDB',
    'redis': 'Redis',
    'graphql': 'GraphQL',
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'python': 'Python',
    'rust': 'Rust',
    'golang': 'Go',
    'terraform': 'Terraform',
    'aws': 'AWS',
    'gcp': 'GCP',
    'azure': 'Azure',
  };

  for (const topic of topics) {
    const mapped = topicMap[topic.toLowerCase()];
    if (mapped) add(mapped);
  }

  return badges.slice(0, 8);
}
