import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Shield, UserCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/formatters';

export default function Login() {
  const [portal, setPortal] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validate = () => {
    if (!email.trim() || !email.includes('@')) {
      return 'Please enter a valid university email address.';
    }
    if (!password || password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErr = validate();
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const res = await login({ email: email.trim(), password, portal });
      toast.success(`Welcome back, ${res.user.full_name}`);
      if (res.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Invalid login credentials.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemoCredentials = (role) => {
    if (role === 'admin') {
      setPortal('admin');
      setEmail('admin@campus.edu');
      setPassword('Admin@1234');
    } else {
      setPortal('student');
      setEmail('arjun.mehta@campus.edu');
      setPassword('Student@1234');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#090c10] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Smart Campus Assistant
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-Powered University Portal & Multi-Agent Assistant
          </p>
        </div>

        <div className="campus-card p-6">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0d1117] border border-[#222b38] mb-5">
            <button
              type="button"
              onClick={() => {
                setPortal('student');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                portal === 'student'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Student Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPortal('admin');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                portal === 'admin'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin Login</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                University Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={portal === 'admin' ? 'admin@campus.edu' : 'student@campus.edu'}
                className="campus-input"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="campus-input pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="campus-btn-primary w-full py-2.5">
              <span>{submitting ? 'Signing in...' : `Sign in as ${portal === 'admin' ? 'Admin' : 'Student'}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#222c3a]">
            <p className="text-[11px] text-slate-400 mb-2">Seeded Demo Accounts:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials('student')}
                className="campus-btn-secondary py-1.5 text-xs"
              >
                Use Demo Student
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin')}
                className="campus-btn-secondary py-1.5 text-xs"
              >
                Use Demo Admin
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            New student on campus?{' '}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Create Student Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

