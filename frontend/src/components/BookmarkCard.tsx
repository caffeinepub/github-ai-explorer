import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Star, GitFork, Edit2, Check, X, Tag, FileText } from 'lucide-react';
import { BookmarkButton } from './BookmarkButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Repository } from '../types/github';
import type { BookmarkEntry } from '../backend';
import { useUpdateBookmarkTags, useUpdateBookmarkNote } from '../hooks/useQueries';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

interface BookmarkCardProps {
  repo: Repository;
  bookmark: BookmarkEntry;
}

const TAG_COLORS = [
  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'bg-green-500/15 text-green-400 border-green-500/30',
  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function BookmarkCard({ repo, bookmark }: BookmarkCardProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [tagInput, setTagInput] = useState(bookmark.tags.join(', '));
  const [noteInput, setNoteInput] = useState(bookmark.note || '');

  const updateTags = useUpdateBookmarkTags();
  const updateNote = useUpdateBookmarkNote();

  const [owner, name] = repo.full_name.split('/');

  const handleTitleClick = () => {
    navigate({ to: '/repo/$owner/$name', params: { owner, name } });
  };

  const handleSave = async () => {
    const newTags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      await Promise.all([
        updateTags.mutateAsync({ repoId: bookmark.repoId, tags: newTags }),
        updateNote.mutateAsync({ repoId: bookmark.repoId, note: noteInput.trim() || null }),
      ]);
      setIsEditing(false);
      toast.success('Bookmark updated');
    } catch {
      toast.error('Failed to update bookmark');
    }
  };

  const handleCancel = () => {
    setTagInput(bookmark.tags.join(', '));
    setNoteInput(bookmark.note || '');
    setIsEditing(false);
  };

  const isSaving = updateTags.isPending || updateNote.isPending;

  return (
    <TooltipProvider>
      <div className="card-hover group flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <button
              onClick={handleTitleClick}
              className="font-mono font-semibold text-sm text-primary hover:underline truncate block text-left w-full"
            >
              {repo.full_name}
            </button>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">by {repo.owner.login}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <BookmarkButton repoId={bookmark.repoId} />
          </div>
        </div>

        {/* Description */}
        {repo.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{repo.description}</p>
        )}

        {/* Tags display */}
        {!isEditing && bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bookmark.tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${getTagColor(tag)}`}
              >
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Note display */}
        {!isEditing && bookmark.note && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
            <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className="leading-relaxed">{bookmark.note}</p>
          </div>
        )}

        {/* Edit mode */}
        {isEditing && (
          <div className="space-y-2 pt-1">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tags (comma-separated)</label>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="react, typescript, frontend"
                className="text-xs h-8"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Note</label>
              <Textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note about this repo..."
                className="text-xs min-h-[60px] resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-7 text-xs gap-1">
                {isSaving ? (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 text-xs gap-1">
                <X className="w-3 h-3" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {repo.language && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary/60" />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            {formatCount(repo.stargazers_count)}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5" />
            {formatCount(repo.forks_count)}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
