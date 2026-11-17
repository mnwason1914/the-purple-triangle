#!/bin/sh
# Build and publish dist/ to the gh-pages branch (GitHub Pages).
set -e
cd "$(dirname "$0")/.."
npm run build
touch dist/.nojekyll
TMP=$(mktemp -d)
cp -R dist/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -qm "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -f https://github.com/mnwason1914/the-purple-triangle.git gh-pages
rm -rf "$TMP"
echo "Deployed: https://mnwason1914.github.io/the-purple-triangle/"
