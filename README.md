<div align="center">

# 📊 Work Report Application

### A Modern Enterprise Work Report Management System

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

<p align="center">
  <strong>Streamline your organization's daily work reporting with role-based dashboards, real-time analytics, and seamless team management.</strong>
</p>

[Features](#-features) •
[Quick Start](#-quick-start) •
[User Roles](#-user-roles) •
[Pages](#-pages) •
[Tech Stack](#-tech-stack) •
[API Reference](#-api-reference) •
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

</td>
<td width="50%">

### 👥 Multi-Role System
- **5 User Roles** - Employee, Manager, Admin, Super Admin, Board Member
- **Granular Permissions** - Page-level access control
- **Role-Based Dashboards** - Tailored experience per role
- **Team Management** - Managers oversee department teams

</td>
</tr>
<tr>
<td width="50%">

### 📊 Analytics & Reporting
- **Interactive Charts** - Visual data representation
- **Department Analytics** - Cross-team comparisons
- **Submission Statistics** - Track completion rates
- **Export Ready** - Data backup to Google Sheets

</td>
<td width="50%">

### 🏢 Organization Structure
- **Entity Management** - Multi-company support
- **Branch System** - Location-based organization
- **Department Hierarchy** - Structured teams
- **Bulk Operations** - CSV import for users

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
| Dashboard | ✅ |
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
| **Database** | Better-SQLite3 (sync, server-side) |
| **Backup** | Google Sheets API (write-only backup) |
| **Icons** | Lucide React |
| **Theming** | next-themes for dark/light mode |
| **Notifications** | Sonner toast notifications |

---

## 📡 API Reference

<details>
<summary><b>🔐 Authentication</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | User login |
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

</details>

<details>
<summary><b>📊 Analytics</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics` | Get analytics data |
| `GET` | `/api/reports/monthly-status` | Monthly status report |

</details>

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

---

## 📁 Project Structure

```
work-report-app/
├── 📂 src/
│   ├── 📂 app/
│   │   ├── 📂 (auth)/           # Auth pages (login, reset-password)
│   │   ├── 📂 (dashboard)/      # Dashboard pages by role
│   │   ├── 📂 api/              # API routes
│   │   │   ├── 📂 admin/        # Admin endpoints
│   │   │   ├── 📂 analytics/    # Analytics endpoints
│   │   │   ├── 📂 auth/         # Auth endpoints
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
│   │   │   ├── 📄 database.ts   # SQLite connection
│   │   │   ├── 📄 schema.ts     # Database schema
│   │   │   └── 📄 queries.ts    # Query functions
│   │   ├── 📂 queue/            # Async queue system
│   │   ├── 📄 auth.ts           # Auth utilities
│   │   └── 📄 google-sheets.ts  # Backup integration
│   ├── 📂 types/
│   │   └── 📄 index.ts          # TypeScript types
│   └── 📄 middleware.ts         # Route protection
├── 📂 data/                     # SQLite database files
├── 📂 public/                   # Static assets
├── 📄 package.json
├── 📄 tsconfig.json
└── 📄 README.md
```

---

## 🔄 Data Flow Architecture

```mermaid
flowchart LR
    subgraph Client
        A[👤 User] --> B[📱 React UI]
    end
    
    subgraph Server
        B --> C[🔀 API Routes]
        C --> D[📋 Queue System]
        D --> E[(🗄️ SQLite DB)]
        D -.-> F[📊 Google Sheets]
    end
    
    E --> G[📈 Analytics]
    G --> B
    
    style A fill:#2ecc71,stroke:#333
    style E fill:#3498db,stroke:#333
    style F fill:#f1c40f,stroke:#333
```

> **Note:** Google Sheets is used as a backup only. All operations read from SQLite database.

---

## 🚀 Deployment

### AWS Deployment Checklist

- [ ] Configure persistent storage (EBS/EFS) for SQLite database
- [ ] Set up environment variables in AWS
- [ ] Configure daily/weekly database backups to S3
- [ ] Set up SSL certificate
- [ ] Configure domain and DNS

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

---

## 📈 Future Roadmap

- [ ] PostgreSQL migration support
- [ ] Email notifications for report submissions
- [ ] Mobile responsive PWA
- [ ] Advanced reporting with date ranges
- [ ] Team performance metrics
- [ ] Integration with HR systems

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
