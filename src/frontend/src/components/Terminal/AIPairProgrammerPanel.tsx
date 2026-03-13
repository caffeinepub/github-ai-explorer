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
    /clone(?:\s+and\s+setup)?\s+(?:https?:\/\/github\.com\/)?([\w.-]+\/[\w.-]+)/i,
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

  if (/run\s+test|test\s+suite|jest|pytest|cargo\s+test/.test(q)) {
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
        'Try being more specific, e.g. _"create a React component called Header"_, _"dockerfile for Node app"_, or _"run tests with Jest"_.',
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
                <p>· "install dependencies"</p>
                <p>· "run tests"</p>
                <p>· "github actions ci/cd"</p>
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
