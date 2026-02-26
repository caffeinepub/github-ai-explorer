import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CodeBlock } from './CodeBlock';
import { CommitToForkButton } from './CommitToForkButton';
import { TechStackBadges } from './TechStackBadges';
import { AuthPromptDialog } from './AuthGuard';
import { getRepositoryFileTree, getFileContent } from '../services/githubApi';
import { analyzeRepo, generateSetupScript } from '../utils/setupScriptGenerator';
import { generateDockerCompose } from '../utils/dockerComposeGenerator';
import { generateSetupInstructions } from '../utils/setupInstructionsGenerator';
import { detectTechStack } from '../utils/techStackDetector';
import type { Repository, ForkResult } from '../types/github';
import { Wand2, ChevronDown, ChevronUp, AlertCircle, Key } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetMyGithubToken } from '../hooks/useQueries';
import type { CommitFile } from '../types/github';

interface AISetupAssistantProps {
  repo: Repository;
  forkedRepo?: ForkResult | null;
}

export function AISetupAssistant({ repo, forkedRepo }: AISetupAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: token } = useGetMyGithubToken();

  const [owner, repoName] = repo.full_name.split('/');

  const { data: analysisData, isLoading, error } = useQuery({
    queryKey: ['setup-analysis', repo.full_name],
    queryFn: async () => {
      const [tree, packageJson, requirements, dockerfile, envExample, readme] = await Promise.all([
        getRepositoryFileTree(owner, repoName, repo.default_branch, token),
        getFileContent(owner, repoName, 'package.json', token),
        getFileContent(owner, repoName, 'requirements.txt', token),
        getFileContent(owner, repoName, 'Dockerfile', token),
        getFileContent(owner, repoName, '.env.example', token),
        getFileContent(owner, repoName, 'README.md', token),
      ]);

      const filePaths = tree.tree.map(f => f.path);
      const analysis = analyzeRepo(filePaths, packageJson, requirements, dockerfile, envExample, readme);
      const techBadges = detectTechStack(repo.language, repo.topics, filePaths);
      const setupScript = generateSetupScript(repo.full_name, analysis);
      const dockerCompose = generateDockerCompose(repo.full_name, analysis);
      const instructions = generateSetupInstructions(repo.full_name, analysis);

      return { analysis, techBadges, setupScript, dockerCompose, instructions };
    },
    enabled: isOpen && isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  const handleOpen = () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    setIsOpen(!isOpen);
  };

  const commitFiles: CommitFile[] = analysisData ? [
    { path: 'setup.sh', content: analysisData.setupScript, message: 'Add AI-generated setup script' },
    { path: 'SETUP.md', content: analysisData.instructions, message: 'Add AI-generated setup instructions' },
    ...(analysisData.dockerCompose ? [{
      path: 'docker-compose.generated.yml',
      content: analysisData.dockerCompose,
      message: 'Add AI-generated Docker Compose file',
    }] : []),
  ] : [];

  return (
    <>
      <div className="border border-border/50 rounded-xl overflow-hidden">
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wand2 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">AI Setup Assistant</p>
              <p className="text-xs text-muted-foreground">
                Generate setup scripts, instructions & Docker Compose
              </p>
            </div>
          </div>
          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {isOpen && (
          <div className="border-t border-border/50 p-4">
            {!token && (
              <Alert className="mb-4">
                <Key className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Add a GitHub token in settings for better rate limits and private repo access.
                </AlertDescription>
              </Alert>
            )}

            {isLoading && (
              <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
                <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Analyzing repository...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm py-4">
                <AlertCircle className="w-4 h-4" />
                Failed to analyze repository. Please try again.
              </div>
            )}

            {analysisData && (
              <div className="space-y-4">
                {/* Tech Stack */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Detected Tech Stack
                  </p>
                  <TechStackBadges badges={analysisData.techBadges} size="sm" />
                  {analysisData.analysis.envVars.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Required Environment Variables
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysisData.analysis.envVars.map(v => (
                          <code key={v} className="text-xs px-2 py-0.5 rounded bg-muted font-mono text-muted-foreground">
                            {v}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="script">
                  <TabsList className="w-full">
                    <TabsTrigger value="script" className="flex-1 text-xs">Setup Script</TabsTrigger>
                    <TabsTrigger value="instructions" className="flex-1 text-xs">Instructions</TabsTrigger>
                    {analysisData.dockerCompose && (
                      <TabsTrigger value="docker" className="flex-1 text-xs">Docker Compose</TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="script" className="mt-3">
                    <CodeBlock
                      content={analysisData.setupScript}
                      language="bash"
                      filename="setup.sh"
                    />
                  </TabsContent>

                  <TabsContent value="instructions" className="mt-3">
                    <CodeBlock
                      content={analysisData.instructions}
                      language="markdown"
                      filename="SETUP.md"
                    />
                  </TabsContent>

                  {analysisData.dockerCompose && (
                    <TabsContent value="docker" className="mt-3">
                      <CodeBlock
                        content={analysisData.dockerCompose}
                        language="yaml"
                        filename="docker-compose.generated.yml"
                      />
                    </TabsContent>
                  )}
                </Tabs>

                {/* Commit to Fork */}
                {forkedRepo && token && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">
                      Commit generated files to your fork:{' '}
                      <span className="font-mono text-primary">{forkedRepo.full_name}</span>
                    </p>
                    <CommitToForkButton
                      forkOwner={forkedRepo.owner.login}
                      forkRepo={forkedRepo.full_name.split('/')[1]}
                      token={token}
                      files={commitFiles}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AuthPromptDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        actionDescription="use the AI Setup Assistant"
      />
    </>
  );
}
