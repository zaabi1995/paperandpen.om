#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---dry-run}"
case "$MODE" in
  --dry-run|--deploy) ;;
  *)
    echo "Usage: scripts/deploy_site.sh [--dry-run|--deploy]" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST="root@147.93.20.54"
REMOTE_ROOT="/www/wwwroot/paperandpen.om"

for required_command in git npm rsync ssh shasum; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Missing required command: $required_command" >&2
    exit 1
  fi
done

cd "$REPO_ROOT"

branch="$(git symbolic-ref --quiet --short HEAD || true)"
if [[ "$branch" != "main" ]]; then
  echo "Refusing to continue outside main, current branch: ${branch:-detached}" >&2
  exit 1
fi

git fetch --quiet origin main
head_revision="$(git rev-parse HEAD)"
origin_revision="$(git rev-parse origin/main)"
dirty=0
if ! git diff --quiet || ! git diff --cached --quiet || [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  dirty=1
fi

if [[ "$MODE" == "--deploy" ]]; then
  if [[ "$dirty" -ne 0 ]]; then
    echo "Refusing deployment from a dirty worktree." >&2
    exit 1
  fi
  if [[ "$head_revision" != "$origin_revision" ]]; then
    echo "Refusing deployment because HEAD is not exact origin/main." >&2
    exit 1
  fi
else
  if [[ "$dirty" -ne 0 ]]; then
    echo "Dry run includes uncommitted files. Real deployment would refuse them." >&2
  fi
  if [[ "$head_revision" != "$origin_revision" ]]; then
    echo "Dry run is not exact origin/main. Real deployment would refuse it." >&2
  fi
fi

npm ci
npm run ci

if [[ ! -f dist/index.html || ! -f dist/sitemap-0.xml ]]; then
  echo "Build output is incomplete." >&2
  exit 1
fi

deploy_tmp="$(mktemp -d "${TMPDIR:-/tmp}/paperandpen-deploy.XXXXXX")"
trap 'rm -rf "$deploy_tmp"' EXIT
stage="$deploy_tmp/site"
mkdir -p "$stage"
rsync -a dist/ "$stage/"

printf '%s\n' "$head_revision" > "$stage/.deploy-revision"
(
  cd "$stage"
  find . -type f ! -name '.deploy-manifest.sha256' -print \
    | LC_ALL=C sort \
    | while IFS= read -r file; do shasum -a 256 "$file"; done \
    > .deploy-manifest.sha256
)

ssh "$REMOTE_HOST" "test -d '$REMOTE_ROOT' && command -v sha256sum >/dev/null"

rsync_args=(
  -azc
  --itemize-changes
  --no-owner
  --no-group
  --no-perms
  --omit-dir-times
)
if [[ "$MODE" == "--dry-run" ]]; then
  rsync_args+=(--dry-run)
fi

rsync "${rsync_args[@]}" "$stage/" "$REMOTE_HOST:$REMOTE_ROOT/"

if [[ "$MODE" == "--dry-run" ]]; then
  echo "Dry run complete. No remote files were changed."
  exit 0
fi

# --no-perms lets the remote umask (root, 027) decide the mode of NEW files, so
# every fresh hashed asset landed as root 0640 and nginx (www) answered 403.
# On 29 Sep 2026 that took the site's only stylesheet down. Normalise after sync.
ssh "$REMOTE_HOST" "cd '$REMOTE_ROOT' && chown -R www:www . && find . -type d -exec chmod 755 {} + && find . -type f -exec chmod 644 {} +"
ssh "$REMOTE_HOST" "cd '$REMOTE_ROOT' && sha256sum -c .deploy-manifest.sha256"
echo "Deployment complete and checksums verified for $head_revision."
