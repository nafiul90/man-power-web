'use client';
import { useAuthStore } from '@/store/authStore';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';
import { OrgOwnerDashboard } from '@/components/dashboard/OrgOwnerDashboard';
import { InstructorDashboard } from '@/components/dashboard/InstructorDashboard';
import { TeamLeaderDashboard } from '@/components/dashboard/TeamLeaderDashboard';
import { DefaultDashboard } from '@/components/dashboard/DefaultDashboard';
import { DashboardGallery } from '@/components/dashboard/DashboardGallery';

const GEO_ADMIN_ROLES = ['Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  let content;
  if (user?.role === 'Super Admin') content = <SuperAdminDashboard />;
  else if (user?.role === 'Org Owner' || GEO_ADMIN_ROLES.includes(user?.role ?? '')) content = <OrgOwnerDashboard />;
  else if (user?.role === 'Instructor') content = <InstructorDashboard />;
  else if (user?.role === 'Team Leader' || user?.role === 'Secretary') content = <TeamLeaderDashboard />;
  else content = <DefaultDashboard />;

  return (
    <>
      {content}
      <DashboardGallery />
    </>
  );
}
