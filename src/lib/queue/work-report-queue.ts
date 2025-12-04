import { EventEmitter } from 'events';
import type { CreateWorkReportInput, WorkReport } from '@/types';

// Queue item type
export interface QueueItem {
  id: string;
  data: CreateWorkReportInput;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: WorkReport;
}

// Queue status
export interface QueueStatus {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

// Simple in-memory queue using EventEmitter
class WorkReportQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private maxRetries: number = 3;
  private completedItems: QueueItem[] = [];
  private failedItems: QueueItem[] = [];

  constructor() {
    super();
    this.setMaxListeners(100);
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
      status: 'pending',
    };

    this.queue.push(item);
    console.log(`[Queue] Enqueued item ${id}. Queue size: ${this.queue.length}`);
    
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
      console.log('[Queue] No pending items to process');
      return;
    }

    this.processing = true;
    item.status = 'processing';
    console.log(`[Queue] Processing item ${item.id}`);

    try {
      // Import dynamically to avoid circular dependencies
      const { createWorkReport, getWorkReportByEmployeeAndDate } = await import('@/lib/db/queries');
      
      // Check for duplicate
      const existing = getWorkReportByEmployeeAndDate(item.data.employeeId, item.data.date);
      if (existing) {
        throw new Error('A work report already exists for this employee on this date');
      }

      // Create work report in database
      const result = createWorkReport(item.data);
      item.result = result;
      item.status = 'completed';
      
      console.log(`[Queue] Item ${item.id} completed successfully`);
      
      // Move to completed list
      this.queue = this.queue.filter(i => i.id !== item.id);
      this.completedItems.push(item);
      
      // Emit completion event
      this.emit('completed', item);

      // Try to submit to Google Sheets (non-blocking)
      this.submitToGoogleSheets(result).catch(err => {
        console.error('[Queue] Google Sheets backup failed:', err);
      });

    } catch (error) {
      item.retries++;
      item.error = error instanceof Error ? error.message : 'Unknown error';
      
      if (item.retries >= this.maxRetries) {
        item.status = 'failed';
        console.error(`[Queue] Item ${item.id} failed after ${item.retries} retries:`, item.error);
        
        // Move to failed list
        this.queue = this.queue.filter(i => i.id !== item.id);
        this.failedItems.push(item);
        
        // Emit failure event
        this.emit('failed', item);
      } else {
        item.status = 'pending';
        console.log(`[Queue] Item ${item.id} will be retried (attempt ${item.retries}/${this.maxRetries})`);
      }
    } finally {
      this.processing = false;
      
      // Process next item if any
      const pendingCount = this.queue.filter(i => i.status === 'pending').length;
      if (pendingCount > 0) {
        // Small delay between processing items
        setTimeout(() => this.processNext(), 100);
      }
    }
  }

  // Submit to Google Sheets (backup, non-blocking)
  private async submitToGoogleSheets(report: WorkReport): Promise<void> {
    try {
      const { appendToGoogleSheet } = await import('@/lib/google-sheets');
      await appendToGoogleSheet(report);
      console.log(`[Queue] Work report backed up to Google Sheets: ${report.id}`);
    } catch (error) {
      // Log but don't throw - Google Sheets is backup only
      console.error('[Queue] Google Sheets backup error:', error);
    }
  }

  // Get queue status
  getStatus(): QueueStatus {
    return {
      pending: this.queue.filter(i => i.status === 'pending').length,
      processing: this.queue.filter(i => i.status === 'processing').length,
      completed: this.completedItems.length,
      failed: this.failedItems.length,
      total: this.queue.length + this.completedItems.length + this.failedItems.length,
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
    this.completedItems = [];
    this.failedItems = [];
  }

  // Get all items (for debugging)
  getAllItems(): QueueItem[] {
    return [...this.queue, ...this.completedItems, ...this.failedItems];
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

