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
func _process(delta: float) -> void:
	var dt: float = min(.033, max(0.0, delta))
	var nw = _calcW()
	if nw != W:
		W = nw
	pollInput()
	if G.state == "play" and not G.paused:
		gameUpdate(dt)
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
	updShots(dt); updHz(dt); updPicks(dt); updBoxes(dt); updAtmos(dt); updWorld(dt); updNPC(dt); updAlly(dt)
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
	META = fresh_meta()
	if hard:
		META.hard = 1
	# every new game rolls its own world layout
	META.seed = randi_range(1, 2000000000)
	DB.set_world(int(META.seed))
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
	DB.set_world(int(META.get("seed", 0)))
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
	enterRoom(str(a) + "-6", {x=300.0, y=GY})
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
	var tot: int = max(1, DB.rooms_of(int(META.get("seed", 0))).size())
	var b = ""
	if sv != null:
		b += "Save: %s%s · Map %d%% · Items %d%%\n" % [DB.LV[clampi(int(String(sv.room).get_slice("-", 0)), 0, 5)].name, " · [color=#ff4a6a][b]Rift Mode[/b][/color]" if META.hard else "", round(found * 100.0 / tot), completion()]
	if G.best:
		b += "Best score %s" % _fmt(G.best)
	var btns = []
	if sv != null:
		btns.append(["Continue", func(): continueGame()])
	btns.append(["New game" if sv != null else "Begin the Saga", confirmNew if sv != null else startNew, sv != null])
	if riftOpen:
		btns.append(["Boss Rush", startRush, true])
	btns.append(["Co-op", coopCard, true])
	btns.append(["Controls", func(): controls(toTitle), true])
	btns.append(["Settings", func(): soundCard(toTitle), true])
	showCard({ey="A Starblood Saga · Six Worlds", h="Aetherfall", big=true, tag="One small dino. One stolen sky. One very big Rift.", b=b, btns=btns})

func _fmt(n: int) -> String:
	var s = str(n)
	var out = ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return s + out

func startNew() -> void:
	if riftOpen:
		modeCard(toTitle)
	else:
		beginSaga(false)

func confirmNew() -> void:
	showCard({ey="New game", h="Start over?", b="This erases your map, abilities and energy tanks.", btns=[["Start over", startNew], ["Back", toTitle, true]]})

func modeCard(back: Callable) -> void:
	showCard({ey="New game", h="Choose your path", b="[b]Normal[/b] · the saga as it was meant to be told.\n\n[color=#ff4a6a][b]Rift Mode[/b][/color] · the Rift remembers you. Robots hit 45% harder and take more punishment, and the guardians and Malakar are far tougher.",
		btns=[["Normal", func(): beginSaga(false)], ["Rift Mode", func(): beginSaga(true)], ["Back", back, true]]})

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
	save_prefs()
	Sfx.music("victory")
	var found: int = META.map.size()
	var tot: int = DB.ROOMS.size()
	story(DB.T.STORY.ending, 0, func():
		var b = "Final score [b]%s[/b]\n\nItems collected [b]%d%%[/b] · Map explored %d%%\n\nEnergy tanks %d/12 · Eggs %d/6 · Aether cores %d/5 · Guardians %d/5\n\n" % [_fmt(G.score), completion(), round(found * 100.0 / tot), tankCount(), eggCount(), coreCount(), guardCount()]
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
	var canTravel: bool = ROOM != null and ROOM.kind == "save" and not lock and saveRooms().size() > 1
	var btns = [["Resume", resume]]
	if canTravel:
		btns.append(["Fast travel", travelCard])
	if ROOM != null and ROOM.kind == "save" and G.rush == null:
		btns.append(["Claude's Exchange", func(): exchangeCard(pauseCard)])
	if loreCount() or META.sable:
		btns.append(["Archive", archiveCard, true])
	btns.append(["Settings", func(): soundCard(pauseCard), true])
	btns.append(["Controls", func(): controls(pauseCard), true])
	btns.append(["Quit to title", toTitle, true])
	var mp = MapView.new()
	mp.g = self
	mp.custom_minimum_size = Vector2(min(780.0, W * .34), 380)
	showCard({ey=DB.LV[G.lv].ch + " · " + String(ROOM.get("zn", DB.LV[G.lv].name) if ROOM != null else DB.LV[G.lv].name) + (" · Rift Mode" if META.hard else ""), h="Paused", left=mp, fs=27,
		b="[color=#9d97bd]Map %d/%d rooms · Items %d%%[/color]\n" % [META.map.size(), DB.ROOMS.size(), completion()] + abilitiesBB(), btns=btns})

class MapView extends Control:
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
		var cs: float = min((cw - 80) / mw, (ch - 90) / mh)
		var ox: float = (cw - mw * cs) / 2.0
		var oy = 60.0
		for i in mw + 1:
			draw_line(Vector2(ox + i * cs, oy), Vector2(ox + i * cs, oy + mh * cs), Color(120 / 255.0, 200 / 255.0, 1, .1))
		for i in mh + 1:
			draw_line(Vector2(ox, oy + i * cs), Vector2(ox + mw * cs, oy + i * cs), Color(120 / 255.0, 200 / 255.0, 1, .1))
		var M: Dictionary = g.META
		var f: Font = DB.font_u
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
	showCard({ey="Starblood archive", h="Data Tablets", tag="%d of 6 recovered" % got, b=b, btns=[["Back", pauseCard]]})

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
func soundCard(back: Callable) -> void:
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 18)
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
	var vb = HBoxContainer.new()
	var vl = Label.new()
	vl.text = "Vibration"
	vl.custom_minimum_size = Vector2(220, 0)
	vl.add_theme_color_override("font_color", C("#5ce1ff"))
	vb.add_child(vl)
	var on: bool = PREFS.get("vibe", true)
	var vbtn = _btn("On" if on else "Off", not on)
	vbtn.pressed.connect(func():
		PREFS.vibe = not PREFS.get("vibe", true)
		save_prefs()
		soundCard(back))
	vb.add_child(vbtn)
	box.add_child(vb)
	showCard({ey="Settings", h="Sound & graphics", extra=box,
		b="Fast draws fewer particles and less weather, for a steadier frame rate on older phones.\n\n[i]Music by Tanner Helland (github.com/tannerhelland/free-music, CC BY 4.0). Sound effects by Kenney (kenney.nl, CC0) and synthesised for Aetherfall. Fonts: Cinzel and Chakra Petch (SIL Open Font License). Made with Godot Engine.[/i]",
		btns=[["Done", back]]})

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
func rushBest() -> float:
	return float(PREFS.get("rush", 0.0))

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
	G.rush = {i=0, t=0.0, next=0.0}
	G.score = 0
	G.lives = 3
	startGame(DB.RUSH[0], {x=W * .72, y=GY})
	showBanner("Boss Rush", "Fight 1 of 6", 2)

func rushEnd() -> void:
	if G.rush != null and realMeta != null:
		META = realMeta
		realMeta = null
	G.rush = null

func rushDone() -> void:
	var t: float = G.rush.t
	var best = rushBest()
	var nb = best == 0 or t < best
	if nb:
		PREFS.rush = t
		save_prefs()
	rushEnd()
	G.state = "card"
	padShow(false)
	clearInput()
	Sfx.music("victory")
	showCard({ey="Boss Rush complete", h=fmtT(t), b=("[color=#ffd27a][b]New best time![/b][/color]" if nb else "Best time " + fmtT(best)) + "\n\nEvery guardian and the Void Sovereign, back to back. The Starblood would be proud.",
		btns=[["Again", startRush], ["Title", toTitle, true]]})

func rushFail() -> void:
	var Rr: Dictionary = G.rush
	rushEnd()
	later(.9, func(): showCard({ey="Boss Rush", h="Tyko is down", b="You reached fight %d of 6 in %s." % [Rr.i + 1, fmtT(Rr.t)], btns=[["Try again", startRush], ["Title", toTitle, true]]}))

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
	if hasBody:
		card_box.add_child(scroll)
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
		_fit_scroll.call_deferred(scroll, inner, maxBody)
	cardOpen = true
	card_root.visible = true
	if first != null and not touchy:
		first.grab_focus.call_deferred()

func _fit_scroll(scroll: ScrollContainer, inner: Control, maxBody: float) -> void:
	if not is_instance_valid(scroll):
		return
	var h: float = inner.get_combined_minimum_size().y
	scroll.custom_minimum_size.y = min(h, max(160.0, maxBody))

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
	for k in ["name", "hp", "ae", "ch", "rift", "score", "scl", "dust", "combo", "combo2", "combo3", "bossN", "hint", "seal", "bn", "bs", "p2n"]:
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
		_tx(HU.rift, "◆ BOSS RUSH  " + fmtT(G.rush.t))
		HU.rift.visible = true
	else:
		_tx(HU.rift, "◆ RIFT MODE")
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
			"gendump":
				var parts2 := v.split("@")
				DB.set_world(int(parts2[0]))
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
	if TEST.get("armlift", false) and f == 30 and ROOM != null and ROOM.lift != null:
		ROOM.lift.armed = 1
	if TEST.get("liftf", 0) == f and ROOM != null and ROOM.lift != null:
		print("LIFT from ", ROOM.id, " to ", ROOM.lift.to)
		startTrans({lift=ROOM.lift})
	if TEST.get("liftf", 0) > 0 and f == TEST.liftf + 120:
		print("AFTER LIFT room=", ROOM.id, " state=", G.state, " pl=", int(pl.x), ",", int(pl.y), " th=", curTh())
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
	if TEST.get("memlog", false) and f % 600 == 0:
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
