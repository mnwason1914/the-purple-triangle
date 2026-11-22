class_name Prop
extends RefCounted
## Real 3D furniture & household props: loads low-poly vertex-coloured Blender GLB models
## (res://assets/models/prop_<id>.glb) scaled with Actor.MODEL_SCALE so furniture matches Paul's
## real-metre proportions. Falls back to the legacy Codex orthographic picture-box if a GLB is
## missing. Keeps the full API (x, y, z, hidden, set_top, sync, free_node, light) unchanged.

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
	vec3 lifted = mix(c.rgb, pow(max(c.rgb, vec3(0.0001)), vec3(0.78)), 0.45);
	ALBEDO = to_linear(clamp(lifted * (light * 0.96 + 0.20) * shade, 0.0, 1.0));
}
"""

const TOP_TO_MODEL := {
	"p_crate_top": "crate",
	"p_crate_top_shallow": "crate_shallow",
	"p_crate_top_deep": "crate_deep",
}

static var _shader: Shader
static var _tex: Dictionary = {}
static var _mesh_cache: Dictionary = {}

var node: MeshInstance3D
var x := 0.0
var y := 0.0
var z := 0.0
var size := Vector3.ONE
var bright := 0.0
var mats: Array = []
var top_mat: ShaderMaterial
var _is_glb := false
var hidden := false:
	set(v):
		hidden = v
		if is_instance_valid(node):
			node.visible = not v


static func tex(name: String) -> Texture2D:
	if not _tex.has(name):
		var path := "res://assets/props/%s.png" % name
		_tex[name] = load(path) if ResourceLoader.exists(path) else null
	return _tex[name]


static func _model_key(base: String) -> String:
	if base.begins_with("prop_"):
		return base.substr(5)
	if base.begins_with("p_"):
		return base.substr(2)
	return base


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
	var path := "res://assets/models/prop_%s.glb" % key
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


func _init(parent: Node3D, base: String, px: float, py: float, sz: Vector3, facing := "s", pz := 0.0, with_top := true, top_h := -1.0) -> void:
	x = px
	y = py
	z = pz
	size = sz
	var glb_mesh := load_mesh(_model_key(base))
	if glb_mesh != null:
		_is_glb = true
		node = MeshInstance3D.new()
		node.mesh = glb_mesh
		var m := Art.prop_material()
		node.material_override = m
		mats.append(m)
		node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		node.scale = Vector3.ONE * Actor.MODEL_SCALE
		# Blender GLBs face -Z forward; map y is world Z ("s" = +Z, "n" = -Z, "e" = +X, "w" = -X).
		node.rotation.y = {"n": 0.0, "e": -PI / 2, "s": PI, "w": PI / 2}.get(facing, PI)
		parent.add_child(node)
		return

	# Fallback: legacy Codex picture-box when no GLB exists for this prop
	if _shader == null:
		_shader = Shader.new()
		_shader.code = SHADER
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
	_quad(mesh, front, 1.0, [Vector3(-hw, H, hd), Vector3(hw, H, hd), Vector3(hw, 0, hd), Vector3(-hw, 0, hd)])
	_quad(mesh, front, 0.8, [Vector3(hw, H, -hd), Vector3(-hw, H, -hd), Vector3(-hw, 0, -hd), Vector3(hw, 0, -hd)])
	_quad(mesh, side, 0.88, [Vector3(hw, H, hd), Vector3(hw, H, -hd), Vector3(hw, 0, -hd), Vector3(hw, 0, hd)])
	_quad(mesh, side, 0.88, [Vector3(-hw, H, -hd), Vector3(-hw, H, hd), Vector3(-hw, 0, hd), Vector3(-hw, 0, -hd)])
	if top:
		var T := top_h if top_h > 0.0 else H
		_quad(mesh, top, 1.08, [Vector3(-hw, T, -hd), Vector3(hw, T, -hd), Vector3(hw, T, hd), Vector3(-hw, T, hd)])
		top_mat = mats[mats.size() - 1]
	node = MeshInstance3D.new()
	node.mesh = mesh
	for i in range(mats.size()):
		node.set_surface_override_material(i, mats[i])
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
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


## Swap the potato crate state model (GLB) or lid texture (fallback picture-box) after digging.
func set_top(name: String) -> void:
	if not is_instance_valid(node):
		return
	if _is_glb:
		var key: String = TOP_TO_MODEL.get(name, _model_key(name))
		var m := load_mesh(key)
		if m != null:
			node.mesh = m
		return
	if top_mat and tex(name):
		top_mat.set_shader_parameter("tex", tex(name))


func sync(level: Level) -> void:
	if not is_instance_valid(node):
		return
	node.position = Vector3(x, z, y)
	var l := bright if bright > 0.0 else level.light(x, y)
	for m in mats:
		m.set_shader_parameter("light", l)


func free_node() -> void:
	if is_instance_valid(node):
		node.queue_free()
