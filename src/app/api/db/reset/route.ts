import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db/database';

// Temporary reset key - remove after use
const RESET_KEY = 'RESET_ALL_DATA_2024';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resetKey = searchParams.get('key');
    
    // Allow reset with either valid session or reset key
    const session = await getSession();
    const hasValidKey = resetKey === RESET_KEY;
    
    if (!hasValidKey && (!session || session.role !== 'superadmin')) {
      return NextResponse.json(
        { success: false, error: 'Only superadmin can reset the database' },
        { status: 403 }
      );
    }

    const db = getDatabase();
    
    // Get the super admin user ID to preserve it
    const superAdmin = db.prepare(
      "SELECT id FROM employees WHERE role = 'superadmin' LIMIT 1"
    ).get() as { id: number } | undefined;

    if (!superAdmin) {
      return NextResponse.json(
        { success: false, error: 'Super admin not found' },
        { status: 400 }
      );
    }

    // Delete in order to respect foreign key constraints
    
    // 1. Delete all work reports
    try { db.prepare('DELETE FROM workReports').run(); } catch { /* table may not exist */ }
    
    // 2. Delete all leave records (if exists)
    try { db.prepare('DELETE FROM leaveRecords').run(); } catch { /* table may not exist */ }
    
    // 3. Delete all manager_departments mappings
    try { db.prepare('DELETE FROM manager_departments').run(); } catch { /* table may not exist */ }
    
    // 4. Delete all users except super admin
    db.prepare('DELETE FROM employees WHERE id != ?').run(superAdmin.id);
    
    // 5. Delete all departments
    db.prepare('DELETE FROM departments').run();
    
    // 6. Delete all branches
    db.prepare('DELETE FROM branches').run();
    
    // 7. Delete all entities
    db.prepare('DELETE FROM entities').run();

    return NextResponse.json({
      success: true,
      message: 'Database reset successfully. All data deleted except super admin.',
    });
  } catch (error) {
    console.error('Database reset error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset database',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST request to reset the database. Warning: This will delete all data except super admin!',
  });
}

