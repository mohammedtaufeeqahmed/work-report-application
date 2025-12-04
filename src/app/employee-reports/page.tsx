'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, FileText, Briefcase, Coffee, ArrowRight, Lock, Pencil, X, Check, ChevronDown, Filter, Users, Calendar, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkReport, SessionUser, WorkStatus, EditPermissions } from '@/types';
import { getISTTodayRange, getISTTodayDateString, getShortDayIST, getShortDateIST, formatDateForDisplay } from '@/lib/date';

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

  // Check if user can search for other employees (admin/superadmin/manager roles)
  const canSearchOthers = session?.role === 'admin' || session?.role === 'superadmin' || session?.role === 'manager';

  // Redirect employees to their dashboard - they should use that instead
  useEffect(() => {
    if (!sessionLoading && session && session.role === 'employee') {
      window.location.href = '/employee-dashboard';
    }
  }, [sessionLoading, session]);
  
  // Check if user can edit reports based on role and permissions
  const canEdit = (report: WorkReport) => {
    if (!session || !editPermissions) return false;
    
    const isOwnReport = report.employeeId === session.employeeId;
    
    if (session.role === 'superadmin') {
      return editPermissions.superadmin_can_edit_reports;
    }
    if (session.role === 'admin') {
      return editPermissions.admin_can_edit_reports;
    }
    // Managers cannot edit reports - removed
    if (session.role === 'employee' && isOwnReport) {
      return editPermissions.employee_can_edit_own_reports;
    }
    return false;
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
  
  // Helper function to check if report is a late submission (using IST)
  const today = getISTTodayDateString();
  const isLateSubmission = (reportDate: string) => {
    return reportDate < today;
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
        <div className="max-w-4xl mx-auto">
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

                  {/* Reports List - Compact Tiles with Employee Info */}
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
                              {isLateSubmission(report.date) && (
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

