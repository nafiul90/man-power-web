'use client';
import { useState, useEffect } from 'react';
import { UsersRound } from 'lucide-react';
import Link from 'next/link';
import { groupService } from '@/services/group.service';
import { useAuthStore } from '@/store/authStore';

interface GroupMember { _id: string; fullName: string }
interface Group {
  _id: string;
  title: string;
  members: GroupMember[];
  category?: { title: string };
  ward?: { title: string };
}

export function TeamLeaderDashboard() {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    groupService.getAll({ limit: '50' })
      .then((r) => setGroups(r.data.data.groups))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const roleLabel = user?.role === 'Secretary' ? 'Secretary' : 'Team Leader';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{roleLabel} Dashboard</h1>
        <p className="text-[var(--muted)] text-sm mt-1">Welcome, {user?.fullName} — {groups.length} group{groups.length !== 1 ? 's' : ''} assigned</p>
      </div>

      {loading ? (
        <p className="text-center py-12 text-[var(--muted)]">Loading...</p>
      ) : groups.length === 0 ? (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-12 text-center text-[var(--muted)]">
          No groups assigned to you yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Link
              key={group._id}
              href={`/dashboard/groups/${group._id}`}
              className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-5 shadow-sm hover:border-[var(--primary)] transition-colors block"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center shrink-0">
                  <UsersRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] text-sm">{group.title}</h3>
                  {group.category && <p className="text-xs text-[var(--muted)]">{group.category.title}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1"><UsersRound className="w-3 h-3" /> {group.members.length} members</span>
                {group.ward && <span>{group.ward.title}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
