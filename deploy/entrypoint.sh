#!/bin/sh
# Robust startup: wait for DB to be ready, apply schema, then start the app
# Assumes DATABASE_URL is set (docker-compose provides it)

RETRY_DELAY="${RETRY_DELAY:-3}"

echo "[entrypoint] Starting with DATABASE_URL=$DATABASE_URL"
echo "[entrypoint] Running as: $(whoami) (uid=$(id -u) gid=$(id -g))"

# Try migrate deploy until it succeeds (or no migrations present)
until npx prisma migrate deploy --skip-generate; do
  echo "[entrypoint] migrate deploy failed or DB not ready. Retrying in ${RETRY_DELAY}s ..."
  sleep "${RETRY_DELAY}"
done

# Always ensure schema exists when there are no migrations
until npx prisma db push --skip-generate; do
  echo "[entrypoint] db push failed or DB not ready. Retrying in ${RETRY_DELAY}s ..."
  sleep "${RETRY_DELAY}"
done

echo "[entrypoint] DB schema ensured. Starting app..."
exec npm run start
