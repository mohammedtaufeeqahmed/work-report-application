import type { SessionUser } from '@/types';

/**
 * Check if a user can mark holidays
 * - Managers, Admins, and Super Admins: Always allowed
 * - Operations department: Only if pageAccess.mark_holidays === true
 */
export function canMarkHolidays(session: SessionUser): boolean {
  // Managers, Admins, and Super Admins can always mark holidays
  if (session.role === 'manager' || session.role === 'admin' || session.role === 'superadmin') {
    return true;
  }
  
  // Operations department employees need explicit permission
  if (session.department === 'Operations' && session.pageAccess?.mark_holidays === true) {
    return true;
  }
  
  return false;
}

