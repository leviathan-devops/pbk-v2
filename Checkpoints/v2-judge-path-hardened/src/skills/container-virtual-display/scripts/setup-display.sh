#!/bin/bash
# setup-display.sh — headed virtual display + NVIDIA GPU WebGL
#
# Usage:
#   setup-display.sh <project-name> [port] [project-path]
#
# Example:
#   setup-display.sh trident-dashboard 6301 /home/leviathan/hw-rec
#
# Always: --gpus all, runtime-grade-container-sandbox:master, GPU launch flags.

set -e

PROJECT_NAME="${1:-default}"
PORT="${2:-6301}"
CONTAINER_NAME="display-${PROJECT_NAME}"
PROJECT_PATH="${3:-$(pwd)}"
IMAGE="runtime-grade-container-sandbox:master"
EGL_NVIDIA="/usr/share/glvnd/egl_vendor.d/10_nvidia.json"

echo "╔══════════════════════════════════════════════╗"
echo "║  Container Virtual Display + NVIDIA GPU      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Project:   $PROJECT_NAME"
echo "Path:      $PROJECT_PATH"
echo "Container: $CONTAINER_NAME"
echo "Port:      $PORT"
echo "Image:     $IMAGE"
echo ""

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "→ Removing existing container..."
  docker rm -f "$CONTAINER_NAME" 2>/dev/null
fi

echo "→ Creating container (--gpus all)..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --gpus all \
  -v "${PROJECT_PATH}:/app" \
  -p "${PORT}:9222" \
  "$IMAGE" \
  sleep infinity

sleep 2

if ! docker exec "$CONTAINER_NAME" bash -c 'test -e /dev/dri/renderD128 && test -f /usr/share/glvnd/egl_vendor.d/10_nvidia.json'; then
  echo "❌ GPU not injected — /dev/dri or 10_nvidia.json missing"
  docker exec "$CONTAINER_NAME" bash -c 'ls -la /dev/dri /usr/share/glvnd/egl_vendor.d/ 2>&1'
  exit 1
fi
echo "→ GPU present (/dev/dri + 10_nvidia.json)"

echo "→ Starting display..."
docker exec "$CONTAINER_NAME" bash -c '
  mkdir -p /tmp/.X11-unix
  chmod 777 /tmp/.X11-unix
  export XDG_RUNTIME_DIR=/tmp HOME=/root
  eval $(dbus-launch --sh-syntax) 2>/dev/null
  if command -v weston >/dev/null 2>&1; then
    /usr/bin/weston --backend=headless-backend.so --width=1920 --height=1080 --xwayland --log=/tmp/weston.log &
  else
    Xvfb :0 -screen 0 1920x1080x24 > /tmp/xvfb.log 2>&1 &
  fi
'

echo "→ Waiting for display..."
sleep 6

if docker exec "$CONTAINER_NAME" bash -c 'ls /tmp/.X11-unix/X0 2>/dev/null'; then
  echo "✅ DISPLAY :0 READY"
else
  echo "❌ DISPLAY FAILED"
  docker exec "$CONTAINER_NAME" bash -c 'cat /tmp/weston.log /tmp/xvfb.log 2>/dev/null | tail -20'
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  DISPLAY + GPU READY                         ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Container: $CONTAINER_NAME"
echo "║  Display:   :0 (1920x1080)"
echo "║  CDP:       $PORT → :9222"
echo "║  Project:   /app"
echo "║"
echo "║  Launch Chromium (verbatim):"
echo "║  docker exec -d $CONTAINER_NAME bash -c '"
echo "║    cd /app && export DISPLAY=:0"
echo "║    export ELECTRON_DISABLE_SANDBOX=1"
echo "║    export __EGL_VENDOR_LIBRARY_FILENAMES=$EGL_NVIDIA"
echo "║    chromium --no-sandbox --disable-dev-shm-usage \\"
echo "║      --disable-gpu-sandbox --use-gl=angle --use-angle=gl-egl \\"
echo "║      --use-cmd-decoder=passthrough --enable-webgl \\"
echo "║      --ignore-gpu-blocklist --ozone-platform=x11 \\"
echo "║      --remote-debugging-port=9222 --window-size=1920,1080'"
echo "╚══════════════════════════════════════════════╝"
