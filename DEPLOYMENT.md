# Deployment Guide - Work Report Application

This document outlines the deployment steps for the Work Report Application built with Next.js 16, SQLite (better-sqlite3), and PWA support.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Deployment Options](#deployment-options)
   - [Option A: Self-Hosted (VPS/Dedicated Server)](#option-a-self-hosted-vpsdedicated-server)
   - [Option B: Docker Deployment](#option-b-docker-deployment)
   - [Option C: PM2 Process Manager](#option-c-pm2-process-manager)
4. [Database Setup](#database-setup)
5. [SSL/HTTPS Configuration](#sslhttps-configuration)
6. [Post-Deployment Checklist](#post-deployment-checklist)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- **Node.js**: v18.17.0 or higher (LTS recommended)
- **npm**: v9.0.0 or higher (comes with Node.js)
- **Git**: For cloning the repository
- **Server Requirements**:
  - Minimum 1GB RAM
  - 10GB disk space
  - Linux (Ubuntu 20.04+ recommended) or Windows Server

---

## Environment Variables

Create a `.env.production` file in the root directory with the following variables:

```env
# Application
NODE_ENV=production
PORT=3000

# JWT Secret (Generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-key-min-32-chars

# Database
DATABASE_PATH=./data/workreport.db

# Google Sheets Integration (Optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id

# Base URL (Update with your domain)
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

> ⚠️ **Security Note**: Never commit `.env.production` to version control. Generate a strong JWT_SECRET using: `openssl rand -base64 32`

---

## Deployment Options

### Option A: Self-Hosted (VPS/Dedicated Server)

#### Step 1: Prepare the Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install build essentials (required for better-sqlite3)
sudo apt install -y build-essential python3
```

#### Step 2: Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /var/www/work-report-app
sudo chown -R $USER:$USER /var/www/work-report-app

# Clone repository
cd /var/www
git clone <your-repository-url> work-report-app
cd work-report-app

# Install dependencies
npm ci --production=false

# Create data directory for SQLite
mkdir -p data

# Copy environment file
cp .env.example .env.production
# Edit .env.production with your values
nano .env.production
```

#### Step 3: Build the Application

```bash
# Build for production
npm run build
```

#### Step 4: Start the Application

```bash
# Start in production mode
npm run start
```

The application will be running on `http://localhost:3000`

---

### Option B: Docker Deployment

#### Step 1: Create Dockerfile

Create a `Dockerfile` in the root directory:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Create data directory for SQLite
RUN mkdir -p ./data && chown -R nextjs:nodejs ./data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

#### Step 2: Create docker-compose.yml

```yaml
# docker-compose.yml
version: '3.8'

services:
  work-report-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: work-report-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_PATH=/app/data/workreport.db
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
```

#### Step 3: Deploy with Docker

```bash
# Build and start containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

---

### Option C: PM2 Process Manager

PM2 is recommended for production Node.js deployments.

#### Step 1: Install PM2

```bash
npm install -g pm2
```

#### Step 2: Create PM2 Ecosystem File

Create `ecosystem.config.js` in the root directory:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'work-report-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/work-report-app',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

#### Step 3: Start with PM2

```bash
# Start the application
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Monitor the application
pm2 monit

# View logs
pm2 logs work-report-app
```

#### PM2 Useful Commands

```bash
# Restart application
pm2 restart work-report-app

# Stop application
pm2 stop work-report-app

# Delete from PM2
pm2 delete work-report-app

# Show status
pm2 status
```

---

## Database Setup

### Initialize Database

After deployment, initialize the database by visiting:

```
https://your-domain.com/api/db/init
```

Or run via curl:

```bash
curl -X GET https://your-domain.com/api/db/init
```

### Database Backup

Create a backup script `backup-db.sh`:

```bash
#!/bin/bash
# backup-db.sh

BACKUP_DIR="/var/backups/work-report-app"
DB_PATH="/var/www/work-report-app/data/workreport.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Create backup
cp $DB_PATH "$BACKUP_DIR/workreport_$DATE.db"

# Keep only last 7 days of backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: workreport_$DATE.db"
```

Add to crontab for daily backups:

```bash
# Run daily at 2 AM
0 2 * * * /var/www/work-report-app/backup-db.sh
```

---

## SSL/HTTPS Configuration

### Using Nginx as Reverse Proxy

#### Step 1: Install Nginx

```bash
sudo apt install nginx -y
```

#### Step 2: Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/work-report-app
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Step 3: Enable Site and SSL

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/work-report-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## Post-Deployment Checklist

- [ ] Environment variables configured correctly
- [ ] Database initialized (`/api/db/init`)
- [ ] SSL certificate installed and working
- [ ] Application accessible via HTTPS
- [ ] PWA manifest loading correctly
- [ ] Service worker registered
- [ ] Default admin user created
- [ ] Backup strategy in place
- [ ] Monitoring setup (PM2, logs)
- [ ] Firewall configured (only ports 80, 443 open)

---

## Troubleshooting

### Common Issues

#### 1. better-sqlite3 Build Errors

```bash
# Install build dependencies
sudo apt install -y build-essential python3

# Rebuild native modules
npm rebuild better-sqlite3
```

#### 2. Permission Denied on Data Directory

```bash
# Fix permissions
sudo chown -R $USER:$USER /var/www/work-report-app/data
chmod 755 /var/www/work-report-app/data
```

#### 3. Port Already in Use

```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>
```

#### 4. Application Not Starting

```bash
# Check logs
pm2 logs work-report-app --lines 100

# Or check Next.js build output
npm run build 2>&1 | tee build.log
```

#### 5. Database Locked Error

```bash
# Check for running processes
fuser /var/www/work-report-app/data/workreport.db

# Ensure only one instance is running
pm2 delete all
pm2 start ecosystem.config.js --env production
```

### Health Check Endpoint

Test if the application is running:

```bash
curl -I https://your-domain.com
```

Expected response: `HTTP/2 200`

---

## Updating the Application

```bash
cd /var/www/work-report-app

# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Build application
npm run build

# Restart with PM2
pm2 restart work-report-app

# Or with Docker
docker-compose down && docker-compose up -d --build
```

---

## Support

For issues or questions, please create an issue in the repository or contact the development team.

---

*Last updated: December 2024*


