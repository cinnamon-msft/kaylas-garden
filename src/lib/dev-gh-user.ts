import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GhUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  location: string | null;
}

export class GhCliError extends Error {
  readonly hint?: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "GhCliError";
    this.hint = hint;
  }
}

interface ExecError extends NodeJS.ErrnoException {
  stderr?: string | Buffer;
  stdout?: string | Buffer;
}

function asString(value: string | Buffer | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.toString("utf8");
}

export async function fetchGhUser(timeoutMs = 8000): Promise<GhUser> {
  let stdout: string;
  try {
    const result = await execFileAsync("gh", ["api", "user"], {
      timeout: timeoutMs,
      env: { ...process.env, GH_PROMPT_DISABLED: "1", NO_COLOR: "1" },
      maxBuffer: 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (err) {
    const execErr = err as ExecError;
    if (execErr?.code === "ENOENT") {
      throw new GhCliError(
        "The `gh` CLI is not installed on this machine.",
        "Install it from https://cli.github.com/ (e.g. `brew install gh`) and run `gh auth login`."
      );
    }
    const stderr = asString(execErr?.stderr).trim();
    const lower = stderr.toLowerCase();
    if (
      lower.includes("authentication required") ||
      lower.includes("not logged into") ||
      lower.includes("to get started with github cli")
    ) {
      throw new GhCliError(
        "The `gh` CLI is installed but not authenticated.",
        "Run `gh auth login` on the machine running the Next.js server and try again."
      );
    }
    throw new GhCliError(
      `Failed to run \`gh api user\`: ${execErr?.message ?? "unknown error"}`,
      stderr || undefined
    );
  }

  let parsed: Partial<GhUser>;
  try {
    parsed = JSON.parse(stdout) as Partial<GhUser>;
  } catch {
    throw new GhCliError("`gh api user` returned non-JSON output.");
  }

  if (typeof parsed.id !== "number" || typeof parsed.login !== "string") {
    throw new GhCliError("`gh api user` returned an unexpected payload (missing id/login).");
  }

  return {
    id: parsed.id,
    login: parsed.login,
    name: typeof parsed.name === "string" ? parsed.name : null,
    email: typeof parsed.email === "string" ? parsed.email : null,
    avatar_url: typeof parsed.avatar_url === "string" ? parsed.avatar_url : null,
    location: typeof parsed.location === "string" ? parsed.location : null,
  };
}
