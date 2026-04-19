'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { zoneService, ZonePayload } from '@/services/zone.service';
import { adminAreaService } from '@/services/adminArea.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

interface NamedRef { _id: string; name: string }
interface Zone {
  _id: string;
  title: string;
  division?: NamedRef | null;
  district?: NamedRef | null;
  upazila?: NamedRef | null;
  union?: NamedRef | null;
}

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

function ZoneFormModal({ zone, onClose, onSaved }: { zone?: Zone | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(zone?.title ?? '');
  const [divisionId, setDivisionId] = useState(zone?.division?._id ?? '');
  const [districtId, setDistrictId] = useState(zone?.district?._id ?? '');
  const [upazilaId, setUpazilaId] = useState(zone?.upazila?._id ?? '');
  const [unionId, setUnionId] = useState(zone?.union?._id ?? '');

  const [divisions, setDivisions] = useState<NamedRef[]>([]);
  const [districts, setDistricts] = useState<NamedRef[]>([]);
  const [upazilas, setUpazilas] = useState<NamedRef[]>([]);
  const [unions, setUnions] = useState<NamedRef[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  useEffect(() => {
    adminAreaService.getAll({ type: 'Division', limit: '200' }).then((r) =>
      setDivisions(r.data.data.areas)
    ).catch(() => {});
  }, []);

  useEffect(() => {
    setDistrictId('');
    setUpazilaId('');
    setUnionId('');
    if (divisionId) {
      adminAreaService.getAll({ type: 'District', parentId: divisionId, limit: '300' }).then((r) =>
        setDistricts(r.data.data.areas)
      ).catch(() => {});
    } else {
      setDistricts([]);
    }
  }, [divisionId]);

  useEffect(() => {
    setUpazilaId('');
    setUnionId('');
    if (districtId) {
      adminAreaService.getAll({ type: 'Upazila', parentId: districtId, limit: '300' }).then((r) =>
        setUpazilas(r.data.data.areas)
      ).catch(() => {});
    } else {
      setUpazilas([]);
    }
  }, [districtId]);

  useEffect(() => {
    setUnionId('');
    if (upazilaId) {
      adminAreaService.getAll({ type: 'Union', parentId: upazilaId, limit: '500' }).then((r) =>
        setUnions(r.data.data.areas)
      ).catch(() => {});
    } else {
      setUnions([]);
    }
  }, [upazilaId]);

  const handleSave = async () => {
    if (!title.trim()) return notify('error', 'Title is required.');
    setSubmitting(true);
    try {
      const payload: ZonePayload = {
        title: title.trim(),
        division: divisionId || null,
        district: districtId || null,
        upazila: upazilaId || null,
        union: unionId || null,
      };
      if (zone) {
        await zoneService.update(zone._id, payload);
        notify('success', 'Zone updated.');
      } else {
        await zoneService.create(payload);
        notify('success', 'Zone created.');
      }
      setTimeout(onSaved, 400);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Notification notification={notification} />
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Zone Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Dhaka South Zone" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Division</label>
            <select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} className={inputClass}>
              <option value="">Select Division</option>
              {divisions.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">District</label>
            <select value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!divisionId} className={inputClass + ' disabled:opacity-50'}>
              <option value="">Select District</option>
              {districts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Upazila</label>
            <select value={upazilaId} onChange={(e) => setUpazilaId(e.target.value)} disabled={!districtId} className={inputClass + ' disabled:opacity-50'}>
              <option value="">Select Upazila</option>
              {upazilas.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Union</label>
            <select value={unionId} onChange={(e) => setUnionId(e.target.value)} disabled={!upazilaId} className={inputClass + ' disabled:opacity-50'}>
              <option value="">Select Union</option>
              {unions.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">
            {submitting ? 'Saving...' : zone ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (search) params.search = search;
      const res = await zoneService.getAll(params);
      const d = res.data.data;
      setZones(d.zones);
      setTotal(d.total);
      setPages(d.pages);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const openModal = (type: typeof modal, zone?: Zone) => { setSelected(zone ?? null); setModal(type); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await zoneService.delete(selected._id);
      notify('success', 'Zone deleted.');
      closeModal();
      fetchZones();
    } catch { notify('error', 'Failed to delete.'); }
    finally { setSubmitting(false); }
  };

  const areaLabel = (zone: Zone) => [zone.division?.name, zone.district?.name, zone.upazila?.name, zone.union?.name].filter(Boolean).join(' › ');

  return (
    <div className="space-y-6">
      <Notification notification={notification} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Zones</h1>
          <p className="text-[var(--muted)] text-sm">{total} total zones</p>
        </div>
        <button onClick={() => openModal('create')} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add Zone
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search zones..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm" />
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--accent)]/50">
              <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">Zone Title</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden lg:table-cell">Location</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-12 text-[var(--muted)]">Loading...</td></tr>
            ) : zones.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-12 text-[var(--muted)]">No zones found.</td></tr>
            ) : zones.map((z) => (
              <tr key={z._id} className="border-b border-[var(--card-border)] hover:bg-[var(--accent)]/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-[var(--foreground)]">{z.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-[var(--muted)]">{areaLabel(z) || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openModal('edit', z)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => openModal('delete', z)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--muted)]">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modal === 'create'} onClose={closeModal} title="Create Zone" size="lg">
        <ZoneFormModal onClose={closeModal} onSaved={() => { closeModal(); fetchZones(); }} />
      </Modal>
      <Modal isOpen={modal === 'edit'} onClose={closeModal} title="Edit Zone" size="lg">
        <ZoneFormModal zone={selected} onClose={closeModal} onSaved={() => { closeModal(); fetchZones(); }} />
      </Modal>
      <Modal isOpen={modal === 'delete'} onClose={closeModal} title="Delete Zone" size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">Delete zone <strong className="text-[var(--foreground)]">&ldquo;{selected?.title}&rdquo;</strong>?</p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60">{submitting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
