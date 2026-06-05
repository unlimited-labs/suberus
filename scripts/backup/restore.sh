#!/usr/bin/env bash
# Restore: pull a restic snapshot, restore Garage S3, then PostgreSQL.
# Order: S3 first, then DB, so storageKey references resolve.
# Usage: restore.sh [snapshot-id] [--target-bucket N] [--target-db N] [--yes] [--force-prod]
# Point --target-* at throwaway names for a non-destructive drill.

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$LIB_DIR/lib.sh"
load_config
umask 077

SNAPSHOT="latest"
TARGET_BUCKET="$GARAGE_BUCKET"
TARGET_DB="$PG_DB"
ASSUME_YES=0
FORCE_PROD=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target-bucket) TARGET_BUCKET="$2"; shift 2;;
    --target-db)     TARGET_DB="$2"; shift 2;;
    --yes|-y)        ASSUME_YES=1; shift;;
    --force-prod)    FORCE_PROD=1; shift;;
    -*)              die "unknown flag: $1";;
    *)               SNAPSHOT="$1"; shift;;
  esac
done

# An unattended restore into the live db/bucket would wipe production.
if [[ "$ASSUME_YES" == "1" && "$FORCE_PROD" != "1" \
      && "$TARGET_DB" == "$PG_DB" && "$TARGET_BUCKET" == "$GARAGE_BUCKET" ]]; then
  die "refusing unattended restore into PRODUCTION ($TARGET_DB / $TARGET_BUCKET) — pass --force-prod"
fi

require_cmd docker; require_cmd rclone; require_cmd restic
docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null | grep -q true \
  || die "postgres container '$PG_CONTAINER' is not running"

restore_root="$STAGING_DIR/restore.$$"
mkdir -p "$restore_root"
trap 'rm -rf "$restore_root"; rm -f "${RCLONE_CONF_EPHEMERAL:-}"' EXIT
ensure_rclone_conf

# 1. restic restore (tolerate benign rc!=0; verify payload presence instead)
log "restoring restic snapshot '$SNAPSHOT' → $restore_root"
set +e
restic_cmd restore "$SNAPSHOT" --target "$restore_root"
restic_rc=$?
set -e
data_dir="$(dirname "$(find "$restore_root" -name manifest.json -type f | head -1)")"
[[ -n "$data_dir" && -f "$data_dir/db.dump" ]] \
  || die "restore failed (restic rc=$restic_rc): db.dump not found in restored snapshot"
(( restic_rc != 0 )) && warn "restic exited rc=$restic_rc, but payload is present — continuing"
log "snapshot contents at: $data_dir"
echo "----- manifest.json -----" >&2; cat "$data_dir/manifest.json" >&2; echo >&2
[[ -f "$data_dir/consistency-report.txt" ]] && \
  { echo "----- consistency-report.txt -----" >&2; cat "$data_dir/consistency-report.txt" >&2; }

# 2. Confirmation (destructive)
log "TARGET bucket=$TARGET_BUCKET  db=$TARGET_DB  (container=$PG_CONTAINER)"
if [[ "$ASSUME_YES" != "1" ]]; then
  read -r -p "This OVERWRITES the target bucket and database. Type 'restore' to proceed: " ans
  [[ "$ans" == "restore" ]] || die "aborted by user"
fi

# 3. Restore S3
log "restoring storage → $RCLONE_REMOTE:$TARGET_BUCKET"
rclone_cmd sync "$data_dir/storage" "$RCLONE_REMOTE:$TARGET_BUCKET"

# 4. Restore DB
log "restoring database → $TARGET_DB"
docker exec -i "$PG_CONTAINER" pg_restore -U "$PG_USER" -d "$TARGET_DB" \
  --clean --if-exists --no-owner < "$data_dir/db.dump"

# 5. Verify + sanity counts
log "verifying restored state"
VERIFY_PG_DB="$TARGET_DB" VERIFY_BUCKET="$TARGET_BUCKET" \
  bash "$LIB_DIR/verify-consistency.sh" --live || warn "post-restore consistency check reported issues"

for t in submissions files users; do
  c=$(docker exec -i "$PG_CONTAINER" psql -U "$PG_USER" -d "$TARGET_DB" -At \
        -c "SELECT count(*) FROM $t" 2>/dev/null || echo '?')
  log "rows in $t: $c"
done

log "RESTORE DONE"
