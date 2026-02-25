import React, { useState } from 'react';
import { generateInsight } from '../utils/repoInsights';
import type { Repository } from '../types/github';
import { DifficultyBadge } from './DifficultyBadge';
import { SimilarProjectsSection } from './SimilarProjectsSection';
import { ChevronDown, ChevronUp, Sparkles, CheckCircle } from 'lucide-react';
import { useGetMyGithubToken } from '../hooks/useQueries';

interface AIAnalysisPanelProps {
  repo: Repository;
}

export function AIAnalysisPanel({ repo }: AIAnalysisPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: token } = useGetMyGithubToken();
  const insight = generateInsight(repo);

  return (
    <div className="border border-border/40 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">AI Analysis</span>
          <DifficultyBadge difficulty={insight.difficulty} rationale={insight.difficultyRationale} />
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border/40 p-3 space-y-4">
          {/* Summary */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{insight.summary}</p>
          </div>

          {/* Why Interesting */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Why It's Interesting
            </p>
            <ul className="space-y-1.5">
              {insight.whyInteresting.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                  <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Similar Projects */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Similar Projects
            </p>
            <SimilarProjectsSection currentRepo={repo} token={token} />
          </div>
        </div>
      )}
    </div>
  );
}
