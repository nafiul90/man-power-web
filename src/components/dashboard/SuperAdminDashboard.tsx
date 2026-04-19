'use client';
import { useEffect, useState } from 'react';
import { Building2, Users, Sprout, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export function SuperAdminDashboard() {
  const [stats, setStats] = useState({ orgs: 0, users: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/organizations?limit=1').catch(() => null),
      api.get('/users?limit=1').catch(() => null),
    ]).then(([orgsRes, usersRes]) => {
      setStats({
        orgs: orgsRes?.data?.data?.total ?? 0,
        users: usersRes?.data?.data?.total ?? 0,
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Super Admin Dashboard</h1>
        <p className="text-[var(--muted)] text-sm mt-1">System-wide overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard/organizations" className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm hover:border-[var(--primary)] transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--muted)]">Organizations</span>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.orgs}</p>
          <div className="flex items-center gap-1 mt-3 text-[var(--primary)] text-xs font-medium group-hover:gap-2 transition-all">
            <span>Manage organizations</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        <Link href="/dashboard/users" className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm hover:border-[var(--primary)] transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[var(--muted)]">Total Users</span>
            <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded-lg">
              <Users className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-[var(--foreground)]">{stats.users}</p>
          <div className="flex items-center gap-1 mt-3 text-[var(--primary)] text-xs font-medium group-hover:gap-2 transition-all">
            <span>Manage users</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>

      <div className="bg-[var(--sidebar)] rounded-xl p-8 flex items-center gap-6">
        <div className="hidden sm:flex w-14 h-14 rounded-full bg-[#2d6a4f] items-center justify-center shrink-0">
          <Sprout className="w-7 h-7 text-[#74c69d]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#74c69d] mb-1">System Administration</h2>
          <p className="text-[#b7e4c7] text-sm">
            Create organizations, assign Org Owners, and manage all system users from this panel.
          </p>
        </div>
      </div>
    </div>
  );
}
