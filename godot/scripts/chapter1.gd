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
		await g.card("1933년 6월 29일 정오<small>슐레지엔 · 탈하임</small>", 2.2)
		g.hide_card()
	g.hud(true)
	g.progress = "0/3"
	g.ui.fade(false)
	await g.wait(0.6)

	g.set_tex(w.radio, "obj_radio_on")
	w.radio.bright = 0.9
	g.sfx("radio")
	await g.say("radio", "어제 유월 이십팔일, 돌격대원 서른 명이 마그데부르크의 성경연구생 공장을 점거했습니다.")
	g.sfx("radio")
	await g.say("radio", "건물 위에는 하켄크로이츠 깃발이 게양되었습니다.")
	g.set_tex(w.radio, "obj_radio")
	w.radio.bright = 0.0
	g.sfx("select")
	await g.say("helena", "프로이센까지 금지령이 내린 지 며칠 만에 본부마저 닫혔구나.")
	await g.say("paul", "엄마, 놀라지 마. 우리 집 지하실 물건부터 오늘 치울게.")
	await g.say("leni", "오빠, 라디오 아저씨가 왜 화난 목소리로 말해?")
	await g.say("paul", "아무 일 아니야, 레니. 넌 의자에 앉아서 그림 그리고 있어.")
	g.end_talk()
	g.objective("작업실을 살펴본다")
	g.move_lock = false

	var s := {"photo_done": false, "nudged": false}
	var look_bench := func():
		await g.say("paul", "어젯밤 읍내에서 마르타가 가져온 등사기야. 당장 숨겨야 해.")
		g.end_talk()
	var look := func(): return "조사"
	var use_photo := func():
		await g.think("아버지와 회중 형제들이 함께 찍힌 사진이야.")
		if not s.nudged:
			await g.say("helena", "파울, 그 사진부터 떼어 내렴. 경찰 손에 얼굴이 들어가면 안 돼.")
		await g.think("태우면 아버지 얼굴까지 사라져. 하지만 남기면 식구들이 위험해.")
		var i := await g.choose(["액자에서 사진을 꺼내 석탄 레인지 아궁이에 태운다", "사진을 액자 뒤판 나무 틈에 밀어 넣어 숨긴다"])
		if i == 0:
			await g.say("paul", "재까지 완전히 부숴 놓을게요.")
			g.end_talk()
			await g.fade(true)
			g.sfx("fire")
			g.setf("ch1_photo", "burned")
			g.setf("emptySpot", true)
			g.level.photo = "dust"
			await g.wait(1.2)
			await g.fade(false)
		else:
			await g.say("paul", "아궁이에 불이 약해서 연기 나면 더 의심받아요.")
			g.end_talk()
			g.sfx("paper")
			g.setf("ch1_photo", "hidden")
			g.level.photo = "hidden"
		s.photo_done = true
	g.targets = [
		{"id": "mimeo", "x": w.mimeo.x, "y": w.mimeo.y, "r": 0.12, "name": "등사기", "verb": look, "use": look_bench},
		{"id": "wt", "x": w.wt.x, "y": w.wt.y, "r": 0.12, "name": "「파수대」 묶음", "verb": look, "use": look_bench},
		{"id": "booklets", "x": w.booklets.x, "y": w.booklets.y, "r": 0.1, "name": "소책자 묶음", "verb": look, "use": look_bench},
		{"id": "photo", "x": PHOTO.x, "y": PHOTO.y, "r": 0.3, "name": "가족사진", "verb": func(): return null if s.photo_done else "조사", "use": use_photo},
	]
	# nudge toward the photo if the player wanders
	var nudge := func():
		await g.wait(22)
		if s.photo_done or g.state != "play":
			return
		s.nudged = true
		g.bark("helena", "파울, 그 사진부터 떼어 내렴. 경찰 손에 얼굴이 들어가면 안 돼.", 3.4)
		g.objective("벽의 가족사진")
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
	await g.say("otto", "바그너 군! 경찰과 함께 나왔소, 당장 문 여시오!", "오토 베커 (문밖)")
	await g.say("police", "가택 수색이오! 열지 않으면 자물쇠를 따겠소!", "순경 (문밖)")
	await g.say("helena", "벌써 들이닥쳤어! 파울, 어서 지하실 물건부터 감추렴!")
	g.sfx("scrape")
	await g.say("otto", "비켜 보시오. 이 동네 자물쇠는 다 내 손을 거쳤소.", "오토 베커 (문밖)")
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
			"「파수대」를 커피포트에 (부엌 레인지)" if h == "wt" else
			"커피포트를 뒷문의 이모부에게" if h == "pot" else
			"등사기를 지하실 감자 상자에" if h == "mimeo" else
			"소책자를 레니에게" if h == "booklets" else
			"현관문 안쪽 빗장 나사를 조인다" if h == "screwdriver" else
			"손을 씻는다 (부엌 세숫대야)" if g.flag("dirtOnHands", false) else
			"현관문을 연다" if done == 3 else
			"숨기기 %d/3 — 「파수대」 · 등사기 · 소책자" % done)
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
		await g.bark("uncle", "알았다, 수색 끝나면 다시 가져가거라.", 2.4, "이모부 (문틈)")
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
		g.bark("paul", "이모부, 이 커피포트 좀 잠깐만 맡아 주세요.", 2.4)
		close_back.call()
	var use_crate := func():
		await g.think("흙 밑바닥까지 깊이 묻어야 꼬챙이로 찔러도 안 걸려.")
		var i := await g.choose(["감자를 들어내고 바닥 흙 속에 깊이 묻는다 (-12초)", "감자 몇 알만 걷어 내고 얕게 덮는다 (-4초)"])
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
			g.bark("think", "손에 흙이 잔뜩 묻었어. 올라가서 물통에 씻어야 해.", 3)
		else:
			g.add_time(-4)
			g.setf("ch1_potato_depth", "shallow")
			w.crate.set_top("p_crate_top_shallow")
			set_done.call()
			g.bark("think", "시간은 아꼈지만 흙이 파헤쳐진 티가 좀 나네.", 3)
	var leni_go := func():
		g.holding = ""
		st.booklets = "leni"
		g.inc("solidarity", 5)
		set_done.call()
		g.sfx("paper")
		g.bark("paul", "레니, 이걸 책가방에 넣고 대문 밖에 서 있을 수 있니?", 2.8)
		await g.bark("leni", "응, 오빠. 아무한테도 가방 안 보여 줄게.", 2.6)
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
		g.bark("think", "손톱 밑 흙까지 다 씻어 냈어.")
	var use_wall := func():
		g.sfx("wipe")
		g.level.photo = "wiped"
		g.setf("emptySpot", false)
		g.bark("think", "걸레로 먼지 자국을 닦아 냈어.")
	var verb_front := func():
		if g.holding == "screwdriver":
			return "조이기"
		if s.done == 3 and g.holding == "":
			return "열기"
		return "조사" if g.holding == "" else null
	var use_front := func():
		if g.holding == "screwdriver":
			g.sfx("screw")
			g.holding = ""
			st.screwdriver = "used"
			g.setf("ch1_lock_sabotaged", true)
			g.level.front_scratched = true
			g.add_time(25)
			refresh.call()
			g.bark("think", "안쪽 걸쇠 나사를 조여 뒀어. 조금은 시간을 벌 거야.", 3)
		elif s.done == 3:
			s.opened = true
		else:
			g.bark("think", "아직 안 돼. 숨길 게 남았어.")

	g.targets = [
		pick.call("wt", "「파수대」 묶음", func(): g.bark("think", "레인지 옆 빈 커피포트 안에 쑤셔 넣자.")),
		pick.call("mimeo", "등사기", Callable()),
		pick.call("booklets", "소책자 묶음", Callable()),
		pick.call("screwdriver", "드라이버", Callable()),
		{"id": "bench", "x": BENCH.x, "y": BENCH.y, "r": 0.45, "name": "작업대", "verb": func(): return "내려놓기" if (g.holding != "" and g.holding != "pot") else null, "use": use_bench},
		{"id": "pot", "x": w.pot.x, "y": w.pot.y, "r": 0.12, "name": "법랑 커피포트", "verb": func(): return "넣기" if g.holding == "wt" else null, "use": use_pot},
		{"id": "back", "x": BACK.x, "y": BACK.y, "r": 0.3, "name": "뒷문", "verb": func(): return "건네기" if g.holding == "pot" else null, "use": use_back},
		{"id": "crate", "x": 2.0, "y": 1.45, "r": 0.3, "name": "감자 상자", "verb": func(): return "묻기" if g.holding == "mimeo" else null, "use": use_crate},
		{"id": "leni", "x": leni.x, "y": leni.y, "r": 0.2, "name": "레니", "verb": func(): return "건네기" if (g.holding == "booklets" and st.booklets == "held") else null, "use": use_leni},
		{"id": "basin", "x": 12.9, "y": 9.64, "r": 0.25, "name": "세숫대야", "verb": func(): return "씻기" if (g.flag("dirtOnHands", false) and g.holding == "") else null, "hold": func(): return 3.0, "use": use_basin},
		{"id": "wall", "x": PHOTO.x, "y": PHOTO.y, "r": 0.3, "name": "사진 자국", "verb": func(): return "닦기" if (g.level.photo == "dust" and g.holding == "") else null, "hold": func(): return 2.0, "use": use_wall},
		{"id": "front", "x": FRONT.x, "y": FRONT.y, "r": 0.3, "name": "현관문", "verb": verb_front, "hold": func(): return 2.0 if g.holding == "screwdriver" else null, "use": use_front},
		{"id": "helena", "x": w.helena.x, "y": w.helena.y, "r": 0.2, "name": "어머니", "verb": func(): return null if g.holding != "" else "조사", "use": func(): g.bark("helena", "서두르렴, 파울. 문은 내가 지킬게.")},
	]

	# footsteps that carry outside
	var noise := {"line": 0}
	g.on_noise = func(_lvl):
		g.add_time(-5)
		g.composure = maxf(0.0, g.composure - 6)
		g.haptic(60)
		g.sfx("creak", 1.4)
		var lines := [["police", "안에서 발소리가 나는군. 서두르시오!", "순경 (문밖)"], ["otto", "안에 있는 거 다 압니다, 바그너 군!", "오토 베커 (문밖)"]]
		var l: Array = lines[noise.line % 2]
		noise.line += 1
		g.bark(l[0], l[1], 2.4, l[2])
	g.timer.marks = [
		{"at": 45, "fn": func(): g.bark("otto", "자물쇠가 뻑뻑하군! 조금만 더 비틀면 열립니다!", 3, "오토 베커 (문밖)")},
		{"at": 20, "fn": func(): g.bark("helena", "파울, 이제 다 됐니? 얼른 현관문 열어 주자!", 3)},
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
		await g.say("otto", "열렸습니다, 경관님!")
	if not unhidden.is_empty():
		g.setf("ch1_seized", ",".join(unhidden))
		await arrest(g, w, "mimeo" if unhidden.has("mimeo") else "print", cops)
		return

	if not forced:
		await g.say("police", "왜 이제야 문을 여는 거요!")
		await g.say("paul", "지금 열었습니다, 경관님. 들어오시지요.")
	await g.say("otto", "하일 히틀러! 경관님, 이 녀석이 성경연구생 핵심입니다.")
	await g.say("police", "집 안을 전부 수색한다. 두 사람은 벽에 붙어 서 있소.")
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
		await g.say("otto", "경관님, 이 녀석이 안에서 문빗장 나사를 조여 놨습니다!")
		await g.say("paul", "제 집 문입니다. 빗장은 제가 조였습니다.")
		g.end_talk()
		sus.call(10)
		g.composure -= 5
	if g.flag("dirtOnHands", false):
		await g.wait(1.5)
		pA.go([P(7.4, 9.3)])
		await g.until(func(): return not pA.moving())
		await g.say("police", "이봐, 손톱 밑에 젖은 흙이 잔뜩 묻어 있군. 지하실부터 뒤져!")
		g.end_talk()
		sus.call(10)
		g.composure -= 10
		g.walk(pA, [P(9.4, 8.5), P(11.4, 8.2), P(9.6, 8.5), P(6.6, 9.6)])
	await g.walk(otto, [P(5.5, 7.4), P(5.5, 6.7)])
	if g.str_flag("ch1_photo") == "burned" and g.flag("emptySpot", false):
		await g.say("otto", "여기 걸려 있던 가족사진은 어디로 치웠나, 바그너 군?")
		var i := await g.choose(["“제가 내렸습니다. 이제 없습니다.”", "“그걸 왜 물으십니까?”"], 8)
		if i == 0:
			await g.say("paul", "제가 내렸습니다. 이제 없습니다.")
			await g.say("otto", "흥.")
		else:
			if i == 1:
				await g.say("paul", "그걸 왜 물으십니까?")
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
		await g.say("police2", "지하실엔 썩은 감자랑 자전거 바퀴뿐입니다.")
		g.end_talk()
	await g.until(func(): return not pA.moving() and not otto.moving())

	if S.call() >= 15:
		if dug:
			pB.go([P(7.5, 9.6)])
			await g.until(func(): return not pB.moving())
			await g.say("police2", "이 감자 상자 흙이 왜 이렇게 파헤쳐져 있지?")
			var i := await g.choose(["“제 지하실입니다. 보실 대로 보십시오.”", "“제가… 아까 좀 뒤적였습니다.”"], 8)
			if i == 0:
				await g.say("paul", "제 지하실입니다. 보실 대로 보십시오.")
			else:
				await g.say("paul", "제가… 아까 좀 뒤적였습니다." if i == 1 else "…….")
				sus.call(15)
				g.composure -= 10
			g.end_talk()
		if g.str_flag("ch1_photo") == "hidden":
			otto.go([P(5.5, 6.7)])
			await g.until(func(): return not otto.moving())
			await g.say("otto", "액자 뒤판이 불룩하군. 이리 내놔 봐!")
			await g.say("helena", "남편이 남긴 사진이에요. 그것만은 두고 가세요.")
			if S.call() >= 30:
				await g.say("otto", "얼굴이 여럿이군. 이건 내가 가져가지.")
				g.setf("ch1_photo_taken", true)
				g.level.photo = "dust"
			else:
				await g.say("police", "사진 한 장 갖고 뭘 그러시오, 베커 반장.")
			g.end_talk()
			g.walk(otto, [P(6.2, 10.1)])
		if S.call() >= 40:
			await g.say("police2", "감자 상자를 바닥까지 파 보겠습니다.")
			g.end_talk()
			await g.walk(pB, [P(3.5, 7.0), P(3.5, 4.1), P(2.6, 2.3)])
			await g.wait(1.5)
			if g.str_flag("ch1_potato_depth") == "shallow":
				g.setf("ch1_seized", "mimeo")
				await arrest(g, w, "dig", cops)
				return
			await g.walk(pB, [P(3.5, 4.1), P(3.5, 6.4), P(4.6, 9.6)])
			await g.say("police2", "꼬챙이로 바닥까지 찔러 봤지만 아무것도 없습니다.")
			g.end_talk()

	pA.go([P(5.5, 10.2)])
	otto.go([P(6.1, 10.3)])
	pB.go([P(4.9, 10.2)])
	await g.until(func(): return not pA.moving() and not otto.moving() and not pB.moving())
	await g.say("police", "인쇄물도 등사기도 없다. 허탕이군, 베커 반장.")
	await g.say("otto", "네 녀석 작업실에 뭘 숨겼는지 내가 끝까지 찾아낼 거야.")
	await g.say("police", "다음 집으로 이동한다. 하일 히틀러.")
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
	await g.say("leni", "오빠, 이제 가방 내려놔도 돼?")
	await g.say("paul", "응, 잘했어 레니. 정말 잘했어.")
	await g.say("helena", "어서 들어오렴. 이제부터는 문을 더 단단히 걸어 잠가야겠구나.", "헬레나 (문간)")
	g.end_talk()
	await g.fade(true)
	g.hud(false)
	if not fast:
		await Cinema.outro(g, true)
	ending(g)


func arrest(g: Game, w: Dictionary, why: String, cops: Array) -> void:
	g.setf("ch1_found", why)
	if why == "mimeo":
		await g.say("police", "등사기다! 여기서 찍어 냈군.")
	elif why == "dig":
		await g.say("police2", "반장님, 흙 밑에 등사기가 있습니다!")
	else:
		await g.say("police", "금지된 인쇄물이군. 전부 압수한다.")
	await g.say("otto", "제가 뭐랬습니까, 경관님.")
	await g.say("police", "파울 바그너, 경찰서로 같이 가야겠소.")
	await g.say("helena", "파울!")
	await g.say("paul", "엄마, 레니를 부탁해요.")
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
	await g.say("leni", "오빠, 어디 가?")
	await g.say("paul", "금방 올게, 레니. 엄마 말 잘 들어.")
	g.end_talk()
	await g.wait(0.8)
	await g.fade(true)
	ending(g)


func ending(g: Game) -> void:
	g.audio.music("ending")
	var f := g.flags
	var lines: Array = []
	if f.get("ch1_photo") == "burned":
		lines.append("아버지의 사진은 재가 되었다.")
	elif f.get("ch1_photo_taken", false):
		lines.append("사진 속 얼굴들은 베커의 주머니로 들어갔다.")
	else:
		lines.append("아버지의 사진은 액자 뒤판 속에 남았다.")
	var seized := str(f.get("ch1_seized", "")).split(",")
	if seized.has("mimeo"):
		lines.append("등사기는 경찰의 손에 넘어갔다.")
	elif f.get("ch1_potato_depth") == "deep":
		lines.append("등사기는 감자 상자 밑 깊은 흙 속에 잠들었다.")
	elif f.get("ch1_potato_depth") == "shallow":
		lines.append("등사기는 감자 몇 알 아래 얕게 묻혔다.")
	if seized.has("wt"):
		lines.append("「파수대」 묶음은 압수되었다.")
	else:
		lines.append("「파수대」는 이모부의 커피포트에 담겨 집을 나갔다.")
	if seized.has("booklets"):
		lines.append("소책자 묶음도 함께 실려 갔다.")
	else:
		lines.append("소책자는 레니의 가방 속에서 오후를 보냈다.")
	if f.get("paul_detained", false):
		lines.append("그날 밤 파울은 집에 돌아오지 못했다.")
	if int(f.get("suspicion", 0)) >= 30:
		lines.append("베커는 이 집을 잊지 않을 것이다.")
	g.hud(false)
	g.end("제1장 「가방 속의 소책자」", "\n".join(lines))
