#!/bin/sh
set -e

echo "🚀 Starting Momtaz Chem Application..."

echo "⏳ Waiting for database to be ready..."
until nc -z db 5432; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ Database is ready!"

echo "📦 Running database migrations..."
npm run db:push

echo "🎉 Starting application..."
exec node dist/index.js
