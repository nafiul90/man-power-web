import api from '@/lib/api';

export interface UserPayload {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
  gender?: string;
  role?: string;
}

export const userService = {
  getAll: (params?: Record<string, string>) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: UserPayload) => api.post('/users', data),
  update: (id: string, data: Partial<UserPayload>) => api.put(`/users/${id}`, data),
  changePassword: (id: string, newPassword: string) =>
    api.patch(`/users/${id}/change-password`, { newPassword }),
  delete: (id: string) => api.delete(`/users/${id}`),
  getMe: () => api.get('/users/me'),
  changeOwnPassword: (currentPassword: string, newPassword: string) =>
    api.patch('/users/me/change-password', { currentPassword, newPassword }),
};
