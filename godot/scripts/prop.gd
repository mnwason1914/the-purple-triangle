class_name Prop
extends RefCounted
## Real 3D furniture: a box whose faces carry Codex-drawn orthographic views of the object
## (art-src/props → assets/props): front and back share the front view, the two ends share the
## side view, and the lid is the top view. Openings in the views are transparent, so legs,
## spokes and shelves read correctly from every angle and the piece stands on the floor.
## x, y are map coordinates of the footprint centre; size is (width, height, depth) in world units;
## facing is the direction the front looks: "s" (+map y), "n", "e" (+map x) or "w".
## top_h is the height of the lid when something (a vice, a pump) sticks up above it in the views.

const SHADER := """
shader_type spatial;
render_mode unshaded, cull_disabled;
uniform sampler2D tex : filter_nearest, repeat_disable;
uniform float light = 1.0;
uniform float shade = 1.0;
vec3 to_linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void fragment() {
	vec4 c = texture(tex, UV);
	if (c.a < 0.5) discard;
	ALBEDO = to_linear(clamp(c.rgb * light * shade, 0.0, 1.0));
}
"""
static var _shader: Shader
static var _tex: Dictionary = {}

var node: MeshInstance3D
var x := 0.0
var y := 0.0
var z := 0.0
var size := Vector3.ONE
var bright := 0.0
var mats: Array = []
var top_mat: ShaderMaterial
var hidden := false:
	set(v):
		hidden = v
		if node:
			node.visible = not v


static func tex(name: String) -> Texture2D:
	if not _tex.has(name):
		var path := "res://assets/props/%s.png" % name
		_tex[name] = load(path) if ResourceLoader.exists(path) else null
	return _tex[name]


func _init(parent: Node3D, base: String, px: float, py: float, sz: Vector3, facing := "s", pz := 0.0, with_top := true, top_h := -1.0) -> void:
	if _shader == null:
		_shader = Shader.new()
		_shader.code = SHADER
	x = px
	y = py
	z = pz
	size = sz
	var front := tex(base + "_front")
	if front == null:
		front = tex(base + "_side")
	var side := tex(base + "_side")
	if side == null:
		side = front
	var top := tex(base + "_top") if with_top else null
	var hw := sz.x * 0.5
	var hd := sz.z * 0.5
	var H := sz.y
	var mesh := ArrayMesh.new()
	# front (+z) and back (-z): the back is the front view mirrored so it reads the right way round
	_quad(mesh, front, 1.0, [Vector3(-hw, H, hd), Vector3(hw, H, hd), Vector3(hw, 0, hd), Vector3(-hw, 0, hd)])
	_quad(mesh, front, 0.8, [Vector3(hw, H, -hd), Vector3(-hw, H, -hd), Vector3(-hw, 0, -hd), Vector3(hw, 0, -hd)])
	# ends: seen from +x the left edge is +z; seen from -x the left edge is -z
	_quad(mesh, side, 0.88, [Vector3(hw, H, hd), Vector3(hw, H, -hd), Vector3(hw, 0, -hd), Vector3(hw, 0, hd)])
	_quad(mesh, side, 0.88, [Vector3(-hw, H, -hd), Vector3(-hw, H, hd), Vector3(-hw, 0, hd), Vector3(-hw, 0, -hd)])
	if top:
		# looking down with the front at the bottom of the picture
		var T := top_h if top_h > 0.0 else H
		_quad(mesh, top, 1.08, [Vector3(-hw, T, -hd), Vector3(hw, T, -hd), Vector3(hw, T, hd), Vector3(-hw, T, hd)])
		top_mat = mats[mats.size() - 1]
	node = MeshInstance3D.new()
	node.mesh = mesh
	for i in range(mats.size()):
		node.set_surface_override_material(i, mats[i])
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# map y is world z; facing "s" = front towards +z
	node.rotation.y = {"s": 0.0, "e": PI / 2, "n": PI, "w": -PI / 2}.get(facing, 0.0)
	parent.add_child(node)


func _quad(mesh: ArrayMesh, t: Texture2D, shade: float, p: Array) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var uv := [Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)]
	for i in [0, 1, 2, 0, 2, 3]:
		st.set_uv(uv[i])
		st.add_vertex(p[i])
	st.commit(mesh)
	var m := ShaderMaterial.new()
	m.shader = _shader
	m.set_shader_parameter("tex", t)
	m.set_shader_parameter("shade", shade)
	mats.append(m)


## Swap the lid picture (the potato crate after digging).
func set_top(name: String) -> void:
	if top_mat and tex(name):
		top_mat.set_shader_parameter("tex", tex(name))


func sync(level: Level) -> void:
	node.position = Vector3(x, z, y)
	var l := bright if bright > 0.0 else level.light(x, y)
	for m in mats:
		m.set_shader_parameter("light", l)


func free_node() -> void:
	if is_instance_valid(node):
		node.queue_free()
