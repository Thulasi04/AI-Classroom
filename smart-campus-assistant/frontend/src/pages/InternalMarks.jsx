import { useEffect, useState } from 'react';
import { Award, TrendingUp, BookOpen } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatCard from '../components/common/StatCard';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import MarksTrendChart from '../components/charts/MarksTrendChart';
import { campusService } from '../services/campusService';
import { useToast } from '../hooks/useToast';
import { formatDate, getErrorMessage } from '../utils/formatters';

export default function InternalMarks() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadMarks() {
      try {
        const res = await campusService.getMarks();
        setData(res);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load internal marks'));
      } finally {
        setLoading(false);
      }
    }
    loadMarks();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Internal Marks">
        <LoadingSpinner label="Loading internal assessment marks..." />
      </DashboardLayout>
    );
  }

  const byCourse = data?.by_course || [];
  const records = data?.records || [];
  const totalObtained = byCourse.reduce((acc, c) => acc + c.total_obtained, 0);
  const totalMax = byCourse.reduce((acc, c) => acc + c.total_max, 0);

  return (
    <DashboardLayout title="Internal Marks">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Overall Average"
            value={`${data?.overall_average_percentage || 0}%`}
            subtitle="Across internal assessments"
            icon={TrendingUp}
            accent="emerald"
          />
          <StatCard
            title="Cumulative Total"
            value={`${totalObtained} / ${totalMax}`}
            subtitle="Marks scored vs maximum"
            icon={Award}
            accent="emerald"
          />
          <StatCard
            title="Courses Assessed"
            value={byCourse.length}
            subtitle={`${records.length} evaluation components`}
            icon={BookOpen}
            accent="sky"
          />
        </div>

        <MarksTrendChart data={byCourse} />

        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Subject-wise Total Marks</h2>
          <DataTable
            columns={[
              { key: 'course_code', label: 'Code' },
              { key: 'course_name', label: 'Subject' },
              {
                key: 'assessments',
                label: 'Components',
                render: (row) => (
                  <div className="flex flex-wrap gap-1.5">
                    {row.assessments.map((a, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded bg-[#10151c] border border-[#232d3b] text-slate-300"
                      >
                        {a.assessment_name}: <strong className="text-emerald-400">{a.marks_obtained}</strong>/{a.max_marks}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                key: 'total',
                label: 'Total Marks',
                render: (row) => `${row.total_obtained} / ${row.total_max}`,
              },
              {
                key: 'percentage',
                label: 'Percentage',
                render: (row) => (
                  <span className="font-semibold text-emerald-400">{row.percentage}%</span>
                ),
              },
              {
                key: 'grade',
                label: 'Grade',
                render: (row) => (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    {row.grade}
                  </span>
                ),
              },
            ]}
            rows={byCourse}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white mb-3">Detailed Assessment Ledger</h2>
          <DataTable
            columns={[
              { key: 'course_code', label: 'Code' },
              { key: 'course_name', label: 'Course' },
              { key: 'assessment_name', label: 'Assessment' },
              {
                key: 'score',
                label: 'Score',
                render: (row) => `${row.marks_obtained} / ${row.max_marks}`,
              },
              { key: 'grade', label: 'Grade' },
              {
                key: 'recorded_at',
                label: 'Recorded',
                render: (row) => formatDate(row.recorded_at),
              },
            ]}
            rows={records}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

