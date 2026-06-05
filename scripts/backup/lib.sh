#!/usr/bin/env bash
# Shared helpers for Suberus backup/restore scripts.
# Sourced by backup.sh, restore.sh, verify-consistency.sh.

set -Eeuo pipefail

# --- Paths ---------------------------------------------------------------
LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$LIB_DIR/../.." && pwd)"

# --- Logging -------------------------------------------------------------
log()  { printf '%s [backup] %s\n'  "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >&2; }
warn() { printf '%s [backup] WARN: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >&2; }
die()  { printf '%s [backup] ERROR: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >&2; exit 1; }

# --- Config --------------------------------------------------------------
# Loads scripts/backup/backup.env (real config, git-ignored). Falls back to
# environment if the file is absent (e.g. systemd EnvironmentFile).
load_config() {
  local env_file="${BACKUP_ENV:-$LIB_DIR/backup.env}"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    source "$env_file"
    log "loaded config: $env_file"
  else
    warn "no backup.env at $env_file — relying on process environment"
  fi

  # Defaults (override in backup.env)
  PG_CONTAINER="${PG_CONTAINER:-suberus-postgres}"
  PG_USER="${PG_USER:-suberus}"
  PG_DB="${PG_DB:-suberus}"
  DUMP_EXCLUDE_PGBOSS="${DUMP_EXCLUDE_PGBOSS:-1}"

  RCLONE_CONF="${RCLONE_CONF:-$REPO_ROOT/garage/rclone.conf}"
  RCLONE_REMOTE="${RCLONE_REMOTE:-garage}"
  GARAGE_BUCKET="${GARAGE_BUCKET:-suberus-files}"
  S3_EXCLUDE="${S3_EXCLUDE:-extraction-staging/**}"
  # When GARAGE_CONTAINER is set, the S3 endpoint is resolved from that
  # container at runtime (for Garage instances whose S3 port isn't published
  # to the host — typical multi-tenant deploys). Requires GARAGE_ACCESS_KEY_ID
  # and GARAGE_SECRET_ACCESS_KEY. Leave empty to use a static RCLONE_CONF.
  GARAGE_CONTAINER="${GARAGE_CONTAINER:-}"
  GARAGE_REGION="${GARAGE_REGION:-garage}"
  GARAGE_S3_PORT="${GARAGE_S3_PORT:-3902}"

  KEEP_DAILY="${KEEP_DAILY:-7}"
  KEEP_WEEKLY="${KEEP_WEEKLY:-4}"

  STAGING_DIR="${STAGING_DIR:-/var/tmp/suberus-backup}"

  # Email alerting (optional). Disabled when ALERT_EMAIL_TO is empty.
  ALERT_EMAIL_TO="${ALERT_EMAIL_TO:-}"
  ALERT_ON_SUCCESS="${ALERT_ON_SUCCESS:-1}"
  SMTP_FROM_NAME="${SMTP_FROM_NAME:-Suberus Backup}"
  SMTP_TLS_INSECURE="${SMTP_TLS_INSECURE:-0}"

  : "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required (set in backup.env)}"
  if [[ -z "${RESTIC_PASSWORD_FILE:-}" && -z "${RESTIC_PASSWORD:-}" ]]; then
    die "RESTIC_PASSWORD_FILE or RESTIC_PASSWORD is required"
  fi
}

# --- Tooling -------------------------------------------------------------
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing command: $1"; }

rclone_cmd() { rclone --config "$RCLONE_CONF" "$@"; }

# Build an ephemeral rclone config pointing at a Garage container by resolving
# its current Docker IP (the S3 API port is often not published to the host).
# Sets RCLONE_CONF to the temp file and RCLONE_CONF_EPHEMERAL for cleanup.
# No-op when GARAGE_CONTAINER is empty (static RCLONE_CONF is used as-is).
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

# restic wrapper that injects an optional custom SFTP transport so a specific
# SSH key / options can be used without an OS-level ~/.ssh/config entry.
# Set RESTIC_SFTP_COMMAND (full ssh command, must end with: -s sftp) or
# RESTIC_SFTP_ARGS (extra args appended to restic's default ssh) in backup.env.
restic_cmd() {
  local opts=()
  [[ -n "${RESTIC_SFTP_COMMAND:-}" ]] && opts+=(-o "sftp.command=$RESTIC_SFTP_COMMAND")
  [[ -n "${RESTIC_SFTP_ARGS:-}" ]] && opts+=(-o "sftp.args=$RESTIC_SFTP_ARGS")
  restic ${opts[@]+"${opts[@]}"} "$@"
}

# Run psql inside the postgres container; reads SQL from stdin or -c.
pg_psql() { docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" "$@"; }

# --- Preflight -----------------------------------------------------------
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
  log "preflight OK"
}

# Remove staging run dirs left behind by a previously killed run. The EXIT
# trap normally cleans them, but SIGKILL / power loss can leak a full copy
# (db dump + entire S3 mirror). Drops anything older than ~1 day.
sweep_stale_staging() {
  [[ -d "$STAGING_DIR" ]] || return 0
  local stale
  stale=$(find "$STAGING_DIR" -maxdepth 1 -name 'run.*' -type d -mtime +0 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$stale" -gt 0 ]]; then
    warn "removing $stale stale staging dir(s) from interrupted runs"
    find "$STAGING_DIR" -maxdepth 1 -name 'run.*' -type d -mtime +0 -exec rm -rf {} + 2>/dev/null || true
  fi
}

# --- Email alerting (curl SMTP + STARTTLS, no extra deps) ----------------
# send_email <subject> <body-file>. No-op when ALERT_EMAIL_TO is empty.
send_email() {
  local subject="$1" body_file="$2"
  [[ -z "$ALERT_EMAIL_TO" ]] && return 0
  if ! command -v curl >/dev/null 2>&1; then
    warn "curl missing — cannot send alert email"; return 0
  fi
  : "${SMTP_HOST:?SMTP_HOST required for alerting}" \
    "${SMTP_PORT:?SMTP_PORT required}" "${SMTP_USER:?SMTP_USER required}" \
    "${SMTP_PASSWORD:?SMTP_PASSWORD required}" "${SMTP_FROM_EMAIL:?SMTP_FROM_EMAIL required}"
  local msg; msg="$(mktemp)"
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
    --connect-timeout 15 --max-time "${SMTP_MAX_TIME:-60}" \
    --url "smtp://$SMTP_HOST:$SMTP_PORT" \
    --mail-from "$SMTP_FROM_EMAIL" --mail-rcpt "$ALERT_EMAIL_TO" \
    --user "$SMTP_USER:$SMTP_PASSWORD" --upload-file "$msg" \
    2>&1 | sed 's/^/[smtp] /' >&2 || warn "alert email send failed"
  rm -f "$msg"
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
