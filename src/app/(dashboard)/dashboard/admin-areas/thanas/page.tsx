import { AdminAreaList } from '@/components/wards/AdminAreaList';

export default async function ThanasPage({
  searchParams,
}: {
  searchParams: Promise<{ parentId?: string; parentName?: string }>;
}) {
  const { parentId, parentName } = await searchParams;
  return <AdminAreaList type="Thana" parentId={parentId} parentName={parentName} />;
}
