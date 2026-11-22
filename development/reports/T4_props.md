# T4 — House & Furniture as Low-Poly Blender Models

## Summary
Replaced all flat Codex picture-box furniture with 32 low-poly, flat-shaded, vertex-coloured (`COLOR_0`) Blender GLB models matching the T1 character style and 1930s Silesian earthy palette, dressed every room (workshop, kitchen, cellar, yard) to feel warm and lived-in while keeping all walkways and interaction spots clear, scaled and warmed the workshop wood floorboards, and fixed foreground wall cutaway artifacts in the cellar. Story, dialogue, interactions, branches, and endings are unchanged.

---

## 1. Blender Models (`art-src/blender/make_props.py` → `godot/assets/models/prop_*.glb`)

- **Style & conventions:** Single flat-shaded mesh per GLB, linear per-face `COLOR_0` vertex colours (Principled BSDF, no external textures), origin at floor centre (`Y = 0.0000` in GLB), front facing `-Z`, strictly within **300–1,500 triangles** each (`348–1,344` tris).
- **Scale:** Built at true **1:1 real-world metres** (`1 Blender unit = 1 m`, matching T1 Paul at `1.75 m`) and loaded in Godot at `Actor.MODEL_SCALE = 0.50` (`1.0` game unit = `2.0 m`). Table top sits at `0.78 m` (Paul's hip), chair seat at `0.46 m` (Paul's knee), workbench top at `0.86 m` (`0.43` game units), kitchen range cooktop at `0.86 m` (`0.43` game units).

### Gameplay / Existing Chapter 1 Props (20 GLBs)
| File | Description | Real Size (W×H×D m) | Tris |
|---|---|---:|---:|
| `prop_workbench.glb` | Heavy mechanic's bench with drawers, lower shelf, oil can, toolbox & cast-iron vice | 1.76 × 0.98 × 0.88 | 1,100 |
| `prop_stool.glb` | Round wooden workshop stool with splayed legs & ring stretcher | 0.40 × 0.50 × 0.39 | 456 |
| `prop_bicycle.glb` | 1930s Silesian steel roadster bicycle (spoked wheels, mudguards, rack, brass lamp) | 1.79 × 0.99 × 0.54 | 1,344 |
| `prop_drum.glb` | Corrugated olive-steel oil drum with brass bung & hand pump spout | 0.59 × 1.00 × 0.59 | 548 |
| `prop_wheels.glb` | Leaning pair of spoked spare bicycle wheels + bare rubber tyre | 1.00 × 0.69 × 0.46 | 872 |
| `prop_cabinet.glb` | Tall double-door wooden tool cabinet with lower drawers & top boxes | 1.04 × 1.86 × 0.54 | 648 |
| `prop_parts.glb` | Slatted wooden spare-parts crate brimming with gears, pipes & wrenches | 0.78 × 0.68 × 0.64 | 692 |
| `prop_range.glb` | Cream-enamel & cast-iron coal kitchen stove (`Kohlenherd`) with ember slit, skillet & stovepipe | 1.21 × 2.07 × 0.83 | 1,216 |
| `prop_table.glb` | Planked wooden kitchen table with drawer & striped linen table runner | 1.44 × 0.79 × 0.95 | 716 |
| `prop_chair.glb` | Spindled wooden kitchen chair with muted sage seat pad | 0.45 × 0.90 × 0.47 | 376 |
| `prop_dresser.glb` | Kitchen `Küchenbüfett` with lower doors, open counter & upper hutch with plates/bowls | 1.30 × 1.76 × 0.53 | 1,024 |
| `prop_basin.glb` | Wooden washstand with blue-rimmed enamel basin, water, pitcher, soap & towel | 0.91 × 1.04 × 0.56 | 702 |
| `prop_crate.glb` | Cellar slatted potato crate (undisturbed earth & potatoes) | 1.04 × 0.68 × 0.76 | 744 |
| `prop_crate_shallow.glb` | Potato crate dug shallow (messy soil heap, exposed wrapped corner & metal handle) | 1.04 × 0.71 × 0.76 | 706 |
| `prop_crate_deep.glb` | Potato crate dug deep (freshly tamped damp dark earth, neatly re-covered potatoes) | 1.04 × 0.67 × 0.76 | 716 |
| `prop_shelf.glb` | Cellar timber preserve rack stocked with amber/red jam jars, green bottles & crock | 1.07 × 1.62 × 0.44 | 1,224 |
| `prop_barrel.glb` | Coopered oak barrel with 4 riveted iron hoops & top bung | 0.64 × 0.88 × 0.64 | 408 |
| `prop_sacks.glb` | Cluster of 3 tied burlap grain/potato sacks | 0.90 × 0.69 × 0.61 | 348 |
| `prop_woodpile.glb` | Stacked split firewood cord between timber end stakes | 1.44 × 0.92 × 0.67 | 1,240 |
| `prop_pump.glb` | Cast-iron yard hand pump (`Schwengelpumpe`) on stone slab with wooden water bucket | 0.66 × 1.35 × 0.62 | 624 |

### Extra Lived-In Dressing Props (12 GLBs)
| File | Description | Real Size (W×H×D m) | Tris |
|---|---|---:|---:|
| `prop_rug.glb` | Flat walkable Silesian woven kilim rug with border bands & fringe (no collision) | 2.38 × 0.03 × 1.48 | 428 |
| `prop_bench.glb` | Wooden slatted settle/bench with folded wool blanket | 1.38 × 0.88 × 0.50 | 784 |
| `prop_coat_rack.glb` | Hall coat stand with hanging wool coats, scarf, felt hat & work boots | 0.86 × 1.81 × 0.34 | 664 |
| `prop_cupboard.glb` | Small rustic side cupboard with linen doily, ceramic bowl & brass candlestick | 1.00 × 1.11 × 0.53 | 604 |
| `prop_tool_rack.glb` | Wall-mounted workshop tool board with handsaw, wrenches, hammer, tyre & tins | 1.26 × 0.92 × 0.22 | 748 |
| `prop_wall_shelf.glb` | Kitchen bracket wall shelf with preserve jars, copper pot & hanging ladles | 1.10 × 0.51 × 0.28 | 680 |
| `prop_firewood_basket.glb` | Woven wicker basket overflowing with split firewood logs | 0.63 × 0.50 × 0.47 | 604 |
| `prop_coal_bucket.glb` | Galvanized iron coal scuttle (`Kohleeimer`) with coal lumps & small shovel | 0.44 × 0.59 × 0.43 | 522 |
| `prop_crate_stack.glb` | Stacked wooden cellar packing crates with burlap cloth & bottles | 0.90 × 1.07 × 0.64 | 500 |
| `prop_plant.glb` | Potted terracotta geranium on wooden stand | 0.41 × 0.82 × 0.44 | 906 |
| `prop_leni_desk.glb` | Small side table beside Leni with drawing paper, coloured pencils & kerosene lamp | 0.76 × 0.87 × 0.56 | 472 |
| `prop_curtains.glb` | Wooden rod & tied-back pleated gingham curtains for visible north/west windows | 1.65 × 1.11 × 0.12 | 776 |

### Preview Renders (`art-src/blender/renders/`)
- `props_lineup_1_workshop_yard.png` — Paul beside all workshop & yard props
- `props_lineup_2_kitchen_cellar.png` — Paul beside all kitchen & cellar props (all 3 crate states)
- `props_lineup_3_dressing.png` — Paul beside all 12 extra dressing props
- `props_all_game.png` — All 32 props + Paul at the 55° top-down 3/4 game camera angle
- `props_scale_game.png` — Close-up 55° room vignette verifying furniture proportions next to Paul

---

## 2. Godot Integration & Review Fixes

- **`godot/scripts/prop.gd`**: Loads `res://assets/models/prop_<id>.glb` cached in `_mesh_cache`, scaled by `Actor.MODEL_SCALE` (`0.50`) with `-Z`-forward facing rotation and `Art.prop_material()`. `set_top()` maps `p_crate_top` / `p_crate_top_shallow` / `p_crate_top_deep` directly to the three crate GLBs. Keeps the full legacy API (`x, y, z, hidden, set_top, sync, free_node`) and falls back to the Codex picture-box if any GLB is missing.
- **`godot/scripts/art.gd`**:
  - Added `PROP_SHADER` (hemisphere + key/fill/top directional shading + subtle rim on `COLOR_0`, tracking `level.light(x, y)` so cellar props stay moodier while characters remain the brightest focal point).
  - Updated `LEVEL_SHADER` with `desat`, `tint`, and `lift` uniforms: lifted workshop wood (`tex_floor_wood`: `desat=0.38`, `tint=(1.06, 1.18, 1.10)`, `lift=1.24`) and creaky planks (`tex_floor_creak`: `desat=0.32`, `tint=(1.04, 1.16, 1.08)`, `lift=1.18`) into warm natural aged pine/oak while keeping kitchen/cellar/yard/stairs untouched.
  - Fixed `WALL_SHADER` foreground cutaway (A.1 fix): removed the `dz < 1.15` upper cutoff and added a uniform south-foreground cutaway `fg_mask = smoothstep(0.82, 1.32, dz)` across **all** wall orientations (including `±X` cellar stairwell walls), with a softly lifted lit top lip. Eliminates the two tall black triangle/spike leftovers at the bottom edge of the screen when standing in the cellar (`?cp=ch1_hide&at=3.5,2.5,0`).
- **`godot/scripts/level.gd`**: Seamless world-space UV tiling (`1.4×`) for `tex_floor_wood` (boards `~0.143 m` wide relative to Paul, eliminating 1×1 tile seams) and matching `1.5×` vertical scale centred on the cracked board for `tex_floor_creak` (`~0.148 m` wide, keeping creaky-board marks centred and unmistakable).
- **`godot/scripts/chapter1.gd`**: Enlarged prop footprints/colliders to real furniture scale, adjusted tabletop sprite heights (`top = 0.43` bench, `0.39` table, `0.88` dresser), and dressed workshop, kitchen, cellar, and yard with the 12 new props while keeping walkways, creaky boards, and every interaction spot clear.

---

## 3. How to Rerun & Verify

Regenerate all 32 prop GLBs and preview PNGs:
```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python art-src/blender/make_props.py
```

Import, test all 4 bot plans, and export Web release:
```bash
~/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot --import
~/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot -- --bot --fast --plan=good
~/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot -- --bot --fast --plan=sus
~/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot -- --bot --fast --plan=shallow
~/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot -- --bot --fast --plan=timeout
~/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot --export-release "Web"
```

---

## 4. What Is Left / Notes
- **Live browser visual check recommended**: Headless bot runs verify scripts, collision-free progression, and zero errors; visual verification of the lifted workshop wood floor warmth and the cellar `?cp=ch1_hide&at=3.5,2.5,0` cutaway stubs should be spot-checked in the exported `dist-godot/` web build.
- **Tabletop pickup items (`obj_*`)**: Small interactive tabletop items (radio, mimeograph, Watchtower stack, booklets, screwdriver, coffee pot, bread/cups/jug) intentionally remain crisp Codex billboards so their inventory icons and tabletop indicators stay identical; they can optionally be upgraded to mini 3D meshes in a future polish pass if desired.
