import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function AttendanceDonutChart({ present = 0, late = 0, absent = 0 }) {
  const chartData = [
    { name: 'Present', value: present, color: '#10b981' },
    { name: 'Late', value: late, color: '#f59e0b' },
    { name: 'Absent', value: absent, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  return (
    <div className="campus-card p-5">
      <h3 className="text-sm font-semibold text-white mb-1">Attendance Distribution</h3>
      <p className="text-xs text-slate-400 mb-4">Cumulative session breakdown</p>
      <div className="h-72">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No attendance logs recorded yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={4}
              >
                {chartData.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#11161d',
                  borderColor: '#252f3d',
                  borderRadius: '0.5rem',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

