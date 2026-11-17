# Decisions (internal)

| # | Date | Decision | Why |
|---|------|----------|-----|
| 1 | 2026-11-17 | Story-driven stealth/exploration adventure, side view, **no jumping**, no combat. | Tension comes from situations (knocks, searches, patrols), not fights. Walk-line scenes fit phones. |
| 2 | 2026-11-17 | Fictional protagonist **Elise Hartmann** (seamstress, 32), husband **Paul** (railway signalman), daughter **Lotte** (9), in the fictional Westphalian town **Lindenfeld**. Real people are never portrayed. | Real experiences inspire scenes without distorting real people's histories. |
| 3 | 2026-11-17 | Vertical slice = Chapter 1, **Saturday 12 December 1936** (Lucerne Resolution leaflet day). | A single day holds everyday life → school conflict → house search → choice → night mission → consequences. |
| 4 | 2026-11-17 | Landscape is the main orientation; portrait shows a rotate prompt. Integer pixel scaling; minimum view 256×144 world px. | Required by directive; side-view stealth needs width. |
| 5 | 2026-11-17 | All art is generated in code from pixel grids at boot (characters 16×32, portraits 32×32 with expressions, environments). One atlas → few draw calls, zero downloads, no licensing risk. | Mobile load time, consistency, legal asset provenance. |
| 6 | 2026-11-17 | Night lighting = one full-screen shader overlay with up to 16 point/cone lights, stepped (posterised) falloff per world pixel. | Atmosphere and readable stealth (lamp cones) for one draw call. |
| 7 | 2026-11-17 | No swastikas or real Nazi insignia shown; banners/posters are abstracted. | Legal display restrictions in some markets; the story doesn't need them. |
| 8 | 2026-11-17 | Failures branch the story (warning, arrest, search finds) rather than "game over". | Directive 7.3. |
| 9 | 2026-11-17 | Cutscenes are async/await coroutines driven by the game loop (say/choice/walk/wait/fade). | Readable script data and easy branching. |
| 10 | 2026-11-17 | In-game language Korean, with period German terms where natural (Heil Hitler, Wachtturm, Herr Wachtmeister). | Target player is Korean; German terms carry the era. |
| 11 | 2026-11-17 | Search scene replaces the "Erklärung" with **pressure to name the supplier** (Johann). Hiding places = coffee pot, Lotte's schoolbag, potato bin, loose floorboard. | Research: the standard Erklärung form dates from late 1938/1939, so in 1936 it would be an anachronism. Documented hiding places (1974 Yearbook / Kusserow accounts) ground the scene. Erklärung is kept for a later chapter. |
| 12 | 2026-11-17 | Night mission timed **17:00–19:00**: one leaflet per mailbox, 12 leaflets. | Matches the documented 12 Dec 1936 campaign window and its one-per-house practice. |

## 13. 숨기기 장면 난이도 상향 (플레이 피드백: "너무 쉽다")
- 「파수대」를 세 부로 나눠 탁자·선반·침대 머리맡에 흩어 둠. 먼저 주워야 숨길 수 있다.
- 숨길 곳마다 용량 제한: 마룻장 2, 감자 상자 1, 옷장 2, 바구니 1, 커피포트·로테 가방은 편지 전용.
- 한 번의 행동으로 모든 물건을 숨길 수 없게 함. 남겨 둔 잡지는 수색 시 자동 발견.
- 엘리제의 생각으로 "옷장·바구니부터 뒤진다"는 힌트 제공(공정성).
- 시간 25초. 최적 경로 약 20.5초(봇 측정) → 여유 약 4.5초.
