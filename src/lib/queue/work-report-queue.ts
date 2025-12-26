import { EventEmitter } from 'events';
import { logger } from '../logger';
import type { CreateWorkReportInput, WorkReport } from '@/types';

// Queue item type
export interface QueueItem {
  id: string;
  data: CreateWorkReportInput;
  timestamp: number;
  retries: number;
  dbRetries: number; // Database retry counter
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: WorkReport;
  processingStartTime?: number;
  processingEndTime?: number;
}

// Queue status with detailed metrics
export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  avgProcessingTimeMs: number;
  queueHealthy: boolean;
}

// Configuration for the queue
const QUEUE_CONFIG = {
  // Delay between processing items
  PROCESS_DELAY_MS: 10,
  
  // Max retries for general errors
  MAX_RETRIES: 3,
  
  // Max retries for database errors
  MAX_DB_RETRIES: 5,
  
  // Base delay for database retry (exponential backoff)
  DB_RETRY_BASE_MS: 50,
  
  // Max items to keep in history (to prevent memory leak)
  MAX_HISTORY_ITEMS: 1000,
  
  // Max listeners for concurrent access
  MAX_LISTENERS: 200,
};

/**
 * Helper function to execute database operation with retry logic
 * Uses exponential backoff for transient errors
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = QUEUE_CONFIG.MAX_DB_RETRIES,
  baseDelayMs: number = QUEUE_CONFIG.DB_RETRY_BASE_MS
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if it's a transient error worth retrying
      const errorMessage = lastError.message.toLowerCase();
      const isTransientError = 
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('too many clients');
      
      if (isTransientError && attempt < maxRetries - 1) {
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms, 800ms
        const delay = baseDelayMs * Math.pow(2, attempt);
        logger.debug(`[Queue] Transient error detected, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For non-transient errors or max retries reached, throw immediately
      throw lastError;
    }
  }
  
  throw lastError || new Error('Max retries reached');
}

// Simple in-memory queue using EventEmitter
// Optimized for 40-50 concurrent users
class WorkReportQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private completedItems: QueueItem[] = [];
  private failedItems: QueueItem[] = [];
  private processingTimes: number[] = [];

  constructor() {
    super();
    this.setMaxListeners(QUEUE_CONFIG.MAX_LISTENERS);
    logger.log('[Queue] WorkReportQueue initialized with optimized settings for concurrent access');
  }

  // Generate unique ID
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // Add item to queue
  enqueue(data: CreateWorkReportInput): string {
    const id = this.generateId();
    const item: QueueItem = {
      id,
      data,
      timestamp: Date.now(),
      retries: 0,
      dbRetries: 0,
      status: 'pending',
    };

    this.queue.push(item);
    logger.debug(`[Queue] Enqueued item ${id}. Queue size: ${this.queue.length}`);
    
    // Emit event for new item
    this.emit('enqueue', item);
    
    // Start processing if not already processing
    if (!this.processing) {
      this.processNext();
    }

    return id;
  }

  // Process next item in queue
  private async processNext(): Promise<void> {
    if (this.processing) return;
    
    const item = this.queue.find(i => i.status === 'pending');
    if (!item) {
      // No pending items
      return;
    }

    this.processing = true;
    item.status = 'processing';
    item.processingStartTime = Date.now();
    logger.debug(`[Queue] Processing item ${item.id} (queue size: ${this.queue.length})`);

    try {
      // Import dynamically to avoid circular dependencies
      const { createWorkReport, getWorkReportByEmployeeAndDate } = await import('@/lib/db/queries');
      
      // Check for duplicate with retry logic
      const existing = await executeWithRetry(async () => 
        getWorkReportByEmployeeAndDate(item.data.employeeId, item.data.date)
      );
      
      if (existing) {
        throw new Error('A work report already exists for this employee on this date');
      }

      // Create work report in database with retry logic
      const result = await executeWithRetry(async () => createWorkReport(item.data));
      
      item.result = result;
      item.status = 'completed';
      item.processingEndTime = Date.now();
      
      // Track processing time
      const processingTime = item.processingEndTime - (item.processingStartTime || item.timestamp);
      this.processingTimes.push(processingTime);
      // Keep only last 100 times for average calculation
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      
      logger.debug(`[Queue] Item ${item.id} completed in ${processingTime}ms`);
      
      // Move to completed list
      this.queue = this.queue.filter(i => i.id !== item.id);
      this.completedItems.push(item);
      
      // Limit history size to prevent memory leak
      if (this.completedItems.length > QUEUE_CONFIG.MAX_HISTORY_ITEMS) {
        this.completedItems = this.completedItems.slice(-QUEUE_CONFIG.MAX_HISTORY_ITEMS);
      }
      
      // Emit completion event
      this.emit('completed', item);

      // Try to submit to Google Sheets (non-blocking)
      this.submitToGoogleSheets(result).catch(err => {
        console.error('[Queue] Google Sheets backup failed:', err);
      });

    } catch (error) {
      item.retries++;
      item.error = error instanceof Error ? error.message : 'Unknown error';
      item.processingEndTime = Date.now();
      
      // Check if it's a duplicate error (don't retry)
      const isDuplicateError = item.error.includes('already exists');
      
      if (isDuplicateError || item.retries >= QUEUE_CONFIG.MAX_RETRIES) {
        item.status = 'failed';
        console.error(`[Queue] Item ${item.id} failed after ${item.retries} retries:`, item.error);
        
        // Move to failed list
        this.queue = this.queue.filter(i => i.id !== item.id);
        this.failedItems.push(item);
        
        // Limit history size
        if (this.failedItems.length > QUEUE_CONFIG.MAX_HISTORY_ITEMS) {
          this.failedItems = this.failedItems.slice(-QUEUE_CONFIG.MAX_HISTORY_ITEMS);
        }
        
        // Emit failure event
        this.emit('failed', item);
      } else {
        item.status = 'pending';
        logger.debug(`[Queue] Item ${item.id} will be retried (attempt ${item.retries}/${QUEUE_CONFIG.MAX_RETRIES})`);
      }
    } finally {
      this.processing = false;
      
      // Process next item if any
      const pendingCount = this.queue.filter(i => i.status === 'pending').length;
      if (pendingCount > 0) {
        setTimeout(() => this.processNext(), QUEUE_CONFIG.PROCESS_DELAY_MS);
      }
    }
  }

  // Submit to Google Sheets (backup, non-blocking)
  private async submitToGoogleSheets(report: WorkReport): Promise<void> {
    try {
      const { appendToGoogleSheet } = await import('@/lib/google-sheets');
      await appendToGoogleSheet(report);
      logger.debug(`[Queue] Work report backed up to Google Sheets: ${report.id}`);
    } catch (error) {
      // Log but don't throw - Google Sheets is backup only
      console.error('[Queue] Google Sheets backup error:', error);
    }
  }

  // Get queue status with metrics
  getStatus(): QueueStatus {
    const avgProcessingTimeMs = this.processingTimes.length > 0
      ? Math.round(this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length)
      : 0;
    
    const pending = this.queue.filter(i => i.status === 'pending').length;
    const processing = this.queue.filter(i => i.status === 'processing').length;
    
    return {
      pending,
      processing,
      completed: this.completedItems.length,
      failed: this.failedItems.length,
      total: this.queue.length + this.completedItems.length + this.failedItems.length,
      avgProcessingTimeMs,
      // Queue is healthy if not backing up significantly
      queueHealthy: pending < 50,
    };
  }

  // Get item by ID
  getItem(id: string): QueueItem | undefined {
    return (
      this.queue.find(i => i.id === id) ||
      this.completedItems.find(i => i.id === id) ||
      this.failedItems.find(i => i.id === id)
    );
  }

  // Clear completed and failed items (for cleanup)
  clearHistory(): void {
    const clearedCount = this.completedItems.length + this.failedItems.length;
    this.completedItems = [];
    this.failedItems = [];
    this.processingTimes = [];
    logger.debug(`[Queue] Cleared ${clearedCount} items from history`);
  }

  // Get all items (for debugging)
  getAllItems(): QueueItem[] {
    return [...this.queue, ...this.completedItems, ...this.failedItems];
  }
  
  // Get recent failed items (for monitoring)
  getRecentFailures(limit: number = 10): QueueItem[] {
    return this.failedItems.slice(-limit);
  }
  
  // Get queue configuration (for monitoring)
  getConfig(): typeof QUEUE_CONFIG {
    return { ...QUEUE_CONFIG };
  }
}

// Singleton instance
let queueInstance: WorkReportQueue | null = null;

export function getWorkReportQueue(): WorkReportQueue {
  if (!queueInstance) {
    queueInstance = new WorkReportQueue();
  }
  return queueInstance;
}

// Helper function to enqueue a work report
export function enqueueWorkReport(data: CreateWorkReportInput): string {
  const queue = getWorkReportQueue();
  return queue.enqueue(data);
}

// Helper function to get queue status
export function getQueueStatus(): QueueStatus {
  const queue = getWorkReportQueue();
  return queue.getStatus();
}

// Helper function to get item status
export function getQueueItemStatus(id: string): QueueItem | undefined {
  const queue = getWorkReportQueue();
  return queue.getItem(id);
}

// Helper function to clear queue history
export function clearQueueHistory(): void {
  const queue = getWorkReportQueue();
  queue.clearHistory();
}

// Helper function to get recent failures
export function getRecentQueueFailures(limit: number = 10): QueueItem[] {
  const queue = getWorkReportQueue();
  return queue.getRecentFailures(limit);
}
