class_name GameUI
extends Control
## Everything drawn over the world: low-res 3D view, hands, crosshair, HUD, barks, dialogue with
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

var view: SubViewportContainer
var sub: SubViewport
var font: FontVariation
var bold: FontVariation

# hands
var hands: Control
var hand_main: TextureRect
var hand_l: TextureRect
var hand_r: TextureRect
var item_rect: TextureRect

var cross: Cross
var aim_label: Label
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
var choice_bar: ColorRect
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

	view = SubViewportContainer.new()
	view.stretch = true
	view.stretch_shrink = 3
	view.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	view.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_full_rect(view)
	add_child(view)
	sub = SubViewport.new()
	sub.handle_input_locally = false
	sub.msaa_3d = Viewport.MSAA_DISABLED
	view.add_child(sub)

	hands = _layer()
	hand_main = _tex_rect(hands)
	hand_l = _tex_rect(hands)
	item_rect = _tex_rect(hands)
	hand_r = _tex_rect(hands)

	cross = Cross.new()
	_full_rect(cross)
	add_child(cross)
	aim_label = _label(self, 15, INK, true)
	aim_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	aim_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
	aim_label.add_theme_constant_override("outline_size", 5)
	aim_label.visible = false

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


static func box(bg: Color, border := Color(0, 0, 0, 0), radius := 8, pad := Vector4(12, 8, 12, 8), bw := 1) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	if border.a > 0:
		s.set_border_width_all(bw)
	s.set_corner_radius_all(radius)
	s.content_margin_left = pad.x
	s.content_margin_top = pad.y
	s.content_margin_right = pad.z
	s.content_margin_bottom = pad.w
	return s


func _button(parent: Control, text: String, id: String, kind := "") -> Button:
	var b := Button.new()
	b.text = Tx.t(text)
	b.custom_minimum_size = Vector2(240, 46)
	b.add_theme_font_override("font", bold)
	b.add_theme_font_size_override("font_size", 17)
	var bg := Color("5a3a7a") if kind == "primary" else Color(0, 0, 0, 0) if kind == "ghost" else Color("231b2e")
	var bd := ACCENT if kind == "primary" else Color("4a3c5a")
	b.add_theme_stylebox_override("normal", box(bg, bd, 10))
	b.add_theme_stylebox_override("hover", box(bg.lightened(0.12), ACCENT, 10))
	b.add_theme_stylebox_override("pressed", box(Color("3e2e52"), ACCENT, 10))
	b.add_theme_stylebox_override("focus", box(Color(0, 0, 0, 0), ACCENT, 10, Vector4(12, 8, 12, 8), 2))
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
	var ob := box(Color(10 / 255.0, 8 / 255.0, 14 / 255.0, 0.72), Color(0, 0, 0, 0), 4, Vector4(12, 6, 12, 6))
	ob.border_color = ACCENT
	ob.border_width_left = 3
	objective_box.add_theme_stylebox_override("panel", ob)
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
	cbox.add_theme_stylebox_override("panel", box(Color(10 / 255.0, 8 / 255.0, 14 / 255.0, 0.72), Color(0, 0, 0, 0), 6, Vector4(10, 4, 10, 4)))
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
		p.add_theme_stylebox_override("panel", box(Color(10 / 255.0, 8 / 255.0, 14 / 255.0, 0.72), Color("2a2234"), 6, Vector4(3, 3, 3, 3)))
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
	pause_btn.text = "II"
	pause_btn.custom_minimum_size = Vector2(48, 48)
	pause_btn.add_theme_font_override("font", bold)
	pause_btn.add_theme_stylebox_override("normal", box(Color(10 / 255.0, 8 / 255.0, 14 / 255.0, 0.72), EDGE, 10))
	pause_btn.add_theme_stylebox_override("hover", box(Color("231b2e"), ACCENT, 10))
	pause_btn.add_theme_stylebox_override("pressed", box(Color("3e2e52"), ACCENT, 10))
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
	cross.visible = on


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


# ------------------------------------------------------------------ hands
## Hands in low-res pixel units (the 3D view is drawn at size/shrink).
func draw_hands(on: bool, holding: String, bob: Vector2, light: float, crouching: bool) -> void:
	for t in [hand_main, hand_l, hand_r, item_rect]:
		t.visible = false
	if not on:
		return
	var px := float(view.stretch_shrink)
	var W := size.x / px
	var VH := size.y / px
	var s := maxf(1.0, roundf(VH / 90.0))
	var k := clampf(light * 300.0, 110.0, 300.0) / 256.0
	var mod := Color(k, k, k)
	var by := bob.y + (2.0 * s if crouching else 0.0)
	var put := func(r: TextureRect, name: String, x: float, y: float, w_px: float):
		var t := Art.tex(name)
		if t == null:
			return
		var pw: float = Art.painted[name].x if Art.painted.has(name) else t.get_width()
		var sc := w_px / t.get_width() if w_px > 0 else s * pw / t.get_width()
		r.texture = t
		r.position = Vector2(x, y) * px
		r.size = Vector2(t.get_width(), t.get_height()) * sc * px
		r.modulate = mod
		r.visible = true
	if holding == "":
		put.call(hand_main, "hand_idle", W - 34 * s - 4 + bob.x, VH - 30 * s + by, 0)
	elif holding == "screwdriver":
		put.call(hand_main, "hand_screwdriver", W - 34 * s - 4 + bob.x, VH - 30 * s + by, 0)
	else:
		var name: String = Game.ITEM_ART[holding]
		var it := Art.tex(name)
		if it == null:
			return
		var ih := VH * 0.22
		var iw := ih * it.get_width() / it.get_height()
		var ix := W * 0.5 - iw * 0.5 + bob.x
		var iy := VH - ih - 6 * s + by
		put.call(hand_l, "hand_l", ix - 18 * s, iy + ih - 14 * s, 0)
		put.call(item_rect, name, ix, iy, iw)
		put.call(hand_r, "hand_r", ix + iw - 12 * s, iy + ih - 14 * s, 0)


func aim(name: String) -> void:
	aim_label.text = Tx.t(name)
	aim_label.visible = name != ""
	cross.active = name != ""
	cross.queue_redraw()


# ------------------------------------------------------------------ bark
func _build_bark() -> void:
	bark_box = PanelContainer.new()
	bark_box.add_theme_stylebox_override("panel", box(Color(14 / 255.0, 11 / 255.0, 20 / 255.0, 0.86), EDGE, 8, Vector4(14, 8, 14, 9)))
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
	aim_label.text = aim_label.text
	cross.hold = progress
	cross.queue_redraw()


# ------------------------------------------------------------------ dialogue
func _build_dialog() -> void:
	dialog = PanelContainer.new()
	dialog.add_theme_stylebox_override("panel", box(PANEL, EDGE, 8, Vector4(10, 10, 14, 12)))
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
	choice_bar = ColorRect.new()
	choice_bar.color = WARM
	choice_bar.custom_minimum_size = Vector2(0, 4)
	choice_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	choice_bar.visible = timeout > 0
	choices_box.add_child(choice_bar)
	_choice_total = timeout
	_choice_t = timeout
	choices_box.visible = true
	_highlight()
	_layout()


func _highlight() -> void:
	for i in range(_choice_items.size()):
		var sel := i == _choice_sel
		_choice_items[i].add_theme_stylebox_override("panel", box(Color("3e2e52") if sel else Color(28 / 255.0, 22 / 255.0, 38 / 255.0, 0.96), ACCENT if sel else Color("4a3c5a"), 8, Vector4(14, 11, 14, 11)))


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
	var tri := Triangle.new()
	tri.custom_minimum_size = Vector2(64, 56)
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
		choice_bar.custom_minimum_size.x = choices_box.size.x * _choice_t / _choice_total
	if flash.color.a > 0:
		flash.color.a = maxf(0.0, flash.color.a - dt)


func _layout() -> void:
	if not is_inside_tree():
		return
	var W := size.x
	var H := size.y
	view.stretch_shrink = maxi(1, roundi(H / 190.0))
	objective_label.custom_minimum_size.x = 0
	objective_box.size = Vector2.ZERO
	objective_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	if objective_box.get_combined_minimum_size().x > W * 0.5:
		objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		objective_label.custom_minimum_size.x = W * 0.5 - 24
	var row: Control = hud.get_node("status")
	row.position = Vector2(W - row.get_combined_minimum_size().x - 12, 8)
	crouch_mark.position = Vector2(14, H - 28)
	aim_label.size = Vector2(W, 24)
	aim_label.position = Vector2(0, H * 0.5 + 16)
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


# ------------------------------------------------------------------ small drawn widgets
class Cross extends Control:
	var active := false
	var hold := 0.0

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var c := size * 0.5
		var col := Color(1, 1, 1, 0.9) if active else Color(1, 1, 1, 0.45)
		if active:
			draw_arc(c, 7, 0, TAU, 24, col, 1.5, true)
		draw_rect(Rect2(c - Vector2(1.5, 1.5), Vector2(3, 3)), col)
		if hold > 0.0:
			draw_arc(c, 12, -PI / 2, -PI / 2 + TAU * hold, 32, GameUI.WARM, 3.0, true)


class Stick extends Control:
	var on := false
	var origin := Vector2.ZERO
	var knob := Vector2.ZERO
	var run := false
	const R := 46.0

	func _draw() -> void:
		if not on:
			# Resting stick in the lower left, so players can see where to put a thumb.
			var rest := Vector2(R + 40, size.y - R - 40)
			draw_circle(rest, R + 12, Color(1, 1, 1, 0.06))
			draw_arc(rest, R + 12, 0, TAU, 40, Color(1, 1, 1, 0.22), 2.0, true)
			draw_circle(rest, 22, Color(1, 1, 1, 0.22))
			return
		draw_circle(origin, R + 12, Color(1, 1, 1, 0.08))
		draw_arc(origin, R + 12, 0, TAU, 40, Color(1, 1, 1, 0.3) if not run else GameUI.WARM, 2.0, true)
		draw_circle(origin + knob * R, 22, Color(1, 1, 1, 0.35))


class ActButton extends Control:
	var label := ""
	var progress := 0.0
	var pressed := false
	var font: Font

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var c := size * 0.5
		var r := size.x * 0.5
		draw_circle(c, r, Color(0.35, 0.23, 0.48, 0.85) if pressed else Color(0.14, 0.1, 0.2, 0.78))
		draw_arc(c, r - 1, 0, TAU, 48, GameUI.ACCENT, 2.0, true)
		if progress > 0.0:
			draw_arc(c, r - 4, -PI / 2, -PI / 2 + TAU * progress, 48, GameUI.WARM, 5.0, true)
		if font:
			var fs := 17
			var w := font.get_string_size(label, HORIZONTAL_ALIGNMENT_CENTER, -1, fs).x
			draw_string(font, Vector2(c.x - w * 0.5, c.y + fs * 0.35), label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, GameUI.INK)


class RoundButton extends Control:
	var label := ""
	var on := false
	var font: Font

	func _init() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var c := size * 0.5
		var r := size.x * 0.5
		draw_circle(c, r, Color(0.35, 0.23, 0.48, 0.85) if on else Color(0.08, 0.06, 0.11, 0.7))
		draw_arc(c, r - 1, 0, TAU, 40, Color("4a3c5a"), 1.5, true)
		if font:
			var fs := 13
			var w := font.get_string_size(label, HORIZONTAL_ALIGNMENT_CENTER, -1, fs).x
			draw_string(font, Vector2(c.x - w * 0.5, c.y + fs * 0.35), label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, GameUI.INK)


class Triangle extends Control:
	func _draw() -> void:
		var w := size.x
		var h := size.y
		var pts := PackedVector2Array([Vector2(w * 0.5, h), Vector2(0, 0), Vector2(w, 0)])
		draw_colored_polygon(pts, Color("7a4aa8"))
		draw_polyline(PackedVector2Array([pts[0], pts[1], pts[2], pts[0]]), GameUI.ACCENT, 2.0, true)
