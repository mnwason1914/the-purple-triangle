# T1 Characters Report

## Summary
Built all 7 characters (8 model IDs including `leni_bag`) procedurally in Blender 5.2.2 LTS via [make_characters.py](../../art-src/blender/make_characters.py). Every model is a single flat-shaded low-poly mesh with linear vertex colours stored in a `COLOR_0` attribute connected to a Principled BSDF (so colours survive GLB export without external textures), origin at feet (`Y = 0` in GLB), facing `-Z` (glTF/Godot forward), and scaled in metres (`1 unit = 1 m`).

## Script
- `art-src/blender/make_characters.py`

## Exported GLB Models (`godot/assets/models/` — 24 files)

All 24 GLBs were verified automatically after export: valid GLB binary, single mesh primitive, `COLOR_0` vertex attribute present, grounded at `Y = 0.0000`, and facing `-Z`.

| Character ID | Description | Height (m) | Tris (each pose) | Standing GLB | Walk Left (`w1`) | Walk Right (`w2`) | Size (KB) |
|---|---|---:|---:|---|---|---|---:|
| `paul` | Paul (24): dark-brown parted hair, olive work shirt, open cream undershirt, brown suspenders, dark trousers & boots | 1.750 | 2,272 | `chr_paul.glb` | `chr_paul_w1.glb` | `chr_paul_w2.glb` | 172 |
| `helena` | Helena (51): open-front plum-grey headscarf tied under chin, dark brown dress, stone-grey apron, clasped hands (standing), dark boots | 1.620 | 2,404 | `chr_helena.glb` | `chr_helena_w1.glb` | `chr_helena_w2.glb` | 179 |
| `leni` | Leni (5): golden-brown hair with bangs & two side braids with red ribbons, crimson dress, white Peter Pan collar & cuffs, white socks, brown shoes | 1.050 | 2,454 | `chr_leni.glb` | `chr_leni_w1.glb` | `chr_leni_w2.glb` | 189 |
| `leni_bag` | Leni with brown leather school satchel (`Ranzen`), flap, brass buckles, side pockets & full-wrap shoulder straps | 1.050 | 2,726 | `chr_leni_bag.glb` | `chr_leni_bag_w1.glb` | `chr_leni_bag_w2.glb` | 210 |
| `otto` | Otto Becker (55): stocky build, grey flat cap, grey hair fringe & bushy moustache, brown open jacket, tan shirt, dark grey bib apron with pocket wrench, plain red armband with white disc (no swastika) | 1.720 | 2,352 | `chr_otto.glb` | `chr_otto_w1.glb` | `chr_otto_w2.glb` | 177 |
| `police` | Policeman 1: 1933 Prussian dark navy-blue tunic, silver epaulettes/buttons/collar patches, black belt, tall black jackboots, black shako with brass emblem, dark moustache | 1.780 | 2,436 | `chr_police.glb` | `chr_police_w1.glb` | `chr_police_w2.glb` | 184 |
| `police2` | Policeman 2: same uniform and shako, slightly slimmer & younger, clean-shaven (no moustache) | 1.760 | 2,380 | `chr_police2.glb` | `chr_police2_w1.glb` | `chr_police2_w2.glb` | 180 |
| `uncle` | Uncle: warm camel-russet long double-breasted overcoat, cream-ochre wool scarf, dark wide-brim fedora hat, dark trousers & boots | 1.730 | 2,184 | `chr_uncle.glb` | `chr_uncle_w1.glb` | `chr_uncle_w2.glb` | 163 |

All triangle counts fall cleanly within the 1.5k–3k budget (2,184–2,726 tris per mesh).

## Preview Renders (`art-src/blender/renders/` — 27 files)
Rendered with Blender EEVEE (`512x512` per character, plus three `1200x440` scale lineups):
- Per character (`paul`, `helena`, `leni`, `leni_bag`, `otto`, `police`, `police2`, `uncle`):
  - `<id>_front.png`
  - `<id>_side.png`
  - `<id>_game.png` (55° pitch top-down 3/4 game camera)
- Full-cast scale & silhouette verification lineups:
  - `lineup_front.png`
  - `lineup_game.png`
  - `lineup_walk.png` (alternating `w1` / `w2` walk poses)

## Visual Review & Polish Pass
After inspecting the initial preview renders, the following issues were identified and fixed before final export:
1. **Helena's headscarf**: Replaced the closed lathe hood (which obscured her face) with a thick open-front arc shell framing her cheeks, forehead hairline, and chin knot cleanly.
2. **Top-down face & head readability**: Increased adult head proportions (~18% larger) with slightly shorter sturdy necks and gentler brim/visor pitch so faces, eyes, and moustaches read clearly at 55° pitch.
3. **Shoulder silhouette**: Tucked shoulder joint caps smoothly into the sloped upper torsos, eliminating blocky "pauldron" bumps and letting the police silver epaulettes sit cleanly on top.
4. **Chest layers & accessories**: Replaced protruding box insets on Paul's undershirt and Otto's tan shirt/apron with flush curved/lathed forms; routed `leni_bag`'s shoulder straps completely around under her arms to the satchel base; smoothed back-of-head hair fringes under hats.
5. **Grounded flat soles & tri budget**: Lowered the flat boot soles cleanly below the rounded foot uppers so every shoe sits flat on `Y = 0`; trimmed bevels on tiny eye/button details to keep every character between 2.18k and 2.73k tris.

## How to Rerun
```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python art-src/blender/make_characters.py
```
Runs headless in ~10 seconds on M1 8 GB, regenerates all 24 GLBs and 27 PNG previews, and prints the verified per-file summary table.

## Known Issues / Notes for T2
- **No skeletal rig**: Per the T1 plan, animation is pose-swapping between `chr_<id>.glb` (standing), `chr_<id>_w1.glb`, and `chr_<id>_w2.glb`. For smooth walking in T2, alternate `w1` → `stand` → `w2` → `stand` (or `w1` ↔ `w2` with subtle vertical bob).
- **Godot vertex colour shading**: All GLBs export `COLOR_0` on a Principled BSDF material (`roughness=0.86`). When imported into Godot 4.7.2, Godot automatically enables `vertex_color_use_as_albedo` on glTF primitives with `COLOR_0`. If any custom material override is applied in T2, preserve `vertex_color_use_as_albedo = true`.
- **Police vs Police 2 from directly behind**: Both wear the same Prussian uniform and shako; from front/3/4 angles Police 1's dark moustache vs Police 2's clean-shaven face and slightly slimmer frame distinguish them.
- **No other repository files modified**: Only `art-src/blender/make_characters.py`, `art-src/blender/renders/*.png`, `godot/assets/models/chr_*.glb`, and `development/reports/T1_characters.md` were created.
