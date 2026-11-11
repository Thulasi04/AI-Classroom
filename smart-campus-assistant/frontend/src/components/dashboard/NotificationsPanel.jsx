import { Bell, Check } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export default function NotificationsPanel({ notifications = [], onMarkRead }) {
  return (
    <div className="campus-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Recent Notifications</h3>
        </div>
        <span className="text-xs text-slate-400">{notifications.length} items</span>
      </div>

      {notifications.length === 0 ? (
        <p className="text-xs text-slate-500 py-4 text-center">No notifications right now.</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-lg border transition-colors ${
                n.is_read
                  ? 'bg-[#10151c] border-[#1f2835]'
                  : 'bg-emerald-950/20 border-emerald-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{n.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1b2430] text-slate-300 uppercase">
                      {n.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                  <p className="text-[11px] text-slate-500 mt-1.5">{formatDateTime(n.created_at)}</p>
                </div>
                {!n.is_read && onMarkRead && n.user_id && (
                  <button
                    onClick={() => onMarkRead(n.id)}
                    className="p-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

