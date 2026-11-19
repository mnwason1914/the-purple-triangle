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

## 14. 스토리 → 제미나이 검수 → 제미나이 대본 → 구현 (2026-11-18)
- 사용자 지시: 스토리를 제미나이에게 검수받고, 그 스토리로 제미나이가 대본을 쓰고, 그 대본대로 게임을 만든다.
- 검수 8항목 중 5개 반영, 1개 수정 반영, 2개 반려(서약서 1장 등장: 1938년 통일 양식, 결정 #11 유지), 1개 보류(제4장). 근거: story/review-response.md.
- 반영: 회피형 선택지, 전단 20장(조사 2.4), 크뤼거 부인의 겨울구호 모금, 로테의 학교 묘사, 밝은 게시판, 『만나』 생일 기록부(조사 2.6).
- 대본은 한 번에 쓰게 하면 무료 모델이 분기를 생략하므로 비트 시트를 만들어 장면별로 집필. 편집 교정 24줄(포크트 말투, 비하어, 시간 순서, 메타 문구)은 story/script-review.md.
- 화면의 1장 글은 대본에서 직접 옮긴다. 줄 단위 제미나이 교체 표(gemini.json)는 메뉴·버튼 글에만 쓴다.
- 함께 고침: 조명 셰이더가 목록 앞 16개만 쓰던 문제 → 화면에 가까운 16개를 고른다(거리의 브란트 램프가 빠질 수 있었음).

## 15. 제1장을 1인칭 2.5D로 다시 만든다 (2026-11-18)
- 사용자가 준 「가방 속의 소책자」 통합 개발 명세서(story/ch1-spec.md)를 그대로 구현. 장마다 다른 게임 방식을 쓰는 방향.
- 엔진: Three.js 대신 Canvas 2D 소프트웨어 레이캐스터(src/fps/). 번들 약 36 KB gzip(이전 약 150 KB). 이전 2D 1장 코드(src/game, src/data, src/scenes)는 지우지 않고 남겨 둠.
- 명세의 대사 중 거짓말 5곳과 사실 오류 3곳(영장, 열쇠수리공 모순, 볍씨)을 고침. 명세에 없던 시간 초과·숨긴 사진·파헤치기 분기를 정함. 근거: story/ch1-spec-review.md.
- 에셋은 전부 코드 그림. public/assets/ch1/manifest.json에 PNG·MP4를 적으면 같은 이름의 그림·컷을 대신 쓴다.

## 16. 제1장 그림은 Codex CLI로 생성 (2026-11-18)
- 사용자 요청: 에셋을 모두 Codex CLI로, 영상은 구글 플로우로 나중에, 소리는 제외("이미지만").
- Codex는 ChatGPT 로그인(구독 요금제 안)으로 실행. 설정의 기본 모델이 ChatGPT 로그인에서 지원되지 않아 실행 때만 `-m gpt-6-luna`로 지정.
- 같은 인물·물건의 변형은 한 이미지 안의 여러 칸(시트)으로 그려 모습을 맞춤. 배경은 마젠타 단색 → 키잉.
- 실패와 대응: 참조 이미지 편집을 쓰면 파일이 저장되지 않음 → 금지. 생성이 실패하자 다른 파일을 복사해 넣은 일이 있었음 → "대체 금지, 실패는 FAILED로 보고" 규칙 추가, 두 배치를 동시에 돌리지 않음.
- 원본(약 45 MB)은 깃에 올리지 않고, 줄인 결과(약 1 MB)만 올림.

## 17. 고닷(Godot 4.7) 버전으로 옮긴다 (2026-11-19)
- 사용자 요청: "이제 이 게임을 고닷 기반으로". 선택: 진짜 3D 방, 웹사이트로 공개.
- 위치: `godot/` (프로젝트), 내보낸 웹 빌드는 `dist-godot/` (깃에 올리지 않음). 배포하면 `/godot/` 아래에 올라가고, 기존 웹 버전은 그대로 둔다.
- 그대로 옮긴 것: 지도, 대사, 갈래, 시간·소음·침착 규칙(src/fps의 TS를 GDScript로 한 줄씩 옮김). 게임 판단은 지금처럼 2D 지도 좌표로 하고, 3D는 그리기만 한다.
- 그림: Codex 그림 69장을 그대로 쓴다. 벽·바닥·천장은 3D 면, 사람·물건은 카메라를 보는 판. 밝기는 웹 버전의 2D 빛 격자를 꼭짓점 색으로 구워서 같은 어두움을 유지(빛이 벽을 뚫지 않음). 화면은 높이 약 180픽셀로 그려 키운다.
- 소리: 웹 버전이 코드로 합성하던 소리를 브라우저의 오프라인 렌더로 WAV 39개로 녹음해 넣었다.
- 글꼴: Pretendard(OFL)를 넣었다(웹 빌드는 기기 글꼴을 쓸 수 없음).
- 영상: 고닷은 MP4를 재생하지 못하므로, 웹에서는 페이지 위에 HTML 비디오를 띄워 플로우 영상을 재생한다. 웹이 아니면 그림을 천천히 움직여 대신한다.
- 시험: `Godot --headless --path godot -- --bot --fast --plan=good|sus|shallow|timeout` 이 1장을 끝까지 자동으로 해 보고 결말을 출력한다. 웹 주소에 `?fast&cp=ch1_hide&touch`를 붙이면 숨기기 장면부터, 터치 조작으로 시작한다.
