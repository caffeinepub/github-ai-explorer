import { useMemo } from 'react';

const COMMAND_COMPLETIONS: Record<string, string[]> = {
  git: ['git status', 'git add .', 'git commit -m ""', 'git push', 'git pull', 'git log --oneline', 'git checkout -b ', 'git branch -a', 'git stash', 'git diff'],
  npm: ['npm install', 'npm run dev', 'npm run build', 'npm run test', 'npm start', 'npm init', 'npm publish'],
  ls: ['ls -la', 'ls -lh', 'ls -a'],
  cd: ['cd ..', 'cd ~', 'cd /'],
  docker: ['docker ps', 'docker build .', 'docker run ', 'docker-compose up', 'docker-compose down'],
  python: ['python --version', 'python3 -m venv venv', 'python3 -m pip install -r requirements.txt'],
  pip: ['pip install ', 'pip install -r requirements.txt', 'pip list', 'pip freeze > requirements.txt'],
  cargo: ['cargo build', 'cargo run', 'cargo test', 'cargo check', 'cargo fmt'],
  make: ['make', 'make install', 'make clean', 'make test'],
  ssh: ['ssh -i ', 'ssh user@host'],
  curl: ['curl -X GET ', 'curl -X POST -H "Content-Type: application/json" -d '],
  grep: ['grep -r "" .', 'grep -n "" '],
  find: ['find . -name ""', 'find . -type f -name "*.ts"'],
  cat: ['cat package.json', 'cat README.md', 'cat .env'],
  mkdir: ['mkdir -p '],
  rm: ['rm -rf ', 'rm -f '],
  cp: ['cp -r '],
  mv: ['mv '],
  chmod: ['chmod +x ', 'chmod 755 '],
  sudo: ['sudo apt-get install ', 'sudo npm install -g ', 'sudo systemctl '],
  yarn: ['yarn install', 'yarn dev', 'yarn build', 'yarn test', 'yarn add '],
  pnpm: ['pnpm install', 'pnpm dev', 'pnpm build', 'pnpm add '],
  gh: ['gh repo clone ', 'gh repo fork ', 'gh pr create', 'gh pr list', 'gh issue list'],
};

export function useAIAutoComplete(input: string, history: string[]): string {
  return useMemo(() => {
    if (!input.trim()) return '';

    // Check history first
    const historyMatch = history
      .slice()
      .reverse()
      .find((h) => h.startsWith(input) && h !== input);
    if (historyMatch) return historyMatch.slice(input.length);

    // Check command completions
    const firstWord = input.split(' ')[0].toLowerCase();
    const completions = COMMAND_COMPLETIONS[firstWord];
    if (completions) {
      const match = completions.find((c) => c.startsWith(input) && c !== input);
      if (match) return match.slice(input.length);
    }

    // Prefix match on all known completions
    const allCompletions = Object.values(COMMAND_COMPLETIONS).flat();
    const match = allCompletions.find((c) => c.startsWith(input) && c !== input);
    if (match) return match.slice(input.length);

    return '';
  }, [input, history]);
}
