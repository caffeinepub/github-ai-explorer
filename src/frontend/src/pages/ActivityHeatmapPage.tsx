import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Activity, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WeekActivity {
  week: number;   // Unix timestamp
  days: number[]; // 7 values, commits per day (Sun–Sat)
  total: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  text: string;
}

function getGitHubToken(): string | null {
  return localStorage.getItem('github_pat') || localStorage.getItem('github-token');
}

async function fetchCommitActivity(owner: string, repo: string): Promise<WeekActivity[]> {
  const token = getGitHubToken();
  const headers: HeadersInit = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers['Authorization'] = `token ${token}`;

  // GitHub may return 202 while it computes stats; retry up to 3 times
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, { headers });
    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    return res.json();
  }
  throw new Error('GitHub is computing stats. Please try again in a moment.');
}

function getIntensityClass(count: number, max: number): string {
  if (count === 0) return 'bg-secondary';
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.15) return 'bg-primary/20';
  if (ratio < 0.35) return 'bg-primary/40';
  if (ratio < 0.6) return 'bg-primary/65';
  if (ratio < 0.85) return 'bg-primary/85';
  return 'bg-primary';
}

function getMonthLabels(weeks: WeekActivity[]): { label: string; colIndex: number }[] {
  const labels: { label: string; colIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const d = new Date(w.week * 1000);
    const m = d.getMonth();
    if (m !== lastMonth) {
      labels.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        colIndex: i,
      });
      lastMonth = m;
    }
  });
  return labels;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function ActivityHeatmapPage() {
  const { owner, name } = useParams({ from: '/repo/$owner/$name/activity' });
  const navigate = useNavigate();

  const [weeks, setWeeks] = useState<WeekActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, text: '' });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCommitActivity(owner, name)
      .then((data) => {
        if (!cancelled) {
          setWeeks(data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load activity data');
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [owner, name]);

  const repoPath = `/repo/${owner}/${name}`;
  const totalCommits = weeks.reduce((sum, w) => sum + w.total, 0);
  const maxDay = Math.max(...weeks.flatMap((w) => w.days));
  const monthLabels = getMonthLabels(weeks);

  // Most active week
  const mostActiveWeek = weeks.reduce<WeekActivity | null>(
    (best, w) => (best === null || w.total > best.total ? w : best),
    null
  );

  function handleCellEnter(e: React.MouseEvent, weekIndex: number, dayIndex: number, count: number) {
    const week = weeks[weekIndex];
    if (!week) return;
    const d = new Date((week.week + dayIndex * 86400) * 1000);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left - (containerRect?.left ?? 0) + rect.width / 2,
      y: rect.top - (containerRect?.top ?? 0) - 8,
      text: `${dateStr} — ${count} commit${count !== 1 ? 's' : ''}`,
    });
  }

  function handleCellLeave() {
    setTooltip((t) => ({ ...t, visible: false }));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: repoPath })}
        className="mb-6 gap-2 text-muted-foreground hover:text-foreground font-mono text-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {owner}/{name}
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            Activity <span className="text-primary">Heatmap</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {owner}/{name} · commit activity over the past year
        </p>
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-sm text-muted-foreground">Loading commit activity...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <p className="font-mono text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="font-mono text-xs">
            Retry
          </Button>
        </div>
      ) : weeks.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Activity className="w-8 h-8 text-muted-foreground/40" />
          <p className="font-mono text-sm text-muted-foreground">No activity data available.</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-muted-foreground mb-1">Total Commits</p>
              <p className="text-2xl font-mono font-bold text-primary">{totalCommits.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-mono">past 52 weeks</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-muted-foreground mb-1">Avg / Week</p>
              <p className="text-2xl font-mono font-bold text-foreground">
                {weeks.length > 0 ? Math.round(totalCommits / weeks.length) : 0}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs font-mono text-muted-foreground mb-1">Peak Week</p>
              {mostActiveWeek ? (
                <>
                  <p className="text-lg font-mono font-bold text-foreground">
                    {new Date(mostActiveWeek.week * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{mostActiveWeek.total} commits</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground font-mono">—</p>
              )}
            </div>
          </div>

          {/* Heatmap */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-mono text-sm font-semibold text-foreground mb-4">Commit Frequency</h2>

            <div className="overflow-x-auto pb-2">
              <div className="relative" ref={containerRef} style={{ minWidth: `${weeks.length * 14 + 32}px` }}>
                {/* Tooltip */}
                {tooltip.visible && (
                  <div
                    className="absolute z-10 pointer-events-none px-2 py-1 bg-card border border-border rounded text-xs font-mono text-foreground shadow-lg whitespace-nowrap"
                    style={{
                      left: tooltip.x,
                      top: tooltip.y,
                      transform: 'translate(-50%, -100%)',
                    }}
                  >
                    {tooltip.text}
                  </div>
                )}

                {/* Month labels */}
                <div className="flex ml-8 mb-1" style={{ gap: '2px' }}>
                  {weeks.map((w, wi) => {
                    const lbl = monthLabels.find((m) => m.colIndex === wi);
                    return (
                      <div key={w.week} className="w-3 shrink-0 text-center">
                        {lbl ? (
                          <span className="text-[9px] font-mono text-muted-foreground leading-none">{lbl.label}</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Day rows */}
                <div className="flex gap-0">
                  {/* Day labels */}
                  <div className="flex flex-col mr-2" style={{ gap: '2px' }}>
                    {(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const).map((dayName, showIndex) => (
                      <div key={dayName} className="w-4 h-3 flex items-center justify-center">
                        {showIndex % 2 === 1 && (
                          <span className="text-[9px] font-mono text-muted-foreground">{DAY_LABELS[showIndex]}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Grid columns (weeks) */}
                  <div className="flex" style={{ gap: '2px' }}>
                    {weeks.map((week, wi) => (
                      <div key={week.week} className="flex flex-col" style={{ gap: '2px' }}>
                        {week.days.map((count, di) => (
                          <button
                            key={`${week.week}-${di}`}
                            type="button"
                            aria-label={`${count} commits`}
                            className={`w-3 h-3 rounded-sm cursor-default transition-opacity hover:opacity-80 focus:outline-none ${getIntensityClass(count, maxDay)}`}
                            onMouseEnter={(e) => handleCellEnter(e, wi, di, count)}
                            onMouseLeave={handleCellLeave}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-[10px] font-mono text-muted-foreground">Less</span>
              {['bg-secondary', 'bg-primary/20', 'bg-primary/40', 'bg-primary/65', 'bg-primary/85', 'bg-primary'].map(
                (cls) => (
                  <div key={cls} className={`w-3 h-3 rounded-sm ${cls}`} />
                )
              )}
              <span className="text-[10px] font-mono text-muted-foreground">More</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
