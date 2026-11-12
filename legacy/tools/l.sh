#!/bin/sh
# tools/l.sh <tag>  - render the twelve light-and-sky views (/tmp/lv.json): day, golden hour, sunset, from the air
cd /home/claude/lagoon && python3 build.py | tail -1 && node tools/shots.js dist/index.html /tmp/l_$1 /tmp/lv.json 20 480 | tail -1
cd /tmp/l_$1 && python3 /home/claude/lagoon/tools/sheet.py /tmp/l_$1.png 4 400 day_sea.png day_shade.png day_beach.png day_shore.png gold_sea.png gold_shade.png gold_beach.png gold_shore.png set_sea.png set_back.png set_beach.png aerial.png
