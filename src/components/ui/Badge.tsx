const roleColors: Record<string, string> = {
  'Super Admin': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  'Org Owner': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
  Manager: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  Instructor: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  Accountant: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  Member: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-700'}`}>
      {role}
    </span>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
