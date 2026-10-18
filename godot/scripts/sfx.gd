extends Node
## Autoload "Sfx": sound effects (rendered from the original synth) and the streamed soundtrack
## (music by Tanner Helland, CC BY 4.0).

var vol_music := 0.5
var vol_sfx := 0.9
var _streams := {}
var _pool: Array[AudioStreamPlayer] = []
var _next := 0
var _cd := {}
var _recent: Array[float] = []
var _t := 0.0
# music
var _m: Array[AudioStreamPlayer] = []
var _mv := [0.0, 0.0]
var _cur := -1
var _curName := ""
var _fadeRate := [1.4, 1.4]
var duck := 1.0
var duckT := 0.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in 18:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_pool.append(p)
	for i in 2:
		var p := AudioStreamPlayer.new()
		add_child(p)
		_m.append(p)

func set_volumes(m: float, s: float) -> void:
	vol_music = m
	vol_sfx = s

func _stream(name: String) -> AudioStream:
	if not _streams.has(name):
		var p := "res://assets/sfx/%s.ogg" % name
		_streams[name] = load(p) if ResourceLoader.exists(p) else null
	return _streams[name]

func play(name: String, vol := 1.0, gap := 0.04, pitch := 1.0, pan := 0.0) -> void:
	if vol_sfx <= 0.001:
		return
	if _cd.has(name) and _t - _cd[name] < gap:
		return
	_cd[name] = _t
	while _recent.size() and _t - _recent[0] > 0.08:
		_recent.pop_front()
	if _recent.size() > 14:
		return
	_recent.append(_t)
	var s := _stream(name)
	if s == null:
		return
	var p := _pool[_next]
	_next = (_next + 1) % _pool.size()
	p.stream = s
	p.volume_db = linear_to_db(max(0.0001, vol * vol_sfx))
	p.pitch_scale = pitch
	p.play()

func _process(delta: float) -> void:
	_t += delta
	var dt: float = min(0.1, delta)
	duckT = max(0.0, duckT - dt)
	var tgt := vol_music * duck * (0.25 if duckT > 0.0 else 1.0)
	for i in 2:
		var p := _m[i]
		if i == _cur:
			_mv[i] += (tgt - _mv[i]) * min(1.0, dt * 2.5)
		else:
			_mv[i] -= dt * _fadeRate[i] * max(0.3, _mv[i])
			if _mv[i] <= 0.01:
				_mv[i] = 0.0
				if p.playing:
					p.stop()
		p.volume_db = linear_to_db(max(0.0001, _mv[i]))

func music(name: String) -> void:
	if name == _curName and _cur >= 0:
		return
	var path := "res://assets/music/%s.ogg" % name
	if not ResourceLoader.exists(path):
		return
	var st = load(path)
	if st is AudioStreamOggVorbis:
		st.loop = name != "victory"
	var i := 0 if _cur != 0 else 1
	if _cur >= 0:
		_fadeRate[_cur] = 1.4
	_cur = i
	_curName = name
	_mv[i] = 0.0
	_m[i].stream = st
	_m[i].volume_db = -80
	_m[i].play()

func music_stop(fade := 1.0) -> void:
	if _cur >= 0:
		_fadeRate[_cur] = 1.0 / max(0.2, fade)
	_cur = -1
	_curName = ""

func duck_for(sec: float) -> void:
	duckT = sec
