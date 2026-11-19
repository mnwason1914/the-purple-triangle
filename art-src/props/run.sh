#!/bin/sh
# Generates the 3D-furniture face art with Codex CLI (ChatGPT plan). Usage: art-src/props/run.sh [batch ...]
cd "$(dirname "$0")/../.." || exit 1
for b in ${*:-p1 p2 p3}; do
  if [ -f "art-src/props/logs/$b.done" ]; then continue; fi
  echo "=== $b $(date +%T)"
  cat art-src/props/briefs/_style.md art-src/props/briefs/$b.md | codex exec -m gpt-6-luna -s workspace-write -C . -o "art-src/props/logs/$b.last.txt" - > "art-src/props/logs/$b.log" 2>&1
  echo "exit $? $(date +%T)"
  touch "art-src/props/logs/$b.done"
done
echo ALL DONE
