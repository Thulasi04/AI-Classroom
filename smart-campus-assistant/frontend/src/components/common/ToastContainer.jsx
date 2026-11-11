import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const ICON_MAP = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLE_MAP = {
  success: 'bg-[#121f1a] border-emerald-500/40 text-emerald-200',
  error: 'bg-[#211316] border-rose-500/40 text-rose-200',
  warning: 'bg-[#211c12] border-amber-500/40 text-amber-200',
  info: 'bg-[#131b24] border-sky-500/40 text-sky-200',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICON_MAP[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md ${STYLE_MAP[t.type] || STYLE_MAP.info}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed flex-1">{t.message}</p>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

