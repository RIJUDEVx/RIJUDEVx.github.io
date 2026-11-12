# Pixel portrait: python3 -I docs/pixel-mk.py <photo> <mask.png> <out-dir>
# Writes portrait.png (128 x 128, 18 flat colours, dark outline, white ground) and
# portrait-og.png (the same, 4x, for the share card).
# To use a hand-drawn or generated avatar instead, save it over src/assets/portrait.png
# (square, ideally 128 px) and portrait-og.png (512 px); nothing else needs changing.
import sys
from PIL import Image, ImageEnhance, ImageFilter, ImageChops
src, maskp, out = sys.argv[1:4]
N = 128
im = Image.open(src).convert('RGB'); mask = Image.open(maskp).convert('L').resize(im.size)
box = (150, 130, 720, 700)  # square: head and shoulders
im = im.crop(box); mask = mask.crop(box).filter(ImageFilter.MinFilter(9))
flat = im
for _ in range(2): flat = flat.filter(ImageFilter.MedianFilter(5))  # flatten skin and cloth into paint-like areas
flat = ImageEnhance.Color(flat).enhance(1.35); flat = ImageEnhance.Contrast(flat).enhance(1.2); flat = ImageEnhance.Brightness(flat).enhance(1.06)
sm = flat.resize((N, N), Image.BOX)
mk = mask.resize((N, N), Image.BOX).point(lambda v: 255 if v > 140 else 0)
q = sm.quantize(colors=18, method=Image.MAXCOVERAGE, kmeans=4, dither=Image.NONE).convert('RGB').filter(ImageFilter.ModeFilter(3))
outline = ImageChops.subtract(mk, mk.filter(ImageFilter.MinFilter(3)))  # one dark pixel around the figure
res = Image.new('RGB', (N, N), (255, 255, 255))
res.paste(q, (0, 0), mk); res.paste((28, 20, 22), (0, 0), outline)
res.save(f'{out}/portrait.png', optimize=True)
res.resize((N * 4, N * 4), Image.NEAREST).save(f'{out}/portrait-og.png', optimize=True)
