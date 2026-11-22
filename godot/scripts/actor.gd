class_name Actor
extends RefCounted
## A 3D character (Blender GLB model chr_<id>.glb + _w1/_w2 walk poses) that can walk a path of
## map points, turn to face its travel direction, and alternate step poses while moving.
## Keeps the sprite-era API (place, go, look, moving, hidden, set_tex, base) so chapter1.gd works
## unchanged.

## Maps real-metre Blender models (Paul = 1.75 m) to the level's world scale (WALL_H = 1.2,
## Paul ~0.875, Helena ~0.81, Leni ~0.525) so characters read clearly at ~1/6 screen height.
const MODEL_SCALE := 0.50

const SPR_TO_MODEL := {
	"spr_paul": "paul",
	"spr_helena": "helena",
	"spr_leni": "leni",
	"spr_leni_bag": "leni_bag",
	"spr_leni_draw": "leni",
	"spr_otto": "otto",
	"spr_police": "police",
	"spr_police2": "police2",
	"spr_uncle": "uncle",
}

static var _mesh_cache: Dictionary = {}

var node: Node3D
var mesh_inst: MeshInstance3D
var mat: ShaderMaterial
var x := 0.0
var y := 0.0
var z := 0.0
var angle := -PI / 2
var base := ""
var tag := ""
var bright := 0.0
var path: Array = []
var phase := 0.0
var speed := 1.15
var crouching := false
var _sit_scale := 1.0
var _y_scale := 1.0
var _bob_y := 0.0
var hidden := false:
	set(v):
		hidden = v
		if is_instance_valid(node):
			node.visible = not v


static func _model_key(name: String) -> String:
	var suffix := ""
	var raw := name
	if raw.ends_with("_w1") or raw.ends_with("_w2"):
		suffix = raw.right(3)
		raw = raw.left(raw.length() - 3)
	var id: String
	if SPR_TO_MODEL.has(raw):
		id = SPR_TO_MODEL[raw]
	elif raw.begins_with("chr_"):
		id = raw.substr(4)
	elif raw.begins_with("spr_"):
		id = raw.substr(4)
	else:
		id = raw
	return id + suffix


static func _find_mesh(n: Node) -> Mesh:
	if n is MeshInstance3D and (n as MeshInstance3D).mesh != null:
		return (n as MeshInstance3D).mesh
	for c in n.get_children():
		var m := _find_mesh(c)
		if m != null:
			return m
	return null


static func load_mesh(key: String) -> Mesh:
	if _mesh_cache.has(key):
		return _mesh_cache[key]
	var path := "res://assets/models/chr_%s.glb" % key
	var mesh: Mesh = null
	if ResourceLoader.exists(path):
		var res = load(path)
		if res is PackedScene:
			var inst: Node = (res as PackedScene).instantiate()
			mesh = _find_mesh(inst)
			inst.free()
		elif res is Mesh:
			mesh = res
	_mesh_cache[key] = mesh
	return mesh


func _init(parent: Node3D, b: String, px: float, py: float) -> void:
	x = px
	y = py
	# Default initial facing: toward workshop center indoors, or north toward house when in yard.
	if py > 11.5:
		angle = -PI / 2
	else:
		angle = atan2(8.5 - py, 5.5 - px)
	node = Node3D.new()
	mesh_inst = MeshInstance3D.new()
	mesh_inst.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mat = Art.char_material()
	mesh_inst.material_override = mat
	node.add_child(mesh_inst)
	parent.add_child(node)
	base = b
	set_tex(b)


func set_tex(name: String) -> void:
	if name == tag or not is_instance_valid(mesh_inst):
		return
	tag = name
	_sit_scale = 0.88 if name == "spr_leni_draw" else 1.0
	var key := _model_key(name)
	var m := load_mesh(key)
	if m == null and (key.ends_with("_w1") or key.ends_with("_w2")):
		m = load_mesh(key.left(key.length() - 3))
	if m != null:
		mesh_inst.mesh = m


func moving() -> bool:
	return not path.is_empty()


func look(b: String) -> void:
	base = b
	set_tex(b)


func place(px: float, py: float, a := NAN) -> void:
	x = px
	y = py
	path = []
	_bob_y = 0.0
	if not is_nan(a):
		angle = a
	elif py > 11.5:
		angle = -PI / 2
	else:
		angle = atan2(8.5 - py, 5.5 - px)
	set_tex(base)


func go(pts: Array) -> void:
	path = pts.duplicate()


func update(dt: float) -> void:
	if path.is_empty():
		set_tex(base)
		_bob_y = lerpf(_bob_y, 0.0, 1.0 - exp(-dt * 12.0))
		return
	var t: Vector2 = path[0]
	var d := Vector2(t.x - x, t.y - y)
	if d.length() > 0.001:
		var target_a := atan2(d.y, d.x)
		angle = lerp_angle(angle, target_a, 1.0 - exp(-dt * 14.0))
	var st := speed * dt
	if d.length() <= st:
		x = t.x
		y = t.y
		path.pop_front()
	else:
		var n := d.normalized()
		x += n.x * st
		y += n.y * st
	phase += dt * 5.2
	set_walk_pose(phase, true)


func set_walk_pose(step_phase: float, walking: bool) -> void:
	if not walking:
		set_tex(base)
		_bob_y = 0.0
		return
	var step := int(floor(step_phase * 2.0)) % 4
	if step == 1:
		set_tex(base + "_w1")
	elif step == 3:
		set_tex(base + "_w2")
	else:
		set_tex(base)
	_bob_y = absf(sin(step_phase * PI)) * 0.025


func sync(level: Level) -> void:
	if not is_instance_valid(node):
		return
	var target_y := (0.76 if crouching else 1.0) * _sit_scale
	_y_scale = lerpf(_y_scale, target_y, 0.25)
	var xz_scale := 1.06 if crouching else 1.0
	node.position = Vector3(x, z + _bob_y, y)
	node.rotation = Vector3(0.0, atan2(-cos(angle), -sin(angle)), 0.0)
	node.scale = Vector3(MODEL_SCALE * xz_scale, MODEL_SCALE * _y_scale, MODEL_SCALE * xz_scale)
	if mat:
		mat.set_shader_parameter("light", bright if bright > 0.0 else level.light(x, y))


func free_node() -> void:
	if is_instance_valid(node):
		node.queue_free()
