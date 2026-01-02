#!/bin/bash
# =============================================================================
# Work Report App - Production Deployment Script
# For servers with existing PostgreSQL installation
# Usage: curl -sSL <raw-url> | bash
# Or: bash deploy-production.sh
# =============================================================================

set -e

# Configuration
REPO_URL="https://github.com/mohammedtaufeeqahmed/work-report-application.git"
INSTALL_DIR="/opt/work-report-app"
APP_PORT="3000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "============================================================"
echo "  Work Report App - Production Deployment"
echo "============================================================"
echo -e "${NC}"

status() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[i]${NC} $1"; }

# Check sudo
if [ "$EUID" -ne 0 ]; then
    SUDO="sudo"
else
    SUDO=""
fi

# Step 1: Verify PostgreSQL
echo ""
echo "Step 1: Verifying PostgreSQL..."
if ! command -v psql &> /dev/null; then
    error "PostgreSQL is not installed. Please install PostgreSQL first."
fi

if ! $SUDO systemctl is-active --quiet postgresql; then
    warn "PostgreSQL service is not running. Starting it..."
    $SUDO systemctl start postgresql
    $SUDO systemctl enable postgresql
fi
status "PostgreSQL is running"

# Get database connection details
echo ""
echo "Step 2: Database Configuration"
echo "Please provide your PostgreSQL connection details:"
read -p "Database Name [workreportapplication]: " DB_NAME
DB_NAME=${DB_NAME:-workreportapplication}

read -p "Database User [workreport_user]: " DB_USER
DB_USER=${DB_USER:-workreport_user}

read -sp "Database Password: " DB_PASSWORD
echo ""

read -p "PostgreSQL Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "PostgreSQL Port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

# Test database connection
info "Testing database connection..."
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    status "Database connection successful"
else
    error "Cannot connect to database. Please check your credentials."
fi

# Step 3: Install Docker
echo ""
echo "Step 3: Installing Docker..."
if command -v docker &> /dev/null; then
    status "Docker is already installed"
else
    status "Installing Docker..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    $SUDO sh /tmp/get-docker.sh
    $SUDO usermod -aG docker $USER
    rm /tmp/get-docker.sh
    status "Docker installed"
fi

if ! docker compose version &> /dev/null; then
    status "Installing Docker Compose..."
    $SUDO apt-get update -qq
    $SUDO apt-get install -y docker-compose-plugin
fi

$SUDO systemctl start docker 2>/dev/null || true
$SUDO systemctl enable docker 2>/dev/null || true

# Step 4: Clone/Update Repository
echo ""
echo "Step 4: Setting up application..."
if [ -d "$INSTALL_DIR" ]; then
    status "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull origin main || git pull origin master || true
else
    status "Cloning repository..."
    $SUDO mkdir -p "$INSTALL_DIR"
    $SUDO chown $USER:$USER "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Step 5: Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

# Step 6: Get Application URL
echo ""
read -p "Application URL (e.g., https://workreport.example.com) [optional]: " APP_URL

# Step 7: Create Environment File
echo ""
echo "Step 5: Creating environment configuration..."

# URL encode password for connection string
url_encode() {
    local string="$1"
    local strlen=${#string}
    local encoded=""
    local pos c o

    for (( pos=0 ; pos<strlen ; pos++ )); do
        c=${string:$pos:1}
        case "$c" in
            [-_.~a-zA-Z0-9] ) o="$c" ;;
            * ) printf -v o '%%%02X' "'$c" ;;
        esac
        encoded+="$o"
    done
    echo "$encoded"
}

DB_PASSWORD_ENCODED=$(url_encode "$DB_PASSWORD")
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD_ENCODED}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

cat > .env << EOF
# Database Configuration
DATABASE_URL=${DATABASE_URL}

# JWT Secret (auto-generated)
JWT_SECRET=${JWT_SECRET}

# Application URL
NEXT_PUBLIC_APP_URL=${APP_URL}

# SMTP Configuration (optional - for password reset emails)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_FROM_NAME=WorkReport

# Google OAuth Configuration (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_ALLOWED_DOMAINS=
EOF
status "Environment file created"

# Step 8: Use Production docker-compose.yml
echo ""
echo "Step 6: Using production Docker Compose configuration..."
# The docker-compose.production.yml is already in the repo
if [ -f "docker-compose.production.yml" ]; then
    cp docker-compose.production.yml docker-compose.yml
    status "Production Docker Compose configured"
else
    warn "docker-compose.production.yml not found, using default"
fi

# Step 9: Build and Start
echo ""
echo "Step 7: Building and starting application..."
$SUDO docker compose down 2>/dev/null || true
status "Building Docker image (this may take a few minutes)..."
$SUDO docker compose build --no-cache
status "Docker image built"

$SUDO docker compose up -d
status "Application started"

# Step 10: Wait for Health
echo ""
echo "Step 8: Waiting for application to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:${APP_PORT} > /dev/null 2>&1; then
        status "Application is healthy and running"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    warn "Application may not be fully ready. Check logs: docker compose logs"
fi

# Step 11: Initialize Database Schema
echo ""
echo "Step 9: Initializing database schema..."
sleep 3
INIT_RESPONSE=$(curl -sf -X POST http://localhost:${APP_PORT}/api/db/init || echo "")
if echo "$INIT_RESPONSE" | grep -q '"success":true'; then
    status "Database schema initialized"
else
    warn "Database initialization may need manual intervention"
    info "You can manually initialize: curl -X POST http://localhost:${APP_PORT}/api/db/init"
fi

# Step 12: Create backup and scripts directories
echo ""
echo "Step 10: Setting up backup scripts..."
mkdir -p scripts
if [ -f "scripts/backup-db.sh" ]; then
    chmod +x scripts/backup-db.sh
    status "Backup script configured"
fi

# Completion
echo ""
echo -e "${GREEN}"
echo "============================================================"
echo "       Deployment Complete!"
echo "============================================================"
echo -e "${NC}"
echo ""
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Application URL: http://${SERVER_IP}:${APP_PORT}"
if [ -n "$APP_URL" ]; then
    echo "Configured URL: $APP_URL"
fi
echo ""
echo "Database Information:"
echo "  Database: $DB_NAME"
echo "  User:     $DB_USER"
echo "  Host:     $DB_HOST"
echo "  Port:     $DB_PORT"
echo ""
echo "Super Admin Credentials:"
echo "  Employee ID: ADMIN001"
echo "  Password:    admin123"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "  1. Change admin password after first login!"
echo "  2. Configure firewall to allow port ${APP_PORT}"
echo "  3. Set up reverse proxy (nginx) for HTTPS in production"
echo ""
echo "Useful Commands:"
echo "  View logs:     cd $INSTALL_DIR && docker compose logs -f"
echo "  Restart:       cd $INSTALL_DIR && docker compose restart"
echo "  Stop:          cd $INSTALL_DIR && docker compose down"
echo "  Update:        cd $INSTALL_DIR && git pull && docker compose up -d --build"
echo "  DB Backup:     cd $INSTALL_DIR && bash scripts/backup-db.sh"
echo ""
echo "Configuration saved to: $INSTALL_DIR/.env"
echo ""

