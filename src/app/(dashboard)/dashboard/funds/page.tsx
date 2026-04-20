'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit, Trash2, Users, DollarSign, Calendar, CheckCircle,
  XCircle, AlertCircle, ChevronDown, ChevronUp, ArrowRight, Banknote,
  UserPlus, UserMinus, Eye,
} from 'lucide-react';
import { fundService, Fund, FundMember } from '@/services/fund.service';
import { groupService } from '@/services/group.service';
import { userService } from '@/services/user.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';
const labelClass = 'block text-sm font-medium text-[var(--foreground)] mb-1.5';

interface UserOption { _id: string; fullName: string; phone: string; userId: string }
interface GroupOption { _id: string; title: string; members: UserOption[] }

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  Completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
};

const emptyForm = {
  title: '',
  description: '',
  sourceGroup: '',
  totalAmount: '',
  interestRate: '0',
  interestType: 'annual' as 'annual' | 'monthly',
  timeline: '12',
  dueDay: '10',
  startDate: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function FundsPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | 'detail' | 'members' | null>(null);
  const [selected, setSelected] = useState<Fund | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});

  // Member selection state
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<{ user: UserOption; loanAmount: string }[]>([]);
  const [filterGroup, setFilterGroup] = useState('');

  const { notification, notify } = useNotification();

  const fetchFunds = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await fundService.getAll(params);
      setFunds(res.data.data.funds);
      setTotal(res.data.data.total);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchFunds(); }, [fetchFunds]);

  const fetchGroupsAndUsers = async () => {
    try {
      const [gRes, uRes] = await Promise.all([
        groupService.getAll({ limit: '100' }),
        userService.getAll({ limit: '200', role: 'Member' }),
      ]);
      setGroups(gRes.data.data.groups || []);
      setAllUsers(uRes.data.data.users || []);
    } catch {
      // silently ignore
    }
  };

  const openCreate = async () => {
    setForm({ ...emptyForm });
    setSelectedMembers([]);
    setFilterGroup('');
    setMemberSearch('');
    await fetchGroupsAndUsers();
    setSelected(null);
    setModal('create');
  };

  const openEdit = async (f: Fund) => {
    setForm({
      title: f.title,
      description: f.description || '',
      sourceGroup: f.sourceGroup?._id || '',
      totalAmount: String(f.totalAmount),
      interestRate: String(f.interestRate),
      interestType: f.interestType,
      timeline: String(f.timeline),
      dueDay: String(f.dueDay),
      startDate: f.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      notes: f.notes || '',
    });
    setSelectedMembers(
      f.members.map((m) => ({
        user: { _id: m.user._id, fullName: m.user.fullName, phone: m.user.phone, userId: m.user.userId },
        loanAmount: String(m.loanAmount),
      }))
    );
    await fetchGroupsAndUsers();
    setSelected(f);
    setModal('edit');
  };

  const openDetail = async (f: Fund) => {
    setSelected(f);
    try {
      const res = await fundService.getSummary(f._id);
      setSummary(res.data.data);
    } catch {
      setSummary({});
    }
    setModal('detail');
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  const toggleMember = (user: UserOption) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.user._id === user._id);
      if (exists) return prev.filter((m) => m.user._id !== user._id);
      return [...prev, { user, loanAmount: '' }];
    });
  };

  const setMemberLoan = (userId: string, amount: string) => {
    setSelectedMembers((prev) => prev.map((m) => m.user._id === userId ? { ...m, loanAmount: amount } : m));
  };

  const distributeEvenly = () => {
    if (!selectedMembers.length || !form.totalAmount) return;
    const each = (Number(form.totalAmount) / selectedMembers.length).toFixed(2);
    setSelectedMembers((prev) => prev.map((m) => ({ ...m, loanAmount: each })));
  };

  const filteredUsers = allUsers.filter((u) => {
    const inGroup = filterGroup
      ? groups.find((g) => g._id === filterGroup)?.members.some((m) => (m as unknown as string) === u._id || (m as UserOption)._id === u._id)
      : true;
    const matchesSearch = !memberSearch || u.fullName.toLowerCase().includes(memberSearch.toLowerCase()) || u.phone.includes(memberSearch);
    return inGroup && matchesSearch;
  });

  const handleSave = async () => {
    if (!form.title.trim()) return notify('error', 'Title is required.');
    if (!form.totalAmount || Number(form.totalAmount) <= 0) return notify('error', 'Total amount must be positive.');
    if (!form.timeline || Number(form.timeline) < 1) return notify('error', 'Timeline must be at least 1 month.');
    if (!selectedMembers.length) return notify('error', 'Add at least one member.');
    const invalidMember = selectedMembers.find((m) => !m.loanAmount || Number(m.loanAmount) <= 0);
    if (invalidMember) return notify('error', `Set loan amount for ${invalidMember.user.fullName}.`);

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        sourceGroup: form.sourceGroup || undefined,
        totalAmount: Number(form.totalAmount),
        interestRate: Number(form.interestRate),
        interestType: form.interestType,
        timeline: Number(form.timeline),
        dueDay: Number(form.dueDay),
        startDate: form.startDate,
        notes: form.notes,
        members: selectedMembers.map((m) => ({ userId: m.user._id, loanAmount: Number(m.loanAmount) })),
      };

      if (modal === 'edit' && selected) {
        await fundService.update(selected._id, payload);
        notify('success', 'Fund updated.');
      } else {
        await fundService.create(payload);
        notify('success', 'Fund created.');
      }
      closeModal();
      fetchFunds();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (f: Fund) => {
    if (!confirm(`Activate fund "${f.title}"? This will generate installment schedules for all members.`)) return;
    try {
      await fundService.activate(f._id);
      notify('success', 'Fund activated. Installments generated.');
      fetchFunds();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to activate.');
    }
  };

  const handleStatusChange = async (f: Fund, status: string) => {
    if (!confirm(`Change fund status to "${status}"?`)) return;
    try {
      await fundService.updateStatus(f._id, status);
      notify('success', `Fund marked as ${status}.`);
      fetchFunds();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to update status.');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await fundService.delete(selected._id);
      notify('success', 'Fund deleted.');
      closeModal();
      fetchFunds();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to delete.');
    } finally {
      setSubmitting(false);
    }
  };

  const calcMonthly = (loanAmount: number) => {
    const rate = Number(form.interestRate) || 0;
    const tl = Number(form.timeline) || 1;
    const monthlyRate = form.interestType === 'annual' ? rate / 100 / 12 : rate / 100;
    const total = loanAmount + loanAmount * monthlyRate * tl;
    return (total / tl).toFixed(2);
  };

  const totalLoan = selectedMembers.reduce((s, m) => s + (Number(m.loanAmount) || 0), 0);

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Fund Management</h1>
          <p className="text-[var(--muted)] text-sm">{total} total funds</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Create Fund
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search funds..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
          <option value="">All Status</option>
          <option value="Draft">Draft</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Fund List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-12 text-[var(--muted)]">Loading...</p>
        ) : funds.length === 0 ? (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-12 text-center">
            <Banknote className="w-10 h-10 text-[var(--muted)] mx-auto mb-3 opacity-40" />
            <p className="text-[var(--muted)]">No funds found. Create your first fund.</p>
          </div>
        ) : funds.map((f) => (
          <div key={f._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
            <div className="flex items-start justify-between p-4 gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                  <Banknote className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[var(--foreground)] text-sm">{f.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status]}`}>{f.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                    <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> ৳{f.totalAmount.toLocaleString()}
                    </span>
                    <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                      <Users className="w-3 h-3" /> {f.members.length} members
                    </span>
                    <span className="text-xs text-[var(--muted)] flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {f.timeline} months @ {f.interestRate}%/{f.interestType === 'annual' ? 'yr' : 'mo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setExpandedId(expandedId === f._id ? null : f._id)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] transition-colors">
                  {expandedId === f._id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => openDetail(f)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors" title="View Details">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                {f.status === 'Draft' && (
                  <>
                    <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleActivate(f)} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 text-[var(--muted)] hover:text-green-600 transition-colors" title="Activate Fund">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { setSelected(f); setModal('delete'); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                {f.status === 'Active' && (
                  <button onClick={() => handleStatusChange(f, 'Completed')} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 text-[var(--muted)] hover:text-blue-600 transition-colors" title="Mark Completed">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {(f.status === 'Draft' || f.status === 'Active') && (
                  <button onClick={() => handleStatusChange(f, 'Cancelled')} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors" title="Cancel Fund">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {expandedId === f._id && (
              <div className="px-4 pb-4 border-t border-[var(--card-border)]">
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {f.members.map((m: FundMember) => (
                    <div key={m._id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--accent)] border border-[var(--card-border)]">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{m.user.fullName}</p>
                        <p className="text-xs text-[var(--muted)]">{m.user.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--foreground)]">৳{m.loanAmount.toLocaleString()}</p>
                        <p className="text-xs text-[var(--muted)]">৳{m.monthlyInstallment.toLocaleString()}/mo</p>
                      </div>
                    </div>
                  ))}
                </div>
                {f.description && <p className="mt-3 text-sm text-[var(--muted)]">{f.description}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={closeModal} title={modal === 'edit' ? 'Edit Fund' : 'Create Fund'}>
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Fund Title *</label>
              <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="e.g. Group Loan Fund Q1 2026" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className={inputClass + ' resize-none'} rows={2} />
            </div>
            <div>
              <label className={labelClass}>Total Fund Amount (৳) *</label>
              <input type="number" min="1" value={form.totalAmount} onChange={(e) => setForm(f => ({ ...f, totalAmount: e.target.value }))} className={inputClass} placeholder="e.g. 100000" />
            </div>
            <div>
              <label className={labelClass}>Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Timeline (Months) *</label>
              <input type="number" min="1" value={form.timeline} onChange={(e) => setForm(f => ({ ...f, timeline: e.target.value }))} className={inputClass} placeholder="12" />
            </div>
            <div>
              <label className={labelClass}>Monthly Due Day (1–28)</label>
              <input type="number" min="1" max="28" value={form.dueDay} onChange={(e) => setForm(f => ({ ...f, dueDay: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Interest Rate (%)</label>
              <input type="number" min="0" step="0.1" value={form.interestRate} onChange={(e) => setForm(f => ({ ...f, interestRate: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Interest Type</label>
              <select value={form.interestType} onChange={(e) => setForm(f => ({ ...f, interestType: e.target.value as 'annual' | 'monthly' }))} className={inputClass}>
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className={inputClass + ' resize-none'} rows={2} />
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">Select Members</h3>
              {selectedMembers.length > 0 && (
                <button onClick={distributeEvenly} className="text-xs text-[var(--primary)] hover:underline">Distribute Evenly</button>
              )}
            </div>

            <div className="flex gap-2 mb-3">
              <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                <option value="">All Members</option>
                {groups.map((g) => <option key={g._id} value={g._id}>{g.title}</option>)}
              </select>
              <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search name/phone..." className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted)]" />
            </div>

            <div className="border border-[var(--card-border)] rounded-lg overflow-hidden">
              <div className="max-h-40 overflow-y-auto divide-y divide-[var(--card-border)]">
                {filteredUsers.length === 0 ? (
                  <p className="text-center py-4 text-xs text-[var(--muted)]">No members found.</p>
                ) : filteredUsers.map((u) => {
                  const isSelected = selectedMembers.some((m) => m.user._id === u._id);
                  return (
                    <button
                      key={u._id}
                      onClick={() => toggleMember(u)}
                      className={`flex items-center justify-between w-full px-3 py-2 text-left transition-colors ${isSelected ? 'bg-[var(--primary)]/10' : 'hover:bg-[var(--accent)]'}`}
                    >
                      <div>
                        <p className="text-xs font-medium text-[var(--foreground)]">{u.fullName}</p>
                        <p className="text-xs text-[var(--muted)]">{u.phone}</p>
                      </div>
                      {isSelected ? <UserMinus className="w-3.5 h-3.5 text-red-500 shrink-0" /> : <UserPlus className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selected Members Loan Amounts */}
          {selectedMembers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Loan Amounts <span className="text-xs font-normal text-[var(--muted)]">({selectedMembers.length} members · Total: ৳{totalLoan.toLocaleString()})</span>
                </h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedMembers.map((m) => {
                  const monthly = m.loanAmount ? calcMonthly(Number(m.loanAmount)) : '—';
                  return (
                    <div key={m.user._id} className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--accent)] border border-[var(--card-border)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--foreground)] truncate">{m.user.fullName}</p>
                        {m.loanAmount && <p className="text-xs text-[var(--primary)]">৳{monthly}/month</p>}
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={m.loanAmount}
                        onChange={(e) => setMemberLoan(m.user._id, e.target.value)}
                        placeholder="Loan ৳"
                        className="w-28 px-2 py-1.5 rounded border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary)] placeholder:text-[var(--muted)]"
                      />
                      <button onClick={() => toggleMember(m.user)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--card-border)] mt-4">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">
            {submitting ? 'Saving...' : 'Save Fund'}
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={modal === 'delete'} onClose={closeModal} title="Delete Fund" size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">
          Delete fund <strong className="text-[var(--foreground)]">&ldquo;{selected?.title}&rdquo;</strong>? All installment records will be removed permanently.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60 transition-colors">{submitting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={modal === 'detail'} onClose={closeModal} title={selected?.title || 'Fund Details'}>
        {selected && (
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Loan', value: `৳${selected.totalAmount.toLocaleString()}`, color: 'text-[var(--primary)]' },
                { label: 'Total Due', value: `৳${(summary as {totalDue?: number}).totalDue?.toLocaleString() ?? '—'}`, color: 'text-orange-500' },
                { label: 'Total Paid', value: `৳${(summary as {totalPaid?: number}).totalPaid?.toLocaleString() ?? '—'}`, color: 'text-green-500' },
                { label: 'Outstanding', value: `৳${(summary as {totalOutstanding?: number}).totalOutstanding?.toLocaleString() ?? '—'}`, color: 'text-red-500' },
              ].map((c) => (
                <div key={c.label} className="p-3 rounded-lg bg-[var(--accent)] border border-[var(--card-border)] text-center">
                  <p className={`text-base font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>

            {/* Fund Info */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ['Status', selected.status],
                ['Timeline', `${selected.timeline} months`],
                ['Interest Rate', `${selected.interestRate}% (${selected.interestType})`],
                ['Due Day', `Day ${selected.dueDay} of month`],
                ['Start Date', new Date(selected.startDate).toLocaleDateString()],
                ['Members', String(selected.members.length)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-[var(--card-border)]">
                  <span className="text-[var(--muted)]">{k}</span>
                  <span className="font-medium text-[var(--foreground)]">{v}</span>
                </div>
              ))}
            </div>

            {/* Members Table */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">Member Breakdown</h3>
              <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[var(--accent)] text-[var(--muted)]">
                      <th className="text-left px-3 py-2">Member</th>
                      <th className="text-right px-3 py-2">Loan</th>
                      <th className="text-right px-3 py-2">Monthly</th>
                      <th className="text-right px-3 py-2">Total Payable</th>
                      <th className="text-right px-3 py-2">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--card-border)]">
                    {selected.members.map((m: FundMember) => (
                      <tr key={m._id} className="hover:bg-[var(--accent)] transition-colors">
                        <td className="px-3 py-2">
                          <p className="font-medium text-[var(--foreground)]">{m.user.fullName}</p>
                          <p className="text-[var(--muted)]">{m.user.phone}</p>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-[var(--foreground)]">৳{m.loanAmount.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-[var(--primary)]">৳{m.monthlyInstallment.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-[var(--foreground)]">৳{m.totalPayable.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-green-600">৳{m.totalPaid.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selected.notes && (
              <div className="p-3 rounded-lg bg-[var(--accent)] border border-[var(--card-border)]">
                <p className="text-xs text-[var(--muted)]">{selected.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {selected.status === 'Draft' && (
                <button onClick={() => { closeModal(); handleActivate(selected); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <CheckCircle className="w-4 h-4" /> Activate Fund
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {(summary as {overdueCount?: number}).overdueCount ? (
                  <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5" />{(summary as {overdueCount?: number}).overdueCount} overdue</span>
                ) : null}
                <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Close</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
