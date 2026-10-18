#!/usr/bin/env python3
"""Import extra world tile sets (the Aetherfall-Random pack) into the Godot project.

usage: import_tilesets.py <pack dir with NN-key folders and README.txt> <godot project dir>

Copies every tile into assets/tex/ (same flat naming as the original six worlds) and writes
data/themes2.json with what the game needs to draw a room in that theme: colours for the sky,
skyline and glow lines, a palette, ambient light + weather, floating motes, and texture metadata
(where the windows and lamps on each wall panel and machine glow).
"""
import json, os, re, shutil, sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, PROJ = sys.argv[1], sys.argv[2]
TEX = os.path.join(PROJ, 'assets', 'tex')
META = json.load(open(os.path.join(TEX, 'meta.json')))
OLD = META['themes']

LIGHT = {'violet': '#b48cff', 'lime': '#c6ff4a', 'pink': '#ff6ad5', 'green': '#4aff8a', 'teal': '#3affd8',
         'gold': '#ffcc4a', 'red': '#ff4a4a', 'indigo': '#8a7aff', 'blue': '#4aa8ff', 'orange': '#ff9a3a'}

def hx(c):
    c = [max(0, min(255, int(round(v)))) for v in c[:3]]
    return '#%02x%02x%02x' % tuple(c)

def rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float)

def mix(a, b, t):
    return a * (1 - t) + b * t

def load(p):
    return np.asarray(Image.open(p).convert('RGBA')).astype(float)

def mean_opaque(a, y0=0, y1=None):
    a = a[y0:y1]
    m = a[..., 3] > 200
    if not m.any():
        return np.array([40, 40, 50.])
    return a[..., :3][m].mean(0)

def sample(a, x, y, rad=6):
    h, w = a.shape[:2]
    x0, x1, y0, y1 = int(max(0, x - rad)), int(min(w, x + rad + 1)), int(max(0, y - rad)), int(min(h, y + rad + 1))
    p = a[y0:y1, x0:x1].reshape(-1, 4)
    p = p[p[:, 3] > 128]
    if not len(p):
        return None
    # brightest, most saturated pixels in the patch are the light itself
    c = p[:, :3]
    sat = c.max(1) - c.min(1)
    k = np.argsort(-(sat * c.max(1)))[:max(3, len(c) // 8)]
    return c[k].mean(0)

def glowing(c):
    return c is not None and c.max() > 150 and (c.max() - c.min()) > 70

def detect(a, base_alpha=.55):
    """find lit windows / screens / lamps on a machine sprite"""
    c = a[..., :3]
    mx, mn = c.max(2), c.min(2)
    m = (a[..., 3] > 200) & (mx > 170) & ((mx - mn) > 90)
    lab, n = ndimage.label(m)
    out = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        area = len(xs)
        if area < 25:
            continue
        cx, cy = xs.mean(), ys.mean()
        col = c[ys, xs].mean(0)
        col = mix(col, np.array([255, 255, 255.]), .1)
        ext = max(np.ptp(xs), np.ptp(ys)) + 1
        if area < 160:
            out.append({'x': round(cx, 1), 'y': round(cy, 1), 'r': 16, 'col': hx(col), 'a': .8, 'blink': 1})
        else:
            out.append({'x': round(cx, 1), 'y': round(cy, 1), 'r': round(min(130, ext * .75 + 12), 1), 'col': hx(col), 'a': base_alpha, 'ry': None})
    out.sort(key=lambda e: -e['r'])
    return out[:4]

# ---------- read the pack README for names, light colours and sky styles ----------
readme = open(os.path.join(SRC, 'README.txt')).read()
info = {}
for m in re.finditer(r'^(\d+)-(\w+)\s+(The [^(]+?)\s+\((\w+)\)\s+(\w+) / (\w+) lights\s*\n\s+machines: ([^|]+)\| sky: (\w+) \| skyline: (\w+) \| top layer: (\w+)', readme, re.M):
    n, key, name, roman, la, lb, mach, sky, skyl, top = m.groups()
    info[key] = dict(num=int(n), name=name.strip(), roman=roman, la=la, lb=lb, sky=sky, skyline=skyl, top=top)
folders = sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d)) and re.match(r'\d+-\w+$', d))
assert len(info) == len(folders), (len(info), folders)

WEATHER = {'cryo': ('snow', 30, 0), 'blight': ('ash', -40, 0), 'abyss': ('', -26, 0), 'neon': ('rain', 0, 1)}
themes, order = {}, []
for d in folders:
    key = d.split('-', 1)[1]
    I = info[key]
    fd = os.path.join(SRC, d)
    for f in os.listdir(fd):
        if f.endswith('.png'):
            shutil.copy(os.path.join(fd, f), os.path.join(TEX, f))
    A = rgb(LIGHT[I['la']]); B = rgb(LIGHT[I['lb']])
    sky = load(os.path.join(fd, 'sky_%s.png' % key))
    far = load(os.path.join(fd, 'far_%s.png' % key))
    mid = load(os.path.join(fd, 'mid_%s.png' % key))
    gt = load(os.path.join(fd, 'gt_%s.png' % key))
    wp = load(os.path.join(fd, 'wp_%s.png' % key))
    rows = [sky[y, :, :3].mean(0) for y in (40, 470, 900)]
    lum = sky[..., :3].mean(2)
    thr = np.percentile(lum, 99.6)
    planet = sky[..., :3][lum >= thr].mean(0)
    farc, midc, gnd, metal = mean_opaque(far), mean_opaque(mid), mean_opaque(gt, 60), mean_opaque(wp)
    white, black = np.array([255, 255, 255.]), np.zeros(3)
    wkind, mv, heavy = WEATHER[I['sky']]
    amb = {'col': hx(mix(rows[0], black, .8)), 'a': .42, 'weather': wkind,
           'signs': [I['name'].replace('The ', '').upper(), 'SECTOR ' + I['roman'], 'AUTHORIZED ONLY', 'LEVEL %d' % (I['num'] - 9)]}
    if heavy:
        amb['heavy'] = 1
    if I['sky'] == 'neon':
        amb['lightning'] = hx(mix(B, white, .6))
    if I['top'] == 'abyss' or I['skyline'] == 'abyss':
        amb['search'] = hx(mix(A, white, .5))
    if I['sky'] == 'blight':
        amb['fog'] = hx(mix(metal, white, .5))
    pal = {'metal': hx(metal), 'light': hx(mix(metal, white, .45)), 'dark': hx(mix(metal, black, .55)), 'ink': hx(mix(metal, black, .85)),
           'acc': hx(A), 'acc2': hx(mix(A, white, .6)), 'scr': hx(mix(B, white, .25)), 'alt': hx(mix(metal, np.array([90, 90, 100.]), .5))}
    mote = {'col': hx(mix(B, white, .3)), 'v': mv, 'n': 50}
    # wall panels share the Iron Armory's shapes: keep its window positions, colour them from the new art
    walls = []
    for i, w0 in enumerate(OLD['armory']['walls']):
        im = load(os.path.join(fd, 'wl_%s%d.png' % (key, i)))
        em = []
        for e in w0['em']:
            c = sample(im, e['x'], e['y'], 18)
            e2 = dict(e)
            e2['col'] = hx(c) if glowing(c) else hx(B)
            em.append(e2)
        walls.append({'w': im.shape[1], 'h': im.shape[0], 'em': em, 'fans': w0['fans']})
    mach = {}
    for f in sorted(os.listdir(fd)):
        mm = re.match(r'm_%s_(\w+?)([01])\.png$' % key, f)
        if not mm:
            continue
        kind, v = mm.groups()
        im = load(os.path.join(fd, f))
        src = next((OLD[t]['mach'][kind + v] for t in OLD if kind + v in OLD[t]['mach'] and
                    (OLD[t]['mach'][kind + v]['w'], OLD[t]['mach'][kind + v]['h']) == (im.shape[1], im.shape[0])), None)
        if src:
            em = []
            for e in src['em']:
                c = sample(im, e['x'], e['y'], 6 if e.get('blink') else 16)
                e2 = dict(e)
                e2['col'] = hx(c) if glowing(c) else e['col'] if e.get('blink') else hx(A)
                em.append(e2)
        else:
            em = detect(im)
        mach[kind + v] = {'w': im.shape[1], 'h': im.shape[0], 'em': em}
    meta = {'theme': key, 'farTop': OLD['armory']['farTop'], 'midTop': OLD['armory']['midTop'], 'walls': walls, 'mach': mach}
    lv = {'name': I['name'], 'roman': I['roman'], 'theme': key, 'len': 7000 + I['num'] * 97, 'sky': [hx(c) for c in rows],
          'planet': hx(mix(planet, white, .1)), 'far': hx(farc), 'mid': hx(midc), 'gnd': hx(gnd), 'glow': hx(A),
          'machines': sorted({k[:-1] for k in mach}), 'style': {'sky': I['sky'], 'skyline': I['skyline'], 'top': I['top']}}
    themes[key] = {'lv': lv, 'pal': pal, 'amb': amb, 'mote': mote, 'meta': meta}
    order.append(key)
    print('%-10s %-26s glow %s planet %s weather %-5s machines %s' % (key, I['name'], lv['glow'], lv['planet'], wkind or '-', ','.join(lv['machines'])))

json.dump({'order': order, 'themes': themes}, open(os.path.join(PROJ, 'data', 'themes2.json'), 'w'), indent=1)
print('themes', len(order))
