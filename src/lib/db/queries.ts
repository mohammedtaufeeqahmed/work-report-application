import { getDatabase, transaction } from './database';
import type {
  Employee,
  SafeEmployee,
  Entity,
  Branch,
  Department,
  WorkReport,
  PasswordResetToken,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateWorkReportInput,
  CreateEntityInput,
  CreateBranchInput,
  CreateDepartmentInput,
  EmployeeLookup,
  Setting,
  EditPermissions,
} from '@/types';

// ============================================================================
// Employee Queries
// ============================================================================

/**
 * Get employee by ID (internal database id)
 */
export function getEmployeeById(id: number): Employee | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  return result as Employee | null;
}

/**
 * Get employee by employeeId (the human-readable ID)
 * Case-insensitive lookup - accepts both uppercase and lowercase
 */
export function getEmployeeByEmployeeId(employeeId: string): Employee | null {
  const db = getDatabase();
  // Use UPPER() for case-insensitive comparison
  const result = db.prepare('SELECT * FROM employees WHERE UPPER(employeeId) = UPPER(?)').get(employeeId);
  return result as Employee | null;
}

/**
 * Get employee by email
 */
export function getEmployeeByEmail(email: string): Employee | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM employees WHERE email = ?').get(email);
  return result as Employee | null;
}

/**
 * Get safe employee (without password) by employeeId
 */
export function getSafeEmployeeByEmployeeId(employeeId: string): SafeEmployee | null {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT id, employeeId, name, email, department, entityId, branchId, role, status, createdBy, createdAt, updatedAt
    FROM employees WHERE employeeId = ?
  `).get(employeeId);
  return result as SafeEmployee | null;
}

/**
 * Get employee lookup data (for work report form)
 */
export function getEmployeeLookup(employeeId: string): EmployeeLookup | null {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT employeeId, name, email, department
    FROM employees WHERE employeeId = ? AND status = 'active'
  `).get(employeeId);
  return result as EmployeeLookup | null;
}

/**
 * Get all employees
 */
export function getAllEmployees(): SafeEmployee[] {
  const db = getDatabase();
  const results = db.prepare(`
    SELECT id, employeeId, name, email, department, entityId, branchId, role, status, createdBy, createdAt, updatedAt
    FROM employees ORDER BY createdAt DESC
  `).all();
  return results as SafeEmployee[];
}

/**
 * Get employees by entity
 */
export function getEmployeesByEntity(entityId: number): SafeEmployee[] {
  const db = getDatabase();
  const results = db.prepare(`
    SELECT id, employeeId, name, email, department, entityId, branchId, role, status, createdBy, createdAt, updatedAt
    FROM employees WHERE entityId = ? ORDER BY createdAt DESC
  `).all(entityId);
  return results as SafeEmployee[];
}

/**
 * Get employees by branch
 */
export function getEmployeesByBranch(branchId: number): SafeEmployee[] {
  const db = getDatabase();
  const results = db.prepare(`
    SELECT id, employeeId, name, email, department, entityId, branchId, role, status, createdBy, createdAt, updatedAt
    FROM employees WHERE branchId = ? ORDER BY createdAt DESC
  `).all(branchId);
  return results as SafeEmployee[];
}

/**
 * Create a new employee
 */
export function createEmployee(input: CreateEmployeeInput): Employee {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO employees (employeeId, name, email, department, password, entityId, branchId, role, pageAccess, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.employeeId,
    input.name,
    input.email,
    input.department,
    input.password,
    input.entityId ?? null,
    input.branchId ?? null,
    input.role ?? 'employee',
    input.pageAccess ? JSON.stringify(input.pageAccess) : null,
    input.createdBy ?? null
  );
  
  return getEmployeeById(result.lastInsertRowid as number)!;
}

/**
 * Update an employee
 */
export function updateEmployee(id: number, input: UpdateEmployeeInput): Employee | null {
  const db = getDatabase();
  
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.email !== undefined) {
    updates.push('email = ?');
    values.push(input.email);
  }
  if (input.department !== undefined) {
    updates.push('department = ?');
    values.push(input.department);
  }
  if (input.password !== undefined) {
    updates.push('password = ?');
    values.push(input.password);
  }
  if (input.entityId !== undefined) {
    updates.push('entityId = ?');
    values.push(input.entityId);
  }
  if (input.branchId !== undefined) {
    updates.push('branchId = ?');
    values.push(input.branchId);
  }
  if (input.role !== undefined) {
    updates.push('role = ?');
    values.push(input.role);
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    values.push(input.status);
  }
  if (input.pageAccess !== undefined) {
    updates.push('pageAccess = ?');
    values.push(input.pageAccess ? JSON.stringify(input.pageAccess) : null);
  }
  
  if (updates.length === 0) {
    return getEmployeeById(id);
  }
  
  updates.push('updatedAt = CURRENT_TIMESTAMP');
  values.push(id);
  
  db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  return getEmployeeById(id);
}

/**
 * Update employee password
 */
export function updateEmployeePassword(employeeId: string, hashedPassword: string): boolean {
  const db = getDatabase();
  const result = db.prepare(`
    UPDATE employees SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE employeeId = ?
  `).run(hashedPassword, employeeId);
  return result.changes > 0;
}

/**
 * Delete an employee
 */
export function deleteEmployee(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM employees WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============================================================================
// Entity Queries
// ============================================================================

/**
 * Get entity by ID
 */
export function getEntityById(id: number): Entity | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM entities WHERE id = ?').get(id);
  return result as Entity | null;
}

/**
 * Get all entities
 */
export function getAllEntities(): Entity[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM entities ORDER BY name').all();
  return results as Entity[];
}

/**
 * Create a new entity
 */
export function createEntity(input: CreateEntityInput): Entity {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO entities (name) VALUES (?)').run(input.name);
  return getEntityById(result.lastInsertRowid as number)!;
}

/**
 * Update an entity
 */
export function updateEntity(id: number, name: string): Entity | null {
  const db = getDatabase();
  db.prepare('UPDATE entities SET name = ? WHERE id = ?').run(name, id);
  return getEntityById(id);
}

/**
 * Delete an entity
 */
export function deleteEntity(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM entities WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============================================================================
// Branch Queries
// ============================================================================

/**
 * Get branch by ID
 */
export function getBranchById(id: number): Branch | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM branches WHERE id = ?').get(id);
  return result as Branch | null;
}

/**
 * Get all branches
 */
export function getAllBranches(): Branch[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM branches ORDER BY name').all();
  return results as Branch[];
}

/**
 * Get branches by entity
 */
export function getBranchesByEntity(entityId: number): Branch[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM branches WHERE entityId = ? ORDER BY name').all(entityId);
  return results as Branch[];
}

/**
 * Create a new branch
 */
export function createBranch(input: CreateBranchInput): Branch {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO branches (name, entityId) VALUES (?, ?)').run(input.name, input.entityId);
  return getBranchById(result.lastInsertRowid as number)!;
}

/**
 * Update a branch
 */
export function updateBranch(id: number, name: string): Branch | null {
  const db = getDatabase();
  db.prepare('UPDATE branches SET name = ? WHERE id = ?').run(name, id);
  return getBranchById(id);
}

/**
 * Delete a branch
 */
export function deleteBranch(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM branches WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============================================================================
// Work Report Queries
// ============================================================================

// Helper type for raw database results (onDuty is stored as 0/1)
type RawWorkReport = Omit<WorkReport, 'onDuty'> & { onDuty: number };

// Helper function to convert raw database result to WorkReport (converts onDuty 0/1 to boolean)
function convertWorkReport(raw: RawWorkReport): WorkReport {
  return { ...raw, onDuty: Boolean(raw.onDuty) };
}

function convertWorkReports(rawResults: RawWorkReport[]): WorkReport[] {
  return rawResults.map(convertWorkReport);
}

/**
 * Get work report by ID
 */
export function getWorkReportById(id: number): WorkReport | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM workReports WHERE id = ?').get(id) as RawWorkReport | undefined;
  if (!result) return null;
  return convertWorkReport(result);
}

/**
 * Get work reports by employee
 */
export function getWorkReportsByEmployee(employeeId: string): WorkReport[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM workReports WHERE employeeId = ? ORDER BY date DESC').all(employeeId) as RawWorkReport[];
  return convertWorkReports(results);
}

/**
 * Get work reports by date range
 */
export function getWorkReportsByDateRange(startDate: string, endDate: string): WorkReport[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM workReports WHERE date BETWEEN ? AND ? ORDER BY date DESC').all(startDate, endDate) as RawWorkReport[];
  return convertWorkReports(results);
}

/**
 * Get work report by employee and date (to check for duplicates)
 */
export function getWorkReportByEmployeeAndDate(employeeId: string, date: string): WorkReport | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM workReports WHERE employeeId = ? AND date = ?').get(employeeId, date) as RawWorkReport | undefined;
  if (!result) return null;
  return convertWorkReport(result);
}

/**
 * Create a new work report
 */
export function createWorkReport(input: CreateWorkReportInput): WorkReport {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO workReports (employeeId, date, name, email, department, status, workReport, onDuty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.employeeId,
    input.date,
    input.name,
    input.email,
    input.department,
    input.status,
    input.workReport ?? null,
    input.onDuty ? 1 : 0
  );
  return getWorkReportById(result.lastInsertRowid as number)!;
}

/**
 * Get all work reports with pagination
 */
export function getWorkReports(limit: number = 50, offset: number = 0): WorkReport[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM workReports ORDER BY date DESC, createdAt DESC LIMIT ? OFFSET ?').all(limit, offset) as RawWorkReport[];
  return convertWorkReports(results);
}

/**
 * Get work report count
 */
export function getWorkReportCount(): number {
  const db = getDatabase();
  const result = db.prepare('SELECT COUNT(*) as count FROM workReports').get() as { count: number };
  return result.count;
}

/**
 * Search work reports by department, name, or employeeId
 */
export function searchWorkReports(searchQuery: string, filterDepartment?: string): WorkReport[] {
  const db = getDatabase();
  const searchPattern = `%${searchQuery}%`;
  
  if (filterDepartment && filterDepartment !== 'all') {
    // Search within a specific department
    const results = db.prepare(`
      SELECT * FROM workReports 
      WHERE department = ? 
      AND (employeeId LIKE ? OR name LIKE ?)
      ORDER BY date DESC, createdAt DESC
    `).all(filterDepartment, searchPattern, searchPattern) as RawWorkReport[];
    return convertWorkReports(results);
  }
  
  // Search across all departments by employeeId, name, or department
  const results = db.prepare(`
    SELECT * FROM workReports 
    WHERE employeeId LIKE ? OR name LIKE ? OR department LIKE ?
    ORDER BY date DESC, createdAt DESC
  `).all(searchPattern, searchPattern, searchPattern) as RawWorkReport[];
  return convertWorkReports(results);
}

/**
 * Get work reports by department
 */
export function getWorkReportsByDepartment(department: string): WorkReport[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM workReports WHERE department = ? ORDER BY date DESC, createdAt DESC').all(department) as RawWorkReport[];
  return convertWorkReports(results);
}

/**
 * Get unique departments from work reports
 */
export function getUniqueWorkReportDepartments(): string[] {
  const db = getDatabase();
  const results = db.prepare('SELECT DISTINCT department FROM workReports ORDER BY department').all() as { department: string }[];
  return results.map(r => r.department);
}

/**
 * Get unique departments from work reports filtered by manager's departments
 */
export function getUniqueWorkReportDepartmentsForManager(managerId: number): string[] {
  const db = getDatabase();
  const managerDeptIds = getManagerDepartmentIds(managerId);
  
  if (managerDeptIds.length === 0) {
    return [];
  }
  
  // Get department names for the manager's departments
  const placeholders = managerDeptIds.map(() => '?').join(',');
  const deptNames = db.prepare(`SELECT name FROM departments WHERE id IN (${placeholders})`).all(...managerDeptIds) as { name: string }[];
  const allowedDepts = deptNames.map(d => d.name);
  
  // Get unique departments from work reports that match manager's departments
  const placeholders2 = allowedDepts.map(() => '?').join(',');
  const results = db.prepare(`SELECT DISTINCT department FROM workReports WHERE department IN (${placeholders2}) ORDER BY department`).all(...allowedDepts) as { department: string }[];
  return results.map(r => r.department);
}

/**
 * Search work reports filtered by manager's departments
 */
export function searchWorkReportsForManager(searchQuery: string, managerId: number, filterDepartment?: string): WorkReport[] {
  const db = getDatabase();
  const managerDeptIds = getManagerDepartmentIds(managerId);
  
  if (managerDeptIds.length === 0) {
    return [];
  }
  
  // Get department names for the manager's departments
  const placeholders = managerDeptIds.map(() => '?').join(',');
  const deptNames = db.prepare(`SELECT name FROM departments WHERE id IN (${placeholders})`).all(...managerDeptIds) as { name: string }[];
  const allowedDepts = deptNames.map(d => d.name);
  
  const searchPattern = `%${searchQuery}%`;
  const placeholders2 = allowedDepts.map(() => '?').join(',');
  
  if (filterDepartment && filterDepartment !== 'all' && allowedDepts.includes(filterDepartment)) {
    // Search within a specific department (if manager has access)
    const results = db.prepare(`
      SELECT * FROM workReports 
      WHERE department = ? 
      AND (employeeId LIKE ? OR name LIKE ?)
      ORDER BY date DESC, createdAt DESC
    `).all(filterDepartment, searchPattern, searchPattern) as RawWorkReport[];
    return convertWorkReports(results);
  }
  
  // Search across manager's departments
  const results = db.prepare(`
    SELECT * FROM workReports 
    WHERE department IN (${placeholders2})
    AND (employeeId LIKE ? OR name LIKE ? OR department LIKE ?)
    ORDER BY date DESC, createdAt DESC
  `).all(...allowedDepts, searchPattern, searchPattern, searchPattern) as RawWorkReport[];
  return convertWorkReports(results);
}

/**
 * Get work reports by department (filtered for manager)
 */
export function getWorkReportsByDepartmentForManager(department: string, managerId: number): WorkReport[] {
  const db = getDatabase();
  const managerDeptIds = getManagerDepartmentIds(managerId);
  
  if (managerDeptIds.length === 0) {
    return [];
  }
  
  // Check if manager has access to this department
  const placeholders = managerDeptIds.map(() => '?').join(',');
  const deptNames = db.prepare(`SELECT name FROM departments WHERE id IN (${placeholders})`).all(...managerDeptIds) as { name: string }[];
  const allowedDepts = deptNames.map(d => d.name);
  
  if (!allowedDepts.includes(department)) {
    return [];
  }
  
  const results = db.prepare('SELECT * FROM workReports WHERE department = ? ORDER BY date DESC, createdAt DESC').all(department) as RawWorkReport[];
  return convertWorkReports(results);
}

/**
 * Update a work report
 */
export function updateWorkReport(id: number, status: string, workReport: string | null, onDuty?: boolean): WorkReport | null {
  const db = getDatabase();
  if (onDuty !== undefined) {
    db.prepare(`
      UPDATE workReports SET status = ?, workReport = ?, onDuty = ? WHERE id = ?
    `).run(status, workReport, onDuty ? 1 : 0, id);
  } else {
    db.prepare(`
      UPDATE workReports SET status = ?, workReport = ? WHERE id = ?
    `).run(status, workReport, id);
  }
  return getWorkReportById(id);
}

// ============================================================================
// Password Reset Token Queries
// ============================================================================

/**
 * Create a password reset token
 */
export function createPasswordResetToken(employeeId: string, token: string, expiresAt: Date): PasswordResetToken {
  const db = getDatabase();
  
  // Delete any existing tokens for this employee
  db.prepare('DELETE FROM passwordResetTokens WHERE employeeId = ?').run(employeeId);
  
  // Create new token
  const result = db.prepare(`
    INSERT INTO passwordResetTokens (employeeId, token, expiresAt)
    VALUES (?, ?, ?)
  `).run(employeeId, token, expiresAt.toISOString());
  
  return db.prepare('SELECT * FROM passwordResetTokens WHERE id = ?').get(result.lastInsertRowid) as PasswordResetToken;
}

/**
 * Get password reset token by token string
 */
export function getPasswordResetToken(token: string): PasswordResetToken | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM passwordResetTokens WHERE token = ?').get(token);
  return result as PasswordResetToken | null;
}

/**
 * Delete password reset token
 */
export function deletePasswordResetToken(token: string): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM passwordResetTokens WHERE token = ?').run(token);
  return result.changes > 0;
}

/**
 * Delete expired password reset tokens
 */
export function deleteExpiredPasswordResetTokens(): number {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM passwordResetTokens WHERE expiresAt < CURRENT_TIMESTAMP').run();
  return result.changes;
}

// ============================================================================
// Department Queries
// ============================================================================

/**
 * Get department by ID
 */
export function getDepartmentById(id: number): Department | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
  return result as Department | null;
}

/**
 * Get department by name
 */
export function getDepartmentByName(name: string): Department | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM departments WHERE name = ?').get(name);
  return result as Department | null;
}

/**
 * Get all departments
 */
export function getAllDepartments(): Department[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM departments ORDER BY name').all();
  return results as Department[];
}

/**
 * Get departments by entity
 */
export function getDepartmentsByEntity(entityId: number): Department[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM departments WHERE entityId = ? ORDER BY name').all(entityId);
  return results as Department[];
}

/**
 * Create a new department
 */
export function createDepartment(input: CreateDepartmentInput): Department {
  const db = getDatabase();
  const result = db.prepare('INSERT INTO departments (name, entityId) VALUES (?, ?)').run(
    input.name,
    input.entityId ?? null
  );
  return getDepartmentById(result.lastInsertRowid as number)!;
}

/**
 * Update a department
 */
export function updateDepartment(id: number, name: string): Department | null {
  const db = getDatabase();
  db.prepare('UPDATE departments SET name = ? WHERE id = ?').run(name, id);
  return getDepartmentById(id);
}

/**
 * Delete a department
 */
export function deleteDepartment(id: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============================================================================
// Manager Department Queries
// ============================================================================

/**
 * Get departments for a manager
 */
export function getManagerDepartments(managerId: number): Department[] {
  const db = getDatabase();
  const results = db.prepare(`
    SELECT d.* FROM departments d
    INNER JOIN manager_departments md ON d.id = md.departmentId
    WHERE md.managerId = ?
    ORDER BY d.name
  `).all(managerId);
  return results as Department[];
}

/**
 * Get department IDs for a manager
 */
export function getManagerDepartmentIds(managerId: number): number[] {
  const db = getDatabase();
  const results = db.prepare('SELECT departmentId FROM manager_departments WHERE managerId = ?').all(managerId) as { departmentId: number }[];
  return results.map(r => r.departmentId);
}

/**
 * Set departments for a manager (replaces existing)
 */
export function setManagerDepartments(managerId: number, departmentIds: number[]): void {
  const db = getDatabase();
  
  // Delete existing mappings
  db.prepare('DELETE FROM manager_departments WHERE managerId = ?').run(managerId);
  
  // Insert new mappings
  const insertStmt = db.prepare('INSERT INTO manager_departments (managerId, departmentId) VALUES (?, ?)');
  for (const departmentId of departmentIds) {
    insertStmt.run(managerId, departmentId);
  }
}

/**
 * Add a department to a manager
 */
export function addManagerDepartment(managerId: number, departmentId: number): boolean {
  const db = getDatabase();
  try {
    db.prepare('INSERT INTO manager_departments (managerId, departmentId) VALUES (?, ?)').run(managerId, departmentId);
    return true;
  } catch {
    return false; // Already exists or other error
  }
}

/**
 * Remove a department from a manager
 */
export function removeManagerDepartment(managerId: number, departmentId: number): boolean {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM manager_departments WHERE managerId = ? AND departmentId = ?').run(managerId, departmentId);
  return result.changes > 0;
}

// ============================================================================
// Settings Queries
// ============================================================================

/**
 * Get a setting by key
 */
export function getSetting(key: string): Setting | null {
  const db = getDatabase();
  const result = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
  return result as Setting | null;
}

/**
 * Get all settings
 */
export function getAllSettings(): Setting[] {
  const db = getDatabase();
  const results = db.prepare('SELECT * FROM settings ORDER BY key').all();
  return results as Setting[];
}

/**
 * Update a setting value
 */
export function updateSetting(key: string, value: string): Setting | null {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = CURRENT_TIMESTAMP
  `).run(key, value, value);
  return getSetting(key);
}

/**
 * Get edit permissions settings
 */
export function getEditPermissions(): EditPermissions {
  const db = getDatabase();
  const results = db.prepare(`
    SELECT key, value FROM settings 
    WHERE key IN ('employee_can_edit_own_reports', 'manager_can_edit_team_reports', 'admin_can_edit_reports', 'superadmin_can_edit_reports')
  `).all() as { key: string; value: string }[];
  
  const permissions: EditPermissions = {
    employee_can_edit_own_reports: false,
    manager_can_edit_team_reports: true,
    admin_can_edit_reports: true,
    superadmin_can_edit_reports: true,
  };
  
  for (const row of results) {
    permissions[row.key as keyof EditPermissions] = row.value === 'true';
  }
  
  return permissions;
}

/**
 * Update edit permissions settings
 */
export function updateEditPermissions(permissions: Partial<EditPermissions>): EditPermissions {
  const db = getDatabase();
  const updateStmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updatedAt = CURRENT_TIMESTAMP
  `);
  
  for (const [key, value] of Object.entries(permissions)) {
    if (value !== undefined) {
      const strValue = value.toString();
      updateStmt.run(key, strValue, strValue);
    }
  }
  
  return getEditPermissions();
}

// ============================================================================
// OTP Token Queries (for password change verification)
// ============================================================================

export interface OTPToken {
  id: number;
  employeeId: string;
  otp: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * Create an OTP token for email verification
 */
export function createOTPToken(employeeId: string, otp: string, expiresAt: Date): OTPToken {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO otpTokens (employeeId, otp, expiresAt)
    VALUES (?, ?, ?)
  `).run(employeeId, otp, expiresAt.toISOString());
  
  return {
    id: result.lastInsertRowid as number,
    employeeId,
    otp,
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get a valid OTP token
 */
export function getOTPToken(employeeId: string, otp: string): OTPToken | null {
  const db = getDatabase();
  const result = db.prepare(`
    SELECT * FROM otpTokens 
    WHERE employeeId = ? AND otp = ?
  `).get(employeeId, otp);
  return result as OTPToken | null;
}

/**
 * Delete all OTP tokens for an employee
 */
export function deleteOTPTokensForEmployee(employeeId: string): void {
  const db = getDatabase();
  db.prepare('DELETE FROM otpTokens WHERE employeeId = ?').run(employeeId);
}

/**
 * Clean up expired OTP tokens
 */
export function cleanupExpiredOTPTokens(): number {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM otpTokens WHERE expiresAt < datetime("now")').run();
  return result.changes;
}

// ============================================================================
// Manager Hierarchy Queries
// ============================================================================

interface ManagerInfo {
  id: number;
  employeeId: string;
  name: string;
  email: string;
}

/**
 * Get managers for a specific department
 */
export function getManagersForDepartment(departmentName: string): ManagerInfo[] {
  const db = getDatabase();
  
  // First, get the department ID
  const dept = db.prepare('SELECT id FROM departments WHERE name = ?').get(departmentName) as { id: number } | undefined;
  
  if (!dept) {
    // If department doesn't exist in departments table, check if any manager has this department directly
    const directManagers = db.prepare(`
      SELECT id, employeeId, name, email 
      FROM employees 
      WHERE role = 'manager' AND department = ? AND status = 'active'
    `).all(departmentName) as ManagerInfo[];
    return directManagers;
  }
  
  // Get managers linked to this department via manager_departments
  const managers = db.prepare(`
    SELECT e.id, e.employeeId, e.name, e.email
    FROM employees e
    INNER JOIN manager_departments md ON e.id = md.managerId
    WHERE md.departmentId = ? AND e.role = 'manager' AND e.status = 'active'
  `).all(dept.id) as ManagerInfo[];
  
  return managers;
}

// Export transaction helper for complex operations
export { transaction };

