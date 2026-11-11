import sys, json
from PIL import Image, ImageOps, ImageFilter, ImageEnhance, ImageDraw, ImageFont
src=sys.argv[1]
im=Image.open(src).convert('L')
mask=Image.open('mask.png').convert('L')
im=im.crop((150,170,650,760)); mask=mask.crop((150,170,650,760))           # head and shoulders
im=ImageOps.autocontrast(im, cutoff=2)
im=ImageEnhance.Contrast(im).enhance(1.35)
im=im.filter(ImageFilter.SHARPEN)
cols=76; w,h=im.size; rows=int(cols*h/w*0.5)
sm=im.resize((cols,rows), Image.LANCZOS)
mk=mask.resize((cols,rows), Image.LANCZOS)
ramp=" .,:;-=+*x#%@"
def build(dark):
    out=[]
    for y in range(rows):
        line=''
        for x in range(cols):
            v=sm.getpixel((x,y))/255
            # oval vignette: fade the background to blank
            fade=mk.getpixel((x,y))/255
            v = v if dark else 1-v
            v*=fade
            line+=ramp[min(len(ramp)-1,int(v*(len(ramp)-1)+0.5))]
        out.append(line.rstrip())
    return "\n".join(out)
d=build(True); l=build(False)
json.dump({"dark":d,"light":l,"cols":cols,"rows":rows},open('ascii.json','w'))
# preview
for name,txt,bg,fg in [('dark',d,(20,20,19),(250,249,245)),('light',l,(250,249,245),(20,20,19))]:
    font=ImageFont.truetype('/System/Library/Fonts/Menlo.ttc',12)
    img=Image.new('RGB',(cols*8,rows*15),bg); dr=ImageDraw.Draw(img)
    for i,line in enumerate(txt.split('\n')): dr.text((0,i*15),line,font=font,fill=fg)
    img.save(f'{name}.png')
print(rows)
