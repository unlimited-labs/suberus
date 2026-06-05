#!/usr/bin/env bash
# Shared helpers, sourced by backup.sh / restore.sh / verify-consistency.sh.
set -Eeuo pipefail

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$LIB_DIR/../.." && pwd)"

log()  { printf '%s [backup] %s\n'  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >&2; }
warn() { printf '%s [backup] WARN: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >&2; }
die()  { printf '%s [backup] ERROR: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >&2; exit 1; }

load_config() {
  local env_file="${BACKUP_ENV:-$LIB_DIR/backup.env}"
  if [[ -f "$env_file" ]]; then
    # Config is sourced (= code exec): refuse a group/other-writable file.
    if find "$env_file" -maxdepth 0 -perm /022 2>/dev/null | grep -q .; then
      die "config $env_file is group/other-writable — refusing to source (chmod 600)"
    fi
    # shellcheck disable=SC1090
    source "$env_file"
    log "loaded config: $env_file"
  elif [[ -n "${BACKUP_ENV:-}" ]]; then
    die "BACKUP_ENV='$env_file' set but file not found"
  else
    warn "no backup.env at $env_file — relying on process environment"
  fi

  PG_CONTAINER="${PG_CONTAINER:-suberus-postgres}"
  PG_USER="${PG_USER:-suberus}"
  PG_DB="${PG_DB:-suberus}"
  DUMP_EXCLUDE_PGBOSS="${DUMP_EXCLUDE_PGBOSS:-1}"

  RCLONE_CONF="${RCLONE_CONF:-$REPO_ROOT/garage/rclone.conf}"
  RCLONE_REMOTE="${RCLONE_REMOTE:-garage}"
  GARAGE_BUCKET="${GARAGE_BUCKET:-suberus-files}"
  S3_EXCLUDE="${S3_EXCLUDE:-extraction-staging/**}"
  # Set GARAGE_CONTAINER to resolve the S3 endpoint from a container at runtime
  # (port not published to host); needs GARAGE_ACCESS_KEY_ID/SECRET.
  GARAGE_CONTAINER="${GARAGE_CONTAINER:-}"
  GARAGE_REGION="${GARAGE_REGION:-garage}"
  GARAGE_S3_PORT="${GARAGE_S3_PORT:-3902}"

  KEEP_DAILY="${KEEP_DAILY:-7}"
  KEEP_WEEKLY="${KEEP_WEEKLY:-4}"

  STAGING_DIR="${STAGING_DIR:-/var/tmp/suberus-backup}"

  ALERT_EMAIL_TO="${ALERT_EMAIL_TO:-}"
  ALERT_ON_SUCCESS="${ALERT_ON_SUCCESS:-1}"
  SMTP_FROM_NAME="${SMTP_FROM_NAME:-Suberus Backup}"
  SMTP_TLS_INSECURE="${SMTP_TLS_INSECURE:-0}"

  : "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required (set in backup.env)}"
  if [[ -z "${RESTIC_PASSWORD_FILE:-}" && -z "${RESTIC_PASSWORD:-}" ]]; then
    die "RESTIC_PASSWORD_FILE or RESTIC_PASSWORD is required"
  fi
}

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing command: $1"; }

rclone_cmd() { rclone --config "$RCLONE_CONF" "$@"; }

# Write an ephemeral 0600 rclone config pointing at the Garage container's
# current Docker IP. No-op when GARAGE_CONTAINER is empty.
RCLONE_CONF_EPHEMERAL=""
ensure_rclone_conf() {
  [[ -z "$GARAGE_CONTAINER" ]] && return 0
  : "${GARAGE_ACCESS_KEY_ID:?GARAGE_ACCESS_KEY_ID required when GARAGE_CONTAINER is set}"
  : "${GARAGE_SECRET_ACCESS_KEY:?GARAGE_SECRET_ACCESS_KEY required when GARAGE_CONTAINER is set}"
  local ip
  ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' \
         "$GARAGE_CONTAINER" 2>/dev/null | awk '{print $1}')
  [[ -n "$ip" ]] || die "cannot resolve IP of garage container '$GARAGE_CONTAINER'"
  RCLONE_CONF_EPHEMERAL="$(mktemp)"
  chmod 600 "$RCLONE_CONF_EPHEMERAL"
  printf '[%s]\ntype=s3\nprovider=Other\nenv_auth=false\naccess_key_id=%s\nsecret_access_key=%s\nregion=%s\nendpoint=http://%s:%s\nforce_path_style=true\n' \
    "$RCLONE_REMOTE" "$GARAGE_ACCESS_KEY_ID" "$GARAGE_SECRET_ACCESS_KEY" \
    "$GARAGE_REGION" "$ip" "$GARAGE_S3_PORT" > "$RCLONE_CONF_EPHEMERAL"
  RCLONE_CONF="$RCLONE_CONF_EPHEMERAL"
  log "garage endpoint resolved: $GARAGE_CONTAINER -> http://$ip:$GARAGE_S3_PORT"
}

# restic with optional SFTP transport override (RESTIC_SFTP_COMMAND/_ARGS).
restic_cmd() {
  local opts=()
  [[ -n "${RESTIC_SFTP_COMMAND:-}" ]] && opts+=(-o "sftp.command=$RESTIC_SFTP_COMMAND")
  [[ -n "${RESTIC_SFTP_ARGS:-}" ]] && opts+=(-o "sftp.args=$RESTIC_SFTP_ARGS")
  restic ${opts[@]+"${opts[@]}"} "$@"
}

pg_psql() { docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" "$@"; }

preflight() {
  require_cmd docker
  require_cmd rclone
  require_cmd restic

  docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null | grep -q true \
    || die "postgres container '$PG_CONTAINER' is not running"

  ensure_rclone_conf
  [[ -f "$RCLONE_CONF" ]] || die "rclone config not found: $RCLONE_CONF"
  rclone_cmd lsd "$RCLONE_REMOTE:$GARAGE_BUCKET" >/dev/null 2>&1 \
    || die "cannot reach bucket $RCLONE_REMOTE:$GARAGE_BUCKET via rclone"

  restic_cmd snapshots --no-lock >/dev/null 2>&1 \
    || die "restic repo unreachable/uninitialised: $RESTIC_REPOSITORY (run 'restic init')"

  mkdir -p "$STAGING_DIR"
  chmod 700 "$STAGING_DIR" 2>/dev/null || true
  log "preflight OK"
}

# Drop staging dirs leaked by a killed run (the EXIT trap misses SIGKILL).
sweep_stale_staging() {
  [[ -d "$STAGING_DIR" ]] || return 0
  local stale
  stale=$(find "$STAGING_DIR" -maxdepth 1 -name 'run.*' -type d -mtime +0 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$stale" -gt 0 ]]; then
    warn "removing $stale stale staging dir(s) from interrupted runs"
    find "$STAGING_DIR" -maxdepth 1 -name 'run.*' -type d -mtime +0 -exec rm -rf {} + 2>/dev/null || true
  fi
}

# send_email <subject> <body-file>. No-op when ALERT_EMAIL_TO is empty.
send_email() {
  local subject="$1" body_file="$2"
  [[ -z "$ALERT_EMAIL_TO" ]] && return 0
  if ! command -v curl >/dev/null 2>&1; then
    warn "curl missing — cannot send alert email"; return 0
  fi
  if [[ -z "${SMTP_HOST:-}" || -z "${SMTP_PORT:-}" || -z "${SMTP_USER:-}" \
        || -z "${SMTP_PASSWORD:-}" || -z "${SMTP_FROM_EMAIL:-}" ]]; then
    warn "alerting enabled but SMTP_* incomplete — skipping email"; return 0
  fi
  local msg cred; msg="$(mktemp)"; cred="$(mktemp)"; chmod 600 "$cred"
  trap 'rm -f "$msg" "$cred"' RETURN
  [[ "$SMTP_TLS_INSECURE" == "1" ]] && warn "SMTP_TLS_INSECURE=1 — TLS cert verification DISABLED"
  # Credentials via a 0600 config file, not argv (avoids `ps` exposure).
  printf 'user = "%s:%s"\n' "$SMTP_USER" "$SMTP_PASSWORD" > "$cred"
  {
    printf 'From: %s <%s>\n' "$SMTP_FROM_NAME" "$SMTP_FROM_EMAIL"
    printf 'To: %s\n' "$ALERT_EMAIL_TO"
    printf 'Subject: %s\n' "$subject"
    printf 'Date: %s\n' "$(date -R 2>/dev/null || date)"
    printf 'Content-Type: text/plain; charset=UTF-8\n\n'
    cat "$body_file"
  } > "$msg"
  local insecure=(); [[ "$SMTP_TLS_INSECURE" == "1" ]] && insecure=(--insecure)
  curl --silent --show-error --ssl-reqd "${insecure[@]}" \
    --config "$cred" \
    --connect-timeout 15 --max-time "${SMTP_MAX_TIME:-60}" \
    --url "smtp://$SMTP_HOST:$SMTP_PORT" \
    --mail-from "$SMTP_FROM_EMAIL" --mail-rcpt "$ALERT_EMAIL_TO" \
    --upload-file "$msg" </dev/null \
    2>&1 | sed 's/^/[smtp] /' >&2 || warn "alert email send failed"
  rm -f "$msg" "$cred"
}

# notify_backup_result <exit-code> <log-file>. Emails OK/FAILED with a log tail.
notify_backup_result() {
  local rc="$1" logf="$2" tag="${BACKUP_HOST_TAG:-suberus}" status
  if (( rc == 0 )); then
    status="OK"
    [[ "$ALERT_ON_SUCCESS" == "1" ]] || return 0
  else
    status="FAILED (rc=$rc)"
  fi
  local body; body="$(mktemp)"
  {
    echo "Suberus backup $status"
    echo "instance: $tag"
    echo "repo:     ${RESTIC_REPOSITORY:-?}"
    echo "host:     $(hostname 2>/dev/null || echo '?')"
    echo "time:     $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    echo
    echo "----- log tail -----"
    tail -n 30 "$logf" 2>/dev/null
  } > "$body"
  send_email "[Suberus backup] $tag: $status" "$body"
  rm -f "$body"
}
