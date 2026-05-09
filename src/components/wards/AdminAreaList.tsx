'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, MapPin, ChevronRight, ArrowLeft, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { adminAreaService, AreaType } from '@/services/adminArea.service';
import { userService } from '@/services/user.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

interface AdminArea { _id: string; name: string; type: AreaType; parent?: { _id: string; name: string } | null; admins?: { _id: string; fullName: string; phone?: string }[] }

const ADMIN_ROLE: Partial<Record<AreaType, string>> = {
  District: 'District Admin',
  Upazila: 'Upazila Admin',
  Union: 'Union Admin',
};

const PARENT_TYPE: Record<AreaType, AreaType | null> = {
  Division: null, District: 'Division', Upazila: 'District', Union: 'Upazila',
};

// Where clicking a row navigates (drill into children)
const CHILD_HREF: Partial<Record<AreaType, string>> = {
  Division: '/dashboard/admin-areas/districts',
  District: '/dashboard/admin-areas/upazilas',
  Upazila: '/dashboard/admin-areas/unions',
  Union: '/dashboard/wards',
};

// Query param name used when navigating to child page
const CHILD_PARAM: Partial<Record<AreaType, string>> = {
  Division: 'parentId',
  District: 'parentId',
  Upazila: 'parentId',
  Union: 'union',
};

// Human-readable label for child type
const CHILD_LABEL: Partial<Record<AreaType, string>> = {
  Division: 'Districts',
  District: 'Upazilas',
  Upazila: 'Unions',
  Union: 'Wards',
};

// Back link for breadcrumb
const BACK_HREF: Partial<Record<AreaType, string>> = {
  District: '/dashboard/admin-areas/divisions',
  Upazila: '/dashboard/admin-areas/districts',
  Union: '/dashboard/admin-areas/upazilas',
};

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

interface Props {
  type: AreaType;
  parentId?: string;
  parentName?: string;
}

export function AdminAreaList({ type, parentId, parentName }: Props) {
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [parents, setParents] = useState<AdminArea[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<AdminArea | null>(null);
  const [name, setName] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [adminUsers, setAdminUsers] = useState<{ _id: string; fullName: string; phone?: string }[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  const parentType = PARENT_TYPE[type];
  const childHref = CHILD_HREF[type];
  const childParam = CHILD_PARAM[type];
  const childLabel = CHILD_LABEL[type];
  const backHref = BACK_HREF[type];

  const fetchAreas = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { type, limit: '200' };
      if (search) params.search = search;
      if (parentId) params.parentId = parentId;
      const res = await adminAreaService.getAll(params);
      setAreas(res.data.data.areas);
      setTotal(res.data.data.total);
    } finally { setLoading(false); }
  }, [type, search, parentId]);

  const fetchParents = useCallback(async () => {
    if (!parentType) return;
    const res = await adminAreaService.getAll({ type: parentType, limit: '500' });
    setParents(res.data.data.areas);
  }, [parentType]);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);
  useEffect(() => { if (modal === 'create' || modal === 'edit') fetchParents(); }, [modal, fetchParents]);

  useEffect(() => {
    const adminRole = ADMIN_ROLE[type];
    if (adminRole && (modal === 'create' || modal === 'edit')) {
      userService.getAll({ role: adminRole, limit: '500' }).then((r) =>
        setAdminUsers(r.data.data.users)
      ).catch(() => {});
    }
  }, [modal, type]);

  const openCreate = () => {
    setName('');
    setFormParentId(parentId ?? '');
    setSelectedAdmins([]);
    setAdminSearch('');
    setSelected(null);
    setModal('create');
  };
  const openEdit = (a: AdminArea) => {
    setName(a.name);
    setFormParentId(a.parent?._id ?? '');
    setSelectedAdmins((a.admins ?? []).map((ad) => ad._id));
    setAdminSearch('');
    setSelected(a);
    setModal('edit');
  };
  const closeModal = () => { setModal(null); setSelected(null); setName(''); setFormParentId(''); setSelectedAdmins([]); setAdminSearch(''); };

  const handleSave = async () => {
    if (!name.trim()) return notify('error', 'Name is required.');
    if (parentType && !formParentId) return notify('error', `Please select a ${parentType}.`);
    setSubmitting(true);
    try {
      if (modal === 'edit' && selected) {
        await adminAreaService.update(selected._id, { name: name.trim(), parent: formParentId || undefined, admins: selectedAdmins });
        notify('success', `${type} updated.`);
      } else {
        await adminAreaService.create({ name: name.trim(), type, parent: formParentId || undefined, admins: selectedAdmins });
        notify('success', `${type} created.`);
      }
      closeModal();
      fetchAreas();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to save.');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await adminAreaService.delete(selected._id);
      notify('success', `${type} deleted.`);
      closeModal();
      fetchAreas();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Cannot delete — remove children first.');
    } finally { setSubmitting(false); }
  };

  const colSpan = ADMIN_ROLE[type] ? 4 : 3;

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      {/* Breadcrumb when filtered by parent */}
      {parentName && backHref && (
        <div className="flex items-center gap-2 text-sm">
          <Link href={backHref} className="flex items-center gap-1.5 text-[var(--primary)] hover:underline font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            All {type}s
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span className="text-[var(--muted)]">{parentName}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {parentName ? `${type}s in ${parentName}` : `${type}s`}
          </h1>
          <p className="text-[var(--muted)] text-sm">{total} total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add {type}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${type.toLowerCase()}s...`} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm" />
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--accent)]/50">
              <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">Name</th>
              {parentType && <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden sm:table-cell">{parentType}</th>}
              {ADMIN_ROLE[type] && <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden md:table-cell">Admins</th>}
              <th className="text-right px-4 py-3 font-semibold text-[var(--foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colSpan} className="text-center py-12 text-[var(--muted)]">Loading...</td></tr>
            ) : areas.length === 0 ? (
              <tr><td colSpan={colSpan} className="text-center py-12 text-[var(--muted)]">No {type.toLowerCase()}s found.</td></tr>
            ) : areas.map((a) => (
              <tr key={a._id} className="border-b border-[var(--card-border)] hover:bg-[var(--accent)]/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    {childHref && childParam ? (
                      <Link
                        href={`${childHref}?${childParam}=${a._id}&parentName=${encodeURIComponent(a.name)}`}
                        className="font-medium text-[var(--primary)] hover:underline flex items-center gap-1 group"
                        title={`View ${childLabel} of ${a.name}`}
                      >
                        {a.name}
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    ) : (
                      <span className="font-medium text-[var(--foreground)]">{a.name}</span>
                    )}
                  </div>
                </td>
                {parentType && <td className="px-4 py-3 text-[var(--muted)] hidden sm:table-cell">{a.parent?.name ?? '—'}</td>}
                {ADMIN_ROLE[type] && (
                  <td className="px-4 py-3 hidden md:table-cell">
                    {a.admins && a.admins.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {a.admins.map((ad) => (
                          <span key={ad._id} className="text-xs bg-[var(--accent)] text-[var(--foreground)] px-2 py-0.5 rounded-full">{ad.fullName}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/dashboard/groups?${type.toLowerCase()}=${a._id}&parentName=${encodeURIComponent(a.name)}`}
                      className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                      title={`Groups in ${a.name}`}
                    >
                      <UsersRound className="w-4 h-4" />
                    </Link>
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { setSelected(a); setModal('delete'); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={closeModal} title={modal === 'edit' ? `Edit ${type}` : `Add ${type}`} size="sm">
        <div className="space-y-4">
          {parentType && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{parentType} *</label>
              <select value={formParentId} onChange={(e) => setFormParentId(e.target.value)} className={inputClass}>
                <option value="">Select {parentType}</option>
                {parents.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              {parents.length === 0 && <p className="text-amber-500 text-xs mt-1">No {parentType.toLowerCase()}s found. Create them first.</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={`${type} name`} onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          </div>
          {ADMIN_ROLE[type] && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                {ADMIN_ROLE[type]}s <span className="text-[var(--muted)] font-normal">({selectedAdmins.length} selected)</span>
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
                <input
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder={`Search ${ADMIN_ROLE[type]}s...`}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs"
                />
              </div>
              {adminUsers.length === 0 ? (
                <p className="text-[var(--muted)] text-xs py-2">No {ADMIN_ROLE[type]}s available.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--card-border)] divide-y divide-[var(--card-border)]">
                  {adminUsers
                    .filter((u) => !adminSearch.trim() || u.fullName?.toLowerCase().includes(adminSearch.toLowerCase()) || u.phone?.includes(adminSearch))
                    .map((u) => {
                      const isSel = selectedAdmins.includes(u._id);
                      return (
                        <label key={u._id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSel ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]/50'}`}>
                          <input type="checkbox" checked={isSel} onChange={() => setSelectedAdmins((prev) => prev.includes(u._id) ? prev.filter((id) => id !== u._id) : [...prev, u._id])} className="w-4 h-4 accent-[var(--primary)] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">{u.fullName}</p>
                            <p className="text-xs text-[var(--muted)]">{u.phone}</p>
                          </div>
                        </label>
                      );
                    })
                  }
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60">{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'delete'} onClose={closeModal} title={`Delete ${type}`} size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">Delete <strong className="text-[var(--foreground)]">&ldquo;{selected?.name}&rdquo;</strong>? All children must be removed first.</p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60">{submitting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
