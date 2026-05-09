'use client';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Plus, Edit, Trash2, UsersRound, Search, ChevronLeft, ChevronRight, ExternalLink, ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { groupService, GroupPayload, GroupLevel } from '@/services/group.service';
import { categoryService } from '@/services/category.service';
import { wardService } from '@/services/ward.service';
import { adminAreaService } from '@/services/adminArea.service';
import { userService } from '@/services/user.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

interface NamedRef { _id: string; name: string }
interface SimpleRef { _id: string; name?: string; title?: string; fullName?: string; phone?: string }
interface Group {
  _id: string;
  title: string;
  level: GroupLevel;
  division?: NamedRef | null;
  district?: NamedRef | null;
  upazila?: NamedRef | null;
  union?: NamedRef | null;
  ward?: SimpleRef | null;
  category?: SimpleRef | null;
  members: SimpleRef[];
  teamLeaders?: SimpleRef[];
  secretaries?: SimpleRef[];
}

const LEVELS: GroupLevel[] = ['Division', 'District', 'Upazila', 'Union', 'Ward'];
const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';
const selectClass = 'w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs';

function GroupFormModal({ group, onClose, onSaved }: { group?: Group | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(group?.title ?? '');
  const [level, setLevel] = useState<GroupLevel>(group?.level ?? 'Ward');
  const [divisionId, setDivisionId] = useState(group?.division?._id ?? '');
  const [districtId, setDistrictId] = useState(group?.district?._id ?? '');
  const [upazilaId, setUpazilaId] = useState(group?.upazila?._id ?? '');
  const [unionId, setUnionId] = useState(group?.union?._id ?? '');
  const [wardId, setWardId] = useState(group?.ward?._id ?? '');
  const [categoryId, setCategoryId] = useState(group?.category?._id ?? '');

  const [divisions, setDivisions] = useState<NamedRef[]>([]);
  const [districts, setDistricts] = useState<NamedRef[]>([]);
  const [upazilas, setUpazilas] = useState<NamedRef[]>([]);
  const [unions, setUnions] = useState<NamedRef[]>([]);
  const [wards, setWards] = useState<SimpleRef[]>([]);

  const [selectedMembers, setSelectedMembers] = useState<string[]>(group?.members.map((m) => m._id) ?? []);
  const [memberSearch, setMemberSearch] = useState('');
  const [categories, setCategories] = useState<SimpleRef[]>([]);
  const [users, setUsers] = useState<(SimpleRef & { phone?: string })[]>([]);
  const [selectedTeamLeaders, setSelectedTeamLeaders] = useState<string[]>(group?.teamLeaders?.map((t) => t._id) ?? []);
  const [selectedSecretaries, setSelectedSecretaries] = useState<string[]>(group?.secretaries?.map((s) => s._id) ?? []);
  const [tlSearch, setTlSearch] = useState('');
  const [secSearch, setSecSearch] = useState('');
  const [teamLeaderUsers, setTeamLeaderUsers] = useState<(SimpleRef & { phone?: string })[]>([]);
  const [secretaryUsers, setSecretaryUsers] = useState<(SimpleRef & { phone?: string })[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  // Initial load: divisions, wards, categories, users
  useEffect(() => {
    Promise.all([
      adminAreaService.getAll({ type: 'Division', limit: '200' }),
      wardService.getAll({ limit: '500' }),
      categoryService.getAll({ limit: '200' }),
      userService.getAll({ limit: '500' }),
      userService.getAll({ limit: '500', role: 'Team Leader' }),
      userService.getAll({ limit: '500', role: 'Secretary' }),
    ]).then(([dRes, zRes, cRes, uRes, tlRes, secRes]) => {
      setDivisions(dRes.data.data.areas);
      setWards(zRes.data.data.wards.map((w: { _id: string; title: string }) => ({ _id: w._id, title: w.title })));
      setCategories(cRes.data.data.categories.map((c: { _id: string; title: string }) => ({ _id: c._id, title: c.title })));
      setUsers(uRes.data.data.users.map((u: { _id: string; fullName: string; phone: string }) => ({ _id: u._id, fullName: u.fullName, phone: u.phone })));
      setTeamLeaderUsers(tlRes.data.data.users.map((u: { _id: string; fullName: string; phone: string }) => ({ _id: u._id, fullName: u.fullName, phone: u.phone })));
      setSecretaryUsers(secRes.data.data.users.map((u: { _id: string; fullName: string; phone: string }) => ({ _id: u._id, fullName: u.fullName, phone: u.phone })));
    }).catch(() => {});
  }, []);

  // Cascade district/upazila/union dropdowns
  useEffect(() => {
    if (!divisionId) { setDistricts([]); return; }
    adminAreaService.getAll({ type: 'District', parentId: divisionId, limit: '300' })
      .then((r) => setDistricts(r.data.data.areas)).catch(() => {});
  }, [divisionId]);
  useEffect(() => {
    if (!districtId) { setUpazilas([]); return; }
    adminAreaService.getAll({ type: 'Upazila', parentId: districtId, limit: '300' })
      .then((r) => setUpazilas(r.data.data.areas)).catch(() => {});
  }, [districtId]);
  useEffect(() => {
    if (!upazilaId) { setUnions([]); return; }
    adminAreaService.getAll({ type: 'Union', parentId: upazilaId, limit: '500' })
      .then((r) => setUnions(r.data.data.areas)).catch(() => {});
  }, [upazilaId]);

  // Reset child selections when parent changes (only for non-Ward levels — Ward uses standalone wardId)
  const onLevelChange = (next: GroupLevel) => {
    setLevel(next);
    // Clear lower-than-required selections to keep state consistent
    if (next === 'Division') { setDistrictId(''); setUpazilaId(''); setUnionId(''); setWardId(''); }
    else if (next === 'District') { setUpazilaId(''); setUnionId(''); setWardId(''); }
    else if (next === 'Upazila') { setUnionId(''); setWardId(''); }
    else if (next === 'Union') { setWardId(''); }
    else if (next === 'Ward') { setDivisionId(''); setDistrictId(''); setUpazilaId(''); setUnionId(''); }
  };

  const filteredUsers = useMemo(() => {
    if (!memberSearch.trim()) return users;
    const q = memberSearch.toLowerCase();
    return users.filter((u) => u.fullName?.toLowerCase().includes(q) || u.phone?.includes(q));
  }, [users, memberSearch]);
  const filteredTeamLeaders = useMemo(() => {
    if (!tlSearch.trim()) return teamLeaderUsers;
    const q = tlSearch.toLowerCase();
    return teamLeaderUsers.filter((u) => u.fullName?.toLowerCase().includes(q) || u.phone?.includes(q));
  }, [teamLeaderUsers, tlSearch]);
  const filteredSecretaries = useMemo(() => {
    if (!secSearch.trim()) return secretaryUsers;
    const q = secSearch.toLowerCase();
    return secretaryUsers.filter((u) => u.fullName?.toLowerCase().includes(q) || u.phone?.includes(q));
  }, [secretaryUsers, secSearch]);

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
    // Level-specific validation
    if (level === 'Division' && !divisionId) return notify('error', 'Select a division.');
    if (level === 'District' && !districtId) return notify('error', 'Select a district.');
    if (level === 'Upazila' && !upazilaId) return notify('error', 'Select an upazila.');
    if (level === 'Union' && !unionId) return notify('error', 'Select a union.');
    if (level === 'Ward' && !wardId) return notify('error', 'Select a ward.');

    setSubmitting(true);
    try {
      const payload: GroupPayload = {
        title: title.trim(),
        level,
        division: level === 'Division' ? divisionId : undefined,
        district: level === 'District' ? districtId : undefined,
        upazila: level === 'Upazila' ? upazilaId : undefined,
        union: level === 'Union' ? unionId : undefined,
        ward: level === 'Ward' ? wardId : undefined,
        category: categoryId || undefined,
        members: selectedMembers,
        teamLeaders: selectedTeamLeaders,
        secretaries: selectedSecretaries,
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

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Group Level *</label>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLevelChange(l)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${level === l ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--card-border)] hover:bg-[var(--accent)]'}`}
              >{l}</button>
            ))}
          </div>
        </div>

        {level !== 'Ward' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Division *</label>
              <select value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setDistrictId(''); setUpazilaId(''); setUnionId(''); }} className={inputClass}>
                <option value="">Select Division</option>
                {divisions.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            {level !== 'Division' && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">District *</label>
                <select value={districtId} onChange={(e) => { setDistrictId(e.target.value); setUpazilaId(''); setUnionId(''); }} disabled={!divisionId} className={inputClass + ' disabled:opacity-50'}>
                  <option value="">Select District</option>
                  {districts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
            )}
            {(level === 'Upazila' || level === 'Union') && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Upazila *</label>
                <select value={upazilaId} onChange={(e) => { setUpazilaId(e.target.value); setUnionId(''); }} disabled={!districtId} className={inputClass + ' disabled:opacity-50'}>
                  <option value="">Select Upazila</option>
                  {upazilas.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            )}
            {level === 'Union' && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Union *</label>
                <select value={unionId} onChange={(e) => setUnionId(e.target.value)} disabled={!upazilaId} className={inputClass + ' disabled:opacity-50'}>
                  <option value="">Select Union</option>
                  {unions.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {level === 'Ward' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Ward *</label>
              <select value={wardId} onChange={(e) => setWardId(e.target.value)} className={inputClass}>
                <option value="">Select ward</option>
                {wards.map((w) => <option key={w._id} value={w._id}>{w.title}</option>)}
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
        )}

        {level !== 'Ward' && (
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
        )}

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
            <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search members by name or phone..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs" />
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

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Team Leaders <span className="text-[var(--muted)] font-normal">({selectedTeamLeaders.length} selected)</span>
          </label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
            <input value={tlSearch} onChange={(e) => setTlSearch(e.target.value)} placeholder="Search team leaders..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs" />
          </div>
          {teamLeaderUsers.length === 0 ? (
            <p className="text-[var(--muted)] text-xs text-center py-3 border border-[var(--card-border)] rounded-lg">No Team Leader users available.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--card-border)] divide-y divide-[var(--card-border)]">
              {filteredTeamLeaders.length === 0 ? (
                <p className="text-[var(--muted)] text-xs text-center py-3">No match.</p>
              ) : filteredTeamLeaders.map((u) => {
                const isSel = selectedTeamLeaders.includes(u._id);
                return (
                  <label key={u._id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSel ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]/50'}`}>
                    <input type="checkbox" checked={isSel} onChange={() => setSelectedTeamLeaders((prev) => prev.includes(u._id) ? prev.filter((id) => id !== u._id) : [...prev, u._id])} className="w-4 h-4 accent-[var(--primary)] shrink-0" />
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

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
            Secretaries <span className="text-[var(--muted)] font-normal">({selectedSecretaries.length} selected)</span>
          </label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
            <input value={secSearch} onChange={(e) => setSecSearch(e.target.value)} placeholder="Search secretaries..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-xs" />
          </div>
          {secretaryUsers.length === 0 ? (
            <p className="text-[var(--muted)] text-xs text-center py-3 border border-[var(--card-border)] rounded-lg">No Secretary users available.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--card-border)] divide-y divide-[var(--card-border)]">
              {filteredSecretaries.length === 0 ? (
                <p className="text-[var(--muted)] text-xs text-center py-3">No match.</p>
              ) : filteredSecretaries.map((u) => {
                const isSel = selectedSecretaries.includes(u._id);
                return (
                  <label key={u._id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSel ? 'bg-[var(--accent)]' : 'hover:bg-[var(--accent)]/50'}`}>
                    <input type="checkbox" checked={isSel} onChange={() => setSelectedSecretaries((prev) => prev.includes(u._id) ? prev.filter((id) => id !== u._id) : [...prev, u._id])} className="w-4 h-4 accent-[var(--primary)] shrink-0" />
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

function GroupsPageInner() {
  const sp = useSearchParams();
  const initial = {
    level: (sp.get('level') ?? '') as GroupLevel | '',
    division: sp.get('division') ?? '',
    district: sp.get('district') ?? '',
    upazila: sp.get('upazila') ?? '',
    union: sp.get('union') ?? '',
    wardId: sp.get('wardId') ?? '',
    category: sp.get('category') ?? '',
  };
  const parentName = sp.get('parentName') ?? sp.get('wardTitle') ?? undefined;

  const [filters, setFilters] = useState(initial);
  // re-sync if URL changes
  useEffect(() => { setFilters(initial); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sp]);

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

  // Filter dropdown data
  const [categories, setCategories] = useState<{ _id: string; title: string }[]>([]);
  const [divisions, setDivisions] = useState<NamedRef[]>([]);
  const [districts, setDistricts] = useState<NamedRef[]>([]);
  const [upazilas, setUpazilas] = useState<NamedRef[]>([]);
  const [unions, setUnions] = useState<NamedRef[]>([]);
  const [wards, setWards] = useState<{ _id: string; title: string }[]>([]);

  useEffect(() => {
    Promise.all([
      categoryService.getAll({ limit: '200' }),
      adminAreaService.getAll({ type: 'Division', limit: '200' }),
      wardService.getAll({ limit: '500' }),
    ]).then(([cRes, dRes, wRes]) => {
      setCategories(cRes.data.data.categories);
      setDivisions(dRes.data.data.areas);
      setWards(wRes.data.data.wards.map((w: { _id: string; title: string }) => ({ _id: w._id, title: w.title })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.division) { setDistricts([]); return; }
    adminAreaService.getAll({ type: 'District', parentId: filters.division, limit: '300' })
      .then((r) => setDistricts(r.data.data.areas)).catch(() => {});
  }, [filters.division]);
  useEffect(() => {
    if (!filters.district) { setUpazilas([]); return; }
    adminAreaService.getAll({ type: 'Upazila', parentId: filters.district, limit: '300' })
      .then((r) => setUpazilas(r.data.data.areas)).catch(() => {});
  }, [filters.district]);
  useEffect(() => {
    if (!filters.upazila) { setUnions([]); return; }
    adminAreaService.getAll({ type: 'Union', parentId: filters.upazila, limit: '500' })
      .then((r) => setUnions(r.data.data.areas)).catch(() => {});
  }, [filters.upazila]);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '12' };
      if (search) params.search = search;
      if (filters.level) params.level = filters.level;
      if (filters.division) params.division = filters.division;
      if (filters.district) params.district = filters.district;
      if (filters.upazila) params.upazila = filters.upazila;
      if (filters.union) params.union = filters.union;
      if (filters.wardId) params.wardId = filters.wardId;
      if (filters.category) params.category = filters.category;
      const res = await groupService.getAll(params);
      const d = res.data.data;
      setGroups(d.groups);
      setTotal(d.total);
      setPages(d.pages);
    } finally { setLoading(false); }
  }, [page, search, filters]);

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

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Clear descendants when an ancestor changes
      if (key === 'division') { next.district = ''; next.upazila = ''; next.union = ''; }
      if (key === 'district') { next.upazila = ''; next.union = ''; }
      if (key === 'upazila') { next.union = ''; }
      return next;
    });
  };

  const clearFilters = () => {
    setPage(1);
    setFilters({ level: '', division: '', district: '', upazila: '', union: '', wardId: '', category: '' });
  };

  const hasFilter = !!(filters.level || filters.division || filters.district || filters.upazila || filters.union || filters.wardId || filters.category);

  const groupAreaLabel = (g: Group) => {
    const parts = [g.division?.name, g.district?.name, g.upazila?.name, g.union?.name, g.ward?.title].filter(Boolean);
    return parts.join(' › ');
  };

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      {parentName && (
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard/groups" className="flex items-center gap-1.5 text-[var(--primary)] hover:underline font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Groups
          </Link>
          <span className="text-[var(--muted)]">›</span>
          <span className="text-[var(--muted)]">{parentName}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {parentName ? `Groups in ${parentName}` : 'Groups'}
          </h1>
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

      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Filters</p>
          {hasFilter && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline font-medium">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          <select value={filters.level} onChange={(e) => updateFilter('level', e.target.value)} className={selectClass}>
            <option value="">All levels</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filters.category} onChange={(e) => updateFilter('category', e.target.value)} className={selectClass}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
          </select>
          <select value={filters.division} onChange={(e) => updateFilter('division', e.target.value)} className={selectClass}>
            <option value="">All divisions</option>
            {divisions.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={filters.district} onChange={(e) => updateFilter('district', e.target.value)} disabled={!filters.division} className={selectClass + ' disabled:opacity-50'}>
            <option value="">All districts</option>
            {districts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={filters.upazila} onChange={(e) => updateFilter('upazila', e.target.value)} disabled={!filters.district} className={selectClass + ' disabled:opacity-50'}>
            <option value="">All upazilas</option>
            {upazilas.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <select value={filters.union} onChange={(e) => updateFilter('union', e.target.value)} disabled={!filters.upazila} className={selectClass + ' disabled:opacity-50'}>
            <option value="">All unions</option>
            {unions.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <select value={filters.wardId} onChange={(e) => updateFilter('wardId', e.target.value)} className={selectClass}>
            <option value="">All wards</option>
            {wards.map((w) => <option key={w._id} value={w._id}>{w.title}</option>)}
          </select>
        </div>
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
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--muted)] w-16 shrink-0">Level:</span>
                <span className="bg-[var(--accent)] px-2 py-0.5 rounded text-[var(--primary)] font-medium">{group.level}</span>
              </div>
              {groupAreaLabel(group) && (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-[var(--muted)] w-16 shrink-0 mt-0.5">Area:</span>
                  <span className="text-[var(--foreground)]">{groupAreaLabel(group)}</span>
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

export default function GroupsPage() {
  return (
    <Suspense fallback={<p className="text-center py-12 text-[var(--muted)]">Loading...</p>}>
      <GroupsPageInner />
    </Suspense>
  );
}
