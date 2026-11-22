# Chapter 1 → top-down 3D (director's plan)

Director: Claude Opus (reviews every result, decides, reports to the owner in Korean).
Worker: Antigravity CLI, model **gemini-4-neon-high** (does all the building).

## Fixed rules for every task
- Core theme, story, dialogue, branches and endings of chapter 1 do NOT change. Text stays in `story/` and `godot/scripts/chapter1.gd` as is.
- No graphics or buttons drawn in code. Every visible thing is an asset file: Codex images (existing), Blender models (new), Flow videos.
- Never commit, push, deploy, delete project files, or touch `~/.codex`, `.env.local` or any key. The director commits.
- Blender: `/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python <script>` (Blender 5.2.2, headless, M1 8 GB: keep scenes light). Scripts live in `art-src/blender/`, outputs in `godot/assets/models/` (GLB) and `art-src/blender/renders/` (PNG previews for review).
- Godot 4.7.2: `~/Applications/Godot.app/Contents/MacOS/Godot`. Headless test: `Godot --headless --path godot -- --bot --fast --plan=good|sus|shallow|timeout` must still reach the same endings.
- Finish each task with a short report file `development/reports/<task>.md`: what was made, how to run it, what is not done.

## Look
1930s Silesian village, poor family home and bicycle workshop. Low-poly, flat-shaded, vertex-coloured (COLOR_0) models matching the muted earthy palette of the existing Codex textures. Readable from a high camera: big heads, clear clothing colours.

## Tasks
1. **T1 characters (Blender):** Paul (24, dark-brown hair, olive work shirt, dark trousers), Helena (51, plum-grey headscarf, dark dress, apron), Leni (5, blond-brown braids, red dress, school satchel variant), Otto Becker (55, grey flat cap, grey moustache, brown jacket), Policeman (dark-blue uniform, black shako), Policeman 2 (same uniform, no moustache), Uncle (brown coat, hat). ~1.5–3k tris each, one mesh, vertex colours, origin at feet, facing −Z, 1 unit = 1 m scaled so Paul is 1.75 m. Simple skeleton not required; a separate "walk" pose pair (left/right step) as extra GLBs is enough. Preview renders: front, side, top-down 3/4 at the game camera angle.
2. **T2 top-down game (Godot):** replace the first-person camera with a top-down 3D camera (perspective, ~55° pitch, follows the player smoothly, no rotation needed). Player = Paul model. Move with stick/WASD in screen directions; interact with the nearest target within reach that the player faces (show the action button/label as now). Walls stay full height but the ones between camera and player fade/cut; no ceiling rendered. Actors use the T1 models (turn to face their walk direction, alternate step poses). Furniture props stay (real 3D boxes already). All UI, touch input, timer, noise and dialogue stay.
3. **T3 cinematics kit (Flow):** reference renders from Blender (characters lined up, house exterior) + Flow prompts for the opening and ending cuts in `flow-kit/ch1-topdown/`. The owner generates the videos in Google Flow.

## Owner decision 2026-11-22: no spoken dialogue
Remove the German voice acting completely: delete `godot/assets/voice/`, `godot/assets/data/voice.json`, the `_voice_key`/`audio.voice`/`stop_voice` calls in `main.gd` and the voice player in `audio.gd`. Dialogue stays as on-screen Korean text exactly as now (the typing blip sound stays). Do this as the first step of T2.
