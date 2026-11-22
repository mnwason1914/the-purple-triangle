"""
Procedural low-poly 3D character generator for THE PURPLE TRIANGLE (Task T1).

Run headless:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python art-src/blender/make_characters.py

Outputs:
    godot/assets/models/chr_<id>.glb       (standing)
    godot/assets/models/chr_<id>_w1.glb    (walk left step)
    godot/assets/models/chr_<id>_w2.glb    (walk right step)
    art-src/blender/renders/<id>_front.png (512x512)
    art-src/blender/renders/<id>_side.png  (512x512)
    art-src/blender/renders/<id>_game.png  (512x512, 55-deg top-down 3/4)
    art-src/blender/renders/lineup_front.png
    art-src/blender/renders/lineup_game.png
    art-src/blender/renders/lineup_walk.png

Coordinate convention:
    In Blender: +X right, +Y forward, +Z up, origin at feet (min Z = 0).
    Exported GLB (export_yup=True): +X right, +Y up, -Z forward, origin at feet (min Y = 0).
"""

import math
import os
import json
import struct
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
MODELS_DIR = os.path.join(REPO_ROOT, "godot", "assets", "models")
RENDERS_DIR = os.path.join(SCRIPT_DIR, "renders")

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(RENDERS_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Color utilities (sRGB hex/tuple -> linear RGBA for COLOR_0)
# ---------------------------------------------------------------------------
def srgb_ch_to_linear(c: float) -> float:
    c = max(0.0, min(1.0, c))
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def hex_col(h: str) -> tuple:
    h = h.lstrip("#")
    return (
        int(h[0:2], 16) / 255.0,
        int(h[2:4], 16) / 255.0,
        int(h[4:6], 16) / 255.0,
    )


def shade_srgb(rgb: tuple, factor: float) -> tuple:
    return (
        max(0.0, min(1.0, rgb[0] * factor)),
        max(0.0, min(1.0, rgb[1] * factor)),
        max(0.0, min(1.0, rgb[2] * factor)),
    )


def srgb_to_linear_rgba(rgb: tuple) -> tuple:
    return (
        srgb_ch_to_linear(rgb[0]),
        srgb_ch_to_linear(rgb[1]),
        srgb_ch_to_linear(rgb[2]),
        1.0,
    )


# ---------------------------------------------------------------------------
# Palette (1930s Silesian village, muted earthy matching existing Codex art)
# ---------------------------------------------------------------------------
PAL = {
    # Skin tones
    "skin_paul":      hex_col("#e0aa7e"),
    "skin_helena":    hex_col("#dfa67a"),
    "skin_leni":      hex_col("#eebc93"),
    "skin_otto":      hex_col("#dfa076"),
    "skin_police":    hex_col("#da9d73"),
    "skin_police2":   hex_col("#e4ab82"),
    "skin_uncle":     hex_col("#dca47c"),

    # Face details
    "eye_white":      hex_col("#ede8dc"),
    "eye_dark":       hex_col("#221a16"),
    "eye_brown":      hex_col("#3a2417"),
    "lip_warm":       hex_col("#b5705a"),
    "lip_soft":       hex_col("#c87c6a"),
    "cheek_blush":    hex_col("#e09980"),

    # Paul
    "paul_hair":      hex_col("#3e2517"),
    "paul_shirt":     hex_col("#5e6d42"),
    "paul_undershirt":hex_col("#e2d9c5"),
    "paul_suspender": hex_col("#784829"),
    "paul_trousers":  hex_col("#3a3834"),
    "paul_boots":     hex_col("#2e2017"),

    # Helena
    "helena_scarf":   hex_col("#7f5375"),
    "helena_hair":    hex_col("#5c4230"),
    "helena_dress":   hex_col("#422c20"),
    "helena_apron":   hex_col("#a09689"),
    "helena_boots":   hex_col("#332219"),

    # Leni
    "leni_hair":      hex_col("#bc7f3c"),
    "leni_ribbon":    hex_col("#cf2b24"),
    "leni_dress":     hex_col("#b8342d"),
    "leni_collar":    hex_col("#efe8d9"),
    "leni_socks":     hex_col("#ece5d6"),
    "leni_shoes":     hex_col("#613a22"),
    "satchel_main":   hex_col("#7f4e28"),
    "satchel_flap":   hex_col("#6c4020"),
    "satchel_strap":  hex_col("#653b1d"),
    "brass":          hex_col("#d8ab45"),

    # Otto
    "otto_cap":       hex_col("#84827e"),
    "otto_cap_brim":  hex_col("#5d5b58"),
    "otto_hair":      hex_col("#a2a09c"),
    "otto_jacket":    hex_col("#6d4d35"),
    "otto_shirt":     hex_col("#ccb795"),
    "otto_apron":     hex_col("#4b4a49"),
    "otto_trousers":  hex_col("#4a3f36"),
    "otto_boots":     hex_col("#38261b"),
    "armband_red":    hex_col("#b3332d"),
    "armband_white":  hex_col("#ece7dc"),
    "steel":          hex_col("#a2a8ad"),

    # Police
    "pol_shako":      hex_col("#222429"),
    "pol_shako_trim": hex_col("#34373f"),
    "pol_tunic":      hex_col("#293d62"),
    "pol_collar":     hex_col("#9ba6b3"),
    "pol_silver":     hex_col("#c8cfd5"),
    "pol_belt":       hex_col("#1c1d20"),
    "pol_trousers":   hex_col("#3a3c40"),
    "pol_boots":      hex_col("#1b1c20"),
    "pol_moustache":  hex_col("#452b1c"),
    "pol_hair":       hex_col("#3b281c"),
    "pol2_hair":      hex_col("#563c27"),

    # Uncle
    "uncle_hat":      hex_col("#4e443d"),
    "uncle_hatband":  hex_col("#2a2420"),
    "uncle_hair":     hex_col("#706256"),
    "uncle_coat":     hex_col("#9c714c"),
    "uncle_lapel":    hex_col("#886140"),
    "uncle_scarf":    hex_col("#d9c392"),
    "uncle_trousers": hex_col("#3b3631"),
    "uncle_boots":    hex_col("#2f2119"),
    "button_dark":    hex_col("#2e221b"),
}


# ---------------------------------------------------------------------------
# BMesh procedural sculpting helpers
# ---------------------------------------------------------------------------
class CharMeshBuilder:
    """Builds a single flat-shaded mesh with per-face COLOR_0 vertex colors."""

    def __init__(self, name: str):
        self.name = name
        self.bm = bmesh.new()
        self.face_colors = {}

    def _color_faces(self, faces, srgb: tuple, grad_axis=None, grad_range=None, grad_lo=0.88, grad_hi=1.06):
        for f in faces:
            col = srgb
            if grad_axis is not None and grad_range is not None:
                c = f.calc_center_median()
                val = c[grad_axis]
                lo, hi = grad_range
                t = 0.5 if hi <= lo else max(0.0, min(1.0, (val - lo) / (hi - lo)))
                col = shade_srgb(srgb, grad_lo + (grad_hi - grad_lo) * t)
            self.face_colors[f] = srgb_to_linear_rgba(col)

    def add_lathe(
        self,
        profile,
        segs: int = 10,
        center=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        color=(0.7, 0.7, 0.7),
        cap_bottom=True,
        cap_top=True,
        grad_lo=0.86,
        grad_hi=1.05,
        phase=0.0,
        ring_colors=None,
    ):
        """Revolve a vertical profile into a closed low-poly solid."""
        cx, cy, cz = center
        trans_m = Matrix.Translation((cx, cy, cz)) @ Euler(rot_euler, "XYZ").to_matrix().to_4x4()

        rings = []
        zs = [p[0] for p in profile]
        zmin, zmax = min(zs), max(zs)

        for p in profile:
            z, rx, ry = p[0], p[1], p[2]
            y_off = p[3] if len(p) > 3 else 0.0
            x_off = p[4] if len(p) > 4 else 0.0
            ring = []
            for i in range(segs):
                a = phase + (2.0 * math.pi * i) / segs
                pt = trans_m @ Vector((x_off + rx * math.cos(a), y_off + ry * math.sin(a), z))
                ring.append(self.bm.verts.new(pt))
            rings.append(ring)

        created = []
        for r_idx in range(len(rings) - 1):
            r0, r1 = rings[r_idx], rings[r_idx + 1]
            ring_faces = []
            for i in range(segs):
                j = (i + 1) % segs
                try:
                    f = self.bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
                    ring_faces.append(f)
                    created.append(f)
                except ValueError:
                    pass
            c_use = ring_colors[r_idx] if (ring_colors and r_idx < len(ring_colors) and ring_colors[r_idx] is not None) else color
            zm = 0.5 * (profile[r_idx][0] + profile[r_idx + 1][0])
            t = 0.5 if zmax <= zmin else max(0.0, min(1.0, (zm - zmin) / (zmax - zmin)))
            self._color_faces(ring_faces, shade_srgb(c_use, grad_lo + (grad_hi - grad_lo) * t))

        if cap_bottom and len(rings[0]) >= 3:
            try:
                f = self.bm.faces.new(list(reversed(rings[0])))
                created.append(f)
                c_bot = ring_colors[0] if (ring_colors and ring_colors[0] is not None) else color
                self._color_faces([f], shade_srgb(c_bot, grad_lo * 0.95))
            except ValueError:
                pass

        if cap_top and len(rings[-1]) >= 3:
            try:
                f = self.bm.faces.new(rings[-1])
                created.append(f)
                c_top = ring_colors[-1] if (ring_colors and ring_colors[-1] is not None) else color
                self._color_faces([f], shade_srgb(c_top, grad_hi))
            except ValueError:
                pass

        return created

    def add_arc_shell(
        self,
        profile,
        a_start: float,
        a_end: float,
        segs: int = 8,
        thickness: float = 0.024,
        center=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        color=(0.7, 0.7, 0.7),
        grad_lo=0.86,
        grad_hi=1.08,
    ):
        """
        Build a thick curved open-front shell (for aprons, headscarves, open hoods).
        Angles measured from +X counter-clockwise (+pi/2 is +Y front, -pi/2 is -Y back).
        """
        cx, cy, cz = center
        trans_m = Matrix.Translation((cx, cy, cz)) @ Euler(rot_euler, "XYZ").to_matrix().to_4x4()

        zs = [p[0] for p in profile]
        zmin, zmax = min(zs), max(zs)

        outer_rings = []
        inner_rings = []
        for p in profile:
            z, rx, ry = p[0], p[1], p[2]
            y_off = p[3] if len(p) > 3 else 0.0
            o_ring = []
            i_ring = []
            for k in range(segs + 1):
                a = a_start + (a_end - a_start) * (k / segs)
                ca, sa = math.cos(a), math.sin(a)
                o_pt = trans_m @ Vector((rx * ca, y_off + ry * sa, z))
                irx = max(0.005, rx - thickness)
                iry = max(0.005, ry - thickness)
                i_pt = trans_m @ Vector((irx * ca, y_off + iry * sa, z))
                o_ring.append(self.bm.verts.new(o_pt))
                i_ring.append(self.bm.verts.new(i_pt))
            outer_rings.append(o_ring)
            inner_rings.append(i_ring)

        created = []
        nr = len(profile)
        for r in range(nr - 1):
            zm = 0.5 * (profile[r][0] + profile[r + 1][0])
            t = 0.5 if zmax <= zmin else max(0.0, min(1.0, (zm - zmin) / (zmax - zmin)))
            c_ring = shade_srgb(color, grad_lo + (grad_hi - grad_lo) * t)
            c_in = shade_srgb(c_ring, 0.84)
            ring_out = []
            ring_in = []
            for k in range(segs):
                try:
                    f = self.bm.faces.new((outer_rings[r][k], outer_rings[r][k + 1], outer_rings[r + 1][k + 1], outer_rings[r + 1][k]))
                    ring_out.append(f)
                    created.append(f)
                except ValueError:
                    pass
                try:
                    f = self.bm.faces.new((inner_rings[r][k + 1], inner_rings[r][k], inner_rings[r + 1][k], inner_rings[r + 1][k + 1]))
                    ring_in.append(f)
                    created.append(f)
                except ValueError:
                    pass
            # Side end walls closing thickness at k=0 and k=segs
            for k_end, rev in ((0, True), (segs, False)):
                verts_w = (
                    (inner_rings[r][k_end], outer_rings[r][k_end], outer_rings[r + 1][k_end], inner_rings[r + 1][k_end])
                    if rev else
                    (outer_rings[r][k_end], inner_rings[r][k_end], inner_rings[r + 1][k_end], outer_rings[r + 1][k_end])
                )
                try:
                    f = self.bm.faces.new(verts_w)
                    ring_out.append(f)
                    created.append(f)
                except ValueError:
                    pass
            self._color_faces(ring_out, c_ring)
            self._color_faces(ring_in, c_in)

        # Bottom and top rim strips
        for r_idx, rev in ((0, True), (nr - 1, False)):
            rim_faces = []
            for k in range(segs):
                vs = (
                    (outer_rings[r_idx][k + 1], outer_rings[r_idx][k], inner_rings[r_idx][k], inner_rings[r_idx][k + 1])
                    if rev else
                    (outer_rings[r_idx][k], outer_rings[r_idx][k + 1], inner_rings[r_idx][k + 1], inner_rings[r_idx][k])
                )
                try:
                    f = self.bm.faces.new(vs)
                    rim_faces.append(f)
                    created.append(f)
                except ValueError:
                    pass
            self._color_faces(rim_faces, shade_srgb(color, grad_lo if rev else grad_hi))

        return created

    def add_box(
        self,
        size=(0.1, 0.1, 0.1),
        pos=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        color=(0.7, 0.7, 0.7),
        bevel=0.0,
        grad_lo=0.90,
        grad_hi=1.05,
    ):
        sx, sy, sz = size
        ret = bmesh.ops.create_cube(self.bm, size=1.0)
        verts = ret["verts"]
        for v in verts:
            v.co.x *= sx
            v.co.y *= sy
            v.co.z *= sz

        faces = list({f for v in verts for f in v.link_faces})
        if bevel > 0.0:
            edges = list({e for f in faces for e in f.edges})
            res = bmesh.ops.bevel(
                self.bm,
                geom=edges,
                offset=bevel,
                segments=1,
                profile=0.5,
                affect="EDGES",
                clamp_overlap=True,
            )
            verts = [v for v in (set(verts) | set(res.get("verts", []))) if v.is_valid]
            faces = list({f for v in verts for f in v.link_faces if f.is_valid})

        mat = Matrix.Translation(pos) @ Euler(rot_euler, "XYZ").to_matrix().to_4x4()
        bmesh.ops.transform(self.bm, matrix=mat, verts=verts)

        zs = [v.co.z for v in verts]
        self._color_faces(faces, color, grad_axis=2, grad_range=(min(zs), max(zs)), grad_lo=grad_lo, grad_hi=grad_hi)
        return faces

    def add_ellipsoid(
        self,
        radii=(0.1, 0.1, 0.1),
        pos=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        color=(0.7, 0.7, 0.7),
        u_segs=8,
        v_segs=4,
        grad_lo=0.88,
        grad_hi=1.05,
    ):
        rx, ry, rz = radii
        ret = bmesh.ops.create_uvsphere(self.bm, u_segments=u_segs, v_segments=v_segs, radius=1.0)
        verts = ret["verts"]
        for v in verts:
            v.co.x *= rx
            v.co.y *= ry
            v.co.z *= rz
        mat = Matrix.Translation(pos) @ Euler(rot_euler, "XYZ").to_matrix().to_4x4()
        bmesh.ops.transform(self.bm, matrix=mat, verts=verts)
        faces = list({f for v in verts for f in v.link_faces})
        zs = [v.co.z for v in verts]
        self._color_faces(faces, color, grad_axis=2, grad_range=(min(zs), max(zs)), grad_lo=grad_lo, grad_hi=grad_hi)
        return faces

    def add_limb(
        self,
        p0: Vector,
        p1: Vector,
        r0,
        r1,
        segs: int = 8,
        color=(0.7, 0.7, 0.7),
        cap_extend=0.012,
        grad_lo=0.88,
        grad_hi=1.04,
        mid_bulge=1.0,
    ):
        if isinstance(r0, (int, float)):
            r0 = (r0, r0)
        if isinstance(r1, (int, float)):
            r1 = (r1, r1)

        vec = p1 - p0
        length = vec.length
        if length < 1e-5:
            return []
        z_dir = vec.normalized()

        ref = Vector((0.0, 1.0, 0.0)) if abs(z_dir.y) < 0.9 else Vector((1.0, 0.0, 0.0))
        x_dir = ref.cross(z_dir).normalized()
        y_dir = z_dir.cross(x_dir).normalized()

        stations = [
            (-cap_extend, r0[0] * 0.65, r0[1] * 0.65),
            (0.0, r0[0], r0[1]),
            (length * 0.5, 0.5 * (r0[0] + r1[0]) * mid_bulge, 0.5 * (r0[1] + r1[1]) * mid_bulge),
            (length, r1[0], r1[1]),
            (length + cap_extend, r1[0] * 0.65, r1[1] * 0.65),
        ]

        rings = []
        for s_dist, rx, ry in stations:
            base = p0 + z_dir * s_dist
            ring = []
            for i in range(segs):
                a = (2.0 * math.pi * i) / segs
                pt = base + x_dir * (rx * math.cos(a)) + y_dir * (ry * math.sin(a))
                ring.append(self.bm.verts.new(pt))
            rings.append(ring)

        created = []
        for r_idx in range(len(rings) - 1):
            r_a, r_b = rings[r_idx], rings[r_idx + 1]
            for i in range(segs):
                j = (i + 1) % segs
                try:
                    created.append(self.bm.faces.new((r_a[i], r_a[j], r_b[j], r_b[i])))
                except ValueError:
                    pass
        try:
            created.append(self.bm.faces.new(list(reversed(rings[0]))))
        except ValueError:
            pass
        try:
            created.append(self.bm.faces.new(rings[-1]))
        except ValueError:
            pass

        zs = [v.co.z for r in rings for v in r]
        self._color_faces(created, color, grad_axis=2, grad_range=(min(zs), max(zs)), grad_lo=grad_lo, grad_hi=grad_hi)
        return created

    def add_tube_path(
        self,
        points,
        radii,
        segs: int = 6,
        color=(0.7, 0.7, 0.7),
        cap=True,
        grad_lo=0.90,
        grad_hi=1.05,
    ):
        pts = [Vector(p) for p in points]
        n = len(pts)
        if n < 2:
            return []

        rings = []
        for idx, p in enumerate(pts):
            if idx == 0:
                tang = (pts[1] - pts[0]).normalized()
            elif idx == n - 1:
                tang = (pts[-1] - pts[-2]).normalized()
            else:
                tang = (pts[idx + 1] - pts[idx - 1]).normalized()
            if tang.length < 1e-6:
                tang = Vector((0.0, 0.0, 1.0))

            ref = Vector((0.0, 1.0, 0.0)) if abs(tang.y) < 0.9 else Vector((1.0, 0.0, 0.0))
            u = ref.cross(tang).normalized()
            v = tang.cross(u).normalized()

            is_per_point = isinstance(radii, list) and len(radii) == n
            rad = radii[idx] if is_per_point else radii
            rx, ry = rad if isinstance(rad, (list, tuple)) else (rad, rad)

            ring = []
            for i in range(segs):
                a = (2.0 * math.pi * i) / segs
                pt = p + u * (rx * math.cos(a)) + v * (ry * math.sin(a))
                ring.append(self.bm.verts.new(pt))
            rings.append(ring)

        created = []
        for r_idx in range(n - 1):
            ra, rb = rings[r_idx], rings[r_idx + 1]
            for i in range(segs):
                j = (i + 1) % segs
                try:
                    created.append(self.bm.faces.new((ra[i], ra[j], rb[j], rb[i])))
                except ValueError:
                    pass
        if cap:
            try:
                created.append(self.bm.faces.new(list(reversed(rings[0]))))
            except ValueError:
                pass
            try:
                created.append(self.bm.faces.new(rings[-1]))
            except ValueError:
                pass

        zs = [v.co.z for r in rings for v in r]
        self._color_faces(created, color, grad_axis=2, grad_range=(min(zs), max(zs)), grad_lo=grad_lo, grad_hi=grad_hi)
        return created

    def finalize_object(self, material, target_height: float = None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)

        if self.bm.verts:
            zs = [v.co.z for v in self.bm.verts]
            zmin, zmax = min(zs), max(zs)
            for v in self.bm.verts:
                v.co.z -= zmin
            cur_h = zmax - zmin
            if target_height is not None and cur_h > 1e-4:
                scale = target_height / cur_h
                for v in self.bm.verts:
                    v.co *= scale

        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)

        self.bm.faces.ensure_lookup_table()
        default_col = srgb_to_linear_rgba((0.7, 0.7, 0.7))
        face_col_list = [self.face_colors.get(f, default_col) for f in self.bm.faces]
        self.bm.free()

        for poly in mesh.polygons:
            poly.use_smooth = False

        color_attr = mesh.color_attributes.new(name="COLOR_0", type="BYTE_COLOR", domain="CORNER")
        mesh.color_attributes.active_color = color_attr
        mesh.color_attributes.render_color_index = 0

        for poly_idx, poly in enumerate(mesh.polygons):
            rgba = face_col_list[poly_idx]
            for loop_idx in poly.loop_indices:
                color_attr.data[loop_idx].color = rgba

        mesh.materials.append(material)
        mesh.update()

        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.collection.objects.link(obj)
        return obj


# ---------------------------------------------------------------------------
# Shared material (Principled BSDF fed by COLOR_0)
# ---------------------------------------------------------------------------
def create_vertex_color_material(name="Mat_VertexColor"):
    mat = bpy.data.materials.new(name=name)
    if not mat.node_tree:
        mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out_node = nt.nodes.new("ShaderNodeOutputMaterial")
    out_node.location = (300, 0)

    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (0, 0)
    bsdf.inputs["Roughness"].default_value = 0.86
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.20
    bsdf.inputs["Metallic"].default_value = 0.0

    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.location = (-280, 0)
    vc.layer_name = "COLOR_0"

    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])
    return mat


# ---------------------------------------------------------------------------
# Pose helper
# ---------------------------------------------------------------------------
def get_pose_params(pose: str):
    if pose == "stand":
        return {
            "l_hip_pitch": 0.0,
            "r_hip_pitch": 0.0,
            "l_knee_bend": 0.04,
            "r_knee_bend": 0.04,
            "l_arm_pitch": 0.04,
            "r_arm_pitch": 0.04,
            "l_elbow_bend": 0.14,
            "r_elbow_bend": 0.14,
            "torso_yaw": 0.0,
            "stride_sign": 0.0,
        }
    sign = 1.0 if pose == "w1" else -1.0
    return {
        "l_hip_pitch": 0.46 * sign,
        "r_hip_pitch": -0.42 * sign,
        "l_knee_bend": 0.20 if sign > 0 else 0.34,
        "r_knee_bend": 0.34 if sign > 0 else 0.20,
        "l_arm_pitch": -0.44 * sign,
        "r_arm_pitch": 0.46 * sign,
        "l_elbow_bend": 0.28 if sign < 0 else 0.18,
        "r_elbow_bend": 0.28 if sign > 0 else 0.18,
        "torso_yaw": -0.10 * sign,
        "stride_sign": sign,
    }


def rotate_about_x(vec: Vector, angle: float) -> Vector:
    c, s = math.cos(angle), math.sin(angle)
    return Vector((vec.x, vec.y * c - vec.z * s, vec.y * s + vec.z * c))


def rotate_about_z(vec: Vector, angle: float) -> Vector:
    c, s = math.cos(angle), math.sin(angle)
    return Vector((vec.x * c - vec.y * s, vec.x * s + vec.y * c, vec.z))


# ---------------------------------------------------------------------------
# Modular stylized character parts
# ---------------------------------------------------------------------------
def build_head_and_face(
    mb: CharMeshBuilder,
    neck_top: Vector,
    head_rx: float,
    head_ry: float,
    head_h: float,
    skin_col: tuple,
    eye_col: tuple,
    brow_col: tuple,
    lip_col: tuple,
    is_child: bool = False,
    expression: str = "neutral",
    moustache: str = None,
    moustache_col: tuple = None,
    yaw: float = 0.0,
    show_ears: bool = True,
):
    """Sculpted stylized low-poly head centered above neck_top, facing +Y."""
    head_base_z = neck_top.z - 0.020
    head_center = Vector((neck_top.x, neck_top.y, head_base_z + head_h * 0.50))

    chin_w = 0.58 if is_child else 0.50
    jaw_w = 0.88 if is_child else 0.80
    cheek_y = 0.012 if is_child else 0.010

    profile = [
        (0.00 * head_h, head_rx * 0.30, head_ry * 0.32, 0.008),
        (0.10 * head_h, head_rx * chin_w, head_ry * 0.64, 0.014),
        (0.26 * head_h, head_rx * jaw_w, head_ry * 0.88, cheek_y),
        (0.47 * head_h, head_rx * 1.00, head_ry * 1.00, 0.006),
        (0.69 * head_h, head_rx * 0.98, head_ry * 0.99, 0.000),
        (0.87 * head_h, head_rx * 0.82, head_ry * 0.84, -0.004),
        (0.96 * head_h, head_rx * 0.52, head_ry * 0.54, -0.006),
        (1.00 * head_h, head_rx * 0.20, head_ry * 0.22, -0.006),
    ]
    mb.add_lathe(
        profile,
        segs=12,
        center=(neck_top.x, neck_top.y, head_base_z),
        rot_euler=(0.0, 0.0, yaw),
        color=skin_col,
        grad_lo=0.89,
        grad_hi=1.04,
    )

    def hpt(x, y, z):
        p = Vector((x, y, z))
        if abs(yaw) > 1e-5:
            p = rotate_about_z(p, yaw)
        return Vector((neck_top.x, neck_top.y, head_base_z)) + p

    # Ears
    if show_ears:
        ear_z = head_h * 0.45
        for side in (-1.0, 1.0):
            mb.add_ellipsoid(
                radii=(head_rx * 0.18, head_ry * 0.18, head_h * 0.13),
                pos=hpt(side * head_rx * 0.95, -0.006, ear_z),
                rot_euler=(0.0, 0.0, yaw),
                color=shade_srgb(skin_col, 0.93),
                u_segs=6,
                v_segs=4,
            )

    # Nose (crisp sculpted wedge catching top-down light)
    nose_y = head_ry * 0.98
    nose_z = head_h * (0.40 if is_child else 0.43)
    nose_sz = (head_rx * 0.20, head_ry * 0.24, head_h * (0.12 if is_child else 0.17))
    mb.add_box(
        size=nose_sz,
        pos=hpt(0.0, nose_y, nose_z),
        rot_euler=(-0.22, 0.0, yaw),
        color=shade_srgb(skin_col, 0.93),
        bevel=0.004,
    )

    # Stylized readable eyes (unbeveled crisp boxes save ~250 tris per character!)
    eye_z = head_h * (0.47 if is_child else 0.51)
    eye_x = head_rx * (0.39 if is_child else 0.36)
    eye_y = head_ry * 0.92
    eye_r_w = head_rx * (0.18 if is_child else 0.155)
    eye_r_h = head_h * (0.115 if is_child else 0.086)

    for side in (-1.0, 1.0):
        # Sclera
        mb.add_box(
            size=(eye_r_w * 1.48, 0.020, eye_r_h * 1.32),
            pos=hpt(side * eye_x, eye_y, eye_z),
            rot_euler=(0.0, 0.0, yaw - side * 0.22),
            color=PAL["eye_white"],
            bevel=0.0,
            grad_lo=0.97,
            grad_hi=1.0,
        )
        # Pupil / iris
        mb.add_box(
            size=(eye_r_w * 0.96, 0.016, eye_r_h * 1.12),
            pos=hpt(side * (eye_x - side * 0.003), eye_y + 0.009, eye_z),
            rot_euler=(0.0, 0.0, yaw - side * 0.22),
            color=eye_col,
            bevel=0.0,
            grad_lo=0.96,
            grad_hi=1.0,
        )

        # Eyebrows
        brow_z = eye_z + eye_r_h * 1.25
        brow_tilt = 0.0
        if expression == "worried":
            brow_tilt = 0.24 * side
        elif expression == "stern":
            brow_tilt = -0.20 * side
        elif expression == "determined":
            brow_tilt = -0.07 * side
        elif expression == "happy":
            brow_tilt = 0.08 * side
        elif expression == "gentle":
            brow_tilt = 0.05 * side

        brow_h = head_h * (0.036 if is_child else 0.048)
        brow_w = eye_r_w * 1.72
        mb.add_box(
            size=(brow_w, 0.022, brow_h),
            pos=hpt(side * eye_x, eye_y + 0.011, brow_z),
            rot_euler=(0.0, brow_tilt, yaw - side * 0.20),
            color=brow_col,
            bevel=0.0,
            grad_lo=0.92,
            grad_hi=1.02,
        )

    # Subtle rosy cheeks for Leni
    if is_child:
        for side in (-1.0, 1.0):
            mb.add_box(
                size=(head_rx * 0.22, 0.014, head_h * 0.065),
                pos=hpt(side * head_rx * 0.56, head_ry * 0.85, head_h * 0.35),
                rot_euler=(0.0, 0.0, yaw - side * 0.38),
                color=PAL["cheek_blush"],
                bevel=0.0,
            )

    # Mouth
    mouth_z = head_h * 0.23
    mouth_y = head_ry * 0.88
    mouth_w = head_rx * (0.42 if is_child else 0.40)
    mouth_h = head_h * (0.044 if is_child else 0.036)
    mb.add_box(
        size=(mouth_w, 0.020, mouth_h),
        pos=hpt(0.0, mouth_y, mouth_z),
        rot_euler=(0.0, 0.0, yaw),
        color=lip_col,
        bevel=0.0,
    )

    # Optional Moustache
    if moustache:
        m_col = moustache_col or brow_col
        mz = head_h * 0.295
        my = head_ry * 0.97
        if moustache == "bushy":
            pts = [
                hpt(-head_rx * 0.48, my - 0.024, mz - 0.018),
                hpt(-head_rx * 0.22, my + 0.012, mz + 0.006),
                hpt(0.0,             my + 0.020, mz + 0.008),
                hpt(head_rx * 0.22,  my + 0.012, mz + 0.006),
                hpt(head_rx * 0.48,  my - 0.024, mz - 0.018),
            ]
            rads = [0.016, 0.029, 0.027, 0.029, 0.016]
            mb.add_tube_path(pts, rads, segs=6, color=m_col, grad_lo=0.88, grad_hi=1.06)
        elif moustache == "police":
            pts = [
                hpt(-head_rx * 0.44, my - 0.018, mz - 0.012),
                hpt(-head_rx * 0.18, my + 0.012, mz + 0.004),
                hpt(0.0,             my + 0.016, mz + 0.006),
                hpt(head_rx * 0.18,  my + 0.012, mz + 0.004),
                hpt(head_rx * 0.44,  my - 0.018, mz - 0.012),
            ]
            rads = [0.014, 0.024, 0.023, 0.024, 0.014]
            mb.add_tube_path(pts, rads, segs=6, color=m_col, grad_lo=0.86, grad_hi=1.04)

    return head_center, head_base_z, head_base_z + head_h


def build_hand(mb: CharMeshBuilder, wrist: Vector, arm_dir: Vector, side: float, scale: float, skin_col: tuple):
    fwd = arm_dir.normalized()
    palm_end = wrist + fwd * (0.092 * scale)
    mb.add_limb(
        wrist,
        palm_end,
        (0.036 * scale, 0.026 * scale),
        (0.031 * scale, 0.020 * scale),
        segs=6,
        color=skin_col,
        cap_extend=0.010 * scale,
    )
    thumb_base = wrist + fwd * (0.028 * scale) + Vector((-side * 0.024 * scale, 0.016 * scale, 0.0))
    thumb_tip = thumb_base + fwd * (0.036 * scale) + Vector((-side * 0.014 * scale, 0.015 * scale, 0.0))
    mb.add_limb(
        thumb_base,
        thumb_tip,
        0.015 * scale,
        0.011 * scale,
        segs=5,
        color=shade_srgb(skin_col, 0.95),
        cap_extend=0.005 * scale,
    )


def build_boot(
    mb: CharMeshBuilder,
    ankle: Vector,
    foot_pitch: float,
    scale: float,
    boot_col: tuple,
    tall_shaft: bool = False,
    sole_col: tuple = None,
    is_mary_jane: bool = False,
    sock_col: tuple = None,
):
    """Grounded low-poly boot/shoe whose flat sole sits cleanly at the very bottom."""
    s_col = sole_col or shade_srgb(boot_col, 0.65)
    foot_fwd = rotate_about_x(Vector((0.0, 1.0, 0.0)), foot_pitch)
    foot_down = rotate_about_x(Vector((0.0, 0.0, -1.0)), foot_pitch)

    boot_h = 0.082 * scale
    foot_base = ankle + foot_down * boot_h

    if tall_shaft:
        shaft_top = ankle - foot_down * (0.24 * scale)
        mb.add_limb(
            shaft_top,
            ankle + foot_down * (0.02 * scale),
            (0.068 * scale, 0.072 * scale),
            (0.056 * scale, 0.060 * scale),
            segs=8,
            color=boot_col,
            cap_extend=0.010,
            grad_lo=0.88,
            grad_hi=1.08,
        )
    elif is_mary_jane and sock_col is not None:
        sock_top = ankle - foot_down * (0.11 * scale)
        mb.add_limb(
            sock_top,
            ankle + foot_down * (0.025 * scale),
            (0.050 * scale, 0.050 * scale),
            (0.044 * scale, 0.044 * scale),
            segs=7,
            color=sock_col,
            cap_extend=0.008,
        )

    # Boot upper (kept cleanly ABOVE the flat sole bottom!)
    heel = foot_base - foot_fwd * (0.036 * scale) - foot_down * (0.048 * scale)
    toe = foot_base + foot_fwd * (0.108 * scale) - foot_down * (0.042 * scale)
    mb.add_limb(
        heel,
        toe,
        (0.052 * scale, 0.040 * scale),
        (0.046 * scale, 0.028 * scale),
        segs=8,
        color=boot_col,
        cap_extend=0.014 * scale,
        grad_lo=0.85,
        grad_hi=1.06,
    )

    # Flat sole sitting clearly as the lowest contact plane (zero nubs poking below!)
    sole_center = foot_base + foot_fwd * (0.036 * scale) - foot_down * (0.006 * scale)
    mb.add_box(
        size=(0.106 * scale, 0.195 * scale, 0.028 * scale),
        pos=sole_center,
        rot_euler=(foot_pitch, 0.0, 0.0),
        color=s_col,
        bevel=0.0,
    )


def build_legs_standard(
    mb: CharMeshBuilder,
    hip_z: float,
    hip_spread: float,
    thigh_len: float,
    shin_len: float,
    thigh_r: float,
    calf_r: float,
    trouser_col: tuple,
    boot_col: tuple,
    pose_p: dict,
    boot_scale: float = 1.0,
    tall_boots: bool = False,
    pelvis_col: tuple = None,
    bare_legs_col: tuple = None,
    sock_col: tuple = None,
    is_mary_jane: bool = False,
):
    mb.add_ellipsoid(
        radii=(hip_spread + thigh_r * 0.92, thigh_r * 1.05, thigh_r * 0.92),
        pos=(0.0, 0.0, hip_z + 0.01),
        color=pelvis_col or trouser_col,
        u_segs=8,
        v_segs=4,
    )

    for side in (-1.0, 1.0):
        is_left = side < 0.0
        hip_pitch = pose_p["l_hip_pitch"] if is_left else pose_p["r_hip_pitch"]
        knee_bend = pose_p["l_knee_bend"] if is_left else pose_p["r_knee_bend"]

        hip = Vector((side * hip_spread, 0.0, hip_z))
        knee = hip + rotate_about_x(Vector((0.0, 0.0, -thigh_len)), hip_pitch)
        ankle = knee + rotate_about_x(Vector((0.0, 0.0, -shin_len)), hip_pitch - knee_bend)

        upper_col = trouser_col
        lower_col = bare_legs_col if bare_legs_col is not None else trouser_col

        mb.add_limb(
            hip,
            knee,
            (thigh_r * 1.05, thigh_r * 1.10),
            (calf_r * 1.04, calf_r * 1.06),
            segs=8,
            color=upper_col,
            cap_extend=0.018,
            mid_bulge=1.03,
        )
        mb.add_limb(
            knee,
            ankle,
            (calf_r * 1.00, calf_r * 1.02),
            (calf_r * 0.78, calf_r * 0.80),
            segs=8,
            color=lower_col,
            cap_extend=0.016,
            mid_bulge=1.04,
        )

        build_boot(
            mb,
            ankle=ankle,
            foot_pitch=hip_pitch * 0.28,
            scale=boot_scale,
            boot_col=boot_col,
            tall_shaft=tall_boots,
            is_mary_jane=is_mary_jane,
            sock_col=sock_col,
        )


def build_arms_standard(
    mb: CharMeshBuilder,
    shoulder_z: float,
    shoulder_x: float,
    upper_len: float,
    fore_len: float,
    upper_r: float,
    wrist_r: float,
    sleeve_col: tuple,
    skin_col: tuple,
    pose_p: dict,
    hand_scale: float = 1.0,
    cuff_col: tuple = None,
    clasped_front: bool = False,
    armband: bool = False,
):
    """Build articulated arms with smooth, natural non-bulging shoulders."""
    yaw = pose_p["torso_yaw"]

    if clasped_front and pose_p["stride_sign"] == 0.0:
        for side in (-1.0, 1.0):
            sh = Vector((side * shoulder_x, 0.0, shoulder_z))
            elbow = Vector((side * (shoulder_x + 0.032), 0.038, shoulder_z - upper_len * 0.88))
            wrist = Vector((side * 0.044, 0.148, shoulder_z - upper_len - fore_len * 0.42))

            # Smooth low-profile shoulder blend (tucked slightly down & inward)
            mb.add_ellipsoid(
                radii=(upper_r * 0.98, upper_r * 0.98, upper_r * 0.84),
                pos=sh + Vector((-side * 0.012, 0.0, -0.008)),
                color=sleeve_col,
                u_segs=7,
                v_segs=4,
            )
            mb.add_limb(sh, elbow, upper_r, upper_r * 0.88, segs=7, color=sleeve_col, cap_extend=0.014)
            mb.add_limb(elbow, wrist, upper_r * 0.86, wrist_r, segs=7, color=sleeve_col, cap_extend=0.014)
            build_hand(mb, wrist, (Vector((0.0, 0.17, wrist.z - 0.02)) - wrist), side, hand_scale, skin_col)
        return

    for side in (-1.0, 1.0):
        is_left = side < 0.0
        arm_pitch = pose_p["l_arm_pitch"] if is_left else pose_p["r_arm_pitch"]
        elbow_bend = pose_p["l_elbow_bend"] if is_left else pose_p["r_elbow_bend"]

        sh = rotate_about_z(Vector((side * shoulder_x, 0.0, shoulder_z)), yaw)
        out_x = side * 0.042 * hand_scale
        elbow = sh + rotate_about_x(Vector((out_x, 0.0, -upper_len)), arm_pitch)
        f_vec = rotate_about_x(Vector((-out_x * 0.22, 0.0, -fore_len)), arm_pitch + elbow_bend)
        wrist = elbow + f_vec

        # Smooth shoulder cap tucked seamlessly into torso shoulder slope
        mb.add_ellipsoid(
            radii=(upper_r * 1.00, upper_r * 1.00, upper_r * 0.84),
            pos=sh + rotate_about_z(Vector((-side * 0.014, 0.0, -0.006)), yaw),
            color=sleeve_col,
            u_segs=7,
            v_segs=4,
        )

        mb.add_limb(sh, elbow, upper_r, upper_r * 0.88, segs=7, color=sleeve_col, cap_extend=0.014)

        if armband and is_left:
            ab_p0 = sh.lerp(elbow, 0.28)
            ab_p1 = sh.lerp(elbow, 0.64)
            mb.add_limb(
                ab_p0,
                ab_p1,
                upper_r * 1.08,
                upper_r * 1.04,
                segs=7,
                color=PAL["armband_red"],
                cap_extend=0.002,
                grad_lo=0.95,
                grad_hi=1.05,
            )
            ab_mid = ab_p0.lerp(ab_p1, 0.5)
            mb.add_ellipsoid(
                radii=(0.010, 0.032, 0.032),
                pos=ab_mid + Vector((-upper_r * 1.05, 0.0, 0.0)),
                color=PAL["armband_white"],
                u_segs=7,
                v_segs=4,
                grad_lo=0.98,
                grad_hi=1.02,
            )

        mb.add_limb(elbow, wrist, upper_r * 0.86, wrist_r, segs=7, color=sleeve_col, cap_extend=0.014)

        if cuff_col is not None:
            cuff_p0 = elbow.lerp(wrist, 0.78)
            mb.add_limb(
                cuff_p0,
                wrist + f_vec.normalized() * 0.006,
                wrist_r * 1.15,
                wrist_r * 1.13,
                segs=7,
                color=cuff_col,
                cap_extend=0.003,
            )

        build_hand(mb, wrist, f_vec, side, hand_scale, skin_col)


# ---------------------------------------------------------------------------
# Character Builders (8 IDs)
# ---------------------------------------------------------------------------

def build_paul(pose: str, mat):
    """
    Paul (24, 1.75 m): dark-brown wavy/parted hair, olive work shirt,
    flush cream open-collar undershirt, brown leather suspenders, dark trousers & boots.
    """
    mb = CharMeshBuilder(f"chr_paul_{pose}")
    p = get_pose_params(pose)
    yaw = p["torso_yaw"]

    build_legs_standard(
        mb,
        hip_z=0.77,
        hip_spread=0.105,
        thigh_len=0.35,
        shin_len=0.34,
        thigh_r=0.088,
        calf_r=0.068,
        trouser_col=PAL["paul_trousers"],
        boot_col=PAL["paul_boots"],
        pose_p=p,
        boot_scale=1.02,
    )

    # Olive work shirt torso (natural sloped shoulders)
    torso_profile = [
        (0.00, 0.165, 0.112),
        (0.06, 0.168, 0.116),
        (0.22, 0.190, 0.128),
        (0.38, 0.218, 0.132),
        (0.46, 0.214, 0.122),
        (0.51, 0.120, 0.098),
    ]
    mb.add_lathe(
        torso_profile,
        segs=10,
        center=(0.0, 0.0, 0.78),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["paul_shirt"],
        grad_lo=0.86,
        grad_hi=1.06,
    )

    # Belt + brass buckle
    mb.add_lathe(
        [(0.0, 0.172, 0.119), (0.044, 0.173, 0.120)],
        segs=10,
        center=(0.0, 0.0, 0.80),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["paul_boots"],
    )
    mb.add_box(
        size=(0.050, 0.018, 0.040),
        pos=rotate_about_z(Vector((0.0, 0.118, 0.822)), yaw),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["brass"],
    )

    # Flush V-neck undershirt inset + open olive shirt collar wings (NO blocky floating badge!)
    mb.add_lathe(
        [
            (0.00, 0.025, 0.016, 0.112),
            (0.09, 0.072, 0.036, 0.088),
            (0.14, 0.082, 0.074, 0.025),
        ],
        segs=8,
        center=(0.0, 0.0, 1.155),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["paul_undershirt"],
        grad_lo=0.92,
        grad_hi=1.04,
    )
    for side in (-1.0, 1.0):
        mb.add_box(
            size=(0.068, 0.056, 0.044),
            pos=rotate_about_z(Vector((side * 0.074, 0.068, 1.270)), yaw),
            rot_euler=(0.24, -side * 0.42, yaw + side * 0.34),
            color=shade_srgb(PAL["paul_shirt"], 1.10),
            bevel=0.004,
        )

    # Brown leather suspenders hugging chest & back
    for side in (-1.0, 1.0):
        sx = side * 0.094
        pts = [
            rotate_about_z(Vector((sx * 0.90, 0.116, 0.82)), yaw),
            rotate_about_z(Vector((sx * 1.00, 0.126, 1.03)), yaw),
            rotate_about_z(Vector((sx * 1.06, 0.104, 1.22)), yaw),
            rotate_about_z(Vector((sx * 1.02, 0.008, 1.288)), yaw),
            rotate_about_z(Vector((sx * 0.94, -0.104, 1.20)), yaw),
            rotate_about_z(Vector((sx * 0.54, -0.124, 1.01)), yaw),
            rotate_about_z(Vector((sx * 0.44, -0.115, 0.82)), yaw),
        ]
        mb.add_tube_path(pts, (0.020, 0.011), segs=6, color=PAL["paul_suspender"])

    # Sturdy neck
    mb.add_limb(
        Vector((0.0, 0.0, 1.26)),
        Vector((0.0, 0.0, 1.35)),
        0.070,
        0.066,
        segs=8,
        color=shade_srgb(PAL["skin_paul"], 0.92),
    )

    # Arms (smooth tucked shoulders)
    build_arms_standard(
        mb,
        shoulder_z=1.195,
        shoulder_x=0.212,
        upper_len=0.26,
        fore_len=0.23,
        upper_r=0.064,
        wrist_r=0.047,
        sleeve_col=PAL["paul_shirt"],
        skin_col=PAL["skin_paul"],
        pose_p=p,
        hand_scale=1.0,
    )

    # Bigger, more readable stylized head for 55-deg top-down camera!
    head_c, hb_z, ht_z = build_head_and_face(
        mb,
        neck_top=Vector((0.0, 0.0, 1.35)),
        head_rx=0.156,
        head_ry=0.162,
        head_h=0.375,
        skin_col=PAL["skin_paul"],
        eye_col=PAL["eye_dark"],
        brow_col=PAL["paul_hair"],
        lip_col=PAL["lip_warm"],
        expression="determined",
        yaw=yaw * 0.4,
    )

    # Dark-brown wavy parted hair wrapping cranium cleanly (no floating nape lump!)
    hair_col = PAL["paul_hair"]
    hyaw = yaw * 0.4
    hair_prof = [
        (0.00, 0.154, 0.158, -0.024),
        (0.09, 0.168, 0.172, -0.020),
        (0.18, 0.170, 0.176, -0.012),
        (0.25, 0.146, 0.156, -0.004),
        (0.285, 0.082, 0.092, 0.000),
    ]
    mb.add_lathe(
        hair_prof,
        segs=10,
        center=(0.0, 0.0, hb_z + 0.145),
        rot_euler=(0.0, 0.0, hyaw),
        color=hair_col,
        grad_lo=0.86,
        grad_hi=1.10,
    )
    # Sculpted wavy forelock & side part (matching hud_paul_calm.png)
    mb.add_ellipsoid(
        radii=(0.125, 0.078, 0.066),
        pos=rotate_about_z(Vector((-0.032, 0.105, ht_z - 0.032)), hyaw),
        rot_euler=(0.14, -0.18, hyaw + 0.14),
        color=shade_srgb(hair_col, 1.08),
        u_segs=7,
        v_segs=4,
    )
    mb.add_ellipsoid(
        radii=(0.092, 0.068, 0.056),
        pos=rotate_about_z(Vector((0.068, 0.090, ht_z - 0.044)), hyaw),
        rot_euler=(0.12, 0.18, hyaw - 0.16),
        color=shade_srgb(hair_col, 1.04),
        u_segs=7,
        v_segs=4,
    )
    # Smooth tapered back-of-head hair shell (fits flush to cranium)
    mb.add_arc_shell(
        [
            (0.00, 0.150, 0.156, -0.012),
            (0.08, 0.166, 0.170, -0.014),
            (0.16, 0.168, 0.172, -0.010),
        ],
        a_start=math.radians(170),
        a_end=math.radians(370),
        segs=7,
        thickness=0.032,
        center=(0.0, 0.0, hb_z + 0.080),
        rot_euler=(0.0, 0.0, hyaw),
        color=shade_srgb(hair_col, 0.92),
    )

    return mb.finalize_object(mat, target_height=1.75)


def build_helena(pose: str, mat):
    """
    Helena (51, 1.62 m): OPEN-FRONT plum-grey headscarf framing her face & tied under chin,
    warm brown hair peeking at forehead, dark brown dress, stone-grey apron, dark boots.
    """
    mb = CharMeshBuilder(f"chr_helena_{pose}")
    p = get_pose_params(pose)
    yaw = p["torso_yaw"]

    build_legs_standard(
        mb,
        hip_z=0.70,
        hip_spread=0.088,
        thigh_len=0.32,
        shin_len=0.31,
        thigh_r=0.074,
        calf_r=0.055,
        trouser_col=shade_srgb(PAL["helena_dress"], 0.80),
        boot_col=PAL["helena_boots"],
        pose_p=p,
        boot_scale=0.90,
    )

    # Long dark brown skirt
    stride_extra = 0.048 if pose != "stand" else 0.0
    skirt_prof = [
        (0.00, 0.245, 0.205 + stride_extra, 0.0),
        (0.18, 0.228, 0.188 + stride_extra * 0.6, 0.0),
        (0.41, 0.200, 0.156, 0.0),
        (0.60, 0.166, 0.120, 0.0),
    ]
    mb.add_lathe(
        skirt_prof,
        segs=12,
        center=(0.0, 0.0, 0.16),
        rot_euler=(0.0, 0.0, yaw * 0.4),
        color=PAL["helena_dress"],
        grad_lo=0.82,
        grad_hi=1.04,
    )

    # Dark brown bodice
    bodice_prof = [
        (0.00, 0.164, 0.118),
        (0.14, 0.182, 0.132),
        (0.28, 0.194, 0.130),
        (0.36, 0.184, 0.116),
        (0.41, 0.104, 0.088),
    ]
    mb.add_lathe(
        bodice_prof,
        segs=10,
        center=(0.0, 0.0, 0.75),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["helena_dress"],
        grad_lo=0.86,
        grad_hi=1.06,
    )

    # Curved stone-grey apron wrapping smoothly over the front of the skirt!
    apron_prof = [
        (0.00, 0.256, 0.218 + stride_extra * 0.9, 0.0),
        (0.18, 0.238, 0.200 + stride_extra * 0.5, 0.0),
        (0.38, 0.210, 0.168, 0.0),
        (0.55, 0.176, 0.132, 0.0),
    ]
    mb.add_arc_shell(
        apron_prof,
        a_start=math.radians(32),
        a_end=math.radians(148),
        segs=7,
        thickness=0.018,
        center=(0.0, 0.0, 0.22),
        rot_euler=(0.0, 0.0, yaw * 0.5),
        color=PAL["helena_apron"],
        grad_lo=0.88,
        grad_hi=1.08,
    )
    # Waistband + back bow
    mb.add_lathe(
        [(0.0, 0.174, 0.128), (0.044, 0.173, 0.127)],
        segs=10,
        center=(0.0, 0.0, 0.745),
        rot_euler=(0.0, 0.0, yaw),
        color=shade_srgb(PAL["helena_apron"], 1.04),
    )
    mb.add_ellipsoid(
        radii=(0.050, 0.030, 0.032),
        pos=rotate_about_z(Vector((0.0, -0.132, 0.76)), yaw),
        color=shade_srgb(PAL["helena_apron"], 1.06),
        u_segs=6,
        v_segs=4,
    )

    # Neck
    mb.add_limb(
        Vector((0.0, 0.0, 1.14)),
        Vector((0.0, 0.0, 1.23)),
        0.058,
        0.056,
        segs=8,
        color=shade_srgb(PAL["skin_helena"], 0.92),
    )

    # Arms (smooth tucked shoulders; hands gently clasped in front when standing)
    build_arms_standard(
        mb,
        shoulder_z=1.105,
        shoulder_x=0.184,
        upper_len=0.24,
        fore_len=0.21,
        upper_r=0.058,
        wrist_r=0.043,
        sleeve_col=PAL["helena_dress"],
        skin_col=PAL["skin_helena"],
        pose_p=p,
        hand_scale=0.90,
        clasped_front=True,
    )

    # Bigger, clearly visible gentle worried face!
    head_c, hb_z, ht_z = build_head_and_face(
        mb,
        neck_top=Vector((0.0, 0.0, 1.23)),
        head_rx=0.146,
        head_ry=0.150,
        head_h=0.350,
        skin_col=PAL["skin_helena"],
        eye_col=PAL["eye_brown"],
        brow_col=PAL["helena_hair"],
        lip_col=PAL["lip_soft"],
        expression="worried",
        yaw=yaw * 0.4,
        show_ears=False,  # ears tucked warmly inside headscarf
    )

    hyaw = yaw * 0.4
    scarf_col = PAL["helena_scarf"]

    # Softly parted warm brown hair tucked neatly along forehead hairline inside headscarf
    for side in (-1.0, 1.0):
        mb.add_ellipsoid(
            radii=(0.072, 0.048, 0.032),
            pos=rotate_about_z(Vector((side * 0.044, 0.084, ht_z - 0.056)), hyaw),
            rot_euler=(0.24, -side * 0.28, hyaw - side * 0.22),
            color=PAL["helena_hair"],
            u_segs=6,
            v_segs=4,
        )

    # OPEN-FRONT plum-grey headscarf hood wrapping around sides, back, and crown
    # leaving the ENTIRE face (+Y, angles ~32°..148°) 100% unobstructed!
    scarf_shell_prof = [
        (0.00, 0.162, 0.160, -0.010),  # jaw/chin sides
        (0.09, 0.176, 0.174, -0.012),  # cheek framing
        (0.20, 0.178, 0.178, -0.012),  # temple framing
        (0.30, 0.164, 0.168, -0.008),  # brow framing
        (0.36, 0.122, 0.130, -0.004),  # upper crown edge
    ]
    mb.add_arc_shell(
        scarf_shell_prof,
        a_start=math.radians(136),
        a_end=math.radians(404),       # wraps 268 deg around left -> back -> right, OPEN in front!
        segs=10,
        thickness=0.028,
        center=(0.0, 0.0, hb_z + 0.005),
        rot_euler=(0.0, 0.0, hyaw),
        color=scarf_col,
        grad_lo=0.86,
        grad_hi=1.10,
    )
    # Closed crown dome on top of head (starts above the forehead hairline so face stays wide open!)
    mb.add_lathe(
        [
            (0.00, 0.156, 0.160, -0.010),
            (0.045, 0.132, 0.138, -0.008),
            (0.078, 0.074, 0.080, -0.006),
        ],
        segs=10,
        center=(0.0, 0.0, ht_z - 0.048),
        rot_euler=(0.0, 0.0, hyaw),
        color=shade_srgb(scarf_col, 1.06),
        grad_lo=0.95,
        grad_hi=1.10,
    )
    # Scarf wrap neatly tucked UNDER chin + shoulder drape
    mb.add_lathe(
        [
            (0.00, 0.148, 0.118, 0.002),
            (0.050, 0.122, 0.106, 0.010),
            (0.082, 0.095, 0.096, 0.016),
        ],
        segs=10,
        center=(0.0, 0.0, hb_z - 0.072),
        rot_euler=(0.0, 0.0, hyaw),
        color=shade_srgb(scarf_col, 0.94),
    )
    # Scarf knot & two hanging tails on chest (matching spr_helena.png!)
    mb.add_ellipsoid(
        radii=(0.036, 0.030, 0.028),
        pos=rotate_about_z(Vector((0.0, 0.104, hb_z - 0.030)), hyaw),
        color=shade_srgb(scarf_col, 1.06),
        u_segs=6,
        v_segs=4,
    )
    for side in (-1.0, 1.0):
        t0 = rotate_about_z(Vector((side * 0.015, 0.104, hb_z - 0.036)), hyaw)
        t1 = rotate_about_z(Vector((side * 0.056, 0.124, hb_z - 0.142)), hyaw)
        mb.add_limb(t0, t1, (0.025, 0.015), (0.017, 0.010), segs=6, color=shade_srgb(scarf_col, 1.04))

    return mb.finalize_object(mat, target_height=1.62)


def build_leni(pose: str, mat, with_bag: bool = False):
    """
    Leni (5, 1.05 m): blond-brown hair in two prominent braids with red ribbons,
    crimson-red dress with white Peter Pan collar & cuffs, white socks, brown shoes.
    with_bag=True adds brown leather school satchel with brass buckles & full-wrap straps.
    """
    tag = "leni_bag" if with_bag else "leni"
    mb = CharMeshBuilder(f"chr_{tag}_{pose}")
    p = get_pose_params(pose)
    yaw = p["torso_yaw"]

    build_legs_standard(
        mb,
        hip_z=0.41,
        hip_spread=0.068,
        thigh_len=0.17,
        shin_len=0.18,
        thigh_r=0.052,
        calf_r=0.042,
        trouser_col=PAL["skin_leni"],
        boot_col=PAL["leni_shoes"],
        pose_p=p,
        boot_scale=0.68,
        pelvis_col=PAL["leni_dress"],
        bare_legs_col=PAL["skin_leni"],
        sock_col=PAL["leni_socks"],
        is_mary_jane=True,
    )

    # Flared crimson-red A-line dress
    stride_extra = 0.038 if pose != "stand" else 0.0
    dress_prof = [
        (0.00, 0.188, 0.165 + stride_extra),
        (0.14, 0.164, 0.140 + stride_extra * 0.5),
        (0.28, 0.136, 0.108),
        (0.40, 0.142, 0.104),
        (0.47, 0.134, 0.095),
        (0.51, 0.078, 0.068),
    ]
    mb.add_lathe(
        dress_prof,
        segs=10,
        center=(0.0, 0.0, 0.25),
        rot_euler=(0.0, 0.0, yaw * 0.6),
        color=PAL["leni_dress"],
        grad_lo=0.86,
        grad_hi=1.08,
    )

    # Crisp white Peter Pan collar
    mb.add_lathe(
        [
            (0.00, 0.118, 0.102, 0.012),
            (0.024, 0.115, 0.098, 0.010),
            (0.036, 0.072, 0.066, 0.004),
        ],
        segs=10,
        center=(0.0, 0.0, 0.728),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["leni_collar"],
        grad_lo=0.95,
        grad_hi=1.02,
    )
    # Two pale buttons (lightweight low-poly beads)
    for bz in (0.680, 0.628):
        mb.add_box(
            size=(0.024, 0.018, 0.024),
            pos=rotate_about_z(Vector((0.0, 0.104, bz)), yaw),
            rot_euler=(0.0, 0.0, yaw),
            color=PAL["leni_collar"],
        )

    # Neck
    mb.add_limb(
        Vector((0.0, 0.0, 0.74)),
        Vector((0.0, 0.0, 0.80)),
        0.044,
        0.042,
        segs=7,
        color=shade_srgb(PAL["skin_leni"], 0.94),
    )

    # Arms with white cuffs & smooth tucked shoulders
    build_arms_standard(
        mb,
        shoulder_z=0.695,
        shoulder_x=0.138,
        upper_len=0.152,
        fore_len=0.132,
        upper_r=0.043,
        wrist_r=0.033,
        sleeve_col=PAL["leni_dress"],
        skin_col=PAL["skin_leni"],
        pose_p=p,
        hand_scale=0.66,
        cuff_col=PAL["leni_collar"],
    )

    # Big cute child head & warm happy expression
    head_c, hb_z, ht_z = build_head_and_face(
        mb,
        neck_top=Vector((0.0, 0.0, 0.79)),
        head_rx=0.140,
        head_ry=0.142,
        head_h=0.282,
        skin_col=PAL["skin_leni"],
        eye_col=PAL["eye_brown"],
        brow_col=shade_srgb(PAL["leni_hair"], 0.76),
        lip_col=PAL["lip_soft"],
        is_child=True,
        expression="happy",
        yaw=yaw * 0.4,
    )

    hyaw = yaw * 0.4
    hair_col = PAL["leni_hair"]
    hair_prof = [
        (0.00, 0.140, 0.142, -0.020),
        (0.08, 0.156, 0.156, -0.016),
        (0.15, 0.158, 0.160, -0.010),
        (0.21, 0.138, 0.142, -0.004),
        (0.248, 0.075, 0.078, 0.000),
    ]
    mb.add_lathe(
        hair_prof,
        segs=10,
        center=(0.0, 0.0, hb_z + 0.070),
        rot_euler=(0.0, 0.0, hyaw),
        color=hair_col,
        grad_lo=0.88,
        grad_hi=1.10,
    )
    # Front bangs
    for bx, bz, br in ((-0.068, -0.062, 0.050), (0.0, -0.058, 0.054), (0.068, -0.062, 0.050)):
        mb.add_ellipsoid(
            radii=(br * 1.15, br * 0.76, br * 0.84),
            pos=rotate_about_z(Vector((bx, 0.104, ht_z + bz)), hyaw),
            rot_euler=(0.15, 0.0, hyaw),
            color=shade_srgb(hair_col, 1.06),
            u_segs=6,
            v_segs=4,
        )

    # Two chunky side braids with bright red ribbons
    swing = p["stride_sign"] * 0.022
    for side in (-1.0, 1.0):
        b_pts = [
            rotate_about_z(Vector((side * 0.138, -0.015, hb_z + 0.118)), hyaw),
            rotate_about_z(Vector((side * 0.180, -0.020 + side * swing * 0.5, hb_z + 0.058)), hyaw),
            rotate_about_z(Vector((side * 0.212, -0.018 + side * swing, hb_z - 0.012)), hyaw),
            rotate_about_z(Vector((side * 0.222, -0.015 + side * swing * 1.2, hb_z - 0.068)), hyaw),
        ]
        for idx in range(3):
            mid = b_pts[idx].lerp(b_pts[idx + 1], 0.5)
            r = 0.043 - idx * 0.005
            mb.add_ellipsoid(
                radii=(r, r * 0.92, r * 1.14),
                pos=mid,
                rot_euler=(0.0, -side * 0.28, hyaw),
                color=shade_srgb(hair_col, 0.96 + 0.05 * (idx % 2)),
                u_segs=6,
                v_segs=3,
            )
        rib_pos = b_pts[2] + Vector((0.0, 0.010, -0.010))
        mb.add_box(
            size=(0.078, 0.036, 0.036),
            pos=rib_pos,
            rot_euler=(0.0, -side * 0.25, hyaw),
            color=PAL["leni_ribbon"],
            bevel=0.004,
            grad_lo=0.95,
            grad_hi=1.08,
        )

    # Brown leather school satchel (leni_bag) with clean continuous wrap-around shoulder straps!
    if with_bag:
        bag_pos = rotate_about_z(Vector((0.0, -0.160, 0.575)), yaw)
        mb.add_box(
            size=(0.315, 0.145, 0.265),
            pos=bag_pos,
            rot_euler=(0.08, 0.0, yaw),
            color=PAL["satchel_main"],
            bevel=0.012,
            grad_lo=0.86,
            grad_hi=1.06,
        )
        flap_pos = rotate_about_z(Vector((0.0, -0.175, 0.642)), yaw)
        mb.add_box(
            size=(0.324, 0.155, 0.138),
            pos=flap_pos,
            rot_euler=(0.08, 0.0, yaw),
            color=PAL["satchel_flap"],
            bevel=0.010,
            grad_lo=0.90,
            grad_hi=1.08,
        )
        for side in (-1.0, 1.0):
            # Back straps & brass buckles
            mb.add_box(
                size=(0.032, 0.016, 0.210),
                pos=rotate_about_z(Vector((side * 0.088, -0.246, 0.575)), yaw),
                rot_euler=(0.08, 0.0, yaw),
                color=PAL["satchel_strap"],
            )
            mb.add_box(
                size=(0.042, 0.018, 0.036),
                pos=rotate_about_z(Vector((side * 0.088, -0.254, 0.540)), yaw),
                rot_euler=(0.08, 0.0, yaw),
                color=PAL["brass"],
            )
            # Side pockets peeking out cleanly from front & top-down!
            mb.add_box(
                size=(0.056, 0.095, 0.135),
                pos=rotate_about_z(Vector((side * 0.168, -0.148, 0.545)), yaw),
                rot_euler=(0.08, 0.0, yaw),
                color=shade_srgb(PAL["satchel_main"], 0.92),
            )
            # Continuous shoulder straps wrapping smoothly over shoulder -> chest -> under armpit -> bag base!
            sx = side * 0.094
            s_pts = [
                rotate_about_z(Vector((sx, -0.115, 0.688)), yaw),
                rotate_about_z(Vector((sx, 0.008,  0.735)), yaw),
                rotate_about_z(Vector((sx * 0.96, 0.098, 0.678)), yaw),
                rotate_about_z(Vector((sx * 1.10, 0.098, 0.590)), yaw),
                rotate_about_z(Vector((sx * 1.38, 0.025, 0.525)), yaw),
                rotate_about_z(Vector((sx * 1.32, -0.105, 0.485)), yaw),
            ]
            mb.add_tube_path(s_pts, (0.018, 0.010), segs=5, color=PAL["satchel_strap"])

    return mb.finalize_object(mat, target_height=1.05)


def build_otto(pose: str, mat):
    """
    Otto Becker (55, 1.72 m): stocky build, grey flat cap, continuous grey hair fringe,
    bushy grey moustache, brown open jacket over flush tan shirt & curved grey apron,
    plain red armband with white disc on left arm, dark brown trousers & boots.
    """
    mb = CharMeshBuilder(f"chr_otto_{pose}")
    p = get_pose_params(pose)
    yaw = p["torso_yaw"]

    build_legs_standard(
        mb,
        hip_z=0.74,
        hip_spread=0.115,
        thigh_len=0.33,
        shin_len=0.33,
        thigh_r=0.098,
        calf_r=0.076,
        trouser_col=PAL["otto_trousers"],
        boot_col=PAL["otto_boots"],
        pose_p=p,
        boot_scale=1.05,
    )

    # Stocky brown jacket torso
    jacket_prof = [
        (0.00, 0.228, 0.154),
        (0.14, 0.234, 0.162),
        (0.32, 0.242, 0.160),
        (0.45, 0.244, 0.148),
        (0.52, 0.214, 0.132),
        (0.56, 0.128, 0.104),
    ]
    mb.add_lathe(
        jacket_prof,
        segs=10,
        center=(0.0, 0.0, 0.70),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["otto_jacket"],
        grad_lo=0.84,
        grad_hi=1.06,
    )

    # Curved dark grey workshop bib apron hugging Otto's belly smoothly (NOT a floating flat slab!)
    apron_prof = [
        (0.00, 0.236, 0.168),
        (0.16, 0.240, 0.172),
        (0.34, 0.248, 0.174),
        (0.52, 0.246, 0.164),
    ]
    mb.add_arc_shell(
        apron_prof,
        a_start=math.radians(48),
        a_end=math.radians(132),
        segs=6,
        thickness=0.020,
        center=(0.0, 0.0, 0.58),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["otto_apron"],
        grad_lo=0.88,
        grad_hi=1.06,
    )
    # Apron chest pocket + tiny steel wrench peeking out
    mb.add_box(
        size=(0.112, 0.024, 0.090),
        pos=rotate_about_z(Vector((0.0, 0.176, 0.900)), yaw),
        rot_euler=(0.0, 0.0, yaw),
        color=shade_srgb(PAL["otto_apron"], 0.86),
    )
    mb.add_box(
        size=(0.026, 0.014, 0.068),
        pos=rotate_about_z(Vector((-0.020, 0.178, 0.962)), yaw),
        rot_euler=(0.0, 0.14, yaw),
        color=PAL["steel"],
    )

    # Flush tan shirt collar inset above apron bib
    mb.add_lathe(
        [
            (0.00, 0.096, 0.052, 0.112),
            (0.09, 0.102, 0.068, 0.082),
            (0.15, 0.096, 0.088, 0.032),
        ],
        segs=8,
        center=(0.0, 0.0, 1.105),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["otto_shirt"],
        grad_lo=0.92,
        grad_hi=1.04,
    )
    # Sleek jacket lapels framing open front
    for side in (-1.0, 1.0):
        mb.add_box(
            size=(0.064, 0.036, 0.230),
            pos=rotate_about_z(Vector((side * 0.112, 0.144, 1.115)), yaw),
            rot_euler=(0.06, -side * 0.14, yaw + side * 0.20),
            color=shade_srgb(PAL["otto_jacket"], 1.08),
            bevel=0.005,
        )

    # Neck
    mb.add_limb(
        Vector((0.0, 0.0, 1.23)),
        Vector((0.0, 0.0, 1.31)),
        0.078,
        0.074,
        segs=8,
        color=shade_srgb(PAL["skin_otto"], 0.92),
    )

    # Stocky arms (smooth tucked shoulders + plain red armband with white disc on left arm)
    build_arms_standard(
        mb,
        shoulder_z=1.180,
        shoulder_x=0.244,
        upper_len=0.255,
        fore_len=0.225,
        upper_r=0.074,
        wrist_r=0.053,
        sleeve_col=PAL["otto_jacket"],
        skin_col=PAL["skin_otto"],
        pose_p=p,
        hand_scale=1.05,
        armband=True,
    )

    # Broad readable head + bushy grey moustache
    head_c, hb_z, ht_z = build_head_and_face(
        mb,
        neck_top=Vector((0.0, 0.0, 1.31)),
        head_rx=0.162,
        head_ry=0.160,
        head_h=0.355,
        skin_col=PAL["skin_otto"],
        eye_col=PAL["eye_dark"],
        brow_col=shade_srgb(PAL["otto_hair"], 0.65),
        lip_col=PAL["lip_warm"],
        expression="stern",
        moustache="bushy",
        moustache_col=PAL["otto_hair"],
        yaw=yaw * 0.4,
    )

    hyaw = yaw * 0.4
    # Smooth continuous grey hair fringe wrapping back & temples cleanly beneath cap!
    mb.add_arc_shell(
        [
            (0.00, 0.156, 0.156, -0.010),
            (0.06, 0.172, 0.170, -0.012),
            (0.12, 0.172, 0.170, -0.010),
        ],
        a_start=math.radians(156),
        a_end=math.radians(384),
        segs=8,
        thickness=0.030,
        center=(0.0, 0.0, hb_z + 0.130),
        rot_euler=(0.0, 0.0, hyaw),
        color=PAL["otto_hair"],
        grad_lo=0.90,
        grad_hi=1.06,
    )

    # Signature grey flat cap (wide soft crown + dark visor angled cleanly so eyes stay visible!)
    cap_z = ht_z - 0.095
    cap_prof = [
        (0.00, 0.168, 0.168, -0.004),
        (0.045, 0.205, 0.212, 0.012),
        (0.095, 0.192, 0.200, 0.014),
        (0.130, 0.125, 0.132, 0.010),
        (0.145, 0.042, 0.045, 0.008),
    ]
    mb.add_lathe(
        cap_prof,
        segs=12,
        center=(0.0, 0.0, cap_z),
        rot_euler=(-0.08, 0.0, hyaw),
        color=PAL["otto_cap"],
        grad_lo=0.88,
        grad_hi=1.10,
    )
    mb.add_box(
        size=(0.228, 0.115, 0.022),
        pos=rotate_about_z(Vector((0.0, 0.162, cap_z + 0.016)), hyaw),
        rot_euler=(0.10, 0.0, hyaw),
        color=PAL["otto_cap_brim"],
        bevel=0.006,
    )

    return mb.finalize_object(mat, target_height=1.72)


def build_police(pose: str, mat, variant: int = 1):
    """
    Policeman 1 (1.78 m, dark moustache) & Policeman 2 (1.76 m, clean-shaven, slightly slimmer).
    1933 Prussian police: dark navy-blue uniform tunic, silver epaulettes/buttons,
    black belt, charcoal riding breeches, tall black jackboots, tall black shako + brass badge.
    """
    tag = "police" if variant == 1 else "police2"
    mb = CharMeshBuilder(f"chr_{tag}_{pose}")
    p = get_pose_params(pose)
    yaw = p["torso_yaw"]

    slim = 1.0 if variant == 1 else 0.94
    skin_col = PAL["skin_police"] if variant == 1 else PAL["skin_police2"]
    hair_col = PAL["pol_hair"] if variant == 1 else PAL["pol2_hair"]

    build_legs_standard(
        mb,
        hip_z=0.77,
        hip_spread=0.104 * slim,
        thigh_len=0.35,
        shin_len=0.35,
        thigh_r=0.090 * slim,
        calf_r=0.068 * slim,
        trouser_col=PAL["pol_trousers"],
        boot_col=PAL["pol_boots"],
        pose_p=p,
        boot_scale=1.03,
        tall_boots=True,
    )

    # Tailored Prussian navy-blue tunic
    tunic_prof = [
        (0.00, 0.200 * slim, 0.142),
        (0.14, 0.184 * slim, 0.128),
        (0.24, 0.194 * slim, 0.132),
        (0.41, 0.222 * slim, 0.138),
        (0.50, 0.214 * slim, 0.128),
        (0.55, 0.106, 0.096),
        (0.61, 0.090, 0.086),
    ]
    mb.add_lathe(
        tunic_prof,
        segs=10,
        center=(0.0, 0.0, 0.69),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["pol_tunic"],
        grad_lo=0.86,
        grad_hi=1.10,
    )

    # Black leather belt + silver buckle
    mb.add_lathe(
        [(0.0, 0.192 * slim, 0.136), (0.056, 0.192 * slim, 0.136)],
        segs=10,
        center=(0.0, 0.0, 0.840),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["pol_belt"],
    )
    mb.add_box(
        size=(0.062, 0.022, 0.052),
        pos=rotate_about_z(Vector((0.0, 0.135, 0.868)), yaw),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["pol_silver"],
    )

    # Silver shoulder epaulettes sitting cleanly ON TOP of smooth shoulders!
    for side in (-1.0, 1.0):
        mb.add_box(
            size=(0.118 * slim, 0.056, 0.020),
            pos=rotate_about_z(Vector((side * 0.168 * slim, 0.0, 1.225)), yaw),
            rot_euler=(0.0, side * 0.16, yaw),
            color=PAL["pol_collar"],
            grad_lo=0.95,
            grad_hi=1.08,
        )
        # Collar patches
        mb.add_box(
            size=(0.044, 0.024, 0.034),
            pos=rotate_about_z(Vector((side * 0.044, 0.086, 1.272)), yaw),
            rot_euler=(0.0, 0.0, yaw - side * 0.35),
            color=PAL["pol_collar"],
        )
        # Chest pockets
        mb.add_box(
            size=(0.072 * slim, 0.018, 0.070),
            pos=rotate_about_z(Vector((side * 0.096 * slim, 0.133, 1.095)), yaw),
            rot_euler=(0.0, 0.0, yaw - side * 0.16),
            color=shade_srgb(PAL["pol_tunic"], 1.14),
        )

    # Crisp flush silver buttons (tucked nicely against chest, low-poly boxes save ~250 tris!)
    for bz in (1.17, 1.10, 1.03, 0.96, 0.78):
        mb.add_box(
            size=(0.024, 0.016, 0.024),
            pos=rotate_about_z(Vector((0.0, 0.136, bz)), yaw),
            rot_euler=(0.0, 0.0, yaw),
            color=PAL["pol_silver"],
        )

    # Neck
    mb.add_limb(
        Vector((0.0, 0.0, 1.27)),
        Vector((0.0, 0.0, 1.35)),
        0.068,
        0.064,
        segs=8,
        color=shade_srgb(skin_col, 0.92),
    )

    # Arms (tucked cleanly under epaulettes!)
    build_arms_standard(
        mb,
        shoulder_z=1.168,
        shoulder_x=0.214 * slim,
        upper_len=0.26,
        fore_len=0.23,
        upper_r=0.064 * slim,
        wrist_r=0.047 * slim,
        sleeve_col=PAL["pol_tunic"],
        skin_col=skin_col,
        pose_p=p,
        hand_scale=1.0,
    )

    # Bigger readable head (moustache ONLY for variant 1!)
    head_c, hb_z, ht_z = build_head_and_face(
        mb,
        neck_top=Vector((0.0, 0.0, 1.35)),
        head_rx=0.148 * (1.0 if variant == 1 else 0.96),
        head_ry=0.152,
        head_h=0.345,
        skin_col=skin_col,
        eye_col=PAL["eye_dark"],
        brow_col=hair_col,
        lip_col=PAL["lip_warm"],
        expression="stern",
        moustache="police" if variant == 1 else None,
        moustache_col=PAL["pol_moustache"],
        yaw=yaw * 0.4,
    )

    hyaw = yaw * 0.4
    # Flush cropped back hair wrapping smoothly under shako (no floating nape ball!)
    mb.add_arc_shell(
        [
            (0.00, 0.142, 0.146, -0.008),
            (0.08, 0.156, 0.158, -0.010),
            (0.14, 0.156, 0.158, -0.008),
        ],
        a_start=math.radians(170),
        a_end=math.radians(370),
        segs=7,
        thickness=0.026,
        center=(0.0, 0.0, hb_z + 0.095),
        rot_euler=(0.0, 0.0, hyaw),
        color=hair_col,
    )

    # Tall black Prussian police shako with bright brass badge & visors
    shako_z = ht_z - 0.092
    shako_prof = [
        (0.00, 0.156, 0.164, 0.0),
        (0.03, 0.158, 0.166, 0.0),
        (0.16, 0.138, 0.152, -0.004),
        (0.21, 0.130, 0.144, -0.006),
        (0.22, 0.102, 0.116, -0.006),
    ]
    mb.add_lathe(
        shako_prof,
        segs=12,
        center=(0.0, 0.0, shako_z),
        rot_euler=(-0.05, 0.0, hyaw),
        color=PAL["pol_shako"],
        grad_lo=0.88,
        grad_hi=1.18,
    )
    # Front visor (angled gently so eyes remain readable from 55°!)
    mb.add_box(
        size=(0.232, 0.105, 0.020),
        pos=rotate_about_z(Vector((0.0, 0.160, shako_z + 0.014)), hyaw),
        rot_euler=(0.14, 0.0, hyaw),
        color=PAL["pol_shako_trim"],
        bevel=0.004,
    )
    # Rear neck visor
    mb.add_box(
        size=(0.210, 0.088, 0.018),
        pos=rotate_about_z(Vector((0.0, -0.154, shako_z + 0.008)), hyaw),
        rot_euler=(-0.20, 0.0, hyaw),
        color=PAL["pol_shako_trim"],
        bevel=0.004,
    )
    # Prominent brass front emblem plate
    mb.add_ellipsoid(
        radii=(0.060, 0.022, 0.060),
        pos=rotate_about_z(Vector((0.0, 0.158, shako_z + 0.110)), hyaw),
        rot_euler=(0.0, 0.0, hyaw),
        color=PAL["brass"],
        u_segs=8,
        v_segs=4,
        grad_lo=0.92,
        grad_hi=1.10,
    )
    # Top silver cockade crest
    mb.add_ellipsoid(
        radii=(0.024, 0.024, 0.038),
        pos=rotate_about_z(Vector((0.0, 0.112, shako_z + 0.225)), hyaw),
        color=PAL["pol_silver"],
        u_segs=6,
        v_segs=3,
    )

    return mb.finalize_object(mat, target_height=1.78 if variant == 1 else 1.76)


def build_uncle(pose: str, mat):
    """
    Uncle (~50s, 1.73 m): warm camel-russet long wool overcoat with sleek lapels & double-breasted buttons,
    warm cream-ochre wool scarf, classic dark wide-brim fedora hat, dark trousers & boots.
    """
    mb = CharMeshBuilder(f"chr_uncle_{pose}")
    p = get_pose_params(pose)
    yaw = p["torso_yaw"]

    build_legs_standard(
        mb,
        hip_z=0.76,
        hip_spread=0.105,
        thigh_len=0.34,
        shin_len=0.34,
        thigh_r=0.088,
        calf_r=0.068,
        trouser_col=PAL["uncle_trousers"],
        boot_col=PAL["uncle_boots"],
        pose_p=p,
        boot_scale=1.02,
    )

    # Long warm camel-brown overcoat
    stride_extra = 0.042 if pose != "stand" else 0.0
    coat_prof = [
        (0.00, 0.242, 0.175 + stride_extra),
        (0.22, 0.228, 0.158 + stride_extra * 0.5),
        (0.45, 0.214, 0.145),
        (0.65, 0.232, 0.148),
        (0.74, 0.220, 0.134),
        (0.79, 0.120, 0.100),
    ]
    mb.add_lathe(
        coat_prof,
        segs=10,
        center=(0.0, 0.0, 0.46),
        rot_euler=(0.0, 0.0, yaw * 0.7),
        color=PAL["uncle_coat"],
        grad_lo=0.84,
        grad_hi=1.08,
    )

    # Sleek notched lapels hugging chest cleanly + crisp double-breasted buttons
    for side in (-1.0, 1.0):
        mb.add_box(
            size=(0.068, 0.024, 0.225),
            pos=rotate_about_z(Vector((side * 0.086, 0.138, 1.105)), yaw),
            rot_euler=(0.06, -side * 0.20, yaw + side * 0.22),
            color=PAL["uncle_lapel"],
            bevel=0.004,
        )
        for bz in (0.96, 0.85, 0.74):
            mb.add_box(
                size=(0.024, 0.016, 0.024),
                pos=rotate_about_z(Vector((side * 0.048, 0.148, bz)), yaw),
                rot_euler=(0.0, 0.0, yaw),
                color=PAL["button_dark"],
            )

    # Snug cream-ochre scarf tucked cleanly inside coat lapels
    mb.add_lathe(
        [
            (0.00, 0.112, 0.106, 0.010),
            (0.052, 0.102, 0.098, 0.008),
            (0.084, 0.088, 0.086, 0.004),
        ],
        segs=10,
        center=(0.0, 0.0, 1.215),
        rot_euler=(0.0, 0.0, yaw),
        color=PAL["uncle_scarf"],
        grad_lo=0.92,
        grad_hi=1.06,
    )
    mb.add_box(
        size=(0.072, 0.020, 0.155),
        pos=rotate_about_z(Vector((0.0, 0.138, 1.155)), yaw),
        rot_euler=(0.08, 0.0, yaw),
        color=shade_srgb(PAL["uncle_scarf"], 1.02),
    )

    # Neck
    mb.add_limb(
        Vector((0.0, 0.0, 1.27)),
        Vector((0.0, 0.0, 1.34)),
        0.066,
        0.062,
        segs=8,
        color=shade_srgb(PAL["skin_uncle"], 0.92),
    )

    # Coat arms (smooth tucked shoulders)
    build_arms_standard(
        mb,
        shoulder_z=1.182,
        shoulder_x=0.220,
        upper_len=0.26,
        fore_len=0.23,
        upper_r=0.068,
        wrist_r=0.050,
        sleeve_col=PAL["uncle_coat"],
        skin_col=PAL["skin_uncle"],
        pose_p=p,
        hand_scale=1.0,
    )

    # Bigger readable head (kindly older relative)
    head_c, hb_z, ht_z = build_head_and_face(
        mb,
        neck_top=Vector((0.0, 0.0, 1.34)),
        head_rx=0.150,
        head_ry=0.154,
        head_h=0.350,
        skin_col=PAL["skin_uncle"],
        eye_col=PAL["eye_brown"],
        brow_col=PAL["uncle_hair"],
        lip_col=PAL["lip_warm"],
        expression="gentle",
        yaw=yaw * 0.4,
    )

    hyaw = yaw * 0.4
    # Smooth greying back hair shell fitting flush under fedora (no nape bump!)
    mb.add_arc_shell(
        [
            (0.00, 0.144, 0.148, -0.008),
            (0.08, 0.158, 0.160, -0.010),
            (0.14, 0.158, 0.160, -0.008),
        ],
        a_start=math.radians(164),
        a_end=math.radians(376),
        segs=7,
        thickness=0.026,
        center=(0.0, 0.0, hb_z + 0.105),
        rot_euler=(0.0, 0.0, hyaw),
        color=PAL["uncle_hair"],
    )

    # Classic 1930s wide-brim felt fedora hat (slightly upturned front tilt so face stays lit & visible!)
    hat_z = ht_z - 0.095
    brim_prof = [
        (0.000, 0.255, 0.275, 0.006),
        (0.016, 0.258, 0.278, 0.006),
        (0.026, 0.164, 0.178, 0.002),
    ]
    mb.add_lathe(
        brim_prof,
        segs=12,
        center=(0.0, 0.0, hat_z),
        rot_euler=(-0.10, 0.0, hyaw),
        color=PAL["uncle_hat"],
        grad_lo=0.88,
        grad_hi=1.08,
    )
    mb.add_lathe(
        [(0.0, 0.158, 0.172, 0.0), (0.036, 0.154, 0.168, 0.0)],
        segs=12,
        center=(0.0, 0.0, hat_z + 0.020),
        rot_euler=(-0.10, 0.0, hyaw),
        color=PAL["uncle_hatband"],
    )
    crown_prof = [
        (0.00, 0.154, 0.166, 0.0),
        (0.06, 0.142, 0.156, 0.0),
        (0.115, 0.118, 0.136, -0.004),
        (0.138, 0.080, 0.108, -0.004),
    ]
    mb.add_lathe(
        crown_prof,
        segs=12,
        center=(0.0, 0.0, hat_z + 0.052),
        rot_euler=(-0.10, 0.0, hyaw),
        color=shade_srgb(PAL["uncle_hat"], 1.06),
        grad_lo=0.90,
        grad_hi=1.10,
    )

    return mb.finalize_object(mat, target_height=1.73)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------
CHARACTERS = [
    ("paul",     lambda pose, mat: build_paul(pose, mat)),
    ("helena",   lambda pose, mat: build_helena(pose, mat)),
    ("leni",     lambda pose, mat: build_leni(pose, mat, with_bag=False)),
    ("leni_bag", lambda pose, mat: build_leni(pose, mat, with_bag=True)),
    ("otto",     lambda pose, mat: build_otto(pose, mat)),
    ("police",   lambda pose, mat: build_police(pose, mat, variant=1)),
    ("police2",  lambda pose, mat: build_police(pose, mat, variant=2)),
    ("uncle",    lambda pose, mat: build_uncle(pose, mat)),
]

POSES = [
    ("stand", ""),
    ("w1",    "_w1"),
    ("w2",    "_w2"),
]


# ---------------------------------------------------------------------------
# Export & Preview Studio Rendering
# ---------------------------------------------------------------------------
def count_triangles(mesh) -> int:
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def export_character_glb(obj, filepath: str):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_vertex_color="MATERIAL",
        export_animations=False,
    )


def setup_render_studio():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    if hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 16

    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0

    world = bpy.data.worlds.new("StudioWorld")
    scene.world = world
    if not world.node_tree:
        world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (*srgb_to_linear_rgba(hex_col("#6a665f"))[:3], 1.0)
        bg.inputs[1].default_value = 0.78

    # Key light (warm sun slightly lower elevation so faces under hat brims stay nicely lit)
    key_data = bpy.data.lights.new("KeySun", type="SUN")
    key_data.energy = 2.4
    key_data.color = (1.0, 0.96, 0.90)
    key_obj = bpy.data.objects.new("KeySun", key_data)
    key_obj.rotation_euler = Euler((math.radians(40), math.radians(18), math.radians(-148)), "XYZ")
    bpy.context.collection.objects.link(key_obj)

    # Fill light (soft front-right area)
    fill_data = bpy.data.lights.new("FillArea", type="AREA")
    fill_data.energy = 125.0
    fill_data.size = 3.8
    fill_data.color = (0.90, 0.94, 1.0)
    fill_obj = bpy.data.objects.new("FillArea", fill_data)
    fill_obj.location = (2.6, 2.8, 1.8)
    fill_obj.rotation_euler = (Vector((0, 0, 0.9)) - fill_obj.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.collection.objects.link(fill_obj)

    # Rim light
    rim_data = bpy.data.lights.new("RimArea", type="AREA")
    rim_data.energy = 95.0
    rim_data.size = 3.0
    rim_data.color = (1.0, 0.97, 0.92)
    rim_obj = bpy.data.objects.new("RimArea", rim_data)
    rim_obj.location = (-1.8, -2.6, 2.6)
    rim_obj.rotation_euler = (Vector((0, 0, 1.0)) - rim_obj.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.collection.objects.link(rim_obj)

    # Matte studio ground disc at Z=0
    bm = bmesh.new()
    segs = 32
    ring = [
        bm.verts.new((7.0 * math.cos(2.0 * math.pi * i / segs), 7.0 * math.sin(2.0 * math.pi * i / segs), -0.001))
        for i in range(segs)
    ]
    bm.faces.new(ring)
    floor_mesh = bpy.data.meshes.new("StudioFloor")
    bm.to_mesh(floor_mesh)
    bm.free()

    floor_mat = bpy.data.materials.new("FloorMat")
    if not floor_mat.node_tree:
        floor_mat.use_nodes = True
    bsdf = floor_mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = srgb_to_linear_rgba(hex_col("#847e74"))
        bsdf.inputs["Roughness"].default_value = 0.95
    floor_mesh.materials.append(floor_mat)

    floor_obj = bpy.data.objects.new("StudioFloor", floor_mesh)
    bpy.context.collection.objects.link(floor_obj)

    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 50.0
    cam_obj = bpy.data.objects.new("PreviewCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    return cam_obj, floor_obj


def aim_camera(cam_obj, pos: Vector, target: Vector, lens: float = 50.0):
    cam_obj.data.lens = lens
    cam_obj.location = pos
    cam_obj.rotation_euler = (target - pos).to_track_quat("-Z", "Y").to_euler()


def render_character_views(char_id: str, obj, cam_obj):
    zs = [v.co.z for v in obj.data.vertices]
    h = max(zs) - min(zs)
    cz = h * 0.50
    target = Vector((0.0, 0.0, cz))
    dist = h * 1.92

    # 1. Front view
    aim_camera(cam_obj, Vector((0.0, dist, cz + h * 0.05)), target, lens=50.0)
    bpy.context.scene.render.filepath = os.path.join(RENDERS_DIR, f"{char_id}_front.png")
    bpy.ops.render.render(write_still=True)

    # 2. Side view (facing right in image)
    aim_camera(cam_obj, Vector((dist, 0.0, cz + h * 0.04)), target, lens=50.0)
    bpy.context.scene.render.filepath = os.path.join(RENDERS_DIR, f"{char_id}_side.png")
    bpy.ops.render.render(write_still=True)

    # 3. Top-down 3/4 game camera (55-degree pitch)
    pitch = math.radians(55.0)
    azim = math.radians(34.0)
    g_dist = h * 2.10
    horiz = g_dist * math.cos(pitch)
    cam_pos = Vector((
        horiz * math.sin(azim),
        horiz * math.cos(azim),
        cz + g_dist * math.sin(pitch),
    ))
    aim_camera(cam_obj, cam_pos, Vector((0.0, 0.0, cz * 0.94)), lens=46.0)
    bpy.context.scene.render.filepath = os.path.join(RENDERS_DIR, f"{char_id}_game.png")
    bpy.ops.render.render(write_still=True)


def render_lineups(standing_objs: dict, walk_objs: dict, cam_obj):
    """Render all 8 characters side-by-side at true 1:1 relative scale (standing + walking)."""
    scene = bpy.context.scene
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 440

    spacing = 0.72
    ids = [c[0] for c in CHARACTERS]
    # Place from +X to -X so left-to-right in front camera matches CHARACTERS order (Paul -> Uncle)!
    start_x = 0.5 * (len(ids) - 1) * spacing

    for idx, cid in enumerate(ids):
        o = standing_objs[cid]
        o.hide_render = False
        o.location = (start_x - idx * spacing, 0.0, 0.0)
        walk_objs[cid].hide_render = True

    # Standing lineup front (all 8 cleanly framed!)
    aim_camera(cam_obj, Vector((0.0, 7.2, 1.00)), Vector((0.0, 0.0, 0.88)), lens=42.0)
    scene.render.filepath = os.path.join(RENDERS_DIR, "lineup_front.png")
    bpy.ops.render.render(write_still=True)

    # Standing lineup game camera (55-deg pitch)
    pitch = math.radians(55.0)
    dist = 7.4
    aim_camera(
        cam_obj,
        Vector((0.0, dist * math.cos(pitch), 0.88 + dist * math.sin(pitch))),
        Vector((0.0, 0.0, 0.80)),
        lens=42.0,
    )
    scene.render.filepath = os.path.join(RENDERS_DIR, "lineup_game.png")
    bpy.ops.render.render(write_still=True)

    # Walk pose lineup (alternating w1 / w2 from 3/4 game camera to verify stride & grounding!)
    for idx, cid in enumerate(ids):
        standing_objs[cid].hide_render = True
        w = walk_objs[cid]
        w.hide_render = False
        w.location = (start_x - idx * spacing, 0.0, 0.0)

    aim_camera(
        cam_obj,
        Vector((2.0, dist * math.cos(pitch) * 1.10, 0.88 + dist * math.sin(pitch) * 1.10)),
        Vector((0.0, 0.0, 0.80)),
        lens=40.0,
    )
    scene.render.filepath = os.path.join(RENDERS_DIR, "lineup_walk.png")
    bpy.ops.render.render(write_still=True)

    scene.render.resolution_x = 512
    scene.render.resolution_y = 512


# ---------------------------------------------------------------------------
# Main execution
# ---------------------------------------------------------------------------
def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mat = create_vertex_color_material()
    cam_obj, floor_obj = setup_render_studio()

    stats = []
    standing_objs = {}
    walk_objs = {}

    for idx, (char_id, builder_fn) in enumerate(CHARACTERS):
        keep_walk = "w1" if idx % 2 == 0 else "w2"
        for pose_name, suffix in POSES:
            obj = builder_fn(pose_name, mat)
            tris = count_triangles(obj.data)
            zs = [v.co.z for v in obj.data.vertices]
            h = max(zs) - min(zs)
            min_z = min(zs)

            glb_name = f"chr_{char_id}{suffix}.glb"
            glb_path = os.path.join(MODELS_DIR, glb_name)
            export_character_glb(obj, glb_path)

            stats.append({
                "id": char_id,
                "pose": pose_name,
                "file": glb_name,
                "tris": tris,
                "height_m": round(h, 3),
                "min_z": round(min_z, 4),
                "bytes": os.path.getsize(glb_path),
            })

            if pose_name == "stand":
                render_character_views(char_id, obj, cam_obj)
                obj.hide_render = True
                standing_objs[char_id] = obj
            elif pose_name == keep_walk:
                obj.hide_render = True
                walk_objs[char_id] = obj
            else:
                mesh_data = obj.data
                bpy.data.objects.remove(obj, do_unlink=True)
                bpy.data.meshes.remove(mesh_data)

    render_lineups(standing_objs, walk_objs, cam_obj)

    print("\n=== T1 CHARACTER GENERATION SUMMARY ===")
    for s in stats:
        glb_path = os.path.join(MODELS_DIR, s["file"])
        with open(glb_path, "rb") as f:
            magic, ver, _ = struct.unpack("<III", f.read(12))
            jlen, _ = struct.unpack("<II", f.read(8))
            j = json.loads(f.read(jlen))
        assert magic == 0x46546C67, f"Invalid GLB magic: {s['file']}"
        assert len(j["meshes"]) == 1, f"Expected 1 mesh in {s['file']}"
        prim = j["meshes"][0]["primitives"][0]
        attrs = prim["attributes"]
        assert "COLOR_0" in attrs, f"Missing COLOR_0 in {s['file']}"
        pos_acc = j["accessors"][attrs["POSITION"]]
        idx_acc = j["accessors"][prim["indices"]]
        glb_tris = idx_acc["count"] // 3
        ymin, ymax = pos_acc["min"][1], pos_acc["max"][1]
        zmin, zmax = pos_acc["min"][2], pos_acc["max"][2]
        assert abs(ymin) < 1e-4, f"Not grounded at Y=0: {s['file']} ({ymin})"
        print(
            f"  {s['file']:24s} | tris={glb_tris:4d} | Y=[{ymin:+.4f},{ymax:.3f}]m | "
            f"Z=[{zmin:+.3f},{zmax:+.3f}] | COLOR_0=OK | {s['bytes']//1024:3d} KB"
        )
    print(f"Total GLBs exported & verified: {len(stats)}")


if __name__ == "__main__":
    main()
