import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';

export type TestServer = Awaited<ReturnType<typeof startServer>>;

export async function startServer(binary: string, data: string, env: NodeJS.ProcessEnv) {
  const child = spawn(binary, ['--data-dir', data, 'serve', '--bind', '127.0.0.1:0'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr = (stderr + chunk).slice(-16_384);
  });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      let stdout = '';
      const timer = setTimeout(() => finish(new Error('Server startup timed out')), 10_000);
      const onError = (error: Error) => finish(error);
      const onExit = (code: number | null) =>
        finish(new Error(`Server exited (${code}): ${stderr}`));
      const onData = (chunk: Buffer) => {
        stdout += chunk;
        const match = stdout.match(/http:\/\/127\.0\.0\.1:\d+(?=\s)/);
        if (match) finish(null, match[0]);
      };
      function finish(error: Error | null, value?: string) {
        clearTimeout(timer);
        child.off('error', onError);
        child.off('exit', onExit);
        child.stdout.off('data', onData);
        if (error) reject(error);
        else if (value) resolve(value);
      }
      child.once('error', onError);
      child.once('exit', onExit);
      child.stdout.on('data', onData);
    });
    child.stdout.resume();
    return { child, url };
  } catch (error) {
    await stopServer(child);
    throw error;
  }
}

export async function stopServer(child?: ChildProcess): Promise<number | null | undefined> {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return child?.exitCode;
  const closed = once(child, 'close');
  const timer = setTimeout(() => child.kill('SIGKILL'), 10_000);
  child.kill('SIGINT');
  try {
    return (await closed)[0];
  } finally {
    clearTimeout(timer);
  }
}
