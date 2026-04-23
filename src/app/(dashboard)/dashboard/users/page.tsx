'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit, Trash2, Key, User, ChevronLeft, ChevronRight,
  ExternalLink, SlidersHorizontal, X, Award, BookOpen, Users, Star,
} from 'lucide-react';
import { getRatingBg, getRatingTextClass, getRatingDotClass } from '@/lib/rating';
import Link from 'next/link';
import { userService } from '@/services/user.service';
import { groupService } from '@/services/group.service';
import { trainingService } from '@/services/training.service';
import { User as UserType } from '@/lib/auth';
import { RoleBadge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { UserForm } from '@/components/users/UserForm';
import { ChangePasswordForm } from '@/components/users/ChangePasswordForm';
import { useAuthStore } from '@/store/authStore';

type ModalType = 'create' | 'edit' | 'password' | 'delete' | 'rate' | null;

interface UserWithStats extends UserType {
  userId?: string;
  stats?: { trainings: number; avgRating: number | null; certs: number; groups: number };
}

interface FilterState {
  groupId: string;
  trainingId: string;
  minRating: string;
  maxRating: string;
  hasCert: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ratingInput, setRatingInput] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ groupId: '', trainingId: '', minRating: '', maxRating: '', hasCert: '' });
  const [filterGroups, setFilterGroups] = useState<{ _id: string; title: string }[]>([]);
  const [filterTrainings, setFilterTrainings] = useState<{ _id: string; title: string }[]>([]);
  const { user: currentUser } = useAuthStore();

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    groupService.getAll({ limit: '200' }).then((r) => setFilterGroups(r.data.data.groups)).catch(() => {});
    trainingService.getAll({ limit: '200' }).then((r) => setFilterTrainings(r.data.data.trainings)).catch(() => {});
  }, []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '10', withStats: 'true' };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (filters.groupId) params.groupId = filters.groupId;
      if (filters.trainingId) params.trainingId = filters.trainingId;
      if (filters.minRating) params.minRating = filters.minRating;
      if (filters.maxRating) params.maxRating = filters.maxRating;
      if (filters.hasCert) params.hasCert = filters.hasCert;
      const res = await userService.getAll(params);
      const data = res.data.data;
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, filters]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openModal = (type: ModalType, user?: UserWithStats) => { setSelectedUser(user || null); setModal(type); };
  const closeModal = () => { setModal(null); setSelectedUser(null); };

  const handleCreate = async (data: unknown) => {
    setSubmitting(true);
    try {
      await userService.create(data as Parameters<typeof userService.create>[0]);
      notify('success', 'User created successfully.');
      closeModal();
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to create user.');
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (data: unknown) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await userService.update(selectedUser._id, data as Parameters<typeof userService.update>[1]);
      notify('success', 'User updated successfully.');
      closeModal();
      fetchUsers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Failed to update user.');
    } finally { setSubmitting(false); }
  };

  const handleChangePassword = async (newPassword: string) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await userService.changePassword(selectedUser._id, newPassword);
      notify('success', 'Password changed successfully.');
      closeModal();
    } catch { notify('error', 'Failed to change password.'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await userService.delete(selectedUser._id);
      notify('success', 'User deleted.');
      closeModal();
      fetchUsers();
    } catch { notify('error', 'Failed to delete user.'); }
    finally { setSubmitting(false); }
  };

  const handleRate = async () => {
    if (!selectedUser) return;
    const val = parseFloat(ratingInput);
    if (isNaN(val) || val < 0 || val > 10) return notify('error', 'Rating must be between 0 and 10.');
    setSubmitting(true);
    try {
      await userService.rateUser(selectedUser._id, val);
      notify('success', 'Rating saved.');
      closeModal();
      fetchUsers();
    } catch { notify('error', 'Failed to save rating.'); }
    finally { setSubmitting(false); }
  };

  const clearFilters = () => {
    setFilters({ groupId: '', trainingId: '', minRating: '', maxRating: '', hasCert: '' });
    setPage(1);
  };

  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const canManage = ['Super Admin', 'Org Owner'].includes(currentUser?.role || '');
  const RATER_ROLES = ['Super Admin', 'Org Owner', 'Manager', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];
  const RATEABLE_ROLES = ['Member', 'Team Leader', 'Secretary', 'Instructor'];
  const canRateUsers = RATER_ROLES.includes(currentUser?.role || '');

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {notification.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Users</h1>
          <p className="text-[var(--muted)] text-sm">{total} total users</p>
        </div>
        {canManage && (
          <button onClick={() => openModal('create')} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, phone, email, or User ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
        >
          <option value="">All Roles</option>
          {['Super Admin', 'Org Owner', 'Manager', 'Instructor', 'Accountant', 'Member',
            'Team Leader', 'Secretary', 'District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${showFilters || activeFilterCount > 0 ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]' : 'border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--accent)]'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters{activeFilterCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--primary)] text-white text-xs">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Advanced Filters</h3>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Group</label>
              <select value={filters.groupId} onChange={(e) => { setFilters((f) => ({ ...f, groupId: e.target.value })); setPage(1); }} className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                <option value="">Any group</option>
                {filterGroups.map((g) => <option key={g._id} value={g._id}>{g.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Training</label>
              <select value={filters.trainingId} onChange={(e) => { setFilters((f) => ({ ...f, trainingId: e.target.value })); setPage(1); }} className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                <option value="">Any training</option>
                {filterTrainings.map((t) => <option key={t._id} value={t._id}>{t.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Has Certificate</label>
              <select value={filters.hasCert} onChange={(e) => { setFilters((f) => ({ ...f, hasCert: e.target.value })); setPage(1); }} className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                <option value="">Any</option>
                <option value="true">Has active certificate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Min Rating</label>
              <input type="number" min={0} max={10} step={0.5} value={filters.minRating} onChange={(e) => { setFilters((f) => ({ ...f, minRating: e.target.value })); setPage(1); }} placeholder="0" className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Max Rating</label>
              <input type="number" min={0} max={10} step={0.5} value={filters.maxRating} onChange={(e) => { setFilters((f) => ({ ...f, maxRating: e.target.value })); setPage(1); }} placeholder="10" className="w-full px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--accent)]/50">
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">User</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden lg:table-cell">Summary</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-[var(--muted)]">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-[var(--muted)]">No users found.</td></tr>
              ) : users.map((u) => (
                <tr key={u._id} className={`border-b border-[var(--card-border)] transition-colors hover:brightness-95 ${getRatingBg(u.stats?.avgRating ?? null)}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{u.fullName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-[var(--muted)]">{u.email || '—'}</p>
                          {u.userId && <span className="text-xs font-mono text-[var(--primary)] bg-[var(--accent)] px-1.5 py-0.5 rounded">{u.userId}</span>}
                        </div>
                        {u.stats && (
                          <div className="mt-1">
                            {u.stats.avgRating !== null ? (
                              <span className={`inline-flex items-center gap-1 text-sm font-bold px-2 py-0.5 rounded-md ${
                                u.stats.avgRating <= 4 ? 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-300' :
                                u.stats.avgRating <= 6 ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300' :
                                u.stats.avgRating <= 7.5 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300' :
                                'bg-green-200 text-green-800 dark:bg-green-900/60 dark:text-green-300'
                              }`}>
                                ★ {u.stats.avgRating}/10
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400 font-medium border border-red-200 dark:border-red-900">
                                No Rating Yet
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)] hidden sm:table-cell">{u.phone}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-col gap-1">
                      <RoleBadge role={u.role} />
                      <StatusBadge active={u.isActive} />
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {u.stats ? (
                      <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                          <Users className="w-3 h-3" /> {u.stats.groups}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                          <BookOpen className="w-3 h-3" /> {u.stats.trainings}
                        </span>
                        {/* <span className={`flex items-center gap-1 text-xs ${getRatingTextClass(u.stats.avgRating)}`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${getRatingDotClass(u.stats.avgRating)}`} />
                          {u.stats.avgRating !== null
                            ? `${u.stats.avgRating}/10`
                            : <span className="flex items-center gap-1">— <span className="px-1 py-0.5 rounded bg-red-100 dark:bg-red-950/50 text-red-500 dark:text-red-400 text-[10px] font-medium leading-none">No Rating</span></span>
                          }
                        </span> */}
                        <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                          <Award className="w-3 h-3 text-blue-500" /> {u.stats.certs}
                        </span>
                      </div>
                    ) : <span className="text-xs text-[var(--muted)]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canManage && (
                        <>
                          <button onClick={() => openModal('edit', u)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors" title="Edit user">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => openModal('password', u)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-blue-500 transition-colors" title="Change password">
                            <Key className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <Link href={`/dashboard/users/${u._id}/profile`} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-green-500 transition-colors" title="View profile">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      {canRateUsers && RATEABLE_ROLES.includes(u.role) && (
                        <button
                          onClick={() => { setRatingInput(''); openModal('rate', u); }}
                          className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-yellow-500 transition-colors"
                          title="Rate user"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      {isSuperAdmin && u.role !== 'Super Admin' && (
                        <button onClick={() => openModal('delete', u)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors" title="Delete user">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
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
      </div>

      {/* Modals */}
      <Modal isOpen={modal === 'create'} onClose={closeModal} title="Add New User" size="lg">
        <UserForm onSubmit={handleCreate} isSubmitting={submitting} />
      </Modal>
      <Modal isOpen={modal === 'edit'} onClose={closeModal} title="Edit User" size="lg">
        <UserForm user={selectedUser} onSubmit={handleEdit} isSubmitting={submitting} />
      </Modal>
      <Modal isOpen={modal === 'password'} onClose={closeModal} title="Change Password">
        {selectedUser && (
          <ChangePasswordForm userName={selectedUser.fullName} onSubmit={handleChangePassword} isSubmitting={submitting} />
        )}
      </Modal>
      <Modal isOpen={modal === 'delete'} onClose={closeModal} title="Delete User" size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">
          Delete <span className="font-semibold text-[var(--foreground)]">{selectedUser?.fullName}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--accent)] text-sm transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-60">
            {submitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
      <Modal isOpen={modal === 'rate'} onClose={closeModal} title={`Rate ${selectedUser?.fullName}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted)]">Enter a rating from 0 to 10 for this user.</p>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Rating (0–10)</label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={ratingInput}
              onChange={(e) => setRatingInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
              placeholder="e.g. 7.5"
              autoFocus
            />
            {ratingInput && (
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-md ${
                  parseFloat(ratingInput) <= 4 ? 'bg-red-200 text-red-800' :
                  parseFloat(ratingInput) <= 6 ? 'bg-yellow-200 text-yellow-800' :
                  parseFloat(ratingInput) <= 7.5 ? 'bg-blue-100 text-blue-800' :
                  'bg-green-200 text-green-800'
                }`}>
                  ★ {ratingInput}/10
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
            <button onClick={handleRate} disabled={submitting || !ratingInput} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60">
              {submitting ? 'Saving...' : 'Save Rating'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
