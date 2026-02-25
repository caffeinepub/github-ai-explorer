import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download } from 'lucide-react';

interface CodeBlockProps {
  content: string;
  language?: string;
  filename?: string;
  className?: string;
}

export function CodeBlock({ content, language = 'bash', filename, className = '' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `file.${language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`rounded-lg border border-border/50 overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border/50">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-xs font-mono text-muted-foreground">{filename}</span>
          )}
          {language && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
              {language}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 text-xs gap-1">
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          {filename && (
            <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 px-2 text-xs gap-1">
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>
          )}
        </div>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed bg-background/50 max-h-80">
        <code>{content}</code>
      </pre>
    </div>
  );
}
