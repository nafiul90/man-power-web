'use client';
import { useEffect, useState } from 'react';
import { Tags, Map, UsersRound, Users, ArrowRight, Sprout } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';

export function OrgOwnerDashboard() {
  const [org, setOrg] = useState<{ title: string } | null>(null);
  const [stats, setStats] = useState({ categories: 0, zones: 0, groups: 0, users: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/organizations/my').catch(() => null),
      api.get('/categories?limit=1').catch(() => null),
      api.get('/zones?limit=1').catch(() => null),
      api.get('/groups?limit=1').catch(() => null),
      api.get('/users?limit=1').catch(() => null),
    ]).then(([orgRes, catRes, zoneRes, groupRes, userRes]) => {
      setOrg(orgRes?.data?.data ?? null);
      setStats({
        categories: catRes?.data?.data?.total ?? 0,
        zones: zoneRes?.data?.data?.total ?? 0,
        groups: groupRes?.data?.data?.total ?? 0,
        users: userRes?.data?.data?.total ?? 0,
      });
    });
  }, []);

  const cards = [
    { label: 'Categories', value: stats.categories, icon: Tags, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30', href: '/dashboard/categories' },
    { label: 'Zones', value: stats.zones, icon: Map, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', href: '/dashboard/zones/divisions' },
    { label: 'Groups', value: stats.groups, icon: UsersRound, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', href: '/dashboard/groups' },
    { label: 'Users', value: stats.users, icon: Users, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30', href: '/dashboard/users' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {org?.title ?? 'Organization'} Dashboard
        </h1>
        <p className="text-[var(--muted)] text-sm mt-1">Organization overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm hover:border-[var(--primary)] transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[var(--muted)]">{label}</span>
              <div className={`${bg} p-2 rounded-lg`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
            <div className="flex items-center gap-1 mt-2 text-[var(--primary)] text-xs font-medium group-hover:gap-2 transition-all">
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-[var(--sidebar)] rounded-xl p-8 flex items-center gap-6">
        <div className="hidden sm:flex w-14 h-14 rounded-full bg-[#2d6a4f] items-center justify-center shrink-0">
          <Sprout className="w-7 h-7 text-[#74c69d]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#74c69d] mb-1">Organization Management</h2>
          <p className="text-[#b7e4c7] text-sm">
            Manage your organization&apos;s categories, zones, groups, and users from this panel.
          </p>
        </div>
      </div>
    </div>
  );
}
