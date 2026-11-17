# THE PURPLE TRIANGLE

A mobile-first 2D pixel-art story game (Three.js + TypeScript + Vite, orthographic camera).
It is set in Germany in 1936. Elise Hartmann is a seamstress and a Jehovah's Witness in the small Westphalian town of Lindenfeld, at a time when her faith is banned.

The playable vertical slice is **Chapter 1, "December"** (12 December 1936), roughly 10–20 minutes long:
1. **Morning**: explore the flat. Lotte comes home after refusing the Hitler salute at school, and the player makes a choice. Paul brings literature and a letter.
2. **The knock**: police are at the door. Hide the magazines and the letter in about 22 seconds. Hiding places are a coffee pot, the stove (burn the letter), a potato bin, a loose floorboard, Lotte's schoolbag (only if she trusts you), the sewing basket or the wardrobe. Opening the door early changes how thorough the search is.
3. **The search and interrogation**: choose how to answer the greeting, then whether to name the supplier. What they find decides whether Paul is taken.
4. **Dusk**: decide whether to go out at all. In the stairwell, help Frau Krüger (the block warden's wife) or walk past her.
5. **The street, 17:00–19:00**: a stealth mission. Collect 12 leaflets at the bakery and push one into each mailbox (hold the button). Avoid Wachtmeister Brandt's lamp by hiding in doorways and behind carts. Gestapo man Vogt appears if earlier choices exposed the network. Getting caught branches into a warning, confiscation or arrest.
6. **Consequences**: the epilogue cards and closing summary reflect every major choice.

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
src/data        chapter scripts (chapter1.ts)
research/       internal historical references (never shown in game)
development/    decisions log & task board
tests/          art contact-sheet renderer
```
