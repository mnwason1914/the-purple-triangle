# T2 Top-Down 3D Conversion Report

## Summary
Completed **STEP 0** (full removal of spoken German voice acting while preserving Korean on-screen dialogue and typing blip sound) and **STEP 1** (converting Chapter 1 from first-person raycast-style 3D into a south-facing top-down 3D game with the T1 Blender character models, smooth-follow 55° camera, dynamic wall cutaway, and proximity/facing-cone interaction), then verified all four bot endings and exported the Web release build.

`godot/scripts/chapter1.gd`, `godot/scripts/bot.gd`, `godot/scripts/prop.gd`, `story/`, `art-src/`, and all non-voice assets were left untouched.

---

## What Changed

### Step 0 — Remove Spoken Dialogue
- Deleted `godot/assets/voice/` (all `.mp3` and `.mp3.import` files) and `godot/assets/data/voice.json`.
- Removed `_voice`, `voice_on`, `voice()`, and `stop_voice()` from `godot/scripts/audio.gd`.
- Removed `_voice_map`, `_voice_key()`, and `audio.voice()` / `audio.stop_voice()` calls from `say()`, `think()`, `end_talk()`, and `_update_barks()` in `godot/scripts/main.gd`.
- Kept all Korean on-screen dialogue, portrait display, barks, and typing blip (`ui.blip` / `sfx("blip")`).

### Step 1 — Top-Down 3D Gameplay
- **Top-down 3D camera (`main.gd`)**:
  - Perspective camera (`fov = 42°` in landscape, dynamically widened up to `62°` for narrow/portrait viewports) pitched at `55°` looking north (`-Z`) from the south (`+Z`) side at distance `5.8` (showing roughly one room—e.g. ~7.9 × 5.4 cells at 16:9, framing the entire workshop cleanly).
  - Smooth exponential follow (`_cam_pos.lerp(...)`) toward Paul's position; snaps immediately on `place()` / `reset()` so teleports and fade transitions never swoop across rooms.
  - Title screen shows the Wagner workshop from the top-down camera at distance `6.6` with a slow gentle drift around `(6.2, 8.6)` while Paul, Helena, and Leni stand in the room.
  - Replaced bright sky `WorldEnvironment` with a dark background (`#120f17`) so unfloored solid wall thickness and exterior space read as a clean architectural cutaway.
- **No ceiling & shader-based wall cutaway (`level.gd`, `art.gd`)**:
  - Removed ceiling quad generation from `Level.build_mesh()`.
  - Separated floor surfaces (`Art.LEVEL_SHADER`) from wall surfaces (`Art.WALL_SHADER`) and assigned explicit face normals to every floor and wall quad (`Vector3.UP` for floors, inward normal `Vector3(-d[0], 0, -d[1])` for walls).
  - Wall cutaway rules in `WALL_SHADER` (updated per frame via `level.set_cut_focus(pos)`):
    1. **South-side room boundary walls** (quads whose inward normal points `-Z`, away from the south camera) are sliced cleanly to a low `0.24` m cutaway rim with darkened back-face shading and a dark top edge so they never block rooms, furniture, or doors while keeping room outlines readable.
    2. **Walls south of the player** (`v_world_pos.z > player_pos.z` within the view corridor `dz ∈ [-0.05, 2.9]`, horizontal radius `2.5` for `+Z` camera-facing walls and `1.55` for `±X` side walls) smoothly lower their slice height `cut_h` from `1.25` down to `0.24` via fragment discard (`if (v_world_pos.y > cut_h) discard;`) with a subtle dark cutaway lip (`0.035` m). This prevents adjacent room walls (e.g. the yard house facade when Paul is near the front door, or the workshop north wall when Paul is on the cellar stairs) from blocking the player while keeping all walls north of the player (photo wall, tool board, workbench window, kitchen range tiles, cellar stone wall, yard facade when outside) at full `1.2` m height.
    3. Floor quads are untouched and remain 100% opaque; using opaque fragment discard avoids WebGL transparency sorting artifacts.
- **Player Paul & movement (`main.gd`, `actor.gd`)**:
  - Added `player: Actor` using `chr_paul.glb`, `chr_paul_w1.glb`, and `chr_paul_w2.glb`.
  - Converted movement from camera-relative FPS vectors to screen-space top-down directions (`W`/`Up`/stick-up = `-Z` away from camera, `S`/`Down` = `+Z`, `A`/`Left` = `-X`, `D`/`Right` = `+X`).
  - Paul smoothly turns (`lerp_angle`) to face his movement direction and alternates `stand → w1 → stand → w2` poses with a subtle walk bob proportional to distance moved.
  - Crouching (`C`/`Ctrl`/touch crouch button) keeps slower speed (`0.85`), quieter footsteps, and smoothly compresses Paul's model height (`0.76×` Y) for clear visual feedback. Running (`Shift` / stick > `0.92`), collision (`_blocked`, `solids`, `level.solid`), and footstep/creak noise (`_step`, `on_noise`) are preserved unchanged.
  - Direct `g.pa = ...` and `g.place(x, y, angle)` calls in `chapter1.gd` now rotate Paul's 3D model facing directly.
- **3D Actors (`actor.gd`, `art.gd`)**:
  - Replaced billboard `Actor extends Spr` with a 3D GLB character controller (`Actor extends RefCounted`) that caches meshes extracted from `res://assets/models/chr_<id>[_w1|_w2].glb`.
  - Scaled real-metre GLB models by `MODEL_SCALE = 0.47` so Paul (`1.75 m → 0.82`), Helena (`1.62 m → 0.76`), and Leni (`1.05 m → 0.49`) match the existing world scale (`WALL_H = 1.2`, furniture heights `0.36–0.75`, and original sprite heights).
  - Preserved the full `Actor` API used by `chapter1.gd` (`place`, `go`, `look`, `moving`, `hidden`, `set_tex`, `base`, `speed`, `x`, `y`) and mapped legacy names (`spr_helena`, `spr_leni`, `spr_leni_bag`, `spr_leni_draw`, `spr_otto`, `spr_police`, `spr_police2`, `spr_uncle`, `spr_paul`) to model IDs.
  - Actors smoothly turn to face their walk direction and alternate `_w1` / `_w2` step poses while walking.
  - Added `Art.CHAR_SHADER` (unshaded hemisphere + key/rim directional shading on GLB vertex colours `COLOR_0`, modulated by `level.light(x, y)`) so flat-shaded facets read cleanly under the existing 2D light grid without requiring real-time 3D lights.
  - Guarded `set_tex`, `sync`, and `hidden` against freed nodes (fixes a race where `leni_go` resumes `leni.look("spr_leni_bag")` after `hide()` finishes and removes Leni).
- **Tabletop item billboards (`art.gd`, `spr.gd`)**:
  - Updated `Art.SPRITE_SHADER` from a vertical Y-axis billboard to a full camera-facing billboard so small tabletop `obj_*` items face the 55° camera without foreshortening, staying above tabletop height via `center_offset = Vector3(0, s.y * 0.5, 0)`.
  - Scaled default `obj_*` sprites by `1.15×` for top-down legibility and hid `obj_bulb` hanging ceiling fixtures since ceilings are no longer rendered.
- **Proximity + facing-cone interaction & HUD (`main.gd`, `ui.gd`)**:
  - Replaced crosshair ray-aim with nearest non-occluded target within `1.05` m of Paul and within `70°` of Paul's facing `pa` (with a small angle tie-breaker `d + ang * 0.12` for side-by-side bench items).
  - Removed first-person hands (`draw_hands`, hand `TextureRect`s) and the crosshair (`Cross`) from `GameUI`.
  - Replaced the centre crosshair label/hold-disc with a lower-centre action prompt (`aim_box` using `ui_panel_small`) displaying the target name, `[E] <verb>` on desktop, and a `ui_bar`/`ui_bar_fill` hold progress bar when holding an interaction; touch mode continues using `ActButton` with its fill indicator.
  - Set `SubViewportContainer.stretch_shrink = 1` so 3D character silhouettes and facial details render crisply at viewport resolution while pixel textures retain `filter_nearest`.
  - Removed right-half touch look drag and mouse-drag look (unused with a fixed-yaw top-down camera) while keeping the left-side virtual stick, touch action/crouch/pause buttons, and tap-to-advance dialogue.

---

## Files Touched

### Deleted
- `godot/assets/voice/` (removed directory and all `.mp3` / `.mp3.import` files)
- `godot/assets/data/voice.json`

### Modified
- `godot/scripts/audio.gd` — removed voice player and voice playback methods.
- `godot/scripts/art.gd` — added `WALL_SHADER` (cutaway), `CHAR_SHADER` (vertex-colour directional + room lighting), updated `SPRITE_SHADER` to full camera-facing billboard.
- `godot/scripts/level.gd` — removed ceilings, split floor/wall surfaces with explicit normals, added `wall_mats` and `set_cut_focus()`.
- `godot/scripts/spr.gd` — top-down readability scale (`1.15×`), hide ceiling-only `obj_bulb`, freed-node guards.
- `godot/scripts/actor.gd` — 3D GLB character controller with pose swapping, smooth walk facing, crouch scale, sprite-name mapping, and freed-node guards.
- `godot/scripts/ui.gd` — removed first-person hands and crosshair, added lower-centre action prompt + desktop hold progress bar using existing Codex UI assets, set `stretch_shrink = 1`.
- `godot/scripts/main.gd` — removed voice calls, added 55° top-down follow camera, dark cutaway environment, Paul 3D player actor, screen-space movement, 1.05 m / 70° target selection, and title camera drift.

### Generated / Exported
- `godot/assets/models/chr_*.glb.import` and `godot/.godot/imported/` (via `--import`)
- `dist-godot/` (`index.html`, `index.js`, `index.pck`, `index.wasm`, etc., via `--export-release "Web"`; verified 48 `chr_*` resources packed and 0 voice files packed)

---

## Verification Results

1. **Asset import**:
   ```bash
   ~/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot --import
   ```
   Exited `0`; all 24 `chr_*.glb` models imported and all script classes registered cleanly.

2. **Headless bot tests** (`--bot --fast` across all four plans):
   - `--plan=good`: reached `END:` with `0` `SCRIPT ERROR` (`ch1_photo="burned"`, `ch1_potato_depth="deep"`, `ch1_lock_sabotaged=true`, `suspicion=20`, `solidarity=60`).
   - `--plan=sus`: reached `END:` with `0` `SCRIPT ERROR` (`ch1_photo="hidden"`, `ch1_photo_taken=true`, `ch1_potato_depth="shallow"`, `suspicion=35`).
   - `--plan=shallow`: reached `END:` with `0` `SCRIPT ERROR` (`ch1_photo="hidden"`, `ch1_potato_depth="shallow"`, `suspicion=10`, `composure=80`).
   - `--plan=timeout`: reached `END:` with `0` `SCRIPT ERROR` (`ch1_forced=true`, `ch1_found="mimeo"`, `paul_detained=true`, `ch1_seized="wt,mimeo,booklets"`).

3. **Web release export**:
   ```bash
   ~/Applications/Godot.app/Contents/MacOS/Godot --headless --path godot --export-release "Web"
   ```
   Exited `0`; wrote `dist-godot/index.html` and `dist-godot/index.pck` (18 MB, down from voice-heavy build; all 24 character models included, no voice assets).

---

## Known Issues / Notes
- **Visual GPU pass pending interactive launch**: All automated checks ran under Godot's `--headless` dummy renderer, so live GPU verification (visual check of `WALL_SHADER` cutaway margins around doorways/stairs, `CHAR_SHADER` brightness against dark workshop floors, and tabletop `obj_*` sprite spacing in browser WebGL) is recommended during playtesting.
- **Exit ObjectDB leak warnings in headless bot**: Static resource caches (`Art`, `Actor._mesh_cache`, `Prop`, `GameUI`) remain populated when `bot.gd` calls `get_tree().quit(0)`, causing Godot's headless exit check to log leaked static RIDs/ObjectDB instances; this is benign and does not affect gameplay or web runtime.
- **Leni drawing pose**: `spr_leni_draw` maps to `chr_leni.glb` with a subtle `0.88×` height scale while stationary; no separate seated drawing GLB exists in T1.
- **Desktop mouse-click interaction**: Desktop players interact with `[E]` / `[Space]` / `[Enter]` (or gamepad A) while facing a target; clicking on objects directly in 3D is not implemented (matching the original keyboard/gamepad + touch-button control scheme).

---

## Polish Round (Director Review Fixes)

Addressed all five issues identified in the `?cp=ch1_hide` mobile web screenshot review:

1. **Overall brightness & character lighting (`level.gd`, `art.gd`, `prop.gd`)**:
   - Raised room ambient levels in `Level.AMBIENT` while preserving mood contrast: `workshop = 0.80`, `kitchen = 0.86`, `stairs = 1.05`, `cellar = 0.56` (visibly moodier than workshop), `yard = 1.15`, `door = 0.88`, and slightly expanded room lamp radii.
   - Added a gentle shadow-lift curve in `Art.LEVEL_SHADER` (floors), `Prop.SHADER` (furniture), and `Art.SPRITE_SHADER` (tabletop items) so dark brown wood floorboards, cellar earth, and wooden furniture read clearly on phone screens in daylight while keeping window light pools distinct.
   - Upgraded `Art.CHAR_SHADER` with a dark-colour lift on linear `COLOR_0` (so dark hair, olive work shirt, dark dress, and navy uniforms never crush to dark blobs while skin and white collars stay natural), brighter hemisphere + key + top light (`0.88 + 0.52 * key + 0.25 * top`), a floor-level minimum room-light clamp (`L ∈ [1.02, 1.32]`), and a warm Fresnel + top rim highlight separating characters from floors.

2. **Closer camera & character screen size (`main.gd`, `actor.gd`)**:
   - Pulled `CAM_DIST` in from `5.8` to `4.30` (`CAM_TITLE_DIST = 5.20`, `CAM_TARGET_Y = 0.38`) at `42°` vertical FOV and `55°` pitch, giving ~`5.9` m visible width on a 16:9 landscape phone.
   - Raised `Actor.MODEL_SCALE` from `0.47` to `0.50` (Paul = `0.875` world units), placing Paul at roughly `1/6` of the screen height while staying well below `WALL_H = 1.2`.

3. **Sharp 3D model rendering (`ui.gd`)**:
   - Replaced the fixed logical-resolution nearest-filtered `SubViewportContainer` with a `SubViewport` (`msaa_3d = Viewport.MSAA_2X`) paired with a `TextureRect` (`TEXTURE_FILTER_LINEAR`) dynamically sized in `_layout()` to the native window pixel resolution (capped at `900p` height for smooth mobile WebGL performance). All world/prop/sprite shaders retain `filter_nearest` so Codex pixel textures stay crisp while 3D character silhouettes render cleanly without low-res mush.

4. **Clean cut-away walls with zero dark horizontal strips (`art.gd`, `level.gd`)**:
   - Switched `Art.WALL_SHADER` from `cull_disabled` with darkened back-face/top-rim bands (`0.72 * 0.45`, which exposed the dark brown baseboard at the bottom of wall textures) to `cull_back`. Back-facing south room walls are now cleanly hidden with no black/dark horizontal bands across the floor.
   - Kept smooth fragment cutaway only for front-facing (`+Z`) walls immediately in front of the player (`dz ∈ [0.02, 1.15]`), sampling a lit top edge from the upper wall texture colour (`UV.y = 0.35`, `* 1.12`) instead of the baseboard.
   - Added a clean floor-level lit wooden threshold strip in `level.gd` for south-edge doors (`F` front door and `g` garden gate) so doorway positions stay clearly marked.
   - Lifted the `WorldEnvironment` background slightly to `#1d1924`.

5. **Lit stairwell opening in the top-left (`level.gd`, `art.gd`)**:
   - Switching `WALL_SHADER` to `cull_back` removed the occluding back face of the east stairwell wall (`x = 4, z = 4..6`) that had blocked the view of the stairs from the workshop.
   - Boosted stairwell lighting (`AMBIENT.stairs = 1.05` and `stair` light at `(3.5, 5.2)` with `i = 0.90, r = 3.8`) so the wooden stair steps (`tex_floor_stairs`) and stone stairwell wall read as a clearly lit opening descending to the cellar.

### Polish Round Verification
- **Headless bot tests (`--bot --fast`)**: All four plans (`good`, `sus`, `shallow`, `timeout`) re-ran cleanly and reached `END:` with `0` `SCRIPT ERROR`s.
- **Web release export**: Re-exported cleanly to `dist-godot/` (`Godot --headless --path godot --export-release "Web"` exited `0`).
