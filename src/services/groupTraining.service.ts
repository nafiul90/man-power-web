import api from '@/lib/api';

export const groupTrainingService = {
  getMine: (params?: Record<string, string>) => api.get('/group-trainings/mine', { params }),
  getByGroup: (groupId: string) => api.get(`/group-trainings/group/${groupId}`),
  getById: (id: string) => api.get(`/group-trainings/${id}`),
  assign: (data: { groupId: string; trainingId: string; instructors?: string[]; scheduledDate?: string }) =>
    api.post('/group-trainings', data),
  updateInstructors: (id: string, instructors: string[]) =>
    api.put(`/group-trainings/${id}/instructors`, { instructors }),
  updateStatus: (id: string, data: { status: string; note?: string }) =>
    api.put(`/group-trainings/${id}/status`, data),
  delete: (id: string) => api.delete(`/group-trainings/${id}`),
};
