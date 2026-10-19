#!/usr/bin/env python3
"""Draw the capsule elevator sprites (neutral steel; the game tints lights per world).
usage: make_lift_art.py <godot project dir>"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(sys.argv[1], 'assets', 'tex')
S = 3  # supersample

INK = (20, 23, 28, 255)
HI = (232, 238, 246, 255)
LT = (196, 205, 218, 255)
MD = (146, 156, 172, 255)
DK = (92, 101, 116, 255)
DD = (52, 58, 70, 255)
SLOT = (14, 18, 26, 255)
HZY = (255, 196, 64, 255)

def canvas(w, h):
    im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)

def R(d, box, fill, r=0, outline=INK, wdt=3):
    x0, y0, x1, y1 = [v * S for v in box]
    if r:
        d.rounded_rectangle((x0, y0, x1, y1), radius=r * S, fill=fill, outline=outline, width=wdt * S if outline else 0)
    else:
        d.rectangle((x0, y0, x1, y1), fill=fill, outline=outline, width=wdt * S if outline else 0)

def P(d, pts, fill, outline=INK, wdt=3):
    d.polygon([(x * S, y * S) for x, y in pts], fill=fill)
    if outline:
        d.line([(x * S, y * S) for x, y in pts + [pts[0]]], fill=outline, width=wdt * S, joint='curve')

def E(d, box, fill, outline=INK, wdt=3):
    d.ellipse([v * S for v in box], fill=fill, outline=outline, width=wdt * S if outline else 0)

def bolt(d, x, y, r=4):
    E(d, (x - r, y - r, x + r, y + r), LT, INK, 2)
    E(d, (x - r + 2, y - r + 1, x, y - 1), HI, None)

def save(im, name, w, h):
    im = im.resize((w, h), Image.LANCZOS)
    im.save(os.path.join(OUT, name))
    print(name, im.size)

# ---------- cap: the heavy housing over the tube ----------
W, H = 320, 130
im, d = canvas(W, H)
# side fins
P(d, [(34, 52), (4, 40), (4, 86), (34, 92)], DK)
P(d, [(W - 34, 52), (W - 4, 40), (W - 4, 86), (W - 34, 92)], DK)
R(d, (4, 56, 16, 74), DD, 0, None)
R(d, (W - 16, 56, W - 4, 74), DD, 0, None)
# top plate and antenna stubs
R(d, (98, 4, 222, 30), MD, 8)
R(d, (110, 8, 210, 14), LT, 3, None)
for x in (118, 202):
    R(d, (x - 5, 0, x + 5, 10), DK, 2, INK, 2)
# main body
R(d, (26, 22, W - 26, 100), MD, 22)
R(d, (40, 28, W - 40, 44), LT, 10, None)
R(d, (40, 30, W - 40, 34), HI, 3, None)
# vents on both sides
for i in range(4):
    y = 54 + i * 9
    R(d, (46, y, 92, y + 4), DD, 2, None)
    R(d, (W - 92, y, W - 46, y + 4), DD, 2, None)
# gem socket (the gem itself is its own sprite so it can change colour)
E(d, (W / 2 - 30, 34, W / 2 + 30, 94), DK)
E(d, (W / 2 - 22, 42, W / 2 + 22, 86), SLOT, INK, 2)
for x in (110, W - 110):
    bolt(d, x, 64)
# bottom lip with emitter slots
R(d, (46, 94, W - 46, 122), DK, 8)
R(d, (58, 100, W - 58, 106), LT, 3, None)
for i in range(7):
    x = 78 + i * 28
    R(d, (x, 110, x + 16, 116), SLOT, 2, None)
save(im, 'lift2_cap.png', W, H)

# ---------- gem ----------
W = H = 48
im, d = canvas(W, H)
E(d, (2, 2, 46, 46), (210, 214, 222, 255), INK, 2)
E(d, (8, 8, 40, 40), (238, 240, 245, 255), None)
E(d, (12, 10, 24, 20), (255, 255, 255, 255), None)
save(im, 'lift2_gem.png', W, H)

# ---------- base pad: sits in the floor, top surface level with it ----------
W, H = 340, 96
im, d = canvas(W, H)
R(d, (6, 18, W - 6, 96), DD, 6)                      # footing sunk into the floor
P(d, [(22, 10), (W - 22, 10), (W - 8, 40), (8, 40)], MD)
R(d, (40, 0, W - 40, 16), LT, 8)                     # pad lip the dino stands on
R(d, (60, 4, W - 60, 10), SLOT, 3, None)             # emitter ring (light comes out here)
band = Image.new('RGBA', im.size, (0, 0, 0, 0))
bd = ImageDraw.Draw(band)
for i in range(-2, 22):                              # hazard stripes, clipped to the band
    x = 14 + i * 16
    P(bd, [(x, 58), (x + 8, 58), (x + 18, 40), (x + 10, 40)], HZY, None)
mask = Image.new('L', im.size, 0)
ImageDraw.Draw(mask).rectangle((14 * S, 40 * S, (W - 14) * S, 58 * S), fill=255)
R(d, (14, 40, W - 14, 58), (40, 40, 44, 255), 0)
im.paste(band, (0, 0), Image.composite(band, Image.new('RGBA', im.size, (0, 0, 0, 0)), mask).split()[3])
d = ImageDraw.Draw(im)
R(d, (14, 40, W - 14, 58), None, 0)
for x in (30, W - 30):
    bolt(d, x, 76, 5)
R(d, (60, 68, W - 60, 84), DK, 4)
for i in range(6):
    R(d, (76 + i * 34, 72, 96 + i * 34, 80), SLOT, 2, None)
save(im, 'lift2_base.png', W, H)

# ---------- glass tube: back half (behind the dino) ----------
W, H = 230, 340
im, d = canvas(W, H)
for y in range(H * S):
    t = y / (H * S)
    a = int(150 - 40 * t)
    d.line([(0, y), (W * S, y)], fill=(16, 26, 40, a))
for x in (40, 115, 190):
    d.rectangle(((x - 1) * S, 0, (x + 1) * S, H * S), fill=(120, 160, 200, 40))
for y in range(24, H, 52):
    d.rectangle((6 * S, y * S, (W - 6) * S, (y + 2) * S), fill=(120, 160, 200, 28))
save(im, 'lift2_tubeback.png', W, H)

# ---------- glass tube: front (drawn over the dino, mostly clear) ----------
im, d = canvas(W, H)
d.rectangle((0, 0, W * S, H * S), fill=(170, 225, 255, 22))
for (x0, x1, a) in ((22, 46, 70), (54, 60, 50), (W - 30, W - 18, 40)):
    d.rectangle((x0 * S, 0, x1 * S, H * S), fill=(235, 250, 255, a))
d.rectangle((0, 0, 8 * S, H * S), fill=(120, 170, 210, 120))
d.rectangle(((W - 8) * S, 0, W * S, H * S), fill=(60, 90, 130, 140))
d.rectangle((0, 0, 3 * S, H * S), fill=INK)
d.rectangle(((W - 3) * S, 0, W * S, H * S), fill=INK)
# two thin retaining bands
for y in (H * .34, H * .67):
    d.rectangle((0, int(y * S), W * S, int((y + 6) * S)), fill=(150, 160, 176, 200))
    d.rectangle((0, int(y * S), W * S, int((y + 2) * S)), fill=(230, 236, 244, 200))
save(im, 'lift2_glass.png', W, H)

# ---------- shaft: recessed track running up the wall (tiles vertically) ----------
W, H = 200, 128
im, d = canvas(W, H)
d.rectangle((0, 0, W * S, H * S), fill=(30, 33, 40, 255))
d.rectangle((36 * S, 0, (W - 36) * S, H * S), fill=(16, 18, 24, 255))
for y in range(0, H, 16):                            # slats
    d.rectangle((40 * S, y * S, (W - 40) * S, (y + 9) * S), fill=(44, 48, 58, 255))
    d.rectangle((40 * S, y * S, (W - 40) * S, (y + 2) * S), fill=(70, 76, 90, 255))
for x0 in (0, W - 34):                               # side rails
    d.rectangle((x0 * S, 0, (x0 + 34) * S, H * S), fill=(96, 104, 118, 255))
    d.rectangle(((x0 + 4) * S, 0, (x0 + 10) * S, H * S), fill=(150, 158, 172, 255))
    d.rectangle(((x0 + 30) * S, 0, (x0 + 34) * S, H * S), fill=INK)
    for y in (24, 88):
        bolt(d, x0 + 20, y, 5)
d.rectangle((34 * S, 0, 37 * S, H * S), fill=INK)
d.rectangle(((W - 37) * S, 0, (W - 34) * S, H * S), fill=INK)
save(im, 'lift2_shaft.png', W, H)
