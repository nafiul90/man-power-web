import api from '@/lib/api';

export interface TrainingPayload {
  title: string;
  purpose?: string;
  isActive?: boolean;
}

export const trainingService = {
  getAll: (params?: Record<string, string>) => api.get('/trainings', { params }),
  getById: (id: string) => api.get(`/trainings/${id}`),
  create: (data: TrainingPayload) => api.post('/trainings', data),
  update: (id: string, data: Partial<TrainingPayload>) => api.put(`/trainings/${id}`, data),
  delete: (id: string) => api.delete(`/trainings/${id}`),
};
