<div align="center">

# 📊 Work Report Application

### A Modern Enterprise Work Report Management System

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

<p align="center">
  <strong>Streamline your organization's daily work reporting with role-based dashboards, real-time analytics, and seamless team management.</strong>
</p>

[Features](#-features) •
[Quick Start](#-quick-start) •
[User Roles](#-user-roles) •
[Pages](#-pages) •
[Tech Stack](#-tech-stack) •
[API Reference](#-api-reference) •
[EC2 Hosting](#-ec2-hosting) •
[Configuration](#-configuration)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📝 Work Report Management
- **Daily Reports** - Employees submit daily work reports
- **Status Tracking** - Track working/leave status
- **On-Duty Marking** - Special on-duty designation
- **Edit Permissions** - Configurable edit access per role
- **Late Submission Tracking** - Visual indicators for late reports

</td>
<td width="50%">

### 👥 Multi-Role System
- **5 User Roles** - Employee, Manager, Admin, Super Admin, Board Member
- **Granular Permissions** - Page-level access control
- **Role-Based Dashboards** - Tailored experience per role
- **Team Management** - Managers oversee department teams
- **Configurable Edit Rights** - Super admin controls who can edit

</td>
</tr>
<tr>
<td width="50%">

### 📊 Analytics & Reporting
- **Interactive Charts** - Visual data representation
- **Department Analytics** - Cross-team comparisons
- **Submission Statistics** - Track completion rates
- **Export Ready** - Data backup to Google Sheets
- **Attendance Rate** - Automatic calculation per employee

</td>
<td width="50%">

### 🏢 Organization Structure
- **Entity Management** - Multi-company support
- **Branch System** - Location-based organization
- **Department Hierarchy** - Structured teams
- **Bulk Operations** - CSV import for users
- **Manager-Department Mapping** - Flexible team assignments

</td>
</tr>
<tr>
<td width="50%">

### 📱 Progressive Web App (PWA)
- **Installable** - Add to home screen on mobile/desktop
- **Offline Support** - Service worker for caching
- **Native Feel** - Standalone app experience
- **Auto Updates** - Seamless background updates

</td>
<td width="50%">

### 🔧 System Administration
- **Database Maintenance** - WAL checkpoint, vacuum, optimization
- **Health Monitoring** - Real-time system stats
- **Queue Management** - Async task processing
- **IST Timezone** - Indian Standard Time support

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm**, **yarn**, **pnpm**, or **bun**

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/work-report-app.git

# Navigate to the project directory
cd work-report-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

### 🔑 Default Login Credentials

| Role | Employee ID | Password |
|------|-------------|----------|
| Super Admin | `ADMIN001` | `admin123` |

> ⚠️ **Important:** Change the default password immediately after first login!

---

## 👤 User Roles

```mermaid
graph TD
    SA[🔐 Super Admin] --> A[👔 Admin]
    SA --> BM[📊 Board Member]
    A --> M[👥 Manager]
    M --> E[👤 Employee]
    
    style SA fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style A fill:#4ecdc4,stroke:#333,stroke-width:2px,color:#fff
    style BM fill:#9b59b6,stroke:#333,stroke-width:2px,color:#fff
    style M fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    style E fill:#2ecc71,stroke:#333,stroke-width:2px,color:#fff
```

<details>
<summary><b>👤 Employee</b> - Basic access for daily reporting</summary>

| Permission | Access |
|------------|--------|
| Submit Work Reports | ✅ |
| View Own Reports | ✅ |
| Employee Dashboard | ✅ |
| Edit Own Reports | Configurable |
| Employee Reports | ❌ |
| Management Dashboard | ❌ |
| Admin Dashboard | ❌ |

</details>

<details>
<summary><b>👥 Manager</b> - Team oversight and reporting</summary>

| Permission | Access |
|------------|--------|
| Submit Work Reports | ✅ |
| View Team Reports | ✅ |
| Dashboard | ✅ |
| Employee Reports | ✅ |
| Management Dashboard | ✅ |
| Edit Team Reports | Configurable |
| Admin Dashboard | ❌ |

</details>

<details>
<summary><b>📊 Board Member</b> - Read-only analytics access</summary>

| Permission | Access |
|------------|--------|
| Submit Work Reports | ❌ |
| View All Reports | ✅ |
| Dashboard | ✅ |
| Employee Reports | ✅ |
| Management Dashboard | ✅ |
| Admin Dashboard | ❌ |

</details>

<details>
<summary><b>👔 Admin</b> - User management for entity/branch</summary>

| Permission | Access |
|------------|--------|
| Submit Work Reports | ✅ |
| Create/Manage Users | ✅ |
| Dashboard | ✅ |
| Admin Dashboard | ✅ |
| Edit Reports | Configurable |
| Entity Management | ❌ |
| Super Admin Dashboard | ❌ |

</details>

<details>
<summary><b>🔐 Super Admin</b> - Full system control</summary>

| Permission | Access |
|------------|--------|
| All Admin Permissions | ✅ |
| Entity Management | ✅ |
| Branch Management | ✅ |
| Department Management | ✅ |
| Bulk User Upload | ✅ |
| System Settings | ✅ |
| Edit Permissions Config | ✅ |
| Database Maintenance | ✅ |
| Super Admin Dashboard | ✅ |

</details>

---

## 📄 Pages

| Route | Description | Access |
|-------|-------------|--------|
| `/` | Home page with app overview | Public |
| `/login` | User authentication | Public |
| `/reset-password` | Password recovery | Public |
| `/work-report` | Submit daily work reports | Authenticated |
| `/employee-dashboard` | Personal dashboard with stats & history | Employee+ |
| `/employee-reports` | View employee reports | Manager+ |
| `/admin` | User management dashboard | Admin+ |
| `/super-admin` | Full administrative control | Super Admin |
| `/management-dashboard` | Analytics with charts | Manager+ |
| `/managers-dashboard` | Team management view | Manager+ |

---

## 🛠 Tech Stack

<table>
<tr>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=nextjs" width="48" height="48" alt="Next.js" />
<br><strong>Next.js 16</strong>
<br><sub>App Router</sub>
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=react" width="48" height="48" alt="React" />
<br><strong>React 19</strong>
<br><sub>UI Library</sub>
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
<br><strong>TypeScript 5</strong>
<br><sub>Type Safety</sub>
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br><strong>Tailwind 4</strong>
<br><sub>Styling</sub>
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=sqlite" width="48" height="48" alt="SQLite" />
<br><strong>SQLite</strong>
<br><sub>Database</sub>
</td>
</tr>
</table>

### Additional Technologies

| Category | Technology |
|----------|------------|
| **UI Components** | [Shadcn/ui](https://ui.shadcn.com/) with Radix UI primitives |
| **Charts** | [Recharts](https://recharts.org/) for data visualization |
| **Forms** | React Hook Form + Zod validation |
| **Authentication** | Custom JWT-based auth with bcrypt |
| **Database** | Better-SQLite3 (sync, server-side) with WAL mode |
| **PWA** | next-pwa for Progressive Web App support |
| **Backup** | Google Sheets API (write-only backup) |
| **Icons** | Lucide React |
| **Theming** | next-themes for dark/light mode |
| **Notifications** | Sonner toast notifications |
| **Timezone** | IST (Indian Standard Time) support |

---

## 📡 API Reference

<details>
<summary><b>🔐 Authentication</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | User login |
| `GET` | `/api/auth/google` | Initiate Google OAuth login |
| `GET` | `/api/auth/google/callback` | Google OAuth callback handler |
| `POST` | `/api/auth/logout` | User logout |
| `GET` | `/api/auth/session` | Get current session |
| `POST` | `/api/auth/reset-password` | Reset password |

</details>

<details>
<summary><b>📝 Work Reports</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/work-reports` | Get all work reports |
| `POST` | `/api/work-reports` | Create work report |
| `POST` | `/api/work-reports/submit` | Submit via queue |
| `GET` | `/api/work-reports/[id]` | Get specific report |
| `PUT` | `/api/work-reports/[id]` | Update report |
| `DELETE` | `/api/work-reports/[id]` | Delete report |

</details>

<details>
<summary><b>👥 Admin - Users</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | List all users |
| `POST` | `/api/admin/users` | Create new user |
| `GET` | `/api/admin/users/[id]` | Get user details |
| `PUT` | `/api/admin/users/[id]` | Update user |
| `DELETE` | `/api/admin/users/[id]` | Deactivate user |
| `POST` | `/api/admin/bulk-upload` | CSV bulk upload |
| `GET` | `/api/admin/users/[id]/departments` | Get manager departments |
| `PUT` | `/api/admin/users/[id]/departments` | Update manager departments |

</details>

<details>
<summary><b>🏢 Admin - Organization</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/entities` | List entities |
| `POST` | `/api/admin/entities` | Create entity |
| `GET` | `/api/admin/branches` | List branches |
| `POST` | `/api/admin/branches` | Create branch |
| `GET` | `/api/admin/departments` | List departments |
| `POST` | `/api/admin/departments` | Create department |
| `DELETE` | `/api/admin/departments/[id]` | Delete department |

</details>

<details>
<summary><b>⚙️ Settings & Permissions</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/settings` | Get edit permissions (Super Admin) |
| `PUT` | `/api/admin/settings` | Update edit permissions (Super Admin) |
| `GET` | `/api/settings/permissions` | Get permissions for current user |

</details>

<details>
<summary><b>📊 Analytics</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics` | Get analytics data |
| `GET` | `/api/reports/monthly-status` | Monthly status report |

</details>

<details>
<summary><b>🔧 Database & System</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/db/stats` | Get database & queue statistics |
| `POST` | `/api/db/maintenance` | Run database maintenance |
| `GET` | `/api/db/maintenance` | Get maintenance info |
| `POST` | `/api/db/init` | Initialize database |
| `POST` | `/api/db/reset` | Reset database (dev only) |
| `GET` | `/api/queue` | Get queue status |

**Maintenance Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `checkpoint` | boolean | `true` | Run WAL checkpoint |
| `vacuum` | boolean | `true` | Run incremental vacuum |
| `optimize` | boolean | `true` | Run ANALYZE |
| `clearQueue` | boolean | `false` | Clear queue history |
| `vacuumPages` | number | `100` | Pages to vacuum |

</details>

---

## ☁️ EC2 Hosting

### AWS EC2 Deployment Guide

This section covers deploying the Work Report Application to an AWS EC2 instance.

### Prerequisites

- AWS Account with EC2 access
- Domain name (optional, but recommended)
- SSH key pair for EC2 access

### Step 1: Launch EC2 Instance

1. **Navigate to EC2 Dashboard** → Launch Instance

2. **Choose AMI:**
   - Amazon Linux 2023 or Ubuntu 22.04 LTS (recommended)

3. **Instance Type:**
   - `t3.small` (minimum for production)
   - `t3.medium` (recommended for better performance)

4. **Configure Storage:**
   - Minimum 20GB gp3 SSD
   - Enable "Delete on termination" = No (to preserve data)

5. **Security Group Rules:**

   | Type | Port | Source | Description |
   |------|------|--------|-------------|
   | SSH | 22 | Your IP | Admin access |
   | HTTP | 80 | 0.0.0.0/0 | Web traffic |
   | HTTPS | 443 | 0.0.0.0/0 | Secure web traffic |
   | Custom TCP | 3000 | 0.0.0.0/0 | Node.js (optional) |

### Step 2: Connect & Setup Environment

```bash
# Connect to EC2
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Update system
sudo yum update -y  # Amazon Linux
# OR
sudo apt update && sudo apt upgrade -y  # Ubuntu

# Install Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs  # Amazon Linux
# OR
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs  # Ubuntu

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo yum install -y git  # Amazon Linux
# OR
sudo apt install -y git  # Ubuntu
```

### Step 3: Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/www/work-report-app
sudo chown $USER:$USER /var/www/work-report-app
cd /var/www/work-report-app

# Clone repository
git clone https://github.com/yourusername/work-report-app.git .

# Install dependencies
npm install

# Create data directory for SQLite
mkdir -p data

# Create environment file
nano .env.local
```

**Environment Variables (.env.local):**

```env
# Database
DATABASE_PATH=./data/workreport.db

# Authentication (generate secure secrets!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NEXTAUTH_SECRET=another-super-secret-key-min-32-chars

# Google OAuth (Optional - for Google Workspace login)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_ALLOWED_DOMAINS=domain1.com,domain2.com
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Google Sheets Backup (Optional)
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id

# Environment
NODE_ENV=production
```

### Step 4: Build & Start Application

```bash
# Build the application
npm run build

# Start with PM2
pm2 start npm --name "work-report" -- start

# Enable auto-start on reboot
pm2 startup
pm2 save

# View logs
pm2 logs work-report
```

### Step 5: Setup Nginx Reverse Proxy (Recommended)

```bash
# Install Nginx
sudo yum install -y nginx  # Amazon Linux
# OR
sudo apt install -y nginx  # Ubuntu

# Create Nginx config
sudo nano /etc/nginx/conf.d/work-report.conf
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or EC2 public IP

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
        
        # Increase timeouts for long requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Step 6: Setup SSL with Certbot (HTTPS)

```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx  # Amazon Linux
# OR
sudo apt install -y certbot python3-certbot-nginx  # Ubuntu

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already configured, but verify)
sudo certbot renew --dry-run
```

### Step 7: Database Backup to S3

```bash
# Install AWS CLI
sudo yum install -y aws-cli  # Amazon Linux
# OR
sudo apt install -y awscli  # Ubuntu

# Configure AWS credentials
aws configure

# Create backup script
nano /var/www/work-report-app/scripts/backup-to-s3.sh
```

**Backup Script:**

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_PATH="/var/www/work-report-app/data/workreport.db"
S3_BUCKET="your-backup-bucket"
BACKUP_NAME="workreport_backup_${TIMESTAMP}.db"

# Create backup
sqlite3 $DB_PATH ".backup /tmp/${BACKUP_NAME}"

# Upload to S3
aws s3 cp /tmp/${BACKUP_NAME} s3://${S3_BUCKET}/backups/${BACKUP_NAME}

# Clean up
rm /tmp/${BACKUP_NAME}

# Keep only last 30 backups in S3
aws s3 ls s3://${S3_BUCKET}/backups/ | sort | head -n -30 | awk '{print $4}' | xargs -I {} aws s3 rm s3://${S3_BUCKET}/backups/{}

echo "Backup completed: ${BACKUP_NAME}"
```

```bash
# Make executable and add to cron
chmod +x /var/www/work-report-app/scripts/backup-to-s3.sh
crontab -e

# Add daily backup at 2 AM
0 2 * * * /var/www/work-report-app/scripts/backup-to-s3.sh >> /var/log/db-backup.log 2>&1
```

### Step 8: Database Maintenance Cron Job

```bash
# Create maintenance script
nano /var/www/work-report-app/scripts/maintenance.sh
```

**Maintenance Script:**

```bash
#!/bin/bash
# Run database maintenance
curl -X POST http://localhost:3000/api/db/maintenance

echo "Maintenance completed at $(date)"
```

```bash
# Add to cron (daily at 3 AM)
chmod +x /var/www/work-report-app/scripts/maintenance.sh
crontab -e

# Add line:
0 3 * * * /var/www/work-report-app/scripts/maintenance.sh >> /var/log/db-maintenance.log 2>&1
```

### Monitoring & Management

```bash
# Application status
pm2 status

# View logs
pm2 logs work-report --lines 100

# Restart application
pm2 restart work-report

# Monitor resources
pm2 monit

# Check disk space
df -h

# Check database size
ls -lh /var/www/work-report-app/data/

# Health check
curl http://localhost:3000/api/db/stats
```

### Updating the Application

```bash
cd /var/www/work-report-app

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart work-report
```

### EC2 Checklist

- [ ] EC2 instance launched with appropriate size
- [ ] Security group configured with required ports
- [ ] Node.js and PM2 installed
- [ ] Application cloned and built
- [ ] Environment variables configured
- [ ] Nginx reverse proxy setup
- [ ] SSL certificate installed (HTTPS)
- [ ] Database backup cron job configured
- [ ] Database maintenance cron job configured
- [ ] PM2 startup script enabled
- [ ] Domain DNS configured (if using custom domain)

### 💾 Disk Space Requirements

#### Application Size Breakdown

| Component | Size |
|-----------|------|
| **Docker Engine** | ~400-500 MB |
| **Node.js Alpine Image** (node:20-alpine) | ~180 MB |
| **Build tools** (python3, make, g++) | ~200-300 MB |
| **node_modules** (googleapis is large) | ~600-800 MB |
| **Next.js build** (.next folder) | ~100-200 MB |
| **nginx:alpine image** | ~40-50 MB |
| **SQLite database** (data) | ~10-50 MB (grows with usage) |
| **Docker build cache** | ~500 MB - 1 GB |
| **Total for application** | **~2-3 GB** |

#### Recommended EC2 Storage

| Use Case | Storage |
|----------|---------|
| **Minimum** | 8-10 GB (tight) |
| **Recommended** | 15-20 GB (comfortable) |
| **With room to grow** | 30-40 GB |

### 🧹 EC2 Disk Cleanup Commands

> ⚠️ **Warning**: Some Docker cleanup commands can delete your application. Use the safe commands below.

#### ✅ Safe Commands (No Impact on Application)

```bash
# Check disk usage
df -h

# Check what's using space
du -sh /* 2>/dev/null | sort -h

# Check Docker space usage
docker system df

# Clean system packages (Ubuntu)
sudo apt autoremove -y
sudo apt clean

# Clean system packages (Amazon Linux)
sudo yum clean all

# Clean old system logs (keep last 7 days)
sudo journalctl --vacuum-time=7d
```

#### ✅ Safe Docker Cleanup (Won't Break Running App)

```bash
# Remove only dangling images (unused build layers) - SAFE
docker image prune -f

# Remove only build cache - SAFE
docker builder prune -f

# Remove unused images BUT keep running containers' images
# Make sure your app container is RUNNING first!
docker image prune -a -f
```

#### ⚠️ Dangerous Commands (Use with Caution)

```bash
# ❌ This will DELETE your app image and may delete database volumes!
docker system prune -a --volumes

# Only use this if you want to completely reset Docker
# You will need to rebuild your application after this
```

#### Why Your Disk Might Be Full

If you're seeing high disk usage (70%+), common causes are:

1. **Docker build cache** - Multiple builds leave cached layers
2. **Old Docker images** - Previous builds not cleaned up
3. **System updates** - EC2 AMI + package updates
4. **Log files** - Application and system logs accumulating

#### Recommended Cleanup Sequence

```bash
# 1. Check what's using space
df -h
du -sh /var/lib/docker/* 2>/dev/null | sort -h

# 2. Clean Docker build cache only
docker builder prune -f

# 3. Clean dangling images only
docker image prune -f

# 4. Clean system packages
sudo apt autoremove -y && sudo apt clean

# 5. Clean old logs
sudo journalctl --vacuum-time=7d

# 6. Verify disk space recovered
df -h
```

After cleanup, a properly configured EC2 should use **20-30%** of a 40GB disk, not 70%+.

---

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_PATH=./data/workreport.db

# Authentication
JWT_SECRET=your-super-secret-jwt-key
NEXTAUTH_SECRET=your-nextauth-secret

# Google OAuth (Optional - for Google Workspace login)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_ALLOWED_DOMAINS=domain1.com,domain2.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Sheets Backup (Optional)
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id

# Email Service (Optional - for password reset)
EMAIL_SERVICE_API_KEY=your-email-api-key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Environment
NODE_ENV=development
```

### Google OAuth Setup (Optional)

To enable Google Workspace login:

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project** or select an existing one
3. **Enable APIs:**
   - Go to "APIs & Services" → "Library"
   - Enable "Google+ API" or "People API"
4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Authorized redirect URIs: `{YOUR_APP_URL}/api/auth/google/callback`
     - Example: `http://localhost:3000/api/auth/google/callback` (development)
     - Example: `https://your-domain.com/api/auth/google/callback` (production)
5. **Copy credentials** to your `.env.local`:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client Secret → `GOOGLE_CLIENT_SECRET`
6. **Configure allowed domains:**
   - Set `GOOGLE_ALLOWED_DOMAINS` to comma-separated list of workspace domains
   - Example: `company.com,subsidiary.com`
   - Users must have an account in your database (matched by email)

**Note:** The same OAuth credentials work for multiple domains. Domain validation happens on the backend after authentication.

### Edit Permissions Configuration

Super Admins can configure who can edit work reports:

| Setting | Description |
|---------|-------------|
| `employee_can_edit_own_reports` | Allow employees to edit their own reports |
| `manager_can_edit_team_reports` | Allow managers to edit team member reports |
| `admin_can_edit_reports` | Allow admins to edit reports in their scope |
| `superadmin_can_edit_reports` | Allow super admins to edit any report |

---

## 📁 Project Structure

```
work-report-app/
├── 📂 src/
│   ├── 📂 app/
│   │   ├── 📂 (auth)/           # Auth pages (login, reset-password)
│   │   ├── 📂 (dashboard)/      # Dashboard pages by role
│   │   │   ├── 📂 admin/
│   │   │   ├── 📂 employee-dashboard/  # NEW: Employee dashboard
│   │   │   ├── 📂 management-dashboard/
│   │   │   ├── 📂 managers-dashboard/
│   │   │   └── 📂 super-admin/
│   │   ├── 📂 api/              # API routes
│   │   │   ├── 📂 admin/        # Admin endpoints
│   │   │   ├── 📂 analytics/    # Analytics endpoints
│   │   │   ├── 📂 auth/         # Auth endpoints
│   │   │   ├── 📂 db/           # NEW: Database maintenance
│   │   │   ├── 📂 settings/     # NEW: Permissions endpoints
│   │   │   ├── 📂 work-reports/ # Work report endpoints
│   │   │   └── ...
│   │   ├── 📂 employee-reports/ # Employee reports page
│   │   ├── 📂 work-report/      # Work report submission
│   │   └── 📄 page.tsx          # Home page
│   ├── 📂 components/
│   │   ├── 📂 ui/               # Shadcn UI components
│   │   ├── 📄 navbar.tsx        # Navigation component
│   │   ├── 📄 work-report-form.tsx
│   │   └── ...
│   ├── 📂 lib/
│   │   ├── 📂 db/               # Database layer
│   │   │   ├── 📄 database.ts   # SQLite connection with WAL
│   │   │   ├── 📄 schema.ts     # Database schema
│   │   │   └── 📄 queries.ts    # Query functions
│   │   ├── 📂 queue/            # Async queue system
│   │   ├── 📄 auth.ts           # Auth utilities
│   │   ├── 📄 date.ts           # NEW: IST date utilities
│   │   └── 📄 google-sheets.ts  # Backup integration
│   ├── 📂 types/
│   │   └── 📄 index.ts          # TypeScript types
│   └── 📄 middleware.ts         # Route protection
├── 📂 data/                     # SQLite database files
├── 📂 public/                   # Static assets
│   ├── 📂 icons/                # NEW: PWA icons
│   ├── 📄 manifest.json         # NEW: PWA manifest
│   └── 📄 sw.js                 # NEW: Service worker
├── 📂 scripts/                  # Utility scripts
├── 📄 next.config.ts            # Next.js config with PWA
├── 📄 package.json
├── 📄 tsconfig.json
└── 📄 README.md
```

---

## 🔄 Data Flow Architecture

```mermaid
flowchart LR
    subgraph Client
        A[👤 User] --> B[📱 React UI / PWA]
    end
    
    subgraph Server
        B --> C[🔀 API Routes]
        C --> D[📋 Queue System]
        D --> E[(🗄️ SQLite DB)]
        D -.-> F[📊 Google Sheets]
    end
    
    E --> G[📈 Analytics]
    G --> B
    
    subgraph Maintenance
        H[🔧 Cron Jobs] --> I[Backup to S3]
        H --> J[DB Maintenance]
    end
    
    E --> I
    
    style A fill:#2ecc71,stroke:#333
    style E fill:#3498db,stroke:#333
    style F fill:#f1c40f,stroke:#333
    style H fill:#9b59b6,stroke:#333
```

> **Note:** Google Sheets is used as a backup only. All operations read from SQLite database.

---

## 🚀 Deployment

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Docker Deployment (Alternative)

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📈 Future Roadmap

- [x] PWA Support
- [x] Employee Dashboard
- [x] Edit Permissions System
- [x] Database Maintenance API
- [x] IST Timezone Support
- [ ] PostgreSQL migration support
- [ ] Email notifications for report submissions
- [ ] Advanced reporting with date ranges
- [ ] Team performance metrics
- [ ] Integration with HR systems
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ using Next.js and modern web technologies**

⭐ Star this repo if you find it helpful!

</div>
