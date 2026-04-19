'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Key, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { userService } from '@/services/user.service';
import { User as UserType } from '@/lib/auth';
import { RoleBadge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { UserForm } from '@/components/users/UserForm';
import { ChangePasswordForm } from '@/components/users/ChangePasswordForm';
import { useAuthStore } from '@/store/authStore';

type ModalType = 'create' | 'edit' | 'password' | 'delete' | null;

export default function UsersPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const { user: currentUser } = useAuthStore();

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await userService.getAll(params);
      const data = res.data.data;
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openModal = (type: ModalType, user?: UserType) => {
    setSelectedUser(user || null);
    setModal(type);
  };

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
    } finally {
      setSubmitting(false);
    }
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
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (newPassword: string) => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await userService.changePassword(selectedUser._id, newPassword);
      notify('success', 'Password changed successfully.');
      closeModal();
    } catch {
      notify('error', 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await userService.delete(selectedUser._id);
      notify('success', 'User deleted.');
      closeModal();
      fetchUsers();
    } catch {
      notify('error', 'Failed to delete user.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const canManage = ['Super Admin', 'Org Owner'].includes(currentUser?.role || '');

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
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add User
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
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
        >
          <option value="">All Roles</option>
          {['Super Admin', 'Org Owner', 'Manager', 'Instructor', 'Accountant', 'Member'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--accent)]/50">
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">User</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden lg:table-cell">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[var(--muted)]">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[var(--muted)]">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="border-b border-[var(--card-border)] hover:bg-[var(--accent)]/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{u.fullName}</p>
                          <p className="text-xs text-[var(--muted)]">{u.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)] hidden sm:table-cell">{u.phone}</td>
                    <td className="px-4 py-3 hidden md:table-cell"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><StatusBadge active={u.isActive} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <>
                            <button
                              onClick={() => openModal('edit', u)}
                              className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors"
                              title="Edit user"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openModal('password', u)}
                              className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-blue-500 transition-colors"
                              title="Change password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isSuperAdmin && u.role !== 'Super Admin' && (
                          <button
                            onClick={() => openModal('delete', u)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--card-border)]">
            <p className="text-sm text-[var(--muted)]">Page {page} of {pages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
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
          <ChangePasswordForm
            userName={selectedUser.fullName}
            onSubmit={handleChangePassword}
            isSubmitting={submitting}
          />
        )}
      </Modal>

      <Modal isOpen={modal === 'delete'} onClose={closeModal} title="Delete User" size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-[var(--foreground)]">{selectedUser?.fullName}</span>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-[var(--foreground)] hover:bg-[var(--accent)] text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {submitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
