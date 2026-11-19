class_name Cinema
## The chapter's two short cuts. On the web the Google Flow videos (assets/ch1/cut_1_*.mp4, served
## next to index.html) play in an HTML <video> over the game; elsewhere a painted still pans for
## four seconds. Tap skips after one second.


static func intro(g: Game) -> void:
	if await _video(g, "cut_1_intro.mp4"):
		return
	await _still(g, "tex_wall_facade", "", 4.0)


static func outro(g: Game, with_bag: bool) -> void:
	if with_bag and await _video(g, "cut_1_outro.mp4"):
		return
	await _still(g, "tex_wall_gate", "spr_leni_bag" if with_bag else "spr_leni", 4.0)


static func _video(g: Game, file: String) -> bool:
	if not OS.has_feature("web"):
		return false
	JavaScriptBridge.eval("""
(function () {
  window.__cine = 'playing';
  var v = document.createElement('video');
  v.src = 'assets/ch1/%s'; v.muted = true; v.playsInline = true; v.setAttribute('playsinline', '');
  v.style.cssText = 'position:fixed;inset:0;width:100%%;height:100%%;object-fit:contain;background:#000;z-index:20';
  document.body.appendChild(v);
  var t0 = performance.now();
  var fin = function (ok) { if (window.__cine !== 'playing') return; v.pause(); v.remove(); window.__cine = ok ? 'done' : 'fail'; };
  v.onended = function () { fin(true); };
  v.onerror = function () { fin(false); };
  v.addEventListener('pointerdown', function () { if (performance.now() - t0 > 1000) fin(true); });
  var p = v.play(); if (p && p.catch) p.catch(function () { fin(false); });
})();
""" % file, true)
	while true:
		var st = JavaScriptBridge.eval("window.__cine", true)
		if st != "playing":
			return st == "done"
		await g.wait(0.05)
	return false


static func _still(g: Game, back: String, figure: String, secs: float) -> void:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	var bg := ColorRect.new()
	bg.color = Color.BLACK
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(bg)
	var pic := TextureRect.new()
	pic.texture = Art.tex(back)
	pic.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	pic.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	pic.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	root.add_child(pic)
	var fig: TextureRect = null
	if figure != "":
		fig = TextureRect.new()
		fig.texture = Art.tex(figure)
		fig.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		fig.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		fig.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
		root.add_child(fig)
	g.ui.add_child(root)
	g.ui.move_child(root, g.ui.get_child_count() - 1)
	var t0 := Time.get_ticks_msec()
	var skip := {"on": false}
	root.gui_input.connect(func(e: InputEvent):
		if (e is InputEventMouseButton or e is InputEventScreenTouch) and e.pressed and Time.get_ticks_msec() - t0 > 1000:
			skip.on = true)
	while not skip.on and Time.get_ticks_msec() - t0 < secs * 1000.0:
		var k := (Time.get_ticks_msec() - t0) / (secs * 1000.0)
		var S := g.ui.size
		var zoom := 1.15 + 0.12 * k
		pic.size = S * zoom
		pic.position = (S - pic.size) * Vector2(0.5 - 0.3 * (k - 0.5), 0.5)
		if fig:
			var h := S.y * 0.55
			fig.size = Vector2(h * fig.texture.get_width() / fig.texture.get_height(), h)
			fig.position = Vector2(S.x * 0.5 - fig.size.x * 0.5, S.y * 0.92 - h)
		root.modulate.a = clampf(minf(k * 6.0, (1.0 - k) * 6.0), 0.0, 1.0)
		await g.wait(0.0)
	root.queue_free()
