#!/bin/bash

# =============================================================================
# Work Report App - Automated Deployment Script
# Run with: curl -sSL <raw-url-to-this-script> | bash
# Or: bash deploy.sh
# 
# For production with existing PostgreSQL, use: bash deploy-production.sh
# =============================================================================

set -e

# Configuration - EDIT THESE VALUES OR USE ENVIRONMENT VARIABLES
APP_NAME="work-report-app"
REPO_URL="${REPO_URL:-https://github.com/mohammedtaufeeqahmed/work-report-application.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/work-report-app}"
DATABASE_URL="${DATABASE_URL:-}"  # Will be prompted if not set
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}"  # Auto-generate secure secret
APP_URL="${APP_URL:-}"  # Set your domain if you have one, e.g., https://app.yourdomain.com

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "============================================================"
echo "       Work Report App - Automated Deployment"
echo "============================================================"
echo -e "${NC}"

# Function to print status
status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    warn "Running without root. Some commands may require sudo."
    SUDO="sudo"
else
    SUDO=""
fi

# Step 1: Install Docker if not present
echo ""
echo "Step 1: Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    $SUDO sh get-docker.sh
    $SUDO usermod -aG docker $USER
    rm get-docker.sh
    status "Docker installed successfully"
else
    status "Docker is already installed"
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    status "Installing Docker Compose..."
    $SUDO apt-get update
    $SUDO apt-get install -y docker-compose-plugin
    status "Docker Compose installed"
else
    status "Docker Compose is already installed"
fi

# Start Docker service
$SUDO systemctl start docker 2>/dev/null || true
$SUDO systemctl enable docker 2>/dev/null || true

# Step 2: Get Database Configuration if not set
echo ""
echo "Step 2: Database Configuration..."
if [ -z "$DATABASE_URL" ]; then
    echo "Please provide your PostgreSQL connection details:"
    # Use /dev/tty to read input when running via curl | bash
    read -p "Database Name [workreportapplication]: " DB_NAME < /dev/tty
    DB_NAME=${DB_NAME:-workreportapplication}
    
    read -p "Database User [workreport_user]: " DB_USER < /dev/tty
    DB_USER=${DB_USER:-workreport_user}
    
    read -sp "Database Password: " DB_PASSWORD < /dev/tty
    echo ""
    
    read -p "PostgreSQL Host [localhost]: " DB_HOST < /dev/tty
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "PostgreSQL Port [5432]: " DB_PORT < /dev/tty
    DB_PORT=${DB_PORT:-5432}
    
    # URL encode password
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
    
    # Test connection
    info "Testing database connection..."
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        status "Database connection successful"
    else
        warn "Could not verify database connection. Continuing anyway..."
    fi
else
    status "Using DATABASE_URL from environment"
fi

# Step 3: Clone or update repository
echo ""
echo "Step 3: Setting up application..."
if [ -d "$INSTALL_DIR/.git" ]; then
    # Directory exists and is a git repo - update it
    status "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull origin main || git pull origin master || true
elif [ -d "$INSTALL_DIR" ]; then
    # Directory exists but is not a git repo - remove and clone fresh
    warn "Directory exists but is not a git repository. Removing and cloning fresh..."
    $SUDO rm -rf "$INSTALL_DIR"
    $SUDO mkdir -p "$INSTALL_DIR"
    $SUDO chown $USER:$USER "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
else
    # Directory doesn't exist - clone fresh
    status "Cloning repository..."
    $SUDO mkdir -p "$INSTALL_DIR"
    $SUDO chown $USER:$USER "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Step 4: Create environment file
echo ""
echo "Step 4: Creating environment configuration..."
cat > .env << EOF
# Database Configuration
DATABASE_URL=${DATABASE_URL}

# JWT Secret (auto-generated)
JWT_SECRET=${JWT_SECRET}

# Application URL (optional)
NEXT_PUBLIC_APP_URL=${APP_URL}

# SMTP Configuration (optional - for password reset emails)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_FROM_NAME=WorkReport
EOF
status "Environment file created"

# Step 5: Use production docker-compose if available
echo ""
echo "Step 5: Configuring Docker Compose..."
if [ -f "docker-compose.production.yml" ]; then
    cp docker-compose.production.yml docker-compose.yml
    status "Production Docker Compose configured"
fi

# Step 6: Stop existing container if running
echo ""
echo "Step 6: Stopping existing containers..."
$SUDO docker compose down 2>/dev/null || true
status "Existing containers stopped"

# Step 7: Build and start
echo ""
echo "Step 7: Building and starting application..."
$SUDO docker compose build --no-cache
status "Docker image built"

$SUDO docker compose up -d
status "Application started"

# Step 8: Wait for application to be healthy
echo ""
echo "Step 8: Waiting for application to be healthy..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        status "Application is healthy"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    error "Application failed to start. Check logs with: docker compose logs"
fi

# Step 9: Initialize database
echo ""
echo "Step 9: Initializing database..."
sleep 3  # Extra wait for database connection

INIT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/db/init)
echo "  Response: $INIT_RESPONSE"

if echo "$INIT_RESPONSE" | grep -q '"success":true'; then
    status "Database initialized successfully"
else
    warn "Database initialization returned unexpected response"
    echo "  You may need to manually call: curl -X POST http://localhost:3000/api/db/init"
fi

# Step 10: Display completion message
echo ""
echo -e "${GREEN}"
echo "============================================================"
echo "       Deployment Complete!"
echo "============================================================"
echo -e "${NC}"
echo ""
echo "Application URL: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Super Admin Credentials:"
echo "  Employee ID: ADMIN001"
echo "  Password:    admin123"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Change the admin password after first login!${NC}"
echo ""
echo "Useful commands:"
echo "  View logs:     cd $INSTALL_DIR && docker compose logs -f"
echo "  Restart:       cd $INSTALL_DIR && docker compose restart"
echo "  Stop:          cd $INSTALL_DIR && docker compose down"
echo "  Update:        cd $INSTALL_DIR && git pull && docker compose up -d --build"
echo ""
echo "JWT Secret (save this somewhere safe):"
echo "  $JWT_SECRET"
echo ""
