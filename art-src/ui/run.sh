#!/bin/sh
# Generates the interface art with Codex CLI (ChatGPT plan). Usage: art-src/ui/run.sh [batch ...]
cd "$(dirname "$0")/../.." || exit 1
for b in ${*:-u1}; do
  echo "=== $b $(date +%T)"
  cat art-src/ui/briefs/_style.md art-src/ui/briefs/$b.md | codex exec -m gpt-6-luna -s workspace-write -C . -o "art-src/ui/logs/$b.last.txt" - > "art-src/ui/logs/$b.log" 2>&1
  echo "exit $? $(date +%T)"
done
