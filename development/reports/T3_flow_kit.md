# T3 — Google Flow Cinematics Kit (Top-Down 3D Style)

## Summary
Built a complete Google Flow (Veo) cinematics kit in `flow-kit/ch1-topdown/` matching the new low-poly flat-shaded 3D look of the T1 character models and T4 household furniture models. Story, characters, and Chapter 1 beats (Thalheim, Silesia, 29 June 1933) remain unchanged.

---

## 1. Blender Reference Stills (`art-src/blender/make_flow_refs.py` → `flow-kit/ch1-topdown/refs/*.png`)

All **14 reference PNGs** are rendered in Blender 5.2.2 EEVEE at **1920×1080 (16:9)** directly from the real T1 `chr_*.glb` and T4 `prop_*.glb` game assets:

### Cast & Character Turnaround Sheets (6 PNGs)
- `ref_cast_lineup.png` — All 7 characters lined up side-by-side in neutral studio light (Paul, Helena, Leni with satchel, Otto Becker, Policeman 1, Policeman 2, Uncle) at true relative scale.
- `ref_char_paul.png` — Paul (24) Front / 3/4 Front / 3/4 Back turnaround.
- `ref_char_helena.png` — Helena (51) Front / 3/4 Front / 3/4 Back turnaround.
- `ref_char_leni.png` — Leni (5) without satchel + with brown leather school satchel (Front / 3/4 Front / 3/4 Back).
- `ref_char_otto.png` — Otto Becker (55) Front / 3/4 Front / 3/4 Back turnaround (plain red sleeve band, no political symbol).
- `ref_char_police.png` — 1933 Prussian Policemen 1 & 2 turnaround (dark navy tunic, silver buttons, black shako).

### Architecture & Interiors (2 PNGs)
- `ref_house_exterior.png` — Street view of the 1933 Silesian red-brick-and-plaster Wagner house and bicycle workshop (steep clay-tile roof, blank wooden signboard with no text, leaded windows with green shutters, low brick garden wall, wooden gate, cobblestone lane, yard bench, water pump, barrel, woodpile, bicycle, trees, and distant hills).
- `ref_house_interior.png` — High 3/4 cutaway interior of both the workshop and tiled kitchen furnished with the actual T4 Blender models (workbench with vice, stool, bicycle, tool rack, rugs, cabinet, cupboard, Leni's drawing desk, coal range with stovepipe, firewood basket, kitchen table & chairs, dresser, washbasin, wall shelf, curtains).

### Keyframes for Every Cut (6 PNGs)
- `ref_cut_1_intro_street.png` — Opening Cut 1 (`cut_1_intro.mp4`): warm morning summer sunlight on the quiet cobblestone lane outside the workshop.
- `ref_cut_2_intro_workshop.png` — Opening Cut 2 (`cut_1_workshop.mp4`): sunlit workshop interior with Paul pausing by the workbench, Leni at her drawing desk, and Helena watching from the kitchen doorway.
- `ref_cut_3_knock.png` — Crisis Cut 3 (`cut_1_knock.mp4`): cooler midday shadows as Otto Becker and the two Prussian policemen approach the wooden front door.
- `ref_cut_4_outro_leni.png` — Main Ending Cut 4 (`cut_1_outro.mp4`): warm golden dusk outside the brick gatepost; Leni with her school satchel waiting quietly while Paul walks through the open gate toward her.
- `ref_cut_5_outro_home.png` — Extended Ending Cut 5 (`cut_1_outro_home.mp4`): deeper amber-violet dusk; Paul and Leni walking back up the cobblestone yard toward the glowing front doorway where Helena stands waiting.
- `ref_cut_6_arrest.png` — Alternate Ending Cut 6 (`cut_1_arrest.mp4`): cool twilight; the two policemen escorting Paul down the cobblestone street while Leni watches from beside the gatepost.

---

## 2. Prompts & Guide (`flow-kit/ch1-topdown/flow-prompts.md`)

- Written with clear **Korean step-by-step instructions** for the owner (16:9, 8 s shots, Start Frame + Ingredients upload guidance, target filenames) and **6 copy-paste English video prompts** (2 core cuts directly wired in `cinema.gd`: `cut_1_intro.mp4` and `cut_1_outro.mp4`, plus 4 optional/extended cuts: `cut_1_workshop.mp4`, `cut_1_knock.mp4`, `cut_1_outro_home.mp4`, `cut_1_arrest.mp4`).
- Every prompt specifies 8-second motion, camera move, lighting, mood, 1933 Silesian setting, flat-shaded low-poly 3D diorama style, and strict prohibitions against speech, dialogue, on-screen text/lettering, readable signs, swastikas, flags, or Nazi insignia.

---

## 3. How to Rerun

Regenerate all 14 reference stills (runs in ~30 s headless on M1):
```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python art-src/blender/make_flow_refs.py
```

---

## 4. What Is Left
- **Video generation in Google Flow (owner step):** Upload the listed `refs/*.png` stills and paste the English prompts from `flow-kit/ch1-topdown/flow-prompts.md` to generate `cut_1_intro.mp4` and `cut_1_outro.mp4` (plus any of the 4 extended cuts desired), then drop the MP4 files into `godot/assets/ch1/` and re-export `dist-godot/`.
- **Optional wiring for extended cuts:** `cinema.gd` currently plays `cut_1_intro.mp4` and `cut_1_outro.mp4`; if the owner generates `cut_1_knock.mp4`, `cut_1_outro_home.mp4`, or `cut_1_arrest.mp4`, they can be wired into `cinema.gd` / `chapter1.gd` in a follow-up step.
