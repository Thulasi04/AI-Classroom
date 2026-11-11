import { useEffect, useState } from 'react';
import { LifeBuoy, Plus } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { campusService } from '../services/campusService';
import { useToast } from '../hooks/useToast';
import { formatDateTime, getErrorMessage } from '../utils/formatters';

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: 'academics',
    priority: 'medium',
    subject: '',
    description: '',
  });
  const { toast } = useToast();

  const loadTickets = async () => {
    setLoading(true);
    try {
      const list = await campusService.getMyTickets();
      setTickets(list);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load support tickets'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.subject.trim().length < 4 || form.description.trim().length < 10) {
      toast.warning('Please provide a clear subject and detailed description.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await campusService.createTicket({
        ...form,
        subject: form.subject.trim(),
        description: form.description.trim(),
      });
      toast.success(`Support ticket ${created.ticket_code} created`);
      setForm({ category: 'academics', priority: 'medium', subject: '', description: '' });
      setTickets((prev) => [created, ...prev]);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit support ticket'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Support Tickets">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Ticket */}
        <form onSubmit={handleSubmit} className="campus-card p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Raise New Support Ticket</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              className="campus-input"
            >
              <option value="academics">Academics & Exams</option>
              <option value="hostel">Hostel & Facilities</option>
              <option value="library">Library</option>
              <option value="transport">Campus Transport</option>
              <option value="placement">Placement Cell</option>
              <option value="it_support">Portal / IT Support</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              className="campus-input"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Subject</label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Brief summary of your issue"
              className="campus-input"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Provide complete details so campus support can resolve it quickly..."
              className="campus-input"
              required
            />
          </div>

          <button type="submit" disabled={submitting} className="campus-btn-primary w-full">
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>

        {/* Ticket History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-white">Your Ticket History</h2>
          {loading ? (
            <LoadingSpinner label="Loading support tickets..." />
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="No support tickets yet"
              description="Raise a ticket on the left if you need assistance from campus staff."
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div key={t.id} className="campus-card p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-emerald-400">
                        {t.ticket_code}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{t.subject}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={t.priority} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{t.description}</p>

                  {t.admin_response && (
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/25 text-xs">
                      <span className="font-semibold text-emerald-400 block mb-0.5">
                        Admin Response:
                      </span>
                      <span className="text-slate-200">{t.admin_response}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="capitalize">Category: {t.category.replace('_', ' ')}</span>
                    <span>Created: {formatDateTime(t.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

