class_name Art
## Art registry: the Codex-made PNGs in assets/ch1, plus the world size of every sprite and the
## painted pixel size of every entry (exported from the web version's code-painted defaults).

const TEXEL := 60.0
static var _tex: Dictionary = {}
static var size: Dictionary = {}
static var painted: Dictionary = {}
static var _level_shader: Shader
static var _sprite_shader: Shader

const LEVEL_SHADER := """
shader_type spatial;
render_mode unshaded, cull_disabled;
uniform sampler2D tex : filter_nearest, repeat_enable;
vec3 to_linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void fragment() {
	vec3 c = texture(tex, UV).rgb * COLOR.r * 1.5;
	ALBEDO = to_linear(clamp(c, 0.0, 1.0));
}
"""

const SPRITE_SHADER := """
shader_type spatial;
render_mode unshaded, cull_disabled;
uniform sampler2D tex : filter_nearest, repeat_disable;
uniform float light = 1.0;
vec3 to_linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void vertex() {
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(vec4(normalize(cross(vec3(0.0, 1.0, 0.0), INV_VIEW_MATRIX[2].xyz)), 0.0), vec4(0.0, 1.0, 0.0, 0.0), vec4(normalize(cross(INV_VIEW_MATRIX[0].xyz, vec3(0.0, 1.0, 0.0))), 0.0), MODEL_MATRIX[3]);
	MODELVIEW_NORMAL_MATRIX = mat3(MODELVIEW_MATRIX);
}
void fragment() {
	vec4 c = texture(tex, UV);
	if (c.a < 0.5) discard;
	ALBEDO = to_linear(clamp(c.rgb * light, 0.0, 1.0));
}
"""


static func init() -> void:
	var j = JSON.parse_string(FileAccess.get_file_as_string("res://assets/data/sizes.json"))
	if typeof(j) != TYPE_DICTIONARY:
		push_error("sizes.json missing")
		return
	for k in j.size:
		size[k] = Vector2(j.size[k][0], j.size[k][1])
	for k in j.painted:
		painted[k] = Vector2(j.painted[k][0], j.painted[k][1])
	_level_shader = Shader.new()
	_level_shader.code = LEVEL_SHADER
	_sprite_shader = Shader.new()
	_sprite_shader.code = SPRITE_SHADER


static func tex(name: String) -> Texture2D:
	if not _tex.has(name):
		var path := "res://assets/ch1/%s.png" % name
		_tex[name] = load(path) if ResourceLoader.exists(path) else null
	return _tex[name]


static func has(name: String) -> bool:
	return tex(name) != null


## World size of a sprite: the painted default's height, width from the art's own proportions.
static func world_size(name: String) -> Vector2:
	var t := tex(name)
	var h: float = size[name].y if size.has(name) else (t.get_height() / TEXEL if t else 0.5)
	var w: float = h * t.get_width() / t.get_height() if t else (size[name].x if size.has(name) else h)
	return Vector2(w, h)


static func level_material(t: Texture2D) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _level_shader
	m.set_shader_parameter("tex", t)
	return m


static func sprite_material(t: Texture2D) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _sprite_shader
	m.set_shader_parameter("tex", t)
	return m
