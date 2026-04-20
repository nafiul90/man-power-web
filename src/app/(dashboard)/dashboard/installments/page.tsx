'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Search, DollarSign, AlertCircle, CheckCircle, Clock, FileText,
  Download, RefreshCw, Calendar, Users, Filter, ChevronDown,
} from 'lucide-react';
import { installmentService, Installment, CollectionSummary } from '@/services/installment.service';
import { fundService, Fund } from '@/services/fund.service';
import { Modal } from '@/components/ui/Modal';
import { Notification } from '@/components/ui/Notification';
import { useNotification } from '@/hooks/useNotification';

type TabType = 'collect' | 'due' | 'report';

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Partial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Overdue: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm';

export default function InstallmentsPage() {
  const [tab, setTab] = useState<TabType>('collect');
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFundId, setSelectedFundId] = useState('');
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Due records state
  const [dueInstallments, setDueInstallments] = useState<Installment[]>([]);
  const [dueTotal, setDueTotal] = useState(0);
  const [dueLoading, setDueLoading] = useState(false);

  // Report state
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportData, setReportData] = useState<Installment[]>([]);
  const [reportSummary, setReportSummary] = useState<CollectionSummary | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Summary
  const [orgSummary, setOrgSummary] = useState<Record<string, number>>({});

  // Payment modal
  const [payModal, setPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState<Installment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  const { notification, notify } = useNotification();

  useEffect(() => {
    fundService.getAll({ status: 'Active', limit: '100' })
      .then((res) => setFunds(res.data.data.funds || []))
      .catch(() => {});
    installmentService.getOrgSummary()
      .then((res) => setOrgSummary(res.data.data))
      .catch(() => {});
  }, []);

  const fetchInstallments = useCallback(async () => {
    if (!selectedFundId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '200' };
      if (statusFilter) params.status = statusFilter;
      const res = await installmentService.getByFund(selectedFundId, params);
      setInstallments(res.data.data.installments || []);
      setTotal(res.data.data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [selectedFundId, statusFilter]);

  useEffect(() => { fetchInstallments(); }, [fetchInstallments]);

  const fetchDue = useCallback(async () => {
    setDueLoading(true);
    try {
      const params: Record<string, string> = { limit: '200' };
      if (selectedFundId) params.fundId = selectedFundId;
      const res = await installmentService.getDueRecords(params);
      setDueInstallments(res.data.data.installments || []);
      setDueTotal(res.data.data.total || 0);
    } finally {
      setDueLoading(false);
    }
  }, [selectedFundId]);

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const params: Record<string, string> = { limit: '500' };
      if (selectedFundId) params.fundId = selectedFundId;
      if (reportFrom) params.fromDate = reportFrom;
      if (reportTo) params.toDate = reportTo;
      const res = await installmentService.getCollectionReport(params);
      setReportData(res.data.data.installments || []);
      setReportSummary(res.data.data.summary);
    } finally {
      setReportLoading(false);
    }
  }, [selectedFundId, reportFrom, reportTo]);

  useEffect(() => {
    if (tab === 'due') fetchDue();
    if (tab === 'report') fetchReport();
  }, [tab, fetchDue, fetchReport]);

  const openPayModal = (inst: Installment) => {
    setPayTarget(inst);
    setPayAmount(String(inst.totalDue - inst.paidAmount));
    setPayNotes('');
    setPayModal(true);
  };

  const handleCollect = async () => {
    if (!payTarget || !payAmount || Number(payAmount) <= 0) return notify('error', 'Enter a valid payment amount.');
    setPaying(true);
    try {
      await installmentService.collectPayment(payTarget._id, { paidAmount: Number(payAmount), notes: payNotes });
      notify('success', 'Payment recorded successfully.');
      setPayModal(false);
      setPayTarget(null);
      fetchInstallments();
      installmentService.getOrgSummary().then((r) => setOrgSummary(r.data.data)).catch(() => {});
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      notify('error', msg || 'Payment failed.');
    } finally {
      setPaying(false);
    }
  };

  const handleMarkOverdue = async () => {
    try {
      await installmentService.markOverdue();
      notify('success', 'Overdue installments updated.');
      fetchInstallments();
      fetchDue();
    } catch {
      notify('error', 'Failed to mark overdue.');
    }
  };

  // Export to Excel
  const exportExcel = async (data: Installment[], filename: string) => {
    const { utils, writeFile } = await import('xlsx');
    const rows = data.map((i) => ({
      Member: typeof i.member === 'object' ? i.member.fullName : '',
      Phone: typeof i.member === 'object' ? i.member.phone : '',
      Fund: typeof i.fund === 'object' ? i.fund.title : '',
      'Installment #': i.installmentNumber,
      'Due Date': new Date(i.dueDate).toLocaleDateString(),
      'Total Due (৳)': i.totalDue,
      'Paid (৳)': i.paidAmount,
      'Balance (৳)': +(i.totalDue - i.paidAmount).toFixed(2),
      Status: i.status,
      'Paid At': i.paidAt ? new Date(i.paidAt).toLocaleDateString() : '',
      'Collected By': typeof i.collectedBy === 'object' && i.collectedBy ? i.collectedBy.fullName : '',
      Notes: i.notes || '',
    }));
    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Installments');
    writeFile(wb, `${filename}.xlsx`);
  };

  // Export to PDF
  const exportPDF = async (data: Installment[], filename: string, title: string) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(title, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Member', 'Phone', 'Fund', '#', 'Due Date', 'Total Due', 'Paid', 'Balance', 'Status', 'Paid At']],
      body: data.map((i) => [
        typeof i.member === 'object' ? i.member.fullName : '',
        typeof i.member === 'object' ? i.member.phone : '',
        typeof i.fund === 'object' ? i.fund.title : '',
        i.installmentNumber,
        new Date(i.dueDate).toLocaleDateString(),
        `৳${i.totalDue.toLocaleString()}`,
        `৳${i.paidAmount.toLocaleString()}`,
        `৳${(i.totalDue - i.paidAmount).toFixed(2)}`,
        i.status,
        i.paidAt ? new Date(i.paidAt).toLocaleDateString() : '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [45, 106, 79] },
    });
    doc.save(`${filename}.pdf`);
  };

  const filteredInstallments = installments.filter((i) => {
    if (!memberSearch) return true;
    const name = typeof i.member === 'object' ? i.member.fullName.toLowerCase() : '';
    const phone = typeof i.member === 'object' ? i.member.phone : '';
    return name.includes(memberSearch.toLowerCase()) || phone.includes(memberSearch);
  });

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Installment Collection</h1>
          <p className="text-[var(--muted)] text-sm">Manage loan repayments and track collections</p>
        </div>
        <button onClick={handleMarkOverdue} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors text-[var(--muted)]">
          <RefreshCw className="w-3.5 h-3.5" /> Mark Overdue
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Due', value: `৳${orgSummary.totalDue?.toLocaleString() ?? 0}`, icon: DollarSign, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { label: 'Total Paid', value: `৳${orgSummary.totalPaid?.toLocaleString() ?? 0}`, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Outstanding', value: `৳${orgSummary.totalOutstanding?.toLocaleString() ?? 0}`, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Overdue', value: `${orgSummary.Overdue ?? 0} records`, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
        ].map((c) => (
          <div key={c.label} className={`p-4 rounded-xl border border-[var(--card-border)] ${c.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <c.icon className={`w-4 h-4 ${c.color}`} />
              <p className="text-xs text-[var(--muted)]">{c.label}</p>
            </div>
            <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Fund Selector */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <select
            value={selectedFundId}
            onChange={(e) => setSelectedFundId(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none"
          >
            <option value="">All Active Funds</option>
            {funds.map((f) => <option key={f._id} value={f._id}>{f.title}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--card-border)]">
        <div className="flex gap-1">
          {([
            { key: 'collect', label: 'Collection', icon: DollarSign },
            { key: 'due', label: `Due Records${dueTotal ? ` (${dueTotal})` : ''}`, icon: AlertCircle },
            { key: 'report', label: 'Report', icon: FileText },
          ] as { key: TabType; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === key
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Collection Tab */}
      {tab === 'collect' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search member name or phone..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
            <button
              onClick={() => exportExcel(filteredInstallments, 'installments')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={() => exportPDF(filteredInstallments, 'installments', 'Installment Collection Report')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          {!selectedFundId ? (
            <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-10 text-center">
              <Users className="w-10 h-10 text-[var(--muted)] mx-auto mb-3 opacity-40" />
              <p className="text-sm text-[var(--muted)]">Select a fund above to view installments.</p>
            </div>
          ) : loading ? (
            <p className="text-center py-8 text-[var(--muted)] text-sm">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--accent)] text-[var(--muted)] text-xs">
                    <th className="text-left px-4 py-3">Member</th>
                    <th className="text-center px-3 py-3">#</th>
                    <th className="text-left px-3 py-3">Due Date</th>
                    <th className="text-right px-3 py-3">Total Due</th>
                    <th className="text-right px-3 py-3">Paid</th>
                    <th className="text-right px-3 py-3">Balance</th>
                    <th className="text-center px-3 py-3">Status</th>
                    <th className="text-center px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {filteredInstallments.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-[var(--muted)]">No installments found.</td></tr>
                  ) : filteredInstallments.map((i) => {
                    const balance = +(i.totalDue - i.paidAmount).toFixed(2);
                    const isOverdue = i.status === 'Overdue' || (i.status !== 'Paid' && new Date(i.dueDate) < new Date());
                    return (
                      <tr key={i._id} className={`hover:bg-[var(--accent)] transition-colors ${isOverdue && i.status !== 'Paid' ? 'bg-red-50/30 dark:bg-red-950/10' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--foreground)]">{typeof i.member === 'object' ? i.member.fullName : ''}</p>
                          <p className="text-xs text-[var(--muted)]">{typeof i.member === 'object' ? i.member.phone : ''}</p>
                        </td>
                        <td className="px-3 py-3 text-center text-[var(--muted)]">{i.installmentNumber}</td>
                        <td className="px-3 py-3">
                          <p className={`text-xs ${isOverdue && i.status !== 'Paid' ? 'text-red-500 font-medium' : 'text-[var(--foreground)]'}`}>
                            {new Date(i.dueDate).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-[var(--foreground)]">৳{i.totalDue.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-green-600">৳{i.paidAmount.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-medium text-red-500">৳{balance.toLocaleString()}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[i.status]}`}>{i.status}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {i.status !== 'Paid' && (
                            <button
                              onClick={() => openPayModal(i)}
                              className="px-3 py-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-xs font-medium transition-colors"
                            >
                              Collect
                            </button>
                          )}
                          {i.status === 'Paid' && (
                            <span className="text-xs text-[var(--muted)]">{i.paidAt ? new Date(i.paidAt).toLocaleDateString() : '—'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Due Records Tab */}
      {tab === 'due' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">{dueTotal} overdue / unpaid installments</p>
            <div className="flex gap-2">
              <button onClick={() => exportExcel(dueInstallments, 'due-installments')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--card-border)] text-xs hover:bg-[var(--accent)] transition-colors">
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
              <button onClick={() => exportPDF(dueInstallments, 'due-installments', 'Due Installments Report')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--card-border)] text-xs hover:bg-[var(--accent)] transition-colors">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>

          {dueLoading ? (
            <p className="text-center py-8 text-[var(--muted)] text-sm">Loading...</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--accent)] text-[var(--muted)] text-xs">
                    <th className="text-left px-4 py-3">Member</th>
                    <th className="text-left px-3 py-3">Fund</th>
                    <th className="text-center px-3 py-3">#</th>
                    <th className="text-left px-3 py-3">Due Date</th>
                    <th className="text-right px-3 py-3">Total Due</th>
                    <th className="text-right px-3 py-3">Paid</th>
                    <th className="text-right px-3 py-3">Balance</th>
                    <th className="text-center px-3 py-3">Status</th>
                    <th className="text-center px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {dueInstallments.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-[var(--muted)]">No due installments. All up to date!</td></tr>
                  ) : dueInstallments.map((i) => {
                    const balance = +(i.totalDue - i.paidAmount).toFixed(2);
                    const daysOverdue = Math.floor((Date.now() - new Date(i.dueDate).getTime()) / 86400000);
                    return (
                      <tr key={i._id} className="hover:bg-[var(--accent)] transition-colors bg-red-50/20 dark:bg-red-950/10">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--foreground)]">{typeof i.member === 'object' ? i.member.fullName : ''}</p>
                          <p className="text-xs text-[var(--muted)]">{typeof i.member === 'object' ? i.member.phone : ''}</p>
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--muted)]">{typeof i.fund === 'object' ? i.fund.title : ''}</td>
                        <td className="px-3 py-3 text-center text-[var(--muted)] text-xs">{i.installmentNumber}</td>
                        <td className="px-3 py-3">
                          <p className="text-xs text-red-500 font-medium">{new Date(i.dueDate).toLocaleDateString()}</p>
                          {daysOverdue > 0 && <p className="text-xs text-[var(--muted)]">{daysOverdue}d overdue</p>}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-[var(--foreground)]">৳{i.totalDue.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-green-600">৳{i.paidAmount.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right font-bold text-red-500">৳{balance.toLocaleString()}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[i.status]}`}>{i.status}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => openPayModal(i)} className="px-3 py-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-xs font-medium transition-colors">
                            Collect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Report Tab */}
      {tab === 'report' && (
        <div className="space-y-4">
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
                  <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className={inputClass + ' pl-9'} />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted)]" />
                  <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className={inputClass + ' pl-9'} />
                </div>
              </div>
              <button onClick={fetchReport} className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                Generate Report
              </button>
              <button onClick={() => exportExcel(reportData, 'collection-report')} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors whitespace-nowrap">
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
              <button onClick={() => exportPDF(reportData, 'collection-report', `Collection Report${reportFrom ? ` (${reportFrom} – ${reportTo})` : ''}`)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors whitespace-nowrap">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>

          {reportSummary && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Payments', value: reportSummary.count, color: 'text-[var(--primary)]' },
                { label: 'Total Collected', value: `৳${reportSummary.totalCollected?.toLocaleString()}`, color: 'text-green-600' },
                { label: 'Total Billed', value: `৳${reportSummary.totalDue?.toLocaleString()}`, color: 'text-orange-500' },
              ].map((c) => (
                <div key={c.label} className="p-4 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-center">
                  <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>
          )}

          {reportLoading ? (
            <p className="text-center py-8 text-[var(--muted)] text-sm">Loading report...</p>
          ) : reportData.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--accent)] text-[var(--muted)] text-xs">
                    <th className="text-left px-4 py-3">Member</th>
                    <th className="text-left px-3 py-3">Fund</th>
                    <th className="text-center px-3 py-3">#</th>
                    <th className="text-right px-3 py-3">Total Due</th>
                    <th className="text-right px-3 py-3">Paid</th>
                    <th className="text-center px-3 py-3">Status</th>
                    <th className="text-left px-3 py-3">Paid At</th>
                    <th className="text-left px-3 py-3">Collected By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {reportData.map((i) => (
                    <tr key={i._id} className="hover:bg-[var(--accent)] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--foreground)]">{typeof i.member === 'object' ? i.member.fullName : ''}</p>
                        <p className="text-xs text-[var(--muted)]">{typeof i.member === 'object' ? i.member.phone : ''}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">{typeof i.fund === 'object' ? i.fund.title : ''}</td>
                      <td className="px-3 py-3 text-center text-xs text-[var(--muted)]">{i.installmentNumber}</td>
                      <td className="px-3 py-3 text-right text-[var(--foreground)]">৳{i.totalDue.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right text-green-600 font-medium">৳{i.paidAmount.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[i.status]}`}>{i.status}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">{i.paidAt ? new Date(i.paidAt).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-3 text-xs text-[var(--muted)]">{typeof i.collectedBy === 'object' && i.collectedBy ? i.collectedBy.fullName : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-10 text-center">
              <FileText className="w-10 h-10 text-[var(--muted)] mx-auto mb-3 opacity-40" />
              <p className="text-sm text-[var(--muted)]">Select a date range and generate the report.</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Collection Modal */}
      <Modal isOpen={payModal} onClose={() => { setPayModal(false); setPayTarget(null); }} title="Record Payment" size="sm">
        {payTarget && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-[var(--accent)] border border-[var(--card-border)] text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Member</span>
                <span className="font-medium text-[var(--foreground)]">{typeof payTarget.member === 'object' ? payTarget.member.fullName : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Installment #</span>
                <span className="text-[var(--foreground)]">{payTarget.installmentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Due Date</span>
                <span className="text-[var(--foreground)]">{new Date(payTarget.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Total Due</span>
                <span className="font-semibold text-[var(--foreground)]">৳{payTarget.totalDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Already Paid</span>
                <span className="text-green-600">৳{payTarget.paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--card-border)] pt-1 mt-1">
                <span className="text-[var(--muted)]">Balance</span>
                <span className="font-bold text-red-500">৳{(payTarget.totalDue - payTarget.paidAmount).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Payment Amount (৳) *</label>
              <input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={inputClass} placeholder="Enter amount" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Notes</label>
              <input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className={inputClass} placeholder="Optional notes..." />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => { setPayModal(false); setPayTarget(null); }} className="px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm hover:bg-[var(--accent)] transition-colors">Cancel</button>
              <button onClick={handleCollect} disabled={paying} className="px-6 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-all">
                {paying ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
