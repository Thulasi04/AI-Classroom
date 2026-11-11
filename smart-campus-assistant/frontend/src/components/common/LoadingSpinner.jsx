import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading...', fullScreen = false }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
      <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
      <p className="text-sm">{label}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#090c10] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}

