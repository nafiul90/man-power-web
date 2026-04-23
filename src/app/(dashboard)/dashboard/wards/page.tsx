'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { wardService, WardPayload } from '@/services/ward.service';
import { adminAreaService } from '@/services/adminArea.service';
import { userService } from '@/services/user.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

interface NamedRef { _id: string; name: string }
interface Ward {
  _id: string;
  title: string;
  division?: NamedRef | null;
  district?: NamedRef | null;
  upazila?: NamedRef | null;
  union?: NamedRef | null;
  admins?: { _id: string; fullName: string; phone?: string }[];
}

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

function WardFormModal({ ward, onClose, onSaved }: { ward?: Ward | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(ward?.title ?? '');
  const [divisionId, setDivisionId] = useState(ward?.division?._id ?? '');
  const [districtId, setDistrictId] = useState(ward?.district?._id ?? '');
  const [upazilaId, setUpazilaId] = useState(ward?.upazila?._id ?? '');
  const [unionId, setUnionId] = useState(ward?.union?._id ?? '');
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>(ward?.admins?.map((a) => a._id) ?? []);
  const [adminUsers, setAdminUsers] = useState<{ _id: string; fullName: string; phone?: string }[]>([]);
  const [adminSearch, setAdminSearch] = useState('');

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
    userService.getAll({ role: 'Ward Admin', limit: '500' }).then((r) =>
      setAdminUsers(r.data.data.users)
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
      const payload: WardPayload = {
        title: title.trim(),
        division: divisionId || null,
        district: districtId || null,
        upazila: upazilaId || null,
        union: unionId || null,
        admins: selectedAdmins,
      };
      if (ward) {
        await wardService.update(ward._id, payload);
        notify('success', 'Ward updated.');
      } else {
        await wardService.create(payload);
        notify('success', 'Ward created.');
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
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Ward Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Dhaka South Ward" />
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
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            Ward Admins <span className="text-[var(--muted)] font-normal">({selectedAdmins.length} selected)</span>
          </label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
            <input
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              placeholder="Search Ward Admins..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs"
            />
          </div>
          {adminUsers.length === 0 ? (
            <p className="text-[var(--muted)] text-xs py-2">No Ward Admins available.</p>
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
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">
            {submitting ? 'Saving...' : ward ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function WardsPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Ward | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  const fetchWards = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (search) params.search = search;
      const res = await wardService.getAll(params);
      const d = res.data.data;
      setWards(d.wards);
      setTotal(d.total);
      setPages(d.pages);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchWards(); }, [fetchWards]);

  const openModal = (type: typeof modal, ward?: Ward) => { setSelected(ward ?? null); setModal(type); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await wardService.delete(selected._id);
      notify('success', 'Ward deleted.');
      closeModal();
      fetchWards();
    } catch { notify('error', 'Failed to delete.'); }
    finally { setSubmitting(false); }
  };

  const areaLabel = (ward: Ward) => [ward.division?.name, ward.district?.name, ward.upazila?.name, ward.union?.name].filter(Boolean).join(' › ');

  return (
    <div className="space-y-6">
      <Notification notification={notification} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Wards</h1>
          <p className="text-[var(--muted)] text-sm">{total} total wards</p>
        </div>
        <button onClick={() => openModal('create')} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add Ward
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search wards..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm" />
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)] bg-[var(--accent)]/50">
              <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">Ward Title</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden lg:table-cell">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden md:table-cell">Admins</th>
              <th className="text-right px-4 py-3 font-semibold text-[var(--foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12 text-[var(--muted)]">Loading...</td></tr>
            ) : wards.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-[var(--muted)]">No wards found.</td></tr>
            ) : wards.map((w) => (
              <tr key={w._id} className="border-b border-[var(--card-border)] hover:bg-[var(--accent)]/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium text-[var(--foreground)]">{w.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-[var(--muted)]">{areaLabel(w) || '—'}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {w.admins && w.admins.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {w.admins.map((a) => (
                        <span key={a._id} className="text-xs bg-[var(--accent)] text-[var(--foreground)] px-2 py-0.5 rounded-full">{a.fullName}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openModal('edit', w)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => openModal('delete', w)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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

      <Modal isOpen={modal === 'create'} onClose={closeModal} title="Create Ward" size="lg">
        <WardFormModal onClose={closeModal} onSaved={() => { closeModal(); fetchWards(); }} />
      </Modal>
      <Modal isOpen={modal === 'edit'} onClose={closeModal} title="Edit Ward" size="lg">
        <WardFormModal ward={selected} onClose={closeModal} onSaved={() => { closeModal(); fetchWards(); }} />
      </Modal>
      <Modal isOpen={modal === 'delete'} onClose={closeModal} title="Delete Ward" size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">Delete ward <strong className="text-[var(--foreground)]">&ldquo;{selected?.title}&rdquo;</strong>?</p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60">{submitting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
