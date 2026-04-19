'use client';
import { useAuthStore } from '@/store/authStore';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';
import { OrgOwnerDashboard } from '@/components/dashboard/OrgOwnerDashboard';
import { InstructorDashboard } from '@/components/dashboard/InstructorDashboard';
import { DefaultDashboard } from '@/components/dashboard/DefaultDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (user?.role === 'Super Admin') return <SuperAdminDashboard />;
  if (user?.role === 'Org Owner') return <OrgOwnerDashboard />;
  if (user?.role === 'Instructor') return <InstructorDashboard />;
  return <DefaultDashboard />;
}
