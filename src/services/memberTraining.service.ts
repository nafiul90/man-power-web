import api from '@/lib/api';

export const memberTrainingService = {
  getByGroupTraining: (groupTrainingId: string) =>
    api.get(`/member-trainings/group-training/${groupTrainingId}`),
  getByMember: (memberId: string) => api.get(`/member-trainings/member/${memberId}`),
  rate: (id: string, rating: number) => api.put(`/member-trainings/${id}/rate`, { rating }),
};
