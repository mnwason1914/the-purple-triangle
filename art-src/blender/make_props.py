"""
Procedural low-poly 3D furniture & household props generator for THE PURPLE TRIANGLE (Task T4).

Run headless:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python art-src/blender/make_props.py

Outputs:
    godot/assets/models/prop_<name>.glb         (32 models, 300-1500 tris each)
    art-src/blender/renders/props_lineup_1.png  (Paul + Workshop & Yard props, front/3-4)
    art-src/blender/renders/props_lineup_2.png  (Paul + Kitchen & Cellar props, front/3-4)
    art-src/blender/renders/props_lineup_3.png  (Paul + Extra Dressing props, front/3-4)
    art-src/blender/renders/props_all_game.png  (All 32 props + Paul, 55-deg top-down 3/4)
    art-src/blender/renders/props_scale_game.png (Scale check vignette next to Paul, 55-deg)

Coordinate convention (matching T1 characters):
    In Blender: +X right, +Y forward, +Z up, origin at floor centre (min Z = 0).
    Exported GLB (export_yup=True): +X right, +Y up, -Z forward, origin at floor centre (min Y = 0).
    Scale: 1 Blender unit = 1 real metre (Paul = 1.75 m).
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
# Muted 1930s Silesian Palette (harmonized with T1 characters & Codex rooms)
# ---------------------------------------------------------------------------
PAL = {
    # Woods
    "pine_light":    hex_col("#a68660"),
    "pine_mid":      hex_col("#8d6d49"),
    "pine_dark":     hex_col("#6e5135"),
    "oak_warm":      hex_col("#7b5b3c"),
    "oak_dark":      hex_col("#5a402a"),
    "oak_deep":      hex_col("#463120"),
    "cellar_wood":   hex_col("#66523e"),
    "cellar_dark":   hex_col("#4d3d2d"),
    "birch_bark":    hex_col("#645749"),
    "split_wood":    hex_col("#c2a87e"),
    "wicker":        hex_col("#9c7b4f"),
    "wicker_dark":   hex_col("#7c5f3a"),

    # Metals
    "iron_dark":     hex_col("#2d3035"),
    "iron_mid":      hex_col("#41454c"),
    "iron_light":    hex_col("#5f656e"),
    "steel":         hex_col("#8d949b"),
    "galv_zinc":     hex_col("#767d82"),
    "drum_olive":    hex_col("#4b5645"),
    "drum_rust":     hex_col("#7a4a33"),
    "pump_green":    hex_col("#3a5244"),
    "brass":         hex_col("#c09948"),
    "copper":        hex_col("#a86a42"),
    "chrome":        hex_col("#b5bcc2"),
    "rubber":        hex_col("#272729"),
    "bike_frame":    hex_col("#2f3840"),

    # Enamel / ceramics / stone
    "enamel_cream":  hex_col("#dfd7c5"),
    "enamel_white":  hex_col("#e6e0d2"),
    "enamel_trim":   hex_col("#334a66"),
    "stoneware":     hex_col("#c5bba7"),
    "terracotta":    hex_col("#a35c3e"),
    "stone_slab":    hex_col("#7c7972"),
    "water_pale":    hex_col("#7b9aa6"),
    "glass_green":   hex_col("#4b6950"),
    "glass_amber":   hex_col("#9e6e36"),
    "jam_red":       hex_col("#8a3933"),
    "ember_glow":    hex_col("#d96a2b"),

    # Fabrics / organic / miscellaneous
    "burlap":        hex_col("#9b8767"),
    "burlap_dark":   hex_col("#7d6b4f"),
    "linen_cream":   hex_col("#d4cab4"),
    "linen_stripe":  hex_col("#7a483c"),
    "curtain_check": hex_col("#a84d3f"),
    "rug_base":      hex_col("#8b7459"),
    "rug_rust":      hex_col("#824438"),
    "rug_sage":      hex_col("#5a6b52"),
    "rug_ochre":     hex_col("#ab894c"),
    "coat_wool":     hex_col("#46423c"),
    "coat_brown":    hex_col("#684b36"),
    "coat_navy":     hex_col("#323e4f"),
    "leather":       hex_col("#694126"),
    "dirt_dry":      hex_col("#523f2e"),
    "dirt_damp":     hex_col("#36281c"),
    "potato_light":  hex_col("#a78452"),
    "potato_dark":   hex_col("#85653b"),
    "coal":          hex_col("#222428"),
    "oilcloth":      hex_col("#49534e"),
    "leaf_dark":     hex_col("#476140"),
    "leaf_light":    hex_col("#628052"),
    "flower_coral":  hex_col("#bd5546"),
    "paper":         hex_col("#e8e0cc"),
    "pencil_red":    hex_col("#b53d34"),
    "pencil_blue":   hex_col("#3b5d85"),
    "pencil_yellow": hex_col("#cfa03c"),
}


# ---------------------------------------------------------------------------
# Procedural Low-Poly BMesh Builder (matches T1 style)
# ---------------------------------------------------------------------------
class PropMeshBuilder:
    """Builds a single flat-shaded mesh with per-face COLOR_0 vertex colors."""

    def __init__(self, name: str):
        self.name = name
        self.bm = bmesh.new()
        self.face_colors = {}

    def _color_faces(self, faces, srgb: tuple, grad_axis=None, grad_range=None, grad_lo=0.90, grad_hi=1.06):
        for f in faces:
            col = srgb
            if grad_axis is not None and grad_range is not None:
                c = f.calc_center_median()
                val = c[grad_axis]
                lo, hi = grad_range
                t = 0.5 if hi <= lo else max(0.0, min(1.0, (val - lo) / (hi - lo)))
                col = shade_srgb(srgb, grad_lo + (grad_hi - grad_lo) * t)
            self.face_colors[f] = srgb_to_linear_rgba(col)

    def add_box(
        self,
        size=(0.1, 0.1, 0.1),
        pos=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        color=(0.7, 0.7, 0.7),
        bevel=0.0,
        grad_lo=0.90,
        grad_hi=1.06,
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

    def add_lathe(
        self,
        profile,
        segs: int = 10,
        center=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        color=(0.7, 0.7, 0.7),
        cap_bottom=True,
        cap_top=True,
        grad_lo=0.88,
        grad_hi=1.06,
        phase=0.0,
        ring_colors=None,
    ):
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
                self._color_faces([f], shade_srgb(c_bot, grad_lo * 0.94))
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

    def add_cylinder(
        self,
        r_bot: float,
        r_top: float,
        height: float,
        segs: int = 10,
        pos=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        color=(0.7, 0.7, 0.7),
        cap_bottom=True,
        cap_top=True,
        grad_lo=0.90,
        grad_hi=1.06,
    ):
        return self.add_lathe(
            [(0.0, r_bot, r_bot), (height, r_top, r_top)],
            segs=segs,
            center=pos,
            rot_euler=rot_euler,
            color=color,
            cap_bottom=cap_bottom,
            cap_top=cap_top,
            grad_lo=grad_lo,
            grad_hi=grad_hi,
        )

    def add_ellipsoid(
        self,
        radii=(0.1, 0.1, 0.1),
        pos=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        color=(0.7, 0.7, 0.7),
        u_segs=8,
        v_segs=4,
        grad_lo=0.88,
        grad_hi=1.06,
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

    def add_rod(
        self,
        p0,
        p1,
        r0: float,
        r1: float = None,
        segs: int = 6,
        color=(0.7, 0.7, 0.7),
        cap=True,
        grad_lo=0.90,
        grad_hi=1.06,
    ):
        p0 = Vector(p0)
        p1 = Vector(p1)
        if r1 is None:
            r1 = r0
        vec = p1 - p0
        length = vec.length
        if length < 1e-5:
            return []
        z_dir = vec.normalized()
        ref = Vector((0.0, 1.0, 0.0)) if abs(z_dir.y) < 0.9 else Vector((1.0, 0.0, 0.0))
        x_dir = ref.cross(z_dir).normalized()
        y_dir = z_dir.cross(x_dir).normalized()

        ring0, ring1 = [], []
        for i in range(segs):
            a = (2.0 * math.pi * i) / segs
            ca, sa = math.cos(a), math.sin(a)
            ring0.append(self.bm.verts.new(p0 + x_dir * (r0 * ca) + y_dir * (r0 * sa)))
            ring1.append(self.bm.verts.new(p1 + x_dir * (r1 * ca) + y_dir * (r1 * sa)))

        created = []
        for i in range(segs):
            j = (i + 1) % segs
            try:
                created.append(self.bm.faces.new((ring0[i], ring0[j], ring1[j], ring1[i])))
            except ValueError:
                pass
        if cap:
            try:
                created.append(self.bm.faces.new(list(reversed(ring0))))
            except ValueError:
                pass
            try:
                created.append(self.bm.faces.new(ring1))
            except ValueError:
                pass
        zs = [v.co.z for v in ring0 + ring1]
        self._color_faces(created, color, grad_axis=2, grad_range=(min(zs), max(zs)), grad_lo=grad_lo, grad_hi=grad_hi)
        return created

    def add_torus(
        self,
        major_r: float,
        minor_r: float,
        major_segs: int = 16,
        minor_segs: int = 6,
        pos=(0.0, 0.0, 0.0),
        rot_euler=(0.0, 0.0, 0.0),
        color=(0.7, 0.7, 0.7),
        grad_lo=0.88,
        grad_hi=1.08,
    ):
        trans_m = Matrix.Translation(pos) @ Euler(rot_euler, "XYZ").to_matrix().to_4x4()
        rings = []
        for i in range(major_segs):
            u = (2.0 * math.pi * i) / major_segs
            cu, su = math.cos(u), math.sin(u)
            ring = []
            for k in range(minor_segs):
                v = (2.0 * math.pi * k) / minor_segs
                cv, sv = math.cos(v), math.sin(v)
                r = major_r + minor_r * cv
                pt = trans_m @ Vector((r * cu, r * su, minor_r * sv))
                ring.append(self.bm.verts.new(pt))
            rings.append(ring)

        created = []
        for i in range(major_segs):
            ni = (i + 1) % major_segs
            for k in range(minor_segs):
                nk = (k + 1) % minor_segs
                try:
                    created.append(self.bm.faces.new((rings[i][k], rings[ni][k], rings[ni][nk], rings[i][nk])))
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
        grad_hi=1.06,
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
            rad = radii[idx] if (isinstance(radii, list) and len(radii) == n) else radii
            rx, ry = rad if isinstance(rad, (list, tuple)) else (rad, rad)
            ring = []
            for i in range(segs):
                a = (2.0 * math.pi * i) / segs
                ring.append(self.bm.verts.new(p + u * (rx * math.cos(a)) + v * (ry * math.sin(a))))
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

    def finalize_object(self, material, ground_z: bool = True, center_xy: bool = False):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        if self.bm.verts:
            if ground_z:
                zmin = min(v.co.z for v in self.bm.verts)
                for v in self.bm.verts:
                    v.co.z -= zmin
            if center_xy:
                xs = [v.co.x for v in self.bm.verts]
                ys = [v.co.y for v in self.bm.verts]
                cx = 0.5 * (min(xs) + max(xs))
                cy = 0.5 * (min(ys) + max(ys))
                for v in self.bm.verts:
                    v.co.x -= cx
                    v.co.y -= cy

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


def create_vertex_color_material(name="Mat_PropVertexColor"):
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
        bsdf.inputs["Specular IOR Level"].default_value = 0.22
    bsdf.inputs["Metallic"].default_value = 0.0

    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.location = (-280, 0)
    vc.layer_name = "COLOR_0"

    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])
    return mat


# ---------------------------------------------------------------------------
# Helpers for shared small sub-assemblies
# ---------------------------------------------------------------------------
def add_bike_wheel(mb: PropMeshBuilder, center, radius=0.33, rot_euler=(0.0, 0.0, 0.0), spoke_count=8, major_segs=14):
    """Build a recognizable spoked bicycle wheel (in local XZ plane, axle along Y)."""
    c = Vector(center)
    rot_m = Euler(rot_euler, "XYZ").to_matrix().to_4x4()

    # Rubber tyre (torus lies in XY, rotate 90 deg about X to stand in XZ)
    wheel_rot = (Euler(rot_euler, "XYZ").to_matrix() @ Euler((math.pi / 2, 0.0, 0.0), "XYZ").to_matrix()).to_euler()
    mb.add_torus(radius, 0.024, major_segs=major_segs, minor_segs=5, pos=c, rot_euler=wheel_rot, color=PAL["rubber"])
    # Steel inner rim
    mb.add_torus(radius - 0.022, 0.010, major_segs=major_segs, minor_segs=4, pos=c, rot_euler=wheel_rot, color=PAL["steel"])
    # Hub cylinder along local Y
    hub_a = c + (rot_m @ Vector((0.0, -0.042, 0.0)))
    hub_b = c + (rot_m @ Vector((0.0, 0.042, 0.0)))
    mb.add_rod(hub_a, hub_b, 0.020, 0.020, segs=6, color=PAL["iron_light"])

    # Radial spokes
    for i in range(spoke_count):
        a = (2.0 * math.pi * i) / spoke_count
        rim_pt = c + (rot_m @ Vector(((radius - 0.024) * math.cos(a), 0.0, (radius - 0.024) * math.sin(a))))
        hub_off = 0.016 if (i % 2 == 0) else -0.016
        h_pt = c + (rot_m @ Vector((0.0, hub_off, 0.0)))
        mb.add_rod(h_pt, rim_pt, 0.0045, 0.0045, segs=4, color=PAL["chrome"], cap=False)


def add_jar(mb: PropMeshBuilder, pos, h=0.20, r=0.065, col=None, lid_col=None):
    col = col or PAL["glass_amber"]
    lid_col = lid_col or PAL["enamel_cream"]
    prof = [
        (0.0, r * 0.90, r * 0.90),
        (h * 0.12, r, r),
        (h * 0.70, r, r),
        (h * 0.84, r * 0.72, r * 0.72),
        (h * 0.90, r * 0.78, r * 0.78),
        (h, r * 0.76, r * 0.76),
    ]
    rcols = [col, col, col, lid_col, lid_col, lid_col]
    mb.add_lathe(prof, segs=8, center=pos, color=col, ring_colors=rcols)


def add_bottle(mb: PropMeshBuilder, pos, h=0.28, r=0.048, col=None):
    col = col or PAL["glass_green"]
    prof = [
        (0.0, r, r),
        (h * 0.58, r, r),
        (h * 0.74, r * 0.42, r * 0.42),
        (h * 0.96, r * 0.36, r * 0.36),
        (h, r * 0.44, r * 0.44),
    ]
    mb.add_lathe(prof, segs=8, center=pos, color=col)


# ---------------------------------------------------------------------------
# 1. WORKBENCH (with cast-iron machinist vice, lower shelf, drawer, oil can)
# ---------------------------------------------------------------------------
def build_workbench(mat):
    """1.76 x 0.76 m footprint, tabletop cleanly at Z = 0.86 m (0.43 game units)."""
    mb = PropMeshBuilder("prop_workbench")
    W, D, H = 1.76, 0.76, 0.86

    # 4 heavy square timber legs with bevels
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add_box((0.095, 0.095, H - 0.065), (sx * (W * 0.5 - 0.10), sy * (D * 0.5 - 0.09), (H - 0.065) * 0.5),
                       color=PAL["pine_dark"], bevel=0.008)

    # Side stretchers & back rail
    for sx in (-1, 1):
        mb.add_box((0.055, D - 0.24, 0.075), (sx * (W * 0.5 - 0.10), 0.0, 0.22), color=PAL["pine_dark"], bevel=0.005)
    mb.add_box((W - 0.24, 0.055, 0.075), (0.0, -(D * 0.5 - 0.09), 0.22), color=PAL["pine_dark"], bevel=0.005)
    mb.add_box((W - 0.24, 0.055, 0.075), (0.0, (D * 0.5 - 0.09), 0.22), color=PAL["pine_dark"], bevel=0.005)

    # Lower plank shelf (4 planks)
    for i in range(4):
        py = -0.22 + i * 0.145
        c = PAL["pine_mid"] if i % 2 == 0 else shade_srgb(PAL["pine_mid"], 0.93)
        mb.add_box((W - 0.24, 0.132, 0.028), (0.0, py, 0.265), color=c)

    # Upper apron + front drawer (left) + open cubby (right)
    mb.add_box((W - 0.22, D - 0.22, 0.16), (0.0, 0.0, H - 0.145), color=PAL["oak_dark"])
    # Drawer front on +Y (front)
    mb.add_box((0.68, 0.032, 0.135), (-0.34, D * 0.5 - 0.09, H - 0.145), color=PAL["pine_light"], bevel=0.006)
    mb.add_box((0.14, 0.028, 0.024), (-0.34, D * 0.5 - 0.066, H - 0.145), color=PAL["iron_dark"])
    # Right drawer
    mb.add_box((0.52, 0.032, 0.135), (0.36, D * 0.5 - 0.09, H - 0.145), color=PAL["pine_light"], bevel=0.006)
    mb.add_box((0.12, 0.028, 0.024), (0.36, D * 0.5 - 0.066, H - 0.145), color=PAL["iron_dark"])

    # Heavy planked workbench top (4 thick oak planks, top surface at Z = 0.860)
    plank_cols = [PAL["pine_light"], PAL["pine_mid"], shade_srgb(PAL["pine_light"], 0.95), PAL["pine_mid"]]
    for i in range(4):
        py = -D * 0.5 + 0.095 + i * 0.19
        mb.add_box((W, 0.184, 0.065), (0.0, py, H - 0.0325), color=plank_cols[i], bevel=0.006)

    # Back tool stop lip along -Y edge
    mb.add_box((W, 0.035, 0.055), (0.0, -D * 0.5 + 0.02, H + 0.022), color=PAL["pine_dark"], bevel=0.004)

    # Cast-iron bench vice clamped to front-right corner (+X, +Y)
    vx, vy = 0.62, D * 0.5 - 0.02
    mb.add_box((0.18, 0.14, 0.09), (vx, vy - 0.04, H + 0.045), color=PAL["iron_mid"], bevel=0.006)
    mb.add_box((0.18, 0.042, 0.12), (vx, vy - 0.09, H + 0.06), color=PAL["iron_dark"], bevel=0.004)
    mb.add_box((0.18, 0.042, 0.12), (vx, vy + 0.05, H + 0.06), color=PAL["iron_dark"], bevel=0.004)
    # Vice jaw steel faces
    mb.add_box((0.175, 0.014, 0.038), (vx, vy - 0.064, H + 0.102), color=PAL["steel"])
    mb.add_box((0.175, 0.014, 0.038), (vx, vy + 0.024, H + 0.102), color=PAL["steel"])
    # Leadscrew & cross tommy bar
    mb.add_rod((vx, vy + 0.06, H + 0.045), (vx, vy + 0.145, H + 0.045), 0.016, 0.016, segs=6, color=PAL["steel"])
    mb.add_rod((vx - 0.11, vy + 0.135, H + 0.045), (vx + 0.11, vy + 0.135, H + 0.045), 0.010, 0.010, segs=6, color=PAL["chrome"])

    # Props on lower shelf: brass oil can, metal toolbox, stacked rags
    mb.add_lathe([(0.0, 0.055, 0.055), (0.09, 0.055, 0.055), (0.14, 0.018, 0.018), (0.21, 0.007, 0.007)],
                 segs=8, center=(-0.55, 0.06, 0.28), color=PAL["brass"])
    mb.add_box((0.36, 0.22, 0.14), (0.38, -0.02, 0.35), color=PAL["iron_mid"], bevel=0.006)
    mb.add_box((0.14, 0.03, 0.025), (0.38, -0.02, 0.43), color=PAL["iron_dark"])
    mb.add_box((0.24, 0.18, 0.06), (-0.08, 0.02, 0.31), color=PAL["linen_cream"], bevel=0.012)

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 2. STOOL (round workshop stool, seat at Paul's knee height ~0.50 m)
# ---------------------------------------------------------------------------
def build_stool(mat):
    mb = PropMeshBuilder("prop_stool")
    H = 0.50
    # Thick bevelled round seat
    mb.add_lathe([
        (0.00, 0.185, 0.185),
        (0.012, 0.200, 0.200),
        (0.044, 0.200, 0.200),
        (0.054, 0.188, 0.188),
    ], segs=14, center=(0.0, 0.0, H - 0.054), color=PAL["pine_light"])
    # Under-seat apron ring
    mb.add_cylinder(0.142, 0.146, 0.055, segs=12, pos=(0.0, 0.0, H - 0.105), color=PAL["pine_dark"])
    # 4 splayed tapered wooden legs
    leg_angles = [math.radians(45 + 90 * i) for i in range(4)]
    for a in leg_angles:
        ca, sa = math.cos(a), math.sin(a)
        mb.add_rod((ca * 0.185, sa * 0.185, 0.0), (ca * 0.125, sa * 0.125, H - 0.05),
                   0.020, 0.024, segs=7, color=PAL["pine_mid"])
    # Footrest ring stretcher connecting the legs
    mb.add_torus(0.165, 0.013, major_segs=14, minor_segs=6, pos=(0.0, 0.0, 0.16), color=PAL["pine_dark"])
    # Cross brace rods under seat
    mb.add_rod((-0.14, 0.0, 0.34), (0.14, 0.0, 0.34), 0.012, 0.012, segs=6, color=PAL["pine_dark"])
    mb.add_rod((0.0, -0.14, 0.34), (0.0, 0.14, 0.34), 0.012, 0.012, segs=6, color=PAL["pine_dark"])
    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 3. BICYCLE (classic 1930s black Silesian roadster)
# ---------------------------------------------------------------------------
def build_bicycle(mat):
    mb = PropMeshBuilder("prop_bicycle")
    r = 0.34
    wx = 0.52  # wheel half-wheelbase
    # Front (+X) and rear (-X) wheels
    add_bike_wheel(mb, (-wx, 0.0, r), radius=r, spoke_count=8, major_segs=14)
    add_bike_wheel(mb, (wx, 0.0, r), radius=r, spoke_count=8, major_segs=14)

    # Frame key joints
    bb = Vector((-0.04, 0.0, 0.30))        # bottom bracket
    seat_top = Vector((-0.16, 0.0, 0.78))  # seat cluster
    head_top = Vector((0.36, 0.0, 0.80))   # head tube top
    head_bot = Vector((0.40, 0.0, 0.64))   # head tube bottom
    rear_hub = Vector((-wx, 0.0, r))
    front_hub = Vector((wx, 0.0, r))

    # Main diamond tubes
    mb.add_rod(bb, seat_top, 0.018, 0.018, segs=6, color=PAL["bike_frame"])
    mb.add_rod(seat_top, head_top, 0.016, 0.016, segs=6, color=PAL["bike_frame"])
    mb.add_rod(bb, head_bot, 0.018, 0.018, segs=6, color=PAL["bike_frame"])
    mb.add_rod(head_bot, head_top, 0.020, 0.020, segs=6, color=PAL["bike_frame"])

    # Rear triangle (chainstays & seatstays)
    for sy in (-0.045, 0.045):
        rh = rear_hub + Vector((0.0, sy, 0.0))
        mb.add_rod(bb + Vector((0.0, sy * 0.4, 0.0)), rh, 0.011, 0.010, segs=5, color=PAL["bike_frame"])
        mb.add_rod(seat_top + Vector((0.0, sy * 0.3, -0.02)), rh, 0.010, 0.009, segs=5, color=PAL["bike_frame"])

    # Front fork legs
    for sy in (-0.045, 0.045):
        mb.add_rod(head_bot + Vector((0.0, sy * 0.4, 0.0)), front_hub + Vector((0.0, sy, 0.0)),
                   0.012, 0.010, segs=5, color=PAL["bike_frame"])

    # Seatpost + leather saddle
    mb.add_rod(seat_top, seat_top + Vector((-0.03, 0.0, 0.11)), 0.012, 0.012, segs=6, color=PAL["chrome"])
    mb.add_box((0.23, 0.13, 0.045), seat_top + Vector((-0.04, 0.0, 0.13)), color=PAL["leather"], bevel=0.014)

    # Stem + swept 1930s handlebars + black grips
    stem_top = head_top + Vector((-0.02, 0.0, 0.14))
    mb.add_rod(head_top, stem_top, 0.013, 0.013, segs=6, color=PAL["chrome"])
    for sy in (-1, 1):
        p_mid = stem_top + Vector((0.04, sy * 0.16, 0.02))
        p_end = stem_top + Vector((-0.06, sy * 0.24, 0.01))
        mb.add_tube_path([stem_top, p_mid, p_end], 0.011, segs=5, color=PAL["chrome"])
        mb.add_rod(p_mid.lerp(p_end, 0.45), p_end + Vector((-0.03, sy * 0.02, 0.0)), 0.015, 0.015, segs=6, color=PAL["rubber"])

    # Chainring, chain guard & pedals
    mb.add_cylinder(0.085, 0.085, 0.016, segs=10, pos=(bb.x, 0.035, bb.z),
                    rot_euler=(math.pi / 2, 0.0, 0.0), color=PAL["steel"])
    mb.add_rod(bb + Vector((0.0, 0.045, 0.0)), bb + Vector((0.04, 0.045, -0.12)), 0.010, 0.010, segs=5, color=PAL["chrome"])
    mb.add_box((0.08, 0.06, 0.022), bb + Vector((0.04, 0.09, -0.12)), color=PAL["rubber"])
    mb.add_rod(bb + Vector((0.0, -0.045, 0.0)), bb + Vector((-0.04, -0.045, 0.12)), 0.010, 0.010, segs=5, color=PAL["chrome"])
    mb.add_box((0.08, 0.06, 0.022), bb + Vector((-0.04, -0.09, 0.12)), color=PAL["rubber"])

    # Mudguards (curved arches over top of each wheel)
    for cx in (-wx, wx):
        arc_pts = [Vector((cx + (r + 0.038) * math.cos(a), 0.0, r + (r + 0.038) * math.sin(a)))
                   for a in [math.radians(d) for d in range(25, 165, 23)]]
        mb.add_tube_path(arc_pts, (0.028, 0.010), segs=5, color=PAL["iron_dark"])

    # Rear cargo rack & brass headlamp
    mb.add_box((0.36, 0.14, 0.018), (-wx - 0.02, 0.0, r + 0.40), color=PAL["iron_dark"])
    for sy in (-0.055, 0.055):
        mb.add_rod((-wx - 0.15, sy, r + 0.39), (-wx, sy, r), 0.007, 0.007, segs=4, color=PAL["iron_dark"])
    mb.add_cylinder(0.036, 0.028, 0.075, segs=8, pos=(head_top.x + 0.05, 0.0, head_top.z - 0.02),
                    rot_euler=(0.0, math.pi / 2, 0.0), color=PAL["brass"])

    # Small rear kickstand so it stands solidly on the floor
    mb.add_rod((-wx - 0.04, 0.04, r - 0.04), (-wx - 0.08, 0.15, 0.0), 0.008, 0.008, segs=5, color=PAL["iron_mid"])
    mb.add_rod((-wx - 0.04, -0.04, r - 0.04), (-wx - 0.08, -0.15, 0.0), 0.008, 0.008, segs=5, color=PAL["iron_mid"])

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 4. OIL DRUM (corrugated steel mechanic's drum)
# ---------------------------------------------------------------------------
def build_drum(mat):
    mb = PropMeshBuilder("prop_drum")
    R, H = 0.28, 0.86
    prof = [
        (0.00, R * 0.96, R * 0.96),
        (0.02, R * 1.02, R * 1.02),
        (0.05, R, R),
        (0.26, R, R),
        (0.29, R * 1.05, R * 1.05),
        (0.32, R, R),
        (0.54, R, R),
        (0.57, R * 1.05, R * 1.05),
        (0.60, R, R),
        (0.81, R, R),
        (0.84, R * 1.03, R * 1.03),
        (0.86, R * 0.99, R * 0.99),
        (0.835, R * 0.92, R * 0.92),
    ]
    c_body = PAL["drum_olive"]
    c_rib = shade_srgb(PAL["drum_olive"], 0.80)
    c_rust = PAL["drum_rust"]
    rcols = [c_rib, c_body, c_body, c_rib, c_rib, c_body, c_rib, c_rib, c_body, c_rust, c_rib, c_body]
    mb.add_lathe(prof, segs=16, center=(0.0, 0.0, 0.0), color=c_body, ring_colors=rcols)

    # Brass bung plug + hand crank oil pump spout on top
    mb.add_cylinder(0.028, 0.028, 0.032, segs=8, pos=(-0.12, 0.05, 0.835), color=PAL["brass"])
    mb.add_cylinder(0.022, 0.022, 0.16, segs=8, pos=(0.11, -0.04, 0.835), color=PAL["iron_dark"])
    mb.add_tube_path([(0.11, -0.04, 0.97), (0.11, 0.06, 0.99), (0.11, 0.14, 0.93)], 0.014, segs=6, color=PAL["iron_mid"])
    mb.add_box((0.12, 0.022, 0.022), (0.17, -0.04, 0.94), color=PAL["steel"])
    # Small drip pan on top
    mb.add_lathe([(0.0, 0.07, 0.07), (0.024, 0.082, 0.082)], segs=10, center=(0.11, 0.13, 0.835), color=PAL["iron_light"])

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 5. SPARE WHEELS (leaning pair of spoked bicycle wheels + spare tyre)
# ---------------------------------------------------------------------------
def build_wheels(mat):
    mb = PropMeshBuilder("prop_wheels")
    r = 0.34
    # Rear wheel leaning slightly back (-Y)
    add_bike_wheel(mb, (-0.12, -0.06, r), radius=r, rot_euler=(math.radians(-12), 0.0, math.radians(6)), spoke_count=10)
    # Front wheel offset to right, leaning against it
    add_bike_wheel(mb, (0.16, 0.06, r), radius=r, rot_euler=(math.radians(-16), 0.0, math.radians(-12)), spoke_count=10)
    # Extra bare rubber tyre tucked behind
    tyre_rot = (Euler((math.radians(82), 0.0, math.radians(15)), "XYZ")).to_matrix().to_euler()
    mb.add_torus(r - 0.02, 0.024, major_segs=14, minor_segs=6, pos=(0.02, -0.14, r - 0.01), rot_euler=tyre_rot, color=PAL["rubber"])
    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 6. WORKSHOP CABINET (tall wooden double-door tool cabinet)
# ---------------------------------------------------------------------------
def build_cabinet(mat):
    mb = PropMeshBuilder("prop_cabinet")
    W, D, H = 0.96, 0.48, 1.72

    # Plinth base
    mb.add_box((W - 0.04, D - 0.03, 0.10), (0.0, 0.0, 0.05), color=PAL["oak_deep"], bevel=0.005)
    # Main carcass
    mb.add_box((W - 0.02, D - 0.04, H - 0.18), (0.0, -0.01, 0.10 + (H - 0.18) * 0.5), color=PAL["oak_dark"], bevel=0.008)
    # Crown cornice
    mb.add_box((W + 0.04, D + 0.03, 0.055), (0.0, 0.005, H - 0.055), color=PAL["oak_deep"], bevel=0.006)
    mb.add_box((W + 0.08, D + 0.06, 0.045), (0.0, 0.010, H - 0.022), color=PAL["oak_warm"], bevel=0.006)

    # Lower double drawers
    for sx in (-0.22, 0.22):
        mb.add_box((0.40, 0.028, 0.20), (sx, D * 0.5 - 0.012, 0.24), color=PAL["oak_warm"], bevel=0.005)
        mb.add_box((0.09, 0.024, 0.022), (sx, D * 0.5 + 0.008, 0.24), color=PAL["brass"])

    # Upper double paneled doors (+Y front)
    for sx in (-0.225, 0.225):
        # Door slab
        mb.add_box((0.42, 0.026, 1.20), (sx, D * 0.5 - 0.012, 1.00), color=PAL["oak_warm"], bevel=0.005)
        # Raised upper & lower panels
        mb.add_box((0.30, 0.016, 0.48), (sx, D * 0.5 + 0.004, 1.28), color=PAL["pine_mid"], bevel=0.004)
        mb.add_box((0.30, 0.016, 0.44), (sx, D * 0.5 + 0.004, 0.72), color=PAL["pine_mid"], bevel=0.004)
        # Brass vertical handle near centre seam
        hx = sx - 0.16 if sx > 0 else sx + 0.16
        mb.add_box((0.022, 0.028, 0.11), (hx, D * 0.5 + 0.014, 1.00), color=PAL["brass"])

    # Small metal oil tin & wooden box on top of cabinet
    mb.add_box((0.24, 0.20, 0.12), (-0.24, 0.0, H + 0.06), color=PAL["cellar_wood"], bevel=0.005)
    mb.add_cylinder(0.065, 0.065, 0.14, segs=8, pos=(0.24, 0.02, H), color=PAL["drum_olive"])

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 7. PARTS BOX (slatted wooden crate brimming with gears, chains & tools)
# ---------------------------------------------------------------------------
def build_parts(mat):
    mb = PropMeshBuilder("prop_parts")
    W, D, H = 0.78, 0.64, 0.58

    # Base board & 4 corner posts
    mb.add_box((W - 0.04, D - 0.04, 0.04), (0.0, 0.0, 0.02), color=PAL["pine_dark"])
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add_box((0.055, 0.055, H), (sx * (W * 0.5 - 0.032), sy * (D * 0.5 - 0.032), H * 0.5),
                       color=PAL["pine_dark"])

    # Horizontal slats (4 tiers on all 4 sides)
    for k in range(4):
        z = 0.09 + k * 0.135
        c = PAL["pine_mid"] if k % 2 == 0 else PAL["pine_light"]
        for sy in (-1, 1):
            mb.add_box((W, 0.026, 0.108), (0.0, sy * (D * 0.5 - 0.013), z), color=c)
        for sx in (-1, 1):
            mb.add_box((0.026, D - 0.04, 0.108), (sx * (W * 0.5 - 0.013), 0.0, z), color=shade_srgb(c, 0.94))

    # Inner dark base fill
    mb.add_box((W - 0.09, D - 0.09, 0.36), (0.0, 0.0, 0.24), color=PAL["oak_deep"])

    # Spare parts sticking out the top: gears/sprockets, pipes, wrenches, chain coil
    mb.add_torus(0.11, 0.022, major_segs=10, minor_segs=5, pos=(-0.16, 0.06, 0.52),
                 rot_euler=(0.35, 0.25, 0.0), color=PAL["steel"])
    mb.add_torus(0.085, 0.018, major_segs=10, minor_segs=5, pos=(0.14, -0.05, 0.54),
                 rot_euler=(-0.45, 0.15, 0.2), color=PAL["iron_light"])
    mb.add_torus(0.09, 0.015, major_segs=10, minor_segs=5, pos=(0.02, 0.12, 0.48),
                 rot_euler=(0.15, -0.35, 0.0), color=PAL["iron_dark"])
    # Metal rods / wrench handles sticking out at jaunty angles
    mb.add_rod((-0.24, -0.10, 0.38), (-0.30, -0.16, 0.68), 0.016, 0.014, segs=6, color=PAL["steel"])
    mb.add_rod((0.18, 0.10, 0.38), (0.28, 0.18, 0.66), 0.018, 0.016, segs=6, color=PAL["brass"])
    mb.add_box((0.20, 0.14, 0.12), (0.10, -0.10, 0.48), rot_euler=(0.1, -0.15, 0.3), color=PAL["drum_rust"], bevel=0.008)
    mb.add_box((0.18, 0.12, 0.10), (-0.12, -0.08, 0.46), rot_euler=(-0.1, 0.2, -0.2), color=PAL["iron_mid"], bevel=0.006)

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 8. KITCHEN RANGE (1930s Silesian coal stove Kohlenherd + stovepipe)
# ---------------------------------------------------------------------------
def build_range(mat):
    """Cooktop at Z = 0.86 m (= 0.43 game units) so obj_coffeepot sits right on top."""
    mb = PropMeshBuilder("prop_range")
    W, D, H = 1.18, 0.74, 0.86

    # 4 short curved cast-iron legs
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add_box((0.075, 0.075, 0.13), (sx * (W * 0.5 - 0.08), sy * (D * 0.5 - 0.08), 0.065),
                       color=PAL["iron_dark"], bevel=0.010)

    # Cream enamel main stove body + dark iron frame trim
    mb.add_box((W - 0.04, D - 0.04, H - 0.18), (0.0, 0.0, 0.13 + (H - 0.18) * 0.5),
               color=PAL["enamel_cream"], bevel=0.010)
    # Corner vertical iron trim strips
    for sx in (-1, 1):
        mb.add_box((0.045, D - 0.02, H - 0.16), (sx * (W * 0.5 - 0.025), 0.0, 0.13 + (H - 0.16) * 0.5),
                   color=PAL["iron_dark"])

    # Heavy black cast-iron cooktop plate (top surface at Z = 0.860)
    mb.add_box((W + 0.03, D + 0.03, 0.055), (0.0, 0.0, H - 0.0275), color=PAL["iron_dark"], bevel=0.007)

    # 3 recessed iron burner plates / concentric stove rings on top
    for bx, by, br in [(-0.30, 0.02, 0.155), (0.06, -0.04, 0.13), (0.35, 0.04, 0.12)]:
        mb.add_cylinder(br, br * 0.96, 0.010, segs=12, pos=(bx, by, H), color=PAL["iron_mid"])
        mb.add_torus(br * 0.65, 0.007, major_segs=12, minor_segs=4, pos=(bx, by, H + 0.010), color=PAL["iron_light"])

    # Front doors (+Y): firebox door (left) with warm ember slit, ash door below, oven door (right)
    fy = D * 0.5 - 0.012
    # Firebox door
    mb.add_box((0.32, 0.030, 0.24), (-0.30, fy, 0.58), color=PAL["iron_mid"], bevel=0.006)
    mb.add_box((0.18, 0.018, 0.032), (-0.30, fy + 0.012, 0.57), color=PAL["ember_glow"])  # glowing vent slit!
    mb.add_box((0.03, 0.032, 0.09), (-0.17, fy + 0.018, 0.58), color=PAL["chrome"])
    # Ash drawer
    mb.add_box((0.32, 0.028, 0.16), (-0.30, fy, 0.30), color=PAL["iron_dark"], bevel=0.005)
    mb.add_box((0.10, 0.026, 0.022), (-0.30, fy + 0.016, 0.30), color=PAL["chrome"])
    # Large oven door (right)
    mb.add_box((0.52, 0.030, 0.42), (0.22, fy, 0.47), color=PAL["iron_mid"], bevel=0.007)
    mb.add_box((0.40, 0.016, 0.30), (0.22, fy + 0.012, 0.47), color=PAL["enamel_white"], bevel=0.004)
    mb.add_box((0.20, 0.028, 0.024), (0.22, fy + 0.024, 0.60), color=PAL["chrome"])

    # Front brass/chrome towel rail along top edge
    mb.add_rod((-W * 0.46, D * 0.5 + 0.06, H - 0.03), (W * 0.46, D * 0.5 + 0.06, H - 0.03), 0.012, 0.012, segs=6, color=PAL["chrome"])
    for sx in (-W * 0.42, W * 0.42):
        mb.add_rod((sx, D * 0.5, H - 0.03), (sx, D * 0.5 + 0.06, H - 0.03), 0.011, 0.011, segs=6, color=PAL["iron_dark"])

    # Cast-iron stovepipe chimney rising from back-left corner (-X, -Y)
    mb.add_cylinder(0.088, 0.082, 0.08, segs=10, pos=(-0.38, -0.22, H), color=PAL["iron_mid"])
    mb.add_cylinder(0.075, 0.075, 1.15, segs=10, pos=(-0.38, -0.22, H + 0.06), color=PAL["iron_dark"])
    # Collar ring near top of stovepipe
    mb.add_torus(0.080, 0.012, major_segs=10, minor_segs=5, pos=(-0.38, -0.22, H + 0.65), color=PAL["iron_light"])

    # Small cast-iron skillet resting on left burner
    mb.add_cylinder(0.11, 0.125, 0.045, segs=10, pos=(-0.30, 0.02, H + 0.01), color=PAL["iron_dark"])
    mb.add_rod((-0.20, 0.02, H + 0.045), (-0.06, 0.08, H + 0.065), 0.012, 0.010, segs=5, color=PAL["iron_mid"])

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 9. KITCHEN TABLE (1.44 x 0.92 m, tabletop at Z = 0.78 m = Paul's hip)
# ---------------------------------------------------------------------------
def build_table(mat):
    mb = PropMeshBuilder("prop_table")
    W, D, H = 1.44, 0.92, 0.78

    # 4 sturdy turned/tapered wooden legs
    for sx in (-1, 1):
        for sy in (-1, 1):
            lx = sx * (W * 0.5 - 0.10)
            ly = sy * (D * 0.5 - 0.10)
            mb.add_lathe([
                (0.00, 0.028, 0.028),
                (0.14, 0.034, 0.034),
                (0.54, 0.036, 0.036),
                (0.58, 0.044, 0.044),
                (H - 0.045, 0.044, 0.044),
            ], segs=8, center=(lx, ly, 0.0), color=PAL["oak_warm"])

    # Apron frame under tabletop
    mb.add_box((W - 0.24, 0.032, 0.105), (0.0, D * 0.5 - 0.10, H - 0.095), color=PAL["oak_dark"])
    mb.add_box((W - 0.24, 0.032, 0.105), (0.0, -(D * 0.5 - 0.10), H - 0.095), color=PAL["oak_dark"])
    mb.add_box((0.032, D - 0.24, 0.105), (W * 0.5 - 0.10, 0.0, H - 0.095), color=PAL["oak_dark"])
    mb.add_box((0.032, D - 0.24, 0.105), (-(W * 0.5 - 0.10), 0.0, H - 0.095), color=PAL["oak_dark"])
    # Front cutlery drawer
    mb.add_box((0.46, 0.025, 0.085), (0.0, D * 0.5 - 0.082, H - 0.095), color=PAL["pine_light"], bevel=0.004)
    mb.add_ellipsoid((0.022, 0.018, 0.022), (0.0, D * 0.5 - 0.062, H - 0.095), color=PAL["brass"], u_segs=6, v_segs=4)

    # Planked wooden tabletop (4 planks, top at Z = 0.780)
    for i in range(4):
        py = -D * 0.5 + 0.115 + i * 0.23
        c = PAL["pine_light"] if i % 2 == 0 else PAL["pine_mid"]
        mb.add_box((W, 0.224, 0.045), (0.0, py, H - 0.0225), color=c, bevel=0.005)

    # Soft linen table runner across the middle (adds cozy Silesian home detail!)
    mb.add_box((0.52, D + 0.016, 0.008), (0.0, 0.0, H + 0.004), color=PAL["linen_cream"])
    for sx in (-0.20, 0.20):
        mb.add_box((0.035, D + 0.018, 0.009), (sx, 0.0, H + 0.0045), color=PAL["linen_stripe"])
    # Hanging runner ends
    for sy in (-1, 1):
        mb.add_box((0.52, 0.012, 0.14), (0.0, sy * (D * 0.5 + 0.006), H - 0.068), color=PAL["linen_cream"])
        for sx in (-0.20, 0.20):
            mb.add_box((0.035, 0.014, 0.14), (sx, sy * (D * 0.5 + 0.007), H - 0.068), color=PAL["linen_stripe"])

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 10. KITCHEN CHAIR (seat at Z = 0.46 m = Paul's knee, backrest to 0.90 m)
# ---------------------------------------------------------------------------
def build_chair(mat):
    mb = PropMeshBuilder("prop_chair")
    W, D, SEAT_H, BACK_H = 0.45, 0.46, 0.46, 0.90

    # Front legs
    for sx in (-1, 1):
        mb.add_rod((sx * 0.19, 0.19, 0.0), (sx * 0.175, 0.17, SEAT_H - 0.02), 0.020, 0.023, segs=6, color=PAL["oak_warm"])
    # Back legs continuing seamlessly up as slightly reclined backrest stiles
    for sx in (-1, 1):
        mb.add_rod((sx * 0.19, -0.20, 0.0), (sx * 0.175, -0.17, SEAT_H), 0.020, 0.023, segs=6, color=PAL["oak_warm"])
        mb.add_rod((sx * 0.175, -0.17, SEAT_H), (sx * 0.185, -0.22, BACK_H), 0.022, 0.020, segs=6, color=PAL["oak_warm"])

    # Lower stretchers
    mb.add_rod((-0.18, 0.18, 0.16), (0.18, 0.18, 0.16), 0.012, 0.012, segs=5, color=PAL["oak_dark"])
    mb.add_rod((-0.18, -0.19, 0.16), (0.18, -0.19, 0.16), 0.012, 0.012, segs=5, color=PAL["oak_dark"])
    for sx in (-0.18, 0.18):
        mb.add_rod((sx, -0.19, 0.20), (sx, 0.18, 0.20), 0.012, 0.012, segs=5, color=PAL["oak_dark"])

    # Planked wooden seat with rounded front bevel
    mb.add_box((W, D, 0.036), (0.0, 0.0, SEAT_H - 0.018), color=PAL["pine_light"], bevel=0.008)
    # Seat cushion pad in muted sage/linen
    mb.add_box((W - 0.07, D - 0.08, 0.022), (0.0, 0.01, SEAT_H + 0.011), color=PAL["rug_sage"], bevel=0.008)

    # Backrest top rail, lower rail, and 3 vertical spindles
    mb.add_box((W - 0.02, 0.034, 0.085), (0.0, -0.215, BACK_H - 0.045), rot_euler=(-0.10, 0.0, 0.0),
               color=PAL["pine_mid"], bevel=0.007)
    mb.add_box((W - 0.06, 0.026, 0.042), (0.0, -0.185, SEAT_H + 0.11), rot_euler=(-0.10, 0.0, 0.0),
               color=PAL["oak_dark"])
    for sx in (-0.095, 0.0, 0.095):
        mb.add_rod((sx, -0.185, SEAT_H + 0.12), (sx, -0.215, BACK_H - 0.07), 0.011, 0.011, segs=5, color=PAL["pine_light"])

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 11. KITCHEN DRESSER (Küchenbüfett with plates, bowls & cups)
# ---------------------------------------------------------------------------
def build_dresser(mat):
    mb = PropMeshBuilder("prop_dresser")
    W, D, H_LOW, H = 1.24, 0.50, 0.86, 1.76

    # Lower sideboard cabinet
    mb.add_box((W - 0.04, D - 0.04, 0.08), (0.0, 0.0, 0.04), color=PAL["oak_deep"])
    mb.add_box((W - 0.02, D - 0.04, H_LOW - 0.12), (0.0, -0.01, 0.08 + (H_LOW - 0.12) * 0.5),
               color=PAL["oak_warm"], bevel=0.007)
    # Counter top slab at Z = 0.86
    mb.add_box((W + 0.04, D + 0.03, 0.045), (0.0, 0.005, H_LOW - 0.022), color=PAL["pine_light"], bevel=0.006)

    # 2 lower doors + 2 upper drawers
    for sx in (-0.29, 0.29):
        mb.add_box((0.52, 0.025, 0.44), (sx, D * 0.5 - 0.012, 0.34), color=PAL["pine_mid"], bevel=0.005)
        mb.add_box((0.38, 0.014, 0.32), (sx, D * 0.5 + 0.003, 0.34), color=PAL["pine_light"], bevel=0.003)
        mb.add_box((0.52, 0.025, 0.16), (sx, D * 0.5 - 0.012, 0.70), color=PAL["pine_mid"], bevel=0.004)
        mb.add_box((0.08, 0.022, 0.020), (sx, D * 0.5 + 0.008, 0.70), color=PAL["brass"])
        hx = sx - 0.20 if sx > 0 else sx + 0.20
        mb.add_box((0.022, 0.024, 0.08), (hx, D * 0.5 + 0.010, 0.40), color=PAL["brass"])

    # Upper hutch (shallower depth, recessed to back -Y)
    HD = 0.30
    hy = -D * 0.5 + HD * 0.5 + 0.01
    # Backboard, side cheeks, 2 open shelves, crown top
    mb.add_box((W - 0.06, 0.03, H - H_LOW), (0.0, -D * 0.5 + 0.025, H_LOW + (H - H_LOW) * 0.5), color=PAL["oak_dark"])
    for sx in (-1, 1):
        mb.add_box((0.042, HD, H - H_LOW), (sx * (W * 0.5 - 0.03), hy, H_LOW + (H - H_LOW) * 0.5),
                   color=PAL["oak_warm"], bevel=0.005)
    for sz in (1.16, 1.44):
        mb.add_box((W - 0.08, HD - 0.02, 0.030), (0.0, hy + 0.005, sz), color=PAL["pine_light"])
    # Crown top
    mb.add_box((W + 0.06, HD + 0.06, 0.055), (0.0, hy + 0.015, H - 0.0275), color=PAL["oak_deep"], bevel=0.006)

    # Crockery on shelves: leaning stoneware plates + stacked bowls + cups
    for px in (-0.40, -0.18, 0.04, 0.26, 0.44):
        mb.add_cylinder(0.095, 0.095, 0.016, segs=10, pos=(px, hy - 0.06, 1.28),
                        rot_euler=(math.radians(78), 0.0, 0.0), color=PAL["enamel_white"])
    # Top shelf bowls & blue-trimmed pitcher
    for px in (-0.36, -0.14, 0.08):
        mb.add_lathe([(0.0, 0.045, 0.045), (0.06, 0.078, 0.078)], segs=8, center=(px, hy + 0.01, 1.455), color=PAL["stoneware"])
    add_jar(mb, (0.34, hy + 0.01, 1.455), h=0.18, r=0.06, col=PAL["enamel_trim"], lid_col=PAL["enamel_cream"])
    # Counter top tea tin & folded cloth
    mb.add_box((0.16, 0.14, 0.15), (-0.42, 0.04, H_LOW + 0.075), color=PAL["enamel_trim"], bevel=0.005)
    mb.add_box((0.24, 0.20, 0.04), (0.02, 0.06, H_LOW + 0.02), color=PAL["linen_cream"], bevel=0.006)

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 12. WASH BASIN (wooden washstand + enamel bowl with water + pitcher + towel)
# ---------------------------------------------------------------------------
def build_basin(mat):
    mb = PropMeshBuilder("prop_basin")
    W, D, H = 0.84, 0.56, 0.80

    # 4 legs + lower shelf
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add_box((0.052, 0.052, H - 0.03), (sx * (W * 0.5 - 0.05), sy * (D * 0.5 - 0.05), (H - 0.03) * 0.5),
                       color=PAL["pine_mid"], bevel=0.005)
    mb.add_box((W - 0.10, D - 0.10, 0.028), (0.0, 0.0, 0.24), color=PAL["pine_dark"])
    # Upper box apron + top
    mb.add_box((W - 0.06, D - 0.06, 0.13), (0.0, 0.0, H - 0.095), color=PAL["pine_mid"])
    mb.add_box((W, D, 0.038), (0.0, 0.0, H - 0.019), color=PAL["pine_light"], bevel=0.005)
    # Short splashback at -Y
    mb.add_box((W, 0.028, 0.14), (0.0, -D * 0.5 + 0.014, H + 0.07), color=PAL["pine_light"], bevel=0.005)

    # White-enamel washbasin with dark blue rim & pale water disc
    bx, by = -0.10, 0.02
    basin_prof = [
        (0.00, 0.135, 0.135),
        (0.05, 0.185, 0.185),
        (0.11, 0.215, 0.215),
        (0.125, 0.228, 0.228),
        (0.115, 0.200, 0.200),
        (0.06, 0.165, 0.165),
    ]
    bcols = [PAL["enamel_white"], PAL["enamel_white"], PAL["enamel_trim"], PAL["enamel_trim"], PAL["enamel_white"]]
    mb.add_lathe(basin_prof, segs=14, center=(bx, by, H), color=PAL["enamel_white"], ring_colors=bcols, cap_top=False)
    # Water surface inside basin
    mb.add_cylinder(0.172, 0.172, 0.012, segs=12, pos=(bx, by, H + 0.065), color=PAL["water_pale"])

    # Matching enamel water pitcher beside basin (+X)
    px, py = 0.25, -0.04
    pitcher_prof = [
        (0.00, 0.072, 0.072),
        (0.08, 0.092, 0.092),
        (0.18, 0.062, 0.062),
        (0.24, 0.072, 0.072),
    ]
    mb.add_lathe(pitcher_prof, segs=10, center=(px, py, H), color=PAL["enamel_white"],
                 ring_colors=[PAL["enamel_white"], PAL["enamel_white"], PAL["enamel_trim"]])
    mb.add_tube_path([(px + 0.06, py, H + 0.21), (px + 0.115, py, H + 0.16), (px + 0.08, py, H + 0.08)],
                     0.010, segs=5, color=PAL["enamel_trim"])
    # Bar of soap
    mb.add_box((0.08, 0.052, 0.024), (0.24, 0.14, H + 0.012), color=PAL["stoneware"], bevel=0.005)

    # Towel rail on left side (-X) with draped linen towel
    mb.add_rod((-W * 0.5 - 0.055, -0.18, H - 0.06), (-W * 0.5 - 0.055, 0.18, H - 0.06), 0.010, 0.010, segs=5, color=PAL["oak_dark"])
    mb.add_box((0.032, 0.26, 0.34), (-W * 0.5 - 0.055, 0.0, H - 0.23), color=PAL["linen_cream"], bevel=0.006)
    mb.add_box((0.036, 0.26, 0.032), (-W * 0.5 - 0.055, 0.0, H - 0.35), color=PAL["linen_stripe"])

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 13, 14, 15. POTATO CRATE (default, shallow-dug, deep-dug states)
# ---------------------------------------------------------------------------
def build_crate(mat, state: str = "default"):
    """
    state:
      'default' -> neat earthy mound of potatoes (prop_crate.glb)
      'shallow' -> messy dug-up soil mound, scattered potatoes, corner of oilcloth peeking (prop_crate_shallow.glb)
      'deep'    -> freshly tamped dark damp soil, neatly re-stacked potatoes (prop_crate_deep.glb)
    """
    name = "prop_crate" if state == "default" else f"prop_crate_{state}"
    mb = PropMeshBuilder(name)
    W, D, H = 1.04, 0.76, 0.62

    # Base board & 4 corner posts
    mb.add_box((W - 0.04, D - 0.04, 0.04), (0.0, 0.0, 0.02), color=PAL["cellar_dark"])
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add_box((0.065, 0.065, H), (sx * (W * 0.5 - 0.036), sy * (D * 0.5 - 0.036), H * 0.5),
                       color=PAL["cellar_dark"])

    # Horizontal slats (4 tiers)
    for k in range(4):
        z = 0.095 + k * 0.145
        c = PAL["cellar_wood"] if k % 2 == 0 else shade_srgb(PAL["cellar_wood"], 0.90)
        for sy in (-1, 1):
            mb.add_box((W, 0.028, 0.116), (0.0, sy * (D * 0.5 - 0.014), z), color=c)
        for sx in (-1, 1):
            mb.add_box((0.028, D - 0.04, 0.116), (sx * (W * 0.5 - 0.014), 0.0, z), color=shade_srgb(c, 0.93))

    # Soil bed inside crate
    soil_col = PAL["dirt_damp"] if state == "deep" else PAL["dirt_dry"]
    soil_h = 0.46 if state == "deep" else 0.49
    mb.add_box((W - 0.09, D - 0.09, soil_h), (0.0, 0.0, 0.04 + soil_h * 0.5), color=soil_col)

    if state == "default":
        # Smooth natural mound + abundant brown potatoes
        mb.add_ellipsoid((0.40, 0.28, 0.075), (0.0, 0.0, 0.53), color=PAL["dirt_dry"], u_segs=8, v_segs=4)
        pot_coords = [
            (-0.28, -0.14, 0.57, 0.075, 0.052, 0.048),
            (-0.10, -0.18, 0.58, 0.068, 0.055, 0.046),
            (0.12, -0.14, 0.58, 0.074, 0.050, 0.050),
            (0.28, -0.10, 0.56, 0.066, 0.048, 0.045),
            (-0.24, 0.04, 0.59, 0.070, 0.054, 0.048),
            (-0.04, 0.02, 0.61, 0.078, 0.056, 0.052),
            (0.16, 0.06, 0.60, 0.072, 0.052, 0.048),
            (0.32, 0.08, 0.56, 0.065, 0.046, 0.044),
            (-0.18, 0.18, 0.57, 0.068, 0.050, 0.046),
            (0.04, 0.18, 0.58, 0.072, 0.052, 0.048),
            (0.22, 0.20, 0.56, 0.064, 0.048, 0.044),
            (0.02, -0.05, 0.63, 0.066, 0.050, 0.045),
        ]
        for idx, (px, py, pz, rx, ry, rz) in enumerate(pot_coords):
            c = PAL["potato_light"] if idx % 2 == 0 else PAL["potato_dark"]
            mb.add_ellipsoid((rx, ry, rz), (px, py, pz), rot_euler=(0.2 * idx, 0.3 * idx, 0.7 * idx),
                             color=c, u_segs=6, v_segs=4)

    elif state == "shallow":
        # Messy disturbed heap pushed to one side + dark damp hollow + oilcloth corner peeking!
        mb.add_ellipsoid((0.28, 0.22, 0.12), (-0.18, -0.06, 0.56), color=PAL["dirt_damp"], u_segs=8, v_segs=4)
        mb.add_ellipsoid((0.22, 0.18, 0.10), (0.20, 0.08, 0.55), color=PAL["dirt_dry"], u_segs=7, v_segs=4)
        # Tell-tale corner of wrapped mimeograph oilcloth & metal handle barely exposed!
        mb.add_box((0.30, 0.22, 0.08), (0.04, -0.02, 0.565), rot_euler=(0.14, -0.18, 0.35),
                   color=PAL["linen_cream"], bevel=0.010)
        mb.add_box((0.20, 0.14, 0.05), (0.01, 0.01, 0.585), rot_euler=(0.14, -0.18, 0.35),
                   color=PAL["oilcloth"], bevel=0.008)
        mb.add_box((0.14, 0.032, 0.032), (0.12, -0.06, 0.605), rot_euler=(0.14, -0.18, 0.35), color=PAL["steel"])
        # Fewer, unevenly pushed-aside potatoes
        pot_coords = [
            (-0.32, -0.16, 0.60, 0.070, 0.050, 0.046),
            (-0.26, 0.14, 0.59, 0.068, 0.052, 0.046),
            (-0.12, 0.20, 0.57, 0.066, 0.048, 0.044),
            (0.28, -0.16, 0.58, 0.072, 0.050, 0.048),
            (0.32, 0.16, 0.60, 0.068, 0.052, 0.046),
            (-0.18, -0.04, 0.65, 0.066, 0.048, 0.044),
            (0.20, 0.12, 0.62, 0.064, 0.046, 0.042),
        ]
        for idx, (px, py, pz, rx, ry, rz) in enumerate(pot_coords):
            c = PAL["potato_light"] if idx % 2 == 0 else PAL["potato_dark"]
            mb.add_ellipsoid((rx, ry, rz), (px, py, pz), rot_euler=(0.4 * idx, 0.2 * idx, 0.9 * idx),
                             color=c, u_segs=6, v_segs=4)

    elif state == "deep":
        # Freshly patted darker damp earth layer + neatly re-arranged potatoes cleanly covering top
        mb.add_box((W - 0.11, D - 0.11, 0.055), (0.0, 0.0, 0.525), color=PAL["dirt_damp"], bevel=0.015)
        mb.add_ellipsoid((0.36, 0.24, 0.055), (0.0, 0.0, 0.555), color=shade_srgb(PAL["dirt_damp"], 1.15), u_segs=8, v_segs=4)
        pot_coords = [
            (-0.28, -0.14, 0.58, 0.072, 0.052, 0.046),
            (-0.08, -0.16, 0.59, 0.068, 0.050, 0.046),
            (0.14, -0.14, 0.58, 0.074, 0.052, 0.048),
            (0.30, -0.08, 0.57, 0.066, 0.048, 0.044),
            (-0.22, 0.06, 0.59, 0.070, 0.054, 0.046),
            (0.00, 0.04, 0.61, 0.076, 0.056, 0.050),
            (0.20, 0.08, 0.59, 0.070, 0.050, 0.046),
            (-0.14, 0.20, 0.57, 0.066, 0.048, 0.044),
            (0.08, 0.20, 0.58, 0.070, 0.050, 0.046),
            (0.26, 0.18, 0.56, 0.064, 0.046, 0.042),
        ]
        for idx, (px, py, pz, rx, ry, rz) in enumerate(pot_coords):
            # Slightly dirt-dusted darker potatoes after re-burying
            c = shade_srgb(PAL["potato_dark"] if idx % 2 == 0 else PAL["potato_light"], 0.88)
            mb.add_ellipsoid((rx, ry, rz), (px, py, pz), rot_euler=(0.3 * idx, 0.1 * idx, 0.5 * idx),
                             color=c, u_segs=6, v_segs=4)

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 16. CELLAR SHELF (wooden preserve rack with jars, crocks & bottles)
# ---------------------------------------------------------------------------
def build_shelf(mat):
    mb = PropMeshBuilder("prop_shelf")
    W, D, H = 1.08, 0.44, 1.48

    # 4 rough timber upright posts
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add_box((0.055, 0.055, H), (sx * (W * 0.5 - 0.03), sy * (D * 0.5 - 0.03), H * 0.5),
                       color=PAL["cellar_dark"])

    # 4 horizontal plank shelves
    shelf_zs = [0.16, 0.58, 1.00, 1.42]
    for sz in shelf_zs:
        mb.add_box((W - 0.02, D - 0.02, 0.032), (0.0, 0.0, sz), color=PAL["cellar_wood"])

    # Back diagonal X-brace
    mb.add_rod((-W * 0.45, -D * 0.45, 0.18), (W * 0.45, -D * 0.45, 1.40), 0.016, 0.016, segs=5, color=PAL["cellar_dark"])

    # Bottom shelf: large stoneware sauerkraut crock & wooden box
    mb.add_lathe([(0.0, 0.11, 0.11), (0.18, 0.13, 0.13), (0.28, 0.11, 0.11), (0.31, 0.12, 0.12)],
                 segs=10, center=(-0.28, 0.0, 0.176), color=PAL["stoneware"])
    mb.add_box((0.34, 0.28, 0.22), (0.24, 0.0, 0.286), color=PAL["pine_dark"], bevel=0.005)

    # Middle shelf (0.58): 4 glass preserve jars (amber & jam red)
    for px, col in [(-0.34, PAL["glass_amber"]), (-0.12, PAL["jam_red"]), (0.10, PAL["glass_amber"]), (0.32, PAL["jam_red"])]:
        add_jar(mb, (px, 0.02, 0.596), h=0.21, r=0.066, col=col)

    # Upper shelf (1.00): dark green bottles & stoneware jug
    for px in (-0.36, -0.22, -0.08):
        add_bottle(mb, (px, 0.02, 1.016), h=0.28, r=0.044, col=PAL["glass_green"])
    add_jar(mb, (0.16, 0.0, 1.016), h=0.22, r=0.072, col=PAL["stoneware"], lid_col=PAL["oak_dark"])
    add_bottle(mb, (0.36, 0.02, 1.016), h=0.26, r=0.046, col=PAL["glass_amber"])

    # Top shelf (1.42): folded linen & 2 preserve jars
    add_jar(mb, (-0.28, 0.0, 1.436), h=0.18, r=0.060, col=PAL["jam_red"])
    add_jar(mb, (-0.10, 0.02, 1.436), h=0.18, r=0.060, col=PAL["glass_amber"])
    mb.add_box((0.30, 0.24, 0.10), (0.24, 0.0, 1.486), color=PAL["burlap"], bevel=0.012)

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 17. BARREL (coopered oak barrel with 4 iron hoops)
# ---------------------------------------------------------------------------
def build_barrel(mat):
    mb = PropMeshBuilder("prop_barrel")
    H = 0.88
    prof = [
        (0.00, 0.245, 0.245),
        (0.03, 0.260, 0.260),
        (0.22, 0.300, 0.300),
        (0.44, 0.320, 0.320),
        (0.66, 0.300, 0.300),
        (0.85, 0.260, 0.260),
        (0.88, 0.252, 0.252),
        (0.84, 0.228, 0.228),
    ]
    rcols = [PAL["oak_dark"], PAL["oak_warm"], PAL["oak_warm"], PAL["oak_warm"],
             PAL["oak_warm"], PAL["oak_dark"], PAL["oak_dark"]]
    mb.add_lathe(prof, segs=16, center=(0.0, 0.0, 0.0), color=PAL["oak_warm"], ring_colors=rcols)

    # 4 riveted dark-iron barrel hoops
    for hz, hr in [(0.08, 0.274), (0.28, 0.309), (0.60, 0.309), (0.80, 0.274)]:
        mb.add_lathe([(0.0, hr, hr), (0.042, hr, hr)], segs=16, center=(0.0, 0.0, hz),
                     color=PAL["iron_dark"], cap_bottom=False, cap_top=False)

    # Wooden bung plug on top lid
    mb.add_cylinder(0.028, 0.025, 0.024, segs=8, pos=(0.08, 0.04, 0.84), color=PAL["pine_light"])
    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 18. SACKS (cluster of 3 plump tied burlap flour/potato sacks)
# ---------------------------------------------------------------------------
def build_sacks(mat):
    mb = PropMeshBuilder("prop_sacks")

    def add_sack(pos, rot, scale_xy, height, col):
        sx, sy = scale_xy
        prof = [
            (0.00, 0.18 * sx, 0.15 * sy),
            (height * 0.18, 0.24 * sx, 0.19 * sy),
            (height * 0.48, 0.22 * sx, 0.18 * sy),
            (height * 0.78, 0.15 * sx, 0.13 * sy),
            (height * 0.87, 0.065 * sx, 0.06 * sy),
            (height * 1.00, 0.105 * sx, 0.095 * sy),
        ]
        rcols = [shade_srgb(col, 0.90), col, col, col, PAL["oak_dark"], shade_srgb(col, 1.05)]
        mb.add_lathe(prof, segs=10, center=pos, rot_euler=rot, color=col, ring_colors=rcols)

    # Upright full back-left sack
    add_sack((-0.20, -0.06, 0.0), (0.06, -0.08, 0.2), (1.05, 1.0), 0.66, PAL["burlap"])
    # Slightly leaning back-right sack
    add_sack((0.20, -0.04, 0.0), (-0.08, 0.12, -0.3), (1.0, 0.95), 0.60, PAL["burlap_dark"])
    # Slumped front sack resting diagonally
    add_sack((0.02, 0.18, 0.16), (math.radians(72), 0.0, math.radians(-22)), (0.95, 0.85), 0.56, shade_srgb(PAL["burlap"], 1.06))

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 19. WOODPILE (stacked split firewood logs between timber end stakes)
# ---------------------------------------------------------------------------
def build_woodpile(mat):
    mb = PropMeshBuilder("prop_woodpile")
    W, D, H = 1.44, 0.62, 0.92

    # Base skids & end support stakes
    for sy in (-0.18, 0.18):
        mb.add_box((W, 0.06, 0.05), (0.0, sy, 0.025), color=PAL["cellar_dark"])
    for sx in (-1, 1):
        for sy in (-0.20, 0.20):
            mb.add_box((0.06, 0.06, H), (sx * (W * 0.5 - 0.03), sy, H * 0.5), color=PAL["oak_dark"])
        mb.add_box((0.04, 0.44, 0.06), (sx * (W * 0.5 - 0.03), 0.0, H - 0.14), color=PAL["oak_dark"])

    # Stacked rows of logs (axis along Y so split ends face +Y front and -Y back!)
    # Single capped 6-sided lathe per log with split-wood end caps keeps tri count ~1200.
    rows = [
        (0.14, 6, 0.094),
        (0.31, 6, 0.090),
        (0.48, 5, 0.090),
        (0.65, 5, 0.086),
        (0.81, 4, 0.082),
    ]
    for r_idx, (rz, count, rad) in enumerate(rows):
        span = (count - 1) * (rad * 2.15)
        for i in range(count):
            lx = -span * 0.5 + i * (rad * 2.15) + ((r_idx % 2) - 0.5) * 0.02
            ly_jit = ((i * 7 + r_idx * 13) % 5 - 2) * 0.015
            log_len = D - 0.04 + ((i + r_idx) % 3 - 1) * 0.025
            c_bark = PAL["birch_bark"] if (i + r_idx) % 2 == 0 else PAL["oak_dark"]
            c_end = PAL["split_wood"] if (i + r_idx) % 2 == 0 else shade_srgb(PAL["split_wood"], 0.90)
            mb.add_lathe(
                [(0.0, rad * 0.96, rad * 0.96), (0.018, rad, rad), (log_len - 0.018, rad, rad), (log_len, rad * 0.96, rad * 0.96)],
                segs=6,
                center=(lx, -log_len * 0.5 + ly_jit, rz),
                rot_euler=(-math.pi / 2, 0.0, 0.0),
                color=c_bark,
                ring_colors=[c_end, c_bark, c_end],
            )

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# 20. YARD WATER PUMP (Silesian cast-iron Schwengelpumpe + wooden bucket)
# ---------------------------------------------------------------------------
def build_pump(mat):
    mb = PropMeshBuilder("prop_pump")

    # Stone plinth slab on ground
    mb.add_box((0.56, 0.62, 0.09), (0.0, 0.02, 0.045), color=PAL["stone_slab"], bevel=0.012)

    # Fluted cast-iron pump column
    col_prof = [
        (0.00, 0.145, 0.145),
        (0.06, 0.125, 0.125),
        (0.18, 0.092, 0.092),
        (0.76, 0.084, 0.084),
        (0.82, 0.105, 0.105),
        (1.06, 0.096, 0.096),
        (1.12, 0.112, 0.112),
        (1.22, 0.055, 0.055),
        (1.26, 0.022, 0.022),
    ]
    rcols = [PAL["iron_dark"], PAL["pump_green"], PAL["pump_green"], PAL["iron_dark"],
             PAL["pump_green"], PAL["pump_green"], PAL["iron_dark"], PAL["pump_green"]]
    mb.add_lathe(col_prof, segs=10, center=(0.0, -0.08, 0.09), color=PAL["pump_green"], ring_colors=rcols)

    # Curved front water spout (+Y)
    mb.add_tube_path([
        (0.0, -0.02, 0.86),
        (0.0, 0.14, 0.84),
        (0.0, 0.22, 0.78),
    ], [0.036, 0.028, 0.022], segs=7, color=PAL["iron_dark"])

    # Long arched cast-iron pump lever handle on side (+X)
    mb.add_box((0.07, 0.07, 0.12), (0.09, -0.08, 1.06), color=PAL["iron_dark"])
    mb.add_tube_path([
        (0.08, -0.08, 1.06),
        (0.24, -0.08, 0.94),
        (0.32, -0.08, 0.68),
        (0.35, -0.08, 0.56),
    ], [0.020, 0.018, 0.016, 0.028], segs=6, color=PAL["iron_mid"])

    # Wooden stave bucket sitting under spout (+Y) with water inside
    mb.add_lathe([
        (0.00, 0.115, 0.115),
        (0.24, 0.150, 0.150),
        (0.25, 0.140, 0.140),
        (0.19, 0.130, 0.130),
    ], segs=12, center=(0.0, 0.18, 0.09), color=PAL["oak_warm"], cap_top=False)
    mb.add_cylinder(0.132, 0.132, 0.01, segs=10, pos=(0.0, 0.18, 0.28), color=PAL["water_pale"])
    # Iron bucket bands
    for bz, br in [(0.14, 0.128), (0.27, 0.146)]:
        mb.add_torus(br, 0.006, major_segs=12, minor_segs=4, pos=(0.0, 0.18, bz), color=PAL["iron_dark"])

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# EXTRA LIVED-IN DRESSING PROPS (12 new models)
# ---------------------------------------------------------------------------

# 21. WOVEN RUG (walkable flat kilim/rag rug with border bands & fringe)
def build_rug(mat):
    mb = PropMeshBuilder("prop_rug")
    W, D, T = 2.20, 1.48, 0.018

    # Base woven body
    mb.add_box((W, D, T), (0.0, 0.0, T * 0.5), color=PAL["rug_base"], bevel=0.004)
    # Outer rust border frame (4 strips slightly proud for crisp top-down facets)
    bw = 0.14
    mb.add_box((W - 0.12, bw, 0.006), (0.0, D * 0.5 - 0.13, T + 0.002), color=PAL["rug_rust"])
    mb.add_box((W - 0.12, bw, 0.006), (0.0, -(D * 0.5 - 0.13), T + 0.002), color=PAL["rug_rust"])
    mb.add_box((bw, D - 0.12, 0.006), (W * 0.5 - 0.13, 0.0, T + 0.002), color=PAL["rug_rust"])
    mb.add_box((bw, D - 0.12, 0.006), (-(W * 0.5 - 0.13), 0.0, T + 0.002), color=PAL["rug_rust"])

    # Inner sage accent rectangle & ochre diamond medallion
    mb.add_box((W - 0.62, D - 0.56, 0.006), (0.0, 0.0, T + 0.002), color=PAL["rug_sage"])
    mb.add_box((W - 0.86, D - 0.78, 0.006), (0.0, 0.0, T + 0.004), color=PAL["rug_base"])
    mb.add_box((0.50, 0.50, 0.006), (0.0, 0.0, T + 0.006), rot_euler=(0.0, 0.0, math.pi / 4), color=PAL["rug_ochre"])
    mb.add_box((0.26, 0.26, 0.006), (0.0, 0.0, T + 0.008), rot_euler=(0.0, 0.0, math.pi / 4), color=PAL["rug_rust"])

    # Decorative woven stripes near left/right ends
    for sx in (-0.72, 0.72):
        mb.add_box((0.05, D - 0.44, 0.006), (sx, 0.0, T + 0.004), color=PAL["rug_ochre"])

    # Fringe tassels along left & right ends
    for sx in (-1, 1):
        for i in range(11):
            fy = -D * 0.44 + i * (D * 0.88 / 10.0)
            mb.add_box((0.09, 0.036, 0.010), (sx * (W * 0.5 + 0.045), fy, 0.005), color=PAL["linen_cream"])

    return mb.finalize_object(mat)


# 22. WOODEN BENCH (Silesian peasant settle / hallway bench)
def build_bench(mat):
    mb = PropMeshBuilder("prop_bench")
    W, D, SEAT_H, BACK_H = 1.38, 0.50, 0.46, 0.86

    # Solid side cheek boards (traditional plank bench ends)
    for sx in (-1, 1):
        mb.add_box((0.055, D - 0.04, SEAT_H), (sx * (W * 0.5 - 0.08), 0.0, SEAT_H * 0.5),
                   color=PAL["oak_warm"], bevel=0.006)
        # Armrest posts + curved armrest tops
        mb.add_box((0.052, 0.06, 0.22), (sx * (W * 0.5 - 0.08), D * 0.5 - 0.08, SEAT_H + 0.11),
                   color=PAL["oak_dark"], bevel=0.005)
        mb.add_box((0.065, D - 0.02, 0.045), (sx * (W * 0.5 - 0.08), 0.0, SEAT_H + 0.22),
                   color=PAL["pine_light"], bevel=0.006)

    # Lower stretcher & under-seat apron
    mb.add_box((W - 0.20, 0.04, 0.09), (0.0, 0.0, 0.18), color=PAL["oak_dark"])
    mb.add_box((W - 0.18, 0.04, 0.08), (0.0, D * 0.5 - 0.08, SEAT_H - 0.06), color=PAL["oak_dark"])

    # Plank seat
    mb.add_box((W, D, 0.045), (0.0, 0.0, SEAT_H - 0.022), color=PAL["pine_light"], bevel=0.007)

    # Backrest stiles, horizontal rails & 5 vertical slats
    for sx in (-1, 1):
        mb.add_box((0.055, 0.048, BACK_H - SEAT_H + 0.04), (sx * (W * 0.5 - 0.08), -D * 0.5 + 0.04, SEAT_H + (BACK_H - SEAT_H) * 0.5),
                   color=PAL["oak_warm"], bevel=0.005)
    mb.add_box((W - 0.06, 0.040, 0.095), (0.0, -D * 0.5 + 0.04, BACK_H - 0.05), color=PAL["pine_mid"], bevel=0.006)
    mb.add_box((W - 0.14, 0.032, 0.050), (0.0, -D * 0.5 + 0.04, SEAT_H + 0.09), color=PAL["oak_dark"])
    for i in range(5):
        px = -0.46 + i * 0.23
        mb.add_box((0.11, 0.024, 0.26), (px, -D * 0.5 + 0.04, SEAT_H + 0.24), color=PAL["pine_light"], bevel=0.003)

    # Folded wool blanket resting on one end of the bench
    mb.add_box((0.36, 0.34, 0.075), (0.36, 0.02, SEAT_H + 0.038), color=PAL["rug_rust"], bevel=0.016)
    mb.add_box((0.36, 0.06, 0.080), (0.36, 0.08, SEAT_H + 0.038), color=PAL["rug_ochre"], bevel=0.010)

    return mb.finalize_object(mat)


# 23. COAT RACK (hall coat hooks with hanging coats, hat & boots)
def build_coat_rack(mat):
    mb = PropMeshBuilder("prop_coat_rack")
    W, D, H = 0.84, 0.34, 1.76

    # Tall standing hall rack frame (flat back against -Y wall)
    mb.add_box((W, D, 0.05), (0.0, 0.0, 0.025), color=PAL["oak_deep"], bevel=0.005)
    for sx in (-1, 1):
        mb.add_box((0.065, 0.065, H), (sx * (W * 0.5 - 0.05), -D * 0.5 + 0.05, H * 0.5), color=PAL["oak_dark"], bevel=0.005)
    # Upper pegboard & hat shelf
    mb.add_box((W - 0.04, 0.035, 0.26), (0.0, -D * 0.5 + 0.05, H - 0.26), color=PAL["oak_warm"], bevel=0.004)
    mb.add_box((W + 0.02, 0.24, 0.038), (0.0, -0.02, H - 0.08), color=PAL["pine_mid"], bevel=0.005)
    # 4 brass coat hooks
    for hx in (-0.28, -0.10, 0.10, 0.28):
        mb.add_rod((hx, -D * 0.5 + 0.07, H - 0.28), (hx, -D * 0.5 + 0.13, H - 0.25), 0.009, 0.009, segs=5, color=PAL["brass"])

    # Hanging dark wool winter coat on left hook
    mb.add_lathe([
        (0.00, 0.14, 0.095),
        (0.45, 0.13, 0.09),
        (0.78, 0.11, 0.08),
        (0.94, 0.055, 0.045),
    ], segs=8, center=(-0.22, -0.02, 0.54), color=PAL["coat_wool"])
    # Hanging brown work jacket on right hook
    mb.add_lathe([
        (0.00, 0.135, 0.09),
        (0.40, 0.125, 0.085),
        (0.72, 0.10, 0.075),
        (0.84, 0.05, 0.04),
    ], segs=8, center=(0.18, -0.02, 0.64), color=PAL["coat_brown"])
    # Scarf hanging on middle hook
    mb.add_box((0.09, 0.045, 0.58), (-0.02, 0.01, 1.18), color=PAL["rug_ochre"], bevel=0.010)

    # Felt hat resting on top shelf
    mb.add_cylinder(0.14, 0.14, 0.018, segs=10, pos=(-0.18, 0.0, H - 0.06), color=PAL["coat_wool"])
    mb.add_cylinder(0.085, 0.075, 0.095, segs=10, pos=(-0.18, 0.0, H - 0.045), color=PAL["coat_wool"])

    # Pair of muddy work boots resting neatly on base shelf
    for sx in (-0.22, -0.06):
        mb.add_box((0.09, 0.21, 0.085), (sx, 0.04, 0.092), color=PAL["leather"], bevel=0.014)
        mb.add_cylinder(0.044, 0.048, 0.16, segs=8, pos=(sx, -0.02, 0.10), color=PAL["leather"])

    return mb.finalize_object(mat)


# 24. SMALL CUPBOARD (rustic side cupboard with folded cloth & stoneware bowl)
def build_cupboard(mat):
    mb = PropMeshBuilder("prop_cupboard")
    W, D, H = 0.96, 0.48, 0.86

    # Short corner feet
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add_box((0.065, 0.065, 0.09), (sx * (W * 0.5 - 0.06), sy * (D * 0.5 - 0.06), 0.045), color=PAL["oak_deep"])
    # Main box body
    mb.add_box((W - 0.04, D - 0.04, H - 0.13), (0.0, -0.005, 0.09 + (H - 0.13) * 0.5),
               color=PAL["oak_warm"], bevel=0.006)
    # Overhanging plank top
    mb.add_box((W + 0.04, D + 0.04, 0.046), (0.0, 0.0, H - 0.023), color=PAL["pine_light"], bevel=0.006)

    # Front double doors + top drawer
    for sx in (-0.22, 0.22):
        mb.add_box((0.40, 0.024, 0.46), (sx, D * 0.5 - 0.010, 0.36), color=PAL["pine_mid"], bevel=0.005)
        mb.add_box((0.28, 0.014, 0.34), (sx, D * 0.5 + 0.004, 0.36), color=PAL["pine_light"], bevel=0.003)
        hx = sx - 0.14 if sx > 0 else sx + 0.14
        mb.add_ellipsoid((0.018, 0.018, 0.018), (hx, D * 0.5 + 0.014, 0.42), color=PAL["brass"], u_segs=6, v_segs=4)
    mb.add_box((0.82, 0.026, 0.14), (0.0, D * 0.5 - 0.010, 0.70), color=PAL["pine_mid"], bevel=0.004)
    for sx in (-0.22, 0.22):
        mb.add_box((0.08, 0.022, 0.020), (sx, D * 0.5 + 0.010, 0.70), color=PAL["brass"])

    # Lived-in top items: linen doily, ceramic bowl, small brass candlestick
    mb.add_box((0.42, 0.32, 0.008), (-0.16, 0.0, H + 0.004), color=PAL["linen_cream"])
    mb.add_lathe([(0.0, 0.07, 0.07), (0.085, 0.115, 0.115), (0.095, 0.105, 0.105)],
                 segs=10, center=(-0.16, 0.0, H + 0.008), color=PAL["enamel_white"])
    mb.add_lathe([(0.0, 0.055, 0.055), (0.02, 0.022, 0.022), (0.12, 0.020, 0.020), (0.14, 0.036, 0.036)],
                 segs=8, center=(0.28, -0.02, H), color=PAL["brass"])
    mb.add_cylinder(0.016, 0.015, 0.12, segs=7, pos=(0.28, -0.02, H + 0.13), color=PAL["enamel_cream"])

    return mb.finalize_object(mat)


# 25. WORKSHOP TOOL RACK (wall-mounted wooden tool board with saw, wrenches, hammer, shelf)
def build_tool_rack(mat):
    mb = PropMeshBuilder("prop_tool_rack")
    W, D, H = 1.24, 0.22, 0.96

    # Back plank board (3 horizontal planks hugging -Y wall)
    for k in range(3):
        mb.add_box((W, 0.036, 0.29), (0.0, -D * 0.5 + 0.018, 0.18 + k * 0.305),
                   color=PAL["pine_dark"] if k == 1 else PAL["oak_warm"], bevel=0.004)
    # Tool ledge shelf along bottom
    mb.add_box((W + 0.02, D, 0.035), (0.0, 0.0, 0.03), color=PAL["pine_mid"], bevel=0.004)
    # Hanging batten strip across upper middle
    mb.add_box((W - 0.08, 0.045, 0.055), (0.0, -D * 0.5 + 0.05, 0.72), color=PAL["oak_deep"])

    # Handsaw hanging on left (-X)
    mb.add_box((0.10, 0.026, 0.14), (-0.42, -D * 0.5 + 0.065, 0.74), color=PAL["pine_light"], bevel=0.005)
    mb.add_box((0.085, 0.012, 0.42), (-0.42, -D * 0.5 + 0.058, 0.46), color=PAL["steel"])

    # 3 graduated steel wrenches hanging in centre
    for idx, (wx, wh) in enumerate([(-0.18, 0.34), (-0.05, 0.28), (0.08, 0.22)]):
        mb.add_box((0.028, 0.014, wh), (wx, -D * 0.5 + 0.06, 0.70 - wh * 0.5), color=PAL["chrome"])
        mb.add_torus(0.028, 0.010, major_segs=8, minor_segs=4, pos=(wx, -D * 0.5 + 0.06, 0.72),
                     rot_euler=(math.pi / 2, 0.0, 0.0), color=PAL["steel"])

    # Mechanic's hammer
    mb.add_box((0.028, 0.024, 0.34), (0.24, -D * 0.5 + 0.065, 0.52), color=PAL["pine_light"])
    mb.add_box((0.12, 0.042, 0.046), (0.24, -D * 0.5 + 0.065, 0.70), color=PAL["iron_dark"], bevel=0.004)

    # Hanging coiled bicycle tyre / inner tube on far right
    mb.add_torus(0.14, 0.022, major_segs=12, minor_segs=5, pos=(0.45, -D * 0.5 + 0.07, 0.56),
                 rot_euler=(math.pi / 2, 0.0, 0.0), color=PAL["rubber"])

    # Small oil bottles & tin cans standing on bottom ledge
    mb.add_cylinder(0.045, 0.045, 0.12, segs=8, pos=(-0.34, 0.01, 0.048), color=PAL["drum_olive"])
    mb.add_cylinder(0.042, 0.042, 0.10, segs=8, pos=(-0.20, 0.01, 0.048), color=PAL["brass"])
    mb.add_box((0.20, 0.12, 0.085), (0.14, 0.01, 0.09), color=PAL["drum_rust"], bevel=0.005)

    return mb.finalize_object(mat)


# 26. WALL SHELF (kitchen bracket shelf with jars, copper pot & hanging ladle)
def build_wall_shelf(mat):
    mb = PropMeshBuilder("prop_wall_shelf")
    W, D = 1.06, 0.28

    # Back mounting board & horizontal shelf
    mb.add_box((W, 0.032, 0.24), (0.0, -D * 0.5 + 0.016, 0.14), color=PAL["oak_warm"], bevel=0.004)
    mb.add_box((W + 0.04, D, 0.036), (0.0, 0.0, 0.25), color=PAL["pine_light"], bevel=0.005)
    # 2 decorative triangular brackets
    for sx in (-0.38, 0.38):
        mb.add_box((0.040, D - 0.04, 0.16), (sx, -0.01, 0.15), color=PAL["oak_dark"], bevel=0.004)

    # Jars & copper pot sitting on shelf (Z = 0.268)
    add_jar(mb, (-0.36, 0.0, 0.268), h=0.19, r=0.062, col=PAL["jam_red"])
    add_jar(mb, (-0.18, 0.02, 0.268), h=0.22, r=0.066, col=PAL["glass_amber"])
    add_jar(mb, (0.00, 0.0, 0.268), h=0.17, r=0.058, col=PAL["stoneware"], lid_col=PAL["oak_dark"])
    # Burnished copper cooking pot with lid
    mb.add_lathe([(0.0, 0.095, 0.095), (0.14, 0.102, 0.102), (0.15, 0.110, 0.110), (0.18, 0.04, 0.04)],
                 segs=10, center=(0.28, 0.01, 0.268), color=PAL["copper"])
    mb.add_ellipsoid((0.022, 0.022, 0.018), (0.28, 0.01, 0.455), color=PAL["brass"], u_segs=6, v_segs=4)

    # Hanging ladle & skimmer under the shelf
    for hx in (-0.14, 0.14):
        mb.add_rod((hx, -0.06, 0.23), (hx, -0.06, 0.02), 0.008, 0.008, segs=5, color=PAL["steel"])
        mb.add_ellipsoid((0.042, 0.026, 0.042), (hx, -0.05, 0.02), color=PAL["chrome"], u_segs=7, v_segs=4)

    return mb.finalize_object(mat)


# 27. FIREWOOD BASKET (woven wicker basket filled with split firewood logs)
def build_firewood_basket(mat):
    mb = PropMeshBuilder("prop_firewood_basket")
    # Woven oval/round flared wicker basket
    prof = [
        (0.00, 0.185, 0.165),
        (0.08, 0.215, 0.195),
        (0.18, 0.235, 0.215),
        (0.28, 0.250, 0.230),
        (0.32, 0.262, 0.242),
        (0.31, 0.228, 0.208),
        (0.10, 0.185, 0.165),
    ]
    rcols = [PAL["wicker_dark"], PAL["wicker"], PAL["wicker_dark"], PAL["wicker"], PAL["wicker_dark"], PAL["wicker_dark"]]
    mb.add_lathe(prof, segs=14, center=(0.0, 0.0, 0.0), color=PAL["wicker"], ring_colors=rcols, cap_top=False)
    # Side woven handles
    for sx in (-1, 1):
        mb.add_torus(0.052, 0.012, major_segs=8, minor_segs=5, pos=(sx * 0.25, 0.0, 0.30),
                     rot_euler=(math.pi / 2, 0.0, 0.0), color=PAL["wicker_dark"])

    # Split firewood logs sticking up at natural angles
    logs = [
        ((-0.08, -0.06, 0.08), (-0.12, -0.09, 0.46), 0.046),
        ((0.06, -0.08, 0.08), (0.11, -0.10, 0.44), 0.044),
        ((-0.02, 0.05, 0.08), (-0.04, 0.11, 0.47), 0.048),
        ((0.10, 0.04, 0.08), (0.15, 0.08, 0.42), 0.042),
        ((-0.12, 0.06, 0.08), (-0.16, 0.09, 0.41), 0.040),
        ((0.01, -0.02, 0.10), (0.04, 0.02, 0.49), 0.045),
    ]
    for idx, (p0, p1, rad) in enumerate(logs):
        mb.add_rod(p0, p1, rad, rad * 0.94, segs=6,
                   color=PAL["birch_bark"] if idx % 2 == 0 else PAL["oak_dark"])
        # Bright split end cap at top
        mb.add_ellipsoid((rad * 0.85, rad * 0.85, 0.014), p1, color=PAL["split_wood"], u_segs=6, v_segs=3)

    return mb.finalize_object(mat)


# 28. COAL BUCKET (galvanized iron Kohleeimer filled with coal lumps + shovel)
def build_coal_bucket(mat):
    mb = PropMeshBuilder("prop_coal_bucket")
    prof = [
        (0.00, 0.155, 0.155),
        (0.04, 0.145, 0.145),
        (0.32, 0.195, 0.195),
        (0.40, 0.215, 0.215),
        (0.42, 0.222, 0.222),
        (0.39, 0.195, 0.195),
        (0.24, 0.170, 0.170),
    ]
    rcols = [PAL["iron_dark"], PAL["galv_zinc"], PAL["galv_zinc"], PAL["iron_light"], PAL["iron_dark"], PAL["iron_dark"]]
    mb.add_lathe(prof, segs=14, center=(0.0, 0.0, 0.0), color=PAL["galv_zinc"], ring_colors=rcols, cap_top=False)

    # Arched wire bail handle draped over rim
    mb.add_tube_path([
        (-0.21, 0.0, 0.39),
        (-0.18, 0.14, 0.48),
        (0.0, 0.21, 0.52),
        (0.18, 0.14, 0.48),
        (0.21, 0.0, 0.39),
    ], 0.009, segs=5, color=PAL["iron_dark"])

    # Mound of jagged dark coal lumps
    coal_pts = [
        (0.0, 0.0, 0.36, 0.14, 0.14, 0.09),
        (-0.08, 0.06, 0.42, 0.065, 0.055, 0.055),
        (0.08, 0.05, 0.43, 0.060, 0.055, 0.050),
        (-0.05, -0.07, 0.43, 0.062, 0.052, 0.054),
        (0.07, -0.06, 0.41, 0.058, 0.054, 0.048),
        (0.0, 0.01, 0.46, 0.064, 0.056, 0.050),
    ]
    for idx, (cx, cy, cz, rx, ry, rz) in enumerate(coal_pts):
        mb.add_box((rx * 1.6, ry * 1.6, rz * 1.5), (cx, cy, cz),
                   rot_euler=(0.4 * idx, 0.6 * idx, 0.8 * idx), color=PAL["coal"], bevel=0.010)

    # Small iron coal shovel sticking out
    mb.add_rod((0.06, -0.04, 0.36), (0.14, -0.14, 0.58), 0.012, 0.012, segs=6, color=PAL["oak_dark"])
    mb.add_box((0.10, 0.12, 0.016), (0.04, -0.01, 0.36), rot_euler=(0.5, 0.2, 0.3), color=PAL["iron_mid"])

    return mb.finalize_object(mat)


# 29. CRATE STACK (stacked cellar wooden packing crates + bottle & cloth)
def build_crate_stack(mat):
    mb = PropMeshBuilder("prop_crate_stack")

    def add_mini_crate(pos, sz, rot_z, wood_c):
        cx, cy, cz = pos
        w, d, h = sz
        rot = (0.0, 0.0, rot_z)
        mb.add_box((w - 0.04, d - 0.04, h - 0.04), (cx, cy, cz + h * 0.5), rot_euler=rot, color=PAL["cellar_dark"])
        # Corner ribs & horizontal bands
        for k in range(3):
            z = cz + 0.07 + k * ((h - 0.14) * 0.5)
            mb.add_box((w, d, 0.085), (cx, cy, z), rot_euler=rot, color=wood_c, bevel=0.004)

    # Bottom large crate
    add_mini_crate((0.0, 0.0, 0.0), (0.90, 0.64, 0.46), 0.0, PAL["cellar_wood"])
    # Top slightly askew smaller crate
    add_mini_crate((-0.08, -0.02, 0.46), (0.62, 0.48, 0.38), math.radians(11), PAL["pine_dark"])
    # Folded burlap sack & green glass bottle on top
    mb.add_box((0.24, 0.22, 0.055), (0.28, 0.04, 0.488), rot_euler=(0.0, 0.0, -0.25), color=PAL["burlap"], bevel=0.012)
    add_bottle(mb, (-0.16, 0.04, 0.84), h=0.25, r=0.044, col=PAL["glass_green"])
    add_jar(mb, (0.04, -0.04, 0.84), h=0.17, r=0.056, col=PAL["glass_amber"])

    return mb.finalize_object(mat)


# 30. POTTED PLANT (terracotta geranium pot on wooden plant stand)
def build_plant(mat):
    mb = PropMeshBuilder("prop_plant")

    # Small 4-legged wooden plant stand (height 0.34 m)
    SH = 0.34
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add_rod((sx * 0.16, sy * 0.16, 0.0), (sx * 0.13, sy * 0.13, SH - 0.02), 0.016, 0.018, segs=6, color=PAL["oak_warm"])
    mb.add_cylinder(0.18, 0.18, 0.028, segs=12, pos=(0.0, 0.0, SH - 0.028), color=PAL["pine_light"])
    mb.add_cylinder(0.14, 0.14, 0.020, segs=10, pos=(0.0, 0.0, 0.12), color=PAL["oak_dark"])

    # Terracotta clay pot + rim + soil
    pot_prof = [
        (0.00, 0.10, 0.10),
        (0.18, 0.14, 0.14),
        (0.20, 0.155, 0.155),
        (0.24, 0.155, 0.155),
        (0.23, 0.132, 0.132),
    ]
    mb.add_lathe(pot_prof, segs=12, center=(0.0, 0.0, SH), color=PAL["terracotta"])
    mb.add_cylinder(0.130, 0.130, 0.015, segs=10, pos=(0.0, 0.0, SH + 0.215), color=PAL["dirt_damp"])

    # Leafy geranium foliage & muted coral blossom clusters
    leaf_base = SH + 0.23
    for i in range(9):
        a = (2.0 * math.pi * i) / 9.0
        r_dist = 0.09 + (i % 2) * 0.05
        lz = leaf_base + 0.05 + (i % 3) * 0.05
        lx, ly = r_dist * math.cos(a), r_dist * math.sin(a)
        mb.add_rod((0.0, 0.0, leaf_base), (lx, ly, lz), 0.008, 0.006, segs=4, color=PAL["leaf_dark"])
        mb.add_ellipsoid((0.075, 0.060, 0.022), (lx * 1.15, ly * 1.15, lz + 0.01),
                         rot_euler=(0.3 * math.sin(a), -0.3 * math.cos(a), a),
                         color=PAL["leaf_light"] if i % 2 == 0 else PAL["leaf_dark"], u_segs=6, v_segs=4)

    # 3 small coral flower clusters poking up cleanly
    for fx, fy, fz in [(0.02, 0.02, leaf_base + 0.20), (-0.07, -0.04, leaf_base + 0.17), (0.07, -0.05, leaf_base + 0.16)]:
        mb.add_rod((0.0, 0.0, leaf_base + 0.02), (fx, fy, fz), 0.007, 0.006, segs=4, color=PAL["leaf_dark"])
        mb.add_ellipsoid((0.048, 0.048, 0.036), (fx, fy, fz + 0.015), color=PAL["flower_coral"], u_segs=7, v_segs=4)

    return mb.finalize_object(mat)


# 31. LENI'S DRAWING DESK (small side table with paper, pencils & tiny lamp)
def build_leni_desk(mat):
    mb = PropMeshBuilder("prop_leni_desk")
    W, D, H = 0.76, 0.56, 0.58

    # 4 legs + stretchers + tabletop
    for sx in (-1, 1):
        for sy in (-1, 1):
            mb.add_box((0.048, 0.048, H - 0.035), (sx * (W * 0.5 - 0.06), sy * (D * 0.5 - 0.06), (H - 0.035) * 0.5),
                       color=PAL["pine_dark"], bevel=0.004)
    mb.add_box((W - 0.14, D - 0.14, 0.08), (0.0, 0.0, H - 0.075), color=PAL["oak_warm"])
    mb.add_box((W, D, 0.038), (0.0, 0.0, H - 0.019), color=PAL["pine_light"], bevel=0.006)
    # Lower shelf with small storybook
    mb.add_box((W - 0.14, D - 0.14, 0.024), (0.0, 0.0, 0.16), color=PAL["pine_mid"])
    mb.add_box((0.22, 0.16, 0.035), (-0.12, 0.0, 0.19), rot_euler=(0.0, 0.0, 0.18), color=PAL["curtain_check"])

    # Drawing paper sheet with coloured scribble accents
    mb.add_box((0.34, 0.26, 0.006), (-0.06, 0.03, H + 0.003), rot_euler=(0.0, 0.0, 0.08), color=PAL["paper"])
    mb.add_box((0.12, 0.09, 0.008), (-0.08, 0.05, H + 0.004), rot_euler=(0.0, 0.0, 0.08), color=PAL["leaf_light"])
    mb.add_box((0.08, 0.08, 0.008), (-0.02, 0.01, H + 0.004), rot_euler=(0.0, 0.0, 0.25), color=PAL["flower_coral"])

    # Coloured pencils scattered beside paper
    mb.add_rod((0.14, 0.12, H + 0.010), (0.28, 0.06, H + 0.010), 0.008, 0.008, segs=5, color=PAL["pencil_red"])
    mb.add_rod((0.15, 0.04, H + 0.010), (0.27, -0.04, H + 0.010), 0.008, 0.008, segs=5, color=PAL["pencil_blue"])
    mb.add_rod((0.12, -0.06, H + 0.010), (0.24, -0.14, H + 0.010), 0.008, 0.008, segs=5, color=PAL["pencil_yellow"])

    # Small kerosene lamp in back-right corner
    lx, ly = 0.24, -0.16
    mb.add_lathe([(0.0, 0.068, 0.068), (0.04, 0.072, 0.072), (0.09, 0.042, 0.042), (0.12, 0.048, 0.048)],
                 segs=10, center=(lx, ly, H), color=PAL["brass"])
    mb.add_lathe([(0.0, 0.034, 0.034), (0.07, 0.054, 0.054), (0.17, 0.034, 0.034)],
                 segs=10, center=(lx, ly, H + 0.12), color=PAL["enamel_cream"])

    return mb.finalize_object(mat)


# 32. WINDOW CURTAINS (wooden rod + tied-back pleated gingham curtains)
def build_curtains(mat):
    mb = PropMeshBuilder("prop_curtains")
    W, H = 1.48, 1.12

    # Wooden curtain rod + finial knobs
    mb.add_rod((-W * 0.52, 0.0, H - 0.04), (W * 0.52, 0.0, H - 0.04), 0.018, 0.018, segs=8, color=PAL["oak_dark"])
    for sx in (-1, 1):
        mb.add_ellipsoid((0.032, 0.032, 0.032), (sx * W * 0.54, 0.0, H - 0.04), color=PAL["oak_warm"], u_segs=6, v_segs=4)

    # Top valance frill (pleated boxes)
    for i in range(9):
        vx = -W * 0.44 + i * (W * 0.88 / 8.0)
        vy = 0.025 if i % 2 == 0 else 0.005
        c = PAL["linen_cream"] if i % 2 == 0 else PAL["curtain_check"]
        mb.add_box((0.15, 0.045, 0.18), (vx, vy, H - 0.13), color=c, bevel=0.006)

    # Left & right draped tie-back curtain panels (cinched at mid-height)
    for sx in (-1, 1):
        for k in range(3):
            x_top = sx * (W * 0.42 - k * 0.09)
            x_mid = sx * (W * 0.45 - k * 0.045)
            x_bot = sx * (W * 0.40 - k * 0.08)
            y_off = 0.02 + (k % 2) * 0.028
            c = PAL["linen_cream"] if k % 2 == 0 else PAL["curtain_check"]
            mb.add_tube_path([
                (x_top, y_off, H - 0.08),
                (x_mid, y_off + 0.015, H * 0.44),
                (x_bot, y_off, 0.02),
            ], [(0.055, 0.030), (0.042, 0.028), (0.060, 0.032)], segs=6, color=c)
        # Tie-back sash ribbon
        mb.add_box((0.19, 0.085, 0.045), (sx * (W * 0.41), 0.03, H * 0.44), color=PAL["curtain_check"], bevel=0.006)

    return mb.finalize_object(mat)


# ---------------------------------------------------------------------------
# Registry of all 32 props
# ---------------------------------------------------------------------------
PROPS = [
    # Existing / gameplay props (20 GLBs)
    ("workbench",       build_workbench),
    ("stool",           build_stool),
    ("bicycle",         build_bicycle),
    ("drum",            build_drum),
    ("wheels",          build_wheels),
    ("cabinet",         build_cabinet),
    ("parts",           build_parts),
    ("range",           build_range),
    ("table",           build_table),
    ("chair",           build_chair),
    ("dresser",         build_dresser),
    ("basin",           build_basin),
    ("crate",           lambda mat: build_crate(mat, "default")),
    ("crate_shallow",   lambda mat: build_crate(mat, "shallow")),
    ("crate_deep",      lambda mat: build_crate(mat, "deep")),
    ("shelf",           build_shelf),
    ("barrel",          build_barrel),
    ("sacks",           build_sacks),
    ("woodpile",        build_woodpile),
    ("pump",            build_pump),
    # Extra lived-in dressing props (12 GLBs)
    ("rug",             build_rug),
    ("bench",           build_bench),
    ("coat_rack",       build_coat_rack),
    ("cupboard",        build_cupboard),
    ("tool_rack",       build_tool_rack),
    ("wall_shelf",      build_wall_shelf),
    ("firewood_basket", build_firewood_basket),
    ("coal_bucket",     build_coal_bucket),
    ("crate_stack",     build_crate_stack),
    ("plant",           build_plant),
    ("leni_desk",       build_leni_desk),
    ("curtains",        build_curtains),
]


# ---------------------------------------------------------------------------
# Export & Preview Rendering (with Paul imported for true 1:1 scale checks!)
# ---------------------------------------------------------------------------
def count_triangles(mesh) -> int:
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def export_prop_glb(obj, filepath: str):
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


def import_paul_reference():
    """Import chr_paul.glb as a 1:1 scale reference next to our furniture."""
    paul_path = os.path.join(MODELS_DIR, "chr_paul.glb")
    if not os.path.exists(paul_path):
        return None
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=paul_path)
    added = [o for o in bpy.data.objects if o not in before]
    mesh_objs = [o for o in added if o.type == "MESH"]
    if not mesh_objs:
        return None
    paul = mesh_objs[0]
    # Unparent while preserving world transform, rotate to face +Y in Blender like our props
    mat_w = paul.matrix_world.copy()
    paul.parent = None
    paul.matrix_world = mat_w
    for o in added:
        if o != paul:
            bpy.data.objects.remove(o, do_unlink=True)
    # glTF importer imports -Z forward into Blender +Y forward already! Ensure grounded at Z=0
    bpy.context.view_layer.update()
    return paul


def setup_render_studio():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 640
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
        bg.inputs[0].default_value = (*srgb_to_linear_rgba(hex_col("#6c675f"))[:3], 1.0)
        bg.inputs[1].default_value = 0.80

    # Key sun
    key_data = bpy.data.lights.new("KeySun", type="SUN")
    key_data.energy = 2.5
    key_data.color = (1.0, 0.96, 0.90)
    key_obj = bpy.data.objects.new("KeySun", key_data)
    key_obj.rotation_euler = Euler((math.radians(42), math.radians(20), math.radians(-145)), "XYZ")
    bpy.context.collection.objects.link(key_obj)

    # Soft fill
    fill_data = bpy.data.lights.new("FillArea", type="AREA")
    fill_data.energy = 240.0
    fill_data.size = 6.0
    fill_data.color = (0.90, 0.94, 1.0)
    fill_obj = bpy.data.objects.new("FillArea", fill_data)
    fill_obj.location = (4.5, 5.5, 3.6)
    fill_obj.rotation_euler = (Vector((0, 0, 0.6)) - fill_obj.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.collection.objects.link(fill_obj)

    # Large matte studio floor
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=24.0)
    for v in bm.verts:
        v.co.z = -0.001
    floor_mesh = bpy.data.meshes.new("StudioFloor")
    bm.to_mesh(floor_mesh)
    bm.free()

    floor_mat = bpy.data.materials.new("FloorMat")
    if not floor_mat.node_tree:
        floor_mat.use_nodes = True
    bsdf = floor_mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = srgb_to_linear_rgba(hex_col("#8a8275"))
        bsdf.inputs["Roughness"].default_value = 0.95
    floor_mesh.materials.append(floor_mat)

    floor_obj = bpy.data.objects.new("StudioFloor", floor_mesh)
    bpy.context.collection.objects.link(floor_obj)

    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 42.0
    cam_obj = bpy.data.objects.new("PreviewCam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    return cam_obj


def aim_camera(cam_obj, pos: Vector, target: Vector, lens: float = 42.0):
    cam_obj.data.lens = lens
    cam_obj.location = pos
    cam_obj.rotation_euler = (target - pos).to_track_quat("-Z", "Y").to_euler()


def render_lineup_group(filename: str, ids: list, objs: dict, paul, cam_obj, pitch_deg: float = 22.0):
    for o in objs.values():
        o.hide_render = True
    if paul:
        paul.hide_render = False

    # Place Paul on the left (+X in front camera looking toward -Y) and props in a clean row
    widths = []
    for pid in ids:
        xs = [v.co.x for v in objs[pid].data.vertices]
        widths.append(max(0.55, max(xs) - min(xs)))

    gap = 0.34
    total_w = 0.85 + sum(w + gap for w in widths)
    cur_x = total_w * 0.5 - 0.35
    if paul:
        paul.location = (cur_x, 0.0, 0.0)
        paul.rotation_euler = (0.0, 0.0, 0.0)
    cur_x -= 0.72

    for pid, w in zip(ids, widths):
        cur_x -= w * 0.5
        o = objs[pid]
        o.hide_render = False
        o.location = (cur_x, 0.0, 0.0)
        o.rotation_euler = (0.0, 0.0, 0.0)
        cur_x -= w * 0.5 + gap

    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 540
    pitch = math.radians(pitch_deg)
    dist = max(7.8, total_w * 1.12)
    aim_camera(
        cam_obj,
        Vector((0.0, dist * math.cos(pitch), 0.72 + dist * math.sin(pitch))),
        Vector((0.0, 0.0, 0.65)),
        lens=36.0,
    )
    scene.render.filepath = os.path.join(RENDERS_DIR, filename)
    bpy.ops.render.render(write_still=True)


def render_all_game_grid(objs: dict, paul, cam_obj):
    """Render ALL 32 props + Paul in 4 neat rows at the exact 55-deg top-down 3/4 game camera angle."""
    rows = [
        ["workbench", "stool", "bicycle", "drum", "wheels", "cabinet", "parts", "tool_rack"],
        ["range", "table", "chair", "dresser", "basin", "wall_shelf", "firewood_basket", "coal_bucket"],
        ["crate", "crate_shallow", "crate_deep", "shelf", "barrel", "sacks", "crate_stack", "woodpile"],
        ["pump", "rug", "bench", "coat_rack", "cupboard", "plant", "leni_desk", "curtains"],
    ]
    for o in objs.values():
        o.hide_render = False
    if paul:
        paul.hide_render = False
        paul.location = (6.8, 0.6, 0.0)
        paul.rotation_euler = (0.0, 0.0, 0.0)

    row_ys = [3.5, 1.15, -1.2, -3.55]
    for r_idx, row in enumerate(rows):
        y = row_ys[r_idx]
        x = 5.2
        for pid in row:
            o = objs[pid]
            o.location = (x, y, 0.0)
            o.rotation_euler = (0.0, 0.0, 0.0)
            x -= 1.62

    scene = bpy.context.scene
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 960
    pitch = math.radians(55.0)
    dist = 18.2
    aim_camera(
        cam_obj,
        Vector((-0.2, dist * math.cos(pitch) + 0.1, 0.4 + dist * math.sin(pitch))),
        Vector((-0.2, -0.1, 0.35)),
        lens=34.0,
    )
    scene.render.filepath = os.path.join(RENDERS_DIR, "props_all_game.png")
    bpy.ops.render.render(write_still=True)


def render_scale_vignette(objs: dict, paul, cam_obj):
    """Close-up 55-deg game camera vignette showing Paul next to table, chair, workbench, stove, dresser & rug."""
    for o in objs.values():
        o.hide_render = True
    layout = [
        ("rug",             (0.0,  0.0,  0.0), 0.0),
        ("table",           (0.0,  0.0,  0.0), 0.0),
        ("chair",           (-1.05, 0.0, 0.0), -math.pi / 2),
        ("workbench",       (2.15, -1.35, 0.0), 0.0),
        ("stool",           (1.30, -0.45, 0.0), 0.0),
        ("range",           (-1.85, -1.35, 0.0), 0.0),
        ("firewood_basket", (-0.90, -1.35, 0.0), 0.0),
        ("dresser",         (-2.75, 0.05, 0.0), -math.pi / 2),
        ("plant",           (2.85, -0.05, 0.0), 0.0),
    ]
    for pid, loc, rz in layout:
        o = objs[pid]
        o.hide_render = False
        o.location = loc
        o.rotation_euler = (0.0, 0.0, rz)

    if paul:
        paul.hide_render = False
        paul.location = (0.85, 0.55, 0.0)
        paul.rotation_euler = (0.0, 0.0, math.radians(-20))

    scene = bpy.context.scene
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 760
    pitch = math.radians(55.0)
    dist = 8.2
    aim_camera(
        cam_obj,
        Vector((0.0, dist * math.cos(pitch), 0.45 + dist * math.sin(pitch))),
        Vector((0.0, -0.35, 0.42)),
        lens=36.0,
    )
    scene.render.filepath = os.path.join(RENDERS_DIR, "props_scale_game.png")
    bpy.ops.render.render(write_still=True)


# ---------------------------------------------------------------------------
# Main execution
# ---------------------------------------------------------------------------
def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mat = create_vertex_color_material()
    cam_obj = setup_render_studio()

    objs = {}
    stats = []

    for prop_id, builder_fn in PROPS:
        obj = builder_fn(mat)
        tris = count_triangles(obj.data)
        xs = [v.co.x for v in obj.data.vertices]
        ys = [v.co.y for v in obj.data.vertices]
        zs = [v.co.z for v in obj.data.vertices]
        w = max(xs) - min(xs)
        d = max(ys) - min(ys)
        h = max(zs) - min(zs)

        glb_name = f"prop_{prop_id}.glb"
        glb_path = os.path.join(MODELS_DIR, glb_name)
        export_prop_glb(obj, glb_path)

        objs[prop_id] = obj
        stats.append({
            "id": prop_id,
            "file": glb_name,
            "tris": tris,
            "size_m": (round(w, 2), round(h, 2), round(d, 2)),
            "bytes": os.path.getsize(glb_path),
        })

    paul = import_paul_reference()

    # Render preview sheets
    render_lineup_group("props_lineup_1_workshop_yard.png",
                        ["workbench", "stool", "bicycle", "drum", "wheels", "cabinet", "parts", "woodpile", "pump"],
                        objs, paul, cam_obj, pitch_deg=18.0)
    render_lineup_group("props_lineup_2_kitchen_cellar.png",
                        ["range", "table", "chair", "dresser", "basin", "crate", "crate_shallow", "crate_deep", "shelf", "barrel", "sacks"],
                        objs, paul, cam_obj, pitch_deg=18.0)
    render_lineup_group("props_lineup_3_dressing.png",
                        ["rug", "bench", "coat_rack", "cupboard", "tool_rack", "wall_shelf", "firewood_basket", "coal_bucket", "crate_stack", "plant", "leni_desk", "curtains"],
                        objs, paul, cam_obj, pitch_deg=18.0)
    render_all_game_grid(objs, paul, cam_obj)
    render_scale_vignette(objs, paul, cam_obj)

    print("\n=== T4 PROPS GENERATION SUMMARY ===")
    out_of_budget = []
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
        assert abs(ymin) < 1e-4, f"Not grounded at Y=0: {s['file']} ({ymin})"
        flag = ""
        if glb_tris < 300 or glb_tris > 1500:
            flag = " [OUT OF 300-1500 BUDGET]"
            out_of_budget.append((s["file"], glb_tris))
        w, h, d = s["size_m"]
        print(
            f"  {s['file']:24s} | tris={glb_tris:4d} | WxHxD={w:.2f}x{h:.2f}x{d:.2f}m | "
            f"Y=[{ymin:+.4f},{ymax:.3f}] | COLOR_0=OK | {s['bytes']//1024:3d} KB{flag}"
        )
    print(f"Total prop GLBs exported & verified: {len(stats)}")
    if out_of_budget:
        print("WARNING out of budget:", out_of_budget)


if __name__ == "__main__":
    main()
