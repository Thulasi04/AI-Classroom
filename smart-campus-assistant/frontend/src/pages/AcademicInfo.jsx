import { useEffect, useState } from 'react';
import { BookOpen, UserCheck, Mail, Search, Megaphone } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { campusService } from '../services/campusService';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/formatters';

export default function AcademicInfo() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const { toast } = useToast();

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (semesterFilter) params.semester = Number(semesterFilter);
      const data = await campusService.getCourses(params);
      setCourses(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch academic courses'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [semesterFilter]);

  const announcements = courses.filter((c) => c.announcement);

  return (
    <DashboardLayout title="Academic Information">
      <div className="space-y-6">
        {/* Filters */}
        <div className="campus-card p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCourses()}
              placeholder="Search course code, subject, or faculty name..."
              className="campus-input pl-9"
            />
          </div>
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="campus-input sm:w-44"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
          <button onClick={fetchCourses} className="campus-btn-primary">
            Filter
          </button>
        </div>

        {/* Academic Announcements */}
        {announcements.length > 0 && (
          <div className="campus-card p-5 border-emerald-500/25">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Academic Announcements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {announcements.map((c) => (
                <div key={`ann-${c.id}`} className="p-3 rounded-lg bg-[#10151c] border border-[#222c3a]">
                  <span className="text-xs font-semibold text-emerald-400">
                    {c.code} — {c.name}
                  </span>
                  <p className="text-xs text-slate-300 mt-1">{c.announcement}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses Grid */}
        {loading ? (
          <LoadingSpinner label="Loading courses and faculty information..." />
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses found"
            description="Try adjusting your semester or search filter."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <div key={course.id} className="campus-card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono font-semibold text-emerald-300">
                      {course.code}
                    </span>
                    <span className="text-xs text-slate-400">
                      Sem {course.semester} • {course.credits} Credits
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">{course.name}</h3>
                  <p className="text-xs text-emerald-400/90 mt-0.5">{course.department}</p>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-[#222c3a] space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{course.faculty_name}</span>
                  </div>
                  {course.faculty_email && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{course.faculty_email}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

