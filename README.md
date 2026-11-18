# THE PURPLE TRIANGLE

A mobile-first pixel-art story game about Jehovah's Witnesses under the Nazi ban (TypeScript + Vite). Each chapter uses its own way of playing.

**Chapter 1, 「가방 속의 소책자」** (Thalheim, Silesia, 29 June 1933) is a first-person 2.5D raycaster in the style of early-90s shooters, with no combat:
1. **Workshop**: the radio reports the SA occupation of the Magdeburg office. Examine the bench and the family photo; burn it or hide it behind the frame's back panel.
2. **The knock (90 s)**: Otto Becker, locksmith and party block leader, starts picking the lock. Hide three things: the *Watchtower* bundle (coffee pot → uncle at the back door), the mimeograph (potato crate, deep or shallow), the booklets (Leni's schoolbag). Optional: tighten the bolt screws (+25 s, but leaves scratches), wash soil off your hands, wipe the dust mark where the photo hung. Creaking boards and stairs leak footsteps outside (−5 s) unless you crouch.
3. **Search**: two policemen and Becker search the house. Traces and suspicion decide whether they leave at once or question you (8-second answers), take the photo or dig up the crate.
4. **Yard**: Leni waits at the gate with the bag. If time ran out with things unhidden, Paul is taken away instead.

Spec: `story/ch1-spec.md`; review, line edits and asset replacement: `story/ch1-spec-review.md`. The earlier 2D chapter (1936, Elise) remains in `src/game`, `src/data`, `src/scenes` but is not wired in.

## Run

```bash
npm install
npm run dev       # LAN dev server
npm run build     # type-check + production build (dist/)
npm run preview   # serve dist/ on the LAN; open the "Network" URL on a phone
npm test          # renders tests/art-sheet.png (all characters, poses, portraits) for visual QA
```

## Controls
- **Touch** (landscape): drag the left half for the stick (push to the rim to run); drag the right half to look. **웅크리기** toggles crouch (silent footsteps, half speed). The round button on the right appears when the crosshair is on something and shows the verb; a ring fills on hold actions (씻기 3 s, 닦기 2 s, 조이기 2 s). Tap to advance dialogue.
- **Keyboard / mouse**: WASD move, mouse drag or ← → turn, Shift run, C crouch, E / Space act, Esc pause.
- **Test switch**: `?fast` skips the opening cut and date card.

## Tech notes
- **First-person renderer** (`src/fps/render.ts`): 180 px tall internal frame (150 view + 30 status bar), width follows the screen. DDA walls, per-pixel floor/ceiling casting, bilinear light map with line-of-sight lights, z-buffered billboards. About 1.4 ms per frame on a laptop.
- **Art**: chapter 1 uses 69 images generated with Codex CLI (`art-src/ch1/briefs`, `art-src/ch1/run.sh`), cut, keyed and shrunk by `scripts/art-process.mjs` into `public/assets/ch1` (about 1 MB). `manifest.json` there lists every replacement; anything not listed falls back to the code-painted art. Videos (Google Flow) and sounds can be listed the same way.
- **Integer pixel scaling** (2D chapter): the minimum view is 240×144 world px and DPR is capped at 2 (1.5 in battery saver). Camera edges are snapped to device pixels.
- **Art**: all art is painted in code. Characters are 16×32 sprites with 12 poses each (`src/characters/painter.ts`). Portraits are 32×32 with 7 expressions. Props are packed into one 1024² atlas, and each scene backdrop is one texture. There are no external assets, so there is no licensing exposure.
- **Lighting**: night uses one full-screen shader with up to 16 point/cone lights. Falloff is posterised per world pixel (`src/engine/lighting.ts`), and the same light model drives stealth detection.
- **Cost per frame**: 12–17 draw calls per frame; about 150 KB of gzipped JS in total.
- **Cutscenes**: written as async coroutines (`src/systems/director.ts`). `release()` hands control back to the player during interactive segments.
- **Audio**: synthesised with Web Audio. It covers footsteps per surface, knocks, doors, paper, a heartbeat that follows danger, ambience beds and a sparse score. Audio unlocks on the first gesture and suspends when the page is hidden.
- **Saving**: autosaves at each checkpoint (morning / knock / dusk / street) and on pause, hide and `pagehide`. The game auto-pauses when backgrounded.
- **PWA**: manifest (landscape), icons, and a generated service worker that precaches the build.

## Project layout
```
src/engine      view (renderer/camera/scale), atlas, grid painter, sprite, lighting, SW template
src/characters  painter (sprites + portraits), cast (looks/names), actor
src/scenes      env (backdrops & props), scene container
src/systems     director (coroutines), stealth (guards), save
src/controls    touch/keyboard/gamepad input
src/audio       synthesised audio
src/ui          DOM UI + styles
src/game        game loop & script API
src/data        chapter scripts (chapter1.ts), UI text table
src/text        on-screen text pass (menus via Gemini table)
story/          story, Gemini review, beat sheet, Gemini script
research/       internal historical references (never shown in game)
development/    decisions log & task board
tests/          art contact-sheet renderer
```
