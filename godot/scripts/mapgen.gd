extends RefCounted
## Random world builder. Every new game rolls a seed; each of the six worlds is laid out as a
## Metroid-style grid of rooms from that seed: a long main route (halls, climbing shafts, two
## lockdown arenas, the ability gate and the exit), with side branches for the shrine guardian,
## save stations, energy tanks, supply caches and the hidden Starblood vault. Rooms come out in
## exactly the same format as data/rooms.json, so the rest of the game doesn't care which it got.
##
## Progression rule that keeps every seed beatable: the gate room is the only way from the first
## half of a world to the second, the shrine (whose guardian grants the ability that opens that
## gate) always hangs off the first half, and the exit always sits in the second half.

const CW := 2560
const H := 1080
const GY := 880
const MAXW := 20       # map cells: keeps a world on one map screen
const MAXH := 9

var db
var seed_: int = 1
var s: int = 1

# ---------- Park-Miller rng (the game's own) ----------
func rs(seed: int) -> void:
	s = posmod(seed, 2147483646) + 1

func rnd() -> float:
	s = (s * 16807) % 2147483647
	return float(s - 1) / 2147483646.0

func ri(a: int, b: int) -> int:
	return a + int(floor(rnd() * (b - a + 1)))

func pick(arr: Array):
	return arr[int(floor(rnd() * arr.size()))]

func shuffle(arr: Array) -> Array:
	var o = arr.duplicate()
	for i in range(o.size() - 1, 0, -1):
		var j = int(floor(rnd() * (i + 1)))
		var t = o[i]; o[i] = o[j]; o[j] = t
	return o

static func hstr(t: String) -> int:
	var h = 2166136261
	for i in t.length():
		h = h ^ t.unicode_at(i)
		h = (h * 16777619) & 0xFFFFFFFF
	return (h % 2147483646) + 1

# ---------- whole run ----------
## returns {rooms={id: room}, areas=[[ids] x6], themes=[[t0,t1,t2,t3] x6]}
func build(seed: int, db_) -> Dictionary:
	db = db_
	seed_ = seed
	rs(seed * 7 + 3)
	var pool: Array = shuffle(db.THEMES2)
	var rooms = {}
	var areas = []
	var exits = []
	var themes = []
	for a in 6:
		var th = [db.LV[a].theme]
		for k in 3:
			th.append(pool[(a * 3 + k) % pool.size()] if pool.size() else db.LV[a].theme)
		themes.append(th)
	var lay = []
	for a in 6:
		var L = null
		for attempt in 200:
			rs(seed * 131 + a * 7919 + attempt * 104729)
			L = _layout(a)
			if L != null:
				break
		if L == null:
			push_error("mapgen: world %d failed" % a)
			return {}
		lay.append(L)
		exits.append("%d-%d" % [a, L.exit])
	for a in 6:
		var L = lay[a]
		var ids = []
		for o in L.rooms:
			o.id = "%d-%d" % [a, o.k]
			o.a = a
			o.th = themes[a][o.zone]
			o.zn = _zoneName(a, o.zone, o.th)
			ids.append(o.id)
		for o in L.rooms:
			var ds = []
			for d in o.doors:
				ds.append({side=d.side, row=d.row, to="%d-%d" % [a, L.rooms[d.to].k]})
			o.doors = ds
		for o in L.rooms:
			_genRoom(o, a, L.rooms, exits)
			rooms[o.id] = o
		areas.append(ids)
	return {rooms=rooms, areas=areas, themes=themes}

func _zoneName(a: int, z: int, th: String) -> String:
	if z == 0:
		return String(db.LV[a].name)
	return String(db.THL[th].name)

# ---------- layout ----------
var R: Array
var occ: Dictionary
var bb: Array   # minx, miny, maxx, maxy

func _free(gx: int, gy: int, w: int, h: int) -> bool:
	var nx0 = min(bb[0], gx); var ny0 = min(bb[1], gy)
	var nx1 = max(bb[2], gx + w); var ny1 = max(bb[3], gy + h)
	if nx1 - nx0 > MAXW or ny1 - ny0 > MAXH:
		return false
	for x in range(gx, gx + w):
		for y in range(gy, gy + h):
			if occ.has(Vector2i(x, y)):
				return false
	return true

func _add(kind: String, gx: int, gy: int, w: int, h: int, zone: int, reg: int) -> int:
	var i = R.size()
	R.append({k=i, kind=kind, gx=gx, gy=gy, w=w, h=h, doors=[], zone=zone, reg=reg})
	for x in range(gx, gx + w):
		for y in range(gy, gy + h):
			occ[Vector2i(x, y)] = i
	bb = [min(bb[0], gx), min(bb[1], gy), max(bb[2], gx + w), max(bb[3], gy + h)]
	return i

func _slotFree(o: Dictionary, side: String, row: int) -> bool:
	for d in o.doors:
		if d.side == side and d.row == row:
			return false
	return true

## put a new room next to room pi, joined by a door. side = which side of the parent (""=any).
## needSide = which side of the NEW room the door must be on ("" = any).
func _attach(pi: int, kind: String, w: int, h: int, side: String, zone: int, reg: int) -> int:
	var P: Dictionary = R[pi]
	for t in 14:
		var sd: String = side if side != "" else ("L" if rnd() < .5 else "R")
		var rows = []
		for r in P.h:
			if _slotFree(P, sd, r) and not (P.kind == "start" and sd == "L") and not (P.kind == "boss"):
				rows.append(r)
		if rows.is_empty():
			if side != "":
				return -1
			continue
		var rp: int = pick(rows)
		var rc: int = ri(0, h - 1)
		var gx: int = P.gx + P.w if sd == "R" else P.gx - w
		var gy: int = P.gy + rp - rc
		if not _free(gx, gy, w, h):
			continue
		var j = _add(kind, gx, gy, w, h, zone, reg)
		var os = "L" if sd == "R" else "R"
		P.doors.append({side=sd, row=rp, to=j})
		R[j].doors.append({side=os, row=rc, to=pi})
		return j
	return -1

func _size(kind: String) -> Vector2i:
	match kind:
		"start": return Vector2i(2, 1)
		"hall": return Vector2i(ri(1, 3), 1)
		"shaft": return Vector2i(1, ri(3, 4))
		"gate": return Vector2i(3, 1)
		"shrine": return Vector2i(2, 1)
		_: return Vector2i(1, 1)

func _layout(a: int):
	R = []
	occ = {}
	bb = [0, 0, 0, 0]
	# main route
	var pre = ["hall", "shaft", "hall", "arena", "shaft"]
	if rnd() < .6:
		pre.insert(3, "hall" if rnd() < .5 else "shaft")
	if rnd() < .7:
		pre.append("hall")
	if rnd() < .5:
		pre.append("shaft")
	var post = ["hall", "shaft"]
	if rnd() < .6:
		post.append("hall")
	post.append("arena")
	if rnd() < .6:
		post.append("hall" if rnd() < .6 else "shaft")
	var seq = ["start"] + pre + ["gate"] + post + ["liftDown" if a < 5 else "boss"]
	var gi: int = 1 + pre.size()
	var p1: int = max(2, int(gi / 2.0))
	var p2: int = gi + 1 + int((seq.size() - gi - 1) / 2.0)
	var spine = []
	var dir = "R"
	_add("start", 0, 0, 2, 1, 0, 0)
	spine.append(0)
	for i in range(1, seq.size()):
		var kind: String = seq[i]
		var sz = _size(kind)
		var zone = 0 if i < p1 else 1 if i <= gi else 2 if i < p2 else 3
		var reg = 0 if i <= gi else 1
		var prev: int = spine[spine.size() - 1]
		var j = -1
		# boss chambers are entered from the left; otherwise keep heading the same way, turning in shafts
		var sides = ["R"] if kind == "boss" else [dir, "L" if dir == "R" else "R"]
		if R[prev].kind == "shaft" and rnd() < .45:
			sides.reverse()
		for sd in sides:
			j = _attach(prev, kind, sz.x, sz.y, sd, zone, reg)
			if j >= 0:
				dir = sd
				break
		if j < 0:
			return null
		spine.append(j)
	var exitK: int = spine[spine.size() - 1]
	# side branches
	var br = []
	if a < 5:
		br.append({path=["hall"] if rnd() < .55 else [], last="shrine", lastSide="R", reg=0})
	br.append({path=[], last="save", reg=0, early=true})
	br.append({path=[], last="save", reg=0})
	br.append({path=[], last="save", reg=1})
	br.append({path=["hall"] if rnd() < .5 else [], last="item", reg=-1, tank=0})
	br.append({path=["hall"] if rnd() < .4 else [], last="item", reg=-1, tank=1})
	br.append({path=[], last="secret", lastSide="R", reg=-1})
	for c in ri(1, 2):
		br.append({path=["hall"] if rnd() < .5 else [], last="cache", reg=-1})
	if a == 5:
		br.append({path=["shaft"], last="cache", reg=-1})
	for b in br:
		var ok = false
		for t in 40:
			var cands = []
			for o in R:
				if o.kind in ["arena", "gate", "liftDown", "boss", "save", "item", "secret", "shrine", "cache"]:
					continue
				if b.reg >= 0 and o.reg != b.reg:
					continue
				if b.get("early", false) and not (o.k in spine and spine.find(o.k) <= 4):
					continue
				cands.append(o.k)
			if cands.is_empty():
				return null
			var par: int = pick(cands)
			var made = []
			var cur = par
			var fail = false
			for kind in b.path:
				var sz = _size(kind)
				var j = _attach(cur, kind, sz.x, sz.y, "", R[cur].zone, R[cur].reg)
				if j < 0:
					fail = true
					break
				made.append(j)
				cur = j
			if not fail:
				var sz = _size(b.last)
				# lastSide is the side of the new room its door is on (shrines and vaults open to the right), so the parent's side is the opposite
				var ps = "" if not b.has("lastSide") else ("R" if b.lastSide == "L" else "L")
				var j = _attach(cur, b.last, sz.x, sz.y, ps, R[cur].zone, R[cur].reg)
				if j >= 0:
					if b.has("tank"):
						R[j].tank = b.tank
					ok = true
					break
			_undo(made)
		if not ok:
			return null
	# Malakar's throne always keeps the Rift's own look
	for o in R:
		if o.kind == "boss":
			o.zone = 0
	# normalise grid to start at 0,0
	for o in R:
		o.gx -= bb[0]
		o.gy -= bb[1]
	var arenas = 0
	for i in spine.size():
		var o = R[spine[i]]
		if o.kind == "arena":
			o.arenaN = arenas
			arenas += 1
	return {rooms=R, exit=exitK}

## remove the last rooms of a failed branch (they are always the newest ones)
func _undo(made: Array) -> void:
	made.sort()
	made.reverse()
	for j in made:
		var o = R[j]
		for x in range(o.gx, o.gx + o.w):
			for y in range(o.gy, o.gy + o.h):
				occ.erase(Vector2i(x, y))
		for q in R:
			q.doors = q.doors.filter(func(d): return d.to != j)
		R.remove_at(j)
	# bounding box only ever grows; recompute so failed branches don't eat map space
	bb = [0, 0, 0, 0]
	var first = true
	for o in R:
		if first:
			bb = [o.gx, o.gy, o.gx + o.w, o.gy + o.h]
			first = false
		else:
			bb = [min(bb[0], o.gx), min(bb[1], o.gy), max(bb[2], o.gx + o.w), max(bb[3], o.gy + o.h)]

# ---------- room contents (port of the original genRoom) ----------
func _genRoom(o: Dictionary, a: int, rooms: Array, exits: Array) -> void:
	rs(hstr(o.id) + seed_ * 31)
	var L: Dictionary = db.LV[a]
	var RW: int = o.w * CW
	var RH: int = o.h * H
	var FY: int = (o.h - 1) * H + GY
	o.RW = RW; o.RH = RH; o.FY = FY
	var S = []
	var plats = []
	var zones = []
	S.append({x=-400, y=FY, w=RW + 800, h=600, k="floor"})
	S.append({x=-400, y=-400, w=RW + 800, h=400, k="ceil"})
	for side in ["L", "R"]:
		var ds = []
		for d in o.doors:
			if d.side == side:
				ds.append(int(d.row))
		ds.sort()
		var y = -400
		var x = -400 if side == "L" else RW - 40
		for row in ds:
			var top = row * H + GY - 300
			if top > y:
				S.append({x=x, y=y, w=440, h=top - y, k="wall"})
			y = row * H + GY
			if row < o.h - 1:
				S.append({x=-400 if side == "L" else RW - 340, y=row * H + GY, w=740, h=44, k="ledge"})
		S.append({x=x, y=y, w=440, h=RH + 400 - y, k="wall"})
		for row in ds:
			zones.append([0 if side == "L" else RW - 520, 520 if side == "L" else RW])
	o.solids = S; o.plats = plats; o.zones = zones
	o.gates = []; o.cages = []; o.items = []; o.crates = []; o.coins = []; o.spawns = []; o.props = []; o.lamps = []; o.vents = []
	o.waves = null; o.station = null; o.shrine = null; o.lift = null
	var free = func(x: float) -> bool:
		for z in zones:
			if x >= z[0] - 60 and x <= z[1] + 60:
				return false
		return true
	var kind: String = o.kind
	if kind == "shaft":
		var cols = [.26, .5, .74, .5]
		var k = 0
		var y = FY - 205
		while y > GY + 60:
			var cx = cols[k % 4] * RW
			plats.append({x=round(cx - 220), y=y, w=440})
			y -= 205
			k += 1
		for d in o.doors:
			if d.row < o.h - 1:
				plats.append({x=380 if d.side == "L" else RW - 800, y=d.row * H + GY + 205, w=420})
		for row in o.h:
			o.spawns.append({t="d", x=RW * (.3 + rnd() * .4), y=row * H + GY - 330})
		o.spawns.append({t="g", x=RW * .5, y=FY})
		var k2 = a + o.k
		for row in range(o.h - 1 if a == 0 else 1, o.h):
			o.spawns.append({t="t", x=RW - 78 if k2 % 2 else 78, y=row * H + 470})
			k2 += 1
	else:
		var x = 700.0
		while x < RW - 700:
			if free.call(x) and rnd() < .75:
				var tiers = 1 + int(floor(rnd() * (2 if kind == "arena" else 3)))
				var px = x
				for t in tiers:
					var w = 240 + int(floor(rnd() * 3)) * 80
					plats.append({x=round(px), y=FY - 190 - t * 170, w=w})
					px += (-1 if rnd() < .5 else 1) * (130 + rnd() * 70)
			x += 760 + rnd() * 620
	# the hollow-sounding plate in front of a hidden vault
	for d in o.doors:
		var to = _room(rooms, d.to)
		if to != null and to.kind == "secret":
			var gx = 85 if d.side == "L" else RW - 85
			o.gates.append({kind="secret", x=gx, w=150, top=d.row * H + GY - 300, bot=d.row * H + GY, hp=2, plate=null})
	# machines, lamps and vents
	var ks: Array = db.MACH[o.th]
	var x2 = 560.0
	while x2 < RW - 560:
		if free.call(x2) and kind != "save" and kind != "secret":
			o.props.append({x=x2, k=ks[int(floor(rnd() * ks.size()))], v=int(floor(rnd() * 2)), fy=FY})
		x2 += 520 + rnd() * 620
	for row in o.h:
		var lx = 380 + rnd() * 300
		while lx < RW - 300:
			var v = rnd()
			o.lamps.append({x=lx, y=row * H + 150 + rnd() * 100, y0=row * H, fy=row * H + GY, k="alarm" if v < .18 else "broken" if v < .3 else "lamp", s=rnd()})
			lx += 640 + rnd() * 560
	var vx = 900.0
	while vx < RW - 400:
		if free.call(vx):
			o.vents.append({x=vx, t=1 + rnd() * 4, fy=FY})
		vx += 1200 + rnd() * 1200
	var sp = func(t: String, x: float):
		var fly: bool = db.ETYPES[t].get("fly", false)
		o.spawns.append({t=t, x=x, y=FY - 330 - rnd() * 120 if fly else float(FY)})
	var pool = []
	for wv in L.waves:
		for t in wv:
			if t != "B":
				pool.append(t)
	match kind:
		"start":
			if a > 0:
				o.lift = {x=420, dir=-1, to=exits[a - 1]}
			sp.call("g", RW * .62); sp.call("d", RW * .8)
			if a >= 2:
				sp.call("h", RW * .9)
			o.crates.append(RW * .42)
			o.coins.append(RW * .7)
		"save":
			o.station = {x=RW * .5}
			plats.clear()
		"item":
			var t: String = db.TANKS[a][int(o.get("tank", 0))]
			var tid = "%d-%d" % [a, int(o.get("tank", 0))]
			plats.clear()
			if t == "high":
				plats.append({x=RW * .5 - 130, y=GY - 410, w=260, iso=1})
				o.items.append({type="tank", id=tid, x=RW * .5, y=GY - 480, cage=-1})
			else:
				o.cages.append({x=RW * .5, kind=t})
				o.items.append({type="tank", id=tid, x=RW * .5, y=GY - 80, cage=0})
			sp.call("d", RW * .7)
		"shrine":
			o.shrine = {x=520, ab=db.ABIL[a].id}
			sp.call("g", RW * .55); sp.call("g", RW * .75); sp.call("d", RW * .65)
			o.crates.append(RW * .35)
			o.coins.append(RW * .45)
			var ex = RW * .86
			plats.assign(plats.filter(func(p): return absf(p.x + p.w / 2.0 - ex) > 500))
			plats.append({x=ex - 400, y=FY - 190, w=240})
			plats.append({x=ex - 130, y=FY - 380, w=260})
			o.items.append({type="egg", id="egg%d" % a, x=ex, y=GY - 470, cage=-1})
		"arena":
			var n: int = L.waves.size()
			var cut = 2 if n > 3 else 1
			o.waves = L.waves.slice(0, cut) if int(o.get("arenaN", 0)) == 0 else L.waves.slice(cut)
			plats.assign(plats.filter(func(p): return p.y < GY - 300))
		"gate":
			if a < 5:
				var g = _mkGate(db.ABIL[a].gate, round(RW * .5))
				o.gates.append(g)
				if g.kind == "laser":
					o.items.append({type="shard", id=null, x=g.x - 320, y=GY - 80, cage=-1})
					o.items.append({type="shard", id=null, x=g.x - 420, y=GY - 80, cage=-1})
				var clear = 900 if g.kind == "ledge" else 600
				plats.assign(plats.filter(func(p): return absf(p.x + p.w / 2.0 - g.x) > clear))
			_hallSpawns(o, RW, pool, sp, free)
			o.crates.append(RW * .18)
			o.crates.append(RW * .8)
			o.coins.append(RW * .32)
		"hall":
			_hallSpawns(o, RW, pool, sp, free)
			for c in ri(0, 2):
				var cx = 700 + rnd() * (RW - 1400)
				if free.call(cx):
					o.crates.append(cx)
			if rnd() < .5:
				o.coins.append(RW * (.3 + rnd() * .4))
		"cache":
			plats.clear()
			for f in [.3, .45, .7]:
				o.crates.append(RW * f)
			o.coins.append(RW * .55)
			o.items.append({type=pick(["med", "fang", "shield", "fruit"]), id=null, x=RW * .82, y=GY - 90, cage=-1})
			if rnd() < .6:
				sp.call("d", RW * .6)
		"liftDown":
			o.lift = {x=RW * .5, dir=1, to="%d-0" % (a + 1)}
			plats.clear()
		"boss":
			plats.clear()
		"secret":
			plats.clear()
			o.props.clear()
			o.items.append({type="lore", id="lore%d" % a, x=RW * .36, y=GY - 150, cage=-1})
			o.items.append({type="sfang", id="sfang%d" % a, x=RW * .64, y=GY - 170, cage=-1})
			o.coins.append(RW * .5)
	if kind == "shaft":
		o.coins.append(RW * .5)
	o.erase("reg"); o.erase("zone"); o.erase("tank"); o.erase("arenaN")

func _room(rooms: Array, id: String):
	for q in rooms:
		if q.id == id:
			return q
	return null

func _hallSpawns(o: Dictionary, RW: int, pool: Array, sp: Callable, free: Callable) -> void:
	var n = o.w * 2 + ri(0, 1)
	var heavy = 0
	for i in n:
		var x = 800 + (RW - 1600) * (i + .3 + rnd() * .4) / n
		if not free.call(x):
			continue
		var t: String = pick(pool)
		if t == "b":
			heavy += 1
			if heavy > 1:
				t = "g"
		sp.call(t, x)

func _mkGate(kind: String, x: float) -> Dictionary:
	var g = {kind=kind, x=x, top=0, bot=null, hp=null, plate=null}
	match kind:
		"crack": g.w = 80
		"ledge":
			g.w = 150; g.top = GY - 330
		"laser": g.w = 46
		"blast":
			g.w = 90; g.plate = x - 300
		_:
			g.w = 96; g.hp = 4
	return g
