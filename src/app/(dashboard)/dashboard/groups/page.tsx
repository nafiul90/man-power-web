'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit, Trash2, UsersRound, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { groupService, GroupPayload } from '@/services/group.service';
import { categoryService } from '@/services/category.service';
import { zoneService } from '@/services/zone.service';
import { userService } from '@/services/user.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

interface SimpleRef { _id: string; name?: string; title?: string; fullName?: string; phone?: string }
interface Group {
  _id: string;
  title: string;
  zone?: SimpleRef | null;
  category?: SimpleRef | null;
  members: SimpleRef[];
}

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

function GroupFormModal({ group, onClose, onSaved }: { group?: Group | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(group?.title ?? '');
  const [zoneId, setZoneId] = useState(group?.zone?._id ?? '');
  const [categoryId, setCategoryId] = useState(group?.category?._id ?? '');
  const [selectedMembers, setSelectedMembers] = useState<string[]>(group?.members.map((m) => m._id) ?? []);
  const [memberSearch, setMemberSearch] = useState('');
  const [zones, setZones] = useState<SimpleRef[]>([]);
  const [categories, setCategories] = useState<SimpleRef[]>([]);
  const [users, setUsers] = useState<(SimpleRef & { phone?: string })[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  useEffect(() => {
    Promise.all([
      zoneService.getAll({ limit: '500' }),
      categoryService.getAll({ limit: '200' }),
      userService.getAll({ limit: '500' }),
    ]).then(([zRes, cRes, uRes]) => {
      setZones(zRes.data.data.zones.map((z: { _id: string; title: string }) => ({ _id: z._id, title: z.title })));
      setCategories(cRes.data.data.categories.map((c: { _id: string; title: string }) => ({ _id: c._id, title: c.title })));
      setUsers(uRes.data.data.users.map((u: { _id: string; fullName: string; phone: string }) => ({ _id: u._id, fullName: u.fullName, phone: u.phone })));
    }).catch(() => {});
  }, []);

  const filteredUsers = useMemo(() => {
    if (!memberSearch.trim()) return users;
    const q = memberSearch.toLowerCase();
    return users.filter((u) =>
      u.fullName?.toLowerCase().includes(q) || u.phone?.includes(q)
    );
  }, [users, memberSearch]);

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedMembers.includes(u._id));

  const toggleMember = (id: string) =>
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedMembers((prev) => prev.filter((id) => !filteredUsers.some((u) => u._id === id)));
    } else {
      const toAdd = filteredUsers.map((u) => u._id).filter((id) => !selectedMembers.includes(id));
      setSelectedMembers((prev) => [...prev, ...toAdd]);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return notify('error', 'Title is required.');
    setSubmitting(true);
    try {
      const payload: GroupPayload = {
        title: title.trim(),
        zone: zoneId || undefined,
        category: categoryId || undefined,
        members: selectedMembers,
      };
      if (group) {
        await groupService.update(group._id, payload);
        notify('success', 'Group updated.');
      } else {
        await groupService.create(payload);
        notify('success', 'Group created.');
      }
      setTimeout(onSaved, 400);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to save.');
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <Notification notification={notification} />
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Group Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Group name" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Zone</label>
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={inputClass}>
              <option value="">Select zone</option>
              {zones.map((z) => <option key={z._id} value={z._id}>{z.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-[var(--foreground)]">
              Members <span className="text-[var(--muted)] font-normal">({selectedMembers.length} selected)</span>
            </label>
            {filteredUsers.length > 0 && (
              <button type="button" onClick={toggleSelectAll} className="text-xs text-[var(--primary)] hover:underline font-medium">
                {allFilteredSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members by name or phone..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs"
            />
          </div>
          {users.length === 0 ? (
            <p className="text-[var(--muted)] text-sm text-center py-4">No users available.</p>
          ) : (
            <div className="max-h-52 overflow-y-auto rounded-lg border border-[var(--card-border)] divide-y divide-[var(--card-border)]">
              {filteredUsers.length === 0 ? (
                <p className="text-[var(--muted)] text-sm text-center py-4">No users match search.</p>
              ) : filteredUsers.map((u) => {
                const isSelected = selectedMembers.includes(u._id);
                return (
                  <label key={u._id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]/50'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleMember(u._id)} className="w-4 h-4 accent-[var(--primary)] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{u.fullName}</p>
                      <p className="text-xs text-[var(--muted)]">{u.phone}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">
            {submitting ? 'Saving...' : group ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Group | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '12' };
      if (search) params.search = search;
      const res = await groupService.getAll(params);
      const d = res.data.data;
      setGroups(d.groups);
      setTotal(d.total);
      setPages(d.pages);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const openModal = (type: typeof modal, group?: Group) => { setSelected(group ?? null); setModal(type); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await groupService.delete(selected._id);
      notify('success', 'Group deleted.');
      closeModal();
      fetchGroups();
    } catch { notify('error', 'Failed to delete.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      <Notification notification={notification} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Groups</h1>
          <p className="text-[var(--muted)] text-sm">{total} total groups</p>
        </div>
        <button onClick={() => openModal('create')} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add Group
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search groups..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="col-span-full text-center py-12 text-[var(--muted)]">Loading...</p>
        ) : groups.length === 0 ? (
          <p className="col-span-full text-center py-12 text-[var(--muted)]">No groups found.</p>
        ) : groups.map((group) => (
          <div key={group._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm hover:border-[var(--primary)] transition-colors group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center shrink-0">
                  <UsersRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] text-sm">{group.title}</h3>
                  <p className="text-xs text-[var(--muted)]">{group.members.length} member{group.members.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/dashboard/groups/${group._id}`} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-green-600 transition-colors" title="View details"><ExternalLink className="w-3.5 h-3.5" /></Link>
                <button onClick={() => openModal('edit', group)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => openModal('delete', group)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="space-y-1.5">
              {group.zone && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--muted)] w-16 shrink-0">Zone:</span>
                  <span className="bg-[var(--accent)] px-2 py-0.5 rounded text-[var(--primary)] font-medium">{group.zone.title}</span>
                </div>
              )}
              {group.category && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[var(--muted)] w-16 shrink-0">Category:</span>
                  <span className="bg-[var(--accent)] px-2 py-0.5 rounded text-[var(--primary)] font-medium">{group.category.title}</span>
                </div>
              )}
            </div>
            {group.members.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex flex-wrap gap-1">
                {group.members.slice(0, 3).map((m) => (
                  <span key={m._id} className="text-xs bg-[var(--accent)] text-[var(--foreground)] px-2 py-0.5 rounded-full">{m.fullName}</span>
                ))}
                {group.members.length > 3 && (
                  <span className="text-xs text-[var(--muted)]">+{group.members.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted)]">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <Modal isOpen={modal === 'create'} onClose={closeModal} title="Create Group" size="lg">
        <GroupFormModal onClose={closeModal} onSaved={() => { closeModal(); fetchGroups(); }} />
      </Modal>
      <Modal isOpen={modal === 'edit'} onClose={closeModal} title="Edit Group" size="lg">
        <GroupFormModal group={selected} onClose={closeModal} onSaved={() => { closeModal(); fetchGroups(); }} />
      </Modal>
      <Modal isOpen={modal === 'delete'} onClose={closeModal} title="Delete Group" size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">Delete <strong className="text-[var(--foreground)]">&ldquo;{selected?.title}&rdquo;</strong>?</p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60">{submitting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
