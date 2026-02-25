export interface RepoAnalysis {
  techStack: string[];
  hasDocker: boolean;
  hasDockerCompose: boolean;
  hasPackageJson: boolean;
  hasRequirements: boolean;
  hasCargo: boolean;
  hasGoMod: boolean;
  hasGemfile: boolean;
  hasMakefile: boolean;
  envVars: string[];
  nodeVersion?: string;
  pythonVersion?: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null;
  scripts: Record<string, string>;
}

export function analyzeRepo(
  filePaths: string[],
  packageJsonContent: string,
  requirementsContent: string,
  dockerfileContent: string,
  envExampleContent: string,
  readmeContent: string
): RepoAnalysis {
  const fileSet = new Set(filePaths.map(f => f.toLowerCase()));

  const hasDocker = fileSet.has('dockerfile') || filePaths.some(f => f.toLowerCase() === 'dockerfile');
  const hasDockerCompose = fileSet.has('docker-compose.yml') || fileSet.has('docker-compose.yaml');
  const hasPackageJson = fileSet.has('package.json');
  const hasRequirements = fileSet.has('requirements.txt') || fileSet.has('setup.py') || fileSet.has('pyproject.toml');
  const hasCargo = fileSet.has('cargo.toml');
  const hasGoMod = fileSet.has('go.mod');
  const hasGemfile = fileSet.has('gemfile');
  const hasMakefile = fileSet.has('makefile');

  let scripts: Record<string, string> = {};
  let packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null = null;
  let nodeVersion: string | undefined;

  if (hasPackageJson && packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      scripts = pkg.scripts || {};
      if (fileSet.has('yarn.lock')) packageManager = 'yarn';
      else if (fileSet.has('pnpm-lock.yaml')) packageManager = 'pnpm';
      else if (fileSet.has('bun.lockb')) packageManager = 'bun';
      else packageManager = 'npm';
      if (pkg.engines?.node) nodeVersion = pkg.engines.node;
    } catch {
      packageManager = 'npm';
    }
  }

  // Extract env vars from .env.example
  const envVars: string[] = [];
  if (envExampleContent) {
    const lines = envExampleContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const key = trimmed.split('=')[0].trim();
        if (key) envVars.push(key);
      }
    }
  }

  const techStack: string[] = [];
  if (hasPackageJson) techStack.push('Node.js');
  if (hasRequirements) techStack.push('Python');
  if (hasCargo) techStack.push('Rust');
  if (hasGoMod) techStack.push('Go');
  if (hasGemfile) techStack.push('Ruby');
  if (hasDocker) techStack.push('Docker');

  return {
    techStack,
    hasDocker,
    hasDockerCompose,
    hasPackageJson,
    hasRequirements,
    hasCargo,
    hasGoMod,
    hasGemfile,
    hasMakefile,
    envVars,
    nodeVersion,
    packageManager,
    scripts,
  };
}

export function generateSetupScript(repoName: string, analysis: RepoAnalysis): string {
  const lines: string[] = [
    '#!/bin/bash',
    '# Auto-generated setup script by Repo Radar AI Setup Assistant',
    `# Repository: ${repoName}`,
    '',
    'set -e',
    '',
    'echo "🚀 Setting up ${repoName}..."',
    '',
  ];

  // Clone
  lines.push(`# Clone the repository (if not already cloned)`);
  lines.push(`# git clone https://github.com/${repoName}.git`);
  lines.push(`# cd ${repoName.split('/')[1] || repoName}`);
  lines.push('');

  // Env vars
  if (analysis.envVars.length > 0) {
    lines.push('# Set up environment variables');
    lines.push('if [ ! -f .env ]; then');
    lines.push('  cp .env.example .env 2>/dev/null || touch .env');
    lines.push('  echo "⚠️  Please fill in the following environment variables in .env:"');
    for (const v of analysis.envVars) {
      lines.push(`  echo "  - ${v}"`);
    }
    lines.push('fi');
    lines.push('');
  }

  // Node.js
  if (analysis.hasPackageJson) {
    if (analysis.nodeVersion) {
      lines.push(`# Requires Node.js ${analysis.nodeVersion}`);
      lines.push(`# Install Node.js from https://nodejs.org or use nvm:`);
      lines.push(`# nvm install ${analysis.nodeVersion.replace(/[^0-9.]/g, '') || 'lts'}`);
      lines.push('');
    }
    const pm = analysis.packageManager || 'npm';
    lines.push(`# Install dependencies`);
    lines.push(`${pm} install`);
    lines.push('');

    if (analysis.scripts['build']) {
      lines.push('# Build the project');
      lines.push(`${pm} run build`);
      lines.push('');
    }

    if (analysis.scripts['dev']) {
      lines.push('# Start development server');
      lines.push(`${pm} run dev`);
    } else if (analysis.scripts['start']) {
      lines.push('# Start the application');
      lines.push(`${pm} start`);
    }
  }

  // Python
  if (analysis.hasRequirements) {
    lines.push('# Set up Python virtual environment');
    lines.push('python3 -m venv venv');
    lines.push('source venv/bin/activate  # On Windows: venv\\Scripts\\activate');
    lines.push('');
    lines.push('# Install Python dependencies');
    lines.push('pip install -r requirements.txt 2>/dev/null || pip install -e . 2>/dev/null || true');
    lines.push('');
    lines.push('# Run the application');
    lines.push('python main.py 2>/dev/null || python app.py 2>/dev/null || python -m app 2>/dev/null || echo "Please check README for run instructions"');
  }

  // Rust
  if (analysis.hasCargo) {
    lines.push('# Build Rust project');
    lines.push('cargo build --release');
    lines.push('');
    lines.push('# Run the application');
    lines.push('cargo run');
  }

  // Go
  if (analysis.hasGoMod) {
    lines.push('# Download Go dependencies');
    lines.push('go mod download');
    lines.push('');
    lines.push('# Build and run');
    lines.push('go build -o app .');
    lines.push('./app');
  }

  // Ruby
  if (analysis.hasGemfile) {
    lines.push('# Install Ruby dependencies');
    lines.push('bundle install');
    lines.push('');
    lines.push('# Run the application');
    lines.push('bundle exec ruby app.rb 2>/dev/null || bundle exec rails server 2>/dev/null || echo "Please check README for run instructions"');
  }

  // Docker
  if (analysis.hasDockerCompose) {
    lines.push('');
    lines.push('# Alternatively, use Docker Compose:');
    lines.push('# docker-compose up --build');
  } else if (analysis.hasDocker) {
    lines.push('');
    lines.push('# Alternatively, use Docker:');
    lines.push(`# docker build -t ${repoName.split('/')[1] || 'app'} .`);
    lines.push(`# docker run -p 3000:3000 ${repoName.split('/')[1] || 'app'}`);
  }

  // Makefile
  if (analysis.hasMakefile) {
    lines.push('');
    lines.push('# Or use Makefile:');
    lines.push('# make install && make run');
  }

  lines.push('');
  lines.push('echo "✅ Setup complete!"');

  return lines.join('\n');
}
