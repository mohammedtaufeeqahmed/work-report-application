# Work Report Application - Implementation Plan

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: Shadcn UI with Tailwind CSS
- **Database**: Better SQLite (better-sqlite3) with async queue system
- **Queue System**: In-memory queue with BullMQ or simple Node.js EventEmitter-based queue (for work report submissions)
- **Authentication**: Custom authentication with bcrypt password hashing (stored in same SQLite database)
- **Google Sheets**: Google Sheets API integration (backup only - NOT used for operations)
- **Charts**: Shadcn UI chart components (built on Recharts) for custom dashboards
- **Hosting**: AWS (configured for deployment)
- **Database Storage**: Local SQLite file (with backup strategy)
- **Migration Ready**: Database layer abstracted for easy PostgreSQL migration later

## Development Phases

The development will be done in **6 phases**, allowing for incremental testing, feedback, and deployment:

### Phase 1: Foundation (Core Infrastructure)

**Goal**: Set up database, authentication, and basic UI structure

**Deliverable**: Working authentication and database foundation

**Tasks**:

- Project setup and dependencies
- Database setup and schema creation
- Basic authentication system (login/logout)
- Home page with navbar
- Protected route middleware

### Phase 2: Work Report System (Core Feature)

**Goal**: Basic work report submission and viewing

**Deliverable**: Core work report functionality working

**Tasks**:

- Work report form page
- Employee lookup API
- Work report submission to database (direct, no queue yet)
- Work report viewing/listing API
- Basic work report display

### Phase 3: Queue & Google Sheets Integration

**Goal**: Handle concurrent submissions and backup storage

**Deliverable**: System handles 100+ concurrent submissions with backup

**Tasks**:

- Async queue system implementation
- Queue worker for background processing
- Google Sheets API integration (backup only)
- Update work report submission to use queue
- Error handling and retry logic

### Phase 4: Admin Features

**Goal**: Admin user management capabilities

**Deliverable**: Admins can manage users for their entity/branch

**Tasks**:

- Admin dashboard layout
- User creation form
- User management (view/edit users)
- Entity/Branch assignment for admins
- Admin access restrictions

### Phase 5: Super Admin Features

**Goal**: Complete administrative control

**Deliverable**: Full administrative capabilities

**Tasks**:

- Super admin dashboard
- Entity creation and management
- Branch creation and management
- User deactivation/activation
- Bulk operations
- Statistics/overview section

### Phase 6: Advanced Features & Polish

**Goal**: Complete the application with all features

**Deliverable**: Complete, production-ready application

**Tasks**:

- Password reset flow (email integration)
- Bulk CSV upload functionality
- Dashboard pages (custom charts using Shadcn UI/Recharts - data from SQLite)
- Queue monitoring and health checks
- Error boundaries and logging
- UI/UX polish and optimizations
- Database backup system

## Project Structure

```
work-report-app/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── reset-password/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   ├── super-admin/
│   │   ├── management-dashboard/
│   │   ├── managers-dashboard/
│   │   └── employee-reports/
│   ├── api/
│   │   ├── auth/
│   │   ├── employees/
│   │   ├── work-reports/
│   │   └── admin/
│   ├── work-report/
│   ├── layout.tsx
│   └── page.tsx (Home)
├── components/
│   ├── ui/ (Shadcn components)
│   ├── navbar.tsx
│   ├── work-report-form.tsx
│   └── ...
├── lib/
│   ├── db/
│   │   ├── database.ts (SQLite connection - abstracted interface)
│   │   ├── schema.ts (database schema/migrations)
│   │   └── queries.ts (database query functions - abstracted for easy migration)
│   ├── queue/
│   │   ├── work-report-queue.ts (async queue for work report writes)
│   │   └── queue-worker.ts (background worker for processing queue)
│   ├── auth.ts (authentication utilities - queries SQLite employees table)
│   ├── google-sheets.ts (backup only - write only, no reads)
│   └── utils.ts
├── types/
│   └── index.ts
└── middleware.ts
```

## Database Schema (SQLite) - Single Database for All Data

### Tables:

1. **employees** table (used for authentication and user management):

   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `employeeId` TEXT UNIQUE NOT NULL
   - `name` TEXT NOT NULL
   - `email` TEXT UNIQUE NOT NULL
   - `department` TEXT NOT NULL
   - `password` TEXT NOT NULL (hashed with bcrypt)
   - `entityId` INTEGER (foreign key to entities)
   - `branchId` INTEGER (foreign key to branches)
   - `role` TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('employee', 'admin', 'superadmin'))
   - `status` TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive'))
   - `createdBy` INTEGER (foreign key to employees, nullable)
   - `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
   - `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP

2. **entities** table:

   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `name` TEXT UNIQUE NOT NULL
   - `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP

3. **branches** table:

   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `name` TEXT NOT NULL
   - `entityId` INTEGER NOT NULL (foreign key to entities)
   - `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
   - UNIQUE(name, entityId)

4. **workReports** table (primary storage - all operations use this):

   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `employeeId` TEXT NOT NULL
   - `date` DATE NOT NULL
   - `name` TEXT NOT NULL
   - `email` TEXT NOT NULL
   - `department` TEXT NOT NULL
   - `status` TEXT NOT NULL CHECK(status IN ('working', 'leave'))
   - `workReport` TEXT
   - `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP

5. **passwordResetTokens** table (for authentication):

   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `employeeId` TEXT NOT NULL
   - `token` TEXT UNIQUE NOT NULL
   - `expiresAt` DATETIME NOT NULL
   - `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP

## Environment Variables Required

```
DATABASE_PATH=./data/workreport.db (or absolute path for production)

GOOGLE_SHEETS_CLIENT_EMAIL= (Phase 3 - backup only)
GOOGLE_SHEETS_PRIVATE_KEY= (Phase 3 - backup only)
GOOGLE_SHEETS_SPREADSHEET_ID= (Phase 3 - backup only)

JWT_SECRET= (for password reset tokens - Phase 6)
NEXTAUTH_SECRET= (for session management)

EMAIL_SERVICE_API_KEY= (for password reset emails - Phase 6)
EMAIL_FROM_ADDRESS= (Phase 6)

NODE_ENV=production
```

## Async Queue Architecture (Phase 3)

### How it works:

1. User submits work report form
2. API route validates and immediately adds to queue
3. API returns success response to user (fast response)
4. Background queue worker processes submissions:

   - Takes one submission from queue
   - **Writes to SQLite database first (primary storage - all operations use this)**
   - **Then submits to Google Sheets as backup (write-only, non-blocking)**
   - Moves to next submission

5. Queue handles ~100 concurrent submissions by serializing writes

### Queue Implementation Options:

- **Option 1**: Simple in-memory queue using EventEmitter (lightweight)
- **Option 2**: BullMQ with Redis (more robust, requires Redis)
- **Recommendation**: Start with simple in-memory queue, upgrade to BullMQ if needed

## Data Storage Architecture

### Primary Storage: SQLite Database (All Operations)

- **All work reports stored in `workReports` table**
- **All employee data and authentication in `employees` table**
- **All entities, branches, and auth tokens in respective tables**
- **Single SQLite database file contains all application data**
- **All dashboards read from SQLite** (management dashboard, managers dashboard, employee reports)
- **All reports and queries use SQLite**
- **All operations (CRUD) use SQLite**
- **SQLite is the single source of truth for all application functionality**

### Secondary Storage: Google Sheets (Backup Only - Phase 3)

- Work reports also submitted to Google Sheets **for backup purposes only**
- **NOT used for any operations, dashboards, or reporting**
- **Purely for backup/redundancy**
- **Write-only** - never read from Google Sheets
- Used for:
  - Backup/redundancy (in case of database issues)
  - Manual data export if needed
- **Non-critical**: If Google Sheets submission fails, database write still succeeds
- **No reads from Google Sheets** - all data comes from SQLite

## Migration Path to PostgreSQL

The database layer is designed with abstraction to make PostgreSQL migration straightforward:

1. **Database Interface**: All queries go through abstracted functions
2. **Schema Compatibility**: SQLite schema designed to be PostgreSQL-compatible
3. **Migration Steps** (when needed):

   - Install PostgreSQL client library (pg)
   - Update `lib/db/database.ts` to use PostgreSQL connection
   - Update `lib/db/queries.ts` with PostgreSQL-specific syntax (minimal changes)
   - Export SQLite data and import to PostgreSQL
   - Update environment variables
   - No changes needed to application logic or API routes

## Notes

- **Single Database**: All data (employees, work reports, entities, branches, authentication) stored in one SQLite database file
- **Authentication**: Uses same SQLite database - employees table stores hashed passwords, no external auth service needed
- **Google Sheets**: Backup only - work reports stored in SQLite (primary, all operations use SQLite) and Google Sheets (backup only, not used for dashboards or operations). Google Sheets submission is non-blocking and write-only.
- **SQLite is Primary**: All dashboards, reports, queries, and operations read from SQLite database only
- **Phased Development**: Development in 6 phases allows for incremental testing and deployment
- Better SQLite is synchronous and works only in Node.js (server-side), so all database operations must go through Next.js API routes
- Async queue system handles concurrent submissions by serializing database writes
- SQLite database file should be stored in a persistent volume on AWS (consider EBS or EFS)
- Implement regular database backups (daily/weekly) to S3
- Password reset email functionality requires an email service (SendGrid, Resend, AWS SES, etc.)
- Google Sheets API requires service account credentials (JSON key file)
- All API routes will have proper validation and error handling
- The application will be responsive and follow modern UI/UX practices
- Queue system ensures users get immediate feedback while writes happen in background
- For production, ensure SQLite file permissions are properly configured
- Monitor queue length and processing time to identify if PostgreSQL migration is needed

## Implementation Status

- [x] Phase 1: Project setup - Initialize Next.js, install dependencies, configure environment
- [x] Phase 1: Database setup - Create SQLite connection, schema, tables, and query layer
- [x] Phase 1: Authentication - Login API, login page, session management, middleware
- [x] Phase 1: Home page with SaaS-style design and navbar
- [x] Phase 2: Work report form with employee lookup and conditional fields
- [x] Phase 2: Work report submission API and viewing/listing functionality
- [x] Phase 3: Async queue system for work report submissions
- [x] Phase 3: Google Sheets integration (backup only)
- [x] Phase 4: Admin dashboard with user management
- [x] Phase 5: Super admin dashboard with entity/branch management
- [x] Phase 6: Password reset, bulk upload, custom dashboards

## Default Credentials

- **Super Admin**: Employee ID: `ADMIN001`, Password: `admin123`

## Available Pages

- `/` - Home page
- `/login` - Login page
- `/reset-password` - Password reset
- `/work-report` - Submit work reports
- `/employee-reports` - View employee reports
- `/admin` - Admin dashboard (requires admin role)
- `/super-admin` - Super admin dashboard (requires superadmin role)
- `/management-dashboard` - Analytics dashboard with charts
- `/managers-dashboard` - Team management dashboard

