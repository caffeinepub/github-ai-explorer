import type { Repository, SearchResponse, SearchParams, Contributor, RepoFileTree, RepoContent, CommitFile, ForkResult } from '../types/github';

const GITHUB_API_BASE = 'https://api.github.com';

function buildHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 403) {
    const data = await response.json().catch(() => ({}));
    if (data.message?.includes('rate limit')) {
      throw new Error('GitHub API rate limit exceeded. Please try again later or add a GitHub token.');
    }
    throw new Error('GitHub API access forbidden. Check your token permissions.');
  }
  if (response.status === 401) {
    throw new Error('Invalid GitHub token. Please check your Personal Access Token.');
  }
  if (response.status === 404) {
    throw new Error('Repository not found.');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `GitHub API error: ${response.status}`);
  }
  return response.json();
}

export async function searchRepositories(params: SearchParams, token?: string | null): Promise<SearchResponse> {
  let q = params.query || 'stars:>1';
  if (params.language) q += ` language:${params.language}`;
  if (params.topic) q += ` topic:${params.topic}`;
  if (params.minStars) q += ` stars:>=${params.minStars}`;

  const url = new URL(`${GITHUB_API_BASE}/search/repositories`);
  url.searchParams.set('q', q);
  url.searchParams.set('sort', 'stars');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', String(params.perPage || 30));
  url.searchParams.set('page', String(params.page || 1));

  const response = await fetch(url.toString(), { headers: buildHeaders(token) });
  return handleResponse<SearchResponse>(response);
}

export async function getTrendingRepositories(timeRange: 'day' | 'week' | 'month' = 'week', token?: string | null): Promise<Repository[]> {
  const now = new Date();
  const daysBack = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
  const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const sinceStr = since.toISOString().split('T')[0];

  const url = new URL(`${GITHUB_API_BASE}/search/repositories`);
  url.searchParams.set('q', `created:>${sinceStr}`);
  url.searchParams.set('sort', 'stars');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('per_page', '30');

  const response = await fetch(url.toString(), { headers: buildHeaders(token) });
  const data = await handleResponse<{ items: Repository[] }>(response);
  return data.items;
}

export async function getRepositoryByFullName(fullName: string, token?: string | null): Promise<Repository> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${fullName}`, {
    headers: buildHeaders(token),
  });
  return handleResponse<Repository>(response);
}

export async function getRepositoryReadme(owner: string, repo: string, token?: string | null): Promise<string> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`, {
      headers: { ...buildHeaders(token), 'Accept': 'application/vnd.github.v3.raw' },
    });
    if (response.status === 404) return '';
    if (!response.ok) return '';
    return response.text();
  } catch {
    return '';
  }
}

export async function getRepositoryContributors(owner: string, repo: string, token?: string | null): Promise<Contributor[]> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=10`, {
      headers: buildHeaders(token),
    });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export async function getRepositoryFileTree(owner: string, repo: string, branch: string = 'HEAD', token?: string | null): Promise<RepoFileTree> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      headers: buildHeaders(token),
    });
    if (!response.ok) return { tree: [] };
    return response.json();
  } catch {
    return { tree: [] };
  }
}

export async function getFileContent(owner: string, repo: string, path: string, token?: string | null): Promise<string> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
      headers: { ...buildHeaders(token), 'Accept': 'application/vnd.github.v3.raw' },
    });
    if (!response.ok) return '';
    return response.text();
  } catch {
    return '';
  }
}

export async function forkRepository(owner: string, repo: string, token: string): Promise<ForkResult> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/forks`, {
    method: 'POST',
    headers: buildHeaders(token),
  });
  if (response.status === 202 || response.status === 200) {
    return response.json();
  }
  return handleResponse<ForkResult>(response);
}

export async function getFileContentWithSha(owner: string, repo: string, path: string, token: string): Promise<{ sha: string; exists: boolean }> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
      headers: buildHeaders(token),
    });
    if (response.status === 404) return { sha: '', exists: false };
    if (!response.ok) return { sha: '', exists: false };
    const data = await response.json();
    return { sha: data.sha, exists: true };
  } catch {
    return { sha: '', exists: false };
  }
}

export async function commitFilesToRepo(
  owner: string,
  repo: string,
  token: string,
  files: CommitFile[],
  onProgress?: (file: string, status: 'uploading' | 'success' | 'error') => void
): Promise<void> {
  for (const file of files) {
    onProgress?.(file.path, 'uploading');
    try {
      const { sha } = await getFileContentWithSha(owner, repo, file.path, token);
      const body: Record<string, unknown> = {
        message: file.message,
        content: btoa(unescape(encodeURIComponent(file.content))),
      };
      if (sha) body.sha = sha;

      const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${file.path}`, {
        method: 'PUT',
        headers: { ...buildHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to commit file');
      }
      onProgress?.(file.path, 'success');
    } catch (e) {
      onProgress?.(file.path, 'error');
      throw e;
    }
  }
}

export async function fetchSimilarProjects(language: string | null, topics: string[], token?: string | null): Promise<Repository[]> {
  try {
    let q = 'stars:>100';
    if (language) q += ` language:${language}`;
    if (topics.length > 0) q += ` topic:${topics[0]}`;

    const url = new URL(`${GITHUB_API_BASE}/search/repositories`);
    url.searchParams.set('q', q);
    url.searchParams.set('sort', 'stars');
    url.searchParams.set('order', 'desc');
    url.searchParams.set('per_page', '6');

    const response = await fetch(url.toString(), { headers: buildHeaders(token) });
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch {
    return [];
  }
}
