#!/bin/sh
# tools/g.sh <tag> [T]  - render the four photo-comparison views of dist/index.html into one sheet /tmp/g_<tag>.png
cd /home/claude/lagoon && node tools/shots.js dist/index.html /tmp/g_$1 tools/gviews.json ${2:-60.8} 520 2>&1 | tail -2
python3 tools/sheet.py /tmp/g_$1.png 4 400 /tmp/g_$1/barrel.png /tmp/g_$1/surf.png /tmp/g_$1/drone.png /tmp/g_$1/shore.png
