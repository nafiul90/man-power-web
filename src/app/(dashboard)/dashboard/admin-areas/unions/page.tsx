import { AdminAreaList } from '@/components/wards/AdminAreaList';

export default async function UnionsPage({
  searchParams,
}: {
  searchParams: Promise<{ parentId?: string; parentName?: string }>;
}) {
  const { parentId, parentName } = await searchParams;
  return <AdminAreaList type="Union" parentId={parentId} parentName={parentName} />;
}
