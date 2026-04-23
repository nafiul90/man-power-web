import api from '@/lib/api';

export interface WardPayload {
  title: string;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  union?: string | null;
}

export const wardService = {
  getAll: (params?: Record<string, string>) => api.get('/wards', { params }),
  getById: (id: string) => api.get(`/wards/${id}`),
  create: (data: WardPayload) => api.post('/wards', data),
  update: (id: string, data: Partial<WardPayload>) => api.put(`/wards/${id}`, data),
  delete: (id: string) => api.delete(`/wards/${id}`),
};
