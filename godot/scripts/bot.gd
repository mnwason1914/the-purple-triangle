extends Node
## Test driver: `Godot --headless --path godot -- --bot --fast --plan=good|timeout|shallow`.
## Plays chapter 1 through by calling the same target actions a player would, then prints the
## ending and quits. Not part of normal play (only loaded with --bot).

var g: Game
var plan := "good"
var steps: Array = []
var log_lines: Array = []
var t := 0.0
var choice_pref: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	g = get_parent()
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--plan="):
			plan = a.substr(7)
	Engine.time_scale = 6.0
	match plan:
		"good":
			steps = ["photo", "pick:wt", "pot", "back", "pick:mimeo", "crate", "basin", "wall", "pick:booklets", "leni", "pick:screwdriver", "front", "front"]
			choice_pref = {"photo": 0, "crate": 0}
		"shallow":
			steps = ["photo", "pick:wt", "pot", "back", "pick:mimeo", "crate", "pick:booklets", "leni", "front"]
			choice_pref = {"photo": 1, "crate": 1, "search": 1}
		"sus":
			steps = ["photo", "pick:wt", "pot", "back", "pick:mimeo", "crate", "pick:booklets", "leni", "pick:screwdriver", "front", "front"]
			choice_pref = {"photo": 1, "crate": 1, "search": 1}
		"timeout":
			steps = ["photo"]
			choice_pref = {"photo": 0}
	await get_tree().process_frame
	g.new_game()
	_say("start plan=" + plan)


func _say(s: String) -> void:
	print("[bot %6.1f] %s" % [t, s])


func _process(dt: float) -> void:
	t += dt
	if t > 400:
		_say("TIMEOUT state=%s" % g.state)
		get_tree().quit(2)
		return
	if g.state == "end":
		_say("END: " + g.ui.end_title.text + " | " + g.ui.end_text.text.replace("\n", " / "))
		_say("flags: " + JSON.stringify(g.flags))
		get_tree().quit(0)
		return
	if g.state != "play":
		return
	if g.ui.choosing:
		var k := "search" if g.timer.running == false and g.checkpoint_id == "ch1_hide" else ""
		var pref: int = choice_pref.get(k, 0)
		if steps.size() > 0 and choice_pref.has(steps[0]):
			pref = choice_pref[steps[0]]
		_say("choose %d of %s" % [pref, str(g.ui._choice_items.size())])
		g.ui.pick(pref)
		if not steps.is_empty() and (steps[0] == "photo" or steps[0] == "crate"):
			steps.pop_front()
		return
	if g.ui.talking:
		_say("line: " + g.ui.dname.text + ": " + g.ui._full)
		g.ui.advance()
		g.ui.advance()
		return
	if g.busy or g.move_lock:
		return
	if g.ui.objective_label.text == Tx.t("대문 밖으로 나간다"):
		g.place(5.5, 12.4, PI / 2)
		return
	if steps.is_empty():
		if plan == "timeout" and g.timer.running:
			g.timer.left = minf(g.timer.left, 1.0)
		return
	var s: String = steps[0]
	if s != "photo" and g.checkpoint_id != "ch1_hide":
		return
	var id := s.substr(5) if s.begins_with("pick:") else s
	for tg in g.targets:
		if tg.id == id and tg.verb.call() != null:
			_say("use %s (%s) holding=%s" % [id, tg.verb.call(), g.holding])
			if not (s in ["photo", "crate"]):
				steps.pop_front()
			g._use(tg)
			return
