#!/bin/bash
# =============================================================================
# PostgreSQL Database Backup Script
# Usage: bash backup-db.sh
# Cron: 0 2 * * * /opt/work-report-app/scripts/backup-db.sh >> /var/log/workreport-backup.log 2>&1
# =============================================================================

set -e

# Configuration - These will be read from .env file if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${APP_DIR}/.env"

# Backup configuration
BACKUP_DIR="/var/backups/work-report-app"
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

status() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo "============================================================"
echo "  Work Report App - Database Backup"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"

# Load environment variables from .env file
if [ -f "$ENV_FILE" ]; then
    # Extract DATABASE_URL from .env
    DATABASE_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d '=' -f2-)
    
    if [ -n "$DATABASE_URL" ]; then
        # Parse DATABASE_URL: postgresql://user:password@host:port/database
        # Remove postgresql:// prefix
        DB_STRING="${DATABASE_URL#postgresql://}"
        
        # Extract user
        DB_USER="${DB_STRING%%:*}"
        DB_STRING="${DB_STRING#*:}"
        
        # Extract password (up to @)
        DB_PASSWORD="${DB_STRING%%@*}"
        DB_STRING="${DB_STRING#*@}"
        
        # Extract host
        DB_HOST="${DB_STRING%%:*}"
        DB_STRING="${DB_STRING#*:}"
        
        # Extract port and database
        DB_PORT="${DB_STRING%%/*}"
        DB_NAME="${DB_STRING#*/}"
        
        status "Loaded database configuration from .env"
    else
        error "DATABASE_URL not found in .env file"
    fi
else
    error "Environment file not found: $ENV_FILE"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/workreport_${TIMESTAMP}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

echo ""
echo "Backup Configuration:"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo "  Output:   $BACKUP_FILE_GZ"
echo ""

# Perform backup
echo "Creating backup..."
if PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null; then
    status "Database dump created"
else
    error "Failed to create database dump"
fi

# Compress backup
echo "Compressing backup..."
if gzip "$BACKUP_FILE"; then
    status "Backup compressed"
else
    error "Failed to compress backup"
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
status "Backup created: $BACKUP_FILE_GZ ($BACKUP_SIZE)"

# Cleanup old backups
echo ""
echo "Cleaning up backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "workreport_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED_COUNT" -gt 0 ]; then
    status "Deleted $DELETED_COUNT old backup(s)"
else
    echo "  No old backups to delete"
fi

# List current backups
echo ""
echo "Current backups:"
ls -lh "$BACKUP_DIR"/workreport_*.sql.gz 2>/dev/null | tail -5 || echo "  No backups found"

# Summary
echo ""
echo "============================================================"
echo "  Backup completed successfully!"
echo "  File: $BACKUP_FILE_GZ"
echo "  Size: $BACKUP_SIZE"
echo "============================================================"

