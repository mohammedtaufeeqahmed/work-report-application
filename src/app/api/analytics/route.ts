import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db/database';
import { getISTNow, formatDateToIST } from '@/lib/date';
import type { ApiResponse } from '@/types';

interface DailyStats {
  date: string;
  working: number;
  leave: number;
  total: number;
}

interface DepartmentStats {
  department: string;
  working: number;
  leave: number;
  total: number;
}

interface AnalyticsData {
  summary: {
    totalReports: number;
    workingDays: number;
    leaveDays: number;
    uniqueEmployees: number;
  };
  dailyStats: DailyStats[];
  departmentStats: DepartmentStats[];
  recentReports: Array<{
    employeeId: string;
    name: string;
    date: string;
    status: string;
    department: string;
  }>;
}

// GET: Get analytics data
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDatabase();
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    // Use IST for date calculations
    const istNow = getISTNow();
    const startDate = new Date(istNow);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = formatDateToIST(startDate);

    // Get summary stats
    const summaryQuery = db.prepare(`
      SELECT 
        COUNT(*) as totalReports,
        SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as workingDays,
        SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leaveDays,
        COUNT(DISTINCT employeeId) as uniqueEmployees
      FROM workReports
      WHERE date >= ?
    `);
    const summary = summaryQuery.get(startDateStr) as {
      totalReports: number;
      workingDays: number;
      leaveDays: number;
      uniqueEmployees: number;
    };

    // Get daily stats
    const dailyQuery = db.prepare(`
      SELECT 
        date,
        SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working,
        SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave,
        COUNT(*) as total
      FROM workReports
      WHERE date >= ?
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `);
    const dailyStats = dailyQuery.all(startDateStr) as DailyStats[];

    // Get department stats
    const departmentQuery = db.prepare(`
      SELECT 
        department,
        SUM(CASE WHEN status = 'working' THEN 1 ELSE 0 END) as working,
        SUM(CASE WHEN status = 'leave' THEN 1 ELSE 0 END) as leave,
        COUNT(*) as total
      FROM workReports
      WHERE date >= ?
      GROUP BY department
      ORDER BY total DESC
    `);
    const departmentStats = departmentQuery.all(startDateStr) as DepartmentStats[];

    // Get recent reports
    const recentQuery = db.prepare(`
      SELECT employeeId, name, date, status, department
      FROM workReports
      ORDER BY createdAt DESC
      LIMIT 10
    `);
    const recentReports = recentQuery.all() as Array<{
      employeeId: string;
      name: string;
      date: string;
      status: string;
      department: string;
    }>;

    const analyticsData: AnalyticsData = {
      summary: {
        totalReports: summary.totalReports || 0,
        workingDays: summary.workingDays || 0,
        leaveDays: summary.leaveDays || 0,
        uniqueEmployees: summary.uniqueEmployees || 0,
      },
      dailyStats: dailyStats.reverse(), // Reverse to show oldest first for charts
      departmentStats,
      recentReports,
    };

    return NextResponse.json<ApiResponse<AnalyticsData>>({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

