import type { Repository } from '../types/github';

export interface RepoInsight {
  summary: string;
  whyInteresting: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  difficultyRationale: string;
}

export function generateInsight(repo: Repository): RepoInsight {
  const { language, topics, stargazers_count, forks_count, description, open_issues_count, size } = repo;

  // Difficulty rating
  let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
  let difficultyRationale = '';

  const complexTopics = ['machine-learning', 'deep-learning', 'distributed-systems', 'compiler', 'kernel', 'blockchain', 'cryptography', 'neural-network', 'reinforcement-learning'];
  const beginnerTopics = ['tutorial', 'beginner', 'starter', 'boilerplate', 'template', 'example', 'demo', 'learning', 'education'];

  const hasComplexTopics = topics.some(t => complexTopics.includes(t.toLowerCase()));
  const hasBeginnerTopics = topics.some(t => beginnerTopics.includes(t.toLowerCase()));

  if (hasComplexTopics || (stargazers_count > 10000 && forks_count > 1000 && size > 50000)) {
    difficulty = 'Advanced';
    difficultyRationale = hasComplexTopics
      ? `Involves complex topics like ${topics.filter(t => complexTopics.includes(t.toLowerCase())).join(', ')}`
      : 'Large, mature codebase with high community engagement';
  } else if (hasBeginnerTopics || size < 500 || (stargazers_count < 500 && forks_count < 100)) {
    difficulty = 'Beginner';
    difficultyRationale = hasBeginnerTopics
      ? 'Explicitly designed for learning and getting started'
      : 'Small, focused codebase ideal for exploration';
  } else {
    difficulty = 'Intermediate';
    difficultyRationale = 'Moderate complexity with established patterns and reasonable codebase size';
  }

  // Summary
  const langStr = language ? `a ${language} project` : 'a project';
  const topicStr = topics.length > 0 ? ` focused on ${topics.slice(0, 3).join(', ')}` : '';
  const descStr = description ? ` — ${description}` : '';
  const summary = `This is ${langStr}${topicStr}${descStr}. It has earned ${stargazers_count.toLocaleString()} stars and ${forks_count.toLocaleString()} forks from the community.`;

  // Why interesting
  const whyInteresting: string[] = [];

  if (stargazers_count > 5000) {
    whyInteresting.push(`Highly popular with ${stargazers_count.toLocaleString()} stars, indicating strong community trust and adoption`);
  } else if (stargazers_count > 1000) {
    whyInteresting.push(`Growing community with ${stargazers_count.toLocaleString()} stars showing solid developer interest`);
  }

  if (forks_count > 500) {
    whyInteresting.push(`Widely forked (${forks_count.toLocaleString()} forks), suggesting it's used as a foundation for many other projects`);
  }

  if (topics.length > 3) {
    whyInteresting.push(`Covers a broad range of topics: ${topics.slice(0, 5).join(', ')}`);
  } else if (topics.length > 0) {
    whyInteresting.push(`Focused on ${topics.join(', ')} — a relevant and in-demand area`);
  }

  const daysSinceUpdate = Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceUpdate < 30) {
    whyInteresting.push(`Actively maintained — last updated ${daysSinceUpdate} day${daysSinceUpdate !== 1 ? 's' : ''} ago`);
  }

  if (open_issues_count > 50) {
    whyInteresting.push(`Active development with ${open_issues_count} open issues, showing ongoing community engagement`);
  }

  if (language) {
    whyInteresting.push(`Written in ${language}, making it accessible to a wide range of developers`);
  }

  // Ensure at least 2 bullets
  if (whyInteresting.length < 2) {
    whyInteresting.push('A well-structured project worth exploring for learning and inspiration');
  }

  return {
    summary,
    whyInteresting: whyInteresting.slice(0, 3),
    difficulty,
    difficultyRationale,
  };
}
