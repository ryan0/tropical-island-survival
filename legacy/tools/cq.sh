#!/bin/sh
# tools/cq.sh <tag> [cloud picture width]  - quick cloud look: the views in /tmp/cq.json, joined into /tmp/cq_<tag>.jpg
cd /home/claude/lagoon && python3 build.py | tail -1 && LAGOON_CLOUDW=${2:-2048} node tools/shots.js dist/index.html /tmp/cq_$1 /tmp/cq.json 20 560 | tail -1
python3 - "$1" <<'PY'
import sys,json
from PIL import Image
t=sys.argv[1]
names=[v['name'] for v in json.load(open('/tmp/cq.json'))]
ims=[Image.open('/tmp/cq_%s/%s.png'%(t,n)).convert('RGB') for n in names]
w,h=ims[0].size; cols=2; rows=(len(ims)+1)//2
o=Image.new('RGB',(w*cols,h*rows))
for i,im in enumerate(ims): o.paste(im,((i%cols)*w,(i//cols)*h))
o.save('/tmp/cq_%s.jpg'%t,quality=88)
PY
