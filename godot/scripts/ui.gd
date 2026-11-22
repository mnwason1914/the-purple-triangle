class_name GameUI
extends Control
## Everything drawn over the world: 3D view, interaction prompt, HUD, barks, dialogue with
## portraits, timed choices, chapter cards, fades, menus and the touch controls.

signal button(id: String)

const BG := Color("0c0a10")
const PANEL := Color(18 / 255.0, 14 / 255.0, 24 / 255.0, 0.94)
const INK := Color("efe6d6")
const DIM := Color("a89cb4")
const ACCENT := Color("b48ad6")
const WARM := Color("e8c070")
const LATE := Color("ff7a6a")
const EDGE := Color("3a3046")

var view: TextureRect
var sub: SubViewport
var font: FontVariation
var bold: FontVariation

var aim_box: PanelContainer
var aim_label: Label
var hold_bar: NinePatchRect
var hold_fill: TextureRect
var _hold_prog := 0.0
var hud: Control
var objective_box: PanelContainer
var objective_label: Label
var clock_label: Label
var progress_label: Label
var item_icon: TextureRect
var face_icon: TextureRect
var crouch_mark: Label
var pause_btn: Button
var flash: ColorRect
var bark_box: PanelContainer
var bark_name: Label
var bark_text: Label
var touch: Control
var stick: Stick
var act: ActButton
var crouch_btn: RoundButton
var dialog: PanelContainer
var portrait: TextureRect
var dname: Label
var dtext: Label
var dnext: Label
var choices_box: VBoxContainer
var choice_bar: NinePatchRect
var choice_fill: TextureRect
var fade_rect: ColorRect
var card: ColorRect
var card_text: RichTextLabel
var screens: Dictionary = {}
var rotate_box: Control
var end_title: Label
var end_text: Label
var opt_buttons: Dictionary = {}
var continue_btn: Button

var text_speed := 1.0
var blip: Callable
var _full := ""
var _shown := 0.0
var _line_waiting := false
var _choice_items: Array = []
var _choice_sel := 0
var _choice_result := -2
var _choice_t := 0.0
var _choice_total := 0.0
var _blip_t := 0.0
var _fade_tw: Tween
var _next_t := 0.0


func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	process_mode = Node.PROCESS_MODE_ALWAYS


func _ready() -> void:
	var ff: FontFile = load("res://assets/fonts/PretendardVariable.woff2")
	font = FontVariation.new()
	font.base_font = ff
	font.variation_opentype = {"wght": 500}
	bold = FontVariation.new()
	bold.base_font = ff
	bold.variation_opentype = {"wght": 760}
	var th := Theme.new()
	th.default_font = font
	th.default_font_size = 17
	theme = th

	sub = SubViewport.new()
	sub.handle_input_locally = false
	sub.msaa_3d = Viewport.MSAA_2X
	sub.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	sub.size = Vector2i(960, 540)
	add_child(sub)
	view = TextureRect.new()
	view.texture = sub.get_texture()
	view.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	view.stretch_mode = TextureRect.STRETCH_SCALE
	view.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_full_rect(view)
	add_child(view)

	aim_box = PanelContainer.new()
	aim_box.add_theme_stylebox_override("panel", plate("ui_panel_small", 10, Vector4(16, 8, 16, 9)))
	aim_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	aim_box.visible = false
	add_child(aim_box)
	var av := VBoxContainer.new()
	av.add_theme_constant_override("separation", 6)
	av.mouse_filter = Control.MOUSE_FILTER_IGNORE
	aim_box.add_child(av)
	aim_label = _label(av, 15, INK, true)
	aim_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	aim_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	aim_label.add_theme_constant_override("outline_size", 4)
	hold_bar = NinePatchRect.new()
	hold_bar.texture = ui_tex("ui_bar")
	hold_bar.patch_margin_left = 8
	hold_bar.patch_margin_right = 8
	hold_bar.custom_minimum_size = Vector2(160, 12)
	hold_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hold_bar.visible = false
	hold_fill = TextureRect.new()
	hold_fill.texture = ui_tex("ui_bar_fill")
	hold_fill.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	hold_fill.stretch_mode = TextureRect.STRETCH_SCALE
	hold_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hold_bar.add_child(hold_fill)
	av.add_child(hold_bar)

	flash = ColorRect.new()
	flash.color = Color(0.8, 0.1, 0.05, 0)
	flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_full_rect(flash)
	add_child(flash)

	_build_hud()
	_build_bark()
	_build_touch()
	_build_dialog()
	_build_choices()

	fade_rect = ColorRect.new()
	fade_rect.color = Color(0, 0, 0, 0)
	fade_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_full_rect(fade_rect)
	add_child(fade_rect)

	card = ColorRect.new()
	card.color = Color.BLACK
	_full_rect(card)
	card.visible = false
	add_child(card)
	card_text = RichTextLabel.new()
	card_text.bbcode_enabled = true
	card_text.fit_content = true
	card_text.scroll_active = false
	card_text.autowrap_mode = TextServer.AUTOWRAP_OFF
	card_text.add_theme_font_size_override("normal_font_size", 24)
	card_text.add_theme_color_override("default_color", INK)
	card_text.set_anchors_preset(Control.PRESET_CENTER)
	card_text.mouse_filter = Control.MOUSE_FILTER_IGNORE
	card.add_child(card_text)

	_build_screens()
	_build_rotate()
	resized.connect(_layout)
	_layout()


# ------------------------------------------------------------------ helpers
func _full_rect(c: Control) -> void:
	c.set_anchors_preset(Control.PRESET_FULL_RECT)
	c.offset_left = 0
	c.offset_top = 0
	c.offset_right = 0
	c.offset_bottom = 0


func _layer() -> Control:
	var c := Control.new()
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_full_rect(c)
	add_child(c)
	return c


func _tex_rect(parent: Control) -> TextureRect:
	var t := TextureRect.new()
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_SCALE
	t.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	t.mouse_filter = Control.MOUSE_FILTER_IGNORE
	t.visible = false
	parent.add_child(t)
	return t


func _label(parent: Control, size: int, color: Color, is_bold := false) -> Label:
	var l := Label.new()
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	if is_bold:
		l.add_theme_font_override("font", bold)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(l)
	return l


## Interface art made with Codex CLI (art-src/ui → godot/assets/ui, stored at 2×).
static var _ui_cache: Dictionary = {}


static func ui_tex(name: String) -> Texture2D:
	if not _ui_cache.has(name):
		_ui_cache[name] = load("res://assets/ui/%s.png" % name)
	return _ui_cache[name]


## A stretchable plate from one of the interface images; `margin` (texture pixels) stays unstretched.
static func plate(name: String, margin: int, pad := Vector4(12, 8, 12, 8), tint := Color.WHITE) -> StyleBoxTexture:
	var s := StyleBoxTexture.new()
	s.texture = ui_tex(name)
	s.texture_margin_left = margin
	s.texture_margin_top = margin
	s.texture_margin_right = margin
	s.texture_margin_bottom = margin
	s.content_margin_left = pad.x
	s.content_margin_top = pad.y
	s.content_margin_right = pad.z
	s.content_margin_bottom = pad.w
	s.modulate_color = tint
	return s


func _button(parent: Control, text: String, id: String, kind := "") -> Button:
	var b := Button.new()
	b.text = Tx.t(text)
	b.custom_minimum_size = Vector2(240, 50)
	b.add_theme_font_override("font", bold)
	b.add_theme_font_size_override("font_size", 17)
	var art := "ui_btn_primary" if kind == "primary" else "ui_btn_plain"
	var dim := Color(1, 1, 1, 0.82) if kind == "ghost" else Color.WHITE
	var pad := Vector4(18, 10, 18, 10)
	b.add_theme_stylebox_override("normal", plate(art, 14, pad, dim))
	b.add_theme_stylebox_override("hover", plate(art, 14, pad, Color(1.18, 1.14, 1.1)))
	b.add_theme_stylebox_override("pressed", plate(art + "_pressed", 14, pad))
	b.add_theme_stylebox_override("focus", plate(art + "_pressed", 14, pad, Color(1, 1, 1, 0.35)))
	b.add_theme_color_override("font_color", INK)
	b.add_theme_color_override("font_hover_color", INK)
	b.add_theme_color_override("font_pressed_color", INK)
	b.pressed.connect(func(): button.emit(id))
	parent.add_child(b)
	return b


# ------------------------------------------------------------------ HUD
func _build_hud() -> void:
	hud = _layer()
	objective_box = PanelContainer.new()
	objective_box.add_theme_stylebox_override("panel", plate("ui_panel_small", 10, Vector4(14, 8, 14, 8)))
	objective_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	objective_box.position = Vector2(12, 10)
	hud.add_child(objective_box)
	objective_label = _label(objective_box, 15, INK, true)
	objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	objective_label.custom_minimum_size = Vector2(0, 0)

	var row := HBoxContainer.new()
	row.name = "status"
	row.add_theme_constant_override("separation", 6)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	row.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	row.position = Vector2(-12, 8)
	hud.add_child(row)
	var cbox := PanelContainer.new()
	cbox.add_theme_stylebox_override("panel", plate("ui_panel_small", 10, Vector4(12, 6, 12, 6)))
	cbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(cbox)
	var cv := VBoxContainer.new()
	cv.add_theme_constant_override("separation", -2)
	cv.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cbox.add_child(cv)
	clock_label = _label(cv, 22, WARM, true)
	clock_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	progress_label = _label(cv, 12, DIM, true)
	progress_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	for which in ["item", "face"]:
		var p := PanelContainer.new()
		p.add_theme_stylebox_override("panel", plate("ui_portrait_frame", 8, Vector4(6, 6, 6, 6)))
		p.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(p)
		var t := TextureRect.new()
		t.custom_minimum_size = Vector2(42, 42)
		t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		t.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		t.mouse_filter = Control.MOUSE_FILTER_IGNORE
		p.add_child(t)
		if which == "item":
			item_icon = t
		else:
			face_icon = t
	pause_btn = Button.new()
	pause_btn.custom_minimum_size = Vector2(48, 48)
	pause_btn.add_theme_stylebox_override("normal", plate("ui_pause", 0, Vector4.ZERO))
	pause_btn.add_theme_stylebox_override("hover", plate("ui_pause", 0, Vector4.ZERO, Color(1.2, 1.15, 1.1)))
	pause_btn.add_theme_stylebox_override("pressed", plate("ui_pause", 0, Vector4.ZERO, Color(0.7, 0.65, 0.75)))
	pause_btn.add_theme_stylebox_override("focus", StyleBoxEmpty.new())
	pause_btn.focus_mode = Control.FOCUS_NONE
	pause_btn.pressed.connect(func(): button.emit("pause"))
	row.add_child(pause_btn)

	crouch_mark = _label(hud, 13, DIM, true)
	crouch_mark.text = Tx.t("웅크림")
	crouch_mark.visible = false
	hud.visible = false


func set_hud(on: bool) -> void:
	hud.visible = on
	touch.visible = on and _touch_mode
	if not on:
		aim_box.visible = false


func objective(t: String) -> void:
	objective_label.text = Tx.t(t)
	objective_box.visible = t != ""


func hud_state(time: String, late: bool, progress: String, face: Texture2D, item: Texture2D, crouching: bool) -> void:
	clock_label.text = time
	clock_label.add_theme_color_override("font_color", LATE if late else WARM)
	progress_label.text = Tx.t("숨기기 ") + progress if progress != "" else ""
	progress_label.visible = progress != ""
	face_icon.texture = face
	item_icon.texture = item
	crouch_mark.visible = crouching


func do_flash(a: float) -> void:
	flash.color.a = clampf(a, 0.0, 0.5) * 0.6


func aim(name: String) -> void:
	aim_label.text = Tx.t(name)
	aim_box.visible = name != "" and hud.visible


# ------------------------------------------------------------------ bark
func _build_bark() -> void:
	bark_box = PanelContainer.new()
	bark_box.add_theme_stylebox_override("panel", plate("ui_panel_small", 10, Vector4(16, 10, 16, 11)))
	bark_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bark_box)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bark_box.add_child(v)
	bark_name = _label(v, 12, ACCENT, true)
	bark_text = _label(v, 16, INK)
	bark_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	bark_box.visible = false


func show_bark(name: String, text: String, thought: bool) -> void:
	bark_name.text = name
	bark_name.visible = name != ""
	bark_text.text = Tx.t(text)
	bark_text.add_theme_color_override("font_color", Color("c8bed4") if thought else INK)
	bark_box.visible = true
	bark_box.modulate.a = 1.0
	_layout()


func hide_bark() -> void:
	bark_box.visible = false


# ------------------------------------------------------------------ touch controls
var _touch_mode := false


func set_touch_mode(on: bool) -> void:
	_touch_mode = on
	touch.visible = on and hud.visible
	_layout()


func _build_touch() -> void:
	touch = _layer()
	stick = Stick.new()
	_full_rect(stick)
	stick.mouse_filter = Control.MOUSE_FILTER_IGNORE
	touch.add_child(stick)
	crouch_btn = RoundButton.new()
	crouch_btn.label = Tx.t("웅크리기")
	crouch_btn.font = bold
	touch.add_child(crouch_btn)
	touch.visible = false
	act = ActButton.new()
	act.font = bold
	act.visible = false
	add_child(act)


func action(label: String, progress: float) -> void:
	act.visible = label != "" and _touch_mode
	act.label = Tx.t(label)
	act.progress = progress
	act.queue_redraw()
	_hold_prog = progress
	hold_bar.visible = progress > 0.0 and not _touch_mode


# ------------------------------------------------------------------ dialogue
func _build_dialog() -> void:
	dialog = PanelContainer.new()
	dialog.add_theme_stylebox_override("panel", plate("ui_panel_dialog", 14, Vector4(16, 14, 18, 14)))
	dialog.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(dialog)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	dialog.add_child(row)
	portrait = TextureRect.new()
	portrait.custom_minimum_size = Vector2(76, 76)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	portrait.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	portrait.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(portrait)
	var v := VBoxContainer.new()
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	v.add_theme_constant_override("separation", 3)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(v)
	dname = _label(v, 13, ACCENT, true)
	dtext = _label(v, 19, INK)
	dtext.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dtext.custom_minimum_size = Vector2(0, 54)
	dtext.add_theme_constant_override("line_spacing", 4)
	dnext = _label(dialog, 12, ACCENT)
	dnext.text = "▼"
	dnext.size_flags_horizontal = Control.SIZE_SHRINK_END
	dnext.size_flags_vertical = Control.SIZE_SHRINK_END
	dialog.visible = false


var talking: bool:
	get:
		return dialog.visible


var choosing: bool:
	get:
		return choices_box.visible


func say(name: String, face: Texture2D, text: String, thought := false) -> void:
	dialog.visible = true
	dname.text = name
	portrait.texture = face
	portrait.visible = face != null
	dtext.add_theme_color_override("font_color", Color("c8bed4") if thought else INK)
	_full = Tx.t(text)
	_shown = 0.0
	dtext.text = _full
	dtext.visible_characters = 0
	_line_waiting = true
	_layout()


func line_done() -> bool:
	return not _line_waiting


func close_dialog() -> void:
	dialog.visible = false
	_line_waiting = false


## Tap: finish typing, or advance.
func advance() -> void:
	if choosing or not _line_waiting:
		return
	if _shown < _full.length():
		_shown = _full.length()
		dtext.visible_characters = -1
		return
	_line_waiting = false


# ------------------------------------------------------------------ choices
func _build_choices() -> void:
	choices_box = VBoxContainer.new()
	choices_box.add_theme_constant_override("separation", 8)
	choices_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(choices_box)
	choices_box.visible = false


func choice(options: Array, timeout := 0.0) -> void:
	for c in choices_box.get_children():
		c.queue_free()
	_choice_items = []
	_choice_sel = 0
	_choice_result = -2
	for i in range(options.size()):
		var p := PanelContainer.new()
		p.mouse_filter = Control.MOUSE_FILTER_STOP
		var l := _label(p, 16, INK, true)
		l.text = Tx.t(options[i])
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		var idx := i
		p.gui_input.connect(func(e: InputEvent):
			if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
				pick(idx))
		p.mouse_entered.connect(func(): _choice_sel = idx; _highlight())
		choices_box.add_child(p)
		_choice_items.append(p)
	choice_bar = NinePatchRect.new()
	choice_bar.texture = ui_tex("ui_bar")
	choice_bar.patch_margin_left = 8
	choice_bar.patch_margin_right = 8
	choice_bar.custom_minimum_size = Vector2(0, 14)
	choice_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	choice_bar.visible = timeout > 0
	choice_fill = TextureRect.new()
	choice_fill.texture = ui_tex("ui_bar_fill")
	choice_fill.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	choice_fill.stretch_mode = TextureRect.STRETCH_SCALE
	choice_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	choice_bar.add_child(choice_fill)
	choices_box.add_child(choice_bar)
	_choice_total = timeout
	_choice_t = timeout
	choices_box.visible = true
	_highlight()
	_layout()


func _highlight() -> void:
	for i in range(_choice_items.size()):
		var sel := i == _choice_sel
		_choice_items[i].add_theme_stylebox_override("panel", plate("ui_choice_selected" if sel else "ui_choice", 10, Vector4(16, 12, 16, 12)))


func move_choice(d: int) -> void:
	if choosing and _choice_items.size() > 0:
		_choice_sel = (_choice_sel + d + _choice_items.size()) % _choice_items.size()
		_highlight()


func confirm_choice() -> void:
	if choosing:
		pick(_choice_sel)


func pick(i: int) -> void:
	if not choosing:
		return
	choices_box.visible = false
	_choice_result = i


func choice_result() -> int:
	return _choice_result


# ------------------------------------------------------------------ card & fade
func fade(on: bool, secs := 0.6) -> void:
	if _fade_tw:
		_fade_tw.kill()
	_fade_tw = create_tween()
	_fade_tw.tween_property(fade_rect, "color:a", 1.0 if on else 0.0, secs)


func fade_now(on: bool) -> void:
	if _fade_tw:
		_fade_tw.kill()
	fade_rect.color.a = 1.0 if on else 0.0


func show_card(html: String) -> void:
	var t := Tx.t(html)
	var re := RegEx.create_from_string("<small>(.*?)</small>")
	t = re.sub(t, "\n[font_size=15][color=#a89cb4]$1[/color][/font_size]", true)
	card_text.text = "[center]" + t + "[/center]"
	card.visible = true
	card_text.modulate.a = 0.0
	_layout()
	var tw := create_tween()
	tw.tween_property(card_text, "modulate:a", 1.0, 1.2)


func card_out() -> void:
	var tw := create_tween()
	tw.tween_property(card_text, "modulate:a", 0.0, 1.1)


func hide_card() -> void:
	card.visible = false


# ------------------------------------------------------------------ screens
func _panel(id: String, title: String) -> VBoxContainer:
	var bg := ColorRect.new()
	bg.color = Color(12 / 255.0, 10 / 255.0, 16 / 255.0, 0.55 if id == "title" else 0.82)
	_full_rect(bg)
	bg.visible = false
	add_child(bg)
	screens[id] = bg
	var center := CenterContainer.new()
	_full_rect(center)
	bg.add_child(center)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	v.alignment = BoxContainer.ALIGNMENT_CENTER
	center.add_child(v)
	if title != "":
		var h := _label(v, 26, INK, true)
		h.text = Tx.t(title)
		h.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return v


func _build_screens() -> void:
	var t := _panel("title", "")
	var tri := TextureRect.new()
	tri.texture = ui_tex("ui_emblem")
	tri.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	tri.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	tri.custom_minimum_size = Vector2(72, 64)
	tri.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	t.add_child(tri)
	var h1 := _label(t, 34, INK, true)
	h1.text = "THE PURPLE TRIANGLE"
	h1.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	h1.add_theme_constant_override("outline_size", 6)
	h1.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	var subl := _label(t, 15, Color("d8cce4"), true)
	subl.text = Tx.t("보라색 삼각형 · 제1장 「가방 속의 소책자」")
	subl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subl.add_theme_constant_override("outline_size", 5)
	subl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	var sp := Control.new()
	sp.custom_minimum_size = Vector2(0, 8)
	t.add_child(sp)
	continue_btn = _button(t, "이어하기", "continue", "primary")
	_button(t, "새로 시작", "new")
	_button(t, "설정", "settings", "ghost")
	_center_buttons(t)

	var s := _panel("settings", "설정")
	for id in ["sfx", "music", "speed", "saver", "haptic"]:
		opt_buttons[id] = _button(s, "", "opt_" + id)
	_button(s, "돌아가기", "settings_back", "ghost")
	_center_buttons(s)

	var p := _panel("pause", "일시정지")
	_button(p, "계속하기", "resume", "primary")
	_button(p, "설정", "pause_settings", "ghost")
	_button(p, "타이틀로", "quit")
	var note := _label(p, 12, DIM)
	note.text = Tx.t("진행은 장면마다 자동 저장됩니다")
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_center_buttons(p)

	var e := _panel("end", "")
	end_title = _label(e, 26, INK, true)
	end_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	end_text = _label(e, 16, Color("d8cce4"))
	end_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	end_text.add_theme_constant_override("line_spacing", 6)
	var sp2 := Control.new()
	sp2.custom_minimum_size = Vector2(0, 8)
	e.add_child(sp2)
	_button(e, "처음부터", "again", "primary")
	_button(e, "타이틀로", "end_title", "ghost")
	_center_buttons(e)


func _center_buttons(v: VBoxContainer) -> void:
	for c in v.get_children():
		if c is Button:
			c.size_flags_horizontal = Control.SIZE_SHRINK_CENTER


func screen(id: String) -> void:
	for k in screens:
		screens[k].visible = k == id
	var first: Button = null
	if id != "":
		for c in screens[id].get_child(0).get_child(0).get_children():
			if c is Button and c.visible:
				first = c
				break
	if first and not _touch_mode:
		first.grab_focus()


func screen_open() -> bool:
	for k in screens:
		if screens[k].visible:
			return true
	return false


func set_options(s: Dictionary) -> void:
	var on := func(b: bool) -> String: return Tx.t("켜짐") if b else Tx.t("꺼짐")
	opt_buttons.sfx.text = Tx.t("효과음") + " · " + on.call(s.sfx)
	opt_buttons.music.text = Tx.t("음악") + " · " + on.call(s.music)
	var sp: float = s.text_speed
	opt_buttons.speed.text = Tx.t("글자 속도 · {0}".replace("{0}", ["느리게", "보통", "빠르게"][0 if sp < 0.8 else 1 if sp < 1.2 else 2]))
	opt_buttons.saver.text = Tx.t("배터리 절약 (30 FPS)") + " · " + on.call(s.saver)
	opt_buttons.haptic.text = Tx.t("진동") + " · " + on.call(s.haptic)


func show_end(title: String, text: String) -> void:
	end_title.text = Tx.t(title)
	end_text.text = Tx.t(text)
	screen("end")


func _build_rotate() -> void:
	rotate_box = ColorRect.new()
	rotate_box.color = BG
	_full_rect(rotate_box)
	add_child(rotate_box)
	var c := CenterContainer.new()
	_full_rect(c)
	rotate_box.add_child(c)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 16)
	c.add_child(v)
	var pic := TextureRect.new()
	pic.texture = ui_tex("ui_rotate")
	pic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	pic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	pic.custom_minimum_size = Vector2(96, 96)
	pic.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(pic)
	var l := _label(v, 20, INK, true)
	l.text = Tx.t("기기를 가로로 돌려 주세요")
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var b := _button(v, "세로로 계속하기", "portrait", "ghost")
	b.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	rotate_box.visible = false


# ------------------------------------------------------------------ per frame & layout
func tick(dt: float) -> void:
	if dialog.visible and _shown < _full.length():
		var before := int(_shown)
		_shown = minf(_full.length(), _shown + dt * 32.0 * text_speed)
		var now := int(_shown)
		if now != before:
			dtext.visible_characters = now
			_blip_t -= dt
			if _blip_t <= 0.0 and now > 0 and _full[now - 1] != " " and blip.is_valid():
				_blip_t = 0.07
				blip.call()
		if _shown >= _full.length():
			dtext.visible_characters = -1
	_next_t += dt
	dnext.visible = dialog.visible and _shown >= _full.length()
	dnext.position.y = 0 if int(_next_t / 0.45) % 2 == 0 else 3
	if choosing and _choice_total > 0:
		_choice_t = maxf(0.0, _choice_t - dt)
		var inner := choice_bar.size - Vector2(8, 8)
		choice_fill.position = Vector2(4, 4)
		choice_fill.size = Vector2(maxf(0.0, inner.x) * _choice_t / _choice_total, maxf(0.0, inner.y))
	if flash.color.a > 0:
		flash.color.a = maxf(0.0, flash.color.a - dt)


func _layout() -> void:
	if not is_inside_tree():
		return
	var W := size.x
	var H := size.y
	# Render 3D SubViewport at native window resolution (capped at 900p for smooth mobile WebGL),
	# keeping 3D character silhouettes sharp while shaders keep nearest filtering on textures.
	var win := get_window()
	var phys := Vector2(win.size) if (win and win.size.x > 0 and win.size.y > 0) else Vector2(W, H)
	var sc := minf(1.0, 900.0 / maxf(1.0, phys.y))
	var target_sz := Vector2i(maxi(320, roundi(phys.x * sc)), maxi(180, roundi(phys.y * sc)))
	if sub.size != target_sz:
		sub.size = target_sz
	objective_label.custom_minimum_size.x = 0
	objective_box.size = Vector2.ZERO
	objective_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	if objective_box.get_combined_minimum_size().x > W * 0.5:
		objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		objective_label.custom_minimum_size.x = W * 0.5 - 24
	var row: Control = hud.get_node("status")
	row.position = Vector2(W - row.get_combined_minimum_size().x - 12, 8)
	crouch_mark.position = Vector2(14, H - 28)
	aim_box.size = Vector2.ZERO
	var asz := aim_box.get_combined_minimum_size()
	aim_box.size = asz
	aim_box.position = Vector2((W - asz.x) * 0.5, H * 0.76 - asz.y * 0.5)
	if hold_bar.visible:
		var inner := hold_bar.size - Vector2(6, 6)
		hold_fill.position = Vector2(3, 3)
		hold_fill.size = Vector2(maxf(0.0, inner.x) * _hold_prog, maxf(0.0, inner.y))
	# bark under the objective, centred
	var bw := minf(560.0, W - 40)
	bark_box.size = Vector2(0, 0)
	bark_text.custom_minimum_size.x = bw - 28
	bark_box.position = Vector2((W - bw) * 0.5, H * 0.16)
	# dialogue
	var dw := minf(760.0, W - 24)
	dialog.size = Vector2(dw, 0)
	dialog.custom_minimum_size = Vector2(dw, 100)
	dialog.position = Vector2((W - dw) * 0.5, H - dialog.get_combined_minimum_size().y - 10)
	var cw := minf(440.0, W * 0.7)
	choices_box.custom_minimum_size.x = cw
	choices_box.size = Vector2(cw, 0)
	for c in _choice_items:
		if is_instance_valid(c):
			c.get_child(0).custom_minimum_size.x = cw - 28
	var ch := choices_box.get_combined_minimum_size().y
	choices_box.position = Vector2(W - cw - 16, H - ch - 122)
	card_text.size = Vector2(W, 0)
	card_text.position = Vector2(0, H * 0.5 - card_text.get_content_height() * 0.5)
	# touch
	var act_r := 46.0
	act.size = Vector2(act_r * 2, act_r * 2)
	act.position = Vector2(W - act_r * 2 - 28, H - act_r * 2 - H * 0.2)
	crouch_btn.size = Vector2(64, 64)
	crouch_btn.position = Vector2(W - 64 - 30, H - 64 - 18)
	if crouch_btn.position.y < act.position.y + act.size.y + 6:
		crouch_btn.position = Vector2(act.position.x - 64 - 18, H - 64 - 18)


func touch_rect(c: Control) -> Rect2:
	return Rect2(c.global_position, c.size) if c.is_visible_in_tree() else Rect2()


# ------------------------------------------------------------------ image widgets
## These place the Codex-made interface images; nothing here draws shapes.
class Stick extends Control:
	var on := false
	var origin := Vector2.ZERO
	var knob := Vector2.ZERO
	var run := false
	const R := 46.0

	func _draw() -> void:
		# at rest the stick waits in the lower left, so players can see where to put a thumb
		var o := origin if on else Vector2(R + 40, size.y - R - 40)
		var a := 0.9 if on else 0.5
		var base_col := Color(1.25, 1.1, 0.8, a) if run else Color(1, 1, 1, a)
		var B := R + 12
		draw_texture_rect(GameUI.ui_tex("ui_stick_base"), Rect2(o - Vector2(B, B), Vector2(B, B) * 2), false, base_col)
		var k := o + (knob * R if on else Vector2.ZERO)
		draw_texture_rect(GameUI.ui_tex("ui_stick_knob"), Rect2(k - Vector2(22, 22), Vector2(44, 44)), false, Color(1, 1, 1, a))


class ActButton extends Control:
	var label := ""
	var progress := 0.0
	var pressed := false
	var font: Font

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var full := Rect2(Vector2.ZERO, size)
		draw_texture_rect(GameUI.ui_tex("ui_act_pressed" if pressed else "ui_act"), full, false)
		if progress > 0.0:
			var r := GameUI.ui_tex("ui_act_pressed")
			draw_texture_rect_region(r, Rect2(0, size.y * (1.0 - progress), size.x, size.y * progress),
				Rect2(0, r.get_height() * (1.0 - progress), r.get_width(), r.get_height() * progress), Color(1.3, 1.1, 0.7))
		if font:
			var fs := 17
			var c := size * 0.5
			var w := font.get_string_size(label, HORIZONTAL_ALIGNMENT_CENTER, -1, fs).x
			draw_string_outline(font, Vector2(c.x - w * 0.5, c.y + fs * 0.35), label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, 4, Color(0, 0, 0, 0.8))
			draw_string(font, Vector2(c.x - w * 0.5, c.y + fs * 0.35), label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, GameUI.INK)


class RoundButton extends Control:
	var label := ""
	var on := false
	var font: Font

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		draw_texture_rect(GameUI.ui_tex("ui_crouch_on" if on else "ui_crouch"), Rect2(Vector2.ZERO, size), false)
