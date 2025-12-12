'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, Search, Users, Calendar, FileText, Filter, Shield, UserX } from 'lucide-react';
import { toast } from 'sonner';
import type { WorkReport, SafeEmployee, SessionUser } from '@/types';
import { getISTDateRangeFromDays } from '@/lib/date';

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
  const [absentDate, setAbsentDate] = useState(new Date().toISOString().split('T')[0]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  // Use IST for date range (last 7 days)
  const [dateRange, setDateRange] = useState(getISTDateRangeFromDays(7));

  useEffect(() => {
    fetchSession();
    fetchReports();
    fetchTeamEmployees();
  }, []);

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
        toast.success(`Employee marked as absent (leave) for ${absentDate}`);
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
                  <Button>
                    <UserX className="h-4 w-4 mr-2" />
                    Mark Absent
                  </Button>
                </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Mark Employee as Absent</SheetTitle>
                  <SheetDescription>
                    {user?.role === 'manager'
                      ? 'Select an employee and date to mark them as absent. You can only mark employees in your team.'
                      : 'Select an employee and date to mark them as absent. You can mark any employee.'}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date</label>
                    <Input
                      type="date"
                      value={absentDate}
                      onChange={(e) => setAbsentDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {user?.role === 'manager' ? 'Team Employees' : 'All Employees'}
                    </label>
                    {loadingTeam ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : teamEmployees.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">No team employees found</p>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {teamEmployees.map((employee) => (
                          <div
                            key={employee.employeeId}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div>
                              <p className="font-medium text-sm">{employee.name}</p>
                              <p className="text-xs text-muted-foreground">{employee.employeeId} • {employee.department}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAbsent(employee.employeeId)}
                              disabled={markingAbsent === employee.employeeId}
                            >
                              {markingAbsent === employee.employeeId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Mark Absent'
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
