import Database from 'better-sqlite3';
import path from 'path';

// Get database path from environment or use default
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'workreport.db');

// Singleton database instance
let db: Database.Database | null = null;

// Database statistics interface
export interface DatabaseStats {
  pageCount: number;
  pageSize: number;
  cacheSize: number;
  freelistCount: number;
  walMode: string;
  dbSizeBytes: number;
  dbSizeMB: string;
}

// Health check result interface
export interface HealthCheckResult {
  healthy: boolean;
  error?: string;
  responseTimeMs: number;
}

/**
 * Get database instance (singleton pattern)
 * Creates the database if it doesn't exist
 * Optimized for 40-50 concurrent users
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    
    // ============================================
    // Performance optimizations for 40-50 users
    // ============================================
    
    // Synchronous mode: NORMAL balances speed and safety
    db.pragma('synchronous = NORMAL');
    
    // Cache size: 64MB for better read performance
    db.pragma('cache_size = -64000');
    
    // Store temp tables in memory
    db.pragma('temp_store = MEMORY');
    
    // Wait up to 5 seconds if database is locked (reduces lock errors)
    db.pragma('busy_timeout = 5000');
    
    // Memory-mapped I/O: 256MB for faster reads
    db.pragma('mmap_size = 268435456');
    
    // Optimize page size for better I/O performance
    db.pragma('page_size = 4096');
    
    // Run query planner optimizations
    db.pragma('optimize');
    
    // Auto-vacuum: incremental to reclaim space without blocking
    db.pragma('auto_vacuum = INCREMENTAL');
    
    // Auto-migrate: ensure all required tables exist
    ensureTablesExist(db);
    
    console.log('[DB] Database initialized with performance optimizations for concurrent access');
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

  // Check and create otpTokens table for email OTP verification
  const otpTableExists = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='otpTokens'").get();
  if (!otpTableExists) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS otpTokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employeeId TEXT NOT NULL,
        otp TEXT NOT NULL,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_otpTokens_employeeId ON otpTokens(employeeId);
      CREATE INDEX IF NOT EXISTS idx_otpTokens_otp ON otpTokens(otp);
      CREATE INDEX IF NOT EXISTS idx_otpTokens_expiresAt ON otpTokens(expiresAt);
    `);
    console.log('[DB] Created otpTokens table');
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

/**
 * Health check - verifies database connectivity
 * Returns response time and health status
 */
export function healthCheck(): HealthCheckResult {
  const startTime = performance.now();
  try {
    const database = getDatabase();
    // Simple query to test connection
    database.prepare('SELECT 1').get();
    const responseTimeMs = performance.now() - startTime;
    return { 
      healthy: true, 
      responseTimeMs: Math.round(responseTimeMs * 100) / 100 
    };
  } catch (error) {
    const responseTimeMs = performance.now() - startTime;
    return { 
      healthy: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs: Math.round(responseTimeMs * 100) / 100 
    };
  }
}

/**
 * Get database statistics for monitoring
 */
export function getDatabaseStats(): DatabaseStats {
  const database = getDatabase();
  const pageCount = database.pragma('page_count', { simple: true }) as number;
  const pageSize = database.pragma('page_size', { simple: true }) as number;
  const dbSizeBytes = pageCount * pageSize;
  
  return {
    pageCount,
    pageSize,
    cacheSize: database.pragma('cache_size', { simple: true }) as number,
    freelistCount: database.pragma('freelist_count', { simple: true }) as number,
    walMode: database.pragma('journal_mode', { simple: true }) as string,
    dbSizeBytes,
    dbSizeMB: (dbSizeBytes / (1024 * 1024)).toFixed(2),
  };
}

/**
 * Run WAL checkpoint to consolidate WAL file
 * Should be run periodically (e.g., daily via cron)
 */
export function checkpointDatabase(): { success: boolean; walPages: number; checkpointedPages: number } {
  const database = getDatabase();
  try {
    // TRUNCATE mode: checkpoint and truncate WAL file
    const result = database.pragma('wal_checkpoint(TRUNCATE)') as { busy: number; log: number; checkpointed: number }[];
    const checkpoint = result[0];
    console.log('[DB] WAL checkpoint completed:', checkpoint);
    return { 
      success: true, 
      walPages: checkpoint.log,
      checkpointedPages: checkpoint.checkpointed 
    };
  } catch (error) {
    console.error('[DB] WAL checkpoint failed:', error);
    return { success: false, walPages: 0, checkpointedPages: 0 };
  }
}

/**
 * Run incremental vacuum to reclaim space
 * Should be run periodically (e.g., weekly)
 */
export function incrementalVacuum(pages: number = 100): boolean {
  const database = getDatabase();
  try {
    database.pragma(`incremental_vacuum(${pages})`);
    console.log(`[DB] Incremental vacuum completed: ${pages} pages`);
    return true;
  } catch (error) {
    console.error('[DB] Incremental vacuum failed:', error);
    return false;
  }
}

/**
 * Optimize database (run ANALYZE for query planner)
 * Should be run after significant data changes
 */
export function optimizeDatabase(): boolean {
  const database = getDatabase();
  try {
    database.pragma('optimize');
    database.exec('ANALYZE');
    console.log('[DB] Database optimized');
    return true;
  } catch (error) {
    console.error('[DB] Database optimization failed:', error);
    return false;
  }
}

/**
 * Setup graceful shutdown handlers
 * Ensures database is properly closed on process termination
 */
export function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    console.log(`[DB] Received ${signal}, closing database connection...`);
    closeDatabase();
    process.exit(0);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Export database types for use in queries
export type { Database };

