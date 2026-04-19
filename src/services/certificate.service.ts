import api from '@/lib/api';

export const certificateService = {
  getAll: (params?: Record<string, string>) => api.get('/certificates', { params }),
  getByMember: (memberId: string) => api.get(`/certificates/member/${memberId}`),
  getByGroup: (groupId: string) => api.get(`/certificates/group/${groupId}`),
  issue: (data: { memberId: string; groupTrainingId: string; notes?: string }) =>
    api.post('/certificates', data),
  revoke: (id: string) => api.put(`/certificates/${id}/revoke`),
};
