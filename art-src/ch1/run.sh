#!/bin/sh
# Generates the chapter-1 art with Codex CLI (ChatGPT plan), batch by batch.
# Usage: art-src/ch1/run.sh [batch ...]   (default: all)
cd "$(dirname "$0")/../.." || exit 1
BATCHES=${*:-"b1-walls b2-floors b3-people b4-faces-props"}
for b in $BATCHES; do
  if [ -f "art-src/ch1/logs/$b.done" ]; then continue; fi
  echo "=== $b $(date +%T)"
  cat art-src/ch1/briefs/_style.md art-src/ch1/briefs/$b.md | codex exec -m gpt-6-luna -s workspace-write -C . -o "art-src/ch1/logs/$b.last.txt" - > "art-src/ch1/logs/$b.log" 2>&1
  echo "exit $? $(date +%T)"
  touch "art-src/ch1/logs/$b.done"
done
echo ALL DONE
