import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  CalendarCheck,
  Award,
  Clock,
  Briefcase,
  Building2,
  FileText,
  LifeBuoy,
  ShieldCheck,
  GraduationCap,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const STUDENT_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chatbot', label: 'AI Assistant', icon: Bot },
  { to: '/academics', label: 'Academic Info', icon: BookOpen },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/marks', label: 'Internal Marks', icon: Award },
  { to: '/timetable', label: 'Exam Timetable', icon: Clock },
  { to: '/placements', label: 'Placements', icon: Briefcase },
  { to: '/campus-services', label: 'Campus Services', icon: Building2 },
  { to: '/documents', label: 'Documents & RAG', icon: FileText },
  { to: '/support', label: 'Support Tickets', icon: LifeBuoy },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const { isAdmin, user, studentProfile } = useAuth();

  const navItems = isAdmin
    ? [...STUDENT_NAV, { to: '/admin', label: 'Admin Console', icon: ShieldCheck }]
    : STUDENT_NAV;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0e1319] border-r border-[#202936] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#202936]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight block leading-none">
                Smart Campus
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">AI Assistant</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a222d]"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-[#171e28] border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#202936] bg-[#0b0f14]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-semibold text-sm">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || 'Campus User'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {isAdmin
                  ? 'Administrator'
                  : studentProfile?.register_number || user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

