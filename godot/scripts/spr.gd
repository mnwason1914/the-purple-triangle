class_name Spr
extends RefCounted
## A billboarded picture standing in the world (props and people). x, y are map coordinates,
## z the height of its feet. Light comes from the level's light grid unless `bright` is set.

var node: MeshInstance3D
var mat: ShaderMaterial
var quad: QuadMesh
var x := 0.0
var y := 0.0
var z := 0.0
var tag := ""
var bright := 0.0
var fixed_w := 0.0
var hidden := false:
	set(v):
		hidden = v
		if node:
			node.visible = not v


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
	if name == tag:
		return
	tag = name
	var t := Art.tex(name)
	if mat == null:
		mat = Art.sprite_material(t)
		node.material_override = mat
	else:
		mat.set_shader_parameter("tex", t)
	var s := Art.world_size(name)
	if fixed_w > 0.0:
		s.x = fixed_w
	quad.size = s
	quad.center_offset = Vector3(0, s.y * 0.5, 0)


func sync(level: Level) -> void:
	node.position = Vector3(x, z, y)
	mat.set_shader_parameter("light", bright if bright > 0.0 else level.light(x, y))


func free_node() -> void:
	if is_instance_valid(node):
		node.queue_free()
