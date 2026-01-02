# Quick Deployment Guide

## One-Command Installation (for servers with existing PostgreSQL)

### Option 1: Direct URL Install
```bash
curl -sSL https://raw.githubusercontent.com/mohammedtaufeeqahmed/work-report-application/main/deploy-production.sh | bash
```

### Option 2: Download and Run
```bash
wget -O deploy-production.sh https://raw.githubusercontent.com/mohammedtaufeeqahmed/work-report-application/main/deploy-production.sh
chmod +x deploy-production.sh
sudo ./deploy-production.sh
```

### Option 3: Clone and Run
```bash
git clone https://github.com/mohammedtaufeeqahmed/work-report-application.git
cd work-report-application
chmod +x deploy-production.sh
sudo ./deploy-production.sh
```

---

## What the Script Does

1. ✅ Verifies PostgreSQL is running
2. ✅ Prompts for database credentials (name, user, password, host, port)
3. ✅ Tests database connection
4. ✅ Installs Docker (if not present)
5. ✅ Clones/updates the repository
6. ✅ Creates `.env` with your database credentials
7. ✅ Builds and starts Docker container
8. ✅ Initializes database schema
9. ✅ Shows completion status with useful commands

---

## Prerequisites

Before running the script, ensure:

1. **PostgreSQL is installed and running**
   ```bash
   sudo systemctl status postgresql
   ```

2. **Database exists with your backup restored**
   ```bash
   # Check if database exists
   sudo -u postgres psql -c "\l" | grep workreportapplication
   ```

3. **Database user has proper permissions**
   ```bash
   # If needed, grant permissions
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE workreportapplication TO your_user;"
   ```

---

## Manual Installation Steps (Alternative)

If you prefer manual installation:

### 1. Install Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
```

### 2. Clone Repository
```bash
sudo mkdir -p /opt/work-report-app
sudo chown $USER:$USER /opt/work-report-app
git clone https://github.com/mohammedtaufeeqahmed/work-report-application.git /opt/work-report-app
cd /opt/work-report-app
```

### 3. Create Environment File
```bash
cat > .env << EOF
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/workreportapplication
JWT_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_APP_URL=https://your-domain.com
EOF
```

### 4. Use Production Docker Compose
```bash
cp docker-compose.production.yml docker-compose.yml
```

### 5. Build and Start
```bash
sudo docker compose build --no-cache
sudo docker compose up -d
```

### 6. Initialize Database
```bash
curl -X POST http://localhost:3000/api/db/init
```

---

## Post-Deployment

### Set Up Nginx (HTTPS)
```bash
# Install nginx
sudo apt-get install nginx certbot python3-certbot-nginx

# Copy config
sudo cp /opt/work-report-app/nginx/work-report-app.conf /etc/nginx/sites-available/work-report-app

# Edit domain name
sudo nano /etc/nginx/sites-available/work-report-app

# Enable site
sudo ln -s /etc/nginx/sites-available/work-report-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Set Up Automated Backups
```bash
# Make backup script executable
chmod +x /opt/work-report-app/scripts/backup-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add this line:
# 0 2 * * * /opt/work-report-app/scripts/backup-db.sh >> /var/log/workreport-backup.log 2>&1
```

### Configure Firewall
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Remove after nginx setup
```

---

## Useful Commands

```bash
# View logs
cd /opt/work-report-app && docker compose logs -f

# Restart application
cd /opt/work-report-app && docker compose restart

# Stop application
cd /opt/work-report-app && docker compose down

# Update application
cd /opt/work-report-app && git pull && docker compose up -d --build

# Manual backup
cd /opt/work-report-app && bash scripts/backup-db.sh

# Check container status
docker ps | grep work-report-app

# Check application health
curl http://localhost:3000
```

---

## Default Credentials

After deployment:
- **Employee ID:** `ADMIN001`
- **Password:** `admin123`

⚠️ **Change the admin password immediately after first login!**

---

## Troubleshooting

### Container not starting
```bash
docker compose logs
```

### Database connection failed
```bash
# Test connection manually
PGPASSWORD="your_password" psql -h localhost -U your_user -d workreportapplication -c "SELECT 1;"
```

### Port already in use
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

### Permission denied
```bash
sudo chown -R $USER:$USER /opt/work-report-app
```

