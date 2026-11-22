"""
Blender reference-still generator for Google Flow cinematics kit (Task T3).

Run headless:
    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python art-src/blender/make_flow_refs.py

Outputs (1920x1080 PNG stills in flow-kit/ch1-topdown/refs/):
  1. Cast lineup (all 7 characters, neutral studio light):
     - ref_cast_lineup.png
  2. Character turnaround sheets (Front / 3/4 Front / 3/4 Back):
     - ref_char_paul.png
     - ref_char_helena.png
     - ref_char_leni.png          (includes Leni regular + Leni with school satchel)
     - ref_char_otto.png
     - ref_char_police.png
  3. House architecture & interiors (using real T4 game props):
     - ref_house_exterior.png     (1933 Silesian house-with-workshop street view)
     - ref_house_interior.png     (workshop + kitchen cutaway interior)
  4. Cinematic cut keyframes (using real T1 characters + T4 props):
     - ref_cut_1_intro_street.png     (Cut 1: quiet summer morning exterior)
     - ref_cut_2_intro_workshop.png   (Cut 2: morning inside workshop — Paul, Leni, Helena)
     - ref_cut_3_knock.png            (Cut 3: Otto Becker & two policemen at the door/gate)
     - ref_cut_4_outro_leni.png       (Cut 4: golden dusk — Leni by gatepost with satchel)
     - ref_cut_5_outro_home.png       (Cut 5: dusk — Paul & Leni walking back in, Helena at door)
     - ref_cut_6_arrest.png           (Cut 6: alternate dusk — policemen escorting Paul away)
"""

import math
import os
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
MODELS_DIR = os.path.join(REPO_ROOT, "godot", "assets", "models")
REFS_DIR = os.path.join(REPO_ROOT, "flow-kit", "ch1-topdown", "refs")
os.makedirs(REFS_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Color utilities & Low-Poly BMesh Builder (matches T1/T4 look)
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


PAL = {
    "brick_warm":   hex_col("#8c4a38"),
    "brick_dark":   hex_col("#6e382a"),
    "brick_mortar": hex_col("#a69b88"),
    "plaster":      hex_col("#ded4be"),
    "plaster_warm": hex_col("#d4c7ac"),
    "plaster_trim": hex_col("#c2b59c"),
    "timber_dark":  hex_col("#4c3624"),
    "timber_mid":   hex_col("#6c4f35"),
    "timber_light": hex_col("#8f6f4b"),
    "roof_tile":    hex_col("#7f3e2e"),
    "roof_dark":    hex_col("#622f23"),
    "cobble_a":     hex_col("#7b756b"),
    "cobble_b":     hex_col("#69635a"),
    "cobble_c":     hex_col("#8b8478"),
    "dirt_lane":    hex_col("#85755e"),
    "grass_mid":    hex_col("#5d7048"),
    "grass_dark":   hex_col("#475838"),
    "hill_near":    hex_col("#526847"),
    "hill_far":     hex_col("#6b7f74"),
    "tree_trunk":   hex_col("#4f3b2b"),
    "foliage_a":    hex_col("#4b633c"),
    "foliage_b":    hex_col("#5d7747"),
    "window_glass": hex_col("#5c7684"),
    "window_warm":  hex_col("#e0b26c"),
    "window_frame": hex_col("#ebe4d3"),
    "door_wood":    hex_col("#5b412c"),
    "gate_wood":    hex_col("#6c5136"),
    "iron_dark":    hex_col("#2d3035"),
    "floor_wood_a": hex_col("#7e5c3e"),
    "floor_wood_b": hex_col("#705036"),
    "floor_wood_c": hex_col("#8c6848"),
    "tile_light":   hex_col("#cfc6b4"),
    "tile_dark":    hex_col("#8c8376"),
    "kitchen_wall": hex_col("#c8c6ba"),
    "photo_frame":  hex_col("#453121"),
    "photo_sepia":  hex_col("#9e8769"),
    "sign_board":   hex_col("#58422e"),
}


class SetBuilder:
    """Lightweight flat-shaded vertex-coloured set builder matching T1/T4."""

    def __init__(self, name: str):
        self.name = name
        self.bm = bmesh.new()
        self.face_colors = {}

    def _color_faces(self, faces, srgb: tuple, grad_axis=None, grad_range=None, grad_lo=0.92, grad_hi=1.05):
        for f in faces:
            col = srgb
            if grad_axis is not None and grad_range is not None:
                c = f.calc_center_median()
                val = c[grad_axis]
                lo, hi = grad_range
                t = 0.5 if hi <= lo else max(0.0, min(1.0, (val - lo) / (hi - lo)))
                col = shade_srgb(srgb, grad_lo + (grad_hi - grad_lo) * t)
            self.face_colors[f] = srgb_to_linear_rgba(col)

    def add_box(self, size, pos, rot_euler=(0.0, 0.0, 0.0), color=(0.7, 0.7, 0.7), bevel=0.0):
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
            res = bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, segments=1, profile=0.5, affect="EDGES", clamp_overlap=True)
            verts = [v for v in (set(verts) | set(res.get("verts", []))) if v.is_valid]
            faces = list({f for v in verts for f in v.link_faces if f.is_valid})
        mat = Matrix.Translation(pos) @ Euler(rot_euler, "XYZ").to_matrix().to_4x4()
        bmesh.ops.transform(self.bm, matrix=mat, verts=verts)
        zs = [v.co.z for v in verts]
        self._color_faces(faces, color, grad_axis=2, grad_range=(min(zs), max(zs)))
        return faces

    def add_prism_roof(self, width, depth, ridge_h, pos, color):
        """Gabled triangular prism centred in XY, base at pos.z."""
        cx, cy, cz = pos
        hw, hd = width * 0.5, depth * 0.5
        v0 = self.bm.verts.new((cx - hw, cy - hd, cz))
        v1 = self.bm.verts.new((cx + hw, cy - hd, cz))
        v2 = self.bm.verts.new((cx + hw, cy + hd, cz))
        v3 = self.bm.verts.new((cx - hw, cy + hd, cz))
        r0 = self.bm.verts.new((cx - hw, cy, cz + ridge_h))
        r1 = self.bm.verts.new((cx + hw, cy, cz + ridge_h))
        faces = [
            self.bm.faces.new((v3, v2, r1, r0)),  # front slope (+Y)
            self.bm.faces.new((v1, v0, r0, r1)),  # back slope (-Y)
            self.bm.faces.new((v0, v3, r0)),      # left gable
            self.bm.faces.new((v2, v1, r1)),      # right gable
            self.bm.faces.new((v0, v1, v2, v3)),  # underside
        ]
        self._color_faces(faces, color, grad_axis=2, grad_range=(cz, cz + ridge_h), grad_lo=0.88, grad_hi=1.08)
        return faces

    def add_sphere(self, radii, pos, color, u_segs=8, v_segs=5):
        rx, ry, rz = radii
        ret = bmesh.ops.create_uvsphere(self.bm, u_segments=u_segs, v_segments=v_segs, radius=1.0)
        verts = ret["verts"]
        for v in verts:
            v.co.x *= rx
            v.co.y *= ry
            v.co.z *= rz
        bmesh.ops.transform(self.bm, matrix=Matrix.Translation(pos), verts=verts)
        faces = list({f for v in verts for f in v.link_faces})
        zs = [v.co.z for v in verts]
        self._color_faces(faces, color, grad_axis=2, grad_range=(min(zs), max(zs)), grad_lo=0.84, grad_hi=1.10)
        return faces

    def add_tree(self, pos, scale=1.0):
        x, y, z = pos
        self.add_box((0.28 * scale, 0.28 * scale, 1.8 * scale), (x, y, z + 0.9 * scale), color=PAL["tree_trunk"], bevel=0.05 * scale)
        self.add_sphere((1.15 * scale, 1.05 * scale, 1.05 * scale), (x, y, z + 2.5 * scale), PAL["foliage_a"], u_segs=8, v_segs=5)
        self.add_sphere((0.85 * scale, 0.85 * scale, 0.85 * scale), (x + 0.55 * scale, y - 0.25 * scale, z + 2.95 * scale), PAL["foliage_b"], u_segs=7, v_segs=4)
        self.add_sphere((0.75 * scale, 0.75 * scale, 0.78 * scale), (x - 0.55 * scale, y + 0.25 * scale, z + 2.25 * scale), PAL["foliage_b"], u_segs=7, v_segs=4)

    def finalize(self, mat):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.faces.ensure_lookup_table()
        default_col = srgb_to_linear_rgba((0.7, 0.7, 0.7))
        fcols = [self.face_colors.get(f, default_col) for f in self.bm.faces]
        self.bm.free()

        for poly in mesh.polygons:
            poly.use_smooth = False
        ca = mesh.color_attributes.new(name="COLOR_0", type="BYTE_COLOR", domain="CORNER")
        mesh.color_attributes.active_color = ca
        mesh.color_attributes.render_color_index = 0
        for idx, poly in enumerate(mesh.polygons):
            rgba = fcols[idx]
            for li in poly.loop_indices:
                ca.data[li].color = rgba

        mesh.materials.append(mat)
        mesh.update()
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.collection.objects.link(obj)
        return obj


def create_vc_material(name="Mat_FlowVC"):
    mat = bpy.data.materials.new(name=name)
    if not mat.node_tree:
        mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out_node = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = 0.86
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.22
    vc = nt.nodes.new("ShaderNodeVertexColor")
    vc.layer_name = "COLOR_0"
    nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])
    return mat


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    if hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 24
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.0
    cam_data = bpy.data.cameras.new("Cam")
    cam_obj = bpy.data.objects.new("Cam", cam_data)
    bpy.context.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    return scene, cam_obj, create_vc_material()


def aim_camera(cam_obj, pos, target, lens=42.0):
    cam_obj.data.lens = lens
    cam_obj.location = Vector(pos)
    cam_obj.rotation_euler = (Vector(target) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()


def set_world(scene, hex_color: str, strength: float = 0.85):
    world = bpy.data.worlds.new("World")
    scene.world = world
    if not world.node_tree:
        world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (*srgb_to_linear_rgba(hex_col(hex_color))[:3], 1.0)
        bg.inputs[1].default_value = strength


def add_sun(name, energy, color, rot_deg):
    ld = bpy.data.lights.new(name, type="SUN")
    ld.energy = energy
    ld.color = color
    lo = bpy.data.objects.new(name, ld)
    lo.rotation_euler = Euler(tuple(math.radians(a) for a in rot_deg), "XYZ")
    bpy.context.collection.objects.link(lo)
    return lo


def add_area(name, energy, size, color, pos, target):
    ld = bpy.data.lights.new(name, type="AREA")
    ld.energy = energy
    ld.size = size
    ld.color = color
    lo = bpy.data.objects.new(name, ld)
    lo.location = Vector(pos)
    lo.rotation_euler = (Vector(target) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    bpy.context.collection.objects.link(lo)
    return lo


def add_point(name, energy, color, pos, radius=0.35):
    ld = bpy.data.lights.new(name, type="POINT")
    ld.energy = energy
    ld.color = color
    ld.shadow_soft_size = radius
    lo = bpy.data.objects.new(name, ld)
    lo.location = Vector(pos)
    bpy.context.collection.objects.link(lo)
    return lo


def import_glb(filename: str, pos=(0.0, 0.0, 0.0), rot_z_deg=0.0, scale=1.0):
    """Import a T1 character or T4 prop GLB, grounded at Z=pos[2], facing +Y when rot_z_deg=0."""
    path = os.path.join(MODELS_DIR, filename)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    added = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in added if o.type == "MESH"]
    obj = meshes[0]
    mw = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = mw
    for o in added:
        if o != obj:
            bpy.data.objects.remove(o, do_unlink=True)
    # Apply existing import rotation/scale into mesh data so location/rotation_euler are clean
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.rotation_mode = "XYZ"
    obj.location = Vector(pos)
    obj.rotation_euler = Euler((0.0, 0.0, math.radians(rot_z_deg)), "XYZ")
    obj.scale = Vector((scale, scale, scale))
    return obj


def add_studio_backdrop(mat, floor_hex="#7f796f"):
    sb = SetBuilder("StudioBackdrop")
    sb.add_box((26.0, 26.0, 0.1), (0.0, 0.0, -0.05), color=hex_col(floor_hex))
    return sb.finalize(mat)


def render_to(scene, filename: str):
    out_path = os.path.join(REFS_DIR, filename)
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print(f"  rendered -> flow-kit/ch1-topdown/refs/{filename}")


# ---------------------------------------------------------------------------
# 1. CAST LINEUP (All 7 characters, front view, neutral studio light)
# ---------------------------------------------------------------------------
def render_cast_lineup():
    scene, cam, mat = clear_scene()
    set_world(scene, "#858078", 0.85)
    add_studio_backdrop(mat, "#7b766d")
    add_sun("Key", 2.2, (1.0, 0.98, 0.95), (38, 15, -155))
    add_area("Fill", 180.0, 5.0, (0.94, 0.96, 1.0), (4.0, 4.5, 2.4), (0.0, 0.0, 0.9))
    add_area("Rim", 130.0, 4.5, (1.0, 0.98, 0.94), (-3.0, -3.5, 2.8), (0.0, 0.0, 0.9))

    cast = [
        "chr_paul.glb",
        "chr_helena.glb",
        "chr_leni_bag.glb",
        "chr_otto.glb",
        "chr_police.glb",
        "chr_police2.glb",
        "chr_uncle.glb",
    ]
    spacing = 0.92
    start_x = 0.5 * (len(cast) - 1) * spacing
    for i, glb in enumerate(cast):
        import_glb(glb, pos=(start_x - i * spacing, 0.0, 0.0), rot_z_deg=0.0)

    aim_camera(cam, (0.0, 7.6, 1.05), (0.0, 0.0, 0.92), lens=44.0)
    render_to(scene, "ref_cast_lineup.png")


# ---------------------------------------------------------------------------
# 2. CHARACTER TURNAROUND SHEETS (Front + 3/4 Front + 3/4 Back)
# ---------------------------------------------------------------------------
def render_char_turnaround(out_name: str, glb_list):
    """
    glb_list: list of (glb_filename, rot_z_deg) placed left-to-right in neutral studio light.
    """
    scene, cam, mat = clear_scene()
    set_world(scene, "#88837b", 0.85)
    add_studio_backdrop(mat, "#7c776e")
    add_sun("Key", 2.2, (1.0, 0.97, 0.94), (36, 18, -152))
    add_area("Fill", 150.0, 4.5, (0.93, 0.96, 1.0), (3.5, 4.2, 2.2), (0.0, 0.0, 0.9))
    add_area("Rim", 110.0, 4.0, (1.0, 0.97, 0.93), (-2.5, -3.0, 2.5), (0.0, 0.0, 0.9))

    n = len(glb_list)
    spacing = 1.05 if n <= 3 else 0.88
    start_x = 0.5 * (n - 1) * spacing
    max_h = 1.75
    for i, (glb, rz) in enumerate(glb_list):
        o = import_glb(glb, pos=(start_x - i * spacing, 0.0, 0.0), rot_z_deg=rz)
        zs = [v.co.z for v in o.data.vertices]
        max_h = max(max_h, max(zs) - min(zs))

    # For Leni (1.05m) vs adults, frame cleanly with generous side margins for 3 or 4 poses!
    is_child = all("leni" in g for g, _ in glb_list)
    if is_child:
        dist = 4.65 if n >= 4 else 3.85
        cz = 0.55
    else:
        dist = 6.15 if n >= 4 else 5.15
        cz = 0.92
    aim_camera(cam, (0.0, dist, cz + 0.12), (0.0, 0.0, cz), lens=44.0)
    render_to(scene, out_name)


# ---------------------------------------------------------------------------
# 3A. EXTERIOR ARCHITECTURE SET (Small 1933 Silesian House & Bicycle Workshop)
# ---------------------------------------------------------------------------
def build_exterior_set(mat, warm_windows=False):
    sb = SetBuilder("SilesianHouseExterior")
    win_col = PAL["window_warm"] if warm_windows else PAL["window_glass"]

    # Ground plane: grassy verge + cobblestone village lane + stone yard
    sb.add_box((46.0, 40.0, 0.2), (0.0, 4.0, -0.10), color=PAL["grass_mid"])
    # Cobblestone village street in foreground (+Y from y=4.6 to y=11.0)
    sb.add_box((32.0, 6.2, 0.08), (0.0, 7.6, -0.02), color=PAL["cobble_b"])
    # Individual subtle low-poly cobble & yard stone tiles for tactile 1930s texture
    for row in range(12):
        for col in range(22):
            cx = -10.5 + col * 1.0 + (0.45 if row % 2 else 0.0)
            cy = 0.4 + row * 0.82
            c = PAL["cobble_a"] if (row + col) % 3 == 0 else (PAL["cobble_c"] if (row + col) % 3 == 1 else PAL["cobble_b"])
            sb.add_box((0.86, 0.72, 0.05), (cx, cy, 0.01 + ((row * 7 + col * 11) % 3) * 0.005), color=c, bevel=0.02)

    # Distant rolling green Silesian mountain hills (back -Y)
    sb.add_sphere((14.0, 5.5, 4.4), (-9.0, -14.0, -0.4), PAL["hill_near"], u_segs=10, v_segs=5)
    sb.add_sphere((16.0, 6.0, 5.4), (9.5, -16.0, -0.6), PAL["hill_far"], u_segs=10, v_segs=5)
    sb.add_sphere((12.0, 5.0, 3.8), (0.5, -12.5, -0.5), PAL["hill_near"], u_segs=10, v_segs=5)

    # Main House + Bicycle Workshop building (centred at x=0, front wall at y=0.0, depth 6.2m back to y=-6.2)
    HW, HD, HH = 9.4, 6.2, 3.6
    # Stone plinth foundation
    sb.add_box((HW + 0.16, HD + 0.16, 0.55), (0.0, -HD * 0.5, 0.275), color=PAL["cobble_b"], bevel=0.02)
    # Lower red-brick facade band (matching tex_wall_facade!) + warm plaster upper wall
    sb.add_box((HW, HD, 1.35), (0.0, -HD * 0.5, 1.22), color=PAL["brick_warm"], bevel=0.02)
    sb.add_box((HW, HD, 1.75), (0.0, -HD * 0.5, 2.75), color=PAL["plaster"], bevel=0.02)
    # Half-timbered Silesian beam accents on facade
    sb.add_box((HW + 0.08, 0.16, 0.16), (0.0, 0.02, 1.90), color=PAL["timber_dark"])
    sb.add_box((HW + 0.08, 0.16, 0.18), (0.0, 0.02, 3.55), color=PAL["timber_dark"])
    for tx in (-4.6, -2.2, 1.4, 4.6):
        sb.add_box((0.18, 0.16, 1.75), (tx, 0.02, 2.72), color=PAL["timber_dark"])

    # Steep clay-tile pitched gable roof + eaves + brick chimney
    sb.add_prism_roof(HW + 0.9, HD + 1.0, 2.65, (0.0, -HD * 0.5, HH - 0.05), PAL["roof_tile"])
    # Roof ridge beam
    sb.add_box((HW + 0.95, 0.24, 0.22), (0.0, -HD * 0.5, HH + 2.60), color=PAL["roof_dark"])
    # Brick kitchen chimney on right
    sb.add_box((0.85, 0.85, 2.3), (2.8, -2.2, HH + 1.85), color=PAL["brick_dark"], bevel=0.03)
    sb.add_box((1.02, 1.02, 0.18), (2.8, -2.2, HH + 3.00), color=PAL["cobble_a"], bevel=0.02)

    # Recessed wooden front door (workshop entrance at x=-0.4, y=0.0)
    dx = -0.4
    sb.add_box((1.28, 0.26, 2.28), (dx, 0.02, 1.18), color=PAL["timber_dark"], bevel=0.02)
    sb.add_box((1.06, 0.14, 2.12), (dx, -0.02, 1.12), color=PAL["door_wood"], bevel=0.02)
    sb.add_box((1.55, 0.65, 0.16), (dx, 0.30, 0.08), color=PAL["cobble_c"], bevel=0.02)  # doorstep
    # Small wooden canopy overhang above door
    sb.add_box((1.70, 0.72, 0.12), (dx, 0.34, 2.42), rot_euler=(math.radians(14), 0.0, 0.0), color=PAL["roof_dark"])
    # Plain weathered wooden workshop signboard above workshop window (NO text/letters!)
    sb.add_box((2.10, 0.10, 0.42), (-2.65, 0.12, 2.95), color=PAL["sign_board"], bevel=0.015)

    # 3 leaded windows with white frames, proud glass panes, mullions & shutters
    for wx in (-3.25, 1.85, 3.55):
        sb.add_box((1.18, 0.12, 1.26), (wx, 0.02, 2.02), color=PAL["window_frame"], bevel=0.012)
        sb.add_box((0.98, 0.08, 1.06), (wx, 0.08, 2.02), color=win_col)
        # Window mullions sitting cleanly in front of glass
        sb.add_box((0.055, 0.05, 1.08), (wx, 0.125, 2.02), color=PAL["window_frame"])
        sb.add_box((1.00, 0.05, 0.055), (wx, 0.125, 2.02), color=PAL["window_frame"])
        # Stone sill + dark green wooden shutters
        sb.add_box((1.28, 0.24, 0.10), (wx, 0.09, 1.37), color=PAL["cobble_c"], bevel=0.015)
        for sx in (-0.75, 0.75):
            sb.add_box((0.32, 0.08, 1.18), (wx + sx, 0.07, 2.02), color=PAL["grass_dark"], bevel=0.01)

    # Low brick front garden wall at y = 4.4 with arched wooden gate opening centred at x = -0.4
    gw_y = 4.4
    # Left wall segment (x = -5.6 to -1.3)
    sb.add_box((4.3, 0.38, 1.32), (-3.45, gw_y, 0.66), color=PAL["brick_warm"], bevel=0.02)
    sb.add_box((4.4, 0.46, 0.12), (-3.45, gw_y, 1.36), color=PAL["cobble_a"], bevel=0.02)
    # Right wall segment (x = 0.5 to 5.6)
    sb.add_box((5.1, 0.38, 1.32), (3.05, gw_y, 0.66), color=PAL["brick_warm"], bevel=0.02)
    sb.add_box((5.2, 0.46, 0.12), (3.05, gw_y, 1.36), color=PAL["cobble_a"], bevel=0.02)
    # Two taller brick gateposts framing the entrance (x=-1.25 and x=0.45)
    for gx in (-1.22, 0.42):
        sb.add_box((0.46, 0.48, 1.62), (gx, gw_y, 0.81), color=PAL["brick_dark"], bevel=0.02)
        sb.add_box((0.56, 0.58, 0.14), (gx, gw_y, 1.66), color=PAL["cobble_c"], bevel=0.02)
    # Side yard garden walls connecting house to front wall
    sb.add_box((0.36, 4.6, 1.32), (-5.45, 2.2, 0.66), color=PAL["brick_warm"], bevel=0.02)
    sb.add_box((0.36, 4.6, 1.32), (5.45, 2.2, 0.66), color=PAL["brick_warm"], bevel=0.02)
    # Wooden slatted garden gate swung slightly open inward
    sb.add_box((1.15, 0.10, 1.24), (-0.86, gw_y - 0.55, 0.66), rot_euler=(0.0, 0.0, math.radians(-68)),
               color=PAL["gate_wood"], bevel=0.015)

    # Neighboring cottage silhouette further down the village lane (left & right background)
    sb.add_box((6.5, 5.2, 3.2), (-10.2, -3.5, 1.6), color=PAL["plaster_warm"])
    sb.add_prism_roof(7.0, 5.8, 2.3, (-10.2, -3.5, 3.15), PAL["roof_dark"])
    sb.add_box((6.2, 5.0, 3.0), (10.4, -4.0, 1.5), color=PAL["plaster_trim"])
    sb.add_prism_roof(6.8, 5.6, 2.2, (10.4, -4.0, 2.95), PAL["roof_tile"])

    # Village trees framing the house
    sb.add_tree((-6.6, -0.5, 0.0), scale=1.25)
    sb.add_tree((6.8, 0.8, 0.0), scale=1.15)
    sb.add_tree((-7.8, 4.8, 0.0), scale=0.90)
    sb.add_tree((7.6, -5.5, 0.0), scale=1.35)

    env_obj = sb.finalize(mat)

    # Dress the yard with real T4 props!
    import_glb("prop_pump.glb", pos=(-4.4, 2.0, 0.0), rot_z_deg=-90)
    import_glb("prop_barrel.glb", pos=(-4.4, 3.2, 0.0), rot_z_deg=-90)
    import_glb("prop_woodpile.glb", pos=(4.5, 2.2, 0.0), rot_z_deg=90)
    import_glb("prop_bench.glb", pos=(-2.4, 0.55, 0.0), rot_z_deg=0)
    import_glb("prop_bicycle.glb", pos=(2.1, 0.75, 0.0), rot_z_deg=-12)
    import_glb("prop_plant.glb", pos=(0.55, 0.55, 0.0), rot_z_deg=0)
    return env_obj


# ---------------------------------------------------------------------------
# 3B. INTERIOR SET (Workshop + Kitchen cutaway using real T4 game props)
# ---------------------------------------------------------------------------
def build_interior_set(mat):
    sb = SetBuilder("WagnerInteriorSet")

    # Workshop warm aged wood floorboards (x in [-4.5, 1.5], y in [-3.0, 2.8])
    for i in range(28):
        py = -2.9 + i * 0.21
        c = PAL["floor_wood_a"] if i % 3 == 0 else (PAL["floor_wood_b"] if i % 3 == 1 else PAL["floor_wood_c"])
        sb.add_box((6.2, 0.202, 0.06), (-1.5, py, -0.03), color=c)

    # Kitchen checkerboard stone tiles (x in [1.5, 6.2], y in [-2.6, 2.6])
    for ix in range(10):
        for iy in range(11):
            tx = 1.74 + ix * 0.48
            ty = -2.36 + iy * 0.48
            c = PAL["tile_light"] if (ix + iy) % 2 == 0 else PAL["tile_dark"]
            sb.add_box((0.475, 0.475, 0.06), (tx, ty, -0.03), color=c)

    # Walls (height 2.55 m, north & west & east walls visible, south open for camera)
    WH = 2.55
    # Workshop north wall (y = -3.0, x = -4.6 to 1.6)
    sb.add_box((6.2, 0.24, WH), (-1.5, -3.05, WH * 0.5), color=PAL["plaster"])
    # Workshop west wall (x = -4.6, y = -3.1 to 2.9)
    sb.add_box((0.24, 6.0, WH), (-4.6, -0.1, WH * 0.5), color=PAL["plaster_warm"])
    # Dividing wall between workshop & kitchen at x = 1.55 with wide open doorway at y in [-0.3, 1.3]
    sb.add_box((0.24, 2.75, WH), (1.55, -1.72, WH * 0.5), color=PAL["plaster"])
    sb.add_box((0.24, 1.55, WH), (1.55, 2.08, WH * 0.5), color=PAL["plaster"])
    sb.add_box((0.26, 1.70, 0.52), (1.55, 0.50, WH - 0.26), color=PAL["plaster"])
    # Kitchen north wall (y = -2.6, x = 1.55 to 6.3) & east wall (x = 6.25)
    sb.add_box((4.8, 0.24, WH), (3.92, -2.65, WH * 0.5), color=PAL["kitchen_wall"])
    sb.add_box((0.24, 5.4, WH), (6.25, 0.0, WH * 0.5), color=PAL["kitchen_wall"])
    # Dark wood baseboards along visible walls
    sb.add_box((6.1, 0.06, 0.16), (-1.5, -2.92, 0.08), color=PAL["timber_dark"])
    sb.add_box((0.06, 5.9, 0.16), (-4.46, -0.1, 0.08), color=PAL["timber_dark"])
    sb.add_box((4.7, 0.06, 0.16), (3.92, -2.52, 0.08), color=PAL["timber_mid"])

    # Sunlit workshop north window (x=0.35, y=-2.93) + west window (x=-4.47, y=0.2)
    sb.add_box((1.22, 0.12, 1.18), (0.35, -2.94, 1.55), color=PAL["window_frame"])
    sb.add_box((1.06, 0.14, 1.02), (0.35, -2.93, 1.55), color=PAL["window_warm"])
    sb.add_box((0.05, 0.16, 1.04), (0.35, -2.92, 1.55), color=PAL["window_frame"])
    sb.add_box((1.08, 0.16, 0.05), (0.35, -2.92, 1.55), color=PAL["window_frame"])

    sb.add_box((0.12, 1.22, 1.18), (-4.47, 0.2, 1.55), color=PAL["window_frame"])
    sb.add_box((0.14, 1.06, 1.02), (-4.46, 0.2, 1.55), color=PAL["window_warm"])

    # Framed family photograph hanging on north workshop wall (x=-1.65, y=-2.92)
    sb.add_box((0.52, 0.05, 0.42), (-1.65, -2.91, 1.62), color=PAL["photo_frame"], bevel=0.01)
    sb.add_box((0.40, 0.06, 0.30), (-1.65, -2.90, 1.62), color=PAL["photo_sepia"])

    # Back kitchen door on east wall (x=6.12, y=0.6)
    sb.add_box((0.14, 1.05, 2.05), (6.12, 0.6, 1.025), color=PAL["door_wood"], bevel=0.015)

    env_obj = sb.finalize(mat)

    # Real T4 workshop props
    import_glb("prop_workbench.glb", pos=(-0.15, -2.42, 0.0), rot_z_deg=0)
    import_glb("prop_stool.glb", pos=(-1.28, -1.85, 0.0), rot_z_deg=0)
    import_glb("prop_bicycle.glb", pos=(-3.15, -2.25, 0.0), rot_z_deg=8)
    import_glb("prop_tool_rack.glb", pos=(-2.95, -2.84, 0.85), rot_z_deg=0)
    import_glb("prop_curtains.glb", pos=(0.35, -2.86, 1.05), rot_z_deg=0)
    import_glb("prop_curtains.glb", pos=(-4.38, 0.20, 1.05), rot_z_deg=-90)
    import_glb("prop_drum.glb", pos=(-4.02, -1.15, 0.0), rot_z_deg=0)
    import_glb("prop_plant.glb", pos=(-4.05, -0.25, 0.0), rot_z_deg=-90)
    import_glb("prop_leni_desk.glb", pos=(-3.88, 1.35, 0.0), rot_z_deg=-90)
    import_glb("prop_wheels.glb", pos=(-3.65, 2.35, 0.0), rot_z_deg=165)
    import_glb("prop_rug.glb", pos=(-3.15, 1.35, 0.0), rot_z_deg=0)
    import_glb("prop_rug.glb", pos=(0.05, -0.55, 0.0), rot_z_deg=0)
    import_glb("prop_cupboard.glb", pos=(1.12, -1.45, 0.0), rot_z_deg=90)
    import_glb("prop_cabinet.glb", pos=(1.12, 1.85, 0.0), rot_z_deg=90)

    # Real T4 kitchen props
    import_glb("prop_coal_bucket.glb", pos=(2.05, -2.18, 0.0), rot_z_deg=0)
    import_glb("prop_range.glb", pos=(3.10, -2.10, 0.0), rot_z_deg=0)
    import_glb("prop_firewood_basket.glb", pos=(4.05, -2.12, 0.0), rot_z_deg=0)
    import_glb("prop_wall_shelf.glb", pos=(4.80, -2.38, 1.22), rot_z_deg=0)
    import_glb("prop_dresser.glb", pos=(5.80, -1.45, 0.0), rot_z_deg=90)
    import_glb("prop_rug.glb", pos=(3.85, 0.40, 0.0), rot_z_deg=0)
    import_glb("prop_table.glb", pos=(3.85, 0.40, 0.0), rot_z_deg=0)
    import_glb("prop_chair.glb", pos=(2.85, 0.40, 0.0), rot_z_deg=-90)
    import_glb("prop_chair.glb", pos=(3.85, 1.25, 0.0), rot_z_deg=180)
    import_glb("prop_chair.glb", pos=(4.85, 0.40, 0.0), rot_z_deg=90)
    import_glb("prop_basin.glb", pos=(5.10, 2.05, 0.0), rot_z_deg=180)

    return env_obj


# ---------------------------------------------------------------------------
# Render all House & Keyframe shots
# ---------------------------------------------------------------------------
def render_house_exterior():
    scene, cam, mat = clear_scene()
    set_world(scene, "#a8bfd0", 0.92)  # Clear Silesian summer sky
    add_sun("Sun", 3.1, (1.0, 0.95, 0.85), (42, 22, -138))
    add_area("SkyFill", 260.0, 10.0, (0.86, 0.93, 1.0), (5.0, 11.0, 6.0), (0.0, 0.0, 1.5))
    build_exterior_set(mat, warm_windows=False)
    aim_camera(cam, (-5.8, 12.2, 3.6), (0.0, 0.2, 1.65), lens=34.0)
    render_to(scene, "ref_house_exterior.png")


def render_house_interior():
    scene, cam, mat = clear_scene()
    set_world(scene, "#28222a", 0.55)
    add_sun("WindowSun", 2.6, (1.0, 0.94, 0.82), (48, 25, -130))
    add_area("WarmRoom", 280.0, 6.5, (1.0, 0.92, 0.80), (0.5, 2.5, 4.2), (0.8, -0.5, 0.6))
    add_area("KitchenFill", 220.0, 5.0, (0.98, 0.93, 0.85), (4.0, 2.2, 3.6), (3.8, -0.2, 0.6))
    build_interior_set(mat)
    # High 3/4 cutaway view showing BOTH workshop and kitchen clearly!
    aim_camera(cam, (0.8, 7.6, 7.8), (0.8, -0.4, 0.65), lens=32.0)
    render_to(scene, "ref_house_interior.png")


def render_cut_1_intro_street():
    """Opening Shot 1: Quiet summer morning/noon cobblestone street outside the workshop."""
    scene, cam, mat = clear_scene()
    set_world(scene, "#b2c7d6", 0.95)
    add_sun("MorningSun", 3.3, (1.0, 0.94, 0.80), (34, 28, -124))
    add_area("SkyFill", 220.0, 10.0, (0.88, 0.93, 1.0), (4.0, 11.5, 5.5), (-0.4, 1.5, 1.3))
    build_exterior_set(mat, warm_windows=False)
    aim_camera(cam, (3.2, 11.2, 2.55), (-0.5, 1.0, 1.45), lens=36.0)
    render_to(scene, "ref_cut_1_intro_street.png")


def render_cut_2_intro_workshop():
    """Opening Shot 2: Morning inside workshop — Paul at workbench, Leni drawing, Helena watching."""
    scene, cam, mat = clear_scene()
    set_world(scene, "#2c2429", 0.50)
    add_sun("MorningBeam", 2.8, (1.0, 0.93, 0.78), (44, 30, -135))
    add_point("WindowGlowN", 160.0, (1.0, 0.94, 0.82), (0.35, -2.3, 1.65), radius=0.6)
    add_point("WindowGlowW", 120.0, (1.0, 0.94, 0.84), (-3.8, 0.2, 1.55), radius=0.6)
    add_area("SoftFill", 160.0, 5.0, (0.95, 0.90, 0.82), (-1.2, 3.0, 3.2), (-1.2, -1.2, 0.9))
    build_interior_set(mat)

    # Paul turned 3/4 toward his workbench & window
    import_glb("chr_paul.glb", pos=(-0.45, -1.55, 0.0), rot_z_deg=135)
    # Leni standing/drawing beside her little desk (clearly framed on right)
    import_glb("chr_leni.glb", pos=(-2.95, 1.15, 0.0), rot_z_deg=72)
    # Helena near kitchen doorway turning toward Paul (clearly framed on left)
    import_glb("chr_helena.glb", pos=(0.68, -0.25, 0.0), rot_z_deg=-65)

    aim_camera(cam, (-1.15, 5.25, 3.65), (-1.25, -0.75, 0.85), lens=32.0)
    render_to(scene, "ref_cut_2_intro_workshop.png")


def render_cut_3_knock():
    """Cut 3: Otto Becker and two Prussian policemen arriving at the workshop front door."""
    scene, cam, mat = clear_scene()
    set_world(scene, "#9aa5b0", 0.80)  # Slightly cooler, tense midday overcast light
    add_sun("HarshMidday", 2.9, (0.98, 0.96, 0.92), (50, 15, -162))
    add_area("CoolFill", 180.0, 8.0, (0.82, 0.88, 0.98), (-3.5, 9.5, 4.5), (-0.4, 2.2, 1.0))
    build_exterior_set(mat, warm_windows=False)

    # Policeman 1 stepping up to the front door, Otto Becker beside him, Policeman 2 advancing right behind
    import_glb("chr_police_w1.glb", pos=(-0.45, 1.25, 0.0), rot_z_deg=168)
    import_glb("chr_otto.glb", pos=(0.48, 1.55, 0.0), rot_z_deg=142)
    import_glb("chr_police2_w2.glb", pos=(-1.25, 2.15, 0.0), rot_z_deg=198)

    aim_camera(cam, (2.05, 5.65, 2.55), (-0.42, 1.25, 1.12), lens=35.0)
    render_to(scene, "ref_cut_3_knock.png")


def render_cut_4_outro_leni():
    """Ending Cut 4 (cut_1_outro.mp4): Golden dusk outside gate — Leni with satchel waiting quietly."""
    scene, cam, mat = clear_scene()
    set_world(scene, "#c48b63", 0.78)  # Warm Silesian golden dusk sky
    add_sun("DuskSun", 3.4, (1.0, 0.76, 0.48), (18, 35, -108))
    add_area("DuskSkyFill", 160.0, 8.0, (0.76, 0.80, 0.96), (3.0, 9.5, 4.5), (-0.4, 4.6, 0.8))
    build_exterior_set(mat, warm_windows=True)

    # Leni (with brown leather school satchel!) waiting beside the brick gatepost
    import_glb("chr_leni_bag.glb", pos=(-0.92, 5.05, 0.0), rot_z_deg=-24)
    # Paul emerging cleanly centered in the open gate gap behind her
    import_glb("chr_paul_w1.glb", pos=(-0.55, 2.75, 0.0), rot_z_deg=-10)

    aim_camera(cam, (0.95, 8.35, 1.52), (-0.52, 4.45, 0.78), lens=42.0)
    render_to(scene, "ref_cut_4_outro_leni.png")


def render_cut_5_outro_home():
    """Ending Cut 5: Dusk — Paul & Leni walking back into the house, Helena waiting at warm doorway."""
    scene, cam, mat = clear_scene()
    set_world(scene, "#8e665a", 0.68)  # Deeper warm amber-violet dusk
    add_sun("LowDusk", 2.8, (1.0, 0.70, 0.42), (14, 32, -102))
    add_point("DoorwayLantern", 180.0, (1.0, 0.82, 0.50), (-0.4, 0.70, 2.10), radius=0.4)
    add_area("TwilightFill", 150.0, 8.0, (0.72, 0.76, 0.95), (-4.0, 9.5, 4.2), (-0.4, 1.8, 1.0))
    build_exterior_set(mat, warm_windows=True)

    # Helena waiting warmly in the front doorway
    import_glb("chr_helena.glb", pos=(-0.42, 0.58, 0.0), rot_z_deg=6)
    # Paul & Leni (with satchel) walking side-by-side UP the cobblestone yard toward Helena (facing -Y = 180 deg)
    import_glb("chr_paul_w2.glb", pos=(0.08, 2.35, 0.0), rot_z_deg=168)
    import_glb("chr_leni_bag_w1.glb", pos=(-0.72, 2.45, 0.0), rot_z_deg=190)

    # Camera positioned cleanly INSIDE the front garden wall (y=4.05 < 4.4) so nothing blocks Paul, Leni, or Helena!
    aim_camera(cam, (-1.85, 4.05, 1.85), (-0.32, 1.35, 0.96), lens=32.0)
    render_to(scene, "ref_cut_5_outro_home.png")


def render_cut_6_arrest():
    """Alternate Ending Cut 6: Somber dusk — policemen escorting Paul away while Leni watches by gate."""
    scene, cam, mat = clear_scene()
    set_world(scene, "#636b7a", 0.65)  # Cool somber twilight
    add_sun("ColdDusk", 2.2, (0.95, 0.84, 0.72), (16, 28, -110))
    add_area("TwilightCool", 160.0, 8.0, (0.70, 0.78, 0.96), (3.5, 10.5, 4.5), (-0.4, 5.2, 1.0))
    build_exterior_set(mat, warm_windows=True)

    # Leni standing small beside gatepost turned toward the street watching Paul go
    import_glb("chr_leni_bag.glb", pos=(-1.05, 5.00, 0.0), rot_z_deg=55)
    import_glb("chr_helena.glb", pos=(-0.42, 1.40, 0.0), rot_z_deg=0)
    # Paul walking between the two policemen down the cobblestone street toward +X (facing +X = -90 deg)
    import_glb("chr_paul_w1.glb", pos=(1.35, 6.20, 0.0), rot_z_deg=-85)
    import_glb("chr_police_w2.glb", pos=(2.25, 5.95, 0.0), rot_z_deg=-85)
    import_glb("chr_police2_w1.glb", pos=(0.55, 6.50, 0.0), rot_z_deg=-85)

    aim_camera(cam, (-2.6, 10.2, 1.85), (0.65, 5.6, 1.05), lens=38.0)
    render_to(scene, "ref_cut_6_arrest.png")


def main():
    print("\n=== T3 FLOW CINEMATICS REFERENCE STILLS (1920x1080) ===")
    render_cast_lineup()

    render_char_turnaround("ref_char_paul.png", [
        ("chr_paul.glb", 0.0),
        ("chr_paul.glb", -42.0),
        ("chr_paul.glb", 142.0),
    ])
    render_char_turnaround("ref_char_helena.png", [
        ("chr_helena.glb", 0.0),
        ("chr_helena.glb", -42.0),
        ("chr_helena.glb", 142.0),
    ])
    render_char_turnaround("ref_char_leni.png", [
        ("chr_leni.glb", 0.0),
        ("chr_leni_bag.glb", 0.0),
        ("chr_leni_bag.glb", -42.0),
        ("chr_leni_bag.glb", 142.0),
    ])
    render_char_turnaround("ref_char_otto.png", [
        ("chr_otto.glb", 0.0),
        ("chr_otto.glb", -42.0),
        ("chr_otto.glb", 142.0),
    ])
    render_char_turnaround("ref_char_police.png", [
        ("chr_police.glb", 0.0),
        ("chr_police.glb", -42.0),
        ("chr_police2.glb", 0.0),
        ("chr_police.glb", 142.0),
    ])

    render_house_exterior()
    render_house_interior()

    render_cut_1_intro_street()
    render_cut_2_intro_workshop()
    render_cut_3_knock()
    render_cut_4_outro_leni()
    render_cut_5_outro_home()
    render_cut_6_arrest()

    print("All 14 Flow reference stills generated cleanly in flow-kit/ch1-topdown/refs/!")


if __name__ == "__main__":
    main()
