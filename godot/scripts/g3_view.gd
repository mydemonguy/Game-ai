extends "res://scripts/g2_actors.gd"
## layer 3: everything you see in the world – parallax backdrop, weather, room geometry, machines, lamps,
## doors, the robot rigs, Tyko, bosses, shots, pickups, particles, hazards and the light map

var MAT_ADD: CanvasItemMaterial
var MAT_FLASH: ShaderMaterial
var SHADOW_TEX: Texture2D
var cam2d: Camera2D
var bg_layer: CanvasLayer
var light_layer: CanvasLayer
var fgw_layer: CanvasLayer
var fg_layer: CanvasLayer
var top_layer: CanvasLayer
var bg_root: Node2D
var par_walls: Node2D
var room_root: Node2D
var act_root: Node2D
var cols_root: Node2D
var top_room: Node2D
var fg_root: Node2D
var light_vp: SubViewport
var light_rect: ColorRect
var light_tex: TextureRect
var pnodes = {}
var ring_node: Node2D
var hz_node: Node2D
var hza_node: Node2D
var bars_node: Node2D
var slash_node: Node2D
var weather_node: Node2D
var flash_rect: ColorRect
var bolt_node: Node2D
var marks: Array[Label] = []
var hzT: Array[Label] = []
var ftl: Array[Label] = []
var VW = {bgA="", bgW=0.0}
var BGV = {}
var RV = {}
var VIEWS = {}
var FRAME = 0
var ATM = {flash=0.0, lt=6.0, bolt=null, thunder=0.0}
var BARS: Array = []
var WG: Array = []
var MARKS: Array = []
var DV = {}

const LIGHT_SHADER := """
shader_type canvas_item;
uniform vec4 col : source_color;
uniform float amt;
uniform int n;
uniform vec2 sz;
uniform vec4 L[64];
void fragment() {
	vec2 p = UV * sz;
	float g = UV.y < 0.55 ? mix(0.44, 0.8, UV.y / 0.55) : mix(0.8, 1.0, (UV.y - 0.55) / 0.45);
	float a = amt * g;
	for (int i = 0; i < 64; i++) {
		if (i >= n) break;
		vec4 l = L[i];
		float d = length(p - l.xy) / l.z;
		if (d < 1.0) {
			float h = d < 0.45 ? mix(1.0, 0.7, d / 0.45) : mix(0.7, 0.0, (d - 0.45) / 0.55);
			a *= 1.0 - min(1.0, l.w) * h;
		}
	}
	COLOR = vec4(col.rgb, a);
}
"""

const FLASH_SHADER := """
shader_type canvas_item;
void fragment() {
	COLOR = vec4(1.0, 1.0, 1.0, texture(TEXTURE, UV).a * COLOR.a);
}
"""

# ---------- building blocks ----------
func spr(parent: Node, key: String, x: float, y: float, ox := 0.0, oy := 0.0, z := -1.0, tex: Texture2D = null) -> Sprite2D:
	var s = Sprite2D.new()
	s.texture = tex if tex != null else DB.tex(key)
	s.centered = false
	if s.texture:
		s.offset = -Vector2(ox * s.texture.get_width(), oy * s.texture.get_height())
	s.position = Vector2(x, y)
	if z >= 0:
		s.z_index = zi(z)
	parent.add_child(s)
	return s

func dsize(s: Sprite2D, w: float, h: float) -> void:
	if s.texture:
		s.scale = Vector2(w / s.texture.get_width(), h / s.texture.get_height())

func glowS(parent: Node, x: float, y: float, w: float, h: float, col, a: float, z := -1.0) -> Sprite2D:
	var s = Sprite2D.new()
	s.texture = DB.tex("glow")
	s.material = MAT_ADD
	s.modulate = C(col, a)
	s.position = Vector2(x, y)
	s.scale = Vector2(w / 128.0, h / 128.0)
	if z >= 0:
		s.z_index = zi(z)
	parent.add_child(s)
	return s

func rectN(parent: Node, x: float, y: float, w: float, h: float, col: Color, z := -1.0) -> ColorRect:
	var r = ColorRect.new()
	r.position = Vector2(x, y)
	r.size = Vector2(w, h)
	r.color = col
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if z >= 0:
		r.z_index = zi(z)
	parent.add_child(r)
	return r

func tileS(parent: Node, x: float, y: float, w: float, h: float, key: String, z: float, a := 1.0) -> Sprite2D:
	var s = Sprite2D.new()
	s.texture = DB.tex(key)
	s.centered = false
	s.region_enabled = true
	s.region_rect = Rect2(0, 0, w, h)
	s.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	s.position = Vector2(x, y)
	s.z_index = zi(z)
	s.modulate.a = a
	parent.add_child(s)
	return s

func labelN(parent: Node, text: String, size: int, col, font: Font = null, outline := 0, ocol := Color(0, 0, 0, .75)) -> Label:
	var l = Label.new()
	var ls = LabelSettings.new()
	ls.font = font if font != null else DB.font_u
	ls.font_size = size
	ls.font_color = C(col)
	if outline > 0:
		ls.outline_size = outline
		ls.outline_color = ocol
	l.label_settings = ls
	l.text = text
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(l)
	return l

## position a label by an origin like Phaser's setOrigin
func place(l: Control, x: float, y: float, ox := 0.5, oy := 0.5) -> void:
	var s = l.get_combined_minimum_size()
	l.size = s
	l.pivot_offset = Vector2(ox * s.x, oy * s.y)
	l.position = Vector2(x - ox * s.x, y - oy * s.y)

func clear_children(n: Node) -> void:
	for c in n.get_children():
		c.queue_free()

func setup_view() -> void:
	MAT_ADD = CanvasItemMaterial.new()
	MAT_ADD.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	MAT_FLASH = ShaderMaterial.new()
	var fs = Shader.new()
	fs.code = FLASH_SHADER
	MAT_FLASH.shader = fs
	var img = Image.create(128, 32, false, Image.FORMAT_RGBA8)
	for yy in 32:
		for xx in 128:
			var dx = (xx + .5 - 64) / 64.0
			var dy = (yy + .5 - 16) / 16.0
			var d = sqrt(dx * dx + dy * dy)
			img.set_pixel(xx, yy, Color(0, 0, 0, clampf((1.0 - d) * 6.0, 0, 1)))
	SHADOW_TEX = ImageTexture.create_from_image(img)
	cam2d = Camera2D.new()
	cam2d.anchor_mode = Camera2D.ANCHOR_MODE_FIXED_TOP_LEFT
	add_child(cam2d)
	cam2d.make_current()
	bg_layer = CanvasLayer.new(); bg_layer.layer = -1; add_child(bg_layer)
	bg_root = Node2D.new(); bg_layer.add_child(bg_root)
	par_walls = Node2D.new(); add_child(par_walls)
	room_root = Node2D.new(); add_child(room_root)
	act_root = Node2D.new(); add_child(act_root)
	for k in PKIND:
		var n = Node2D.new()
		n.z_index = zi(D.parts - (.5 if k == "norm" else .4 if k == "chunk" else 0.0))
		if k != "norm" and k != "chunk":
			n.material = MAT_ADD
		n.draw.connect(_draw_parts.bind(n, k))
		add_child(n)
		pnodes[k] = n
	ring_node = Node2D.new(); ring_node.z_index = zi(D.rings); ring_node.material = MAT_ADD
	ring_node.draw.connect(_draw_rings); add_child(ring_node)
	hz_node = Node2D.new(); hz_node.z_index = zi(D.hz); hz_node.draw.connect(_draw_hz); add_child(hz_node)
	hza_node = Node2D.new(); hza_node.z_index = zi(D.hz); hza_node.material = MAT_ADD; hza_node.draw.connect(_draw_hza); add_child(hza_node)
	slash_node = Node2D.new(); slash_node.z_index = zi(D.player + .1); slash_node.material = MAT_ADD; slash_node.draw.connect(_draw_slash); add_child(slash_node)
	for i in 8:
		WG.append(glowS(self, 0, 0, 120, 120, "#ff3d6e", 0, D.enemies + .5))
	# light map: drawn at quarter resolution, stretched over the screen
	light_layer = CanvasLayer.new(); light_layer.layer = 1; add_child(light_layer)
	light_vp = SubViewport.new()
	light_vp.transparent_bg = true
	light_vp.size = Vector2i(int(ceil(W / 4)), 270)
	light_vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	light_layer.add_child(light_vp)
	light_rect = ColorRect.new()
	light_rect.size = Vector2(light_vp.size)
	var sm = ShaderMaterial.new()
	var sh = Shader.new()
	sh.code = LIGHT_SHADER
	sm.shader = sh
	light_rect.material = sm
	light_vp.add_child(light_rect)
	light_tex = TextureRect.new()
	light_tex.texture = light_vp.get_texture()
	light_tex.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	light_tex.mouse_filter = Control.MOUSE_FILTER_IGNORE
	light_tex.stretch_mode = TextureRect.STRETCH_SCALE
	light_tex.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	light_layer.add_child(light_tex)
	# world-space foreground (columns) and screen-space foreground (strips, weather, lightning)
	fgw_layer = CanvasLayer.new(); fgw_layer.layer = 2; fgw_layer.follow_viewport_enabled = true; add_child(fgw_layer)
	cols_root = Node2D.new(); fgw_layer.add_child(cols_root)
	fg_layer = CanvasLayer.new(); fg_layer.layer = 3; add_child(fg_layer)
	fg_root = Node2D.new(); fg_layer.add_child(fg_root)
	weather_node = Node2D.new(); weather_node.draw.connect(_draw_weather); fg_layer.add_child(weather_node)
	bolt_node = Node2D.new(); bolt_node.material = MAT_ADD; bolt_node.draw.connect(_draw_bolt); fg_layer.add_child(bolt_node)
	flash_rect = ColorRect.new(); flash_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE; flash_rect.visible = false; fg_layer.add_child(flash_rect)
	# texts above the light map, following the camera
	top_layer = CanvasLayer.new(); top_layer.layer = 4; top_layer.follow_viewport_enabled = true; add_child(top_layer)
	top_room = Node2D.new(); top_layer.add_child(top_room)
	bars_node = Node2D.new(); bars_node.draw.connect(_draw_bars); top_layer.add_child(bars_node)
	for i in 10:
		var m = labelN(top_layer, "!", 56, "#ff3d3d", DB.font_d9, 6, C(INK))
		m.visible = false
		marks.append(m)
	for i in 3:
		var t = labelN(top_layer, "", 34, "#ffd0dc")
		t.visible = false
		hzT.append(t)
	for i in 34:
		var t = labelN(top_layer, "", 44, "#ffffff", DB.font_u, 7)
		t.visible = false
		ftl.append(t)
	mkPlayerView()

# ---------- parallax backdrop ----------
func strip(parent: Node, key: String, list: Array) -> void:
	var n = int(ceil(W / 2048.0)) + 1
	for k in n:
		list.append(spr(parent, key, k * 2048, 0))

func stripAt(list: Array, px: float, y: float) -> void:
	var off = fposmod(px, 2048.0)
	for k in list.size():
		list[k].position = Vector2(round(-off + k * 2048), y)

func buildBG(_a: int) -> void:
	clear_children(bg_root)
	clear_children(fg_root)
	var t: String = curTh()
	var L: Dictionary = DB.THL[t]
	var A: Dictionary = DB.AMB[t]
	var r = Rng.new(int(L.len) * 11 + 7)
	VW.bgA = t; VW.bgW = W
	DB.flush_themes(t)
	BGV = {sky=null, stars=[], clouds=[], rays=[], ships=[], search=[], far=[], mid=[], fgb=[], fgt=[], fogs=[], fog=null, theme=t}
	BGV.sky = spr(bg_root, "sky_" + t, -60, -60)
	for i in 34:
		var st = spr(bg_root, "flake", r.next() * W, r.next() * GY * .6, .5, .5)
		st.scale = Vector2.ONE * (.12 + r.next() * .22)
		BGV.stars.append([st, 500 + r.next() * 1800, r.next() * 2000])
	if t == "station" or t == "citadel":
		for i in 9:
			var c = glowS(bg_root, 0, 0, 1, 1, "#ffffff", .06 + r.next() * .08)
			var d = {x=r.next() * 3200, y=(420 + r.next() * 360) if t == "station" else (200 + r.next() * 300), w=260 + r.next() * 360, v=8 + r.next() * 18}
			c.scale = Vector2(d.w * 2 / 128.0, d.w * .44 / 128.0)
			BGV.clouds.append([c, d])
	for i in 3:
		var ry = spr(bg_root, "ray", 0, 0)
		ry.material = MAT_ADD
		ry.modulate = C(L.planet)
		var d = {x=r.next() * 2600, w=80 + r.next() * 160, ph=r.next() * 6, a=.05 + r.next() * .05}
		ry.scale = Vector2(d.w / 90.0, 1)
		BGV.rays.append([ry, d])
	for i in 5:
		var sh = spr(bg_root, "ship_" + t, 0, 0, .5, .5)
		var gl = glowS(bg_root, 0, 0, 80, 32, L.glow, .7)
		var d = {x=r.next() * 3000, y=90 + r.next() * 360, v=(60 + r.next() * 140) * (-1 if r.next() < .5 else 1), sc=.4 + r.next() * .6, s=r.next()}
		sh.scale = Vector2(d.sc * sgn(d.v), d.sc)
		gl.scale = Vector2(80 * d.sc / 128.0, 32 * d.sc / 128.0)
		BGV.ships.append([sh, gl, d])
	if A.has("search"):
		for i in 3:
			var b = spr(bg_root, "beam", W * (.2 + i * .3), GY - 40, .5, 0)
			b.material = MAT_ADD
			b.modulate = C(A.search, .16)
			dsize(b, 150, GY * 1.25)
			BGV.search.append([b, i * 2.1])
	var TM: Dictionary = DB.TEXMETA.themes[t]
	var farN = Node2D.new(); bg_root.add_child(farN)
	strip(farN, "far_" + t, BGV.far)
	BGV.farTop = float(TM.farTop)
	BGV.fog = spr(bg_root, "fog_" + t, 0, GY - 340)
	dsize(BGV.fog, W, 340)
	var midN = Node2D.new(); bg_root.add_child(midN)
	strip(midN, "mid_" + t, BGV.mid)
	BGV.midTop = float(TM.midTop)
	strip(fg_root, "fgb_" + t, BGV.fgb)
	strip(fg_root, "fgt_" + t, BGV.fgt)
	if A.has("fog"):
		var rf = Rng.new(9)
		for i in 7:
			var f = glowS(fg_root, 0, 0, 1, 1, A.fog, .06 + rf.next() * .05)
			var d = {x=rf.next() * 3200, y=GY - 60 - rf.next() * 160, w=380 + rf.next() * 420, v=10 + rf.next() * 25}
			f.scale = Vector2(d.w * 2 / 128.0, d.w * .4 / 128.0)
			BGV.fogs.append([f, d])
	buildWeather(_a)

func bgUpdate(dt: float) -> void:
	if VW.bgW != W or VW.bgA != curTh():
		buildBG(G.lv)
		if ROOM:
			roomView(ROOM)
	var A: Dictionary = DB.AMB[curTh()]
	var vy: float = -min(140.0, camY * .06)
	BGV.sky.position = Vector2(-60 - min(260.0, cam * .02), -60 + vy * .3 + (sin(lvT * 2.2) * 2 if A.has("heat") else 0.0))
	for s in BGV.stars:
		var ph: float = fposmod(lvT * 1000 + s[2], s[1] * 2) / s[1]
		s[0].modulate.a = .1 + .85 * (ph if ph < 1 else 2 - ph)
	for c in BGV.clouds:
		var d: Dictionary = c[1]
		c[0].position = Vector2(fposmod(d.x - cam * .06 - lvT * d.v, 3200.0) - 400, d.y + vy * .4)
	for rr in BGV.rays:
		var d: Dictionary = rr[1]
		rr[0].position = Vector2(fposmod(d.x - cam * .08, 2600.0) - 150 + sin(lvT * .25 + d.ph) * 20, vy * .4)
		rr[0].modulate.a = d.a * (.75 + .25 * sin(lvT * .6 + d.ph))
	for s in BGV.ships:
		var d: Dictionary = s[2]
		var span = W + 900
		var x = fposmod(d.x + lvT * d.v - cam * .06, span) - 450
		var y: float = d.y + sin(lvT * .7 + d.s * 9) * 10 + vy * .4
		var dir = sgn(d.v)
		s[0].position = Vector2(x, y)
		s[1].position = Vector2(x - dir * 92 * d.sc, y + 2 * d.sc)
	for b in BGV.search:
		b[0].rotation = PI + sin(lvT * .35 + b[1]) * .55
		b[0].position.y = GY - 40 + vy
	stripAt(BGV.far, cam * .12, vy + BGV.farTop)
	BGV.fog.position.y = GY - 340 + vy
	stripAt(BGV.mid, cam * .35, vy * 1.3 + BGV.midTop)
	stripAt(BGV.fgb, cam * 1.3, H - 300 + (max(0.0, RH - H) - camY) * 1.3)
	stripAt(BGV.fgt, cam * 1.35, -camY * 1.35)
	for f in BGV.fogs:
		var d: Dictionary = f[1]
		f[0].position = Vector2(fposmod(d.x - cam * .9 - lvT * d.v, 3400.0) - 500, d.y - camY * .9)
	if WEA.rain and ROOM and FY > camY and FY < camY + H + 50 and randf() < .8:
		for i in (3 if A.get("heavy", 0) else 1):
			var p = part(cam + randf() * W, FY - 2, (randf() - .5) * 140, -60 - randf() * 100, .28, "#c8dcff", 5, 700, "add")

# ---------- weather: screen-space particles drawn in one pass ----------
var WEA = {kind="", rain=false, list=[], motes=[], acc=0.0, macc=0.0, embers=[], eacc=0.0}

func buildWeather(_a: int) -> void:
	var t: String = curTh()
	WEA = {kind=DB.AMB[t].weather, heavy=DB.AMB[t].get("heavy", 0) == 1, rain=DB.AMB[t].weather == "rain", list=[], motes=[], acc=0.0, macc=0.0, embers=[], eacc=0.0,
		mote=DB.MOTE[t], theme=t}

func updWeather(dt: float) -> void:
	var lo = partMul < 1.0
	var w: String = WEA.kind
	var L: Array = WEA.list
	WEA.acc += dt
	if w == "rain":
		var q = (2 if lo else 4) if WEA.heavy else (1 if lo else 2)
		while WEA.acc > .016:
			WEA.acc -= .016
			for i in q:
				L.append({x=-300 + randf() * (W + 700), y=-140 + randf() * 60, vx=-260.0 if WEA.heavy else -120.0, vy=R(1300, 1750), life=.95, sy=R(.5, 1)})
	elif w == "snow":
		while WEA.acc > (.06 if lo else .03):
			WEA.acc -= (.06 if lo else .03)
			L.append({x=-300 + randf() * (W + 700), y=-140 + randf() * 60, vx=R(-260, -90), vy=R(80, 200), life=9.0, sc=R(.3, .7), a=R(.5, .85), ax=R(-30, 10)})
	elif w == "ash" or w == "ash2":
		while WEA.acc > (.08 if lo else .04):
			WEA.acc -= (.08 if lo else .04)
			L.append({x=-300 + randf() * (W + 700), y=-140 + randf() * 60, vx=R(-60, 20), vy=R(50, 120), life=12.0, sc=R(.2, .4)})
		WEA.eacc += dt
		while WEA.eacc > (.22 if lo else .11):
			WEA.eacc -= (.22 if lo else .11)
			WEA.embers.append({x=-100 + randf() * (W + 200), y=H - randf() * 80, vx=R(-40, 40), vy=R(-140, -60), life=7.0, max=7.0, sc=R(.04, .09)})
	elif w == "debris":
		while WEA.acc > (.9 if lo else .45):
			WEA.acc -= (.9 if lo else .45)
			L.append({x=W + 40 + randf() * 40, y=randf() * H * .75, vx=R(-90, -30), vy=R(-10, 10), life=40.0, sc=R(.5, 1.2), rot=0.0})
	else:
		WEA.acc = 0.0
	for p in L:
		p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt
		if p.has("ax"):
			p.vx += p.ax * dt
		if p.has("rot"):
			p.rot += dt * .3
	WEA.list = L.filter(func(p): return p.life > 0 and p.y < H + 60 and p.x > -400)
	for p in WEA.embers:
		p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt
	WEA.embers = WEA.embers.filter(func(p): return p.life > 0)
	var M: Dictionary = WEA.mote
	WEA.macc += dt
	while WEA.macc > (.26 if lo else .13):
		WEA.macc -= (.26 if lo else .13)
		var life = R(3, 6)
		var wind: bool = M.get("wind", 0) == 1
		WEA.motes.append({x=randf() * W, y=randf() * H, vx=R(-700, -400) if wind else R(-20, 20), vy=0.0 if wind else R(M.v * .5, M.v * 1.5), life=life, max=life, sc=R(.12, .3), sx=R(3, 6), wind=wind})
	for p in WEA.motes:
		p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt
	WEA.motes = WEA.motes.filter(func(p): return p.life > 0)
	weather_node.queue_redraw()
	bolt_node.queue_redraw()

func _draw_weather() -> void:
	var n = weather_node
	var w: String = WEA.kind
	if w == "rain":
		var t = DB.tex("streak")
		var col = Color(.745, .824, 1.0, .34) if WEA.heavy else Color(.745, .863, .824, .24)
		var rot = deg_to_rad(9.8 if WEA.heavy else 4.6)
		for p in WEA.list:
			n.draw_set_transform(Vector2(p.x, p.y), rot, Vector2(.45, p.sy))
			n.draw_texture(t, Vector2(-4, -48), col)
		n.draw_set_transform(Vector2.ZERO)
	elif w == "snow":
		var t = DB.tex("flake")
		for p in WEA.list:
			var s: float = 12 * p.sc
			n.draw_texture_rect(t, Rect2(p.x - s / 2, p.y - s / 2, s, s), false, Color(.9, .86, 1, p.a))
	elif w == "ash" or w == "ash2":
		var t = DB.tex("dot")
		var col = Color8(0x78, 0x6e, 0x64, 178) if w == "ash" else Color8(0x5a, 0x3c, 0x3c, 178)
		for p in WEA.list:
			var s: float = 16 * p.sc
			n.draw_texture_rect(t, Rect2(p.x - s / 2, p.y - s / 2, s, s), false, col)
	elif w == "debris":
		var t = DB.tex("px")
		for p in WEA.list:
			n.draw_set_transform(Vector2(p.x, p.y), p.rot * 12.0, Vector2(p.sc, p.sc))
			n.draw_texture(t, Vector2(-4, -4), Color(.78, .84, .94, .5))
		n.draw_set_transform(Vector2.ZERO)

func _draw_bolt() -> void:
	var n = bolt_node
	var gt = DB.tex("glow")
	var w: String = WEA.kind
	if w == "ash" or w == "ash2":
		var col = C("#ff9a3a") if w == "ash" else C("#ff4a2a")
		for p in WEA.embers:
			var s: float = 128 * p.sc
			col.a = p.life / p.max
			n.draw_texture_rect(gt, Rect2(p.x - s / 2, p.y - s / 2, s, s), false, col)
	var M: Dictionary = WEA.mote
	var mc = C(M.col)
	var dt_ = DB.tex("dot")
	for p in WEA.motes:
		var k: float = 1.0 - p.life / p.max
		mc.a = sin(k * PI) * (.25 if p.wind else .55)
		if p.wind:
			n.draw_texture_rect(dt_, Rect2(p.x - 8 * p.sx, p.y - 1.2, 16 * p.sx, 2.4), false, mc)
		else:
			var s: float = 16 * p.sc
			n.draw_texture_rect(dt_, Rect2(p.x - s / 2, p.y - s / 2, s, s), false, mc)
	if ATM.bolt != null and ATM.bolt.t > 0:
		var b: Dictionary = ATM.bolt
		var col = C(DB.AMB[curTh()].get("lightning", "#ffffff"))
		for q in [[14.0, .25], [5.0, .9]]:
			col.a = q[1] * min(1.0, b.t * 8)
			n.draw_polyline(PackedVector2Array(b.pts), col, q[0])

# ---------- the room itself ----------
func emissive(parent: Node, x: float, y: float, e: Dictionary, sf: float, depth: float) -> void:
	var ry: float = e.r if e.get("ry") == null else e.ry
	var g = glowS(parent, x, y, e.r * 2, ry * 2, e.col, e.a, depth + (0.0 if sf == 1 else .5))
	var rec = {g=g, e=e, bx=x, by=y}
	if sf == 1:
		RV.ems.append(rec)
	else:
		RV.wems.append(rec)

func roomView(o) -> void:
	clear_children(room_root)
	clear_children(par_walls)
	clear_children(cols_root)
	clear_children(top_room)
	RV = {lamps=[], ems=[], wems=[], doors=[], fans=[], signs=[], cols=[], gateV=[], cageV=[], lift=null, shrine=null, station=null, conv=null, vault=null}
	if VW.bgA != curTh() or VW.bgW != W:
		buildBG(o.a)
	var t: String = curTh()
	var L: Dictionary = DB.THL[t]
	var Pa: Dictionary = DB.PAL[t]
	var A: Dictionary = DB.AMB[t]
	var TM: Dictionary = DB.TEXMETA.themes[t]
	var r = Rng.new(hstr(o.id) + 5)
	var ink = C(Pa.ink)
	var gl = C(L.glow)
	# machinery walls and holo signs behind the play plane
	var x = 150.0
	var span = RW * .62 + W + 200
	while x < span:
		var i = int(floor(r.next() * 4))
		var b: Dictionary = TM.walls[i]
		var top: float = GY + 34 - b.h
		spr(par_walls, "wl_" + t + str(i), x, GY + 34, 0, 1, D.walls)
		for f in b.fans:
			var fn = spr(par_walls, "fan_" + t, x + f.x, top + f.y, .5, .5, D.walls)
			fn.scale = Vector2.ONE * (f.r / 60.0)
			RV.fans.append(fn)
		for e in b.em:
			emissive(par_walls, x + e.x, top + e.y, e, .62, D.walls)
		x += 700 + r.next() * 800
	x = 500.0
	while x < span:
		var signs: Array = A.signs
		var txt: String = signs[int(floor(r.next() * signs.size()))]
		var y = 300 + r.next() * 220
		var lab = labelN(par_walls, txt, 30, Pa.scr)
		var sb = StyleBoxFlat.new()
		sb.bg_color = Color(5 / 255.0, 6 / 255.0, 12 / 255.0, .78)
		sb.border_color = C(Pa.scr, .8)
		sb.set_border_width_all(3)
		sb.content_margin_left = 22; sb.content_margin_right = 22; sb.content_margin_top = 9; sb.content_margin_bottom = 9
		lab.add_theme_stylebox_override("normal", sb)
		place(lab, x, y)
		lab.z_index = zi(D.signs)
		RV.signs.append({lab=lab, s=r.next(), x=x, y=y, w=lab.size.x})
		x += 1200 + r.next() * 1400
	# tall shafts get a plated back wall
	if o.h > 1:
		tileS(room_root, 0, 0, RW, RH, "wp_" + t, D.back, .9)
		for fx in [RW * .12, RW * .88]:
			tileS(room_root, fx - 17, 0, 34, RH, "pipev_" + t, D.back)
		rectN(room_root, 0, 0, RW, RH, Color(0, 0, 0, .3), D.back)
	# machines standing on the floor
	for p in o.props:
		var key = "m_" + t + "_" + p.k + str(int(p.v))
		var m: Dictionary = TM.mach[p.k + str(int(p.v))]
		spr(room_root, key, p.x, p.fy + 4, .5, 1, D.props)
		for e in m.em:
			emissive(room_root, p.x - m.w / 2.0 + e.x, p.fy + 4 - m.h + e.y, e, 1, D.props + .5)
	# ceiling lamps
	for l in o.lamps:
		var alarm: bool = l.k == "alarm"
		var col = "#ff3d2a" if alarm else Pa.acc2
		rectN(room_root, l.x - 2, l.y0, 4, l.y - l.y0, ink, D.lamps)
		spr(room_root, "lamp_" + t, l.x, l.y, .5, 0, D.lamps)
		var q = {l=l, col=col}
		if not alarm:
			q.bulb = rectN(room_root, l.x - 28, l.y + 26, 56, 6, Color8(255, 246, 220), D.lamps)
			q.cone = spr(room_root, "cone", l.x, l.y + 30, .5, 0, D.lamps + .5)
			q.cone.material = MAT_ADD
			q.cone.modulate = C(col, .22)
			dsize(q.cone, 380, l.fy - (l.y + 30))
			q.pool = glowS(room_root, l.x, l.fy + 6, 420, 52, col, .35, D.lamps + .5)
			q.gl = glowS(room_root, l.x, l.y + 30, 140, 140, col, .8, D.lamps + .5)
			if A.weather == "rain":
				q.wet = glowS(room_root, l.x, l.fy + 60, 80, 240, col, .25, D.solids + .7)
		else:
			q.bulb = Sprite2D.new()
			q.bulb.texture = DB.tex("flake"); q.bulb.position = Vector2(l.x, l.y + 30); q.bulb.scale = Vector2.ONE * 2.2
			q.bulb.modulate = C("#5a1a14"); q.bulb.z_index = zi(D.lamps); room_root.add_child(q.bulb)
			q.beam = spr(room_root, "beam", l.x, l.y + 30, .5, 0, D.lamps + .5)
			q.beam.material = MAT_ADD
			q.beam.modulate = C(col, .38)
			dsize(q.beam, 200, (l.fy - l.y) * 1.15)
			q.beam.visible = false
			q.gl = glowS(room_root, l.x, l.y + 30, 120, 120, col, .9, D.lamps + .5)
			q.gl.visible = false
		RV.lamps.append(q)
	# steam vent grates
	for v in o.vents:
		rectN(room_root, v.x - 40, v.fy - 6, 80, 8, ink, D.vents)
		for i in 6:
			rectN(room_root, v.x - 34 + i * 12, v.fy - 5, 6, 5, Color(1, 1, 1, .12), D.vents)
	# floors, ledges and walls
	for sd in o.solids:
		if sd.k == "floor" or sd.k == "ledge":
			var h: float = min(sd.h, 200.0)
			var x0: float = max(sd.x, -200.0)
			var w0: float = min(sd.w, RW + 400)
			tileS(room_root, x0, sd.y, w0, h, "gt_" + t, D.solids)
			if sd.h > 200:
				rectN(room_root, sd.x, sd.y + 200, sd.w, sd.h - 200, ink, D.solids)
			var ln = rectN(room_root, x0, sd.y - 1, w0, 3, C(L.glow, .45), D.solids + .5)
			ln.material = MAT_ADD
			if sd.k == "ledge":
				rectN(room_root, sd.x, sd.y + sd.h - 6, sd.w, 6, ink, D.solids)
		else:
			var y0: float = max(sd.y, -300.0)
			var h2: float = sd.y + sd.h - y0
			tileS(room_root, sd.x, y0, sd.w, min(h2, RH + 300 - y0), "wp_" + t, D.solids)
			rectN(room_root, sd.x, sd.y, sd.w, sd.h, Color(0, 0, 0, .35), D.solids)
			if sd.k == "wall":
				rectN(room_root, sd.x + sd.w - 3 if sd.x < 0 else sd.x, sd.y, 3, sd.h, C(L.glow, .35), D.solids)
			else:
				rectN(room_root, sd.x, sd.y + sd.h - 3, sd.w, 3, C(L.glow, .35), D.solids)
	if A.get("conveyor", 0):
		var cn = Node2D.new()
		cn.position = Vector2(0, FY)
		cn.z_index = zi(D.solids + .2)
		room_root.add_child(cn)
		tileS(cn, -96, 0, RW + 192, 12, "conv_" + t, 0)
		RV.conv = cn
	# catwalks with their hanging struts
	for p in o.plats:
		var top: float = floor(p.y / H) * H
		rectN(room_root, p.x + 18, top, 4, p.y - top, ink, D.plats - .1)
		rectN(room_root, p.x + p.w - 22, top, 4, p.y - top, ink, D.plats - .1)
		tileS(room_root, p.x, p.y - 2, p.w, 46, "pl_" + t, D.plats)
		if p.get("iso", 0):
			glowS(room_root, p.x + p.w / 2.0, p.y + 10, p.w * 1.2, 40, "#ff5ad8", .25, D.plats + .5)
	# hatches
	for d in o.doors:
		var dx: float = 0.0 if d.side == "L" else RW
		var y: float = d.row * H + GY
		var bx: float = dx + 4 if d.side == "L" else dx - 30
		var f = spr(room_root, "dframe_" + t, dx + 29 if d.side == "L" else dx - 23, y - 313, .5, .5, D.doors)
		var hs = spr(room_root, "hatch", bx + 13, y - 300, .5, 0, D.doors)
		dsize(hs, 32, 300)
		var g = glowS(room_root, bx + 13, y - 150, 180, 300, "#3d8bff", .45, D.doors + .5)
		var sg = null
		if DB.ROOMS[d.to].kind == "secret":
			for q in o.gates:
				if q.kind == "secret":
					sg = q
		RV.doors.append({d=d, h=hs, g=g, f=f, bx=bx, y=y, op=0.0, sg=sg, hid=null})
	# elevator: a glass capsule in a lit shaft (the shaft runs up for lifts going up, down through the floor for lifts going down)
	if o.lift != null:
		var lx: float = o.lift.x
		var up: bool = o.lift.dir < 0
		var gcol: String = "#7dffb0" if up else "#ffb347"
		var tint = Color.WHITE.lerp(C(Pa.light), .3)
		var rowTop: float = FY - GY
		var capTop: float = FY - 452
		var sh = tileS(room_root, lx - 100, rowTop, 200, capTop - rowTop + 40, "lift2_shaft", D.back + .6)
		sh.modulate = tint
		var rails = []
		for rx in [lx - 64, lx + 64]:
			var rl = rectN(room_root, rx - 2, rowTop, 4, capTop - rowTop + 30, C(L.glow, .3), D.back + .7)
			rl.material = MAT_ADD
			rails.append(rl)
		if not up:
			# the shaft carries on down through the floor
			var pit = rectN(room_root, lx - 120, FY + 20, 240, 180, Color8(10, 12, 18), D.solids + .3)
			for i in 5:
				rectN(pit, 20, 22 + i * 30, 200, 8, Color8(40, 44, 54), -1)
			var pg = glowS(room_root, lx, FY + 60, 260, 120, gcol, .35, D.solids + .4)
			rails.append(pg)
		var back = spr(room_root, "lift2_tubeback", lx, FY - 6, .5, 1, D.fixtures)
		var inner = spr(room_root, "vgrad", lx, FY - 10, .5, 1, D.fixtures + .4)
		dsize(inner, 200, 330)
		inner.material = MAT_ADD
		inner.modulate = C(gcol, .2)
		var base = spr(room_root, "lift2_base", lx, FY + 72, .5, 1, D.fixtures + .2)
		base.modulate = tint
		var padG = glowS(room_root, lx, FY - 2, 240, 34, gcol, .7, D.fixtures + .5)
		var glass = spr(room_root, "lift2_glass", lx, FY - 6, .5, 1, D.player + .5)
		var cap = spr(room_root, "lift2_cap", lx, capTop, .5, 0, D.player + .6)
		cap.modulate = tint
		var gem = spr(room_root, "lift2_gem", lx, capTop + 64, .5, .5, D.player + .7)
		gem.modulate = C(gcol)
		var gemG = glowS(room_root, lx, capTop + 64, 120, 120, gcol, .6, D.player + .7)
		var rings = []
		for i in 3:
			rings.append(glowS(room_root, lx, FY, 240, 34, gcol, 0.0, D.player + .55))
		# launch beam along the shaft
		var beam = spr(room_root, "vgrad", lx, FY - 10, .5, 1, D.player + .58)
		var bh: float = FY - 10 - rowTop if up else 330.0
		dsize(beam, 150, bh)
		if not up:
			beam.position.y = FY + 180
		beam.material = MAT_ADD
		beam.modulate = C("#ffffff", 0.0)
		var lab = labelN(top_room, ("▲ " if up else "▼ ") + "ELEVATOR · " + String(DB.LV[DB.ROOMS[o.lift.to].a].name).to_upper(), 26, "#bff0ff")
		place(lab, lx, capTop - 14, .5, 1)
		RV.lift = {bar=rectN(room_root, lx - 80, FY - 330, 160, 6, C(gcol, .9), D.player + .65), inner=inner, padG=padG, gem=gem, gemG=gemG, rings=rings, rails=rails,
			up=up, glass=glass, x=lx, beam=beam}
	# ability shrine
	var sh = o.shrine
	if sh != null and sh.ab != null:
		var Ab: Dictionary = {}
		for q in DB.ABIL:
			if q.id == sh.ab:
				Ab = q
		spr(room_root, "shrine_" + t, sh.x, GY, .5, 1, D.fixtures)
		var arcs = []
		for i in 3:
			var ar = spr(room_root, "arc", sh.x, GY - 150, .5, .5, D.fixtures)
			ar.modulate = C(Ab.col)
			ar.scale = Vector2.ONE * ((28 + i * 10) / 28.0)
			arcs.append(ar)
		var core = Sprite2D.new()
		core.texture = DB.tex("flake"); core.scale = Vector2.ONE * 3.2; core.position = Vector2(sh.x, GY - 150); core.z_index = zi(D.fixtures)
		room_root.add_child(core)
		RV.shrine = {orb=glowS(room_root, sh.x, GY - 150, 240, 240, Ab.col, .75, D.fixtures + .5), core=core, arcs=arcs, ab=sh.ab, x=sh.x}
	# save station
	var st = o.station
	if st != null:
		spr(room_root, "station_" + t, st.x, GY, .5, 1, D.fixtures)
		var col = spr(room_root, "vgrad", st.x, GY - 26, .5, 1, D.fixtures + .5)
		dsize(col, 88, 188)
		col.material = MAT_ADD
		col.modulate = C("#7dffb0")
		RV.station = {col=col, gl=glowS(room_root, st.x, GY - 30, 180, 40, "#7dffb0", .4, D.fixtures + .5)}
		var lab = labelN(top_room, "SAVE", 20, "#7dffb0")
		place(lab, st.x, GY - 244, .5, 1)
	# district hazards
	RV.dhz = []
	for h in o.get("dhz", []):
		var q = {h=h}
		match h.k:
			"ice":
				var n = Node2D.new()
				n.z_index = zi(D.fixtures + .3)
				room_root.add_child(n)
				var ic = Polygon2D.new()
				ic.polygon = PackedVector2Array([Vector2(-26, -70), Vector2(26, -70), Vector2(14, -10), Vector2(4, 40), Vector2(-4, 46), Vector2(-14, -6)])
				ic.color = Color("#d8f4ff")
				n.add_child(ic)
				var hl = Polygon2D.new()
				hl.polygon = PackedVector2Array([Vector2(-14, -66), Vector2(-4, -66), Vector2(-2, 20), Vector2(-8, -10)])
				hl.color = Color(1, 1, 1, .8)
				n.add_child(hl)
				var ol = Line2D.new()
				ol.points = PackedVector2Array([Vector2(-26, -70), Vector2(-14, -6), Vector2(-4, 46), Vector2(4, 40), Vector2(14, -10), Vector2(26, -70)])
				ol.width = 3; ol.default_color = Color(.1, .2, .3, .8)
				n.add_child(ol)
				n.scale = Vector2(1.6, 1.6)
				for sx in [-34.0, 30.0]:
					var small = Polygon2D.new()
					small.polygon = PackedVector2Array([Vector2(sx - 10, 0), Vector2(sx + 10, 0), Vector2(sx, 70)])
					small.color = Color("#cbeeff")
					small.position = Vector2(h.x, 14)
					small.z_index = zi(D.fixtures + .25)
					room_root.add_child(small)
				rectN(room_root, h.x - 60, 0, 120, 16, C(Pa.ink), D.fixtures + .2)
				q.n = n
				q.g = glowS(room_root, h.x, 60, 140, 140, "#bfe8ff", .25, D.fixtures + .4)
			"tox":
				rectN(room_root, h.x - 85, FY - 12, 170, 14, C(Pa.ink), D.solids + .6)
				for i in 8:
					rectN(room_root, h.x - 76 + i * 20, FY - 10, 10, 8, Color(.45, 1, .5, .55), D.solids + .6)
				q.g = glowS(room_root, h.x, FY - 150, 240, 360, "#7dff6a", 0.0, D.fixtures + .5)
				q.w = glowS(room_root, h.x, FY - 8, 240, 44, "#7dff6a", .35, D.solids + .7)
			"zap":
				var plate = Node2D.new()
				plate.z_index = zi(D.solids + .6)
				room_root.add_child(plate)
				rectN(plate, h.x - 140, FY - 18, 280, 20, C(Pa.ink))
				for i in 14:
					var stripe = Polygon2D.new()
					var x0: float = h.x - 136 + i * 20
					stripe.polygon = PackedVector2Array([Vector2(x0, FY - 2), Vector2(x0 + 10, FY - 2), Vector2(x0 + 18, FY - 15), Vector2(x0 + 8, FY - 15)])
					stripe.color = Color("#ffd24a")
					plate.add_child(stripe)
				rectN(plate, h.x - 146, FY - 22, 10, 24, Color("#4a5060"))
				rectN(plate, h.x + 136, FY - 22, 10, 24, Color("#4a5060"))
				q.line = rectN(room_root, h.x - 132, FY - 21, 264, 4, C("#7fe9ff"), D.solids + .7)
				q.line.material = MAT_ADD
				q.g = glowS(room_root, h.x, FY - 24, 340, 100, "#7fe9ff", .12, D.fixtures + .5)
				var arcs = Line2D.new()
				arcs.width = 5; arcs.default_color = Color("#bff6ff"); arcs.z_index = zi(D.player + .4); arcs.material = MAT_ADD
				room_root.add_child(arcs)
				q.arcs = arcs
			"void":
				rectN(room_root, h.x - 70, FY - 8, 140, 10, Color("#0c0814"), D.solids + .6)
				q.floor = glowS(room_root, h.x, FY - 6, 260, 40, "#b48cff", .2, D.solids + .7)
				var vn = Node2D.new()
				vn.z_index = zi(D.fixtures + .6)
				vn.position = Vector2(h.x, FY - VOID_Y)
				room_root.add_child(vn)
				q.g = glowS(vn, 0, 0, 420, 420, "#9a5cff", .3)
				var vrings = []
				for i in 3:
					var rg = Line2D.new()
					var pts = PackedVector2Array()
					var rr: float = 46.0 + i * 16
					for va in 25:
						var vt: float = va / 24.0 * TAU
						pts.append(Vector2(cos(vt) * rr, sin(vt) * rr * (.55 + .2 * i)))
					rg.points = pts
					rg.width = 5.0 - i
					rg.default_color = Color("#c9a6ff") if i == 0 else Color("#7a4cff")
					rg.material = MAT_ADD
					vn.add_child(rg)
					vrings.append(rg)
				var core = Polygon2D.new()
				var cp = PackedVector2Array()
				for vb in 20:
					var vt2: float = vb / 20.0 * TAU
					cp.append(Vector2(cos(vt2) * 34, sin(vt2) * 34))
				core.polygon = cp
				core.color = Color("#07040c")
				vn.add_child(core)
				q.n = vn; q.rings = vrings; q.core = core
		RV.dhz.append(q)
	# trial rooms: a golden sigil on the back wall
	if o.kind == "trial":
		var cx2: float = RW * .5
		glowS(room_root, cx2, GY - 430, 900, 640, "#ffd24a", .12, D.back + .5)
		var tl = labelN(room_root, "TRIAL OF THE OVERCHARGED", 34, "#ffe08a", DB.font_d)
		tl.modulate.a = .55
		place(tl, cx2, GY - 560)
		tl.z_index = zi(D.back + .5)
	# the hidden Starblood vault
	if o.kind == "secret":
		var cx: float = RW * .5
		glowS(room_root, cx, GY - 430, 1000, 760, "#ffe08a", .14, D.back + .5)
		var big = labelN(room_root, "✦", 280, "#ffe08a", DB.font_d)
		big.modulate.a = .16
		place(big, cx, GY - 600)
		big.z_index = zi(D.back + .5)
		var vl = labelN(room_root, "STARBLOOD VAULT", 34, "#ffe08a", DB.font_d)
		vl.modulate.a = .5
		place(vl, cx, GY - 330)
		vl.z_index = zi(D.back + .5)
		RV.vault = {x=cx}
	# ability gates
	for g in o.gates:
		if g.broken:
			continue
		var x0: float = g.x - g.w / 2.0
		var gn = Node2D.new()
		room_root.add_child(gn)
		var q = {g=g, n=gn}
		match g.kind:
			"crack":
				spr(gn, "g_crack_" + t, x0, g.top, 0, 0, D.fixtures)
				var yy: float = g.top + 120
				while yy < GY:
					glowS(gn, x0 + g.w * .45, yy + 40, 60, 60, "#ffd27a", .35, D.fixtures + .5)
					yy += 210
			"ledge":
				spr(gn, "g_ledge_" + t, x0, g.top, 0, 0, D.fixtures)
				glowS(gn, g.x, g.top, 120, 120, "#7fe9ff", .4, D.fixtures + .5)
			"laser":
				var bg = rectN(gn, x0 - 10, 90, g.w + 20, GY - 180, Color8(255, 40, 30, 46), D.fixtures + .5)
				bg.material = MAT_ADD
				q.beams = []
				for i in 5:
					var bm = rectN(gn, x0 + 4 + i * (g.w - 8) / 4.0 - 3, 90, 6, GY - 180, Color8(255, 70 + i * 25, 60 + i * 10), D.fixtures + .5)
					bm.material = MAT_ADD
					q.beams.append(bm)
				q.scan = rectN(gn, x0 - 10, 90, g.w + 20, 4, Color8(255, 200, 180, 178), D.fixtures + .5)
				q.scan.material = MAT_ADD
				for ey in [0.0, GY - 90]:
					spr(gn, "g_lcap_" + t, x0 - 24, ey, 0, 0, D.fixtures)
				glowS(gn, g.x, GY / 2.0, 360, GY * .84, "#ff3d3d", .45, D.fixtures + .5)
			"blast":
				spr(gn, "g_blast_" + t, x0, 0, 0, 0, D.fixtures)
				q.lamps = []
				var yy = 120.0
				while yy < GY:
					q.lamps.append(glowS(gn, g.x, yy + 8, 52, 52, "#ff3d2a", .7, D.fixtures + .5))
					yy += 160
				spr(gn, "g_plate_" + t, g.plate, GY, .5, 1, D.fixtures)
				q.pg = glowS(gn, g.plate, GY - 8, 140, 32, "#ffb347", .5, D.fixtures + .5)
			"secret":
				var hh: float = g.bot - g.top
				var im = tileS(gn, x0, g.top, g.w, hh, "wp_" + t, D.doors + .8)
				q.img = im
				rectN(gn, x0, g.top, g.w, hh, Color(0, 0, 0, .35), D.doors + .8)
				var cr = Line2D.new()
				cr.points = PackedVector2Array([Vector2(x0 + g.w * .7, g.top + 40), Vector2(x0 + g.w * .5, g.top + 110), Vector2(x0 + g.w * .62, g.top + 160), Vector2(x0 + g.w * .42, g.top + 240)])
				cr.width = 3; cr.default_color = Color(0, 0, 0, .55); cr.z_index = zi(D.doors + .8)
				gn.add_child(cr)
				rectN(gn, x0 + g.w - 3, g.top, 3, hh, C(L.glow, .35), D.doors + .8)
			_:
				q.img = spr(gn, "g_crystal_" + t, x0 - 20, 0, 0, 0, D.fixtures)
				q.cg = glowS(gn, g.x, GY / 2.0, 280, GY * .9, "#ff5ad8", .35, D.fixtures + .5)
		RV.gateV.append(q)
	for c in o.cages:
		if c.broken:
			continue
		var x0: float = c.x - 70
		var y0: float = GY - 170
		var cn = Node2D.new()
		room_root.add_child(cn)
		var q = {c=c, n=cn}
		if c.kind == "laser":
			q.beams = []
			for i in 6:
				var bm = rectN(cn, x0 + 10 + i * 24, y0, 4, 170, Color8(255, 70, 60, 128), D.fixtures + .5)
				bm.material = MAT_ADD
				q.beams.append(bm)
			spr(cn, "c_lcap_" + t, c.x, y0, .5, 1, D.fixtures)
		elif c.kind == "crack":
			spr(cn, "c_crack_" + t, c.x, GY, .5, 1, D.fixtures)
		elif c.kind == "slam":
			spr(cn, "c_slam_" + t, c.x, GY, .5, 1, D.fixtures)
			glowS(cn, c.x, y0 + 34, 80, 80, "#ffb347", .5, D.fixtures + .5)
		else:
			spr(cn, "c_plasma_" + t, c.x, GY, .5, 1, D.fixtures)
		RV.cageV.append(q)
	# braced columns that sweep past in front
	x = 1800.0
	var cspan = RW * 1.55 + W
	while x < cspan:
		var c = spr(cols_root, "fgcol_" + t, x, 0, 0, 0)
		c.modulate.a = .85
		RV.cols.append(c)
		x += 3000 + r.next() * 1800

func roomUpdate(dt: float) -> void:
	if ROOM == null:
		return
	var o = ROOM
	par_walls.position = Vector2(cam * (1 - .62), camY * (1 - .05))
	cols_root.position = Vector2(cam * (1 - 1.55), camY)
	for f in RV.fans:
		f.rotation += dt * 5
	for q in RV.ems:
		var e: Dictionary = q.e
		var p: float = ((1.0 if sin(lvT * 3 + q.bx * .01 + e.x) > -.3 else .25) if e.get("blink", 0) else (.8 + .2 * sin(lvT * 2 + e.y)))
		q.g.modulate.a = e.a * p
		lightW(q.bx, q.by, e.r * 2.4 + 40, min(1.0, e.a * 1.3 * p))
	for q in RV.wems:
		var e: Dictionary = q.e
		var p: float = ((1.0 if sin(lvT * 3 + q.bx * .01 + e.x) > -.3 else .25) if e.get("blink", 0) else (.8 + .2 * sin(lvT * 2 + e.y)))
		q.g.modulate.a = e.a * p
		var sx: float = q.bx - cam * .62
		if sx > -100 and sx < W + 100:
			lightS(sx, q.by - camY * .05, e.r * 1.8, e.a * p)
	for s in RV.signs:
		var on: bool = sin(lvT * 13 + s.s * 50) > -.92 or sin(lvT * .7 + s.s * 9) > .2
		s.lab.modulate.a = 1.0 if on else .3
		var sx: float = s.x - cam * .62
		if on and sx > -200 and sx < W + 200:
			lightS(sx, s.y - camY * .05, s.w, .35)
	for q in RV.lamps:
		var l: Dictionary = q.l
		if l.fy < camY - 60 or l.y0 > camY + H + 60:
			continue
		if l.k == "alarm":
			var v: bool = lock
			q.beam.visible = v
			q.gl.visible = v
			q.bulb.modulate = C("#ff5a3a") if v else C("#5a1a14")
			if v:
				var dx = cos(lvT * 5 + l.s * 6)
				q.beam.rotation = -atan2(dx * 420, l.fy - l.y)
				lightW(l.x + dx * 300, l.fy - 120, 320, .7)
				lightW(l.x, l.y + 30, 160, .8)
			continue
		var on = true
		if l.k == "broken":
			on = sin(lvT * 23 + l.s * 40) * sin(lvT * 7.3 + l.s * 9) > -.15
			if not on and randf() < .25:
				part(l.x + (randf() - .5) * 30, l.y + 26, (randf() - .5) * 260, randf() * 120, .5, "#ffd27a", 4, 1500)
		q.cone.visible = on; q.pool.visible = on; q.gl.visible = on
		if q.has("wet"):
			q.wet.visible = on
		q.bulb.color = Color8(255, 246, 220) if on else Color8(74, 68, 54)
		if on:
			lightW(l.x, l.y + 40, 300, .9)
			lightW(l.x, l.fy - 40, 330, .75)
	for q in RV.doors:
		if q.sg != null:
			var hid: bool = not q.sg.broken
			if q.hid != hid:
				q.hid = hid
				for k in [q.h, q.g, q.f]:
					k.visible = not hid
			if hid:
				continue
		var d: Dictionary = q.d
		var x: float = 0.0 if d.side == "L" else RW
		var near: bool = pl != null and absf(pl.x - x) < 420 and absf(pl.y - q.y) < 200
		var open: bool = not lock and near
		q.op += ((1.0 if open else 0.0) - q.op) * min(1.0, dt * 12)
		dsize(q.h, 32, max(8.0, 300 * (1 - q.op * .92)))
		var col = C("#ff3d3d") if lock else C("#3d8bff")
		q.h.modulate = col
		q.g.modulate = Color(col.r, col.g, col.b, .45)
		lightW(q.bx + 13, q.y - 150, 220, .6)
	for q in RV.get("dhz", []):
		var h: Dictionary = q.h
		match h.k:
			"ice":
				q.n.visible = h.st != "gone"
				var sx: float = sin(lvT * 60) * 3 if h.st == "shake" else 0.0
				q.n.position = Vector2(h.x + sx, h.y - 40)
				q.g.position = Vector2(h.x, h.y - 10)
				q.g.visible = h.st != "gone"
			"tox":
				var ph: float = hzPhase(h, TOX_P)
				var on: float = 1.0 if ph >= 3.2 else (ph - 2.6) / .6 if ph >= 2.6 else 0.0
				q.g.modulate.a = .55 * on
				q.w.modulate.a = .3 + .45 * on
				for kk in (2 if ph >= 3.2 else 1):
					if on > 0 and randf() < (.95 if ph >= 3.2 else .4):
						part(h.x + (randf() - .5) * 110, FY - 14, (randf() - .5) * 90, -220 - randf() * 300 * on, 1.2, "rgba(125,255,106,.45)", 44 + randf() * 36, -50, "norm")
				if on > .5:
					lightW(h.x, FY - 140, 220, .35)
			"zap":
				var ph: float = hzPhase(h, ZAP_P)
				var on: bool = ph >= 2.9
				var warn: bool = ph >= 2.2 and not on
				q.line.visible = on or (warn and int(lvT * 14) % 2 == 0)
				q.g.modulate.a = .7 if on else (.4 if q.line.visible else .12)
				var pts = PackedVector2Array()
				if on:
					var x0: float = h.x - 125
					while x0 < h.x + 125:
						pts.append(Vector2(x0, FY - 10 - randf() * 70))
						x0 += 22 + randf() * 18
					lightW(h.x, FY - 40, 260, .6)
				q.arcs.points = pts
			"void":
				var ph: float = hzPhase(h, VOID_P)
				var on: float = 1.0 if ph >= 3.3 else (ph - 2.6) / .7 if ph >= 2.6 else 0.0
				var sc: float = .55 + .45 * on + (sin(lvT * 9) * .04 if on >= 1.0 else 0.0)
				q.n.scale = Vector2(sc, sc)
				for i in q.rings.size():
					q.rings[i].rotation = lvT * (1.2 + 2.5 * on) * (1 if i % 2 == 0 else -1) * (1.0 + i * .3)
				q.g.modulate.a = .25 + .55 * on
				q.floor.modulate.a = .15 + .5 * on
				if on >= 1.0:
					if randf() < .8:
						var va: float = randf() * TAU
						var r0: float = 200 + randf() * 260
						part(h.x + cos(va) * r0, FY - VOID_Y + sin(va) * r0 * .6, -cos(va) * r0 * 1.6, -sin(va) * r0 * 1.0, .6, "#b48cff", 10 + randf() * 10, 0, "glow")
					lightW(h.x, FY - VOID_Y, 300, .5)
	if o.lift != null and RV.lift != null:
		var q: Dictionary = RV.lift
		# charge: 0 idle, rises while you stand inside, 1 while the capsule launches
		var k: float = min(1.0, o.lift.hold / 1.1)
		if TRANS.on and TRANS.act != null and TRANS.act.has("lift") and TRANS.phase == 0:
			k = 1.0 + TRANS.t / transDur()
		# just arrived: the capsule is still charged and fades down as you step out
		var arr: float = o.lift.get("arrive", 0.0)
		if arr > 0:
			if G.state == "play" and not TRANS.on:
				o.lift.arrive = arr - get_process_delta_time()
			k = max(k, 1.0 + min(1.0, arr) * .8)
		lightW(o.lift.x, FY - 160, 320 + 120 * k, .8 + .4 * min(k, 1.0))
		q.bar.visible = o.lift.hold > 0 and k < 1.0
		q.bar.scale.x = min(1.0, k)
		q.inner.modulate.a = .14 + .05 * sin(lvT * 2.4) + .75 * min(k, 1.5)
		q.padG.modulate.a = .55 + .15 * sin(lvT * 3) + .3 * min(k, 1.0)
		var pulse: float = .5 + .5 * sin(lvT * (3.0 + 9.0 * min(k, 1.0)))
		q.gemG.modulate.a = .35 + (.35 + .3 * min(k, 1.0)) * pulse
		q.gem.modulate.v = .8 + .2 * pulse
		for r in q.rails:
			r.modulate.a = .25 + .5 * min(k, 1.0)
		# light rings race along the tube in the direction of travel
		var spd: float = 120.0 + 900.0 * min(k, 1.5)
		for i in q.rings.size():
			var ph: float = fposmod(lvT * spd + i * 110.0, 330.0)
			var y: float = (FY - 10 - ph) if q.up else (FY - 320 + ph)
			q.rings[i].position = Vector2(q.x, y)
			q.rings[i].modulate.a = (.15 + .85 * min(k, 1.0)) * sin(ph / 330.0 * PI)
		q.glass.modulate = Color.WHITE.lerp(Color(1.6, 1.8, 2.0), max(0.0, k - 1.0))
		q.beam.modulate.a = clampf((k - 1.0) * 2.0, 0.0, .9)
	if RV.shrine != null:
		var q: Dictionary = RV.shrine
		var got: bool = hasAb(q.ab) or not gDone(ROOM.a)
		var y = GY - 150 + sin(lvT * 2.5) * 10
		for k in [q.orb, q.core] + q.arcs:
			k.visible = not got
			k.position.y = y
		for i in q.arcs.size():
			q.arcs[i].rotation = lvT * 2 + i
		if not got:
			lightW(q.x, y, 320, .9)
	if RV.vault != null:
		lightW(RV.vault.x, GY - 420, 760, .65)
	if RV.station != null:
		var on: bool = o.station.t > 0
		RV.station.col.modulate.a = .55 if on else .3
		RV.station.gl.modulate.a = .7 if on else .4
		lightW(o.station.x, GY - 120, 260, .7)
	for q in RV.gateV:
		var g: Dictionary = q.g
		if g.broken:
			if is_instance_valid(q.n):
				q.n.queue_free()
			continue
		match g.kind:
			"laser":
				for i in q.beams.size():
					q.beams[i].modulate.a = .45 + .35 * sin(lvT * 22 + i * 1.7)
				q.scan.position.y = 90 + fmod(lvT * 700, GY - 180)
				lightW(g.x, GY / 2.0, 340, .95)
			"blast":
				for i in q.lamps.size():
					q.lamps[i].modulate.a = .8 if sin(lvT * 4 + i) > 0 else .3
				q.pg.modulate.a = .4 + .2 * sin(lvT * 4)
			"secret":
				g.flash -= dt
				q.img.material = MAT_FLASH if g.flash > 0 else null
			"crystal":
				q.cg.modulate.a = .3 + .1 * sin(lvT * 3)
				g.flash -= dt
				q.img.material = MAT_FLASH if g.flash > 0 else null
				lightW(g.x, GY / 2.0, 220, .6)
	for q in RV.cageV:
		var c: Dictionary = q.c
		if c.broken:
			if is_instance_valid(q.n):
				q.n.queue_free()
			continue
		if c.kind == "laser":
			for i in q.beams.size():
				q.beams[i].modulate.a = .35 + .2 * sin(lvT * 18 + i)
	var xs = []
	if pl:
		xs.append(pl.x - cam)
	for e in en:
		xs.append(e.x - cam)
	if boss != null and not boss.dead:
		xs.append(boss.x - cam)
	for c in RV.cols:
		var cx: float = c.position.x - cam * 1.55 + 20
		var near = false
		for sx in xs:
			if absf(cx + 48 - sx) < 48 + 110:
				near = true
		c.modulate.a += ((.22 if near else .85) - c.modulate.a) * min(1.0, dt * 12)
	if RV.conv != null:
		RV.conv.position.x = -fmod(lvT * 120, 48.0)

func steam(dt: float) -> void:
	if ROOM == null:
		return
	for v in ROOM.vents:
		v.t -= dt
		if v.on > 0:
			v.on -= dt
			if randf() < .7:
				part(v.x + (randf() - .5) * 50, v.fy - 8, (randf() - .5) * 60, -260 - randf() * 160, 1, "rgba(200,215,235,.3)", 30 + randf() * 24, -60, "norm")
			lightW(v.x, v.fy - 80, 160, .25)
		elif v.t <= 0:
			v.on = .8
			v.t = 3 + randf() * 4
			if pl and absf(v.x - pl.x) < 1100:
				sfx("vent", v.x, null, .8, .3)

func updAtmos(dt: float) -> void:
	var A: Dictionary = DB.AMB[curTh()]
	ATM.flash *= pow(.015, dt)
	if ATM.bolt != null:
		ATM.bolt.t -= dt
	if A.has("lightning") and G.state != "menu":
		ATM.lt -= dt
		if ATM.lt <= 0:
			ATM.lt = 6 + randf() * 9
			ATM.flash = 1.0
			var pts = []
			var x = W * (.15 + randf() * .7)
			var y = -20.0
			while y < GY * .7:
				pts.append(Vector2(x, y))
				x += (randf() - .5) * 90
				y += 40 + randf() * 50
			ATM.bolt = {pts=pts, t=.22}
			ATM.thunder = .35 + randf() * .4
	if ATM.thunder > 0:
		ATM.thunder -= dt
		if ATM.thunder <= 0:
			sfx("thunder", null, null, 1.0, 1.0)
			buzz(30)
	steam(dt)

func drawSkyFx() -> void:
	var A: Dictionary = DB.AMB[curTh()]
	var fl: bool = ATM.flash > .02
	flash_rect.visible = fl
	if fl:
		flash_rect.size = Vector2(W, H)
		var c = C(A.get("lightning", "#ffffff"))
		c.a = ATM.flash * .28
		flash_rect.color = c

# ---------- light map ----------
func applyLighting() -> void:
	var A: Dictionary = DB.AMB[curTh()]
	var alarm: float = .5 + .5 * sin(lvT * 6) if lock else 0.0
	var a: float = A.a * (1 - min(.92, ATM.flash))
	var c1 = C(A.col)
	if alarm > 0:
		c1 = c1.lerp(C("#3a0404"), alarm * .6)
	var vs = Vector2i(int(ceil(W / 4)), 270)
	if light_vp.size != vs:
		light_vp.size = vs
		light_rect.size = Vector2(vs)
	light_tex.size = Vector2(W, H)
	var m: ShaderMaterial = light_rect.material
	var n: int = LIGHTS.size() / 4
	var arr = PackedVector4Array()
	arr.resize(64)
	for i in min(n, 64):
		arr[i] = Vector4(LIGHTS[i * 4], LIGHTS[i * 4 + 1], LIGHTS[i * 4 + 2], LIGHTS[i * 4 + 3])
	m.set_shader_parameter("L", arr)
	m.set_shader_parameter("n", min(n, 64))
	m.set_shader_parameter("sz", Vector2(W, H))
	m.set_shader_parameter("amt", min(1.0, a * 1.15))
	m.set_shader_parameter("col", c1)
	LIGHTS.resize(0)

# ---------- particles, rings and floating text ----------
func updFx(dt: float) -> void:
	for k in PKIND:
		var arr: Array = PARTS[k]
		var keep = []
		for p in arr:
			p.life -= dt
			if p.life <= 0:
				continue
			p.vy += p.g * dt
			p.x += p.vx * dt
			p.y += p.vy * dt
			keep.append(p)
		PARTS[k] = keep
		pnodes[k].queue_redraw()
	for r in RINGS:
		r[4] += dt
	RINGS = RINGS.filter(func(r): return r[4] < .3)
	ring_node.queue_redraw()
	if kz > 0:
		kzT += dt
		var q: float = min(1.0, kzT / .26)
		kz = kz0 * (1 - q) * (1 - q)
		if q >= 1:
			kz = 0.0
	var used = {}
	for f in FTXT:
		f.t += dt
	FTXT = FTXT.filter(func(f): return f.t < .8)
	for i in ftl.size():
		var l = ftl[i]
		if i >= FTXT.size():
			l.visible = false
			continue
		var f: Dictionary = FTXT[i]
		if l.text != f.s:
			l.text = f.s
		var sc: float = (52.0 if f.big else 38.0 if f.num else 30.0) / 44.0
		var st: float = sc * (1.5 if f.num else 1.0)
		var q: float = min(1.0, f.t / .16)
		var back = 1 + 2.70158 * pow(q - 1, 3) + 1.70158 * pow(q - 1, 2)
		var s: float = st + (sc - st) * back
		var cy: float = 1 - pow(1 - min(1.0, f.t / .8), 3)
		l.visible = true
		l.modulate = Color(f.col.r, f.col.g, f.col.b, 1.0 - clampf((f.t - .45) / .35, 0, 1))
		place(l, f.x, f.y - 80 * cy, .5, 1)
		l.scale = Vector2.ONE * s

func _draw_parts(n: Node2D, k: String) -> void:
	var arr: Array = PARTS[k]
	var t: Texture2D = DB.tex({add="dot", norm="puff", glow="glow", streak="streak", chunk="px"}[k])
	var tw = float(t.get_width())
	var th = float(t.get_height())
	var rot = k == "streak" or k == "chunk"
	for p in arr:
		var q: float = 1.0 - p.life / p.max
		var c: Color = p.col
		c.a = p.a0 + (p.a1 - p.a0) * q
		if rot:
			n.draw_set_transform(Vector2(p.x, p.y), p.ang, Vector2(p.sx, p.sy))
			n.draw_texture(t, Vector2(-tw / 2, -th / 2), c)
		else:
			var w: float = tw * p.sx
			var h: float = th * p.sy
			n.draw_texture_rect(t, Rect2(p.x - w / 2, p.y - h / 2, w, h), false, c)
	if rot:
		n.draw_set_transform(Vector2.ZERO)

func _draw_rings() -> void:
	var t = DB.tex("ring")
	for r in RINGS:
		var q: float = r[4] / .3
		var e: float = 1 - (1 - q) * (1 - q)
		var s: float = (r[3] * .3 + (r[3] * 1.2 - r[3] * .3) * e) / 112.0 * 256.0
		var c: Color = r[2]
		c.a = .85 * (1 - e)
		ring_node.draw_texture_rect(t, Rect2(r[0] - s / 2, r[1] - s / 2, s, s), false, c)

# ---------- actors: views are created on first sight and dropped when their entity goes away ----------
func sync(arr: Array, make: Callable, upd: Callable) -> void:
	for e in arr:
		var v = e.get("v")
		if v == null or not is_instance_valid(v.root):
			v = make.call(e)
			e.v = v
			VIEWS[v.root.get_instance_id()] = v
		v.seen = FRAME
		upd.call(e, v)

func sweepViews() -> void:
	for k in VIEWS.keys():
		var v: Dictionary = VIEWS[k]
		if v.seen != FRAME:
			for o in v.objs:
				if is_instance_valid(o):
					o.queue_free()
			VIEWS.erase(k)

func killAllViews() -> void:
	for k in VIEWS.keys():
		for o in VIEWS[k].objs:
			if is_instance_valid(o):
				o.queue_free()
	VIEWS.clear()

func rbI(k: String, d := false) -> Sprite2D:
	var m: Array = DB.TEXMETA.rb[k]
	var s = Sprite2D.new()
	s.texture = DB.tex(k + "_d" if d else k)
	s.centered = false
	s.offset = -Vector2(m[0], m[1])
	return s

func Cn(x: float, y: float, list: Array) -> Node2D:
	var c = Node2D.new()
	c.position = Vector2(x, y)
	for ch in list:
		c.add_child(ch)
	return c

func gI(x: float, y: float, size: float, col, a: float) -> Sprite2D:
	var s = Sprite2D.new()
	s.texture = DB.tex("glow")
	s.material = MAT_ADD
	s.modulate = C(col, a)
	s.position = Vector2(x, y)
	s.scale = Vector2.ONE * (size / 128.0)
	return s

func shadowObj() -> Sprite2D:
	var s = Sprite2D.new()
	s.texture = SHADOW_TEX
	s.modulate.a = .4
	s.z_index = zi(D.shadows)
	act_root.add_child(s)
	return s

func setShadow(sh: Sprite2D, x: float, w: float, y: float) -> void:
	sh.position = Vector2(x, y + 4)
	sh.scale = Vector2(w * 2 / 128.0, 24 / 32.0)

func imgsOf(c: Node, out: Array) -> Array:
	for ch in c.get_children():
		if ch is Sprite2D and ch.material != MAT_ADD:
			out.append(ch)
		elif ch is Node2D:
			imgsOf(ch, out)
	return out

func flashRig(v: Dictionary, f: float) -> void:
	var on = f > .06
	if on == v.get("fl", false):
		return
	v.fl = on
	for im in v.imgs:
		im.material = MAT_FLASH if on else null

func leg3(p: String, d: bool, ox: float, l1: float, l2: float) -> Node2D:
	var c2 = Cn(0, l2, [rbI(p + "_foot", d)])
	var c1 = Cn(0, l1, [rbI(p + "_shin", d), c2])
	var c0 = Cn(ox, 0, [rbI(p + "_thigh", d), c1])
	c0.set_meta("c1", c1); c0.set_meta("c2", c2)
	return c0

func setLeg(c: Node2D, hip: float, a1: float, a2: float) -> void:
	c.position.y = hip
	c.rotation = a1
	c.get_meta("c1").rotation = a2
	c.get_meta("c2").rotation = -(a1 + a2)

func arm2(p: String, d: bool, dx: float, dy: float, l: float) -> Node2D:
	var a2 = Cn(0, l, [rbI(p + "_farm", d)])
	var a1 = Cn(dx, dy, [rbI(p + "_uarm", d), a2])
	var a0 = Cn(0, 0, [a1])
	a0.set_meta("a1", a1); a0.set_meta("a2", a2)
	return a0

func setArm(c: Node2D, hip: float, lean: float, u: float, f: float) -> void:
	c.position.y = hip
	c.rotation = lean
	c.get_meta("a1").rotation = u - lean
	c.get_meta("a2").rotation = f

func mkClaw() -> Dictionary:
	var armB = arm2("cb", true, -18, -84, 44)
	var legB = leg3("cb", true, -10, 48, 52)
	var head = rbI("cb_head")
	var T = Cn(0, 0, [rbI("cb_torso"), head])
	head.position = Vector2(10, -100)
	var legF = leg3("cb", false, 10, 48, 52)
	var armF = arm2("cb", false, 12, -84, 44)
	var eye = gI(48 / .74, -196 / .74, 44 / .74, "#ff3d6e", .85)
	var root = Cn(0, 0, [armB, legB, T, legF, armF, eye])
	return {root=root, armB=armB, legB=legB, T=T, head=head, legF=legF, armF=armF, eye=eye, sc=.74}

func updClaw(e, v) -> Dictionary:
	var wind: bool = e.state == "wind"
	var swing: bool = e.state == "swing"
	var mv: float = min(1.0, absf(e.vx) / 150.0) if e.state == "walk" else 0.0
	var sw: float = sin(lvT * 9 + e.seed) * .55 * mv
	var hip: float = -118 + (10 if wind else 0)
	var lean: float = .18 + (-.12 if wind else .32 if swing else 0.0)
	var ua = .25 + sw * .4
	var fa = -.6
	if wind:
		ua = 2.5; fa = .4
	elif swing:
		ua = -.95; fa = -.25
	setArm(v.armB, hip, lean, .15 - sw * .4, -.5)
	setLeg(v.legB, hip, -sw, .25 + max(0.0, sw) * 1.1)
	v.T.position.y = hip
	v.T.rotation = lean
	v.head.rotation = sin(lvT * 3 + e.seed) * .06
	setLeg(v.legF, hip, sw, .25 + max(0.0, -sw) * 1.1)
	setArm(v.armF, hip, lean, ua, fa)
	return {warn=e.y - 270 if wind else 0.0, wg=[e.x + e.face * 20, e.y - 250, "#ff3d6e"] if wind else null, bar=e.y - 262, sh=50.0}

func mkGorilla() -> Dictionary:
	var armB = arm2("go", true, -34, -124, 78)
	var legB = leg3("go", true, -26, 52, 58)
	var head = rbI("go_head")
	var T = Cn(0, 0, [rbI("go_torso"), head])
	head.position = Vector2(46, -150)
	var legF = leg3("go", false, 26, 52, 58)
	var armF = arm2("go", false, 54, -124, 78)
	var eye = gI(70 / .72, -262 / .72, 52 / .72, "#ff3a2a", .7)
	var root = Cn(0, 0, [armB, legB, T, legF, armF, eye])
	return {root=root, armB=armB, legB=legB, T=T, legF=legF, armF=armF, eye=eye, sc=.72}

func updGorilla(e, v) -> Dictionary:
	var wind: bool = e.state == "wind"
	var swing: bool = e.state == "swing"
	var mv: float = min(1.0, absf(e.vx) / 120.0) if e.state == "walk" else 0.0
	var sw: float = sin(lvT * 6 + e.seed) * .45 * mv
	var hip: float = -134 + (12 if wind else 18 if swing else 0)
	var lean = .05 if wind else .32
	var ua = .12 + sw * .5
	var fa = .2
	if wind:
		ua = 3.05; fa = .15
	elif swing:
		ua = -.55; fa = -.45
	setArm(v.armB, hip, lean, (.12 - sw * .5) if e.state == "walk" else (2.55 if wind else ua), .55 if wind else fa)
	setLeg(v.legB, hip, -sw, .2 + max(0.0, sw) * .8)
	v.T.position.y = hip
	v.T.rotation = lean
	setLeg(v.legF, hip, sw, .2 + max(0.0, -sw) * .8)
	setArm(v.armF, hip, lean, ua, fa)
	return {warn=e.y - 330 if wind else 0.0, wg=[e.x, e.y - 300, "#ff3a2a"] if wind else null, bar=e.y - 320, sh=84.0}

func wkLeg(d: bool, o: float) -> Node2D:
	var c2 = Cn(0, 112, [rbI("wk_foot", d)])
	var c1 = Cn(0, 104, [rbI("wk_shin", d), c2])
	var c0 = Cn(o, 0, [rbI("wk_thigh", d), c1])
	c0.set_meta("c1", c1); c0.set_meta("c2", c2)
	return c0

func mkWalker() -> Dictionary:
	var gunB = rbI("wk_gun", true)
	var legB = wkLeg(true, -46)
	var hull = rbI("wk_hull")
	var legF = wkLeg(false, 46)
	var gunF = rbI("wk_gun")
	var eye = gI(170, -300, 52, "#ff3a2a", .8)
	var tip = gI(222, -300, 160, "#ff8a2a", 0)
	var root = Cn(0, 0, [gunB, legB, hull, legF, gunF, eye, tip])
	return {root=root, gunB=gunB, legB=legB, hull=hull, legF=legF, gunF=gunF, eye=eye, tip=tip, sc=.88}

func updWalker(e, v) -> Dictionary:
	var mv: float = min(1.0, absf(e.vx) / 110.0) if e.state == "walk" else 0.0
	var ph: float = lvT * 5 + e.seed
	var sw = sin(ph) * .32 * mv
	var dip: float = 24.0 if e.state == "swing" else -10.0 if e.state == "wind" else absf(sin(ph)) * 6 * mv
	var hip = -227 + dip
	for q in [[v.legB, -sw], [v.legF, sw]]:
		var c: Node2D = q[0]
		var a: float = q[1]
		c.position.y = hip
		c.rotation = -.45 + a
		c.get_meta("c1").rotation = .95 - a * 1.4
		c.get_meta("c2").rotation = -(.5 - a * .4)
	v.hull.position.y = hip
	var gt: float = -.32 if e.state == "wind" else .08 if e.state == "swing" else sin(lvT * 2 + e.seed) * .04
	v.gunB.position = Vector2(-50, hip - 96); v.gunB.rotation = gt
	v.gunF.position = Vector2(72, hip - 84); v.gunF.rotation = gt
	v.eye.position = Vector2(170, hip - 70)
	v.tip.position = Vector2(72 + cos(gt) * 150, hip - 84 + sin(gt) * 150)
	if e.state == "wind":
		v.tip.modulate = C("#ff8a2a", .6 + .3 * sin(lvT * 30))
		v.tip.scale = Vector2.ONE * (160 / .88 / 128.0)
	elif e.state == "swing":
		v.tip.modulate = C("#fff0c8", .8)
		v.tip.scale = Vector2.ONE * (240 / .88 / 128.0)
	else:
		v.tip.modulate.a = 0.0
	return {warn=e.y - 370 if e.state == "wind" else 0.0, wg=null, bar=e.y - 360, sh=110.0}

func mkHound() -> Dictionary:
	var l1 = rbI("hd_leg", true); l1.position = Vector2(-30, 18)
	var l2 = rbI("hd_leg", true); l2.position = Vector2(50, 18)
	var back = Cn(0, 0, [l1, l2])
	var tail = spr(self, "hd_tail", -70, 0, 84 / 90.0, 60 / 70.0)
	remove_child(tail)
	var head = rbI("hd_head"); head.position = Vector2(62, -6)
	var l3 = rbI("hd_leg"); l3.position = Vector2(-46, 18)
	var l4 = rbI("hd_leg"); l4.position = Vector2(36, 18)
	var front = Cn(0, 0, [rbI("hd_body"), head, l3, l4])
	var eye = gI(96 / .86, -108 / .86, 40 / .86, "#ff3a2a", .85)
	var root = Cn(0, 0, [back, tail, front, eye])
	return {root=root, back=back, tail=tail, front=front, head=head, eye=eye, legs=[l1, l2, l3, l4], sc=.86}

func updHound(e, v) -> Dictionary:
	var lp: bool = e.state == "leap"
	var wd: bool = e.state == "wind"
	var mv: float = min(1.0, absf(e.vx) / 300.0)
	var ph: float = lvT * 14 + e.seed
	var by: float = -86 + (16 if wd else 0) + (-26 if lp else 0)
	var tilt: float = -.16 if lp else .12 if wd else sin(ph * 2) * .03
	var la = func(x: float, p2: float) -> float:
		if lp:
			return -1.0 if x > 0 else 1.0
		if wd:
			return .5 if x > 0 else -.5
		return sin(ph + p2) * .6 * mv
	for c in [v.back, v.front]:
		c.position.y = by
		c.rotation = tilt
	v.legs[0].rotation = la.call(-30.0, PI)
	v.legs[1].rotation = la.call(50.0, 0.0)
	v.legs[2].rotation = la.call(-46.0, 0.0)
	v.legs[3].rotation = la.call(36.0, PI)
	v.head.rotation = .25 if wd else -.2 if lp else sin(ph) * .05
	v.tail.position = Vector2(-70, by - 6)
	v.tail.rotation = sin(lvT * 8) * .12
	return {warn=e.y - 150 if wd else 0.0, wg=null, bar=e.y - 150, sh=62.0}

func mkDrone() -> Dictionary:
	var th = gI(0, 58, 60, "#ff8a3a", .6)
	th.scale = Vector2(60 / 128.0, 80 / 128.0)
	var legs = []
	for q in [[-24, 0], [24, 2], [0, 4]]:
		var l = rbI("dr_leg", q[0] == 0)
		l.position = Vector2(q[0], 40)
		l.set_meta("o", q[1]); l.set_meta("lx", q[0])
		legs.append(l)
	var body = rbI("dr_body")
	var eye = gI(6, -2, 52, "#ff3a2a", .9)
	var chg = gI(0, 0, 120, "#ff3a2a", 0)
	var root = Cn(0, 0, [th] + legs + [body, eye, chg])
	return {root=root, th=th, legs=legs, body=body, chg=chg, sc=.9, fly=true}

func updDrone(e, v) -> Dictionary:
	var y: float = e.y - 30 + sin(lvT * 3 + e.seed) * 5
	v.root.position.y = y
	v.th.modulate.a = .55 + randf() * .3
	for l in v.legs:
		var lx: float = l.get_meta("lx")
		l.rotation = sin(lvT * 4 + e.seed + l.get_meta("o")) * .25 + (.25 if lx < 0 else -.25 if lx > 0 else 0.0)
	v.body.rotation = sin(lvT * 2 + e.seed) * .06
	v.chg.modulate.a = (.4 - e.t) * 2.2 if e.t < .4 else 0.0
	return {bar=y - 70, noShadow=1, ly=y, warn=0.0, wg=null, sh=0.0}

func mkCaster() -> Dictionary:
	var jets = [gI(-30, 4, 60, "#7fd8ff", .7), gI(-22, 4, 60, "#7fd8ff", .7)]
	for j in jets:
		j.scale = Vector2(60 / 128.0, 92 / 128.0)
	var legs = []
	for q in [[-12, 1], [10, 0]]:
		var l = rbI("gn_leg", q[1] == 0)
		l.position = Vector2(q[0], -8)
		l.set_meta("o", q[1])
		legs.append(l)
	var head = rbI("gn_head"); head.position = Vector2(4, -86)
	var rifle = rbI("gn_rifle"); rifle.position = Vector2(16, -52)
	var mz = gI(0, 0, 40, "#ff4a3a", .5)
	var jet = rbI("gn_jet", true); jet.position = Vector2(-36, -74)
	var root = Cn(0, 0, jets + [jet] + legs + [rbI("gn_torso"), head, rifle, mz])
	var tele = Line2D.new()
	var pts = PackedVector2Array()
	for i in 33:
		var a = i / 32.0 * TAU
		pts.append(Vector2(cos(a) * 70, sin(a) * 20))
	tele.points = pts
	tele.width = 5
	tele.default_color = C("#7fd8ff", .6)
	tele.material = MAT_ADD
	tele.z_index = zi(D.shadows)
	act_root.add_child(tele)
	return {root=root, jets=jets, legs=legs, head=head, rifle=rifle, mz=mz, tele=tele, sc=.86, extra=[tele]}

func updCaster(e, v) -> Dictionary:
	var fl: float = sin(lvT * 2.5 + e.seed) * 10
	var y: float = e.y - 60 + fl
	var al: float = max(.05, e.tp / .35) if e.tp > 0 else 1 - e.fade * .8
	v.root.position.y = y
	v.root.modulate.a = al
	var aim = clampf(atan2((pl.y - 100 if pl else y) - (y - 60), absf((pl.x if pl else e.x) - e.x) + 1), -.7, .5)
	for j in v.jets:
		j.modulate.a = .7 * al * (.7 + randf() * .3)
	for l in v.legs:
		l.rotation = sin(lvT * 3 + l.get_meta("o") + e.seed) * .15 + .12
	v.head.rotation = aim * .3
	v.rifle.rotation = aim
	v.mz.position = Vector2(16 + 170 * cos(aim), -52 + 170 * sin(aim))
	v.mz.scale = Vector2.ONE * ((140.0 if e.t < .5 else 46.0) / 128.0)
	v.mz.modulate.a = 1.0 if e.t < .5 else .5
	var tv: bool = e.t < .7 and e.tp == 0
	v.tele.visible = tv
	v.tele.position = Vector2(e.x, e.y)
	if tv:
		v.tele.modulate.a = min(1.0, (.7 - e.t) * 1.4)
	return {bar=y - e.h - 20, sh=36.0, ly=y, warn=0.0, wg=null}

func mkTurret() -> Dictionary:
	var base = rbIx("tur_base", -38, 0, 0, .5)
	var gun = rbIx("tur_gun", 22, 0, 34 / 132.0, 34 / 68.0)
	var eye = gI(22, 0, 90, "#ff3a2a", .4)
	var root = Cn(0, 0, [base, gun, eye])
	return {root=root, gun=gun, eye=eye, sc=1.0}

func rbIx(key: String, x: float, y: float, ox: float, oy: float) -> Sprite2D:
	var s = Sprite2D.new()
	s.texture = DB.tex(key)
	s.centered = false
	s.offset = -Vector2(ox * s.texture.get_width(), oy * s.texture.get_height())
	s.position = Vector2(x, y)
	return s

func updTurretV(e, v) -> Dictionary:
	var y: float = e.y - 45
	v.root.position.y = y
	var la: float = e.la if e.la != null else 0.0
	v.gun.rotation = la
	var aim: bool = e.t < .7 or e.n > 0
	v.eye.position = Vector2(22 + cos(la) * 10, sin(la) * 10)
	v.eye.modulate.a = .7 + .3 * sin(lvT * 30) if aim else .3
	return {bar=y - 70, ly=y, warn=0.0, wg=null, sh=0.0}

# ---------- the Hollowed robot cast: Ronin, Crusher, Trooper and Volt (sprite sheets) ----------
const ROBOT_OF := {g="ronin", b="crusher", B="crusher", r="trooper", c="volt"}
const ROBOT_SC := {g=1.15, b=1.05, B=1.3, r=1.15, c=1.15}

func mkRobot(e) -> Dictionary:
	var key: String = ROBOT_OF[e.type]
	var M: Dictionary = DB.ROBOTS[key]
	var s = Sprite2D.new()
	s.texture = DB.robot_tex(key)
	s.hframes = int(M.cols)
	s.vframes = int(ceil(float(s.texture.get_height()) / M.fh))
	s.centered = false
	s.offset = -Vector2(M.ax, M.ay)
	var core = gI(0, -M.h * .55, 70, "#ff4fd8", .0)
	var kids = [s, core]
	var aura = null
	if e.get("oc", false):
		aura = gI(0, -M.h * .5, M.h * 1.8, "#ffd24a", .45)
		kids.push_front(aura)
	var root = Cn(0, 0, kids)
	if e.type == "B":
		s.self_modulate = C("#ffc0b0")
	if e.get("oc", false):
		s.self_modulate = C("#ffe7a8")
	return {root=root, spr=s, core=core, key=key, M=M, sc=ROBOT_SC[e.type] * (1.12 if e.get("oc", false) else 1.0), aura=aura}

func _af(M: Dictionary, anim: String, q: float, loop := false) -> int:
	var A: Array = M.anims.get(anim, M.anims.idle)
	var n = A.size()
	var i = int(floor(q * n))
	i = posmod(i, n) if loop else clampi(i, 0, n - 1)
	return int(A[i])

func updRobot(e, v) -> Dictionary:
	var M: Dictionary = v.M
	var st: String = e.state
	var h: float = M.h * v.sc
	var fr: int
	var moving: bool = absf(e.vx) > 30
	var walkF = _af(M, "walk", lvT * 1.3 + e.seed, true) if moving else _af(M, "idle", lvT * .9 + e.seed, true)
	if v.get("aura") != null:
		v.aura.modulate.a = .38 + .16 * sin(lvT * 5 + e.seed)
	match e.type:
		"g":
			if st == "wind":
				fr = _af(M, "attack", (1 - e.t / .42) * .35)
			elif st == "swing":
				fr = _af(M, "attack", .35 + (1 - e.t / .2) * .65)
			else:
				fr = walkF
		"b", "B":
			if st == "wind":
				fr = _af(M, "attack", (1 - e.t / (.75 if e.type == "B" else .62)) * .45)
			elif st == "swing":
				fr = _af(M, "attack", .45 + (1 - e.t / .2) * .55)
			elif st == "shoot":
				fr = _af(M, "shot", 1 - e.t / .6)
			else:
				fr = walkF
		"r":
			if st == "shoot":
				fr = _af(M, "shot", lvT * 2.4, true)
			elif st == "reload":
				fr = _af(M, "reload", 1 - e.t / 1.0)
			else:
				fr = walkF
		"c":
			if e.tp > 0:
				fr = _af(M, "shutdown", 1 - e.tp / .35)
			elif e.fade > 0:
				fr = _af(M, "enabling", 1 - e.fade)
			elif e.get("shotT", 0.0) > 0:
				fr = _af(M, "shot", 1 - e.shotT / .5)
			else:
				fr = _af(M, "idle", lvT * .9 + e.seed, true)
			v.root.modulate.a = max(.15, e.tp / .35) if e.tp > 0 else 1.0
		_:
			fr = walkF
	if e.flash > .02 and st in ["walk", "idle"] and not (e.type == "c" and (e.tp > 0 or e.fade > 0)):
		fr = _af(M, "hurt", 1 - e.flash / .14)
	v.spr.frame = fr
	v.core.position.y = -M.h * .55
	v.core.modulate.a = .25 + .12 * sin(lvT * 4 + e.seed)
	var wind: bool = st == "wind" or (e.type == "r" and st == "shoot" and e.t > .3) or (e.type == "b" and st == "shoot" and e.t > .3)
	return {warn=e.y - h - 30 if wind else 0.0, wg=[e.x + e.face * 30, e.y - h * .6, "#ff3d6e"] if st == "wind" else null, bar=e.y - h - 16, sh=M.fw * v.sc * .22}

## a destroyed robot plays its fall, then fades: drawn from a small pool
var CORPSES: Array = []

func corpseView(dt: float) -> void:
	for c in CORPSES:
		c.t += dt
		var M: Dictionary = DB.ROBOTS[c.key]
		var anim: String = "dead" if M.anims.has("dead") else "shutdown"
		c.spr.frame = _af(M, anim, min(1.0, c.t / .55))
		c.root.modulate.a = 1.0 if c.t < 1.1 else max(0.0, 1 - (c.t - 1.1) / .5)
		if c.t > 1.6:
			c.root.queue_free()
	CORPSES = CORPSES.filter(func(c): return c.t <= 1.6)

func corpse(type: String, x: float, y: float, face: int) -> void:
	_rec(["corpse", type, x, y, face])
	if not ROBOT_OF.has(type) or CORPSES.size() > 8:
		return
	var key: String = ROBOT_OF[type]
	var M: Dictionary = DB.ROBOTS[key]
	var s = Sprite2D.new()
	s.texture = DB.robot_tex(key)
	s.hframes = int(M.cols)
	s.vframes = int(ceil(float(s.texture.get_height()) / M.fh))
	s.centered = false
	s.offset = -Vector2(M.ax, M.ay)
	if type == "B":
		s.self_modulate = C("#ffc0b0")
	var root = Cn(x, y, [s])
	var sc: float = ROBOT_SC[type]
	root.scale = Vector2(face * sc, sc)
	root.z_index = zi(D.enemies - .2)
	act_root.add_child(root)
	CORPSES.append({key=key, spr=s, root=root, t=0.0})

func mkEnemyView(e) -> Dictionary:
	var v: Dictionary
	var nw: bool = codexAdd(e.type)
	if e.get("oc", false):
		nw = codexAdd("oc") or nw
	if nw and G.state == "play":
		ftext(e.x, e.y - e.h - 40, "New codex entry", "#9de0a8")
	match e.type:
		"t": v = mkTurret()
		"g", "b", "B", "r", "c": v = mkRobot(e)
		"h": v = mkHound()
		"d": v = mkDrone()
		_: v = mkRobot(e)
	if e.get("oc", false) and e.type in ["h", "d"]:
		# Overcharged hounds and drones: gold aura and a warm tint like the robots
		var au = gI(0, -50 if e.type == "h" else 0, 260 if e.type == "h" else 200, "#ffd24a", .45)
		v.root.add_child(au)
		v.root.move_child(au, 0)
		v.root.modulate = Color(1.0, .9, .62)
	v.root.z_index = zi(D.drones if e.type == "d" else D.enemies)
	act_root.add_child(v.root)
	v.imgs = imgsOf(v.root, [])
	v.objs = [v.root] + v.get("extra", [])
	v.sh = null
	if not e.fly:
		v.sh = shadowObj()
		v.objs.append(v.sh)
	return v

func updEnemyView(e, v) -> void:
	var r: Dictionary
	match e.type:
		"t": r = updTurretV(e, v)
		"h": r = updHound(e, v)
		"d": r = updDrone(e, v)
		_: r = updRobot(e, v)
	v.root.position.x = e.x
	if not e.fly:
		v.root.position.y = e.y
	v.root.scale = Vector2(e.face * v.sc, v.sc)
	flashRig(v, e.flash)
	if v.sh != null:
		setShadow(v.sh, e.x, r.sh if r.sh > 0 else 50.0, surfaceBelow(e.x, e.y - 4))
	if r.warn != 0:
		MARKS.append([e.x, r.warn])
	if r.wg != null:
		WGL.append(r.wg)
	if e.hp < e.max or e.get("oc", false):
		BARS.append([e, r.bar])
	lightW(e.x, r.get("ly", e.y) - e.h * .6, 170.0 if e.fly else 130.0, .55)

var WGL: Array = []

# ---------- bosses: baked pixel-art sheets ----------
func bossSprite(key: String, k: float, depth: float) -> Sprite2D:
	var I: Dictionary = DB.BOSSES[key]
	var s = Sprite2D.new()
	s.texture = DB.boss_tex(key)
	s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	s.hframes = int(I.cols)
	s.vframes = int(ceil(I.names.size() / float(I.cols)))
	s.centered = false
	s.offset = Vector2(-I.fw / 2.0, -I.ay * I.fh)
	s.scale = Vector2.ONE * (k * I.px)
	s.z_index = zi(depth)
	s.set_meta("key", key)
	act_root.add_child(s)
	return s

func setFrame(s: Sprite2D, name: String) -> void:
	var I: Dictionary = DB.BOSSES[s.get_meta("key")]
	var i: int = I.names.find(name)
	if i < 0:
		i = 0
	s.frame = i

func setFlipX(s: Sprite2D, flip: bool) -> void:
	s.flip_h = flip

func idleFrame(b, mv: bool) -> String:
	if mv:
		return "walk" + str(int(floor(lvT * 9 + b.seed)) % 4)
	return "idle1" if int(floor(lvT * 2.4 + b.seed)) % 2 else "idle0"

func mkGuardView(b) -> Dictionary:
	var D0: Dictionary = DB.GUARD[b.guard]
	var s = bossSprite(D0.art, D0.k, D.boss)
	var aura = gI(0, 0, b.h * (2.9 if rushGold() else 2.4), "#ffd24a" if rushGold() else D0.glow, .22); aura.z_index = zi(D.boss - .5); act_root.add_child(aura)
	var shield = gI(0, 0, 260, "#ffcc4a", 0); shield.z_index = zi(D.boss + .3); act_root.add_child(shield)
	var sh = null if D0.get("fly", 0) == 1 else shadowObj()
	var objs = [s, aura, shield]
	if sh != null:
		objs.append(sh)
	return {root=s, spr=s, aura=aura, sh=sh, shield=shield, objs=objs}

func updGuardView(b, v) -> void:
	var D0: Dictionary = DB.GUARD[b.guard]
	var fly: bool = D0.get("fly", 0) == 1
	var fr: String = b.fr if b.fr != "" else idleFrame(b, absf(b.vx) > 60 or b.state == "run")
	var spin = fr == "spin"
	var bob: float = sin(lvT * 2.5 + b.seed) * 8 if fly else 0.0
	var s: Sprite2D = v.spr
	var I: Dictionary = DB.BOSSES[D0.art]
	setFrame(s, fr)
	if spin:
		s.offset = Vector2(-I.fw / 2.0, -.62 * I.fh)
		s.position = Vector2(b.x, b.y - I.fh * s.scale.y * (I.ay - .62))
		s.rotation = b.face * b.spin * 16
	else:
		s.offset = Vector2(-I.fw / 2.0, -I.ay * I.fh)
		s.position = Vector2(b.x, b.y + bob)
		s.rotation = 0.0
	s.flip_h = b.face < 0
	s.modulate.a = max(.08, 1 - b.fadeT / .35) if b.fadeT > 0 else 1.0
	if b.flash > .06:
		s.material = MAT_FLASH
		s.self_modulate = Color.WHITE
	else:
		s.material = null
		s.self_modulate = C("#ffb080") if (b.weak > 0 and int(lvT * 10) % 2) else (Color(1.0, .9, .62) if rushGold() else Color.WHITE)
	v.aura.position = Vector2(b.x, b.y - b.h * .5 + bob)
	v.aura.modulate.a = .18 + .06 * sin(lvT * 3) + (.1 if b.phase == 2 else 0.0) + (.15 if b.weak > 0 else 0.0) + (.3 if rushGold() else 0.0)
	if rushGold() and randf() < .5 * partMul:
		part(b.x + (randf() - .5) * b.w * 1.2, b.y - randf() * b.h, (randf() - .5) * 60, -120 - randf() * 120, .9, "#ffd24a", 8 + randf() * 8, 0, "glow")
	v.shield.position = Vector2(b.x + b.face * 120, b.y - b.h * .55)
	v.shield.scale = Vector2(160 / 128.0, b.h * 1.1 / 128.0)
	v.shield.modulate.a = .28 + .1 * sin(lvT * 20) if b.guarding else 0.0
	if v.sh != null:
		setShadow(v.sh, b.x, b.w * .6, FY)
	if b.state == "wind" or (b.state == "guard" and b.t < .4):
		MARKS.append([b.x, b.y - b.h - 50 + bob])
	lightW(b.x, b.y - b.h * .5, b.h * 1.6, .9)

func mkBossV(b) -> Dictionary:
	var s = bossSprite("malakar", 2.8, D.boss)
	var aura = gI(0, 0, 620, "#ff3d6e", .2); aura.z_index = zi(D.boss - .5); act_root.add_child(aura)
	var sh = shadowObj()
	var flI = gI(0, 0, 440, "#ffffff", 0); flI.z_index = zi(D.boss + .5); act_root.add_child(flI)
	var core = gI(0, 0, 140, "#ff3d6e", .5); core.z_index = zi(D.boss + .2); act_root.add_child(core)
	return {root=s, spr=s, aura=aura, sh=sh, flI=flI, core=core, objs=[s, aura, sh, flI, core]}

func updBossV(b, v) -> void:
	var y: float = b.y + b.dy + b.hov
	var p3: bool = b.phase == 3
	var cr = C("#ff1f4f") if p3 else C("#ff3d6e")
	var st: String = b.state
	var fr: String
	if st == "dashWind" or st == "slashWind":
		fr = "wind"
	elif st == "dash":
		fr = "swing"
	elif st == "slash":
		fr = "slash"
	elif st == "barrage" or st == "cast":
		fr = "cast"
	elif st == "enter":
		fr = "idle0"
	else:
		fr = idleFrame(b, absf(b.mv) > 40)
	setFrame(v.spr, fr)
	v.spr.position = Vector2(b.x, y)
	v.spr.flip_h = b.face < 0
	if b.flash > .06:
		v.spr.material = MAT_FLASH
	else:
		v.spr.material = null
		v.spr.self_modulate = C("#ffd0d8") if p3 else Color.WHITE
	setShadow(v.sh, b.x, 120, b.y)
	v.aura.position = Vector2(b.x, y - 200)
	v.aura.modulate = Color(cr.r, cr.g, cr.b, (.34 if p3 else .2) + sin(lvT * 3) * .05 + (.3 if st in ["dashWind", "dash", "slashWind"] else 0.0))
	v.core.position = Vector2(b.x + b.face * 4, y - 260)
	v.core.modulate = Color(cr.r, cr.g, cr.b, .35 + .2 * sin(lvT * 4))
	v.flI.position = Vector2(b.x, y - 170)
	v.flI.modulate.a = b.flash * 3 if b.flash > 0 else 0.0
	if st == "dashWind" or st == "slashWind":
		MARKS.append([b.x, y - 420])
	lightW(b.x, y - 240, 420, .95)

# ---------- the playable dinos (Tyko, Zeph, Rook): one view per player ----------
var DVS := {}

func mkPlayerView() -> void:
	DVS = {}

func mkDV(p) -> Dictionary:
	var C0: Dictionary = DB.CHARS[p.ch]
	var V0 := {ch=p.ch, root=Node2D.new()}
	add_child(V0.root)
	var tex: Texture2D = load(C0.tex)
	var s = Sprite2D.new()
	s.texture = tex
	s.hframes = 8
	s.vframes = 6
	s.centered = false
	s.offset = -Vector2(C0.ax, C0.ay)
	s.z_index = zi(D.player - (.05 if p.remote else 0.0))
	V0.root.add_child(s)
	V0.spr = s
	V0.sh = Sprite2D.new(); V0.sh.texture = SHADOW_TEX; V0.sh.modulate.a = .4; V0.sh.z_index = zi(D.shadows); V0.root.add_child(V0.sh)
	V0.aura = gI(0, 0, 220, "#5ce1ff", 0); V0.aura.z_index = zi(D.player - .1); V0.root.add_child(V0.aura)
	var ae = Node2D.new()
	ae.z_index = zi(D.player + .2)
	ae.add_child(gI(0, 0, 1, "#ffb030", .55))
	ae.get_child(0).scale = Vector2(90 / 128.0, 280 / 128.0)
	var r1 = ColorRect.new(); r1.position = Vector2(-10, -110); r1.size = Vector2(20, 220); r1.color = C("#ffcc4a", .5); ae.add_child(r1)
	var r2 = ColorRect.new(); r2.position = Vector2(-4, -95); r2.size = Vector2(8, 190); r2.color = C("#fff6d0", .8); ae.add_child(r2)
	ae.visible = false
	V0.root.add_child(ae)
	V0.aegis = ae
	var shl = Line2D.new()
	var pts = PackedVector2Array()
	for i in 41:
		var a = i / 40.0 * TAU
		pts.append(Vector2(cos(a), sin(a)) * 118)
	shl.points = pts; shl.width = 5; shl.default_color = C("#8fc8ff", .55); shl.material = MAT_ADD; shl.z_index = zi(D.player + .2)
	shl.visible = false
	V0.root.add_child(shl)
	V0.shield = shl
	var shf = gI(0, 0, 236 * 1.3, "#8fc8ff", .12); shf.z_index = zi(D.player + .2); shf.visible = false; V0.root.add_child(shf)
	V0.shf = shf
	V0.ghosts = []
	for i in 8:
		var g = Sprite2D.new()
		g.texture = tex; g.hframes = 8; g.vframes = 6; g.centered = false; g.offset = s.offset
		g.z_index = zi(D.player - .2); g.material = MAT_FLASH; g.self_modulate = C(C0.col); g.visible = false
		V0.root.add_child(g)
		V0.ghosts.append([g, 0.0])
	V0.gi = 0
	var tag = labelN(top_layer, String(C0.name).to_upper(), 24, C0.col, DB.font_u, 6, C(INK))
	tag.visible = false
	V0.tag = tag
	return V0

func dvFor(p) -> Dictionary:
	var V0 = DVS.get(p.id)
	if V0 == null or V0.ch != p.ch:
		if V0 != null:
			V0.root.queue_free()
			V0.tag.queue_free()
		V0 = mkDV(p)
		DVS[p.id] = V0
	return V0

func ghost(p) -> void:
	var V0 = dvFor(p)
	var gq: Array = V0.ghosts[V0.gi % V0.ghosts.size()]
	V0.gi += 1
	var g: Sprite2D = gq[0]
	g.frame = int(DB.DINO.anims.run[2])
	g.position = Vector2(p.x, p.y)
	g.scale = Vector2(p.face, 1) * float(DB.CHARS[p.ch].sc)
	g.visible = true
	gq[1] = .22

func dinoFrame(p) -> int:
	var A: Dictionary = DB.DINO.anims
	if p.dead:
		return int(A.dead[min(7, int(p.deadT * 12))])
	if p.atk > 0:
		var q: float = 1 - p.atk / .22
		if p.combo == 3:
			return int(A.jump[2 if q < .3 else 10])
		return int(A.jump[3 if q < .25 else 5])
	if p.dashT > 0:
		return int(A.run[2])
	if not p.ground:
		return int(A.jump[4 if p.vy < -500 else 5 if p.vy < 0 else 7 if p.vy < 500 else 8])
	if p.landT > 0:
		return int(A.jump[9 + min(2, int((.15 - p.landT) / .05))])
	var v: float = absf(p.vx)
	if v > 330:
		return int(A.run[int(p.run * 1.1) % 8])
	if v > 40:
		return int(A.walk[int(p.run * 1.6) % 10])
	return int(A.idle[int(lvT * 12) % 10])

const CLAW := [[-1.25, 1.0], [1.05, -1.2], [-1.6, 1.4]]

func updPlayerView(dt: float) -> void:
	var live := {}
	var PS: Array = players() if G.state != "menu" else []
	for p in PS:
		live[p.id] = true
		_drawDino(p, dvFor(p), dt, PS.size() > 1)
	for k in DVS.keys():
		if not live.has(k):
			DVS[k].root.queue_free()
			DVS[k].tag.queue_free()
			DVS.erase(k)
	slash_node.queue_redraw()

func _drawDino(p, V0: Dictionary, dt: float, coop: bool) -> void:
	for gq in V0.ghosts:
		if gq[1] > 0:
			gq[1] -= dt
			gq[0].modulate.a = .45 * max(0.0, gq[1] / .22)
			if gq[1] <= 0:
				gq[0].visible = false
	var sc: float = DB.CHARS[p.ch].sc
	var lunge: float = 1 + .06 * sin((1 - p.atk / .22) * PI) if p.atk > 0 else 1.0
	var sx: float = (1 + p.squash * .1) * lunge
	var sy: float = 1 - p.squash * .1
	var s: Sprite2D = V0.spr
	s.frame = dinoFrame(p)
	s.position = Vector2(p.x, p.y)
	s.scale = Vector2(p.face * sx, sy) * sc
	s.modulate.a = .45 if (p.inv > 0 and p.dashT <= 0 and not p.dead and int(p.inv * 22) % 2) else 1.0
	s.self_modulate = C("#ffd0a0") if p.fury > 0 else Color.WHITE
	var sup: float = p.sup if p.get("sup") != null else FY
	setShadow(V0.sh, p.x, 60 * sc * (1 - min(.5, (sup - p.y) / 600.0)), sup)
	V0.aura.position = Vector2(p.x + p.face * 10, p.y - 100)
	V0.aura.modulate.a = .18 + .08 * sin(lvT * 5) if (p.en >= 50 and not p.dead) else 0.0
	V0.aegis.visible = p.aegis > 0 and not p.dead
	V0.aegis.position = Vector2(p.x + p.face * 110, p.y - 95)
	V0.aegis.modulate.a = .3 if (p.aegis < .6 and int(lvT * 16) % 2) else 1.0
	if p.aegis > 0:
		lightW(p.x + p.face * 110, p.y - 95, 200, .6)
	var shv: bool = p.shield > 0 and not p.dead
	V0.shield.visible = shv; V0.shf.visible = shv
	V0.shield.position = Vector2(p.x, p.y - 95)
	V0.shield.scale = Vector2.ONE * ((118 + sin(lvT * 6) * 4) / 118.0)
	V0.shf.position = Vector2(p.x, p.y - 95)
	V0.tag.visible = coop
	if coop:
		place(V0.tag, p.x, p.y - 215 * sc, .5, 1)
	if not p.dead:
		lightW(p.x, p.y - 100, 280, .7)

func _draw_slash() -> void:
	if G.state == "menu":
		return
	for p in players():
		_drawSlashFor(p)

func _drawSlashFor(p) -> void:
	if not (p.atk > 0):
		return
	var cl: Array = CLAW[max(1, p.combo) - 1]
	var q: float = min(1.0, (1 - p.atk / .22) * 1.5)
	var a: float = p.atk / .22
	var big: bool = p.combo == 3
	var col = C("#c9a8ff") if big else C("#7fe9ff")
	var a0: float = cl[0]
	var a1: float = cl[0] + (cl[1] - cl[0]) * q
	var lo = minf(a0, a1)
	var hi = maxf(a0, a1)
	if p.face < 0:
		var l2 = PI - hi
		var h2 = PI - lo
		lo = l2; hi = h2
	if hi - lo < .02:
		return
	var cx: float = p.x + p.face * (90 if big else 70)
	var cy: float = p.y - 100
	var c1 = col
	c1.a = .2 * a + .06
	slash_node.draw_arc(Vector2(cx, cy), 150 if big else 120, lo, hi, 24, c1, 80 if big else 56)
	for i in 3:
		var c2 = Color.WHITE if i == 1 else col
		c2.a = .75 * a
		slash_node.draw_arc(Vector2(cx, cy), (120 if big else 96) + i * (22 if big else 17), lo, hi, 24, c2, 9 if big else 7)

# ---------- shots, pickups, crates, NPC and Sable ----------
func mkShotView(s) -> Dictionary:
	if s.wave or s.cres:
		var c = spr(act_root, "crescent", 0, 0, .2, .5, D.shots)
		c.material = MAT_ADD
		c.modulate = C(s.col)
		var g = gI(0, 0, 300, s.col, .6); g.z_index = zi(D.shots); act_root.add_child(g)
		return {root=c, c=c, g=g, col=s.col, objs=[c, g]}
	var g = gI(0, 0, s.r * 6.4, s.col, .9); g.z_index = zi(D.shots); act_root.add_child(g)
	var core = Sprite2D.new(); core.texture = DB.tex("flake"); core.scale = Vector2.ONE * (s.r * 1.2 / 10.0); core.z_index = zi(D.shots + .5)
	act_root.add_child(core)
	return {root=g, g=g, core=core, col=s.col, objs=[g, core]}

func updShotView(s, v) -> void:
	if s.wave or s.cres:
		if v.col != s.col:
			v.col = s.col
			v.c.modulate = C(s.col)
			v.g.modulate = C(s.col, .6)
		var a: float = min(1.0, s.life * 2)
		v.c.position = Vector2(s.x - sgn(s.vx) * 40, s.y)
		v.c.scale = Vector2(sgn(s.vx) * (s.r + 30) / 100.0, (s.r + 30) / 100.0)
		v.c.modulate.a = a
		v.g.position = Vector2(s.x, s.y)
		v.g.modulate.a = a * .6
		lightW(s.x, s.y, 340, .9)
		return
	if v.col != s.col:
		v.col = s.col
		v.g.modulate = C(s.col, .9)
	v.g.position = Vector2(s.x, s.y)
	v.core.position = Vector2(s.x, s.y)
	lightW(s.x, s.y, 150, .9)

func mkPickView(k) -> Dictionary:
	var big: bool = k.type == "sfang" or k.type == "lore"
	var i = spr(act_root, "pk_" + k.type, 0, 0, .5, .5, D.picks)
	i.scale = Vector2.ONE * (1.5 if big else 1.0)
	var objs = [i]
	var rg = null
	if k.type != "coin" and k.flt:
		rg = Line2D.new()
		var pts = PackedVector2Array()
		for q in 33:
			var a = q / 32.0 * TAU
			pts.append(Vector2(cos(a), sin(a)) * 34)
		rg.points = pts; rg.width = 2.5; rg.default_color = Color(1, 1, 1, .55); rg.z_index = zi(D.picks)
		act_root.add_child(rg)
		objs.append(rg)
	var gl = null
	if big:
		gl = gI(k.x, k.y, 240, DB.PICK[k.type].col, .35); gl.z_index = zi(D.picks - .1); act_root.add_child(gl)
		objs.append(gl)
	return {root=i, i=i, ring=rg, big=big, gl=gl, objs=objs}

func updPickView(k, v) -> void:
	var y: float = k.y + (sin(lvT * 3 + k.x * .01) * 8 if k.flt else 0.0)
	var blink: bool = not k.flt and k.life < 3 and int(k.life * 8) % 2 == 1
	v.i.position = Vector2(k.x, y)
	v.i.visible = not blink
	if k.type == "coin":
		v.i.scale = Vector2(max(.15, absf(cos(lvT * 4 + k.x))), 1)
	if v.ring != null:
		v.ring.position = Vector2(k.x, y)
		v.ring.scale = Vector2.ONE * ((34 + sin(lvT * 4 + k.x) * 4) / 34.0) * (1.5 if v.big else 1.0)
	if v.gl != null:
		v.gl.position = Vector2(k.x, y)
		v.gl.modulate.a = .3 + .1 * sin(lvT * 3)
	lightW(k.x, k.y, 110, .55)

func mkBoxView(b) -> Dictionary:
	var t: String = curTh()
	var i = spr(act_root, "crate_" + t, b.x, FY + 2, .5, 1, D.crates)
	var g = gI(b.x, FY - 62, 60, "#5ce1ff", .5); g.z_index = zi(D.crates + .5); act_root.add_child(g)
	var cr = Line2D.new()
	cr.points = PackedVector2Array([Vector2(b.x - 30, FY - 90), Vector2(b.x - 6, FY - 60), Vector2(b.x - 20, FY - 30)])
	cr.width = 3; cr.default_color = Color(0, 0, 0, .6); cr.z_index = zi(D.crates); cr.visible = false
	act_root.add_child(cr)
	return {root=i, i=i, g=g, cr=cr, objs=[i, g, cr]}

func updBoxView(b, v) -> void:
	v.g.modulate.a = .45 + .2 * sin(lvT * 3 + b.x)
	v.i.material = MAT_FLASH if b.flash > 0 else null
	v.cr.visible = b.hp < 2
	lightW(b.x, FY - 60, 110, .35)

func bubble(parent: Node, size: int, fg: String, bg: Color, wrap: float) -> Label:
	var l = labelN(parent, "", size, fg, DB.font_u6)
	var sb = StyleBoxFlat.new()
	sb.bg_color = bg
	sb.content_margin_left = 18; sb.content_margin_right = 18; sb.content_margin_top = 12; sb.content_margin_bottom = 12
	l.add_theme_stylebox_override("normal", sb)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(wrap, 0)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.visible = false
	return l

func mkNPCView(n) -> Dictionary:
	var s = bossSprite("claude", 3, D.player - .5)
	var gl = gI(0, 0, 220, "#ffb08a", .25); gl.z_index = zi(D.player - .6); act_root.add_child(gl)
	var sh = shadowObj()
	var bub = bubble(top_layer, 26, "#fff3e6", Color(46 / 255.0, 20 / 255.0, 12 / 255.0, .9), 600)
	return {root=s, spr=s, gl=gl, sh=sh, bub=bub, objs=[s, gl, sh, bub]}

func updNPCView(n, v) -> void:
	var bob = sin(lvT * 2.2) * 7
	var y: float = n.y + bob
	var talk: bool = n.near and n.line != ""
	setFrame(v.spr, ("talk1" if int(lvT * 4) % 2 else "talk0") if talk else ("idle1" if int(lvT * 2) % 2 else "idle0"))
	v.spr.position = Vector2(n.x, y)
	v.spr.flip_h = n.face < 0
	v.gl.position = Vector2(n.x, y - 90)
	v.gl.modulate.a = .2 + .06 * sin(lvT * 3)
	setShadow(v.sh, n.x, 40 * (1 - bob / 60.0), GY)
	if talk:
		var t: String = "CLAUDE  ·  " + n.line
		if v.bub.text != t:
			v.bub.text = t
			v.bub.size = Vector2(600, 0)
		v.bub.visible = true
		v.bub.reset_size()
		place(v.bub, clampf(n.x, cam + 330, cam + W - 330), y - 300, .5, 1)
		v.bub.modulate.a = min(1.0, v.bub.modulate.a + .12)
	else:
		v.bub.visible = false
		v.bub.modulate.a = 0.0
	lightW(n.x, y - 90, 260, .8)

func mkAllyView(a) -> Dictionary:
	var s = bossSprite("sable", 2.9, D.player - .3)
	var sh = shadowObj()
	var gl = gI(0, 0, 240, "#5ce1d8", .18); gl.z_index = zi(D.player - .4); act_root.add_child(gl)
	var bub = bubble(top_layer, 24, "#e8fffb", Color(8 / 255.0, 36 / 255.0, 40 / 255.0, .9), 440)
	return {root=s, spr=s, sh=sh, gl=gl, bub=bub, objs=[s, sh, gl, bub]}

func updAllyView(a, v) -> void:
	var fr: String
	if a.state == "wind":
		fr = "wind"
	elif a.state == "swing":
		fr = "swing"
	elif a.state in ["leap", "drop", "leave"]:
		fr = "leap"
	else:
		fr = idleFrame(a, a.state == "run")
	setFrame(v.spr, fr)
	v.spr.position = Vector2(a.x, a.y)
	v.spr.flip_h = a.face < 0
	v.spr.modulate.a = max(0.0, 1 + a.oy / 700.0) if a.state == "leave" else 1.0
	setShadow(v.sh, a.x, 40, FY)
	v.gl.position = Vector2(a.x, a.y - 110)
	if a.lt > 0 and a.line != "":
		var t: String = "SABLE  ·  " + a.line
		if v.bub.text != t:
			v.bub.text = t
		v.bub.visible = true
		v.bub.reset_size()
		place(v.bub, clampf(a.x, cam + 240, cam + W - 240), a.y - 250, .5, 1)
		v.bub.modulate.a = min(1.0, a.lt * 2)
	else:
		v.bub.visible = false
	lightW(a.x, a.y - 100, 240, .6)

# ---------- overlay: health bars, warning marks, hazards ----------
func _draw_bars() -> void:
	var g = bars_node
	for q in BARS:
		var e = q[0]
		var y: float = q[1]
		var w: float = max(70.0, e.w + 20)
		var x: float = e.x - w / 2.0
		var f: float = max(0.0, e.hp / e.max)
		var oc: bool = e.get("oc", false)
		g.draw_rect(Rect2(x - 2, y - 2, w + 4, 12), Color(5 / 255.0, 4 / 255.0, 12 / 255.0, .75))
		if oc:
			g.draw_rect(Rect2(x - 4, y - 4, w + 8, 16), Color(1, .82, .3, .55 + .25 * sin(lvT * 6)), false, 2)
		g.draw_rect(Rect2(x, y, w * f, 8), C("#ffcc3a") if oc else C("#ff3d6e"))
		g.draw_rect(Rect2(x, y, w * f, 2), Color(1, 1, 1, .35))

func _draw_hza() -> void:
	var ha = hza_node
	for l in OVL:
		ha.draw_line(Vector2(l[0], l[1]), Vector2(l[2], l[3]), Color8(255, 61, 90, int(255 * l[4] * .35)), 10)
		ha.draw_line(Vector2(l[0], l[1]), Vector2(l[2], l[3]), Color8(255, 208, 216, int(255 * l[4])), 3)
	for h in hz:
		if h.kind == "fire":
			var a: float = min(1.0, h.act * 1.5)
			_ellipse(ha, h.x, FY - 4, h.w * .6, 17, C("#ff6418", .35 * a))
		elif h.kind == "quake":
			var a: float = min(1.0, h.act * 2)
			_ellipse(ha, h.x, FY - 20, 70, 40, C("#ffb347", .5 * a))
		elif h.kind == "pillar" and h.t <= 0:
			var a: float = min(1.0, h.act / .2)
			ha.draw_rect(Rect2(h.x - h.w / 2.0, 0, h.w, GY), C("#ff3d6e", .35 * a))
			ha.draw_rect(Rect2(h.x - h.w * .18, 0, h.w * .36, GY), C("#ffd0dc", .8 * a))
		elif h.kind == "beam" and h.t <= 0:
			var a: float = min(1.0, h.act / .2)
			ha.draw_rect(Rect2(cam - 50, h.y - 38, W + 100, 76), C("#ff3d6e", a))
			ha.draw_rect(Rect2(cam - 50, h.y - 10, W + 100, 20), Color(1, 1, 1, a))

func _ellipse(n: Node2D, x: float, y: float, rx: float, ry: float, c: Color) -> void:
	var pts = PackedVector2Array()
	for i in 24:
		var a = i / 24.0 * TAU
		pts.append(Vector2(x + cos(a) * rx, y + sin(a) * ry))
	n.draw_colored_polygon(pts, c)

func _draw_hz() -> void:
	var hg = hz_node
	var ti = 0
	for h in hz:
		match h.kind:
			"rock":
				if h.t > 0:
					_ellipse(hg, h.x, FY + 4, 75, 15, C("#ff8a3a", .22 + .2 * sin(lvT * 24)))
					if h.t < .4:
						var y: float = FY - 30 - (h.t / .4) * 900
						hg.draw_circle(Vector2(h.x, y), 32, C("#1a1418"))
						hg.draw_circle(Vector2(h.x, y), 30, C("#5a4c44"))
						hg.draw_circle(Vector2(h.x - 8, y - 8), 10, C("#8a7a6a"))
			"fire":
				var a: float = min(1.0, h.act * 1.5)
				for i in 3:
					var fx: float = h.x - h.w * .35 + i * h.w * .35
					var fh: float = (26 + sin(lvT * 14 + i * 2 + h.x) * 10) * a
					hg.draw_colored_polygon(PackedVector2Array([Vector2(fx - 12, FY), Vector2(fx + 12, FY), Vector2(fx, FY - fh)]), C("#ffb040", .85 * a))
				lightW(h.x, FY - 30, 180, .6 * a)
			"quake":
				var a: float = min(1.0, h.act * 2)
				var pts = PackedVector2Array([Vector2(h.x - 34, FY)])
				for i in 5:
					pts.append(Vector2(h.x - 34 + i * 17, FY - (46 if i % 2 else 18)))
				pts.append(Vector2(h.x + 34, FY))
				hg.draw_colored_polygon(pts, C("#fff0c8", a))
				lightW(h.x, FY - 20, 180, .8)
			"pillar":
				if h.t > 0:
					_ellipse(hg, h.x, GY + 6, h.w / 2.0, 18, C("#ff3d6e", .25 + .25 * sin(lvT * 30)))
				else:
					lightW(h.x, GY - 300, 420, 1)
			"beam":
				if h.t > 0:
					var al = .35 + .3 * sin(lvT * 24)
					var x = cam - 50
					while x < cam + W + 50:
						hg.draw_line(Vector2(x, h.y), Vector2(x + 30, h.y), C("#ff3d6e", al), 4)
						x += 50
					if ti < hzT.size():
						var t = hzT[ti]
						ti += 1
						t.text = "▲ JUMP" if h.low else "▼ STAY LOW"
						t.visible = true
						t.modulate.a = min(1.0, al + .3)
						place(t, cam + W / 2.0, h.y - 50, .5, 1)
				else:
					var x = 0.0
					while x < W:
						lightS(x + 150, h.y - camY, 260, .8)
						x += 300
	for i in range(ti, hzT.size()):
		hzT[i].visible = false

func ovUpdate() -> void:
	bars_node.queue_redraw()
	hz_node.queue_redraw()
	hza_node.queue_redraw()
	for i in marks.size():
		if i < MARKS.size():
			marks[i].visible = true
			place(marks[i], MARKS[i][0], MARKS[i][1], .5, 1)
		else:
			marks[i].visible = false
	for i in WG.size():
		if i < WGL.size():
			var w: Array = WGL[i]
			WG[i].position = Vector2(w[0], w[1])
			WG[i].modulate = C(w[2], .5 + .3 * sin(lvT * 30))
		else:
			WG[i].modulate.a = 0.0

## the whole actor pass, once per rendered frame
func actorsUpdate(dt: float) -> void:
	FRAME += 1
	BARS = []; MARKS = []; WGL = []
	corpseView(dt)
	updPlayerView(dt)
	sync(en, mkEnemyView, updEnemyView)
	if boss != null and not boss.dead:
		if boss.guard != null:
			sync([boss], mkGuardView, updGuardView)
		else:
			sync([boss], mkBossV, updBossV)
	if npc != null and G.state != "menu":
		sync([npc], mkNPCView, updNPCView)
	if ally != null:
		sync([ally], mkAllyView, updAllyView)
	sync(shots, mkShotView, updShotView)
	sync(picks, mkPickView, updPickView)
	sync(boxes, mkBoxView, updBoxView)
	sweepViews()
	ovUpdate()
	OVL = []

func render(dt: float) -> void:
	var sm: float = float(PREFS.get("shake", 1.0))
	var sx = (randf() - .5) * shake * 2 * sm if shake > 0 else 0.0
	var sy = (randf() - .5) * shake * 2 * sm if shake > 0 else 0.0
	var k = 1.0 + kz
	cam2d.zoom = Vector2(k, k)
	cam2d.position = Vector2(round(cam + sx + W / 2.0 * (1 - 1 / k)), round(camY + sy + H / 2.0 * (1 - 1 / k)))
	bgUpdate(dt)
	roomUpdate(dt)
	actorsUpdate(dt)
	drawSkyFx()
	applyLighting()
