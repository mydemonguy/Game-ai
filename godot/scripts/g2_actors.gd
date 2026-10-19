extends "res://scripts/g1_world.gd"
## layer 2: Tyko, the robot cast, combat, guardians, Malakar, shots, hazards, pickups, crates,
## Guardian Arms, Sable and Claude

var OVL: Array = []   # laser-sight lines for this frame: [x0,y0,x1,y1,alpha]

func later(t: float, f: Callable) -> void:
	get_tree().create_timer(t).timeout.connect(f)

# ---------- sound shortcuts ----------
func sHit(d: float, e) -> void:
	if e != null:
		sfx("hit_big" if d >= 30 else "hit", e.x, e.y, 1.0, .025, R(.92, 1.1))
	else:
		sfx("hit_big" if d >= 30 else "hit", null, null, 1.0, .025, R(.92, 1.1))

func sEnemy(k: String, e) -> void:
	var nm = "en_" + k
	if k == "shot" and e != null and e.get("type", "") == "c":
		nm = "en_shot_c"
	if e != null:
		sfx(nm, e.x, e.y, 1.0, .05 if k == "shot" else .06, R(.95, 1.08))
	else:
		sfx(nm, null, null, 1.0, .06)

func sPick(t: String) -> void:
	if t in ["coin", "fruit", "med", "shard", "shield", "fang", "egg"]:
		sfx("pick_" + t, null, null, 1.0, .05, R(.96, 1.08) if t == "coin" else 1.0)
	elif t == "tank" or t == "core":
		sfx("pick_tank", null, null, 1.0, .05)
		Sfx.duck_for(2.2)
	else:
		sfx("pick_misc")

func sItem() -> void:
	sfx("item", null, null, 1.0, .5)
	Sfx.duck_for(3.2)

# ---------- player ----------
func newPlayer(ch := "tyko") -> Dictionary:
	var mh = maxHP(ch)
	return {ch=ch, remote=false, body=mk_body(258, GY - 168, 84, 168, 3200, 3200), x=300.0, y=GY, vx=0.0, vy=0.0, face=1, hp=float(mh), max=mh, slam=0, dropT=0.0, sup=GY, en=30.0, ground=true, jumps=0,
		atk=0.0, atkCD=0.0, combo=0, comboT=0.0, inv=0.0, hurtT=0.0, hitDone={}, run=0.0, dashT=0.0, dashCD=0.0, squash=0.0, landT=0.0,
		dead=0, deadT=0.0, shield=0, shieldT=0.0, fury=0.0, hits=0, hitsT=0.0, ghostT=0.0, armCD=0.0, aegis=0.0, thr=0, thrHit={}, dashHit={},
		_wg=true, _vy=0.0, id=_nid()}

func roarFx(p) -> void:
	if NETR == "client":
		netSend("roar", [])
		sfx("roar", null, null, 1.0, .2)
		buzz(30); shake = 10
		ring(p.x + p.face * 60, p.y - 85, "#5ce1ff", 220)
		return
	shots.append(mk_shot(p.x + p.face * 70, p.y - 85, p.face * 1600, 0, 70, 48 * pdm(), true, .85, "#5ce1ff", {pierce=true, wave=true}))
	sfx("roar", null, null, 1.0, .2)
	buzz(30); shake = 10
	burst(p.x + p.face * 60, p.y - 85, "#5ce1ff", 20, 700)
	ring(p.x + p.face * 60, p.y - 85, "#5ce1ff", 220)

func mk_shot(x: float, y: float, vx: float, vy: float, r: float, dmg: float, friend: bool, life: float, col: String, extra := {}) -> Dictionary:
	var s = {x=x, y=y, vx=vx, vy=vy, r=r, dmg=dmg, friend=friend, life=life, col=col, pierce=false, wave=false, cres=false, g=0.0,
		boom=false, puddle=false, hit={}, uid=_nid(), v=null}
	for k in extra:
		s[k] = extra[k]
	return s

func updPlayerPre(dt: float) -> void:
	var p = pl
	p._wg = p.ground
	if p.dead:
		p.vx = 0.0
		return
	p.fury = max(0.0, p.fury - dt)
	if p.shield > 0:
		p.shieldT -= dt
		if p.shieldT <= 0:
			p.shield = 0
	p.inv = max(0.0, p.inv - dt)
	p.atkCD -= dt
	p.armCD -= dt
	p.aegis = max(0.0, p.aegis - dt)
	if P.has("armc"):
		cycleArm()
	if P.has("arm") and p.armCD <= 0 and p.hurtT <= 0:
		fireArm(p)
	p.comboT -= dt; p.hurtT -= dt; p.dashCD -= dt
	p.squash = max(0.0, p.squash - dt * 5); p.landT -= dt
	p.hitsT -= dt
	if p.hitsT <= 0:
		p.hits = 0
	var ax = 0.0
	if p.hurtT <= 0:
		if K.left: ax -= 1
		if K.right: ax += 1
	if p.atk > 0:
		p.atk -= dt
		ax *= .25
	if ax != 0 and p.atk <= 0:
		p.face = int(sgn(ax))
	if p.hurtT <= 0:
		var tgt = ax * 640 * float(CH().spd)
		p.vx += (tgt - p.vx) * min(1.0, dt * (14.0 if p.ground else 7.0))
	p.dropT -= dt
	if P.has("down") and p.ground and onPlatform(p):
		p.dropT = .28; p.ground = false; p.vy = 120.0
	if P.has("attack") and not p.ground and K.down and hasAb("slam") and not p.slam and p.hurtT <= 0:
		p.slam = 1; p.vy = 2600.0; p.vx *= .3; p.atk = 0.0
		P.erase("attack")
		sfx("slam0", null, null, 1.0, .1)
		ring(p.x, p.y - 90, "#ffb347", 120)
	if P.has("jump") and p.hurtT <= 0:
		if p.ground:
			p.vy = -1300.0 * float(CH().jump); p.ground = false; p.jumps = 1
			sfx("jump1", null, null, 1.0, .05, R(.94, 1.06))
			dust(p.x, p.y)
		elif p.jumps < 2 and hasAb("double"):
			p.vy = -1100.0 * float(CH().jump); p.jumps = 2
			sfx("jump2", null, null, 1.0, .05)
			burst(p.x, p.y - 40, "#5ce1ff", 12, 350)
			ring(p.x, p.y - 20, "#5ce1ff", 90)
	if P.has("attack") and p.atkCD <= 0 and p.hurtT <= 0:
		p.combo = (p.combo % 3) + 1 if p.comboT > 0 else 1
		p.comboT = .6; p.atk = .22
		p.atkCD = (.36 if p.combo == 3 else .17) * (.75 if hasR("swift") else 1.0) * float(CH().cd)
		p.hitDone = {}
		sfx("swing3" if p.combo == 3 else "swing1", null, null, 1.0, .04, R(.9, 1.15))
		p.vx += p.face * (420 if p.combo == 3 else 160)
		if not p.ground:
			p.vy = min(p.vy, -180.0)
	if P.has("dash") and hasAb("dash") and p.dashCD <= 0 and p.hurtT <= 0:
		var dir: int = int(sgn(ax)) if ax != 0 else p.face
		p.face = dir
		p.dashT = .19; p.dashCD = .38 if hasR("comet") else .75
		p.dashHit = {}; p.inv = max(p.inv, .26); p.atk = 0.0
		sfx("dash", null, null, 1.0, .08)
		buzz(10)
		if p.ground:
			dust(p.x, p.y)
		burst(p.x, p.y - 80, "#b48cff", 10, 420)
	if p.dashT > 0:
		p.dashT -= dt
		p.vx = p.face * (2000.0 if p.thr else 1750.0)
		p.vy = min(p.vy, 0.0) * .5
		p.ghostT -= dt
		if p.ghostT <= 0:
			p.ghostT = .03
			ghost(p)
		if p.thr:
			part(p.x - p.face * 40, p.y - 80 + (randf() - .5) * 80, -p.face * 300, -80, .35, "#ff9638", 18, 0, "glow")
		if p.dashT <= 0:
			p.thr = 0
	if P.has("special") and hasAb("roar") and p.en >= 50 and p.hurtT <= 0:
		p.en -= 50
		roarFx(p)
	p._vy = p.vy

func plPush() -> void:
	pl.body.vx = pl.vx; pl.body.vy = pl.vy
	pl.body.grav = not (pl.dashT > 0)

func plPull() -> void:
	pl.x = pl.body.x + 42; pl.y = pl.body.y + 168
	pl.vx = pl.body.vx; pl.vy = pl.body.vy
	pl.ground = pl.body.down

func physStep(dt: float) -> void:
	plPush()
	var g = move_body(pl.body, dt, not (pl.dropT > 0 or pl.dead), true)
	if g != null:
		gateTouch(g)
	plPull()
	for e in en:
		if e.body:
			e.body.vx = e.vx
			move_body(e.body, dt, false, false)
			ePull(e)

func gateTouch(g) -> void:
	if hintT <= 0 and not ((g.kind == "crack" or g.kind == "secret") and pl.dashT > 0):
		hintT = 3
		ftext(pl.x, pl.y - 210, DB.T.GATEHINT[g.kind], "#c8c0e0" if g.kind == "secret" else "#ffd27a")

func updPlayerPost(dt: float) -> void:
	var p = pl
	if p.ground and not p._wg and not p.dead:
		if p._vy > 700:
			dust(p.x, p.y)
			p.squash = 1.0
		if not p.slam and p._vy >= 500:
			sfx("land_big" if p._vy > 1400 else "land", null, null, .5 + .5 * min(1.0, p._vy / 2200.0), .08, R(.9, 1.05))
		p.landT = .15; p.jumps = 0
		if p.slam:
			slamLand(p, p.y)
	if p.ground:
		p.jumps = 0
	p.sup = surfaceBelow(p.x, p.y)
	var mn = -120.0
	var mx = RW + 120
	if lock:
		mn = cam + 60
		mx = cam + W - ((RSAFE + 80) if touchy else 60.0)
	if NETR == "client":
		mn = max(mn, 70.0)
		mx = min(mx, RW - 70)
	if p.x < mn or p.x > mx:
		var nx = clampf(p.x, mn, mx)
		p.body.x = nx - 42; p.x = nx; p.body.vx = 0.0; p.vx = 0.0
	p.run += absf(p.vx) * dt * .02
	if p.dead:
		return
	if p.dashT > 0 and (p.thr or hasR("comet") or CH().charge):
		var bx = Rect2(p.x - 90, p.y - 170, 180, 170)
		var hs: Dictionary = p.thrHit if p.thr else p.dashHit
		for e in allTargets():
			if not hs.has(e.id) and overlap(bx, ebox(e)):
				hs[e.id] = 1
				damage(e, (30.0 if p.thr else 24.0 if CH().charge else 18.0) * pdm(), p.face * (800 if CH().charge else 500))
	if p.atk > 0 and p.atk < .18:
		var reach = reachOf(240.0 if p.combo == 3 else 180.0)
		var box = Rect2(p.x - 10 if p.face > 0 else p.x - reach + 10, p.y - 190, reach, 190)
		for e in allTargets():
			if not p.hitDone.has(e.id) and overlap(box, ebox(e)):
				p.hitDone[e.id] = 1
				damage(e, (26.0 if p.combo == 3 else 14.0) * (1 + G.lv * .06) * pdm(), p.face * (750 if p.combo == 3 else 260))
				p.en = min(100.0, p.en + (9.0 if p.combo == 3 else 6.0) * AG())
		hitBoxesWith(box, p.hitDone)
		if not p.hitDone.has("geo"):
			p.hitDone["geo"] = 1
			clawGeo(box)

func slamLand(p, y: float) -> void:
	p.slam = 0
	shake = max(shake, 14.0)
	camKick(.03)
	sfx("slam", null, null, 1.0, .1)
	buzz(35)
	ring(p.x, y - 10, "#ffb347", 300)
	dust(p.x, y); dust(p.x + 60, y); dust(p.x - 60, y)
	for i in 16:
		part(p.x + (randf() - .5) * 300, y - 6, (randf() - .5) * 500, -300 - randf() * 400, .6, "#ffb347", 6, 1500)
	for e in en:
		if not e.fly and absf(e.x - p.x) < 280 and absf(e.y - y) < 60:
			damage(e, 32 * pdm(), sgn(e.x - p.x) * 700)
			e.state = "walk"; e.t = 1.0
	if boss != null and not boss.dead and absf(boss.x - p.x) < 300:
		damage(boss, 40 * pdm(), 0)
	slamAt(p.x)

func allTargets() -> Array:
	if boss != null and not boss.dead and boss.state != "enter":
		var a = en.duplicate()
		a.append(boss)
		return a
	return en

func hurtPlayer(d: float, kx: float) -> void:
	var p = pl
	if p.remote:
		if p.inv <= 0 and not p.dead and G.state == "play":
			p.inv = .5
			netSend("hurt", [d, kx])
		return
	if p.inv > 0 or p.dead or G.state != "play":
		return
	if int(META.get("easy", 0)):
		d *= .6   # Story mode
	if p.shield > 0:
		p.shield -= 1; p.inv = .6
		ring(p.x, p.y - 95, "#8fc8ff", 170)
		burst(p.x, p.y - 95, "#8fc8ff", 14, 500)
		sfx("block", null, null, 1.0, .06)
		buzz(15)
		ftext(p.x, p.y - 200, "Blocked", "#8fc8ff")
		return
	if boss != null:
		boss.hitMe = true   # for the Untouchable feat
	if hasR("stone"):
		d *= .8
	d = round(d)
	p.hp -= d
	p.inv = .9
	if hasR("thorn"):
		ring(p.x, p.y - 90, "#ff8a8a", 260)
		for e in allTargets():
			if absf(e.x - p.x) < 260 and absf(e.y - p.y) < 300:
				damage(e, 40, sgn(e.x - p.x) * 600)
	p.hurtT = .28; p.vx = kx; p.vy = -420.0; p.ground = false; p.atk = 0.0
	shake = 14; flashT = .18
	sfx("hurt", null, null, 1.0, .1)
	buzz(45)
	p.hits = 0
	ftext(p.x, p.y - 170, int(d), "#ff3d6e")
	burst(p.x, p.y - 80, "#ff3d6e", 12)
	if p.hp <= 0 and NETR == "client":
		p.hp = 0.0
		p.dead = 1; p.deadT = 0.0; p.vx = 0.0; p.inv = 99.0
		G.respawnT = 3.5
		buzz([60, 40, 60])
		sfx("pdown", null, null, 1.0, .5)
		showBanner(CH().name + " is down", "Back in a few seconds", 2)
		return
	if p.hp <= 0:
		p.hp = 0.0
		if p == pl and G.rush == null:
			META.deaths = int(META.get("deaths", 0)) + 1
			stat("falls")
		if G.lives > 0:
			G.lives -= 1
			p.dead = 1; p.deadT = 0.0; p.vx = 0.0; p.inv = 99.0
			G.respawnT = 1.8
			buzz([60, 40, 60])
			sfx("pdown", null, null, 1.0, .5)
		else:
			gameOver()

# ---------- robots ----------
## district hazards hurt only the dino on this device (each phone runs its own in co-op)
const TOX_P := 4.6
const ZAP_P := 4.0
const VOID_P := 5.0
const VOID_Y := 230.0   # how high above the floor a void rift hangs
func hzPhase(h: Dictionary, per: float) -> float:
	return fposmod(lvT + h.ph, per)

func updDHZ(dt: float) -> void:
	if ROOM == null or not ROOM.has("dhz"):
		return
	var p = pl
	for h in ROOM.dhz:
		match h.k:
			"ice":
				if h.st == "hang":
					if p != null and not p.dead and absf(p.x - h.x) < 140 and p.y > h.y:
						h.st = "shake"; h.t = .55
						sfx("crate1", h.x, h.y, .6, .3, 1.4)
				elif h.st == "shake":
					h.t -= dt
					if h.t <= 0:
						h.st = "fall"; h.vy = 300.0
				elif h.st == "fall":
					h.vy += 2600 * dt
					h.y += h.vy * dt
					if p != null and not p.dead and absf(p.x - h.x) < 48 and h.y + 50 > p.y - 160 and h.y < p.y:
						hurtPlayer(14 * dm(), sgn(p.x - h.x) * 260)
						h.y = FY
					if h.y >= FY - 40:
						h.st = "gone"; h.t = 6.0
						burst(h.x, FY - 30, "#cfefff", 22, 700)
						sfx("block", h.x, FY, .7, .2, 1.3)
				elif h.st == "gone":
					h.t -= dt
					if h.t <= 0:
						h.st = "hang"; h.y = h.y0
			"tox":
				var q = hzPhase(h, TOX_P)
				if q >= 3.2:
					h.tick -= dt
					if h.tick <= 0 and p != null and not p.dead and absf(p.x - h.x) < 80 and p.y > FY - 300:
						h.tick = .5
						hurtPlayer(7 * dm(), sgn(p.x - h.x) * 180)
				if q >= 2.6 and q - dt < 2.6:
					sfx("vent", h.x, FY, .7, .3, .8)
			"zap":
				var q = hzPhase(h, ZAP_P)
				if q >= 2.9 and p != null and not p.dead and p.ground and absf(p.x - h.x) < 130 and absf(p.y - FY) < 8:
					hurtPlayer(12 * dm(), sgn(p.x - h.x) * 300)
				if q >= 2.9 and q - dt < 2.9:
					sfx("fizz", h.x, FY, .8, .3, 1.2)
			"void":
				# abyss districts: a rift that wakes, drags you toward its core, and bites if you touch it
				var q = hzPhase(h, VOID_P)
				if q >= 2.6 and q - dt < 2.6:
					sfx("vent", h.x, FY - VOID_Y, .7, .3, .5)
				if q >= 3.3 and p != null and not p.dead:
					var dx: float = h.x - p.x
					if absf(dx) < 560 and absf(p.y - FY) < 320 and p.dashT <= 0:
						var pull: float = (60.0 + 250.0 * (1.0 - absf(dx) / 560.0)) * sgn(dx) * dt
						if absf(pull) > absf(dx):
							pull = dx
						p.x += pull
						p.body.x += pull
					h.tick -= dt
					if h.tick <= 0 and absf(dx) < 80 and p.y - 175 < FY - VOID_Y + 70 and p.y > FY - VOID_Y - 40:
						h.tick = .6
						hurtPlayer(10 * dm(), -sgn(dx) * 620 if dx != 0 else 620.0)

func spawnEnemy(type: String, side: float, quiet := false):
	if type == "g" and G.lv >= 1 and randf() < .35:
		type = "r"   # some Ronin swap for Trooper gunners from the Armory on
	var T: Dictionary = DB.ETYPES[type]
	var fly: bool = T.get("fly", false) == true
	var x: float = cam - 120 if side < 0 else cam + W + 120
	for s in solidRects():
		var gx: float = s.x + s.w / 2.0
		if sgn(x - gx) != sgn(pl.x - gx):
			x = gx + sgn(pl.x - gx) * (s.w / 2.0 + 90)
	x = clampf(x, 80, RW - 80)
	var e = {type=type, x=x, y=(FY - 360 + randf() * 130) if fly else FY, w=float(T.w), h=float(T.h), hp=T.hp * dm(), max=T.hp * dm(),
		vx=0.0, vy=0.0, face=int(-side), state="walk", t=.6 + randf() * .8, flash=0.0, seed=randf() * 10, heavy=T.get("heavy", false) == true,
		fly=fly, hy=0.0, score=int(T.score), fade=0.0, tp=0.0, hitP=false, body=null, id=_nid(), v=null, dead=false, guard=null, isBoss=false,
		la=null, wall=0, n=0, fire=0.0, beep=0, inside=0, ct=1.5 + randf() * 2, shotT=0.0}
	e.hy = e.y
	# Overcharged robots: rarer gold-lit versions, tougher and hitting harder, worth extra Stardust
	e.oc = false
	e.dmul = 1.0
	if type in ["g", "r", "b", "c", "h", "d"] and G.rush == null and (ocForce or randf() < (.6 if ROOM != null and ROOM.kind == "trial" else .04 + .03 * G.lv)):
		e.oc = true
		e.dmul = 1.25
		e.hp *= 1.9
		e.max *= 1.9
		e.score *= 2
	if type == "c":
		e.x = cam + 260 if side < 0 else cam + W - RSAFE - 60
		e.y = FY; e.fade = 1.0; e.t = 1.2
		for g in solidRects():
			var gx: float = g.x + g.w / 2.0
			if sgn(e.x - gx) != sgn(pl.x - gx):
				e.x = pl.x + (-1 if pl.x < gx else 1) * max(200.0, min(520.0, absf(pl.x - gx) - 80))
		e.x = clampf(e.x, 80, RW - 80)
	e.x = clampf(e.x, 60 + e.w / 2.0, RW - 60 - e.w / 2.0)
	if not fly and type != "c":
		e.body = mk_body(e.x - e.w / 2.0, e.y - e.h, e.w, e.h)
	en.append(e)
	if not quiet:
		burst(e.x, e.y - e.h / 2.0, "#ff4fd8", 14)
		teleFx(e.x, e.y, e.h)
		sEnemy("spawn", e)
	if type == "B":
		showBanner("Iron Warden", "Elite · jump its shockwaves", 1.8)
		sEnemy("elite", null)
		shake = 12
	return e

func ePull(e) -> void:
	var b = e.body
	e.x = b.x + e.w / 2.0
	e.y = b.y + e.h
	e.vx = b.vx
	var lo: float = 45 + e.w / 2.0
	var hi: float = RW - 45 - e.w / 2.0
	if e.x < lo or e.x > hi or e.y > RH + 200:
		e.x = clampf(e.x, lo, hi)
		if e.y > RH + 200:
			e.y = FY
		b.x = e.x - e.w / 2.0
		b.y = e.y - e.h
		b.vx = 0.0
	if lock and touchy:
		var lim = cam + W - RSAFE + 40
		if e.x < lim:
			e.inside = 1
		if e.inside and e.x > lim:
			e.x = lim
			b.x = lim - e.w / 2.0
			if b.vx > 0:
				b.vx = 0.0

func damage(e, d: float, kb: float) -> void:
	if e.dead:
		return
	if NETR == "client":
		netSend("hit", [e.id, d, kb])
		e.flash = .14
		return
	if e.guard != null:
		d = guardHit(e, d)
		if d == 0:
			return
	d = round(d)
	e.hp -= d
	e.flash = .14
	if not e.isBoss:
		e.vx += kb * (.35 if e.heavy else 1.0)
		if e.body:
			e.body.vx = e.vx
	if pl:
		pl.hits += 1
		pl.hitsT = 1.8
	var hy: float = e.y - e.h * .55
	ftext(e.x, e.y - e.h - 10, int(d), "#ffd27a" if d >= 30 else "#ffffff", d >= 30)
	burst(e.x, hy, "#ffd27a", 6, 500)
	sparks(e.x, hy, "#fff3c4", 9, sgn(kb) if kb != 0 else 1.0)
	ring(e.x, hy, "#ffd27a", 140 if d >= 30 else 90)
	sHit(d, e)
	buzz(8)
	hitStop = .06 if d >= 30 else .035
	if d >= 30:
		camKick(.018)
	if e.hp <= 0:
		if e.isBoss:
			if e.guard != null:
				guardianDown(e)
			else:
				killBoss()
			return
		e.dead = true
		stat("kills")
		corpse(e.type, e.x, e.y, e.face)
		G.score += e.score * (1 + min(4, int(floor((pl.hits if pl else 0) / 10.0))))
		addDust(10 if e.type == "B" else 3 if e.heavy else 1)
		if pl and hasR("siphon"):
			pl.hp = min(pl.max, pl.hp + 3)
		burst(e.x, e.y - e.h / 2.0, "#ff4fd8", 30, 850)
		ring(e.x, e.y - e.h / 2.0, "#ff4fd8", 180)
		souls(e.x, e.y - e.h / 2.0)
		sfx("edie_big" if e.heavy else "edie_fly" if e.fly else "edie", e.x, e.y, 1.0, .04, R(.92, 1.08))
		buzz(14)
		shake = max(shake, 7.0)
		explode(e)
		dropFrom(e)
		if e.get("oc", false):
			sfx("oc_die", e.x, e.y, 1.0, .1)
			addDust(4)
			for k in 4:
				picks.append(mk_drop(e.x, e.y - e.h * .6, R(-320, 320), R(-950, -650), "coin", 12))
			ftext(e.x, e.y - e.h - 40, "Overcharged! +◆4", "#ffe08a", true)
			PREFS.ocK = int(PREFS.get("ocK", 0)) + 1
			save_prefs()
			if PREFS.ocK >= 25:
				feat("oc25")

func updEnemy(e, dt: float) -> void:
	var dx: float = pl.x - e.x
	var ad = absf(dx)
	e.flash -= dt
	e.t -= dt
	if e.type == "t":
		updTurret(e, dt)
		return
	if e.type == "d":
		e.face = int(sgn(dx)) if dx != 0 else 1
		var tx: float = pl.x - e.face * 440 + sin(lvT * 1.3 + e.seed) * 90
		var ty: float = e.hy + sin(lvT * 2.2 + e.seed) * 45
		if lock:
			if pl.x - cam > W - RSAFE - 300:
				tx = pl.x - 440
			tx = max(cam + 140, min(cam + W - RSAFE, tx))
		e.vx += (tx - e.x) * dt * 2.4
		e.vx *= pow(.15, dt)
		e.x += e.vx * dt
		gateClamp(e)
		e.y += (ty - e.y) * min(1.0, dt * 2)
		if e.t <= 0 and (ad > 1500 or absf(pl.y - e.y) > 750):
			e.t = .5
		if e.t <= 0:
			e.t = max(1.4, 2.8 - G.lv * .25)
			var a = atan2(pl.y - 80 - (e.y - 35), pl.x - e.x)
			var v = 560.0 + G.lv * 30
			shots.append(mk_shot(e.x, e.y - 35, cos(a) * v, sin(a) * v, 15, DB.ETYPES.d.dmg * dm() * float(e.get("dmul", 1.0)), false, 3.2, "#ff8a3a"))
			sEnemy("shot", e)
			muzzle(e.x, e.y - 35, "#ff8a3a")
		return
	if e.type == "c":
		e.shotT = max(0.0, e.shotT - dt)
		e.face = int(sgn(dx)) if dx != 0 else 1
		e.fade = max(0.0, e.fade - dt * 2)
		e.x += e.vx * dt
		gateClamp(e)
		e.vx *= pow(.02, dt)
		if ad < 260 and e.t < .8 and e.tp == 0:
			e.tp = .35
			burst(e.x, e.y - 80, "#b48cff", 18)
		if e.tp > 0:
			e.tp -= dt
			if e.tp <= 0:
				e.tp = 0.0
				var side = -1.0 if pl.x - cam > W / 2.0 else 1.0
				e.x = pl.x + side * (520 + randf() * 200)
				e.x = max(cam + 160, min(cam + W - RSAFE - 40, e.x))
				for g in solidRects():
					var gx: float = g.x + g.w / 2.0
					if sgn(e.x - gx) != sgn(pl.x - gx):
						e.x = pl.x + (-1 if pl.x < gx else 1) * min(520.0, absf(pl.x - gx) - 60)
				gateClamp(e)
				e.fade = 1.0; e.t = 1.0
				teleFx(e.x, e.y, e.h)
		elif e.t <= 0 and ad < 1500 and absf(pl.y - e.y) < 600:
			e.t = max(1.6, 2.8 - G.lv * .15)
			var a0 = atan2(pl.y - 90 - (e.y - 120), dx)
			for k in [-1, 0, 1]:
				var a: float = a0 + k * .22
				shots.append(mk_shot(e.x + e.face * 40, e.y - 120, cos(a) * 520, sin(a) * 520, 17, DB.ETYPES.c.dmg * dm() * float(e.get("dmul", 1.0)), false, 3, "#b48cff"))
			sEnemy("shot", e)
			e.shotT = .5
			muzzle(e.x + e.face * 60, e.y - 120, "#b48cff")
		return
	if e.type == "h":
		if e.state != "leap":
			e.face = int(sgn(dx)) if dx != 0 else 1
		if e.state == "walk":
			if ad > 280:
				e.vx += (e.face * 520 * (1 + G.lv * .04) - e.vx) * min(1.0, dt * 6)
			else:
				e.vx *= pow(.02, dt)
				if e.t <= 0:
					e.state = "wind"; e.t = .26 + randf() * .16
		elif e.state == "wind":
			e.vx *= pow(.01, dt)
			if e.t <= 0:
				e.state = "leap"; e.t = .36; e.vx = e.face * 1150.0; e.hitP = false
				sEnemy("leap", e)
				if e.body:
					e.body.vy = -380.0
		elif e.state == "leap":
			if not e.hitP and overlap(ebox(e), pbox()):
				e.hitP = true
				hurtPlayer(DB.ETYPES.h.dmg * dm() * float(e.get("dmul", 1.0)), e.face * 520)
			e.vx *= pow(.25, dt)
			if e.t <= 0:
				e.state = "walk"; e.t = .5 + randf() * .4
		return
	if e.type == "r":
		updTrooper(e, dt, dx, ad)
		return
	var T: Dictionary = DB.ETYPES[e.type]
	var hv: bool = e.type == "b" or e.type == "B"
	if e.type == "b":
		e.ct -= dt
		if e.state == "walk" and ad > 520 and ad < 1500 and absf(pl.y - e.y) < 400 and e.ct <= 0:
			e.state = "shoot"; e.t = .6; e.n = 1
			e.ct = 3.2 + randf() * 1.5
		if e.state == "shoot":
			e.face = int(sgn(dx)) if dx != 0 else e.face
			e.vx *= pow(.01, dt)
			if e.n > 0 and e.t < .3:
				e.n = 0
				var x0: float = e.x + e.face * 40
				var y0: float = e.y - e.h * .95
				var T0 = .95
				var tx: float = pl.x + (randf() - .5) * 160
				var s = mk_shot(x0, y0, (tx - x0) / T0, (FY - 30 - y0) / T0 - .5 * 1500 * T0, 20, 13 * dm(), false, T0 + .4, "#ffb347")
				s.g = 1500.0
				shots.append(s)
				sEnemy("smash", e)
				muzzle(x0, y0, "#ffb347")
			if e.t <= 0:
				e.state = "walk"; e.t = .6
			return
	var rng_: float = 240.0 if e.type == "B" else 200.0 if hv else 130.0
	if e.state == "walk":
		e.face = int(sgn(dx)) if dx != 0 else 1
		if ad > rng_:
			e.vx += (e.face * T.spd * (1 + G.lv * .05) - e.vx) * min(1.0, dt * 5)
		else:
			e.vx *= pow(.01, dt)
			if e.t <= 0:
				e.state = "wind"
				e.t = .75 if e.type == "B" else .62 if hv else .42
	elif e.state == "wind":
		e.vx *= pow(.01, dt)
		if e.t <= 0:
			if not hv:
				sEnemy("swipe", e)
			e.state = "swing"; e.t = .2; e.hitP = false
			e.vx += e.face * (120 if hv else 260)
			if hv:
				shake = max(shake, 8.0)
				dust(e.x + e.face * 120, e.y)
				sEnemy("smash", e)
			if e.type == "B":
				for d in [-1, 1]:
					hz.append({kind="quake", x=e.x + d * 90, dir=d, v=820.0, t=0.0, act=1.5, hs={}})
				shake = 16
	elif e.state == "swing":
		if not e.hitP:
			var reach: float = 270.0 if e.type == "B" else 230.0 if hv else 150.0
			var box = Rect2(e.x if e.face > 0 else e.x - reach, e.y - e.h, reach, e.h)
			if overlap(box, pbox()):
				e.hitP = true
				hurtPlayer(T.dmg * dm() * float(e.get("dmul", 1.0)), e.face * (900 if hv else 450))
		if e.t <= 0:
			e.state = "walk"
			e.t = (1.6 if e.type == "B" else 1.3 if hv else .8) + randf() * .7
	if e.state != "walk":
		e.vx *= pow(.05, dt)

## Trooper: keeps its distance, fires a three-round burst, then has to reload (free hits!)
func updTrooper(e, dt: float, dx: float, ad: float) -> void:
	if e.state != "shoot":
		e.face = int(sgn(dx)) if dx != 0 else 1
	if e.state == "walk":
		var want = 0.0
		if ad > 820:
			want = sgn(dx)
		elif ad < 420:
			want = -sgn(dx)
		e.vx += (want * 230 * (1 + G.lv * .04) - e.vx) * min(1.0, dt * 5)
		if lock:
			var lo = cam + 120
			var hi = cam + W - RSAFE
			if e.x < lo and e.vx < 0 or e.x > hi and e.vx > 0:
				e.vx = 0.0
		if e.t <= 0 and ad < 1400 and absf(pl.y - e.y) < 500:
			e.state = "shoot"; e.t = .62; e.n = 3; e.fire = .12
			sEnemy("lock", e)
	elif e.state == "shoot":
		e.vx *= pow(.01, dt)
		e.fire -= dt
		if e.fire <= 0 and e.n > 0:
			e.fire = .16
			e.n -= 1
			var x0: float = e.x + e.face * 95
			var y0: float = e.y - e.h * .52
			var a = atan2(pl.y - 90 - y0, pl.x - x0)
			a = clampf(a, -.5, .5) if e.face > 0 else (a if absf(a) > PI - .5 else (PI - .5 if a > 0 else -PI + .5))
			var v = 900.0 + G.lv * 30
			shots.append(mk_shot(x0, y0, cos(a) * v, sin(a) * v, 12, DB.ETYPES.r.dmg * dm() * float(e.get("dmul", 1.0)), false, 2.4, "#7fe9ff"))
			sEnemy("shot", e)
			muzzle(x0, y0, "#7fe9ff")
		if e.t <= 0:
			e.state = "reload"; e.t = 1.0
	elif e.state == "reload":
		e.vx *= pow(.01, dt)
		if e.t <= 0:
			e.state = "walk"; e.t = 1.4 + randf() * 1.0

## wall turret: swivels toward Tyko, paints him with a laser sight, then fires a three-shot burst
func updTurret(e, dt: float) -> void:
	if e.wall == 0:
		e.wall = 1 if e.x < RW / 2.0 else -1
		e.t = 1.4
	e.face = e.wall
	e.x = 78.0 if e.wall > 0 else RW - 78
	e.y = e.hy
	e.vx = 0.0
	var px: float = e.x + e.wall * 22
	var py: float = e.y - 45
	var tx: float = pl.x
	var ty: float = pl.y - 90
	var ldx: float = (tx - px) * e.wall
	var seen: bool = not pl.dead and ldx > 60 and ldx < 1800 and absf(ty - py) < 760
	var want: float = clampf(atan2(ty - py, ldx), -1.25, 1.25) if seen else .35 + sin(lvT * .8 + e.seed) * .3
	e.la = want if e.la == null else e.la + clampf(want - e.la, -2.6 * dt, 2.6 * dt)
	var wa: float = e.la if e.wall > 0 else PI - e.la
	var c = cos(wa)
	var s = sin(wa)
	var mx = px + c * 62
	var my = py + s * 62
	if e.n > 0:
		e.fire -= dt
		if e.fire <= 0:
			e.fire = .15
			e.n -= 1
			var v = 640.0 + G.lv * 30
			shots.append(mk_shot(mx, my, c * v, s * v, 13, DB.ETYPES.t.dmg * dm(), false, 3, "#ff5a3a"))
			sEnemy("shot", e)
			muzzle(mx, my, "#ff5a3a")
			if e.n <= 0:
				e.t = 2.6
		return
	if not seen:
		e.t = max(e.t, .9)
		return
	if e.t < .7:
		if not e.beep:
			e.beep = 1
			sEnemy("lock", e)
	else:
		e.beep = 0
	if e.t < .7:
		OVL.append([mx, my, mx + c * 1700, my + s * 1700, .85 if e.t < .25 else .35])
	if e.t <= 0:
		e.n = 3
		e.fire = 0.0

# ---------- Malakar, the Void Sovereign ----------
func arenaCam() -> float:
	return max(0.0, RW - W)

func startBoss() -> void:
	lock = true
	sfx("boom"); sfx("broar", null, null, 1.0, .5)
	shake = 16
	var ac = arenaCam()
	var hp = (5000.0 if META.hard else 3600.0) * (1.4 if rushGold() else 1.0)
	boss = {isBoss=true, guard=null, name="", x=ac + W - RSAFE - 160, y=GY, w=200.0, h=420.0, hp=hp, max=hp, seed=0.0, face=-1, state="enter", t=2.6,
		flash=0.0, vx=0.0, phase=1, dy=-800.0, hov=0.0, last="", fire=0.0, left=0, spin=0.0, dash2=false, sl2=0, hitP=false, mv=0.0, dead=false,
		id=_nid(), v=null, heavy=true, fly=false, guarding=0, weak=0.0, fadeT=0.0}
	bossTexLoad("malakar")
	showBanner("Malakar", "The Void Sovereign", 2.6)
	musicFor()

func bclamp(x: float) -> float:
	return max(cam + 220, min(cam + W - RSAFE - 110, x))

func chooseAttack(b) -> void:
	var o = ["dash", "barrage", "rift", "slash"]
	if b.phase >= 2:
		o.append_array(["beam", "beam", "summon"])
	o = o.filter(func(a): return a != b.last)
	var a: String = rpick(o)
	if a == "summon" and en.size() >= 2:
		a = "barrage"
	b.last = a
	var k = .6 if b.phase == 3 else .85
	if a == "dash":
		b.state = "dashWind"; b.t = .7 * k; b.dash2 = false
		sfx("warn", null, null, 1.0, .15)
	elif a == "barrage":
		b.state = "barrage"; b.left = 16 if b.phase > 1 else 10; b.fire = 0.0; b.spin = randf() * 6
	elif a == "rift":
		b.state = "cast"; b.t = .6
		var xs = [pl.x, pl.x - 300, pl.x + 300]
		if b.phase == 3:
			xs.append_array([pl.x - 600, pl.x + 600])
		for i in xs.size():
			hz.append({kind="pillar", x=bclamp(xs[i]), t=.9 + i * .08, act=.45, w=160.0, hs={}})
		sfx("warn", null, null, 1.0, .15)
	elif a == "beam":
		b.state = "cast"; b.t = 1.2
		var low = randf() < .5
		hz.append({kind="beam", y=GY - 60 if low else GY - 215, low=low, t=1.05 * k + .2, act=.6, hs={}})
		sfx("warn", null, null, 1.0, .15)
	elif a == "slash":
		b.state = "slashWind"; b.t = .6 * k; b.sl2 = 0
		sfx("warn", null, null, 1.0, .15)
	elif a == "summon":
		b.state = "cast"; b.t = .9
		spawnEnemy("d", -1); spawnEnemy("d", 1)
		if b.phase == 3:
			spawnEnemy("c", 1)

func updBoss(b, dt: float) -> void:
	if b.guard != null:
		updGuardian(b, dt)
		return
	b.flash -= dt; b.t -= dt
	var r: float = b.hp / b.max
	var ph = 3 if r < .25 else 2 if r < .55 else 1
	if ph != b.phase and b.state != "enter":
		b.phase = ph
		if ph == 2 and META.sable and G.rush == null:
			later(1.4, func():
				if boss != null and not boss.dead and G.state == "play":
					allyJoin("boss")
					if ally != null:
						ally.line = "Malakar! You owe me a soul."
						ally.lt = 3.0)
		showBanner("Malakar Unleashed" if ph == 2 else "The Void Consumes", "He calls the Hollowed to his side" if ph == 2 else "Final phase", 1.8)
		shake = 22
		sfx("boom"); sfx("broar", null, null, 1.0, .5)
		camKick(.05)
		b.state = "idle"; b.t = 1.2
		burst(b.x, b.y - 170, "#ff3d6e", 40, 1000)
		ring(b.x, b.y - 170, "#ff3d6e", 400)
		hz = hz.filter(func(h): return h.kind != "beam")
	if b.state == "enter":
		b.dy += (0 - b.dy) * min(1.0, dt * 2.2)
		if b.t <= 0:
			b.state = "idle"; b.t = 1.0; b.dy = 0.0
		return
	b.hov = sin(lvT * 2) * 16
	if b.state != "dash":
		b.face = int(sgn(pl.x - b.x)) if pl.x != b.x else -1
	var k = .6 if b.phase == 3 else .85
	b.mv = 0.0
	if b.state == "idle":
		var side = 1.0 if b.x > pl.x else -1.0
		var tx = bclamp(pl.x + side * 520)
		if absf(tx - pl.x) < 320:
			tx = bclamp(pl.x - side * 520)
		var mv: float = (tx - b.x) * min(1.0, dt * 1.3)
		b.x += mv
		b.mv = mv / max(dt, 1e-3)
		if b.t <= 0:
			chooseAttack(b)
	elif b.state == "dashWind":
		if randf() < .5:
			burst(b.x, b.y - 160, "#ff3d6e", 2, 300)
		if b.t <= 0:
			b.state = "dash"; b.t = .95; b.vx = b.face * 2000.0
			sfx("boom")
			b.hitP = false
	elif b.state == "dash":
		b.x += b.vx * dt
		part(b.x, b.y - 150 + (randf() - .5) * 200, -b.vx * .1, 0, .3, "#ff3d6e", 10, 0)
		if not b.hitP and overlap(ebox(b), pbox()):
			b.hitP = true
			hurtPlayer(28, b.face * 1000)
		if b.t <= 0 or b.x < cam + 180 or b.x > cam + W - RSAFE - 110:
			b.x = bclamp(b.x)
			shake = 10
			if b.phase == 3 and not b.dash2:
				b.dash2 = true; b.face *= -1; b.state = "dashWind"; b.t = .35
			else:
				b.state = "idle"; b.t = 1.1 * k
	elif b.state == "barrage":
		b.fire -= dt
		if b.fire <= 0:
			b.fire = .1
			b.left -= 1
			var a0 = atan2(pl.y - 90 - (b.y - 260), pl.x - b.x)
			var a: float = a0 + sin(b.spin + b.left * .7) * .55
			shots.append(mk_shot(b.x + b.face * 60, b.y - 260 + b.hov, cos(a) * 620, sin(a) * 620, 20, 14, false, 3.5, "#ff3d6e"))
			sfx("bshot", null, null, 1.0, .07)
			if b.left <= 0:
				b.state = "idle"; b.t = 1.2 * k
	elif b.state == "cast":
		if b.t <= 0:
			b.state = "idle"; b.t = 1.0 * k
	elif b.state == "slashWind":
		if b.t <= 0:
			b.state = "slash"; b.t = .55
			malSlash(b)
	elif b.state == "slash":
		if b.phase == 3 and not b.sl2 and b.t < .25:
			b.sl2 = 1
			malSlash(b)
		if b.t <= 0:
			b.state = "idle"; b.t = 1.1 * k
	if b.state != "dash" and b.state != "idle" and overlap(ebox(b), pbox()):
		hurtPlayer(5, (-1 if pl.x < b.x else 1) * 800)

func malSlash(b) -> void:
	shots.append(mk_shot(b.x + b.face * 130, GY - 70, b.face * 950, 0, 46, 20, false, 3, "#e030c0", {cres=true}))
	sfx("boom")
	shake = max(shake, 8.0)
	sEnemy("swipe", b)
	ring(b.x + b.face * 130, GY - 90, "#e030c0", 160)

func killBoss() -> void:
	var b = boss
	codexAdd("M")
	b.dead = true
	bossDone = true
	G.score += 10000
	shake = 30
	sfx("boom")
	hz = []
	shots = shots.filter(func(s): return s.friend)
	for e in en:
		e.dead = true
		burst(e.x, e.y - e.h / 2.0, "#ff4fd8", 20)
	en = []; spawnQ = []
	for i in 6:
		later(i * .28, func():
			burst(b.x + (randf() - .5) * 220, b.y - randf() * 330, "#ff3d6e" if i % 2 else "#5ce1ff", 40, 1100)
			souls(b.x, b.y - 170)
			sfx("boom")
			shake = 20)
	showBanner("Malakar Falls", "", 3)
	doneT = 3.4
	camKick(.07)
	sfx("bdie", null, null, 1.0, 1.0)
	Sfx.music_stop(2.5)

# ---------- guardians ----------
func gClamp(x: float) -> float:
	return clampf(x, cam + 180, cam + W - RSAFE - 120)

func startGuardian(a: int) -> void:
	var D0: Dictionary = DB.GUARD[a]
	lock = true; camLock = 0.0
	clearEnemies(); spawnQ = []
	bossTexLoad(D0.art)
	var hp: float = D0.hp * (1.5 if META.hard else 1.0) * (1.6 if rushGold() else 1.0)
	boss = {isBoss=true, guard=a, name=D0.name, x=clampf(min(W * .33, pl.x - 520), 300, W - RSAFE - 200), y=FY, oy=-950.0, vy=0.0, w=float(D0.w), h=float(D0.h),
		hp=hp, max=hp, face=1, state="enter", t=1.4, flash=0.0, vx=0.0, phase=1, fr="leap", seed=randf() * 10, last="", n=0, fadeT=0.0, guarding=0,
		weak=0.0, heat=0, spin=0.0, next="", hitP=false, fire=0.0, trail=0.0, ax=0.0, ay=0.0, blkT=-1.0, dead=false, id=_nid(), v=null, heavy=true,
		fly=D0.get("fly", 0) == 1}
	showBanner(D0.name, D0.sub, 2.4)
	sfx("broar", null, null, 1.0, .5)
	shake = 12
	sfx("alarm", null, null, 1.0, 1.0)
	musicFor()

func gWind(b, t: float, next: String, fr := "wind") -> void:
	b.state = "wind"; b.t = t; b.next = next; b.fr = fr
	sfx("warn", null, null, 1.0, .15)

func gPick(b) -> void:
	var D0: Dictionary = DB.GUARD[b.guard]
	var o: Array = D0.atk.duplicate()
	if b.phase == 2:
		o.append_array(D0.atk2)
	o = o.filter(func(x): return x != b.last)
	if o.is_empty():
		o = D0.atk.duplicate()
	var a: String = rpick(o)
	if (a == "call" or a == "howl") and en.size() >= 2:
		a = D0.atk[0]
	if b.guard == 3 and b.heat >= 2:
		a = "breath"
	b.last = a
	var k = .72 if b.phase == 2 else 1.0
	b.n = 0; b.hitP = false
	match a:
		"claw": gWind(b, .55 * k, "clunge")
		"drill": gWind(b, .7 * k, "ddash")
		"rivets":
			b.state = "spray"; b.fr = "spray"; b.t = .3; b.n = 4 if b.phase == 2 else 3; b.fire = 0.0
		"call":
			b.state = "cast"; b.fr = "spray"; b.t = .8
			spawnEnemy("d", -1); spawnEnemy("d", 1)
		"guard":
			b.state = "guard"; b.fr = "guard"; b.t = 1.7; b.guarding = 1
			sfx("block", null, null, 1.0, .06)
		"bash":
			gWind(b, .5 * k, "bash", "guard"); b.guarding = 1
		"pound": gWind(b, .8 * k, "pound", "pwind")
		"pounce":
			gWind(b, .35 * k, "xjump"); b.n = 3 if b.phase == 2 else 2
		"spin": gWind(b, .4 * k, "spin")
		"thrust":
			if D0.get("fly", 0) == 1:
				b.state = "blink"; b.fr = "cast"; b.t = .35; b.fadeT = .35
			else:
				gWind(b, .45 * k, "run")
		"howl":
			b.state = "cast"; b.fr = "howl"; b.t = .9
			spawnEnemy("h", -1); spawnEnemy("h", 1)
			sfx("broar", null, null, 1.0, .5)
		"mortar":
			b.state = "mortar"; b.fr = "aim"; b.t = .45; b.n = 4 if b.phase == 2 else 3; b.fire = 0.0
		"breath":
			b.state = "breath"; b.fr = "breath"; b.t = 1.35
			var low = randf() < .5
			hz.append({kind="beam", y=GY - 60 if low else GY - 215, low=low, t=1.05 * k + .2, act=.6, hs={}})
			sfx("warn", null, null, 1.0, .15)
		"stomp":
			gWind(b, .8 * k, "pound"); b.heat += 1
		"feathers":
			b.state = "feathers"; b.fr = "nova"; b.t = .55 * k
		"snipe":
			b.state = "aim"; b.fr = "cast"; b.t = 1.0 * k
		"rift":
			b.state = "cast"; b.fr = "nova"; b.t = 1.0
			var xs = [pl.x, pl.x - 320, pl.x + 320]
			if b.phase == 2:
				xs.append_array([pl.x - 640, pl.x + 640])
			for i in xs.size():
				hz.append({kind="pillar", x=gClamp(xs[i]), t=.9 + i * .08, act=.45, w=160.0, hs={}})
			sfx("warn", null, null, 1.0, .15)
		"halo":
			b.state = "halo"; b.fr = "nova"; b.t = .7

func gLand(b, dt: float) -> float:
	b.vy += 3000 * dt
	b.oy += b.vy * dt
	if b.oy >= 0:
		var v: float = b.vy
		b.oy = 0.0; b.vy = 0.0
		return v if v != 0 else 1.0
	return 0.0

func gQuake(b, n: int) -> void:
	for i in n:
		for d in [-1, 1]:
			hz.append({kind="quake", x=b.x + d * (90 + i * 10), dir=d, v=820.0 + i * 120, t=0.0, act=1.6, hs={}})
	shake = 18
	camKick(.03)
	dust(b.x, FY); dust(b.x + 80, FY); dust(b.x - 80, FY)
	sEnemy("smash", b)

func gShoot(b, x: float, y: float, a: float, v: float, o := {}) -> void:
	var D0: Dictionary = DB.GUARD[b.guard]
	var s = mk_shot(x, y, cos(a) * v, sin(a) * v, 18, 12 * dm(), false, 3.2, D0.glow)
	for k in o:
		s[k] = o[k]
	shots.append(s)
	sfx("en_shot_c" if D0.get("fly", 0) == 1 else "en_shot", x, y, 1.0, .05)
	muzzle(x, y, D0.glow)

func gLob(b, x0: float, y0: float, tx: float, T: float, o := {}) -> void:
	var g = 1500.0
	var s = mk_shot(x0, y0, (tx - x0) / T, (FY - 30 - y0) / T - .5 * g * T, 22, 14 * dm(), false, T + .4, DB.GUARD[b.guard].glow)
	s.g = g
	for k in o:
		s[k] = o[k]
	shots.append(s)

func gRec(b, t: float) -> void:
	b.state = "rec"; b.fr = ""; b.t = t; b.guarding = 0

func gHit(b, box: Rect2, d: float, kx: float) -> void:
	if not b.hitP and overlap(box, pbox()):
		b.hitP = true
		hurtPlayer(d * dm(), kx)

func gFwd(b, w: float, h: float) -> Rect2:
	return Rect2(b.x if b.face > 0 else b.x - w, b.y - h, w, h)

func gEdge(b) -> bool:
	return b.x < cam + 180 or b.x > cam + W - RSAFE - 120

func updGuardian(b, dt: float) -> void:
	var D0: Dictionary = DB.GUARD[b.guard]
	var fly: bool = D0.get("fly", 0) == 1
	b.flash -= dt; b.t -= dt
	b.fadeT = max(0.0, b.fadeT - dt)
	var dx: float = pl.x - b.x
	var ad = absf(dx)
	var k = .72 if b.phase == 2 else 1.0
	if b.phase == 1 and b.hp < b.max * .5 and b.state != "enter":
		b.phase = 2
		showBanner(D0.name + " enraged", "", 1.4)
		sfx("broar", null, null, 1.0, .5)
		shake = 16
		ring(b.x, b.y - b.h / 2.0, "#ff3d6e", 360)
		camKick(.04)
	var hover: float = (-200 + sin(lvT * 2 + b.seed) * 14) if fly else 0.0
	if b.state == "enter":
		if fly:
			b.oy += (hover - b.oy) * min(1.0, dt * 2.4)
			if b.t <= 0:
				b.state = "idle"; b.t = 1.0; b.fr = ""
		elif gLand(b, dt) != 0:
			shake = 18
			camKick(.03)
			dust(b.x, FY); dust(b.x + 90, FY); dust(b.x - 90, FY)
			sfx("boom")
			b.state = "idle"; b.t = 1.1; b.fr = ""
		b.y = FY + b.oy
		return
	var st: String = b.state
	var moving: bool = st in ["clunge", "ddash", "bash", "xjump", "run", "lance", "spin"]
	if not moving and st != "stuck":
		b.face = int(sgn(dx)) if dx != 0 else 1
	if st == "idle":
		b.fr = ""
		var want = 1.0 if ad > D0.range + 60 else -1.0 if ad < D0.range - 120 else 0.0
		var spd = 300.0 if fly else 420.0 if b.guard == 2 else 210.0
		b.vx += (want * sgn(dx) * spd - b.vx) * min(1.0, dt * 4)
		b.x = gClamp(b.x + b.vx * dt)
		if fly:
			b.oy += (hover - b.oy) * min(1.0, dt * 3)
		if b.t <= 0:
			gPick(b)
	elif st == "wind":
		b.vx *= pow(.01, dt)
		if fly and b.next == "lance":
			b.oy += (-40 - b.oy) * min(1.0, dt * 8)
		if b.t <= 0:
			var n: String = b.next
			b.state = n
			b.hitP = false
			match n:
				"clunge":
					b.fr = "swing"; b.t = .32; b.vx = b.face * 1250.0
					sEnemy("swipe", b)
				"ddash":
					b.fr = "drill"; b.t = .85; b.vx = b.face * 1500.0
					sfx("boom")
				"bash":
					b.fr = "bash"; b.t = .6; b.vx = b.face * 1250.0
					sfx("boom")
				"pound":
					b.fr = "pound" if b.guard == 1 else "swing"
					b.t = .7 * k
					gQuake(b, 2 if b.phase == 2 else 1)
					if b.guard == 1 and b.phase == 2:
						for i in 3:
							hz.append({kind="rock", x=clampf(pl.x + (randf() - .5) * 1100, cam + 120, cam + W - RSAFE), t=.9 + i * .15, act=.2, hs={}})
				"xjump":
					b.fr = "leap"; b.vy = -1050.0
					b.vx = clampf((pl.x - b.x) / .7, -1300, 1300)
					sEnemy("leap", b)
				"spin":
					b.fr = "spin"; b.t = .95; b.spin = 0.0
					sEnemy("swipe", b)
				"run":
					b.fr = ""; b.t = .95; b.vx = b.face * 1550.0; b.trail = b.x
					sfx("boom")
				"lance":
					b.fr = "thrust"; b.t = .42; b.vx = b.face * 1700.0
					sfx("boom")
	elif st == "clunge":
		b.x += b.vx * dt
		b.vx *= pow(.05, dt)
		gHit(b, gFwd(b, b.w / 2.0 + 190, b.h * .8), 18, b.face * 800)
		if b.t <= 0 or gEdge(b):
			b.x = gClamp(b.x)
			gRec(b, .6 * k)
	elif st == "ddash":
		b.x += b.vx * dt
		if randf() < .7:
			part(b.x + b.face * 120, b.y - b.h * .45, -b.vx * .2 + (randf() - .5) * 300, -randf() * 300, .3, "#ffe066", 5, 1600)
		gHit(b, gFwd(b, b.w / 2.0 + 150, b.h * .7), 20, b.face * 900)
		if gEdge(b):
			b.x = gClamp(b.x); b.vx = 0.0
			shake = 14
			camKick(.03)
			sfx("boom")
			b.state = "stuck"; b.fr = "drill"; b.t = 1.1; b.weak = 1.5
			ftext(b.x, b.y - b.h - 30, "Stuck!", "#ffd27a", true)
			sparks(b.x + b.face * 130, b.y - b.h * .45, "#ffe066", 16, -b.face)
		elif b.t <= 0:
			gRec(b, .5)
	elif st == "stuck":
		if randf() < .3:
			part(b.x + b.face * 130, b.y - b.h * .45, (randf() - .5) * 200, -200, .3, "#ffe066", 5, 1200)
		if b.t <= 0:
			b.weak = 0.0
			gRec(b, .3)
	elif st == "spray":
		b.fire -= dt
		if b.fire <= 0 and b.t <= 0:
			b.fire = .32
			b.n -= 1
			var x0: float = b.x + b.face * 90
			var y0: float = b.y - b.h * .85
			for i in 4:
				gLob(b, x0, y0, pl.x + (i - 1.5) * 150 + (randf() - .5) * 60, .75 + i * .07, {r=12.0, dmg=9 * dm(), col="#ffe066"})
			sEnemy("shot", b)
			muzzle(x0, y0, "#ffe066")
			if b.n <= 0:
				gRec(b, .8 * k)
	elif st == "guard":
		b.x = gClamp(b.x + b.face * 120 * dt)
		if b.t <= 0:
			if randf() < .5 and ad < 900:
				gWind(b, .35, "bash", "guard")
				b.guarding = 1
			else:
				gRec(b, .6)
	elif st == "bash":
		b.x += b.vx * dt
		b.vx *= pow(.3, dt)
		if randf() < .5:
			dust(b.x - b.face * 60, FY)
		gHit(b, gFwd(b, b.w / 2.0 + 90, b.h), 18, b.face * 1100)
		if b.t <= 0 or gEdge(b):
			b.x = gClamp(b.x)
			shake = 10
			gRec(b, .75 * k)
	elif st == "pound":
		if b.t <= 0:
			gRec(b, .5)
	elif st == "xjump":
		b.x = gClamp(b.x + b.vx * dt)
		gHit(b, ebox(b), 16, sgn(b.vx if b.vx != 0 else 1.0) * 650)
		if gLand(b, dt) != 0:
			dust(b.x, FY)
			shake = 6
			b.vx = 0.0
			b.n -= 1
			if b.n > 0:
				gWind(b, .45 * k, "xjump")
			else:
				gRec(b, 1.0)
	elif st == "spin":
		b.vx += (sgn(dx) * 560 - b.vx) * min(1.0, dt * 3)
		b.x = gClamp(b.x + b.vx * dt)
		b.spin += dt
		if not b.hitP and Vector2(pl.x - b.x, pl.y - 90 - (b.y - 70)).length() < 180:
			b.hitP = true
			hurtPlayer(14 * dm(), sgn(pl.x - b.x) * 800)
		if randf() < .6:
			sparks(b.x, b.y - 60, "#ff9638", 3, 1.0 if randf() < .5 else -1.0)
		if b.t <= 0:
			gRec(b, .7 * k)
	elif st == "run":
		b.x += b.vx * dt
		part(b.x - b.face * 90, b.y - 60, -b.vx * .15, -60, .35, "#ff9638", 14, 0)
		if absf(b.x - b.trail) > 110:
			b.trail = b.x
			hz.append({kind="fire", x=b.x - b.face * 60, t=0.0, act=2.4, w=120.0, hitT=0.0, hs={}})
		gHit(b, ebox(b), 14, b.face * 700)
		if b.t <= 0 or gEdge(b):
			b.x = gClamp(b.x); b.vx = 0.0
			gRec(b, .8 * k)
	elif st == "mortar":
		b.fire -= dt
		if b.fire <= 0 and b.t <= 0:
			b.fire = .28
			b.n -= 1
			var x0: float = b.x + b.face * 120
			var y0: float = b.y - b.h * .88
			gLob(b, x0, y0, clampf(pl.x + (randf() - .5) * 420, cam + 140, cam + W - RSAFE - 60), 1.05, {r=24.0, dmg=14 * dm(), puddle=true})
			sEnemy("smash", b)
			muzzle(x0, y0, "#ff6418")
			if b.n <= 0:
				b.heat += 1
				gRec(b, .8 * k)
	elif st == "breath":
		if b.t < .9 and randf() < .8:
			part(b.x + b.face * 40, b.y - b.h * .62, b.face * (500 + randf() * 400), (randf() - .5) * 200, .4, "#ffb040", 16, 0, "glow")
		if b.t <= 0:
			b.state = "vent"; b.fr = "vent"; b.t = 2.3; b.weak = 2.0; b.heat = 0
			ftext(b.x, b.y - b.h - 30, "Overheated!", "#ffb040", true)
			sfx("vent", b.x, null, 1.0, .3)
	elif st == "vent":
		if randf() < .7:
			part(b.x + (randf() - .5) * b.w, b.y - b.h * (.5 + randf() * .4), (randf() - .5) * 80, -240 - randf() * 160, 1, "rgba(220,225,235,.35)", 34, -60, "norm")
		if b.t <= 0:
			b.weak = 0.0
			gRec(b, .4)
	elif st == "blink":
		if b.t <= 0 and b.fadeT <= 0:
			var side = -1.0 if pl.x - cam > W / 2.0 else 1.0
			b.x = gClamp(pl.x + side * 480)
			b.face = int(-side)
			teleFx(b.x, b.y, b.h)
			b.fadeT = .3
			gWind(b, .5 * k, "lance")
	elif st == "lance":
		b.x += b.vx * dt
		part(b.x - b.face * 60, b.y - b.h * .5, -b.vx * .1, 0, .25, "#a8f0ff", 10, 0)
		gHit(b, gFwd(b, b.w / 2.0 + 200, b.h * .6), 20, b.face * 900)
		if b.t <= 0 or gEdge(b):
			b.x = gClamp(b.x); b.vx = 0.0
			gRec(b, .8 * k)
	elif st == "feathers":
		if b.t <= 0:
			var n = 9 if b.phase == 2 else 7
			var x0: float = b.x - b.face * 20
			var y0: float = b.y - b.h * .8
			var a0 = atan2(pl.y - 90 - y0, pl.x - x0)
			for i in n:
				gShoot(b, x0, y0, a0 + (i - (n - 1) / 2.0) * .17, 560, {col="#a8f0ff"})
			gRec(b, .9 * k)
	elif st == "aim":
		var x0: float = b.x + b.face * 140
		var y0: float = b.y - b.h * .55
		if b.t > .25:
			b.ax = pl.x; b.ay = pl.y - 90
		OVL.append([x0, y0, b.ax, b.ay, .45 if b.t > .25 else .95])
		if b.t <= 0:
			gShoot(b, x0, y0, atan2(b.ay - y0, b.ax - x0), 1500, {r=16.0, dmg=22 * dm(), col="#ff4a6a"})
			gRec(b, .7 * k)
	elif st == "halo":
		if b.t <= 0:
			var x0: float = b.x
			var y0: float = b.y - b.h * .6
			for i in 14:
				gShoot(b, x0, y0, i / 14.0 * TAU + lvT, 420, {col="#e030c0", r=16.0})
			ring(x0, y0, "#e030c0", 300)
			gRec(b, 1.0)
	elif st == "cast":
		if b.t <= 0:
			gRec(b, .9 * k)
	elif st == "rec":
		b.vx *= pow(.02, dt)
		if fly:
			b.oy += (hover - b.oy) * min(1.0, dt * 3)
		if b.t <= 0:
			b.state = "idle"
			b.t = (.8 if fly else 1.0) * k
			b.fr = ""
			b.guarding = 0
	if st != "xjump" and not fly and b.oy < 0:
		gLand(b, dt)
	b.y = FY + b.oy
	if not moving and b.fadeT == 0 and overlap(ebox(b), pbox()):
		hurtPlayer(6 * dm(), (-1 if pl.x < b.x else 1) * 700)

## shields and weak spots: called from damage() before a hit lands
func guardHit(e, d: float) -> float:
	if e.guarding and pl != null and int(sgn(pl.x - e.x)) == e.face:
		if e.blkT < lvT:
			e.blkT = lvT + .25
			sfx("block", null, null, 1.0, .06)
			sparks(e.x + e.face * 110, e.y - e.h * .55, "#ffcc4a", 10, e.face)
			ftext(e.x + e.face * 80, e.y - e.h - 20, "Blocked", "#ffcc4a")
		return 0.0
	return d * e.weak if e.weak > 0 else d

func guardianDown(b) -> void:
	var a: int = b.guard
	var D0: Dictionary = DB.GUARD[a]
	var had: bool = META.guards.has(str(a))
	codexAdd("G" + str(a))
	stat("guards")
	feat("first")
	if not b.get("hitMe", false):
		feat("nohit")
	b.dead = true
	boss = null
	lock = false; camLock = null
	G.score += 3000
	hz = []
	shots = shots.filter(func(s): return s.friend)
	for e in en:
		e.dead = true
		burst(e.x, e.y - e.h / 2.0, "#ff4fd8", 16)
	en = []; spawnQ = []
	var x: float = b.x
	var y: float = b.y
	shake = 26
	camKick(.06)
	sfx("boom"); sfx("gate", null, null, 1.0, .2)
	explode({x=x, y=y, w=b.w, h=b.h, heavy=true})
	for i in 5:
		later(.18 + i * .22, func():
			if ROOM == null or ROOM.kind != "shrine":
				return
			burst(x + (randf() - .5) * b.w * 2, y - randf() * b.h, D0.glow if i % 2 else "#ffd27a", 30, 900)
			sfx("boom")
			shake = 14)
	META.guards[str(a)] = 1
	save_meta()
	addDust(40, x, y - b.h - 40)
	showBanner(D0.name + " defeated", "" if G.rush != null else "The shrine awakens", 2.6)
	if G.rush != null:
		G.rush.next = 3.0
	if not had:
		META.arm = a
		padArms()
		later(2.9, func():
			if G.state == "play":
				var A: Dictionary = DB.ARMS[a]
				showBanner("Guardian Arm: " + A.name, ("Tap ◈ to fire, tap its label to switch" if touchy else "U to fire, I to switch") + " · " + A.how, 3.6))
	picks.append(mk_pick(gClamp(x), FY - 130, "core", "core" + str(a), true, null))
	picks.append(mk_drop(x + 80, y - b.h / 2.0, 160, -600, "med", 14))
	musicFor()

# ---------- shots and hazards ----------
func circleBox(s, b: Rect2) -> bool:
	var cx = clampf(s.x, b.position.x, b.position.x + b.size.x)
	var cy = clampf(s.y, b.position.y, b.position.y + b.size.y)
	return (s.x - cx) * (s.x - cx) + (s.y - cy) * (s.y - cy) < s.r * s.r

func atkBox():
	var p = pl
	if not (p.atk > 0):
		return null
	var reach = reachOf(240.0 if p.combo == 3 else 180.0)
	return Rect2(p.x - 10 if p.face > 0 else p.x - reach + 10, p.y - 190, reach, 190)

func _shotVsPl(s) -> bool:
	var ab = atkBox()
	if pl.aegis > 0 and absf(s.y - (pl.y - 90)) < 140 and (s.x - pl.x) * pl.face > -20 and (s.x - pl.x) * pl.face < 170:
		s.life = 0.0
		sparks(s.x, s.y, "#ffcc4a", 8, pl.face)
		sfx("deflect", null, null, 1.0, .04)
		return true
	elif ab != null and circleBox(s, ab):
		s.friend = true
		s.vx = pl.face * absf(s.vx) * 1.5 + pl.face * 200
		s.vy *= -.4
		s.hit = {}
		s.dmg *= 2.2
		s.col = "#5ce1ff"
		s.life = 1.5
		sfx("deflect", null, null, 1.0, .04)
		ftext(s.x, s.y - 30, "Deflect", "#5ce1ff")
		ring(s.x, s.y, "#5ce1ff", 80)
		pl.en = min(100.0, pl.en + 8)
		return true
	elif circleBox(s, pbox()):
		hurtPlayer(s.dmg, sgn(s.vx) * 380)
		s.life = 0.0
		burst(s.x, s.y, s.col, 10)
		return true
	return false

func updShots(dt: float) -> void:
	for s in shots:
		if s.g != 0:
			s.vy += s.g * dt
		s.x += s.vx * dt
		s.y += s.vy * dt
		s.life -= dt
		if s.boom and s.vy > 0 and s.y > FY - 26:
			s.life = 0.0
			slagBoom(s)
			continue
		var blocked = false
		if not s.friend:
			for P in players():
				if P.dead:
					continue
				if withPl(P, _shotVsPl.bind(s)):
					blocked = true
					break
		if blocked:
			continue
		if s.g != 0 and not s.friend and s.vy > 0 and s.y > FY - 26:
			s.life = 0.0
			if s.puddle:
				hz.append({kind="fire", x=s.x, t=0.0, act=2.6, w=150.0, hitT=0.0, hs={}})
				burst(s.x, FY - 20, "#ff6418", 14, 600)
				sfx("crate1", s.x, FY, 1.0, .04)
			else:
				burst(s.x, FY - 10, s.col, 6, 300)
			continue
		if s.friend:
			hitBoxesWith(Rect2(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2), s.hit)
			for e in allTargets():
				if s.hit.has(e.id):
					continue
				if circleBox(s, ebox(e)):
					s.hit[e.id] = 1
					damage(e, s.dmg * (1 + G.lv * .05), sgn(s.vx) * 500)
					if not s.pierce:
						s.life = 0.0
						if s.boom:
							slagBoom(s)
						break
		if not s.wave and inSolid(s.x, s.y):
			s.life = 0.0
			burst(s.x, s.y, s.col, 6, 300)
			sfx("fizz", null, null, .6, .05)
		if offView(s.x, s.y):
			s.life = 0.0
		if randf() < .4:
			part(s.x, s.y, 0, 0, .25, s.col, 14.0 if s.wave else 6.0, 0)
	shots = shots.filter(func(s): return s.life > 0)

func _hzHit(h: Dictionary, P) -> bool:
	if h.hs.has(P.id):
		return true
	h.hs[P.id] = 1
	return false

func _hurtAs(P, d: float, kx: float) -> void:
	withPl(P, func(): hurtPlayer(d, kx))

func updHz(dt: float) -> void:
	var PS = players()
	for h in hz:
		if h.kind == "quake":
			h.x += h.dir * h.v * dt
			h.act -= dt
			if randf() < .6:
				part(h.x, FY - 4, (randf() - .5) * 120, -200 - randf() * 200, .4, "#ffb347", 6, 900)
			for P0 in PS:
				if not P0.dead and P0.y > FY - 60 and absf(P0.x - h.x) < 55 and not _hzHit(h, P0):
					_hurtAs(P0, 15 * dm(), h.dir * 650)
			continue
		if h.kind == "fire":
			h.act -= dt
			if randf() < .35:
				part(h.x + (randf() - .5) * h.w, FY - 6, (randf() - .5) * 40, -160 - randf() * 120, .5, "#ff9638", 10, -200, "glow")
			h.hitT -= dt
			if h.hitT <= 0:
				for P0 in PS:
					if not P0.dead and P0.ground and P0.y > FY - 10 and absf(P0.x - h.x) < h.w / 2.0 + 20:
						h.hitT = .8
						_hurtAs(P0, 10 * dm(), (-1 if P0.x < h.x else 1) * 300)
			continue
		if h.t > 0:
			h.t -= dt
			if h.t <= 0:
				if h.kind == "rock":
					sfx("crate1", h.x, FY, 1.0, .04)
					shake = max(shake, 7.0)
					burst(h.x, FY - 20, "#c8b8a0", 14, 600)
					debris(h.x, FY - 60, "crate")
					for P0 in PS:
						if not P0.dead and absf(P0.x - h.x) < 85:
							_hurtAs(P0, 16 * dm(), (-1 if P0.x < h.x else 1) * 500)
					continue
				sfx("boom")
				shake = max(shake, 14.0 if h.kind == "beam" else 9.0)
				if h.kind == "pillar":
					burst(h.x, GY, "#ff3d6e", 24, 900)
			continue
		if h.kind == "rock":
			h.act -= dt
			continue
		h.act -= dt
		for P0 in PS:
			if P0.dead:
				continue
			var pb = Rect2(P0.x - 42, P0.y - 168, 84, 168)
			if h.kind == "pillar" and absf(P0.x - h.x) < h.w / 2.0 + 30 and not _hzHit(h, P0):
				_hurtAs(P0, 22, (-1 if P0.x < h.x else 1) * 600)
			if h.kind == "beam" and pb.position.y < h.y + 38 and pb.position.y + pb.size.y > h.y - 38 and not _hzHit(h, P0):
				_hurtAs(P0, 26, (-1 if P0.x < cam + W / 2.0 else 1) * 500)
	hz = hz.filter(func(h): return h.t > 0 or h.act > 0)

# ---------- pickups and supply crates ----------
func dropFrom(e) -> void:
	var big: bool = e.type == "b" or e.type == "B"
	var pop = func(t: String): picks.append(mk_drop(e.x, e.y - e.h / 2.0, (randf() - .5) * 360, -650, t, 12))
	if e.type == "B":
		pop.call("med"); pop.call("shard"); pop.call("fang" if randf() < .5 else "shield")
		return
	if big:
		pop.call("fruit" if randf() < .7 else "med")
		if randf() < .4:
			pop.call("shard")
		return
	var v = randf()
	if v < .18:
		pop.call("fruit")
	elif v < .36:
		pop.call("shard")
	elif v < .48:
		pop.call("coin")

func applyPick(k: Dictionary) -> void:
	var p = pl
	if p.remote:
		netSend("pick", [k.type])
	var Pk: Dictionary = DB.PICK[k.type]
	sPick(k.type)
	buzz(12)
	match k.type:
		"fruit": p.hp = min(p.max, p.hp + 25)
		"med": p.hp = min(p.max, p.hp + 60)
		"shard": p.en = min(100.0, p.en + 35)
		"shield":
			p.shield = 3; p.shieldT = 14.0
		"fang": p.fury = 20.0 if hasR("fury") else 10.0
		"coin":
			G.score += 250
			addDust(2)
		"tank":
			META.tanks[k.id] = 1
			save_meta()
			p.max = maxHP(); p.hp = p.max
			buzz([30, 30, 60])
			hitStop = .25
		"egg":
			G.lives = min(5, G.lives + 1)
			if k.id != null:
				META.items[k.id] = 1
				save_meta()
		"core":
			if k.id != null:
				META.items[k.id] = 1
				save_meta()
			hitStop = .3
			buzz([30, 30, 60])
			p.en = 100.0
		"sfang":
			if k.id != null:
				META.items[k.id] = 1
				save_meta()
			hitStop = .3
			buzz([30, 30, 60])
			sItem()
			for i in 3:
				ring(p.x, p.y - 100, "#ff7a5a", 160 + i * 80)
		"lore":
			if k.id != null:
				META.items[k.id] = 1
				save_meta()
			var a: int = G.lv
			later(.35, func(): showLore(a))
	var big: bool = k.type in ["egg", "tank", "core", "sfang"]
	ftext(p.x, p.y - 200, Pk.txt, Pk.col, big)
	ring(k.x, k.y, Pk.col, 90)
	burst(k.x, k.y, Pk.col, 10, 380)
	if k.type != "coin":
		sparkle(k.x, k.y, Pk.col)

func updPicks(dt: float) -> void:
	var mag: bool = pl != null and not pl.dead and hasR("lode")
	for k in picks:
		if mag and not (k.cage != null and not k.cage.broken) and k.type != "lore":
			var dx: float = pl.x - k.x
			var dy: float = pl.y - 90 - k.y
			var dd = sqrt(dx * dx + dy * dy)
			if dd < 520 and dd > 10:
				k.x += dx / dd * min(dd, 900 * dt)
				k.y += dy / dd * min(dd, 900 * dt)
		if not k.flt:
			k.vy += 1800 * dt
			k.x += k.vx * dt
			k.vx *= pow(.2, dt)
			k.y += k.vy * dt
			k.x = clampf(k.x, 80, RW - 80)
			var sf = surfaceBelow(k.x, k.y) - 26
			if k.y > sf:
				k.y = sf
				k.vy = 0.0
			k.life -= dt
		if k.cage != null and not k.cage.broken:
			continue
		if pl != null and not pl.dead and absf(pl.x - k.x) < 72 and absf(pl.y - 90 - k.y) < 125:
			k.life = 0.0
			k.got = true
			applyPick(k)
		elif pl2 != null and NETR == "host" and not pl2.dead and absf(pl2.x - k.x) < 72 and absf(pl2.y - 90 - k.y) < 125:
			k.life = 0.0
			k.got = true
			withPl(pl2, func(): applyPick(k))
	picks = picks.filter(func(k): return (not k.got) if k.flt else k.life > 0)

func boxRect(b) -> Rect2:
	return Rect2(b.x - 56, FY - 98, 112, 98)

func hitBox(b) -> void:
	if b.hp <= 0:
		return
	b.hp -= 1
	b.flash = .12
	sfx("crate0", b.x, FY, 1.0, .04)
	burst(b.x, FY - 50, "#ffd27a", 8, 450)
	sparks(b.x, FY - 50, "#fff3c4", 6, sgn(b.x - pl.x) if b.x != pl.x else 1.0)
	if b.hp <= 0:
		shake = max(shake, 5.0)
		burst(b.x, FY - 50, DB.PAL[curTh()].metal, 22, 700)
		debris(b.x, FY - 90, "crate")
		ring(b.x, FY - 50, "#ffd27a", 140)
		sfx("crate1", b.x, FY, 1.0, .04)
		G.score += 50
		for t in [b.drop, b.drop2]:
			if t != null:
				picks.append(mk_drop(b.x, FY - 90, (randf() - .5) * 300, -750, t, 14))

func hitBoxesWith(box: Rect2, done: Dictionary) -> void:
	if NETR == "client":
		return
	for b in boxes:
		if b.hp > 0 and not done.has(b.id) and overlap(box, boxRect(b)):
			done[b.id] = 1
			hitBox(b)

func updBoxes(dt: float) -> void:
	for b in boxes:
		b.flash -= dt
	boxes = boxes.filter(func(b): return b.hp > 0)

# ---------- Guardian Arms ----------
func ownArm(i: int) -> bool:
	return i >= 0 and META.guards.has(str(int(DB.ARMS[i].g)))

func cycleArm() -> void:
	var own = []
	for i in DB.ARMS.size():
		if ownArm(i):
			own.append(i)
	if own.is_empty():
		return
	var i = own.find(int(META.arm))
	META.arm = own[(i + 1) % own.size()]
	padArms()
	sfx("weapon", null, null, 1.0, .05)
	if pl:
		ftext(pl.x, pl.y - 220, DB.ARMS[META.arm].name, DB.ARMS[META.arm].col)

func fireArm(p) -> void:
	var i: int = META.arm
	if not ownArm(i):
		return
	var A: Dictionary = DB.ARMS[i]
	if p.en < A.cost:
		if hintT <= 0:
			hintT = 1
			ftext(p.x, p.y - 210, "Not enough Aether", "#9d97bd")
		return
	p.en -= A.cost
	p.armCD = .35
	if NETR == "client" and i != 1 and i != 2:
		netSend("arm", [i])
		muzzle(p.x + p.face * 60, p.y - 100, A.col)
		buzz(15)
		return
	if i != 1:
		sfx("en_shot", null, null, 1.0, .03, [1.25, 1.0, .8, .7, 1.4][i])
	armFx(p, i)

func armFx(p, i: int) -> void:
	var A: Dictionary = DB.ARMS[i]
	var x: float = p.x + p.face * 60
	var y: float = p.y - 100
	var f: float = p.face
	var dmg = pdm()
	muzzle(x, y, A.col)
	buzz(15)
	if i == 0:
		for k in 3:
			var s = mk_shot(x, y, f * (620 + k * 230), -520 - k * 60, 14, 12 * dmg, true, 1.6, A.col)
			s.g = 1500.0
			shots.append(s)
	elif i == 1:
		p.aegis = 3.0
		sfx("block", null, null, 1.0, .06)
		ring(p.x + f * 110, p.y - 95, A.col, 150)
	elif i == 2:
		p.dashT = .32; p.thr = 1; p.thrHit = {}
		p.inv = max(p.inv, .4); p.atk = 0.0
		sfx("dash", null, null, 1.0, .08)
		shake = 6
	elif i == 3:
		var s = mk_shot(x, y - 20, f * 820, -760, 22, 20 * dmg, true, 2.4, A.col, {boom=true})
		s.g = 1500.0
		shots.append(s)
		sEnemy("smash", {x=x, y=y})
	else:
		for k in [-2, -1, 0, 1, 2]:
			var a: float = k * .13
			shots.append(mk_shot(x, y, f * cos(a) * 1300, sin(a) * 1300, 14, 14 * dmg, true, .75, A.col, {pierce=true}))

func slagBoom(s) -> void:
	burst(s.x, FY - 30, "#ff6418", 26, 800)
	ring(s.x, FY - 40, "#ffb040", 190)
	shake = max(shake, 8.0)
	sfx("boom")
	for e in allTargets():
		if absf(e.x - s.x) < 180 + e.w / 2.0 and e.y - e.h < FY and absf(e.y - FY) < e.h + 120:
			damage(e, 40 * pdm(), sgn(e.x - s.x) * 500)
	hitBoxesWith(Rect2(s.x - 180, FY - 200, 360, 200), {})

# ---------- Sable of the Ninth Talon ----------
func allyJoin(mode: String, quiet := false) -> void:
	if ally != null or pl == null:
		return
	bossTexLoad("sable")
	var side = -1.0 if pl.x - cam > W / 2.0 else 1.0
	ally = {x=clampf(pl.x + side * 320, cam + 140, cam + W - RSAFE - 60), y=FY, oy=-900.0, vy=0.0, vx=0.0, face=int(-side), state="drop", t=0.0,
		atkCD=.6, mode=mode, line="" if quiet else rpick(DB.T.SLINE.join), lt=3.0, hit={}, w=90.0, h=200.0, seed=randf() * 9, leaveT=0.0, id=_nid(), v=null}
	if not quiet:
		showBanner("Sable joins the fight!", "Talon Knight of the Starblood", 1.8)

func allyTarget():
	var best = null
	var bd = 1e9
	for e in allTargets():
		if e.dead or e.get("fade", 0.0) > 0:
			continue
		var d: float = absf(e.x - ally.x) + (150.0 if e.fly else 0.0)
		if d < bd:
			bd = d
			best = e
	return best

func allySay(k: String) -> void:
	if ally != null and ally.lt <= 0 and randf() < .5:
		ally.line = rpick(DB.T.SLINE[k])
		ally.lt = 2.4

func updAlly(dt: float) -> void:
	var a = ally
	if a == null:
		return
	a.t -= dt; a.atkCD -= dt; a.lt -= dt
	if a.state == "drop":
		a.vy += 3000 * dt
		a.oy += a.vy * dt
		if a.oy >= 0:
			a.oy = 0.0; a.vy = 0.0; a.state = "idle"
			shake = max(shake, 8.0)
			dust(a.x, FY); dust(a.x + 50, FY); dust(a.x - 50, FY)
			ring(a.x, FY - 20, "#5ce1d8", 180)
			sfx("land_big")
		a.y = FY + a.oy
		return
	if a.state == "leave":
		a.oy -= 1400 * dt
		a.y = FY + a.oy
		if a.oy < -900:
			ally = null
		return
	var fighting: bool = lock or (boss != null and not boss.dead)
	if not fighting:
		a.leaveT += dt
		if a.leaveT > 1.2 and a.state == "idle":
			a.state = "leave"
			a.line = rpick(DB.T.SLINE.leave)
			a.lt = 2.5
			teleFx(a.x, a.y, a.h)
			ring(a.x, a.y - 100, "#5ce1d8", 200)
	var T = allyTarget()
	var lo = cam + 120
	var hi = cam + W - RSAFE - 60
	var want = 0.0
	if a.state == "idle" or a.state == "run":
		if T != null:
			var dx: float = T.x - a.x
			if dx != 0:
				a.face = int(sgn(dx))
			var reach: float = 170 + T.w / 2.0
			if absf(dx) > reach - 20:
				want = sgn(dx)
			elif a.atkCD <= 0:
				a.state = "wind"; a.t = .22; a.hit = {}
			if T.fly and absf(dx) < 320 and a.oy == 0 and a.atkCD <= 0 and T.y < FY - 220:
				a.state = "leap"; a.vy = -1300.0; a.hit = {}
		else:
			var fx: float = pl.x - pl.face * 170
			var dx: float = fx - a.x
			if absf(dx) > 60:
				want = sgn(dx)
			a.face = int(want) if want != 0 else (int(sgn(pl.x - a.x)) if pl.x != a.x else 1)
		a.vx += (want * 560 - a.vx) * min(1.0, dt * 8)
		if a.state == "idle" or a.state == "run":
			a.state = "run" if absf(a.vx) > 60 else "idle"
	else:
		a.vx *= pow(.02, dt)
	if a.state == "wind" and a.t <= 0:
		a.state = "swing"; a.t = .24; a.vx = a.face * 380.0
		sfx("swing3", null, null, .8, .04)
	if a.state == "swing" or a.state == "leap":
		var box = Rect2(a.x - 10 if a.face > 0 else a.x - 230, a.y - 210, 240, 220)
		for e in allTargets():
			if not a.hit.has(e.id) and overlap(box, ebox(e)):
				a.hit[e.id] = 1
				var was: float = e.hp
				damage(e, 18 * (1 + G.lv * .1), a.face * 420)
				if e.dead or e.hp <= 0:
					allySay("hit")
				elif was == e.hp and e.get("guarding", 0):
					a.atkCD = .8
		if a.state == "swing" and a.t <= 0:
			a.state = "idle"
			a.atkCD = .55 + randf() * .3
	if a.state == "leap":
		a.vy += 3000 * dt
		a.oy += a.vy * dt
		if a.oy >= 0:
			a.oy = 0.0; a.vy = 0.0; a.state = "idle"; a.atkCD = .6
			dust(a.x, FY)
	a.x = clampf(a.x + a.vx * dt, lo if lock else 80.0, hi if lock else RW - 80)
	a.y = FY + a.oy

# ---------- Claude, the archive automaton ----------
const NEED := {high="double", crack="dash", laser="roar", slam="slam", plasma="plasma"}

func npcHint() -> String:
	var a: int = ROOM.a
	if a == 5:
		if META.boss:
			return "You did it. The archive will remember this forever."
		return ["Malakar waits past the last arena. When his sword flashes, jump the crescent waves, or swipe them back at him.",
			"When Malakar raises his blade, he is about to dash. Get ready to jump.", "In his last phase he dashes twice. Do not stop moving."][int(lvT / 8) % 3]
	if not gDone(a):
		return "The shrine guardian here is %s. %s" % [DB.GUARD[a].name, DB.GUARD[a].tip]
	var A0: Dictionary = abilOf(a)
	if not hasAb(A0.id):
		return "The shrine is awake now. Go and claim the %s!" % A0.name
	var rnd: bool = DB.WORLD_SEED != 0
	if not META.items.has("sfang" + str(a)):
		if not rnd:
			return "My sensors ping a hollow wall in this world's climbing shaft, halfway up on the west side. Give it a good scratch."
		for id in DB.AREAS[a]:
			var o: Dictionary = DB.ROOMS[id]
			for d in o.doors:
				if DB.ROOMS[d.to].kind == "secret":
					return "My sensors ping a hollow wall %s, by the west door of %s %s. Give it a good scratch." % [_dirTo(o), "a climbing shaft" if o.kind == "shaft" else "a hall", "in " + String(o.zn)]
	for k in [0, 1]:
		if not META.tanks.has(str(a) + "-" + str(k)):
			var need: String = NEED[DB.TANKS[a][k]]
			var ab: Dictionary = {}
			for q in DB.ABIL:
				if q.id == need:
					ab = q
			var place = "at the far end of the gate hall" if k else "in the room just below this station"
			if rnd:
				for id in DB.AREAS[a]:
					for it in DB.ROOMS[id].items:
						if it.type == "tank" and it.id == str(a) + "-" + str(k):
							place = "in a side room %s, in %s" % [_dirTo(DB.ROOMS[id]), DB.ROOMS[id].zn]
			return "An Energy Tank is waiting %s. " % place + ("You already have what you need to reach it." if hasAb(ab.id) else "You will need the %s first." % ab.name)
	if not META.items.has("egg" + str(a)):
		return "A Golden Egg is tucked up high at the far end of the shrine room."

	var idle: Array = DB.T.NPC_IDLE
	return idle[int(lvT / 9) % idle.size()]

## rough direction from this room to another, for hints
func _dirTo(o: Dictionary) -> String:
	var dx: float = (o.gx + o.w / 2.0) - (ROOM.gx + ROOM.w / 2.0)
	var dy: float = (o.gy + o.h / 2.0) - (ROOM.gy + ROOM.h / 2.0)
	if absf(dx) < 1 and absf(dy) < 1:
		return "close by"
	if absf(dy) > absf(dx) * 1.5:
		return "above here" if dy < 0 else "below here"
	return ("to the east" if dx > 0 else "to the west") + (" and up" if dy < -1 else " and down" if dy > 1 else "")

func npcGift(a: int) -> void:
	if npc == null:
		return
	var gifts: Array = DB.T.NPC_GIFT[a]
	for i in gifts.size():
		picks.append(mk_drop(npc.x + 60 + i * 50, npc.y - 60, 120 + i * 90, -700, gifts[i], 20))
	sItem()
	ring(npc.x, npc.y - 60, "#ffb08a", 200)
	burst(npc.x, npc.y - 60, "#ffd27a", 20, 600)
	npc.line = npcHint()
	npc.lt = 8.0

func updNPC(dt: float) -> void:
	if npc == null or pl == null:
		return
	var dx: float = pl.x - npc.x
	npc.near = not pl.dead and absf(dx) < 300 and absf(pl.y - GY) < 220
	npc.face = -1 if dx < 0 else 1
	npc.cool -= dt
	npc.lt -= dt
	if not npc.near or lock or G.state != "play" or TRANS.on:
		return
	var a: int = ROOM.a
	if not META.met.has(str(a)) and npc.cool <= 0:
		META.met[str(a)] = 1
		save_meta()
		npcCard(a)
		return
	if npc.lt <= 0:
		var l = npcHint()
		if l != npc.line:
			sfx("ui1", null, null, .6, .04)
		npc.line = l
		npc.lt = 7.0

# ---------- Boss Rush ----------
func rushTick(dt: float) -> void:
	var Rr = G.rush
	if Rr == null:
		return
	Rr.t += dt
	if Rr.next > 0:
		Rr.next -= dt
		if Rr.next <= 0 and Rr.i < DB.RUSH.size() - 1:
			Rr.i += 1
			startTrans({rush=Rr.i})
