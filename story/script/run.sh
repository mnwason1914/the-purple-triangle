#!/bin/sh
# Writes the Chapter 1 script scene group by scene group with Gemini.
set -e
cd "$(dirname "$0")/../.."
for grp in "A|장면 A, A-1" "C|장면 C, D" "E|장면 E, F" "G|장면 G, H" "I|장면 I" "J|장면 J"; do
  id=${grp%%|*}; names=${grp#*|}
  out=story/script/$id.md
  [ -s "$out" ] && { echo "skip $id"; continue; }
  prev=$(ls story/script/[A-Z].md 2>/dev/null | tr '\n' ' ')

  cat > story/script/task-$id.md <<T
비트 시트(beats-ch1.md)의 **$names** 만 완성 대본으로 써라. 이미 쓴 앞 장면 대본이 함께 주어지면 인물의 말투와 사건을 그대로 이어 가라.

규칙:
- 시스템 지침의 형식(# 장면, [카드] [목표] [연출] [소리] [알림] [조사 id "라벨"] [선택 id] [조건 …] (생각) 화자(표정): 대사)을 정확히 지킨다.
- 비트마다 그 비트 번호를 소제목으로 단다(예: ### A4). 비트 시트의 모든 비트와 모든 분기를 빠짐없이, 끝까지 쓴다. 생략·요약 금지.
- 비트 시트에 적힌 줄 수 목표를 지킨다. 대사·생각 한 줄은 60자 이내.
- 비트 시트에 없는 사건·인물·물건을 새로 만들지 않는다. 한국 문화의 물건(보리차 등)이나 1936년 독일에 없던 것을 쓰지 않는다.
- 선택지 효과는 비트 시트의 상태값 이름 그대로 쓴다.
- 대본만 출력한다(설명·머리말 금지).
T
  ins=""; for f in $prev; do ins="$ins --in $f"; done
  node scripts/gemini/ask.mjs --models gemini-3-flash-preview,gemini-3.7-flash,gemini-3.8-flash,gemini-3.5-flash \
    --system story/script-system.md --in story/story.md --in story/beats-ch1.md $ins \
    --task-file story/script/task-$id.md --out "$out" --temp 0.8
done
