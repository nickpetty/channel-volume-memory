#!/usr/bin/env bash
# Builds dist/channel-volume-memory.zip with forward-slash paths (required by the Chrome Web Store).
set -e
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/channel-volume-memory.zip
python - <<'PY'
import os, zipfile
files = ['manifest.json', 'content.js', 'youtube-bridge.js']
files += [os.path.join('icons', f).replace(os.sep, '/') for f in sorted(os.listdir('icons'))]
with zipfile.ZipFile('dist/channel-volume-memory.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(f, f)
PY
echo "Built dist/channel-volume-memory.zip"
