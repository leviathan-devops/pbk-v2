---
name: container-virtual-display
description: Use when ANY task needs a headed GUI display inside a Docker container — Electron apps, browser rendering, visual testing, screenshot capture, or design verification. Sets up a virtual display with NVIDIA GPU WebGL (ANGLE gl-egl). The display is invisible to the host desktop.
---

# Container Virtual Display

## Overview

Creates a Docker container with a **headed virtual display** and **NVIDIA GPU WebGL**. The display runs entirely inside the container — no windows appear on the host desktop.

**Core principle:** NEVER spawn GUI apps on the host desktop. ALWAYS create the container with `--gpus all`. ALWAYS launch Electron/Chromium with the GPU flag set below. NEVER pass `--disable-gpu`. NEVER pass `--use-angle=gl` (that yields WEBGL_UNAVAILABLE).

## When to Use

- Launching an Electron app for testing
- Visual verification of a dashboard or UI
- Screenshot capture for zai-vision analysis
- Any task that says "launch", "render", "display", or "screenshot"
- Any WebGL / game / canvas workload (must render on the RTX, not CPU)

**When NOT to use:** Command-line-only tools, headless API testing, file processing.

## Quick Start

```bash
~/.config/opencode/skills/container-virtual-display/scripts/setup-display.sh my-project 6301 /absolute/path/to/project
```

This gives you:

- Container: `display-my-project` (`--gpus all`, image `runtime-grade-container-sandbox:master`)
- Display: `:0` (1920x1080) — Weston+XWayland if weston is present, else Xvfb
- CDP/debug port: 6301 → container 9222
- GPU env already required on every Electron/Chromium launch (see Launch)

## Port Allocation

Design/visual containers use port range **630X**:

| Port | Purpose |
|------|---------|
| 6301 | First design container |
| 6302 | Second design container |
| 6303 | Third design container |
| ... | Increment as needed |

## Architecture

```
┌──────────────────────────────────────────────┐
│  DOCKER CONTAINER  (--gpus all)              │
│  /dev/dri + NVIDIA EGL + 10_nvidia.json      │
│                                              │
│  dbus → Weston|Xvfb → DISPLAY=:0             │
│              │                               │
│              ▼                               │
│  Electron / Chromium                         │
│  __EGL_VENDOR_LIBRARY_FILENAMES=10_nvidia.json
│  --use-gl=angle --use-angle=gl-egl           │
│  renders WebGL on RTX 4080                   │
│                                              │
│  scrot → screenshot.png → docker cp → host   │
└──────────────────────────────────────────────┘
```

## Launch (verbatim — every Electron / Chromium start)

```bash
docker exec -d display-my-project bash -c '
  cd /app
  export DISPLAY=:0
  export ELECTRON_DISABLE_SANDBOX=1
  export __EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/10_nvidia.json
  chromium --no-sandbox --disable-dev-shm-usage --disable-gpu-sandbox \
    --use-gl=angle --use-angle=gl-egl --use-cmd-decoder=passthrough \
    --enable-webgl --ignore-gpu-blocklist --ozone-platform=x11 \
    --remote-debugging-port=9222 --window-size=1920,1080
'
```

Electron is the same env + flags, binary swapped:

```bash
docker exec -d display-my-project bash -c '
  cd /app
  export DISPLAY=:0
  export ELECTRON_DISABLE_SANDBOX=1
  export __EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/10_nvidia.json
  /app/node_modules/electron/dist/electron . --no-sandbox --disable-dev-shm-usage \
    --disable-gpu-sandbox --use-gl=angle --use-angle=gl-egl \
    --use-cmd-decoder=passthrough --enable-webgl --ignore-gpu-blocklist
'
```

The `__EGL_VENDOR_LIBRARY_FILENAMES` line is mandatory on the X11 path. Without it ANGLE binds Mesa llvmpipe (CPU). `--use-angle` MUST be `gl-egl`. `--ignore-gpu-blocklist` is mandatory (X11 blocklists WebGL1). Keep `--disable-dev-shm-usage`.

## Verify GPU (run after first launch)

```bash
docker exec display-my-project bash -c '
export __EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/10_nvidia.json
cat > /tmp/p.html <<EOF
<html><body><script>
var gl=document.createElement("canvas").getContext("webgl");
if(!gl){document.body.textContent="WEBGL_UNAVAILABLE";}
else{var e=gl.getExtension("WEBGL_debug_renderer_info");
document.body.textContent="RENDERER: "+(e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER));}
</script></body></html>
EOF
chromium --headless=new --no-sandbox --disable-dev-shm-usage --disable-gpu-sandbox \
  --use-gl=angle --use-angle=gl-egl --enable-webgl --dump-dom file:///tmp/p.html 2>/dev/null \
  | grep -o "RENDERER[^<]*\|WEBGL_UNAVAILABLE"
'
```

Pass: `RENDERER: ANGLE (NVIDIA`. Fail: `WEBGL_UNAVAILABLE`, `SwiftShader`, `llvmpipe`. On fail, the launch is wrong — do not continue.

## Screenshot

```bash
~/.config/opencode/skills/container-virtual-display/scripts/screenshot.sh display-my-project /tmp/screen.png
```

Or:

```bash
docker exec display-my-project bash -c 'DISPLAY=:0 scrot /tmp/screen.png'
docker cp display-my-project:/tmp/screen.png /tmp/screen.png
```

## Check display

```bash
docker exec display-my-project bash -c 'ls /tmp/.X11-unix/X0 && echo "DISPLAY READY" || echo "DISPLAY DOWN"'
```

## Restart display if it dies

```bash
docker exec display-my-project bash -c '
  pkill -9 weston Xvfb 2>/dev/null; sleep 2
  mkdir -p /tmp/.X11-unix; chmod 777 /tmp/.X11-unix
  export XDG_RUNTIME_DIR=/tmp HOME=/root
  eval $(dbus-launch --sh-syntax) 2>/dev/null
  if command -v weston >/dev/null; then
    weston --backend=headless-backend.so --width=1920 --height=1080 --xwayland --log=/tmp/weston.log &
  else
    Xvfb :0 -screen 0 1920x1080x24 > /tmp/xvfb.log 2>&1 &
  fi
  sleep 5
  ls /tmp/.X11-unix/X0 && echo "DISPLAY READY"
'
```

## Setup Script

`scripts/setup-display.sh <name> [port] [project-path]` does the full create:

1. `docker run -d --gpus all --name display-<name> -v <project>:/app -p <port>:9222 runtime-grade-container-sandbox:master`
2. Starts dbus + Weston (if present) or Xvfb
3. Verifies `DISPLAY=:0`
4. Prints the GPU launch command

## Critical Flags

| Flag / env | Why |
|------------|-----|
| `--gpus all` | Injects `/dev/dri` + NVIDIA EGL + `10_nvidia.json`. Without this there is no GPU. |
| `__EGL_VENDOR_LIBRARY_FILENAMES=.../10_nvidia.json` | Forces glvnd to NVIDIA EGL. Omit it and ANGLE binds Mesa llvmpipe. |
| `--use-angle=gl-egl` | NVIDIA EGL backend. `--use-angle=gl` = WEBGL_UNAVAILABLE. |
| `--use-gl=angle` | ANGLE, not native GLX. |
| `--use-cmd-decoder=passthrough` | Required with gl-egl. |
| `--enable-webgl` | Explicit enable. |
| `--ignore-gpu-blocklist` | X11 path blocklists WebGL1. |
| `--disable-gpu-sandbox` | GPU process can open `/dev/dri` as root in the container. |
| `--no-sandbox` | Required as root in container. |
| `--disable-dev-shm-usage` | Prevents `/dev/shm` exhaustion (Docker default 64MB). |
| `--ozone-platform=x11` | Headed path on DISPLAY=:0. |
| `--backend=headless-backend.so` | Weston: no physical display. |
| `--xwayland` | Weston X11 layer. NOT `--modules=xwayland.so`. |

Banned: `--disable-gpu`, `--use-gl=disabled`, `--use-angle=gl`.

## Display server

Prefer Weston + XWayland (compositor; CDP mouse reaches WebGL canvases). `runtime-grade-container-sandbox:master` ships Xvfb; setup-display.sh uses Weston when installed, otherwise Xvfb. GPU rendering works on both. Interactive CDP pointer work needs Weston.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Spawning Electron/Chromium on the host | NEVER. `docker exec` into the display container. |
| Creating the container without `--gpus all` | Recreate with `--gpus all`. Check `ls /dev/dri` inside. |
| Omitting `__EGL_VENDOR_LIBRARY_FILENAMES` | Headed WebGL becomes llvmpipe (CPU). Set the env every launch. |
| `--use-angle=gl` | Use `--use-angle=gl-egl`. |
| `--disable-gpu` | Remove it. That is software rendering. |
| Using `--modules=xwayland.so` | Use `--xwayland`. |
| Missing `/tmp/.X11-unix/` | `mkdir -p /tmp/.X11-unix` before starting the display. |
| Forgetting `ELECTRON_DISABLE_SANDBOX=1` | Electron refuses to run as root without it. |
| No dbus session | `eval $(dbus-launch --sh-syntax)` before Weston. |
