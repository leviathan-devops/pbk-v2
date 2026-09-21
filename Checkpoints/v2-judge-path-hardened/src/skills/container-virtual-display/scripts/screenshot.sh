#!/bin/bash
# screenshot.sh — Capture screenshot from display container and copy to host
#
# Usage:
#   screenshot.sh <container-name> [output-path]
#
# Example:
#   screenshot.sh display-trident-dashboard /tmp/dash.png

CONTAINER="${1:?Usage: screenshot.sh <container-name> [output-path]}"
OUTPUT="${2:-/tmp/screenshot-$(date +%s).png}"

docker exec "$CONTAINER" bash -c "DISPLAY=:0 scrot /tmp/screenshot.png 2>/dev/null" && \
docker cp "$CONTAINER:/tmp/screenshot.png" "$OUTPUT" 2>/dev/null && \
echo "Screenshot saved: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))" || \
echo "Failed to capture screenshot from $CONTAINER"
