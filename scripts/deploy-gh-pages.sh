#!/usr/bin/env bash
# Deploy the current branch build to the gh-pages branch.
# Usage: ./scripts/deploy-gh-pages.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$REPO_ROOT/dist/tripod"
TMP_BRANCH="gh-pages-deploy-tmp-$$"

cd "$REPO_ROOT"

# Ensure working tree is clean before we start
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes detected. Commit or stash them first." >&2
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"

cleanup() {
  # Remove any copied dist files from the repo root
  for f in index.html 404.html .nojekyll sitemap.xml; do
    rm -f "$REPO_ROOT/$f"
  done
  # Use glob carefully — only remove hashed build artefacts
  find "$REPO_ROOT" -maxdepth 1 \
    \( -name "*.js" -o -name "*.css" -o -name "*.txt" -o -name "*.png" \) \
    ! -name "karma.conf.js" -delete 2>/dev/null || true

  # Switch back to original branch
  git checkout -f "$CURRENT_BRANCH" 2>/dev/null || true

  # Delete temp branch if it exists
  git branch -D "$TMP_BRANCH" 2>/dev/null || true
}
trap cleanup EXIT

echo "==> Building Angular app..."
npx ng build --base-href /tripod/

echo "==> Preparing deploy files..."
cp "$DIST/index.html" "$DIST/404.html"
touch "$DIST/.nojekyll"

echo "==> Creating orphan branch..."
git checkout --orphan "$TMP_BRANCH"
git rm -rf . --cached --quiet 2>/dev/null || true

# Copy dist files to repo root
cp "$DIST/index.html"    .
cp "$DIST/404.html"      .
cp "$DIST/.nojekyll"     .
cp "$DIST"/*.js          . 2>/dev/null || true
cp "$DIST"/*.css         . 2>/dev/null || true
cp "$DIST"/*.txt         . 2>/dev/null || true
cp "$DIST"/*.png         . 2>/dev/null || true
cp "$DIST/sitemap.xml"   . 2>/dev/null || true

# Stage only the dist files we just copied
git add -- index.html 404.html .nojekyll sitemap.xml \
  $(ls ./*.js  2>/dev/null) \
  $(ls ./*.css 2>/dev/null) \
  $(ls ./*.txt 2>/dev/null) \
  $(ls ./*.png 2>/dev/null) 2>/dev/null || true

# karma.conf.js lives in the root and gets picked up by *.js — unstage it
git restore --staged karma.conf.js 2>/dev/null \
  || git rm --cached karma.conf.js 2>/dev/null || true

echo "==> Committing..."
git commit -m "deploy: $(git log "$CURRENT_BRANCH" -1 --format='%s')"

echo "==> Pushing to gh-pages..."
git push -u origin "$TMP_BRANCH":gh-pages --force

echo "==> Done. Deployed from branch: $CURRENT_BRANCH"
