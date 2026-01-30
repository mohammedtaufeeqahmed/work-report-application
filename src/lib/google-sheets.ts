/**
 * Google Sheets Integration (Backup Only)
 * 
 * This module handles backing up work reports to Google Sheets.
 * IMPORTANT: This is BACKUP ONLY - all operations use PostgreSQL as primary storage.
 * Google Sheets is write-only and non-critical.
 */

import { logger } from './logger';
import type { WorkReport } from '@/types';

// Google Sheets configuration
interface GoogleSheetsConfig {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
}

// Get configuration from environment variables
function getConfig(): GoogleSheetsConfig | null {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    return null;
  }

  return {
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
    spreadsheetId,
  };
}

// Check if Google Sheets is configured
export function isGoogleSheetsConfigured(): boolean {
  return getConfig() !== null;
}

/**
 * Append a work report to Google Sheets (backup)
 * This is a non-critical operation - failures are logged but don't affect the main flow.
 * 
 * @param report - The work report to backup
 */
export async function appendToGoogleSheet(report: WorkReport): Promise<void> {
  const config = getConfig();
  
  if (!config) {
    logger.log('[GoogleSheets] Not configured - skipping backup');
    return;
  }

  try {
    // Import Google APIs dynamically
    const { google } = await import('googleapis');

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Create sheets client
    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare row data
    const rowData = [
      report.id,
      report.employeeId,
      report.date,
      report.name,
      report.email,
      report.department,
      report.status,
      report.workReport || '',
      report.createdAt,
    ];

    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: 'Sheet1!A:I', // Assuming first sheet with columns A-I
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });

    logger.log(`[GoogleSheets] Work report ${report.id} backed up successfully`);
  } catch (error) {
    // Log error but don't throw - this is a backup operation
    logger.error('[GoogleSheets] Backup failed:', error);
    
    // Optionally: Store failed backups for retry later
    // This could be implemented with a separate queue or database table
  }
}

/**
 * Initialize Google Sheets with headers (run once to set up the sheet)
 */
export async function initializeGoogleSheet(): Promise<void> {
  const config = getConfig();
  
  if (!config) {
    logger.log('[GoogleSheets] Not configured - cannot initialize');
    return;
  }

  try {
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Set headers
    const headers = [
      'ID',
      'Employee ID',
      'Date',
      'Name',
      'Email',
      'Department',
      'Status',
      'Work Report',
      'Created At',
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: 'Sheet1!A1:I1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });

    logger.log('[GoogleSheets] Headers initialized successfully');
  } catch (error) {
    logger.error('[GoogleSheets] Failed to initialize headers:', error);
  }
}

/**
 * Batch backup multiple work reports (for bulk operations)
 */
export async function batchBackupToGoogleSheet(reports: WorkReport[]): Promise<void> {
  const config = getConfig();
  
  if (!config) {
    logger.log('[GoogleSheets] Not configured - skipping batch backup');
    return;
  }

  if (reports.length === 0) {
    return;
  }

  try {
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.clientEmail,
        private_key: config.privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Prepare rows
    const rows = reports.map(report => [
      report.id,
      report.employeeId,
      report.date,
      report.name,
      report.email,
      report.department,
      report.status,
      report.workReport || '',
      report.createdAt,
    ]);

    // Append all rows
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: 'Sheet1!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    logger.log(`[GoogleSheets] ${reports.length} work reports backed up successfully`);
  } catch (error) {
    logger.error('[GoogleSheets] Batch backup failed:', error);
  }
}

