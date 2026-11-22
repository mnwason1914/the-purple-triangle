class_name GameAudio
extends Node
## Sound: the web version's synthesised sounds, recorded to WAV (assets/audio). A few sounds have
## variants (name_0, name_1 …) picked at random; music and ambience loop.

var sfx_on := true
var music_on := true
var _pool: Array[AudioStreamPlayer] = []
var _next := 0
var _music: AudioStreamPlayer
var _amb: AudioStreamPlayer
var _streams: Dictionary = {}
var _theme := ""
var _amb_kind := ""


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in range(10):
		var p := AudioStreamPlayer.new()
		add_child(p)
		_pool.append(p)
	_music = AudioStreamPlayer.new()
	_music.volume_db = -9.0  # finished tracks are mastered loud; keep them under the effects
	add_child(_music)
	_amb = AudioStreamPlayer.new()
	add_child(_amb)


func _stream(name: String, looped := false) -> AudioStream:
	if not _streams.has(name):
		# music comes as MP3 (Google Flow Music), sound effects as WAV
		var path := "res://assets/audio/%s.mp3" % name
		if not ResourceLoader.exists(path):
			path = "res://assets/audio/%s.wav" % name
		var s: AudioStream = load(path) if ResourceLoader.exists(path) else null
		if s is AudioStreamMP3:
			(s as AudioStreamMP3).loop = looped
		if s is AudioStreamWAV and looped:
			var wv := s as AudioStreamWAV
			wv.loop_mode = AudioStreamWAV.LOOP_FORWARD
			wv.loop_begin = 0
			wv.loop_end = int(wv.get_length() * wv.mix_rate)
		_streams[name] = s
	return _streams[name]


func _variant(name: String) -> AudioStream:
	var s := _stream(name)
	if s:
		return s
	var n := 0
	while ResourceLoader.exists("res://assets/audio/%s_%d.wav" % [name, n]) or ResourceLoader.exists("res://assets/audio/%s_%d.mp3" % [name, n]):
		n += 1
	if n == 0:
		return null
	return _stream("%s_%d" % [name, randi() % n])


func play(name: String, vol := 1.0) -> void:
	if not sfx_on:
		return
	var s := _variant(name)
	if s == null:
		return
	var p := _pool[_next]
	_next = (_next + 1) % _pool.size()
	p.stream = s
	p.volume_db = linear_to_db(clampf(vol, 0.01, 1.5))
	p.pitch_scale = randf_range(0.94, 1.1) if name == "blip" else 1.0
	p.play()


func music(theme: String) -> void:
	if theme == "none" or not music_on:
		_theme = theme if theme != "none" else ""
		_music.stop()
		return
	if theme == _theme and _music.playing:
		return
	_theme = theme
	var s := _stream("bgm_" + theme, theme != "ending")
	if s == null:
		_music.stop()
		return
	_music.stream = s
	_music.play()


func set_music_on(on: bool) -> void:
	music_on = on
	if not on:
		var t := _theme
		music("none")
		_theme = t
	elif _theme != "":
		var t := _theme
		_theme = ""
		music(t)


func ambience(kind: String) -> void:
	if kind == _amb_kind:
		return
	_amb_kind = kind
	if kind == "none" or kind == "":
		_amb.stop()
		return
	var s := _stream("amb_" + kind, true)
	if s == null:
		_amb.stop()
		return
	_amb.stream = s
	_amb.play()
