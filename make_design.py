from PIL import Image, ImageDraw

DPI=300
w_in, h_in = 1.5, 0.5
W, H = int(w_in*DPI), int(h_in*DPI)  # 450x150
bleed = int(0.125*DPI)  # 37px approx, use 38
BW, BH = W+bleed*2, H+bleed*2

img = Image.new("RGB", (BW,BH), "white")
d = ImageDraw.Draw(img)
# base: red body
d.rectangle([bleed,bleed,bleed+W,bleed+H], fill=(200,10,20))
# yellow vertical bands (damru stripes)
for x0,x1 in [(0.25,0.42),(0.58,0.75)]:
    d.rectangle([bleed+W*x0,bleed,bleed+W*x1,bleed+H], fill=(250,200,10))
# shading top/bottom for round look
for y in range(H):
    # darken edges
    f = abs(y-H/2)/(H/2)  # 0 center, 1 edge
    if f>0.6:
        alpha = int((f-0.6)*120)
        d.line([bleed,bleed+y,bleed+W,bleed+y], fill=(120,0,10))
# white rope zigzag (3 lines)
import math
for k,off in enumerate([-20,0,20]):
    pts=[(bleed+i, bleed+H/2 + math.sin(i/40.0)*H*0.35 + off) for i in range(0,W+1,5)]
    d.line(pts, fill="white", width=6)
    d.line(pts, fill=(220,220,220), width=2)
# white side lacing vertical
for x in [bleed+8, bleed+W-8]:
    d.line([(x,bleed),(x,bleed+H)], fill="white", width=8)
# cut line (magenta) around trim
d.rectangle([bleed,bleed,bleed+W,bleed+H], outline=(255,0,255), width=2)

img.save("damru_keychain_1.5x0.5_300dpi.png", dpi=(300,300))
# trim-only version without bleed
trim = img.crop((bleed,bleed,bleed+W,bleed+H))
trim.save("damru_keychain_trim.png", dpi=(300,300))
print(f"saved {BW}x{BH} bleed, trim {W}x{H}")
