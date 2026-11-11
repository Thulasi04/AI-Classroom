import { useEffect, useState } from 'react';
import { Clock, MapPin, Megaphone, Calendar } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { campusService } from '../services/campusService';
import { useToast } from '../hooks/useToast';
import { formatDate, getErrorMessage } from '../utils/formatters';

export default function Timetable() {
  const [exams, setExams] = useState([]);
  const [examType, setExamType] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const data = await campusService.getTimetable(examType ? { exam_type: examType } : {});
      setExams(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load examination timetable'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [examType]);

  const announcements = exams.filter((e) => e.announcement);

  return (
    <DashboardLayout title="Examination Timetable">
      <div className="space-y-6">
        <div className="campus-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">Upcoming Examination Schedule</span>
          </div>
          <select
            value={examType}
            onChange={(e) => setExamType(e.target.value)}
            className="campus-input sm:w-56"
          >
            <option value="">All Examination Types</option>
            <option value="Mid-Semester Exam">Mid-Semester Exam</option>
            <option value="End-Semester Exam">End-Semester Exam</option>
            <option value="Practical Exam">Practical Exam</option>
          </select>
        </div>

        {announcements.length > 0 && (
          <div className="campus-card p-5 border-emerald-500/25">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Examination Announcements</h2>
            </div>
            <div className="space-y-2">
              {announcements.map((item) => (
                <div key={`ann-${item.id}`} className="p-3 rounded-lg bg-[#10151c] border border-[#222c3a] text-xs">
                  <span className="font-semibold text-emerald-400">{item.course_code}: </span>
                  <span className="text-slate-300">{item.announcement}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <LoadingSpinner label="Loading timetable..." />
        ) : (
          <DataTable
            columns={[
              {
                key: 'exam_date',
                label: 'Date',
                render: (row) => (
                  <span className="font-medium text-white">{formatDate(row.exam_date)}</span>
                ),
              },
              { key: 'course_code', label: 'Code' },
              { key: 'course_name', label: 'Subject' },
              {
                key: 'exam_type',
                label: 'Exam Type',
                render: (row) => (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                    {row.exam_type}
                  </span>
                ),
              },
              {
                key: 'time',
                label: 'Time',
                render: (row) => (
                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {row.start_time} - {row.end_time}
                  </span>
                ),
              },
              {
                key: 'room',
                label: 'Venue',
                render: (row) => (
                  <span className="inline-flex items-center gap-1.5 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {row.room}
                  </span>
                ),
              },
            ]}
            rows={exams}
            emptyMessage="No examinations scheduled for this filter."
          />
        )}
      </div>
    </DashboardLayout>
  );
}

