extends Control
## Touch controls: a floating thumbstick on the left half, an arc of action buttons on the right.
## Thumbs can slide from one button onto another, like the web version.

var g   # the game (g4_main)
var touches = {}   # index -> {kind:"stick"/"btn"/"none", btn:String, pos:Vector2}
var stick = {id=-1, o=Vector2.ZERO, d=Vector2.ZERO}

const ICONS := {
	special=[[[12, 2.5], [14.3, 9.1], [21, 9.1], [15.6, 13.2], [17.7, 19.8], [12, 15.8], [6.3, 19.8], [8.4, 13.2], [3, 9.1], [9.7, 9.1], [12, 2.5]]],
	dash=[[[5, 6], [11, 12], [5, 18]], [[12, 6], [18, 12], [12, 18]]],
	attack=[[[19.5, 3], [21, 3], [21, 4.5], [10, 15.5], [8.5, 14], [19.5, 3]], [[5.5, 12.5], [11.5, 18.5]], [[7.8, 16.2], [4, 20]]],
	arm=[[[12, 3], [19, 6], [19, 12], [16.5, 17.5], [12, 21], [7.5, 17.5], [5, 12], [5, 6], [12, 3]]],
	jump=[[[6, 13], [12, 7], [18, 13]], [[6, 18.5], [12, 12.5], [18, 18.5]]],
}

func _btns() -> Dictionary:
	var W: float = g.W
	var H = 1080.0
	var b = {
		attack={c=Vector2(W - 156.5, 923.5), d=227.0, col=Color("#ff8a4c"), show=true},
		jump={c=Vector2(W - 383.5, 966.5), d=173.0, col=Color("#b48cff"), show=true},
		dash={c=Vector2(W - 343, 780), d=146.0, col=Color("#b48cff"), show=g.hasAb("dash")},
		special={c=Vector2(W - 143.5, 693.5), d=157.0, col=Color("#5ce1ff"), show=g.hasAb("roar")},
		arm={c=Vector2(W - 570, 921), d=146.0, col=Color("#ffcc4a"), show=_ownAny()},
	}
	if b.arm.show:
		b.arm.col = Color(DB.ARMS[int(g.META.arm)].col) if g.ownArm(int(g.META.arm)) else b.arm.col
	return b

func _ownAny() -> bool:
	for i in DB.ARMS.size():
		if g.ownArm(i):
			return true
	return false

func _pauseRect() -> Rect2:
	return Rect2(g.W - 157, 31, 120, 120)

func _armcRect() -> Rect2:
	return Rect2(g.W - 443 - 330, 1080 - 248 - 64, 330, 64)

func reset() -> void:
	touches.clear()
	stick.id = -1
	stick.d = Vector2.ZERO
	queue_redraw()

func _which(pos: Vector2) -> String:
	var bs = _btns()
	var best = ""
	var bd = 1e9
	for k in bs:
		var b: Dictionary = bs[k]
		if not b.show:
			continue
		var d: float = pos.distance_to(b.c)
		if d < b.d * .62 and d < bd:
			bd = d
			best = k
	return best

func _input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventScreenTouch:
		var pos: Vector2 = event.position
		if event.pressed:
			if _pauseRect().grow(20).has_point(pos):
				g.togglePause()
				get_viewport().set_input_as_handled()
				return
			if _ownAny() and _armcRect().grow(10).has_point(pos):
				g.P["armc"] = 1
				get_viewport().set_input_as_handled()
				return
			var b = _which(pos)
			if b != "":
				touches[event.index] = {kind="btn", btn=b}
			elif pos.x < g.W * .46 and pos.y > 1080 * .24 and stick.id < 0:
				touches[event.index] = {kind="stick", btn=""}
				stick.id = event.index
				var half = 162.0
				stick.o = Vector2(clampf(pos.x, half, g.W * .46 - half), clampf(pos.y, 1080 * .24 + half, 1080 - half))
				stick.d = pos - stick.o
			else:
				touches[event.index] = {kind="none", btn=""}
		else:
			if touches.has(event.index) and touches[event.index].kind == "stick":
				stick.id = -1
				stick.d = Vector2.ZERO
			touches.erase(event.index)
		_apply()
		get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag:
		if not touches.has(event.index):
			return
		var t: Dictionary = touches[event.index]
		if t.kind == "stick":
			stick.d = event.position - stick.o
		else:
			var b = _which(event.position)
			if b != "" or t.kind == "btn":
				t.kind = "btn" if b != "" else "none"
				t.btn = b
		_apply()
		get_viewport().set_input_as_handled()

func _apply() -> void:
	var held = {}
	for i in touches:
		var t: Dictionary = touches[i]
		if t.kind == "btn" and t.btn != "":
			held[t.btn] = true
	for k in ["attack", "jump", "dash", "special", "arm"]:
		g.padPress(k, held.has(k))
	var r = 136.0
	var n = clampf(stick.d.x / r, -1, 1)
	var m = clampf(stick.d.y / r, -1, 1)
	g.padPress("left", stick.id >= 0 and n < -.28)
	g.padPress("right", stick.id >= 0 and n > .28)
	g.padPress("down", stick.id >= 0 and m > .55)
	queue_redraw()

func _poly(pts: Array, c: Vector2, s: float, col: Color, w: float, fill := false) -> void:
	var out = PackedVector2Array()
	for p in pts:
		out.append(c + (Vector2(p[0], p[1]) - Vector2(12, 12)) * s)
	if fill and out.size() > 3:
		draw_colored_polygon(out, col)
	draw_polyline(out, col, w, true)

func _draw() -> void:
	if not visible or g == null:
		return
	var held = {}
	for i in touches:
		var t: Dictionary = touches[i]
		if t.kind == "btn" and t.btn != "":
			held[t.btn] = true
	# thumbstick
	var base: Vector2 = stick.o if stick.id >= 0 else Vector2(216, 853)
	var live: bool = stick.id >= 0
	var a = 1.0 if live else .38
	draw_circle(base, 162, Color(12 / 255.0, 10 / 255.0, 30 / 255.0, .38 * a))
	draw_circle(base, 110, Color(92 / 255.0, 225 / 255.0, 1, .06 * a))
	draw_arc(base, 162, 0, TAU, 64, Color(236 / 255.0, 231 / 255.0, 1, .26 * a), 4, true)
	for sd in [-1, 1]:
		var tip = base + Vector2(sd * 135, 0)
		draw_colored_polygon(PackedVector2Array([tip, tip + Vector2(-sd * 22, -16), tip + Vector2(-sd * 22, 16)]), Color(236 / 255.0, 231 / 255.0, 1, .55 * a))
	var kn = base + Vector2(clampf(stick.d.x / 136.0, -1, 1) * 136, clampf(stick.d.y / 136.0, -1, 1) * 136 * .7) if live else base
	draw_circle(kn, 74, Color(36 / 255.0, 78 / 255.0, 140 / 255.0, a))
	draw_circle(kn, 60, Color(92 / 255.0, 225 / 255.0, 1, a))
	draw_circle(kn - Vector2(14, 16), 26, Color(200 / 255.0, 243 / 255.0, 1, a))
	# action buttons
	var bs = _btns()
	var p = g.pl
	for k in bs:
		var b: Dictionary = bs[k]
		if not b.show:
			continue
		var on: bool = held.has(k)
		var r: float = b.d / 2.0 * (.88 if on else 1.0)
		var op = 1.0 if on else .62
		if k == "special" and p != null and p.en >= 50:
			op = .95
		var fillc = Color(140 / 255.0, 60 / 255.0, 40 / 255.0, .6) if k == "attack" else Color(70 / 255.0, 58 / 255.0, 128 / 255.0, .55)
		fillc.a *= op
		if on:
			draw_circle(b.c, r + 16, Color(b.col.r, b.col.g, b.col.b, .25))
		draw_circle(b.c, r, fillc)
		var bc: Color = Color.WHITE if on else (b.col if k in ["attack", "arm"] else Color(236 / 255.0, 231 / 255.0, 1, .3))
		bc.a *= op if not on else 1.0
		draw_arc(b.c, r, 0, TAU, 64, bc, 5, true)
		if p != null and k == "special":
			var e: float = clampf(p.en / 100.0, 0, 1)
			draw_arc(b.c, r + 12, -PI / 2, -PI / 2 + TAU, 64, Color(236 / 255.0, 231 / 255.0, 1, .13), 9, true)
			if e > 0:
				draw_arc(b.c, r + 12, -PI / 2, -PI / 2 + TAU * e, 64, Color("#5ce1ff"), 9, true)
		if p != null and k == "dash":
			var cd: float = clampf(1 - p.dashCD / .75, 0, 1)
			draw_arc(b.c, r + 12, -PI / 2, -PI / 2 + TAU, 64, Color(236 / 255.0, 231 / 255.0, 1, .13), 9, true)
			if cd > 0:
				draw_arc(b.c, r + 12, -PI / 2, -PI / 2 + TAU * cd, 64, Color("#b48cff"), 9, true)
		var ic = Color("#ffe0cc") if k == "attack" else Color("#c8f6ff") if k == "special" else Color("#ddd0ff") if k == "dash" else b.col if k == "arm" else Color("#ece7ff")
		ic.a = op
		var s: float = b.d * .46 / 24.0
		var paths: Array = ICONS[k]
		for i in paths.size():
			var cc = ic
			if k == "jump" and i == 1:
				cc.a *= .55
			_poly(paths[i], b.c, s, cc, 2.2 * s * 1.6, k == "special" and p != null and p.en >= 50)
	# arm label and pause
	if _ownAny() and g.ownArm(int(g.META.arm)):
		var A: Dictionary = DB.ARMS[int(g.META.arm)]
		var rc = _armcRect()
		var txt = "%s · %d" % [A.name, A.cost]
		var f: Font = DB.font_u
		var tw = f.get_string_size(txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 30).x
		var box = Rect2(rc.end.x - tw - 40, rc.position.y, tw + 40, rc.size.y)
		draw_rect(box, Color(12 / 255.0, 10 / 255.0, 30 / 255.0, .66))
		draw_rect(box, Color(A.col), false, 4)
		draw_string(f, Vector2(box.position.x + 20, box.position.y + 43), txt, HORIZONTAL_ALIGNMENT_LEFT, -1, 30, Color(A.col))
	var pr = _pauseRect()
	draw_rect(pr, Color(12 / 255.0, 10 / 255.0, 30 / 255.0, .5))
	draw_rect(pr, Color(236 / 255.0, 231 / 255.0, 1, .3), false, 4)
	draw_rect(Rect2(pr.position.x + 42, pr.position.y + 36, 12, 48), Color("#ece7ff"))
	draw_rect(Rect2(pr.position.x + 66, pr.position.y + 36, 12, 48), Color("#ece7ff"))
