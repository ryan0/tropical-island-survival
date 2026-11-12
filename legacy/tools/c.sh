#!/bin/sh
# tools/c.sh <tag>  - render the nine cloud views (/tmp/cv.json): day, golden hour, sunset x three directions
cd /home/claude/lagoon && python3 build.py | tail -1 && node tools/shots.js dist/index.html /tmp/c_$1 /tmp/cv.json 20 520 | tail -1
cd /tmp/c_$1 && python3 /home/claude/lagoon/tools/sheet.py /tmp/c_$1.png 3 520 day1.png day2.png day3.png gold1.png gold2.png gold3.png set1.png set2.png set3.png
