'use client';
import { Users, UsersRound, BookOpen, Wallet, TrendingUp, Sprout } from 'lucide-react';

const stats = [
  { label: 'Total Members', value: '0', icon: UsersRound, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { label: 'Active Groups', value: '0', icon: Users, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30' },
  { label: 'Trainings', value: '0', icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  { label: 'Total Funds', value: '৳0', icon: Wallet, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Welcome to AgriNGO Management System</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[var(--muted)]">{label}</span>
              <div className={`${bg} p-2 rounded-lg`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-500">No data yet</span>
            </div>
          </div>
        ))}
      </div>

      {/* Welcome card */}
      <div className="bg-[var(--sidebar)] rounded-xl p-8 flex items-center gap-6">
        <div className="hidden sm:flex w-16 h-16 rounded-full bg-[#2d6a4f] items-center justify-center shrink-0">
          <Sprout className="w-8 h-8 text-[#74c69d]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#74c69d] mb-1">AgriNGO Management System</h2>
          <p className="text-[#b7e4c7] text-sm">
            Manage your NGO members, groups, trainings, funds, and installments all in one place.
            Start by adding members and creating groups.
          </p>
        </div>
      </div>
    </div>
  );
}
