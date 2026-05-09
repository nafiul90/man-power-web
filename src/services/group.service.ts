import api from '@/lib/api';

export type GroupLevel = 'Division' | 'District' | 'Upazila' | 'Union' | 'Ward';

export interface GroupPayload {
  title: string;
  level: GroupLevel;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  union?: string | null;
  ward?: string | null;
  category?: string | null;
  members?: string[];
  teamLeaders?: string[];
  secretaries?: string[];
}

export const groupService = {
  getAll: (params?: Record<string, string>) => api.get('/groups', { params }),
  getById: (id: string) => api.get(`/groups/${id}`),
  create: (data: GroupPayload) => api.post('/groups', data),
  update: (id: string, data: Partial<GroupPayload>) => api.put(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  updateAssignees: (id: string, data: { teamLeaders?: string[]; secretaries?: string[] }) =>
    api.put(`/groups/${id}/assignees`, data),
};
