/**
 * createOmpEngineHost — the REAL EngineHost over the omp extension process.
 *
 * Extensions run in-process under Bun, so node:fs / node:child_process are
 * available directly. This is the correct omp wiring (no pi.pi.fs guessing).
 */
import * as fs from "node:fs";
import * as cp from "node:child_process";
import { createHash } from "node:crypto";
import type { EngineHost, ExecResult, StatResult } from "./host";
import type { ExtensionAPI, OmpExtensionContext } from "./types/omp";

export function createOmpEngineHost(pi: ExtensionAPI, ctx: () => OmpExtensionContext): EngineHost {
  const run = (cmd: string, opts?: { timeoutMs?: number; cwd?: string }): Promise<ExecResult> =>
    pi.exec(cmd, { timeoutMs: opts?.timeoutMs, cwd: opts?.cwd }).then((r) => ({
      code: r.exitCode ?? 0,
      stdout: r.stdout ?? "",
      stderr: r.stderr ?? "",
    }));

  const readSync = (p: string): string | null => {
    try {
      return fs.readFileSync(p, "utf8");
    } catch {
      return null;
    }
  };
  const writeSync = (p: string, c: string): void => {
    fs.mkdirSync(p.substring(0, p.lastIndexOf("/")), { recursive: true });
    fs.writeFileSync(p, c);
  };
  const existsFn = (p: string): boolean => {
    try {
      fs.statSync(p);
      return true;
    } catch {
      return false;
    }
  };

  return {
    cwd: () => ctx().cwd,
    readFileSync: readSync,
    writeFileSync: writeSync,
    existsSync: existsFn,
    statSync: (p): StatResult | null => {
      try {
        const s = fs.statSync(p);
        return { size: s.size, mtimeMs: s.mtimeMs, isFile: s.isFile(), isDir: s.isDirectory(), isSymlink: s.isSymbolicLink() };
      } catch {
        return null;
      }
    },
    listDirSync: (dir) => {
      try {
        return fs.readdirSync(dir);
      } catch {
        return [];
      }
    },
    mkdirSync: (dir) => fs.mkdirSync(dir, { recursive: true }),
    appendFileSync: (p, c) => fs.appendFileSync(p, c),
    copyFileSync: (from, to) => fs.copyFileSync(from, to),
    renameSync: (from, to) => fs.renameSync(from, to),
    rmSync: (p) => fs.rmSync(p, { recursive: true, force: true }),
    execSync: (cmd, opts) => {
      try {
        const r = cp.execSync(cmd, { encoding: "utf8", cwd: opts?.cwd, timeout: opts?.timeoutMs });
        return { code: 0, stdout: String(r), stderr: "" };
      } catch (e: any) {
        return { code: e?.status ?? 1, stdout: String(e?.stdout ?? ""), stderr: String(e?.stderr ?? e?.message ?? "") };
      }
    },
    sha256Sync: (p) => {
      try {
        return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
      } catch {
        return null;
      }
    },
    getEnv: (k) => process.env[k],
    homedir: () => process.env.HOME ?? "/root",
    tmpdir: () => "/tmp",
    pid: () => process.pid,
    getCurrentSessionModel: () => ctx().models.current() ?? null,
    readFile: async (p) => readSync(p),
    writeFile: async (p, c) => writeSync(p, c),
    exists: async (p) => existsFn(p),
    exec: run,
    glob: async (patterns) => {
      const g = pi.pi as { glob?: (ps: string[]) => Promise<string[]> };
      return g.glob ? g.glob(patterns) : [];
    },
    now: () => new Date().toISOString(),
    log: (level, category, message, data) => {
      const logger = (pi.logger ?? {}) as Record<string, unknown>;
      const msg = `[${category}] ${message}`;
      try {
        const fn = (logger[level.toLowerCase()] ?? logger.log) as ((m: string, d?: unknown) => void) | undefined;
        if (typeof fn === "function") {
          fn(msg, data);
          return;
        }
      } catch {
        /* fall through */
      }
      try {
        // eslint-disable-next-line no-console
        console.error(msg, data ?? "");
      } catch {
        /* last resort */
      }
    },
    appendEvidence: async (entry) => pi.appendEntry(`com.ct.${entry.type}`, entry.payload),
    readSessionEntry: async (customType) =>
      ctx().sessionManager
        .getBranch()
        .filter((e) => e.type === "custom" && e.customType === customType)
        .map((e) => e.data),
    realpath: async (p) => {
      try {
        return fs.realpathSync(p);
      } catch {
        return null;
      }
    },
    onSignal: (_signal, _handler) => {
      /* omp owns process signals; engine signal handlers are no-ops on this host */
    },
  };
}
