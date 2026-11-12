#!/bin/sh
# tools/cz.sh <tag>  - close-ups of three horizon clouds (/tmp/cz.json) by day, at golden hour and at sunset
cd /home/claude/lagoon && python3 build.py | tail -1 && node tools/shots.js dist/index.html /tmp/cz_$1 /tmp/cz.json 20 640 | tail -1
cd /tmp/cz_$1 && python3 /home/claude/lagoon/tools/sheet.py /tmp/cz_$1.png 3 640 day1.png day2.png day3.png gold1.png gold2.png gold3.png set1.png set2.png set3.png
