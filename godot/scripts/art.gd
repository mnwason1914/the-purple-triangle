class_name Art
## Art registry: the Codex-made PNGs in assets/ch1, plus the world size of every sprite and the
## painted pixel size of every entry (exported from the web version's code-painted defaults).

const TEXEL := 60.0
static var _tex: Dictionary = {}
static var size: Dictionary = {}
static var painted: Dictionary = {}
static var _level_shader: Shader
static var _wall_shader: Shader
static var _sprite_shader: Shader
static var _char_shader: Shader
static var _prop_shader: Shader

const LEVEL_SHADER := """
shader_type spatial;
render_mode unshaded, cull_disabled;
uniform sampler2D tex : filter_nearest, repeat_enable;
uniform float desat = 0.0;
uniform vec3 tint = vec3(1.0, 1.0, 1.0);
uniform float lift = 1.0;
vec3 to_linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void fragment() {
	vec3 t = texture(tex, UV).rgb;
	// Gentle shadow lift so dark wood floorboards and cellar earth read clearly on mobile screens.
	vec3 lifted = mix(t, pow(max(t, vec3(0.0001)), vec3(0.72)), 0.58);
	float lum = dot(lifted, vec3(0.299, 0.587, 0.114));
	vec3 toned = mix(lifted, vec3(lum), desat) * tint * lift;
	float L = clamp(COLOR.r * 1.5, 0.52, 1.48);
	vec3 c = toned * (L * 1.02 + 0.16);
	ALBEDO = to_linear(clamp(c, 0.0, 1.0));
}
"""

const WALL_SHADER := """
shader_type spatial;
render_mode unshaded, cull_back;
uniform sampler2D tex : filter_nearest, repeat_enable;
uniform vec3 player_pos = vec3(0.0, 0.0, 0.0);
varying vec3 v_world_pos;
varying vec3 v_world_normal;
vec3 to_linear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void vertex() {
	v_world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}
void fragment() {
	float cut_h = 10.0;
	// Cut walls south of the player (between camera and player) cleanly to a low lit stub everywhere:
	// 1. Front-facing (+Z) walls directly south of the player cut right away (dz > 0.04).
	// 2. All walls (including ±X stairwell/corridor side walls) approaching the south camera foreground
	//    (dz > 0.85) cut down uniformly with no upper dz cutoff, eliminating tall spikes at the screen bottom.
	float dz = v_world_pos.z - player_pos.z;
	float dx = abs(v_world_pos.x - player_pos.x);
	float front_mask = 0.0;
	if (dz > 0.04 && v_world_normal.z > 0.5) {
		float z_m = smoothstep(0.04, 0.24, dz);
		float x_m = 1.0 - smoothstep(1.3, 2.5, dx);
		front_mask = z_m * x_m;
	}
	float fg_mask = smoothstep(0.82, 1.32, dz);
	float cut_t = max(front_mask, fg_mask);
	if (cut_t > 0.001) {
		cut_h = mix(1.25, 0.22, cut_t);
	}
	if (v_world_pos.y > cut_h) discard;
	float L = clamp(COLOR.r * 1.5, 0.62, 1.42);
	vec3 t = texture(tex, UV).rgb;
	// Lit cutaway top lip sampled from the upper wall texture blended with warm plaster/stone highlight.
	if (cut_h < 1.21 && v_world_pos.y > cut_h - 0.055) {
		t = mix(texture(tex, vec2(UV.x, 0.35)).rgb, vec3(0.45, 0.42, 0.38), 0.32) * 1.16;
	}
	vec3 lifted = mix(t, pow(max(t, vec3(0.0001)), vec3(0.84)), 0.32);
	vec3 c = lifted * (L * 0.96 + 0.20);
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
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(INV_VIEW_MATRIX[0], INV_VIEW_MATRIX[1], INV_VIEW_MATRIX[2], MODEL_MATRIX[3]);
	MODELVIEW_NORMAL_MATRIX = mat3(MODELVIEW_MATRIX);
}
void fragment() {
	vec4 c = texture(tex, UV);
	if (c.a < 0.5) discard;
	vec3 lifted = mix(c.rgb, pow(max(c.rgb, vec3(0.0001)), vec3(0.80)), 0.40);
	ALBEDO = to_linear(clamp(lifted * (light * 0.96 + 0.22), 0.0, 1.0));
}
"""

const CHAR_SHADER := """
shader_type spatial;
render_mode unshaded;
uniform float light = 1.0;
varying vec3 v_world_normal;
varying vec3 v_view_dir;
void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	v_view_dir = normalize(INV_VIEW_MATRIX[3].xyz - wp);
}
void fragment() {
	vec3 n = normalize(v_world_normal);
	vec3 v = normalize(v_view_dir);
	float key = max(0.0, dot(n, normalize(vec3(0.32, 0.86, 0.38))));
	float top = max(0.0, n.y);
	float fresnel = pow(1.0 - max(0.0, dot(n, v)), 2.2);
	// Lift dark linear vertex colours (hair, olive shirt, navy tunic) without clipping skin/collars.
	vec3 base = mix(COLOR.rgb, pow(max(COLOR.rgb, vec3(0.0001)), vec3(0.72)), 0.55);
	float hemi = 0.88 + 0.52 * key + 0.25 * top;
	// Characters always stay at least as bright as a well-lit floor while tracking room light.
	float L = clamp(light * 0.35 + 0.78, 1.02, 1.32);
	vec3 rim = vec3(0.11, 0.10, 0.085) * (fresnel * 0.75 + top * 0.35) * L;
	ALBEDO = clamp(base * hemi * L + rim, 0.0, 1.0);
}
"""


const PROP_SHADER := """
shader_type spatial;
render_mode unshaded;
uniform float light = 1.0;
varying vec3 v_world_normal;
varying vec3 v_view_dir;
void vertex() {
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	v_world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	v_view_dir = normalize(INV_VIEW_MATRIX[3].xyz - wp);
}
void fragment() {
	vec3 n = normalize(v_world_normal);
	vec3 v = normalize(v_view_dir);
	float key = max(0.0, dot(n, normalize(vec3(0.32, 0.86, 0.38))));
	float fill = max(0.0, dot(n, normalize(vec3(-0.45, 0.45, -0.35))));
	float top = max(0.0, n.y);
	float fresnel = pow(1.0 - max(0.0, dot(n, v)), 2.6);
	vec3 base = mix(COLOR.rgb, pow(max(COLOR.rgb, vec3(0.0001)), vec3(0.78)), 0.38);
	float hemi = 0.72 + 0.48 * key + 0.14 * fill + 0.18 * top;
	float L = clamp(light * 0.62 + 0.46, 0.72, 1.24);
	vec3 rim = vec3(0.06, 0.055, 0.048) * (fresnel * 0.5 + top * 0.2) * L;
	ALBEDO = clamp(base * hemi * L + rim, 0.0, 1.0);
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
	_wall_shader = Shader.new()
	_wall_shader.code = WALL_SHADER
	_sprite_shader = Shader.new()
	_sprite_shader.code = SPRITE_SHADER
	_char_shader = Shader.new()
	_char_shader.code = CHAR_SHADER
	_prop_shader = Shader.new()
	_prop_shader.code = PROP_SHADER


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


static func level_material(t: Texture2D, tex_name := "") -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _level_shader
	m.set_shader_parameter("tex", t)
	if tex_name == "tex_floor_wood":
		# Warm lifted aged pine/oak planks (less red than raw texture, bright enough to read warmly).
		m.set_shader_parameter("desat", 0.38)
		m.set_shader_parameter("tint", Vector3(1.06, 1.18, 1.10))
		m.set_shader_parameter("lift", 1.24)
	elif tex_name == "tex_floor_creak":
		# Matches the warm wood floor while keeping the bright cracked creaky board clearly visible.
		m.set_shader_parameter("desat", 0.32)
		m.set_shader_parameter("tint", Vector3(1.04, 1.16, 1.08))
		m.set_shader_parameter("lift", 1.18)
	return m


static func wall_material(t: Texture2D) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _wall_shader
	m.set_shader_parameter("tex", t)
	return m


static func sprite_material(t: Texture2D) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _sprite_shader
	m.set_shader_parameter("tex", t)
	return m


static func char_material() -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _char_shader
	return m


static func prop_material() -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _prop_shader
	return m
