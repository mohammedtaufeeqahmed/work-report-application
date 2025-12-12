'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Search, Users, Calendar, FileText, Filter, Shield, UserX, CheckCircle2, XCircle, Building2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkReport, SafeEmployee, SessionUser } from '@/types';
import { getISTDateRangeFromDays, getISTTodayDateString, getFullDateIST } from '@/lib/date';

const chartConfig = {
  working: { label: 'Working', color: '#22c55e' },
  leave: { label: 'Leave', color: '#f59e0b' },
} satisfies ChartConfig;

export default function ManagersDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamEmployees, setTeamEmployees] = useState<SafeEmployee[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [markingAbsent, setMarkingAbsent] = useState<string | null>(null);
  const [absentDate, setAbsentDate] = useState(getISTTodayDateString());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [recentlyMarked, setRecentlyMarked] = useState<Set<string>>(new Set());
  // Use IST for date range (last 7 days)
  const [dateRange, setDateRange] = useState(getISTDateRangeFromDays(7));

  useEffect(() => {
    fetchSession();
    fetchReports();
    fetchTeamEmployees();
  }, []);

  useEffect(() => {
    if (sheetOpen) {
      fetchTeamEmployees();
    }
  }, [sheetOpen]);

  const fetchSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      if (data.success) {
        setUser(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/work-reports?startDate=${dateRange.start}&endDate=${dateRange.end}`);
      const data = await response.json();
      if (data.success) setReports(data.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamEmployees = async () => {
    setLoadingTeam(true);
    try {
      const response = await fetch('/api/managers/team');
      const data = await response.json();
      if (data.success) setTeamEmployees(data.data || []);
    } catch (error) {
      console.error('Failed to fetch team employees:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleMarkAbsent = async (employeeId: string) => {
    if (!absentDate) {
      toast.error('Please select a date');
      return;
    }

    setMarkingAbsent(employeeId);
    try {
      const response = await fetch('/api/work-reports/mark-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, date: absentDate }),
      });

      const data = await response.json();
      if (data.success) {
        const employee = teamEmployees.find(emp => emp.employeeId === employeeId);
        toast.success(`${employee?.name || 'Employee'} marked as absent (leave) for ${getFullDateIST(absentDate)}`);
        setRecentlyMarked(prev => new Set(prev).add(employeeId));
        setTimeout(() => {
          setRecentlyMarked(prev => {
            const newSet = new Set(prev);
            newSet.delete(employeeId);
            return newSet;
          });
        }, 3000);
        fetchReports(); // Refresh reports
      } else {
        toast.error(data.error || 'Failed to mark employee as absent');
      }
    } catch (error) {
      console.error('Failed to mark absent:', error);
      toast.error('Failed to mark employee as absent');
    } finally {
      setMarkingAbsent(null);
    }
  };

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const workingCount = filteredReports.filter(r => r.status === 'working').length;
  // Treat absent as leave - combine both counts
  const leaveCount = filteredReports.filter(r => r.status === 'leave' || r.status === 'absent').length;
  const onDutyCount = filteredReports.filter(r => r.onDuty).length;

  const departmentData = filteredReports.reduce((acc, report) => {
    const dept = report.department;
    if (!acc[dept]) acc[dept] = { department: dept, working: 0, leave: 0 };
    if (report.status === 'working') acc[dept].working++;
    else if (report.status === 'leave' || report.status === 'absent') acc[dept].leave++;
    return acc;
  }, {} as Record<string, { department: string; working: number; leave: number }>);

  const chartData = Object.values(departmentData);

  const pieData = [
    { name: 'Working', value: workingCount, color: '#22c55e' },
    { name: 'Leave', value: leaveCount, color: '#f59e0b' },
  ];

  const employeeSummary = filteredReports.reduce((acc, report) => {
    const key = report.employeeId;
    if (!acc[key]) acc[key] = { employeeId: key, name: report.name, department: report.department, working: 0, leave: 0, onDuty: 0 };
    if (report.status === 'working') acc[key].working++;
    else if (report.status === 'leave' || report.status === 'absent') acc[key].leave++;
    if (report.onDuty) acc[key].onDuty++;
    return acc;
  }, {} as Record<string, { employeeId: string; name: string; department: string; working: number; leave: number; onDuty: number }>);

  const employeeData = Object.values(employeeSummary).sort((a, b) => (b.working + b.leave) - (a.working + a.leave));

  // Filter employees for the mark absent modal
  const filteredEmployees = teamEmployees.filter(emp => {
    const matchesSearch = employeeSearch === '' || 
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.department.toLowerCase().includes(employeeSearch.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  // Get unique departments for filter
  const departments = Array.from(new Set(teamEmployees.map(emp => emp.department))).sort();

  return (
    <div className="min-h-screen pt-14">
      <div className="container py-8 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Managers Dashboard</h1>
              <p className="text-sm text-muted-foreground">Team work report analytics</p>
            </div>
            {user?.pageAccess?.mark_attendance && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button className="gap-2">
                    <UserX className="h-4 w-4" />
                    Mark Absent
                  </Button>
                </SheetTrigger>
              <SheetContent className="sm:max-w-[600px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <UserX className="h-5 w-5" />
                    Mark Employee as Absent
                  </SheetTitle>
                  <SheetDescription>
                    {user?.role === 'manager'
                      ? 'Select an employee and date to mark them as absent. You can only mark employees in your assigned departments.'
                      : user?.department === 'Operations'
                      ? 'Select an employee and date to mark them as absent. You can mark employees from your assigned departments or all employees if no departments are assigned.'
                      : 'Select an employee and date to mark them as absent.'}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  {/* Date Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Select Date
                    </label>
                    <Input
                      type="date"
                      value={absentDate}
                      onChange={(e) => setAbsentDate(e.target.value)}
                      max={getISTTodayDateString()}
                      className="w-full"
                    />
                    {absentDate && (
                      <p className="text-xs text-muted-foreground">
                        {getFullDateIST(absentDate)}
                      </p>
                    )}
                  </div>

                  {/* Employee Count */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {filteredEmployees.length} {filteredEmployees.length === 1 ? 'Employee' : 'Employees'}
                      </span>
                    </div>
                    {teamEmployees.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Total: {teamEmployees.length}
                      </span>
                    )}
                  </div>

                  {/* Search and Filter */}
                  {teamEmployees.length > 0 && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, ID, or department..."
                          value={employeeSearch}
                          onChange={(e) => setEmployeeSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {departments.length > 1 && (
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4 text-muted-foreground" />
                          <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="all">All Departments</option>
                            {departments.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Employee List */}
                  {loadingTeam ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Loading employees...</p>
                    </div>
                  ) : teamEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <Users className="h-12 w-12 text-muted-foreground/50" />
                      <div>
                        <p className="text-sm font-medium">No employees found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user?.role === 'manager'
                            ? 'No employees are assigned to your departments yet.'
                            : 'No employees available to mark as absent.'}
                        </p>
                      </div>
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <Search className="h-12 w-12 text-muted-foreground/50" />
                      <div>
                        <p className="text-sm font-medium">No employees match your search</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try adjusting your search or filter criteria.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {filteredEmployees.map((employee) => {
                        const isMarking = markingAbsent === employee.employeeId;
                        const isRecentlyMarked = recentlyMarked.has(employee.employeeId);
                        return (
                          <div
                            key={employee.employeeId}
                            className={`group relative p-4 border rounded-lg transition-all ${
                              isRecentlyMarked
                                ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                : 'bg-card hover:bg-muted/50 border-border'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm truncate">{employee.name}</h4>
                                  {isRecentlyMarked && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <span className="font-mono">{employee.employeeId}</span>
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {employee.department}
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant={isRecentlyMarked ? "default" : "outline"}
                                onClick={() => handleMarkAbsent(employee.employeeId)}
                                disabled={isMarking || !absentDate}
                                className="flex-shrink-0 gap-2"
                              >
                                {isMarking ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>Marking...</span>
                                  </>
                                ) : isRecentlyMarked ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Marked</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3.5 w-3.5" />
                                    <span>Mark Absent</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            )}
          </div>

          {/* Filters */}
          <div className="border rounded-lg p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-auto"
              />
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-auto"
              />
              <Button onClick={fetchReports} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4 mr-2" />}
                Apply
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="border rounded-lg p-4">
              <FileText className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{filteredReports.length}</p>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </div>
            <div className="border rounded-lg p-4">
              <Calendar className="h-4 w-4 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-600">{workingCount}</p>
              <p className="text-xs text-muted-foreground">Working Days</p>
            </div>
            <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
              <Shield className="h-4 w-4 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-600">{onDutyCount}</p>
              <p className="text-xs text-muted-foreground">On Duty</p>
            </div>
            <div className="border rounded-lg p-4">
              <Calendar className="h-4 w-4 text-amber-600 mb-2" />
              <p className="text-2xl font-bold text-amber-600">{leaveCount}</p>
              <p className="text-xs text-muted-foreground">Leave Days</p>
            </div>
            <div className="border rounded-lg p-4">
              <Users className="h-4 w-4 text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{Object.keys(employeeSummary).length}</p>
              <p className="text-xs text-muted-foreground">Employees</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">By Department</h3>
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 12 }} width={80} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="working" fill="#22c55e" stackId="a" />
                    <Bar dataKey="leave" fill="#f59e0b" stackId="a" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>
              )}
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Status Distribution</h3>
              {filteredReports.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">No data</div>
              )}
            </div>
          </div>

          {/* Employee Summary */}
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Employee Summary</h3>
            </div>
            {employeeData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 text-sm font-medium">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-medium hidden md:table-cell">Department</th>
                      <th className="text-center py-3 px-4 text-sm font-medium">Working</th>
                      <th className="text-center py-3 px-4 text-sm font-medium">On Duty</th>
                      <th className="text-center py-3 px-4 text-sm font-medium">Leave</th>
                      <th className="text-center py-3 px-4 text-sm font-medium">Total</th>
                      <th className="text-center py-3 px-4 text-sm font-medium">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employeeData.slice(0, 10).map((emp) => {
                      const total = emp.working + emp.leave;
                      const attendance = total > 0 ? Math.round((emp.working / total) * 100) : 0;
                      return (
                        <tr key={emp.employeeId} className="hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-sm">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell text-sm">{emp.department}</td>
                          <td className="py-3 px-4 text-center text-sm text-green-600 font-medium">{emp.working}</td>
                          <td className="py-3 px-4 text-center text-sm text-blue-600 font-medium">{emp.onDuty}</td>
                          <td className="py-3 px-4 text-center text-sm text-amber-600 font-medium">{emp.leave}</td>
                          <td className="py-3 px-4 text-center text-sm font-medium">{total}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-xs px-2 py-1 rounded font-medium ${
                              attendance >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                              attendance >= 60 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            }`}>
                              {attendance}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No employee data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
