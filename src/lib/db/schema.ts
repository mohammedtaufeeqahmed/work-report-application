import { getDatabase } from './database';

/**
 * Initialize database schema
 * Creates all required tables if they don't exist
 */
export function initializeSchema(): void {
  const db = getDatabase();

  // Create entities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create branches table
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      entityId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, entityId),
      FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE CASCADE
    )
  `);

  // Create departments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      entityId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, entityId),
      FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE CASCADE
    )
  `);

  // Add entityId column to existing departments table if it doesn't exist
  try {
    db.exec(`ALTER TABLE departments ADD COLUMN entityId INTEGER REFERENCES entities(id) ON DELETE CASCADE`);
  } catch {
    // Column already exists, ignore
  }

  // Create employees table (used for authentication and user management)
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      password TEXT NOT NULL,
      entityId INTEGER,
      branchId INTEGER,
      role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('employee', 'manager', 'admin', 'superadmin', 'boardmember')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      pageAccess TEXT,
      createdBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE SET NULL,
      FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL,
      FOREIGN KEY (createdBy) REFERENCES employees(id) ON DELETE SET NULL
    )
  `);

  // Add pageAccess column to existing employees table if it doesn't exist
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN pageAccess TEXT`);
  } catch {
    // Column already exists, ignore
  }

  // Create manager_departments junction table (for managers with multiple departments)
  db.exec(`
    CREATE TABLE IF NOT EXISTS manager_departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      managerId INTEGER NOT NULL,
      departmentId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(managerId, departmentId),
      FOREIGN KEY (managerId) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE
    )
  `);

  // Create workReports table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workReports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId TEXT NOT NULL,
      date DATE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      department TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('working', 'leave')),
      workReport TEXT,
      onDuty INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add onDuty column to existing workReports table if it doesn't exist
  try {
    db.exec(`ALTER TABLE workReports ADD COLUMN onDuty INTEGER DEFAULT 0`);
  } catch {
    // Column already exists, ignore
  }

  // Create passwordResetTokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS passwordResetTokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create settings table for system-wide configurations
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create OTP tokens table for email verification (password change)
  db.exec(`
    CREATE TABLE IF NOT EXISTS otpTokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId TEXT NOT NULL,
      otp TEXT NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default settings for work report edit permissions
  db.exec(`
    INSERT OR IGNORE INTO settings (key, value) VALUES 
      ('employee_can_edit_own_reports', 'false'),
      ('manager_can_edit_team_reports', 'true'),
      ('admin_can_edit_reports', 'true'),
      ('superadmin_can_edit_reports', 'true')
  `);

  // ============================================
  // Indexes for better query performance
  // Optimized for 40-50 concurrent users
  // ============================================
  
  // Basic employee indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_employees_employeeId ON employees(employeeId);
    CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
    CREATE INDEX IF NOT EXISTS idx_employees_entityId ON employees(entityId);
    CREATE INDEX IF NOT EXISTS idx_employees_branchId ON employees(branchId);
    CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
  `);
  
  // Composite index for employee lookups (role + status - common filter combo)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_employees_role_status ON employees(role, status);
    CREATE INDEX IF NOT EXISTS idx_employees_entity_branch ON employees(entityId, branchId);
  `);
  
  // Branch indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_branches_entityId ON branches(entityId);
  `);
  
  // Manager departments indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_manager_departments_managerId ON manager_departments(managerId);
    CREATE INDEX IF NOT EXISTS idx_manager_departments_departmentId ON manager_departments(departmentId);
  `);
  
  // Basic work reports indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workReports_employeeId ON workReports(employeeId);
    CREATE INDEX IF NOT EXISTS idx_workReports_date ON workReports(date);
    CREATE INDEX IF NOT EXISTS idx_workReports_status ON workReports(status);
    CREATE INDEX IF NOT EXISTS idx_workReports_department ON workReports(department);
  `);
  
  // ============================================
  // Composite indexes for common query patterns
  // These significantly improve concurrent access
  // ============================================
  
  // Most common query: check if employee submitted report for a date
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workReports_employeeId_date 
    ON workReports(employeeId, date DESC);
  `);
  
  // Date range queries with status filter (analytics)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workReports_date_status 
    ON workReports(date DESC, status);
  `);
  
  // Department + date queries (manager dashboards)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workReports_department_date 
    ON workReports(department, date DESC);
  `);
  
  // Full analytics composite index
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workReports_date_department_status 
    ON workReports(date DESC, department, status);
  `);
  
  // Created at for sorting (newest first)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workReports_createdAt 
    ON workReports(createdAt DESC);
  `);
  
  // Password reset token indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_passwordResetTokens_employeeId ON passwordResetTokens(employeeId);
    CREATE INDEX IF NOT EXISTS idx_passwordResetTokens_token ON passwordResetTokens(token);
    CREATE INDEX IF NOT EXISTS idx_passwordResetTokens_expiresAt ON passwordResetTokens(expiresAt);
  `);
  
  // Department indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_departments_entityId ON departments(entityId);
    CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
  `);

  // OTP token indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_otpTokens_employeeId ON otpTokens(employeeId);
    CREATE INDEX IF NOT EXISTS idx_otpTokens_otp ON otpTokens(otp);
    CREATE INDEX IF NOT EXISTS idx_otpTokens_expiresAt ON otpTokens(expiresAt);
  `);

  console.log('[DB] Database schema initialized with optimized indexes');
}

/**
 * Seed initial data (optional - for development/testing)
 */
export async function seedInitialData(): Promise<void> {
  const db = getDatabase();
  const bcrypt = await import('bcrypt');
  
  // Check if we already have data
  const entityCount = db.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number };
  if (entityCount.count > 0) {
    console.log('Database already has data, skipping seed');
    return;
  }

  // Create a default entity
  const entityResult = db.prepare('INSERT INTO entities (name) VALUES (?)').run('Default Entity');
  const entityId = entityResult.lastInsertRowid as number;

  // Create a default branch
  const branchResult = db.prepare('INSERT INTO branches (name, entityId) VALUES (?, ?)').run('Default Branch', entityId);
  const branchId = branchResult.lastInsertRowid as number;

  // Create a super admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  db.prepare(`
    INSERT INTO employees (employeeId, name, email, department, password, entityId, branchId, role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('ADMIN001', 'Super Admin', 'admin@company.com', 'Administration', hashedPassword, entityId, branchId, 'superadmin', 'active');

  console.log('Initial data seeded successfully');
  console.log('Super Admin credentials: Employee ID: ADMIN001, Password: admin123');
}

/**
 * Drop all tables (use with caution - for development only)
 */
export function dropAllTables(): void {
  const db = getDatabase();
  
  db.exec(`
    DROP TABLE IF EXISTS passwordResetTokens;
    DROP TABLE IF EXISTS workReports;
    DROP TABLE IF EXISTS manager_departments;
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;
    DROP TABLE IF EXISTS branches;
    DROP TABLE IF EXISTS entities;
  `);
  
  console.log('All tables dropped');
}

/**
 * Reset database (drop and recreate)
 */
export async function resetDatabase(): Promise<void> {
  dropAllTables();
  initializeSchema();
  await seedInitialData();
}

