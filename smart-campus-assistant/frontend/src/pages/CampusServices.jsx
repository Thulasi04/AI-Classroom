import { useEffect, useState } from 'react';
import { BookOpen, Home, Bus, UtensilsCrossed, HeartPulse, MapPin, Clock, Phone } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { campusService } from '../services/campusService';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/formatters';

const CATEGORIES = [
  { key: '', label: 'All Facilities' },
  { key: 'library', label: 'Library' },
  { key: 'hostel', label: 'Hostel' },
  { key: 'transport', label: 'Transport' },
  { key: 'canteen', label: 'Canteen' },
  { key: 'medical', label: 'Medical & Sports' },
];

const CATEGORY_ICON = {
  library: BookOpen,
  hostel: Home,
  transport: Bus,
  canteen: UtensilsCrossed,
  medical: HeartPulse,
};

export default function CampusServices() {
  const [services, setServices] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadServices() {
      setLoading(true);
      try {
        const res = await campusService.getCampusServices(category || undefined);
        setServices(res);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load campus services'));
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, [category]);

  return (
    <DashboardLayout title="Campus Services">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                category === c.key
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                  : 'bg-[#141a22] border-[#232d3b] text-slate-400 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner label="Loading campus facilities..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((svc) => {
              const Icon = CATEGORY_ICON[svc.category] || BookOpen;
              return (
                <div key={svc.id} className="campus-card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{svc.name}</h3>
                        <span className="text-xs uppercase tracking-wider text-slate-400">
                          {svc.category}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={svc.status} />
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{svc.details}</p>

                  <div className="pt-3 border-t border-[#222c3a] space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{svc.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{svc.timings}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{svc.contact_info}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

