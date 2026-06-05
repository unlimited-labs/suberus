#!/usr/bin/env bash
# Verify that every File.storageKey in the DB has a matching object in the
# storage mirror (and report orphans the other way round).
#
# Modes:
#   verify-consistency.sh <staging_dir>   # compare DB vs staging/storage (backup)
#   verify-consistency.sh --live          # compare DB vs live bucket (post-restore)
#
# Exit code: non-zero if any DANGLING reference is found (DB row without object).
# Orphans (object without DB row) are reported as warnings only.

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$LIB_DIR/lib.sh"
load_config

MODE="${1:?usage: verify-consistency.sh <staging_dir>|--live}"

# Allow callers (restore drills into throwaway targets) to override the DB /
# bucket AFTER load_config — env-prefix vars alone don't survive because
# load_config re-sources backup.env. ensure_rclone_conf is needed for --live
# so the Garage endpoint is resolved when GARAGE_CONTAINER is set.
PG_DB="${VERIFY_PG_DB:-$PG_DB}"
GARAGE_BUCKET="${VERIFY_BUCKET:-$GARAGE_BUCKET}"
if [[ "$MODE" == "--live" ]]; then
  ensure_rclone_conf
fi

# storageKey list from the DB. Table is mapped to "files", column "storageKey".
# Extraction-staging files are never recorded in the files table, so excluding
# that prefix from the mirror does not create false danglings.
db_keys() {
  pg_psql -At -c 'SELECT "storageKey" FROM files ORDER BY 1'
}

# Object key list from the chosen source.
storage_keys() {
  if [[ "$MODE" == "--live" ]]; then
    rclone_cmd lsf --files-only -R --exclude "$S3_EXCLUDE" "$RCLONE_REMOTE:$GARAGE_BUCKET"
  else
    local dir="$MODE/storage"
    [[ -d "$dir" ]] || die "storage mirror not found: $dir"
    ( cd "$dir" && find . -type f -printf '%P\n' )
  fi
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"; rm -f "${RCLONE_CONF_EPHEMERAL:-}"' EXIT

db_keys      | sort -u > "$tmp/db.txt"
storage_keys | sort -u > "$tmp/storage.txt"

# Apply the same exclude the mirror uses, so live/backup compare like-for-like.
# S3_EXCLUDE is an rclone glob (prefix/**); translate the common prefix form.
excl_prefix="${S3_EXCLUDE%/\*\*}"
if [[ -n "$excl_prefix" && "$excl_prefix" != "$S3_EXCLUDE" ]]; then
  grep -v "^$excl_prefix/" "$tmp/db.txt" > "$tmp/db.f.txt" || true
  mv "$tmp/db.f.txt" "$tmp/db.txt"
fi

# DANGLING: in DB, missing from storage.
comm -23 "$tmp/db.txt" "$tmp/storage.txt" > "$tmp/dangling.txt" || true
# ORPHAN: in storage, no DB row.
comm -13 "$tmp/db.txt" "$tmp/storage.txt" > "$tmp/orphan.txt" || true

db_count=$(wc -l < "$tmp/db.txt" | tr -d ' ')
st_count=$(wc -l < "$tmp/storage.txt" | tr -d ' ')
dangling=$(wc -l < "$tmp/dangling.txt" | tr -d ' ')
orphan=$(wc -l < "$tmp/orphan.txt" | tr -d ' ')

{
  echo "consistency report ($(date -u '+%Y-%m-%dT%H:%M:%SZ'))"
  echo "mode:           $MODE"
  echo "db storageKeys: $db_count"
  echo "storage objects:$st_count"
  echo "dangling (DB→no object): $dangling"
  echo "orphan   (object→no DB): $orphan"
  if (( dangling > 0 )); then
    echo "--- dangling keys ---"
    cat "$tmp/dangling.txt"
  fi
  if (( orphan > 0 )); then
    echo "--- orphan keys (first 50) ---"
    head -50 "$tmp/orphan.txt"
  fi
} | tee "${CONSISTENCY_REPORT:-/dev/stderr}"

if (( dangling > 0 )); then
  die "$dangling dangling reference(s) — backup is INCONSISTENT"
fi
(( orphan > 0 )) && warn "$orphan orphan object(s) present (harmless, not referenced)"
log "consistency OK"
