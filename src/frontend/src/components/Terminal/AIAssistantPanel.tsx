import { Button } from "@/components/ui/button";
import {
  Bot,
  Play,
  Send,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  X,
  Zap,
} from "lucide-react";
import React, { useState, useRef } from "react";
import { useAICommandSuggestion } from "../../hooks/useAICommandSuggestion";
import { useAIErrorAnalysis } from "../../hooks/useAIErrorAnalysis";
import type { RepoContext } from "../../hooks/useRepoContext";
import type { CommandSuggestion } from "../../utils/aiCommandRules";
import {
  getContextAwareSuggestions,
  getProactiveSuggestions,
} from "../../utils/aiCommandRules";
import { AIContextBanner } from "./AIContextBanner";

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCommand: (command: string) => void;
  lastFailedCommand?: {
    command: string;
    stderr: string;
    exitCode: number;
  } | null;
  commandHistory: string[];
  repoContext?: RepoContext | null;
  onUnpinRepo?: () => void;
}

export function AIAssistantPanel({
  isOpen,
  onClose,
  onRunCommand,
  lastFailedCommand,
  commandHistory,
  repoContext,
  onUnpinRepo,
}: AIAssistantPanelProps) {
  const [mode, setMode] = useState<"conversational" | "command">(
    "conversational",
  );
  const [input, setInput] = useState("");
  const [autoRun, setAutoRun] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "ai"; text: string; commands?: CommandSuggestion[] }[]
  >([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { suggestions, isThinking, suggest, clear } = useAICommandSuggestion();
  const { fixes, hasError, analyze, dismiss } = useAIErrorAnalysis();

  // Analyze last failed command
  React.useEffect(() => {
    if (lastFailedCommand) {
      analyze(
        lastFailedCommand.command,
        lastFailedCommand.stderr,
        lastFailedCommand.exitCode,
      );
    }
  }, [lastFailedCommand, analyze]);

  const proactiveSuggestions = getProactiveSuggestions(commandHistory).slice(
    0,
    3,
  );

  const handleSubmit = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    clear();

    const cmds = suggestions.length > 0 ? [...suggestions] : [];
    setChatHistory((prev) => [
      ...prev,
      { role: "user", text: userMsg },
      {
        role: "ai",
        text:
          cmds.length > 0
            ? `I found ${cmds.length} command(s) for "${userMsg}":`
            : `I couldn't find specific commands for "${userMsg}". Try describing a more specific task like "clone a repo", "install dependencies", or "run tests".`,
        commands: cmds,
      },
    ]);

    if (autoRun && cmds.length > 0) {
      onRunCommand(cmds[0].command);
    }
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.trim()) {
      if (repoContext) {
        // Use context-aware suggestions
        const contextSuggestions = getContextAwareSuggestions(
          val,
          repoContext.language,
          repoContext.topics,
        );
        // Feed through existing suggest pipeline by calling suggest,
        // but also augment via a local state override
        suggest(val);
        // The context suggestions will be merged when rendering
        void contextSuggestions; // used in render below
      } else {
        suggest(val);
      }
    } else {
      clear();
    }
  };

  // Compute final suggestions to display
  const displaySuggestions =
    input.trim() && repoContext
      ? getContextAwareSuggestions(
          input,
          repoContext.language,
          repoContext.topics,
        ).slice(0, 3)
      : suggestions.slice(0, 3);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-l border-white/10 w-80 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-neon-green" />
          <span className="text-xs font-mono font-semibold text-white/80">
            AI Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() =>
              setMode(mode === "conversational" ? "command" : "conversational")
            }
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
          >
            {mode === "conversational" ? "Chat" : "Cmd"}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/40 hover:text-white"
            onClick={onClose}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Repo Context Banner */}
      <div data-ocid="ai.context_banner.section">
        <AIContextBanner
          repoContext={repoContext ?? null}
          onUnpin={onUnpinRepo ?? (() => {})}
        />
      </div>

      {/* Auto-run toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-black/10">
        <span className="text-[10px] font-mono text-white/40">
          Auto-run suggestions
        </span>
        <button
          type="button"
          onClick={() => setAutoRun(!autoRun)}
          className={`flex items-center gap-1 text-[10px] font-mono transition-colors ${
            autoRun ? "text-neon-green" : "text-white/30"
          }`}
        >
          {autoRun ? (
            <ToggleRight className="w-4 h-4" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          {autoRun ? "ON" : "OFF"}
        </button>
      </div>

      {/* Proactive suggestions */}
      {proactiveSuggestions.length > 0 && (
        <div
          data-ocid="ai.proactive_suggestions.panel"
          className="mx-2 mt-2 p-2 rounded border border-neon-green/20 bg-neon-green/5"
        >
          <div className="flex items-center gap-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-neon-green" />
            <span className="text-[10px] font-mono text-neon-green/80">
              Next steps
            </span>
          </div>
          {proactiveSuggestions.map((s, i) => (
            <div
              key={s.command}
              data-ocid={`ai.proactive.item.${i + 1}`}
              className="flex items-center gap-1 mt-1"
            >
              <code className="flex-1 text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-neon-green/70 truncate">
                {s.command}
              </code>
              <button
                type="button"
                onClick={() => onRunCommand(s.command)}
                className="shrink-0 p-1 rounded hover:bg-white/10 text-neon-green"
                title="Run"
              >
                <Play className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error fixes */}
      {hasError && fixes.length > 0 && (
        <div className="mx-2 mt-2 p-2 rounded border border-red-500/30 bg-red-500/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-red-400 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Command failed — suggested fixes:
            </span>
            <button
              type="button"
              onClick={dismiss}
              className="text-white/30 hover:text-white/60"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {fixes.map((fix) => (
            <div key={fix.command} className="flex items-center gap-1 mt-1">
              <code className="flex-1 text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-yellow-300 truncate">
                {fix.command}
              </code>
              <button
                type="button"
                onClick={() => onRunCommand(fix.command)}
                className="shrink-0 p-1 rounded hover:bg-white/10 text-neon-green"
                title="Run"
              >
                <Play className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs font-mono">
        {chatHistory.length === 0 && (
          <div className="text-white/25 text-center mt-8 px-4">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Describe what you want to do in plain English.</p>
            <p className="mt-1 text-[10px]">
              e.g. "clone a repo", "install dependencies", "run tests"
            </p>
          </div>
        )}
        {chatHistory.map((msg) => (
          <div
            key={`${msg.role}-${msg.text.slice(0, 20)}`}
            className={`${msg.role === "user" ? "text-right" : "text-left"}`}
          >
            <div
              className={`inline-block max-w-full px-2 py-1.5 rounded text-[11px] ${
                msg.role === "user"
                  ? "bg-neon-green/10 text-neon-green border border-neon-green/20"
                  : "bg-white/5 text-white/70 border border-white/10"
              }`}
            >
              {msg.text}
            </div>
            {msg.commands && msg.commands.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {msg.commands.map((cmd) => (
                  <div
                    key={cmd.command}
                    className="flex items-center gap-1 bg-black/30 rounded border border-white/10 px-2 py-1"
                  >
                    <code className="flex-1 text-[10px] text-yellow-300 truncate">
                      {cmd.command}
                    </code>
                    <span className="text-[9px] text-white/30 shrink-0">
                      {Math.round(cmd.confidence * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => onRunCommand(cmd.command)}
                      className="shrink-0 p-0.5 rounded hover:bg-white/10 text-neon-green"
                      title="Run command"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-white/10">
        <div className="flex gap-1">
          <textarea
            ref={inputRef}
            data-ocid="ai.chat_input.textarea"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={
              mode === "conversational"
                ? "Describe what you want..."
                : "Type a command..."
            }
            rows={2}
            className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-white/80 placeholder-white/20 resize-none outline-none focus:border-neon-green/40"
          />
          <Button
            size="icon"
            data-ocid="ai.send.button"
            onClick={handleSubmit}
            disabled={!input.trim() || isThinking}
            className="h-auto w-8 bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/30 text-neon-green shrink-0"
          >
            {isThinking ? (
              <span className="w-3 h-3 border border-neon-green border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
        {displaySuggestions.length > 0 && input.trim() && (
          <div className="mt-1.5 space-y-0.5">
            {displaySuggestions.map((s) => (
              <button
                type="button"
                key={s.command}
                onClick={() => onRunCommand(s.command)}
                className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 text-[10px] font-mono text-white/50 hover:text-white/80 transition-colors"
              >
                <Play className="w-2.5 h-2.5 text-neon-green shrink-0" />
                <code className="truncate text-yellow-300/70">{s.command}</code>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
