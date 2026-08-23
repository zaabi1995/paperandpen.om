#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---dry-run}"
case "$MODE" in
  --dry-run|--deploy) ;;
  *)
    echo "Usage: scripts/deploy_nginx.sh [--dry-run|--deploy]" >&2
    exit 2
    ;;
esac

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST="root@147.93.20.54"
REMOTE_CONFIG_DIR="/www/server/panel/vhost/nginx"
REMOTE_APEX_CONFIG="$REMOTE_CONFIG_DIR/paperandpen.om.conf"
REMOTE_CRM_CONFIG="$REMOTE_CONFIG_DIR/crm.paperandpen.om.conf"
REMOTE_CERTIFICATE="/www/server/panel/vhost/cert/paperandpen.om/fullchain.pem"
REMOTE_BACKUP_ROOT="$REMOTE_CONFIG_DIR/.paperandpen-backups"
REMOTE_NGINX="/usr/sbin/nginx"
REMOTE_SYSTEMCTL="/usr/bin/systemctl"
REMOTE_LOCK="/run/lock/paperandpen-nginx-deploy.lock"
CRM_HOSTNAME="crm.paperandpen.om"
CERTIFICATE_MIN_VALIDITY_SECONDS="604800"
LOCAL_APEX_CONFIG="$REPO_ROOT/ops/nginx/paperandpen.om.conf"
LOCAL_CRM_CONFIG="$REPO_ROOT/ops/nginx/crm.paperandpen.om.conf"

for required_command in git rsync shasum ssh; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Missing required command: $required_command" >&2
    exit 1
  fi
done

cd "$REPO_ROOT"

for source_config in "$LOCAL_APEX_CONFIG" "$LOCAL_CRM_CONFIG"; do
  if [[ ! -f "$source_config" || -L "$source_config" ]]; then
    echo "Required nginx source must be a regular file, not a symlink: $source_config" >&2
    exit 1
  fi
done

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
    echo "Refusing nginx deployment from a dirty worktree." >&2
    exit 1
  fi
  if [[ "$head_revision" != "$origin_revision" ]]; then
    echo "Refusing nginx deployment because HEAD is not exact origin/main." >&2
    exit 1
  fi
else
  if [[ "$dirty" -ne 0 ]]; then
    echo "Dry run includes uncommitted nginx files. Live mode would refuse them." >&2
  fi
  if [[ "$head_revision" != "$origin_revision" ]]; then
    echo "Dry run is not exact origin/main. Live mode would refuse it." >&2
  fi
fi

apex_sha="$(shasum -a 256 "$LOCAL_APEX_CONFIG" | awk '{print $1}')"
crm_sha="$(shasum -a 256 "$LOCAL_CRM_CONFIG" | awk '{print $1}')"
run_id="$(date -u +%Y%m%dT%H%M%SZ)-${head_revision:0:12}-$$"
remote_stage="$REMOTE_CONFIG_DIR/.paperandpen-stage-$run_id"
remote_backup="$REMOTE_BACKUP_ROOT/$run_id"

emit_candidate_config() {
  printf '%s\n' \
    'worker_processes 1;' \
    'error_log stderr;' \
    'events { worker_connections 16; }' \
    'http {' \
    '    access_log off;'
  sed \
    -e '/^[[:space:]]*access_log[[:space:]]/d' \
    -e '/^[[:space:]]*error_log[[:space:]]/d' \
    -e 's/^/    /' \
    "$LOCAL_APEX_CONFIG"
  sed \
    -e '/^[[:space:]]*access_log[[:space:]]/d' \
    -e '/^[[:space:]]*error_log[[:space:]]/d' \
    -e 's/^/    /' \
    "$LOCAL_CRM_CONFIG"
  printf '%s\n' '}'
}

emit_remote_transaction() {
  cat <<'REMOTE_TRANSACTION'
set -euo pipefail

stage_dir="$1"
backup_dir="$2"
backup_root="$3"
apex_target="$4"
crm_target="$5"
certificate="$6"
expected_apex_sha="$7"
expected_crm_sha="$8"
expected_current_apex_sha="$9"
expected_current_crm_sha="${10}"
revision="${11}"
run_id="${12}"
nginx_bin="${13}"
systemctl_bin="${14}"
crm_hostname="${15}"
lock_file="${16}"
certificate_min_validity_seconds="${17}"

apex_staged="$stage_dir/paperandpen.om.conf"
crm_staged="$stage_dir/crm.paperandpen.om.conf"
apex_pending="$apex_target.paperandpen-pending-$run_id"
crm_pending="$crm_target.paperandpen-pending-$run_id"
apex_rollback_pending="$apex_target.paperandpen-rollback-$run_id"
crm_rollback_pending="$crm_target.paperandpen-rollback-$run_id"
transaction_started=0
failure_handled=0

cleanup_stage() {
  rm -f -- "$apex_pending" "$crm_pending" "$apex_rollback_pending" "$crm_rollback_pending"
  rm -f -- "$apex_staged" "$crm_staged"
  rmdir -- "$stage_dir" 2>/dev/null || true
}

rollback() {
  trap - ERR INT TERM HUP
  set +e
  transaction_started=0
  echo "Restoring nginx configuration from $backup_dir" >&2

  rm -f -- "$apex_pending" "$crm_pending" "$apex_rollback_pending" "$crm_rollback_pending"
  if [[ ! -f "$backup_dir/paperandpen.om.conf" || ! -f "$backup_dir/crm.paperandpen.om.conf" ]]; then
    echo "CRITICAL: rollback backups are incomplete. No reload was attempted." >&2
    return 1
  fi
  if ! printf '%s  %s\n' "$expected_current_apex_sha" "$backup_dir/paperandpen.om.conf" | sha256sum -c -; then
    echo "CRITICAL: apex rollback backup checksum failed. No reload was attempted." >&2
    return 1
  fi
  if ! printf '%s  %s\n' "$expected_current_crm_sha" "$backup_dir/crm.paperandpen.om.conf" | sha256sum -c -; then
    echo "CRITICAL: CRM rollback backup checksum failed. No reload was attempted." >&2
    return 1
  fi

  if ! install -m 0644 -- "$backup_dir/paperandpen.om.conf" "$apex_rollback_pending"; then
    echo "CRITICAL: could not stage the apex rollback. No reload was attempted." >&2
    return 1
  fi
  if ! install -m 0644 -- "$backup_dir/crm.paperandpen.om.conf" "$crm_rollback_pending"; then
    rm -f -- "$apex_rollback_pending"
    echo "CRITICAL: could not stage the CRM rollback. No reload was attempted." >&2
    return 1
  fi
  if ! printf '%s  %s\n' "$expected_current_apex_sha" "$apex_rollback_pending" | sha256sum -c -; then
    rm -f -- "$apex_rollback_pending" "$crm_rollback_pending"
    echo "CRITICAL: staged apex rollback checksum failed. No reload was attempted." >&2
    return 1
  fi
  if ! printf '%s  %s\n' "$expected_current_crm_sha" "$crm_rollback_pending" | sha256sum -c -; then
    rm -f -- "$apex_rollback_pending" "$crm_rollback_pending"
    echo "CRITICAL: staged CRM rollback checksum failed. No reload was attempted." >&2
    return 1
  fi

  if ! mv -f -- "$apex_rollback_pending" "$apex_target"; then
    rm -f -- "$apex_rollback_pending" "$crm_rollback_pending"
    echo "CRITICAL: could not restore the apex target. No reload was attempted." >&2
    return 1
  fi
  if ! mv -f -- "$crm_rollback_pending" "$crm_target"; then
    rm -f -- "$crm_rollback_pending"
    echo "CRITICAL: could not restore the CRM target. No reload was attempted." >&2
    return 1
  fi
  if ! printf '%s  %s\n' "$expected_current_apex_sha" "$apex_target" | sha256sum -c -; then
    echo "CRITICAL: restored apex target checksum failed. No reload was attempted." >&2
    return 1
  fi
  if ! printf '%s  %s\n' "$expected_current_crm_sha" "$crm_target" | sha256sum -c -; then
    echo "CRITICAL: restored CRM target checksum failed. No reload was attempted." >&2
    return 1
  fi

  if ! rollback_nginx_output="$("$nginx_bin" -t -q 2>&1)"; then
    printf '%s\n' "$rollback_nginx_output" >&2
    echo "CRITICAL: restored configuration failed nginx -t. No reload was attempted." >&2
    return 1
  fi
  if ! "$systemctl_bin" reload nginx; then
    echo "CRITICAL: restored configuration passed nginx -t but reload failed." >&2
    return 1
  fi
  if ! "$systemctl_bin" is-active --quiet nginx; then
    echo "CRITICAL: nginx is not active after the rollback reload." >&2
    return 1
  fi
  echo "Automatic nginx rollback completed and the restored configuration passed nginx -t." >&2
  return 0
}

handle_failure() {
  status="$1"
  failure_context="$2"
  trap - ERR INT TERM HUP
  if [[ "$failure_handled" -eq 1 ]]; then
    exit "$status"
  fi
  failure_handled=1
  if [[ "$transaction_started" -eq 1 ]]; then
    if ! rollback; then
      status=90
    fi
  fi
  cleanup_stage
  echo "Nginx deployment failed: $failure_context" >&2
  exit "$status"
}

on_error() {
  status=$?
  handle_failure "$status" "remote transaction line $1"
}

on_signal() {
  handle_failure "$2" "received signal $1"
}

trap 'on_error "$LINENO"' ERR
trap 'on_signal INT 130' INT
trap 'on_signal TERM 143' TERM
trap 'on_signal HUP 129' HUP
trap cleanup_stage EXIT

umask 077
test -d "$(dirname "$lock_file")"
test ! -L "$lock_file"
exec 9>"$lock_file"
if ! flock -n 9; then
  echo "Another Paper & Pen nginx deployment holds $lock_file" >&2
  exit 75
fi

test -x "$nginx_bin"
test -x "$systemctl_bin"
test -d "$(dirname "$apex_target")"
test -d "$stage_dir"
test ! -L "$stage_dir"
test -f "$apex_staged"
test -f "$crm_staged"
test ! -L "$apex_target"
test ! -L "$crm_target"
test -r "$certificate"
openssl x509 -in "$certificate" -noout -checkhost "$crm_hostname" >/dev/null
openssl x509 -in "$certificate" -noout -checkend "$certificate_min_validity_seconds" >/dev/null
printf '%s  %s\n' "$expected_apex_sha" "$apex_staged" | sha256sum -c -
printf '%s  %s\n' "$expected_crm_sha" "$crm_staged" | sha256sum -c -
printf '%s  %s\n' "$expected_current_apex_sha" "$apex_target" | sha256sum -c -
printf '%s  %s\n' "$expected_current_crm_sha" "$crm_target" | sha256sum -c -

if [[ -e "$backup_root" ]]; then
  test -d "$backup_root"
  test ! -L "$backup_root"
else
  mkdir -- "$backup_root"
fi
chmod 0700 -- "$backup_root"
mkdir -- "$backup_dir"
chmod 0700 -- "$backup_dir"

cp -p -- "$apex_target" "$backup_dir/paperandpen.om.conf"
cp -p -- "$crm_target" "$backup_dir/crm.paperandpen.om.conf"
printf '%s  %s\n' "$expected_current_apex_sha" "$backup_dir/paperandpen.om.conf" | sha256sum -c -
printf '%s  %s\n' "$expected_current_crm_sha" "$backup_dir/crm.paperandpen.om.conf" | sha256sum -c -
printf 'revision=%s\nrun_id=%s\napex_sha256=%s\ncrm_sha256=%s\nprevious_apex_sha256=%s\nprevious_crm_sha256=%s\n' \
  "$revision" "$run_id" "$expected_apex_sha" "$expected_crm_sha" \
  "$expected_current_apex_sha" "$expected_current_crm_sha" \
  > "$backup_dir/deployment.txt"
chmod 0600 -- "$backup_dir/deployment.txt"

transaction_started=1
install -m 0644 -- "$apex_staged" "$apex_pending"
install -m 0644 -- "$crm_staged" "$crm_pending"
mv -f -- "$apex_pending" "$apex_target"
mv -f -- "$crm_pending" "$crm_target"

printf '%s  %s\n' "$expected_apex_sha" "$apex_target" | sha256sum -c -
printf '%s  %s\n' "$expected_crm_sha" "$crm_target" | sha256sum -c -
"$nginx_bin" -t -q
"$systemctl_bin" reload nginx
"$systemctl_bin" is-active --quiet nginx

transaction_started=0
trap - ERR INT TERM HUP
echo "Nginx configuration deployed. Backup retained at $backup_dir"
REMOTE_TRANSACTION
}

echo "Running read-only production preflight."
ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" \
  "set -eu; test -d '$REMOTE_CONFIG_DIR'; test -d '$(dirname "$REMOTE_LOCK")'; test -f '$REMOTE_APEX_CONFIG'; test -f '$REMOTE_CRM_CONFIG'; test ! -L '$REMOTE_APEX_CONFIG'; test ! -L '$REMOTE_CRM_CONFIG'; test ! -L '$REMOTE_LOCK'; if test -e '$REMOTE_BACKUP_ROOT'; then test -d '$REMOTE_BACKUP_ROOT'; test ! -L '$REMOTE_BACKUP_ROOT'; fi; test -x '$REMOTE_NGINX'; test -x '$REMOTE_SYSTEMCTL'; test -r '$REMOTE_CERTIFICATE'; command -v flock >/dev/null; command -v openssl >/dev/null; command -v python3 >/dev/null; command -v sha256sum >/dev/null; openssl x509 -in '$REMOTE_CERTIFICATE' -noout -checkhost '$CRM_HOSTNAME' >/dev/null; openssl x509 -in '$REMOTE_CERTIFICATE' -noout -checkend '$CERTIFICATE_MIN_VALIDITY_SECONDS' >/dev/null; nginx_output=\"\$('$REMOTE_NGINX' -t -q 2>&1)\" || { printf '%s\n' \"\$nginx_output\" >&2; exit 1; }; '$REMOTE_SYSTEMCTL' is-active --quiet nginx"

echo "Validating the proposed nginx files in remote memory without writing them."
emit_candidate_config | ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" \
  "python3 -c 'import os,sys; data=sys.stdin.buffer.read(); fd=os.memfd_create(\"paperandpen-nginx-test\", 0); os.write(fd, data); os.lseek(fd, 0, 0); os.set_inheritable(fd, True); os.execv(\"$REMOTE_NGINX\", [\"$REMOTE_NGINX\", \"-t\", \"-q\", \"-c\", f\"/proc/self/fd/{fd}\"])'"

echo "Validating the exact remote transaction shell."
emit_remote_transaction | ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" "bash -n"

echo "Candidate checksums:"
printf '  %s  %s\n' "$apex_sha" "$REMOTE_APEX_CONFIG"
printf '  %s  %s\n' "$crm_sha" "$REMOTE_CRM_CONFIG"
echo "Current production checksums:"
production_checksums="$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" \
  "sha256sum '$REMOTE_APEX_CONFIG' '$REMOTE_CRM_CONFIG'")"
printf '%s\n' "$production_checksums"
production_apex_sha="$(printf '%s\n' "$production_checksums" | awk 'NR == 1 { print $1 }')"
production_crm_sha="$(printf '%s\n' "$production_checksums" | awk 'NR == 2 { print $1 }')"
if [[ ! "$production_apex_sha" =~ ^[0-9a-f]{64}$ || ! "$production_crm_sha" =~ ^[0-9a-f]{64}$ ]]; then
  echo "Could not parse exact production nginx checksums." >&2
  exit 1
fi

if [[ "$MODE" == "--dry-run" ]]; then
  rsync \
    -azc \
    --dry-run \
    --itemize-changes \
    --no-owner \
    --no-group \
    --no-perms \
    "$LOCAL_APEX_CONFIG" \
    "$LOCAL_CRM_CONFIG" \
    "$REMOTE_HOST:$remote_stage/"
  ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" \
    "test ! -e '$remote_stage' && test ! -e '$remote_backup'"
  echo "Planned backup directory: $remote_backup"
  echo "Dry run complete. No remote files or services were changed."
  exit 0
fi

stage_created=0
cleanup_remote_stage() {
  if [[ "$stage_created" -eq 1 ]]; then
    ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" \
      "rm -f -- '$remote_stage/paperandpen.om.conf' '$remote_stage/crm.paperandpen.om.conf'; rmdir -- '$remote_stage' 2>/dev/null || true" \
      >/dev/null 2>&1 || true
  fi
}
trap cleanup_remote_stage EXIT

ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" \
  "test ! -e '$remote_stage'; mkdir -m 0700 -- '$remote_stage'; test -d '$remote_stage'; test ! -L '$remote_stage'"
stage_created=1

rsync \
  -azc \
  --no-owner \
  --no-group \
  --no-perms \
  "$LOCAL_APEX_CONFIG" \
  "$LOCAL_CRM_CONFIG" \
  "$REMOTE_HOST:$remote_stage/"

emit_remote_transaction | ssh -o BatchMode=yes -o ConnectTimeout=10 "$REMOTE_HOST" \
  "bash -s -- '$remote_stage' '$remote_backup' '$REMOTE_BACKUP_ROOT' '$REMOTE_APEX_CONFIG' '$REMOTE_CRM_CONFIG' '$REMOTE_CERTIFICATE' '$apex_sha' '$crm_sha' '$production_apex_sha' '$production_crm_sha' '$head_revision' '$run_id' '$REMOTE_NGINX' '$REMOTE_SYSTEMCTL' '$CRM_HOSTNAME' '$REMOTE_LOCK' '$CERTIFICATE_MIN_VALIDITY_SECONDS'"

stage_created=0
trap - EXIT
echo "Nginx deployment completed for $head_revision."
