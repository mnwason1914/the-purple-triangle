class_name Game
extends Node
## First-person game shell (port of src/fps/game.ts): loop, player movement and posture,
## footstep noise, crosshair interaction, countdown, barks, NPC walkers and the menus.
## Chapter scripts drive it through the small API in the "script API" section. Game logic runs on
## the 2D map (x, y); the 3D view only draws it.

signal _never

const SAVE_PATH := "user://save.json"
const SETTINGS_PATH := "user://settings.json"
const NAMES := {"paul": "파울", "helena": "헬레나", "leni": "레니", "otto": "오토 베커", "police": "순경", "police2": "순경", "radio": "라디오", "uncle": "이모부"}
const FACE_OF := {"paul": "hud_paul_calm", "helena": "face_helena", "leni": "face_leni", "otto": "face_otto", "police": "face_police", "police2": "face_police"}
const ITEM_ART := {"wt": "obj_watchtower", "pot": "obj_coffeepot", "mimeo": "obj_mimeograph", "booklets": "obj_booklets", "screwdriver": "obj_screwdriver"}

var ui: GameUI
var audio: GameAudio
var chapter: Chapter1
var level: Level
var world: Node3D
var level_mesh: MeshInstance3D
var cam: Camera3D
var settings := {"sfx": true, "music": true, "saver": false, "text_speed": 1.0, "haptic": true}
var state := "title"   # title | play | pause | end
var flags: Dictionary = {}
var checkpoint_id := ""
var epoch := 0

# player
var px := 7.0
var py := 8.0
var pa := -PI / 2
var pitch := 0.0
var eye := 0.71
var crouch := false
var holding := ""
var move_lock := true
var look_lock := false
var hands_on := true
var composure := 80.0
var sprites: Array = []
var actors: Array = []
var solids: Array = []
var targets: Array = []
var aim: Dictionary = {}
var busy := false
var timer := {"left": 0.0, "running": false, "paused": false, "shown": -1, "on_end": Callable(), "marks": []}
var noise_cd := 0.0
var on_noise: Callable
var progress := ""
var flash_t := 0.0

var _step_acc := 0.0
var _bob := 0.0
var _hold_t := 0.0
var _hold_id := ""
var _bark_q: Array = []
var _bark_t := 0.0
var _bark_cur := {"thought": false}
var _title_t := 0.0
var _portrait_ok := false

# input
var _keys := {}
var _prev_keys := {}
var _tap_q := false
var _pause_q := false
var _crouch_q := false
var _look_d := Vector2.ZERO
## iOS Safari gives touches large identifiers that can arrive negative, so "no finger" must be a
## value no identifier can take (identifiers are 32-bit).
const NO_TOUCH := -9223372036854775807

var _stick_id := NO_TOUCH
var _stick_o := Vector2.ZERO
var _stick_v := Vector2.ZERO
var _stick_mag := 0.0
var _look_id := NO_TOUCH
var _look_last := Vector2.ZERO
var _act_id := NO_TOUCH
var _mouse_look := false
var _mouse_act := false
var _prev_act := false
var in_move := Vector2.ZERO
var in_turn := 0.0
var in_run := false
var in_act := false
var in_act_pressed := false
var in_any := false


func _ready() -> void:
	Art.init()
	_load_settings()
	ui = GameUI.new()
	add_child(ui)
	audio = GameAudio.new()
	add_child(audio)
	ui.blip = func(): audio.play("blip")
	ui.button.connect(_on_button)
	world = Node3D.new()
	ui.sub.add_child(world)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sm := ProceduralSkyMaterial.new()
	sm.sky_top_color = Color("8fb4d6")
	sm.sky_horizon_color = Color("d8e6ea")
	sm.ground_horizon_color = Color("d8e6ea")
	sm.ground_bottom_color = Color("8a9cb4")
	sm.sun_angle_max = 0.0
	sm.sky_energy_multiplier = 1.0
	sky.sky_material = sm
	e.sky = sky
	e.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.environment = e
	ui.sub.add_child(env)
	cam = Camera3D.new()
	cam.near = 0.04
	cam.far = 40.0
	cam.fov = 46.0
	ui.sub.add_child(cam)
	chapter = Chapter1.new()
	_apply_settings()
	ui.set_touch_mode(_is_mobile_web())
	_setup_js_touch()
	get_viewport().size_changed.connect(_on_resize)
	_on_resize()
	to_title()
	if OS.has_feature("web"):
		var q = JavaScriptBridge.eval("new URLSearchParams(location.search).get('cp') || ''", true)
		if q is String and q != "":
			flags = {}
			_begin(q)
			# test view: ?at=x,y,angle_degrees puts the player there after the checkpoint loads
			var at = JavaScriptBridge.eval("new URLSearchParams(location.search).get('at') || ''", true)
			if at is String and at.count(",") == 2:
				var p: PackedStringArray = at.split(",")
				await get_tree().create_timer(0.3, false).timeout
				place(float(p[0]), float(p[1]), deg_to_rad(float(p[2])))
	if OS.get_cmdline_user_args().has("--bot"):
		var bot = load("res://scripts/bot.gd").new()
		add_child(bot)


func _is_mobile_web() -> bool:
	if not OS.has_feature("web"):
		return false
	var r = JavaScriptBridge.eval("(matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || location.search.includes('touch')) ? 1 : 0", true)
	return int(r) == 1


func _on_resize() -> void:
	var s := get_viewport().get_visible_rect().size
	var portrait := s.y > s.x * 1.05 and ui._touch_mode
	ui.rotate_box.visible = portrait and not _portrait_ok
	# keep the web version's framing: horizontal plane 0.42 * W / H, clamped
	var aspect := s.x / maxf(1.0, s.y)
	var plane := clampf(0.42 * aspect, 0.62, 1.0)
	cam.fov = rad_to_deg(2.0 * atan(plane / aspect))


# ================================================================ flow
func new_game() -> void:
	_save_clear()
	flags = {}
	_begin(chapter.FIRST)


func continue_game() -> void:
	var s := _save_load()
	if s.is_empty():
		new_game()
		return
	flags = s.flags.duplicate()
	_begin(s.checkpoint)


func _begin(cp: String) -> void:
	state = "play"
	ui.screen("")
	reset()
	chapter.start(self, cp)


## Fresh world and player (keeps flags). Running chapter coroutines are cut off.
func reset() -> void:
	epoch += 1
	for s in sprites:
		s.free_node()
	sprites = []
	actors = []
	solids = []
	targets = []
	level = Level.new()
	holding = ""
	crouch = false
	pitch = 0.0
	move_lock = true
	look_lock = false
	hands_on = true
	timer = {"left": 0.0, "running": false, "paused": false, "shown": -1, "on_end": Callable(), "marks": []}
	busy = false
	aim = {}
	_bark_q = []
	_bark_t = 0.0
	ui.hide_bark()
	on_noise = Callable()
	progress = ""
	flash_t = 0.0
	ui.close_dialog()
	ui.pick(-1)
	ui.hide_card()
	ui.action("", 0)
	ui.objective("")
	ui.fade_now(false)
	hud(false)
	get_tree().paused = false


func pause() -> void:
	if state != "play":
		return
	state = "pause"
	get_tree().paused = true
	ui.screen("pause")
	_release_input()


func resume() -> void:
	if state != "pause":
		return
	state = "play"
	get_tree().paused = false
	ui.screen("")


func to_title() -> void:
	state = "title"
	reset()
	chapter.title(self)
	ui.screen("title")
	ui.continue_btn.visible = not _save_load().is_empty()
	ui.screen("title")
	audio.music("title")
	audio.ambience("none")


func end(title: String, text: String) -> void:
	state = "end"
	hud(false)
	ui.action("", 0)
	timer.running = false
	_save_clear()
	ui.show_end(title, text)


func checkpoint(id: String) -> void:
	checkpoint_id = id
	save()


func save() -> void:
	if state == "title" or checkpoint_id == "":
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify({"v": 1, "checkpoint": checkpoint_id, "flags": flags, "savedAt": Time.get_unix_time_from_system()}))


func _save_load() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return {}
	var d = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(d) != TYPE_DICTIONARY or int(d.get("v", 0)) != 1 or String(d.get("checkpoint", "")) == "":
		return {}
	return d


func _save_clear() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.remove_absolute(SAVE_PATH)


func _load_settings() -> void:
	if FileAccess.file_exists(SETTINGS_PATH):
		var d = JSON.parse_string(FileAccess.get_file_as_string(SETTINGS_PATH))
		if typeof(d) == TYPE_DICTIONARY:
			for k in d:
				settings[k] = d[k]


func _store_settings() -> void:
	var f := FileAccess.open(SETTINGS_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(settings))


func _apply_settings() -> void:
	ui.set_options(settings)
	audio.sfx_on = settings.sfx
	audio.set_music_on(settings.music)
	ui.text_speed = settings.text_speed
	Engine.max_fps = 30 if settings.saver else 0


var _settings_from := "title"


func _on_button(id: String) -> void:
	audio.play("select")
	match id:
		"continue":
			continue_game()
		"new", "again":
			new_game()
		"settings":
			_settings_from = "title"
			ui.screen("settings")
		"pause_settings":
			_settings_from = "pause"
			ui.screen("settings")
		"settings_back":
			ui.screen(_settings_from)
		"opt_sfx", "opt_music", "opt_saver", "opt_haptic":
			var k := id.substr(4)
			settings[k] = not settings[k]
			_store_settings()
			_apply_settings()
		"opt_speed":
			var sp: float = settings.text_speed
			settings.text_speed = 1.0 if sp < 0.8 else 1.6 if sp < 1.2 else 0.6
			_store_settings()
			_apply_settings()
		"pause":
			if state == "play":
				save()
				pause()
		"resume":
			resume()
		"quit", "end_title":
			to_title()
		"portrait":
			_portrait_ok = true
			_on_resize()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT or what == NOTIFICATION_WM_WINDOW_FOCUS_OUT:
		_release_input()
		if state == "play" and OS.has_feature("web"):
			save()
			pause()
	elif what == NOTIFICATION_WM_CLOSE_REQUEST:
		save()


# ================================================================ script API
func flag(k: String, def = null):
	return flags.get(k, def)


func str_flag(k: String) -> String:
	return str(flags.get(k, ""))


func setf(k: String, v) -> void:
	flags[k] = v


func inc(k: String, n := 1) -> void:
	flags[k] = int(flags.get(k, 0)) + n


func sfx(n: String, v := 1.0) -> void:
	audio.play(n, v)


func haptic(ms: int) -> void:
	if settings.haptic:
		Input.vibrate_handheld(ms)


## Waits that stop for good when the game is reset (title, new game), so old scripts die quietly.
func wait(s: float) -> void:
	var e := epoch
	if s > 0.0:
		await get_tree().create_timer(s, false).timeout
	else:
		await get_tree().process_frame
	if e != epoch:
		await _never


func until(f: Callable) -> void:
	var e := epoch
	while true:
		if e != epoch:
			await _never
		if not get_tree().paused and f.call():
			return
		await get_tree().process_frame


func objective(t: String) -> void:
	ui.objective(t)


func hud(on: bool) -> void:
	ui.set_hud(on)


func fade(on: bool) -> void:
	ui.fade(on)
	await wait(0.65)


func card(html: String, hold := 2.4) -> void:
	ui.show_card(html)
	await wait(hold + 1.2)
	ui.card_out()
	await wait(1.1)


func hide_card() -> void:
	ui.hide_card()


func face(key: String) -> Texture2D:
	return Art.tex(key)


## Modal line. who: speaker key; name overrides the display name (e.g. "오토 베커 (문밖)").
func say(who: String, text: String, name := "") -> void:
	var f: String = FACE_OF.get(who, "")
	var key := face_key() if who == "paul" else f
	ui.say(name if name != "" else NAMES.get(who, who), Art.tex(key) if f != "" else null, text)
	await until(func(): return ui.line_done())


func think(text: String) -> void:
	ui.say("파울", null, text, true)
	await until(func(): return ui.line_done())


func end_talk() -> void:
	ui.close_dialog()


## Choice; with a timeout returns -1 when time runs out. Pauses the countdown while open.
func choose(opts: Array, timeout := 0.0) -> int:
	timer.paused = true
	ui.choice(opts, timeout)
	var t0 := Time.get_ticks_msec()
	var holder := {"timed_out": false}
	if timeout > 0.0:
		var e := epoch
		var run := func():
			await wait(timeout)
			if e == epoch:
				holder.timed_out = true
		run.call()
	await until(func(): return ui.choice_result() != -2 or holder.timed_out)
	var i := ui.choice_result()
	if i == -2:
		ui.pick(-1)
		i = -1
	timer.paused = false
	sfx("select")
	return i


## Non-blocking line shown over play. Resolves when it has been displayed.
func bark(who: String, text: String, secs := 2.6, name := "") -> void:
	var thought := who == "think"
	for q in _bark_q:
		if q.thought:
			q.shown = true
	_bark_q = _bark_q.filter(func(q): return not q.thought)
	var item := {"name": "" if thought else (name if name != "" else NAMES.get(who, who)), "text": text, "secs": secs, "thought": thought, "shown": false}
	_bark_q.append(item)
	await until(func(): return item.shown)


func place(x: float, y: float, a: float) -> void:
	px = x
	py = y
	pa = a
	pitch = 0.0


func sprite(name: String, x: float, y: float, z := 0.0, w := 0.0, bright := 0.0) -> Spr:
	var s := Spr.new(world, name, x, y, z, w, bright)
	sprites.append(s)
	return s


## Real 3D furniture (see prop.gd). size = (width, height, depth) in world units.
func prop(base: String, x: float, y: float, size: Vector3, facing := "s", z := 0.0, with_top := true, top_h := -1.0) -> Prop:
	var p := Prop.new(world, base, x, y, size, facing, z, with_top, top_h)
	sprites.append(p)
	return p


## Block a rectangular footprint (the walk check uses circles, so lay a row of them along it).
func solid_box(x: float, y: float, w: float, d: float) -> void:
	var r := minf(w, d) * 0.5 + 0.06
	var n := maxi(1, ceili(maxf(w, d) / (r * 1.4)))
	for i in range(n):
		var t := (i + 0.5) / n - 0.5
		if w >= d:
			solid(x + t * (w - 2.0 * r + 0.12), y, r)
		else:
			solid(x, y + t * (d - 2.0 * r + 0.12), r)


func set_tex(s: Spr, name: String) -> void:
	s.set_tex(name)


func actor(base: String, x: float, y: float) -> Actor:
	var a := Actor.new(world, base, x, y)
	actors.append(a)
	sprites.append(a)
	return a


func walk(a: Actor, pts: Array) -> void:
	a.go(pts)
	await until(func(): return not a.moving())


func remove_actor(a: Actor) -> void:
	actors.erase(a)
	sprites.erase(a)
	a.free_node()


func solid(x: float, y: float, r: float) -> Dictionary:
	var s := {"x": x, "y": y, "r": r}
	solids.append(s)
	return s


func start_timer(secs: float, on_end: Callable) -> void:
	timer.left = secs
	timer.running = true
	timer.paused = false
	timer.shown = -1
	timer.on_end = on_end


func add_time(s: float) -> void:
	timer.left = maxf(0.0, timer.left + s)
	flash_t = 0.5 if s < 0 else 0.0
	if s < 0:
		ui.do_flash(0.5)


func stop_timer() -> void:
	timer.running = false


func face_key() -> String:
	if composure >= 60:
		return "hud_paul_calm"
	if composure >= 30:
		return "hud_paul_tense"
	return "hud_paul_panic2" if (Time.get_ticks_msec() / 140) % 2 == 1 else "hud_paul_panic"


# ================================================================ loop
func _process(dt: float) -> void:
	dt = clampf(dt, 0.0, 0.1)
	_read_input()
	if _pause_q_edge and (state == "play" or state == "pause"):
		if state == "pause":
			resume()
		else:
			save()
			pause()
	ui.tick(dt)
	if state == "play":
		if ui.choosing:
			if _edge("up"):
				ui.move_choice(-1)
			if _edge("down"):
				ui.move_choice(1)
			if _edge("confirm") and not ui._touch_mode:
				ui.confirm_choice()
		elif ui.talking and in_any:
			ui.advance()
		_update_play(dt)
		_update_barks(dt)
	elif state == "title":
		_title_t += dt
		pa = -PI / 2 + sin(_title_t * 0.12) * 1.1
	if state != "pause":
		for a in actors:
			a.update(dt)
	if flash_t > 0:
		flash_t -= dt
	_render()


func _render() -> void:
	if level.dirty:
		if level_mesh:
			level_mesh.queue_free()
		level_mesh = MeshInstance3D.new()
		level_mesh.mesh = level.build_mesh()
		world.add_child(level_mesh)
	for s in sprites:
		s.sync(level)
	cam.position = Vector3(px, eye, py)
	cam.rotation = Vector3(pitch, atan2(-cos(pa), -sin(pa)), 0)
	var playing := state == "play" or state == "pause" or state == "end"
	var bob := Vector2(sin(_bob) * 2.0, absf(cos(_bob)) * 2.0)
	ui.draw_hands(playing and hands_on and ui.hud.visible, holding, bob, level.light(px, py), crouch)
	if ui.hud.visible:
		var t: Dictionary = timer
		var s := maxi(0, ceili(t.left))
		var time := "%d:%02d" % [s / 60, s % 60] if (t.running or t.left > 0) else "-:--"
		var item := Art.tex(ITEM_ART[holding]) if holding != "" else Art.tex("obj_rag")
		ui.hud_state(time, t.running and t.left <= 20, progress, Art.tex(face_key()), item, crouch)
	ui.crouch_btn.on = crouch
	ui.crouch_btn.label = Tx.t("일어서기" if crouch else "웅크리기")
	ui.crouch_btn.queue_redraw()
	ui.stick.on = _stick_id != NO_TOUCH
	ui.stick.origin = _stick_o
	ui.stick.knob = _stick_v
	ui.stick.run = _stick_mag > 0.92
	ui.stick.queue_redraw()
	ui.act.pressed = in_act
	ui._layout()


func _update_play(dt: float) -> void:
	var talking := ui.talking or ui.choosing
	var free := not talking and not move_lock
	# look
	var lk := _look_d
	_look_d = Vector2.ZERO
	if not talking and not look_lock:
		var sens := 3.2 / maxf(320.0, ui.size.x)
		pa += lk.x * sens + in_turn * 2.2 * dt
		pitch = clampf(pitch - lk.y * sens * 0.8, -0.55, 0.55)
	if _crouch_edge and free:
		crouch = not crouch
	var eye_t := 0.4 if crouch else 0.71
	eye += (eye_t - eye) * (1.0 - exp(-dt * 10.0))
	# move
	if free and in_move != Vector2.ZERO:
		var run := in_run and not crouch
		var speed := 0.85 if crouch else 2.7 if run else 1.7
		var ca := cos(pa)
		var sa := sin(pa)
		var vx := (ca * in_move.y - sa * in_move.x) * speed * dt
		var vy := (sa * in_move.y + ca * in_move.x) * speed * dt
		var ox := px
		var oy := py
		_try_move(vx, vy)
		var moved := Vector2(px - ox, py - oy).length()
		_bob += moved * 5.5
		_step_acc += moved
		if _step_acc > 0.62:
			_step_acc = 0.0
			_step(run)
	if noise_cd > 0:
		noise_cd -= dt
	# aim & act
	aim = _find_target() if (free and not busy) else {}
	var verb = aim.verb.call() if not aim.is_empty() else null
	var prog := 0.0
	if not aim.is_empty() and verb != null:
		var hold = aim.hold.call() if aim.has("hold") else null
		if hold != null:
			if in_act and (_hold_id == aim.id or in_act_pressed):
				_hold_id = aim.id
				_hold_t += dt
				prog = minf(1.0, _hold_t / hold)
				if _hold_t >= hold:
					var t := aim
					_reset_hold()
					_use(t)
			elif _hold_id != "":
				_reset_hold()
		elif in_act_pressed:
			_use(aim)
	elif _hold_id != "":
		_reset_hold()
	ui.action(verb if (not aim.is_empty() and verb != null) else "", prog)
	var label := ""
	if not aim.is_empty() and verb != null:
		label = Tx.t(aim.name) + ("" if ui._touch_mode else "   [E] " + Tx.t(verb))
	ui.aim(label)
	# countdown
	var tm: Dictionary = timer
	if tm.running and not tm.paused and not talking:
		tm.left -= dt
		var s := ceili(tm.left)
		if s != tm.shown:
			tm.shown = s
			if s <= 20 and s > 0:
				sfx("tick", 1.4 if s <= 10 else 1.0)
		for m in tm.marks.duplicate():
			if tm.left <= m.at:
				tm.marks.erase(m)
				m.fn.call()
		var drain := 0.6 if tm.left < 20 else 0.3 if tm.left < 45 else 0.08
		composure = maxf(0.0, composure - drain * dt)
		if tm.left <= 0:
			tm.left = 0.0
			tm.running = false
			var cb: Callable = tm.on_end
			tm.on_end = Callable()
			if cb.is_valid():
				cb.call()
	if tm.running and composure < 30 and randf() < dt * 1.2:
		sfx("heart", 0.6)


func _use(t: Dictionary) -> void:
	busy = true
	var e := epoch
	await t.use.call()
	if e == epoch:
		busy = false


func _reset_hold() -> void:
	_hold_t = 0.0
	_hold_id = ""


func _step(run: bool) -> void:
	var k := level.noise_coef(px, py)
	var posture := 0 if crouch else 2 if run else 1
	var region := level.region(px, py)
	var surf := "step_stone" if (region == "yard" or region == "cellar") else "step_wood"
	sfx(surf, 0.25 if crouch else 1.0 if run else 0.7)
	if k > 1.2:
		sfx("creak", 0.25 if crouch else 0.8)
	var noise := posture * k
	if noise >= 2.4 and noise_cd <= 0 and on_noise.is_valid():
		noise_cd = 4.0
		on_noise.call(noise)


func _try_move(vx: float, vy: float) -> void:
	if not _blocked(px + vx, py):
		px += vx
	if not _blocked(px, py + vy):
		py += vy


func _blocked(x: float, y: float) -> bool:
	var rad := 0.2
	for d in [Vector2(-rad, -rad), Vector2(rad, -rad), Vector2(-rad, rad), Vector2(rad, rad)]:
		if level.solid(x + d.x, y + d.y):
			return true
	for s in solids:
		if Vector2(x - s.x, y - s.y).length() < s.r + rad:
			return true
	return false


func _find_target() -> Dictionary:
	var best := {}
	var best_score := INF
	var ca := cos(pa)
	var sa := sin(pa)
	for t in targets:
		if t.verb.call() == null:
			continue
		var dx: float = t.x - px
		var dy: float = t.y - py
		var d := Vector2(dx, dy).length()
		if d > t.get("reach", 1.45):
			continue
		var fwd := dx * ca + dy * sa
		if fwd <= 0.05:
			continue
		var lat := absf(-dx * sa + dy * ca)
		var ang := atan2(lat, fwd)
		var tol := atan2(t.get("r", 0.16), fwd) + 0.04
		if ang > tol:
			continue
		if _occluded(t.x, t.y):
			continue
		var score := ang / tol + d * 0.05
		if score < best_score:
			best_score = score
			best = t
	return best


func _occluded(x: float, y: float) -> bool:
	var d := Vector2(x - px, y - py).length()
	var n := ceili(d / 0.1)
	for i in range(1, n - 1):
		if level.solid(px + (x - px) * i / n, py + (y - py) * i / n):
			return true
	return false


func _update_barks(dt: float) -> void:
	if _bark_t > 0:
		if not _bark_q.is_empty():
			_bark_t = minf(_bark_t, 0.5 if _bark_cur.thought else 1.1)
		_bark_t -= dt
		if _bark_t <= 0 and _bark_q.is_empty():
			ui.hide_bark()
		if _bark_t > 0:
			return
	if _bark_q.is_empty():
		return
	var b: Dictionary = _bark_q.pop_front()
	ui.show_bark(b.name, b.text, b.thought)
	_bark_t = b.secs
	_bark_cur = b
	sfx("blip", 0.6)
	b.shown = true


# ================================================================ input
var _pause_q_edge := false
var _crouch_edge := false


func _input(event: InputEvent) -> void:
	if event is InputEventKey:
		var code := (event as InputEventKey).physical_keycode
		if event.pressed and not event.echo:
			_keys[code] = true
			if code == KEY_ESCAPE or code == KEY_P:
				_pause_q = true
			if code == KEY_C or code == KEY_CTRL:
				_crouch_q = true
			_tap_q = true
		elif not event.pressed:
			_keys.erase(code)
		return
	if event is InputEventScreenTouch and _js_touch:
		if not ui._touch_mode:
			ui.set_touch_mode(true)
		return
	if event is InputEventScreenDrag and _js_touch:
		return
	if event is InputEventScreenTouch:
		if not ui._touch_mode:
			ui.set_touch_mode(true)
		_touch(event)
		return
	if event is InputEventScreenDrag:
		_drag(event)
		return
	if event is InputEventMouseButton and event.device != InputEvent.DEVICE_ID_EMULATION:
		var mb := event as InputEventMouseButton
		if mb.button_index != MOUSE_BUTTON_LEFT:
			return
		if mb.pressed:
			if state != "play" or ui.screen_open():
				return
			if ui.touch_rect(ui.act).has_point(mb.position) or ui.touch_rect(ui.pause_btn).has_point(mb.position):
				_mouse_act = ui.touch_rect(ui.act).has_point(mb.position)
				return
			if ui.talking and not ui.choosing:
				_tap_q = true
				return
			if not ui.choosing:
				_mouse_look = true
		else:
			_mouse_look = false
			_mouse_act = false
		return
	if event is InputEventMouseMotion and event.device != InputEvent.DEVICE_ID_EMULATION and _mouse_look:
		_look_d += (event as InputEventMouseMotion).relative


func _touch(e: InputEventScreenTouch) -> void:
	if e.pressed:
		if state != "play" or ui.screen_open() or ui.card.visible:
			return
		if ui.touch_rect(ui.act).has_point(e.position):
			_act_id = e.index
			get_viewport().set_input_as_handled()
			return
		if ui.touch_rect(ui.crouch_btn).has_point(e.position):
			_crouch_q = true
			get_viewport().set_input_as_handled()
			return
		if ui.touch_rect(ui.pause_btn).has_point(e.position) or ui.choosing:
			return
		if ui.talking:
			_tap_q = true
			return
		if e.position.x < ui.size.x * 0.5:
			if _stick_id == NO_TOUCH:
				_stick_id = e.index
				_stick_o = e.position
				_stick_v = Vector2.ZERO
				_stick_mag = 0.0
		elif _look_id == NO_TOUCH:
			_look_id = e.index
			_look_last = e.position
	else:
		if e.index == _stick_id:
			_stick_id = NO_TOUCH
			_stick_v = Vector2.ZERO
			_stick_mag = 0.0
		if e.index == _look_id:
			_look_id = NO_TOUCH
		if e.index == _act_id:
			_act_id = NO_TOUCH


func _drag(e: InputEventScreenDrag) -> void:
	if e.index == _stick_id:
		var R := 46.0
		var d := (e.position - _stick_o) / R
		var m := d.length()
		if m > 1.0:
			_stick_o += d / m * (m - 1.0) * R * 0.5
			d /= m
		_stick_v = d
		_stick_mag = minf(1.0, m)
	elif e.index == _look_id:
		_look_d += e.position - _look_last
		_look_last = e.position


func _release_input() -> void:
	_keys.clear()
	_stick_id = NO_TOUCH
	_look_id = NO_TOUCH
	_act_id = NO_TOUCH
	_stick_v = Vector2.ZERO
	_stick_mag = 0.0
	_mouse_look = false
	_mouse_act = false


func _k(code: int) -> bool:
	return _keys.has(code)


func _edge(what: String) -> bool:
	var codes: Array = {"up": [KEY_UP, KEY_W], "down": [KEY_DOWN, KEY_S], "confirm": [KEY_ENTER, KEY_SPACE, KEY_E]}[what]
	for c in codes:
		if _keys.has(c) and not _prev_keys.has(c):
			return true
	return false


## On the web, touches are read straight from the browser's pointer events (Safari on iPhone did
## not move the stick through the engine's own touch events). The page queues
## [kind, id, x, y] with x, y as fractions of the canvas; kind 0 = down, 1 = up, 2 = move.
var _js_touch := false
const JS_TOUCH := """
(function () {
  if (window.__pq) return;
  var q = window.__pq = [];
  var c = document.querySelector('canvas');
  c.style.touchAction = 'none';
  document.body.style.touchAction = 'none';
  function at(e) { var r = c.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
  function push(k, e) { if (e.pointerType === 'mouse') return; var p = at(e); q.push([k, e.pointerId, p[0], p[1]]); if (q.length > 200) q.splice(0, q.length - 200); }
  c.addEventListener('pointerdown', function (e) { push(0, e); try { c.setPointerCapture(e.pointerId); } catch (_) {} }, true);
  c.addEventListener('pointermove', function (e) { push(2, e); }, true);
  c.addEventListener('pointerup', function (e) { push(1, e); }, true);
  c.addEventListener('pointercancel', function (e) { push(1, e); }, true);
})();
"""


func _setup_js_touch() -> void:
	if not OS.has_feature("web"):
		return
	JavaScriptBridge.eval(JS_TOUCH, true)
	_js_touch = true


func _poll_js_touch() -> void:
	if not _js_touch:
		return
	var raw = JavaScriptBridge.eval("JSON.stringify(window.__pq.splice(0))", true)
	if not (raw is String) or raw == "[]":
		return
	var list = JSON.parse_string(raw)
	if not (list is Array):
		return
	for it in list:
		var pos := Vector2(float(it[2]) * ui.size.x, float(it[3]) * ui.size.y)
		var id := int(it[1])
		if int(it[0]) == 2:
			var d := InputEventScreenDrag.new()
			d.index = id
			d.position = pos
			_drag(d)
		else:
			if not ui._touch_mode:
				ui.set_touch_mode(true)
			var t := InputEventScreenTouch.new()
			t.index = id
			t.position = pos
			t.pressed = int(it[0]) == 0
			_touch(t)


func _read_input() -> void:
	_poll_js_touch()
	var m := Vector2.ZERO
	var turn := 0.0
	if _k(KEY_W) or _k(KEY_UP):
		m.y += 1
	if _k(KEY_S) or _k(KEY_DOWN):
		m.y -= 1
	if _k(KEY_A):
		m.x -= 1
	if _k(KEY_D):
		m.x += 1
	if _k(KEY_LEFT) or _k(KEY_Q):
		turn -= 1
	if _k(KEY_RIGHT):
		turn += 1
	var ga := false
	for j in Input.get_connected_joypads():
		var ax := Input.get_joy_axis(j, JOY_AXIS_LEFT_X)
		var ay := Input.get_joy_axis(j, JOY_AXIS_LEFT_Y)
		var rx := Input.get_joy_axis(j, JOY_AXIS_RIGHT_X)
		var ry := Input.get_joy_axis(j, JOY_AXIS_RIGHT_Y)
		if absf(ax) > 0.2:
			m.x += ax
		if absf(ay) > 0.2:
			m.y -= ay
		if absf(rx) > 0.2:
			turn += rx
		if absf(ry) > 0.2:
			_look_d.y += ry * 6
		ga = ga or Input.is_joy_button_pressed(j, JOY_BUTTON_A)
	if _stick_id != NO_TOUCH:
		m += Vector2(_stick_v.x, -_stick_v.y)
	if m.length() > 1.0:
		m = m.normalized()
	in_move = m
	in_turn = turn
	in_run = _k(KEY_SHIFT) or _stick_mag > 0.92
	in_act = _act_id != NO_TOUCH or _mouse_act or _k(KEY_E) or _k(KEY_SPACE) or _k(KEY_ENTER) or ga
	in_act_pressed = in_act and not _prev_act
	_prev_act = in_act
	in_any = _tap_q or in_act_pressed
	_tap_q = false
	_pause_q_edge = _pause_q
	_pause_q = false
	_crouch_edge = _crouch_q
	_crouch_q = false
	# edges are read this frame; remember keys for the next one at the end of the frame
	call_deferred("_remember_keys")


func _remember_keys() -> void:
	_prev_keys = _keys.duplicate()
