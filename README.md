# THE PURPLE TRIANGLE

A mobile-first 2D pixel-art story game (Three.js + TypeScript + Vite, orthographic camera).
It is set in Germany in 1936. Elise Hartmann is a seamstress and a Jehovah's Witness in the small Westphalian town of Lindenfeld, at a time when her faith is banned.

The playable vertical slice is **Chapter 1, "December"** (12 December 1936), roughly 10–20 minutes long.

### How the chapter is written
1. `story/story.md` — the story (v1 kept as `story-v1.md`).
2. Gemini reviewed it → `story/gemini-review.md`; each point was checked against `research/` → `story/review-response.md`; the story was revised to v2.
3. `story/beats-ch1.md` — beat sheet with every branch.
4. Gemini wrote the script scene by scene (`story/script/run.sh` → `story/script/*.md`), assembled with logged editorial fixes into **`story/script-ch1.md`** (`story/script-review.md`).
5. `src/data/chapter1.ts` implements that script line for line.

### Chapter 1 in play
1. **Morning**: explore the flat (radio, calendar, wedding photo, the loose floorboard, the *Manna* birthday book on the shelf).
2. **Frau Krüger collects for the Winter Relief**: donate or decline.
3. **Lotte comes home** after refusing the salute; three answers set her trust. **Paul** brings two *Watchtower* issues and Johann's letter.
4. **The knock (25 s)**: pick up two magazines and the birthday book, hide them and the letter. Hiding places have limited room (floorboard 2, potato bin 1, wardrobe 2, basket 1; coffee pot and Lotte's schoolbag take only the letter; the stove burns the letter or the book). Opening the door yourself keeps the potato bin and floorboard from being searched.
5. **Search and interrogation**: answer the greeting; name the supplier or not. Found magazines mean Paul is taken; a found birthday book puts the names in it on file.
6. **Dusk**, then the **stairwell** (help Frau Krüger or not).
7. **The street, 17:00–19:00**: 20 leaflets, one per house, into 20 mailboxes or door gaps. Avoid Brandt's lamp and the lit notice board; Vogt patrols if suspicion is high.
8. **Ending**: cards and summary lines reflect every choice.

## Run

```bash
npm install
npm run dev       # LAN dev server
npm run build     # type-check + production build (dist/)
npm run preview   # serve dist/ on the LAN; open the "Network" URL on a phone
npm test          # renders tests/art-sheet.png (all characters, poses, portraits) for visual QA
```

Add `?debug` to the URL to show FPS, draw calls, pixel scale and the current checkpoint.

## Controls
- **Touch** (landscape): use the slide pad on the left (◀ ▶). The context button on the right appears only when something can be done, and shows its verb (조사 / 대화 / 숨기 / 넣기 …). Some actions need the button held; a ring fills while you hold. Tap the screen to advance dialogue, and tap a choice to pick it.
- **Keyboard**: ← → move; Space / E / Enter acts and advances; Esc pauses.
- **Gamepad**: stick / D-pad to move, A to act, Start to pause.
- **Portrait**: a rotate prompt appears. "세로로 계속하기" (continue in portrait) switches to a letterboxed game band with a control deck below.

## Tech notes
- **Integer pixel scaling**: the minimum view is 240×144 world px and DPR is capped at 2 (1.5 in battery saver). Camera edges are snapped to device pixels.
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
