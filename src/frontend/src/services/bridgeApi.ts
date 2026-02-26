const BRIDGE_BASE_URL = 'http://localhost:7681';

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: string;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BRIDGE_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function executeCommand(command: string): Promise<ExecuteResult> {
  const res = await fetch(`${BRIDGE_BASE_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Bridge error: ${res.status}`);
  }
  return res.json();
}

export async function streamCommand(
  command: string,
  onOutput: (line: string) => void,
  onDone: (exitCode: number) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const res = await fetch(
      `${BRIDGE_BASE_URL}/stream?command=${encodeURIComponent(command)}`,
      { signal }
    );
    if (!res.ok || !res.body) {
      throw new Error(`Bridge stream error: ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data:')) {
          onOutput(line.slice(5).trim());
        } else if (line.startsWith('exit:')) {
          onDone(parseInt(line.slice(5).trim(), 10));
        } else if (line.length > 0) {
          onOutput(line);
        }
      }
    }
    if (buffer.length > 0) onOutput(buffer);
    onDone(0);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return;
    throw err;
  }
}

export async function listDirectory(path: string): Promise<FileEntry[]> {
  const res = await fetch(
    `${BRIDGE_BASE_URL}/fs?path=${encodeURIComponent(path)}`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`Bridge fs error: ${res.status}`);
  return res.json();
}
