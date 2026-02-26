export interface GitHubOwner {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubOwner;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  open_issues_count: number;
  watchers_count: number;
  default_branch: string;
  license: { name: string } | null;
  size: number;
  visibility: string;
}

export interface SearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Repository[];
}

export interface SearchParams {
  query: string;
  language?: string;
  topic?: string;
  minStars?: number;
  page?: number;
  perPage?: number;
}

export interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  type: string;
}

export interface TechStackBadge {
  name: string;
  color: string;
  icon?: string;
}

export interface RepoFileTree {
  tree: Array<{
    path: string;
    type: string;
    sha: string;
  }>;
}

export interface RepoContent {
  name: string;
  path: string;
  content?: string;
  encoding?: string;
  sha: string;
  type: string;
}

export interface CommitFile {
  path: string;
  content: string;
  message: string;
}

export interface ForkResult {
  html_url: string;
  full_name: string;
  owner: GitHubOwner;
}
