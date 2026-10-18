extends "res://scripts/g0_base.gd"
## layer 1: rooms at runtime – collision, doors, elevators, lockdowns, gates, saves

const GRAV := 3300.0

# ---------- simple box physics (the original used Phaser Arcade bodies the same way) ----------
var SOL: Array[Rect2] = []
var PLAT: Array[Rect2] = []
var GATEB: Array = []     # [Rect2, gate]
var PLUGS: Array[Rect2] = []
var PB = {x=0.0, y=0.0, w=84.0, h=168.0, vx=0.0, vy=0.0, grav=true, down=false, mx=3200.0, my=3200.0}

func mk_body(x: float, y: float, w: float, h: float, mx := 2400.0, my := 3200.0) -> Dictionary:
	return {x=x, y=y, w=w, h=h, vx=0.0, vy=0.0, grav=true, down=false, mx=mx, my=my}

func _ov(bx: float, by: float, bw: float, bh: float, r: Rect2) -> bool:
	return bx < r.position.x + r.size.x and bx + bw > r.position.x and by < r.position.y + r.size.y and by + bh > r.position.y

## move a body one step; returns the gate it bumped into (if any)
func move_body(b: Dictionary, dt: float, use_plats: bool, is_player: bool):
	if b.grav:
		b.vy += GRAV * dt
	b.vx = clampf(b.vx, -b.mx, b.mx)
	b.vy = clampf(b.vy, -b.my, b.my)
	b.down = false
	var hitGate = null
	var rects: Array = []
	rects.append_array(SOL)
	rects.append_array(PLUGS)
	var gates_start = rects.size()
	for g in GATEB:
		rects.append(g[0])
	# horizontal
	b.x += b.vx * dt
	for i in rects.size():
		var r: Rect2 = rects[i]
		if _ov(b.x, b.y, b.w, b.h, r):
			var pushL: float = (b.x + b.w) - r.position.x
			var pushR: float = (r.position.x + r.size.x) - b.x
			if b.vx > 0 or (b.vx == 0 and pushL < pushR):
				b.x = r.position.x - b.w
			else:
				b.x = r.position.x + r.size.x
			b.vx = 0.0
			if i >= gates_start:
				hitGate = GATEB[i - gates_start][1]
	# vertical
	var oy: float = b.y
	b.y += b.vy * dt
	for i in rects.size():
		var r: Rect2 = rects[i]
		if _ov(b.x, b.y, b.w, b.h, r):
			if b.vy >= 0 and oy + b.h <= r.position.y + 2:
				b.y = r.position.y - b.h
				b.down = true
			elif b.vy < 0 and oy >= r.position.y + r.size.y - 2:
				b.y = r.position.y + r.size.y
			elif b.vy >= 0:
				b.y = r.position.y - b.h
				b.down = true
			else:
				b.y = r.position.y + r.size.y
			b.vy = 0.0
			if i >= gates_start:
				hitGate = GATEB[i - gates_start][1]
	if use_plats and b.vy >= 0:
		for r in PLAT:
			if b.x < r.position.x + r.size.x and b.x + b.w > r.position.x and oy + b.h <= r.position.y + 1 and b.y + b.h > r.position.y:
				b.y = r.position.y - b.h
				b.vy = 0.0
				b.down = true
	return hitGate

# ---------- geometry queries ----------
func solidRects() -> Array:
	var o = []
	if ROOM:
		for g in ROOM.gates:
			if not g.broken:
				var bot: float = g.bot if g.bot != null else GY
				o.append({x=g.x - g.w / 2.0, y=g.top, w=g.w, h=bot - g.top, g=g})
	return o

func surfaceBelow(x: float, y: float) -> float:
	if ROOM == null:
		return GY
	var best = RH + 400
	for s in ROOM.solids:
		if x > s.x - 10 and x < s.x + s.w + 10 and s.y >= y - 2 and s.y < best:
			best = s.y
	for s in solidRects():
		if x > s.x - 10 and x < s.x + s.w + 10 and s.y >= y - 2 and s.y < best:
			best = s.y
	for s in ROOM.plats:
		if x > s.x - 10 and x < s.x + s.w + 10 and s.y >= y - 2 and s.y < best:
			best = s.y
	return best

func onPlatform(p) -> bool:
	if not p.ground or ROOM == null:
		return false
	for s in ROOM.plats:
		if absf(p.y - s.y) < 4 and p.x > s.x - 30 and p.x < s.x + s.w + 30:
			return true
	return false

func gateClamp(e) -> void:
	e.x = clampf(e.x, 70, RW - 70)
	for s in solidRects():
		if (e.y <= s.y + 4 and s.y > 0) or e.y - e.h >= s.y + s.h:
			continue
		var l: float = s.x - e.w / 2.0
		var r: float = s.x + s.w + e.w / 2.0
		if e.x > l and e.x < r:
			e.x = l if e.x < s.x + s.w / 2.0 else r
			e.vx = 0.0

func inSolid(x: float, y: float) -> bool:
	if ROOM == null:
		return false
	for s in ROOM.solids:
		if x > s.x and x < s.x + s.w and y > s.y and y < s.y + s.h:
			return true
	for s in solidRects():
		if x > s.x and x < s.x + s.w and y > s.y and y < s.y + s.h:
			return true
	return false

func offView(x: float, y: float) -> bool:
	return x < cam - 300 or x > cam + W + 300 or y < camY - 500 or y > camY + H + 300

func plTeleport(x: float, y: float) -> void:
	pl.body.x = x - 42; pl.body.y = y - 168; pl.body.vx = 0.0; pl.body.vy = 0.0
	pl.x = x; pl.y = y; pl.vx = 0.0; pl.vy = 0.0

func ePlace(e, x: float, y: float) -> void:
	e.x = x; e.y = y
	if e.body:
		e.body.x = x - e.w / 2.0
		e.body.y = y - e.h
		e.body.vx = 0.0
		e.body.vy = 0.0

func clearEnemies() -> void:
	en = []

func rebuild_gates() -> void:
	GATEB = []
	for g in ROOM.gates:
		if not g.broken:
			var bot: float = g.bot if g.bot != null else GY
			GATEB.append([Rect2(g.x - g.w / 2.0, g.top, g.w, bot - g.top), g])

# ---------- entering a room ----------
func rollDrop(r: Rng) -> String:
	var v = r.next()
	return "fruit" if v < .3 else "shard" if v < .54 else "coin" if v < .7 else "fang" if v < .8 else "shield" if v < .9 else "med"

func enterRoom(id: String, how: Dictionary) -> void:
	var o: Dictionary = DB.ROOMS[id].duplicate(true)
	G.lv = o.a
	ROOM = o
	RW = o.RW; RH = o.RH; FY = o.FY
	clearEnemies()
	shots = []; hz = []; spawnQ = []; picks = []; boxes = []
	lock = false; camLock = null; ally = null; PLUGS = []; boss = null
	bossDone = int(META.boss) == 1
	o.arena = null; o.bossT = 1.4
	for i in o.gates.size():
		var g: Dictionary = o.gates[i]
		g.broken = 1 if META.gates.has(o.id + ":g" + str(i)) else 0
		g.flash = 0.0
		if g.hp != null:
			g.hp = int(g.hp)
	for i in o.cages.size():
		var c: Dictionary = o.cages[i]
		c.broken = 1 if META.gates.has(o.id + ":c" + str(i)) else 0
		c.hp = 3 if c.kind == "plasma" else 1
	SOL = []
	for s in o.solids:
		SOL.append(Rect2(s.x, s.y, s.w, s.h))
	PLAT = []
	for p in o.plats:
		PLAT.append(Rect2(p.x, p.y, p.w, 26))
	rebuild_gates()
	var host: bool = NETR != "client"
	if host:
		for it in o.items:
			if it.id != null and (META.tanks.has(it.id) if it.type == "tank" else META.items.has(it.id)):
				continue
			picks.append(mk_pick(it.x, it.y, it.type, it.id, true, o.cages[int(it.cage)] if int(it.cage) >= 0 else null))
		if o.kind == "shrine" and o.a < 5 and gDone(o.a) and not META.items.has("core" + str(o.a)):
			picks.append(mk_pick(W * .33, FY - 130, "core", "core" + str(o.a), true, null))
		var r = Rng.new(hstr(o.id) + int(lvT * 1000))
		for x in o.crates:
			boxes.append({x=x, hp=2, flash=0.0, drop=rollDrop(r), drop2=rollDrop(r) if r.next() < .35 else null, id=_nid(), v=null})
		for x in o.coins:
			for k in 5:
				picks.append(mk_pick(x + k * 72 - 144, FY - 140 - sin(k / 4.0 * PI) * 170, "coin", null, true, null))
	if o.waves != null and not META.cleared.has(o.id):
		o.arena = {i=-1}
	var px: float
	var py: float
	var face = 1
	if how.has("side"):
		var d = null
		for dd in o.doors:
			if dd.side == how.side and dd.row == how.row:
				d = dd
		if d == null:
			for dd in o.doors:
				if dd.side == how.side:
					d = dd
		if d == null:
			d = o.doors[0]
		px = 150.0 if d.side == "L" else RW - 150
		py = d.row * H + GY
		face = 1 if d.side == "L" else -1
	else:
		px = how.x; py = how.y
	if o.lift != null:
		o.lift.armed = 0; o.lift.hold = 0.0
	if o.station != null:
		o.station.t = 0.0
	for v in o.vents:
		v.on = 0.0
	if pl and hasR("battery"):
		pl.en = max(pl.en, 50)
	if pl:
		plTeleport(px, py)
		pl.face = face; pl.ground = true; pl.dashT = 0.0; pl.slam = 0; pl.sup = py
	o.entry = {x=px, y=py}
	if pl2 != null and NETR == "host":
		pl2.x = clampf(px - 120 * face, 120, RW - 120)
		pl2.y = py
		netRoomEntered(pl2.x, pl2.y, face)
	if pl and host:
		for s in o.spawns:
			if o.waves != null or (o.kind == "shrine" and not gDone(o.a)):
				break
			if absf(s.x - px) < 700 and absf(s.y - py) < 400:
				continue
			var e = spawnEnemy(s.t, 1, true)
			ePlace(e, s.x, s.y)
			e.hy = s.y
			e.fade = 1.0 if s.t == "c" else 0.0
	if G.state != "menu":
		META.map[o.id] = 1
		META.areas[str(o.a)] = 1
		save_meta()
	cam = clampf(px - W * .4, 0, max(0.0, RW - W))
	camY = clampf(py - H * .66, 0, max(0.0, RH - H))
	npc = null
	if o.kind == "save" and o.station != null:
		npc = {x=o.station.x - 460, y=GY - 50, face=1, lt=0.0, line="", near=false, cool=0.6, id=_nid(), v=null}
	killAllViews()
	roomView(o)
	padAbilities()
	musicFor()

func _nid() -> int:
	eid += 1
	return eid

func mk_pick(x: float, y: float, type: String, id, float_: bool, cage) -> Dictionary:
	return {x=x, y=y, vx=0.0, vy=0.0, type=type, id=id, flt=float_, cage=cage, life=99.0, got=false, uid=_nid(), v=null}

func mk_drop(x: float, y: float, vx: float, vy: float, type: String, life: float) -> Dictionary:
	var k = mk_pick(x, y, type, null, false, null)
	k.vx = vx; k.vy = vy; k.life = life
	return k

# ---------- transitions ----------
func startTrans(act: Dictionary) -> void:
	if TRANS.on:
		return
	TRANS.on = 1; TRANS.t = 0.0; TRANS.phase = 0; TRANS.act = act
	clearInput()
	if act.has("lift"):
		sfx("lift_up" if act.lift.dir < 0 else "lift_down", null, null, 1.0, .5)
	elif act.has("travel") or act.has("rush"):
		sfx("save", null, null, 1.0, .5)
		teleFx(pl.x, pl.y, 170)
	else:
		sfx("door", null, null, 1.0, .2)

func transDur() -> float:
	var a = TRANS.act
	return 0.7 if a != null and (a.has("lift") or a.has("travel") or a.has("rush")) else 0.22

func updTrans(dt: float) -> void:
	TRANS.t += dt
	var dur = transDur()
	if TRANS.phase == 0 and TRANS.t >= dur:
		TRANS.phase = 1; TRANS.t = 0.0
		var a: Dictionary = TRANS.act
		if a.has("lift"):
			var to: Dictionary = DB.ROOMS[a.lift.to]
			var first: bool = not META.areas.has(str(to.a))
			var prev: int = G.lv
			var lx: float = to.lift.x if to.lift != null else 300.0
			enterRoom(to.id, {x=lx, y=GY})
			if first:
				META.save = {room=to.id, x=lx + 170, score=G.score}
				save_meta()
				areaIntro(prev, to.a)
		elif a.has("rush"):
			var id: String = DB.RUSH[a.rush]
			enterRoom(id, {x=600.0 if id == "5-8" else W * .72, y=GY})
			pl.hp = min(pl.max, pl.hp + pl.max * .4)
			pl.en = max(pl.en, 50)
			showBanner("Boss Rush", "Fight " + str(a.rush + 1) + " of 6", 1.8)
		elif a.has("travel"):
			var to: Dictionary = DB.ROOMS[a.travel]
			enterRoom(to.id, {x=to.station.x + 110, y=GY})
			pl.face = -1
			META.save = {room=to.id, x=to.station.x, score=G.score}
			save_meta()
			showBanner(DB.LV[to.a].name, "Fast travel", 1.8)
			teleFx(pl.x, pl.y, 170)
			ring(pl.x, pl.y - 90, "#7dffb0", 220)
		else:
			var pd = DB.partner_door(ROOM, a.door)
			var side: String = pd.side if pd != null else ("R" if a.door.side == "L" else "L")
			enterRoom(a.door.to, {side=side, row=pd.row if pd != null else 0})
	elif TRANS.phase == 1 and TRANS.t >= .25:
		TRANS.on = 0

func makePlugs() -> void:
	PLUGS = []
	for d in ROOM.doors:
		PLUGS.append(Rect2(-10.0 if d.side == "L" else RW - 40, d.row * H + GY - 310, 50, 310))

# ---------- per-frame world logic ----------
func updWorld(dt: float) -> void:
	var p = pl
	var o = ROOM
	hintT -= dt
	if p == null or o == null:
		return
	if not p.dead and not lock and not TRANS.on:
		var row = clampi(int(floor((p.y - 10) / H)), 0, o.h - 1)
		for d in o.doors:
			if d.row == row and ((d.side == "L" and p.x < 70) or (d.side == "R" and p.x > RW - 70)):
				startTrans({door=d})
				break
	if o.lift != null and not p.dead and not TRANS.on and not lock:
		var on: bool = p.ground and absf(p.x - o.lift.x) < 95 and p.y > FY - 6
		if not on:
			o.lift.armed = 1
		o.lift.hold = (o.lift.hold + dt) if (on and o.lift.armed) else 0.0
		if on and o.lift.armed and (o.lift.hold > 1.1 or P.has("down")):
			startTrans({lift=o.lift})
	# lockdown arena
	var A = o.arena
	if A != null:
		if A.i < 0 and not lock and p.x > 440 and p.x < RW - 440:
			lock = true; A.i = 0
			spawnWave(o.waves[0])
			showBanner("Lockdown", "Wave 1 of " + str(o.waves.size()), 1.4)
			sfx("warn", null, null, 1.0, .15)
			sfx("alarm", null, null, 1.0, 1.0)
			allyArena(o, 0)
		elif lock and A.i >= 0 and spawnQ.is_empty() and en.is_empty():
			A.i += 1
			if A.i < o.waves.size():
				spawnWave(o.waves[A.i])
				showBanner("Wave " + str(A.i + 1) + " of " + str(o.waves.size()), "", 1.2)
				sfx("warn", null, null, 1.0, .15)
				allyArena(o, A.i)
			else:
				lock = false; o.arena = null
				META.cleared[o.id] = 1
				addDust(10)
				save_meta()
				G.score += 500
				showBanner("Room clear", "Doors unlocked", 1.6)
				sfx("clear", null, null, 1.0, .5)
				picks.append(mk_drop(p.x + 120, p.y - 200, 120, -600, "fruit", 14))
				picks.append(mk_drop(p.x - 120, p.y - 200, -120, -600, "shard", 14))
	if lock and PLUGS.is_empty():
		makePlugs()
	elif not lock and not PLUGS.is_empty():
		PLUGS = []
	# boss chamber
	if o.kind == "boss" and not int(META.boss) and boss == null and not bossDone:
		o.bossT -= dt
		if o.bossT <= 0:
			malakarIntro()
	if bossDone and doneT > 0:
		doneT -= dt
		if doneT <= 0:
			META.boss = 1
			save_meta()
			victory()
			return
	if p.dead:
		return
	for q in players():
		if q.dead or q.dashT <= 0:
			continue
		var b = Rect2(q.x - 80, q.y - 170, 160, 170)
		for i in o.gates.size():
			var g: Dictionary = o.gates[i]
			var bot: float = g.bot if g.bot != null else GY
			if not g.broken and (g.kind == "crack" or g.kind == "secret") and overlap(b, Rect2(g.x - g.w / 2.0 - 20, g.top, g.w + 40, bot - g.top)):
				breakGate(g, i)
		for i in o.cages.size():
			var c: Dictionary = o.cages[i]
			if not c.broken and c.kind == "crack" and absf(c.x - q.x) < 110 and q.y > GY - 200:
				breakCage(c, i)
	for s in shots:
		if s.friend and s.wave:
			for i in o.gates.size():
				var g: Dictionary = o.gates[i]
				var bot: float = g.bot if g.bot != null else GY
				if not g.broken and (g.kind == "laser" or (g.kind == "secret" and s.y > g.top - 60 and s.y < bot + 60)) and absf(s.x - g.x) < s.r + 40:
					breakGate(g, i)
			for i in o.cages.size():
				var c: Dictionary = o.cages[i]
				if not c.broken and c.kind == "laser" and absf(s.x - c.x) < s.r + 60:
					breakCage(c, i)
	# the shrine's guardian wakes when Tyko walks into the arena
	if o.kind == "shrine" and not gDone(o.a) and boss == null and not lock and p.x < W * .8:
		guardianIntro(o.a)
	var sh = o.shrine
	if sh != null and sh.ab != null and gDone(o.a) and not hasAb(sh.ab) and absf(p.x - sh.x) < 90:
		grantAbility(sh.ab)
	var st = o.station
	if st != null:
		st.t -= dt
		if not lock and st.t <= 0 and absf(p.x - st.x) < 70 and p.ground:
			useStation(st)

func spawnWave(list: Array) -> void:
	for i in list.size():
		spawnQ.append({t=i * .55, type=list[i], side=-1 if i % 2 else 1})

func breakGate(g: Dictionary, i: int) -> void:
	g.broken = 1
	META.gates[ROOM.id + ":g" + str(i)] = 1
	save_meta()
	rebuild_gates()
	shake = 16
	sfx("boom", null, null, 1.0, .06)
	sfx("gate", null, null, 1.0, .2)
	buzz(40)
	var sec: bool = g.kind == "secret"
	var bt: float = g.bot if g.bot != null else GY
	var cx: float = g.x
	var cy: float = (g.top + bt) / 2.0 if g.top > 0 else GY - 400
	var col = "#ff3d3d" if g.kind == "laser" else "#ff5ad8" if g.kind == "crystal" else "#ffe08a" if sec else "#ffd27a"
	for k in (2 if sec else 4):
		burst(cx, cy - (60 if sec else 200) + k * 130, col, 18, 900)
	debris(cx, g.top if g.top > 0 else GY - 500, g.kind)
	ring(cx, cy, col, 260)
	G.score += 1000 if sec else 300
	ftext(cx + (140 if sec else 0), cy - (200 if sec else 260), "A hidden passage!" if sec else "Path open", "#ffe08a" if sec else "#7dffb0", true)
	if sec:
		sfx("item", null, null, 1.0, .5)
		Sfx.duck_for(3.2)
		hitStop = .2

func breakCage(c: Dictionary, i: int) -> void:
	c.broken = 1
	META.gates[ROOM.id + ":c" + str(i)] = 1
	save_meta()
	shake = 8
	sfx("boom"); sfx("gate", null, null, 1.0, .2)
	buzz(25)
	burst(c.x, GY - 80, "#ff5ad8", 26, 800)
	ring(c.x, GY - 80, "#ff5ad8", 180)

func clawGeo(box: Rect2) -> void:
	if NETR == "client":
		netSend("swing", [box.position.x, box.position.y, box.size.x, box.size.y])
		return
	var o = ROOM
	if o == null:
		return
	for i in o.gates.size():
		var g: Dictionary = o.gates[i]
		if g.broken:
			continue
		if g.kind == "secret" and overlap(box, Rect2(g.x - g.w / 2.0 - 30, g.top, g.w + 60, g.bot - g.top)):
			g.hp -= 1
			g.flash = .15
			sfx("hit", g.x, box.position.y)
			burst(g.x + 60, box.position.y + 90, "#c8c0e0", 10, 450)
			if g.hp <= 0:
				breakGate(g, i)
			else:
				ftext(g.x + 80, g.top - 30, "Something rattles behind it…", "#c8c0e0")
		elif g.kind == "crystal" and overlap(box, Rect2(g.x - g.w / 2.0 - 30, 0, g.w + 60, GY)):
			if hasAb("plasma"):
				g.hp -= 1
				burst(g.x, box.position.y + 80, "#ff5ad8", 10, 500)
				sfx("hit", g.x, box.position.y)
				g.flash = .15
				if g.hp <= 0:
					breakGate(g, i)
			elif hintT <= 0:
				hintT = 2.5
				ftext(g.x, GY - 300, DB.T.GATEHINT.crystal, "#ffd27a")
	for i in o.cages.size():
		var c: Dictionary = o.cages[i]
		if not c.broken and c.kind == "plasma" and overlap(box, Rect2(c.x - 70, GY - 170, 140, 170)):
			if hasAb("plasma"):
				c.hp -= 1
				sfx("hit", c.x, GY - 90)
				burst(c.x, GY - 90, "#ff5ad8", 8, 400)
				if c.hp <= 0:
					breakCage(c, i)
			elif hintT <= 0:
				hintT = 2.5
				ftext(c.x, GY - 230, "Void crystal. Claws bounce off it.", "#ffd27a")

func slamAt(x: float) -> void:
	if NETR == "client":
		netSend("slam", [x])
		return
	var o = ROOM
	for i in o.gates.size():
		var g: Dictionary = o.gates[i]
		if not g.broken and g.kind == "blast" and absf(x - g.plate) < 170:
			breakGate(g, i)
	for i in o.cages.size():
		var c: Dictionary = o.cages[i]
		if not c.broken and c.kind == "slam" and absf(x - c.x) < 220:
			breakCage(c, i)

func grantAbility(id: String) -> void:
	var A: Dictionary = {}
	for a in DB.ABIL:
		if a.id == id:
			A = a
	META.ab[id] = 1
	save_meta()
	hitStop = .45; shake = 10
	buzz([40, 30, 80])
	sfx("item", null, null, 1.0, .5)
	Sfx.duck_for(3.2)
	camKick(.06)
	for i in 3:
		ring(pl.x, pl.y - 100, A.col, 180 + i * 90)
	burst(pl.x, pl.y - 100, A.col, 40, 900)
	showBanner(A.name + " acquired", A.how, 4.2)
	padAbilities()

func useStation(st: Dictionary) -> void:
	st.t = 8.0
	var p = pl
	p.hp = p.max
	p.en = max(p.en, 50)
	META.save = {room=ROOM.id, x=st.x, score=G.score}
	var first: bool = not META.mapped.has(str(ROOM.a))
	META.mapped[str(ROOM.a)] = 1
	save_meta()
	sfx("save", null, null, 1.0, .5)
	if first:
		get_tree().create_timer(1.7).timeout.connect(func():
			if G.state == "play":
				showBanner("Map data downloaded", "Every room of this world is on your map", 2.2))
		sfx("pick_shard")
	ring(st.x, GY - 110, "#7dffb0", 200)
	burst(st.x, GY - 120, "#7dffb0", 24, 500)
	showBanner("Progress saved", "Health restored", 1.6)
