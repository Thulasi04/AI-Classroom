import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function MarksTrendChart({ data = [] }) {
  const chartData = data.map((item) => ({
    course: item.course_code,
    obtained: item.total_obtained,
    max: item.total_max,
    percentage: item.percentage,
  }));

  return (
    <div className="campus-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white">Internal Marks Performance</h3>
        <p className="text-xs text-slate-400">Obtained marks vs maximum marks per course</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222b38" />
            <XAxis
              dataKey="course"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#252f3d' }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#252f3d' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#11161d',
                borderColor: '#252f3d',
                borderRadius: '0.5rem',
                color: '#f8fafc',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="obtained" name="Marks Obtained" fill="#10b981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="max" name="Max Marks" fill="#334155" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

