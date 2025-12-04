import Database from 'better-sqlite3';
import path from 'path';

// Get database path from environment or use default
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'workreport.db');

// Singleton database instance
let db: Database.Database | null = null;

/**
 * Get database instance (singleton pattern)
 * Creates the database if it doesn't exist
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    
    // Optimize for performance
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000'); // 64MB cache
    db.pragma('temp_store = MEMORY');
    
    // Auto-migrate: ensure all required tables exist
    ensureTablesExist(db);
  }
  
  return db;
}

/**
 * Ensure all required tables exist (auto-migration)
 */
function ensureTablesExist(database: Database.Database): void {
  // Check and create departments table
  const deptTableExists = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='departments'").get();
  if (!deptTableExists) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] Created departments table');
  }

  // Check and create manager_departments table
  const mgrDeptTableExists = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='manager_departments'").get();
  if (!mgrDeptTableExists) {
    database.exec(`
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
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_manager_departments_managerId ON manager_departments(managerId);
      CREATE INDEX IF NOT EXISTS idx_manager_departments_departmentId ON manager_departments(departmentId);
    `);
    console.log('[DB] Created manager_departments table');
  }

  // Clean up any leftover migration tables first
  database.exec(`DROP TABLE IF EXISTS employees_new`);
  
  // Migrate employees table to support all roles including 'boardmember'
  // Check if the current constraint doesn't include 'boardmember'
  const tableInfo = database.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='employees'").get() as { sql: string } | undefined;
  if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'boardmember'")) {
    console.log('[DB] Migrating employees table to support boardmember role...');
    
    // Disable foreign keys temporarily
    database.pragma('foreign_keys = OFF');
    
    try {
      database.exec(`
        -- Create new table with updated constraint (including boardmember)
        CREATE TABLE employees_new (
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
          createdBy INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (entityId) REFERENCES entities(id) ON DELETE SET NULL,
          FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL,
          FOREIGN KEY (createdBy) REFERENCES employees(id) ON DELETE SET NULL
        );
        
        -- Copy data from old table
        INSERT INTO employees_new (id, employeeId, name, email, department, password, entityId, branchId, role, status, createdBy, createdAt, updatedAt)
        SELECT id, employeeId, name, email, department, password, entityId, branchId, role, status, createdBy, createdAt, updatedAt 
        FROM employees;
        
        -- Drop old table
        DROP TABLE employees;
        
        -- Rename new table
        ALTER TABLE employees_new RENAME TO employees;
        
        -- Recreate indexes
        CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employeeId ON employees(employeeId);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
        CREATE INDEX IF NOT EXISTS idx_employees_entityId ON employees(entityId);
        CREATE INDEX IF NOT EXISTS idx_employees_branchId ON employees(branchId);
        CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
        CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
      `);
      
      console.log('[DB] Employees table migration completed - boardmember role supported');
    } catch (migrationError) {
      console.error('[DB] Migration error, cleaning up:', migrationError);
      database.exec(`DROP TABLE IF EXISTS employees_new`);
    }
    
    // Re-enable foreign keys
    database.pragma('foreign_keys = ON');
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Execute a transaction
 * @param fn Function to execute within transaction
 * @returns Result of the function
 */
export function transaction<T>(fn: () => T): T {
  const database = getDatabase();
  return database.transaction(fn)();
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected(): boolean {
  return db !== null && db.open;
}

// Export database types for use in queries
export type { Database };

