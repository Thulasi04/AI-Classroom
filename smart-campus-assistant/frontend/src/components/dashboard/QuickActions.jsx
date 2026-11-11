import { useNavigate } from 'react-router-dom';
import { Bot, Upload, LifeBuoy, Briefcase } from 'lucide-react';

const ACTIONS = [
  { label: 'AI Campus Chat', to: '/chatbot', icon: Bot, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' },
  { label: 'Upload Document', to: '/documents', icon: Upload, color: 'text-sky-400 bg-sky-500/10 border-sky-500/25' },
  { label: 'Placement Portal', to: '/placements', icon: Briefcase, color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  { label: 'Raise Ticket', to: '/support', icon: LifeBuoy, color: 'text-rose-400 bg-rose-500/10 border-rose-500/25' },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="campus-card p-5">
      <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#10151c] hover:bg-[#19212c] border border-[#222c3a] text-left transition-colors"
            >
              <div className={`p-2 rounded-lg border ${item.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-200">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

