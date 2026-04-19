'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, BookOpen, BarChart3, Plus, Star,
  Award, Clock, CheckCircle, PlayCircle, ChevronDown, X, UserCheck, Search,
} from 'lucide-react';
import { groupService } from '@/services/group.service';
import { trainingService } from '@/services/training.service';
import { groupTrainingService } from '@/services/groupTraining.service';
import { memberTrainingService } from '@/services/memberTraining.service';
import { certificateService } from '@/services/certificate.service';
import { userService } from '@/services/user.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';
import { useAuthStore } from '@/store/authStore';

interface User { _id: string; fullName: string; phone: string; role: string; email?: string; userId?: string }
interface Training { _id: string; title: string; purpose?: string }
interface StatusEntry { status: string; note?: string; updatedBy: { fullName: string }; date: string }
interface GroupTraining {
  _id: string;
  training: Training;
  instructors: User[];
  status: 'Pending' | 'Started' | 'Completed';
  statusHistory: StatusEntry[];
  scheduledDate?: string;
  startedAt?: string;
  completedAt?: string;
}
interface MemberTraining {
  _id: string;
  member: User;
  training?: { _id: string; title: string };
  groupTraining?: { status: string };
  rating: number | null;
  ratedBy?: { fullName: string };
  ratedAt?: string;
}
interface Certificate {
  _id: string;
  certificateNo: string;
  member: User;
  training: Training;
  issuedBy: { fullName: string };
  issuedAt: string;
  status: 'Active' | 'Revoked';
}
interface Group {
  _id: string;
  title: string;
  zone?: { title: string };
  category?: { title: string };
  members: User[];
  org: { title: string };
  isActive: boolean;
}

type Tab = 'overview' | 'trainings' | 'members';

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Started: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};
const STATUS_ICON: Record<string, React.ElementType> = {
  Pending: Clock,
  Started: PlayCircle,
  Completed: CheckCircle,
};

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { user: authUser } = useAuthStore();

  const [group, setGroup] = useState<Group | null>(null);
  const [groupTrainings, setGroupTrainings] = useState<GroupTraining[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  // modals
  const [assignModal, setAssignModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [instructorModal, setInstructorModal] = useState(false);
  const [ratingModal, setRatingModal] = useState(false);
  const [certModal, setCertModal] = useState(false);

  const [activeGT, setActiveGT] = useState<GroupTraining | null>(null);
  const [memberTrainings, setMemberTrainings] = useState<MemberTraining[]>([]);
  const [allGroupMemberTrainings, setAllGroupMemberTrainings] = useState<MemberTraining[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [modalMemberSearch, setModalMemberSearch] = useState('');

  // form state
  const [assignForm, setAssignForm] = useState({ trainingId: '', instructors: [] as string[], scheduledDate: '' });
  const [statusForm, setStatusForm] = useState({ status: 'Pending', note: '' });
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [ratingTarget, setRatingTarget] = useState<{ mt: MemberTraining | null; value: number }>({ mt: null, value: 0 });
  const [certTarget, setCertTarget] = useState<{ memberId: string; notes: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { notification, notify } = useNotification();

  const canManage = ['Super Admin', 'Org Owner', 'Manager'].includes(authUser?.role ?? '');
  const canUpdateStatus = ['Org Owner', 'Manager', 'Instructor'].includes(authUser?.role ?? '');

  const fetchGroup = useCallback(async () => {
    try {
      const res = await groupService.getById(groupId);
      setGroup(res.data.data);
    } catch {
      notify('error', 'Group not found.');
    }
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGroupTrainings = useCallback(async () => {
    const res = await groupTrainingService.getByGroup(groupId);
    setGroupTrainings(res.data.data);
  }, [groupId]);

  const fetchMemberTrainings = useCallback(async (gtId: string) => {
    const res = await memberTrainingService.getByGroupTraining(gtId);
    setMemberTrainings(res.data.data);
  }, []);

  const fetchCertificates = useCallback(async (gtId: string) => {
    const res = await certificateService.getByGroup(groupId);
    setCertificates((res.data.data as Certificate[]).filter((c) => c.training._id === groupTrainings.find(g => g._id === gtId)?.training._id));
  }, [groupId, groupTrainings]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchGroup(),
      fetchGroupTrainings(),
      trainingService.getAll({ limit: '200' }).then((r) => setTrainings(r.data.data.trainings)),
      userService.getAll({ role: 'Instructor', limit: '200' }).then((r) => setInstructors(r.data.data.users)),
      memberTrainingService.getByGroup(groupId).then((r) => setAllGroupMemberTrainings(r.data.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [fetchGroup, fetchGroupTrainings, groupId]);

  useEffect(() => {
    if (activeGT) {
      fetchMemberTrainings(activeGT._id);
      fetchCertificates(activeGT._id);
    }
  }, [activeGT, fetchMemberTrainings, fetchCertificates]);

  const openAssign = () => { setAssignForm({ trainingId: '', instructors: [], scheduledDate: '' }); setAssignModal(true); };
  const openStatus = (gt: GroupTraining) => { setActiveGT(gt); setStatusForm({ status: gt.status, note: '' }); setStatusModal(true); };
  const openInstructors = (gt: GroupTraining) => { setActiveGT(gt); setSelectedInstructors(gt.instructors.map(i => i._id)); setInstructorModal(true); };
  const openMemberRating = (gt: GroupTraining) => { setActiveGT(gt); setModalMemberSearch(''); setRatingModal(true); };
  const openCert = (gt: GroupTraining) => { setActiveGT(gt); setModalMemberSearch(''); setCertModal(true); setCertTarget(null); };

  const handleAssign = async () => {
    if (!assignForm.trainingId) return notify('error', 'Select a training.');
    setSubmitting(true);
    try {
      await groupTrainingService.assign({ groupId, ...assignForm });
      notify('success', 'Training assigned.');
      setAssignModal(false);
      fetchGroupTrainings();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed.');
    } finally { setSubmitting(false); }
  };

  const handleStatusUpdate = async () => {
    if (!activeGT) return;
    setSubmitting(true);
    try {
      await groupTrainingService.updateStatus(activeGT._id, statusForm);
      notify('success', 'Status updated.');
      setStatusModal(false);
      fetchGroupTrainings();
    } catch { notify('error', 'Failed to update status.'); }
    finally { setSubmitting(false); }
  };

  const handleInstructorUpdate = async () => {
    if (!activeGT) return;
    setSubmitting(true);
    try {
      await groupTrainingService.updateInstructors(activeGT._id, selectedInstructors);
      notify('success', 'Instructors updated.');
      setInstructorModal(false);
      fetchGroupTrainings();
    } catch { notify('error', 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleRate = async () => {
    if (!ratingTarget.mt) return;
    setSubmitting(true);
    try {
      await memberTrainingService.rate(ratingTarget.mt._id, ratingTarget.value);
      notify('success', 'Rating saved.');
      if (activeGT) fetchMemberTrainings(activeGT._id);
    } catch { notify('error', 'Failed to rate.'); }
    finally { setSubmitting(false); setRatingTarget({ mt: null, value: 0 }); }
  };

  const handleIssueCert = async () => {
    if (!certTarget || !activeGT) return;
    setSubmitting(true);
    try {
      await certificateService.issue({ memberId: certTarget.memberId, groupTrainingId: activeGT._id, notes: certTarget.notes });
      notify('success', 'Certificate issued.');
      fetchCertificates(activeGT._id);
      setCertTarget(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!group) return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'trainings', label: `Trainings (${groupTrainings.length})`, icon: BookOpen },
    { id: 'members', label: `Members (${group.members.length})`, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 p-2 rounded-lg hover:bg-[var(--accent)] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--muted)]" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[var(--foreground)] truncate">{group.title}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-[var(--muted)]">
            {group.org && <span>{group.org.title}</span>}
            {group.zone && <><span>·</span><span>{group.zone.title}</span></>}
            {group.category && <><span>·</span><span>{group.category.title}</span></>}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${group.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-[var(--accent)] text-[var(--muted)]'}`}>
          {group.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--card-border)]">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'}`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Members', value: group.members.length, icon: Users, color: 'text-blue-500' },
            { label: 'Trainings', value: groupTrainings.length, icon: BookOpen, color: 'text-purple-500' },
            { label: 'Completed', value: groupTrainings.filter(g => g.status === 'Completed').length, icon: CheckCircle, color: 'text-green-500' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">{stat.value}</p>
                  <p className="text-sm text-[var(--muted)]">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trainings Tab */}
      {tab === 'trainings' && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <button onClick={openAssign} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-all">
                <Plus className="w-4 h-4" /> Assign Training
              </button>
            </div>
          )}

          {groupTrainings.length === 0 ? (
            <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-12 text-center text-[var(--muted)]">No trainings assigned yet.</div>
          ) : groupTrainings.map((gt) => {
            const StatusIcon = STATUS_ICON[gt.status];
            return (
              <div key={gt._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)]">{gt.training.title}</h3>
                      {gt.training.purpose && <p className="text-sm text-[var(--muted)] mt-0.5 line-clamp-1">{gt.training.purpose}</p>}
                    </div>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[gt.status]}`}>
                      <StatusIcon className="w-3 h-3" /> {gt.status}
                    </span>
                  </div>

                  {/* Instructors */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--muted)]">Instructors:</span>
                    {gt.instructors.length === 0 ? (
                      <span className="text-xs text-[var(--muted)] italic">None assigned</span>
                    ) : gt.instructors.map(i => (
                      <span key={i._id} className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-xs text-[var(--foreground)]">{i.fullName}</span>
                    ))}
                  </div>

                  {/* Dates */}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
                    {gt.scheduledDate && <span>Scheduled: {new Date(gt.scheduledDate).toLocaleDateString()}</span>}
                    {gt.startedAt && <span>Started: {new Date(gt.startedAt).toLocaleDateString()}</span>}
                    {gt.completedAt && <span>Completed: {new Date(gt.completedAt).toLocaleDateString()}</span>}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canUpdateStatus && (
                      <button onClick={() => openStatus(gt)} className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors">
                        Update Status
                      </button>
                    )}
                    {canManage && (
                      <button onClick={() => openInstructors(gt)} className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors">
                        <UserCheck className="w-3 h-3 inline mr-1" />Instructors
                      </button>
                    )}
                    <button onClick={() => { setActiveGT(gt); fetchMemberTrainings(gt._id); openMemberRating(gt); }} className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors">
                      <Star className="w-3 h-3 inline mr-1" />Ratings
                    </button>
                    <button onClick={() => openCert(gt)} className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors">
                      <Award className="w-3 h-3 inline mr-1" />Certificates
                    </button>
                  </div>
                </div>

                {/* Status History Timeline */}
                {gt.statusHistory.length > 0 && (
                  <div className="border-t border-[var(--card-border)] px-5 py-4">
                    <p className="text-xs font-medium text-[var(--muted)] mb-3">Status History</p>
                    <div className="space-y-2">
                      {gt.statusHistory.slice().reverse().map((h, i) => {
                        const SIcon = STATUS_ICON[h.status];
                        return (
                          <div key={i} className="flex items-start gap-3">
                            <SIcon className={`w-4 h-4 mt-0.5 shrink-0 ${h.status === 'Completed' ? 'text-green-500' : h.status === 'Started' ? 'text-blue-500' : 'text-yellow-500'}`} />
                            <div className="min-w-0">
                              <span className="text-xs font-medium text-[var(--foreground)]">{h.status}</span>
                              {h.note && <span className="text-xs text-[var(--muted)] ml-2">— {h.note}</span>}
                              <p className="text-xs text-[var(--muted)]">{h.updatedBy?.fullName} · {new Date(h.date).toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (() => {
        // Build per-member stats from group-scoped member trainings
        const statsMap: Record<string, { trainings: number; avgRating: number | null; certs: number }> = {};
        allGroupMemberTrainings.forEach((mt) => {
          const id = mt.member._id;
          if (!statsMap[id]) statsMap[id] = { trainings: 0, avgRating: null, certs: 0 };
          statsMap[id].trainings += 1;
        });
        const ratingMap: Record<string, number[]> = {};
        allGroupMemberTrainings.forEach((mt) => {
          if (mt.rating !== null) {
            if (!ratingMap[mt.member._id]) ratingMap[mt.member._id] = [];
            ratingMap[mt.member._id].push(mt.rating);
          }
        });
        Object.entries(ratingMap).forEach(([id, ratings]) => {
          statsMap[id] = { ...statsMap[id], avgRating: parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) };
        });

        const filtered = group.members.filter((m) => {
          if (!memberSearch.trim()) return true;
          const q = memberSearch.toLowerCase();
          return m.fullName.toLowerCase().includes(q) || m.phone.includes(q) || (m.userId ?? '').toLowerCase() === q;
        });

        return (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
              <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search by name, phone, or User ID..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs" />
            </div>
            {filtered.length === 0 ? (
              <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-12 text-center text-[var(--muted)]">
                {group.members.length === 0 ? 'No members in this group.' : 'No members match search.'}
              </div>
            ) : filtered.map((m) => {
              const s = statsMap[m._id] ?? { trainings: 0, avgRating: null, certs: 0 };
              return (
                <div key={m._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-[var(--foreground)] text-sm">{m.fullName}</p>
                      {m.userId && <span className="text-xs font-mono text-[var(--primary)] bg-[var(--accent)] px-1.5 py-0.5 rounded">{m.userId}</span>}
                    </div>
                    <p className="text-xs text-[var(--muted)]">{m.phone} · {m.role}</p>
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                        <BookOpen className="w-3 h-3" /> {s.trainings} training{s.trainings !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                        <Star className="w-3 h-3 text-yellow-500" /> {s.avgRating !== null ? `${s.avgRating}/10` : 'Not rated'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                        <Award className="w-3 h-3 text-blue-500" /> {s.certs} cert{s.certs !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <Link href={`/dashboard/users/${m._id}/profile`} className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] hover:bg-[var(--primary)] hover:text-white rounded-lg transition-colors shrink-0">
                    View Profile
                  </Link>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Assign Training Modal */}
      <Modal isOpen={assignModal} onClose={() => setAssignModal(false)} title="Assign Training">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Training *</label>
            <select value={assignForm.trainingId} onChange={(e) => setAssignForm(f => ({ ...f, trainingId: e.target.value }))} className={inputClass}>
              <option value="">Select training...</option>
              {trainings.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Scheduled Date</label>
            <input type="date" value={assignForm.scheduledDate} onChange={(e) => setAssignForm(f => ({ ...f, scheduledDate: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Instructors</label>
            <div className="max-h-40 overflow-y-auto space-y-1 border border-[var(--card-border)] rounded-lg p-2">
              {instructors.map(i => (
                <label key={i._id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--accent)] cursor-pointer">
                  <input type="checkbox" checked={assignForm.instructors.includes(i._id)} onChange={(e) => setAssignForm(f => ({ ...f, instructors: e.target.checked ? [...f.instructors, i._id] : f.instructors.filter(id => id !== i._id) }))} className="rounded" />
                  <span className="text-sm">{i.fullName}</span>
                  <span className="text-xs text-[var(--muted)]">{i.phone}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setAssignModal(false)} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
            <button onClick={handleAssign} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60">{submitting ? 'Assigning...' : 'Assign'}</button>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal isOpen={statusModal} onClose={() => setStatusModal(false)} title="Update Training Status" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Status</label>
            <select value={statusForm.status} onChange={(e) => setStatusForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
              {['Pending', 'Started', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Note</label>
            <input value={statusForm.note} onChange={(e) => setStatusForm(f => ({ ...f, note: e.target.value }))} className={inputClass} placeholder="Optional note..." />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setStatusModal(false)} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)]">Cancel</button>
            <button onClick={handleStatusUpdate} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60">{submitting ? 'Saving...' : 'Update'}</button>
          </div>
        </div>
      </Modal>

      {/* Manage Instructors Modal */}
      <Modal isOpen={instructorModal} onClose={() => setInstructorModal(false)} title="Manage Instructors">
        <div className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-1 border border-[var(--card-border)] rounded-lg p-2">
            {instructors.map(i => (
              <label key={i._id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--accent)] cursor-pointer">
                <input type="checkbox" checked={selectedInstructors.includes(i._id)} onChange={(e) => setSelectedInstructors(prev => e.target.checked ? [...prev, i._id] : prev.filter(id => id !== i._id))} className="rounded" />
                <span className="text-sm">{i.fullName}</span>
                <span className="text-xs text-[var(--muted)]">{i.phone}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setInstructorModal(false)} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)]">Cancel</button>
            <button onClick={handleInstructorUpdate} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60">{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      {/* Ratings Modal */}
      <Modal isOpen={ratingModal} onClose={() => { setRatingModal(false); setRatingTarget({ mt: null, value: 0 }); }} title={`Ratings — ${activeGT?.training.title}`} size="lg">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
            <input value={modalMemberSearch} onChange={(e) => setModalMemberSearch(e.target.value)} placeholder="Search by name, phone, or User ID..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs" />
          </div>
          {memberTrainings.filter((mt) => {
            if (!modalMemberSearch.trim()) return true;
            const q = modalMemberSearch.toLowerCase();
            return mt.member.fullName.toLowerCase().includes(q) || mt.member.phone.includes(q) || (mt.member.userId ?? '').toLowerCase() === q;
          }).length === 0 ? (
            <p className="text-sm text-[var(--muted)] text-center py-6">No members found for this training.</p>
          ) : memberTrainings.filter((mt) => {
            if (!modalMemberSearch.trim()) return true;
            const q = modalMemberSearch.toLowerCase();
            return mt.member.fullName.toLowerCase().includes(q) || mt.member.phone.includes(q) || (mt.member.userId ?? '').toLowerCase() === q;
          }).map((mt) => (
            <div key={mt._id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--accent)]">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--foreground)]">{mt.member.fullName}</p>
                  {mt.member.userId && <span className="text-xs font-mono text-[var(--primary)] bg-[var(--card)] px-1.5 py-0.5 rounded">{mt.member.userId}</span>}
                </div>
                <p className="text-xs text-[var(--muted)]">{mt.member.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                {ratingTarget.mt?._id === mt._id ? (
                  <>
                    <input type="number" min={0} max={10} step={0.5} value={ratingTarget.value} onChange={(e) => setRatingTarget(r => ({ ...r, value: Number(e.target.value) }))} className="w-16 px-2 py-1 text-sm border border-[var(--card-border)] rounded bg-[var(--background)] text-center" />
                    <button onClick={handleRate} disabled={submitting} className="px-3 py-1 bg-[var(--primary)] text-white rounded text-xs font-medium disabled:opacity-60">Save</button>
                    <button onClick={() => setRatingTarget({ mt: null, value: 0 })} className="p-1 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-sm font-semibold text-[var(--foreground)]">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      {mt.rating !== null ? mt.rating : '—'}
                    </span>
                    {canUpdateStatus && (
                      <button onClick={() => setRatingTarget({ mt, value: mt.rating ?? 0 })} className="px-2 py-1 text-xs bg-[var(--card)] border border-[var(--card-border)] rounded hover:border-[var(--primary)] transition-colors">
                        Rate
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Certificates Modal */}
      <Modal isOpen={certModal} onClose={() => { setCertModal(false); setCertTarget(null); }} title={`Certificates — ${activeGT?.training.title}`} size="lg">
        <div className="space-y-4">
          {canUpdateStatus && (
            <div className="border border-[var(--card-border)] rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-[var(--foreground)]">Issue Certificate</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
                <input value={modalMemberSearch} onChange={(e) => setModalMemberSearch(e.target.value)} placeholder="Search member by name, phone, or User ID..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs" />
              </div>
              <select value={certTarget?.memberId ?? ''} onChange={(e) => setCertTarget((t) => ({ memberId: e.target.value, notes: t?.notes ?? '' }))} className={inputClass}>
                <option value="">Select member...</option>
                {group.members.filter((m) => {
                  if (!modalMemberSearch.trim()) return true;
                  const q = modalMemberSearch.toLowerCase();
                  return m.fullName.toLowerCase().includes(q) || m.phone.includes(q) || (m.userId ?? '').toLowerCase() === q;
                }).map((m) => (
                  <option key={m._id} value={m._id}>{m.fullName}{m.userId ? ` (${m.userId})` : ''} — {m.phone}</option>
                ))}
              </select>
              <div className="flex gap-3">
                <input value={certTarget?.notes ?? ''} onChange={(e) => setCertTarget((t) => t ? { ...t, notes: e.target.value } : null)} className={inputClass} placeholder="Notes (optional)" />
                <button onClick={handleIssueCert} disabled={submitting || !certTarget?.memberId} className="px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium disabled:opacity-60 whitespace-nowrap">
                  Issue
                </button>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {certificates.length === 0 ? (
              <p className="text-sm text-[var(--muted)] text-center py-4">No certificates issued yet.</p>
            ) : certificates.map((c) => (
              <div key={c._id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--accent)]">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{c.member.fullName}</p>
                  <p className="text-xs text-[var(--muted)]">{c.certificateNo} · Issued by {c.issuedBy.fullName} · {new Date(c.issuedAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
