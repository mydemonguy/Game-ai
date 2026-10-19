extends "res://scripts/g4_main.gd"
## layer 5: same-Wi-Fi co-op. One phone hosts and runs the world (Tyko); the other joins as Zeph or Rook.
## The joining phone drives its own dino locally and sends its position and hits; the host sends back
## everything else 30 times a second. Hosts announce themselves on the local network so joiners can find them.

const PORT := 47890
const DPORT := 47891
const SNAP_HZ := 30.0
var peer: ENetMultiplayerPeer = null
var NET = {isHost=false, peer=0, sendT=0.0, beaconT=0.0, lobby="", found={}, hostCh="tyko", joinCh="zeph", hostName="", sp=null, metaT=0.0,
	snap=null, lastRoom="", ip="", status="", pz=false, waitCard=false}
var beacon: PacketPeerUDP = null
var listener: PacketPeerUDP = null
var savedMeta = null

func _ready() -> void:
	NET.joinCh = "zeph"
	super._ready()
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected)
	multiplayer.connection_failed.connect(_on_conn_failed)
	multiplayer.server_disconnected.connect(_on_server_gone)
	if not TEST.on:
		NET.joinCh = String(PREFS.get("coopChar", "zeph"))

func coop() -> bool:
	return NETR != "" and pl2 != null

# ---------- lobby cards ----------
func coopCard() -> void:
	if OS.has_feature("web"):
		showCard({ey="Two phones · same Wi-Fi", h="Co-op", b="Co-op runs between two Android phones on the same Wi-Fi, so it isn't available in the browser version.\n\nGet the Android app from the Aetherfall page to play with a friend as Zeph or Rook.", btns=[["Back", toTitle]]})
		return
	showCard({ey="Two phones · same Wi-Fi", h="Co-op", b="One phone [b]hosts[/b] and plays as Tyko, on its own save. The other phone [b]joins[/b] as one of Tyko's new friends, Zeph or Rook.\n\nBoth phones need to be on the same Wi-Fi network (or one phone's hotspot).",
		btns=[["Host a game", hostStart], ["Join a game", charCard], ["Back", toTitle, true]]})

func charCard() -> void:
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 30)
	for id in ["zeph", "rook"]:
		var C0: Dictionary = DB.CHARS[id]
		var col = VBoxContainer.new()
		col.custom_minimum_size = Vector2(min(720.0, (W - 420) / 2.0), 0)
		col.add_theme_constant_override("separation", 10)
		var tr = TextureRect.new()
		var at = AtlasTexture.new()
		at.atlas = load(C0.tex)
		at.region = Rect2(0, 0, C0.fw, C0.fh)
		tr.texture = at
		tr.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		tr.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		tr.custom_minimum_size = Vector2(300, 200)
		col.add_child(tr)
		var t = RichTextLabel.new()
		t.bbcode_enabled = true
		t.fit_content = true
		t.scroll_active = false
		t.add_theme_font_size_override("normal_font_size", 26)
		t.add_theme_font_size_override("bold_font_size", 26)
		t.text = "[color=%s][b]%s · %s[/b][/color]\n%s" % [C0.col, C0.name.to_upper(), C0.title, C0.perk]
		col.add_child(t)
		var b = _btn("Play as " + C0.name, NET.joinCh != id)
		b.pressed.connect(func():
			NET.joinCh = id
			PREFS.coopChar = id
			save_prefs()
			joinCard())
		var br = HBoxContainer.new()
		br.add_theme_constant_override("separation", 14)
		br.add_child(b)
		var bio = _btn("Story", true)
		bio.pressed.connect(func(): bioCard(id))
		br.add_child(bio)
		col.add_child(br)
		row.add_child(col)
	showCard({ey="Join a game", h="Choose your dino", extra=row, btns=[["Back", coopCard, true]]})

func bioCard(id: String) -> void:
	var C0: Dictionary = DB.CHARS[id]
	var at = AtlasTexture.new()
	at.atlas = load(C0.tex)
	at.region = Rect2(0, 0, C0.fw, C0.fh)
	showCard({ey=C0.title, h=C0.name, b=C0.bio + "\n\n[color=%s][b]In battle[/b][/color]  %s" % [C0.col, C0.perk], portrait=at, btns=[["Back", charCard]]})

func joinCard() -> void:
	NET.lobby = "join"
	_listen()
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 14)
	var list = VBoxContainer.new()
	list.name = "Found"
	box.add_child(list)
	_fillFound(list)
	var row = HBoxContainer.new()
	row.add_theme_constant_override("separation", 14)
	var ip = LineEdit.new()
	ip.placeholder_text = "or type the host's address, e.g. 192.168.1.20"
	ip.text = String(PREFS.get("lastIp", ""))
	ip.custom_minimum_size = Vector2(760, 70)
	ip.add_theme_font_size_override("font_size", 30)
	row.add_child(ip)
	var go = _btn("Join")
	go.pressed.connect(func(): joinAt(ip.text.strip_edges()))
	row.add_child(go)
	box.add_child(row)
	var C0: Dictionary = DB.CHARS[NET.joinCh]
	showCard({ey="Join a game · as " + C0.name, h="Find a host", b="Looking for Aetherfall games on this Wi-Fi… On the host phone, open Co-op and tap Host a game." + ("\n\n[color=#ff8a8a]%s[/color]" % NET.status if NET.status != "" else ""),
		extra=box, btns=[["Change dino", charCard, true], ["Back", func():
			netLeave(false)
			coopCard(), true]]})

func _fillFound(list: VBoxContainer) -> void:
	for c in list.get_children():
		c.queue_free()
	var now = Time.get_ticks_msec() / 1000.0
	var any = false
	for ip in NET.found:
		var f: Dictionary = NET.found[ip]
		if now - f.t > 4.0:
			continue
		any = true
		var b = _btn("Join %s  ·  %s" % [f.name, ip])
		var addr: String = ip
		b.pressed.connect(func(): joinAt(addr))
		list.add_child(b)
	if not any:
		var l = Label.new()
		l.text = "No games found yet…"
		l.add_theme_color_override("font_color", C("#9d97bd"))
		list.add_child(l)

func hostStart() -> void:
	netLeave(false)
	peer = ENetMultiplayerPeer.new()
	var err = peer.create_server(PORT, 1)
	if err != OK:
		peer = null
		showCard({ey="Co-op", h="Can't host", b="This phone couldn't open a game on the network (error %d). Check that Wi-Fi is on and try again." % err, btns=[["Back", coopCard]]})
		return
	multiplayer.multiplayer_peer = peer
	NET.isHost = true
	beacon = PacketPeerUDP.new()
	beacon.set_broadcast_enabled(true)
	beacon.set_dest_address("255.255.255.255", DPORT)
	NET.lobby = "host"
	NET.peer = 0
	hostLobbyCard()

func _myIps() -> Array:
	var out = []
	for a in IP.get_local_addresses():
		if a.count(".") == 3 and not a.begins_with("127.") and not a.begins_with("169.254"):
			out.append(a)
	return out

func hostLobbyCard() -> void:
	var ips = ", ".join(_myIps())
	if NET.peer == 0:
		showCard({ey="Co-op · hosting", h="Waiting for a friend", b="On the other phone: Co-op → Join a game. This game should appear in its list.\n\nIf it doesn't, type this phone's address there: [b][color=#5ce1ff]%s[/color][/b]" % (ips if ips != "" else "(no Wi-Fi address found)"),
			btns=[["Cancel", func():
				netLeave(false)
				coopCard(), true]]})
	else:
		var C0: Dictionary = DB.CHARS[NET.joinCh]
		var btns = []
		if META.save != null:
			btns.append(["Continue together", func(): coopStart(false)])
		btns.append(["New game together" if META.save != null else "Begin together", func(): coopStart(true), META.save != null])
		btns.append(["Cancel", func():
			netLeave(false)
			coopCard(), true])
		showCard({ey="Co-op · hosting", h=C0.name + " has joined!", b="[color=%s][b]%s · %s[/b][/color]\n%s\n\nYou play as Tyko. Your save is used; the joining phone keeps its own." % [C0.col, C0.name.to_upper(), C0.title, C0.perk], btns=btns})

# ---------- starting and leaving ----------
func coopStart(fresh: bool) -> void:
	NETR = "host"
	NET.lobby = ""
	beacon = null
	pl2 = newPlayer(NET.joinCh)
	pl2.remote = true
	if fresh:
		newRun()
	else:
		continueGame()
	netSend("start", [JSON.stringify(META), ROOM.id, pl2.x, pl2.y, NET.hostCh])
	_companionIntro()

func _companionIntro() -> void:
	var id: String = NET.joinCh
	var C0: Dictionary = DB.CHARS[id]
	var key = "c_" + id
	if META.talk.has(key):
		showBanner(C0.name + " joins the hunt", C0.title, 2.2)
		return
	META.talk[key] = 1
	save_meta()
	var lines: Array
	if id == "zeph":
		lines = [[["zeph", "\"There you are! Ha! Tiny, green, loud. I'd know that roar anywhere. I followed it all the way down the Skyreach cliffs.\""], ["lyra", "\"A wild raptor? Out here? Little one, I think you have a cousin.\""]],
			[["zeph", "\"Zeph. Scout. I count Hollowed patrols, steal their batteries and run. Mostly the running.\""], ["zeph", "\"You're going after Malakar? Then you need someone who knows every back door in Ithra. Keep up, little brother.\""], ["tyko", "\"Rawr!\""]]]
	else:
		lines = [[["rook", "\"Hm. Small. Green. Making a lot of noise near my crates.\" ... \"I like you.\""], ["lyra", "\"A triceratops? On a space dock? Where did you come from?\""]],
			[["rook", "\"Cargo bay seven. Hatched in a crate. The loader robots raised me, before they went red.\""], ["rook", "\"Maybe one of them is still in there, under the iron. I'll push through every Hollowed in Ithra to find out. Lead the way.\""], ["tyko", "\"Rawr!\""]]]
	scene({ey="A new friend", h=C0.name + ", " + C0.title, go="Let's go!", pages=lines}, func(): pass)

func netLeave(notify := true) -> void:
	if notify and peer != null:
		netSend("end" if NET.isHost else "bye", [])
	if peer != null:
		multiplayer.multiplayer_peer = null
		peer.close()
	peer = null
	beacon = null
	listener = null
	NET.lobby = ""
	NET.peer = 0
	NET.snap = null
	var wasClient = NETR == "client"
	NETR = ""
	pl2 = null
	if wasClient:
		load_meta()

func toTitle() -> void:
	if peer != null or NETR != "":
		netLeave(true)
	super.toTitle()

func joinAt(ip: String) -> void:
	if ip == "" or not ip.is_valid_ip_address():
		NET.status = "That doesn't look like an address. It should look like 192.168.1.20."
		joinCard()
		return
	PREFS.lastIp = ip
	save_prefs()
	listener = null
	if peer != null:
		multiplayer.multiplayer_peer = null
		peer.close()
	peer = ENetMultiplayerPeer.new()
	var err = peer.create_client(ip, PORT)
	if err != OK:
		peer = null
		NET.status = "Couldn't reach %s (error %d)." % [ip, err]
		joinCard()
		return
	multiplayer.multiplayer_peer = peer
	NET.isHost = false
	NET.lobby = "connecting"
	NET.status = ""
	showCard({ey="Co-op", h="Connecting…", b="Reaching %s" % ip, btns=[["Cancel", func():
		netLeave(false)
		joinCard(), true]]})

func _on_peer_connected(id: int) -> void:
	if NET.lobby == "host" and NET.peer == 0:
		NET.peer = id

func _on_peer_disconnected(id: int) -> void:
	if id != NET.peer:
		return
	NET.peer = 0
	if NETR == "host":
		var nm: String = DB.CHARS[pl2.ch].name if pl2 != null else "Your friend"
		NETR = ""
		pl2 = null
		if peer != null:
			multiplayer.multiplayer_peer = null
			peer.close()
			peer = null
		showBanner(nm + " left the game", "Playing on alone", 2.4)
	elif NET.lobby == "host":
		hostLobbyCard()

func _on_connected() -> void:
	NET.lobby = "waiting"
	netSend("hello", [NET.joinCh])
	var C0: Dictionary = DB.CHARS[NET.joinCh]
	showCard({ey="Co-op · joined as " + C0.name, h="Connected!", b="Waiting for the host to start the game…", btns=[["Leave", func():
		netLeave(true)
		coopCard(), true]]})

func _on_conn_failed() -> void:
	netLeave(false)
	NET.status = "Couldn't connect. Check both phones are on the same Wi-Fi and the host is waiting."
	joinCard()

func _on_server_gone() -> void:
	var was = NETR == "client"
	netLeave(false)
	if was or NET.lobby != "":
		G.state = "menu"
		toTitle()
		showCard({ey="Co-op", h="Connection lost", b="The host phone left the game or the Wi-Fi dropped.", btns=[["OK", toTitle]]})

# ---------- messages ----------
func netSend(k: String, a: Array) -> void:
	if peer == null or multiplayer.multiplayer_peer == null:
		return
	if multiplayer.is_server():
		if NET.peer != 0:
			r_ev.rpc_id(NET.peer, k, a)
	else:
		r_ev.rpc_id(1, k, a)

@rpc("any_peer", "call_remote", "reliable")
func r_ev(k: String, a: Array) -> void:
	if multiplayer.is_server():
		_hostEv(k, a)
	else:
		_clientEv(k, a)

func _target(id: int):
	for e in allTargets():
		if e.id == id:
			return e
	return null

func _hostEv(k: String, a: Array) -> void:
	match k:
		"hello":
			NET.joinCh = a[0] if DB.CHARS.has(a[0]) and a[0] != "tyko" else "zeph"
			NET.hello = true
			if NET.lobby == "host":
				hostLobbyCard()
		"bye":
			_on_peer_disconnected(NET.peer)
		"hit":
			if NETR != "host" or G.state != "play":
				return
			var e = _target(int(a[0]))
			if e != null and pl2 != null:
				withPl(pl2, func(): damage(e, float(a[1]), float(a[2])))
		"swing":
			if NETR == "host" and pl2 != null:
				var box = Rect2(a[0], a[1], a[2], a[3])
				withPl(pl2, func():
					clawGeo(box)
					hitBoxesWith(box, {}))
		"slam":
			if NETR == "host":
				slamAt(float(a[0]))
		"roar":
			if NETR == "host" and pl2 != null:
				withPl(pl2, func(): roarFx(pl2))
		"arm":
			if NETR == "host" and pl2 != null:
				withPl(pl2, func(): armFx(pl2, int(a[0])))

func _clientEv(k: String, a: Array) -> void:
	match k:
		"start":
			savedMeta = META
			var m = JSON.parse_string(a[0])
			META = fresh_meta()
			if typeof(m) == TYPE_DICTIONARY:
				for key in m:
					META[key] = m[key]
			# the host's world layout
			DB.set_world(int(META.get("seed", 0)), metaGV())
			NETR = "client"
			NET.hostCh = a[4]
			NET.lobby = ""
			pl = newPlayer(NET.joinCh)
			pl2 = newPlayer(NET.hostCh)
			pl2.remote = true
			G.state = "play"
			G.paused = false
			hideCard()
			lvT = 0.0
			NET.lastRoom = a[1]
			enterRoom(a[1], {x=float(a[2]), y=float(a[3])})
			pl.max = maxHP()
			pl.hp = float(pl.max)
			padShow(true)
			clearInput()
			showBanner(DB.LV[G.lv].ch, String(ROOM.get("zn", DB.LV[G.lv].name)), 2.4)
		"hurt":
			if pl != null:
				hurtPlayer(float(a[0]), float(a[1]))
		"pick":
			_pickStats(a[0])
		"card":
			if NETR == "client":
				var o: Dictionary = a[0]
				o.btns = []
				o.ey = String(o.get("ey", ""))
				o.b = String(o.get("b", "")) + "\n\n[color=#9d97bd][i]On Tyko's phone…[/i][/color]"
				super.showCard(o)
				NET.waitCard = true
		"hide":
			if NETR == "client" and NET.waitCard:
				NET.waitCard = false
				super.hideCard()
		"end":
			netLeave(false)
			G.state = "menu"
			super.toTitle()
			showCard({ey="Co-op", h="Game over for now", b="The host went back to the title screen.", btns=[["OK", toTitle]]})

## stat changes for a pickup the host says this phone's dino collected
func _pickStats(t: String) -> void:
	var p = pl
	if p == null:
		return
	sPick(t)
	buzz(12)
	match t:
		"fruit": p.hp = min(p.max, p.hp + 25)
		"med": p.hp = min(p.max, p.hp + 60)
		"shard": p.en = min(100.0, p.en + 35)
		"shield":
			p.shield = 3; p.shieldT = 14.0
		"fang": p.fury = 20.0 if hasR("fury") else 10.0
		"tank":
			p.max = maxHP() + 15
			p.hp = float(p.max)
		"core": p.en = 100.0
	if DB.PICK.has(t):
		ftext(p.x, p.y - 200, DB.PICK[t].txt, DB.PICK[t].col, t in ["egg", "tank", "core", "sfang"])

# cards shown on the host are mirrored, read-only, on the joining phone
func showCard(o: Dictionary) -> void:
	super.showCard(o)
	if NETR == "host" and NET.peer != 0:
		var m = {}
		for k in ["ey", "h", "b", "tag", "big"]:
			if o.has(k):
				m[k] = o[k]
		netSend("card", [m])

func hideCard() -> void:
	super.hideCard()
	if NETR == "host" and NET.peer != 0:
		netSend("hide", [])

func togglePause() -> void:
	if NETR != "client":
		super.togglePause()
		return
	if G.state != "play":
		return
	G.paused = not G.paused
	clearInput()
	if G.paused:
		padShow(false)
		super.showCard({ey="Co-op · " + DB.CHARS[pl.ch].name, h="Paused", b="The game keeps running on Tyko's phone while you're here.", btns=[["Resume", togglePause],
			["Settings", func(): soundCard(func():
				G.paused = false
				togglePause()), true],
			["Leave co-op", func():
				netLeave(true)
				G.paused = false
				toTitle(), true]]})
	else:
		super.hideCard()
		padShow(true)

func netRoomEntered(x: float, y: float, face: int) -> void:
	NET.sp = [ROOM.id, x, y, face]

# ---------- per frame ----------
func _process(delta: float) -> void:
	_netPoll(delta)
	if NETR == "client":
		_clientFrame(delta)
		return
	super._process(delta)
	if NETR == "host" and NET.peer != 0:
		NET.sendT -= delta
		if NET.sendT <= 0:
			NET.sendT = 1.0 / SNAP_HZ
			_sendSnap()

func _netPoll(delta: float) -> void:
	if beacon != null and NET.lobby == "host":
		NET.beaconT -= delta
		if NET.beaconT <= 0:
			NET.beaconT = 1.0
			beacon.put_packet(("AETHERFALL|%s|%d" % [OS.get_model_name() if OS.get_model_name() != "GenericDevice" else "Aetherfall", PORT]).to_utf8_buffer())
	if listener != null:
		var changed = false
		while listener.get_available_packet_count() > 0:
			var pk = listener.get_packet().get_string_from_utf8()
			var ip = listener.get_packet_ip()
			var parts = pk.split("|")
			if parts.size() >= 2 and parts[0] == "AETHERFALL":
				if not NET.found.has(ip):
					changed = true
				NET.found[ip] = {name=parts[1], t=Time.get_ticks_msec() / 1000.0}
		if changed and NET.lobby == "join" and cardOpen:
			var list = card_box.find_child("Found", true, false)
			if list != null:
				_fillFound(list)

func _listen() -> void:
	if listener != null:
		return
	listener = PacketPeerUDP.new()
	if listener.bind(DPORT) != OK:
		listener = null

# ---------- host: build the snapshot ----------
func _r(v: float) -> float:
	return round(v * 10.0) / 10.0

func _sendSnap() -> void:
	if ROOM == null:
		return
	var S = {}
	S.r = ROOM.id
	S.sp = NET.sp
	S.st = G.state
	S.pz = G.paused
	S.lv = G.lv
	S.lk = lock
	S.cam = _r(cam)
	S.camY = _r(camY)
	S.sc = G.score
	S.li = G.lives
	S.sh = _r(shake)
	S.tr = [TRANS.on, _r(TRANS.t * 100) / 100.0, TRANS.phase, transDur()]
	S.ar = ROOM.arena != null
	S.lift = ROOM.lift.hold if ROOM.lift != null else 0.0
	S.stn = ROOM.station.t if ROOM.station != null else 0.0
	var p = pl
	S.p1 = [_r(p.x), _r(p.y), _r(p.vx), _r(p.vy), p.face, p.ground, p.atk, p.combo, p.dashT, p.dead, p.deadT, p.inv, p.hp, p.max, p.en, p.shield, p.fury, p.landT, p.run, p.squash, p.aegis, p.slam, p.ch, p.sup]
	var E = []
	for e in en:
		E.append([e.id, e.type, _r(e.x), _r(e.y), e.face, e.state, e.t, e.hp, e.max, _r(e.vx), e.flash, e.fade, e.tp, e.la, e.n, e.seed, e.fly, e.w, e.h, e.heavy, e.get("oc", false), aegisUp(e)])
	S.en = E
	var b = boss
	if b != null and not b.dead:
		S.bo = [b.id, b.guard, b.name, _r(b.x), _r(b.y), b.face, b.state, b.get("fr", ""), b.t, b.flash, _r(b.vx), b.phase, b.seed, b.fadeT, b.guarding, b.weak, b.get("spin", 0.0), b.hp, b.max, b.w, b.h, b.get("dy", 0.0), b.get("hov", 0.0), b.get("mv", 0.0)]
	var SH = []
	for s in shots:
		SH.append([s.uid, _r(s.x), _r(s.y), _r(s.vx), _r(s.vy), s.r, s.col, s.wave, s.cres, s.life, s.friend])
	S.shots = SH
	var PK = []
	for k in picks:
		PK.append([k.uid, _r(k.x), _r(k.y), k.type, k.flt, k.life])
	S.pk = PK
	var BX = []
	for x in boxes:
		BX.append([x.id, x.x, x.hp, x.flash])
	S.bx = BX
	var HZ = []
	for h in hz:
		HZ.append([h.kind, _r(h.get("x", 0.0)), h.get("y", 0.0), h.t, h.act, h.get("w", 0.0), h.get("low", false), h.get("dir", 0)])
	S.hz = HZ
	S.ovl = OVL_LAST
	if ally != null:
		S.al = [ally.id, _r(ally.x), _r(ally.y), ally.oy, ally.face, ally.state, ally.lt, ally.line, ally.seed]
	if npc != null:
		S.np = [npc.id, npc.x, npc.y, npc.face, npc.near, npc.line]
	S.fx = FXQ
	FXQ = []
	NET.metaT -= 1.0 / SNAP_HZ
	if NET.metaT <= 0:
		NET.metaT = .5
		S.meta = {ab=META.ab, guards=META.guards, tanks=META.tanks, items=META.items, gates=META.gates, map=META.map, cleared=META.cleared, boss=META.boss,
			dust=META.dust, arm=META.arm, eq=META.eq, relics=META.relics, hard=META.hard, mapped=META.mapped, sable=META.sable, areas=META.areas}
	var raw = var_to_bytes(S)
	r_snap.rpc_id(NET.peer, raw.compress(FileAccess.COMPRESSION_DEFLATE), raw.size())

var OVL_LAST: Array = []

func actorsUpdate(dt: float) -> void:
	OVL_LAST = OVL.duplicate()
	super.actorsUpdate(dt)

## the joining phone reports where its dino is
@rpc("any_peer", "call_remote", "unreliable_ordered")
func r_state(a: Array) -> void:
	if not multiplayer.is_server() or pl2 == null:
		return
	var keys = ["x", "y", "vx", "vy", "face", "ground", "atk", "combo", "dashT", "dead", "deadT", "inv", "hp", "max", "en", "shield", "fury", "landT", "run", "squash", "aegis", "slam", "thr", "sup", "ch"]
	for i in min(keys.size(), a.size()):
		pl2[keys[i]] = a[i]
	if not DB.CHARS.has(pl2.ch):
		pl2.ch = "zeph"

@rpc("authority", "call_remote", "unreliable_ordered")
func r_snap(data: PackedByteArray, size: int) -> void:
	var raw = data.decompress(size, FileAccess.COMPRESSION_DEFLATE)
	var S = bytes_to_var(raw)
	if typeof(S) == TYPE_DICTIONARY:
		NET.snap = S
		# effects can't wait for the next frame's snapshot or they'd be lost when packets arrive together
		for f in S.get("fx", []):
			if NETR == "client" and ROOM != null and S.r == ROOM.id:
				callv(f[0], f.slice(1))

# ---------- client: mirror the host and drive our own dino ----------
func _clientFrame(delta: float) -> void:
	var dt: float = min(.033, max(0.0, delta))
	var nw = _calcW()
	if nw != W:
		W = nw
	pollInput()
	var S = NET.snap
	if S != null:
		NET.snap = null
		_applySnap(S)
	if ROOM == null or pl == null:
		render(dt)
		hudUpdate()
		P.clear()
		return
	if banner != null:
		banner.life -= dt
		if banner.life <= 0:
			banner = null
	lvT += dt
	flashT -= dt
	shake *= pow(.015, dt)
	if G.state == "play" and not G.paused and not TRANS.on:
		if hitStop > 0:
			hitStop -= dt
		else:
			if lock and PLUGS.is_empty():
				makePlugs()
			elif not lock and not PLUGS.is_empty():
				PLUGS = []
			updPlayerPre(dt)
			physStep(dt)
			updPlayerPost(dt)
			if pl.dead and G.respawnT > 0:
				G.respawnT -= dt
				pl.deadT += dt
				if G.respawnT <= 0:
					pl.dead = 0
					var tx: float = pl2.x if pl2 != null else pl.x
					plTeleport(clampf(tx - 100, 120, RW - 120), FY)
					pl.hp = float(pl.max)
					pl.inv = 2.5
					pl.en = max(pl.en, 50)
					ring(pl.x, pl.y - 90, "#ffe08a", 220)
					sfx("revive", null, null, 1.0, .5)
					showBanner("Back on your feet", "", 1.4)
	elif pl.dead:
		pl.deadT += dt
	_lerpMirror(dt)
	updAtmos(dt)
	if lock and camLock != null:
		cam += (camLock - cam) * min(1.0, dt * 7)
		camY += (clampf(pl.y - H * .66, 0, max(0.0, RH - H)) - camY) * min(1.0, dt * 6)
	else:
		updCamera(dt)
	if not G.paused:
		updFx(dt)
		updWeather(dt)
	render(dt)
	hudUpdate()
	pad.queue_redraw()
	P.clear()
	if TEST.on:
		_test_tick(dt)
	NET.sendT -= dt
	if NET.sendT <= 0 and peer != null:
		NET.sendT = 1.0 / SNAP_HZ
		var p = pl
		r_state.rpc_id(1, [_r(p.x), _r(p.y), _r(p.vx), _r(p.vy), p.face, p.ground, p.atk, p.combo, p.dashT, p.dead, p.deadT, p.inv, p.hp, p.max, p.en, p.shield, p.fury, p.landT, p.run, p.squash, p.aegis, p.slam, p.thr, p.sup, p.ch])

func _lerpMirror(dt: float) -> void:
	var k: float = min(1.0, dt * 16)
	for e in en:
		e.x += (e.tx - e.x) * k
		e.y += (e.ty - e.y) * k
		e.flash -= dt
	for s in shots:
		s.x += s.vx * dt
		s.y += s.vy * dt
	if boss != null and boss.has("tx"):
		boss.x += (boss.tx - boss.x) * k
		boss.y += (boss.ty - boss.y) * k
		boss.flash -= dt
	if pl2 != null and pl2.has("tx"):
		pl2.x += (pl2.tx - pl2.x) * k
		pl2.y += (pl2.ty - pl2.y) * k
	if ally != null and ally.has("tx"):
		ally.x += (ally.tx - ally.x) * k
	for b in boxes:
		b.flash -= dt

func _syncList(arr: Array, rows: Array, idKey: String, make: Callable) -> Array:
	var have = {}
	for o in arr:
		have[o[idKey]] = o
	var out = []
	for row in rows:
		var o = have.get(row[0])
		o = make.call(row, o)
		out.append(o)
	return out

func _applySnap(S: Dictionary) -> void:
	if S.has("meta"):
		var gatesBefore: int = META.gates.size()
		for k in S.meta:
			META[k] = S.meta[k]
		if ROOM != null and META.gates.size() != gatesBefore:
			var ch = false
			for i in ROOM.gates.size():
				var br = 1 if META.gates.has(ROOM.id + ":g" + str(i)) else 0
				if br != ROOM.gates[i].broken:
					ROOM.gates[i].broken = br
					ch = true
			for i in ROOM.cages.size():
				ROOM.cages[i].broken = 1 if META.gates.has(ROOM.id + ":c" + str(i)) else 0
			if ch:
				rebuild_gates()
		if pl != null:
			pl.max = maxHP()
			pl.hp = min(pl.hp, float(pl.max))
		padArms()
	if ROOM == null or S.r != ROOM.id:
		var sp = S.get("sp")
		var x = 300.0
		var y = GY
		if sp != null and sp[0] == S.r:
			x = sp[1]; y = sp[2]
		enterRoom(S.r, {x=x, y=y})
	var wasState: String = G.state
	G.state = S.st if S.st != "menu" else "play"
	if S.st == "over":
		G.state = "card"
	if NET.pz != S.pz:
		NET.pz = S.pz
		if S.pz and not G.paused:
			super.showCard({ey="Co-op", h="Paused", b="Tyko's phone has paused the game.", btns=[]})
			NET.waitCard = true
		elif not S.pz and NET.waitCard:
			NET.waitCard = false
			super.hideCard()
	if G.state == "play" and wasState != "play" and not NET.waitCard and not G.paused:
		padShow(true)
	elif G.state != "play":
		padShow(false)
	G.lv = S.lv
	lock = S.lk
	camLock = S.cam if S.lk else null
	G.score = S.sc
	G.lives = S.li
	shake = max(shake, S.sh)
	TRANS.on = S.tr[0]; TRANS.t = S.tr[1]; TRANS.phase = S.tr[2]
	ROOM.arena = {i=0} if S.ar else null
	if ROOM.lift != null:
		ROOM.lift.hold = S.lift
	if ROOM.station != null:
		ROOM.station.t = S.stn
	var a: Array = S.p1
	var keys = ["x", "y", "vx", "vy", "face", "ground", "atk", "combo", "dashT", "dead", "deadT", "inv", "hp", "max", "en", "shield", "fury", "landT", "run", "squash", "aegis", "slam", "ch", "sup"]
	if pl2 != null:
		var ox: float = pl2.x
		var oy: float = pl2.y
		var fresh: bool = not pl2.has("tx")
		for i in keys.size():
			pl2[keys[i]] = a[i]
		pl2.tx = a[0]; pl2.ty = a[1]
		if not fresh and absf(ox - pl2.tx) < 600:
			pl2.x = ox; pl2.y = oy
	en = _syncList(en, S.en, "id", func(r, e):
		if e == null:
			e = {id=r[0], v=null, dead=false, guard=null, isBoss=false, body=null, x=r[2], y=r[3], flash=0.0}
		e.type = r[1]; e.tx = r[2]; e.ty = r[3]; e.face = r[4]; e.state = r[5]; e.t = r[6]; e.hp = r[7]; e.max = r[8]; e.vx = r[9]
		if r[10] > e.get("flash", 0.0):
			e.flash = r[10]
		e.fade = r[11]; e.tp = r[12]; e.la = r[13]; e.n = r[14]; e.seed = r[15]; e.fly = r[16]; e.w = r[17]; e.h = r[18]; e.heavy = r[19]; e.oc = r[20] if r.size() > 20 else false
		e.aeg = r[21] if r.size() > 21 else false
		e.hy = e.ty
		return e)
	if S.has("bo"):
		var r: Array = S.bo
		if boss == null or boss.id != r[0]:
			boss = {id=r[0], v=null, isBoss=true, dead=false, x=r[3], y=r[4], oy=0.0, flash=0.0}
		var b = boss
		b.guard = r[1]; b.name = r[2]; b.tx = r[3]; b.ty = r[4]; b.face = r[5]; b.state = r[6]; b.fr = r[7]; b.t = r[8]
		if r[9] > b.get("flash", 0.0):
			b.flash = r[9]
		b.vx = r[10]; b.phase = r[11]; b.seed = r[12]; b.fadeT = r[13]; b.guarding = r[14]; b.weak = r[15]; b.spin = r[16]; b.hp = r[17]; b.max = r[18]
		b.w = r[19]; b.h = r[20]; b.dy = r[21]; b.hov = r[22]; b.mv = r[23]; b.heavy = true; b.fly = false
		if b.guard != null:
			bossTexLoad(DB.GUARD[b.guard].art)
	else:
		boss = null
	shots = _syncList(shots, S.shots, "uid", func(r, s):
		if s == null:
			s = {uid=r[0], v=null, hit={}, g=0.0, pierce=false, boom=false, puddle=false}
		s.x = r[1]; s.y = r[2]; s.vx = r[3]; s.vy = r[4]; s.r = r[5]; s.col = r[6]; s.wave = r[7]; s.cres = r[8]; s.life = r[9]; s.friend = r[10]
		return s)
	picks = _syncList(picks, S.pk, "uid", func(r, k):
		if k == null:
			k = {uid=r[0], v=null, cage=null, got=false, vx=0.0, vy=0.0, id=null}
		k.x = r[1]; k.y = r[2]; k.type = r[3]; k.flt = r[4]; k.life = r[5]
		return k)
	boxes = _syncList(boxes, S.bx, "id", func(r, x):
		if x == null:
			x = {id=r[0], v=null, flash=0.0}
		x.x = r[1]; x.hp = r[2]
		if r[3] > x.get("flash", 0.0):
			x.flash = r[3]
		return x)
	var H2 = []
	for r in S.hz:
		H2.append({kind=r[0], x=r[1], y=r[2], t=r[3], act=r[4], w=r[5], low=r[6], dir=r[7], hs={}})
	hz = H2
	OVL = S.get("ovl", [])
	if S.has("al"):
		var r: Array = S.al
		if ally == null or ally.id != r[0]:
			ally = {id=r[0], v=null, x=r[1], w=90.0, h=200.0}
		ally.tx = r[1]; ally.y = r[2]; ally.oy = r[3]; ally.face = r[4]; ally.state = r[5]; ally.lt = r[6]; ally.line = r[7]; ally.seed = r[8]
		bossTexLoad("sable")
	else:
		ally = null
	if S.has("np"):
		var r: Array = S.np
		if npc == null or npc.id != r[0]:
			npc = {id=r[0], v=null}
		npc.x = r[1]; npc.y = r[2]; npc.face = r[3]; npc.near = r[4]; npc.line = r[5]
	else:
		npc = null
	musicFor()

# ---------- automated co-op checks ----------
func _test_init() -> void:
	super._test_init()
	for a in OS.get_cmdline_user_args():
		if a == "--host":
			hostStart()
			TEST.autohost = true
		elif a == "--charcard":
			charCard()
		elif a.begins_with("--join="):
			NET.joinCh = a.trim_prefix("--join=").split("@")[0]
			joinAt(a.split("@")[1])

func _test_tick(dt: float) -> void:
	if TEST.get("autohost", false) and NET.get("hello", false) and NETR == "" and NET.lobby == "host":
		TEST.autohost = false
		if TEST.has("cp"):
			# co-op campaign test: the friend joins the campaign bot's game as it is
			NETR = "host"
			NET.lobby = ""
			beacon = null
			pl2 = newPlayer(NET.joinCh)
			pl2.remote = true
			pl2.x = pl.x - 120; pl2.y = pl.y
			pl2.body.x = pl2.x - 42
			G.state = "play"
			G.paused = false
			hideCard()
			netSend("start", [JSON.stringify(META), ROOM.id, pl2.x, pl2.y, NET.hostCh])
			print("COOP campaign: friend joined in ", ROOM.id)
		else:
			coopStart(true)
	super._test_tick(dt)
