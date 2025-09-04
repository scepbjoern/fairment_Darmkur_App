#!/bin/sh
# Robust startup: wait for DB to be ready, apply schema/migrations, then start the app
# Assumes DATABASE_URL is set (docker-compose provides it)

set -eu

RETRY_DELAY="${RETRY_DELAY:-3}"
SCHEMA_PATH="${SCHEMA_PATH:-prisma/schema.prisma}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-prisma/migrations}"

log() {
  echo "[entrypoint] $*"
}

run_with_retry() {
  CMD="$1"
  FAIL_MSG="$2"
  while :; do
    if sh -c "$CMD"; then
      break
    fi
    log "$FAIL_MSG Retrying in ${RETRY_DELAY}s ..."
    sleep "${RETRY_DELAY}"
  done
}

log "Starting with DATABASE_URL=${DATABASE_URL:-<unset>}"
log "Running as: $(whoami) (uid=$(id -u) gid=$(id -g))"
# Prisma-Version (nicht kritisch, aber hilfreich beim Debuggen)
if npx prisma --version >/dev/null 2>&1; then
  # Zeile ohne Zeilenumbrueche loggen
  VERSION="$(npx prisma --version 2>/dev/null | tr '\n' ' ')"
  log "Prisma: $VERSION"
fi

# 1) Ausstehende Migrationen deployen (OHNE --skip-generate)
run_with_retry \
  "npx prisma migrate deploy --schema=\"$SCHEMA_PATH\"" \
  "migrate deploy fehlgeschlagen oder DB nicht bereit."

# 2) Nur wenn KEINE Migrationen existieren, Schema direkt pushen
if [ ! -d "$MIGRATIONS_DIR" ] || [ -z "$(ls -A "$MIGRATIONS_DIR" 2>/dev/null)" ]; then
  run_with_retry \
    "npx prisma db push --skip-generate --schema=\"$SCHEMA_PATH\"" \
    "db push fehlgeschlagen oder DB nicht bereit."
else
  log "Migrationen vorhanden – ueberspringe db push."
fi

log "DB-Schema sichergestellt. Starte App..."
exec npm run start
