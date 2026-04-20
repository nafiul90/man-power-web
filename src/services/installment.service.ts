import api from '@/lib/api';

export interface Installment {
  _id: string;
  fund: { _id: string; title: string } | string;
  member: { _id: string; fullName: string; phone: string; userId: string };
  org: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalDue: number;
  paidAmount: number;
  status: 'Pending' | 'Paid' | 'Partial' | 'Overdue';
  paidAt?: string;
  collectedBy?: { _id: string; fullName: string };
  notes?: string;
  createdAt: string;
}

export interface CollectionSummary {
  totalCollected: number;
  totalDue: number;
  count: number;
}

export const installmentService = {
  getByFund: (fundId: string, params?: Record<string, string>) =>
    api.get(`/installments/by-fund/${fundId}`, { params }),
  getByMember: (params?: Record<string, string>) =>
    api.get('/installments/by-member', { params }),
  getDueRecords: (params?: Record<string, string>) =>
    api.get('/installments/due', { params }),
  getCollectionReport: (params?: Record<string, string>) =>
    api.get('/installments/report', { params }),
  getOrgSummary: () => api.get('/installments/summary'),
  collectPayment: (id: string, data: { paidAmount: number; notes?: string }) =>
    api.patch(`/installments/${id}/collect`, data),
  markOverdue: () => api.post('/installments/mark-overdue'),
};
