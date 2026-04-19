'use client';
import { useState, useEffect, useCallback } from 'react';
import { BookOpen, CheckCircle, Clock, PlayCircle, Star, Award, X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { groupTrainingService } from '@/services/groupTraining.service';
import { memberTrainingService } from '@/services/memberTraining.service';
import { certificateService } from '@/services/certificate.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';
import { useAuthStore } from '@/store/authStore';

interface GroupTraining {
  _id: string;
  training: { _id: string; title: string; purpose?: string };
  group: { _id: string; title: string };
  status: 'Pending' | 'Started' | 'Completed';
  statusHistory: { status: string; note?: string; updatedBy: { fullName: string }; date: string }[];
  scheduledDate?: string;
  startedAt?: string;
  completedAt?: string;
}
interface MemberTraining {
  _id: string;
  member: { _id: string; fullName: string; phone: string; userId?: string };
  rating: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Started: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};
const STATUS_ICON: Record<string, React.ElementType> = {
  Pending: Clock, Started: PlayCircle, Completed: CheckCircle,
};

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

export function InstructorDashboard() {
  const { user } = useAuthStore();
  const [groupTrainings, setGroupTrainings] = useState<GroupTraining[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, started: 0 });
  const [loading, setLoading] = useState(true);

  const [activeGT, setActiveGT] = useState<GroupTraining | null>(null);
  const [memberTrainings, setMemberTrainings] = useState<MemberTraining[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [statusModal, setStatusModal] = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [certModal, setCertModal] = useState(false);

  const [statusForm, setStatusForm] = useState({ status: 'Pending', note: '' });
  const [ratingTarget, setRatingTarget] = useState<{ mt: MemberTraining | null; value: number }>({ mt: null, value: 0 });
  const [certTarget, setCertTarget] = useState<{ memberId: string; notes: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  const fetchMine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await groupTrainingService.getMine();
      const gts: GroupTraining[] = res.data.data.groupTrainings;
      setGroupTrainings(gts);
      setStats({
        total: gts.length,
        completed: gts.filter((g) => g.status === 'Completed').length,
        started: gts.filter((g) => g.status === 'Started').length,
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMine(); }, [fetchMine]);

  const loadMembers = async (gt: GroupTraining) => {
    setActiveGT(gt);
    setMemberSearch('');
    const res = await memberTrainingService.getByGroupTraining(gt._id);
    setMemberTrainings(res.data.data);
  };

  const openStatus = (gt: GroupTraining) => { setActiveGT(gt); setStatusForm({ status: gt.status, note: '' }); setStatusModal(true); };
  const openRating = async (gt: GroupTraining) => { await loadMembers(gt); setRatingModal(true); };
  const openCert = async (gt: GroupTraining) => { await loadMembers(gt); setCertTarget(null); setCertModal(true); };

  const handleStatusUpdate = async () => {
    if (!activeGT) return;
    setSubmitting(true);
    try {
      await groupTrainingService.updateStatus(activeGT._id, statusForm);
      notify('success', 'Status updated.');
      setStatusModal(false);
      fetchMine();
    } catch { notify('error', 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleRate = async () => {
    if (!ratingTarget.mt) return;
    setSubmitting(true);
    try {
      await memberTrainingService.rate(ratingTarget.mt._id, ratingTarget.value);
      notify('success', 'Rating saved.');
      setRatingTarget({ mt: null, value: 0 });
      if (activeGT) {
        const res = await memberTrainingService.getByGroupTraining(activeGT._id);
        setMemberTrainings(res.data.data);
      }
    } catch { notify('error', 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleIssueCert = async () => {
    if (!certTarget || !activeGT) return;
    setSubmitting(true);
    try {
      await certificateService.issue({ memberId: certTarget.memberId, groupTrainingId: activeGT._id, notes: certTarget.notes });
      notify('success', 'Certificate issued.');
      setCertTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed.');
    } finally { setSubmitting(false); }
  };

  const filteredMembers = memberSearch.trim()
    ? memberTrainings.filter((mt) =>
        mt.member.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
        mt.member.phone.includes(memberSearch) ||
        (mt.member.userId ?? '').toLowerCase() === memberSearch.toLowerCase()
      )
    : memberTrainings;

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Instructor Dashboard</h1>
        <p className="text-[var(--muted)] text-sm">Welcome, {user?.fullName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Assigned', value: stats.total, icon: BookOpen, color: 'text-purple-500' },
          { label: 'In Progress', value: stats.started, icon: PlayCircle, color: 'text-blue-500' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-500' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4 flex items-center gap-3">
              <Icon className={`w-6 h-6 ${s.color}`} />
              <div>
                <p className="text-xl font-bold text-[var(--foreground)]">{s.value}</p>
                <p className="text-xs text-[var(--muted)]">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Training list */}
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground)] mb-3">My Assigned Trainings</h2>
        {loading ? (
          <p className="text-center py-12 text-[var(--muted)]">Loading...</p>
        ) : groupTrainings.length === 0 ? (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-10 text-center text-[var(--muted)] text-sm">
            No trainings assigned to you yet.
          </div>
        ) : (
          <div className="space-y-3">
            {groupTrainings.map((gt) => {
              const StatusIcon = STATUS_ICON[gt.status];
              const isExpanded = expandedId === gt._id;
              return (
                <div key={gt._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                  <div className="p-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--foreground)]">{gt.training.title}</p>
                      <Link href={`/dashboard/groups/${gt.group._id}`} className="text-xs text-[var(--primary)] hover:underline">{gt.group.title}</Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[gt.status]}`}>
                        <StatusIcon className="w-3 h-3" /> {gt.status}
                      </span>
                      <button onClick={() => setExpandedId(isExpanded ? null : gt._id)} className="p-1 hover:text-[var(--primary)] transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-[var(--card-border)] px-4 py-3 space-y-3">
                      {gt.training.purpose && (
                        <p className="text-xs text-[var(--muted)]">{gt.training.purpose}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openStatus(gt)} className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors">
                          Update Status
                        </button>
                        <button onClick={() => openRating(gt)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors">
                          <Star className="w-3 h-3" /> Rate Members
                        </button>
                        <button onClick={() => openCert(gt)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors">
                          <Award className="w-3 h-3" /> Issue Certificate
                        </button>
                      </div>
                      {/* Last status entry */}
                      {gt.statusHistory.length > 0 && (() => {
                        const last = gt.statusHistory[gt.statusHistory.length - 1];
                        return (
                          <p className="text-xs text-[var(--muted)]">
                            Last update: <strong>{last.status}</strong> by {last.updatedBy?.fullName} · {new Date(last.date).toLocaleString()}
                            {last.note && ` — ${last.note}`}
                          </p>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Status Modal */}
      <Modal isOpen={statusModal} onClose={() => setStatusModal(false)} title="Update Training Status" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Status</label>
            <select value={statusForm.status} onChange={(e) => setStatusForm((f) => ({ ...f, status: e.target.value }))} className={inputClass}>
              {['Pending', 'Started', 'Completed'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Note</label>
            <input value={statusForm.note} onChange={(e) => setStatusForm((f) => ({ ...f, note: e.target.value }))} className={inputClass} placeholder="Optional note..." />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setStatusModal(false)} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)]">Cancel</button>
            <button onClick={handleStatusUpdate} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60">{submitting ? 'Saving...' : 'Update'}</button>
          </div>
        </div>
      </Modal>

      {/* Rating Modal */}
      <Modal isOpen={ratingModal} onClose={() => { setRatingModal(false); setRatingTarget({ mt: null, value: 0 }); }} title={`Rate Members — ${activeGT?.training.title}`} size="lg">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
            <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search by name, phone, or User ID..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs" />
          </div>
          {filteredMembers.length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-4">No members found.</p>
          ) : filteredMembers.map((mt) => (
            <div key={mt._id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--accent)]">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">{mt.member.fullName}</p>
                <p className="text-xs text-[var(--muted)]">{mt.member.phone}{mt.member.userId ? ` · ${mt.member.userId}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {ratingTarget.mt?._id === mt._id ? (
                  <>
                    <input type="number" min={0} max={10} step={0.5} value={ratingTarget.value} onChange={(e) => setRatingTarget((r) => ({ ...r, value: Number(e.target.value) }))} className="w-16 px-2 py-1 text-sm border border-[var(--card-border)] rounded bg-[var(--background)] text-center" />
                    <button onClick={handleRate} disabled={submitting} className="px-3 py-1 bg-[var(--primary)] text-white rounded text-xs font-medium disabled:opacity-60">Save</button>
                    <button onClick={() => setRatingTarget({ mt: null, value: 0 })}><X className="w-4 h-4 text-[var(--muted)]" /></button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      {mt.rating !== null ? mt.rating : '—'}
                    </span>
                    <button onClick={() => setRatingTarget({ mt, value: mt.rating ?? 0 })} className="px-2 py-1 text-xs bg-[var(--card)] border border-[var(--card-border)] rounded hover:border-[var(--primary)] transition-colors">Rate</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Certificate Modal */}
      <Modal isOpen={certModal} onClose={() => { setCertModal(false); setCertTarget(null); }} title={`Issue Certificate — ${activeGT?.training.title}`} size="lg">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
            <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search by name, phone, or User ID..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs" />
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-4">No members found.</p>
            ) : filteredMembers.map((mt) => (
              <label key={mt._id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${certTarget?.memberId === mt.member._id ? 'bg-[var(--primary)]/10 border border-[var(--primary)]' : 'bg-[var(--accent)] hover:bg-[var(--accent)]'}`}>
                <input type="radio" name="certMember" value={mt.member._id} checked={certTarget?.memberId === mt.member._id} onChange={() => setCertTarget({ memberId: mt.member._id, notes: certTarget?.notes ?? '' })} className="accent-[var(--primary)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{mt.member.fullName}</p>
                  <p className="text-xs text-[var(--muted)]">{mt.member.phone}{mt.member.userId ? ` · ${mt.member.userId}` : ''}</p>
                </div>
              </label>
            ))}
          </div>
          {certTarget?.memberId && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Notes <span className="text-[var(--muted)] font-normal">(optional)</span></label>
              <input value={certTarget.notes} onChange={(e) => setCertTarget((t) => t ? { ...t, notes: e.target.value } : null)} className={inputClass} placeholder="Additional notes..." />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => { setCertModal(false); setCertTarget(null); }} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)]">Cancel</button>
            <button onClick={handleIssueCert} disabled={submitting || !certTarget?.memberId} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60">{submitting ? 'Issuing...' : 'Issue Certificate'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
