#!/usr/bin/env bash
# Compare files.storageKey against the stored objects.
#   verify-consistency.sh <staging_dir>   # backup: DB keys vs staging/storage
#   verify-consistency.sh --live           # post-restore: DB keys vs live bucket
# Exit non-zero on any dangling ref (DB key without object); orphans only warn.

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$LIB_DIR/lib.sh"
load_config

MODE="${1:?usage: verify-consistency.sh <staging_dir>|--live}"

# Overrides applied AFTER load_config (env-prefix vars get clobbered by re-source).
PG_DB="${VERIFY_PG_DB:-$PG_DB}"
GARAGE_BUCKET="${VERIFY_BUCKET:-$GARAGE_BUCKET}"
[[ "$MODE" == "--live" ]] && ensure_rclone_conf

db_keys() {
  # Backup mode: use the keys captured at dump time. --live: query the DB.
  if [[ "$MODE" != "--live" && -f "$MODE/db-storage-keys.txt" ]]; then
    cat "$MODE/db-storage-keys.txt"
  else
    pg_psql -At -c \
      "SELECT \"storageKey\" FROM files WHERE \"storageKey\" IS NOT NULL AND \"storageKey\" <> ''"
  fi
}

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

# LC_ALL=C: comm compares byte-wise and needs inputs sorted the same way.
db_keys      | LC_ALL=C sort -u > "$tmp/db.txt"
storage_keys | LC_ALL=C sort -u > "$tmp/storage.txt"

# Drop DB keys under the excluded prefix (literal match), matching the mirror.
if [[ "$S3_EXCLUDE" == */\*\* ]]; then
  excl_prefix="${S3_EXCLUDE%/\*\*}/"
  awk -v p="$excl_prefix" 'index($0, p) != 1' "$tmp/db.txt" > "$tmp/db.f.txt"
  LC_ALL=C sort -u "$tmp/db.f.txt" > "$tmp/db.txt"; rm -f "$tmp/db.f.txt"
elif [[ -n "$S3_EXCLUDE" ]]; then
  warn "S3_EXCLUDE='$S3_EXCLUDE' is not a 'prefix/**' glob — DB-side filter skipped; counts may be off"
fi

LC_ALL=C comm -23 "$tmp/db.txt" "$tmp/storage.txt" > "$tmp/dangling.txt" || true
LC_ALL=C comm -13 "$tmp/db.txt" "$tmp/storage.txt" > "$tmp/orphan.txt" || true

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
