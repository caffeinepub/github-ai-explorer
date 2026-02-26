import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Download, Terminal, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { checkHealth } from '../services/bridgeApi';
import { useBridgeStatus } from '../hooks/useBridgeStatus';

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg bg-[#0d1117] border border-white/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-black/20">
        <span className="text-[10px] font-mono text-white/30">{language}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] font-mono text-white/30 hover:text-white/70 transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-neon-green" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-white/70 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

const BASH_SCRIPT_URL = '/bridge/bridge-server.sh';
const PYTHON_SCRIPT_URL = '/bridge/bridge-server.py';

export default function BridgeSetupPage() {
  const { status, refresh } = useBridgeStatus();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const ok = await checkHealth();
    setTestResult(ok ? 'success' : 'fail');
    setTesting(false);
    refresh();
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-neon-green" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold text-foreground">Local Bridge Setup</h1>
            <p className="text-sm text-muted-foreground">
              Connect your browser terminal to your local machine
            </p>
          </div>
        </div>

        {/* Status banner */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-mono ${
            status === 'connected'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : status === 'connecting'
              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {status === 'connected' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : status === 'connecting' ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          Bridge is{' '}
          {status === 'connected'
            ? 'running and connected'
            : status === 'connecting'
            ? 'checking...'
            : 'not running'}
        </div>
      </div>

      {/* How it works */}
      <div className="mb-8 p-4 rounded-lg bg-card border border-border">
        <h2 className="text-sm font-mono font-semibold text-foreground mb-2">How it works</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The local bridge is a small HTTP server you run on your machine. It listens on{' '}
          <code className="text-neon-green bg-muted px-1 rounded text-xs">localhost:7681</code> and
          exposes endpoints that the web terminal uses to execute real shell commands, stream output,
          and browse your file system — all without sending your data to any external server.
        </p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { endpoint: '/health', desc: 'Connection check' },
            { endpoint: '/execute', desc: 'Run commands' },
            { endpoint: '/stream', desc: 'Stream output' },
            { endpoint: '/fs', desc: 'File browser' },
          ].map((e) => (
            <div key={e.endpoint} className="p-2 rounded bg-muted/50 border border-border">
              <code className="text-[11px] text-neon-green block">{e.endpoint}</code>
              <span className="text-[10px] text-muted-foreground">{e.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Platform tabs */}
      <Tabs defaultValue="mac">
        <TabsList className="bg-muted/50 border border-border mb-4">
          <TabsTrigger value="mac" className="font-mono text-xs">
            macOS
          </TabsTrigger>
          <TabsTrigger value="linux" className="font-mono text-xs">
            Linux
          </TabsTrigger>
          <TabsTrigger value="windows" className="font-mono text-xs">
            Windows
          </TabsTrigger>
          <TabsTrigger value="python" className="font-mono text-xs">
            Python (all)
          </TabsTrigger>
        </TabsList>

        {/* macOS */}
        <TabsContent value="mac" className="space-y-4">
          <h3 className="text-sm font-mono font-semibold text-foreground">macOS Setup (Bash)</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">1. Download the bridge script:</p>
              <CodeBlock code={`curl -o bridge-server.sh ${origin}${BASH_SCRIPT_URL}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">2. Make it executable:</p>
              <CodeBlock code="chmod +x bridge-server.sh" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">3. Run the bridge:</p>
              <CodeBlock code="./bridge-server.sh" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Or run on a custom port:</p>
              <CodeBlock code="PORT=7681 ./bridge-server.sh" />
            </div>
          </div>
          <a
            href={BASH_SCRIPT_URL}
            download
            className="inline-flex items-center gap-2 text-xs font-mono text-neon-green hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Download bridge-server.sh
          </a>
        </TabsContent>

        {/* Linux */}
        <TabsContent value="linux" className="space-y-4">
          <h3 className="text-sm font-mono font-semibold text-foreground">Linux Setup (Bash)</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">1. Download the bridge script:</p>
              <CodeBlock code={`wget -O bridge-server.sh ${origin}${BASH_SCRIPT_URL}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">2. Make it executable:</p>
              <CodeBlock code="chmod +x bridge-server.sh" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">3. Run the bridge:</p>
              <CodeBlock code="./bridge-server.sh" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                Run as a background service:
              </p>
              <CodeBlock code="nohup ./bridge-server.sh &" />
            </div>
          </div>
          <a
            href={BASH_SCRIPT_URL}
            download
            className="inline-flex items-center gap-2 text-xs font-mono text-neon-green hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Download bridge-server.sh
          </a>
        </TabsContent>

        {/* Windows */}
        <TabsContent value="windows" className="space-y-4">
          <h3 className="text-sm font-mono font-semibold text-foreground">
            Windows Setup (Python)
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                1. Ensure Python 3 is installed:
              </p>
              <CodeBlock code="python --version" language="powershell" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                2. Download the Python bridge script:
              </p>
              <CodeBlock
                code={`curl -o bridge-server.py ${origin}${PYTHON_SCRIPT_URL}`}
                language="powershell"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">3. Run the bridge:</p>
              <CodeBlock code="python bridge-server.py" language="powershell" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Custom port:</p>
              <CodeBlock
                code={`$env:PORT="7681"; python bridge-server.py`}
                language="powershell"
              />
            </div>
          </div>
          <a
            href={PYTHON_SCRIPT_URL}
            download
            className="inline-flex items-center gap-2 text-xs font-mono text-neon-green hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Download bridge-server.py
          </a>
        </TabsContent>

        {/* Python cross-platform */}
        <TabsContent value="python" className="space-y-4">
          <h3 className="text-sm font-mono font-semibold text-foreground">
            Cross-platform (Python 3)
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                1. Download the Python bridge:
              </p>
              <CodeBlock code={`curl -o bridge-server.py ${origin}${PYTHON_SCRIPT_URL}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">
                2. Run it (works on Mac, Linux, Windows):
              </p>
              <CodeBlock code="python3 bridge-server.py" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Custom port:</p>
              <CodeBlock code="PORT=7681 python3 bridge-server.py" />
            </div>
          </div>
          <a
            href={PYTHON_SCRIPT_URL}
            download
            className="inline-flex items-center gap-2 text-xs font-mono text-neon-green hover:underline"
          >
            <Download className="w-3.5 h-3.5" /> Download bridge-server.py
          </a>
        </TabsContent>
      </Tabs>

      {/* Test connection */}
      <div className="mt-8 p-4 rounded-lg bg-card border border-border">
        <h3 className="text-sm font-mono font-semibold text-foreground mb-3">Test Connection</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Once the bridge is running, click below to verify the connection from your browser.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={testConnection}
            disabled={testing}
            className="bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/30 text-neon-green font-mono text-xs"
          >
            {testing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Testing...
              </>
            ) : (
              <>
                <Terminal className="w-3.5 h-3.5 mr-2" /> Test Connection
              </>
            )}
          </Button>
          {testResult === 'success' && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-green-400">
              <CheckCircle className="w-4 h-4" /> Connected successfully!
            </span>
          )}
          {testResult === 'fail' && (
            <span className="flex items-center gap-1.5 text-xs font-mono text-red-400">
              <XCircle className="w-4 h-4" /> Connection failed. Is the bridge running?
            </span>
          )}
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
        <h3 className="text-sm font-mono font-semibold text-foreground mb-3">Troubleshooting</h3>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-neon-green shrink-0">▸</span>
            <span>
              <strong className="text-foreground">Port already in use:</strong> Run{' '}
              <code className="bg-muted px-1 rounded text-neon-green">
                PORT=7682 ./bridge-server.sh
              </code>{' '}
              to use a different port, then update the bridge URL in settings.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-neon-green shrink-0">▸</span>
            <span>
              <strong className="text-foreground">CORS errors:</strong> The bridge adds CORS headers
              automatically. If you see CORS errors, ensure you're accessing the app over{' '}
              <code className="bg-muted px-1 rounded text-neon-green">http://</code> or{' '}
              <code className="bg-muted px-1 rounded text-neon-green">https://</code>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-neon-green shrink-0">▸</span>
            <span>
              <strong className="text-foreground">Permission denied (macOS/Linux):</strong> Run{' '}
              <code className="bg-muted px-1 rounded text-neon-green">chmod +x bridge-server.sh</code>{' '}
              before executing.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-neon-green shrink-0">▸</span>
            <span>
              <strong className="text-foreground">Python not found (Windows):</strong> Install Python
              3 from{' '}
              <a
                href="https://python.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-green hover:underline"
              >
                python.org
              </a>{' '}
              and ensure it's added to your PATH.
            </span>
          </li>
        </ul>
      </div>

      {/* Bridge script previews */}
      <div className="mt-6 space-y-4">
        <h3 className="text-sm font-mono font-semibold text-foreground">
          Bridge Server Scripts
        </h3>
        <p className="text-xs text-muted-foreground">
          The bridge scripts are open and auditable. Download them to inspect before running.
        </p>
        <div className="flex gap-3 flex-wrap">
          <a
            href={BASH_SCRIPT_URL}
            download
            className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-card hover:bg-muted/50 text-xs font-mono text-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-neon-green" />
            bridge-server.sh
            <span className="text-muted-foreground">(Bash)</span>
          </a>
          <a
            href={PYTHON_SCRIPT_URL}
            download
            className="flex items-center gap-2 px-3 py-2 rounded border border-border bg-card hover:bg-muted/50 text-xs font-mono text-foreground transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-neon-green" />
            bridge-server.py
            <span className="text-muted-foreground">(Python)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
