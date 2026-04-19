'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Building2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { organizationService } from '@/services/organization.service';
import { userService } from '@/services/user.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Owner { _id: string; fullName: string; phone: string }
interface Org { _id: string; title: string; owners: Owner[]; isActive: boolean; createdAt: string }

const orgSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  owners: z.array(z.string()).optional(),
});
type OrgForm = z.infer<typeof orgSchema>;

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

function OrgFormModal({ org, onClose, onSaved, availableOwners }: {
  org?: Org | null;
  onClose: () => void;
  onSaved: () => void;
  availableOwners: Owner[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();
  const [selectedOwners, setSelectedOwners] = useState<string[]>(
    org?.owners.map((o) => o._id) ?? []
  );

  const { register, handleSubmit, formState: { errors } } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    defaultValues: { title: org?.title ?? '' },
  });

  const toggleOwner = (id: string) =>
    setSelectedOwners((prev) => prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]);

  const onSubmit = async (data: OrgForm) => {
    setSubmitting(true);
    try {
      const payload = { ...data, owners: selectedOwners };
      if (org) {
        await organizationService.update(org._id, payload);
        notify('success', 'Organization updated.');
      } else {
        await organizationService.create(payload);
        notify('success', 'Organization created.');
      }
      setTimeout(onSaved, 500);
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Organization Title *</label>
          <input {...register('title')} className={inputClass} placeholder="e.g. Green Fields NGO" />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Assign Org Owners</label>
          {availableOwners.length === 0 ? (
            <p className="text-[var(--muted)] text-sm">No Org Owner users found. Create users with Org Owner role first.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto rounded-lg border border-[var(--card-border)] p-2">
              {availableOwners.map((owner) => (
                <label key={owner._id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--accent)] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedOwners.includes(owner._id)}
                    onChange={() => toggleOwner(owner._id)}
                    className="w-4 h-4 accent-[var(--primary)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{owner.fullName}</p>
                    <p className="text-xs text-[var(--muted)]">{owner.phone}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">
            {submitting ? 'Saving...' : org ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </>
  );
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Org | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [availableOwners, setAvailableOwners] = useState<Owner[]>([]);
  const { notification, notify } = useNotification();

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (search) params.search = search;
      const res = await organizationService.getAll(params);
      const d = res.data.data;
      setOrgs(d.orgs);
      setTotal(d.total);
      setPages(d.pages);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchOwners = useCallback(async () => {
    try {
      const res = await organizationService.getOrgOwners();
      setAvailableOwners(res.data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);
  useEffect(() => {
    if (modal === 'create' || modal === 'edit') fetchOwners();
  }, [modal, fetchOwners]);

  const openModal = (type: typeof modal, org?: Org) => {
    setSelected(org ?? null);
    setModal(type);
  };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleDelete = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await organizationService.delete(selected._id);
      notify('success', 'Organization deleted.');
      closeModal();
      fetchOrgs();
    } catch {
      notify('error', 'Failed to delete.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Organizations</h1>
          <p className="text-[var(--muted)] text-sm">{total} total organizations</p>
        </div>
        <button onClick={() => openModal('create')} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add Organization
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search organizations..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
        />
      </div>

      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--accent)]/50">
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)]">Organization</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--foreground)] hidden md:table-cell">Owners</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-12 text-[var(--muted)]">Loading...</td></tr>
              ) : orgs.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-12 text-[var(--muted)]">No organizations found.</td></tr>
              ) : orgs.map((org) => (
                <tr key={org._id} className="border-b border-[var(--card-border)] hover:bg-[var(--accent)]/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{org.title}</p>
                        <p className="text-xs text-[var(--muted)]">{org.owners.length} owner{org.owners.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {org.owners.length === 0 ? (
                        <span className="text-[var(--muted)] text-xs">No owners</span>
                      ) : org.owners.map((o) => (
                        <span key={o._id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[var(--accent)] text-[var(--primary)] font-medium">
                          {o.fullName}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openModal('edit', org)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => openModal('delete', org)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--accent)] disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modal === 'create'} onClose={closeModal} title="Add Organization" size="lg">
        <OrgFormModal availableOwners={availableOwners} onClose={closeModal} onSaved={() => { closeModal(); fetchOrgs(); }} />
      </Modal>
      <Modal isOpen={modal === 'edit'} onClose={closeModal} title="Edit Organization" size="lg">
        <OrgFormModal org={selected} availableOwners={availableOwners} onClose={closeModal} onSaved={() => { closeModal(); fetchOrgs(); }} />
      </Modal>
      <Modal isOpen={modal === 'delete'} onClose={closeModal} title="Delete Organization" size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">Delete <strong className="text-[var(--foreground)]">{selected?.title}</strong>? This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60 transition-colors">{submitting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
