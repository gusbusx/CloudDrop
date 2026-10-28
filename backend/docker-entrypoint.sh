#!/bin/sh
set -e
echo "Waiting for database..."
until nc -z "$DB_HOST" "$DB_PORT"; do sleep 1; done
echo "Running migrations..."
npx typeorm-ts-node-commonjs migration:run -d src/config/data-source.ts || echo "Migrations may already be applied."
echo "Starting backend..."
exec node dist/main.js
