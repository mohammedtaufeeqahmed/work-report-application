'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, Users, Calendar, Briefcase, Coffee, ChevronLeft, ChevronRight, Filter, X, TrendingUp, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Entity, Branch, Department } from '@/types';

interface EmployeeReportStatus {
  employeeId: string;
  name: string;
  department: string;
  entityId: number | null;
  branchId: number | null;
  dailyStatus: Record<string, 'submitted' | 'leave' | 'not_submitted' | 'sunday' | 'future'>;
  submittedCount: number;
  workingDaysCount: number;
}

interface MonthlyStatusData {
  employees: EmployeeReportStatus[];
  daysInMonth: number;
  year: number;
  month: number;
  entities: Entity[];
  branches: Branch[];
  departments: Department[];
}

interface AnalyticsData {
  summary: {
    totalReports: number;
    workingDays: number;
    leaveDays: number;
    uniqueEmployees: number;
  };
  departmentStats: Array<{
    department: string;
    working: number;
    leave: number;
    total: number;
  }>;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ManagementDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [statusData, setStatusData] = useState<MonthlyStatusData | null>(null);
  const [error, setError] = useState('');

  // Filter states
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    fetchAnalytics();
    // Set current date string on client mount to avoid hydration mismatch
    setCurrentDateStr(new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  useEffect(() => {
    fetchMonthlyStatus();
  }, [selectedYear, selectedMonth, selectedEntity, selectedBranch, selectedDepartment]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics?days=30');
      const result = await response.json();
      if (result.success) setAnalyticsData(result.data);
    } catch {
      console.error('Failed to load analytics');
    }
  };

  const fetchMonthlyStatus = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
      });
      if (selectedEntity !== 'all') params.append('entityId', selectedEntity);
      if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);

      const response = await fetch(`/api/reports/monthly-status?${params.toString()}`);
      const result = await response.json();
      if (result.success) {
        setStatusData(result.data);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch status');
      }
    } catch {
      setError('Failed to load monthly status');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleClearFilters = () => {
    setSelectedEntity('all');
    setSelectedBranch('all');
    setSelectedDepartment('all');
  };

  // Filter branches by selected entity
  const filteredBranches = useMemo(() => {
    if (!statusData) return [];
    if (selectedEntity === 'all') return statusData.branches;
    return statusData.branches.filter(b => b.entityId === parseInt(selectedEntity));
  }, [statusData, selectedEntity]);

  // Filter departments by selected entity
  const filteredDepartments = useMemo(() => {
    if (!statusData) return [];
    if (selectedEntity === 'all') return statusData.departments;
    return statusData.departments.filter(d => d.entityId === parseInt(selectedEntity) || d.entityId === null);
  }, [statusData, selectedEntity]);

  // Generate days array for the table header
  const daysArray = useMemo(() => {
    if (!statusData) return [];
    const days: { day: number; dateStr: string; isSunday: boolean }[] = [];
    for (let day = 1; day <= statusData.daysInMonth; day++) {
      const dateStr = `${statusData.year}-${String(statusData.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(statusData.year, statusData.month - 1, day);
      days.push({
        day,
        dateStr,
        isSunday: date.getDay() === 0,
      });
    }
    return days;
  }, [statusData]);

  // Create a stable reference to employees array to ensure all three tables stay in sync
  const employeesList = useMemo(() => {
    if (!statusData) return [];
    return statusData.employees;
  }, [statusData]);

  // Calculate department stats from monthly status data
  const monthlyDepartmentStats = useMemo(() => {
    if (!statusData) return [];
    
    const deptMap: Record<string, { working: number; leave: number; total: number }> = {};
    
    statusData.employees.forEach(employee => {
      if (!deptMap[employee.department]) {
        deptMap[employee.department] = { working: 0, leave: 0, total: 0 };
      }
      deptMap[employee.department].working += employee.submittedCount;
      // Count leaves from daily status
      const leaveCount = Object.values(employee.dailyStatus).filter(s => s === 'leave').length;
      deptMap[employee.department].leave += leaveCount;
      deptMap[employee.department].total += employee.submittedCount + leaveCount;
    });
    
    return Object.entries(deptMap)
      .map(([department, stats]) => ({ department, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [statusData]);

  const getStatusCell = (status: 'submitted' | 'leave' | 'not_submitted' | 'sunday' | 'future') => {
    switch (status) {
      case 'submitted':
        return (
          <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center" title="Submitted">
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">✓</span>
          </div>
        );
      case 'leave':
        return (
          <div className="w-7 h-7 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center" title="Leave">
            <span className="text-blue-600 dark:text-blue-400 text-xs font-semibold">L</span>
          </div>
        );
      case 'not_submitted':
        return (
          <div className="w-7 h-7 rounded bg-rose-500/20 border border-rose-500/30 flex items-center justify-center" title="Not Submitted">
            <span className="text-rose-600 dark:text-rose-400 text-xs font-semibold">✗</span>
          </div>
        );
      case 'sunday':
        return (
          <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center" title="Holiday (Sunday)">
            <span className="text-muted-foreground text-xs">—</span>
          </div>
        );
      case 'future':
        return <div className="w-7 h-7" />;
    }
  };

  const hasActiveFilters = selectedEntity !== 'all' || selectedBranch !== 'all' || selectedDepartment !== 'all';

  // Calculate compliance rate
  const complianceRate = analyticsData 
    ? Math.round((analyticsData.summary.workingDays / (analyticsData.summary.workingDays + analyticsData.summary.leaveDays || 1)) * 100)
    : 0;

  return (
    <div className="min-h-screen pt-14 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 px-4 md:px-6">
        <div className="max-w-full mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Management Dashboard</h1>
              <p className="text-muted-foreground">Work report submission overview • Last 30 days</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{currentDateStr}</span>
            </div>
          </div>

          {/* Stats Cards */}
          {analyticsData && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analyticsData.summary.totalReports}</p>
                    <p className="text-xs text-muted-foreground">Total Reports</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10">
                    <Briefcase className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{analyticsData.summary.workingDays}</p>
                    <p className="text-xs text-muted-foreground">Working Days</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10">
                    <Coffee className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{analyticsData.summary.leaveDays}</p>
                    <p className="text-xs text-muted-foreground">Leave Days</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{analyticsData.summary.uniqueEmployees}</p>
                    <p className="text-xs text-muted-foreground">Active Employees</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card border rounded-xl p-5 shadow-sm col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-violet-500/10">
                    <TrendingUp className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-600">{complianceRate}%</p>
                    <p className="text-xs text-muted-foreground">Work Rate</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Department Stats */}
          {monthlyDepartmentStats.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Department Overview
                </h3>
                <span className="text-xs text-muted-foreground">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {monthlyDepartmentStats.map((dept) => {
                  const rate = dept.total > 0 ? Math.round((dept.working / dept.total) * 100) : 0;
                  const circumference = 2 * Math.PI * 20;
                  const strokeDashoffset = circumference - (rate / 100) * circumference;
                  
                  return (
                    <div 
                      key={dept.department} 
                      className="bg-card border rounded-xl p-4 hover:shadow-md transition-all hover:border-primary/20"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate" title={dept.department}>
                            {dept.department}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {dept.total} reports
                          </p>
                        </div>
                        {/* Circular Progress */}
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="4"
                              className="text-muted/30"
                            />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              fill="none"
                              strokeWidth="4"
                              strokeLinecap="round"
                              className={rate >= 80 ? 'text-emerald-500' : rate >= 50 ? 'text-amber-500' : 'text-rose-500'}
                              stroke="currentColor"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xs font-bold ${rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {rate}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-muted-foreground">Working</span>
                          <span className="font-semibold text-emerald-600">{dept.working}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          <span className="text-muted-foreground">Leave</span>
                          <span className="font-semibold text-amber-600">{dept.leave}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Status Table */}
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Monthly Submission Status</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Daily work report submission tracking</p>
                </div>
                
                {/* Month Navigation */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                  <Button variant="ghost" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[140px] text-center text-sm font-medium px-2">
                    {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>

                <select
                  value={selectedEntity}
                  onChange={(e) => {
                    setSelectedEntity(e.target.value);
                    setSelectedBranch('all');
                    setSelectedDepartment('all');
                  }}
                  className="h-8 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="all">All Entities</option>
                  {statusData?.entities.map((entity) => (
                    <option key={entity.id} value={entity.id.toString()}>{entity.name}</option>
                  ))}
                </select>

                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="h-8 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="all">All Branches</option>
                  {filteredBranches.map((branch) => (
                    <option key={branch.id} value={branch.id.toString()}>{branch.name}</option>
                  ))}
                </select>

                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="h-8 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="all">All Departments</option>
                  {filteredDepartments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-8 text-muted-foreground">
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                )}

                {/* Legend - Right aligned */}
                <div className="flex items-center gap-4 ml-auto text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30"></div>
                    <span className="text-muted-foreground">Submitted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/30"></div>
                    <span className="text-muted-foreground">Missing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/30"></div>
                    <span className="text-muted-foreground">Leave</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-muted/50"></div>
                    <span className="text-muted-foreground">Holiday</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Content */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading data...</p>
              </div>
            ) : error ? (
              <div className="py-20 text-center text-destructive">{error}</div>
            ) : statusData && employeesList.length > 0 ? (
              <div className="flex">
                {/* Fixed Left Columns */}
                <div className="flex-shrink-0 border-r shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                  <table className="text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="text-left py-3 px-4 font-medium w-[110px]">Department</th>
                        <th className="text-left py-3 px-4 font-medium w-[150px]">Employee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {employeesList.map((employee, index) => (
                        <tr key={`left-${employee.employeeId}`} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="py-2.5 px-4 w-[110px] h-[56px]">
                            <span className="text-xs font-medium text-muted-foreground">{employee.department}</span>
                          </td>
                          <td className="py-2.5 px-4 w-[150px] h-[56px]">
                            <p className="font-medium text-sm truncate">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">{employee.employeeId}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Scrollable Middle Section */}
                <div className="flex-1 overflow-x-auto">
                  <table className="text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                        {daysArray.map(({ day, isSunday }) => (
                          <th key={day} className={`py-3 px-1 font-medium text-center w-9 ${isSunday ? 'opacity-50' : ''}`}>
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {employeesList.map((employee, index) => (
                        <tr key={`middle-${employee.employeeId}`} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          {daysArray.map(({ dateStr }) => (
                            <td key={dateStr} className="py-2.5 px-1 text-center h-[56px]">
                              {getStatusCell(employee.dailyStatus[dateStr])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Fixed Right Column */}
                <div className="flex-shrink-0 border-l shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                  <table className="text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 px-4 font-medium text-center w-[80px]">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {employeesList.map((employee, index) => {
                        const rate = employee.workingDaysCount > 0 
                          ? Math.round((employee.submittedCount / employee.workingDaysCount) * 100) 
                          : 0;
                        return (
                          <tr key={`right-${employee.employeeId}`} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <td className="py-2.5 px-4 text-center w-[80px] h-[56px]">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-sm font-bold ${
                                  rate === 100 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600'
                                }`}>
                                  {employee.submittedCount}/{employee.workingDaysCount}
                                </span>
                                <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${rate === 100 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No employees found for the selected filters.</p>
              </div>
            )}

            {/* Footer */}
            {statusData && employeesList.length > 0 && (
              <div className="px-5 py-3 border-t bg-muted/30 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span><strong className="text-foreground">{employeesList.length}</strong> employees</span>
                <span><strong className="text-foreground">{statusData.daysInMonth}</strong> days in month</span>
                <span><strong className="text-foreground">{daysArray.filter(d => !d.isSunday).length}</strong> working days</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
