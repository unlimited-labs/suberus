#!/usr/bin/env bash
# Backup: pg_dump + Garage S3 mirror -> restic snapshot over SFTP.
# Order: dump DB, then mirror S3 (objects only grow, so no dangling refs).
# Usage: backup.sh   (config via BACKUP_ENV)

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$LIB_DIR/lib.sh"
load_config
umask 077

# Capture output to a run log (for the alert email) and forward to cron's stdout.
RUN_LOG="$(mktemp)"
exec 3>&1
exec >"$RUN_LOG" 2>&1
finish() {
  local rc=$?
  set +e
  cat "$RUN_LOG" >&3 2>/dev/null   # flush cron log before the (network) email
  notify_backup_result "$rc" "$RUN_LOG"
  [[ -n "${work:-}" ]] && rm -rf "$work"
  rm -f "${RCLONE_CONF_EPHEMERAL:-}" "$RUN_LOG"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

preflight

start_ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
sweep_stale_staging
work="$(mktemp -d "$STAGING_DIR/run.XXXXXX")"
mkdir -p "$work/storage"
log "staging: $work"

# 1. DB dump + validation + storageKey snapshot (at dump time, for verify)
dump_args=(-U "$PG_USER" -d "$PG_DB" -Fc)
[[ "$DUMP_EXCLUDE_PGBOSS" == "1" ]] && dump_args+=(--exclude-schema=pgboss)
log "dumping database (${dump_args[*]})"
docker exec "$PG_CONTAINER" pg_dump "${dump_args[@]}" > "$work/db.dump"
docker exec -i "$PG_CONTAINER" pg_restore --list < "$work/db.dump" >/dev/null 2>&1 \
  || die "db.dump failed pg_restore --list validation — aborting (likely truncated)"
dump_sha=$(sha256sum "$work/db.dump" | awk '{print $1}')
dump_size=$(stat -c '%s' "$work/db.dump")
log "db.dump: $dump_size bytes, sha256=$dump_sha"
pg_psql -At -c \
  "SELECT \"storageKey\" FROM files WHERE \"storageKey\" IS NOT NULL AND \"storageKey\" <> ''" \
  > "$work/db-storage-keys.txt" \
  || die "failed to export storageKeys for consistency check"

log "mirroring bucket $RCLONE_REMOTE:$GARAGE_BUCKET (exclude: $S3_EXCLUDE)"
rclone_cmd sync "$RCLONE_REMOTE:$GARAGE_BUCKET" "$work/storage" --exclude "$S3_EXCLUDE"
obj_count=$(find "$work/storage" -type f | wc -l | tr -d ' ')
log "mirrored $obj_count object(s)"

git_sha=$(cd "$REPO_ROOT" && git rev-parse HEAD 2>/dev/null || echo unknown)
last_migration=$(ls "$REPO_ROOT/prisma/migrations" 2>/dev/null | grep -E '^[0-9]' | tail -1 || echo unknown)
pg_version=$(pg_psql -At -c 'SHOW server_version' 2>/dev/null || echo unknown)
[[ "$DUMP_EXCLUDE_PGBOSS" == "1" ]] && pgboss_excluded=true || pgboss_excluded=false
cat > "$work/manifest.json" <<JSON
{
  "createdAt": "$start_ts",
  "gitSha": "$git_sha",
  "lastMigration": "$last_migration",
  "pgServerVersion": "$pg_version",
  "pgbossExcluded": $pgboss_excluded,
  "s3Exclude": "$S3_EXCLUDE",
  "objectCount": $obj_count,
  "dumpBytes": $dump_size,
  "dumpSha256": "$dump_sha"
}
JSON
log "manifest written"

# 4. Consistency check (fails on dangling references)
CONSISTENCY_REPORT="$work/consistency-report.txt" \
  bash "$LIB_DIR/verify-consistency.sh" "$work"

log "uploading restic snapshot"
restic_cmd backup "$work" \
  --tag suberus --tag db+s3 \
  --host "${BACKUP_HOST_TAG:-suberus-prod}"

# 6. Retention (scoped by tag AND host so a shared repo can't cross-prune)
log "pruning (keep-daily=$KEEP_DAILY keep-weekly=$KEEP_WEEKLY)"
restic_cmd forget --prune \
  --keep-daily "$KEEP_DAILY" \
  --keep-weekly "$KEEP_WEEKLY" \
  --tag suberus --host "${BACKUP_HOST_TAG:-suberus-prod}"

latest=$(restic_cmd snapshots --json latest 2>/dev/null | grep -oE '"short_id":"[^"]+"' | tail -1 | cut -d'"' -f4 || true)
log "DONE — snapshot ${latest:-?} (started $start_ts)"
