'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  FileText, 
  Briefcase, 
  Coffee, 
  TrendingUp, 
  Calendar,
  Pencil, 
  X, 
  Check,
  User,
  Building2,
  Plus,
  ChevronDown,
  AlertCircle,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { WorkReport, SessionUser, WorkStatus, EditPermissions } from '@/types';
import { getISTTodayDateString, getShortDayIST, getShortDateIST, formatDateForDisplay, getDayOfMonthIST, convertUTCToISTDate } from '@/lib/date';

export default function EmployeeDashboardPage() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [editPermissions, setEditPermissions] = useState<EditPermissions | null>(null);

  // Edit state
  const [editingReport, setEditingReport] = useState<WorkReport | null>(null);
  const [editStatus, setEditStatus] = useState<WorkStatus>('working');
  const [editWorkReport, setEditWorkReport] = useState('');
  const [saving, setSaving] = useState(false);

  // Expanded report state
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null);

  // Check if user can edit their own reports (applies to both employees and managers)
  const canEditOwnReports = editPermissions?.employee_can_edit_own_reports || false;

  // Check if a report can be edited (only on the same day it was created)
  const canEditReport = (report: WorkReport) => {
    if (!canEditOwnReports) return false;
    
    // Convert UTC createdAt to IST date and compare with today in IST
    const createdDate = convertUTCToISTDate(report.createdAt);
    const todayDate = getISTTodayDateString();
    
    return createdDate === todayDate;
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

  // Fetch reports when session is loaded
  useEffect(() => {
    if (session?.employeeId) {
      fetchReports();
    }
  }, [session]);

  const fetchReports = async () => {
    if (!session?.employeeId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/work-reports?employeeId=${session.employeeId}`);
      const data = await response.json();

      if (data.success) {
        setReports(data.data.reports || []);
      } else {
        toast.error(data.error || 'Failed to fetch reports');
      }
    } catch {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
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
    if (editingReport?.id === reportId) return;
    setExpandedReportId(expandedReportId === reportId ? null : reportId);
  };

  // Calculate stats
  const workingCount = reports.filter(r => r.status === 'working').length;
  const leaveCount = reports.filter(r => r.status === 'leave').length;
  const onDutyCount = reports.filter(r => r.onDuty).length;
  const attendanceRate = reports.length > 0 ? Math.round((workingCount / reports.length) * 100) : 0;
  
  // Check if today's report is submitted (using IST)
  const today = getISTTodayDateString();
  const todayReport = reports.find(r => r.date === today);
  
  // Helper function to check if report is a late submission (using IST)
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
            <h1 className="text-2xl font-bold mb-2">Login Required</h1>
            <p className="text-muted-foreground mb-6">
              Please login to access your dashboard.
            </p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14">
      <div className="container py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Employee Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {session.name}
            </p>
          </div>

        {/* Profile & Stats - Two Column Layout */}
        <div className="grid gap-4 lg:grid-cols-5 mb-6">
          {/* Left Column - Employee Details */}
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-foreground text-background flex items-center justify-center text-lg font-bold">
                    {session.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                    todayReport ? (todayReport.status === 'working' ? 'bg-green-500' : 'bg-amber-500') : 'bg-muted-foreground'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold truncate">{session.name}</h2>
                  <p className="text-sm text-muted-foreground truncate">{session.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      <User className="h-3 w-3" />
                      {session.employeeId}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                      <Building2 className="h-3 w-3" />
                      {session.department}
                    </span>
                  </div>
                  {!todayReport && (
                    <Link href="/work-report" className="block mt-3">
                      <Button size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-1.5" />
                        Submit Today&apos;s Report
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Stats */}
          <Card className="lg:col-span-3">
            <CardContent className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Total Reports */}
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Total Reports</p>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{reports.length}</p>
                </div>

                {/* Working Days */}
                <div className="p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Working Days</p>
                    <Briefcase className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-600">{workingCount}</p>
                </div>

                {/* On Duty */}
                <div className="p-3 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">On Duty</p>
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{onDutyCount}</p>
                </div>

                {/* Leave Days */}
                <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Leave Days</p>
                    <Coffee className="h-4 w-4 text-amber-600" />
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{leaveCount}</p>
                </div>

                {/* Attendance */}
                <div className={`p-3 rounded-lg border ${
                  attendanceRate >= 80 
                    ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900' 
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Attendance</p>
                    <TrendingUp className={`h-4 w-4 ${attendanceRate >= 80 ? 'text-green-600' : 'text-amber-600'}`} />
                  </div>
                  <p className={`text-2xl font-bold ${attendanceRate >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{attendanceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Permission Info */}
        {canEditOwnReports && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Pencil className="h-4 w-4" />
              <span className="text-sm font-medium">You can edit your work reports (only on the day they were created)</span>
            </div>
          </div>
        )}

        {/* Reports List - Compact Tiles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Work Report History</CardTitle>
            <CardDescription>Your submitted work reports</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No Reports Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You haven&apos;t submitted any work reports yet.
                </p>
                <Link href="/work-report">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Your First Report
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div key={report.id}>
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
                      <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                        report.status === 'working' ? 'bg-green-500' : 'bg-amber-500'
                      }`} />
                      
                      {/* Day & Date */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 text-center flex-shrink-0">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">{getShortDay(report.date)}</p>
                          <p className="text-sm font-bold">{getDayOfMonthIST(report.date)}</p>
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0">
                          {getShortDate(report.date)}
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
                          <p className="text-xs text-muted-foreground truncate flex-1 hidden sm:block">
                            {report.workReport.substring(0, 50)}{report.workReport.length > 50 ? '...' : ''}
                          </p>
                        )}
                      </div>

                      {/* Expand/Edit Icons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {canEditReport(report) && (
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
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}

