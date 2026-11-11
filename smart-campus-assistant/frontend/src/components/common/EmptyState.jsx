import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = 'No records match your current view.',
  action,
}) {
  return (
    <div className="campus-card p-10 text-center flex flex-col items-center justify-center">
      <div className="p-3 rounded-full bg-[#1c242e] border border-[#2a3544] text-slate-400 mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

