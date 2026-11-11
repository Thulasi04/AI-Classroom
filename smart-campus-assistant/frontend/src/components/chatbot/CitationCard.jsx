import { FileText, Database } from 'lucide-react';

export default function CitationCard({ citation }) {
  const isDb = citation.source_type === 'sqlite';
  return (
    <div className="p-2.5 rounded-lg bg-[#0d1218] border border-[#222d3b] text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-emerald-400">
          {isDb ? <Database className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
          <span className="truncate">{citation.title || citation.source || 'Campus Source'}</span>
        </div>
        {citation.score !== undefined && citation.score !== null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#18212c] text-slate-400">
            Score {Number(citation.score).toFixed(2)}
          </span>
        )}
      </div>
      {citation.snippet && (
        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{citation.snippet}</p>
      )}
      {citation.chunk_index !== undefined && citation.chunk_index !== null && (
        <p className="text-[10px] text-slate-500 mt-1">
          Chunk #{citation.chunk_index} {citation.category ? `• ${citation.category}` : ''}
        </p>
      )}
    </div>
  );
}

