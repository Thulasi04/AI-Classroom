import { Menu, LogOut, Bot, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

export default function Header({ title, onMenuClick }) {
  const { user, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out securely');
    navigate('/login');
  };

  return (
    <header className="h-16 bg-[#0e1319]/90 backdrop-blur-md border-b border-[#202936] px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a222d]"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base lg:text-lg font-semibold text-white">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => navigate('/chatbot')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Ask AI</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        )}

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141a22] border border-[#232d3b]">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-slate-300">{user?.email}</span>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18202b] hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-500/30 border border-[#263140] text-slate-300 text-xs font-medium transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

