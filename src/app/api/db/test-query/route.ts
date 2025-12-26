import { NextResponse } from 'next/server';
import { pool } from '@/lib/db/database';

/**
 * GET /api/db/test-query
 * Tests basic database queries to diagnose issues
 * This endpoint helps identify schema/table problems
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  // Test 1: Simple connection
  try {
    const r1 = await pool.query('SELECT 1 as test');
    results.tests = {
      ...results.tests as object,
      connection: { success: true, result: r1.rows[0] },
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      connection: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }

  // Test 2: Check if work_reports table exists
  try {
    const r2 = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'work_reports'
      ) as exists
    `);
    results.tests = {
      ...results.tests as object,
      tableExists: { success: true, exists: r2.rows[0].exists },
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      tableExists: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }

  // Test 3: Check work_reports table schema
  try {
    const r3 = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'work_reports'
      ORDER BY ordinal_position
    `);
    results.tests = {
      ...results.tests as object,
      tableSchema: { success: true, columns: r3.rows },
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      tableSchema: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }

  // Test 4: Count work_reports
  try {
    const r4 = await pool.query('SELECT COUNT(*) as count FROM work_reports');
    results.tests = {
      ...results.tests as object,
      workReportsCount: { success: true, count: parseInt(r4.rows[0].count) },
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      workReportsCount: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }

  // Test 5: Try to fetch one work report
  try {
    const r5 = await pool.query('SELECT * FROM work_reports LIMIT 1');
    results.tests = {
      ...results.tests as object,
      sampleWorkReport: { 
        success: true, 
        hasData: r5.rows.length > 0,
        sample: r5.rows[0] ? { 
          id: r5.rows[0].id,
          employee_id: r5.rows[0].employee_id,
          date: r5.rows[0].date,
          status: r5.rows[0].status,
        } : null 
      },
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      sampleWorkReport: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }

  // Test 6: Check employees table
  try {
    const r6 = await pool.query('SELECT COUNT(*) as count FROM employees');
    results.tests = {
      ...results.tests as object,
      employeesCount: { success: true, count: parseInt(r6.rows[0].count) },
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      employeesCount: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }

  // Test 7: Check specific employee KIAD0115
  try {
    const r7 = await pool.query('SELECT employee_id, name, email, department, status FROM employees WHERE employee_id = $1', ['KIAD0115']);
    results.tests = {
      ...results.tests as object,
      employeeKIAD0115: { 
        success: true, 
        found: r7.rows.length > 0,
        data: r7.rows[0] || null 
      },
    };
  } catch (error) {
    results.tests = {
      ...results.tests as object,
      employeeKIAD0115: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }

  // Determine overall status
  const tests = results.tests as Record<string, { success: boolean }>;
  const allPassed = Object.values(tests).every(t => t.success);

  return NextResponse.json({
    success: allPassed,
    message: allPassed ? 'All tests passed' : 'Some tests failed - check details',
    ...results,
  }, { status: allPassed ? 200 : 500 });
}

