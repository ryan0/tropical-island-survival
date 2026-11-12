#!/usr/bin/env python3
"""python3 tools/ab.py <A.html> <B.html> [out.png] [views.json] [size]
Render two builds from the same camera positions (default tools/abviews.json), print how much each picture differs,
and write a sheet: A on top, B below, and the difference (x4) under that."""
import json, os, subprocess, sys
from PIL import Image, ImageChops, ImageStat
here = os.path.dirname(os.path.abspath(__file__))
A, B = sys.argv[1], sys.argv[2]; out = sys.argv[3] if len(sys.argv) > 3 else '/tmp/ab.png'
vfile = sys.argv[4] if len(sys.argv) > 4 else os.path.join(here, 'abviews.json'); size = sys.argv[5] if len(sys.argv) > 5 else '420'
for f, d in ((A, '/tmp/ab_a'), (B, '/tmp/ab_b')):      # one after the other: two software renderers at once time out
    subprocess.run(['node', os.path.join(here, 'shots.js'), f, d, vfile, '20', size], check=True)
views = [v['name'] for v in json.load(open(vfile))]
ims = [(Image.open('/tmp/ab_a/%s.png' % n).convert('RGB'), Image.open('/tmp/ab_b/%s.png' % n).convert('RGB')) for n in views]
w, h = ims[0][0].size; sheet = Image.new('RGB', (w * len(views), h * 3))
for i, (a, b) in enumerate(ims):
    d = ImageChops.difference(a, b)
    sheet.paste(a, (i * w, 0)); sheet.paste(b, (i * w, h)); sheet.paste(d.point(lambda v: min(255, v * 4)), (i * w, h * 2))
    print('%-9s mean abs diff %.2f / 255' % (views[i], sum(ImageStat.Stat(d).mean) / 3))
sheet.save(out); print(out)
