#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/channel-volume-memory.zip
powershell -NoProfile -Command "Compress-Archive -Path manifest.json,content.js,youtube-bridge.js,icons -DestinationPath dist/channel-volume-memory.zip"
echo "Built dist/channel-volume-memory.zip"
