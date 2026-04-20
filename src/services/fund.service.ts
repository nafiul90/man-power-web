import api from '@/lib/api';

export interface FundMemberPayload {
  userId: string;
  loanAmount: number;
}

export interface FundPayload {
  title: string;
  description?: string;
  sourceGroup?: string;
  members: FundMemberPayload[];
  totalAmount: number;
  interestRate?: number;
  interestType?: 'monthly' | 'annual';
  timeline: number;
  dueDay?: number;
  startDate: string;
  notes?: string;
}

export interface FundMember {
  _id: string;
  user: { _id: string; fullName: string; phone: string; userId: string };
  loanAmount: number;
  monthlyInstallment: number;
  totalPayable: number;
  totalPaid: number;
}

export interface Fund {
  _id: string;
  title: string;
  description?: string;
  org: string;
  sourceGroup?: { _id: string; title: string };
  members: FundMember[];
  totalAmount: number;
  interestRate: number;
  interestType: 'monthly' | 'annual';
  timeline: number;
  dueDay: number;
  startDate: string;
  status: 'Draft' | 'Active' | 'Completed' | 'Cancelled';
  notes?: string;
  createdBy?: { _id: string; fullName: string };
  createdAt: string;
}

export const fundService = {
  getAll: (params?: Record<string, string>) => api.get('/funds', { params }),
  getById: (id: string) => api.get(`/funds/${id}`),
  create: (data: FundPayload) => api.post('/funds', data),
  update: (id: string, data: Partial<FundPayload>) => api.put(`/funds/${id}`, data),
  delete: (id: string) => api.delete(`/funds/${id}`),
  activate: (id: string) => api.post(`/funds/${id}/activate`),
  updateStatus: (id: string, status: string) => api.patch(`/funds/${id}/status`, { status }),
  getSummary: (id: string) => api.get(`/funds/${id}/summary`),
};
