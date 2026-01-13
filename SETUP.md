# Suberus - Setup Guide

System zarządzania abstraktami na konferencję naukową.

## Wymagania

- Node.js 24+
- pnpm 10+
- Docker & Docker Compose
- PostgreSQL 18+ 

## 1. Instalacja zależności

Zależności obsługiwane są przez (proto)[https://moonrepo.dev/proto]
Aby zainstalować wymagane wersje node oraz pnpm:
`proto install`

## 2. Uruchom środowisko Docker

```bash
# Uruchom wszystkie serwisy (PostgreSQL, Electric SQL, Garage, Mailpit)
docker-compose up -d
```

Wszystkie kontenery powinny być w stanie `healthy` lub `running`.


## 4. Konfiguracja Garage (Storage)

Po pierwszym uruchomieniu skonfiguruj Garage:

```bash
# 1. Wyświetl status klastra
docker compose exec -it garage /garage status

# 2. Skopiuj ID węzła (NODE_ID) i przypisz rolę
docker compose exec -it garage /garage layout assign <NODE_ID> -z dc1 -c 1G

# 3. Zastosuj konfigurację layoutu
docker compose exec -it garage /garage layout apply --version 1

# 4. Utwórz klucze dostępu
docker compose exec -it garage /garage key create suberus-api

# 5. Skopiuj ACCESS_KEY_ID i SECRET_ACCESS_KEY

# 6. Zaktualizuj .env.local:
GARAGE_ACCESS_KEY_ID="<access_key>"
GARAGE_SECRET_ACCESS_KEY="<secret_key>"

# 7. Skopiuj `grarage/rclone.conf.example` do `grarage/rclone.conf`  jeśli potrzebujesz podgląd plików.
# Zaaktualizuj <access_key> oraz <secret_key>
# Uruchom rclone:
rclone --vfs-cache-mode full --config .\garage\rclone.conf mount garage: <mount_point>

# 8. Utwórz bucket
docker compose exec -it garage /garage bucket create suberus-files

# 9. Przypisz bucket do klucza
docker compose exec -it garage /garage bucket allow suberus-files --read --write --key suberus-api
```

## 5. Uruchom aplikację

```bash
# Uruchom w trybie development
pnpm dev
```

Aplikacja dostępna na: http://localhost:3001

## Dostępne serwisy

| Serwis | URL | Opis |
|--------|-----|------|
| Aplikacja | http://localhost:3001 | Frontend + API |
| PostgreSQL | localhost:5432 | Baza danych |
| Electric SQL | http://localhost:3000 | Real-time sync |
| Garage S3 API | http://localhost:3902 | File storage API |
| Garage Admin | http://localhost:3900 | Garage admin panel |
| Mailpit UI | http://localhost:8025 | Email testing |
| Prisma Studio | http://localhost:5555 | Database GUI |
