class_name Chapter1
extends RefCounted
## 제1장 「가방 속의 소책자」 — port of src/fps/chapter1.ts (built from story/ch1-spec.md).
## Thalheim, Silesia (Prussia), 29 June 1933, the day after the Magdeburg occupation.
## Line edits against the spec are marked [수정]/[추가] in the web version; the lines are the same.
## Shared mutable state lives in Dictionaries because GDScript lambdas capture locals by value.

const FIRST := "ch1_open"
const BENCH := Vector2(7.4, 6.32)
const PHOTO := Vector2(5.5, 6.0)
const FRONT := Vector2(5.5, 11.0)
const BACK := Vector2(13.98, 8.5)

var fast := false


func _init() -> void:
	fast = OS.get_cmdline_user_args().has("--fast")
	if OS.has_feature("web"):
		var q = JavaScriptBridge.eval("location.search", true)
		fast = fast or (q is String and "fast" in q)


static func P(x: float, y: float) -> Vector2:
	return Vector2(x, y)


func build(g: Game) -> Dictionary:
	var L := g.level
	var photo := g.str_flag("ch1_photo")
	L.photo = ("dust" if g.flag("emptySpot", false) else "wiped") if photo == "burned" else "hidden" if photo == "hidden" else "hung"
	# --- workshop: the bench under the north window wall, the mechanic's things around it
	g.prop("p_workbench", BENCH.x, 6.24, Vector3(0.88, 0.49, 0.38), "s", 0.0, true, 0.43)
	g.solid_box(BENCH.x, 6.24, 0.88, 0.38)
	var top := 0.43
	var radio := g.sprite("obj_radio", 7.06, 6.22, top)
	var mimeo := g.sprite("obj_mimeograph", 7.30, 6.24, top)
	var wt := g.sprite("obj_watchtower", 7.52, 6.24, top)
	var booklets := g.sprite("obj_booklets", 7.72, 6.22, top)
	var screwdriver := g.sprite("obj_screwdriver", 7.42, 6.36, top)
	g.prop("p_stool", 6.58, 6.62, Vector3(0.20, 0.25, 0.20)); g.solid(6.58, 6.62, 0.13)
	g.prop("p_bicycle", 2.68, 6.34, Vector3(0.86, 0.50, 0.24), "s", 0.0, false); g.solid_box(2.68, 6.34, 0.86, 0.24)
	g.prop("p_drum", 2.26, 7.28, Vector3(0.30, 0.50, 0.30), "s", 0.0, true, 0.43); g.solid(2.26, 7.28, 0.17)
	g.prop("p_wheels", 2.62, 10.76, Vector3(0.50, 0.35, 0.22), "n"); g.solid_box(2.62, 10.76, 0.50, 0.22)
	g.prop("p_cabinet", 8.74, 9.65, Vector3(0.52, 0.93, 0.26), "w", 0.0, false); g.solid_box(8.74, 9.65, 0.26, 0.52)
	g.prop("p_parts", 8.68, 10.72, Vector3(0.39, 0.34, 0.32), "n"); g.solid_box(8.68, 10.72, 0.39, 0.32)
	# workshop lived-in dressing (walkways, photo wall & creaky boards stay clear)
	g.prop("p_tool_rack", 2.08, 6.60, Vector3(0.62, 0.46, 0.11), "e", 0.34, false)
	g.prop("p_tool_rack", 4.46, 6.08, Vector3(0.62, 0.46, 0.11), "s", 0.34, false)
	g.prop("p_curtains", 8.50, 6.06, Vector3(0.82, 0.56, 0.08), "s", 0.44, false)
	g.prop("p_curtains", 2.06, 8.50, Vector3(0.82, 0.56, 0.08), "e", 0.44, false)
	g.prop("p_plant", 2.26, 8.12, Vector3(0.22, 0.41, 0.22), "e", 0.0, false); g.solid(2.26, 8.12, 0.13)
	g.prop("p_leni_desk", 2.34, 9.58, Vector3(0.38, 0.43, 0.28), "e", 0.0, false); g.solid_box(2.34, 9.58, 0.28, 0.38)
	g.prop("p_bench", 3.95, 10.74, Vector3(0.69, 0.44, 0.25), "n", 0.0, false); g.solid_box(3.95, 10.74, 0.69, 0.25)
	g.prop("p_coat_rack", 6.72, 10.80, Vector3(0.43, 0.90, 0.17), "n", 0.0, false); g.solid_box(6.72, 10.80, 0.43, 0.18)
	g.prop("p_cupboard", 8.74, 7.28, Vector3(0.50, 0.55, 0.26), "w", 0.0, false); g.solid_box(8.74, 7.28, 0.26, 0.50)
	g.prop("p_rug", 7.62, 7.42, Vector3(1.18, 0.02, 0.74), "s", 0.0, false)
	g.prop("p_rug", 3.10, 9.58, Vector3(1.18, 0.02, 0.74), "s", 0.0, false)
	g.sprite("obj_bulb", 5.5, 8.3, Level.WALL_H - Art.size.obj_bulb.y, 0.0, 1.4)
	# --- kitchen: range on the north wall, table in the middle, dresser by the back door, wash stand under the window
	g.prop("p_range", 11.28, 7.22, Vector3(0.60, 0.43, 0.38)); g.solid_box(11.28, 7.22, 0.60, 0.38)
	var pot := g.sprite("obj_coffeepot", 11.45, 7.18, 0.43)
	g.prop("p_rug", 11.95, 8.68, Vector3(1.18, 0.02, 0.74), "s", 0.0, false)
	g.prop("p_table", 11.95, 8.68, Vector3(0.72, 0.39, 0.46)); g.solid_box(11.95, 8.68, 0.72, 0.46)
	g.sprite("obj_bread", 11.80, 8.65, 0.39)
	g.sprite("obj_cups", 12.10, 8.76, 0.39)
	g.sprite("obj_jug", 12.18, 8.56, 0.39)
	g.prop("p_chair", 11.38, 8.68, Vector3(0.23, 0.45, 0.24), "e", 0.0, false); g.solid(11.38, 8.68, 0.14)
	g.prop("p_chair", 11.95, 9.18, Vector3(0.23, 0.45, 0.24), "n", 0.0, false); g.solid(11.95, 9.18, 0.14)
	g.prop("p_chair", 12.52, 8.68, Vector3(0.23, 0.45, 0.24), "w", 0.0, false); g.solid(12.52, 8.68, 0.14)
	g.prop("p_dresser", 13.74, 7.48, Vector3(0.65, 0.88, 0.26), "w", 0.0, false); g.solid_box(13.74, 7.48, 0.26, 0.65)
	g.sprite("obj_lamp", 13.72, 7.36, 0.88)
	g.prop("p_basin", 12.90, 9.76, Vector3(0.45, 0.52, 0.28), "n", 0.0, true, 0.40); g.solid_box(12.90, 9.76, 0.45, 0.28)
	# kitchen lived-in dressing
	g.prop("p_coal_bucket", 10.36, 7.26, Vector3(0.22, 0.29, 0.22), "s", 0.0, false); g.solid(10.36, 7.26, 0.13)
	g.prop("p_firewood_basket", 12.06, 7.26, Vector3(0.31, 0.25, 0.24), "s", 0.0, false); g.solid(12.06, 7.26, 0.16)
	g.prop("p_wall_shelf", 12.78, 7.10, Vector3(0.55, 0.26, 0.14), "s", 0.54, false)
	g.prop("p_cupboard", 10.55, 9.74, Vector3(0.50, 0.55, 0.26), "n", 0.0, false); g.solid_box(10.55, 9.74, 0.50, 0.26)
	g.prop("p_plant", 13.72, 9.66, Vector3(0.22, 0.41, 0.22), "w", 0.0, false); g.solid(13.72, 9.66, 0.13)
	# --- cellar
	var depth := g.str_flag("ch1_potato_depth")
	var crate := g.prop("p_crate", 2.0, 1.32, Vector3(0.52, 0.34, 0.38))
	crate.set_top("p_crate_top_deep" if depth == "deep" else "p_crate_top_shallow" if depth == "shallow" else "p_crate_top")
	g.solid_box(2.0, 1.32, 0.52, 0.38)
	g.prop("p_wheels", 5.38, 1.22, Vector3(0.50, 0.35, 0.22)); g.solid_box(5.38, 1.22, 0.50, 0.22)
	g.prop("p_shelf", 6.76, 2.48, Vector3(0.54, 0.81, 0.22), "w", 0.0, false); g.solid_box(6.76, 2.48, 0.22, 0.54)
	g.prop("p_barrel", 1.26, 3.68, Vector3(0.32, 0.44, 0.32), "s", 0.0, true, 0.42); g.solid(1.26, 3.68, 0.18)
	g.prop("p_barrel", 6.30, 3.68, Vector3(0.32, 0.44, 0.32), "s", 0.0, true, 0.42); g.solid(6.30, 3.68, 0.18)
	g.prop("p_sacks", 4.82, 3.68, Vector3(0.45, 0.34, 0.30), "n"); g.solid_box(4.82, 3.68, 0.45, 0.30)
	# cellar lived-in dressing
	g.prop("p_crate_stack", 3.25, 1.28, Vector3(0.45, 0.53, 0.32), "s", 0.0, false); g.solid_box(3.25, 1.28, 0.45, 0.32)
	g.prop("p_coal_bucket", 4.25, 1.24, Vector3(0.22, 0.29, 0.22), "s", 0.0, false); g.solid(4.25, 1.24, 0.13)
	g.prop("p_crate_stack", 1.28, 2.52, Vector3(0.45, 0.53, 0.32), "e", 0.0, false); g.solid_box(1.28, 2.52, 0.32, 0.45)
	g.sprite("obj_bulb", 2.8, 2.0, Level.WALL_H - Art.size.obj_bulb.y, 0.0, 1.2)
	# --- yard
	g.prop("p_woodpile", 9.66, 12.75, Vector3(0.72, 0.46, 0.33), "w"); g.solid_box(9.66, 12.75, 0.33, 0.72)
	g.prop("p_pump", 1.35, 12.48, Vector3(0.33, 0.68, 0.31), "e", 0.0, false); g.solid(1.35, 12.48, 0.18)
	g.prop("p_barrel", 1.35, 13.45, Vector3(0.32, 0.44, 0.32), "e", 0.0, false); g.solid(1.35, 13.45, 0.18)
	g.prop("p_bench", 3.45, 12.26, Vector3(0.69, 0.44, 0.25), "s", 0.0, false); g.solid_box(3.45, 12.26, 0.69, 0.25)
	g.prop("p_plant", 4.55, 12.24, Vector3(0.22, 0.41, 0.22), "s", 0.0, false); g.solid(4.55, 12.24, 0.12)
	var helena := g.actor("spr_helena", 7.75, 10.28)
	var helena_solid := g.solid(7.75, 10.28, 0.25)
	var leni := g.actor("spr_leni_draw", 2.9, 9.55)
	var leni_solid := g.solid(2.9, 9.55, 0.3)
	return {"radio": radio, "wt": wt, "mimeo": mimeo, "booklets": booklets, "screwdriver": screwdriver, "pot": pot, "crate": crate,
		"helena": helena, "helena_solid": helena_solid, "leni": leni, "leni_solid": leni_solid,
		"st": {"wt": "bench", "mimeo": "bench", "booklets": "bench", "screwdriver": "bench"}}


func init_flags(g: Game) -> void:
	if not g.flags.has("suspicion"):
		g.flags.merge({"suspicion": 10, "composure": 80, "solidarity": 50, "ch1_photo": "", "ch1_lock_sabotaged": false,
			"ch1_potato_depth": "", "dirtOnHands": false, "emptySpot": false})
	g.composure = float(g.flags.composure)


func keep_composure(g: Game) -> void:
	g.setf("composure", int(round(g.composure)))


func title(g: Game) -> void:
	build(g)
	g.place(6.2, 9.4, -PI / 2)
	g.eye = 0.71


func start(g: Game, cp: String) -> void:
	init_flags(g)
	if cp == "ch1_hide":
		hide(g, build(g), true)
	elif cp == "ch1_after":
		after(g, build(g), true)
	else:
		g.flags = {}
		init_flags(g)
		opening(g)


# ===================================================================== 1-1 workshop
func opening(g: Game) -> void:
	g.checkpoint("ch1_open")
	var w := build(g)
	g.place(6.4, 8.9, -PI / 2 + 0.35)
	g.audio.music("home")
	g.audio.ambience("room")
	g.ui.fade_now(true)
	if not fast:
		await Cinema.intro(g)
		await g.card("1933년 6월 29일 정오<small>프로이센 슐레지엔 · 탈하임</small>", 2.2)
		g.hide_card()
	g.hud(true)
	g.progress = "0/3"
	g.ui.fade(false)
	await g.wait(0.6)

	g.set_tex(w.radio, "obj_radio_on")
	w.radio.bright = 0.9
	g.sfx("radio")
	await g.say("radio", "어제 유월 이십팔일, 돌격대원 서른 명이 마그데부르크의 성경연구생 본부를 점거했습니다.")
	g.sfx("radio")
	await g.say("radio", "현재 옥상에는 하켄크로이츠 깃발이 내걸렸습니다.")
	g.set_tex(w.radio, "obj_radio")
	w.radio.bright = 0.0
	g.sfx("select")
	await g.say("helena", "금지령이 떨어진 지 며칠이나 됐다고… 마그데부르크마저 넘어갔구나.")
	await g.say("paul", "어머니, 너무 걱정 마세요. 작업대에 둔 것부터 오늘 다 치울게요.")
	await g.say("leni", "오빠, 라디오 아저씨는 왜 저렇게 무서운 소리로 말해?")
	await g.say("paul", "괜찮아, 레니. 오빠랑 엄마가 있으니까 넌 앉아서 그림 그리고 있렴.")
	g.end_talk()
	g.objective("작업실 안을 둘러본다")
	g.move_lock = false

	var s := {"photo_done": false, "nudged": false}
	var look_bench := func():
		await g.say("paul", "어젯밤 마르타 자매가 읍내에서 맡긴 등사기와 인쇄물이야. 해 지기 전에 숨겨야 해.")
		g.end_talk()
	var look := func(): return "살피기"
	var use_photo := func():
		await g.think("돌아가신 아버지와 회중 형제들이 나란히 서서 찍은 사진이다.")
		if not s.nudged:
			await g.say("helena", "파울, 그 액자부터 내려놓으렴. 경찰 손에 형제들 얼굴이 넘어가면 안 된다.")
		await g.think("태워 버리면 아버지 얼굴이 담긴 마지막 사진이 사라진다. 그렇다고 그냥 둘 수도 없어.")
		var i := await g.choose(["액자에서 빼내 아궁이 불에 태운다", "액자 뒤판 나무 틈에 밀어 숨긴다"])
		if i == 0:
			await g.say("paul", "어머니, 죄송해요. 재 한 줌도 안 남게 태울게요.")
			g.end_talk()
			await g.fade(true)
			g.sfx("fire")
			g.setf("ch1_photo", "burned")
			g.setf("emptySpot", true)
			g.level.photo = "dust"
			await g.wait(1.2)
			await g.fade(false)
		else:
			await g.say("paul", "차마 못 태우겠어요. 액자 뒤판 틈에 깊숙이 끼워 둘게요.")
			g.end_talk()
			g.sfx("paper")
			g.setf("ch1_photo", "hidden")
			g.level.photo = "hidden"
		s.photo_done = true
	g.targets = [
		{"id": "mimeo", "x": w.mimeo.x, "y": w.mimeo.y, "r": 0.12, "name": "등사기", "verb": look, "use": look_bench},
		{"id": "wt", "x": w.wt.x, "y": w.wt.y, "r": 0.12, "name": "「파수대」 묶음", "verb": look, "use": look_bench},
		{"id": "booklets", "x": w.booklets.x, "y": w.booklets.y, "r": 0.1, "name": "소책자 묶음", "verb": look, "use": look_bench},
		{"id": "photo", "x": PHOTO.x, "y": PHOTO.y, "r": 0.3, "name": "가족사진 액자", "verb": func(): return null if s.photo_done else "살피기", "use": use_photo},
	]
	# nudge toward the photo if the player wanders
	var nudge := func():
		await g.wait(22)
		if s.photo_done or g.state != "play":
			return
		s.nudged = true
		g.bark("helena", "파울, 벽에 걸린 액자부터 내리렴. 형제들 얼굴이 경찰에 넘어가면 큰일 나.", 3.4)
		g.objective("벽에 걸린 가족사진 액자를 살핀다")
	nudge.call()
	await g.until(func(): return s.photo_done and not g.ui.talking)
	await knock(g)
	await hide(g, w, false)


func knock(g: Game) -> void:
	g.move_lock = true
	g.targets = []
	await g.wait(0.4)
	g.sfx("knock_hard")
	g.haptic(140)
	await g.wait(0.5)
	g.sfx("knock_hard", 1.2)
	await g.say("otto", "바그너 군! 안에 있는 거 다 아네. 순경 나리들 모시고 왔으니 당장 문 열게!", "오토 베커 (문밖)")
	await g.say("police", "경찰이다, 가택 수색 나왔소! 당장 열지 않으면 문을 따고 들어가겠소!", "순경 (문밖)")
	await g.say("helena", "이 사람들이 벌써…! 파울, 작업대 위 물건들부터 어서 감추렴!")
	g.sfx("scrape")
	await g.say("otto", "경관님, 비켜 보십시오. 이 동네 자물쇠는 전부 제 손을 거쳤습니다.", "오토 베커 (문밖)")
	g.end_talk()


# ===================================================================== 1-2 hiding (90 s)
func hide(g: Game, w: Dictionary, resumed: bool) -> void:
	g.checkpoint("ch1_hide")
	if resumed:
		g.place(6.6, 7.4, -PI / 2)
		g.ui.fade(false)
		g.hud(true)
		g.audio.ambience("room")
	var st: Dictionary = w.st
	var s := {"done": 0, "forced": false, "opened": false}
	var refresh := func():
		var h := g.holding
		var done: int = s.done
		g.objective(
			"「파수대」를 부엌 레인지 위 커피포트에 넣는다" if h == "wt" else
			"커피포트를 부엌 뒷문 너머 이모부에게 건넨다" if h == "pot" else
			"등사기를 지하실 감자 상자 속에 묻는다" if h == "mimeo" else
			"소책자를 레니의 가방에 넣어 보낸다" if h == "booklets" else
			"현관문 안쪽 걸쇠 나사를 단단히 조인다" if h == "screwdriver" else
			"부엌 세숫대야에서 손에 묻은 흙을 씻는다" if g.flag("dirtOnHands", false) else
			"준비를 마치고 현관문을 연다" if done == 3 else
			"은닉 %d/3 — 「파수대」 · 등사기 · 소책자" % done)
	var set_done := func():
		s.done = (1 if st.wt == "out" else 0) + (1 if st.mimeo == "crate" else 0) + (1 if st.booklets == "leni" else 0)
		g.progress = "%d/3" % s.done
		refresh.call()
	g.progress = "0/3"
	refresh.call()
	g.audio.music("tense")
	g.move_lock = false

	var item_sprites := {"wt": w.wt, "mimeo": w.mimeo, "booklets": w.booklets, "screwdriver": w.screwdriver}
	var leni: Actor = w.leni
	var pick := func(id: String, name: String, after_pick: Callable) -> Dictionary:
		var sp: Spr = item_sprites[id]
		var verb := func(): return "집기" if (st[id] == "bench" and g.holding == "") else null
		var use := func():
			st[id] = "held"
			g.holding = id
			sp.hidden = true
			g.sfx("pick")
			refresh.call()
			if after_pick.is_valid():
				after_pick.call()
		return {"id": id, "x": sp.x, "y": sp.y, "r": 0.1 if id == "screwdriver" else 0.12, "name": name, "verb": verb, "use": use}

	var use_bench := func():
		var h := g.holding
		st[h] = "bench"
		item_sprites[h].hidden = false
		g.holding = ""
		g.sfx("drop")
		refresh.call()
	var use_pot := func():
		st.wt = "pot"
		g.holding = "pot"
		w.pot.hidden = true
		g.sfx("paper")
		refresh.call()
	var close_back := func():
		await g.bark("uncle", "알았다. 순경들 돌아가거든 뒷문 두드려라.", 2.4, "이모부 (문틈)")
		await g.wait(1.6)
		g.level.set_back(false)
		g.sfx("door", 0.6)
	var use_back := func():
		g.level.set_back(true)
		g.sfx("door")
		g.holding = ""
		st.wt = "out"
		g.inc("solidarity", 5)
		set_done.call()
		g.bark("paul", "이모부, 순경들이 왔어요. 이 커피포트 좀 잠시 맡아 주세요.", 2.4)
		close_back.call()
	var use_crate := func():
		await g.think("쇠꼬챙이로 찔러 볼지도 몰라. 바닥까지 깊숙이 파묻어야 안전해.")
		var i := await g.choose(["감자를 다 들어내고 바닥에 깊이 묻는다 (-12초)", "감자 몇 알만 걷어 내고 얕게 덮어 둔다 (-4초)"])
		g.end_talk()
		g.holding = ""
		st.mimeo = "crate"
		g.sfx("hide")
		g.sfx("step_snow")
		if i == 0:
			g.add_time(-12)
			g.setf("ch1_potato_depth", "deep")
			g.setf("dirtOnHands", true)
			w.crate.set_top("p_crate_top_deep")
			set_done.call()
			g.bark("think", "손톱 밑에 젖은 흙이 끼었어. 부엌 세숫대야에서 씻어 내야 해.", 3)
		else:
			g.add_time(-4)
			g.setf("ch1_potato_depth", "shallow")
			w.crate.set_top("p_crate_top_shallow")
			set_done.call()
			g.bark("think", "시간은 벌었지만… 상자 위쪽 흙이 파헤쳐진 티가 나는걸.", 3)
	var leni_go := func():
		g.holding = ""
		st.booklets = "leni"
		g.inc("solidarity", 5)
		set_done.call()
		g.sfx("paper")
		g.bark("paul", "레니, 이 소책자들 가방에 넣고 대문 밖에서 오빠 기다려 줄래?", 2.8)
		await g.bark("leni", "응, 오빠! 가방 꼭 메고 대문 밖에 얌전히 서 있을게.", 2.6)
		g.solids.erase(w.leni_solid)
		leni.look("spr_leni_bag")
		leni.speed = 1.3
		await g.walk(leni, [P(3.0, 8.5), P(8.6, 8.5), P(13.5, 8.5)])
		if not g.actors.has(leni):
			return
		g.level.set_back(true)
		g.sfx("door", 0.6)
		g.remove_actor(leni)
		await g.wait(0.8)
		g.level.set_back(false)
	var use_leni := func(): leni_go.call()
	var use_basin := func():
		g.sfx("wash")
		g.setf("dirtOnHands", false)
		refresh.call()
		g.bark("think", "좋아, 손톱 밑에 낀 흙까지 깨끗이 씻어 냈어.")
	var use_wall := func():
		g.sfx("wipe")
		g.level.photo = "wiped"
		g.setf("emptySpot", false)
		g.bark("think", "기름걸레로 액자가 걸려 있던 먼지 테두리를 지웠어.")
	var verb_front := func():
		if g.holding == "screwdriver":
			return "조이기"
		if s.done == 3 and g.holding == "":
			return "문 열기"
		return "살피기" if g.holding == "" else null
	var use_front := func():
		if g.holding == "screwdriver":
			g.sfx("screw")
			g.holding = ""
			st.screwdriver = "used"
			g.setf("ch1_lock_sabotaged", true)
			g.level.front_scratched = true
			g.add_time(25)
			refresh.call()
			g.bark("think", "안쪽 빗장 나사를 끝까지 조여 놓았어. 자물쇠를 따려면 애 좀 먹을 거야.", 3)
		elif s.done == 3:
			s.opened = true
		else:
			g.bark("think", "지금 열면 끝장이야. 아직 숨기지 못한 물건이 있어.")

	g.targets = [
		pick.call("wt", "「파수대」 묶음", func(): g.bark("think", "부엌 레인지 위 빈 커피포트 속에 말아 넣자.")),
		pick.call("mimeo", "등사기", Callable()),
		pick.call("booklets", "소책자 묶음", Callable()),
		pick.call("screwdriver", "드라이버", Callable()),
		{"id": "bench", "x": BENCH.x, "y": BENCH.y, "r": 0.45, "name": "작업대", "verb": func(): return "내려놓기" if (g.holding != "" and g.holding != "pot") else null, "use": use_bench},
		{"id": "pot", "x": w.pot.x, "y": w.pot.y, "r": 0.12, "name": "법랑 커피포트", "verb": func(): return "넣기" if g.holding == "wt" else null, "use": use_pot},
		{"id": "back", "x": BACK.x, "y": BACK.y, "r": 0.3, "name": "부엌 뒷문", "verb": func(): return "건네기" if g.holding == "pot" else null, "use": use_back},
		{"id": "crate", "x": 2.0, "y": 1.45, "r": 0.3, "name": "감자 상자", "verb": func(): return "파묻기" if g.holding == "mimeo" else null, "use": use_crate},
		{"id": "leni", "x": leni.x, "y": leni.y, "r": 0.2, "name": "레니", "verb": func(): return "건네기" if (g.holding == "booklets" and st.booklets == "held") else null, "use": use_leni},
		{"id": "basin", "x": 12.9, "y": 9.64, "r": 0.25, "name": "세숫대야", "verb": func(): return "손 씻기" if (g.flag("dirtOnHands", false) and g.holding == "") else null, "hold": func(): return 3.0, "use": use_basin},
		{"id": "wall", "x": PHOTO.x, "y": PHOTO.y, "r": 0.3, "name": "사진 자국", "verb": func(): return "닦기" if (g.level.photo == "dust" and g.holding == "") else null, "hold": func(): return 2.0, "use": use_wall},
		{"id": "front", "x": FRONT.x, "y": FRONT.y, "r": 0.3, "name": "현관문", "verb": verb_front, "hold": func(): return 2.0 if g.holding == "screwdriver" else null, "use": use_front},
		{"id": "helena", "x": w.helena.x, "y": w.helena.y, "r": 0.2, "name": "어머니", "verb": func(): return null if g.holding != "" else "살피기", "use": func(): g.bark("helena", "서두르렴, 파울! 앞문은 엄마가 막고 서 있을게.")},
	]

	# footsteps that carry outside
	var noise := {"line": 0}
	g.on_noise = func(_lvl):
		g.add_time(-5)
		g.composure = maxf(0.0, g.composure - 6)
		g.haptic(60)
		g.sfx("creak", 1.4)
		var lines := [["police", "안에서 분주한 발소리가 들리는군! 베커 반장, 서두르시오!", "순경 (문밖)"], ["otto", "마룻바닥 삐걱거리는 소리 다 들리네, 바그너 군!", "오토 베커 (문밖)"]]
		var l: Array = lines[noise.line % 2]
		noise.line += 1
		g.bark(l[0], l[1], 2.4, l[2])
	g.timer.marks = [
		{"at": 45, "fn": func(): g.bark("otto", "원, 자물쇠가 왜 이리 뻑뻑한가! 걸쇠만 넘기면 곧 열립니다!", 3, "오토 베커 (문밖)")},
		{"at": 20, "fn": func(): g.bark("helena", "파울, 다 감췄니? 문 부서지기 전에 우리 손으로 열어야 한다!", 3)},
	]
	g.start_timer(90, func(): s.forced = true)
	# the lock being worked on
	var lock := func():
		while g.timer.running and g.state != "end":
			await g.wait(1.4 + randf())
			if g.timer.running and not g.timer.paused:
				g.sfx("scrape", 0.7)
	lock.call()

	await g.until(func(): return (s.opened or s.forced) and not g.busy and not g.ui.talking and not g.ui.choosing)
	g.stop_timer()
	g.on_noise = Callable()
	g.targets = []
	if st.booklets == "leni" and g.actors.has(leni):
		leni.place(13.5, 8.5)
		g.remove_actor(leni)
		g.level.set_back(false)
	g.move_lock = true
	keep_composure(g)
	await search(g, w, s.forced)


# ===================================================================== 1-3 search
func search(g: Game, w: Dictionary, forced: bool) -> void:
	g.audio.music("search")
	var st: Dictionary = w.st
	var sus := func(n: int): g.inc("suspicion", n)
	var S := func() -> int: return int(g.flag("suspicion", 10))
	g.hands_on = true
	if forced:
		g.sfx("unlock")
		await g.wait(0.3)
		g.sfx("slam")
		g.haptic(200)
		g.setf("ch1_forced", true)
		sus.call(10)
	else:
		g.sfx("door")
	g.level.set_front(true)
	var pA := g.actor("spr_police", 5.5, 12.6)
	var pB := g.actor("spr_police2", 4.9, 13.0)
	var otto := g.actor("spr_otto", 6.1, 13.0)
	var cops := [pA, pB, otto]
	g.walk(pA, [P(5.5, 10.25)])
	g.walk(pB, [P(5.5, 11.5), P(4.75, 10.2)])
	g.walk(otto, [P(5.5, 11.6), P(6.3, 10.2)])
	g.pa = atan2(10.6 - g.py, 5.5 - g.px)
	await g.wait(1.4)

	var unhidden := []
	for k in ["wt", "mimeo", "booklets"]:
		if not ["out", "crate", "leni"].has(st[k]):
			unhidden.append(k)
	if forced:
		await g.say("otto", "자, 빗장이 넘어갔습니다! 들어가시지요, 경관님!")
	if not unhidden.is_empty():
		g.setf("ch1_seized", ",".join(unhidden))
		await arrest(g, w, "mimeo" if unhidden.has("mimeo") else "print", cops)
		return

	if not forced:
		await g.say("police", "대낮에 문을 걸어 잠그고 뭘 하느라 이제야 여는 거요!")
		await g.say("paul", "문을 열었습니다, 경관님. 들어오시지요.")
	await g.say("otto", "하일 히틀러! 경관님, 이 집 아들이 이 동네 성경연구생 우두머리 격입니다.")
	await g.say("police", "지금부터 작업실과 지하실을 수색한다. 두 사람은 저쪽 벽에 붙어 서 있소.")
	g.end_talk()
	await g.fade(true)
	g.crouch = false
	g.holding = ""
	g.place(8.35, 9.3, PI - 0.25)
	w.helena.place(8.4, 10.25)
	g.solids.erase(w.helena_solid)
	pA.place(5.5, 10.1)
	pB.place(4.6, 10.0)
	otto.place(5.6, 10.55)
	await g.fade(false)
	g.look_lock = false

	# patrol (about 20 seconds)
	g.walk(pA, [P(7.2, 7.1), P(9.4, 8.5), P(11.4, 8.2), P(12.4, 9.0), P(9.6, 8.5), P(6.6, 9.6)])
	g.walk(pB, [P(3.5, 7.0), P(3.5, 5.2), P(3.5, 4.1), P(2.6, 2.3)])
	await g.wait(1.2)
	if g.flag("ch1_lock_sabotaged", false):
		await g.say("otto", "경관님, 이것 보십시오! 안에서 빗장 나사를 일부러 꽉 조여 놓았습니다!")
		await g.say("paul", "제 집 문입니다. 안쪽 빗장은 제가 조여 두었습니다.")
		g.end_talk()
		sus.call(10)
		g.composure -= 5
	if g.flag("dirtOnHands", false):
		await g.wait(1.5)
		pA.go([P(7.4, 9.3)])
		await g.until(func(): return not pA.moving())
		await g.say("police", "잠깐, 네 손톱 밑에 웬 젖은 흙이 이리 묻어 있나? 이봐, 지하실부터 샅샅이 뒤져!")
		g.end_talk()
		sus.call(10)
		g.composure -= 10
		g.walk(pA, [P(9.4, 8.5), P(11.4, 8.2), P(9.6, 8.5), P(6.6, 9.6)])
	await g.walk(otto, [P(5.5, 7.4), P(5.5, 6.7)])
	if g.str_flag("ch1_photo") == "burned" and g.flag("emptySpot", false):
		await g.say("otto", "바그너 군, 여기 걸려 있던 자네 부친 사진 액자는 어디로 치웠나? 먼지 자국이 선명한데.")
		var i := await g.choose(["“제가 떼어 냈습니다. 지금은 없습니다.”", "“그건 왜 물으시는 겁니까?”"], 8)
		if i == 0:
			await g.say("paul", "제가 직접 떼어 냈습니다. 지금은 거기 없습니다.")
			await g.say("otto", "흥, 우리가 올 줄 알고 미리 치웠다 이거지.")
		else:
			if i == 1:
				await g.say("paul", "제 집 벽인데, 그건 왜 물으시는 겁니까?")
			else:
				await g.say("paul", "…….")
			sus.call(15)
			g.composure -= 10
		g.end_talk()
	g.walk(otto, [P(4.2, 8.9), P(6.4, 10.1)])
	await g.wait(3)
	await g.walk(pB, [P(3.5, 4.1), P(3.5, 6.4), P(4.6, 9.6)])
	var dug: bool = g.str_flag("ch1_potato_depth") == "shallow" or g.flag("dirtOnHands", false)
	if not dug or S.call() < 15:
		await g.say("police2", "지하실은 싹 뒤져 봤는데, 싹 난 감자 상자하고 헌 바퀴뿐입니다.")
		g.end_talk()
	await g.until(func(): return not pA.moving() and not otto.moving())

	if S.call() >= 15:
		if dug:
			pB.go([P(7.5, 9.6)])
			await g.until(func(): return not pB.moving())
			await g.say("police2", "이봐, 지하실 감자 상자 흙을 누군가 방금 파헤쳐 놓았는데?")
			var i := await g.choose(["“제 집 지하실입니다. 직접 확인해 보시죠.”", "“제가… 아까 손으로 좀 파헤쳤습니다.”"], 8)
			if i == 0:
				await g.say("paul", "제 집 지하실입니다. 의심스러우면 직접 확인해 보십시오.")
			else:
				await g.say("paul", "제가… 아까 손으로 흙을 좀 파헤쳤습니다." if i == 1 else "…….")
				sus.call(15)
				g.composure -= 10
			g.end_talk()
		if g.str_flag("ch1_photo") == "hidden":
			otto.go([P(5.5, 6.7)])
			await g.until(func(): return not otto.moving())
			await g.say("otto", "잠깐, 이 액자 뒤판이 왜 이리 불룩한가? 어디 뒷면을 열어 보자고!")
			await g.say("helena", "세상 떠난 그이가 남긴 사진이에요. 제발 그것만은 손대지 마세요.")
			if S.call() >= 30:
				await g.say("otto", "호오, 모여서 찍은 얼굴이 여럿이군. 이건 증거물로 내가 챙기겠소.")
				g.setf("ch1_photo_taken", true)
				g.level.photo = "dust"
			else:
				await g.say("police", "고인 사진 한 장 가지고 유난 떨지 마시오, 베커 반장.")
			g.end_talk()
			g.walk(otto, [P(6.2, 10.1)])
		if S.call() >= 40:
			await g.say("police2", "아무래도 수상합니다. 감자 상자를 바닥까지 엎어 보겠습니다.")
			g.end_talk()
			await g.walk(pB, [P(3.5, 7.0), P(3.5, 4.1), P(2.6, 2.3)])
			await g.wait(1.5)
			if g.str_flag("ch1_potato_depth") == "shallow":
				g.setf("ch1_seized", "mimeo")
				await arrest(g, w, "dig", cops)
				return
			await g.walk(pB, [P(3.5, 4.1), P(3.5, 6.4), P(4.6, 9.6)])
			await g.say("police2", "쇠꼬챙이로 흙 바닥까지 찔러 봤는데, 감자 말고는 걸리는 게 없습니다.")
			g.end_talk()

	pA.go([P(5.5, 10.2)])
	otto.go([P(6.1, 10.3)])
	pB.go([P(4.9, 10.2)])
	await g.until(func(): return not pA.moving() and not otto.moving() and not pB.moving())
	await g.say("police", "금지 인쇄물도 등사기도 안 나오는군. 오늘은 허탕이오, 베커 반장.")
	await g.say("otto", "운 좋은 줄 알게, 바그너 군. 자네가 뭘 빼돌렸는지 내가 끝까지 밝혀낼 테니.")
	await g.say("police", "철수한다. 다음 집으로 가지. 하일 히틀러.")
	g.end_talk()
	g.walk(pA, [P(5.5, 12.6), P(5.5, 13.6)])
	g.walk(pB, [P(5.5, 11.4), P(5.2, 13.6)])
	await g.walk(otto, [P(5.6, 11.6), P(5.9, 13.6)])
	await g.wait(0.6)
	await g.fade(true)
	for a in cops:
		g.remove_actor(a)
	keep_composure(g)
	await after(g, w, false)


# ===================================================================== yard & ending
func after(g: Game, w: Dictionary, _resumed: bool) -> void:
	g.checkpoint("ch1_after")
	g.level.set_front(true)
	g.targets = []
	g.timer.left = 0.0
	g.progress = "3/3"
	if g.actors.has(w.leni):
		g.remove_actor(w.leni)
	w.helena.place(8.4, 10.25)
	g.place(8.0, 9.6, PI * 0.75)
	g.hud(true)
	g.ui.fade(false)
	g.audio.music("home")
	g.audio.ambience("room")
	g.objective("대문 밖으로 나간다")
	g.move_lock = false
	var leni := g.actor("spr_leni_bag", 5.5, 13.55)
	g.solid(5.5, 13.55, 0.25)
	await g.until(func(): return Vector2(g.px - leni.x, g.py - leni.y).length() < 1.35 and not g.ui.talking)
	g.move_lock = true
	g.pa = atan2(leni.y - g.py, leni.x - g.px)
	g.audio.ambience("street")
	await g.say("leni", "오빠, 그 사람들 다 갔어? 이제 가방 벗어도 돼?")
	await g.say("paul", "응, 무거웠지. 이리 주렴, 레니. 정말 장하다, 내 동생.")
	await g.say("helena", "다친 데 없니, 얘들아. 어서 안으로 들어오렴… 이제 시작일 뿐이구나.", "헬레나 (문간)")
	g.end_talk()
	await g.fade(true)
	g.hud(false)
	if not fast:
		await Cinema.outro(g, true)
	ending(g)


func arrest(g: Game, w: Dictionary, why: String, cops: Array) -> void:
	g.setf("ch1_found", why)
	if why == "mimeo":
		await g.say("police", "작업대에 등사기가 버젓이 놓여 있군! 여기서 불온문서를 찍어 냈겠다!")
	elif why == "dig":
		await g.say("police2", "찾았습니다! 감자 상자 흙 밑에 기름종이로 싼 등사기가 있습니다!")
	else:
		await g.say("police", "금지된 성경연구생 인쇄물이군. 한 장도 남기지 말고 전부 압수해!")
	await g.say("otto", "보십시오, 경관님! 제 눈은 못 속인다니까요!")
	await g.say("police", "파울 바그너, 현행범으로 연행한다. 서까지 함께 가야겠소.")
	await g.say("helena", "안 돼요, 경관님! 파울, 내 아들아…!")
	await g.say("paul", "어머니, 울지 마세요. 레니 잘 부탁드려요.")
	g.end_talk()
	g.setf("paul_detained", true)
	keep_composure(g)
	await g.fade(true)
	for a in cops:
		g.remove_actor(a)
	if g.actors.has(w.leni):
		g.remove_actor(w.leni)
	g.level.set_front(true)
	g.place(5.5, 12.25, PI / 2)
	g.hands_on = false
	var with_bag: bool = w.st.booklets == "leni"
	g.actor("spr_leni_bag" if with_bag else "spr_leni", 5.4, 13.5)
	g.actor("spr_police", 6.2, 12.6)
	g.actor("spr_police2", 4.8, 12.6)
	g.hud(false)
	g.audio.ambience("street")
	await g.fade(false)
	await g.say("leni", "오빠, 순경 아저씨들이랑 어디 가?")
	await g.say("paul", "걱정하지 마, 레니. 어머니 말씀 잘 듣고 있어야 해.")
	g.end_talk()
	await g.wait(0.8)
	await g.fade(true)
	ending(g)


func ending(g: Game) -> void:
	g.audio.music("ending")
	var f := g.flags
	var lines: Array = []
	if f.get("ch1_photo") == "burned":
		lines.append("아궁이 속에서 아버지의 사진은 한 줌 재가 되었다.")
	elif f.get("ch1_photo_taken", false):
		lines.append("사진 속 얼굴들은 베커의 주머니로 넘어가고 말았다.")
	else:
		lines.append("아버지의 사진은 액자 뒤판 틈새에 무사히 남았다.")
	var seized := str(f.get("ch1_seized", "")).split(",")
	if seized.has("mimeo"):
		lines.append("밤마다 돌리던 등사기는 경찰의 손에 압수되었다.")
	elif f.get("ch1_potato_depth") == "deep":
		lines.append("등사기는 감자 상자 바닥 깊은 흙 속에 숨을 죽였다.")
	elif f.get("ch1_potato_depth") == "shallow":
		lines.append("등사기는 감자 몇 알 아래 아슬아슬하게 묻혀 있었다.")
	if seized.has("wt"):
		lines.append("미처 못 숨긴 「파수대」 묶음은 압수되고 말았다.")
	else:
		lines.append("「파수대」는 이모부의 커피포트에 담겨 뒷문을 나섰다.")
	if seized.has("booklets"):
		lines.append("나눠 줄 소책자 묶음도 증거물로 함께 실려 나갔다.")
	else:
		lines.append("소책자는 레니의 작은 가방 속에서 오후를 견뎌 냈다.")
	if f.get("paul_detained", false):
		lines.append("그날 밤 파울은 끝내 집으로 돌아오지 못했다.")
	if int(f.get("suspicion", 0)) >= 30:
		lines.append("오토 베커는 이 집을 결코 잊지 않을 것이다.")
	g.hud(false)
	g.end("제1장 「가방 속의 소책자」", "\n".join(lines))
