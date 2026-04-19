import api from '@/lib/api';

export type AreaType = 'Division' | 'District' | 'Upazila' | 'Union';

export interface AdminAreaPayload { name: string; type: AreaType; parent?: string }

export const adminAreaService = {
  getAll: (params?: Record<string, string>) => api.get('/admin-areas', { params }),
  create: (data: AdminAreaPayload) => api.post('/admin-areas', data),
  update: (id: string, data: Partial<AdminAreaPayload>) => api.put(`/admin-areas/${id}`, data),
  delete: (id: string) => api.delete(`/admin-areas/${id}`),
};
