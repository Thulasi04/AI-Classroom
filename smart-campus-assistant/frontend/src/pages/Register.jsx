import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/formatters';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Artificial Intelligence & Data Science',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Information Technology',
];

export default function Register() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    register_number: '',
    department: DEPARTMENTS[0],
    semester: 6,
    section: 'A',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const validate = () => {
    if (form.full_name.trim().length < 2) return 'Full name must be at least 2 characters.';
    if (!form.email.includes('@')) return 'Valid email address is required.';
    if (form.register_number.trim().length < 4) return 'Register number is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirm_password) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errMsg = validate();
    if (errMsg) {
      setError(errMsg);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        register_number: form.register_number.trim().toUpperCase(),
        department: form.department,
        semester: Number(form.semester),
        section: form.section.trim() || 'A',
        phone: form.phone.trim() || null,
        password: form.password,
      });
      toast.success('Student account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const msg = getErrorMessage(err, 'Registration failed.');
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090c10] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Student Registration</h1>
          <p className="text-sm text-slate-400 mt-1">
            Register your university profile to access Smart Campus Assistant
          </p>
        </div>

        <div className="campus-card p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={handleChange('full_name')}
                  placeholder="Priya Sharma"
                  className="campus-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Register Number
                </label>
                <input
                  type="text"
                  value={form.register_number}
                  onChange={handleChange('register_number')}
                  placeholder="22CS1045"
                  className="campus-input uppercase"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                University Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="priya.sharma@campus.edu"
                className="campus-input"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Department</label>
                <select
                  value={form.department}
                  onChange={handleChange('department')}
                  className="campus-input"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Semester</label>
                <select
                  value={form.semester}
                  onChange={handleChange('semester')}
                  className="campus-input"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Sem {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Section</label>
                <input
                  type="text"
                  value={form.section}
                  onChange={handleChange('section')}
                  placeholder="A"
                  maxLength={5}
                  className="campus-input"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="+91 98765 43210"
                  className="campus-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="Min 8 characters"
                  className="campus-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={handleChange('confirm_password')}
                  placeholder="Repeat password"
                  className="campus-input"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="campus-btn-primary w-full py-2.5">
              <UserPlus className="w-4 h-4" />
              <span>{submitting ? 'Creating Account...' : 'Register Student Account'}</span>
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-5">
            Already registered?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

