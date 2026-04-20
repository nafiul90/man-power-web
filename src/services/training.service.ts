import api from '@/lib/api';

export interface TrainingPayload {
  title: string;
  purpose?: string;
  isActive?: boolean;
}

export interface TrainingImage {
  _id: string;
  filename: string;
  originalName?: string;
  url: string;
  uploadedAt: string;
}

export const trainingService = {
  getAll: (params?: Record<string, string>) => api.get('/trainings', { params }),
  getById: (id: string) => api.get(`/trainings/${id}`),
  create: (data: TrainingPayload) => api.post('/trainings', data),
  update: (id: string, data: Partial<TrainingPayload>) => api.put(`/trainings/${id}`, data),
  delete: (id: string) => api.delete(`/trainings/${id}`),
  uploadImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/trainings/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteImage: (trainingId: string, imageId: string) =>
    api.delete(`/trainings/${trainingId}/images/${imageId}`),
};
