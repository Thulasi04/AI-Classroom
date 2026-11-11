import { useEffect, useState } from 'react';
import { Briefcase, MapPin, DollarSign, CheckCircle2, Megaphone } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { campusService } from '../services/campusService';
import { useToast } from '../hooks/useToast';
import { formatDate, getErrorMessage } from '../utils/formatters';

export default function Placement() {
  const [opportunities, setOpportunities] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [opps, apps] = await Promise.all([
        campusService.getPlacements(),
        campusService.getMyApplications(),
      ]);
      setOpportunities(opps);
      setApplications(apps);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load placement portal'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async (id, company) => {
    setApplyingId(id);
    try {
      await campusService.applyForPlacement(id);
      toast.success(`Application submitted to ${company}`);
      await loadData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not submit application'));
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Placement Portal">
        <LoadingSpinner label="Loading campus placement opportunities..." />
      </DashboardLayout>
    );
  }

  const announcements = opportunities.filter((o) => o.announcement);

  return (
    <DashboardLayout title="Placement Portal">
      <div className="space-y-6">
        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="campus-card p-5 border-emerald-500/25">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Placement Cell Announcements</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {announcements.map((a) => (
                <div key={`pann-${a.id}`} className="p-3 rounded-lg bg-[#10151c] border border-[#222c3a] text-xs">
                  <span className="font-semibold text-emerald-400">{a.company_name}: </span>
                  <span className="text-slate-300">{a.announcement}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Applications Status */}
        {applications.length > 0 && (
          <div className="campus-card p-5">
            <h2 className="text-sm font-semibold text-white mb-3">My Placement Applications</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-lg bg-[#10151c] border border-[#222c3a] flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{app.company_name}</p>
                    <p className="text-xs text-slate-400">{app.role_title}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Applied: {formatDate(app.applied_at)}
                    </p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities List */}
        {opportunities.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No active placement drives"
            description="Check back soon for new campus recruitment opportunities."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="campus-card p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">{opp.company_name}</h3>
                      <p className="text-sm text-emerald-400 font-medium">{opp.role_title}</p>
                    </div>
                    <StatusBadge
                      status={opp.is_eligible ? 'eligible' : 'ineligible'}
                      label={opp.is_eligible ? 'Eligible' : 'Not Eligible'}
                    />
                  </div>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">{opp.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-4 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#10151c] border border-[#222c3a]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-400" /> Package
                      </span>
                      <span className="font-semibold text-white mt-0.5 block">
                        {opp.package_lpa} LPA
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#10151c] border border-[#222c3a]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-400" /> Location
                      </span>
                      <span className="font-semibold text-white mt-0.5 block">{opp.location}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#10151c] border border-[#222c3a]">
                      <span className="text-slate-400 block">Min CGPA</span>
                      <span className="font-semibold text-white mt-0.5 block">
                        {opp.min_cgpa}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-400">
                    <span>Eligible Departments: </span>
                    <span className="text-slate-200">{opp.eligible_departments}</span>
                  </div>
                  {!opp.is_eligible && opp.eligibility_reason && (
                    <p className="text-xs text-rose-400 mt-1">{opp.eligibility_reason}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#222c3a] flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">
                    Deadline: <strong className="text-slate-200">{formatDate(opp.deadline)}</strong>
                  </span>
                  {opp.application_status ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <StatusBadge status={opp.application_status} />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleApply(opp.id, opp.company_name)}
                      disabled={!opp.is_eligible || applyingId === opp.id}
                      className="campus-btn-primary py-2 px-4 text-xs"
                    >
                      {applyingId === opp.id ? 'Applying...' : 'Apply Now'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

