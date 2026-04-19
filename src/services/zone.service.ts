import api from '@/lib/api';

export type ZoneType = 'Division' | 'District' | 'Upazila' | 'Union';

export interface ZonePayload { name: string; type: ZoneType; parent?: string }

export const zoneService = {
  getAll: (params?: Record<string, string>) => api.get('/zones', { params }),
  create: (data: ZonePayload) => api.post('/zones', data),
  update: (id: string, data: Partial<ZonePayload>) => api.put(`/zones/${id}`, data),
  delete: (id: string) => api.delete(`/zones/${id}`),
};
