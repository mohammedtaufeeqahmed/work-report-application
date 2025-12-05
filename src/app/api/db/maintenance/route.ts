import { NextRequest, NextResponse } from 'next/server';
import { 
  checkpointDatabase, 
  incrementalVacuum, 
  optimizeDatabase,
  getDatabaseStats,
  healthCheck
} from '@/lib/db/database';
import { clearQueueHistory, getQueueStatus } from '@/lib/queue/work-report-queue';
import type { ApiResponse } from '@/types';

export interface MaintenanceResult {
  checkpoint: {
    success: boolean;
    walPages: number;
    checkpointedPages: number;
  };
  vacuum: {
    success: boolean;
    pagesFreed: number;
  };
  optimize: {
    success: boolean;
  };
  queueCleanup: {
    success: boolean;
    clearedItems: number;
  };
  databaseStats: {
    dbSizeMB: string;
    freelistCount: number;
  };
  timestamp: string;
}

/**
 * POST /api/db/maintenance
 * Run database maintenance tasks
 * Should be called periodically (daily recommended)
 * 
 * Query params:
 * - checkpoint: boolean (default: true) - Run WAL checkpoint
 * - vacuum: boolean (default: true) - Run incremental vacuum
 * - optimize: boolean (default: true) - Run ANALYZE
 * - clearQueue: boolean (default: false) - Clear queue history
 * - vacuumPages: number (default: 100) - Pages to vacuum
 */
export async function POST(request: NextRequest) {
  try {
    // Check database health first
    const health = healthCheck();
    if (!health.healthy) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: `Database unhealthy: ${health.error}`,
      }, { status: 503 });
    }
    
    const url = new URL(request.url);
    const doCheckpoint = url.searchParams.get('checkpoint') !== 'false';
    const doVacuum = url.searchParams.get('vacuum') !== 'false';
    const doOptimize = url.searchParams.get('optimize') !== 'false';
    const doClearQueue = url.searchParams.get('clearQueue') === 'true';
    const vacuumPages = parseInt(url.searchParams.get('vacuumPages') || '100', 10);
    
    console.log('[Maintenance] Starting database maintenance...');
    
    const result: MaintenanceResult = {
      checkpoint: { success: false, walPages: 0, checkpointedPages: 0 },
      vacuum: { success: false, pagesFreed: 0 },
      optimize: { success: false },
      queueCleanup: { success: false, clearedItems: 0 },
      databaseStats: { dbSizeMB: '0', freelistCount: 0 },
      timestamp: new Date().toISOString(),
    };
    
    // Get initial stats for comparison
    const initialStats = getDatabaseStats();
    
    // 1. WAL Checkpoint
    if (doCheckpoint) {
      console.log('[Maintenance] Running WAL checkpoint...');
      const checkpointResult = checkpointDatabase();
      result.checkpoint = checkpointResult;
    }
    
    // 2. Incremental Vacuum
    if (doVacuum) {
      console.log(`[Maintenance] Running incremental vacuum (${vacuumPages} pages)...`);
      const vacuumSuccess = incrementalVacuum(vacuumPages);
      result.vacuum = { 
        success: vacuumSuccess, 
        pagesFreed: vacuumSuccess ? vacuumPages : 0 
      };
    }
    
    // 3. Optimize (ANALYZE)
    if (doOptimize) {
      console.log('[Maintenance] Running database optimization...');
      result.optimize.success = optimizeDatabase();
    }
    
    // 4. Clear queue history
    if (doClearQueue) {
      console.log('[Maintenance] Clearing queue history...');
      const queueStatusBefore = getQueueStatus();
      const itemsBeforeCleanup = queueStatusBefore.completed + queueStatusBefore.failed;
      clearQueueHistory();
      result.queueCleanup = { 
        success: true, 
        clearedItems: itemsBeforeCleanup 
      };
    }
    
    // Get final stats
    const finalStats = getDatabaseStats();
    result.databaseStats = {
      dbSizeMB: finalStats.dbSizeMB,
      freelistCount: finalStats.freelistCount,
    };
    
    console.log('[Maintenance] Database maintenance completed:', result);
    
    return NextResponse.json<ApiResponse<MaintenanceResult>>({
      success: true,
      data: result,
      message: 'Database maintenance completed successfully',
    });
    
  } catch (error) {
    console.error('[Maintenance] Error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Maintenance failed',
    }, { status: 500 });
  }
}

/**
 * GET /api/db/maintenance
 * Get information about maintenance tasks
 */
export async function GET() {
  return NextResponse.json<ApiResponse>({
    success: true,
    data: {
      description: 'Database maintenance endpoint',
      method: 'POST',
      queryParams: {
        checkpoint: {
          type: 'boolean',
          default: true,
          description: 'Run WAL checkpoint to consolidate Write-Ahead Log',
        },
        vacuum: {
          type: 'boolean',
          default: true,
          description: 'Run incremental vacuum to reclaim unused space',
        },
        optimize: {
          type: 'boolean',
          default: true,
          description: 'Run ANALYZE to optimize query planner',
        },
        clearQueue: {
          type: 'boolean',
          default: false,
          description: 'Clear completed/failed items from queue history',
        },
        vacuumPages: {
          type: 'number',
          default: 100,
          description: 'Number of pages to vacuum (only if vacuum=true)',
        },
      },
      recommendedSchedule: {
        checkpoint: 'Daily at low-traffic hours',
        vacuum: 'Weekly',
        optimize: 'After bulk data changes',
        clearQueue: 'Weekly or when history grows large',
      },
      examples: {
        fullMaintenance: 'POST /api/db/maintenance',
        checkpointOnly: 'POST /api/db/maintenance?vacuum=false&optimize=false',
        withQueueCleanup: 'POST /api/db/maintenance?clearQueue=true',
      },
    },
  });
}

