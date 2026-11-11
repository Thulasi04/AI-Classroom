import { Bot, User, ShieldAlert, Paperclip } from 'lucide-react';
import CitationCard from './CitationCard';
import { formatDateTime } from '../../utils/formatters';

export default function ChatMessageBubble({ message }) {
  const isUser = message.sender === 'user';
  const citations = message.citations || [];

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div
        className={`max-w-[85%] lg:max-w-[75%] rounded-2xl px-4 py-3 border ${
          isUser
            ? 'bg-emerald-600/20 border-emerald-500/30 text-slate-100 rounded-tr-sm'
            : 'bg-[#141a22] border-[#252f3d] text-slate-200 rounded-tl-sm'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-[11px] font-semibold text-slate-300">
            {isUser ? 'You' : 'Smart Campus AI'}
          </span>
          {!isUser && message.agent_used && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
              {message.agent_used}
            </span>
          )}
          {message.guardrail_triggered && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
              <ShieldAlert className="w-3 h-3" />
              Guardrail
            </span>
          )}
          {message.created_at && (
            <span className="text-[10px] text-slate-500 ml-auto">
              {formatDateTime(message.created_at)}
            </span>
          )}
        </div>

        {message.attachment_name && (
          <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0e1319] border border-[#263140] text-xs text-slate-300">
            <Paperclip className="w-3 h-3 text-emerald-400" />
            <span>{message.attachment_name}</span>
          </div>
        )}

        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>

        {citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[#222c3a]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Sources & Citations ({citations.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {citations.map((cit, idx) => (
                <CitationCard key={idx} citation={cit} />
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-[#1c242e] border border-[#2c3849] flex items-center justify-center text-slate-300 shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

