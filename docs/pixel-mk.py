# Pixel portrait: python3 -I docs/pixel-mk.py <photo> <mask.png> <out-dir>
# Writes portrait.png (48 px wide, 20 colours, cut out) and portrait-og.png (9x, for the share card).
import sys
from PIL import Image, ImageEnhance, ImageFilter
src, maskp, out = sys.argv[1:4]
im = Image.open(src).convert('RGB'); mask = Image.open(maskp).convert('L').resize(im.size)
box = (140, 150, 700, 822)  # head and shoulders
im = im.crop(box); mask = mask.crop(box).filter(ImageFilter.MinFilter(13))  # pull the edge in, off the background
im = ImageEnhance.Contrast(im).enhance(1.15); im = ImageEnhance.Color(im).enhance(0.9)
cols = 48; rows = round(cols * im.height / im.width)
sm = im.resize((cols, rows), Image.BOX); mk = mask.resize((cols, rows), Image.BOX)
q = sm.quantize(colors=20, method=Image.MAXCOVERAGE, kmeans=3, dither=Image.NONE).convert('RGBA')
q.putalpha(mk.point(lambda v: 255 if v > 150 else 0))
q.save(f'{out}/portrait.png', optimize=True)
q.resize((cols * 9, rows * 9), Image.NEAREST).save(f'{out}/portrait-og.png', optimize=True)
print(cols, rows)
