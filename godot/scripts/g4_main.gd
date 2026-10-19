extends "res://scripts/g3_view.gd"
## layer 4: the game loop, HUD, touch controls, menus, story cards and the title screen

var hud_layer: CanvasLayer
var pad_layer: CanvasLayer
var card_layer: CanvasLayer
var hud: Control
var pad: Control
var HU = {}
var card_root: Control
var card_panel: PanelContainer
var card_box: VBoxContainer
var THEME: Theme
var cardOpen = false
var KK = {}       # keys held on the keyboard
var KP = {}       # keys held on the touch pad
var fps_t = 0.0

# ---------- startup ----------
func _ready() -> void:
	touchy = DisplayServer.is_touchscreen_available() or OS.has_feature("mobile")
	RSAFE = 500.0 if touchy else 200.0
	W = _calcW()
	load_prefs()
	load_meta()
	partMul = 1.0 if PREFS.quality == "high" else .5
	setup_view()
	build_theme()
	build_hud()
	build_pad()
	build_cards()
	get_tree().set_auto_accept_quit(false)
	toTitle()
	_test_init()

func _calcW() -> float:
	var s = get_viewport().get_visible_rect().size
	return clampf(round(s.x * H / s.y), 1440, 2560) if s.y > 0 else 1920.0

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_GO_BACK_REQUEST or what == NOTIFICATION_WM_CLOSE_REQUEST:
		if G.state == "play" and not G.paused:
			togglePause()
		elif G.paused:
			togglePause()
		elif what == NOTIFICATION_WM_CLOSE_REQUEST or G.state == "menu":
			get_tree().quit()
	elif what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		if G.state == "play" and not G.paused:
			togglePause()

# ---------- input ----------
const ACTIONS := ["left", "right", "jump", "attack", "special", "dash", "down", "arm", "armc"]

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause") and not event.is_echo():
		if G.state == "play":
			togglePause()

func pollInput() -> void:
	for a in ACTIONS:
		var held: bool = Input.is_action_pressed(a) and G.state == "play"
		if held and not KK.get(a, false):
			P[a] = 1
		KK[a] = held
		K[a] = 1 if (held or KP.get(a, false)) else 0

func padPress(a: String, on: bool) -> void:
	if on and not KP.get(a, false) and G.state == "play":
		P[a] = 1
		buzz(6)
	KP[a] = on

func clearInput() -> void:
	for k in K:
		K[k] = 0
	P.clear()
	KP.clear()
	if pad:
		pad.call("reset")

# ---------- the game loop: input -> AI -> physics -> world logic -> camera ----------
var _featT := 0.0
var _toasts := []

## a small panel that slides down from the top for a few seconds (feats)
func toast(h: String, s: String) -> void:
	var lay = CanvasLayer.new()
	lay.layer = 40
	add_child(lay)
	var pn = PanelContainer.new()
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color("#120f24ee")
	sb.border_color = Color("#ffd24a")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(10)
	sb.content_margin_left = 22; sb.content_margin_right = 22; sb.content_margin_top = 12; sb.content_margin_bottom = 12
	sb.shadow_color = Color("#ffd24a40"); sb.shadow_size = 16
	pn.add_theme_stylebox_override("panel", sb)
	pn.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var vb = VBoxContainer.new()
	vb.add_theme_constant_override("separation", 2)
	pn.add_child(vb)
	labelN(vb, h, 30, "#ffe08a", DB.font_u)
	labelN(vb, s, 22, "#ece7ff", DB.font_u6)
	lay.add_child(pn)
	var slot: int = _toasts.size()
	_toasts.append(lay)
	sfx("oc_die", null, null, .7, .3, 1.25)
	await get_tree().process_frame
	var sz: Vector2 = pn.get_combined_minimum_size()
	var vw: float = get_viewport().get_visible_rect().size.x
	var y1: float = 18.0 + slot * (sz.y + 10)
	pn.position = Vector2((vw - sz.x) / 2.0, -sz.y - 20)
	var tw = create_tween()
	tw.tween_property(pn, "position:y", y1, .35).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_interval(3.6)
	tw.tween_property(pn, "modulate:a", 0.0, .5)
	tw.tween_callback(func():
		_toasts.erase(lay)
		lay.queue_free())

func _process(delta: float) -> void:
	var dt: float = min(.033, max(0.0, delta))
	var nw = _calcW()
	if nw != W:
		W = nw
	pollInput()
	if G.state == "play" and not G.paused:
		gameUpdate(dt)
		if G.rush == null and NETR != "client":
			META.time = float(META.get("time", 0.0)) + dt
		_featT += dt
		if _featT > 1.0:
			_featT = 0.0
			featTick()
	elif G.state == "over":
		lvT += dt
		shake *= .9
		if pl:
			pl.deadT += dt
	elif G.state == "menu" or G.state == "card":
		lvT += dt
		if G.state == "menu":
			cam += dt * 70
			if cam > max(0.0, RW - W):
				cam = 0.0
	if not G.paused:
		updFx(dt)
		updWeather(dt)
	render(dt)
	hudUpdate()
	pad.queue_redraw()
	P.clear()
	if TEST.on:
		_test_tick(dt)

func gameUpdate(dt: float) -> void:
	if banner != null:
		banner.life -= dt
		if banner.life <= 0:
			banner = null
	if TRANS.on:
		updTrans(dt)
		P.clear()
		return
	if hitStop > 0:
		hitStop -= dt
		return
	lvT += dt
	rushTick(dt)
	shake *= pow(.015, dt)
	if shake < .4:
		shake = 0.0
	flashT -= dt
	updPlayerPre(dt)
	for q in spawnQ:
		q.t -= dt
	while not spawnQ.is_empty() and spawnQ[0].t <= 0:
		var q: Dictionary = spawnQ.pop_front()
		spawnEnemy(q.type, q.side)
	for e in en:
		var t = nearestPl(e.x, e.y)
		withPl(t, func(): updEnemy(e, dt))
	if boss != null and not boss.dead:
		var tb = nearestPl(boss.x, boss.y)
		withPl(tb, func(): updBoss(boss, dt))
	physStep(dt)
	updPlayerPost(dt)
	if G.state != "play":
		return
	en = en.filter(func(e): return not e.dead)
	for i in en.size():
		for j in range(i + 1, en.size()):
			var a = en[i]
			var b = en[j]
			if a.fly != b.fly or absf(a.y - b.y) > 200:
				continue
			var d: float = b.x - a.x
			var m: float = (a.w + b.w) * .45
			if absf(d) < m:
				var push: float = (m - absf(d)) * .5 * (-1 if d < 0 else 1)
				a.x -= push; b.x += push
				if a.body:
					a.body.x -= push
				if b.body:
					b.body.x += push
	updShots(dt); updHz(dt); updPicks(dt); updBoxes(dt); updAtmos(dt); updWorld(dt); updNPC(dt); updAlly(dt); updDHZ(dt)
	if G.state != "play" or TRANS.on:
		P.clear()
		return
	if pl.dead and G.respawnT > 0:
		G.respawnT -= dt
		pl.deadT += dt
		if G.respawnT <= 0:
			var e: Dictionary = ROOM.entry
			pl.dead = 0
			plTeleport(e.x, e.y)
			pl.hp = float(pl.max); pl.inv = 2.5; pl.en = max(pl.en, 50); pl.hits = 0
			if lock:
				plTeleport(clampf(pl.x, cam + 200, cam + W - RSAFE - 200), FY)
			showBanner("Back on your feet", "Lives left: " + str(G.lives), 1.6)
			ring(pl.x, pl.y - 90, "#ffe08a", 220)
			burst(pl.x, pl.y - 90, "#ffe08a", 30, 700)
			sfx("revive", null, null, 1.0, .5)
	if boss != null and boss.state == "enter" and boss.guard == null:
		cam += (arenaCam() - cam) * min(1.0, dt * 3)
		camY += (max(0.0, RH - H) - camY) * min(1.0, dt * 3)
	else:
		updCamera(dt)

func updCamera(dt: float) -> void:
	var tx: float = camLock if camLock != null else clampf(pl.x - W * .4, 0, max(0.0, RW - W))
	var ty = clampf(pl.y - H * .66, 0, max(0.0, RH - H))
	cam += (tx - cam) * min(1.0, dt * 7)
	camY += (ty - camY) * min(1.0, dt * 6)

func musicFor() -> void:
	var n: String
	if G.state == "menu":
		n = "title"
	elif G.rush != null:
		n = "rush"
	elif boss != null and boss.guard != null and not boss.dead:
		n = "guard"
	elif ROOM != null and ROOM.kind == "boss" and not int(META.boss):
		n = "boss"
	else:
		n = "a" + str(clampi(G.lv, 0, 5))
	Sfx.music(n)

func bossTexLoad(key: String) -> void:
	DB.boss_tex(key)

# ---------- starting and ending runs ----------
func newRun(hard := false) -> void:
	stat("games")
	META = fresh_meta()
	if hard:
		META.hard = 1
	elif pendEasy:
		META.easy = 1
	pendEasy = false
	# every new game rolls its own world layout (or uses the map code / classic map picked on the new-game card)
	META.seed = pendSeed if pendSeed >= 0 else randi_range(1, 2000000000)
	META.gv = DB.GEN_VER
	pendSeed = -1
	if pendShuffle:
		# a fixed order per map, so friends sharing a code and the shuffle get the same game
		var r = Rng.new(int(META.seed) * 13 + 5)
		var pm = [0, 1, 2, 3, 4]
		for i in range(4, 0, -1):
			var j = int(floor(r.next() * (i + 1)))
			var tmp = pm[i]; pm[i] = pm[j]; pm[j] = tmp
		META.perm = pm
	DB.set_world(int(META.seed), DB.GEN_VER)
	META.save = {room="0-0", x=210, score=0}
	save_meta()
	G.score = 0
	G.lives = 3
	startGame("0-0", {x=300.0, y=GY})

func startGame(room: String, how: Dictionary) -> void:
	pl = newPlayer()
	lvT = 0.0; hitStop = 0.0; shake = 0.0; doneT = 0.0
	G.respawnT = 0.0
	TRANS.on = 0
	G.state = "play"
	enterRoom(room, how)
	pl.max = maxHP()
	pl.hp = float(pl.max)
	G.paused = false
	hideCard()
	padShow(true)
	clearInput()
	showBanner(DB.LV[G.lv].ch, String(ROOM.get("zn", DB.LV[G.lv].name)), 2.4)
	musicFor()

func continueGame() -> void:
	var s = META.save
	if s == null:
		newRun()
		return
	G.lives = 3
	G.score = int(s.get("score", 0))
	DB.set_world(int(META.get("seed", 0)), metaGV())
	if not DB.ROOMS.has(s.room):
		s.room = "0-0"
	startGame(s.room, {x=float(s.x) + 90, y=GY})

func areaIntro(prev: int, a: int) -> void:
	G.state = "card"
	padShow(false)
	clearInput()
	var clr = ""
	if prev >= 0 and prev < a and prev < DB.T.STORY.clear.size():
		clr = DB.T.STORY.clear[prev] + "\n\n"
	showCard({ey=DB.LV[a].ch, h=DB.LV[a].name, b=clr + DB.T.STORY.brief[a], btns=[["Onward", func():
		G.state = "play"
		hideCard()
		padShow(true)
		showBanner(DB.LV[a].ch, DB.LV[a].name, 2.2)
		musicFor()]]})

func menuBG() -> void:
	clearEnemies()
	killAllViews()
	pl = null
	shots = []; hz = []; picks = []; boxes = []; boss = null; banner = null; shake = 0.0; lock = false; ally = null
	var a: int = min(unlocked, 6) - 1
	DB.set_world(0)
	# show off a different district behind the title each time (half the time once you've seen more than the first world)
	var id: String = str(a) + "-6"
	var src: Dictionary = DB.ROOMS[id]
	if DB.THEMES2.size() and (unlocked > 1 or randf() < .5) and randf() < .7:
		var t: String = DB.THEMES2[randi() % DB.THEMES2.size()]
		src.th = t
		src.zn = DB.THL[t].name
		src.props = src.props.map(func(p0):
			var p1 = p0.duplicate()
			var ks: Array = DB.MACH[t]
			p1.k = ks[int(absf(p0.x)) % ks.size()]
			return p1)
		enterRoom(id, {x=300.0, y=GY})
		src.erase("th"); src.erase("zn")
		src.props = DB.CLASSIC_PROPS[id]
	else:
		enterRoom(id, {x=300.0, y=GY})
	cam = 0.0
	camY = 0.0

func toTitle() -> void:
	rushEnd()
	G.state = "menu"
	G.paused = false
	TRANS.on = 0
	padShow(false)
	menuBG()
	musicFor()
	var sv = META.save
	var found: int = META.map.size()
	var tot: int = max(1, DB.rooms_of(int(META.get("seed", 0)), metaGV()).size())
	var b = ""
	if sv != null:
		var mc = mapCode(int(META.get("seed", 0)))
		b += "Save: %s%s · Map %d%% · Items %d%%" % [DB.LV[clampi(int(String(sv.room).get_slice("-", 0)), 0, 5)].name, " · [color=#ff4a6a][b]Rift Mode[/b][/color]" if META.hard else " · [color=#7dffb0]Story[/color]" if int(META.get("easy", 0)) else "", round(found * 100.0 / tot), completion()]
		b += (" · Map %s\n" % mc) if mc != "" else "\n"
	if G.best:
		b += "Best score %s" % _fmt(G.best)
	var btns = []
	if sv != null:
		btns.append(["Continue", func(): continueGame()])
	btns.append(["New game" if sv != null else "Begin the Saga", confirmNew if sv != null else startNew, sv != null])
	if riftOpen:
		btns.append(["Boss Rush", _rushBtn, true])
	btns.append(["Co-op", coopCard, true])
	if featCount() or codexCount():
		btns.append(["Feats & codex", titleArchive, true])
	btns.append(["Controls", func(): controls(toTitle), true])
	btns.append(["Settings", func(): soundCard(toTitle), true])
	var ver = String(ProjectSettings.get_setting("application/config/version", ""))
	if String(PREFS.get("seen", "")) != WHATS_NEW_VER and not TEST.on:
		PREFS.seen = WHATS_NEW_VER
		save_prefs()
		showCard({ey="Aetherfall " + ver, h="What's new", b=WHATS_NEW, btns=[["Got it", toTitle]]})
		return
	showCard({ey="A Starblood Saga · Six Worlds", h="Aetherfall", big=true, tag="One small dino. One stolen sky. One very big Rift.", b=b, btns=btns})

const WHATS_NEW_VER := "4.8"
const WHATS_NEW := "[color=#ffe08a][b]15 Feats[/b][/color] to earn, plus lifetime Stats. Clear Boss Rush to unlock the [color=#ffd24a][b]Golden Gauntlet[/b][/color].\n\n[b]Robot codex[/b] · lore and a fighting tip for every robot and guardian you meet. Both are on the title screen and in pause → Archive.\n\n[b]A new map every game[/b] · bigger worlds across 26 districts. Share the map code from the pause screen.\n\n[b]New options[/b] · Map of the day, Shuffle powers and Story mode.\n\n[color=#ffe08a][b]Overcharged robots[/b][/color], [b]Trial[/b] rooms, capsule elevators, and hazards: icicles, toxic gas, sparking floors and new [b]void rifts[/b]."

func _fmt(n: int) -> String:
	var s = str(n)
	var out = ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return s + out

var pendSeed := -1   # -1 = roll a random map, 0 = classic map, >0 = a map code
var pendShuffle := false

var pendEasy := false

func startNew() -> void:
	modeCard(toTitle)

## which world layout to play: a fresh random one, one from a friend's map code, or the original
func mapCard(hard: bool, back: Callable) -> void:
	showCard({ey="New game" + (" · Rift Mode" if hard else ""), h="Choose a map",
		b="[b]New random map[/b] · fresh routes, guardians, saves and treasure.\n" + dailyLine() + "\n[b]Map code[/b] · a friend's map, from their pause screen.\n[b]Classic map[/b] · the original hand-built worlds.\n\n[b]Shuffle powers[/b] · [color=%s]%s[/color] · shrines grant different powers." % ["#7dffb0" if pendShuffle else "#9d97bd", "ON" if pendShuffle else "off"],
		btns=[["New random map", func():
			pendSeed = -1
			beginSaga(hard)], ["Map of the day", func():
			pendSeed = dailySeed()
			beginSaga(hard), true], ["Map code", func(): codeCard(hard, back, ""), true], ["Classic map", func():
			pendSeed = 0
			beginSaga(hard), true], ["Shuffle powers: " + ("on" if pendShuffle else "off"), func():
			pendShuffle = not pendShuffle
			mapCard(hard, back), true], ["Back", back, true]]})

func _dayKey(offset := 0) -> String:
	var d = Time.get_date_dict_from_unix_time(int(Time.get_unix_time_from_system()) + offset * 86400)
	return "%04d-%02d-%02d" % [d.year, d.month, d.day]

## Map of the day streak: consecutive (UTC) days you beat that day's map
func dailyWin() -> void:
	var dl = PREFS.get("daily", null)
	if typeof(dl) != TYPE_DICTIONARY:
		dl = {last="", streak=0, best=0}
	var today = _dayKey()
	if dl.last != today:
		dl.streak = int(dl.streak) + 1 if dl.last == _dayKey(-1) else 1
		dl.last = today
		dl.best = max(int(dl.get("best", 0)), int(dl.streak))
	PREFS.daily = dl
	save_prefs()

func dailyLine() -> String:
	var s = "[b]Map of the day[/b] · the same map for everyone today (code [b]%s[/b])." % mapCode(dailySeed())
	var dl = PREFS.get("daily", null)
	if typeof(dl) == TYPE_DICTIONARY:
		var live: bool = dl.last == _dayKey() or dl.last == _dayKey(-1)
		if dl.last == _dayKey():
			s += " [color=#7dffb0]Beaten today ✓[/color]"
		if live and int(dl.streak) > 0:
			s += " Streak [b]%d[/b] day%s" % [int(dl.streak), "" if int(dl.streak) == 1 else "s"]
		if int(dl.get("best", 0)) > 1:
			s += " · best %d" % int(dl.best)
	return s

## the same seed for everyone on a given (UTC) day
func dailySeed() -> int:
	var d = Time.get_date_dict_from_system(true)
	return int(posmod(hstr("aetherfall-%04d-%02d-%02d" % [d.year, d.month, d.day]), 2000000000)) + 1

func codeCard(hard: bool, back: Callable, err: String) -> void:
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	var ed = LineEdit.new()
	ed.placeholder_text = "e.g. K3F9QZ"
	ed.max_length = 7
	ed.custom_minimum_size = Vector2(420, 70)
	ed.add_theme_font_size_override("font_size", 34)
	row.add_child(ed)
	var go = _btn("Play this map")
	go.pressed.connect(func():
		var sd = codeSeed(ed.text)
		if sd < 0:
			codeCard(hard, back, "That code doesn't look right. Codes use letters and numbers only.")
		else:
			pendSeed = sd
			beginSaga(hard))
	row.add_child(go)
	showCard({ey="New game · map code", h="Enter a map code", b="Type the code from a friend's pause screen." + ("\n\n[color=#ff8a8a]%s[/color]" % err if err != "" else ""),
		extra=row, btns=[["Back", func(): mapCard(hard, back), true]]})

func confirmNew() -> void:
	showCard({ey="New game", h="Start over?", b="This erases your map, abilities and energy tanks.", btns=[["Start over", startNew], ["Back", toTitle, true]]})

func modeCard(back: Callable) -> void:
	var b = "[b]Normal[/b] · the saga as it was meant to be told.\n\n[color=#7dffb0][b]Story[/b][/color] · for the adventure more than the challenge: robots and bosses do 40% less damage."
	var btns = [["Normal", func():
		pendEasy = false
		mapCard(false, back)], ["Story", func():
		pendEasy = true
		mapCard(false, back), true]]
	if riftOpen:
		b += "\n\n[color=#ff4a6a][b]Rift Mode[/b][/color] · the Rift remembers you. Robots hit 45% harder and take more punishment, and the guardians and Malakar are far tougher."
		btns.append(["Rift Mode", func():
			pendEasy = false
			mapCard(true, back)])
	btns.append(["Back", back, true])
	showCard({ey="New game", h="Choose your path", b=b, btns=btns})

func story(pages: Array, i: int, done: Callable) -> void:
	var p: Dictionary = pages[i]
	var btns = [["Continue" if i < pages.size() - 1 else "Onward", func():
		if i < pages.size() - 1:
			story(pages, i + 1, done)
		else:
			done.call()]]
	if i < pages.size() - 1:
		btns.append(["Skip", done, true])
	showCard({ey=p.ey, h=p.h, b=p.b, btns=btns})

func beginSaga(hard: bool) -> void:
	story(DB.T.STORY.intro, 0, func():
		G.state = "card"
		showCard({ey=DB.LV[0].ch + (" · Rift Mode" if hard else ""), h=DB.LV[0].name, b=DB.T.STORY.brief[0], btns=[["Fight", func(): newRun(hard)]]}))

func gameOver() -> void:
	if G.rush != null:
		G.state = "over"
		if pl:
			pl.dead = 1
			pl.deadT = 0.0
		padShow(false)
		clearInput()
		sfx("gameover", null, null, 1.0, 1.0)
		Sfx.music_stop(1.5)
		rushFail()
		return
	G.state = "over"
	if pl:
		pl.dead = 1; pl.deadT = 0.0; pl.vx = 0.0
	G.best = max(G.best, G.score)
	save_prefs()
	padShow(false)
	clearInput()
	sfx("gameover", null, null, 1.0, 1.0)
	Sfx.music_stop(1.5)
	var rid: String = ROOM.id if ROOM else "0-0"
	var ent: Dictionary = ROOM.entry if ROOM else {x=300.0, y=GY}
	later(.9, func():
		var btns = []
		if META.save != null:
			btns.append(["Continue from save", func(): continueGame()])
		btns.append(["Retry this room", func():
			G.lives = 3
			startGame(rid, {x=ent.x, y=ent.y}), true])
		btns.append(["Title", toTitle, true])
		showCard({ey="Tyko is down", h="The Light Fades", b="[color=#b48cff][b]LYRA:[/b][/color] \"Not yet, little one. Get up. I won't let the dark have you.\"", btns=btns}))

func victory() -> void:
	if G.rush != null:
		rushDone()
		return
	G.state = "card"
	padShow(false)
	clearInput()
	G.score += int(round(pl.hp * 50))
	unlocked = 6
	var wasRift: bool = META.hard == 1
	var newRift = not riftOpen
	riftOpen = true
	G.best = max(G.best, G.score)
	# personal record per map (and mode): fastest clear
	var rkey = (mapCode(int(META.get("seed", 0))) if int(META.get("seed", 0)) > 0 else "classic") + ("-rift" if META.hard else "-story" if int(META.get("easy", 0)) else "") + ("-shuffle" if META.get("perm", []).size() == 5 else "")
	var recs = PREFS.get("records", {})
	if typeof(recs) != TYPE_DICTIONARY:
		recs = {}
	var tnow = float(META.get("time", 0.0))
	var prev = float(recs.get(rkey, 0.0))
	var recLine = ""
	if prev <= 0 or tnow < prev:
		recLine = "[color=#7dffb0][b]New record for this map![/b][/color]" + (" (was %s)" % fmtTime(prev) if prev > 0 else "")
		recs[rkey] = tnow
	else:
		recLine = "Your best on this map: [b]%s[/b]" % fmtTime(prev)
	PREFS.records = recs
	stat("wins")
	save_prefs()
	feat("saga")
	if int(META.get("seed", 0)) == dailySeed():
		feat("daily")
		dailyWin()
		recLine += "\n[color=#7dffb0][b]Map of the day beaten[/b][/color] · streak %d day%s" % [int(PREFS.daily.streak), "" if int(PREFS.daily.streak) == 1 else "s"]
	if META.get("perm", []).size() == 5:
		feat("shuffle")
	if wasRift:
		feat("rift")
	if tnow > 0 and tnow < 7200:
		feat("fast")
	if int(META.get("deaths", 0)) == 0:
		feat("clean")
	Sfx.music("victory")
	var found: int = META.map.size()
	var tot: int = DB.ROOMS.size()
	story(DB.T.STORY.ending, 0, func():
		var b = recLine + "\n\nFinal score [b]%s[/b]\n\nItems collected [b]%d%%[/b] · Map explored %d%%\n\nEnergy tanks %d/12 · Eggs %d/6 · Aether cores %d/5 · Guardians %d/5\n\nTime [b]%s[/b] · Falls [b]%d[/b] · %s\n\n" % [_fmt(G.score), completion(), round(found * 100.0 / tot), tankCount(), eggCount(), coreCount(), guardCount(),
			fmtTime(float(META.get("time", 0.0))), int(META.get("deaths", 0)), ("Map code [b]%s[/b]" % mapCode(int(META.seed))) if int(META.get("seed", 0)) > 0 else "Classic map"]
		if wasRift:
			b += "[color=#ff4a6a][b]Rift Mode conquered.[/b][/color] The Starblood would be proud.\n\n"
		elif newRift:
			b += "[color=#ff4a6a][b]Rift Mode unlocked.[/b][/color] Start a new game to face a harder Ithra.\n\n"
		b += "Thank you for playing Aetherfall."
		showCard({ey="The saga is complete", h="Ithra Is Free", b=b, btns=[["Play again", func(): modeCard(toTitle)], ["Title", toTitle, true]]}))

# ---------- dialogue scenes with portraits ----------
func portrait(key: String) -> Texture2D:
	var Wd: Dictionary = DB.T.WHO.get(key, {})
	if DB.CHARS.has(key) and key != "tyko":
		var C0: Dictionary = DB.CHARS[key]
		var ct = AtlasTexture.new()
		ct.atlas = load(C0.tex)
		ct.region = Rect2(0, 0, C0.fw, C0.fh)
		return ct
	if not Wd.has("art"):
		return null
	var I: Dictionary = DB.BOSSES[Wd.art]
	var fr: String = Wd.get("fr", "idle0")
	var i: int = max(0, I.names.find(fr))
	var at = AtlasTexture.new()
	at.atlas = DB.boss_tex(Wd.art)
	at.region = Rect2((i % int(I.cols)) * I.fw, (i / int(I.cols)) * I.fh, I.fw, I.fh)
	return at

func say(k: String, t: String) -> String:
	var Wd: Dictionary = DB.T.WHO[k]
	return "[color=%s][b]%s:[/b][/color] %s" % [Wd.c, Wd.n, t]

func scene(o: Dictionary, done: Callable) -> void:
	G.state = "card"
	padShow(false)
	clearInput()
	_scenePage(o, 0, done)

func _scenePage(o: Dictionary, i: int, done: Callable) -> void:
	var pg: Array = o.pages[i]
	var lead = ""
	for l in pg:
		if (DB.T.WHO[l[0]].has("art") or (DB.CHARS.has(l[0]) and l[0] != "tyko")) and lead == "":
			lead = l[0]
	var lines = []
	for l in pg:
		lines.append(say(l[0], l[1]))
	var finish = func():
		G.state = "play"
		hideCard()
		padShow(true)
		clearInput()
		done.call()
	var btns = [["Continue" if i < o.pages.size() - 1 else o.get("go", "Fight!"), func():
		if i < o.pages.size() - 1:
			_scenePage(o, i + 1, done)
		else:
			finish.call()]]
	if i < o.pages.size() - 1:
		btns.append(["Skip", finish, true])
	showCard({ey=o.ey, h=o.h, b="\n\n".join(lines), portrait=portrait(lead) if lead != "" else null, btns=btns})

func guardianIntro(a: int) -> void:
	if G.rush != null or META.talk.has(str(a)):
		startGuardian(a)
		return
	META.talk[str(a)] = 1
	save_meta()
	scene({ey=DB.LV[a].ch + " · Shrine guardian", h=DB.GUARD[a].name, pages=DB.T.BOSS_TALK[a]}, func(): startGuardian(a))

func malakarIntro() -> void:
	if G.rush != null or META.talk.has("m"):
		startBoss()
		return
	META.talk["m"] = 1
	save_meta()
	var pages = [[["malakar", "\"So. The last egg I ever kept hatches at my feet. I wondered what you would grow into.\""], ["lyra", "\"Someone you could never be, Malakar. Someone who gives the light back.\""]],
		[["malakar", "\"The light is wasted on the living. I will keep it safe. I will keep it FOREVER.\""]]]
	if META.sable:
		pages.append([["sable", "\"You kept me too, Egg-Keeper. Remember? Iron in my chest and a leash on my mind.\""], ["malakar", "\"Sable. My finest Hollowed. Kneel.\""], ["sable", "\"Not this time. Not ever again.\""]])
	pages[pages.size() - 1].append(["tyko", "\"RAAAWR!\""])
	scene({ey="Throne of the Rift", h="Malakar, the Void Sovereign", pages=pages}, startBoss)

func allyMeet() -> void:
	META.sable = 1
	save_meta()
	scene({ey="An unexpected ally", h="Sable of the Ninth Talon", go="Fight together!", pages=[
		[["sable", "\"Stay low, little one. These tin cans bite. Sable of the Ninth Talon, at your side.\""], ["lyra", "\"Sable?! You were captain of the Talon Guard! We thought the Hollowed took you.\""]],
		[["sable", "\"They did. Iron in my chest, a leash on my mind. For years I hunted my own clan.\""], ["sable", "\"Then this little one roared in Hangar Nine, and something in me cracked. The leash snapped. I've been following you ever since.\""]],
		[["sable", "\"I can't undo what I did. But I can fight beside the last Starblood. Let's clear this room.\""], ["tyko", "\"Rawr!\""]]]}, func():
		allyJoin("arena", true)
		if ally != null:
			ally.line = rpick(DB.T.SLINE.join)
			ally.lt = 3.0)

func allyArena(o, i: int) -> void:
	if G.rush != null or o.a < 1 or ally != null:
		return
	if not META.sable:
		if i == 1:
			allyMeet()
	elif i == 0 and randf() < .4:
		allyJoin("arena")

func npcCard(a: int) -> void:
	G.state = "card"
	padShow(false)
	clearInput()
	_npcPage(a, 0)

func _npcPage(a: int, i: int) -> void:
	var pages: Array = DB.T.NPC_TALK[a]
	var at = AtlasTexture.new()
	var I: Dictionary = DB.BOSSES.claude
	at.atlas = DB.boss_tex("claude")
	at.region = Rect2(2 * I.fw, 0, I.fw, I.fh)
	showCard({ey=DB.LV[a].ch + " · Save station", h="Claude" if i > 0 else "A friendly face", b=pages[i], portrait=at,
		btns=[["Continue" if i < pages.size() - 1 else "Thanks, Claude", func():
			if i < pages.size() - 1:
				_npcPage(a, i + 1)
				return
			G.state = "play"
			hideCard()
			padShow(true)
			npcGift(a)]]})

func showLore(a: int) -> void:
	if G.state != "play":
		return
	G.state = "card"
	padShow(false)
	clearInput()
	var L: Dictionary = DB.T.LORE[a]
	showCard({ey="Data tablet · " + DB.LV[a].ch, h=L.h, b=L.b, btns=[["Continue", func():
		G.state = "play"
		hideCard()
		padShow(true)]]})

# ---------- pause, map, archive, fast travel, Claude's Exchange ----------
func togglePause() -> void:
	if G.state != "play":
		return
	G.paused = not G.paused
	clearInput()
	if G.paused:
		padShow(false)
		sfx("pause1", null, null, 1.0, .1)
		Sfx.duck = .35
		pauseCard()
	else:
		hideCard()
		padShow(true)
		sfx("pause0", null, null, 1.0, .1)
		Sfx.duck = 1.0

func resume() -> void:
	if G.paused:
		togglePause()

func saveRooms() -> Array:
	var out = []
	for a in 6:
		for id in DB.AREAS[a]:
			if DB.ROOMS[id].kind == "save" and META.map.has(id):
				out.append(id)
	return out

func abilitiesBB() -> String:
	var s = ""
	for a in DB.ABIL:
		var has = hasAb(a.id)
		s += "[color=%s][b]%s %s[/b][/color]  %s\n" % [a.col if has else "#55507a", "◆" if has else "◇", a.name, a.how if has else "Not found yet"]
	s += "[color=#ff5ad8][b]Energy Tanks[/b][/color]  %d of 12 found · max health %d\n" % [tankCount(), maxHP()]
	s += "[color=#7fe9ff][b]Aether Cores[/b][/color]  %d of 5 · beat the shrine guardians · Aether charges %d%% faster\n" % [coreCount(), round((AG() - 1) * 100)]
	var rel = []
	for id in META.eq:
		for r in DB.RELICS:
			if r.id == id:
				rel.append(r.name)
	s += "[color=#ffd27a][b]Stardust[/b][/color]  ◆ %d · relics: %s\n" % [META.dust, ", ".join(rel) if rel.size() else "none equipped"]
	var arms = []
	for i in DB.ARMS.size():
		if ownArm(i):
			arms.append(DB.ARMS[i].name)
	s += "[color=#ffcc4a][b]Guardian Arms[/b][/color]  %s\n" % (", ".join(arms) if arms.size() else "Beat a shrine guardian to take its weapon")
	s += "[color=#ff7a5a][b]Starblood Fangs[/b][/color]  %d of 6 · hidden behind hollow walls · claws +%d%% damage" % [fangCount(), fangCount() * 10]
	return s

func pauseCard() -> void:
	_archBack = Callable()
	var canTravel: bool = ROOM != null and ROOM.kind == "save" and not lock and saveRooms().size() > 1
	var btns = [["Resume", resume]]
	if canTravel:
		btns.append(["Fast travel", travelCard])
	if ROOM != null and ROOM.kind == "save" and G.rush == null:
		btns.append(["Claude's Exchange", func(): exchangeCard(pauseCard)])
	if loreCount() or META.sable or codexCount() or featCount():
		btns.append(["Archive", archiveCard, true])
	btns.append(["Settings", func(): soundCard(pauseCard), true])
	btns.append(["Controls", func(): controls(pauseCard), true])
	btns.append(["Quit to title", toTitle, true])
	var mp = MapView.new()
	mp.g = self
	mp.custom_minimum_size = Vector2(min(780.0, W * .34), 380)
	showCard({ey=DB.LV[G.lv].ch + " · " + String(ROOM.get("zn", DB.LV[G.lv].name) if ROOM != null else DB.LV[G.lv].name) + (" · Rift Mode" if META.hard else ""), h="Paused", left=mp, fs=27,
		b="[color=#9d97bd]Map %d/%d rooms · Items %d%% · %s[/color]\n" % [META.map.size(), DB.ROOMS.size(), completion(), _mapLine()] + abilitiesBB(), btns=btns})

func _mapLine() -> String:
	var c = mapCode(int(META.get("seed", 0)))
	return ("Map code [color=#ffe08a][b]%s[/b][/color]" % c if c != "" else "Classic map") + (" · powers shuffled" if META.get("perm", []).size() == 5 else "") + " · Time " + fmtTime(float(META.get("time", 0.0)))

class MapView extends Control:
	const ZCOL := [Color("#a8327a"), Color("#2f6f9a"), Color("#5f8a2a"), Color("#7448a8"), Color("#a86a24")]
	var g
	func _draw() -> void:
		var a: int = g.G.lv
		var rooms: Array = DB.AREAS[a]
		var mw = 0
		var mh = 0
		for id in rooms:
			var o: Dictionary = DB.ROOMS[id]
			mw = max(mw, o.gx + o.w)
			mh = max(mh, o.gy + o.h)
		var cw: float = size.x
		var ch: float = size.y
		draw_rect(Rect2(0, 0, cw, ch), Color("#0a0814"))
		draw_rect(Rect2(0, 0, cw, ch), Color(180 / 255.0, 140 / 255.0, 1, .35), false, 2)
		var cs: float = min((cw - 80) / mw, (ch - 104) / mh)
		var ox: float = (cw - mw * cs) / 2.0
		var oy = 60.0
		for i in mw + 1:
			draw_line(Vector2(ox + i * cs, oy), Vector2(ox + i * cs, oy + mh * cs), Color(120 / 255.0, 200 / 255.0, 1, .1))
		for i in mh + 1:
			draw_line(Vector2(ox, oy + i * cs), Vector2(ox + mw * cs, oy + i * cs), Color(120 / 255.0, 200 / 255.0, 1, .1))
		var M: Dictionary = g.META
		var f: Font = DB.font_u
		var zs = {}
		for id in rooms:
			var q: Dictionary = DB.ROOMS[id]
			if q.has("zn") and not zs.has(q.zn) and (M.map.has(id) or M.mapped.has(str(a))):
				zs[q.zn] = ZCOL[zs.size() % ZCOL.size()]
		for id in rooms:
			var o: Dictionary = DB.ROOMS[id]
			var seen: bool = M.map.has(id)
			if not seen and (o.kind == "secret" or not M.mapped.has(str(a))):
				continue
			var x: float = ox + o.gx * cs
			var y: float = oy + o.gy * cs
			var w: float = o.w * cs
			var h: float = o.h * cs
			if not seen:
				draw_rect(Rect2(x + 1, y + 1, w - 2, h - 2), Color("#24142e"))
				draw_rect(Rect2(x + 1, y + 1, w - 2, h - 2), Color("#6a4a7a"), false, max(2.0, cs * .05))
				continue
			var col = Color("#2a8a5a") if o.kind == "save" else Color("#8a1a3a") if o.kind == "boss" else Color("#8a6a1a") if o.kind == "secret" else Color("#a8327a")
			if o.has("th") and o.kind != "save" and o.kind != "boss" and o.kind != "secret":
				# random worlds: colour each district by its own light
				if not zs.has(o.zn):
					zs[o.zn] = ZCOL[zs.size() % ZCOL.size()]
				col = zs[o.zn]
			draw_rect(Rect2(x + 1, y + 1, w - 2, h - 2), col)
			for i in range(1, o.w):
				draw_line(Vector2(x + i * cs, y + 2), Vector2(x + i * cs, y + h - 2), Color(1, .78, .94, .35))
			for i in range(1, o.h):
				draw_line(Vector2(x + 2, y + i * cs), Vector2(x + w - 2, y + i * cs), Color(1, .78, .94, .35))
			draw_rect(Rect2(x + 1, y + 1, w - 2, h - 2), Color("#ffd0f0"), false, max(2.0, cs * .07))
			for d in o.doors:
				if DB.ROOMS[d.to].kind == "secret" and not M.map.has(d.to):
					continue
				var dy: float = y + d.row * cs + cs * .55
				draw_rect(Rect2(x - 2 if d.side == "L" else x + w - 3, dy - cs * .14, 5, cs * .28), Color("#ffe08a"))
			var ic = ""
			var icc = Color.WHITE
			if o.kind == "save":
				ic = "S"; icc = Color("#c8ffe0")
			if o.lift != null:
				ic = "▼" if o.lift.dir > 0 else "▲"; icc = Color("#bff0ff")
			if o.kind == "boss":
				ic = "☠"; icc = Color("#ffd0dc")
			if o.shrine != null and o.shrine.ab != null and not g.hasAb(o.shrine.ab):
				ic = "★" if g.gDone(o.a) else "☠"
				icc = Color("#ffe08a") if g.gDone(o.a) else Color("#ff9aa8")
			if ic != "":
				var fs = int(cs * .5)
				var tw = f.get_string_size(ic, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
				draw_string(f, Vector2(x + w / 2 - tw / 2, y + cs * .68), ic, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, icc)
			for it in o.items:
				if it.id == null or (M.tanks.has(it.id) if it.type == "tank" else M.items.has(it.id)):
					continue
				draw_circle(Vector2(x + it.x / o.RW * w, y + cs * .3), max(2.5, cs * .1), Color("#ff9ae8") if it.type == "tank" else Color("#ffe08a"))
		if g.ROOM != null and g.ROOM.a == a and g.pl != null:
			var o: Dictionary = g.ROOM
			var px: float = ox + o.gx * cs + g.pl.x / o.RW * o.w * cs
			var py: float = oy + o.gy * cs + min(o.h - .2, g.pl.y / 1080.0) * cs
			draw_circle(Vector2(px, py - cs * .15), max(3.0, cs * .13), Color.WHITE)
		draw_string(DB.font_d, Vector2(24, 44), String(DB.LV[a].name).to_upper(), HORIZONTAL_ALIGNMENT_LEFT, -1, 30, Color("#ece7ff"))
		# district legend
		var lx = 24.0
		for zn in zs:
			var lab: String = String(zn).trim_prefix("The ")
			var lw = f.get_string_size(lab, HORIZONTAL_ALIGNMENT_LEFT, -1, 18).x
			if lx + 26 + lw > cw - 10:
				break
			draw_rect(Rect2(lx, ch - 27, 16, 16), zs[zn])
			draw_rect(Rect2(lx, ch - 27, 16, 16), Color("#ffd0f0"), false, 1.5)
			draw_string(f, Vector2(lx + 22, ch - 13), lab, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color("#cfc8ea"))
			lx += 22 + lw + 22
		var t = 0
		for k in 2:
			if M.tanks.has(str(a) + "-" + str(k)):
				t += 1
		var s = "Energy Tanks %d/2" % t
		var sw = f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, 22).x
		draw_string(f, Vector2(cw - 24 - sw, 44), s, HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color("#ff9ae8"))

func archiveCard() -> void:
	var b = ""
	if META.sable:
		b += "[color=#5ce1d8][b]Allies · Sable of the Ninth Talon[/b][/color]\n" + DB.T.SABLE_BIO + "\n\n"
	var got = 0
	for a in 6:
		if META.items.has("lore" + str(a)):
			got += 1
			b += "[color=#ffe08a][b]%s · %s[/b][/color]\n%s\n\n" % [DB.LV[a].ch, DB.T.LORE[a].h, DB.T.LORE[a].b]
	if got == 0:
		b += "No tablets yet. The Starblood hid their records well."
	var btns = []
	if codexCount():
		btns.append(["Robot codex  (%d/%d)" % [codexCount(), CODEX_ORDER.size() + 6], codexCard])
	btns.append(["Feats  (%d/%d)" % [featCount(), FEATS.size()], featsCard])
	btns.append(["Stats", statsCard, true])
	btns.append(["Back", pauseCard, btns.size() > 0])
	showCard({ey="Starblood archive", h="Data Tablets", tag="%d of 6 recovered" % got, b=b, btns=btns})

# ---------- Robot codex: lore and a fighting tip for every robot you have met ----------
const CODEX_ORDER := ["g", "r", "b", "c", "h", "d", "t", "B", "oc"]
const CODEX := {
	g = ["Ronin", "Hollowed swordframes, the first machines the Rift woke in the hangars. Quick, reckless and always closing in.",
		"A Ronin stops for a heartbeat before every slash. Hit it, then hop back before the blade comes round."],
	r = ["Trooper", "Gunners from the Iron Armory's drill halls, still running a firing doctrine nobody remembers writing.",
		"Three rounds, then a reload. That reload is your opening: dash in and strike."],
	b = ["Crusher", "Loader frames refitted for siege work. Slow and heavy, and they lob molten slag at anyone who keeps their distance.",
		"Up close the hammer takes a long time to fall. From far away, watch for the arcing slag and keep moving."],
	c = ["Volt", "Phase-shifted sentries that fold themselves through space and reappear wherever the fight is.",
		"It fires a fan of three violet bolts. Get close and it blinks away, so jump between the bolts and hit it as it fades back in."],
	h = ["Hound", "Four-legged hunters built to run down anything that flees. They hunt in packs on the open decks.",
		"It crouches before it leaps. Jump over the pounce and hit it from behind while it skids."],
	d = ["Drone", "Scout drones that hover just out of reach and call targets for the rest of the Hollowed.",
		"It always keeps its distance. Double jump to reach it, or knock it down with a Starburst Roar."],
	t = ["Turret", "Wall-mounted cannons left behind by the station's defences. They turn slowly, but never sleep.",
		"Its barrel swings slowly. Circle under or over its aim, then close in while it is still turning."],
	B = ["Iron Warden", "Elite Crusher commanders, plated twice over. When one wakes, the floor itself becomes a weapon.",
		"Every hammer blow sends a shockwave racing along the floor both ways. Jump the waves, then punish the long recovery."],
	oc = ["Overcharged", "Robots the Rift has overfed. Raw Aether leaks from every seam and gives them a gold glow.",
		"Nearly twice the health and they hit a quarter harder, but each one bursts into 4 extra Stardust and a shower of coins. Trial rooms are full of them."],
}

var _archBack := Callable()

func titleArchive() -> void:
	_archBack = titleArchive
	var btns = []
	if codexCount():
		btns.append(["Robot codex  (%d/%d)" % [codexCount(), CODEX_ORDER.size() + 6], codexCard])
	btns.append(["Feats  (%d/%d)" % [featCount(), FEATS.size()], featsCard])
	btns.append(["Stats", statsCard, true])
	btns.append(["Back", func():
		_archBack = Callable()
		toTitle(), true])
	showCard({ey="Starblood archive", h="Feats & Codex", b="Kept across every game you play on this device.\n\nFeats earned [b]%d of %d[/b] · Codex entries [b]%d of 15[/b]" % [featCount(), FEATS.size(), codexCount()], btns=btns})

func _archGo() -> void:
	if _archBack.is_valid():
		_archBack.call()
	else:
		archiveCard()

func statsCard() -> void:
	var b = "[color=#9d97bd]Totals for every game on this device.[/color]\n\n"
	b += "Games started [b]%d[/b] · Sagas completed [b]%d[/b]\n" % [statGet("games"), statGet("wins")]
	b += "Play time [b]%s[/b] · Falls [b]%d[/b]\n" % [fmtTime(statGet("time")), statGet("falls")]
	b += "Robots destroyed [b]%d[/b] · Overcharged [b]%d[/b] · Guardians beaten [b]%d[/b]\n" % [statGet("kills"), int(PREFS.get("ocK", 0)), statGet("guards")]
	b += "Stardust collected [b]◆ %d[/b]\n" % statGet("dust")
	var recs = PREFS.get("records", {})
	if typeof(recs) == TYPE_DICTIONARY and recs.size():
		var ks: Array = recs.keys()
		ks.sort_custom(func(x, y): return float(recs[x]) < float(recs[y]))
		b += "\n[color=#ffe08a][b]Fastest clears[/b][/color]\n"
		for i in min(8, ks.size()):
			var parts: PackedStringArray = String(ks[i]).split("-")
			var label = ("Map " + parts[0]) if parts[0] != "classic" else "Classic map"
			if parts.size() > 1:
				label += " · " + " · ".join(Array(parts.slice(1)).map(func(m): return String(m).capitalize()))
			b += "%s  [b]%s[/b]\n" % [label, fmtTime(float(recs[ks[i]]))]
	if G.rush == null and rushBest() > 0:
		b += "\nBoss Rush best [b]%s[/b]" % fmtT(rushBest())
		if rushBest(true) > 0:
			b += " · Golden Gauntlet best [b]%s[/b]" % fmtT(rushBest(true))
	showCard({ey="Starblood archive", h="Stats", b=b, btns=[["Back", _archGo]]})

func featsCard() -> void:
	var b = ""
	var fx: Dictionary = _feats()
	for f in FEATS:
		var got: bool = fx.has(f[0])
		var extra = ""
		if f[0] == "oc25" and not got:
			extra = "  (%d/25)" % min(25, int(PREFS.get("ocK", 0)))
		if f[0] == "codex" and not got:
			extra = "  (%d/15)" % codexCount()
		if got:
			b += "[color=#ffd24a]★[/color] [color=#ffe08a][b]%s[/b][/color] · %s\n" % [f[1], f[2]]
		else:
			b += "[color=#6a6488]☆ [b]%s[/b] · %s%s[/color]\n" % [f[1], f[2], extra]
	showCard({ey="Starblood archive", h="Feats", tag="%d of %d earned" % [fx.size(), FEATS.size()], b=b, btns=[["Back", _archGo]]})

func codexCard() -> void:
	var cx: Dictionary = PREFS.get("codex", {})
	var b = ""
	for k in CODEX_ORDER:
		if cx.has(k):
			var c: Array = CODEX[k]
			b += "[color=%s][b]%s[/b][/color]\n%s\n[color=#9de0a8]Tip:[/color] %s\n\n" % ["#ffd24a" if k == "oc" else "#ff7ad9", c[0], c[1], c[2]]
	var miss := 0
	for k in CODEX_ORDER:
		if not cx.has(k):
			miss += 1
	for a in 5:
		if cx.has("G" + str(a)):
			var D0: Dictionary = DB.GUARD[a]
			b += "[color=#ffe08a][b]%s · %s[/b][/color]\n[color=#9de0a8]Tip:[/color] %s\n\n" % [D0.name, D0.sub, D0.get("tip", "")]
	if cx.has("M"):
		b += "[color=#ff5a7a][b]Malakar · the Egg-Keeper[/b][/color]\nThe Starblood's own Egg-Keeper, who tore the Rift open and made the Hollowed. Beaten, but the Rift still hums.\n\n"
	var gm := 0
	for a in 5:
		if not cx.has("G" + str(a)):
			gm += 1
	var rest = []
	if miss:
		rest.append("%d robot%s you have not met" % [miss, "s" if miss > 1 else ""])
	if gm:
		rest.append("%d guardian%s still standing" % [gm, "s" if gm > 1 else ""])
	if not cx.has("M"):
		rest.append("one who waits at the top of the Rift")
	if rest.size():
		b += "[color=#6a6488][b]Still unknown:[/b] " + ", ".join(rest) + ".[/color]"
	showCard({ey="Starblood archive", h="Robot Codex", tag="%d of %d entries" % [cx.size(), CODEX_ORDER.size() + 6], b=b, btns=[["Back", _archGo]]})

func travelCard() -> void:
	# random worlds have three stations each, so pick a world first, then a station in it
	var by = {}
	for id in saveRooms():
		if id == ROOM.id:
			continue
		var a: int = DB.ROOMS[id].a
		if not by.has(a):
			by[a] = []
		by[a].append(id)
	if by.size() == 1:
		travelWorld(by.keys()[0], false)
		return
	var btns = []
	for a in 6:
		if by.has(a):
			var n: int = by[a].size()
			btns.append([DB.LV[a].ch + " · " + DB.LV[a].name + ("  (%d)" % n if n > 1 else ""), func(): travelWorld(a, true)])
	btns.append(["Back", pauseCard, true])
	showCard({ey="Save station network", h="Fast Travel", b="Pick a world, then a station. Your progress is saved on arrival.", btns=btns})

func travelWorld(a: int, back: bool) -> void:
	var btns = []
	var seen = {}
	for id in saveRooms():
		var o: Dictionary = DB.ROOMS[id]
		if id == ROOM.id or o.a != a:
			continue
		var zn: String = String(o.get("zn", DB.LV[a].name))
		seen[zn] = seen.get(zn, 0) + 1
		var lab: String = zn + (" · station %d" % seen[zn] if seen[zn] > 1 else "")
		btns.append([lab, func():
			G.paused = false
			hideCard()
			padShow(true)
			Sfx.duck = 1.0
			startTrans({travel=id})])
	btns.append(["Back", travelCard if back else pauseCard, true])
	showCard({ey="Save station network · " + DB.LV[a].ch, h=DB.LV[a].name, b="Pick a station to warp to. Your progress is saved on arrival.", btns=btns})

func maxArea() -> int:
	var m = 0
	for k in META.areas:
		m = max(m, int(k))
	return m

func exchangeCard(back = null) -> void:
	var bk: Callable = back if back != null else pauseCard
	var d: int = META.dust
	var stock = DB.RELICS.filter(func(r): return r.w <= maxArea())
	var list = VBoxContainer.new()
	list.add_theme_constant_override("separation", 6)
	for r in stock:
		var own: bool = META.relics.has(r.id)
		var on: bool = META.eq.has(r.id)
		var row = _row("[color=%s][b]%s %s[/b][/color]\n%s" % [r.col, "◆" if own else "◇", r.name, r.txt])
		var b = _btn(("Equipped" if on else "Equip") if own else "◆ %d" % r.cost, not on)
		if own:
			b.pressed.connect(func():
				var i: int = META.eq.find(r.id)
				if i >= 0:
					META.eq.remove_at(i)
				else:
					if META.eq.size() >= 3:
						META.eq.pop_front()
					META.eq.append(r.id)
				save_meta()
				sfx("ui1")
				exchangeCard(bk))
		else:
			b.disabled = d < r.cost
			b.pressed.connect(func():
				if META.dust < r.cost:
					return
				META.dust -= r.cost
				META.relics[r.id] = 1
				if META.eq.size() < 3:
					META.eq.append(r.id)
				save_meta()
				sItem()
				exchangeCard(bk))
		row.add_child(b)
		list.add_child(row)
	for c in [["heal", "Repair kit", "Restore all health.", 20], ["egg", "Golden Egg", "One extra life (up to 5).", 70]]:
		var row = _row("[color=#ffd27a][b]%s[/b][/color]\n%s" % [c[1], c[2]])
		var b = _btn("◆ %d" % c[3], true)
		b.disabled = d < c[3]
		b.pressed.connect(func():
			if META.dust < c[3]:
				return
			META.dust -= c[3]
			if c[0] == "heal" and pl:
				pl.hp = float(pl.max)
			else:
				G.lives = min(5, G.lives + 1)
			save_meta()
			sPick("med" if c[0] == "heal" else "egg")
			exchangeCard(bk))
		row.add_child(b)
		list.add_child(row)
	var more = "More relics turn up as you reach new worlds. " if stock.size() < DB.RELICS.size() else ""
	showCard({ey="Claude's Exchange", h="Relics", tag="Stardust ◆ %d · Relics equipped %d/3" % [d, META.eq.size()],
		b="[color=#ffb08a][b]CLAUDE:[/b][/color] \"%sEquip up to 3, and swap them at any save station.\"" % more, extra=list, btns=[["Done", bk]]})

func _row(bb: String) -> HBoxContainer:
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	var t = RichTextLabel.new()
	t.bbcode_enabled = true
	t.fit_content = true
	t.scroll_active = false
	t.text = bb
	t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(t)
	return row

func _btn(label: String, alt := false) -> Button:
	var b = Button.new()
	b.text = label.to_upper()
	b.theme_type_variation = "AltButton" if alt else ""
	b.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	b.pressed.connect(func(): sfx("ui0" if alt else "ui1"))
	return b

# ---------- settings and controls ----------
## one settings row of mutually exclusive buttons, stored in PREFS[key]
func _optRow(box: Control, title: String, key: String, opts: Array, def, back: Callable) -> HBoxContainer:
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	var l = Label.new()
	l.text = title
	l.custom_minimum_size = Vector2(220, 0)
	l.add_theme_color_override("font_color", C("#5ce1ff"))
	row.add_child(l)
	var cur = PREFS.get(key, def)
	for o in opts:
		var b = _btn(o[1], cur != o[0])
		var v = o[0]
		b.pressed.connect(func():
			PREFS[key] = v
			save_prefs()
			soundCard(back))
		row.add_child(b)
	if box != null:
		box.add_child(row)
	return row

func soundCard(back: Callable) -> void:
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 12)
	for q in [["Music", "music"], ["Effects", "sfx"]]:
		var row = HBoxContainer.new()
		var l = Label.new()
		l.text = q[0]
		l.custom_minimum_size = Vector2(220, 0)
		l.add_theme_color_override("font_color", C("#5ce1ff"))
		row.add_child(l)
		var s = HSlider.new()
		s.min_value = 0; s.max_value = 100; s.step = 1
		s.value = float(PREFS[q[1]]) * 100
		s.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		s.custom_minimum_size = Vector2(700, 60)
		var key: String = q[1]
		s.value_changed.connect(func(v):
			PREFS[key] = v / 100.0
			Sfx.set_volumes(float(PREFS.music), float(PREFS.sfx))
			save_prefs())
		s.drag_ended.connect(func(_c):
			if key == "sfx":
				sfx("pick_coin"))
		row.add_child(s)
		box.add_child(row)
	var gq = HBoxContainer.new()
	gq.add_theme_constant_override("separation", 14)
	var gl = Label.new()
	gl.text = "Graphics"
	gl.custom_minimum_size = Vector2(220, 0)
	gl.add_theme_color_override("font_color", C("#5ce1ff"))
	gq.add_child(gl)
	for q in [["high", "High"], ["fast", "Fast"]]:
		var b = _btn(q[1], PREFS.quality != q[0])
		var qq: String = q[0]
		b.pressed.connect(func():
			PREFS.quality = qq
			partMul = 1.0 if qq == "high" else .5
			save_prefs()
			soundCard(back))
		gq.add_child(b)
	box.add_child(gq)
	var shr = _optRow(null, "Shake", "shake", [[1.0, "Full"], [0.4, "Low"], [0.0, "Off"]], 1.0, back)
	shr.get_child(0).custom_minimum_size = Vector2(0, 0)
	var spc = Control.new()
	spc.custom_minimum_size = Vector2(26, 0)
	gq.add_child(spc)
	gq.add_child(shr)
	var pair = HBoxContainer.new()
	pair.add_theme_constant_override("separation", 40)
	pair.add_child(_optRow(null, "Vibration", "vibe", [[true, "On"], [false, "Off"]], true, back))
	var tr = _optRow(null, "Run timer", "timer", [[true, "On"], [false, "Off"]], false, back)
	tr.get_child(0).custom_minimum_size = Vector2(0, 0)
	pair.add_child(tr)
	box.add_child(pair)
	if touchy:
		var tb = _optRow(box, "Touch buttons", "padS", [[0.85, "Small"], [1.0, "Normal"], [1.15, "Large"]], 1.0, back)
		var fb = _btn("See-through", not PREFS.get("padF", false))
		fb.pressed.connect(func():
			PREFS.padF = not PREFS.get("padF", false)
			save_prefs()
			soundCard(back))
		tb.add_child(fb)
	showCard({ey="Settings", h="Sound & graphics", extra=box,
		b="" if touchy else "Fast graphics draw fewer particles and less weather, for a steadier frame rate on older phones.",
		btns=[["Done", back], ["Credits", func(): showCard({ey="Settings", h="Credits",
			b="Music by Tanner Helland (github.com/tannerhelland/free-music, CC BY 4.0).\n\nSound effects by Kenney (kenney.nl, CC0) and synthesised for Aetherfall.\n\nFonts: Cinzel and Chakra Petch (SIL Open Font License).\n\nMade with Godot Engine.",
			btns=[["Back", func(): soundCard(back)]]}), true]]})

func controls(back: Callable) -> void:
	var k = "[color=#5ce1ff][b]Left thumb / A D[/b][/color]  Move. Touch anywhere on the left side of the screen and slide. Pull down to drop through thin platforms\n"
	k += "[color=#5ce1ff][b]▲ / W / Space[/b][/color]  Jump\n"
	k += "[color=#5ce1ff][b]Claw / J / X[/b][/color]  Claw strike. Tap three times for a combo; the third hit is a heavy bite. Swipe enemy orbs to send them back\n"
	k += "[color=#5ce1ff][b]» / L / Shift[/b][/color]  Comet Dash (once found). You can't be hit while dashing\n"
	k += "[color=#5ce1ff][b]✦ / K / C[/b][/color]  Starburst roar (once found). Costs half your Aether bar, which fills as you land hits\n"
	k += "[color=#5ce1ff][b]◈ / U[/b][/color]  Fire your Guardian Arm, the weapon of a guardian you beat. Costs Aether. Tap its label (or I) to switch arms\n"
	k += "[color=#5ce1ff][b]II / Esc / P / Back[/b][/color]  Pause and open the map. At a save station: fast travel and Claude's Exchange (relics)\n\n"
	k += "Each world is a maze of rooms. Walk through the blue hatches at the edges to move between them; red hatches are sealed until the room is clear. Shrines grant new powers that open blocked paths, so come back to places you could not reach before. Green stations save your game. Stand on an elevator to ride to the next world."
	showCard({ey="How to play", h="Controls", fs=28, b=k, btns=[["Back", back]]})

# ---------- Boss Rush ----------
var rushIsGold := false

func _rushBtn() -> void:
	if featHas("rush"):
		rushCard()
	else:
		rushIsGold = false
		startRush()

func rushBest(gold := false) -> float:
	return float(PREFS.get("rushG" if gold else "rush", 0.0))

func rushCard() -> void:
	var b = "Every guardian and the Void Sovereign, back to back.\n\nBest time [b]%s[/b]" % (fmtT(rushBest()) if rushBest() > 0 else "-")
	b += "\n\n[color=#ffd24a][b]Golden Gauntlet[/b][/color] · the same fights, but every guardian is Overcharged: tougher, and hitting harder."
	if rushBest(true) > 0:
		b += " Best time [b]%s[/b]" % fmtT(rushBest(true))
	showCard({ey="Boss Rush", h="Choose your gauntlet", b=b, btns=[["Boss Rush", func():
		rushIsGold = false
		startRush()], ["Golden Gauntlet", func():
		rushIsGold = true
		startRush()], ["Back", toTitle, true]]})

func fmtT(t: float) -> String:
	return "%d:%02d.%d" % [int(t / 60), int(fmod(t, 60)), int(fmod(t * 10, 10))]

var realMeta = null

func startRush() -> void:
	realMeta = META
	var m = fresh_meta()
	for A in DB.ABIL:
		m.ab[A.id] = 1
	for a in 6:
		m.tanks[str(a) + "-0"] = 1
		m.tanks[str(a) + "-1"] = 1
	m.relics = realMeta.relics.duplicate()
	m.eq = realMeta.eq.duplicate()
	m.items = realMeta.items.duplicate()
	for a in 6:
		m.areas[str(a)] = 1
		m.met[str(a)] = 1
	m.arm = -1
	META = m
	DB.set_world(0)
	G.rush = {i=0, t=0.0, next=0.0, gold=rushIsGold}
	G.score = 0
	G.lives = 3
	startGame(DB.RUSH[0], {x=W * .72, y=GY})
	showBanner("Golden Gauntlet" if rushIsGold else "Boss Rush", "Fight 1 of 6", 2)

func rushEnd() -> void:
	if G.rush != null and realMeta != null:
		META = realMeta
		realMeta = null
	G.rush = null

func rushDone() -> void:
	var t: float = G.rush.t
	var gold: bool = rushGold()
	var best = rushBest(gold)
	var nb = best == 0 or t < best
	if nb:
		PREFS["rushG" if gold else "rush"] = t
		save_prefs()
	rushEnd()
	feat("rush")
	if gold:
		feat("gold")
	G.state = "card"
	padShow(false)
	clearInput()
	Sfx.music("victory")
	showCard({ey=("Golden Gauntlet" if gold else "Boss Rush") + " complete", h=fmtT(t), b=("[color=#ffd27a][b]New best time![/b][/color]" if nb else "Best time " + fmtT(best)) + ("\n\nEvery guardian Overcharged, and you still came out on top. The Starblood would be proud." if gold else "\n\nEvery guardian and the Void Sovereign, back to back. The Starblood would be proud."),
		btns=[["Again", startRush], ["Title", toTitle, true]]})

func rushFail() -> void:
	var Rr: Dictionary = G.rush
	rushEnd()
	later(.9, func(): showCard({ey="Golden Gauntlet" if Rr.get("gold", false) else "Boss Rush", h="Tyko is down", b="You reached fight %d of 6 in %s." % [Rr.i + 1, fmtT(Rr.t)], btns=[["Try again", startRush], ["Title", toTitle, true]]}))

# ---------- cards: one panel for every menu and story page ----------
func build_theme() -> void:
	THEME = Theme.new()
	var fr = load("res://assets/fonts/chakra-petch-latin-400-normal.ttf") as FontFile
	if fr:
		fr.fallbacks = [load("res://assets/fonts/symbols-dejavu-bold.ttf"), ThemeDB.fallback_font]
	THEME.default_font = fr
	var bs = 42 if touchy else 34
	THEME.default_font_size = bs
	THEME.set_font("bold_font", "RichTextLabel", DB.font_u)
	THEME.set_font("normal_font", "RichTextLabel", fr)
	THEME.set_font("italics_font", "RichTextLabel", fr)
	THEME.set_font_size("normal_font_size", "RichTextLabel", bs)
	THEME.set_font_size("bold_font_size", "RichTextLabel", bs)
	THEME.set_font_size("italics_font_size", "RichTextLabel", bs)
	THEME.set_color("default_color", "RichTextLabel", C("#d6d0f2"))
	THEME.set_constant("line_separation", "RichTextLabel", 6)
	THEME.set_font("font", "Button", DB.font_u)
	THEME.set_font_size("font_size", "Button", 40 if touchy else 32)
	THEME.set_font("font", "Label", DB.font_u)
	for v in [["Button", "#5ce1ff", Color(92 / 255.0, 225 / 255.0, 1, .12)], ["AltButton", "#b48cff", Color(180 / 255.0, 140 / 255.0, 1, .08)]]:
		if v[0] == "AltButton":
			THEME.set_type_variation("AltButton", "Button")
		for st in ["normal", "hover", "pressed", "focus", "disabled"]:
			var sb = StyleBoxFlat.new()
			sb.bg_color = v[2] if st != "pressed" else Color(92 / 255.0, 225 / 255.0, 1, .3)
			if st == "hover":
				sb.bg_color = v[2].lightened(.15)
			sb.border_color = C(v[1]) if st != "focus" else Color.WHITE
			sb.set_border_width_all(2)
			if st == "focus":
				sb.draw_center = false
			sb.set_corner_radius_all(6)
			sb.content_margin_left = 34; sb.content_margin_right = 34; sb.content_margin_top = 18; sb.content_margin_bottom = 18
			sb.skew = Vector2(-.12, 0)
			THEME.set_stylebox(st, v[0], sb)
		THEME.set_color("font_color", v[0], C("#ece7ff"))
		THEME.set_color("font_hover_color", v[0], Color.WHITE)
		THEME.set_color("font_pressed_color", v[0], Color.WHITE)
		THEME.set_color("font_focus_color", v[0], Color.WHITE)
		THEME.set_color("font_disabled_color", v[0], Color(1, 1, 1, .35))
	var gb = StyleBoxFlat.new()
	gb.bg_color = Color(1, 1, 1, .12)
	gb.content_margin_top = 6; gb.content_margin_bottom = 6
	THEME.set_stylebox("slider", "HSlider", gb)
	var ga = StyleBoxFlat.new()
	ga.bg_color = C("#b48cff")
	ga.content_margin_top = 6; ga.content_margin_bottom = 6
	THEME.set_stylebox("grabber_area", "HSlider", ga)
	THEME.set_stylebox("grabber_area_highlight", "HSlider", ga)
	var img = Image.create(40, 40, false, Image.FORMAT_RGBA8)
	for yy in 40:
		for xx in 40:
			var d = Vector2(xx - 19.5, yy - 19.5).length()
			img.set_pixel(xx, yy, Color(1, 1, 1, clampf(19 - d, 0, 1)))
	var gt = ImageTexture.create_from_image(img)
	THEME.set_icon("grabber", "HSlider", gt)
	THEME.set_icon("grabber_highlight", "HSlider", gt)
	var vs = StyleBoxFlat.new()
	vs.bg_color = Color(1, 1, 1, .08)
	THEME.set_stylebox("scroll", "VScrollBar", vs)
	var vg = StyleBoxFlat.new()
	vg.bg_color = Color(180 / 255.0, 140 / 255.0, 1, .5)
	vg.content_margin_left = 6; vg.content_margin_right = 6
	THEME.set_stylebox("grabber", "VScrollBar", vg)
	THEME.set_stylebox("grabber_highlight", "VScrollBar", vg)
	THEME.set_stylebox("grabber_pressed", "VScrollBar", vg)

func build_cards() -> void:
	card_layer = CanvasLayer.new()
	card_layer.layer = 12
	add_child(card_layer)
	card_root = Control.new()
	card_root.theme = THEME
	card_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	card_root.visible = false
	card_layer.add_child(card_root)
	var dim = ColorRect.new()
	dim.color = Color(5 / 255.0, 4 / 255.0, 12 / 255.0, .82)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	card_root.add_child(dim)
	var cc = CenterContainer.new()
	cc.set_anchors_preset(Control.PRESET_FULL_RECT)
	card_root.add_child(cc)
	card_panel = PanelContainer.new()
	var sb = StyleBoxFlat.new()
	sb.bg_color = Color(12 / 255.0, 10 / 255.0, 26 / 255.0, .92)
	sb.border_color = Color(180 / 255.0, 140 / 255.0, 1, .35)
	sb.set_border_width_all(2)
	sb.shadow_color = Color(92 / 255.0, 225 / 255.0, 1, .12)
	sb.shadow_size = 40
	sb.content_margin_left = 64; sb.content_margin_right = 64; sb.content_margin_top = 48; sb.content_margin_bottom = 40
	card_panel.add_theme_stylebox_override("panel", sb)
	cc.add_child(card_panel)
	card_box = VBoxContainer.new()
	card_box.add_theme_constant_override("separation", 22)
	card_panel.add_child(card_box)

func hideCard() -> void:
	cardOpen = false
	card_root.visible = false

func showCard(o: Dictionary) -> void:
	for c in card_box.get_children():
		c.queue_free()
	var wmax: float = min(1700.0, W - 120)
	if o.has("ey"):
		var l = labelN(card_box, String(o.ey).to_upper(), 34 if touchy else 28, "#5ce1ff", DB.font_u6)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var big: bool = o.get("big", false)
	var h = labelN(card_box, o.h, 150 if big else 76, "#ffffff", DB.font_d9 if big else DB.font_d, 0)
	if big:
		h.label_settings.shadow_color = Color(92 / 255.0, 225 / 255.0, 1, .45)
		h.label_settings.shadow_size = 24
		h.label_settings.font_color = C("#dff8ff")
	h.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	if o.has("tag"):
		var t = labelN(card_box, o.tag, 34, "#9d97bd", DB.font_d)
		t.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var maxBody: float = H - 260 - (230 if big else 160) - (40 if o.has("ey") else 0) - (50 if o.has("tag") else 0) - 130
	var scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var inner = VBoxContainer.new()
	inner.add_theme_constant_override("separation", 20)
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(inner)
	var hasBody = false
	if o.has("b") and o.b != "":
		var row = HBoxContainer.new()
		row.add_theme_constant_override("separation", 28)
		if o.get("left") != null:
			o.left.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
			row.add_child(o.left)
		if o.get("portrait") != null:
			var tr = TextureRect.new()
			tr.texture = o.portrait
			tr.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
			tr.custom_minimum_size = Vector2(300, 300)
			tr.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
			row.add_child(tr)
		var rt = RichTextLabel.new()
		rt.bbcode_enabled = true
		rt.fit_content = true
		rt.scroll_active = false
		rt.text = o.b
		if o.has("fs"):
			for k in ["normal_font_size", "bold_font_size", "italics_font_size"]:
				rt.add_theme_font_size_override(k, int(o.fs * (1.2 if touchy else 1.0)))
		rt.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		rt.mouse_filter = Control.MOUSE_FILTER_PASS
		row.add_child(rt)
		inner.add_child(row)
		hasBody = true
	if o.has("extra"):
		inner.add_child(o.extra)
		hasBody = true
	var more: Label = null
	if hasBody:
		card_box.add_child(scroll)
		# a hint when the text runs past the bottom (phones use bigger fonts)
		more = Label.new()
		more.text = "▼  more below"
		more.add_theme_color_override("font_color", C("#9d97bd"))
		more.add_theme_font_size_override("font_size", 24 if touchy else 20)
		more.visible = false
		more.mouse_filter = Control.MOUSE_FILTER_IGNORE
		card_box.add_child(more)
	var btns = HFlowContainer.new()
	btns.add_theme_constant_override("h_separation", 22)
	btns.add_theme_constant_override("v_separation", 16)
	card_box.add_child(btns)
	var first: Button = null
	for q in o.get("btns", []):
		var alt: bool = q.size() > 2 and q[2] == true
		var b = Button.new()
		b.text = String(q[0]).to_upper()
		if alt:
			b.theme_type_variation = "AltButton"
		var fn: Callable = q[1]
		b.pressed.connect(func():
			sfx("ui0" if alt else "ui1", null, null, 1.0, .04)
			fn.call())
		btns.add_child(b)
		if first == null:
			first = b
	card_panel.custom_minimum_size = Vector2(wmax, 0)
	card_panel.size = Vector2(wmax, 0)
	# size the scroll area once the text has been laid out
	if hasBody:
		scroll.custom_minimum_size = Vector2(wmax - 128, 10)
		_fit_scroll.call_deferred(scroll, inner, maxBody, more)
	cardOpen = true
	card_root.visible = true
	if first != null and not touchy:
		first.grab_focus.call_deferred()

func _fit_scroll(scroll: ScrollContainer, inner: Control, maxBody: float, more: Label = null) -> void:
	if not is_instance_valid(scroll):
		return
	var h: float = inner.get_combined_minimum_size().y
	var shown: float = min(h, max(160.0, maxBody))
	scroll.custom_minimum_size.y = shown
	if more != null and is_instance_valid(more) and h > shown + 4:
		more.visible = true
		var bar = scroll.get_v_scroll_bar()
		bar.value_changed.connect(func(v):
			if is_instance_valid(more):
				more.visible = v + bar.page < bar.max_value - 8)

# ---------- HUD ----------
class HudDraw extends Control:
	var g
	func _draw() -> void:
		g.hudDraw(self)

func build_hud() -> void:
	hud_layer = CanvasLayer.new()
	hud_layer.layer = 10
	add_child(hud_layer)
	hud = HudDraw.new()
	hud.g = self
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud_layer.add_child(hud)
	var T = func(size: int, col: String, font: Font) -> Label:
		var l = labelN(hud, "", size, col, font)
		return l
	HU.name = T.call(30, "#ece7ff", DB.font_d)
	HU.hp = T.call(20, "#ffffff", DB.font_u6)
	HU.ae = T.call(20, "#9d97bd", DB.font_u)
	HU.ch = T.call(18, "#9d97bd", DB.font_u6)
	HU.rift = T.call(18, "#ff4a6a", DB.font_u)
	HU.score = T.call(34, "#ece7ff", DB.font_u)
	HU.scl = T.call(16, "#9d97bd", DB.font_u6)
	HU.dust = T.call(22, "#ffd27a", DB.font_u)
	HU.combo = T.call(64, "#ffd27a", DB.font_d9)
	HU.combo2 = T.call(24, "#ece7ff", DB.font_u)
	HU.combo3 = T.call(24, "#5ce1ff", DB.font_u)
	HU.bossN = T.call(30, "#ffd0dc", DB.font_d)
	HU.hint = T.call(26, "#ece7ffd9", DB.font_u6)
	HU.seal = T.call(26, "#ff6a5a", DB.font_u)
	HU.bn = T.call(96, "#ece7ff", DB.font_d9)
	HU.bs = T.call(34, "#ffffff", DB.font_u6)
	HU.bn.label_settings.shadow_size = 30
	HU.buffs = []
	for t in ["shield", "fang"]:
		var i = Sprite2D.new()
		i.texture = DB.tex("pk_" + t)
		i.scale = Vector2.ONE * .7
		hud.add_child(i)
		HU.buffs.append({k=t, i=i, t=T.call(22, DB.PICK[t].col, DB.font_u)})
	HU.eggs = []
	for i in 5:
		var e = Sprite2D.new()
		e.texture = DB.tex("pk_egg")
		e.scale = Vector2.ONE * .42
		hud.add_child(e)
		HU.eggs.append(e)
	HU.fps = T.call(16, "#9d97bd", DB.font_u)
	HU.timer = T.call(24, "#ffe08a", DB.font_u)
	HU.p2n = T.call(22, "#ffc49a", DB.font_u)
	for k in ["name", "hp", "ae", "ch", "rift", "score", "scl", "dust", "combo", "combo2", "combo3", "bossN", "hint", "seal", "bn", "bs", "fps"]:
		HU[k].visible = false

func _tx(l: Label, s: String) -> Label:
	if l.text != s:
		l.text = s
	return l

func hudUpdate() -> void:
	hud.queue_redraw()
	var p = pl
	var play: bool = G.state != "menu" and p != null and ROOM != null
	for k in ["name", "hp", "ae", "ch", "rift", "score", "scl", "dust", "combo", "combo2", "combo3", "bossN", "hint", "seal", "bn", "bs", "p2n", "timer"]:
		HU[k].visible = false
	for e in HU.eggs:
		e.visible = false
	for b in HU.buffs:
		b.i.visible = false
		b.t.visible = false
	HU.fps.visible = OS.is_debug_build() and PREFS.get("fps", false)
	if HU.fps.visible:
		_tx(HU.fps, "%d fps" % Engine.get_frames_per_second())
		place(HU.fps, 10, H - 26, 0, 0)
	if not play:
		return
	var L: Dictionary = DB.LV[G.lv]
	for k in ["name", "hp", "ae", "ch", "score", "scl"]:
		HU[k].visible = true
	_tx(HU.name, String(CH().name).to_upper()); place(HU.name, 48, 34, 0, 0)
	HU.name.label_settings.font_color = C("#ece7ff") if pl2 == null else C(CH().col)
	_tx(HU.hp, "%d / %d" % [ceil(p.hp), p.max]); place(HU.hp, 58, 79, 0, 0)
	var rdy: bool = p.en >= 50 and hasAb("roar")
	_tx(HU.ae, "✦ STARBURST READY" if rdy else "AETHER")
	HU.ae.label_settings.font_color = C("#5ce1ff") if rdy else C("#9d97bd")
	place(HU.ae, 48, 142, 0, 0)
	if G.rush != null:
		_tx(HU.rift, ("◆ GOLDEN GAUNTLET  " if rushGold() else "◆ BOSS RUSH  ") + fmtT(G.rush.t))
		HU.rift.label_settings.font_color = C("#ffd24a") if rushGold() else C("#ff4a6a")
		HU.rift.visible = true
	else:
		_tx(HU.rift, "◆ RIFT MODE")
		HU.rift.label_settings.font_color = C("#ff4a6a")
		HU.rift.visible = META.hard == 1
	place(HU.rift, 528, 141, 1, 0)
	var nx: float = 48 + HU.name.size.x + 30
	HU.p2n.visible = pl2 != null
	if pl2 != null:
		_tx(HU.p2n, String(CH(pl2).name).to_upper() + ("  ·  DOWN" if pl2.dead else ""))
		HU.p2n.label_settings.font_color = C(CH(pl2).col)
		place(HU.p2n, 560, 52, 0, 0)
	for i in HU.eggs.size():
		HU.eggs[i].visible = i < G.lives
		HU.eggs[i].position = Vector2(nx + i * 34 + 10, 51)
	_tx(HU.ch, String(L.ch).to_upper() + "  ·  " + String(ROOM.get("zn", L.name) if ROOM != null else L.name).to_upper()); place(HU.ch, W / 2.0, 22, .5, 0)
	var rx: float = W - (210.0 if touchy else 48.0)
	_tx(HU.score, _fmt(G.score)); place(HU.score, rx, 34, 1, 0)
	_tx(HU.scl, "SCORE"); place(HU.scl, rx, 76, 1, 0)
	HU.dust.visible = true
	_tx(HU.dust, "◆ %d" % META.dust); place(HU.dust, rx, 98, 1, 0)
	if PREFS.get("timer", false) and G.rush == null:
		var tt: float = float(META.get("time", 0.0))
		HU.timer.visible = true
		_tx(HU.timer, ("%d:" % int(tt / 3600) if tt >= 3600 else "") + ("%02d:%02d.%d" % [int(fmod(tt, 3600) / 60), int(fmod(tt, 60)), int(fmod(tt * 10, 10))] if tt >= 3600 else fmtT(tt)))
		place(HU.timer, rx, 124, 1, 0)
	var bf = []
	if p.shield > 0:
		bf.append(["shield", "%d× · %ds" % [p.shield, ceil(p.shieldT)]])
	if p.fury > 0:
		bf.append(["fang", "%ds" % ceil(p.fury)])
	for i in bf.size():
		for b in HU.buffs:
			if b.k == bf[i][0]:
				var bx = 72.0 + i * 170
				b.i.visible = true
				b.i.position = Vector2(bx, 208)
				b.t.visible = true
				_tx(b.t, bf[i][1])
				place(b.t, bx + 30, 194, 0, 0)
	if p.hits >= 3:
		var m: int = 1 + min(4, int(p.hits / 10))
		var pop: float = min(1.0, (1.8 - p.hitsT) * 8)
		var a: float = min(1.0, p.hitsT * 2)
		HU.combo.visible = true
		_tx(HU.combo, str(p.hits))
		place(HU.combo, W - 60, 262, 1, 0)
		HU.combo.modulate.a = a
		HU.combo.scale = Vector2.ONE * (1 + (1 - pop) * .25)
		HU.combo2.visible = true
		_tx(HU.combo2, "HIT COMBO"); place(HU.combo2, W - 60, 340, 1, 0)
		HU.combo2.modulate.a = a
		if m > 1:
			HU.combo3.visible = true
			_tx(HU.combo3, "×%d SCORE" % m); place(HU.combo3, W - 60, 368, 1, 0)
			HU.combo3.modulate.a = a
	var bv: bool = boss != null and not boss.dead and boss.state != "enter"
	if bv:
		HU.bossN.visible = true
		_tx(HU.bossN, String(boss.name).to_upper() if boss.name != "" else "MALAKAR, THE VOID SOVEREIGN")
		place(HU.bossN, W / 2.0, 118, .5, 0)
	HU.seal.visible = lock and ROOM.arena != null and boss == null and int(lvT * 2) % 2 == 1
	if HU.seal.visible:
		_tx(HU.seal, "◆ HATCHES SEALED ◆"); place(HU.seal, W / 2.0, H - 90, .5, 0)
	var hint: bool = G.lv == 0 and lvT < 10 and ROOM.id == "0-0"
	if hint:
		HU.hint.visible = true
		_tx(HU.hint, "Slide on the left side to move   ·   ▲ jump   ·   claw to strike   ·   walk into hatches to explore   ·   II map" if touchy else "A / D move   ·   W jump   ·   J strike   ·   S drop   ·   walk into hatches to explore   ·   Esc map")
		place(HU.hint, W / 2.0, H - 60, .5, 0)
	if banner != null:
		var a: float = min(1.0, min(banner.life * 2, (banner.max - banner.life) * 4))
		HU.bn.visible = true
		HU.bn.label_settings.shadow_color = C(L.glow, .7)
		_tx(HU.bn, String(banner.t).to_upper())
		place(HU.bn, W / 2.0, H / 2.0 - 30, .5, 1)
		HU.bn.modulate.a = a
		if banner.sub != "":
			HU.bs.visible = true
			_tx(HU.bs, String(banner.sub).to_upper())
			HU.bs.label_settings.font_color = C(L.glow)
			place(HU.bs, W / 2.0, H / 2.0 + 34, .5, 1)
			HU.bs.modulate.a = a

func hudDraw(c: Control) -> void:
	var p = pl
	var play: bool = G.state != "menu" and p != null and ROOM != null
	if not play:
		if TRANS.on:
			c.draw_rect(Rect2(0, 0, W, H), Color(0, 0, 0, transA()))
		return
	var bar = func(x: float, y: float, w: float, h: float, v: float, c1: Color, c2: Color):
		c.draw_rect(Rect2(x - 3, y - 3, w + 6, h + 6), Color(5 / 255.0, 4 / 255.0, 12 / 255.0, .7))
		var f = clampf(v, 0, 1)
		if f > 0:
			var pts = PackedVector2Array([Vector2(x, y), Vector2(x + w * f, y), Vector2(x + w * f, y + h), Vector2(x, y + h)])
			c.draw_polygon(pts, PackedColorArray([c1, c1.lerp(c2, f), c1.lerp(c2, f), c1]))
		c.draw_rect(Rect2(x - 3, y - 3, w + 6, h + 6), Color(236 / 255.0, 231 / 255.0, 1, .35), false, 2)
	bar.call(48, 80, 480, 24, p.hp / p.max, C("#ff3d6e"), C("#ff8a4c"))
	bar.call(48, 116, 480, 14, p.en / 100.0, C("#3a7cff"), C("#5ce1ff"))
	c.draw_rect(Rect2(48 + 239, 113, 2, 20), Color(236 / 255.0, 231 / 255.0, 1, .8))
	if pl2 != null:
		bar.call(560, 84, 220, 14, pl2.hp / max(1.0, float(pl2.max)), C(CH(pl2).col).darkened(.3), C(CH(pl2).col))
	if not (boss != null and not boss.dead):
		drawMinimap(c)
	if boss != null and not boss.dead and boss.state != "enter":
		var bw = 900.0
		var bx = W / 2.0 - bw / 2.0
		if rushGold():
			bar.call(bx, 164, bw, 20, boss.hp / boss.max, C("#8a5a00"), C("#ffd24a"))
		else:
			bar.call(bx, 164, bw, 20, boss.hp / boss.max, C("#7a0a2a"), C("#ff3d6e"))
		for m in ([.5] if boss.guard != null else [.55, .25]):
			c.draw_rect(Rect2(bx + bw * m - 1, 161, 2, 26), Color(1, 1, 1, .6))
	if banner != null:
		var a: float = min(1.0, min(banner.life * 2, (banner.max - banner.life) * 4))
		var bh = 190.0 if banner.sub != "" else 150.0
		c.draw_rect(Rect2(0, H / 2.0 - 130, W, bh), Color(5 / 255.0, 4 / 255.0, 12 / 255.0, .45 * a))
	if flashT > 0:
		c.draw_rect(Rect2(0, 0, W, H), Color(1, 40 / 255.0, 80 / 255.0, min(1.0, flashT * 1.4) * .35))
	if p.hp < 30:
		var va = .55 + sin(lvT * 5) * .2
		var vt = DB.tex("vig")
		c.draw_texture_rect(vt, Rect2(0, 0, W, H), false, Color(1, 0, .235, va))
	if G.state == "over":
		c.draw_rect(Rect2(0, 0, W, H), Color(5 / 255.0, 4 / 255.0, 12 / 255.0, .5))
	if TRANS.on:
		c.draw_rect(Rect2(0, 0, W, H), Color(0, 0, 0, transA()))

func transA() -> float:
	var d = transDur()
	return min(1.0, TRANS.t / d) if TRANS.phase == 0 else max(0.0, 1 - TRANS.t / .25)

func drawMinimap(g: Control) -> void:
	var cs = 40.0
	var cols = 7
	var rows = 3
	var mw = cols * cs
	var mh = rows * cs
	var mx = W / 2.0 - mw / 2.0
	var my = 56.0
	var o = ROOM
	var cx: int = o.gx + min(o.w - 1, int(pl.x / CW))
	var cy: int = o.gy + min(o.h - 1, int(max(0.0, pl.y) / H))
	var ox: float = mx + (int(cols / 2) - cx) * cs
	var oy: float = my + (1 - cy) * cs
	g.draw_rect(Rect2(mx - 4, my - 4, mw + 8, mh + 8), Color(5 / 255.0, 4 / 255.0, 12 / 255.0, .72))
	for i in cols + 1:
		g.draw_line(Vector2(mx + i * cs, my), Vector2(mx + i * cs, my + mh), Color(120 / 255.0, 200 / 255.0, 1, .12))
	for i in rows + 1:
		g.draw_line(Vector2(mx, my + i * cs), Vector2(mx + mw, my + i * cs), Color(120 / 255.0, 200 / 255.0, 1, .12))
	for id in DB.AREAS[o.a]:
		if not META.map.has(id):
			continue
		var r: Dictionary = DB.ROOMS[id]
		var x: float = ox + r.gx * cs
		var y: float = oy + r.gy * cs
		var x2: float = min(x + r.w * cs, mx + mw)
		var y2: float = min(y + r.h * cs, my + mh)
		x = max(x, mx)
		y = max(y, my)
		if x2 <= x or y2 <= y:
			continue
		var col = C("#2a8a5a") if r.kind == "save" else C("#8a1a3a") if r.kind == "boss" else C("#a8327a")
		g.draw_rect(Rect2(x + 1, y + 1, x2 - x - 2, y2 - y - 2), col)
		g.draw_rect(Rect2(x + 1, y + 1, x2 - x - 2, y2 - y - 2), C("#ffd0f0"), false, 2)
	g.draw_rect(Rect2(mx - 4, my - 4, mw + 8, mh + 8), Color(236 / 255.0, 231 / 255.0, 1, .35), false, 2)
	var px: float = ox + o.gx * cs + pl.x / o.RW * o.w * cs
	var py: float = oy + o.gy * cs + min(o.h - .2, pl.y / H) * cs - cs * .15
	if int(lvT * 3) % 2 == 0:
		g.draw_circle(Vector2(clampf(px, mx, mx + mw), clampf(py, my, my + mh)), 5, Color.WHITE)

# ---------- touch controls ----------
func padShow(v: bool) -> void:
	if pad:
		pad.visible = v and touchy

func padAbilities() -> void:
	pass

func padArms() -> void:
	if not ownArm(int(META.arm)):
		for i in DB.ARMS.size():
			if ownArm(i):
				META.arm = i
				break

func build_pad() -> void:
	pad_layer = CanvasLayer.new()
	pad_layer.layer = 11
	add_child(pad_layer)
	pad = load("res://scripts/pad.gd").new()
	pad.g = self
	pad.set_anchors_preset(Control.PRESET_FULL_RECT)
	pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	pad.visible = false
	pad_layer.add_child(pad)

# ---------- automated checks (only when launched with user args after "--") ----------
var TEST := {on=false, frame=0, shots=[], bot="", quit=0, log=[]}

func _test_init() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		return
	TEST.on = true
	for a in args:
		var kv: PackedStringArray = a.trim_prefix("--").split("=", true, 1)
		var k: String = kv[0]
		var v: String = kv[1] if kv.size() > 1 else ""
		match k:
			"seed":
				DB.set_world(int(v))
				TEST.seedSet = true
			"gv":
				TEST.gv = int(v)
			"gendump":
				var parts2 := v.split("@")
				DB.set_world(int(parts2[0]), int(TEST.get("gv", DB.GEN_VER)))
				var out = {}
				for id in DB.ROOMS:
					var o = DB.ROOMS[id]
					out[id] = o
				var f = FileAccess.open(parts2[1], FileAccess.WRITE)
				f.store_string(JSON.stringify(out))
				f.close()
				get_tree().quit()
				return
			"gencheck":
				_genCheck(int(v))
				get_tree().quit()
				return
			"room":
				var parts := v.split(":")
				META = fresh_meta()
				META.seed = DB.WORLD_SEED
				META.gv = DB.WORLD_GV
				if parts.size() > 1:
					for ab in parts[1].split(","):
						if ab != "":
							META.ab[ab] = 1
				G.lives = 3
				startGame(parts[0], {x=300.0 if parts.size() < 3 else float(parts[2]), y=GY})
			"shot":
				for q in v.split(","):
					var fp := q.split("@")
					TEST.shots.append([int(fp[1]), fp[0]])
			"bot":
				TEST.bot = v
			"quit":
				TEST.quit = int(v)
			"touch":
				touchy = true
				RSAFE = 500.0
				build_theme()
				card_root.theme = THEME
			"new":
				META = fresh_meta()
				newRun()
			"allrooms":
				TEST.rooms = DB.ROOMS.keys()
				TEST.ri = 0
				META = fresh_meta()
				for A in DB.ABIL:
					META.ab[A.id] = 1
				startGame(TEST.rooms[0], {x=300.0, y=GY})
			"god":
				TEST.god = true
			"pausef":
				TEST.pausef = int(v)
			"doorwalk":
				META = fresh_meta()
				META.seed = DB.WORLD_SEED
				for A in DB.ABIL:
					META.ab[A.id] = 1
				TEST.dw = []
				TEST.dwi = 0
				TEST.dwbad = []
				for id in DB.ROOMS:
					for d in DB.ROOMS[id].doors:
						TEST.dw.append([id, d])
				G.lives = 3
				startGame(TEST.dw[0][0], {x=300.0, y=GY})
				TEST.dwf = 2
			"savecycle":
				TEST.sc = true
			"travelf":
				TEST.travelf = int(v)
			"travelto":
				TEST.travelto = v
			"cont":
				load_meta()
				continueGame()
				print("CONT seed=", DB.WORLD_SEED, " room=", ROOM.id, " th=", curTh(), " rooms=", DB.ROOMS.size())
			"campaign":
				# play a whole game: --campaign (random world) or --seed=N --campaign
				if not TEST.has("seedSet") and v != "classic":
					DB.set_world(randi_range(1, 2000000000) if v == "" else int(v))
				META = fresh_meta()
				META.seed = DB.WORLD_SEED
				META.gv = DB.WORLD_GV
				META.save = {room="0-0", x=210, score=0}
				if TEST.get("shuffle", false):
					var r = Rng.new(int(META.seed) * 13 + 5)
					var pm = [0, 1, 2, 3, 4]
					for i in range(4, 0, -1):
						var j = int(floor(r.next() * (i + 1)))
						var tmp = pm[i]; pm[i] = pm[j]; pm[j] = tmp
					META.perm = pm
					print("CAMPAIGN shuffle ", pm.map(func(i): return DB.ABIL[i].id))
				G.lives = 3
				G.score = 0
				startGame("0-0", {x=300.0, y=GY})
				TEST.cp = {a=0, goal="", path=[], sub="", t=0, fails=[], log=[], wf0=0, dmg=[0.0, 0.0, 0.0, 0.0, 0.0, 0.0], hurts=[0, 0, 0, 0, 0, 0], frames=[0, 0, 0, 0, 0, 0], deaths=[0, 0, 0, 0, 0, 0], done=false}
				print("CAMPAIGN start seed=", DB.WORLD_SEED)
			"shuffle":
				TEST.shuffle = true
			"dbg":
				TEST.dbg = true
			"oc":
				ocForce = true
			"full":
				TEST.full = true
			"nowalk":
				TEST.walk = false
			"rush":
				TEST.rush = true
			"gold":
				rushIsGold = true
			"showcard":
				TEST.showcard = v
			"gatetest":
				# --seed=N --room=ID:abilities --gatetest : run just the gate step of the campaign
				TEST.cp = {a=G.lv, goal="", path=[], sub="gate", t=0, fails=[], log=[], wf0=0, dmg=[0.0, 0.0, 0.0, 0.0, 0.0, 0.0], hurts=[0, 0, 0, 0, 0, 0], frames=[0, 0, 0, 0, 0, 0], deaths=[0, 0, 0, 0, 0, 0], done=false, gdir=1, gi=0}
				for i in ROOM.gates.size():
					if ROOM.gates[i].kind != "secret":
						TEST.cp.gi = i
			"hzdbg":
				TEST.hzdbg = true
			"noen":
				TEST.noen = true
			"armlift":
				TEST.armlift = true
			"memlog":
				TEST.memlog = true
			"mapall":
				for id in DB.ROOMS:
					META.map[id] = 1
			"liftf":
				TEST.liftf = int(v)

## build many random worlds and check each one is well-formed and beatable
func _genCheck(n: int) -> void:
	var bad = 0
	var tot = 0
	var cells = 0
	var t0 = Time.get_ticks_msec()
	for sd in range(1, n + 1):
		DB.set_world(sd * 7919)
		var errs = []
		for a in 6:
			var ids: Array = DB.AREAS[a]
			var occ = {}
			var cnt = {}
			var mw = 0
			var mh = 0
			for id in ids:
				var o: Dictionary = DB.ROOMS[id]
				cnt[o.kind] = cnt.get(o.kind, 0) + 1
				mw = max(mw, o.gx + o.w); mh = max(mh, o.gy + o.h)
				if o.gx < 0 or o.gy < 0:
					errs.append("%s negative grid" % id)
				for x in range(o.gx, o.gx + o.w):
					for y in range(o.gy, o.gy + o.h):
						if occ.has(Vector2i(x, y)):
							errs.append("%s overlaps %s" % [id, occ[Vector2i(x, y)]])
						occ[Vector2i(x, y)] = id
				for d in o.doors:
					var t: Dictionary = DB.ROOMS[d.to]
					var adj = t.gx == o.gx + o.w if d.side == "R" else t.gx + t.w == o.gx
					var pd = DB.partner_door(o, d)
					if not adj or pd == null or pd.side == d.side or t.gy + pd.row != o.gy + d.row or pd.to != id:
						errs.append("%s door %s%d -> %s broken" % [id, d.side, d.row, d.to])
				if o.lift != null and not DB.ROOMS.has(o.lift.to):
					errs.append("%s lift to missing %s" % [id, o.lift.to])
			tot += ids.size()
			cells += mw * mh
			var need = {start=1, save=3, item=2, secret=1, arena=2, gate=1}
			need["liftDown" if a < 5 else "boss"] = 1
			if a < 5:
				need.shrine = 1
			for kk in need:
				if cnt.get(kk, 0) != need[kk]:
					errs.append("world %d has %d %s" % [a, cnt.get(kk, 0), kk])
			# reachability: without passing the gate room's ability gate, the shrine must be reachable and the exit must not
			var gate = ""
			for id in ids:
				if DB.ROOMS[id].kind == "gate":
					gate = id
			var reach = func(block: bool) -> Dictionary:
				var seen = {str(a) + "-0": 1}
				var q = [str(a) + "-0"]
				while q.size():
					var id = q.pop_back()
					if block and id == gate:
						continue
					for d in DB.ROOMS[id].doors:
						if not seen.has(d.to):
							seen[d.to] = 1
							q.append(d.to)
				return seen
			var r0: Dictionary = reach.call(true)
			var r1: Dictionary = reach.call(false)
			# every collectible id exists exactly once, so 100% is possible
			var ids_need = ["egg%d" % a, "lore%d" % a, "sfang%d" % a]
			if a < 5:
				ids_need += ["%d-0" % a, "%d-1" % a]
			else:
				ids_need += ["5-0", "5-1"]
			var have = {}
			for id in ids:
				for it in DB.ROOMS[id].items:
					if it.id != null:
						have[it.id] = have.get(it.id, 0) + 1
			for nid in ids_need:
				if have.get(nid, 0) != 1:
					errs.append("world %d has %d of %s" % [a, have.get(nid, 0), nid])
			if r1.size() != ids.size():
				errs.append("world %d: %d of %d rooms reachable" % [a, r1.size(), ids.size()])
			for id in ids:
				var o: Dictionary = DB.ROOMS[id]
				if o.kind == "shrine" and not r0.has(id):
					errs.append("world %d shrine behind its gate" % a)
				if (o.kind == "liftDown" or o.kind == "boss") and r0.has(id) and a < 5:
					errs.append("world %d exit reachable without the gate" % a)
		if errs.size():
			bad += 1
			if bad < 6:
				print("seed ", sd * 7919, ": ", errs.slice(0, 4))
	print("GENCHECK seeds=%d bad=%d rooms/world=%.1f cells/world=%.1f ms/seed=%.1f" % [n, bad, tot / (6.0 * n), cells / (6.0 * n), (Time.get_ticks_msec() - t0) / float(n)])
	DB.set_world(0)

## walk through every door: enter its room, step into the door, check where we land
func _doorWalk(f: int) -> void:
	if G.state == "card":
		hideCard()
		G.state = "play"
	if TEST.dwi >= TEST.dw.size():
		print("DOORWALK doors=%d bad=%d" % [TEST.dw.size(), TEST.dwbad.size()])
		for b in TEST.dwbad.slice(0, 20):
			print("  ", b)
		TEST.erase("dw")
		TEST.quit = f + 1
		return
	var it = TEST.dw[TEST.dwi]
	var ph: int = f - TEST.dwf
	if ph == 0:
		boss = null
		en = []
		lock = false
		enterRoom(it[0], {x=300.0, y=GY})
		var d = it[1]
		plTeleport(60.0 if d.side == "L" else RW - 60, d.row * H + GY - 2)
		startTrans({door=d})
	elif ph == 40:
		var d = it[1]
		var bad = ""
		if ROOM.id != d.to:
			bad = "did not arrive (in %s)" % ROOM.id
		elif not pl.ground:
			bad = "not on ground at %d,%d" % [pl.x, pl.y]
		elif inSolid(pl.x, pl.y - 80) or inSolid(pl.x, pl.y - 10):
			bad = "inside a wall at %d,%d" % [pl.x, pl.y]
		elif pl.x < 60 or pl.x > RW - 60:
			bad = "outside room x=%d" % pl.x
		if bad != "":
			TEST.dwbad.append("%s %s%d -> %s: %s" % [it[0], d.side, d.row, d.to, bad])
		TEST.dwi += 1
		TEST.dwf = f + 1

# ---------- campaign bot: plays a whole game through every world ----------
func _cpLog(msg: String) -> void:
	print("CP f=%d a=%d room=%s %s" % [TEST.frame, TEST.cp.a, ROOM.id if ROOM else "-", msg])

func _cpFail(msg: String) -> void:
	TEST.cp.fails.append("%s: %s" % [ROOM.id if ROOM else "-", msg])
	_cpLog("FAIL " + msg)

func _cpPath(from: String, to: String) -> Array:
	var prev = {from: ""}
	var q = [from]
	while q.size():
		var id = q.pop_front()
		if id == to:
			break
		var nb = []
		for d in DB.ROOMS[id].doors:
			nb.append(d.to)
		if DB.ROOMS[id].lift != null:
			nb.append(DB.ROOMS[id].lift.to)
		for n in nb:
			if not prev.has(n):
				prev[n] = id
				q.append(n)
	if not prev.has(to):
		return []
	var out = [to]
	while out[0] != from:
		out.push_front(prev[out[0]])
	return out

func _cpFind(a: int, kind: String) -> String:
	for id in DB.AREAS[a]:
		if DB.ROOMS[id].kind == kind:
			return id
	return ""

## simple brawler: walk at the nearest target and claw it, staying away from the doors
func _cpFight(f: int) -> void:
	var tgt = null
	var bd := 1e9
	for e in allTargets():
		var d: float = absf(e.x - pl.x)
		if d < bd:
			bd = d
			tgt = e
	KP.clear()
	if tgt == null:
		return
	var dir: int = int(sgn(tgt.x - pl.x)) if bd > 100 else pl.face
	if pl.x < 260:
		dir = 1
	elif pl.x > RW - 260:
		dir = -1
	KP["left"] = dir < 0 and (bd > 120 or pl.x > RW - 260)
	KP["right"] = dir > 0 and (bd > 120 or pl.x < 260)
	if pl.face != dir and bd <= 120:
		KP["left" if dir < 0 else "right"] = true
	if f % 9 == 0:
		P["attack"] = 1
	if (tgt.y < pl.y - 220 and f % 18 == 0) or f % 53 == 0:
		P["jump"] = 1
	if hasAb("roar") and pl.en >= 50 and f % 40 == 0:
		P["special"] = 1
	if hasAb("dash") and f % 97 == 0:
		P["dash"] = 1

func _cpGo(id: String, how: Dictionary) -> void:
	plTeleport(how.x, how.y)
	pl.ground = true
	# a real player walks there, so the camera would already be on them (off-screen shots get culled)
	cam = clampf(pl.x - W * .4, 0, max(0.0, RW - W))
	camY = clampf(pl.y - H * .66, 0, max(0.0, RH - H))

func _campaign(f: int) -> void:
	var C: Dictionary = TEST.cp
	if C.done:
		return
	# without --god the bot can fall: count it, and take "Continue from save" on game over
	if pl != null and pl.dead and not C.get("wasDead", false):
		C.deaths[clampi(G.lv, 0, 5)] += 1
		_cpLog("fell (lives left %d)" % G.lives)
	C.wasDead = pl != null and pl.dead
	if G.state == "over":
		KP.clear()
		if cardOpen and f % 30 == 0:
			for c in card_box.get_children():
				if c is HFlowContainer and c.get_child_count() > 0:
					c.get_child(0).emit_signal("pressed")
					break
			C.sub = ""
			C.gameovers = C.get("gameovers", 0) + 1
		return
	if G.state == "card":
		KP.clear()
		if f % 20 == 0 and cardOpen:
			for c in card_box.get_children():
				if c is HFlowContainer and c.get_child_count() > 0:
					c.get_child(0).emit_signal("pressed")
					break
		if G.state == "card" and ROOM != null and ROOM.kind == "boss" and int(META.boss) == 1:
			_cpFinish(f)
		return
	if G.state != "play" or TRANS.on or pl == null:
		if TRANS.on:
			KP.clear()
		return
	if int(META.boss) == 1 or (ROOM.kind == "boss" and doneT > 0):
		C.bb = C.get("bb", 0) + 1
		if C.bb == 600:
			_cpFail("victory screen still not up %d frames after Malakar fell (doneT=%.2f lock=%s hitStop=%.2f paused=%s)" % [C.bb, doneT, str(lock), hitStop, str(G.paused)])
		return
	var a: int = ROOM.a
	if a != C.a:
		C.frames[C.a] = f - C.wf0
		_cpLog("WORLD %d done frames=%d dmg=%d hurts=%d" % [C.a, C.frames[C.a], C.dmg[C.a], C.hurts[C.a]])
		C.a = a
		C.wf0 = f
		C.goal = ""
		C.sub = ""
	C.t += 1
	# ----- sub-states that own the controls -----
	if C.sub == "fight":
		_cpFight(f)
		var A = ROOM.arena
		var done: bool = META.cleared.has(ROOM.id)
		if done or C.t > 4800:
			KP.clear()
			if not done:
				_cpFail("arena not cleared in time (wave %s, %d enemies left)" % [str(A.i) if A != null else "-", en.size()])
				META.cleared[ROOM.id] = 1
				lock = false
				ROOM.arena = null
				en = []
			else:
				_cpLog("arena cleared in %d frames" % C.t)
			C.sub = ""
		return
	if C.sub == "guard":
		_cpFight(f)
		if gDone(a) or C.t > 9000:
			KP.clear()
			if not gDone(a):
				_cpFail("guardian %d not beaten in time" % a)
				META.guards[str(a)] = 1
				boss = null
			else:
				_cpLog("guardian beaten in %d frames" % C.t)
			C.sub = "ability"
			C.t = 0
		return
	if C.sub == "ability":
		var sh = ROOM.shrine
		if C.t == 30:
			_cpGo(ROOM.id, {x=sh.x + 260.0, y=float(FY)})
		KP["left"] = C.t > 40 and pl.x > sh.x
		if hasAb(sh.ab):
			KP.clear()
			_cpLog("got ability " + sh.ab)
			C.sub = ""
		elif C.t > 400:
			KP.clear()
			_cpFail("could not take ability at the shrine")
			META.ab[sh.ab] = 1
			C.sub = ""
		return
	if C.sub == "gate":
		_cpGate(f, C)
		return
	if C.sub == "save":
		if C.t == 5:
			_cpGo(ROOM.id, {x=ROOM.station.x + 30, y=float(FY)})
		if META.save != null and META.save.room == ROOM.id:
			_cpLog("saved")
			if not C.has("savedW"):
				C.savedW = {}
			C.savedW[a] = 1
			C.sub = ""
		elif C.t > 200:
			_cpFail("save station did not save")
			if not C.has("savedW"):
				C.savedW = {}
			C.savedW[a] = 1
			C.sub = ""
		return
	if C.sub == "lift":
		if C.t == 5:
			_cpGo(ROOM.id, {x=ROOM.lift.x, y=float(FY)})
			ROOM.lift.armed = 1
		if C.t > 600:
			_cpFail("elevator did not start")
			startTrans({lift=ROOM.lift})
		return
	if C.sub == "hollow":
		var g: Dictionary = ROOM.gates[C.gi]
		var sd: int = 1 if g.x < RW / 2.0 else -1     # wall is by the west door: stand east of it, face west
		if C.t == 3:
			_cpGo(ROOM.id, {x=g.x + sd * 170.0, y=float(g.bot)})
			pl.face = -sd
		KP.clear()
		if C.t > 6 and C.t % 16 == 0:
			P["attack"] = 1
		if g.broken:
			_cpLog("hollow wall opened")
			C.sub = ""
		elif C.t > 300:
			_cpFail("could not open the hollow wall")
			breakGate(g, C.gi)
			C.sub = ""
		return
	if C.sub == "collect":
		_cpCollect(f, C)
		return
	if C.sub == "boss":
		_cpFight(f)
		if C.t > 15000:
			_cpFail("Malakar not beaten in time")
			META.boss = 1
			victory()
		return
	# ----- room jobs on arrival -----
	if ROOM.waves != null and not META.cleared.has(ROOM.id):
		_cpGo(ROOM.id, {x=RW / 2.0, y=float(FY)})
		C.sub = "fight"; C.t = 0
		return
	if ROOM.kind == "shrine" and not gDone(a):
		_cpGo(ROOM.id, {x=1200.0, y=float(FY)})
		if boss == null:
			guardianIntro(a)
		C.sub = "guard"; C.t = 0
		return
	if ROOM.kind == "shrine" and ROOM.shrine != null and ROOM.shrine.ab != null and not hasAb(ROOM.shrine.ab):
		C.sub = "ability"; C.t = 0
		return
	if ROOM.kind == "save" and not C.get("savedW", {}).has(a):
		C.sub = "save"; C.t = 0
		return
	if TEST.get("full", false) and _cpRoomWants(ROOM).size() and C.get("skipRoom", "") != ROOM.id:
		C.sub = "collect"; C.t = 0; C.ci = 0
		return
	if ROOM.kind == "boss" and not int(META.boss):
		if TEST.get("full", false) and _cpWanted(-1).size() and C.get("backtracks", 0) < 40:
			pass
		else:
			_cpGo(ROOM.id, {x=600.0, y=float(FY)})
			C.sub = "boss"; C.t = 0
			return
	# ----- choose the next goal for this world -----
	var goal: String
	if a < 5 and not hasAb(abilOf(a).id):
		goal = _cpFind(a, "shrine")
	elif not C.get("savedW", {}).has(a):
		goal = _cpNearest(a, "save")
	else:
		goal = _cpFind(a, "liftDown" if a < 5 else "boss")
		if TEST.get("full", false):
			# anything reachable now in this world or an earlier one (backtracking for items that needed a later power)
			var want = _cpWanted(-1).filter(func(id): return DB.ROOMS[id].a <= a)
			if want.size():
				goal = want[0]
				if goal != C.get("lastGoal", ""):
					_cpLog("heading for %s (%s)" % [goal, ",".join(_cpRoomWants(DB.ROOMS[goal]).map(func(q): return str(q.type))) ])
				C.lastGoal = goal
	if ROOM.id == goal:
		if ROOM.kind == "liftDown":
			C.sub = "lift"; C.t = 0
		return
	var path = _cpPath(ROOM.id, goal)
	if path.size() < 2:
		_cpFail("no route to " + goal)
		C.done = true
		_cpFinish(f)
		return
	var nxt: String = path[1]
	if ROOM.lift != null and ROOM.lift.to == nxt:
		C.sub = "lift"; C.t = 0
		C.backtracks = C.get("backtracks", 0) + 1
		return
	var door = null
	for d in ROOM.doors:
		if d.to == nxt:
			door = d
	if DB.ROOMS[nxt].kind == "secret":
		for i in ROOM.gates.size():
			if ROOM.gates[i].kind == "secret" and not ROOM.gates[i].broken:
				C.sub = "hollow"; C.t = 0; C.gi = i
				return
	# the ability gate stands between this door and where we came in
	for i in ROOM.gates.size():
		var g: Dictionary = ROOM.gates[i]
		if g.kind == "secret" or g.broken or C.get("ledgeDone", "") == ROOM.id:
			continue
		var doorX: float = 0.0 if door.side == "L" else float(RW)
		if (pl.x < g.x) != (doorX < g.x):
			C.sub = "gate"; C.t = 0; C.gi = i; C.gdir = 1 if doorX > g.x else -1
			_cpLog("gate %s in the way" % g.kind)
			return
	# flat rooms: walk there like a player (fighting on the way, crossing hazards); climbing shafts: hop to the door
	if ROOM.h == 1 and door.row == 0 and TEST.get("walk", true):
		if C.get("walkRoom", "") != ROOM.id + door.to:
			C.walkRoom = ROOM.id + door.to
			C.wt = 0
			C.stuck = 0
		C.wt += 1
		var dir = -1 if door.side == "L" else 1
		KP.clear()
		KP["left" if dir < 0 else "right"] = true
		if f % 9 == 0:
			P["attack"] = 1
		if absf(pl.vx) < 40 and pl.ground:
			C.stuck += 1
		else:
			C.stuck = 0
		if C.stuck > 12:
			P["jump"] = 1
			C.stuck = 0
		if C.wt > 1500:
			_cpLog("walk to %s timed out at x=%d" % [door.to, pl.x])
			KP.clear()
			plTeleport(60.0 if door.side == "L" else RW - 60.0, door.row * H + GY - 2)
			startTrans({door=door})
		return
	if C.t % 2 == 0:
		plTeleport(60.0 if door.side == "L" else RW - 60.0, door.row * H + GY - 2)
		startTrans({door=door})

const CP_NEED := {crack="dash", laser="roar", slam="slam", plasma="plasma", high="double"}

## collectibles still in a room that the dino can get with the powers it has
func _cpRoomWants(o: Dictionary) -> Array:
	var out = []
	for it in o.items:
		if it.id == null:
			continue
		var got: bool = META.tanks.has(it.id) if it.type == "tank" else META.items.has(it.id)
		if got:
			continue
		var need = ""
		if int(it.cage) >= 0:
			need = CP_NEED[o.cages[int(it.cage)].kind]
		elif it.type == "tank" and it.y < GY - 300:
			need = "double"
		if need != "" and not hasAb(need):
			continue
		out.append(it)
	if o.kind == "shrine" and o.a < 5 and gDone(o.a) and not META.items.has("core" + str(o.a)):
		out.append({type="core", id="core" + str(o.a), x=W * .33, y=FY - 130, cage=-1})
	if o.kind == "trial" and not META.cleared.has(o.id) and o.id != ROOM.id:
		out.append({type="trial", id=o.id, x=0.0, y=0.0, cage=-1})
	return out

## rooms of world a (or every world when a < 0) that still hold something we can collect now
func _cpWanted(a: int) -> Array:
	var out = []
	var best = []
	for b in range(6):
		if a >= 0 and b != a:
			continue
		for id in DB.AREAS[b]:
			if _cpRoomWants(DB.ROOMS[id]).size():
				var p = _cpPath(ROOM.id, id)
				if p.size():
					best.append([p.size(), id])
	best.sort()
	for q in best:
		out.append(q[1])
	return out

func _cpCollect(f: int, C: Dictionary) -> void:
	var wants = _cpRoomWants(ROOM)
	if wants.is_empty():
		KP.clear()
		_cpLog("room collected")
		C.sub = ""
		return
	var it = wants[0].duplicate()
	for k in picks:
		if k.id == it.id:
			it.x = k.x; it.y = k.y   # the live pickup (a guardian's core drops where it fell)
	var t: int = C.t % 100
	KP.clear()
	var cage = ROOM.cages[int(it.cage)] if int(it.cage) >= 0 else null
	if cage != null and not cage.broken:
		match cage.kind:
			"crack":
				if t == 5:
					_cpGo(ROOM.id, {x=cage.x - 420.0, y=float(FY)}); pl.face = 1
				if t > 8:
					KP["right"] = true
				if t == 14:
					P["dash"] = 1
			"laser":
				if t == 5:
					_cpGo(ROOM.id, {x=cage.x - 380.0, y=float(FY)}); pl.face = 1
					pl.en = 100.0
				if t == 12:
					P["special"] = 1
			"slam":
				if t == 5:
					_cpGo(ROOM.id, {x=float(cage.x) - 60, y=float(FY)})
				if t == 10:
					P["jump"] = 1
				if t >= 24 and t <= 40:
					KP["down"] = true
				if t == 26:
					P["attack"] = 1
			"plasma":
				if t == 5:
					_cpGo(ROOM.id, {x=cage.x - 110.0, y=float(FY)}); pl.face = 1
				if t > 8 and t % 14 == 0:
					P["attack"] = 1
	elif it.type == "tank" and it.y < GY - 300:
		# the high ledge: run, jump, double jump, land on it
		if t == 5:
			_cpGo(ROOM.id, {x=it.x - 240.0, y=float(FY)}); pl.face = 1
		if t > 8 and pl.x < it.x - 10:
			KP["right"] = true
		if t == 9:
			P["jump"] = 1
		if t == 26:
			P["jump"] = 1
	elif it.type == "egg":
		if t == 5:
			_cpGo(ROOM.id, {x=float(it.x), y=float(FY) - 380})
	else:
		if t == 5:
			_cpGo(ROOM.id, {x=float(it.x) - 160, y=float(FY)}); pl.face = 1
		if t > 6 and pl.x < it.x:
			KP["right"] = true
		if it.y < FY - 200 and t == 12:
			P["jump"] = 1
	if C.t > 420:
		KP.clear()
		_cpFail("could not collect %s %s" % [it.type, str(it.id)])
		C.skipRoom = ROOM.id
		if it.type == "tank":
			META.tanks[it.id] = 1
		else:
			META.items[it.id] = 1
		C.sub = ""
	elif t == 99:
		C.t += 0

func _cpNearest(a: int, kind: String) -> String:
	var best = ""
	var bl = 999
	for id in DB.AREAS[a]:
		if DB.ROOMS[id].kind == kind:
			var p = _cpPath(ROOM.id, id)
			if p.size() and p.size() < bl:
				bl = p.size()
				best = id
	return best

## use this world's power on its gate, the way a player would
func _cpGate(f: int, C: Dictionary) -> void:
	var g: Dictionary = ROOM.gates[C.gi]
	var dir: int = C.gdir
	var t: int = C.t % 80      # each attempt takes 80 frames; a hit or a cooldown just means try again
	KP.clear()
	if t == 0:
		en = en.filter(func(e): return absf(e.x - g.x) > 900)   # a player would clear nearby robots first
	match g.kind:
		"crack":
			if t == 5:
				_cpGo(ROOM.id, {x=g.x - dir * 420.0, y=float(FY)}); pl.face = dir
			if t > 8:
				KP["right" if dir > 0 else "left"] = true
			if t == 14:
				P["dash"] = 1
			if t >= 12 and t <= 30 and t % 3 == 0 and TEST.get("dbg", false):
				_cpLog("crack dbg t=%d x=%d vx=%d dashT=%.2f ground=%s hurt=%.2f gx=%d" % [t, pl.x, pl.vx, pl.dashT, str(pl.ground), pl.hurtT, g.x])
		"laser":
			if t == 5:
				_cpGo(ROOM.id, {x=g.x - dir * 380.0, y=float(FY)}); pl.face = dir
				pl.en = 100.0
			if t == 12:
				P["special"] = 1
			if t == 13 or t == 20:
				var ws = shots.filter(func(q): return q.friend and q.wave)
				_cpLog("laser dbg en=%d hurtT=%.2f face=%d x=%d gx=%d waves=%s" % [pl.en, pl.hurtT, pl.face, pl.x, g.x, str(ws.map(func(q): return int(q.x)))])
		"blast":
			if t == 5:
				_cpGo(ROOM.id, {x=float(g.plate), y=float(FY)})
			if t == 10:
				P["jump"] = 1
			if t >= 24 and t <= 40:
				KP["down"] = true
			if t == 26:
				P["attack"] = 1
		"crystal":
			if t == 5:
				_cpGo(ROOM.id, {x=g.x - dir * 110.0, y=float(FY)}); pl.face = dir
			if t > 8 and t % 14 == 0:
				P["attack"] = 1
		"ledge":
			if t == 5:
				_cpGo(ROOM.id, {x=g.x - dir * 330.0, y=float(FY)}); pl.face = dir
			if t > 8:
				KP["right" if dir > 0 else "left"] = true
			if t == 12:
				P["jump"] = 1
			if t == 32:
				P["jump"] = 1
	var through: bool = g.broken or (g.kind == "ledge" and (pl.x - g.x) * dir > g.w)
	if through:
		KP.clear()
		_cpLog("gate %s opened in %d frames" % [g.kind, t])
		if g.kind == "ledge":
			C.ledgeDone = ROOM.id
		C.sub = ""
	elif C.t > 240:
		KP.clear()
		_cpFail("could not get past the %s gate in 3 tries" % g.kind)
		if g.kind == "ledge":
			C.ledgeDone = ROOM.id
		else:
			breakGate(g, C.gi)
		C.sub = ""

func _cpFinish(f: int) -> void:
	var C: Dictionary = TEST.cp
	if C.get("ended", false):
		return
	C.ended = true
	C.done = true
	C.frames[C.a] = f - C.wf0
	print("CAMPAIGN END seed=%d boss=%d frames=%d fails=%d" % [DB.WORLD_SEED, int(META.boss), f, C.fails.size()])
	for a in 6:
		print("  world %d frames=%d dmg=%d hurts=%d falls=%d" % [a, C.frames[a], C.dmg[a], C.hurts[a], C.deaths[a]])
	print("  gameovers=%d completion=%d%% tanks=%d eggs=%d cores=%d fangs=%d lore=%d" % [C.get("gameovers", 0), completion(), tankCount(), eggCount(), coreCount(), fangCount(), loreCount()])
	for x in C.fails:
		print("  FAIL ", x)
	TEST.quit = f + 2

func _test_tick(dt: float) -> void:
	TEST.frame += 1
	var f: int = TEST.frame
	if f % 300 == 0 and lock and TEST.get("diag", true):
		var L = []
		for e in en:
			L.append("%s@%d,%d%s" % [e.type, e.x, e.y, "" if e.body == null else "b"])
		print("LOCK f=", f, " room=", ROOM.id, " wave=", ROOM.arena.i if ROOM.arena != null else -1, " cam=", int(cam), " pl=", int(pl.x), " en=", L, " q=", spawnQ.size())
	if TEST.get("pausef", 0) == f:
		togglePause()
	if TEST.get("travelf", 0) == f:
		G.paused = true
		travelCard()
	if TEST.get("travelf", 0) > 0 and f == TEST.travelf + 20:
		travelWorld(3, true)
	if TEST.has("travelto") and f == 200:
		G.paused = false
		hideCard()
		startTrans({travel=TEST.travelto})
	if TEST.has("travelto") and f == 320:
		print("TRAVEL room=", ROOM.id, " kind=", ROOM.kind, " pl=", int(pl.x), ",", int(pl.y), " ground=", pl.ground, " save=", META.save.room)
	if TEST.get("rush", false) and f == 40:
		startRush()
	if TEST.has("showcard") and f == 40:
		match TEST.showcard:
			"map": mapCard(false, toTitle)
			"mode": modeCard(toTitle)
			"new": showCard({ey="Aetherfall 4.8", h="What's new", b=WHATS_NEW, btns=[["Got it", toTitle]]})
			"code": codeCard(false, toTitle, "That code doesn't look right. Codes use letters and numbers only.")
			"pause": togglePause()
			"title": toTitle()
			"codex":
				PREFS.codex = {g=1, r=1, b=1, h=1, oc=1, G0=1, G1=1}
				codexCard()
			"settings":
				touchy = true
				PREFS.timer = true
				soundCard(toTitle)
			"dailytest":
				PREFS.daily = {last=_dayKey(-1), streak=3, best=3}
				dailyWin(); print("DAILY ", PREFS.daily)
				dailyWin(); print("DAILY ", PREFS.daily)
				PREFS.daily = {last=_dayKey(-3), streak=4, best=4}
				dailyWin(); print("DAILY ", PREFS.daily)
				PREFS.erase("daily")
				dailyWin(); print("DAILY ", PREFS.daily)
			"mapcard":
				PREFS.daily = {last=_dayKey(-1), streak=3, best=5}
				mapCard(false, toTitle)
			"stats":
				PREFS.stats = {games=7, wins=2, time=31234.0, falls=19, kills=1543, guards=14, dust=5120}
				PREFS.records = {"7KQ2M3-shuffle": 4100.0, "classic": 5400.0, "AB12CD-rift": 6000.0}
				statsCard()
			"feats":
				PREFS.feats = {first=1, trial=1}
				PREFS.ocK = 11
				featsCard()
				feat("nohit")
	if TEST.get("noen", false):
		en = []; spawnQ = []; shots = shots.filter(func(q): return q.friend)
	if TEST.get("hzdbg", false) and f % 30 == 0 and ROOM != null:
		print("HZ f=%d %s" % [f, str(ROOM.get("dhz", []).map(func(h): return [h.k, int(h.x), h.st, snappedf(hzPhase(h, 4.6 if h.k == "tox" else 5.0 if h.k == "void" else 4.0), .1)]))])
	if TEST.get("armlift", false) and f == 30 and ROOM != null and ROOM.lift != null:
		ROOM.lift.armed = 1
	if TEST.get("liftf", 0) == f and ROOM != null and ROOM.lift != null:
		print("LIFT from ", ROOM.id, " to ", ROOM.lift.to)
		startTrans({lift=ROOM.lift})
	if TEST.get("liftf", 0) > 0 and f == TEST.liftf + 120:
		print("AFTER LIFT room=", ROOM.id, " state=", G.state, " pl=", int(pl.x), ",", int(pl.y), " th=", curTh())
	if TEST.has("cp") and pl != null and G.lv >= 0 and G.lv < 6:
		var lost: float = (pl.max - pl.hp) if TEST.get("god", false) else (TEST.cp.get("lastHp", pl.hp) - pl.hp)
		if lost > 0.5 and not pl.dead:
			TEST.cp.dmg[G.lv] += lost
			TEST.cp.hurts[G.lv] += 1
		TEST.cp.lastHp = pl.hp
	if TEST.get("god", false) and pl != null:
		pl.hp = float(pl.max)
	if TEST.has("rooms") and f % 45 == 0 and G.state == "play":
		TEST.ri += 1
		if TEST.ri < TEST.rooms.size():
			enterRoom(TEST.rooms[TEST.ri], {x=300.0, y=GY})
		else:
			TEST.quit = f
	if TEST.has("dw"):
		_doorWalk(f)
	if TEST.get("dbg", false) and bossDone and f % 60 == 0:
		print("BOSSDBG f=%d doneT=%.2f lock=%s hitStop=%.2f trans=%s state=%s en=%d spawnQ=%d boss=%s" % [f, doneT, str(lock), hitStop, str(TRANS.on), G.state, en.size(), spawnQ.size(), str(boss != null and boss.dead)])
	if TEST.has("cp"):
		_campaign(f)
	if TEST.get("sc", false):
		if f == 30:
			var sid = ""
			for id in DB.AREAS[2]:
				if DB.ROOMS[id].kind == "save":
					sid = id
			TEST.sc_seed = DB.WORLD_SEED
			TEST.sc_room = sid
			enterRoom(sid, {x=300.0, y=GY})
			useStation(ROOM.station)
			print("SAVECYCLE saved seed=", META.seed, " room=", sid, " zone=", ROOM.zn)
		elif f == 60:
			toTitle()
		elif f == 90:
			load_meta()
			print("SAVECYCLE loaded seed=", META.get("seed"), " save=", META.save, " type=", typeof(META.seed))
			continueGame()
		elif f == 120:
			var ok = DB.WORLD_SEED == TEST.sc_seed and ROOM.id == TEST.sc_room and ROOM.has("th")
			print("SAVECYCLE continue seed=", DB.WORLD_SEED, " room=", ROOM.id, " zone=", ROOM.get("zn", ""), " ok=", ok)
			TEST.quit = f + 1
	if TEST.get("memlog", false):
		TEST.pt = TEST.get("pt", 0.0) + Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0
		TEST.ptn = TEST.get("ptn", 0) + 1
		TEST.ptmax = max(TEST.get("ptmax", 0.0), Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0)
		if f % 1500 == 0:
			print("PERF f=%d avg=%.2fms max=%.2fms nodes=%d" % [f, TEST.pt / TEST.ptn, TEST.ptmax, Performance.get_monitor(Performance.OBJECT_NODE_COUNT)])
			TEST.pt = 0.0; TEST.ptn = 0; TEST.ptmax = 0.0
	if TEST.get("memlog", false) and f % 600 == 0 and false:
		print("MEM f=%d room=%s th=%s tex=%.0fMB static=%.0fMB fps=%d nodes=%d cache=%d" % [f, ROOM.id if ROOM else "-", curTh(),
			Performance.get_monitor(Performance.RENDER_TEXTURE_MEM_USED) / 1048576.0, Performance.get_monitor(Performance.MEMORY_STATIC) / 1048576.0,
			Performance.get_monitor(Performance.TIME_FPS), Performance.get_monitor(Performance.OBJECT_NODE_COUNT), DB._tex.size()])
	if TEST.bot != "" and G.state == "play" and pl != null:
		_bot(f)
	if G.state == "card" and TEST.bot != "" and f % 30 == 0 and cardOpen:
		# press the first button of any story card
		for c in card_box.get_children():
			if c is HFlowContainer and c.get_child_count() > 0:
				c.get_child(0).emit_signal("pressed")
				break
	for s in TEST.shots:
		if s[0] == f:
			var img := get_viewport().get_texture().get_image()
			img.save_png(s[1])
			print("shot ", s[1], " state=", G.state, " room=", ROOM.id if ROOM else "-", " hp=", pl.hp if pl else -1, " en=", en.size(), " boss=", boss != null)
	if TEST.quit > 0 and f >= TEST.quit:
		print("TEST END seed=", DB.WORLD_SEED, " net=", NETR, " p2=", [int(pl2.x), int(pl2.y), pl2.ch, pl2.hp] if pl2 != null else null, " me=", [int(pl.x), int(pl.y), pl.ch] if pl != null else null, " frame=", f, " state=", G.state, " room=", ROOM.id if ROOM else "-", " hp=", pl.hp if pl else -1, " score=", G.score, " dust=", META.dust, " lives=", G.lives, " map=", META.map.size(), " guards=", META.guards.keys(), " ab=", META.ab.keys(), " cleared=", META.cleared.keys())
		get_tree().quit()

func _bot(f: int) -> void:
	var b: String = TEST.bot
	var tgt = null
	var bd := 1e9
	for e in allTargets():
		var d: float = absf(e.x - pl.x)
		if d < bd:
			bd = d
			tgt = e
	var dir := 1
	if b == "fight" and tgt != null:
		dir = int(sgn(tgt.x - pl.x)) if bd > 120 else pl.face
		KP["left"] = dir < 0 and bd > 140
		KP["right"] = dir > 0 and bd > 140
		if f % 9 == 0:
			P["attack"] = 1
		if f % 47 == 0 or (tgt.y < pl.y - 200 and f % 20 == 0):
			P["jump"] = 1
		if f % 61 == 0:
			P["special"] = 1
			P["dash"] = 1
	else:
		KP["right"] = true
		KP["left"] = false
		if f % 9 == 0:
			P["attack"] = 1
		if f % 50 == 0:
			P["jump"] = 1
