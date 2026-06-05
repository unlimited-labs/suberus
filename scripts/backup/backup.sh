#!/usr/bin/env bash
# Suberus production backup: PostgreSQL (logical dump) + Garage S3 mirror,
# bundled into an encrypted, deduplicated, off-site restic snapshot.
#
# Ordering matters: dump DB FIRST, then mirror S3. Objects only grow between
# the two steps, so every storageKey in the dump already has its object in the
# mirror (no dangling references). See docs in scripts/backup/README.md.
#
# Usage: scripts/backup/backup.sh

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$LIB_DIR/lib.sh"
load_config

# Capture all output to a run log (for the alert email) while still forwarding
# it to the original stdout/stderr (which cron redirects to its own log file).
RUN_LOG="$(mktemp)"
exec 3>&1
exec >"$RUN_LOG" 2>&1
finish() {
  local rc=$?
  notify_backup_result "$rc" "$RUN_LOG"   # email OK/FAILED with a log tail
  cat "$RUN_LOG" >&3 2>/dev/null           # forward full log to cron's stdout
  rm -rf "${work:-}" 2>/dev/null
  rm -f "${RCLONE_CONF_EPHEMERAL:-}" "$RUN_LOG" 2>/dev/null
}
trap finish EXIT

preflight

start_ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
sweep_stale_staging
work="$(mktemp -d "$STAGING_DIR/run.XXXXXX")"
mkdir -p "$work/storage"
log "staging: $work"

# --- 1. DB dump (custom format) -----------------------------------------
dump_args=(-U "$PG_USER" -d "$PG_DB" -Fc)
[[ "$DUMP_EXCLUDE_PGBOSS" == "1" ]] && dump_args+=(--exclude-schema=pgboss)
log "dumping database (${dump_args[*]})"
docker exec "$PG_CONTAINER" pg_dump "${dump_args[@]}" > "$work/db.dump"
dump_sha=$(sha256sum "$work/db.dump" | awk '{print $1}')
dump_size=$(stat -c '%s' "$work/db.dump")
log "db.dump: $dump_size bytes, sha256=$dump_sha"

# --- 2. S3 mirror --------------------------------------------------------
log "mirroring bucket $RCLONE_REMOTE:$GARAGE_BUCKET (exclude: $S3_EXCLUDE)"
rclone_cmd sync "$RCLONE_REMOTE:$GARAGE_BUCKET" "$work/storage" --exclude "$S3_EXCLUDE"
obj_count=$(find "$work/storage" -type f | wc -l | tr -d ' ')
log "mirrored $obj_count object(s)"

# --- 3. Manifest ---------------------------------------------------------
git_sha=$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null || echo unknown)
last_migration=$(ls "$REPO_ROOT/prisma/migrations" 2>/dev/null | grep -E '^[0-9]' | tail -1 || echo unknown)
pg_version=$(pg_psql -At -c 'SHOW server_version' 2>/dev/null || echo unknown)
cat > "$work/manifest.json" <<JSON
{
  "createdAt": "$start_ts",
  "gitSha": "$git_sha",
  "lastMigration": "$last_migration",
  "pgServerVersion": "$pg_version",
  "pgbossExcluded": ${DUMP_EXCLUDE_PGBOSS:-0},
  "s3Exclude": "$S3_EXCLUDE",
  "objectCount": $obj_count,
  "dumpBytes": $dump_size,
  "dumpSha256": "$dump_sha"
}
JSON
log "manifest written"

# --- 4. Consistency check (fails on dangling references) -----------------
CONSISTENCY_REPORT="$work/consistency-report.txt" \
  bash "$LIB_DIR/verify-consistency.sh" "$work"

# --- 5. restic backup ----------------------------------------------------
log "uploading restic snapshot"
restic_cmd backup "$work" \
  --tag suberus --tag db+s3 \
  --host "${BACKUP_HOST_TAG:-suberus-prod}"

# --- 6. Retention --------------------------------------------------------
log "pruning (keep-daily=$KEEP_DAILY keep-weekly=$KEEP_WEEKLY)"
restic_cmd forget --prune \
  --keep-daily "$KEEP_DAILY" \
  --keep-weekly "$KEEP_WEEKLY" \
  --tag suberus

latest=$(restic_cmd snapshots --json latest 2>/dev/null | grep -oE '"short_id":"[^"]+"' | tail -1 | cut -d'"' -f4 || true)
log "DONE — snapshot ${latest:-?} (started $start_ts)"
