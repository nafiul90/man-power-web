'use client';
import { useAuthStore } from '@/store/authStore';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';
import { OrgOwnerDashboard } from '@/components/dashboard/OrgOwnerDashboard';
import { InstructorDashboard } from '@/components/dashboard/InstructorDashboard';
import { TeamLeaderDashboard } from '@/components/dashboard/TeamLeaderDashboard';
import { DefaultDashboard } from '@/components/dashboard/DefaultDashboard';

const GEO_ADMIN_ROLES = ['District Admin', 'Upazila Admin', 'Union Admin', 'Ward Admin'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  if (user?.role === 'Super Admin') return <SuperAdminDashboard />;
  if (user?.role === 'Org Owner' || GEO_ADMIN_ROLES.includes(user?.role ?? '')) return <OrgOwnerDashboard />;
  if (user?.role === 'Instructor') return <InstructorDashboard />;
  if (user?.role === 'Team Leader' || user?.role === 'Secretary') return <TeamLeaderDashboard />;
  return <DefaultDashboard />;
}
