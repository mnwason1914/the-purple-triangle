class_name Level
extends RefCounted
## The Wagner house in Thalheim: bicycle workshop, kitchen, cellar stairs, cellar and front yard.
## One character per cell. Walls: P plaster, H photo wall, W window, T tool board, K kitchen tiles,
## S cellar stone, G garden wall, g gate, F front door, B back door.
## Floors: . wood, , creaking boards, k kitchen, s stairs, c cellar earth, y yard cobbles.
## Map x is world X, map y is world Z. Light is the web version's 2D light grid, baked into
## vertex colours (and sampled per sprite), so rooms stay dark where they were dark.

const MAP := [
	"SSSSSSSSPPPPPPPPP",
	"SccccccSPPPPPPPPP",
	"SccccccSPPPPPPPPP",
	"SccccccSPPPPPPPPP",
	"SSSsSSSSPPPPPPPPP",
	"PTPsPHPPWPPPPPPPP",
	"PT.......PKKKKPPP",
	"PP...,...PkkkkKPP",
	"PW..,,,...kkkkBPP",
	"PP...,...PkkkkKPP",
	"PP.......PKKWKPPP",
	"PPPPPFPPPPPPPPPPP",
	"GyyyyyyyyyGPPPPPP",
	"GyyyyyyyyyGPPPPPP",
	"GGGGGgGGGGGPPPPPP",
	"PPPPPPPPPPPPPPPPP",
]
const WALL_H := 1.2
const R := 2
const AMBIENT := {"workshop": 0.80, "kitchen": 0.86, "stairs": 1.05, "cellar": 0.56, "yard": 1.15, "door": 0.88, "wall": 0.0}
const OPEN := ".,ksyc"

var w := 17
var h := 16
var dirty := true
var photo := "hung":
	set(v):
		photo = v
		dirty = true
var front_scratched := false:
	set(v):
		front_scratched = v
		dirty = true
var front_open := false
var back_ajar := false
var lights: Array = [
	{"id": "winW", "x": 2.3, "y": 8.5, "i": 0.72, "r": 5.0},
	{"id": "winN", "x": 8.5, "y": 6.3, "i": 0.70, "r": 5.0},
	{"id": "bulb", "x": 5.5, "y": 8.3, "i": 0.62, "r": 5.0},
	{"id": "winK", "x": 12.5, "y": 9.7, "i": 0.72, "r": 4.2},
	{"id": "stair", "x": 3.5, "y": 5.2, "i": 0.90, "r": 3.8},
	{"id": "grate", "x": 5.6, "y": 1.3, "i": 0.55, "r": 4.2},
	{"id": "cellarBulb", "x": 2.8, "y": 2.0, "i": 0.78, "r": 4.2},
]
var grid := PackedFloat32Array()


func _init() -> void:
	w = MAP[0].length()
	h = MAP.size()
	grid.resize((w * R + 1) * (h * R + 1))
	relight()


func ch(x: int, y: int) -> String:
	if x < 0 or y < 0 or x >= w or y >= h:
		return "P"
	return MAP[y][x]


func solid(x: float, y: float) -> bool:
	var c := ch(floori(x), floori(y))
	if c == "F":
		return not front_open
	return not OPEN.contains(c)


func region(x: float, y: float) -> String:
	var c := ch(floori(x), floori(y))
	match c:
		".", ",":
			return "workshop"
		"k":
			return "kitchen"
		"s":
			return "stairs"
		"c":
			return "cellar"
		"y":
			return "yard"
		"F":
			return "door" if front_open else "wall"
	return "wall"


## Footstep loudness multiplier of a cell (creaking boards and stairs; near the front door x1.5).
func noise_coef(x: float, y: float) -> float:
	var c := ch(floori(x), floori(y))
	var k := 2.5 if (c == "," or c == "s") else 1.0
	if Vector2(x - 5.5, y - 10.6).length() < 2.2:
		k *= 1.5
	return k


func wall_tex(x: int, y: int, fx: int, fy: int) -> String:
	var c := ch(x, y)
	var from := region(fx + 0.5, fy + 0.5)
	match c:
		"P":
			if from == "yard":
				return "tex_wall_facade"
			if from == "stairs" or from == "cellar":
				return "tex_wall_cellar"
			return "tex_wall_plaster"
		"H":
			if from != "workshop":
				return "tex_wall_plaster"
			return "tex_wall_photo" + ("_dust" if photo == "dust" else "_wiped" if photo == "wiped" else "")
		"W":
			return "tex_wall_window"
		"T":
			return "tex_wall_tools"
		"K":
			return "tex_wall_kitchen" if from == "kitchen" else "tex_wall_plaster"
		"S":
			return "tex_wall_cellar"
		"G":
			return "tex_wall_garden"
		"g":
			return "tex_wall_gate"
		"F":
			return "tex_door_front_scratched" if (front_scratched and from != "yard") else "tex_door_front"
		"B":
			return "tex_door_back_ajar" if back_ajar else "tex_door_back"
	return "tex_wall_plaster"


func floor_tex(x: int, y: int) -> String:
	match ch(x, y):
		",":
			return "tex_floor_creak"
		"k":
			return "tex_floor_kitchen"
		"s":
			return "tex_floor_stairs"
		"c":
			return "tex_floor_dirt"
		"y":
			return "tex_floor_cobble"
	return "tex_floor_wood"


func ceil_tex(x: int, y: int) -> String:
	var c := ch(x, y)
	if c == "y" or c == "G" or c == "g":
		return ""
	if c == "s" or c == "c" or c == "S":
		return "tex_ceil_cellar"
	return "tex_ceil_wood"


func set_front(open: bool) -> void:
	front_open = open
	_set_light("door", {"x": 5.5, "y": 10.7, "i": 0.95, "r": 4.6} if open else {})


func set_back(ajar: bool) -> void:
	back_ajar = ajar
	_set_light("back", {"x": 13.7, "y": 8.5, "i": 0.6, "r": 3.0} if ajar else {})


func _set_light(id: String, l: Dictionary) -> void:
	lights = lights.filter(func(q): return q.id != id)
	if not l.is_empty():
		var n := l.duplicate()
		n["id"] = id
		lights.append(n)
	relight()


func _blocked(ax: float, ay: float, bx: float, by: float) -> bool:
	var d := Vector2(bx - ax, by - ay).length()
	var n := ceili(d / 0.2)
	for i in range(1, n - 1):
		var x := ax + (bx - ax) * i / n
		var y := ay + (by - ay) * i / n
		if region(x, y) == "wall":
			return true
	return false


func relight() -> void:
	var gw := w * R + 1
	var offs := [Vector2(-0.25, -0.25), Vector2(0.25, -0.25), Vector2(-0.25, 0.25), Vector2(0.25, 0.25)]
	for j in range(h * R + 1):
		for i in range(w * R + 1):
			var x := float(i) / R
			var y := float(j) / R
			var amb := 0.0
			var ox := x
			var oy := y
			for o in offs:
				var a: float = AMBIENT[region(x + o.x, y + o.y)]
				if a > amb:
					amb = a
					ox = x + o.x
					oy = y + o.y
			var L := amb
			if amb > 0.0:
				for l in lights:
					var d := Vector2(ox - l.x, oy - l.y).length()
					if d >= l.r:
						continue
					if _blocked(l.x, l.y, ox, oy):
						continue
					var f: float = 1.0 - d / l.r
					L += l.i * f * f
			grid[j * gw + i] = minf(1.5, L)
	dirty = true


func light(x: float, y: float) -> float:
	var gw := w * R + 1
	var gx := clampf(x * R, 0.0, w * R - 0.001)
	var gy := clampf(y * R, 0.0, h * R - 0.001)
	var ix := int(gx)
	var iy := int(gy)
	var fx := gx - ix
	var fy := gy - iy
	var o := iy * gw + ix
	var a := grid[o] + (grid[o + 1] - grid[o]) * fx
	var b := grid[o + gw] + (grid[o + gw + 1] - grid[o + gw]) * fx
	return a + (b - a) * fy


func _is_floor(x: int, y: int) -> bool:
	var c := ch(x, y)
	return OPEN.contains(c) or (c == "F" and front_open)


# ------------------------------------------------------------------ mesh
var _st_floor: Dictionary = {}
var _st_wall: Dictionary = {}
var wall_mats: Array[ShaderMaterial] = []


func _tool(bucket: Dictionary, tex: String) -> SurfaceTool:
	if not bucket.has(tex):
		var s := SurfaceTool.new()
		s.begin(Mesh.PRIMITIVE_TRIANGLES)
		bucket[tex] = s
	return bucket[tex]


func _col(lx: float, ly: float) -> Color:
	var v := light(lx, ly) / 1.5
	return Color(v, v, v, 1.0)


## Quad from four corners (a top-left, b top-right, c bottom-right, d bottom-left) with uvs,
## normal, and light-sample points per corner.
func _quad(bucket: Dictionary, tex: String, p: Array, uv: Array, lp: Array, normal: Vector3) -> void:
	var s := _tool(bucket, tex)
	for i in [0, 1, 2, 0, 2, 3]:
		s.set_normal(normal)
		s.set_color(_col(lp[i].x, lp[i].y))
		s.set_uv(uv[i])
		s.add_vertex(p[i])


func set_cut_focus(pos: Vector3) -> void:
	for m in wall_mats:
		m.set_shader_parameter("player_pos", pos)


func build_mesh() -> ArrayMesh:
	_st_floor.clear()
	_st_wall.clear()
	wall_mats.clear()
	var H := WALL_H
	for y in range(h):
		for x in range(w):
			if not _is_floor(x, y):
				continue
			# floor in 2x2 pieces so the light gradient reads; no ceiling in top-down view
			var ft := floor_tex(x, y)
			for j in range(R):
				for i in range(R):
					var x0 := x + float(i) / R
					var x1 := x + float(i + 1) / R
					var y0 := y + float(j) / R
					var y1 := y + float(j + 1) / R
					var u0 := float(i) / R
					var u1 := float(i + 1) / R
					var v0 := float(j) / R
					var v1 := float(j + 1) / R
					var lp := [Vector2(x0, y0), Vector2(x1, y0), Vector2(x1, y1), Vector2(x0, y1)]
					_quad(_st_floor, ft, [Vector3(x0, 0, y0), Vector3(x1, 0, y0), Vector3(x1, 0, y1), Vector3(x0, 0, y1)],
						[Vector2(u0, v0), Vector2(u1, v0), Vector2(u1, v1), Vector2(u0, v1)], lp, Vector3.UP)
			# walls facing into this cell; u runs left to right as seen from inside
			for d in [[0, -1], [0, 1], [-1, 0], [1, 0]]:
				var nx: int = x + d[0]
				var ny: int = y + d[1]
				if _is_floor(nx, ny):
					continue
				var t := wall_tex(nx, ny, x, y)
				var a: Vector2
				var b: Vector2
				if d[1] == -1:
					a = Vector2(x, y); b = Vector2(x + 1, y)
				elif d[1] == 1:
					a = Vector2(x + 1, y + 1); b = Vector2(x, y + 1)
				elif d[0] == -1:
					a = Vector2(x, y + 1); b = Vector2(x, y)
				else:
					a = Vector2(x + 1, y); b = Vector2(x + 1, y + 1)
				var inward := Vector2(-d[0], -d[1]) * 0.05
				var normal := Vector3(-d[0], 0.0, -d[1])
				for k in range(R):
					var pa := a.lerp(b, float(k) / R)
					var pb := a.lerp(b, float(k + 1) / R)
					var la := pa + inward
					var lb := pb + inward
					_quad(_st_wall, t, [Vector3(pa.x, H, pa.y), Vector3(pb.x, H, pb.y), Vector3(pb.x, 0, pb.y), Vector3(pa.x, 0, pa.y)],
						[Vector2(float(k) / R, 0), Vector2(float(k + 1) / R, 0), Vector2(float(k + 1) / R, 1), Vector2(float(k) / R, 1)],
						[la, lb, lb, la], normal)
				# South-facing door/gate cells (F, g) have their -Z face culled from the south camera;
				# add a clean lit wooden threshold strip at floor level so doors stay unmistakable.
				if d[1] == 1 and (ch(nx, ny) == "F" or ch(nx, ny) == "g"):
					var sill_y0 := float(y + 1) - 0.14
					var sill_y1 := float(y + 1)
					var lp_s := [Vector2(x, sill_y0), Vector2(x + 1, sill_y0), Vector2(x + 1, sill_y0), Vector2(x, sill_y0)]
					_quad(_st_floor, t, [Vector3(x, 0.012, sill_y0), Vector3(x + 1, 0.012, sill_y0), Vector3(x + 1, 0.012, sill_y1), Vector3(x, 0.012, sill_y1)],
						[Vector2(0.0, 0.28), Vector2(1.0, 0.28), Vector2(1.0, 0.44), Vector2(0.0, 0.44)], lp_s, Vector3.UP)
	var mesh := ArrayMesh.new()
	for tex in _st_floor.keys():
		var s: SurfaceTool = _st_floor[tex]
		mesh = s.commit(mesh)
		mesh.surface_set_material(mesh.get_surface_count() - 1, Art.level_material(Art.tex(tex)))
	for tex in _st_wall.keys():
		var s: SurfaceTool = _st_wall[tex]
		mesh = s.commit(mesh)
		var wm := Art.wall_material(Art.tex(tex))
		wall_mats.append(wm)
		mesh.surface_set_material(mesh.get_surface_count() - 1, wm)
	_st_floor.clear()
	_st_wall.clear()
	dirty = false
	return mesh
