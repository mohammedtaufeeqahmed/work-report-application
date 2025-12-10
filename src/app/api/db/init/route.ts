import { NextResponse } from 'next/server';
import { initializeDatabase, seedInitialData } from '@/lib/db/database';

export async function POST() {
  try {
    // Initialize database schema
    await initializeDatabase();
    
    // Seed initial data (creates super admin if no data exists)
    await seedInitialData();
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize database',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST request to initialize the database',
  });
}
