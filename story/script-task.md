story.md(스토리 v2)를 바탕으로 제1장 「12월」의 완성 대본을 써라. current-lines.md는 지금 게임에 들어 있는 대사다. 참고만 하고, 좋은 줄은 살려도 되지만 그대로 베낄 필요는 없다.

## 분량과 범위
- 플레이 10–20분. 스토리 v2의 1, 1-1, 2–9 모든 장면과 모든 분기를 빠짐없이 쓴다.
- 분기마다 대사를 끝까지 쓴다("이하 동일" 같은 생략 금지).

## 쓸 수 있는 것 (이 밖의 장소·인물·소품은 쓰지 말 것)
- 장소: `집(낮)`, `집(해 질 녘)`, `집(밤)`, `계단`, `거리(밤)`.
- 집의 조사 지점 id: 문(door), 난로(stove), 커피포트(coffeepot), 감자 상자(potato), 탁자(table), 재봉틀(sewing), 창(window), 바구니(basket), 라디오(radio), 달력(calendar), 옷장(wardrobe), 마룻장(floor), 침대(bed), 책가방(bag), 선반(shelf), 결혼사진(photo).
- 거리의 지점: 집 현관(home), 빵집 뒷문(bakery), 성당(church), 우편함(mailbox), 문 밑(doorgap), 문간(doorway, 숨을 곳), 수레(cart, 숨을 곳), 통(barrels, 숨을 곳), 게시판(board, 밝은 구역).
- 인물(화자 id): 엘리제(elise), 파울(paul), 로테(lotte), 크뤼거 부인(kruger), 요한(johann), 포크트(vogt), 브란트(brandt), 행인(townsman/townswoman), 그리고 이름 없는 목소리(문밖, 라디오).
- 표정: neutral, smile, worried, sad, afraid, stern, resolute.
- 동작: 걷기, 쪼그려 앉기, 손 뻗기, 두려움, 고개 숙이기, 앉기, 들고 가기.

## 형식 (정확히 지킬 것)
```
# 장면 1. 제목
장소: 집(낮) · 시각: 오전 10시 · 체크포인트: morning

[카드] 화면에 크게 뜨는 글
[목표] 화면 위쪽 목표 문구
[연출] 무대 지시 (화면에 표시되지 않음. 누가 어디로 걷는지, 소리, 조명)
[소리] 노크 / 문 / 종이 / 불 / 발소리 등
엘리제(worried): 대사
(생각) 생각 문장
문밖: 화면 밖 목소리 대사
[알림] 잠깐 뜨는 작은 글

[조사 calendar "살펴보기"]
  (생각) …
  ※ 조사는 플레이어가 원하는 순서로 한다. 들여쓰기한 줄이 그 지점을 눌렀을 때 나오는 내용이다.

[선택 lotte_answer]
  1) 로테를 말없이 꼭 안아 준다 → 효과: lotte_trust = 2
     로테(sad): …
  2) "잘했어. 넌 옳은 일을 한 거야." → 효과: lotte_trust = 2
     …
  ※ 큰따옴표로 감싼 선택지는 엘리제가 하는 말, 따옴표가 없으면 행동.

[조건 paul_taken = true]
  …
[조건 아니면]
  …

[플레이 숨기기]
  (규칙, 숨길 곳마다의 결과 알림 문구, 실패·성공 줄을 모두 적는다)
[플레이 거리]
  (배포 규칙, 숨는 버튼 라벨, 잡혔을 때 각 분기의 대사를 모두 적는다)
```

## 사용할 상태값(효과와 조건에 이 이름을 쓸 것)
lotte_trust(0–2), donated(기부함), kruger_kind(계단에서 도움), mags_found, letter_found, book_found, book_burned, forced(문이 강제로 열림), refused_greeting, named_johann, paul_taken, stayed, warned(브란트가 한 번 봐줌), confessed(요한에게 고백), delivered(넣은 수 0–20), arrested, suspicion(의심 점수, 효과에 +1 등으로 적어라).

## 마지막에
`# 부록. 화면 문구` 아래에 버튼 라벨(조사, 숨기, 넣기, 문 열기 등)과 장면 카드, 결말 요약 문장(에필로그 화면에 상태값에 따라 나오는 한 줄 요약들)을 목록으로 적어라.
