"""Jump-reachability check for Aetherfall rooms.
Surfaces = tops of floor/ledge solids, one-way platforms and unbroken gate blocks.
From a surface you can reach another if the rise fits a jump (single, or double when owned)
and the horizontal gap fits the air time. Solids block jumping straight up through them.
usage: reach.py rooms.json [more.json...]
"""
import json, sys, math
from collections import defaultdict

H, GY = 1080, 880
G = 3300.0
SPD = 640.0 * .85           # air speed with a safety margin
V1, V2 = 1300.0, 1100.0     # Tyko
ABIL = ['dash', 'double', 'roar', 'slam', 'plasma']
GATE_AB = {'crack': 'dash', 'ledge': 'double', 'laser': 'roar', 'blast': 'slam', 'crystal': 'plasma'}
CAGE_AB = {'crack': 'dash', 'high': 'double', 'laser': 'roar', 'slam': 'slam', 'plasma': 'plasma'}

def hmax(dbl):
    h = V1 * V1 / (2 * G)
    return h + (V2 * V2 / (2 * G) if dbl else 0)

def air_time(rise, dbl):
    """time until the body comes back down to `rise` above the take-off height (rise<0 = drop)"""
    if not dbl:
        d = V1 * V1 - 2 * G * rise
        return (V1 + math.sqrt(d)) / G if d >= 0 else None
    # double jump at the apex of the first
    t1 = V1 / G; h1 = V1 * V1 / (2 * G)
    d = V2 * V2 - 2 * G * (rise - h1)
    return t1 + (V2 + math.sqrt(d)) / G if d >= 0 else None

def surfaces(o, ab):
    S = []
    blockers = []
    for s in o['solids']:
        if s['k'] in ('floor', 'ledge'):
            S.append((s['x'], s['x'] + s['w'], s['y'], s['k']))
        blockers.append((s['x'], s['x'] + s['w'], s['y'], s['y'] + s['h']))
    for p in o['plats']:
        S.append((p['x'], p['x'] + p['w'], p['y'], 'plat'))
    for g in o['gates']:
        need = GATE_AB.get(g['kind'])
        if g['kind'] == 'secret' or (need and need in ab):
            continue
        bot = g['bot'] if g.get('bot') is not None else GY
        x0, x1 = g['x'] - g['w'] / 2, g['x'] + g['w'] / 2
        blockers.append((x0, x1, g['top'], bot))
        if g['top'] > 0:
            S.append((x0, x1, g['top'], 'gate'))
    # split floors around gate blocks that reach the floor
    out = []
    for (a, b, y, k) in S:
        segs = [(a, b)]
        for (bx0, bx1, by0, by1) in blockers:
            if by0 < y < by1 + 1 or (by0 <= y - 1 and by1 >= y):
                nxt = []
                for (s0, s1) in segs:
                    if bx1 <= s0 or bx0 >= s1:
                        nxt.append((s0, s1)); continue
                    if s0 < bx0: nxt.append((s0, bx0))
                    if bx1 < s1: nxt.append((bx1, s1))
                segs = nxt
        for (s0, s1) in segs:
            if s1 - s0 > 40:
                out.append((max(s0, 0), min(s1, o['RW']), y, k))
    return [s for s in out if s[1] - s[0] > 40], blockers

def can(A, B, blockers, dbl):
    ax0, ax1, ay, _ = A
    bx0, bx1, by, bk = B
    rise = ay - by
    if rise > hmax(dbl) - 12:
        return False
    gap = max(0, bx0 - ax1, ax0 - bx1)
    t = air_time(rise, dbl)
    if t is None or gap > SPD * t:
        return False
    if rise > 0:
        # jumping up onto B: a solid lying between the two heights directly above all of A's usable span blocks it
        for (x0, x1, y0, y1) in blockers:
            if y1 <= ay and y0 >= by - 170 and y0 < ay - 10 and x0 <= ax0 and x1 >= ax1 and not (y0 == by and x0 <= bx0 and x1 >= bx1):
                if bk != 'plat' or y0 > by:
                    return False
    return True

def check(o, ab, entry_xy):
    dbl = 'double' in ab
    S, blockers = surfaces(o, ab)
    def surf_at(x, y, tol=6):
        best = None
        for i, s in enumerate(S):
            if s[0] - 30 <= x <= s[1] + 30 and abs(s[2] - y) <= tol:
                best = i
        return best
    st = surf_at(*entry_xy)
    if st is None:
        return None, S
    seen = {st}; q = [st]
    while q:
        i = q.pop()
        for j in range(len(S)):
            if j not in seen and can(S[i], S[j], blockers, dbl):
                seen.add(j); q.append(j)
    return seen, S

def door_xy(o, d):
    return (150 if d['side'] == 'L' else o['RW'] - 150, d['row'] * H + GY)

def reach_point(seen, S, x, y, dbl, slack=150):
    for i in seen:
        s = S[i]
        if s[0] - 40 <= x <= s[1] + 40 and 0 <= s[2] - y <= hmax(dbl) + slack:
            return True
    return False

def run(path):
    R = json.load(open(path))
    probs = []
    for id_, o in R.items():
        a = int(o['a'])
        base = set(ABIL[:a])                     # abilities from earlier worlds
        full = set(ABIL[:a + 1]) if a < 5 else set(ABIL)
        if not o['doors']:
            continue
        for d in o['doors']:
            for ab, tag in ((base, 'base'), (full, 'own')):
                seen, S = check(o, ab, door_xy(o, d))
                if seen is None:
                    probs.append('%s: no floor at door %s%d' % (id_, d['side'], d['row'])); break
                dbl = 'double' in ab
                for d2 in o['doors']:
                    if d2 is d: continue
                    if not reach_point(seen, S, *door_xy(o, d2), dbl, 0):
                        if o['kind'] == 'gate' and tag == 'base':
                            continue          # the ability gate is meant to stop you
                        probs.append('%s [%s] %s: door %s%d -> door %s%d unreachable (%s)' % (id_, o['kind'], tag, d['side'], d['row'], d2['side'], d2['row'], o.get('th', '')))
                if tag == 'own':
                    for it in o['items']:
                        cage = it.get('cage', -1)
                        need = None
                        if cage is not None and cage >= 0:
                            need = CAGE_AB[o['cages'][cage]['kind']]
                        elif it['type'] == 'tank' and it['y'] < GY - 300:
                            need = 'double'
                        abx = set(ABIL) if need else ab
                        sx, SS = check(o, abx, door_xy(o, d))
                        if not reach_point(sx, SS, it['x'], it['y'], 'double' in abx):
                            probs.append('%s [%s]: %s at %d,%d unreachable from %s%d' % (id_, o['kind'], it['type'], it['x'], it['y'], d['side'], d['row']))
                    for key in ('station', 'shrine', 'lift'):
                        if o.get(key):
                            if not reach_point(seen, S, o[key]['x'], o['FY'] - 10, dbl, 0):
                                probs.append('%s: %s unreachable' % (id_, key))
    return R, probs

tot = 0
for p in sys.argv[1:]:
    R, probs = run(p)
    tot += len(probs)
    print('%s rooms=%d problems=%d' % (p.split('/')[-1], len(R), len(probs)))
    for x in sorted(set(probs))[:12]:
        print('   ', x)
print('TOTAL', tot)
