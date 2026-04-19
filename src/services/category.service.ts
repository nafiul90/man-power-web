import api from '@/lib/api';

export const categoryService = {
  getAll: (params?: Record<string, string>) => api.get('/categories', { params }),
  create: (title: string) => api.post('/categories', { title }),
  update: (id: string, title: string) => api.put(`/categories/${id}`, { title }),
  delete: (id: string) => api.delete(`/categories/${id}`),
};
