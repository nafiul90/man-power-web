import api from '@/lib/api';

export interface OrgPayload { title: string; owners: string[] }

export const organizationService = {
  getAll: (params?: Record<string, string>) => api.get('/organizations', { params }),
  getById: (id: string) => api.get(`/organizations/${id}`),
  getMyOrg: () => api.get('/organizations/my'),
  getOrgOwners: () => api.get('/organizations/owners'),
  create: (data: OrgPayload) => api.post('/organizations', data),
  update: (id: string, data: Partial<OrgPayload>) => api.put(`/organizations/${id}`, data),
  delete: (id: string) => api.delete(`/organizations/${id}`),
};
