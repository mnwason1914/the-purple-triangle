class_name Actor
extends Spr
## A person who can walk a path of map points, alternating base and walk frames.

var base := ""
var path: Array = []
var phase := 0.0
var speed := 1.15


func _init(parent: Node3D, b: String, px: float, py: float) -> void:
	super(parent, b, px, py)
	base = b


func moving() -> bool:
	return not path.is_empty()


func look(b: String) -> void:
	base = b
	set_tex(b)


func place(px: float, py: float) -> void:
	x = px
	y = py
	path = []


func go(pts: Array) -> void:
	path = pts.duplicate()


func update(dt: float) -> void:
	if path.is_empty():
		set_tex(base)
		return
	var t: Vector2 = path[0]
	var d := Vector2(t.x - x, t.y - y)
	var st := speed * dt
	if d.length() <= st:
		x = t.x
		y = t.y
		path.pop_front()
	else:
		var n := d.normalized()
		x += n.x * st
		y += n.y * st
	phase += dt * 5.5
	var wn := "%s_w%d" % [base, 1 + int(floor(phase)) % 2]
	set_tex(wn if (int(floor(phase * 2.0)) % 2 == 1 and Art.has(wn)) else base)
