import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export default function ConversationList({
  conversations = [],
  activeId,
  onSelect,
  onCreate,
  onDelete,
}) {
  return (
    <div className="campus-card p-3 flex flex-col h-full">
      <button onClick={onCreate} className="campus-btn-primary w-full mb-3">
        <Plus className="w-4 h-4" />
        <span>New Conversation</span>
      </button>

      <div className="flex-1 overflow-y-auto space-y-1.5">
        {conversations.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No conversations yet.</p>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`group flex items-center justify-between gap-2 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-white'
                    : 'bg-[#10151c] border-transparent hover:border-[#242f3e] text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{conv.title}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatDateTime(conv.updated_at || conv.created_at)}
                    </p>
                  </div>
                </div>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-400 transition-opacity"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

