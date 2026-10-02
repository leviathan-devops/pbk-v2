/**
 * THE JUDGE ENDPOINT — LOCAL ONLY. The single source for every gate in this extension.
 *
 * WHY THIS FILE EXISTS (measured 2026-10-02):
 *   THREE judges were wired to a remote that answers HTTP 402 PAYMENT REQUIRED:
 *     ext/tool-gate.ts      (the SSTGF smoke gate + the container gate)
 *     ext/claim-bind.ts     (the claim judge — ZERO rows across 1245 firings, because of it)
 *     ext/kernel-judge.ts   (the ABIDE per-edit judge — hardcoded, with a Bearer key)
 *   And TWO escape hatches could route a judge ANYWHERE:
 *     TOOLGATE_URL          an env var with NO host validation at all
 *     TOOLGATE_ALLOW_URL=1  an explicit opt-in that disabled the host check entirely
 *
 * THE LAW: every judge is LOCAL. A judge on another machine is a judge that can be
 * unreachable, unpaid, rate-limited — and, worst of all, SILENTLY DEGRADED. The local judge
 * at 127.0.0.1:8090 is a GGUF process on this host: no key, no quota, no billing, ~100ms.
 *
 * THE GUARANTEE IS MECHANICAL, NOT PROCEDURAL: `resolveJudgeUrl` returns a loopback URL OR
 * IT DOES NOT RETURN. There is no configuration, no env var, and no opt-in that can put a
 * judge off this machine. A non-local value is REFUSED LOUDLY, never silently accepted.
 */

/** The only host a judge may live on. */
export const LOCAL_JUDGE_HOST = "127.0.0.1:8090";
export const LOCAL_JUDGE_PATH = "/v1/systemone";
export const LOCAL_JUDGE_URL = `http://${LOCAL_JUDGE_HOST}${LOCAL_JUDGE_PATH}`;

/** The loopback allowlist — the ONLY hostnames a judge URL may name. */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]", "0.0.0.0"]);

/** Is this URL a judge we are permitted to call? Loopback HTTP(S) and nothing else. */
export function isLocalJudgeUrl(raw: string | undefined | null): boolean {
  if (!raw) return false;
  try {
    const u = new URL(String(raw));
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return LOOPBACK_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Resolve a judge endpoint from an env var, LOCAL ONLY.
 *
 * - absent        -> the local judge
 * - a loopback URL -> that URL (a second local judge is permissible)
 * - ANYTHING ELSE -> REFUSED LOUDLY on stderr, and the local judge is used.
 *
 * There is deliberately NO parameter, env var, or option that returns a remote URL.
 */
export function resolveJudgeUrl(envVar: string, env: NodeJS.ProcessEnv = process.env): string {
  const raw = env[envVar];
  if (!raw) return LOCAL_JUDGE_URL;
  if (isLocalJudgeUrl(raw)) return raw;
  try {
    process.stderr.write(
      `[judge-endpoint] REFUSED: ${envVar}=${JSON.stringify(String(raw).slice(0, 120))} names a ` +
      `NON-LOCAL host. Every judge is LOCAL by law. Falling back to ${LOCAL_JUDGE_URL}.\n`,
    );
  } catch {}
  return LOCAL_JUDGE_URL;
}

/**
 * THE WARM-UP. A cold GGUF judge can take seconds on its first request; a gate that times out
 * on a cold model has failed for a reason that is not the command's fault. This probes
 * /health once and caches the result, so the FIRST judged call is not the warm-up call.
 */
let warmed = false;
export async function warmJudge(base = LOCAL_JUDGE_URL, timeoutMs = 8000): Promise<boolean> {
  if (warmed) return true;
  const health = base.replace(/\/v1\/systemone\/?$/, "/health");
  try {
    const res = await fetch(health, { signal: AbortSignal.timeout(timeoutMs) });
    warmed = res.ok;
    return res.ok;
  } catch {
    warmed = false;
    return false;
  }
}
