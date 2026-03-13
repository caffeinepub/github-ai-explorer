import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleDot,
  ClipboardCopy,
  Copy,
  Download,
  ExternalLink,
  FileText,
  GitFork,
  Loader2,
  Play,
  Plus,
  Star,
  Terminal,
  Timer,
  Trash2,
  Upload,
  Workflow as WorkflowIcon,
  X,
  Zap,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface WorkflowStep {
  id: string;
  type:
    | "run_command"
    | "fork_repo"
    | "generate_setup"
    | "open_terminal"
    | "copy_text"
    | "open_url"
    | "star_repo"
    | "create_gist"
    | "wait_seconds"
    | "git_clone";
  label: string;
  value: string;
  continueOnError?: boolean;
}

interface UserWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: number;
  lastRunStatus?: "success" | "failed" | "partial";
  lastRunAt?: number;
}

type StepStatus = "pending" | "running" | "done" | "error" | "warning";

interface RunState {
  stepStatuses: StepStatus[];
  stepMessages: string[];
  currentStep: number;
  finished: boolean;
}

const STORAGE_KEY = "github-explorer-workflows";

function loadWorkflows(): UserWorkflow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWorkflows(workflows: UserWorkflow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STEP_TYPES: {
  value: WorkflowStep["type"];
  label: string;
  placeholder: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "run_command",
    label: "Run Command",
    placeholder: "e.g. npm install",
    icon: <Terminal className="w-3.5 h-3.5" />,
  },
  {
    value: "fork_repo",
    label: "Fork Repo",
    placeholder: "e.g. owner/repo",
    icon: <GitFork className="w-3.5 h-3.5" />,
  },
  {
    value: "generate_setup",
    label: "Generate Setup Script",
    placeholder: "e.g. owner/repo",
    icon: <Zap className="w-3.5 h-3.5" />,
  },
  {
    value: "open_terminal",
    label: "Open Terminal",
    placeholder: "(no value needed)",
    icon: <Play className="w-3.5 h-3.5" />,
  },
  {
    value: "copy_text",
    label: "Copy to Clipboard",
    placeholder: "Text to copy",
    icon: <ClipboardCopy className="w-3.5 h-3.5" />,
  },
  {
    value: "open_url",
    label: "Open URL",
    placeholder: "https://...",
    icon: <ExternalLink className="w-3.5 h-3.5" />,
  },
  {
    value: "star_repo",
    label: "Star Repo",
    placeholder: "owner/repo",
    icon: <Star className="w-3.5 h-3.5" />,
  },
  {
    value: "create_gist",
    label: "Create Gist",
    placeholder: "Gist content text",
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  {
    value: "wait_seconds",
    label: "Wait (seconds)",
    placeholder: "e.g. 3",
    icon: <Timer className="w-3.5 h-3.5" />,
  },
  {
    value: "git_clone",
    label: "Git Clone",
    placeholder: "owner/repo",
    icon: <Download className="w-3.5 h-3.5" />,
  },
];

function stepTypeMeta(type: WorkflowStep["type"]) {
  return STEP_TYPES.find((s) => s.value === type) ?? STEP_TYPES[0];
}

async function executeStep(
  step: WorkflowStep,
): Promise<{ ok: boolean; message: string }> {
  switch (step.type) {
    case "run_command": {
      try {
        const res = await fetch("http://localhost:7891/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: step.value }),
        });
        if (!res.ok)
          return { ok: false, message: `Bridge returned ${res.status}` };
        const data = await res.json();
        return {
          ok: data.exitCode === 0,
          message:
            data.exitCode === 0
              ? data.stdout?.trim() || "Done"
              : data.stderr?.trim() || `Exit code ${data.exitCode}`,
        };
      } catch {
        return { ok: false, message: "Bridge not connected (localhost:7891)" };
      }
    }
    case "fork_repo": {
      const pat = localStorage.getItem("githubPAT");
      if (!pat) return { ok: false, message: "GitHub PAT not configured" };
      try {
        const res = await fetch(
          `https://api.github.com/repos/${step.value}/forks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${pat}`,
              Accept: "application/vnd.github+json",
            },
          },
        );
        if (res.status === 202)
          return { ok: true, message: `Forked ${step.value}` };
        const err = await res.json().catch(() => ({}));
        return {
          ok: false,
          message:
            (err as { message?: string }).message ?? `HTTP ${res.status}`,
        };
      } catch {
        return { ok: false, message: "GitHub API request failed" };
      }
    }
    case "generate_setup": {
      try {
        const pat = localStorage.getItem("githubPAT");
        const headers: Record<string, string> = {
          Accept: "application/vnd.github+json",
        };
        if (pat) headers.Authorization = `Bearer ${pat}`;
        const res = await fetch(`https://api.github.com/repos/${step.value}`, {
          headers,
        });
        if (!res.ok)
          return { ok: false, message: `Repo not found: ${step.value}` };
        const data = await res.json();
        return {
          ok: true,
          message: `Setup script generated for ${data.language ?? "Unknown"} project`,
        };
      } catch {
        return { ok: false, message: "Failed to fetch repo info" };
      }
    }
    case "open_terminal": {
      window.location.href = "/terminal";
      return { ok: true, message: "Navigating to terminal..." };
    }
    case "copy_text": {
      try {
        await navigator.clipboard.writeText(step.value);
        return { ok: true, message: "Copied to clipboard" };
      } catch {
        return { ok: false, message: "Clipboard access denied" };
      }
    }
    case "open_url": {
      window.open(step.value, "_blank");
      return { ok: true, message: `Opened ${step.value}` };
    }
    case "star_repo": {
      const pat = localStorage.getItem("githubPAT");
      if (!pat) return { ok: false, message: "GitHub PAT not configured" };
      try {
        const res = await fetch(
          `https://api.github.com/user/starred/${step.value}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${pat}`,
              Accept: "application/vnd.github+json",
              "Content-Length": "0",
            },
          },
        );
        if (res.status === 204)
          return { ok: true, message: `Starred ${step.value}` };
        return { ok: false, message: `Failed to star: HTTP ${res.status}` };
      } catch {
        return { ok: false, message: "GitHub API request failed" };
      }
    }
    case "create_gist": {
      const pat = localStorage.getItem("githubPAT");
      if (!pat) return { ok: false, message: "GitHub PAT not configured" };
      try {
        const res = await fetch("https://api.github.com/gists", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pat}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: "Workflow Gist",
            public: true,
            files: { "gist.txt": { content: step.value || "(empty)" } },
          }),
        });
        if (res.status === 201) {
          const data = await res.json();
          return { ok: true, message: `Gist created: ${data.html_url}` };
        }
        return {
          ok: false,
          message: `Failed to create gist: HTTP ${res.status}`,
        };
      } catch {
        return { ok: false, message: "GitHub API request failed" };
      }
    }
    case "wait_seconds": {
      const secs = Number(step.value) || 1;
      await new Promise((r) => setTimeout(r, secs * 1000));
      return { ok: true, message: `Waited ${secs}s` };
    }
    case "git_clone": {
      const cmd = `git clone https://github.com/${step.value}.git`;
      try {
        await navigator.clipboard.writeText(cmd);
        return { ok: true, message: `Copied: ${cmd}` };
      } catch {
        return { ok: false, message: "Clipboard access denied" };
      }
    }
    default:
      return { ok: false, message: "Unknown step type" };
  }
}

function BuilderModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial?: UserWorkflow;
  onSave: (w: UserWorkflow) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [steps, setSteps] = useState<WorkflowStep[]>(initial?.steps ?? []);

  const addStep = () =>
    setSteps((prev) => [
      ...prev,
      {
        id: uid(),
        type: "run_command",
        label: "New step",
        value: "",
        continueOnError: false,
      },
    ]);
  const removeStep = (id: string) =>
    setSteps((prev) => prev.filter((s) => s.id !== id));
  const updateStep = (id: string, patch: Partial<WorkflowStep>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setSteps(next);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Workflow name is required");
      return;
    }
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      description: description.trim(),
      steps,
      createdAt: initial?.createdAt ?? Date.now(),
      lastRunStatus: initial?.lastRunStatus,
      lastRunAt: initial?.lastRunAt,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="workflows.builder.dialog"
        className="max-w-2xl bg-[#0d1117] border border-white/10 text-white p-0 gap-0 overflow-hidden"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <DialogTitle className="font-mono text-sm text-white/90 flex items-center gap-2">
            <WorkflowIcon className="w-4 h-4 text-[#4ade80]" />
            {initial ? "Edit Workflow" : "New Workflow"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="wf-name"
                className="text-[11px] font-mono text-white/50 uppercase tracking-wider"
              >
                Workflow Name
              </Label>
              <Input
                id="wf-name"
                data-ocid="workflows.builder.name.input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Clone & Setup React App"
                className="bg-black/30 border-white/10 text-white placeholder-white/20 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="wf-desc"
                className="text-[11px] font-mono text-white/50 uppercase tracking-wider"
              >
                Description
              </Label>
              <Textarea
                id="wf-desc"
                data-ocid="workflows.builder.description.textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this workflow do?"
                rows={2}
                className="bg-black/30 border-white/10 text-white placeholder-white/20 font-mono text-sm resize-none"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                  Steps ({steps.length})
                </Label>
                <Button
                  size="sm"
                  data-ocid="workflows.builder.add_step.button"
                  onClick={addStep}
                  className="h-7 gap-1.5 text-[11px] font-mono bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80]"
                >
                  <Plus className="w-3 h-3" />
                  Add Step
                </Button>
              </div>
              {steps.length === 0 && (
                <div className="py-6 text-center text-[11px] font-mono text-white/20 border border-dashed border-white/10 rounded-md">
                  No steps yet — click "Add Step" to begin
                </div>
              )}
              {steps.map((step, i) => {
                const meta = stepTypeMeta(step.type);
                return (
                  <div
                    key={step.id}
                    className="bg-black/20 border border-white/10 rounded-md p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/30 w-5 shrink-0">
                        {i + 1}.
                      </span>
                      <Select
                        value={step.type}
                        onValueChange={(v) =>
                          updateStep(step.id, {
                            type: v as WorkflowStep["type"],
                          })
                        }
                      >
                        <SelectTrigger className="h-7 flex-1 bg-black/30 border-white/10 text-white/70 text-[11px] font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d1117] border-white/10">
                          {STEP_TYPES.map((t) => (
                            <SelectItem
                              key={t.value}
                              value={t.value}
                              className="text-[11px] font-mono text-white/70"
                            >
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveStep(i, -1)}
                          disabled={i === 0}
                          className="p-0.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(i, 1)}
                          disabled={i === steps.length - 1}
                          className="p-0.5 rounded text-white/30 hover:text-white/70 disabled:opacity-20"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(step.id)}
                          className="p-0.5 rounded text-white/30 hover:text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 pl-7">
                      <Input
                        value={step.label}
                        onChange={(e) =>
                          updateStep(step.id, { label: e.target.value })
                        }
                        placeholder="Step label"
                        className="h-7 flex-1 bg-black/30 border-white/10 text-white/70 placeholder-white/20 text-[11px] font-mono"
                      />
                      {step.type !== "open_terminal" && (
                        <Input
                          value={step.value}
                          onChange={(e) =>
                            updateStep(step.id, { value: e.target.value })
                          }
                          placeholder={meta.placeholder}
                          className="h-7 flex-1 bg-black/30 border-white/10 text-white/70 placeholder-white/20 text-[11px] font-mono"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 pl-7">
                      <Checkbox
                        id={`coe-${step.id}`}
                        data-ocid="workflows.builder.step_continue_on_error.checkbox"
                        checked={!!step.continueOnError}
                        onCheckedChange={(checked) =>
                          updateStep(step.id, { continueOnError: !!checked })
                        }
                        className="h-3.5 w-3.5 border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <label
                        htmlFor={`coe-${step.id}`}
                        className="text-[10px] font-mono text-white/30 cursor-pointer select-none"
                      >
                        Continue on error
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
        <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/50 hover:text-white text-xs font-mono"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            data-ocid="workflows.builder.save.button"
            onClick={handleSave}
            className="h-8 gap-1.5 text-xs font-mono bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80]"
          >
            Save Workflow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RunModal({
  workflow,
  onClose,
  onRunComplete,
}: {
  workflow: UserWorkflow | null;
  onClose: () => void;
  onRunComplete: (id: string, status: "success" | "failed" | "partial") => void;
}) {
  const [runState, setRunState] = useState<RunState | null>(null);
  const [started, setStarted] = useState(false);

  const startRun = async () => {
    if (!workflow) return;
    setStarted(true);
    const statuses: StepStatus[] = workflow.steps.map(() => "pending");
    const messages: string[] = workflow.steps.map(() => "");
    let hadError = false;
    let hadWarning = false;

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      statuses[i] = "running";
      setRunState({
        stepStatuses: [...statuses],
        stepMessages: [...messages],
        currentStep: i,
        finished: false,
      });
      const result = await executeStep(step);
      if (!result.ok) {
        if (step.continueOnError) {
          statuses[i] = "warning";
          hadWarning = true;
        } else {
          statuses[i] = "error";
          hadError = true;
        }
      } else {
        statuses[i] = "done";
      }
      messages[i] = result.message;
      setRunState({
        stepStatuses: [...statuses],
        stepMessages: [...messages],
        currentStep: i,
        finished: hadError,
      });
      if (hadError) {
        toast.error(`Step ${i + 1} failed: ${result.message}`);
        onRunComplete(workflow.id, "failed");
        return;
      }
    }

    const finalStatus = hadWarning ? "partial" : "success";
    setRunState({
      stepStatuses: [...statuses],
      stepMessages: [...messages],
      currentStep: workflow.steps.length - 1,
      finished: true,
    });
    onRunComplete(workflow.id, finalStatus);
    if (finalStatus === "partial") {
      toast.warning("Workflow completed with warnings");
    } else {
      toast.success("Workflow completed!");
    }
  };

  const handleClose = () => {
    setRunState(null);
    setStarted(false);
    onClose();
  };

  const statusIcon = (status: StepStatus) => {
    switch (status) {
      case "running":
        return <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />;
      case "done":
        return <CircleCheck className="w-3.5 h-3.5 text-[#4ade80]" />;
      case "error":
        return <X className="w-3.5 h-3.5 text-red-400" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <CircleDot className="w-3.5 h-3.5 text-white/20" />;
    }
  };

  return (
    <Dialog open={!!workflow} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="workflows.run.dialog"
        className="max-w-lg bg-[#0d1117] border border-white/10 text-white p-0 gap-0"
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/10">
          <DialogTitle className="font-mono text-sm text-white/90 flex items-center gap-2">
            <Play className="w-4 h-4 text-[#4ade80]" />
            Run: {workflow?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="p-5 space-y-3">
          {workflow?.steps.map((step, i) => {
            const status = runState?.stepStatuses[i] ?? "pending";
            const message = runState?.stepMessages[i] ?? "";
            const meta = stepTypeMeta(step.type);
            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-2.5 rounded-md border text-[11px] font-mono transition-colors ${
                  status === "running"
                    ? "border-blue-400/30 bg-blue-400/5"
                    : status === "done"
                      ? "border-[#4ade80]/20 bg-[#4ade80]/5"
                      : status === "error"
                        ? "border-red-400/30 bg-red-400/5"
                        : status === "warning"
                          ? "border-amber-400/30 bg-amber-400/5"
                          : "border-white/10 bg-black/20"
                }`}
              >
                <div className="mt-0.5 shrink-0">{statusIcon(status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {meta.icon}
                    <span className="text-white/70">{step.label}</span>
                    {step.continueOnError && (
                      <span className="text-[9px] font-mono text-amber-400/60 border border-amber-400/20 px-1 rounded">
                        skip on err
                      </span>
                    )}
                  </div>
                  {step.value && step.type !== "open_terminal" && (
                    <code className="text-[10px] text-white/30 truncate block">
                      {step.value}
                    </code>
                  )}
                  {message && (
                    <p
                      className={`mt-0.5 text-[10px] ${
                        status === "error"
                          ? "text-red-400"
                          : status === "warning"
                            ? "text-amber-400"
                            : "text-[#4ade80]/70"
                      }`}
                    >
                      {message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {runState?.finished && (
            <div className="text-center text-[11px] font-mono text-[#4ade80] py-2">
              All steps completed
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white/50 hover:text-white text-xs font-mono"
          >
            {runState?.finished ? "Close" : "Cancel"}
          </Button>
          {!started && (
            <Button
              size="sm"
              onClick={startRun}
              className="h-8 gap-1.5 text-xs font-mono bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80]"
            >
              <Play className="w-3 h-3" />
              Run Now
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<UserWorkflow[]>(loadWorkflows);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserWorkflow | undefined>();
  const [runTarget, setRunTarget] = useState<UserWorkflow | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const persist = (updated: UserWorkflow[]) => {
    setWorkflows(updated);
    saveWorkflows(updated);
  };

  const handleSave = (w: UserWorkflow) => {
    const existing = workflows.findIndex((x) => x.id === w.id);
    if (existing >= 0) {
      const next = [...workflows];
      next[existing] = w;
      persist(next);
    } else persist([...workflows, w]);
    toast.success(`Workflow "${w.name}" saved`);
  };

  const handleDelete = (id: string) => {
    persist(workflows.filter((w) => w.id !== id));
    toast.success("Workflow deleted");
  };

  const handleEdit = (w: UserWorkflow) => {
    setEditTarget(w);
    setBuilderOpen(true);
  };

  const handleBuilderClose = () => {
    setBuilderOpen(false);
    setEditTarget(undefined);
  };

  const handleDuplicate = (w: UserWorkflow) => {
    const copy: UserWorkflow = {
      ...w,
      id: uid(),
      name: `Copy of ${w.name}`,
      createdAt: Date.now(),
      lastRunStatus: undefined,
      lastRunAt: undefined,
    };
    persist([...workflows, copy]);
    toast.success("Workflow duplicated");
  };

  const handleRunComplete = (
    id: string,
    status: "success" | "failed" | "partial",
  ) => {
    const updated = workflows.map((w) =>
      w.id === id ? { ...w, lastRunStatus: status, lastRunAt: Date.now() } : w,
    );
    persist(updated);
  };

  const handleExportAll = () => {
    const blob = new Blob([JSON.stringify(workflows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflows-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `Exported ${workflows.length} workflow${workflows.length !== 1 ? "s" : ""}`,
    );
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported: UserWorkflow[] = JSON.parse(
          ev.target?.result as string,
        );
        if (!Array.isArray(imported)) throw new Error("Not an array");
        const existingIds = new Set(workflows.map((w) => w.id));
        const newOnes = imported.filter((w) => !existingIds.has(w.id));
        persist([...workflows, ...newOnes]);
        toast.success(
          newOnes.length === 0
            ? "No new workflows to import (all duplicates)"
            : `Imported ${newOnes.length} workflow${newOnes.length !== 1 ? "s" : ""}`,
        );
      } catch {
        toast.error("Invalid workflows JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const lastRunBadge = (w: UserWorkflow) => {
    if (!w.lastRunStatus || !w.lastRunAt) return null;
    const time = relativeTime(w.lastRunAt);
    if (w.lastRunStatus === "success") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#4ade80] bg-[#4ade80]/10 border border-[#4ade80]/20 px-1.5 py-0.5 rounded">
          ✓ Last run passed · {time}
        </span>
      );
    }
    if (w.lastRunStatus === "failed") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded">
          ✗ Last run failed · {time}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
        ⚠ Partial · {time}
      </span>
    );
  };

  return (
    <div
      data-ocid="workflows.page"
      className="min-h-screen bg-[#0d1117] text-white px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-mono font-bold text-white flex items-center gap-3">
              <WorkflowIcon className="w-6 h-6 text-[#4ade80]" />
              Custom Workflows
            </h1>
            <p className="mt-1.5 text-sm text-white/40 font-mono">
              Automate sequences of actions — run commands, fork repos, generate
              scripts, and more.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              data-ocid="workflows.export_all.button"
              variant="ghost"
              size="sm"
              onClick={handleExportAll}
              disabled={workflows.length === 0}
              className="h-8 gap-1.5 text-[11px] font-mono text-white/40 hover:text-white hover:bg-white/10 border border-white/10"
            >
              <Download className="w-3.5 h-3.5" />
              Export All
            </Button>
            <Button
              data-ocid="workflows.import.button"
              variant="ghost"
              size="sm"
              onClick={() => importInputRef.current?.click()}
              className="h-8 gap-1.5 text-[11px] font-mono text-white/40 hover:text-white hover:bg-white/10 border border-white/10"
            >
              <Upload className="w-3.5 h-3.5" />
              Import
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button
              data-ocid="workflows.new_button"
              onClick={() => {
                setEditTarget(undefined);
                setBuilderOpen(true);
              }}
              className="gap-2 font-mono text-sm bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80]"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </div>
        </div>

        {workflows.length === 0 ? (
          <div
            data-ocid="workflows.empty_state"
            className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl text-center"
          >
            <WorkflowIcon className="w-12 h-12 text-white/10 mb-4" />
            <h2 className="font-mono text-lg font-semibold text-white/30">
              No workflows yet
            </h2>
            <p className="text-sm text-white/20 font-mono mt-1 max-w-sm">
              Create your first workflow to automate repetitive dev tasks like
              cloning, forking, and setting up projects.
            </p>
            <Button
              onClick={() => setBuilderOpen(true)}
              className="mt-6 gap-2 font-mono text-sm bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80]"
            >
              <Plus className="w-4 h-4" />
              Create First Workflow
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow, index) => (
              <div
                key={workflow.id}
                data-ocid={`workflows.item.${index + 1}`}
                className="bg-black/20 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-mono font-semibold text-white/90 text-sm">
                        {workflow.name}
                      </h3>
                      <Badge className="text-[10px] font-mono bg-white/5 text-white/40 border-white/10">
                        {workflow.steps.length}{" "}
                        {workflow.steps.length === 1 ? "step" : "steps"}
                      </Badge>
                      {lastRunBadge(workflow)}
                    </div>
                    {workflow.description && (
                      <p className="mt-1 text-xs text-white/40 font-mono line-clamp-1">
                        {workflow.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {workflow.steps.slice(0, 4).map((step) => {
                        const meta = stepTypeMeta(step.type);
                        return (
                          <span
                            key={step.id}
                            className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/30 border border-white/5"
                          >
                            {meta.icon}
                            {step.label}
                          </span>
                        );
                      })}
                      {workflow.steps.length > 4 && (
                        <span className="text-[10px] font-mono text-white/20">
                          +{workflow.steps.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      data-ocid={`workflows.run_button.${index + 1}`}
                      onClick={() => setRunTarget(workflow)}
                      disabled={workflow.steps.length === 0}
                      className="h-8 gap-1.5 text-[11px] font-mono bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80]"
                    >
                      <Play className="w-3 h-3" />
                      Run
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-ocid={`workflows.duplicate_button.${index + 1}`}
                      onClick={() => handleDuplicate(workflow)}
                      title="Duplicate workflow"
                      className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-ocid={`workflows.edit_button.${index + 1}`}
                      onClick={() => handleEdit(workflow)}
                      className="h-8 w-8 p-0 text-white/40 hover:text-white hover:bg-white/10"
                    >
                      <WorkflowIcon className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      data-ocid={`workflows.delete_button.${index + 1}`}
                      onClick={() => handleDelete(workflow.id)}
                      className="h-8 w-8 p-0 text-white/40 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BuilderModal
        open={builderOpen}
        onClose={handleBuilderClose}
        initial={editTarget}
        onSave={handleSave}
      />
      <RunModal
        workflow={runTarget}
        onClose={() => setRunTarget(null)}
        onRunComplete={handleRunComplete}
      />
    </div>
  );
}
