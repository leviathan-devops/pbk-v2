/**
 * Headed-TUI registry for container-testing setup.
 *
 * Setup is NOT hardcoded to omp. A caller picks a preset (`tui=mimo`),
 * a host binary (`tui=grok`), or a raw command (`tuiCommand="my-tui --foo"`).
 * Unknown names loud-fail with the known list — never a silent omp fallback.
 */
export const CT_IMAGE_OMP = "pbk:master";
export const CT_IMAGE_MIMO = "mimo-ct:master";

export interface TuiBind {
  host: string;
  container: string;
}

export interface TuiPreset {
  id: string;
  aliases: readonly string[];
  image: string;
  command: string;
  workdir: string;
  binds: readonly TuiBind[];
  notes: string;
}

export const TUI_PRESETS: Record<string, TuiPreset> = {
  omp: {
    id: "omp",
    aliases: ["pi", "oh-my-pi", "oh-my-pi-omp"],
    image: CT_IMAGE_OMP,
    command: "TERM=xterm-256color omp",
    workdir: "/workspace",
    binds: [],
    notes: "In-image on runtime-grade-container-sandbox:master (/root/.bun/bin/omp). pi is the same binary on this host.",
  },
  pi: {
    id: "pi",
    aliases: ["oh-my-pi"],
    image: CT_IMAGE_OMP,
    command: "TERM=xterm-256color omp",
    workdir: "/workspace",
    binds: [],
    notes: "Oh-My-Pi runtime is omp on this device — same image, same binary.",
  },
  opencode: {
    id: "opencode",
    aliases: ["open-code"],
    image: CT_IMAGE_OMP,
    command: "TERM=xterm-256color opencode",
    workdir: "/workspace",
    binds: [],
    notes: "In-image at /usr/local/bin/opencode on runtime-grade-container-sandbox:master.",
  },
  mimo: {
    id: "mimo",
    aliases: ["mimocode", "mimo-code"],
    image: CT_IMAGE_MIMO,
    command: "mimo",
    workdir: "/root/MIMOCODE_WORKSPACE",
    binds: [],
    notes: "In-image on mimo-ct:master (/root/.mimocode/bin/mimo).",
  },
  mimocode: {
    id: "mimocode",
    aliases: ["mimo"],
    image: CT_IMAGE_MIMO,
    command: "mimo",
    workdir: "/root/MIMOCODE_WORKSPACE",
    binds: [],
    notes: "Alias of mimo — same image and binary.",
  },
  qwen: {
    id: "qwen",
    aliases: ["qwen-code", "qwencode"],
    image: CT_IMAGE_OMP,
    command: "PATH=/opt/qwen-global/bin:$PATH bun /opt/qwen-global/lib/node_modules/@qwen-code/qwen-code/cli-entry.js",
    workdir: "/workspace",
    binds: [{ host: "/home/leviathan/.npm-global", container: "/opt/qwen-global" }],
    notes: "Host Qwen Code CLI bind-mounted from ~/.npm-global; bun runs the node entry inside the omp sandbox image.",
  },
  "qwen-code": {
    id: "qwen-code",
    aliases: ["qwen"],
    image: CT_IMAGE_OMP,
    command: "PATH=/opt/qwen-global/bin:$PATH bun /opt/qwen-global/lib/node_modules/@qwen-code/qwen-code/cli-entry.js",
    workdir: "/workspace",
    binds: [{ host: "/home/leviathan/.npm-global", container: "/opt/qwen-global" }],
    notes: "Alias of qwen.",
  },
  grok: {
    id: "grok",
    aliases: ["grok-build", "grok-tui"],
    image: CT_IMAGE_OMP,
    command: "grok",
    workdir: "/workspace",
    binds: [{ host: "/home/leviathan/.grok/downloads/grok-1.0.25-linux-x86_64", container: "/usr/local/bin/grok" }],
    notes: "Static Grok Build TUI binary bind-mounted into the omp sandbox image.",
  },
  "grok-build": {
    id: "grok-build",
    aliases: ["grok"],
    image: CT_IMAGE_OMP,
    command: "grok",
    workdir: "/workspace",
    binds: [{ host: "/home/leviathan/.grok/downloads/grok-1.0.25-linux-x86_64", container: "/usr/local/bin/grok" }],
    notes: "Alias of grok.",
  },
};

export interface TuiResolved {
  id: string;
  image: string;
  command: string;
  workdir: string;
  binds: TuiBind[];
  source: "preset" | "custom-command" | "host-binary";
  notes: string;
}

export function listTuiIds(): string[] {
  return Object.keys(TUI_PRESETS).sort();
}

export function formatTuiCatalog(): string {
  const lines = Object.values(TUI_PRESETS).map((p) =>
    `- ${p.id} aliases=[${p.aliases.join(",")}] image=${p.image} cmd=${JSON.stringify(p.command)} — ${p.notes}`,
  );
  return `CT TUIS (${lines.length} presets):\n${lines.join("\n")}\nCustom: pass tuiCommand=\"<any headed command>\" and optional image=. Unknown tui names loud-fail — never silently fall back to omp.`;
}

function lookupPreset(name: string): TuiPreset | null {
  const key = name.trim().toLowerCase();
  if (TUI_PRESETS[key]) return TUI_PRESETS[key];
  for (const p of Object.values(TUI_PRESETS)) {
    if (p.aliases.some((a) => a.toLowerCase() === key)) return p;
  }
  return null;
}

export function resolveTui(input: {
  tui?: string;
  tuiCommand?: string;
  image?: string;
  hostBinary?: string | null;
}): { ok: true; value: TuiResolved } | { ok: false; error: string } {
  const custom = (input.tuiCommand ?? "").trim();
  if (custom.length > 0) {
    return {
      ok: true,
      value: {
        id: "custom",
        image: (input.image ?? "").trim() || CT_IMAGE_OMP,
        command: custom,
        workdir: "/workspace",
        binds: [],
        source: "custom-command",
        notes: "Raw tuiCommand — caller owns PATH/image contents.",
      },
    };
  }
  const name = (input.tui ?? "").trim();
  if (!name) {
    // Default remains omp ONLY when the caller omitted tui entirely.
    const p = TUI_PRESETS.omp;
    return {
      ok: true,
      value: {
        id: p.id,
        image: (input.image ?? "").trim() || p.image,
        command: p.command,
        workdir: p.workdir,
        binds: [...p.binds],
        source: "preset",
        notes: p.notes,
      },
    };
  }
  const preset = lookupPreset(name);
  if (preset) {
    return {
      ok: true,
      value: {
        id: preset.id,
        image: (input.image ?? "").trim() || preset.image,
        command: preset.command,
        workdir: preset.workdir,
        binds: [...preset.binds],
        source: "preset",
        notes: preset.notes,
      },
    };
  }
  const hostBin = input.hostBinary ?? null;
  if (hostBin && hostBin.length > 0) {
    const base = name.replace(/[^a-zA-Z0-9._+-]/g, "") || "tui";
    return {
      ok: true,
      value: {
        id: name,
        image: (input.image ?? "").trim() || CT_IMAGE_OMP,
        command: base,
        workdir: "/workspace",
        binds: [{ host: hostBin, container: `/usr/local/bin/${base}` }],
        source: "host-binary",
        notes: `Host binary ${hostBin} bind-mounted — not a named preset.`,
      },
    };
  }
  return {
    ok: false,
    error: `CT SETUP FAILED: unknown tui "${name}". Known: ${listTuiIds().join(", ")}. Pass tuiCommand= for a custom headed command, or install the binary on the host so it can be bind-mounted.`,
  };
}
