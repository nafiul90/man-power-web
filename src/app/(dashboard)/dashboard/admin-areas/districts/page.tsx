import { AdminAreaList } from '@/components/wards/AdminAreaList';

export default async function DistrictsPage({
  searchParams,
}: {
  searchParams: Promise<{ parentId?: string; parentName?: string }>;
}) {
  const { parentId, parentName } = await searchParams;
  return <AdminAreaList type="District" parentId={parentId} parentName={parentName} />;
}
