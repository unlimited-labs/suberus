# Suberus backup & restore

Production backup of the **whole application state** — PostgreSQL **and** the
Garage S3 bucket — as a single, consistent, encrypted, off-site **restic**
snapshot. Designed to survive Prisma migrations and S3 key-layout changes.

## Why this design

| Concern | Approach | Why it's robust |
|---|---|---|
| Database | `pg_dump -Fc` via `docker exec suberus-postgres` | Logical dump of whatever schema exists → migration-agnostic. Client version == server (PG18), so pgvector dumps/restores cleanly. |
| Storage | `rclone sync` of the entire bucket | Copies whatever keys exist → layout changes (`generateSubmissionFileKey` etc.) are irrelevant. Reuses the repo's `garage/rclone.conf`. |
| Repository | `restic` over SFTP | Encryption at-rest (GDPR — manuscripts are personal data), dedup, retention, `restic check`. |
| Consistency | dump DB → mirror S3; verify `files.storageKey` ↔ objects | Objects only grow between the two steps → no dangling references. |

`pgboss` (transient job queue) and Electric SQL's shape cache are **not** backed
up — both are derived/transient state.

## Prerequisites (on the VPS / Linux host)

```bash
# Tools
sudo apt install -y restic rclone        # or download static binaries
# Docker must be running with the suberus stack (docker compose up -d)

# restic password — pick the location that matches how the backup runs:
#   (a) system-wide (root / system cron): /etc/suberus/restic-password
sudo install -d -m 700 /etc/suberus
printf 'a-long-random-passphrase\n' | sudo tee /etc/suberus/restic-password >/dev/null
sudo chmod 600 /etc/suberus/restic-password
#   (b) per-user (no sudo, user crontab): keep it in the tooling dir instead
#   ( openssl rand -base64 24 > ~/suberus-backup/restic-password; chmod 600 ~/suberus-backup/restic-password )
# Either way, point RESTIC_PASSWORD_FILE in backup.env at the file you chose,
# and back up THAT password separately — losing it makes the repo unrecoverable.

# SSH to the backup host (key-based, host in known_hosts)
ssh-keygen -t ed25519 -f ~/.ssh/suberus_backup    # if needed
ssh-copy-id -i ~/.ssh/suberus_backup backup@backup-host
ssh backup@backup-host true                        # trust host key once

# rclone remote: copy the example and fill in the Garage key/secret/endpoint
cp garage/rclone.conf.example garage/rclone.conf && $EDITOR garage/rclone.conf
```

## Configure

```bash
cp scripts/backup/backup.env.example scripts/backup/backup.env
$EDITOR scripts/backup/backup.env      # set RESTIC_REPOSITORY, paths, retention
```

## Initialise the restic repo (once)

```bash
set -a; source scripts/backup/backup.env; set +a
restic init
```

## Run a backup

```bash
bash scripts/backup/backup.sh
```

Steps: `pg_dump` → `rclone sync` bucket → write `manifest.json` →
**verify consistency (fails on dangling refs)** → `restic backup` → `restic forget --prune`.

## Restore

```bash
# Latest snapshot, into production (destructive — asks for confirmation):
bash scripts/backup/restore.sh

# A specific snapshot:
bash scripts/backup/restore.sh <short-id>

# Non-destructive restore DRILL into throwaway targets:
bash scripts/backup/restore.sh latest \
  --target-bucket suberus-files-restoretest \
  --target-db suberus_restore --yes
```

Order: restic restore → restore S3 → `pg_restore --clean --if-exists` →
post-restore consistency check + row-count sanity.

> Restoring into a **new** database requires it to exist first:
> `docker exec suberus-postgres createdb -U suberus suberus_restore`.

## Automation (cron)

A user crontab needs no root and works anywhere cron runs. Set an explicit
`PATH` (cron's is minimal) and pass the config via `BACKUP_ENV`:

```cron
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
# Nightly backup at 02:30 (logs rotate monthly via the date-stamped filename)
30 2 * * * BACKUP_ENV=/path/to/backup.env /bin/bash /path/to/backup.sh >> /path/to/logs/backup-$(date +\%Y\%m).log 2>&1
# Weekly restic integrity check (Sunday 04:00)
0 4 * * 0 BACKUP_ENV=/path/to/backup.env /bin/bash -c 'source /path/to/lib.sh; load_config; restic_cmd check' >> /path/to/logs/check-$(date +\%Y\%m).log 2>&1
# Prune logs older than 60 days (Sunday 05:00)
0 5 * * 0 find /path/to/logs -name '*.log' -mtime +60 -delete
```

Notes:
- `%` must be escaped as `\%` in crontab; the date-stamped filename gives one
  log file per month, and the prune line bounds total log growth.
- `backup.sh` auto-removes its own staging dir on exit and sweeps stale
  `run.*` dirs left by interrupted runs. `STAGING_DIR` needs free space ≥
  (db dump + full bucket size) for one run.

Before relying on it, test in cron's stripped environment to catch PATH issues:

```bash
env -i HOME="$HOME" PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  BACKUP_ENV=/path/to/backup.env /bin/bash /path/to/backup.sh
```

## Multiple Suberus instances on one host

Each instance gets its **own restic repository** (full isolation — one
instance's `restic forget --prune` only ever touches its own repo).

1. **Per-instance config** — one file per instance, named `backup.env.<name>`:

   ```bash
   cp scripts/backup/backup.env.example scripts/backup/backup.env.confA
   # In it, set the instance-specific values:
   #   RESTIC_REPOSITORY="sftp:backup@host:/srv/suberus-restic-confA"   # SEPARATE repo
   #   PG_CONTAINER="confA-postgres"        # distinct container_name per stack
   #   PG_DB / GARAGE_BUCKET / BACKUP_HOST_TAG  as appropriate
   restic init   # after: set -a; source scripts/backup/backup.env.confA
   ```

   > Two stacks can't share `container_name: suberus-postgres` — give each
   > compose project distinct container names and reference them via `PG_CONTAINER`.

2. **Run manually** — `BACKUP_ENV` selects the config:

   ```bash
   BACKUP_ENV=scripts/backup/backup.env.confA bash scripts/backup/backup.sh
   BACKUP_ENV=scripts/backup/backup.env.confA bash scripts/backup/restore.sh latest
   ```

3. **Automate** — one cron line per instance, staggered so they don't dump
   and mirror at the same moment:

   ```cron
   PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
   30 2 * * * BACKUP_ENV=/home/u/suberus-backup/backup.env.confA /bin/bash /home/u/suberus-backup/backup.sh >> /home/u/suberus-backup/logs/confA.log 2>&1
   45 2 * * * BACKUP_ENV=/home/u/suberus-backup/backup.env.confB /bin/bash /home/u/suberus-backup/backup.sh >> /home/u/suberus-backup/logs/confB.log 2>&1
   ```

## Off-site portability

Because restic abstracts the backend, moving off SFTP later (e.g. Backblaze B2,
S3, Azure) is a one-line `RESTIC_REPOSITORY` change in `backup.env` — no script
changes.
