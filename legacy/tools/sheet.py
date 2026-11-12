# python3 tools/sheet.py out.png cols cellw img1 img2 ...   - contact sheet of images, each scaled to cellw wide
import sys
from PIL import Image, ImageDraw
out, cols, cw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); files = sys.argv[4:]
ims = []
for f in files:
    im = Image.open(f).convert('RGB'); im = im.resize((cw, round(im.height * cw / im.width)), Image.LANCZOS)
    ImageDraw.Draw(im).text((4, 3), f.split('/')[-1][:22], fill=(255, 255, 0)); ims.append(im)
rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
H = sum(max(i.height for i in r) for r in rows); sheet = Image.new('RGB', (cols * cw, H), (20, 20, 20)); y = 0
for r in rows:
    for k, im in enumerate(r): sheet.paste(im, (k * cw, y))
    y += max(i.height for i in r)
sheet.save(out)
