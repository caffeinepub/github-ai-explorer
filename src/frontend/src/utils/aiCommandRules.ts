export interface CommandRule {
  keywords: string[];
  generate: (input: string) => CommandSuggestion[];
}

export interface CommandSuggestion {
  command: string;
  description: string;
  confidence: number;
}

function extractArg(input: string, after: string[]): string {
  const lower = input.toLowerCase();
  for (const kw of after) {
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      const rest = input.slice(idx + kw.length).trim();
      const word = rest.split(/\s+/)[0];
      if (word) return word;
    }
  }
  return '';
}

export const commandRules: CommandRule[] = [
  // Git clone
  {
    keywords: ['clone', 'download repo', 'get repo'],
    generate: (input) => {
      const url = extractArg(input, ['clone', 'download', 'get']);
      return [
        {
          command: url ? `git clone ${url}` : 'git clone <repo-url>',
          description: 'Clone a repository',
          confidence: url ? 0.9 : 0.7,
        },
      ];
    },
  },
  // Git fork (via gh CLI)
  {
    keywords: ['fork', 'fork repo', 'fork repository'],
    generate: (input) => {
      const repo = extractArg(input, ['fork']);
      return [
        {
          command: repo ? `gh repo fork ${repo} --clone` : 'gh repo fork <owner/repo> --clone',
          description: 'Fork a repository using GitHub CLI',
          confidence: repo ? 0.85 : 0.7,
        },
        {
          command: 'gh auth login',
          description: 'Authenticate GitHub CLI first if needed',
          confidence: 0.5,
        },
      ];
    },
  },
  // Git commit
  {
    keywords: ['commit', 'save changes', 'commit changes'],
    generate: (input) => {
      const msg = extractArg(input, ['commit', 'message', 'with message']);
      return [
        {
          command: msg ? `git commit -m "${msg}"` : 'git commit -m "your message"',
          description: 'Commit staged changes',
          confidence: 0.85,
        },
        {
          command: 'git add . && git commit -m "update"',
          description: 'Stage all and commit',
          confidence: 0.75,
        },
      ];
    },
  },
  // Git push
  {
    keywords: ['push', 'push changes', 'upload changes'],
    generate: () => [
      { command: 'git push', description: 'Push to remote', confidence: 0.9 },
      { command: 'git push origin main', description: 'Push to origin main', confidence: 0.8 },
    ],
  },
  // Git pull
  {
    keywords: ['pull', 'update repo', 'sync repo', 'fetch changes'],
    generate: () => [
      { command: 'git pull', description: 'Pull latest changes', confidence: 0.9 },
      { command: 'git fetch && git merge', description: 'Fetch then merge', confidence: 0.7 },
    ],
  },
  // Git branch
  {
    keywords: ['branch', 'create branch', 'new branch', 'switch branch'],
    generate: (input) => {
      const name = extractArg(input, ['branch', 'called', 'named']);
      return [
        {
          command: name ? `git checkout -b ${name}` : 'git checkout -b <branch-name>',
          description: 'Create and switch to new branch',
          confidence: name ? 0.9 : 0.75,
        },
        { command: 'git branch -a', description: 'List all branches', confidence: 0.6 },
      ];
    },
  },
  // Git status
  {
    keywords: ['status', 'git status', 'what changed', 'changes'],
    generate: () => [
      { command: 'git status', description: 'Show working tree status', confidence: 0.95 },
      { command: 'git diff', description: 'Show unstaged changes', confidence: 0.7 },
    ],
  },
  // npm install
  {
    keywords: ['install', 'npm install', 'install dependencies', 'install packages'],
    generate: (input) => {
      const pkg = extractArg(input, ['install', 'add']);
      return [
        {
          command: pkg ? `npm install ${pkg}` : 'npm install',
          description: pkg ? `Install ${pkg}` : 'Install all dependencies',
          confidence: 0.85,
        },
        {
          command: pkg ? `yarn add ${pkg}` : 'yarn install',
          description: 'Using yarn',
          confidence: 0.7,
        },
      ];
    },
  },
  // npm run
  {
    keywords: ['run', 'start', 'npm run', 'run script', 'start server', 'dev server'],
    generate: (input) => {
      const script = extractArg(input, ['run', 'start']);
      return [
        {
          command: script && script !== 'server' ? `npm run ${script}` : 'npm run dev',
          description: 'Run npm script',
          confidence: 0.85,
        },
        { command: 'npm start', description: 'Start the application', confidence: 0.75 },
      ];
    },
  },
  // pip install
  {
    keywords: ['pip', 'pip install', 'python install', 'python package'],
    generate: (input) => {
      const pkg = extractArg(input, ['install', 'pip']);
      return [
        {
          command: pkg ? `pip install ${pkg}` : 'pip install -r requirements.txt',
          description: pkg ? `Install ${pkg}` : 'Install from requirements',
          confidence: 0.85,
        },
      ];
    },
  },
  // cargo
  {
    keywords: ['cargo', 'rust build', 'cargo build', 'cargo run'],
    generate: () => [
      { command: 'cargo build', description: 'Build Rust project', confidence: 0.85 },
      { command: 'cargo run', description: 'Build and run', confidence: 0.8 },
      { command: 'cargo test', description: 'Run tests', confidence: 0.7 },
    ],
  },
  // list files
  {
    keywords: ['list', 'ls', 'show files', 'list files', 'what files'],
    generate: () => [
      { command: 'ls -la', description: 'List all files with details', confidence: 0.9 },
      { command: 'ls', description: 'List files', confidence: 0.85 },
    ],
  },
  // navigate
  {
    keywords: ['go to', 'navigate', 'change directory', 'cd'],
    generate: (input) => {
      const dir = extractArg(input, ['to', 'into', 'cd']);
      return [
        {
          command: dir ? `cd ${dir}` : 'cd <directory>',
          description: 'Change directory',
          confidence: dir ? 0.9 : 0.7,
        },
      ];
    },
  },
  // make directory
  {
    keywords: ['mkdir', 'create folder', 'create directory', 'new folder'],
    generate: (input) => {
      const name = extractArg(input, ['folder', 'directory', 'called', 'named', 'mkdir']);
      return [
        {
          command: name ? `mkdir -p ${name}` : 'mkdir -p <folder-name>',
          description: 'Create directory',
          confidence: name ? 0.9 : 0.7,
        },
      ];
    },
  },
  // remove
  {
    keywords: ['remove', 'delete', 'rm', 'delete file', 'remove file'],
    generate: (input) => {
      const target = extractArg(input, ['remove', 'delete', 'rm']);
      return [
        {
          command: target ? `rm -rf ${target}` : 'rm -rf <path>',
          description: 'Remove file or directory',
          confidence: target ? 0.85 : 0.65,
        },
      ];
    },
  },
  // cat / read file
  {
    keywords: ['read', 'show file', 'cat', 'print file', 'view file'],
    generate: (input) => {
      const file = extractArg(input, ['read', 'show', 'cat', 'view', 'print']);
      return [
        {
          command: file ? `cat ${file}` : 'cat <filename>',
          description: 'Display file contents',
          confidence: file ? 0.9 : 0.7,
        },
      ];
    },
  },
  // grep / search
  {
    keywords: ['search', 'grep', 'find text', 'search in files'],
    generate: (input) => {
      const term = extractArg(input, ['search', 'grep', 'for', 'find']);
      return [
        {
          command: term ? `grep -r "${term}" .` : 'grep -r "<pattern>" .',
          description: 'Search recursively in files',
          confidence: term ? 0.85 : 0.7,
        },
      ];
    },
  },
  // run tests
  {
    keywords: ['test', 'run tests', 'tests', 'testing'],
    generate: () => [
      { command: 'npm test', description: 'Run npm tests', confidence: 0.8 },
      { command: 'pytest', description: 'Run Python tests', confidence: 0.7 },
      { command: 'cargo test', description: 'Run Rust tests', confidence: 0.7 },
    ],
  },
  // pwd
  {
    keywords: ['where am i', 'current directory', 'pwd', 'current path'],
    generate: () => [
      { command: 'pwd', description: 'Print working directory', confidence: 0.95 },
    ],
  },
];

export function generateCommandSuggestions(input: string): CommandSuggestion[] {
  const lower = input.toLowerCase();
  const results: CommandSuggestion[] = [];
  const seen = new Set<string>();

  for (const rule of commandRules) {
    const matches = rule.keywords.some((kw) => lower.includes(kw));
    if (matches) {
      const suggestions = rule.generate(input);
      for (const s of suggestions) {
        if (!seen.has(s.command)) {
          seen.add(s.command);
          results.push(s);
        }
      }
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence).slice(0, 6);
}

export function analyzeError(command: string, stderr: string, exitCode: number): CommandSuggestion[] {
  const lower = stderr.toLowerCase();
  const suggestions: CommandSuggestion[] = [];

  if (lower.includes('command not found') || lower.includes('not recognized')) {
    const cmd = command.split(' ')[0];
    suggestions.push({
      command: `which ${cmd} || type ${cmd}`,
      description: `Check if '${cmd}' is installed`,
      confidence: 0.8,
    });
    if (cmd === 'node' || cmd === 'npm') {
      suggestions.push({ command: 'nvm install --lts', description: 'Install Node.js via nvm', confidence: 0.75 });
    }
    if (cmd === 'python' || cmd === 'python3') {
      suggestions.push({ command: 'python3 --version', description: 'Try python3 instead', confidence: 0.8 });
    }
    if (cmd === 'git') {
      suggestions.push({ command: 'brew install git', description: 'Install git via Homebrew (macOS)', confidence: 0.7 });
    }
  }

  if (lower.includes('permission denied')) {
    suggestions.push({
      command: `sudo ${command}`,
      description: 'Run with elevated permissions',
      confidence: 0.85,
    });
    suggestions.push({
      command: `chmod +x ${command.split(' ')[0]}`,
      description: 'Make file executable',
      confidence: 0.7,
    });
  }

  if (lower.includes('no such file or directory')) {
    suggestions.push({ command: 'ls -la', description: 'List files to check what exists', confidence: 0.8 });
    suggestions.push({ command: 'pwd', description: 'Check current directory', confidence: 0.75 });
  }

  if (lower.includes('already exists')) {
    suggestions.push({
      command: command.replace('mkdir', 'mkdir -p'),
      description: 'Use -p flag to ignore existing directories',
      confidence: 0.85,
    });
  }

  if (lower.includes('merge conflict') || lower.includes('conflict')) {
    suggestions.push({ command: 'git status', description: 'Check conflicted files', confidence: 0.9 });
    suggestions.push({ command: 'git mergetool', description: 'Open merge tool', confidence: 0.7 });
  }

  if (lower.includes('port') && lower.includes('in use')) {
    suggestions.push({ command: 'lsof -i :3000', description: 'Find process using port 3000', confidence: 0.8 });
    suggestions.push({ command: 'kill -9 $(lsof -t -i:3000)', description: 'Kill process on port 3000', confidence: 0.7 });
  }

  if (exitCode !== 0 && suggestions.length === 0) {
    suggestions.push({
      command: `${command} --help`,
      description: 'Show command help',
      confidence: 0.6,
    });
  }

  return suggestions;
}

export const COMMON_COMMANDS: CommandSuggestion[] = [
  { command: 'ls -la', description: 'List all files with details', confidence: 1 },
  { command: 'pwd', description: 'Print working directory', confidence: 1 },
  { command: 'git status', description: 'Show git status', confidence: 1 },
  { command: 'git log --oneline -10', description: 'Show last 10 commits', confidence: 1 },
  { command: 'npm install', description: 'Install npm dependencies', confidence: 1 },
  { command: 'npm run dev', description: 'Start dev server', confidence: 1 },
  { command: 'git pull', description: 'Pull latest changes', confidence: 1 },
  { command: 'git push', description: 'Push changes', confidence: 1 },
  { command: 'cat package.json', description: 'View package.json', confidence: 1 },
  { command: 'df -h', description: 'Show disk usage', confidence: 1 },
  { command: 'ps aux', description: 'List running processes', confidence: 1 },
  { command: 'top', description: 'Show system resource usage', confidence: 1 },
];
