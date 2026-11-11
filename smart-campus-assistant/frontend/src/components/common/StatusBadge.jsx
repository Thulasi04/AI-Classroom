const STATUS_STYLES = {
  present: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  eligible: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  operational: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  resolved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  selected: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  indexed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  late: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  limited: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  shortlisted: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'interview scheduled': 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  applied: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  open: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  absent: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  ineligible: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  closed: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  high: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export default function StatusBadge({ status, label }) {
  const normalized = String(status || '').toLowerCase().trim();
  const style =
    STATUS_STYLES[normalized] || 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  const text = label || String(status || 'Unknown').replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${style}`}
    >
      {text}
    </span>
  );
}

