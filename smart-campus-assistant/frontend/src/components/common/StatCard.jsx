export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accent = 'emerald',
}) {
  const accentMap = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  };

  return (
    <div className="campus-card p-5 hover:border-[#324052] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
          {trend && (
            <p className="mt-2 text-xs font-medium text-emerald-400">{trend}</p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${accentMap[accent] || accentMap.emerald}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

