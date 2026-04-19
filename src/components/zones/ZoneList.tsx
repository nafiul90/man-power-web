'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, MapPin } from 'lucide-react';
import { zoneService, ZoneType } from '@/services/zone.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

interface Zone { _id: string; name: string; type: ZoneType; parent?: { _id: string; name: string; type: string } | null }

const PARENT_TYPE: Record<ZoneType, ZoneType | null> = {
  Division: null,
  District: 'Division',
  Upazila: 'District',
  Union: 'Upazila',
};

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

export function ZoneList({ type }: { type: ZoneType }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [parents, setParents] = useState<Zone[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  const parentType = PARENT_TYPE[type];

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { type, limit: '200' };
      if (search) params.search = search;
      const res = await zoneService.getAll(params);
      setZones(res.data.data.zones);
      setTotal(res.data.data.total);
    } finally {
      setLoading(false);
    }
  }, [type, search]);

  const fetchParents = useCallback(async () => {
    if (!parentType) return;
    const res = await zoneService.getAll({ type: parentType, limit: '500' });
    setParents(res.data.data.zones);
  }, [parentType]);

  useEffect(() => { fetchZones(); }, [fetchZones]);
  useEffect(() => {
    if (modal === 'create' || modal === 'edit') fetchParents();
  }, [modal, fetchParents]);

  const openCreate = () => { setName(''); setParentId(''); setSelected(null); setModal('create'); };
  const openEdit = (z: Zone) => { setName(z.name); setParentId(z.parent?._id ?? ''); setSelected(z); setModal('edit'); };
  const openDelete = (z: Zone) => { setSelected(z); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setName(''); setParentId(''); };

  const handleSave = async () => {
    if (!name.trim()) return notify('error', 'Name is required.');
    if (parentType && !parentId) return notify('error', `Please select a ${parentType}.`);
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), type, parent: parentId || undefined };
      if (modal === 'edit' && selected) {
        await zoneService.update(selected._id, { name: name.trim(), parent: parentId || undefined });
        notify('success', `${type} updated.`);
      } else {
        await zoneService.create(payload);
        notify('success', `${type} created.`);
      }
      closeModal();
      fetchZones();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await zoneService.delete(selected._id);
      notify('success', `${type} deleted.`);
      closeModal();
      fetchZones();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to delete. It may have children.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">{type}s</h1>
          <p className="text-[var(--muted)] text-sm">{total} total {type.toLowerCase()}s</p>
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
              <th className="text-right px-4 py-3 font-semibold text-[var(--foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-12 text-[var(--muted)]">Loading...</td></tr>
            ) : zones.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12 text-[var(--muted)]">No {type.toLowerCase()}s found.</td></tr>
            ) : zones.map((z) => (
              <tr key={z._id} className="border-b border-[var(--card-border)] hover:bg-[var(--accent)]/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <span className="font-medium text-[var(--foreground)]">{z.name}</span>
                  </div>
                </td>
                {parentType && (
                  <td className="px-4 py-3 text-[var(--muted)] hidden sm:table-cell">
                    {z.parent?.name ?? <span className="text-red-400 text-xs">No {parentType}</span>}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(z)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => openDelete(z)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass}>
                <option value="">Select {parentType}</option>
                {parents.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              {parents.length === 0 && (
                <p className="text-amber-500 text-xs mt-1">No {parentType.toLowerCase()}s found. Create {parentType.toLowerCase()}s first.</p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={`${type} name`} onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'delete'} onClose={closeModal} title={`Delete ${type}`} size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">Delete {type.toLowerCase()} <strong className="text-[var(--foreground)]">&ldquo;{selected?.name}&rdquo;</strong>? Remove all children first.</p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60 transition-colors">{submitting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
