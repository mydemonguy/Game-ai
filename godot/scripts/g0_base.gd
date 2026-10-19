extends Node2D
## Aetherfall (Godot 4 port) — layer 0: constants, shared state, helpers and the effect queues.
## The game is split into a chain of scripts (g0 -> g1 -> g2 -> g3 -> g4); each extends the previous one,
## so every layer can use everything defined below it. Calls that go "up" the chain use the stubs at the end.

const H := 1080.0
const GY := 880.0
const CW := 2560.0
const INK := "#130f17"
## draw order (Phaser depths x10 so they fit Godot's integer z_index)
const D := {sky=0, stars=1, skyfx=2, far=3, fog=4, mid=5, walls=6, signs=7, back=8, props=9, lamps=10, vents=11, solids=12, plats=13,
	fixtures=14, doors=15, crates=16, picks=17, hz=18, shadows=19, enemies=20, boss=21, player=22, drones=23, shots=24, parts=25, rings=26,
	light=30, fg=31, weather=32, flash=33, texts=34}

static func zi(depth: float) -> int:
	return int(round(depth * 10.0))

# ---------- shared state ----------
var W = 1920.0
var touchy = false
var RSAFE = 200.0
var K = {left=0, right=0, jump=0, attack=0, special=0, dash=0, down=0, arm=0, armc=0}
var P = {}
var ocForce := false   # tests: every robot spawns Overcharged
var G = {state="menu", lv=0, score=0, paused=false, best=0, lives=3, respawnT=0.0, rush=null}
var META: Dictionary = {}
var pl = null
var en: Array = []
var shots: Array = []
var picks: Array = []
var hz: Array = []
var spawnQ: Array = []
var boxes: Array = []
var boss = null
var npc = null
var ally = null
var cam = 0.0
var camY = 0.0
var camLock = null
var lock = false
var shake = 0.0
var bossDone = false
var lvT = 0.0
var hitStop = 0.0
var banner = null
var flashT = 0.0
var doneT = 0.0
var hintT = 0.0
var ROOM = null
var RW = CW
var RH = H
var FY = GY
var TRANS = {on=0, t=0.0, phase=0, act=null}
var eid = 0
# ---------- co-op: "" alone, "host" runs the world, "client" mirrors it and drives its own dino ----------
var NETR = ""
var FXQ: Array = []
var _fxd = 0
var pl2 = null

func _rec(a: Array) -> void:
	if NETR == "host" and _fxd == 0 and pl2 != null:
		FXQ.append(a)

func players() -> Array:
	var a := []
	if pl != null:
		a.append(pl)
	if pl2 != null:
		a.append(pl2)
	return a

## run f with `pl` (and its inputs) temporarily switched to another player, like the web version's withPl
func withPl(p, f: Callable):
	if p == pl:
		return f.call()
	var o = pl
	pl = p
	var r = f.call()
	pl = o
	return r

func nearestPl(x: float, y: float):
	var best = pl
	var bd = 1e12
	for p in players():
		if p.dead:
			continue
		var d: float = absf(p.x - x) + absf(p.y - y) * .5
		if d < bd:
			bd = d
			best = p
	return best

func CH(p = null) -> Dictionary:
	var q = p if p != null else pl
	return DB.CHARS[q.ch if q != null and q.has("ch") else "tyko"]
var unlocked = 1
var riftOpen = false

func _init() -> void:
	META = fresh_meta()

static func fresh_meta() -> Dictionary:
	return {ab={}, tanks={}, items={}, gates={}, cleared={}, map={}, areas={}, save=null, boss=0, guards={}, mapped={}, dust=0,
		relics={}, eq=[], arm=-1, met={}, talk={}, sable=0, hard=0, seed=0, time=0.0, deaths=0, perm=[], gv=0}

# ---------- small helpers ----------
func R(a: float, b: float) -> float:
	return a + randf() * (b - a)

func sgn(v: float) -> float:
	return 0.0 if v == 0.0 else (1.0 if v > 0.0 else -1.0)

func overlap(a: Rect2, b: Rect2) -> bool:
	return a.position.x < b.position.x + b.size.x and a.position.x + a.size.x > b.position.x and a.position.y < b.position.y + b.size.y and a.position.y + a.size.y > b.position.y

func ebox(e) -> Rect2:
	return Rect2(e.x - e.w / 2.0, e.y - e.h, e.w, e.h)

func pbox() -> Rect2:
	return Rect2(pl.x - 42, pl.y - 168, 84, 168)

func rpick(a: Array):
	return a[randi() % a.size()]

var _colc = {}
func C(s, a := -1.0) -> Color:
	## colour from "#rrggbb", "rgba(r,g,b,a)" or an int 0xRRGGBB
	var c: Color
	if typeof(s) == TYPE_COLOR:
		c = s
	elif typeof(s) == TYPE_INT:
		c = Color8((s >> 16) & 255, (s >> 8) & 255, s & 255)
	elif _colc.has(s):
		c = _colc[s]
	else:
		var str: String = s
		if str.begins_with("rgba"):
			var p = str.substr(5, str.length() - 6).split(",")
			c = Color8(int(p[0]), int(p[1]), int(p[2]), int(float(p[3]) * 255.0))
		else:
			c = Color.html(str)
		_colc[s] = c
	if a >= 0.0:
		c.a = a
	return c

static func hstr(s: String) -> int:
	var h = 2166136261
	for i in s.length():
		h = h ^ s.unicode_at(i)
		h = (h * 16777619) & 0xFFFFFFFF
	return (h % 2147483646) + 1

## Park–Miller generator, same sequence as the original JS rng(seed)
## map codes: the world seed in Crockford base 32 (no I, L, O or U to mix up), e.g. K3F9QZ ("" for the classic map)
const B36 := "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
static func mapCode(seed: int) -> String:
	if seed <= 0:
		return ""
	var out = ""
	var n = seed
	while n > 0:
		out = B36[n % 32] + out
		n = n / 32
	return out

static func codeSeed(code: String) -> int:
	var c = code.strip_edges().to_upper().replace(" ", "").replace("-", "").replace("O", "0").replace("I", "1").replace("L", "1")
	if c == "" or c.length() > 7:
		return -1
	var n = 0
	for ch in c:
		var v = B36.find(ch)
		if v < 0:
			return -1
		n = n * 32 + v
	return n if n > 0 and n <= 2147483646 else -1

static func fmtTime(t: float) -> String:
	var s = int(t)
	return "%d:%02d:%02d" % [s / 3600, (s / 60) % 60, s % 60] if s >= 3600 else "%d:%02d" % [s / 60, s % 60]

## the map generator version a save was made with (saves from before versioning are version 1)
func metaGV() -> int:
	var v = int(META.get("gv", 0))
	return v if v > 0 else 1

## which power a world's shrine grants (Shuffle powers mode reorders them)
func abilOf(a: int) -> Dictionary:
	var pm = META.get("perm", [])
	if typeof(pm) == TYPE_ARRAY and pm.size() == 5 and a < 5:
		return DB.ABIL[int(pm[a])]
	return DB.ABIL[clampi(a, 0, 4)]

static func mkGate(kind: String, x: float) -> Dictionary:
	var g = {kind=kind, x=x, top=0, bot=null, hp=null, plate=null, broken=0, flash=0.0}
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

## the tile set the current room is drawn in (random worlds mix several per world)
func curTh() -> String:
	if ROOM != null and ROOM.has("th"):
		return ROOM.th
	return DB.LV[clampi(G.lv, 0, 5)].theme

class Rng:
	var s: int
	func _init(seed: int) -> void:
		s = seed
	func next() -> float:
		s = (s * 16807) % 2147483647
		return float(s - 1) / 2147483646.0

# ---------- difficulty and progression helpers ----------
func dm() -> float:
	return (1.0 + G.lv * 0.12) * (1.45 if META.get("hard", 0) else 1.0)

func hasAb(id: String) -> bool:
	return META.ab.has(id)

func hasR(id: String) -> bool:
	return META.eq.has(id)

func tankCount() -> int:
	return META.tanks.size()

func maxHP(ch := "") -> int:
	var c: String = ch if ch != "" else (pl.ch if pl != null and pl.has("ch") else "tyko")
	return 100 + 15 * tankCount() + int(DB.CHARS[c].hp)

func _countItems(prefix: String, n: int) -> int:
	var c = 0
	for a in n:
		if META.items.has(prefix + str(a)):
			c += 1
	return c

func coreCount() -> int:
	return _countItems("core", 5)

func fangCount() -> int:
	return _countItems("sfang", 6)

## Robot codex: every kind of robot you have met, kept across games in PREFS
func codexAdd(k: String) -> bool:
	if not PREFS.has("codex") or typeof(PREFS.codex) != TYPE_DICTIONARY:
		PREFS.codex = {}
	if PREFS.codex.has(k):
		return false
	PREFS.codex[k] = 1
	save_prefs()
	return true

func codexCount() -> int:
	return PREFS.get("codex", {}).size() if typeof(PREFS.get("codex", {})) == TYPE_DICTIONARY else 0

func loreCount() -> int:
	return _countItems("lore", 6)

func eggCount() -> int:
	return _countItems("egg", 6)

func AG() -> float:
	return (1.0 + 0.2 * coreCount()) * (1.4 if hasR("battery") else 1.0)

func gDone(a: int) -> bool:
	return a >= 5 or META.guards.has(str(a))

func guardCount() -> int:
	var n = 0
	for a in 5:
		if gDone(a):
			n += 1
	return n

func completion() -> int:
	var n = tankCount() + eggCount() + META.ab.size() + guardCount() + coreCount() + fangCount()
	return int(round(n / 39.0 * 100.0))

func pdm() -> float:
	var f = 2.0 if (pl != null and pl.fury > 0) else 1.0
	f *= float(CH().dmg)
	f *= 1.3 if hasAb("plasma") else 1.0
	f *= 1.0 + 0.1 * fangCount()
	if hasR("fury") and pl != null and pl.hp < pl.max * 0.3:
		f *= 1.3
	return f

func reachOf(b: float) -> float:
	return b * (1.3 if hasR("reach") else 1.0)

func addDust(n: int, x = null, y = null) -> void:
	if n == 0:
		return
	if hasR("lucky"):
		n *= 2
	META.dust = int(META.get("dust", 0)) + n
	if x != null:
		ftext(x, y, "◆ " + str(n), "#ffd27a")

# ---------- saving ----------
const SAVE_PATH := "user://aetherfall_world.json"
const PREF_PATH := "user://aetherfall_prefs.json"
var PREFS = {music=0.5, sfx=0.9, best=0, unlock=1, rift=0, rush=0.0, quality="high"}

func save_meta() -> void:
	if G.rush != null or NETR == "client":
		return
	var f = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(META))

func load_meta() -> void:
	META = fresh_meta()
	if FileAccess.file_exists(SAVE_PATH):
		var f = FileAccess.open(SAVE_PATH, FileAccess.READ)
		var m = JSON.parse_string(f.get_as_text()) if f else null
		if typeof(m) == TYPE_DICTIONARY and m.has("ab") and m.has("map"):
			for k in m:
				META[k] = m[k]
	if typeof(META.eq) != TYPE_ARRAY:
		META.eq = []
	META.arm = int(META.get("arm", -1))
	META.dust = int(META.get("dust", 0))

func save_prefs() -> void:
	PREFS.best = max(int(PREFS.best), int(G.best))
	PREFS.unlock = unlocked
	PREFS.rift = 1 if riftOpen else 0
	var f = FileAccess.open(PREF_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(PREFS))

func load_prefs() -> void:
	if FileAccess.file_exists(PREF_PATH):
		var f = FileAccess.open(PREF_PATH, FileAccess.READ)
		var m = JSON.parse_string(f.get_as_text()) if f else null
		if typeof(m) == TYPE_DICTIONARY:
			for k in m:
				PREFS[k] = m[k]
	G.best = int(PREFS.best)
	unlocked = clampi(int(PREFS.unlock), 1, 6)
	riftOpen = int(PREFS.rift) == 1
	Sfx.set_volumes(float(PREFS.music), float(PREFS.sfx))

# ---------- effects: queued here, drawn by the view layer ----------
class Pt:
	var x: float
	var y: float
	var vx: float
	var vy: float
	var g: float
	var life: float
	var max: float
	var col: Color
	var sx: float
	var sy: float
	var ang: float
	var a0: float
	var a1: float

const PKIND := ["norm", "chunk", "add", "glow", "streak"]
const PSC := {add=14.0, norm=64.0, glow=60.0, streak=14.0, chunk=8.0}
var PARTS = {norm=[], chunk=[], add=[], glow=[], streak=[]}
var RINGS: Array = []     # [x,y,col,r,t]
var FTXT: Array = []      # dictionaries handled by the view
var LIGHTS: PackedFloat32Array = PackedFloat32Array()
var kz = 0.0
var kzT = 0.0
var kz0 = 0.0
var partMul = 1.0

func part(x: float, y: float, vx: float, vy: float, life: float, col, sz: float, g := 0.0, kind := ""):
	if kind == "":
		kind = "norm" if (typeof(col) == TYPE_STRING and col.begins_with("rgba")) else "add"
	var arr: Array = PARTS[kind]
	if arr.size() >= 700:
		return null
	var p = Pt.new()
	p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.g = g
	p.life = max(0.03, life); p.max = p.life
	p.col = C(col); p.col.a = 1.0
	var s: float = sz / PSC[kind]
	p.sx = s; p.sy = s; p.ang = 0.0
	p.a0 = 0.5 if kind == "norm" else 1.0
	p.a1 = 0.6 if kind == "chunk" else 0.0
	arr.append(p)
	return p

func burst(x: float, y: float, col, n: int, sp := 600.0) -> void:
	_rec(["burst", x, y, col, n, sp])
	n = int(ceil(n * (0.6 if partMul < 1.0 else 1.0)))
	for i in n:
		var a = randf() * TAU
		var v = sp * (0.3 + randf() * 0.7)
		part(x, y, cos(a) * v, sin(a) * v - 120, 0.35 + randf() * 0.45, col, 4 + randf() * 6, 900)

func sparks(x: float, y: float, col, n: int, dir: float) -> void:
	_rec(["sparks", x, y, col, n, dir])
	for i in n:
		var a = (0.0 if dir > 0 else PI) + (randf() - 0.5) * 1.6
		var v = 700 + randf() * 900
		var p = part(x, y, cos(a) * v, sin(a) * v, 0.12 + randf() * 0.16, col, 10, 600, "streak")
		if p:
			p.ang = a - PI / 2.0
			p.sx = 0.6
			p.sy = 0.5 + randf() * 0.4

func dust(x: float, y: float) -> void:
	_rec(["dust", x, y])
	for i in 8:
		part(x + (randf() - 0.5) * 60, y - 6, (randf() - 0.5) * 300, -randf() * 200, 0.45, "rgba(220,210,255,.45)", 18 + randf() * 14, 300, "norm")

func souls(x: float, y: float) -> void:
	_rec(["souls", x, y])
	for i in 6:
		part(x + (randf() - 0.5) * 40, y, (randf() - 0.5) * 60, -120 - randf() * 160, 1.2, "#bff6ff", 20, -40, "glow")

func sparkle(x: float, y: float, col) -> void:
	_rec(["sparkle", x, y, col])
	for i in 10:
		var a = i / 10.0 * TAU
		part(x, y, cos(a) * 260, sin(a) * 260, 0.5, col, 16, 0, "glow")

func debris(x: float, y: float, kind: String) -> void:
	_rec(["debris", x, y, kind])
	var Pa: Dictionary = DB.PAL[curTh()]
	var cols: Array
	if kind == "laser":
		cols = ["#ff6a5a", "#ffd0c0"]
	elif kind == "crystal":
		cols = ["#ff5ad8", "#2a0c2e"]
	else:
		cols = [Pa.metal, Pa.light, Pa.dark]
	var n = 14 if kind == "crate" else 26
	for i in n:
		var p = part(x + (randf() - 0.5) * 80, y + randf() * (40 if kind == "crate" else 400), (randf() - 0.5) * 900, -300 - randf() * 700, 0.9 + randf() * 0.5, cols[i % cols.size()], 8 + randf() * 14, 2200, "chunk")
		if p:
			p.ang = randf() * TAU

func explode(e) -> void:
	_rec(["explode", {x=e.x, y=e.y, w=e.w, h=e.h, heavy=true if e.get("heavy", false) else false}])
	_fxd += 1
	var big: bool = true if e.get("heavy", false) else false
	burst(e.x, e.y - e.h * 0.5, "#ffb347", 22 if big else 12, 900 if big else 650)
	for i in (10 if big else 6):
		part(e.x + (randf() - 0.5) * e.w, e.y - randf() * e.h, (randf() - 0.5) * 200, -60 - randf() * 160, 0.7 + randf() * 0.4, "rgba(40,36,48,.55)", 50 + randf() * 40, -80, "norm")
	debris(e.x, e.y - e.h * 0.7, "robot")
	part(e.x, e.y - e.h * 0.5, 0, 0, 0.25, "#fff0c8", 380 if big else 240, 0, "glow")
	_fxd -= 1

func teleFx(x: float, y: float, h: float) -> void:
	_rec(["teleFx", x, y, h])
	_fxd += 1
	for i in 14:
		part(x + (randf() - 0.5) * 60, y - randf() * h, 0, -300 - randf() * 300, 0.45, "#ff4fd8", 10, 0, "add")
	ring(x, y - h / 2.0, "#ff4fd8", 120)
	_fxd -= 1

func muzzle(x: float, y: float, col) -> void:
	_rec(["muzzle", x, y, col])
	part(x, y, 0, 0, 0.12, col, 120, 0, "glow")

func ring(x: float, y: float, col, r := 90.0) -> void:
	_rec(["ring", x, y, col, r])
	if RINGS.size() > 40:
		RINGS.pop_front()
	RINGS.append([x, y, C(col), r, 0.0])

func camKick(z: float) -> void:
	_rec(["camKick", z])
	kz0 = z
	kz = z
	kzT = 0.0

func ftext(x: float, y: float, s, col, big := false) -> void:
	_rec(["ftext", x, y, s, col, big])
	var num = typeof(s) == TYPE_INT or typeof(s) == TYPE_FLOAT
	if FTXT.size() > 34:
		FTXT.pop_front()
	FTXT.append({x=x, y=y, s=str(int(s)) if num else str(s), col=C(col), big=big, num=num, t=0.0, node=null})

func lightW(x: float, y: float, r: float, a: float) -> void:
	var sx = x - cam
	var sy = y - camY
	if sx + r < 0 or sx - r > W or sy + r < 0 or sy - r > H:
		return
	if LIGHTS.size() >= 64 * 4:
		return
	LIGHTS.append(sx); LIGHTS.append(sy); LIGHTS.append(r); LIGHTS.append(a)

func lightS(x: float, y: float, r: float, a: float) -> void:
	if LIGHTS.size() >= 64 * 4:
		return
	LIGHTS.append(x); LIGHTS.append(y); LIGHTS.append(r); LIGHTS.append(a)

func showBanner(t: String, sub := "", dur := 2.2) -> void:
	_rec(["showBanner", t, sub, dur])
	banner = {t=t, sub=sub, life=dur, max=dur}

func buzz(ms) -> void:
	if not touchy or not PREFS.get("vibe", true):
		return
	var d = 0
	if typeof(ms) == TYPE_ARRAY:
		for v in ms:
			d += int(v)
	else:
		d = int(ms)
	Input.vibrate_handheld(clampi(d, 5, 200))

# ---------- sound: distance and pan for things in the world ----------
func sfx(name: String, x = null, y = null, vol := 1.0, gap := 0.04, pitch := 1.0) -> void:
	_rec(["sfx", name, x, y, vol, gap, pitch])
	var g = 1.0
	var pan = 0.0
	if x != null:
		var cx = cam + W / 2.0
		var dx: float = x - cx
		var dy: float = 0.0 if y == null else y - (camY + H / 2.0)
		var outd: float = max(0.0, absf(dx) - W / 2.0) + max(0.0, absf(dy) - H / 2.0)
		pan = clampf(dx / (W * 0.6), -0.8, 0.8)
		g = max(0.12, 1.0 - outd / 2200.0)
	Sfx.play(name, vol * g, gap, pitch, pan)

# ---------- stubs: implemented further up the script chain ----------
func enterRoom(_id: String, _how: Dictionary) -> void: pass
func spawnEnemy(_type: String, _side: float, _quiet := false): return null
func damage(_e, _d: float, _kb: float) -> void: pass
func hurtPlayer(_d: float, _kx: float) -> void: pass
func musicFor() -> void: pass
func padAbilities() -> void: pass
func showCard(_o: Dictionary) -> void: pass
func hideCard() -> void: pass
func padShow(_v: bool) -> void: pass
func clearInput() -> void: pass
func victory() -> void: pass
func gameOver() -> void: pass
func showLore(_a: int) -> void: pass
func guardianIntro(_a: int) -> void: pass
func malakarIntro() -> void: pass
func allyArena(_o, _i: int) -> void: pass
func areaIntro(_prev: int, _a: int) -> void: pass
func bossTexLoad(_key: String) -> void: pass
func roomView(_o) -> void: pass
func killAllViews() -> void: pass
func slagBoom(_s) -> void: pass
func hitBoxesWith(_box: Rect2, _done: Dictionary) -> void: pass
func clawGeo(_box: Rect2) -> void: pass
func slamAt(_x: float) -> void: pass
func startTrans(_act: Dictionary) -> void: pass
func allTargets() -> Array: return en
func ghost(_p) -> void: pass
func npcCard(_a: int) -> void: pass
func exchangeCard(_back = null) -> void: pass
func rushDone() -> void: pass
func rushFail() -> void: pass
func padArms() -> void: pass
func corpse(_t: String, _x: float, _y: float, _f: int) -> void: pass
func netSend(_k: String, _a: Array) -> void: pass
func coopCard() -> void: pass
func netRoomEntered(_x: float, _y: float, _face: int) -> void: pass
