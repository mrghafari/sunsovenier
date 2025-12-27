#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/momtaz-chem/backups"
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

echo "=========================================="
echo "Database Backup"
echo "=========================================="

mkdir -p $BACKUP_DIR

echo "1. Creating database backup..."
docker-compose exec -T db pg_dump -U momtaz momtaz_chem > $BACKUP_FILE

echo "2. Compressing backup..."
gzip $BACKUP_FILE

echo "3. Cleaning old backups (keeping last 7 days)..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
echo "=========================================="
echo "Backup completed: ${BACKUP_FILE}.gz ($BACKUP_SIZE)"
echo "=========================================="
