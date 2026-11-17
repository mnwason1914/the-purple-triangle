# Task board

## Done
- [x] Phase 1: environment check (macOS M1 8GB, Node 24, npm 11, git 2.50; no Playwright browsers or Xcode; testing in the built-in browser pane with a frame-stepping harness)
- [x] Phase 2: project, renderer with integer scale, touch input, landscape and rotate prompt
- [x] Phase 3: research (Research agent → research/historical-references.md: 14 sources verified, 9 secondary); design decisions logged
- [x] Phase 4: movement, camera, NPCs, dialogue with portraits, choices, interactions, animation, touch controls
- [x] Phase 5 (vertical slice): Chapter 1 complete with 4 scenes, timed hiding, search/interrogation, stealth night mission, branching epilogue, autosave/continue, synthesised audio
- [x] QA in mobile emulation (844×390 landscape, 375×812 portrait):
  - full playthrough by bot, best path: 12/12 delivered → home ending
  - worst path: trust 0 → nothing hidden → forced door → Paul taken → named Johann → arrest ending
  - continue from checkpoints (knock, dusk, street)
  - fixes found during QA: negative-dt crash, guards overriding cutscene movement, knock timer running on real time instead of game time, dialogue covering characters, over-fast detection, unfair arrest without evidence

## Next
- [ ] Real-device QA: iOS Safari (audio unlock, safe areas, PWA install), Android Chrome (fullscreen + orientation lock, vibration)
- [ ] Performance capture on a low-end Android device
- [ ] Animation polish: door-opening and pick-up poses, NPC idle habits
- [ ] Chapter 2 「공개 서한」 (June 1937): Open Letter campaign, arrest, separation, Erklärung (late 1938 framing)
