import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db/database';
import type { ApiResponse } from '@/types';

// POST: Run database migrations (superadmin only)
export async function POST() {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only superadmins can run migrations' },
        { status: 403 }
      );
    }

    const db = getDatabase();
    const migrations: string[] = [];

    // Check and create departments table
    const deptTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='departments'").get();
    if (!deptTableExists) {
      db.exec(`
        CREATE TABLE departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      migrations.push('Created departments table');
    }

    // Check and create manager_departments table
    const mgrDeptTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='manager_departments'").get();
    if (!mgrDeptTableExists) {
      db.exec(`
        CREATE TABLE manager_departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          managerId INTEGER NOT NULL,
          departmentId INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(managerId, departmentId),
          FOREIGN KEY (managerId) REFERENCES employees(id) ON DELETE CASCADE,
          FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE
        )
      `);
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_manager_departments_managerId ON manager_departments(managerId);
        CREATE INDEX IF NOT EXISTS idx_manager_departments_departmentId ON manager_departments(departmentId);
      `);
      migrations.push('Created manager_departments table');
    }

    // Update employees table role constraint to include 'manager' if needed
    // SQLite doesn't support ALTER CHECK constraint, so we'll skip this for existing databases

    if (migrations.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        message: 'Database is already up to date',
      });
    }

    return NextResponse.json<ApiResponse<string[]>>({
      success: true,
      data: migrations,
      message: `Migrations completed: ${migrations.join(', ')}`,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// GET: Check migration status
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'superadmin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Only superadmins can check migrations' },
        { status: 403 }
      );
    }

    const db = getDatabase();
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const tableNames = tables.map(t => t.name);

    const status = {
      departments: tableNames.includes('departments'),
      manager_departments: tableNames.includes('manager_departments'),
      entities: tableNames.includes('entities'),
      branches: tableNames.includes('branches'),
      employees: tableNames.includes('employees'),
      workReports: tableNames.includes('workReports'),
    };

    return NextResponse.json<ApiResponse>({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Migration status error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}


