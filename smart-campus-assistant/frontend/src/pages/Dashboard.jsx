import { useEffect, useState } from 'react';
import {
  User,
  CalendarCheck,
  Award,
  Briefcase,
  Building2,
  BookOpen,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/common/StatCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import QuickActions from '../components/dashboard/QuickActions';
import NotificationsPanel from '../components/dashboard/NotificationsPanel';
import UpcomingExamsCard from '../components/dashboard/UpcomingExamsCard';
import MiniChatWidget from '../components/dashboard/MiniChatWidget';
import { campusService } from '../services/campusService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatDate, getErrorMessage } from '../utils/formatters';

export default function Dashboard() {
  const { user, studentProfile } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const res = await campusService.getDashboardSummary();
      setData(res);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load dashboard overview'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleMarkNotificationRead = async (id) => {
    try {
      await campusService.markNotificationRead(id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) =>
                n.id === id ? { ...n, is_read: true } : n
              ),
            }
          : prev
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update notification'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Student Dashboard">
        <LoadingSpinner label="Loading your campus dashboard..." />
      </DashboardLayout>
    );
  }

  const profile = data?.profile || studentProfile;
  const attendance = data?.attendance_summary || {
    overall_percentage: 0,
    attended_classes: 0,
    total_classes: 0,
    low_attendance_subjects: 0,
  };
  const marks = data?.marks_summary || {
    average_percentage: 0,
    total_scored: 0,
    total_max: 0,
    subject_count: 0,
  };

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-6">
        {/* Profile Banner */}
        <div className="campus-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white">{user?.full_name}</h2>
                {profile?.register_number && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono text-emerald-300">
                    {profile.register_number}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                {profile?.department || 'University Administration'} •{' '}
                {profile?.semester ? `Semester ${profile.semester}` : 'Campus Portal'}
                {profile?.section ? ` (Section ${profile.section})` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs">
            <div className="px-3.5 py-2 rounded-lg bg-[#0e1319] border border-[#232d3b]">
              <span className="text-slate-400 block">CGPA</span>
              <span className="text-sm font-bold text-emerald-400">
                {profile?.cgpa !== undefined ? Number(profile.cgpa).toFixed(2) : '—'}
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-lg bg-[#0e1319] border border-[#232d3b]">
              <span className="text-slate-400 block">Faculty Advisor</span>
              <span className="text-sm font-medium text-white">
                {profile?.advisor_name || 'Assigned Advisor'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Overall Attendance"
            value={`${attendance.overall_percentage}%`}
            subtitle={`${attendance.attended_classes} / ${attendance.total_classes} sessions attended`}
            trend={
              attendance.low_attendance_subjects > 0
                ? `${attendance.low_attendance_subjects} subject(s) below 75%`
                : 'On track across all subjects'
            }
            icon={CalendarCheck}
            accent={attendance.overall_percentage >= 75 ? 'emerald' : 'rose'}
          />
          <StatCard
            title="Internal Marks Avg"
            value={`${marks.average_percentage}%`}
            subtitle={`${marks.total_scored} / ${marks.total_max} total marks`}
            trend={`${marks.subject_count} active course(s)`}
            icon={Award}
            accent="emerald"
          />
          <StatCard
            title="Upcoming Exams"
            value={data?.upcoming_exams?.length || 0}
            subtitle="Scheduled this semester"
            icon={BookOpen}
            accent="sky"
          />
          <StatCard
            title="Placement Drives"
            value={data?.placement_updates?.length || 0}
            subtitle={`${data?.open_tickets_count || 0} open support ticket(s)`}
            icon={Briefcase}
            accent="amber"
          />
        </div>

        {/* AI Assistant Quick Access */}
        <MiniChatWidget />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <UpcomingExamsCard exams={data?.upcoming_exams || []} />

            {/* Placement Updates */}
            <div className="campus-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Latest Placement Updates</h3>
              </div>
              {(!data?.placement_updates || data.placement_updates.length === 0) ? (
                <p className="text-xs text-slate-500 py-4 text-center">No active placement drives.</p>
              ) : (
                <div className="space-y-3">
                  {data.placement_updates.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-lg bg-[#10151c] border border-[#202937] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{p.company_name}</span>
                          <StatusBadge
                            status={p.is_eligible ? 'eligible' : 'ineligible'}
                            label={p.is_eligible ? 'Eligible' : 'Not Eligible'}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {p.role_title} • {p.package_lpa} LPA • Min CGPA {p.min_cgpa}
                        </p>
                      </div>
                      <div className="text-xs text-slate-400 sm:text-right">
                        Deadline: <span className="text-slate-200">{formatDate(p.deadline)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <QuickActions />
            <NotificationsPanel
              notifications={data?.notifications || []}
              onMarkRead={handleMarkNotificationRead}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

