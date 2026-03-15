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
  return "";
}

export const commandRules: CommandRule[] = [
  // Git clone
  {
    keywords: ["clone", "download repo", "get repo"],
    generate: (input) => {
      const url = extractArg(input, ["clone", "download", "get"]);
      return [
        {
          command: url ? `git clone ${url}` : "git clone <repo-url>",
          description: "Clone a repository",
          confidence: url ? 0.9 : 0.7,
        },
      ];
    },
  },
  // Git fork (via gh CLI)
  {
    keywords: ["fork", "fork repo", "fork repository"],
    generate: (input) => {
      const repo = extractArg(input, ["fork"]);
      return [
        {
          command: repo
            ? `gh repo fork ${repo} --clone`
            : "gh repo fork <owner/repo> --clone",
          description: "Fork a repository using GitHub CLI",
          confidence: repo ? 0.85 : 0.7,
        },
        {
          command: "gh auth login",
          description: "Authenticate GitHub CLI first if needed",
          confidence: 0.5,
        },
      ];
    },
  },
  // Git commit
  {
    keywords: ["commit", "save changes", "commit changes"],
    generate: (input) => {
      const msg = extractArg(input, ["commit", "message", "with message"]);
      return [
        {
          command: msg
            ? `git commit -m "${msg}"`
            : 'git commit -m "your message"',
          description: "Commit staged changes",
          confidence: 0.85,
        },
        {
          command: 'git add . && git commit -m "update"',
          description: "Stage all and commit",
          confidence: 0.75,
        },
      ];
    },
  },
  // Git push
  {
    keywords: ["push", "push changes", "upload changes"],
    generate: () => [
      { command: "git push", description: "Push to remote", confidence: 0.9 },
      {
        command: "git push origin main",
        description: "Push to origin main",
        confidence: 0.8,
      },
    ],
  },
  // Git pull
  {
    keywords: ["pull", "update repo", "sync repo", "fetch changes"],
    generate: () => [
      {
        command: "git pull",
        description: "Pull latest changes",
        confidence: 0.9,
      },
      {
        command: "git fetch && git merge",
        description: "Fetch then merge",
        confidence: 0.7,
      },
    ],
  },
  // Git branch
  {
    keywords: ["branch", "create branch", "new branch", "switch branch"],
    generate: (input) => {
      const name = extractArg(input, ["branch", "called", "named"]);
      return [
        {
          command: name
            ? `git checkout -b ${name}`
            : "git checkout -b <branch-name>",
          description: "Create and switch to new branch",
          confidence: name ? 0.9 : 0.75,
        },
        {
          command: "git branch -a",
          description: "List all branches",
          confidence: 0.6,
        },
      ];
    },
  },
  // Git status
  {
    keywords: ["status", "git status", "what changed", "changes"],
    generate: () => [
      {
        command: "git status",
        description: "Show working tree status",
        confidence: 0.95,
      },
      {
        command: "git diff",
        description: "Show unstaged changes",
        confidence: 0.7,
      },
    ],
  },
  // npm install
  {
    keywords: [
      "install",
      "npm install",
      "install dependencies",
      "install packages",
    ],
    generate: (input) => {
      const pkg = extractArg(input, ["install", "add"]);
      return [
        {
          command: pkg ? `npm install ${pkg}` : "npm install",
          description: pkg ? `Install ${pkg}` : "Install all dependencies",
          confidence: 0.85,
        },
        {
          command: pkg ? `yarn add ${pkg}` : "yarn install",
          description: "Using yarn",
          confidence: 0.7,
        },
      ];
    },
  },
  // npm run
  {
    keywords: [
      "run",
      "start",
      "npm run",
      "run script",
      "start server",
      "dev server",
    ],
    generate: (input) => {
      const script = extractArg(input, ["run", "start"]);
      return [
        {
          command:
            script && script !== "server" ? `npm run ${script}` : "npm run dev",
          description: "Run npm script",
          confidence: 0.85,
        },
        {
          command: "npm start",
          description: "Start the application",
          confidence: 0.75,
        },
      ];
    },
  },
  // pip install
  {
    keywords: ["pip", "pip install", "python install", "python package"],
    generate: (input) => {
      const pkg = extractArg(input, ["install", "pip"]);
      return [
        {
          command: pkg
            ? `pip install ${pkg}`
            : "pip install -r requirements.txt",
          description: pkg ? `Install ${pkg}` : "Install from requirements",
          confidence: 0.85,
        },
      ];
    },
  },
  // cargo
  {
    keywords: ["cargo", "rust build", "cargo build", "cargo run"],
    generate: () => [
      {
        command: "cargo build",
        description: "Build Rust project",
        confidence: 0.85,
      },
      { command: "cargo run", description: "Build and run", confidence: 0.8 },
      { command: "cargo test", description: "Run tests", confidence: 0.7 },
    ],
  },
  // list files
  {
    keywords: ["list", "ls", "show files", "list files", "what files"],
    generate: () => [
      {
        command: "ls -la",
        description: "List all files with details",
        confidence: 0.9,
      },
      { command: "ls", description: "List files", confidence: 0.85 },
    ],
  },
  // navigate
  {
    keywords: ["go to", "navigate", "change directory", "cd"],
    generate: (input) => {
      const dir = extractArg(input, ["to", "into", "cd"]);
      return [
        {
          command: dir ? `cd ${dir}` : "cd <directory>",
          description: "Change directory",
          confidence: dir ? 0.9 : 0.7,
        },
      ];
    },
  },
  // make directory
  {
    keywords: ["mkdir", "create folder", "create directory", "new folder"],
    generate: (input) => {
      const name = extractArg(input, [
        "folder",
        "directory",
        "called",
        "named",
        "mkdir",
      ]);
      return [
        {
          command: name ? `mkdir -p ${name}` : "mkdir -p <folder-name>",
          description: "Create directory",
          confidence: name ? 0.9 : 0.7,
        },
      ];
    },
  },
  // remove
  {
    keywords: ["remove", "delete", "rm", "delete file", "remove file"],
    generate: (input) => {
      const target = extractArg(input, ["remove", "delete", "rm"]);
      return [
        {
          command: target ? `rm -rf ${target}` : "rm -rf <path>",
          description: "Remove file or directory",
          confidence: target ? 0.85 : 0.65,
        },
      ];
    },
  },
  // cat / read file
  {
    keywords: ["read", "show file", "cat", "print file", "view file"],
    generate: (input) => {
      const file = extractArg(input, ["read", "show", "cat", "view", "print"]);
      return [
        {
          command: file ? `cat ${file}` : "cat <filename>",
          description: "Display file contents",
          confidence: file ? 0.9 : 0.7,
        },
      ];
    },
  },
  // grep / search
  {
    keywords: ["search", "grep", "find text", "search in files"],
    generate: (input) => {
      const term = extractArg(input, ["search", "grep", "for", "find"]);
      return [
        {
          command: term ? `grep -r "${term}" .` : 'grep -r "<pattern>" .',
          description: "Search recursively in files",
          confidence: term ? 0.85 : 0.7,
        },
      ];
    },
  },
  // run tests
  {
    keywords: ["test", "run tests", "tests", "testing"],
    generate: () => [
      { command: "npm test", description: "Run npm tests", confidence: 0.8 },
      { command: "pytest", description: "Run Python tests", confidence: 0.7 },
      { command: "cargo test", description: "Run Rust tests", confidence: 0.7 },
    ],
  },
  // pwd
  {
    keywords: ["where am i", "current directory", "pwd", "current path"],
    generate: () => [
      {
        command: "pwd",
        description: "Print working directory",
        confidence: 0.95,
      },
    ],
  },
  // Docker build
  {
    keywords: ["docker build", "build image", "build docker", "dockerfile"],
    generate: (input) => {
      const img = extractArg(input, ["build", "-t", "image", "tag"]);
      return [
        {
          command: img
            ? `docker build -t ${img} .`
            : "docker build -t {image} .",
          description: "Build Docker image from Dockerfile",
          confidence: img ? 0.9 : 0.75,
        },
        {
          command: "docker build --no-cache -t {image} .",
          description: "Build without cache",
          confidence: 0.65,
        },
      ];
    },
  },
  // Docker run
  {
    keywords: ["docker run", "run container", "start container"],
    generate: (input) => {
      const img = extractArg(input, ["run", "image", "container"]);
      return [
        {
          command: img
            ? `docker run -p 3000:3000 ${img}`
            : "docker run -p 3000:3000 {image}",
          description: "Run Docker container with port mapping",
          confidence: img ? 0.88 : 0.75,
        },
        {
          command: "docker run -d -p 3000:3000 {image}",
          description: "Run container in detached mode",
          confidence: 0.7,
        },
      ];
    },
  },
  // Docker compose
  {
    keywords: [
      "docker-compose",
      "docker compose",
      "compose up",
      "compose down",
    ],
    generate: (input) => {
      const lower = input.toLowerCase();
      if (lower.includes("down")) {
        return [
          {
            command: "docker-compose down",
            description: "Stop and remove containers",
            confidence: 0.9,
          },
          {
            command: "docker-compose down -v",
            description: "Stop containers and remove volumes",
            confidence: 0.75,
          },
        ];
      }
      return [
        {
          command: "docker-compose up -d",
          description: "Start services in detached mode",
          confidence: 0.9,
        },
        {
          command: "docker-compose up --build",
          description: "Build images and start services",
          confidence: 0.8,
        },
        {
          command: "docker-compose logs -f",
          description: "Follow service logs",
          confidence: 0.7,
        },
      ];
    },
  },
  // Docker ps / list
  {
    keywords: [
      "docker ps",
      "list containers",
      "running containers",
      "docker containers",
    ],
    generate: () => [
      {
        command: "docker ps",
        description: "List running containers",
        confidence: 0.95,
      },
      {
        command: "docker ps -a",
        description: "List all containers (including stopped)",
        confidence: 0.85,
      },
    ],
  },
  // Docker logs
  {
    keywords: ["docker logs", "container logs", "view logs"],
    generate: (input) => {
      const container = extractArg(input, ["logs", "container"]);
      return [
        {
          command: container
            ? `docker logs ${container}`
            : "docker logs {container}",
          description: "View container logs",
          confidence: container ? 0.9 : 0.75,
        },
        {
          command: container
            ? `docker logs -f ${container}`
            : "docker logs -f {container}",
          description: "Follow container logs (live)",
          confidence: container ? 0.85 : 0.7,
        },
      ];
    },
  },
  // Docker exec
  {
    keywords: [
      "docker exec",
      "exec container",
      "shell container",
      "enter container",
    ],
    generate: (input) => {
      const container = extractArg(input, ["exec", "container", "into"]);
      return [
        {
          command: container
            ? `docker exec -it ${container} /bin/sh`
            : "docker exec -it {container} /bin/sh",
          description: "Open shell in running container",
          confidence: container ? 0.9 : 0.75,
        },
        {
          command: container
            ? `docker exec -it ${container} /bin/bash`
            : "docker exec -it {container} /bin/bash",
          description: "Open bash in container (if available)",
          confidence: container ? 0.8 : 0.65,
        },
      ];
    },
  },
  // Docker system prune
  {
    keywords: [
      "docker prune",
      "clean docker",
      "docker cleanup",
      "docker system",
    ],
    generate: () => [
      {
        command: "docker system prune -f",
        description: "Remove unused Docker resources",
        confidence: 0.9,
      },
      {
        command: "docker image prune -a",
        description: "Remove all unused images",
        confidence: 0.75,
      },
      {
        command: "docker volume prune",
        description: "Remove unused volumes",
        confidence: 0.7,
      },
    ],
  },
  // Docker images
  {
    keywords: ["docker images", "list images", "docker image list"],
    generate: () => [
      {
        command: "docker images",
        description: "List Docker images",
        confidence: 0.95,
      },
      {
        command: "docker image ls",
        description: "List images (alternate)",
        confidence: 0.8,
      },
    ],
  },
  // Docker stop / kill
  {
    keywords: ["docker stop", "stop container", "kill container"],
    generate: (input) => {
      const container = extractArg(input, ["stop", "kill", "container"]);
      return [
        {
          command: container
            ? `docker stop ${container}`
            : "docker stop {container}",
          description: "Gracefully stop a container",
          confidence: container ? 0.9 : 0.75,
        },
      ];
    },
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

export function analyzeError(
  command: string,
  stderr: string,
  exitCode: number,
): CommandSuggestion[] {
  const lower = stderr.toLowerCase();
  const suggestions: CommandSuggestion[] = [];

  if (lower.includes("command not found") || lower.includes("not recognized")) {
    const cmd = command.split(" ")[0];
    suggestions.push({
      command: `which ${cmd} || type ${cmd}`,
      description: `Check if '${cmd}' is installed`,
      confidence: 0.8,
    });
    if (cmd === "node" || cmd === "npm") {
      suggestions.push({
        command: "nvm install --lts",
        description: "Install Node.js via nvm",
        confidence: 0.75,
      });
    }
    if (cmd === "python" || cmd === "python3") {
      suggestions.push({
        command: "python3 --version",
        description: "Try python3 instead",
        confidence: 0.8,
      });
    }
    if (cmd === "git") {
      suggestions.push({
        command: "brew install git",
        description: "Install git via Homebrew (macOS)",
        confidence: 0.7,
      });
    }
    if (cmd === "docker") {
      suggestions.push({
        command: "curl -fsSL https://get.docker.com | sh",
        description: "Install Docker (Linux)",
        confidence: 0.7,
      });
    }
  }

  if (lower.includes("permission denied")) {
    suggestions.push({
      command: `sudo ${command}`,
      description: "Run with elevated permissions",
      confidence: 0.85,
    });
    suggestions.push({
      command: `chmod +x ${command.split(" ")[0]}`,
      description: "Make file executable",
      confidence: 0.7,
    });
  }

  if (lower.includes("no such file or directory")) {
    suggestions.push({
      command: "ls -la",
      description: "List files to check what exists",
      confidence: 0.8,
    });
    suggestions.push({
      command: "pwd",
      description: "Check current directory",
      confidence: 0.75,
    });
  }

  if (lower.includes("already exists")) {
    suggestions.push({
      command: command.replace("mkdir", "mkdir -p"),
      description: "Use -p flag to ignore existing directories",
      confidence: 0.85,
    });
  }

  if (lower.includes("merge conflict") || lower.includes("conflict")) {
    suggestions.push({
      command: "git status",
      description: "Check conflicted files",
      confidence: 0.9,
    });
    suggestions.push({
      command: "git mergetool",
      description: "Open merge tool",
      confidence: 0.7,
    });
  }

  if (lower.includes("port") && lower.includes("in use")) {
    suggestions.push({
      command: "lsof -i :3000",
      description: "Find process using port 3000",
      confidence: 0.8,
    });
    suggestions.push({
      command: "kill -9 $(lsof -t -i:3000)",
      description: "Kill process on port 3000",
      confidence: 0.7,
    });
  }

  if (lower.includes("cannot connect") || lower.includes("docker daemon")) {
    suggestions.push({
      command: "sudo systemctl start docker",
      description: "Start Docker daemon (Linux)",
      confidence: 0.85,
    });
    suggestions.push({
      command: "open -a Docker",
      description: "Start Docker Desktop (macOS)",
      confidence: 0.75,
    });
  }

  if (exitCode !== 0 && suggestions.length === 0) {
    suggestions.push({
      command: `${command} --help`,
      description: "Show command help",
      confidence: 0.6,
    });
  }

  return suggestions;
}

export const COMMON_COMMANDS: CommandSuggestion[] = [
  {
    command: "ls -la",
    description: "List all files with details",
    confidence: 1,
  },
  { command: "pwd", description: "Print working directory", confidence: 1 },
  { command: "git status", description: "Show git status", confidence: 1 },
  {
    command: "git log --oneline -10",
    description: "Show last 10 commits",
    confidence: 1,
  },
  {
    command: "npm install",
    description: "Install npm dependencies",
    confidence: 1,
  },
  { command: "npm run dev", description: "Start dev server", confidence: 1 },
  { command: "git pull", description: "Pull latest changes", confidence: 1 },
  { command: "git push", description: "Push changes", confidence: 1 },
  {
    command: "cat package.json",
    description: "View package.json",
    confidence: 1,
  },
  { command: "df -h", description: "Show disk usage", confidence: 1 },
  { command: "ps aux", description: "List running processes", confidence: 1 },
  { command: "top", description: "Show system resource usage", confidence: 1 },
  // Docker commands
  {
    command: "docker build -t {image} .",
    description: "Build Docker image from Dockerfile",
    confidence: 1,
  },
  {
    command: "docker run -p 3000:3000 {image}",
    description: "Run container with port mapping",
    confidence: 1,
  },
  {
    command: "docker-compose up -d",
    description: "Start Docker Compose services",
    confidence: 1,
  },
  {
    command: "docker-compose down",
    description: "Stop Docker Compose services",
    confidence: 1,
  },
  {
    command: "docker ps",
    description: "List running containers",
    confidence: 1,
  },
  {
    command: "docker logs {container}",
    description: "View container logs",
    confidence: 1,
  },
  {
    command: "docker exec -it {container} /bin/sh",
    description: "Open shell in container",
    confidence: 1,
  },
  {
    command: "docker system prune -f",
    description: "Clean up unused Docker resources",
    confidence: 1,
  },
];

// ── Context-aware suggestions ─────────────────────────────────────────────

export function getContextAwareSuggestions(
  input: string,
  language: string,
  _topics: string[],
): CommandSuggestion[] {
  const base = generateCommandSuggestions(input);
  const lang = language.toLowerCase();

  const languageBoosts: Record<string, string[]> = {
    python: ["pip", "pytest", "python"],
    typescript: ["npm", "yarn", "node", "jest", "npx"],
    javascript: ["npm", "yarn", "node", "jest", "npx"],
    rust: ["cargo"],
    go: ["go"],
    java: ["mvn", "gradle", "./gradlew"],
  };

  // Language-specific fallback commands when no rule matched
  const languageDefaults: Record<string, CommandSuggestion[]> = {
    python: [
      {
        command: "python main.py",
        description: "Run main Python file",
        confidence: 0.7,
      },
      {
        command: "pip install -r requirements.txt",
        description: "Install Python deps",
        confidence: 0.75,
      },
      { command: "pytest", description: "Run Python tests", confidence: 0.7 },
    ],
    typescript: [
      {
        command: "npm run dev",
        description: "Start dev server",
        confidence: 0.75,
      },
      { command: "npm test", description: "Run tests", confidence: 0.7 },
      {
        command: "npx tsc --noEmit",
        description: "Type-check TypeScript",
        confidence: 0.65,
      },
    ],
    javascript: [
      {
        command: "npm run dev",
        description: "Start dev server",
        confidence: 0.75,
      },
      { command: "npm test", description: "Run tests", confidence: 0.7 },
    ],
    rust: [
      {
        command: "cargo build",
        description: "Build Rust project",
        confidence: 0.8,
      },
      { command: "cargo run", description: "Build and run", confidence: 0.75 },
      { command: "cargo test", description: "Run tests", confidence: 0.7 },
    ],
    go: [
      {
        command: "go build ./...",
        description: "Build Go project",
        confidence: 0.8,
      },
      {
        command: "go test ./...",
        description: "Run Go tests",
        confidence: 0.75,
      },
      {
        command: "go run main.go",
        description: "Run Go program",
        confidence: 0.7,
      },
    ],
    java: [
      {
        command: "mvn compile",
        description: "Compile with Maven",
        confidence: 0.75,
      },
      { command: "mvn test", description: "Run Maven tests", confidence: 0.7 },
      {
        command: "./gradlew build",
        description: "Build with Gradle",
        confidence: 0.7,
      },
    ],
  };

  if (base.length > 0) {
    // Boost confidence for relevant commands
    const boostPrefixes = languageBoosts[lang] ?? [];
    return base
      .map((s) => {
        const shouldBoost = boostPrefixes.some((prefix) =>
          s.command.toLowerCase().startsWith(prefix),
        );
        return shouldBoost
          ? { ...s, confidence: Math.min(1, s.confidence + 0.2) }
          : s;
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  // No base matches — return language defaults
  const defaults = languageDefaults[lang];
  if (defaults) return defaults;

  return generateCommandSuggestions(input);
}

// ── Proactive workflow suggestions ─────────────────────────────────────────

export function getProactiveSuggestions(
  recentHistory: string[],
): CommandSuggestion[] {
  if (recentHistory.length === 0) return [];

  const last = recentHistory[recentHistory.length - 1] ?? "";
  const secondLast = recentHistory[recentHistory.length - 2] ?? "";

  // git clone -> cd + install
  if (/^git clone\s+\S+/.test(last)) {
    const urlMatch = last.match(/git clone\s+\S+\/([^/.]+)(\.git)?/);
    const repoName = urlMatch ? urlMatch[1] : "<repo>";
    return [
      {
        command: `cd ${repoName} && npm install`,
        description: "Enter repo and install Node deps",
        confidence: 0.8,
      },
      {
        command: `cd ${repoName} && pip install -r requirements.txt`,
        description: "Enter repo and install Python deps",
        confidence: 0.7,
      },
    ];
  }

  // npm/yarn install -> run dev
  if (/^(npm install|yarn install|yarn$)/.test(last)) {
    return [
      {
        command: "npm run dev",
        description: "Start the dev server",
        confidence: 0.9,
      },
    ];
  }

  // git add -> commit
  if (/^git add/.test(last)) {
    return [
      {
        command: 'git commit -m "update"',
        description: "Commit staged changes",
        confidence: 0.85,
      },
    ];
  }

  // git commit -> push
  if (
    /^git commit/.test(last) ||
    (/^git add/.test(secondLast) && /^git commit/.test(last))
  ) {
    return [
      {
        command: "git push",
        description: "Push commits to remote",
        confidence: 0.9,
      },
      {
        command: "git push origin main",
        description: "Push to origin main",
        confidence: 0.75,
      },
    ];
  }

  // docker build -> docker run
  if (/^docker build/.test(last)) {
    const tagMatch = last.match(/-t\s+(\S+)/);
    const image = tagMatch ? tagMatch[1] : "{image}";
    return [
      {
        command: `docker run -p 3000:3000 ${image}`,
        description: "Run the built Docker image",
        confidence: 0.85,
      },
    ];
  }

  // docker-compose up -> logs
  if (/^docker.compose\s+up/.test(last)) {
    return [
      {
        command: "docker-compose logs -f",
        description: "Follow service logs",
        confidence: 0.8,
      },
    ];
  }

  // Default: suggest git status + ls as next steps
  return [
    {
      command: "git status",
      description: "Check repository status",
      confidence: 0.6,
    },
    {
      command: "ls -la",
      description: "List directory contents",
      confidence: 0.55,
    },
  ];
}

// ─── ErrorAnalysis (enhanced analyzeError) ───────────────────────────────────

export interface ErrorAnalysis {
  rootCause: string;
  fixes: CommandSuggestion[];
}

export function analyzeErrorEnhanced(
  command: string,
  stderr: string,
  exitCode: number,
): ErrorAnalysis {
  const lower = stderr.toLowerCase();
  const fixes = analyzeError(command, stderr, exitCode);

  let rootCause = "";
  if (lower.includes("command not found") || lower.includes("not recognized")) {
    rootCause =
      "Command not found means the program is not installed or not in your PATH.";
  } else if (lower.includes("permission denied")) {
    rootCause =
      "Permission denied means you don't have the rights to access this file or directory. Try running with sudo or fixing file permissions.";
  } else if (lower.includes("no such file or directory")) {
    rootCause =
      "No such file or directory means the path doesn't exist. Check your current directory and the file path.";
  } else if (lower.includes("already exists")) {
    rootCause =
      "File or directory already exists. Use appropriate flags to overwrite or skip.";
  } else if (lower.includes("merge conflict") || lower.includes("conflict")) {
    rootCause =
      "Git merge conflict detected. You need to resolve conflicting changes in the affected files.";
  } else if (lower.includes("port") && lower.includes("in use")) {
    rootCause =
      "Port is already in use by another process. You need to kill that process or use a different port.";
  } else if (
    lower.includes("cannot connect") ||
    lower.includes("docker daemon")
  ) {
    rootCause =
      "Docker daemon is not running. Start Docker Desktop or the Docker service.";
  } else if (
    lower.includes("network") ||
    lower.includes("connection refused")
  ) {
    rootCause =
      "Network error — the host may be unreachable or the service is not listening on that port.";
  } else if (lower.includes("out of memory") || lower.includes("oom")) {
    rootCause =
      "Out of memory — the process exceeded available RAM. Close other apps or increase swap.";
  } else if (lower.includes("syntax error")) {
    rootCause =
      "Syntax error in your script or command. Check for typos, missing quotes, or incorrect syntax.";
  } else if (exitCode !== 0) {
    rootCause = `Command exited with code ${exitCode}, indicating an error occurred during execution.`;
  }

  return { rootCause, fixes };
}

// ─── Command Explainer ────────────────────────────────────────────────────────

export interface CommandExplanation {
  command: string;
  summary: string;
  flags: { flag: string; meaning: string }[];
  example?: string;
  category: string;
}

const CMD_DB: Record<string, Omit<CommandExplanation, "command">> = {
  ls: {
    summary:
      "Lists files and directories in the current or specified directory.",
    flags: [
      {
        flag: "-l",
        meaning: "Long format — shows permissions, owner, size, date",
      },
      {
        flag: "-a",
        meaning: "Show all files including hidden ones (starting with .)",
      },
      { flag: "-h", meaning: "Human-readable file sizes (KB, MB, GB)" },
      { flag: "-R", meaning: "Recursively list subdirectories" },
      { flag: "-t", meaning: "Sort by modification time, newest first" },
    ],
    example: "ls -lah",
    category: "Filesystem",
  },
  cd: {
    summary: "Changes the current working directory.",
    flags: [
      { flag: "-", meaning: "Go back to previous directory" },
      { flag: "~", meaning: "Go to home directory" },
      { flag: "..", meaning: "Go up one directory level" },
    ],
    example: "cd ~/projects/my-app",
    category: "Filesystem",
  },
  pwd: {
    summary: "Prints the full path of the current working directory.",
    flags: [
      { flag: "-L", meaning: "Print logical path (follows symlinks)" },
      { flag: "-P", meaning: "Print physical path (resolves symlinks)" },
    ],
    example: "pwd",
    category: "Filesystem",
  },
  mkdir: {
    summary: "Creates one or more directories.",
    flags: [
      {
        flag: "-p",
        meaning: "Create parent directories as needed, no error if exists",
      },
      { flag: "-v", meaning: "Print a message for each created directory" },
      { flag: "-m", meaning: "Set permissions (e.g. -m 755)" },
    ],
    example: "mkdir -p src/components/ui",
    category: "Filesystem",
  },
  rm: {
    summary: "Removes files or directories. Use with caution — no undo.",
    flags: [
      {
        flag: "-r",
        meaning: "Recursively remove directories and their contents",
      },
      { flag: "-f", meaning: "Force removal without prompting" },
      { flag: "-i", meaning: "Prompt before each removal" },
      { flag: "-v", meaning: "Verbose — show what is being removed" },
    ],
    example: "rm -rf ./dist",
    category: "Filesystem",
  },
  cat: {
    summary: "Concatenates and displays file contents.",
    flags: [
      { flag: "-n", meaning: "Number all output lines" },
      { flag: "-A", meaning: "Show all special characters" },
      { flag: "-s", meaning: "Squeeze blank lines" },
    ],
    example: "cat package.json",
    category: "Filesystem",
  },
  grep: {
    summary: "Searches files or input for lines matching a pattern.",
    flags: [
      { flag: "-i", meaning: "Case-insensitive match" },
      { flag: "-r", meaning: "Recursively search directories" },
      { flag: "-n", meaning: "Show line numbers" },
      { flag: "-v", meaning: "Invert match (show non-matching lines)" },
      { flag: "-l", meaning: "Only print file names with matches" },
      { flag: "-E", meaning: "Use extended regular expressions" },
    ],
    example: 'grep -rn "TODO" ./src',
    category: "Filesystem",
  },
  find: {
    summary: "Searches for files and directories matching criteria.",
    flags: [
      {
        flag: "-name",
        meaning: "Match by filename (use quotes for wildcards)",
      },
      { flag: "-type f", meaning: "Only files" },
      { flag: "-type d", meaning: "Only directories" },
      { flag: "-mtime", meaning: "Modified n days ago" },
      { flag: "-exec", meaning: "Execute a command on each result" },
    ],
    example: 'find . -name "*.ts" -not -path "*/node_modules/*"',
    category: "Filesystem",
  },
  cp: {
    summary: "Copies files or directories.",
    flags: [
      { flag: "-r", meaning: "Copy directories recursively" },
      { flag: "-p", meaning: "Preserve file attributes" },
      { flag: "-v", meaning: "Verbose output" },
      { flag: "-n", meaning: "Do not overwrite existing files" },
    ],
    example: "cp -r ./src ./src-backup",
    category: "Filesystem",
  },
  mv: {
    summary: "Moves or renames files and directories.",
    flags: [
      { flag: "-f", meaning: "Force — do not prompt before overwriting" },
      { flag: "-i", meaning: "Prompt before overwriting" },
      { flag: "-v", meaning: "Verbose output" },
      { flag: "-n", meaning: "Do not overwrite existing files" },
    ],
    example: "mv old-name.ts new-name.ts",
    category: "Filesystem",
  },
  chmod: {
    summary: "Changes file or directory permissions.",
    flags: [
      { flag: "-R", meaning: "Apply recursively to directories" },
      { flag: "+x", meaning: "Add execute permission" },
      { flag: "755", meaning: "rwxr-xr-x — owner full, others read/execute" },
      { flag: "644", meaning: "rw-r--r-- — owner read/write, others read" },
    ],
    example: "chmod +x ./scripts/deploy.sh",
    category: "Filesystem",
  },
  chown: {
    summary: "Changes file owner and group.",
    flags: [
      { flag: "-R", meaning: "Apply recursively" },
      { flag: "user:group", meaning: "Set both owner and group" },
    ],
    example: "chown -R $USER:$USER ./app",
    category: "Filesystem",
  },
  touch: {
    summary: "Creates empty files or updates file timestamps.",
    flags: [
      { flag: "-a", meaning: "Only change access time" },
      { flag: "-m", meaning: "Only change modification time" },
      {
        flag: "-t",
        meaning: "Use specified timestamp instead of current time",
      },
    ],
    example: "touch .env",
    category: "Filesystem",
  },
  echo: {
    summary: "Prints text or variable values to the terminal.",
    flags: [
      { flag: "-n", meaning: "Do not output a trailing newline" },
      { flag: "-e", meaning: "Interpret escape sequences (\\n, \\t, etc.)" },
    ],
    example: 'echo "Hello, $USER"',
    category: "System",
  },
  export: {
    summary:
      "Sets an environment variable for the current shell and child processes.",
    flags: [],
    example: "export NODE_ENV=production",
    category: "System",
  },
  source: {
    summary:
      "Executes a file in the current shell context (loads env vars, functions).",
    flags: [],
    example: "source ~/.bashrc",
    category: "System",
  },
  curl: {
    summary:
      "Transfers data to/from servers. Supports HTTP, FTP, SFTP, and more.",
    flags: [
      { flag: "-X", meaning: "HTTP method (GET, POST, PUT, DELETE)" },
      { flag: "-H", meaning: "Add a request header" },
      { flag: "-d", meaning: "Request body data" },
      { flag: "-o", meaning: "Write output to a file" },
      { flag: "-L", meaning: "Follow redirects" },
      { flag: "-s", meaning: "Silent mode — no progress meter" },
      { flag: "-i", meaning: "Include response headers in output" },
    ],
    example:
      'curl -X POST -H "Content-Type: application/json" -d \'{"key":"val"}\' https://api.example.com',
    category: "SSH/Network",
  },
  wget: {
    summary: "Downloads files from the web non-interactively.",
    flags: [
      { flag: "-O", meaning: "Save to specified filename" },
      { flag: "-q", meaning: "Quiet mode" },
      { flag: "-r", meaning: "Recursive download" },
      { flag: "--no-check-certificate", meaning: "Skip SSL verification" },
    ],
    example: "wget -O setup.sh https://example.com/install.sh",
    category: "SSH/Network",
  },
  tar: {
    summary: "Archives (and extracts) files, optionally with compression.",
    flags: [
      { flag: "-c", meaning: "Create archive" },
      { flag: "-x", meaning: "Extract archive" },
      { flag: "-z", meaning: "Use gzip compression (.tar.gz)" },
      { flag: "-f", meaning: "Specify archive filename" },
      { flag: "-v", meaning: "Verbose — list processed files" },
      { flag: "-j", meaning: "Use bzip2 compression (.tar.bz2)" },
    ],
    example: "tar czf backup.tar.gz ./src",
    category: "Filesystem",
  },
  zip: {
    summary: "Creates a compressed ZIP archive.",
    flags: [
      { flag: "-r", meaning: "Recursively include directory contents" },
      { flag: "-9", meaning: "Maximum compression" },
      { flag: "-e", meaning: "Encrypt archive with password" },
    ],
    example: "zip -r archive.zip ./dist",
    category: "Filesystem",
  },
  unzip: {
    summary: "Extracts files from a ZIP archive.",
    flags: [
      { flag: "-d", meaning: "Extract to specified directory" },
      { flag: "-l", meaning: "List contents without extracting" },
      { flag: "-o", meaning: "Overwrite existing files" },
    ],
    example: "unzip archive.zip -d ./output",
    category: "Filesystem",
  },
  rsync: {
    summary: "Syncs files/directories locally or over SSH with delta transfer.",
    flags: [
      {
        flag: "-a",
        meaning: "Archive mode (preserves permissions, symlinks, etc.)",
      },
      { flag: "-v", meaning: "Verbose" },
      { flag: "-z", meaning: "Compress during transfer" },
      { flag: "--delete", meaning: "Delete files not in source" },
      { flag: "--exclude", meaning: "Exclude files matching pattern" },
    ],
    example: "rsync -avz ./dist/ user@server:/var/www/app/",
    category: "SSH/Network",
  },
  ssh: {
    summary: "Opens a secure shell connection to a remote host.",
    flags: [
      { flag: "-i", meaning: "Identity file (private key) to use" },
      { flag: "-p", meaning: "Port number (default: 22)" },
      { flag: "-L", meaning: "Local port forwarding" },
      {
        flag: "-N",
        meaning: "Do not execute a remote command (for tunneling)",
      },
    ],
    example: "ssh -i ~/.ssh/id_ed25519 user@192.168.1.100",
    category: "SSH/Network",
  },
  scp: {
    summary: "Securely copies files between hosts over SSH.",
    flags: [
      { flag: "-r", meaning: "Recursively copy directories" },
      { flag: "-P", meaning: "Port number" },
      { flag: "-i", meaning: "Identity file" },
    ],
    example: "scp -r ./dist user@server:/var/www/",
    category: "SSH/Network",
  },
  "ssh-keygen": {
    summary: "Generates, manages, and converts SSH authentication keys.",
    flags: [
      { flag: "-t", meaning: "Key type (ed25519, rsa, ecdsa)" },
      { flag: "-C", meaning: "Comment (usually email)" },
      { flag: "-b", meaning: "Key bits (for RSA, e.g. 4096)" },
      { flag: "-f", meaning: "Output filename" },
    ],
    example: 'ssh-keygen -t ed25519 -C "you@example.com"',
    category: "SSH/Network",
  },
  ps: {
    summary: "Displays currently running processes.",
    flags: [
      { flag: "aux", meaning: "All processes with user and CPU/memory info" },
      { flag: "-e", meaning: "All processes" },
      { flag: "-f", meaning: "Full format listing" },
    ],
    example: "ps aux | grep node",
    category: "System",
  },
  kill: {
    summary: "Sends a signal (default: SIGTERM) to terminate a process by PID.",
    flags: [
      {
        flag: "-9",
        meaning: "SIGKILL — force kill immediately (cannot be caught)",
      },
      { flag: "-15", meaning: "SIGTERM — graceful shutdown (default)" },
      { flag: "-l", meaning: "List available signal names" },
    ],
    example: "kill -9 12345",
    category: "System",
  },
  killall: {
    summary: "Kills all processes with a given name.",
    flags: [
      { flag: "-9", meaning: "Force kill" },
      { flag: "-i", meaning: "Ask before killing" },
      { flag: "-u", meaning: "Kill only processes for specified user" },
    ],
    example: "killall node",
    category: "System",
  },
  lsof: {
    summary: "Lists open files and the processes using them.",
    flags: [
      { flag: "-i", meaning: "Network files (e.g. -i :3000 for port 3000)" },
      { flag: "-p", meaning: "Files for specified PID" },
      { flag: "-u", meaning: "Files for specified user" },
      { flag: "-t", meaning: "Output only PIDs" },
    ],
    example: "lsof -i :3000",
    category: "System",
  },
  top: {
    summary: "Real-time display of processes and system resource usage.",
    flags: [
      { flag: "-d", meaning: "Delay interval in seconds" },
      { flag: "-p", meaning: "Monitor only specified PID(s)" },
      { flag: "-u", meaning: "Show only processes for specified user" },
    ],
    example: "top -u $USER",
    category: "System",
  },
  htop: {
    summary: "Interactive process viewer — an improved version of top.",
    flags: [
      { flag: "-u", meaning: "Show processes for specified user" },
      { flag: "-p", meaning: "Show only specified PIDs" },
    ],
    example: "htop -u $USER",
    category: "System",
  },
  df: {
    summary: "Reports disk space usage for file systems.",
    flags: [
      { flag: "-h", meaning: "Human-readable sizes" },
      { flag: "-T", meaning: "Print file system type" },
      { flag: "-i", meaning: "Show inode usage instead of blocks" },
    ],
    example: "df -h",
    category: "System",
  },
  du: {
    summary: "Estimates file space usage.",
    flags: [
      { flag: "-h", meaning: "Human-readable sizes" },
      { flag: "-s", meaning: "Only total for each argument" },
      { flag: "--max-depth", meaning: "Limit depth of directory traversal" },
    ],
    example: "du -sh ./node_modules",
    category: "System",
  },
  free: {
    summary: "Displays total, used, and available memory in the system.",
    flags: [
      { flag: "-h", meaning: "Human-readable output" },
      { flag: "-m", meaning: "Output in megabytes" },
      { flag: "-s", meaning: "Update every N seconds" },
    ],
    example: "free -h",
    category: "System",
  },
  ping: {
    summary: "Tests network connectivity to a host by sending ICMP packets.",
    flags: [
      { flag: "-c", meaning: "Number of packets to send" },
      { flag: "-i", meaning: "Interval between packets" },
      { flag: "-t", meaning: "TTL (time to live)" },
    ],
    example: "ping -c 4 google.com",
    category: "SSH/Network",
  },
  netstat: {
    summary:
      "Displays network connections, routing tables, and interface statistics.",
    flags: [
      { flag: "-t", meaning: "TCP connections" },
      { flag: "-u", meaning: "UDP connections" },
      { flag: "-l", meaning: "Only listening sockets" },
      { flag: "-n", meaning: "Show numeric addresses" },
      { flag: "-p", meaning: "Show PID/program name" },
    ],
    example: "netstat -tlnp",
    category: "SSH/Network",
  },
  ifconfig: {
    summary: "Configures and displays network interface parameters.",
    flags: [
      { flag: "up", meaning: "Activate interface" },
      { flag: "down", meaning: "Deactivate interface" },
    ],
    example: "ifconfig eth0",
    category: "SSH/Network",
  },
  ip: {
    summary: "Show/manipulate routing, devices, policy routing and tunnels.",
    flags: [
      { flag: "addr", meaning: "Show IP addresses" },
      { flag: "link", meaning: "Show network interfaces" },
      { flag: "route", meaning: "Show routing table" },
    ],
    example: "ip addr show",
    category: "SSH/Network",
  },
  git: {
    summary: "Distributed version control system for tracking code changes.",
    flags: [
      { flag: "--version", meaning: "Show git version" },
      { flag: "--help", meaning: "Show help" },
    ],
    example: "git --version",
    category: "Git",
  },
  "git clone": {
    summary: "Clones a remote repository to a local directory.",
    flags: [
      { flag: "--depth", meaning: "Shallow clone with specified commit depth" },
      { flag: "-b", meaning: "Clone a specific branch" },
      { flag: "--recurse-submodules", meaning: "Initialize submodules" },
    ],
    example: "git clone https://github.com/user/repo.git",
    category: "Git",
  },
  "git commit": {
    summary: "Records staged changes to the repository with a message.",
    flags: [
      { flag: "-m", meaning: 'Commit message (e.g. -m "feat: add feature")' },
      { flag: "-a", meaning: "Auto-stage all tracked modified files" },
      { flag: "--amend", meaning: "Modify the most recent commit" },
    ],
    example: 'git commit -m "feat: add new component"',
    category: "Git",
  },
  "git push": {
    summary: "Uploads local commits to the remote repository.",
    flags: [
      { flag: "-u", meaning: "Set upstream for the current branch" },
      {
        flag: "--force",
        meaning: "Force push (overwrites remote history — use carefully)",
      },
      { flag: "--tags", meaning: "Push all tags" },
    ],
    example: "git push origin main",
    category: "Git",
  },
  "git pull": {
    summary: "Fetches and merges changes from the remote repository.",
    flags: [
      {
        flag: "--rebase",
        meaning: "Rebase local commits on top of fetched commits",
      },
      { flag: "--ff-only", meaning: "Only allow fast-forward merges" },
    ],
    example: "git pull origin main",
    category: "Git",
  },
  "git status": {
    summary:
      "Shows the working tree status — staged, unstaged, and untracked files.",
    flags: [
      { flag: "-s", meaning: "Short output format" },
      { flag: "-b", meaning: "Show branch info" },
    ],
    example: "git status",
    category: "Git",
  },
  "git log": {
    summary: "Shows commit history.",
    flags: [
      { flag: "--oneline", meaning: "One line per commit" },
      { flag: "--graph", meaning: "ASCII art branch graph" },
      { flag: "-n", meaning: "Limit to last n commits" },
      { flag: "--author", meaning: "Filter by author" },
    ],
    example: "git log --oneline --graph -20",
    category: "Git",
  },
  "git diff": {
    summary: "Shows changes between commits, the working tree, and the index.",
    flags: [
      { flag: "--staged", meaning: "Diff staged changes" },
      { flag: "--stat", meaning: "Show changed files summary" },
    ],
    example: "git diff --staged",
    category: "Git",
  },
  "git checkout": {
    summary: "Switches branches or restores working tree files.",
    flags: [
      { flag: "-b", meaning: "Create and switch to new branch" },
      { flag: "--", meaning: "Restore a file to its last committed state" },
    ],
    example: "git checkout -b feature/new-feature",
    category: "Git",
  },
  "git branch": {
    summary: "Lists, creates, or deletes branches.",
    flags: [
      { flag: "-a", meaning: "List all branches (local and remote)" },
      { flag: "-d", meaning: "Delete a branch" },
      { flag: "-D", meaning: "Force delete a branch" },
      { flag: "-m", meaning: "Rename a branch" },
    ],
    example: "git branch -a",
    category: "Git",
  },
  "git merge": {
    summary: "Merges one or more branches into the current branch.",
    flags: [
      { flag: "--no-ff", meaning: "Create a merge commit always" },
      { flag: "--squash", meaning: "Squash commits into one" },
      { flag: "--abort", meaning: "Abort the current merge" },
    ],
    example: "git merge feature/my-feature",
    category: "Git",
  },
  "git rebase": {
    summary: "Reapplies commits on top of another base commit.",
    flags: [
      { flag: "-i", meaning: "Interactive rebase to reorder/squash commits" },
      { flag: "--onto", meaning: "Rebase onto a different branch" },
      { flag: "--abort", meaning: "Abort the rebase" },
    ],
    example: "git rebase -i HEAD~3",
    category: "Git",
  },
  "git stash": {
    summary: "Temporarily shelves changes so you can switch context.",
    flags: [
      { flag: "pop", meaning: "Apply and remove the latest stash" },
      { flag: "list", meaning: "List all stashes" },
      { flag: "apply", meaning: "Apply stash without removing it" },
      { flag: "drop", meaning: "Delete a stash" },
    ],
    example: "git stash && git pull && git stash pop",
    category: "Git",
  },
  "git reset": {
    summary: "Resets HEAD to a specified state.",
    flags: [
      { flag: "--soft", meaning: "Keep changes staged" },
      { flag: "--mixed", meaning: "Keep changes unstaged (default)" },
      { flag: "--hard", meaning: "Discard all changes (destructive)" },
    ],
    example: "git reset --soft HEAD~1",
    category: "Git",
  },
  "git add": {
    summary: "Stages file changes to be included in the next commit.",
    flags: [
      { flag: ".", meaning: "Stage all changes in current directory" },
      { flag: "-p", meaning: "Interactively stage hunks" },
      { flag: "-u", meaning: "Stage tracked files only" },
    ],
    example: "git add -p",
    category: "Git",
  },
  npm: {
    summary: "Node Package Manager — manages JavaScript packages and scripts.",
    flags: [
      { flag: "--version", meaning: "Show npm version" },
      { flag: "--help", meaning: "Show help" },
    ],
    example: "npm --version",
    category: "NPM/Node",
  },
  "npm install": {
    summary:
      "Installs packages from package.json or installs a specific package.",
    flags: [
      { flag: "--save-dev", meaning: "Add to devDependencies" },
      { flag: "--global", meaning: "Install globally" },
      {
        flag: "--legacy-peer-deps",
        meaning: "Ignore peer dependency conflicts",
      },
    ],
    example: "npm install react react-dom",
    category: "NPM/Node",
  },
  "npm run": {
    summary: "Runs a script defined in package.json.",
    flags: [],
    example: "npm run build",
    category: "NPM/Node",
  },
  npx: {
    summary: "Executes an npm package binary without installing it globally.",
    flags: [
      { flag: "--yes", meaning: "Skip prompt to install package" },
      { flag: "-p", meaning: "Specify package to install" },
    ],
    example: "npx create-react-app my-app",
    category: "NPM/Node",
  },
  node: {
    summary: "Runs JavaScript code with Node.js runtime.",
    flags: [
      { flag: "-e", meaning: "Execute inline script" },
      { flag: "--inspect", meaning: "Enable debugger" },
      { flag: "-v", meaning: "Show Node.js version" },
    ],
    example: "node -e 'console.log(process.version)'",
    category: "NPM/Node",
  },
  python: {
    summary: "Runs Python scripts or the interactive Python interpreter.",
    flags: [
      { flag: "-m", meaning: "Run library module as script (e.g. -m pytest)" },
      { flag: "-c", meaning: "Execute inline code" },
      { flag: "-v", meaning: "Verbose mode" },
    ],
    example: "python -m http.server 8080",
    category: "Python",
  },
  pip: {
    summary: "Python package installer for PyPI packages.",
    flags: [
      { flag: "install", meaning: "Install a package" },
      { flag: "uninstall", meaning: "Remove a package" },
      {
        flag: "freeze",
        meaning: "Output installed packages in requirements format",
      },
      { flag: "-r", meaning: "Install from requirements file" },
    ],
    example: "pip install -r requirements.txt",
    category: "Python",
  },
  cargo: {
    summary: "Rust package manager and build system.",
    flags: [
      { flag: "build", meaning: "Compile the project" },
      { flag: "run", meaning: "Build and run" },
      { flag: "test", meaning: "Run tests" },
      { flag: "new", meaning: "Create new project" },
    ],
    example: "cargo build --release",
    category: "System",
  },
  docker: {
    summary: "Manages containers, images, networks, and volumes.",
    flags: [
      { flag: "ps", meaning: "List running containers" },
      { flag: "images", meaning: "List images" },
      { flag: "run", meaning: "Create and start a container" },
      { flag: "build", meaning: "Build an image from a Dockerfile" },
    ],
    example: "docker ps -a",
    category: "Docker",
  },
  "docker build": {
    summary: "Builds a Docker image from a Dockerfile.",
    flags: [
      { flag: "-t", meaning: "Tag the image (name:tag)" },
      { flag: "-f", meaning: "Specify Dockerfile path" },
      { flag: "--no-cache", meaning: "Build without using cache" },
      { flag: "--platform", meaning: "Target platform (e.g. linux/amd64)" },
    ],
    example: "docker build -t my-app:latest .",
    category: "Docker",
  },
  "docker run": {
    summary: "Creates and starts a container from an image.",
    flags: [
      { flag: "-p", meaning: "Port mapping (host:container)" },
      { flag: "-d", meaning: "Run in detached (background) mode" },
      { flag: "-e", meaning: "Set environment variable" },
      { flag: "-v", meaning: "Mount a volume" },
      { flag: "--rm", meaning: "Remove container when it exits" },
      { flag: "--name", meaning: "Assign a name to the container" },
    ],
    example: "docker run -d -p 3000:3000 --name app my-app",
    category: "Docker",
  },
  "docker ps": {
    summary: "Lists running Docker containers.",
    flags: [
      { flag: "-a", meaning: "Show all containers (including stopped)" },
      { flag: "-q", meaning: "Only display container IDs" },
    ],
    example: "docker ps -a",
    category: "Docker",
  },
  "docker exec": {
    summary: "Runs a command inside a running container.",
    flags: [
      { flag: "-it", meaning: "Interactive terminal mode" },
      { flag: "-u", meaning: "Run as specified user" },
    ],
    example: "docker exec -it my-container /bin/bash",
    category: "Docker",
  },
  "docker-compose": {
    summary: "Defines and runs multi-container Docker applications.",
    flags: [
      { flag: "up", meaning: "Create and start containers" },
      { flag: "down", meaning: "Stop and remove containers" },
      { flag: "logs -f", meaning: "Follow logs" },
      { flag: "-d", meaning: "Detached mode" },
    ],
    example: "docker-compose up -d",
    category: "Docker",
  },
  kubectl: {
    summary: "Command-line tool for controlling Kubernetes clusters.",
    flags: [
      { flag: "get pods", meaning: "List pods" },
      { flag: "apply -f", meaning: "Apply configuration from file" },
      { flag: "logs", meaning: "Get logs from a pod" },
      { flag: "exec -it", meaning: "Interactive shell in a pod" },
    ],
    example: "kubectl get pods -n production",
    category: "System",
  },
  vim: {
    summary:
      "Powerful terminal text editor. Press 'i' to insert, ':wq' to save and quit.",
    flags: [
      { flag: "+N", meaning: "Open at line N" },
      { flag: "-R", meaning: "Read-only mode" },
    ],
    example: "vim ~/.bashrc",
    category: "Filesystem",
  },
  nano: {
    summary: "Simple terminal text editor. Use Ctrl+X to exit, Ctrl+S to save.",
    flags: [
      { flag: "+N", meaning: "Open at line N" },
      { flag: "-c", meaning: "Show cursor position constantly" },
    ],
    example: "nano .env",
    category: "Filesystem",
  },
  tmux: {
    summary:
      "Terminal multiplexer — run multiple terminal sessions in one window.",
    flags: [
      { flag: "new -s", meaning: "Create a named session" },
      { flag: "attach -t", meaning: "Attach to an existing session" },
      { flag: "ls", meaning: "List sessions" },
      { flag: "kill-session -t", meaning: "Kill a session" },
    ],
    example: "tmux new -s dev",
    category: "System",
  },
  screen: {
    summary: "Terminal multiplexer similar to tmux. Ctrl+A then D to detach.",
    flags: [
      { flag: "-S", meaning: "Name the session" },
      { flag: "-r", meaning: "Reattach to a detached session" },
      { flag: "-ls", meaning: "List sessions" },
    ],
    example: "screen -S server",
    category: "System",
  },
  cron: {
    summary: "Runs scheduled tasks on Unix-like systems.",
    flags: [],
    example: "# Use crontab -e to schedule tasks",
    category: "System",
  },
  crontab: {
    summary: "Manages cron job schedules for the current user.",
    flags: [
      { flag: "-e", meaning: "Edit crontab for current user" },
      { flag: "-l", meaning: "List current crontab entries" },
      { flag: "-r", meaning: "Remove crontab" },
    ],
    example: "crontab -e",
    category: "System",
  },
  pm2: {
    summary: "Production process manager for Node.js apps with auto-restart.",
    flags: [
      { flag: "start", meaning: "Start an application" },
      { flag: "stop", meaning: "Stop an application" },
      { flag: "restart", meaning: "Restart an application" },
      { flag: "status", meaning: "Show process list and status" },
      { flag: "logs", meaning: "Stream application logs" },
      { flag: "save", meaning: "Save process list to resurrect on restart" },
      { flag: "startup", meaning: "Generate startup script" },
    ],
    example: "pm2 start app.js --name my-app && pm2 save",
    category: "System",
  },
  nginx: {
    summary: "High-performance web server and reverse proxy.",
    flags: [
      { flag: "-t", meaning: "Test configuration file" },
      { flag: "-s reload", meaning: "Reload configuration without downtime" },
      { flag: "-s stop", meaning: "Stop nginx" },
    ],
    example: "nginx -t && nginx -s reload",
    category: "SSH/Network",
  },
};

export function explainCommand(input: string): CommandExplanation {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Try multi-word matches first (e.g. "git clone", "docker run")
  const multiWordKeys = Object.keys(CMD_DB).filter((k) => k.includes(" "));
  for (const key of multiWordKeys) {
    if (lower === key || lower.startsWith(`${key} `)) {
      return { command: key, ...CMD_DB[key] };
    }
  }

  // Single-word base command
  const base = lower.split(" ")[0];
  if (CMD_DB[base]) {
    return { command: base, ...CMD_DB[base] };
  }

  // Generic fallback
  return {
    command: trimmed || "unknown",
    summary: `No documentation found for "${trimmed}". Try running \`${trimmed} --help\` for usage information.`,
    flags: [],
    category: "Unknown",
  };
}

// ─── Cheatsheet ───────────────────────────────────────────────────────────────

export interface CheatsheetCategory {
  name: string;
  icon: string;
  commands: { cmd: string; desc: string }[];
}

export const CHEATSHEET: CheatsheetCategory[] = [
  {
    name: "Git",
    icon: "🌿",
    commands: [
      { cmd: "git init", desc: "Initialize a new repository" },
      { cmd: "git clone <url>", desc: "Clone remote repository" },
      { cmd: "git add .", desc: "Stage all changes" },
      { cmd: 'git commit -m "message"', desc: "Commit staged changes" },
      { cmd: "git push origin main", desc: "Push to remote main" },
      { cmd: "git pull --rebase", desc: "Pull and rebase local commits" },
      {
        cmd: "git stash && git pull && git stash pop",
        desc: "Stash, pull, restore",
      },
      { cmd: "git log --oneline --graph -20", desc: "Visual commit history" },
      { cmd: "git diff --staged", desc: "Show staged changes" },
      {
        cmd: "git reset --soft HEAD~1",
        desc: "Undo last commit, keep changes",
      },
    ],
  },
  {
    name: "Docker",
    icon: "🐳",
    commands: [
      { cmd: "docker ps -a", desc: "List all containers" },
      {
        cmd: "docker build -t app:latest .",
        desc: "Build image from Dockerfile",
      },
      {
        cmd: "docker run -d -p 3000:3000 app",
        desc: "Run container in background",
      },
      {
        cmd: "docker exec -it <id> /bin/bash",
        desc: "Shell into running container",
      },
      { cmd: "docker logs -f <id>", desc: "Follow container logs" },
      { cmd: "docker-compose up -d", desc: "Start all services detached" },
      { cmd: "docker-compose down", desc: "Stop and remove containers" },
      {
        cmd: "docker system prune -a",
        desc: "Remove unused images/containers",
      },
      { cmd: "docker images", desc: "List local images" },
    ],
  },
  {
    name: "NPM / Node",
    icon: "📦",
    commands: [
      { cmd: "npm install", desc: "Install all dependencies" },
      { cmd: "npm run dev", desc: "Start dev server" },
      { cmd: "npm run build", desc: "Build for production" },
      { cmd: "npm test", desc: "Run test suite" },
      { cmd: "npx create-react-app my-app", desc: "Create new React app" },
      { cmd: "npm outdated", desc: "Check for outdated packages" },
      { cmd: "npm audit fix", desc: "Fix security vulnerabilities" },
    ],
  },
  {
    name: "Python",
    icon: "🐍",
    commands: [
      { cmd: "python -m venv .venv", desc: "Create virtual environment" },
      { cmd: "source .venv/bin/activate", desc: "Activate virtual env (Unix)" },
      { cmd: "pip install -r requirements.txt", desc: "Install dependencies" },
      { cmd: "pip freeze > requirements.txt", desc: "Export dependencies" },
      { cmd: "python -m pytest", desc: "Run tests" },
      { cmd: "python -m http.server 8080", desc: "Serve current directory" },
    ],
  },
  {
    name: "Filesystem",
    icon: "📁",
    commands: [
      { cmd: "ls -lah", desc: "List files with details" },
      {
        cmd: "find . -name '*.ts' -not -path '*/node_modules/*'",
        desc: "Find TypeScript files",
      },
      { cmd: "du -sh ./node_modules", desc: "Check directory size" },
      { cmd: "tar czf backup.tar.gz ./src", desc: "Create compressed archive" },
      { cmd: "tar xzf archive.tar.gz", desc: "Extract archive" },
      {
        cmd: "rsync -avz ./dist/ user@host:/var/www/",
        desc: "Sync files to server",
      },
      { cmd: "chmod +x ./script.sh", desc: "Make file executable" },
      { cmd: "grep -rn 'TODO' ./src", desc: "Find TODOs in source" },
    ],
  },
  {
    name: "System",
    icon: "⚙️",
    commands: [
      { cmd: "ps aux | grep node", desc: "Find running Node processes" },
      { cmd: "kill -9 $(lsof -t -i:3000)", desc: "Kill process on port 3000" },
      { cmd: "df -h", desc: "Check disk usage" },
      { cmd: "free -h", desc: "Check memory usage" },
      { cmd: "htop", desc: "Interactive process monitor" },
      { cmd: "crontab -e", desc: "Edit scheduled jobs" },
      {
        cmd: "pm2 start app.js && pm2 save",
        desc: "Start and persist process",
      },
    ],
  },
  {
    name: "SSH / Network",
    icon: "🔐",
    commands: [
      {
        cmd: 'ssh-keygen -t ed25519 -C "you@example.com"',
        desc: "Generate SSH key",
      },
      { cmd: "cat ~/.ssh/id_ed25519.pub", desc: "Show public key to copy" },
      { cmd: "ssh-copy-id user@host", desc: "Copy key to remote server" },
      {
        cmd: "ssh -L 8080:localhost:80 user@host",
        desc: "Port forward via SSH",
      },
      {
        cmd: "curl -I https://example.com",
        desc: "Check HTTP response headers",
      },
      { cmd: "ping -c 4 8.8.8.8", desc: "Test network connectivity" },
    ],
  },
];
