#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Work Report App - One-Click Deployment${NC}"
echo "=============================================="

# Configuration
APP_DIR="/var/www/work-report-app"
REPO_URL="https://github.com/mohammedtaufeeqahmed/work-report-application.git"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐳 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

# Install Git if not installed
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}📥 Installing Git...${NC}"
    apt install -y git
fi

# Create app directory
echo -e "${YELLOW}📁 Setting up application directory...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone or pull repository
if [ -d ".git" ]; then
    echo -e "${YELLOW}📥 Pulling latest code...${NC}"
    git pull origin main
else
    echo -e "${YELLOW}📥 Cloning repository...${NC}"
    git clone $REPO_URL .
fi

# Create data directory
mkdir -p data

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}🔐 Creating environment file...${NC}"
    JWT_SECRET=$(openssl rand -base64 32)
    cat > .env << EOF
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
EOF
    echo -e "${GREEN}✓ Generated JWT_SECRET automatically${NC}"
fi

# Add swap space if not exists (for small instances)
if [ ! -f "/swapfile" ]; then
    echo -e "${YELLOW}💾 Creating swap space (2GB)...${NC}"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo -e "${GREEN}✓ Swap space created${NC}"
fi

# Stop existing containers if running
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true

# Build and start containers
echo -e "${YELLOW}🔨 Building Docker images (this may take a few minutes)...${NC}"
docker-compose build --no-cache 2>/dev/null || docker compose build --no-cache

echo -e "${YELLOW}🚀 Starting application...${NC}"
docker-compose up -d 2>/dev/null || docker compose up -d

# Wait for app to be ready
echo -e "${YELLOW}⏳ Waiting for application to start...${NC}"
sleep 15

# Health check
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Application is running!${NC}"
else
    echo -e "${YELLOW}⚠️  Application may still be starting. Check logs with: docker-compose logs${NC}"
fi

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")

# Print status
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "📍 Direct Access: http://$PUBLIC_IP"
echo "🌐 Subdomain: https://workreport.k-innovative.com (after Cloudflare setup)"
echo "📁 App Directory: $APP_DIR"
echo ""
echo "Useful commands:"
echo "  cd $APP_DIR"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose restart          # Restart app"
echo "  docker-compose down             # Stop app"
echo "  docker-compose up -d --build    # Rebuild and start"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "  1. Go to Cloudflare DNS settings"
echo "  2. Add A record: workreport -> $PUBLIC_IP (Proxied)"
echo "  3. Set SSL/TLS to 'Full'"
echo ""

