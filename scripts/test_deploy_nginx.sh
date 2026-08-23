#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_SCRIPT="$REPO_ROOT/scripts/deploy_nginx.sh"

test_root="$(mktemp -d "${TMPDIR:-/tmp}/paperandpen-nginx-test.XXXXXX")"
trap 'rm -rf "$test_root"' EXIT
transaction="$test_root/remote-transaction.sh"

awk '
  /cat <<.REMOTE_TRANSACTION./ { capture = 1; next }
  /^REMOTE_TRANSACTION$/ { capture = 0 }
  capture { print }
' "$DEPLOY_SCRIPT" > "$transaction"

if [[ ! -s "$transaction" ]]; then
  echo "Could not extract the remote nginx transaction." >&2
  exit 1
fi
bash -n "$DEPLOY_SCRIPT"
bash -n "$transaction"

write_mocks() {
  bin_dir="$1"
  mkdir -p "$bin_dir"

  cat > "$bin_dir/openssl" <<'MOCK_OPENSSL'
#!/usr/bin/env bash
exit 0
MOCK_OPENSSL

  cat > "$bin_dir/flock" <<'MOCK_FLOCK'
#!/usr/bin/env bash
exit 0
MOCK_FLOCK

  cat > "$bin_dir/nginx" <<'MOCK_NGINX'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$TEST_FAILURE_MODE" =~ ^(nginx|restore|rollback-nginx)$ ]] \
  && [[ -f "$TEST_FORWARD_ARMED" ]] \
  && grep -q '^new crm configuration$' "$TEST_CRM_TARGET"; then
  rm -f "$TEST_FORWARD_ARMED"
  exit 1
fi
if [[ "$TEST_FAILURE_MODE" == "rollback-nginx" ]] \
  && [[ -f "$TEST_ROLLBACK_ARMED" ]] \
  && grep -q '^old crm configuration$' "$TEST_CRM_TARGET"; then
  rm -f "$TEST_ROLLBACK_ARMED"
  exit 1
fi
exit 0
MOCK_NGINX

  cat > "$bin_dir/systemctl" <<'MOCK_SYSTEMCTL'
#!/usr/bin/env bash
set -euo pipefail
command_name="${1:-}"
if [[ "$command_name" == "reload" ]]; then
  printf '%s\n' reload >> "$TEST_SERVICE_LOG"
  if [[ "$TEST_FAILURE_MODE" == "service" ]] \
    && [[ -f "$TEST_FORWARD_ARMED" ]] \
    && grep -q '^new crm configuration$' "$TEST_CRM_TARGET"; then
    rm -f "$TEST_FORWARD_ARMED"
    exit 1
  fi
  exit 0
fi
if [[ "$command_name" == "is-active" ]]; then
  printf '%s\n' "is-active ${3:-}" >> "$TEST_HEALTH_LOG"
  if [[ "$TEST_FAILURE_MODE" == "health" ]] \
    && [[ -f "$TEST_FORWARD_ARMED" ]] \
    && grep -q '^new crm configuration$' "$TEST_CRM_TARGET"; then
    rm -f "$TEST_FORWARD_ARMED"
    exit 1
  fi
  exit 0
fi
exit 2
MOCK_SYSTEMCTL

  cat > "$bin_dir/install" <<'MOCK_INSTALL'
#!/usr/bin/env bash
set -euo pipefail
filtered=()
for argument in "$@"; do
  if [[ "$argument" != "--" ]]; then
    filtered+=("$argument")
  fi
done
argument_count="${#filtered[@]}"
source_path="${filtered[$((argument_count - 2))]}"
target_path="${filtered[$((argument_count - 1))]}"
if [[ "$TEST_FAILURE_MODE" == "install" ]] \
  && [[ -f "$TEST_FORWARD_ARMED" ]] \
  && [[ "$target_path" == *crm.paperandpen.om.conf.paperandpen-pending-* ]]; then
  rm -f "$TEST_FORWARD_ARMED"
  exit 1
fi
if [[ "$TEST_FAILURE_MODE" == "restore" ]] \
  && [[ -f "$TEST_ROLLBACK_ARMED" ]] \
  && [[ "$target_path" == *paperandpen-rollback-* ]]; then
  rm -f "$TEST_ROLLBACK_ARMED"
  exit 1
fi
exec /usr/bin/install "${filtered[@]}"
MOCK_INSTALL

  cat > "$bin_dir/mv" <<'MOCK_MV'
#!/usr/bin/env bash
set -euo pipefail
filtered=()
for argument in "$@"; do
  if [[ "$argument" != "--" ]]; then
    filtered+=("$argument")
  fi
done
argument_count="${#filtered[@]}"
source_path="${filtered[$((argument_count - 2))]}"
if [[ "$TEST_FAILURE_MODE" == "move" ]] \
  && [[ -f "$TEST_FORWARD_ARMED" ]] \
  && [[ "$source_path" == *crm.paperandpen.om.conf.paperandpen-pending-* ]]; then
  rm -f "$TEST_FORWARD_ARMED"
  exit 1
fi
if [[ "$TEST_FAILURE_MODE" == "signal" ]] \
  && [[ -f "$TEST_FORWARD_ARMED" ]] \
  && [[ "$source_path" == *paperandpen.om.conf.paperandpen-pending-* ]] \
  && [[ "$source_path" != *crm.paperandpen.om.conf* ]]; then
  /bin/mv "${filtered[@]}"
  rm -f "$TEST_FORWARD_ARMED"
  kill -TERM "$PPID"
  exit 0
fi
exec /bin/mv "${filtered[@]}"
MOCK_MV

  cat > "$bin_dir/chmod" <<'MOCK_CHMOD'
#!/usr/bin/env bash
set -euo pipefail
filtered=()
for argument in "$@"; do
  if [[ "$argument" != "--" ]]; then
    filtered+=("$argument")
  fi
done
exec /bin/chmod "${filtered[@]}"
MOCK_CHMOD

  chmod +x \
    "$bin_dir/openssl" \
    "$bin_dir/flock" \
    "$bin_dir/nginx" \
    "$bin_dir/systemctl" \
    "$bin_dir/install" \
    "$bin_dir/mv" \
    "$bin_dir/chmod"
}

run_failure_case() {
  failure_mode="$1"
  expected_reload_count="$2"
  rollback_expected="$3"
  case_root="$test_root/$failure_mode"
  config_dir="$case_root/config"
  stage_dir="$config_dir/.stage"
  backup_root="$config_dir/.backups"
  backup_dir="$backup_root/20260823T000000Z-test"
  bin_dir="$case_root/bin"
  certificate="$case_root/fullchain.pem"
  apex_target="$config_dir/paperandpen.om.conf"
  crm_target="$config_dir/crm.paperandpen.om.conf"
  forward_armed="$case_root/forward-armed"
  rollback_armed="$case_root/rollback-armed"
  service_log="$case_root/service.log"
  health_log="$case_root/health.log"
  lock_file="$case_root/deploy.lock"

  mkdir -p "$stage_dir"
  printf '%s\n' 'old apex configuration' > "$apex_target"
  printf '%s\n' 'old crm configuration' > "$crm_target"
  printf '%s\n' 'new apex configuration' > "$stage_dir/paperandpen.om.conf"
  printf '%s\n' 'new crm configuration' > "$stage_dir/crm.paperandpen.om.conf"
  printf '%s\n' 'test certificate placeholder' > "$certificate"
  : > "$forward_armed"
  : > "$rollback_armed"
  write_mocks "$bin_dir"

  apex_sha="$(shasum -a 256 "$stage_dir/paperandpen.om.conf" | awk '{print $1}')"
  crm_sha="$(shasum -a 256 "$stage_dir/crm.paperandpen.om.conf" | awk '{print $1}')"
  previous_apex_sha="$(shasum -a 256 "$apex_target" | awk '{print $1}')"
  previous_crm_sha="$(shasum -a 256 "$crm_target" | awk '{print $1}')"

  export PATH="$bin_dir:$PATH"
  export TEST_FAILURE_MODE="$failure_mode"
  export TEST_FORWARD_ARMED="$forward_armed"
  export TEST_ROLLBACK_ARMED="$rollback_armed"
  export TEST_CRM_TARGET="$crm_target"
  export TEST_SERVICE_LOG="$service_log"
  export TEST_HEALTH_LOG="$health_log"

  set +e
  bash "$transaction" \
    "$stage_dir" \
    "$backup_dir" \
    "$backup_root" \
    "$apex_target" \
    "$crm_target" \
    "$certificate" \
    "$apex_sha" \
    "$crm_sha" \
    "$previous_apex_sha" \
    "$previous_crm_sha" \
    "test-revision" \
    "20260823T000000Z-test" \
    "$bin_dir/nginx" \
    "$bin_dir/systemctl" \
    "crm.paperandpen.om" \
    "$lock_file" \
    "604800" \
    > "$case_root/output.log" 2>&1
  status=$?
  set -e

  if [[ "$status" -eq 0 ]]; then
    echo "$failure_mode case unexpectedly succeeded." >&2
    exit 1
  fi
  if [[ ! -f "$backup_dir/paperandpen.om.conf" || ! -f "$backup_dir/crm.paperandpen.om.conf" ]]; then
    echo "$failure_mode case did not retain both backups." >&2
    sed -n '1,200p' "$case_root/output.log" >&2
    exit 1
  fi
  grep -qx 'old apex configuration' "$backup_dir/paperandpen.om.conf"
  grep -qx 'old crm configuration' "$backup_dir/crm.paperandpen.om.conf"

  reload_count=0
  if [[ -f "$service_log" ]]; then
    reload_count="$(wc -l < "$service_log" | tr -d ' ')"
  fi
  if [[ "$reload_count" -ne "$expected_reload_count" ]]; then
    echo "$failure_mode case performed $reload_count reloads, expected $expected_reload_count." >&2
    sed -n '1,200p' "$case_root/output.log" >&2
    exit 1
  fi

  if [[ "$rollback_expected" == "complete" ]]; then
    grep -qx 'old apex configuration' "$apex_target"
    grep -qx 'old crm configuration' "$crm_target"
    grep -q 'Automatic nginx rollback completed' "$case_root/output.log"
  else
    if [[ "$status" -ne 90 ]]; then
      echo "$failure_mode critical rollback status was $status, expected 90." >&2
      exit 1
    fi
    grep -q 'No reload was attempted' "$case_root/output.log"
  fi
  test ! -e "$stage_dir"
}

run_checksum_drift_case() {
  failure_mode="checksum-drift"
  case_root="$test_root/$failure_mode"
  config_dir="$case_root/config"
  stage_dir="$config_dir/.stage"
  backup_root="$config_dir/.backups"
  backup_dir="$backup_root/20260823T000000Z-test"
  bin_dir="$case_root/bin"
  certificate="$case_root/fullchain.pem"
  apex_target="$config_dir/paperandpen.om.conf"
  crm_target="$config_dir/crm.paperandpen.om.conf"
  service_log="$case_root/service.log"
  health_log="$case_root/health.log"
  lock_file="$case_root/deploy.lock"

  mkdir -p "$stage_dir"
  printf '%s\n' 'old apex configuration' > "$apex_target"
  printf '%s\n' 'old crm configuration' > "$crm_target"
  printf '%s\n' 'new apex configuration' > "$stage_dir/paperandpen.om.conf"
  printf '%s\n' 'new crm configuration' > "$stage_dir/crm.paperandpen.om.conf"
  printf '%s\n' 'test certificate placeholder' > "$certificate"
  write_mocks "$bin_dir"

  apex_sha="$(shasum -a 256 "$stage_dir/paperandpen.om.conf" | awk '{print $1}')"
  crm_sha="$(shasum -a 256 "$stage_dir/crm.paperandpen.om.conf" | awk '{print $1}')"
  previous_crm_sha="$(shasum -a 256 "$crm_target" | awk '{print $1}')"
  wrong_apex_sha="$(printf '%064d' 0)"

  export PATH="$bin_dir:$PATH"
  export TEST_FAILURE_MODE="$failure_mode"
  export TEST_FORWARD_ARMED="$case_root/not-used-forward"
  export TEST_ROLLBACK_ARMED="$case_root/not-used-rollback"
  export TEST_CRM_TARGET="$crm_target"
  export TEST_SERVICE_LOG="$service_log"
  export TEST_HEALTH_LOG="$health_log"

  set +e
  bash "$transaction" \
    "$stage_dir" "$backup_dir" "$backup_root" "$apex_target" "$crm_target" \
    "$certificate" "$apex_sha" "$crm_sha" "$wrong_apex_sha" "$previous_crm_sha" \
    "test-revision" "20260823T000000Z-test" "$bin_dir/nginx" "$bin_dir/systemctl" \
    "crm.paperandpen.om" "$lock_file" "604800" \
    > "$case_root/output.log" 2>&1
  status=$?
  set -e

  if [[ "$status" -eq 0 ]]; then
    echo "checksum drift case unexpectedly succeeded." >&2
    exit 1
  fi
  grep -qx 'old apex configuration' "$apex_target"
  grep -qx 'old crm configuration' "$crm_target"
  test ! -e "$backup_dir"
  test ! -e "$service_log"
  test ! -e "$stage_dir"
}

run_success_case() {
  failure_mode="success"
  case_root="$test_root/$failure_mode"
  config_dir="$case_root/config"
  stage_dir="$config_dir/.stage"
  backup_root="$config_dir/.backups"
  backup_dir="$backup_root/20260823T000000Z-test"
  bin_dir="$case_root/bin"
  certificate="$case_root/fullchain.pem"
  apex_target="$config_dir/paperandpen.om.conf"
  crm_target="$config_dir/crm.paperandpen.om.conf"
  service_log="$case_root/service.log"
  health_log="$case_root/health.log"
  lock_file="$case_root/deploy.lock"

  mkdir -p "$stage_dir"
  printf '%s\n' 'old apex configuration' > "$apex_target"
  printf '%s\n' 'old crm configuration' > "$crm_target"
  printf '%s\n' 'new apex configuration' > "$stage_dir/paperandpen.om.conf"
  printf '%s\n' 'new crm configuration' > "$stage_dir/crm.paperandpen.om.conf"
  printf '%s\n' 'test certificate placeholder' > "$certificate"
  write_mocks "$bin_dir"

  apex_sha="$(shasum -a 256 "$stage_dir/paperandpen.om.conf" | awk '{print $1}')"
  crm_sha="$(shasum -a 256 "$stage_dir/crm.paperandpen.om.conf" | awk '{print $1}')"
  previous_apex_sha="$(shasum -a 256 "$apex_target" | awk '{print $1}')"
  previous_crm_sha="$(shasum -a 256 "$crm_target" | awk '{print $1}')"

  export PATH="$bin_dir:$PATH"
  export TEST_FAILURE_MODE="$failure_mode"
  export TEST_FORWARD_ARMED="$case_root/not-used-forward"
  export TEST_ROLLBACK_ARMED="$case_root/not-used-rollback"
  export TEST_CRM_TARGET="$crm_target"
  export TEST_SERVICE_LOG="$service_log"
  export TEST_HEALTH_LOG="$health_log"

  bash "$transaction" \
    "$stage_dir" "$backup_dir" "$backup_root" "$apex_target" "$crm_target" \
    "$certificate" "$apex_sha" "$crm_sha" "$previous_apex_sha" "$previous_crm_sha" \
    "test-revision" "20260823T000000Z-test" "$bin_dir/nginx" "$bin_dir/systemctl" \
    "crm.paperandpen.om" "$lock_file" "604800" \
    > "$case_root/output.log" 2>&1

  grep -qx 'new apex configuration' "$apex_target"
  grep -qx 'new crm configuration' "$crm_target"
  grep -qx 'old apex configuration' "$backup_dir/paperandpen.om.conf"
  grep -qx 'old crm configuration' "$backup_dir/crm.paperandpen.om.conf"
  grep -q 'Nginx configuration deployed' "$case_root/output.log"
  reload_count="$(wc -l < "$service_log" | tr -d ' ')"
  if [[ "$reload_count" -ne 1 ]]; then
    echo "successful case performed $reload_count reloads, expected 1." >&2
    exit 1
  fi
  health_count="$(grep -c '^is-active nginx$' "$health_log")"
  if [[ "$health_count" -ne 1 ]]; then
    echo "successful case performed $health_count service-health checks, expected 1." >&2
    exit 1
  fi
  test ! -e "$stage_dir"
}

run_lock_contention_case() {
  failure_mode="lock-contention"
  case_root="$test_root/$failure_mode"
  config_dir="$case_root/config"
  stage_dir="$config_dir/.stage"
  backup_root="$config_dir/.backups"
  backup_dir="$backup_root/20260823T000000Z-test"
  bin_dir="$case_root/bin"
  certificate="$case_root/fullchain.pem"
  apex_target="$config_dir/paperandpen.om.conf"
  crm_target="$config_dir/crm.paperandpen.om.conf"
  service_log="$case_root/service.log"
  health_log="$case_root/health.log"
  lock_file="$case_root/deploy.lock"

  mkdir -p "$stage_dir"
  printf '%s\n' 'old apex configuration' > "$apex_target"
  printf '%s\n' 'old crm configuration' > "$crm_target"
  printf '%s\n' 'new apex configuration' > "$stage_dir/paperandpen.om.conf"
  printf '%s\n' 'new crm configuration' > "$stage_dir/crm.paperandpen.om.conf"
  printf '%s\n' 'test certificate placeholder' > "$certificate"
  write_mocks "$bin_dir"
  cat > "$bin_dir/flock" <<'MOCK_FLOCK_CONTENTION'
#!/usr/bin/env bash
exit 1
MOCK_FLOCK_CONTENTION
  chmod +x "$bin_dir/flock"

  apex_sha="$(shasum -a 256 "$stage_dir/paperandpen.om.conf" | awk '{print $1}')"
  crm_sha="$(shasum -a 256 "$stage_dir/crm.paperandpen.om.conf" | awk '{print $1}')"
  previous_apex_sha="$(shasum -a 256 "$apex_target" | awk '{print $1}')"
  previous_crm_sha="$(shasum -a 256 "$crm_target" | awk '{print $1}')"

  export PATH="$bin_dir:$PATH"
  export TEST_FAILURE_MODE="$failure_mode"
  export TEST_FORWARD_ARMED="$case_root/not-used-forward"
  export TEST_ROLLBACK_ARMED="$case_root/not-used-rollback"
  export TEST_CRM_TARGET="$crm_target"
  export TEST_SERVICE_LOG="$service_log"
  export TEST_HEALTH_LOG="$health_log"

  set +e
  bash "$transaction" \
    "$stage_dir" "$backup_dir" "$backup_root" "$apex_target" "$crm_target" \
    "$certificate" "$apex_sha" "$crm_sha" "$previous_apex_sha" "$previous_crm_sha" \
    "test-revision" "20260823T000000Z-test" "$bin_dir/nginx" "$bin_dir/systemctl" \
    "crm.paperandpen.om" "$lock_file" "604800" \
    > "$case_root/output.log" 2>&1
  status=$?
  set -e

  if [[ "$status" -ne 75 ]]; then
    echo "lock contention status was $status, expected 75." >&2
    exit 1
  fi
  grep -qx 'old apex configuration' "$apex_target"
  grep -qx 'old crm configuration' "$crm_target"
  grep -q 'Another Paper & Pen nginx deployment holds' "$case_root/output.log"
  test ! -e "$backup_dir"
  test ! -e "$service_log"
  test ! -e "$health_log"
  test ! -e "$stage_dir"
}

run_success_case
run_lock_contention_case
run_failure_case nginx 1 complete
run_failure_case service 2 complete
run_failure_case health 2 complete
run_failure_case install 1 complete
run_failure_case move 1 complete
run_failure_case signal 1 complete
run_failure_case restore 0 critical
run_failure_case rollback-nginx 0 critical
run_checksum_drift_case
echo "NGINX DEPLOYMENT TESTS PASS"
