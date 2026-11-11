import { useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/common/StatCard';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import AttendanceBarChart from '../components/charts/AttendanceBarChart';
import AttendanceDonutChart from '../components/charts/AttendanceDonutChart';
import { campusService } from '../services/campusService';
import { useToast } from '../hooks/useToast';
import { formatDate, getErrorMessage } from '../utils/formatters';

export default function Attendance() {
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = await campusService.getAttendance(
        statusFilter ? { status: statusFilter } : {}
      );
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load attendance data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [statusFilter]);

  if (loading) {
    return (
      <DashboardLayout title="Attendance Dashboard">
        <LoadingSpinner label="Loading attendance records..." />
      </DashboardLayout>
    );
  }

  const overall = data?.overall || {
    total_classes: 0,
    present_count: 0,
    late_count: 0,
    absent_count: 0,
    percentage: 0,
  };
  const byCourse = data?.by_course || [];
  const history = data?.history || [];

  return (
    <DashboardLayout title="Attendance Dashboard">
      <div className="space-y-6">
        {/* Top Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Overall Attendance"
            value={`${overall.percentage}%`}
            subtitle={`${overall.total_classes} total sessions`}
            icon={CalendarCheck}
            accent={overall.percentage >= 75 ? 'emerald' : 'rose'}
          />
          <StatCard
            title="Sessions Present"
            value={overall.present_count}
            subtitle="Full attendance credit"
            icon={CheckCircle2}
            accent="emerald"
          />
          <StatCard
            title="Late Arrivals"
            value={overall.late_count}
            subtitle="Marked late"
            icon={AlertTriangle}
            accent="amber"
          />
          <StatCard
            title="Sessions Absent"
            value={overall.absent_count}
            subtitle="Missed classes"
            icon={XCircle}
            accent="rose"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AttendanceBarChart data={byCourse} />
          </div>
          <div>
            <AttendanceDonutChart
              present={overall.present_count}
              late={overall.late_count}
              absent={overall.absent_count}
            />
          </div>
        </div>

        {/* Subject-wise Breakdown */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Subject-wise Summary</h2>
          <DataTable
            columns={[
              { key: 'course_code', label: 'Code' },
              { key: 'course_name', label: 'Course' },
              { key: 'faculty_name', label: 'Faculty' },
              {
                key: 'attended',
                label: 'Attended / Total',
                render: (row) => `${row.attended_classes} / ${row.total_classes}`,
              },
              {
                key: 'percentage',
                label: 'Percentage',
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-[#1e2631] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          row.percentage >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, row.percentage)}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        row.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {row.percentage}%
                    </span>
                  </div>
                ),
              },
            ]}
            rows={byCourse}
          />
        </div>

        {/* Attendance History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Attendance History</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="campus-input w-44"
            >
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <DataTable
            columns={[
              {
                key: 'date',
                label: 'Date',
                render: (row) => formatDate(row.date),
              },
              { key: 'course_code', label: 'Code' },
              { key: 'course_name', label: 'Subject' },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StatusBadge status={row.status} />,
              },
              { key: 'remarks', label: 'Remarks' },
            ]}
            rows={history}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

