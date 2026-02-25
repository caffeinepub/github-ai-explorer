import React, { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBookmarks } from '../hooks/useBookmarks';
import { AuthPromptDialog } from './AuthGuard';

interface BookmarkButtonProps {
  repoId: string;
  size?: 'sm' | 'default' | 'icon';
}

export function BookmarkButton({ repoId, size = 'icon' }: BookmarkButtonProps) {
  const { isAuthenticated, isBookmarked, toggleBookmark, isToggling } = useBookmarks();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const bookmarked = isBookmarked(repoId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    toggleBookmark(repoId);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            onClick={handleClick}
            disabled={isToggling}
            className={bookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}
          >
            {isToggling ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : bookmarked ? (
              <BookmarkCheck className="w-4 h-4" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {!isAuthenticated ? 'Login to bookmark' : bookmarked ? 'Remove bookmark' : 'Bookmark repo'}
        </TooltipContent>
      </Tooltip>

      <AuthPromptDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        actionDescription="bookmark repositories"
      />
    </>
  );
}
