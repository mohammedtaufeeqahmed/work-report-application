import { NextRequest, NextResponse } from 'next/server';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { getAllEntities, createEntity, getEntityById } from '@/lib/db/queries';
import type { ApiResponse, Entity, CreateEntityInput } from '@/types';

// GET: Get all entities
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const entities = getAllEntities();

    return NextResponse.json<ApiResponse<Entity[]>>({
      success: true,
      data: entities,
    });
  } catch (error) {
    console.error('Get entities error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
}

// POST: Create new entity (super admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !isSuperAdmin(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized - Super admin only' },
        { status: 401 }
      );
    }

    const body: CreateEntityInput = await request.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Entity name is required' },
        { status: 400 }
      );
    }

    const entity = createEntity({ name: name.trim() });

    return NextResponse.json<ApiResponse<Entity>>({
      success: true,
      data: entity,
      message: 'Entity created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Create entity error:', error);
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Entity with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to create entity' },
      { status: 500 }
    );
  }
}

