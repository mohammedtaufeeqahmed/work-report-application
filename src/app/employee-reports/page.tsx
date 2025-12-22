'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, FileText, Briefcase, Coffee, ArrowRight, Lock, Pencil, X, Check, ChevronDown, Filter, Users, Calendar, AlertCircle, Shield, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkReport, SessionUser, WorkStatus, EditPermissions, Department } from '@/types';
import { getISTTodayRange, getISTTodayDateString, getShortDayIST, getShortDateIST, formatDateForDisplay, convertUTCToISTDate } from '@/lib/date';

export default function EmployeeReportsPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [allReports, setAllReports] = useState<WorkReport[]>([]); // Store all fetched reports
  const [statusFilter, setStatusFilter] = useState<'all' | 'working' | 'leave'>('all');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  
  // Date range state - default to today (for managers Team Reports) - using IST
  const getDefaultDates = () => getISTTodayRange();
  
  const [dateRange, setDateRange] = useState(getDefaultDates());

  // Edit state
  const [editingReport, setEditingReport] = useState<WorkReport | null>(null);
  const [editStatus, setEditStatus] = useState<WorkStatus>('working');
  const [editWorkReport, setEditWorkReport] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit permissions state
  const [editPermissions, setEditPermissions] = useState<EditPermissions | null>(null);

  // Expanded report state (for viewing details)
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);

  // Scrum board state for managers
  const [managerDepartments, setManagerDepartments] = useState<Department[]>([]);
  const [viewMode, setViewMode] = useState<'scrum' | 'list'>('scrum');
  const [departmentColors, setDepartmentColors] = useState<Map<string, { solid: string; gradient: string; border: string; text: string }>>(new Map());

  // Check if user can search for other employees (admin/superadmin/manager roles)
  const canSearchOthers = session?.role === 'admin' || session?.role === 'superadmin' || session?.role === 'manager';
  const isManager = session?.role === 'manager';
  const isSingleDept = managerDepartments.length === 1;

  // Redirect employees to their dashboard - they should use that instead
  useEffect(() => {
    if (!sessionLoading && session && session.role === 'employee') {
      window.location.href = '/employee-dashboard';
    }
  }, [sessionLoading, session]);
  
  // Check if user can edit reports based on role, permissions, and creation date
  const canEdit = (report: WorkReport) => {
    if (!session || !editPermissions) return false;
    
    const isOwnReport = report.employeeId === session.employeeId;
    
    // First check role-based permissions
    let hasPermission = false;
    
    if (session.role === 'superadmin') {
      hasPermission = editPermissions.superadmin_can_edit_reports;
    } else if (session.role === 'admin') {
      hasPermission = editPermissions.admin_can_edit_reports;
    } else if (session.role === 'employee' && isOwnReport) {
      // Employees can edit their own reports if permission is enabled
      hasPermission = editPermissions.employee_can_edit_own_reports;
    } else if (session.role === 'manager' && isOwnReport) {
      // Managers can also edit their own reports when employee_can_edit_own_reports is enabled
      hasPermission = editPermissions.employee_can_edit_own_reports;
    }
    
    if (!hasPermission) return false;
    
    // Check if the report was created today (edit only allowed on creation day)
    // Convert UTC createdAt to IST date and compare with today in IST
    const createdDate = convertUTCToISTDate(report.createdAt);
    const todayDate = getISTTodayDateString();
    
    return createdDate === todayDate;
  };

  // Color allocation system - Pastel colors
  const getDepartmentColor = (departmentName: string, index: number) => {
    const colors = [
      { solid: 'bg-pink-100 dark:bg-pink-900/20', gradient: 'from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-900 dark:text-pink-200' },
      { solid: 'bg-purple-100 dark:bg-purple-900/20', gradient: 'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-900 dark:text-purple-200' },
      { solid: 'bg-blue-100 dark:bg-blue-900/20', gradient: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-900 dark:text-blue-200' },
      { solid: 'bg-green-100 dark:bg-green-900/20', gradient: 'from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-900 dark:text-green-200' },
      { solid: 'bg-yellow-100 dark:bg-yellow-900/20', gradient: 'from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-900 dark:text-yellow-200' },
      { solid: 'bg-orange-100 dark:bg-orange-900/20', gradient: 'from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-900 dark:text-orange-200' },
      { solid: 'bg-cyan-100 dark:bg-cyan-900/20', gradient: 'from-cyan-100 to-cyan-200 dark:from-cyan-900/30 dark:to-cyan-800/30', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-900 dark:text-cyan-200' },
      { solid: 'bg-indigo-100 dark:bg-indigo-900/20', gradient: 'from-indigo-100 to-indigo-200 dark:from-indigo-900/30 dark:to-indigo-800/30', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-900 dark:text-indigo-200' },
      { solid: 'bg-rose-100 dark:bg-rose-900/20', gradient: 'from-rose-100 to-rose-200 dark:from-rose-900/30 dark:to-rose-800/30', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-900 dark:text-rose-200' },
      { solid: 'bg-teal-100 dark:bg-teal-900/20', gradient: 'from-teal-100 to-teal-200 dark:from-teal-900/30 dark:to-teal-800/30', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-900 dark:text-teal-200' },
      { solid: 'bg-amber-100 dark:bg-amber-900/20', gradient: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-900 dark:text-amber-200' },
      { solid: 'bg-lime-100 dark:bg-lime-900/20', gradient: 'from-lime-100 to-lime-200 dark:from-lime-900/30 dark:to-lime-800/30', border: 'border-lime-300 dark:border-lime-700', text: 'text-lime-900 dark:text-lime-200' },
      { solid: 'bg-violet-100 dark:bg-violet-900/20', gradient: 'from-violet-100 to-violet-200 dark:from-violet-900/30 dark:to-violet-800/30', border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-900 dark:text-violet-200' },
      { solid: 'bg-sky-100 dark:bg-sky-900/20', gradient: 'from-sky-100 to-sky-200 dark:from-sky-900/30 dark:to-sky-800/30', border: 'border-sky-300 dark:border-sky-700', text: 'text-sky-900 dark:text-sky-200' },
      { solid: 'bg-emerald-100 dark:bg-emerald-900/20', gradient: 'from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-900 dark:text-emerald-200' },
    ];
    return colors[index % colors.length];
  };

  // Initialize department colors
  useEffect(() => {
    if (managerDepartments.length > 0) {
      const colorMap = new Map<string, { solid: string; gradient: string; border: string; text: string }>();
      managerDepartments.forEach((dept, index) => {
        colorMap.set(dept.name, getDepartmentColor(dept.name, index));
      });
      setDepartmentColors(colorMap);
    }
  }, [managerDepartments]);

  const fetchReports = async (query?: string, dept?: string, startDate?: string, endDate?: string) => {
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (query && query.trim()) {
        params.append('search', query.trim());
      }
      if (dept && dept !== 'all') {
        params.append('department', dept);
      }
      // Add date range if provided
      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      
      const response = await fetch(`/api/work-reports?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const fetchedReports: WorkReport[] = data.data.reports || [];
        setAllReports(fetchedReports);
        // Apply status filter if set
        if (statusFilter === 'all') {
          setReports(fetchedReports);
        } else {
          setReports(fetchedReports.filter(r => r.status === statusFilter));
        }
      } else {
        setError(data.error || 'Failed to fetch reports');
        setReports([]);
        setAllReports([]);
      }
    } catch {
      setError('Failed to fetch reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch session and permissions on mount
  useEffect(() => {
    const fetchSessionAndPermissions = async () => {
      try {
        const [sessionRes, permissionsRes] = await Promise.all([
          fetch('/api/auth/session'),
          fetch('/api/settings/permissions'),
        ]);
        
        const [sessionData, permissionsData] = await Promise.all([
          sessionRes.json(),
          permissionsRes.json(),
        ]);
        
        if (sessionData.success && sessionData.data) {
          setSession(sessionData.data);
          
          // For managers, fetch their assigned departments
          if (sessionData.data.role === 'manager') {
            try {
              const deptRes = await fetch('/api/managers/departments');
              const deptData = await deptRes.json();
              if (deptData.success && deptData.data) {
                setManagerDepartments(deptData.data);
              }
            } catch (err) {
              console.error('Failed to fetch manager departments:', err);
            }
          }
          
          // For managers/admins, fetch departments list
          const canSearch = sessionData.data.role === 'admin' || 
                           sessionData.data.role === 'superadmin' || 
                           sessionData.data.role === 'manager';
          if (canSearch) {
            const deptRes = await fetch('/api/work-reports?getDepartments=true');
            const deptData = await deptRes.json();
            if (deptData.success && deptData.data?.departments) {
              setDepartments(deptData.data.departments);
              // Auto-load reports for today when "All Departments" is selected (for managers)
              if (sessionData.data.role === 'manager') {
                const todayDates = getDefaultDates();
                setDateRange(todayDates);
                fetchReports('', 'all', todayDates.start, todayDates.end);
              }
            }
          }
        }
        
        if (permissionsData.success && permissionsData.data) {
          setEditPermissions(permissionsData.data);
        }
      } catch (err) {
        console.error('Failed to fetch session:', err);
      } finally {
        setSessionLoading(false);
      }
    };
    fetchSessionAndPermissions();
  }, []);

  const handleSearch = () => {
    fetchReports(searchQuery, selectedDepartment, dateRange.start, dateRange.end);
  };

  const handleDepartmentChange = (dept: string) => {
    setSelectedDepartment(dept);
    fetchReports(searchQuery, dept, dateRange.start, dateRange.end);
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setDateRange({ start, end });
    fetchReports(searchQuery, selectedDepartment, start, end);
  };

  const handleStatusFilter = (status: 'all' | 'working' | 'leave') => {
    setStatusFilter(status);
    if (status === 'all') {
      setReports(allReports);
    } else {
      setReports(allReports.filter(r => r.status === status));
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('all');
    setStatusFilter('all');
    const todayDates = getDefaultDates();
    setDateRange(todayDates);
    fetchReports('', 'all', todayDates.start, todayDates.end);
  };

  const handleEditClick = (report: WorkReport) => {
    setEditingReport(report);
    setEditStatus(report.status);
    setEditWorkReport(report.workReport || '');
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    setEditStatus('working');
    setEditWorkReport('');
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;

    if (editStatus === 'working' && !editWorkReport.trim()) {
      toast.error('Work report is required when status is "Working"');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/work-reports/${editingReport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          workReport: editWorkReport.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Report updated successfully');
        // Update the report in the list
        setReports(reports.map(r => 
          r.id === editingReport.id ? data.data : r
        ));
        handleCancelEdit();
      } else {
        toast.error(data.error || 'Failed to update report');
      }
    } catch {
      toast.error('Failed to update report');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return formatDateForDisplay(dateStr);
  };

  const getShortDay = (dateStr: string) => {
    return getShortDayIST(dateStr);
  };

  const getShortDate = (dateStr: string) => {
    return getShortDateIST(dateStr);
  };

  const toggleExpand = (reportId: number) => {
    if (editingReport?.id === reportId) return; // Don't collapse while editing
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
  };

  // Count unique dates for working days (from all reports in current filters)
  const workingReports = allReports.filter(r => r.status === 'working');
  const workingCount = [...new Set(workingReports.map(r => r.date))].length;
  
  // Count of leave days = total leave reports (sum of leaves taken by employees)
  const leaveReports = allReports.filter(r => r.status === 'leave');
  const leaveCount = leaveReports.length;
  
  // Count of on duty reports
  const onDutyCount = allReports.filter(r => r.onDuty).length;
  
  const uniqueEmployees = [...new Set(allReports.map(r => r.employeeId))].length;
  
  // Helper function to check if report is a late submission
  // A report is "late" if the report date is before the date when it was submitted
  const isLateSubmission = (report: WorkReport) => {
    // Extract the date from createdAt (when the report was submitted)
    const submissionDate = convertUTCToISTDate(report.createdAt);
    // Compare report date with submission date
    return report.date < submissionDate;
  };

  // Data transformation for Scrum board
  const groupReportsByDate = (reports: WorkReport[]) => {
    return reports.reduce((acc, report) => {
      if (!acc[report.date]) acc[report.date] = [];
      acc[report.date].push(report);
      return acc;
    }, {} as Record<string, WorkReport[]>);
  };

  const groupReportsByDateAndDept = (reports: WorkReport[]) => {
    return reports.reduce((acc, report) => {
      if (!acc[report.date]) acc[report.date] = {};
      if (!acc[report.date][report.department]) acc[report.date][report.department] = [];
      acc[report.date][report.department].push(report);
      return acc;
    }, {} as Record<string, Record<string, WorkReport[]>>);
  };

  // Get all dates in range for Scrum board
  const getAllDatesInRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  // WorkReportCard Component
  const WorkReportCard = ({ report, colorAccent }: { report: WorkReport; colorAccent?: { solid: string; gradient: string; border: string; text: string } }) => {
    const borderColor = colorAccent?.border || 'border-border';
    
    return (
      <div
        onClick={() => toggleExpand(report.id)}
        className={`group relative p-3 rounded-lg border-l-4 ${borderColor} bg-card hover:bg-muted/50 transition-all cursor-pointer ${
          expandedReportId === report.id || editingReport?.id === report.id ? 'bg-muted' : ''
        }`}
      >
        <div className="flex items-start gap-2">
          {/* Employee Avatar */}
          <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {report.name?.charAt(0) || 'E'}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Employee Name & ID */}
            <div className="mb-1">
              <p className="text-sm font-medium truncate">{report.name}</p>
              <p className="text-xs text-muted-foreground truncate font-mono">{report.employeeId}</p>
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                report.status === 'working' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
              }`}>
                {report.status === 'working' ? 'Working' : 'Leave'}
              </span>
              
              {/* On Duty Badge */}
              {report.onDuty && (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                  <Shield className="h-3 w-3" />
                  On Duty
                </span>
              )}
              
              {/* Late Submission Badge */}
              {isLateSubmission(report) && (
                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  Late
                </span>
              )}
            </div>
            
            {/* Work Report Preview */}
            {report.workReport && expandedReportId !== report.id && editingReport?.id !== report.id && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {report.workReport}
              </p>
            )}
            
            {/* Expanded Content */}
            {(expandedReportId === report.id || editingReport?.id === report.id) && (
              <div className="mt-2 pt-2 border-t border-border">
                {editingReport?.id === report.id ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{formatDate(report.date)}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          disabled={saving}
                          className="h-6 px-2 text-xs"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit();
                          }}
                          disabled={saving}
                          className="h-6 px-2 text-xs"
                        >
                          {saving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Status Toggle */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Status</Label>
                      <div className="flex rounded-md border p-0.5 bg-muted/50">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditStatus('working');
                          }}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                            editStatus === 'working'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Briefcase className={`h-3 w-3 ${editStatus === 'working' ? 'text-green-600' : ''}`} />
                          Working
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditStatus('leave');
                          }}
                          className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                            editStatus === 'leave'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Coffee className={`h-3 w-3 ${editStatus === 'leave' ? 'text-amber-600' : ''}`} />
                          Leave
                        </button>
                      </div>
                    </div>
                    
                    {/* Work Report */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Work Report {editStatus === 'working' && <span className="text-destructive">*</span>}
                      </Label>
                      <textarea
                        value={editWorkReport}
                        onChange={(e) => setEditWorkReport(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={editStatus === 'working' ? 'Work report is required...' : 'Optional notes...'}
                        className="flex min-h-16 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground resize-none transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    {report.workReport ? (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {report.workReport}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No details provided
                      </p>
                    )}
                    {canEdit(report) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(report);
                          setExpandedReportId(report.id);
                        }}
                        className="h-6 px-2 mt-2 text-xs"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Show loading while checking session
  if (sessionLoading) {
    return (
      <div className="min-h-screen pt-14 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <div className="min-h-screen pt-14">
        <div className="container py-12 px-4 md:px-6">
          <div className="max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Login Required</h1>
            <p className="text-muted-foreground mb-6">
              Please login to view your work reports.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14">
      <div className="container py-12 px-4 md:px-6">
        <div className={`${isManager && viewMode === 'scrum' ? 'max-w-full' : 'max-w-4xl'} mx-auto`}>
          {/* Header */}
          <div className="text-center mb-10 animate-fade-in-down">
            <h1 className="text-3xl font-bold mb-2">
              {canSearchOthers
                ? session?.role === 'manager'
                  ? 'Team Reports'
                  : 'Employee Reports'
                : 'My Work Reports'}
            </h1>
            <p className="text-muted-foreground">
              {canSearchOthers 
                ? session?.role === 'manager'
                  ? 'View and manage your team\'s work reports'
                  : 'View and manage work report history' 
                : 'View your work report history'}
            </p>
          </div>

          {/* Search - Only show for admins/managers */}
          {canSearchOthers && (
            <div className="border rounded-xl p-6 mb-8 bg-card animate-fade-in-up opacity-0 delay-100" style={{ animationFillMode: 'forwards' }}>
              <div className="space-y-4">
                {/* Search Input */}
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by Employee ID, Name, or Department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-11 h-12"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={loading} className="h-12 px-6 btn-shine">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Search
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Filter Row */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filter by:</span>
                  </div>
                  
                  {/* Department Filter */}
                  <select
                    value={selectedDepartment}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 cursor-pointer"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  
                  {/* Date Range Filter */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => handleDateRangeChange(e.target.value, dateRange.end)}
                        className="h-9 w-36 text-sm"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => handleDateRangeChange(dateRange.start, e.target.value)}
                        className="h-9 w-36 text-sm"
                      />
                    </div>
                  </div>
                  
                  {/* Clear Filters */}
                  {(searchQuery || selectedDepartment !== 'all' || statusFilter !== 'all' || dateRange.start !== getDefaultDates().start || dateRange.end !== getDefaultDates().end) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleClearFilters}
                      className="h-9 px-3 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Clear
                    </Button>
                  )}
                </div>
                
                {/* Search Info */}
                {searched && reports.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                    <Users className="h-4 w-4" />
                    <span>
                      Found <strong className="text-foreground">{reports.length}</strong> report{reports.length !== 1 ? 's' : ''}
                      {statusFilter !== 'all' && (
                        <> - <strong className="text-foreground">{statusFilter === 'working' ? 'Working' : 'Leave'} only</strong></>
                      )}
                      {searchQuery && <> matching &quot;<strong className="text-foreground">{searchQuery}</strong>&quot;</>}
                      {selectedDepartment !== 'all' && <> in <strong className="text-foreground">{selectedDepartment}</strong></>}
                      {dateRange.start && dateRange.end && (
                        <> from <strong className="text-foreground">
                          {getShortDateIST(dateRange.start)} - {getShortDateIST(dateRange.end)}
                        </strong></>
                      )}
                    </span>
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-destructive mt-3 animate-fade-in">{error}</p>}
            </div>
          )}

          {/* Loading state for regular employees */}
          {!canSearchOthers && loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error for regular employees */}
          {!canSearchOthers && error && (
            <div className="border rounded-xl p-6 mb-8 bg-card">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* View Mode Toggle - Only for managers */}
          {isManager && searched && reports.length > 0 && (
            <div className="flex items-center justify-end gap-2 mb-4">
              <Button
                variant={viewMode === 'scrum' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('scrum')}
                className="gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Scrum Board
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2"
              >
                <List className="h-4 w-4" />
                List View
              </Button>
            </div>
          )}

          {/* Results */}
          {searched && !loading && (
            <div className="animate-fade-in-up">
              {reports.length === 0 ? (
                <div className="border rounded-xl p-16 text-center bg-card">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No Reports Found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? <>No work reports matching &quot;<span className="font-medium">{searchQuery}</span>&quot;</>
                      : selectedDepartment !== 'all'
                        ? <>No work reports found in <span className="font-medium">{selectedDepartment}</span></>
                        : 'No work reports found for the given criteria.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="border rounded-xl p-5 text-center bg-card hover-lift transition-all cursor-default">
                      <p className="text-3xl font-bold animate-count">{reports.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">Total Reports</p>
                    </div>
                    <button
                      onClick={() => handleStatusFilter(statusFilter === 'working' ? 'all' : 'working')}
                      className={`border rounded-xl p-5 text-center bg-card hover-lift transition-all cursor-pointer ${
                        statusFilter === 'working' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/20' : ''
                      }`}
                    >
                      <p className={`text-3xl font-bold animate-count ${statusFilter === 'working' ? 'text-green-700 dark:text-green-400' : 'text-green-600'}`}>
                        {workingCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Working Days</p>
                    </button>
                    <div className="border rounded-xl p-5 text-center bg-card hover-lift transition-all cursor-default bg-blue-50/50 dark:bg-blue-950/20">
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-3xl font-bold animate-count text-blue-600">{onDutyCount}</p>
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">On Duty</p>
                    </div>
                    <button
                      onClick={() => handleStatusFilter(statusFilter === 'leave' ? 'all' : 'leave')}
                      className={`border rounded-xl p-5 text-center bg-card hover-lift transition-all cursor-pointer ${
                        statusFilter === 'leave' ? 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/20' : ''
                      }`}
                    >
                      <p className={`text-3xl font-bold animate-count ${statusFilter === 'leave' ? 'text-amber-700 dark:text-amber-400' : 'text-amber-600'}`}>
                        {leaveCount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Total Leaves</p>
                    </button>
                    <div className="border rounded-xl p-5 text-center bg-card hover-lift transition-all cursor-default">
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-3xl font-bold animate-count">{uniqueEmployees}</p>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Employees</p>
                    </div>
                  </div>

                  {/* Scrum Board View for Managers */}
                  {isManager && viewMode === 'scrum' && managerDepartments.length > 0 && (
                    <div className="mb-8">
                      {isSingleDept ? (
                        /* Single Department Layout - Date Columns */
                        <div className="overflow-x-auto">
                          <div className="flex gap-4 min-w-max pb-4">
                            {(() => {
                              const reportsByDate = groupReportsByDate(reports);
                              const allDates = getAllDatesInRange(dateRange.start, dateRange.end);
                              const deptColor = managerDepartments[0] ? departmentColors.get(managerDepartments[0].name) : undefined;
                              
                              return allDates.map(date => {
                                const dateReports = reportsByDate[date] || [];
                                const isToday = date === getISTTodayDateString();
                                
                                return (
                                  <div key={date} className="w-80 flex-shrink-0">
                                    {/* Date Column Header */}
                                    <div className={`sticky top-0 z-10 p-3 rounded-t-lg border-b-2 ${
                                      deptColor?.gradient 
                                        ? `bg-gradient-to-b ${deptColor.gradient} ${deptColor.border}` 
                                        : `${deptColor?.solid || 'bg-muted'} ${deptColor?.border || 'border-border'}`
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className={`text-sm font-semibold ${deptColor?.text || 'text-foreground'}`}>
                                            {getShortDay(date)}
                                          </p>
                                          <p className={`text-xs ${deptColor?.text || 'text-muted-foreground'}`}>
                                            {getShortDate(date)}
                                          </p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                                          isToday 
                                            ? 'bg-primary/20 text-primary' 
                                            : 'bg-muted text-muted-foreground'
                                        }`}>
                                          {dateReports.length} {dateReports.length === 1 ? 'report' : 'reports'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Reports Cards */}
                                    <div className={`p-3 space-y-2 min-h-[200px] ${
                                      deptColor?.solid || 'bg-card'
                                    } rounded-b-lg border-x border-b ${deptColor?.border || 'border-border'}`}>
                                      {dateReports.length === 0 ? (
                                        <div className="flex items-center justify-center py-8 text-center">
                                          <p className="text-xs text-muted-foreground">No reports</p>
                                        </div>
                                      ) : (
                                        dateReports.map(report => (
                                          <WorkReportCard 
                                            key={report.id} 
                                            report={report}
                                            colorAccent={deptColor}
                                          />
                                        ))
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      ) : (
                        /* Multiple Department Layout - Date Rows × Dept Columns */
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr>
                                <th className="sticky left-0 z-20 bg-background border-r border-b p-3 text-left text-sm font-semibold">
                                  Date
                                </th>
                                {managerDepartments.map(dept => {
                                  const colorScheme = departmentColors.get(dept.name);
                                  return (
                                    <th
                                      key={dept.id}
                                      className={`sticky top-0 z-10 p-3 text-center text-sm font-semibold border-b-2 ${
                                        colorScheme?.gradient
                                          ? `bg-gradient-to-b ${colorScheme.gradient} ${colorScheme.border}`
                                          : `${colorScheme?.solid || 'bg-muted'} ${colorScheme?.border || 'border-border'}`
                                      } ${colorScheme?.text || 'text-foreground'}`}
                                    >
                                      {dept.name}
                                    </th>
                                  );
                                })}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const reportsByDateAndDept = groupReportsByDateAndDept(reports);
                                const allDates = getAllDatesInRange(dateRange.start, dateRange.end);
                                
                                return allDates.map(date => {
                                  const isToday = date === getISTTodayDateString();
                                  
                                  return (
                                    <tr key={date}>
                                      <td className={`sticky left-0 z-10 bg-background border-r p-3 text-sm font-medium ${
                                        isToday ? 'bg-primary/5' : ''
                                      }`}>
                                        <div>
                                          <p className="font-semibold">{getShortDay(date)}</p>
                                          <p className="text-xs text-muted-foreground">{getShortDate(date)}</p>
                                        </div>
                                      </td>
                                      {managerDepartments.map(dept => {
                                        const colorScheme = departmentColors.get(dept.name);
                                        const deptReports = reportsByDateAndDept[date]?.[dept.name] || [];
                                        
                                        return (
                                          <td
                                            key={dept.id}
                                            className={`p-2 align-top border-r ${colorScheme?.solid || 'bg-card'} ${colorScheme?.border || 'border-border'}`}
                                          >
                                            <div className="space-y-2 min-h-[100px]">
                                              {deptReports.length === 0 ? (
                                                <div className="flex items-center justify-center py-4 text-center">
                                                  <p className="text-xs text-muted-foreground">No reports</p>
                                                </div>
                                              ) : (
                                                deptReports.map(report => (
                                                  <WorkReportCard
                                                    key={report.id}
                                                    report={report}
                                                    colorAccent={colorScheme}
                                                  />
                                                ))
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reports List - Compact Tiles with Employee Info */}
                  {(!isManager || viewMode === 'list') && (
                    <div className="border rounded-xl overflow-hidden bg-card">
                    <div className="p-4 border-b bg-muted/30">
                      <h3 className="font-semibold text-sm">Work Reports</h3>
                    </div>
                    <div className="p-3 space-y-2">
                      {reports.map((report, index) => (
                        <div 
                          key={report.id} 
                          className="animate-fade-in"
                          style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
                        >
                          {/* Compact Tile */}
                          <div
                            onClick={() => toggleExpand(report.id)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                              expandedReportId === report.id || editingReport?.id === report.id
                                ? 'bg-muted'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            {/* Status Indicator */}
                            <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${
                              report.status === 'working' ? 'bg-green-500' : 'bg-amber-500'
                            }`} />
                            
                            {/* Employee Info + Date */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* Employee Avatar */}
                              <div className="w-8 h-8 rounded-lg bg-foreground/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {report.name?.charAt(0) || 'E'}
                              </div>
                              
                              {/* Employee Name & ID */}
                              <div className="min-w-0 flex-shrink-0 w-28 sm:w-36">
                                <p className="text-sm font-medium truncate">{report.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{report.employeeId}</p>
                              </div>
                              
                              {/* Department */}
                              <div className="hidden md:block text-xs text-muted-foreground flex-shrink-0 w-24 truncate">
                                {report.department}
                              </div>
                              
                              {/* Date */}
                              <div className="text-xs text-muted-foreground flex-shrink-0 w-16 text-center">
                                <p className="font-semibold uppercase">{getShortDay(report.date)}</p>
                                <p>{getShortDate(report.date)}</p>
                              </div>
                              
                              {/* Status Badge */}
                              <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                                report.status === 'working' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' 
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400'
                              }`}>
                                {report.status === 'working' ? 'Working' : 'Leave'}
                              </span>
                              
                              {/* On Duty Badge */}
                              {report.onDuty && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 flex-shrink-0">
                                  <Shield className="h-3 w-3" />
                                  On Duty
                                </span>
                              )}
                              
                              {/* Late Submission Badge */}
                              {isLateSubmission(report) && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 flex-shrink-0">
                                  <AlertCircle className="h-3 w-3" />
                                  Late Submitted
                                </span>
                              )}

                              {/* Preview of report (truncated) */}
                              {report.workReport && expandedReportId !== report.id && editingReport?.id !== report.id && (
                                <p className="text-xs text-muted-foreground truncate flex-1 hidden lg:block">
                                  {report.workReport.substring(0, 40)}{report.workReport.length > 40 ? '...' : ''}
                                </p>
                              )}
                            </div>

                            {/* Expand/Edit Icons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {canEdit(report) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditClick(report);
                                    setExpandedReportId(report.id);
                                  }}
                                  className="h-7 w-7 p-0"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
                                expandedReportId === report.id || editingReport?.id === report.id ? 'rotate-180' : ''
                              }`} />
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {(expandedReportId === report.id || editingReport?.id === report.id) && (
                            <div className="mt-1 ml-4 pl-4 border-l-2 border-muted">
                              {/* Edit Mode */}
                              {editingReport?.id === report.id ? (
                                <div className="space-y-3 py-3 pr-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{formatDate(report.date)}</span>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelEdit}
                                        disabled={saving}
                                        className="h-7 px-2"
                                      >
                                        <X className="h-3.5 w-3.5 mr-1" />
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={saving}
                                        className="h-7 px-2"
                                      >
                                        {saving ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <>
                                            <Check className="h-3.5 w-3.5 mr-1" />
                                            Save
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Status Toggle */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Status</Label>
                                    <div className="flex rounded-md border p-0.5 bg-muted/50">
                                      <button
                                        type="button"
                                        onClick={() => setEditStatus('working')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                          editStatus === 'working'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        <Briefcase className={`h-3.5 w-3.5 ${editStatus === 'working' ? 'text-green-600' : ''}`} />
                                        Working
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditStatus('leave')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                          editStatus === 'leave'
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                      >
                                        <Coffee className={`h-3.5 w-3.5 ${editStatus === 'leave' ? 'text-amber-600' : ''}`} />
                                        On Leave
                                      </button>
                                    </div>
                                  </div>

                                  {/* Work Report */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">
                                      Work Report {editStatus === 'working' && <span className="text-destructive">*</span>}
                                    </Label>
                                    <textarea
                                      value={editWorkReport}
                                      onChange={(e) => setEditWorkReport(e.target.value)}
                                      placeholder={editStatus === 'working' ? 'Work report is required...' : 'Optional notes...'}
                                      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground resize-none transition-all"
                                    />
                                  </div>
                                </div>
                              ) : (
                                /* View Mode - Expanded */
                                <div className="py-3 pr-3">
                                  {report.workReport ? (
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                      {report.workReport}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic">
                                      No details provided
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Initial State - Only for admins who haven't searched */}
          {canSearchOthers && !searched && !loading && (
            <div className="border rounded-xl p-16 text-center bg-card animate-fade-in-up opacity-0 delay-200" style={{ animationFillMode: 'forwards' }}>
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Search Employee Reports</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Search by employee ID, name, or filter by department
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Try searching:</span>
                <code className="px-2 py-1 bg-muted rounded font-mono">EMP001</code>
                <span>or</span>
                <code className="px-2 py-1 bg-muted rounded font-mono">John</code>
                <span>or select a department</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

