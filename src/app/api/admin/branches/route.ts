import { NextRequest, NextResponse } from 'next/server';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { getAllBranches, getBranchesByEntity, createBranch } from '@/lib/db/queries';
import type { ApiResponse, Branch, CreateBranchInput } from '@/types';

// GET: Get all branches or branches by entity
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const entityId = url.searchParams.get('entityId');

    let branches: Branch[];
    
    if (entityId) {
      branches = await getBranchesByEntity(parseInt(entityId));
    } else {
      branches = await getAllBranches();
    }

    return NextResponse.json<ApiResponse<Branch[]>>({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error('Get branches error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to fetch branches' },
      { status: 500 }
    );
  }
}

// POST: Create new branch (super admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || !isSuperAdmin(session)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized - Super admin only' },
        { status: 401 }
      );
    }

    const body: CreateBranchInput = await request.json();
    const { name, entityId } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Branch name is required' },
        { status: 400 }
      );
    }

    if (!entityId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Entity ID is required' },
        { status: 400 }
      );
    }

    const branch = await createBranch({ name: name.trim(), entityId });

    return NextResponse.json<ApiResponse<Branch>>({
      success: true,
      data: branch,
      message: 'Branch created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Create branch error:', error);
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Branch with this name already exists in this entity' },
        { status: 409 }
      );
    }
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to create branch' },
      { status: 500 }
    );
  }
}
