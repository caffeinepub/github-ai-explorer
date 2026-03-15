import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Code2, Copy, Play, Send, Sparkles, X } from "lucide-react";
import React, { useRef, useState } from "react";
import type { RepoContext } from "../../hooks/useRepoContext";

export interface AIPairProgrammerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCommand: (command: string) => void;
  repoContext?: RepoContext | null;
}

interface MessageBlock {
  kind: "text" | "code";
  content: string;
  language?: string;
}

interface ChatMessage {
  role: "user" | "ai";
  blocks: MessageBlock[];
  id: string;
}

function detectLanguage(code: string): string {
  if (/^FROM\s+/m.test(code)) return "dockerfile";
  if (/^version:\s+['"]?\d/m.test(code)) return "yaml";
  if (/import\s+React/i.test(code)) return "tsx";
  if (/def\s+\w+\(/.test(code)) return "python";
  return "bash";
}

function generateResponse(
  input: string,
  repoContext?: RepoContext | null,
): MessageBlock[] {
  const q = input.toLowerCase();
  const lang = repoContext?.language?.toLowerCase() ?? "";
  const topics = repoContext?.topics ?? [];

  const cloneMatch = q.match(
    /clone(?:\s+and\s+setup)?\s+(?:https?:\/\/github\.com\/)?(\w[\w.-]+\/[\w.-]+)/i,
  );
  if (cloneMatch) {
    const repo = cloneMatch[1];
    const pkgMgr =
      lang === "rust"
        ? "cargo build"
        : lang === "python"
          ? "pip install -r requirements.txt"
          : "npm install";
    return [
      { kind: "text", content: `Here's how to clone and set up **${repo}**:` },
      {
        kind: "code",
        language: "bash",
        content: `git clone https://github.com/${repo}\ncd ${repo.split("/")[1]}\n${pkgMgr}`,
      },
    ];
  }

  if (/clone/.test(q) && repoContext) {
    return [
      {
        kind: "text",
        content: `Clone your pinned repo **${repoContext.fullName}**:`,
      },
      {
        kind: "code",
        language: "bash",
        content: `git clone https://github.com/${repoContext.fullName}\ncd ${repoContext.fullName.split("/")[1]}`,
      },
    ];
  }

  if (/react\s+component|create.*component|new.*component/.test(q)) {
    const compMatch = q.match(/component\s+(?:called\s+)?([\w]+)/i);
    const name = compMatch
      ? compMatch[1].replace(/^./, (c) => c.toUpperCase())
      : "MyComponent";
    return [
      {
        kind: "text",
        content: `Here's a React functional component template for **${name}**:`,
      },
      {
        kind: "code",
        language: "tsx",
        content: `import React from 'react';

interface ${name}Props {
  // Add your props here
}

export function ${name}({ }: ${name}Props) {
  return (
    <div className="">
      <h1>${name}</h1>
    </div>
  );
}
`,
      },
    ];
  }

  if (/dockerfile|docker.*for.*node|containerize/.test(q)) {
    const isNode =
      lang === "javascript" ||
      lang === "typescript" ||
      topics.includes("nodejs");
    const isPython = lang === "python";
    const dockerContent = isNode
      ? `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nRUN npm run build\nEXPOSE 3000\nCMD ["node", "dist/index.js"]`
      : isPython
        ? `FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nEXPOSE 8000\nCMD ["python", "main.py"]`
        : `FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN npm ci\nEXPOSE 3000\nCMD ["npm", "start"]`;
    return [
      {
        kind: "text",
        content: `Here's a production-ready **Dockerfile**${repoContext ? ` for ${repoContext.name}` : ""}:`,
      },
      { kind: "code", language: "dockerfile", content: dockerContent },
      { kind: "text", content: "Build and run with:" },
      {
        kind: "code",
        language: "bash",
        content: "docker build -t my-app .\ndocker run -p 3000:3000 my-app",
      },
    ];
  }

  if (/docker.?compose|compose\.yml/.test(q)) {
    return [
      { kind: "text", content: "Here's a basic **docker-compose.yml**:" },
      {
        kind: "code",
        language: "yaml",
        content:
          "version: '3.9'\nservices:\n  app:\n    build: .\n    ports:\n      - '3000:3000'\n    environment:\n      - NODE_ENV=production\n    restart: unless-stopped",
      },
    ];
  }

  if (/install\s*(dep|pack|lib|node_mod|requirement)?/.test(q)) {
    const cmds =
      lang === "python"
        ? [
            "pip install -r requirements.txt",
            "# or with poetry:",
            "poetry install",
          ]
        : lang === "rust"
          ? ["cargo build"]
          : [
              "npm install",
              "# or with yarn:",
              "yarn",
              "# or with pnpm:",
              "pnpm install",
            ];
    return [
      { kind: "text", content: "Install dependencies:" },
      { kind: "code", language: "bash", content: cmds.join("\n") },
    ];
  }

  if (/run\s+test|test\s+suite|cargo\s+test/.test(q)) {
    const testCmd =
      lang === "python"
        ? "pytest"
        : lang === "rust"
          ? "cargo test"
          : "npm test";
    return [
      { kind: "text", content: "Run your test suite:" },
      { kind: "code", language: "bash", content: testCmd },
    ];
  }

  if (/commit|push\s+to|git\s+push/.test(q)) {
    return [
      { kind: "text", content: "Stage, commit, and push changes:" },
      {
        kind: "code",
        language: "bash",
        content: `git add .\ngit commit -m "feat: your message here"\ngit push origin main`,
      },
    ];
  }

  if (/new\s+branch|create\s+branch/.test(q)) {
    const branchName =
      q.match(/branch\s+(?:called\s+)?([\w-]+)/)?.[1] ?? "feature/my-feature";
    return [
      { kind: "text", content: "Create and switch to a new branch:" },
      {
        kind: "code",
        language: "bash",
        content: `git checkout -b ${branchName}`,
      },
    ];
  }

  if (/\.env|environment\s+var|env\s+file/.test(q)) {
    return [
      {
        kind: "text",
        content: "Create an **.env** file from a template and load it:",
      },
      {
        kind: "code",
        language: "bash",
        content: "cp .env.example .env\n# Then edit your values:\nnano .env",
      },
    ];
  }

  if (/start|dev\s+server|run\s+dev|serve/.test(q)) {
    const startCmd =
      lang === "python"
        ? "python main.py"
        : lang === "rust"
          ? "cargo run"
          : "npm run dev";
    return [
      { kind: "text", content: "Start the development server:" },
      { kind: "code", language: "bash", content: startCmd },
    ];
  }

  if (/build|compile/.test(q)) {
    const buildCmd =
      lang === "rust"
        ? "cargo build --release"
        : lang === "python"
          ? "python setup.py build"
          : "npm run build";
    return [
      { kind: "text", content: "Build the project:" },
      { kind: "code", language: "bash", content: buildCmd },
    ];
  }

  if (/github\s+action|ci\/cd|workflow\s+yaml/.test(q)) {
    return [
      {
        kind: "text",
        content: "Here's a basic **GitHub Actions CI** workflow:",
      },
      {
        kind: "code",
        language: "yaml",
        content:
          "name: CI\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n      - run: npm ci\n      - run: npm test",
      },
    ];
  }

  // ── 15 New Patterns ──────────────────────────────────────────────────────────

  if (
    /express.*route|rest.*api.*express|api.*route|express.*endpoint/.test(q)
  ) {
    return [
      {
        kind: "text",
        content: "Here's a complete **Express REST API router**:",
      },
      {
        kind: "code",
        language: "typescript",
        content: `import express, { Request, Response, Router } from 'express';

const router: Router = express.Router();

// GET all items
router.get('/', async (req: Request, res: Response) => {
  try {
    const items: unknown[] = []; // replace with DB query
    res.json({ data: items });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET by ID
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ data: { id } });
});

// POST create
router.post('/', async (req: Request, res: Response) => {
  const body = req.body;
  res.status(201).json({ data: body });
});

// PUT update
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ data: { id, ...req.body } });
});

// DELETE
router.delete('/:id', async (_req: Request, res: Response) => {
  res.status(204).send();
});

export default router;`,
      },
    ];
  }

  if (/fastapi.*route|python.*api|rest.*api.*python/.test(q)) {
    return [
      {
        kind: "text",
        content: "Here's a **FastAPI router** with CRUD endpoints:",
      },
      {
        kind: "code",
        language: "python",
        content: `from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/items", tags=["items"])

class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None

items_db: List[Item] = []

@router.get("/", response_model=List[Item])
async def list_items():
    return items_db

@router.get("/{item_id}", response_model=Item)
async def get_item(item_id: int):
    item = next((i for i in items_db if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.post("/", response_model=Item, status_code=201)
async def create_item(item: Item):
    item.id = len(items_db) + 1
    items_db.append(item)
    return item

@router.put("/{item_id}", response_model=Item)
async def update_item(item_id: int, updated: Item):
    for i, item in enumerate(items_db):
        if item.id == item_id:
            items_db[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Item not found")

@router.delete("/{item_id}", status_code=204)
async def delete_item(item_id: int):
    global items_db
    items_db = [i for i in items_db if i.id != item_id]`,
      },
    ];
  }

  if (/ssh.*key|generate.*ssh|ssh-keygen/.test(q)) {
    return [
      {
        kind: "text",
        content: "Generate an **SSH key pair** and add it to your agent:",
      },
      {
        kind: "code",
        language: "bash",
        content: `# Generate ED25519 key (recommended)
ssh-keygen -t ed25519 -C "your@email.com"

# Add to SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# Copy public key (macOS)
pbcopy < ~/.ssh/id_ed25519.pub

# Copy public key (Linux)
xclip -sel clip < ~/.ssh/id_ed25519.pub

# Or print it to add to GitHub
cat ~/.ssh/id_ed25519.pub`,
      },
    ];
  }

  if (/ssh.*config|\.ssh\/config/.test(q)) {
    return [
      {
        kind: "text",
        content: "Create a **~/.ssh/config** file for easy SSH aliases:",
      },
      {
        kind: "code",
        language: "bash",
        content: "nano ~/.ssh/config",
      },
      { kind: "text", content: "Add entries like this:" },
      {
        kind: "code",
        language: "bash",
        content: `Host myserver
  HostName 192.168.1.100
  User ubuntu
  IdentityFile ~/.ssh/id_ed25519
  Port 22

Host github
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github`,
      },
    ];
  }

  if (/nginx|reverse.*proxy|nginx.*config/.test(q)) {
    return [
      {
        kind: "text",
        content: "Here's an **nginx reverse proxy** server block:",
      },
      {
        kind: "code",
        language: "bash",
        content: `server {
    listen 80;
    server_name example.com www.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}`,
      },
      {
        kind: "code",
        language: "bash",
        content: `# Enable and reload
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx`,
      },
    ];
  }

  if (/tmux|terminal.*multiplexer|tmux.*session/.test(q)) {
    return [
      { kind: "text", content: "Set up a **tmux** development session:" },
      {
        kind: "code",
        language: "bash",
        content: `# Create named session
tmux new-session -d -s dev

# Split panes
tmux split-window -h -t dev
tmux split-window -v -t dev:0.0

# Send commands to panes
tmux send-keys -t dev:0.0 'npm run dev' Enter
tmux send-keys -t dev:0.1 'git log --oneline' Enter

# Attach
tmux attach -t dev

# Shortcuts: Ctrl+B then D=detach, %=split-v, "=split-h`,
      },
    ];
  }

  if (
    /jest.*test|write.*test.*jest|test.*file.*jest|unit.*test.*react/.test(q)
  ) {
    return [
      {
        kind: "text",
        content: "Here's a **Jest + Testing Library** component test:",
      },
      {
        kind: "code",
        language: "tsx",
        content: `import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders without crashing', () => {
    render(<MyComponent />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('displays the title', () => {
    render(<MyComponent title="Hello World" />);
    expect(screen.getByText('Hello World')).toBeVisible();
  });

  it('calls onClick when button is clicked', async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});`,
      },
    ];
  }

  if (/pytest.*test|python.*test|write.*test.*python/.test(q)) {
    return [
      { kind: "text", content: "Here's a **pytest** test file with fixtures:" },
      {
        kind: "code",
        language: "python",
        content: `import pytest
from mymodule import MyClass, calculate

@pytest.fixture
def client():
    instance = MyClass(debug=True)
    yield instance
    instance.cleanup()

@pytest.fixture
def sample_data():
    return {"name": "test", "value": 42}

class TestCalculate:
    def test_add(self):
        assert calculate(2, 3) == 5

    def test_negative(self):
        assert calculate(-1, 1) == 0

class TestMyClass:
    def test_create(self, client):
        assert client is not None

    def test_process(self, client, sample_data):
        result = client.process(sample_data)
        assert result["status"] == "ok"

    @pytest.mark.parametrize("value,expected", [
        (1, "one"), (2, "two"), (3, "three")
    ])
    def test_convert(self, client, value, expected):
        assert client.convert(value) == expected`,
      },
    ];
  }

  if (/ci.*github|github.*actions.*ci|github.*workflow/.test(q)) {
    return [
      { kind: "text", content: "Here's a **GitHub Actions CI/CD** workflow:" },
      {
        kind: "code",
        language: "yaml",
        content: `name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci && npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/`,
      },
    ];
  }

  if (/kill.*port|free.*port|port.*in.*use|stop.*port/.test(q)) {
    const portMatch = q.match(/port\s+(\d+)/);
    const port = portMatch ? portMatch[1] : "3000";
    return [
      {
        kind: "text",
        content: `Kill whatever process is using **port ${port}**:`,
      },
      {
        kind: "code",
        language: "bash",
        content: `# Find what's using the port
lsof -i :${port}

# Kill it (macOS / Linux)
kill -9 $(lsof -t -i:${port})

# Alternative with fuser (Linux)
fuser -k ${port}/tcp`,
      },
    ];
  }

  if (/pm2|process.*manager|keep.*running.*background/.test(q)) {
    return [
      {
        kind: "text",
        content: "Manage your app with **PM2** process manager:",
      },
      {
        kind: "code",
        language: "bash",
        content: `# Install PM2 globally
npm install -g pm2

# Start your app
pm2 start app.js --name my-app

# View status
pm2 status

# View logs
pm2 logs my-app

# Save process list so it survives reboots
pm2 save

# Generate startup script
pm2 startup`,
      },
    ];
  }

  if (/cron|crontab|schedule.*task|scheduled.*job/.test(q)) {
    return [
      { kind: "text", content: "Schedule tasks with **crontab**:" },
      {
        kind: "code",
        language: "bash",
        content: `# Edit your crontab
crontab -e`,
      },
      {
        kind: "code",
        language: "bash",
        content: `# Format: min hour dom month dow command
# Every day at 2am
0 2 * * * /home/user/backup.sh

# Every 5 minutes
*/5 * * * * /usr/bin/node /home/user/check.js

# Every Monday at 9am
0 9 * * 1 /home/user/weekly-report.sh

# List current jobs
crontab -l`,
      },
    ];
  }

  if (/curl.*api|test.*api.*curl|http.*request.*curl/.test(q)) {
    return [
      { kind: "text", content: "Test APIs with **curl**:" },
      {
        kind: "code",
        language: "bash",
        content: `# GET request
curl -s https://api.example.com/users | jq .

# POST with JSON body
curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"name":"Alice","email":"alice@example.com"}'

# PUT update
curl -X PUT https://api.example.com/users/1 \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Alice Smith"}'

# DELETE
curl -X DELETE https://api.example.com/users/1 \\
  -H "Authorization: Bearer $TOKEN"

# Show headers + follow redirects
curl -LI https://api.example.com`,
      },
    ];
  }

  if (/rsync|sync.*files|sync.*folder|deploy.*files/.test(q)) {
    return [
      { kind: "text", content: "Sync files efficiently with **rsync**:" },
      {
        kind: "code",
        language: "bash",
        content: `# Sync to remote server
rsync -avz ./dist/ user@server:/var/www/app/

# Dry run first (preview changes)
rsync -avz --dry-run ./dist/ user@server:/var/www/app/

# Delete files on dest not in source
rsync -avz --delete ./dist/ user@server:/var/www/app/

# Exclude patterns
rsync -avz --exclude='*.log' --exclude='node_modules' ./ user@server:~/app/

# Flags: -a=archive, -v=verbose, -z=compress`,
      },
    ];
  }

  if (/tar.*archive|compress.*files|zip.*folder|archive.*directory/.test(q)) {
    return [
      { kind: "text", content: "Create and extract **tar archives**:" },
      {
        kind: "code",
        language: "bash",
        content: `# Create compressed archive (.tar.gz)
tar czf archive.tar.gz ./src

# List contents without extracting
tar tzf archive.tar.gz

# Extract to current directory
tar xzf archive.tar.gz

# Extract to specific directory
tar xzf archive.tar.gz -C /tmp/extracted/

# Flags: c=create, x=extract, t=list, z=gzip, f=filename, v=verbose`,
      },
    ];
  }

  // Fallback
  const keywords = input.trim().split(/\s+/).slice(0, 4).join(" ");
  const guessCode = repoContext
    ? `# Working with ${repoContext.fullName}\necho "${keywords}"\n# Add your commands here`
    : `echo "${keywords}"\n# Add your commands here`;
  return [
    {
      kind: "text",
      content: `I'm not sure exactly what you need for "**${keywords}**". Here's a starting point:`,
    },
    { kind: "code", language: detectLanguage(guessCode), content: guessCode },
    {
      kind: "text",
      content:
        'Try being more specific, e.g. _"create a React component called Header"_, _"dockerfile for Node app"_, or _"express REST API route"_.',
    },
  ];
}

function InlineCodeBlock({
  code,
  language,
  onRunCommand,
}: { code: string; language?: string; onRunCommand: (cmd: string) => void }) {
  const [copied, setCopied] = useState(false);
  const isRunnable = language === "bash" || language === "sh";

  const copy = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const runFirst = () => {
    const firstLine = code
      .split("\n")
      .find((l) => l.trim() && !l.trim().startsWith("#"));
    if (firstLine) onRunCommand(firstLine.trim());
  };

  return (
    <div className="mt-1.5 bg-black/40 border border-white/10 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/5 bg-white/[0.02]">
        <span className="text-[10px] font-mono text-white/30">
          {language ?? "code"}
        </span>
        <div className="flex items-center gap-0.5">
          {isRunnable && (
            <button
              type="button"
              onClick={runFirst}
              className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-[#4ade80]/10 text-[#4ade80]/60 hover:text-[#4ade80] transition-colors"
              title="Run first line in terminal"
            >
              <Play className="w-2.5 h-2.5" />
              Run
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
          >
            {copied ? (
              <Check className="w-2.5 h-2.5 text-[#4ade80]" />
            ) : (
              <Copy className="w-2.5 h-2.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <pre className="px-3 py-2.5 text-[11px] font-mono text-yellow-200/80 overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

export function AIPairProgrammerPanel({
  isOpen,
  onClose,
  onRunCommand,
  repoContext,
}: AIPairProgrammerPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    const msgId = Math.random().toString(36).slice(2);
    setInput("");
    const aiBlocks = generateResponse(userText, repoContext);
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${msgId}`,
        role: "user",
        blocks: [{ kind: "text", content: userText }],
      },
      { id: `ai-${msgId}`, role: "ai", blocks: aiBlocks },
    ]);
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 50);
  };

  if (!isOpen) return null;

  return (
    <div
      data-ocid="pair.panel"
      className="flex flex-col h-full bg-[#0d1117] border-l border-white/10 w-80 shrink-0"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-mono font-semibold text-white/80">
            Pair Programmer
          </span>
          {repoContext && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400/70 border border-blue-400/20">
              {repoContext.name}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-white/40 hover:text-white"
          onClick={onClose}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3 space-y-3 text-xs font-mono">
          {messages.length === 0 && (
            <div className="text-white/20 text-center mt-10 px-4">
              <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-[11px] leading-relaxed">
                Describe what you want to build or do.
              </p>
              <div className="mt-3 space-y-1 text-[10px] text-white/15 text-left">
                <p>· "clone and setup facebook/react"</p>
                <p>· "create a react component called Header"</p>
                <p>· "dockerfile for node app"</p>
                <p>· "express REST API route"</p>
                <p>· "kill port 3000"</p>
                <p>· "setup tmux session"</p>
                <p>· "github actions ci/cd"</p>
                <p>· "write jest test"</p>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.role === "user" ? "text-right" : "text-left"}
            >
              {msg.blocks.map((block, bi) => {
                if (block.kind === "code") {
                  return (
                    <InlineCodeBlock
                      key={`${msg.id}-b${bi}`}
                      code={block.content}
                      language={block.language}
                      onRunCommand={onRunCommand}
                    />
                  );
                }
                return (
                  <div
                    key={`${msg.id}-b${bi}`}
                    className={`inline-block max-w-full px-2.5 py-1.5 rounded text-[11px] mt-1 ${msg.role === "user" ? "bg-blue-400/10 text-blue-200 border border-blue-400/20" : "bg-white/5 text-white/70 border border-white/10"}`}
                    // biome-ignore lint/security/noDangerouslySetInnerHtml: safe markdown-like content
                    dangerouslySetInnerHTML={{
                      __html: block.content
                        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\_(.+?)\_/g, "<em>$1</em>"),
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-2.5 border-t border-white/10">
        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            data-ocid="pair.input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Describe what you want to build..."
            rows={2}
            className="flex-1 bg-black/30 border border-white/10 rounded px-2.5 py-1.5 text-[11px] font-mono text-white/80 placeholder-white/20 resize-none outline-none focus:border-blue-400/40"
          />
          <Button
            size="icon"
            data-ocid="pair.submit.button"
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="h-auto w-8 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/30 text-blue-400 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
