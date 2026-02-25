import { useInternetIdentity } from './useInternetIdentity';
import { useGetBookmarks, useAddBookmark, useRemoveBookmark } from './useQueries';

export function useBookmarks() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: bookmarks = [], isLoading } = useGetBookmarks();
  const addMutation = useAddBookmark();
  const removeMutation = useRemoveBookmark();

  const isBookmarked = (repoId: string): boolean => {
    return bookmarks.some(b => b.repoId === repoId);
  };

  const toggleBookmark = async (repoId: string) => {
    if (!isAuthenticated) return;
    if (isBookmarked(repoId)) {
      await removeMutation.mutateAsync(repoId);
    } else {
      await addMutation.mutateAsync(repoId);
    }
  };

  return {
    bookmarks,
    isLoading,
    isAuthenticated,
    isBookmarked,
    toggleBookmark,
    isToggling: addMutation.isPending || removeMutation.isPending,
  };
}
