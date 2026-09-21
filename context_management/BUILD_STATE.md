# BUILD_STATE
- Last successful build: 2026-09-19 01:37 UTC, 528 modules, 15.12MB
- Build system: bun build src/index.ts --outdir dist --target bun --format esm --bundle
- Deployed SHA: b10788e13e99f363 (2026-09-19 01:39)
- GI dependency: Graph_Intelligence/node_modules must exist (xstate); wiped 3x by unknown janitor
- Rebuild path: cd GI && bun install; cd trident-omp && bun run build; cp dist/index.js ~/.omp/agent/extensions/trident-omp/dist.js
