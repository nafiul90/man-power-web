'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { Plus, Edit, Trash2, Search, MapPin, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  thana?: NamedRef | null;
  union?: NamedRef | null;
  admins?: { _id: string; fullName: string; phone?: string }[];
}

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

function WardFormModal({ ward, onClose, onSaved }: { ward?: Ward | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(ward?.title ?? '');
  const [divisionId, setDivisionId] = useState(ward?.division?._id ?? '');
  const [districtId, setDistrictId] = useState(ward?.district?._id ?? '');
  const [upazilaId, setUpazilaId] = useState(ward?.upazila?._id ?? '');
  const [thanaId, setThanaId] = useState(ward?.thana?._id ?? '');
  const [unionId, setUnionId] = useState(ward?.union?._id ?? '');
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>(ward?.admins?.map((a) => a._id) ?? []);
  const [adminUsers, setAdminUsers] = useState<{ _id: string; fullName: string; phone?: string }[]>([]);
  const [adminSearch, setAdminSearch] = useState('');

  const [divisions, setDivisions] = useState<NamedRef[]>([]);
  const [districts, setDistricts] = useState<NamedRef[]>([]);
  const [upazilas, setUpazilas] = useState<NamedRef[]>([]);
  const [thanas, setThanas] = useState<NamedRef[]>([]);
  const [unions, setUnions] = useState<NamedRef[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Allowed IDs per level from the current user's geoScope.
  // - undefined: free choice (any value)
  // - empty array: no territory assigned (shouldn't normally happen)
  // - 1 element: locked to that single value
  // - 2+ elements: dropdown restricted to those values, user picks one
  const [allowed, setAllowed] = useState<{ division?: string[]; district?: string[]; upazila?: string[]; thana?: string[]; union?: string[] }>({});
  const { notification, notify } = useNotification();

  useEffect(() => {
    adminAreaService.getAll({ type: 'Division', limit: '200' }).then((r) =>
      setDivisions(r.data.data.areas)
    ).catch(() => {});
    userService.getAll({ role: 'Ward Admin', limit: '500' }).then((r) =>
      setAdminUsers(r.data.data.users)
    ).catch(() => {});

    // For new wards, pre-fill the form from the current user's territory.
    if (!ward) {
      userService.getMe().then((r) => {
        const me = r.data.data;
        const gs = me?.geoScope ?? {};
        const next: typeof allowed = {};
        const apply = (key: 'division' | 'district' | 'upazila' | 'thana' | 'union', ids: unknown) => {
          if (!Array.isArray(ids)) return;
          const list = ids.map(String);
          next[key] = list;
          if (list.length === 1) {
            const v = list[0];
            if (key === 'division') setDivisionId(v);
            else if (key === 'district') setDistrictId(v);
            else if (key === 'upazila') setUpazilaId(v);
            else if (key === 'thana') setThanaId(v);
            else if (key === 'union') setUnionId(v);
          }
        };
        apply('division', gs.divisionIds);
        apply('district', gs.districtIds);
        apply('upazila',  gs.upazilaIds);
        apply('thana',    gs.thanaIds);
        apply('union',    gs.unionIds);
        setAllowed(next);
      }).catch(() => {});
    }
  }, [ward]);

  useEffect(() => {
    if (divisionId) {
      adminAreaService.getAll({ type: 'District', parentId: divisionId, limit: '300' }).then((r) =>
        setDistricts(r.data.data.areas)
      ).catch(() => {});
    } else {
      setDistricts([]);
    }
  }, [divisionId]);

  useEffect(() => {
    if (districtId) {
      adminAreaService.getAll({ type: 'Upazila', parentId: districtId, limit: '300' }).then((r) =>
        setUpazilas(r.data.data.areas)
      ).catch(() => {});
    } else {
      setUpazilas([]);
    }
  }, [districtId]);

  useEffect(() => {
    if (upazilaId) {
      adminAreaService.getAll({ type: 'Thana', parentId: upazilaId, limit: '300' }).then((r) =>
        setThanas(r.data.data.areas)
      ).catch(() => {});
    } else {
      setThanas([]);
    }
  }, [upazilaId]);

  useEffect(() => {
    if (thanaId) {
      adminAreaService.getAll({ type: 'Union', parentId: thanaId, limit: '500' }).then((r) =>
        setUnions(r.data.data.areas)
      ).catch(() => {});
    } else {
      setUnions([]);
    }
  }, [thanaId]);

  const handleSave = async () => {
    if (!title.trim()) return notify('error', 'Title is required.');
    setSubmitting(true);
    try {
      const payload: WardPayload = {
        title: title.trim(),
        division: divisionId || null,
        district: districtId || null,
        upazila: upazilaId || null,
        thana: thanaId || null,
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
        {(() => {
          // Helpers for level locking and option filtering driven by `allowed`.
          const isLocked = (key: 'division' | 'district' | 'upazila' | 'thana' | 'union') =>
            (allowed[key]?.length ?? 0) === 1;
          const filterByAllowed = <T extends { _id: string }>(list: T[], key: 'division' | 'district' | 'upazila' | 'thana' | 'union') => {
            const a = allowed[key];
            if (!a) return list;
            const set = new Set(a);
            return list.filter((x) => set.has(x._id));
          };
          const visibleDivisions = filterByAllowed(divisions, 'division');
          const visibleDistricts = filterByAllowed(districts, 'district');
          const visibleUpazilas  = filterByAllowed(upazilas,  'upazila');
          const visibleThanas    = filterByAllowed(thanas,    'thana');
          const visibleUnions    = filterByAllowed(unions,    'union');
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Division{isLocked('division') ? ' (locked)' : ''}</label>
                <select value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setDistrictId(''); setUpazilaId(''); setThanaId(''); setUnionId(''); }} disabled={isLocked('division')} className={inputClass + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
                  <option value="">Select Division</option>
                  {visibleDivisions.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">District{isLocked('district') ? ' (locked)' : ''}</label>
                <select value={districtId} onChange={(e) => { setDistrictId(e.target.value); setUpazilaId(''); setThanaId(''); setUnionId(''); }} disabled={!divisionId || isLocked('district')} className={inputClass + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
                  <option value="">Select District</option>
                  {visibleDistricts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Upazila{isLocked('upazila') ? ' (locked)' : ''}</label>
                <select value={upazilaId} onChange={(e) => { setUpazilaId(e.target.value); setThanaId(''); setUnionId(''); }} disabled={!districtId || isLocked('upazila')} className={inputClass + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
                  <option value="">Select Upazila</option>
                  {visibleUpazilas.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Thana{isLocked('thana') ? ' (locked)' : ''}</label>
                <select value={thanaId} onChange={(e) => { setThanaId(e.target.value); setUnionId(''); }} disabled={!upazilaId || isLocked('thana')} className={inputClass + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
                  <option value="">Select Thana</option>
                  {visibleThanas.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Union{isLocked('union') ? ' (locked)' : ''}</label>
                <select value={unionId} onChange={(e) => setUnionId(e.target.value)} disabled={!thanaId || isLocked('union')} className={inputClass + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
                  <option value="">Select Union</option>
                  {visibleUnions.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            </div>
          );
        })()}
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

function WardsPageInner() {
  const sp = useSearchParams();
  const unionFilter = sp.get('union') ?? undefined;
  const parentName = sp.get('parentName') ?? undefined;

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
      if (unionFilter) params.union = unionFilter;
      const res = await wardService.getAll(params);
      const d = res.data.data;
      setWards(d.wards);
      setTotal(d.total);
      setPages(d.pages);
    } finally { setLoading(false); }
  }, [page, search, unionFilter]);

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

  const areaLabel = (ward: Ward) => [ward.division?.name, ward.district?.name, ward.upazila?.name, ward.thana?.name, ward.union?.name].filter(Boolean).join(' › ');

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      {/* Breadcrumb when filtered by union */}
      {parentName && (
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard/admin-areas/unions" className="flex items-center gap-1.5 text-[var(--primary)] hover:underline font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Unions
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span className="text-[var(--muted)]">{parentName}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {parentName ? `Wards in ${parentName}` : 'Wards'}
          </h1>
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
                    <Link
                      href={`/dashboard/groups?wardId=${w._id}&wardTitle=${encodeURIComponent(w.title)}`}
                      className="font-medium text-[var(--primary)] hover:underline flex items-center gap-1 group"
                      title={`View groups in ${w.title}`}
                    >
                      {w.title}
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
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

export default function WardsPage() {
  return (
    <Suspense fallback={<p className="text-center py-12 text-[var(--muted)]">Loading...</p>}>
      <WardsPageInner />
    </Suspense>
  );
}
