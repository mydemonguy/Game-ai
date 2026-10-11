"""Pack the dino sprite frames into one WebP atlas + JSON (run with -I on the extracted png folder)."""
import sys, os, json
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
ANIMS = {'idle': ('Idle', 10), 'walk': ('Walk', 10), 'run': ('Run', 8), 'jump': ('Jump', 12), 'dead': ('Dead', 8)}
CROP = (0, 5, 665, 472)          # union of every frame's visible pixels
S = 0.5                           # 680x472 source frames -> about 200 px tall dino in the 1080p stage
fw, fh = round((CROP[2]-CROP[0])*S), round((CROP[3]-CROP[1])*S)
frames = [(a, i) for a, (n, c) in ANIMS.items() for i in range(c)]
cols = 8; rows = -(-len(frames)//cols)
atlas = Image.new('RGBA', (cols*fw, rows*fh), (0, 0, 0, 0))
meta = {'fw': fw, 'fh': fh, 'cols': cols, 'ax': round((235-CROP[0])*S), 'ay': round((424-CROP[1])*S), 'anims': {}}
for k, (a, i) in enumerate(frames):
    n, _ = ANIMS[a]
    im = Image.open(os.path.join(src, f'{n} ({i+1}).png')).convert('RGBA').crop(CROP).resize((fw, fh), Image.LANCZOS)
    atlas.paste(im, ((k % cols)*fw, (k//cols)*fh))
    meta['anims'].setdefault(a, []).append(k)
atlas.save(os.path.join(out, 'dino.webp'), 'WEBP', quality=88, method=6)
json.dump(meta, open(os.path.join(out, 'dino.json'), 'w'))
print(atlas.size, os.path.getsize(os.path.join(out, 'dino.webp')), meta['ax'], meta['ay'])
