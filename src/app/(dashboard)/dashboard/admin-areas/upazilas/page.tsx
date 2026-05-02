import { AdminAreaList } from '@/components/wards/AdminAreaList';

export default async function UpazilasPage({
  searchParams,
}: {
  searchParams: Promise<{ parentId?: string; parentName?: string }>;
}) {
  const { parentId, parentName } = await searchParams;
  return <AdminAreaList type="Upazila" parentId={parentId} parentName={parentName} />;
}
