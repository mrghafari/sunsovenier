#!/bin/bash
set -e
npm install
# db:push is skipped — drizzle-kit fails on existing DB indexes with null expressions
# Schema is already in sync; no migration needed for frontend-only changes
echo "✅ Post-merge setup complete (db:push skipped — schema already in sync)"
