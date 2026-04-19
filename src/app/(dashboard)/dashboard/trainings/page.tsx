'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, BookOpen, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { trainingService } from '@/services/training.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

interface Training { _id: string; title: string; purpose?: string; isActive: boolean; createdAt: string }

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Training | null>(null);
  const [form, setForm] = useState({ title: '', purpose: '' });
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { notification, notify } = useNotification();

  const fetchTrainings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (search) params.search = search;
      const res = await trainingService.getAll(params);
      setTrainings(res.data.data.trainings);
      setTotal(res.data.data.total);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchTrainings(); }, [fetchTrainings]);

  const openCreate = () => { setForm({ title: '', purpose: '' }); setSelected(null); setModal('create'); };
  const openEdit = (t: Training) => { setForm({ title: t.title, purpose: t.purpose || '' }); setSelected(t); setModal('edit'); };
  const openDelete = (t: Training) => { setSelected(t); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSave = async () => {
    if (!form.title.trim()) return notify('error', 'Title is required.');
    setSubmitting(true);
    try {
      if (modal === 'edit' && selected) {
        await trainingService.update(selected._id, form);
        notify('success', 'Training updated.');
      } else {
        await trainingService.create(form);
        notify('success', 'Training created.');
      }
      closeModal();
      fetchTrainings();
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
      await trainingService.delete(selected._id);
      notify('success', 'Training deleted.');
      closeModal();
      fetchTrainings();
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Trainings</h1>
          <p className="text-[var(--muted)] text-sm">{total} total trainings</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add Training
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trainings..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm" />
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-center py-12 text-[var(--muted)]">Loading...</p>
        ) : trainings.length === 0 ? (
          <p className="text-center py-12 text-[var(--muted)]">No trainings found. Add your first training.</p>
        ) : trainings.map((t) => (
          <div key={t._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)] text-sm truncate">{t.title}</p>
                  {t.purpose && <p className="text-xs text-[var(--muted)] truncate">{t.purpose}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {t.purpose && (
                  <button onClick={() => setExpandedId(expandedId === t._id ? null : t._id)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] transition-colors">
                    {expandedId === t._id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openDelete(t)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {expandedId === t._id && t.purpose && (
              <div className="px-4 pb-4 pt-0 border-t border-[var(--card-border)]">
                <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{t.purpose}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={closeModal} title={modal === 'edit' ? 'Edit Training' : 'Add Training'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Title *</label>
            <input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="Training title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Purpose</label>
            <textarea value={form.purpose} onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))} className={inputClass + ' resize-none'} rows={4} placeholder="Describe the purpose of this training..." />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'delete'} onClose={closeModal} title="Delete Training" size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">Delete training <strong className="text-[var(--foreground)]">&ldquo;{selected?.title}&rdquo;</strong>? This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60 transition-colors">{submitting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
