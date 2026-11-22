class_name Spr
extends RefCounted
## A camera-facing billboard item standing in the world (tabletop props). x, y are map coordinates,
## z the height of its base. Light comes from the level's light grid unless `bright` is set.

var node: MeshInstance3D
var mat: ShaderMaterial
var quad: QuadMesh
var x := 0.0
var y := 0.0
var z := 0.0
var tag := ""
var bright := 0.0
var fixed_w := 0.0
var _ceiling_only := false
var hidden := false:
	set(v):
		hidden = v
		if is_instance_valid(node):
			node.visible = (not v) and (not _ceiling_only)


func _init(parent: Node3D, name: String, px: float, py: float, pz := 0.0, w := 0.0, br := 0.0) -> void:
	x = px
	y = py
	z = pz
	fixed_w = w
	bright = br
	quad = QuadMesh.new()
	node = MeshInstance3D.new()
	node.mesh = quad
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	set_tex(name)


func set_tex(name: String) -> void:
	if name == tag or not is_instance_valid(node):
		return
	tag = name
	# Hanging ceiling bulbs are omitted in top-down view since ceilings are not rendered.
	_ceiling_only = name == "obj_bulb"
	node.visible = (not hidden) and (not _ceiling_only)
	var t := Art.tex(name)
	if mat == null:
		mat = Art.sprite_material(t)
		node.material_override = mat
	else:
		mat.set_shader_parameter("tex", t)
	var s := Art.world_size(name)
	if fixed_w > 0.0:
		s.x = fixed_w
	else:
		s *= 1.15
	quad.size = s
	quad.center_offset = Vector3(0, s.y * 0.5, 0)


func sync(level: Level) -> void:
	if not is_instance_valid(node):
		return
	node.position = Vector3(x, z, y)
	if mat:
		mat.set_shader_parameter("light", bright if bright > 0.0 else level.light(x, y))


func free_node() -> void:
	if is_instance_valid(node):
		node.queue_free()
