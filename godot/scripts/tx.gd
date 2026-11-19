class_name Tx
## On-screen text pass (port of src/text/tx.ts): a rewritten line from assets/data/text.json
## replaces the original when present. Keys are the original strings; "{0}" marks a runtime value.

static var _exact: Dictionary = {}
static var _pats: Array = []
static var _loaded := false


static func _load() -> void:
	_loaded = true
	var src := FileAccess.get_file_as_string("res://assets/data/text.json")
	var d = JSON.parse_string(src) if src != "" else null
	if typeof(d) != TYPE_DICTIONARY:
		return
	_exact = d
	for k in d.keys():
		if not "{0}" in k:
			continue
		var esc := ""
		for c in k:
			esc += ("\\" + c) if ".^$|?*+()[]{}\\".contains(c) else c
		esc = esc.replace("\\{0\\}", "(.*?)")
		var re := RegEx.create_from_string("^" + esc + "$")
		if re and re.is_valid():
			_pats.append([re, d[k]])


static func t(s: String) -> String:
	if s == "":
		return s
	if not _loaded:
		_load()
	if _exact.has(s):
		return _exact[s]
	for p in _pats:
		var m: RegExMatch = p[0].search(s)
		if m:
			return String(p[1]).replace("{0}", t(m.get_string(1)))
	if "\n" in s:
		var out := []
		for line in s.split("\n"):
			out.append(t(line))
		return "\n".join(out)
	return s
