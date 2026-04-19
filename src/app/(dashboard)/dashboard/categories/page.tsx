'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Tags, Search } from 'lucide-react';
import { categoryService } from '@/services/category.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

interface Category { _id: string; title: string; createdAt: string }

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { notification, notify } = useNotification();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (search) params.search = search;
      const res = await categoryService.getAll(params);
      setCategories(res.data.data.categories);
      setTotal(res.data.data.total);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => { setTitle(''); setSelected(null); setModal('create'); };
  const openEdit = (cat: Category) => { setTitle(cat.title); setSelected(cat); setModal('edit'); };
  const openDelete = (cat: Category) => { setSelected(cat); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setTitle(''); };

  const handleSave = async () => {
    if (!title.trim()) return notify('error', 'Title is required.');
    setSubmitting(true);
    try {
      if (modal === 'edit' && selected) {
        await categoryService.update(selected._id, title.trim());
        notify('success', 'Category updated.');
      } else {
        await categoryService.create(title.trim());
        notify('success', 'Category created.');
      }
      closeModal();
      fetchCategories();
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
      await categoryService.delete(selected._id);
      notify('success', 'Category deleted.');
      closeModal();
      fetchCategories();
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Categories</h1>
          <p className="text-[var(--muted)] text-sm">{total} total categories</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg font-medium text-sm transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search categories..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {loading ? (
          <p className="col-span-full text-center py-12 text-[var(--muted)]">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="col-span-full text-center py-12 text-[var(--muted)]">No categories found. Add your first category.</p>
        ) : categories.map((cat) => (
          <div key={cat._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4 flex items-center justify-between hover:border-[var(--primary)] transition-colors group shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                <Tags className="w-4 h-4 text-[var(--primary)]" />
              </div>
              <p className="font-medium text-[var(--foreground)] text-sm">{cat.title}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg hover:bg-[var(--accent)] text-[var(--muted)] hover:text-[var(--primary)] transition-colors">
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => openDelete(cat)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted)] hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modal === 'create' || modal === 'edit'} onClose={closeModal} title={modal === 'edit' ? 'Edit Category' : 'Add Category'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Category title" onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={submitting} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">{submitting ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modal === 'delete'} onClose={closeModal} title="Delete Category" size="sm">
        <p className="text-[var(--muted)] text-sm mb-6">Delete category <strong className="text-[var(--foreground)]">&ldquo;{selected?.title}&rdquo;</strong>?</p>
        <div className="flex justify-end gap-3">
          <button onClick={closeModal} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={submitting} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-60 transition-colors">{submitting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </Modal>
    </div>
  );
}
