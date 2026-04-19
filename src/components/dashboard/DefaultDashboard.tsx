'use client';
import { useAuthStore } from '@/store/authStore';
import { Sprout } from 'lucide-react';

export function DefaultDashboard() {
  const { user } = useAuthStore();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Welcome, {user?.fullName}</p>
      </div>
      <div className="bg-[var(--sidebar)] rounded-xl p-8 flex items-center gap-6">
        <div className="hidden sm:flex w-14 h-14 rounded-full bg-[#2d6a4f] items-center justify-center shrink-0">
          <Sprout className="w-7 h-7 text-[#74c69d]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#74c69d] mb-1">AgriNGO Management System</h2>
          <p className="text-[#b7e4c7] text-sm">
            You are logged in as <strong>{user?.role}</strong>. Contact your administrator for access.
          </p>
        </div>
      </div>
    </div>
  );
}
