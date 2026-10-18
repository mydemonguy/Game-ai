extends Node
## Autoload "DB": the game's data (rooms, text, art metadata) and a texture cache.

var ROOMS: Dictionary
var T: Dictionary          # all of text.json
var LV: Array
var PAL: Dictionary
var AMB: Dictionary
var MOTE: Dictionary
var ETYPES: Dictionary
var GUARD: Array
var ABIL: Array
var PICK: Dictionary
var ARMS: Array
var RELICS: Array
var TANKS: Array
var AREAS: Array = []      # per world: list of room ids
var TEXMETA: Dictionary
var BOSSES: Dictionary
var ROBOTS: Dictionary
var DINO: Dictionary
var RUSH: Array
var font_d: Font
var font_u: Font
var font_u6: Font
var font_d9: Font
var _tex := {}

## playable dinos. spd/jump/dmg/cd scale Tyko's numbers; hp is added to max health; tex is the sprite sheet
## (8 columns, frames ordered idle 10, walk 10, run 8, jump 12, dead 8, the same as Tyko's)
var CHARS := {
	tyko={id="tyko", name="Tyko", title="The Last Starblood", col="#7dffb0", tex="res://assets/dino.webp", fw=332, fh=234, ax=118, ay=210, sc=1.0,
		spd=1.0, jump=1.0, dmg=1.0, hp=0, cd=1.0, charge=false,
		perk="Balanced claws and speed. Lyra's collar hums around his neck.",
		bio="The last egg of the Starblood clan, kept warm for thirty years by the star-spirit Lyra. Small, green, very hungry, and the reason the Rift has started to worry."},
	zeph={id="zeph", name="Zeph", title="Skyreach Scout", col="#c9a8ff", tex="res://assets/chars/zeph.png", fw=340, fh=236, ax=154, ay=220, sc=1.0,
		spd=1.2, jump=1.08, dmg=.85, hp=-15, cd=.82, charge=false,
		perk="Fastest runner, highest jump and quickest claws. Lighter hits and a little less health.",
		bio="Zeph hatched wild on the Skyreach Cliffs, far above the reach of the Fall, and was raised by the raptor packs who never trusted cities. For years she has shadowed Hollowed patrols along the cliff-roads, counting them, stealing their batteries and vanishing before they turn around. When Tyko's first roar echoed out of Hangar Nine, she heard a Starblood voice for the first time in her life. She came down the cliffs that same night. She talks fast, runs faster, and has decided, without asking anyone, that Tyko is her little brother now."},
	rook={id="rook", name="Rook", title="Iron-Horn of Aeris", col="#7fd8ff", tex="res://assets/chars/rook.png", fw=340, fh=236, ax=155, ay=220, sc=1.05,
		spd=.88, jump=.94, dmg=1.3, hp=40, cd=1.12, charge=true,
		perk="Toughest hide and heaviest horn. Slower, but his dash is a charge that smashes robots.",
		bio="Rook was born in a cargo crate on Orbital Dock Aeris, the stowaway egg of a freighter crew that never came back for him. The dock's loader robots raised him: they taught him to push, to lift, and to count shipping manifests out loud. Then the Hollowing came and the robots who sang him to sleep turned their lamps red. Rook has been head-butting Hollowed out of the shipping lanes ever since, hoping that somewhere inside one of them is the loader who called him 'little cargo'. Slow to anger, slower to stop."},
}

const KEYS := {
	left=[KEY_LEFT, KEY_A], right=[KEY_RIGHT, KEY_D], jump=[KEY_UP, KEY_W, KEY_SPACE], attack=[KEY_J, KEY_X], special=[KEY_K, KEY_C],
	dash=[KEY_L, KEY_SHIFT], down=[KEY_DOWN, KEY_S], arm=[KEY_U, KEY_V], armc=[KEY_I], pause=[KEY_ESCAPE, KEY_P]}
const PADS := {jump=[JOY_BUTTON_A], attack=[JOY_BUTTON_X], dash=[JOY_BUTTON_RIGHT_SHOULDER], special=[JOY_BUTTON_Y], arm=[JOY_BUTTON_B],
	armc=[JOY_BUTTON_LEFT_SHOULDER], pause=[JOY_BUTTON_START], left=[JOY_BUTTON_DPAD_LEFT], right=[JOY_BUTTON_DPAD_RIGHT], down=[JOY_BUTTON_DPAD_DOWN]}

func _input_map() -> void:
	for a in KEYS:
		if not InputMap.has_action(a):
			InputMap.add_action(a, 0.4)
		for k in KEYS[a]:
			var e := InputEventKey.new()
			e.physical_keycode = k
			InputMap.action_add_event(a, e)
		for b in PADS.get(a, []):
			var j := InputEventJoypadButton.new()
			j.button_index = b
			InputMap.action_add_event(a, j)
	for q in [["left", JOY_AXIS_LEFT_X, -1.0], ["right", JOY_AXIS_LEFT_X, 1.0], ["down", JOY_AXIS_LEFT_Y, 1.0]]:
		var m := InputEventJoypadMotion.new()
		m.axis = q[1]
		m.axis_value = q[2]
		InputMap.action_add_event(q[0], m)

func _ready() -> void:
	_input_map()
	ROOMS = _json("res://data/rooms.json")
	T = _json("res://data/text.json")
	LV = T.LV; PAL = T.PAL; AMB = T.AMB; MOTE = T.MOTE; ETYPES = T.ETYPES; GUARD = T.GUARD; ABIL = T.ABIL
	PICK = T.PICK; ARMS = T.ARMS; RELICS = T.RELICS; TANKS = T.TANKS; RUSH = T.RUSH
	PICK["tank"] = {name="Energy Tank", col="#ff5ad8", txt="Energy Tank: +15 max HP"}
	PICK["core"] = {name="Aether Core", col="#7fe9ff", txt="Aether Core: hits charge Aether faster"}
	PICK["sfang"] = {name="Starblood Fang", col="#ff7a5a", txt="Starblood Fang: claws +10% damage"}
	PICK["lore"] = {name="Data Tablet", col="#ffe08a", txt="Data tablet recovered"}
	T.WHO["zeph"] = {n="ZEPH", c="#c9a8ff"}
	T.WHO["rook"] = {n="ROOK", c="#7fd8ff"}
	TEXMETA = _json("res://assets/tex/meta.json")
	BOSSES = _json("res://assets/bosses/bosses.json")
	ROBOTS = _json("res://assets/robots/robots.json")
	ETYPES["r"] = {w=80, h=165, hp=36, spd=210, dmg=9, score=150}
	DINO = _json("res://assets/dino.json")
	for a in 6:
		AREAS.append([])
	var ids := ROOMS.keys()
	ids.sort()
	for id in ids:
		var o: Dictionary = ROOMS[id]
		o.a = int(o.a); o.k = int(o.k); o.gx = int(o.gx); o.gy = int(o.gy); o.w = int(o.w); o.h = int(o.h)
		for d in o.doors:
			d.row = int(d.row)
		AREAS[o.a].append(id)
	font_d = _font("res://assets/fonts/cinzel-latin-700-normal.ttf")
	font_d9 = _font("res://assets/fonts/cinzel-latin-900-normal.ttf")
	font_u = _font("res://assets/fonts/chakra-petch-latin-700-normal.ttf")
	font_u6 = _font("res://assets/fonts/chakra-petch-latin-600-normal.ttf")

func _font(p: String) -> Font:
	var f = load(p)
	if f is FontFile:
		# fall back to the engine font for symbols the game fonts lack (◆ ★ ▲ ...)
		f.fallbacks = [load("res://assets/fonts/symbols-dejavu-bold.ttf"), ThemeDB.fallback_font]
	return f

func _json(p: String):
	var f := FileAccess.open(p, FileAccess.READ)
	return JSON.parse_string(f.get_as_text())

func tex(key: String) -> Texture2D:
	if _tex.has(key):
		return _tex[key]
	var t: Texture2D = null
	var p := "res://assets/tex/%s.png" % key
	if ResourceLoader.exists(p):
		t = load(p)
	_tex[key] = t
	return t

func boss_tex(key: String) -> Texture2D:
	var k := "bs_" + key
	if not _tex.has(k):
		_tex[k] = load("res://assets/bosses/%s.png" % key)
	return _tex[k]

func robot_tex(key: String) -> Texture2D:
	var k = "rb_" + key
	if not _tex.has(k):
		_tex[k] = load("res://assets/robots/%s.png" % key)
	return _tex[k]

func dino_tex() -> Texture2D:
	if not _tex.has("dino"):
		_tex["dino"] = load("res://assets/dino.webp")
	return _tex["dino"]

func room(id: String) -> Dictionary:
	return ROOMS[id]

func partner_door(room: Dictionary, door: Dictionary):
	var t: Dictionary = ROOMS[door.to]
	var wr: int = room.gy + door.row
	for d in t.doors:
		if d.to == room.id and d.side != door.side and t.gy + d.row == wr:
			return d
	for d in t.doors:
		if d.to == room.id:
			return d
	return null
