import { execFile } from "node:child_process";

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Environment variables for configuring forensic tool paths.
 *
 *   VOL3_PATH        – path to Volatility 3 vol.py (default: "vol.py")
 *   LOG2TIMELINE_PATH – path to log2timeline.py   (default: "log2timeline.py")
 *   PSORT_PATH       – path to psort.py            (default: "psort.py")
 *   MOCK_MODE        – set to "1" to skip real execution and read fixtures
 */

const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes — supertimelines may need more

/**
 * Execute a forensic CLI tool and capture its output.
 *
 * - NEVER writes to stdout (would corrupt the MCP stdio transport).
 * - Diagnostics go to stderr only.
 * - Returns structured { stdout, stderr, exitCode }.
 */
export function execForensicTool(
  command: string,
  args: string[],
  options?: { timeoutMs?: number; cwd?: string },
): Promise<ExecResult> {
  const timeout = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    const child = execFile(
      command,
      args,
      {
        maxBuffer: 256 * 1024 * 1024, // 256 MB — large tool output
        timeout,
        cwd: options?.cwd,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        if (error && !("code" in error)) {
          // Execution error (e.g. binary not found, timeout)
          resolve({
            stdout: stdout ?? "",
            stderr: stderr ?? error.message,
            exitCode: (error as NodeJS.ErrnoException).code === "ETIMEDOUT" ? 124 : 1,
          });
          return;
        }

        resolve({
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          exitCode: child.exitCode ?? 0,
        });
      },
    );
  });
}

/**
 * Resolve the path for a forensic tool binary, preferring the env var override.
 */
export function resolveToolPath(envVar: string, fallback: string): string {
  return process.env[envVar]?.trim() || fallback;
}

/**
 * Check if mock mode is enabled (for development without SIFT Workstation).
 */
export function isMockMode(): boolean {
  return process.env.MOCK_MODE === "1";
}
