'use client';
import { useState, useEffect, useCallback } from 'react';
import { Award, Search, ChevronLeft, ChevronRight, Ban, ExternalLink, Printer } from 'lucide-react';
import Link from 'next/link';
import { certificateService } from '@/services/certificate.service';
import { groupService } from '@/services/group.service';
import { groupTrainingService } from '@/services/groupTraining.service';
import { userService } from '@/services/user.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';
import { useAuthStore } from '@/store/authStore';

interface Certificate {
  _id: string;
  certificateNo: string;
  member: { _id: string; fullName: string; phone: string };
  training: { _id: string; title: string };
  group: { _id: string; title: string };
  issuedBy: { fullName: string };
  issuedAt: string;
  status: 'Active' | 'Revoked';
  notes?: string;
}

interface Group { _id: string; title: string }
interface GroupTraining { _id: string; training: { title: string }; status: string }
interface Member { _id: string; fullName: string; phone: string }

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

export default function CertificatesPage() {
  const { user: authUser } = useAuthStore();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // issue modal state
  const [issueModal, setIssueModal] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<Certificate | null>(null);
  const [printTarget, setPrintTarget] = useState<Certificate | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupTrainings, setGroupTrainings] = useState<GroupTraining[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [issueForm, setIssueForm] = useState({ groupId: '', groupTrainingId: '', memberId: '', notes: '' });

  const { notification, notify } = useNotification();

  const canIssue = ['Org Owner', 'Manager', 'Instructor'].includes(authUser?.role ?? '');

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (statusFilter) params.status = statusFilter;
      const res = await certificateService.getAll(params);
      const d = res.data.data;
      setCertificates(d.certificates);
      setTotal(d.total);
      setPages(d.pages);
    } finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);

  // Load groups for issue form
  useEffect(() => {
    groupService.getAll({ limit: '200' })
      .then((r) => setGroups(r.data.data.groups))
      .catch(() => {});
  }, []);

  // When group changes, load its group-trainings and members
  useEffect(() => {
    if (!issueForm.groupId) {
      setGroupTrainings([]);
      setMembers([]);
      setIssueForm((f) => ({ ...f, groupTrainingId: '', memberId: '' }));
      return;
    }
    Promise.all([
      groupTrainingService.getByGroup(issueForm.groupId),
      groupService.getById(issueForm.groupId),
    ]).then(([gtRes, gRes]) => {
      setGroupTrainings(gtRes.data.data);
      setMembers(gRes.data.data.members ?? []);
      setIssueForm((f) => ({ ...f, groupTrainingId: '', memberId: '' }));
    }).catch(() => {});
  }, [issueForm.groupId]);

  // filter members by search
  const filteredMembers = search.trim()
    ? members.filter((m) => m.fullName.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search))
    : members;

  const openIssue = () => {
    setIssueForm({ groupId: '', groupTrainingId: '', memberId: '', notes: '' });
    setSearch('');
    setIssueModal(true);
  };

  const handleIssue = async () => {
    if (!issueForm.groupTrainingId || !issueForm.memberId) {
      return notify('error', 'Please select a training session and a member.');
    }
    setSubmitting(true);
    try {
      await certificateService.issue({
        memberId: issueForm.memberId,
        groupTrainingId: issueForm.groupTrainingId,
        notes: issueForm.notes,
      });
      notify('success', 'Certificate issued.');
      setIssueModal(false);
      fetchCertificates();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to issue certificate.');
    } finally { setSubmitting(false); }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setSubmitting(true);
    try {
      await certificateService.revoke(revokeTarget._id);
      notify('success', 'Certificate revoked.');
      setRevokeTarget(null);
      fetchCertificates();
    } catch { notify('error', 'Failed to revoke.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Certificates</h1>
          <p className="text-[var(--muted)] text-sm">{total} total certificates</p>
        </div>
        {canIssue && (
          <button onClick={openIssue} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
            <Award className="w-4 h-4" /> Issue Certificate
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by certificate number or member..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Revoked">Revoked</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--accent)]/50">
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">Certificate No.</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">Member</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden md:table-cell">Training</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden lg:table-cell">Group</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden sm:table-cell">Issued</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-[var(--muted)]">Loading...</td></tr>
              ) : certificates.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-[var(--muted)]">No certificates found.</td></tr>
              ) : certificates.map((c) => (
                <tr key={c._id} className="border-b border-[var(--card-border)] hover:bg-[var(--accent)]/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[var(--primary)] shrink-0" />
                      <span className="font-mono font-medium text-[var(--foreground)]">{c.certificateNo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--foreground)]">{c.member.fullName}</p>
                    <p className="text-xs text-[var(--muted)]">{c.member.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)] hidden md:table-cell">{c.training.title}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Link href={`/dashboard/groups/${c.group?._id}`} className="text-[var(--primary)] hover:underline text-sm">{c.group?.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)] hidden sm:table-cell text-xs">
                    <p>{new Date(c.issuedAt).toLocaleDateString()}</p>
                    <p>by {c.issuedBy.fullName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setPrintTarget(c)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-blue-500 transition-colors" title="Print certificate">
                        <Printer className="w-4 h-4" />
                      </button>
                      <Link href={`/dashboard/users/${c.member._id}/profile`} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors" title="View member profile">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      {canIssue && c.status === 'Active' && (
                        <button onClick={() => setRevokeTarget(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors" title="Revoke">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted)]">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Issue Certificate Modal */}
      <Modal isOpen={issueModal} onClose={() => setIssueModal(false)} title="Issue Certificate">
        <div className="space-y-4">
          {/* Step 1: Select Group */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Group *</label>
            <select
              value={issueForm.groupId}
              onChange={(e) => setIssueForm((f) => ({ ...f, groupId: e.target.value }))}
              className={inputClass}
            >
              <option value="">Select group...</option>
              {groups.map((g) => <option key={g._id} value={g._id}>{g.title}</option>)}
            </select>
          </div>

          {/* Step 2: Select Training Session */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Training Session *</label>
            <select
              value={issueForm.groupTrainingId}
              onChange={(e) => setIssueForm((f) => ({ ...f, groupTrainingId: e.target.value }))}
              disabled={!issueForm.groupId}
              className={inputClass}
            >
              <option value="">Select training...</option>
              {groupTrainings.map((gt) => (
                <option key={gt._id} value={gt._id}>{gt.training.title} — {gt.status}</option>
              ))}
            </select>
            {issueForm.groupId && groupTrainings.length === 0 && (
              <p className="text-xs text-[var(--muted)] mt-1">No training sessions assigned to this group.</p>
            )}
          </div>

          {/* Step 3: Select Member */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Member *</label>
            {issueForm.groupId && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search member..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs"
                />
              </div>
            )}
            <select
              value={issueForm.memberId}
              onChange={(e) => setIssueForm((f) => ({ ...f, memberId: e.target.value }))}
              disabled={!issueForm.groupId}
              className={inputClass}
              size={filteredMembers.length > 0 ? Math.min(filteredMembers.length + 1, 5) : 1}
            >
              <option value="">Select member...</option>
              {filteredMembers.map((m) => (
                <option key={m._id} value={m._id}>{m.fullName} — {m.phone}</option>
              ))}
            </select>
            {issueForm.groupId && members.length === 0 && (
              <p className="text-xs text-[var(--muted)] mt-1">No members in this group.</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Notes <span className="text-[var(--muted)] font-normal">(optional)</span></label>
            <textarea
              value={issueForm.notes}
              onChange={(e) => setIssueForm((f) => ({ ...f, notes: e.target.value }))}
              className={inputClass + ' resize-none'}
              rows={2}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setIssueModal(false)} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
            <button onClick={handleIssue} disabled={submitting || !issueForm.groupTrainingId || !issueForm.memberId} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">
              {submitting ? 'Issuing...' : 'Issue Certificate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Revoke Confirm Modal */}
      <Modal isOpen={!!revokeTarget} onClose={() => setRevokeTarget(null)} title="Revoke Certificate" size="sm">
        <p className="text-[var(--muted)] text-sm mb-2">
          Revoke certificate <strong className="text-[var(--foreground)] font-mono">{revokeTarget?.certificateNo}</strong> issued to{' '}
          <strong className="text-[var(--foreground)]">{revokeTarget?.member.fullName}</strong>?
        </p>
        <p className="text-xs text-red-500 mb-6">This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={() => setRevokeTarget(null)} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleRevoke} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60 transition-colors">
            {submitting ? 'Revoking...' : 'Revoke'}
          </button>
        </div>
      </Modal>

      {/* Print Certificate Modal */}
      <Modal isOpen={!!printTarget} onClose={() => setPrintTarget(null)} title="Certificate Preview" size="lg">
        {printTarget && (
          <div>
            {/* Print preview area */}
            <div id="cert-print-area" className="border-4 border-double border-[var(--primary)] rounded-xl p-8 text-center space-y-4 bg-white dark:bg-[var(--card)]">
              <div className="flex justify-center mb-2">
                <Award className="w-14 h-14 text-[var(--primary)]" />
              </div>
              <p className="text-xs font-semibold tracking-widest text-[var(--muted)] uppercase">Certificate of Completion</p>
              <div className="border-t border-b border-[var(--card-border)] py-4 space-y-1">
                <p className="text-sm text-[var(--muted)]">This is to certify that</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">{printTarget.member.fullName}</p>
                <p className="text-sm text-[var(--muted)]">has successfully completed the training</p>
                <p className="text-xl font-semibold text-[var(--primary)]">{printTarget.training.title}</p>
                <p className="text-sm text-[var(--muted)]">in group <strong>{printTarget.group.title}</strong></p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs text-[var(--muted)] pt-2">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{printTarget.certificateNo}</p>
                  <p>Certificate No.</p>
                </div>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{new Date(printTarget.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  <p>Date of Issue</p>
                </div>
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{printTarget.issuedBy.fullName}</p>
                  <p>Issued By</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-dashed border-[var(--card-border)]">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${printTarget.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {printTarget.status}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setPrintTarget(null)} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Close</button>
              <button
                onClick={() => {
                  const el = document.getElementById('cert-print-area');
                  if (!el) return;
                  const win = window.open('', '_blank');
                  if (!win) return;
                  win.document.write(`<html><head><title>Certificate — ${printTarget.certificateNo}</title><style>
                    body { font-family: Georgia, serif; display: flex; justify-content: center; padding: 40px; background: #fff; }
                    .cert { border: 4px double #2d6a4f; border-radius: 12px; padding: 40px; text-align: center; max-width: 600px; width: 100%; }
                    .cert h1 { font-size: 28px; margin: 8px 0; color: #1b4332; }
                    .cert h2 { font-size: 22px; color: #2d6a4f; margin: 4px 0; }
                    .cert .label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-bottom: 8px; }
                    .cert .meta { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 20px; font-size: 12px; color: #555; }
                    .cert .meta strong { display: block; color: #111; font-size: 13px; }
                    .cert .divider { border-top: 1px solid #ccc; margin: 16px 0; }
                    .cert .status { display: inline-block; padding: 4px 12px; border-radius: 20px; background: #d1fae5; color: #065f46; font-size: 11px; margin-top: 12px; }
                    @media print { body { padding: 0; } .cert { border-radius: 0; } }
                  </style></head><body><div class="cert">
                    <div class="label">Certificate of Completion</div>
                    <div class="divider"></div>
                    <p style="font-size:13px;color:#555">This is to certify that</p>
                    <h1>${printTarget.member.fullName}</h1>
                    <p style="font-size:13px;color:#555">has successfully completed the training</p>
                    <h2>${printTarget.training.title}</h2>
                    <p style="font-size:13px;color:#555">in group <strong>${printTarget.group.title}</strong></p>
                    <div class="divider"></div>
                    <div class="meta">
                      <div><strong>${printTarget.certificateNo}</strong>Certificate No.</div>
                      <div><strong>${new Date(printTarget.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>Date of Issue</div>
                      <div><strong>${printTarget.issuedBy.fullName}</strong>Issued By</div>
                    </div>
                    <span class="status">${printTarget.status}</span>
                  </div></body></html>`);
                  win.document.close();
                  win.focus();
                  setTimeout(() => { win.print(); }, 300);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
