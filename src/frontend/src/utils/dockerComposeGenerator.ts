import type { RepoAnalysis } from './setupScriptGenerator';

export function generateDockerCompose(repoName: string, analysis: RepoAnalysis): string | null {
  if (!analysis.hasDocker && !analysis.hasDockerCompose) return null;

  const appName = repoName.split('/')[1] || 'app';
  const port = analysis.hasPackageJson ? '3000' : analysis.hasRequirements ? '8000' : '8080';

  const services: string[] = [];

  // Main app service
  const appService = [
    `  ${appName}:`,
    `    build: .`,
    `    ports:`,
    `      - "${port}:${port}"`,
    `    environment:`,
  ];

  if (analysis.envVars.length > 0) {
    for (const v of analysis.envVars.slice(0, 10)) {
      appService.push(`      - ${v}=\${${v}}`);
    }
  } else {
    appService.push(`      - NODE_ENV=development`);
  }

  appService.push(`    restart: unless-stopped`);
  services.push(appService.join('\n'));

  // Detect if needs a database
  const needsPostgres = analysis.envVars.some(v =>
    v.toLowerCase().includes('postgres') || v.toLowerCase().includes('database_url') || v.toLowerCase().includes('db_')
  );
  const needsRedis = analysis.envVars.some(v => v.toLowerCase().includes('redis'));
  const needsMongo = analysis.envVars.some(v => v.toLowerCase().includes('mongo'));

  if (needsPostgres) {
    services.push([
      `  postgres:`,
      `    image: postgres:15-alpine`,
      `    environment:`,
      `      - POSTGRES_DB=app`,
      `      - POSTGRES_USER=postgres`,
      `      - POSTGRES_PASSWORD=postgres`,
      `    ports:`,
      `      - "5432:5432"`,
      `    volumes:`,
      `      - postgres_data:/var/lib/postgresql/data`,
    ].join('\n'));
  }

  if (needsRedis) {
    services.push([
      `  redis:`,
      `    image: redis:7-alpine`,
      `    ports:`,
      `      - "6379:6379"`,
    ].join('\n'));
  }

  if (needsMongo) {
    services.push([
      `  mongodb:`,
      `    image: mongo:6`,
      `    ports:`,
      `      - "27017:27017"`,
      `    volumes:`,
      `      - mongo_data:/data/db`,
    ].join('\n'));
  }

  const volumes: string[] = [];
  if (needsPostgres) volumes.push('  postgres_data:');
  if (needsMongo) volumes.push('  mongo_data:');

  const lines = [
    `version: '3.8'`,
    ``,
    `services:`,
    services.join('\n\n'),
  ];

  if (volumes.length > 0) {
    lines.push('');
    lines.push('volumes:');
    lines.push(volumes.join('\n'));
  }

  return lines.join('\n');
}
