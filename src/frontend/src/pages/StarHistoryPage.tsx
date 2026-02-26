import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

interface StargazerEvent {
  starred_at: string;
  user: { login: string };
}

interface StarDataPoint {
  month: string;
  stars: number;
  cumulative: number;
}

function getGitHubHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3.star+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
}

async function fetchStarHistory(owner: string, repo: string, token?: string | null): Promise<StargazerEvent[]> {
  const allStargazers: StargazerEvent[] = [];
  const maxPages = 10;

  // First get total count to determine page range
  const countRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: 'application/vnd.github.v3+json', ...(token ? { Authorization: `token ${token}` } : {}) },
  });
  if (!countRes.ok) throw new Error('Failed to fetch repo info');
  const repoData = await countRes.json();
  const totalStars: number = repoData.stargazers_count || 0;
  const perPage = 100;
  const totalPages = Math.ceil(totalStars / perPage);

  // Sample pages evenly across history (up to maxPages)
  const pagesToFetch: number[] = [];
  if (totalPages <= maxPages) {
    for (let i = 1; i <= totalPages; i++) pagesToFetch.push(i);
  } else {
    // Sample evenly
    for (let i = 0; i < maxPages; i++) {
      pagesToFetch.push(Math.round(1 + (i / (maxPages - 1)) * (totalPages - 1)));
    }
  }

  // Fetch in parallel (batches of 3 to avoid rate limiting)
  for (let i = 0; i < pagesToFetch.length; i += 3) {
    const batch = pagesToFetch.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async (page) => {
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/stargazers?per_page=${perPage}&page=${page}`,
          { headers: getGitHubHeaders(token) }
        );
        if (!res.ok) return [];
        return res.json() as Promise<StargazerEvent[]>;
      })
    );
    for (const batch_result of results) {
      allStargazers.push(...batch_result);
    }
  }

  return allStargazers;
}

function buildChartData(stargazers: StargazerEvent[], totalStars: number): StarDataPoint[] {
  if (stargazers.length === 0) return [];

  // Group by month
  const monthMap = new Map<string, number>();
  for (const sg of stargazers) {
    const d = new Date(sg.starred_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(key, (monthMap.get(key) || 0) + 1);
  }

  // Sort months
  const sortedMonths = Array.from(monthMap.keys()).sort();
  if (sortedMonths.length === 0) return [];

  // Build cumulative — if sampled, scale cumulative to match actual total
  const sampleRatio = stargazers.length > 0 ? totalStars / stargazers.length : 1;
  let cumulative = 0;
  return sortedMonths.map((month) => {
    const raw = monthMap.get(month) || 0;
    const scaled = Math.round(raw * sampleRatio);
    cumulative += scaled;
    const [year, mon] = month.split('-');
    const label = new Date(Number(year), Number(mon) - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
    return { month: label, stars: scaled, cumulative: Math.min(cumulative, totalStars) };
  });
}

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 font-mono text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="text-primary font-semibold">
        Total: {formatK(payload[0]?.value ?? 0)} ★
      </p>
      <p className="text-muted-foreground">
        +{formatK(payload[1]?.value ?? 0)} this month
      </p>
    </div>
  );
}

export default function StarHistoryPage() {
  const { owner, name } = useParams({ from: '/repo/$owner/$name/stars' });
  const navigate = useNavigate();

  const [chartData, setChartData] = useState<StarDataPoint[]>([]);
  const [totalStars, setTotalStars] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('Fetching star history...');

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('github_pat') || localStorage.getItem('github-token');

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        setProgress('Fetching repository info...');
        const countRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            ...(token ? { Authorization: `token ${token}` } : {}),
          },
        });
        if (!countRes.ok) throw new Error('Repository not found.');
        const repoData = await countRes.json();
        const stars: number = repoData.stargazers_count || 0;
        if (!cancelled) setTotalStars(stars);

        setProgress(`Loading star events (${formatK(stars)} stars)...`);
        const stargazers = await fetchStarHistory(owner, name, token);
        if (cancelled) return;

        setProgress('Building chart...');
        const data = buildChartData(stargazers, stars);
        if (!cancelled) {
          setChartData(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load star history');
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [owner, name]);

  const repoPath = `/repo/${owner}/${name}`;

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
          <Star className="w-5 h-5 text-yellow-400" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            Star <span className="text-primary">History</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {owner}/{name} · cumulative star growth over time
        </p>
      </div>

      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="font-mono text-sm text-muted-foreground">{progress}</span>
          </div>
          <div className="w-full max-w-xs bg-secondary rounded-full h-1 overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
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
      ) : chartData.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Star className="w-8 h-8 text-muted-foreground/40" />
          <p className="font-mono text-sm text-muted-foreground">No star history data available.</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-muted-foreground mb-1">Total Stars</p>
              <p className="text-2xl font-mono font-bold text-primary">{formatK(totalStars)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-muted-foreground mb-1">Data Points</p>
              <p className="text-2xl font-mono font-bold text-foreground">{chartData.length}</p>
              <p className="text-xs text-muted-foreground font-mono">months tracked</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 col-span-2 sm:col-span-1">
              <p className="text-xs font-mono text-muted-foreground mb-1">Peak Month</p>
              <p className="text-lg font-mono font-bold text-foreground">
                {chartData.reduce((max, d) => (d.stars > max.stars ? d : max), chartData[0])?.month}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                +{formatK(chartData.reduce((max, d) => (d.stars > max.stars ? d : max), chartData[0])?.stars || 0)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-sm font-semibold text-foreground">Cumulative Stars Over Time</h2>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="starGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 240 / 0.4)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'oklch(0.55 0.015 240)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'oklch(0.28 0.015 240)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatK}
                  tick={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fill: 'oklch(0.55 0.015 240)' }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="oklch(0.72 0.19 155)"
                  strokeWidth={2}
                  fill="url(#starGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'oklch(0.72 0.19 155)', stroke: 'oklch(0.72 0.19 155 / 0.3)', strokeWidth: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="stars"
                  stroke="oklch(0.65 0.18 200)"
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-4 justify-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-primary" />
                <span className="text-xs font-mono text-muted-foreground">Cumulative</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 border-t-2 border-dashed border-[oklch(0.65_0.18_200)]" />
                <span className="text-xs font-mono text-muted-foreground">Monthly</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
