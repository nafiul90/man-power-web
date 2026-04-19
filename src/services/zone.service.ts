import api from '@/lib/api';

export interface ZonePayload {
  title: string;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  union?: string | null;
}

export const zoneService = {
  getAll: (params?: Record<string, string>) => api.get('/zones', { params }),
  getById: (id: string) => api.get(`/zones/${id}`),
  create: (data: ZonePayload) => api.post('/zones', data),
  update: (id: string, data: Partial<ZonePayload>) => api.put(`/zones/${id}`, data),
  delete: (id: string) => api.delete(`/zones/${id}`),
};
