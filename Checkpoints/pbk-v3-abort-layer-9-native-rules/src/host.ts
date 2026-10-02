/**
 * EngineHost — the seam between CT middleware and the host runtime.
 * Extracted from engines/host.ts (interfaces only; StubHost stayed with engines).
 */
export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface StatResult {
  size: number;
  mtimeMs: number;
  isFile: boolean;
  isDir: boolean;
  isSymlink?: boolean;
}

export interface EngineHost {
  cwd(): string;
  readFileSync(p: string): string | null;
  writeFileSync(p: string, content: string): void;
  existsSync(p: string): boolean;
  statSync(p: string): StatResult | null;
  listDirSync(dir: string): string[];
  mkdirSync(dir: string): void;
  copyFileSync(from: string, to: string): void;
  renameSync(from: string, to: string): void;
  appendFileSync(p: string, content: string): void;
  rmSync(p: string): void;
  execSync(cmd: string, opts?: { timeoutMs?: number; cwd?: string }): ExecResult;
  sha256Sync(p: string): string | null;
  readFile(p: string): Promise<string | null>;
  writeFile(p: string, content: string): Promise<void>;
  exists(p: string): Promise<boolean>;
  exec(cmd: string, opts?: { timeoutMs?: number; cwd?: string }): Promise<ExecResult>;
  glob(patterns: string[]): Promise<string[]>;
  now(): string;
  log(level: "DEBUG" | "INFO" | "WARN" | "ERROR", category: string, message: string, data?: unknown): void;
  appendEvidence(entry: { type: string; payload: unknown }): Promise<void>;
  readSessionEntry(customType: string): Promise<unknown[]>;
  getEnv(key: string): string | undefined;
  homedir(): string;
  tmpdir(): string;
  pid(): number;
  getCurrentSessionModel(): unknown;
  realpath(p: string): Promise<string | null>;
  onSignal(signal: string, handler: () => void): void;
}
/** In-memory host for tests: Map-fs, recorded exec, deterministic sha256. */
export class StubHost implements EngineHost {
  private files = new Map<string, string>();
  private dirs = new Set<string>();
  public execLog: Array<{ cmd: string; opts?: { timeoutMs?: number; cwd?: string } }> = [];
  public entries: Array<{ type: string; payload: unknown }> = [];
  private env = new Map<string, string>();
  private _homedir = "/root";
  private _tmpdir = "/tmp";
  private _cwd: string;

  constructor(cwd = "/stub") {
    this._cwd = cwd;
    this.dirs.add(cwd);
  }

  /** Seed an environment variable for host().getEnv reads. */
  setEnv(key: string, value: string): void {
    this.env.set(key, value);
  }

  seed(path: string, content: string): void {
    this.files.set(path, content);
    let dir = path.substring(0, path.lastIndexOf("/"));
    while (dir && dir !== "/") { this.dirs.add(dir); dir = dir.substring(0, dir.lastIndexOf("/")); }
  }

  cwd(): string { return this._cwd; }

  readFileSync(p: string): string | null { return this.files.get(p) ?? null; }
  writeFileSync(p: string, content: string): void {
    this.files.set(p, content);
    let dir = p.substring(0, p.lastIndexOf("/"));
    while (dir && dir !== "/") { this.dirs.add(dir); dir = dir.substring(0, dir.lastIndexOf("/")); }
  }
  existsSync(p: string): boolean { return this.files.has(p) || this.dirs.has(p); }
  statSync(p: string): StatResult | null {
    if (this.files.has(p)) return { size: this.files.get(p)!.length, mtimeMs: 0, isFile: true, isDir: false, isSymlink: false };
    if (this.dirs.has(p)) return { size: 0, mtimeMs: 0, isFile: false, isDir: true, isSymlink: false };
    return null;
  }
  listDirSync(dir: string): string[] {
    const out = new Set<string>();
    for (const f of this.files.keys()) if (f.startsWith(dir + "/")) out.add(f.slice((dir + "/").length).split("/")[0]);
    for (const d of this.dirs) if (d.startsWith(dir + "/") && d !== dir) out.add(d.slice((dir + "/").length).split("/")[0]);
    return [...out].sort();
  }
  mkdirSync(dir: string): void {
    this.dirs.add(dir);
    let parent = dir.substring(0, dir.lastIndexOf("/"));
    while (parent && parent !== "/") { this.dirs.add(parent); parent = parent.substring(0, parent.lastIndexOf("/")); }
  }
  copyFileSync(from: string, to: string): void {
    const c = this.files.get(from);
    if (c === undefined) throw new Error(`ENOENT: no such file '${from}'`);
    this.writeFileSync(to, c);
  }
  renameSync(from: string, to: string): void {
    const c = this.files.get(from);
    if (c === undefined) throw new Error(`ENOENT: no such file '${from}'`);
    this.files.delete(from);
    this.writeFileSync(to, c);
  }
  appendFileSync(p: string, content: string): void {
    this.writeFileSync(p, (this.files.get(p) ?? "") + content);
  }
  rmSync(p: string): void {
    const prefix = p + "/";
    for (const f of [...this.files.keys()]) if (f === p || f.startsWith(prefix)) this.files.delete(f);
    for (const d of [...this.dirs]) if (d === p || d.startsWith(prefix)) this.dirs.delete(d);
  }
  execSync(cmd: string, opts?: { timeoutMs?: number; cwd?: string }): ExecResult {
    this.execLog.push({ cmd, opts });
    return { code: 0, stdout: `[stub-exec] ${cmd}`, stderr: "" };
  }
  sha256Sync(p: string): string | null {
    if (!this.files.has(p)) return null;
    let h = "";
    const c = this.files.get(p)!;
    for (let i = 0; i < 64; i++) h += ((c.charCodeAt(i % c.length) + i) % 16).toString(16);
    return h;
  }

  async readFile(p: string): Promise<string | null> { return this.readFileSync(p); }
  async writeFile(p: string, c: string): Promise<void> { this.writeFileSync(p, c); }
  async exists(p: string): Promise<boolean> { return this.existsSync(p); }
  async exec(cmd: string, opts?: { timeoutMs?: number; cwd?: string }): Promise<ExecResult> { return this.execSync(cmd, opts); }
  async glob(patterns: string[]): Promise<string[]> {
    const out = new Set<string>();
    for (const p of patterns) for (const f of this.files.keys()) if (f.startsWith(p.replace(/\*\*/g, "").replace(/\*/g, ""))) out.add(f);
    return [...out];
  }
  getEnv(key: string): string | undefined { return this.env.get(key); }
  homedir(): string { return this._homedir; }
  tmpdir(): string { return this._tmpdir; }
  pid(): number { return 12345; }
  getCurrentSessionModel(): unknown { return null; }
  async realpath(p: string): Promise<string | null> { return this.existsSync(p) ? p : null; }
  onSignal(_signal: string, _handler: () => void): void { /* noop — host wires signals */ }
  now(): string { return "2026-08-09T00:00:00.000Z"; }
  log(_level: string, _cat: string, _msg: string, _data?: unknown): void { /* noop */ }
  async appendEvidence(entry: { type: string; payload: unknown }): Promise<void> { this.entries.push(entry); }
  async readSessionEntry(customType: string): Promise<unknown[]> { return this.entries.filter(e => e.type === customType).map(e => e.payload); }
}
