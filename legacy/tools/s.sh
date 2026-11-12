#!/bin/sh
# tools/s.sh <tag> [size=640]  - render the four sand views (/tmp/sv.json) of dist/index.html into /tmp/s_<tag>.png (2 x 2)
cd /home/claude/lagoon && python3 build.py | tail -1 && node tools/shots.js dist/index.html /tmp/s_$1 /tmp/sv.json 20 ${2:-640} | tail -1
cd /tmp/s_$1 && python3 /home/claude/lagoon/tools/sheet.py /tmp/s_$1.png 2 640 along.png across.png water.png edge.png
