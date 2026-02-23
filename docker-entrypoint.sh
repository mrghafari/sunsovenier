#!/bin/sh
set -e

echo "Starting Momtaz Chem Application..."

# ??? DATABASE_URL ?? ??? ????? ?? ?? ??????? ??? ????? db ???????
if [ -n "$DATABASE_URL" ]; then
  echo "Using DATABASE_URL from environment"
else
  DB_HOST="${DB_HOST:-db}"
  DB_PORT="${DB_PORT:-5432}"

  echo "Waiting for database at $DB_HOST:$DB_PORT..."
  MAX_RETRIES=30
  RETRY_COUNT=0
  while ! nc -z "$DB_HOST" "$DB_PORT"; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo "ERROR: Database not available after $MAX_RETRIES attempts"
      exit 1
    fi
    echo "Waiting for PostgreSQL... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
  done
fi

echo "Running database migrations..."
npm run db:push || {
  echo "Migration failed, trying with force..."
  npm run db:push --force || echo "Warning: Migration had issues"
}

echo "Starting application..."
exec node dist/server/index.js
