import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';

export default function AttendanceBarChart({ data = [] }) {
  return (
    <div className="campus-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Subject-wise Attendance (%)</h3>
          <p className="text-xs text-slate-400">Minimum required threshold: 75%</p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222b38" />
            <XAxis
              dataKey="course_code"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#252f3d' }}
            />
            <YAxis
              domain={[0, 100]}
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
              formatter={(value) => [`${value}%`, 'Attendance']}
            />
            <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="4 4" />
            <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {data.map((entry, idx) => (
                <Cell
                  key={entry.course_code || idx}
                  fill={entry.percentage >= 75 ? '#10b981' : '#f43f5e'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

