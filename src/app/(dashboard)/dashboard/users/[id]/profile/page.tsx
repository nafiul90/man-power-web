'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, Award, BookOpen, Users, CheckCircle, Clock, PlayCircle } from 'lucide-react';
import { userService } from '@/services/user.service';
import { memberTrainingService } from '@/services/memberTraining.service';
import { certificateService } from '@/services/certificate.service';

interface User { _id: string; fullName: string; phone: string; role: string; email?: string; gender?: string; org?: { title: string } }
interface MemberTraining {
  _id: string;
  training: { _id: string; title: string; purpose?: string };
  group: { _id: string; title: string };
  groupTraining: { _id: string; status: string; scheduledDate?: string; startedAt?: string; completedAt?: string };
  rating: number | null;
  ratedBy?: { fullName: string };
  ratedAt?: string;
}
interface Certificate {
  _id: string;
  certificateNo: string;
  training: { title: string };
  group: { title: string };
  issuedBy: { fullName: string };
  issuedAt: string;
  status: 'Active' | 'Revoked';
}

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Started: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};
const STATUS_ICON: Record<string, React.ElementType> = {
  Pending: Clock,
  Started: PlayCircle,
  Completed: CheckCircle,
};

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<User | null>(null);
  const [memberTrainings, setMemberTrainings] = useState<MemberTraining[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, mtRes, certRes] = await Promise.all([
        userService.getById(memberId),
        memberTrainingService.getByMember(memberId),
        certificateService.getByMember(memberId),
      ]);
      setMember(userRes.data.data);
      setMemberTrainings(mtRes.data.data);
      setCertificates(certRes.data.data);
    } catch {
      // ignore, handled by empty state
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRatings = memberTrainings.filter((mt) => mt.rating !== null);
  const overallRating = totalRatings.length
    ? (totalRatings.reduce((sum, mt) => sum + (mt.rating ?? 0), 0) / totalRatings.length).toFixed(1)
    : null;

  const completedTrainings = memberTrainings.filter((mt) => mt.groupTraining?.status === 'Completed').length;
  const activeCerts = certificates.filter((c) => c.status === 'Active').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!member) return (
    <div className="text-center py-24 text-[var(--muted)]">Member not found.</div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--muted)]" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Member Profile</h1>
      </div>

      {/* Identity Card */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-[var(--primary)]">{member.fullName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--foreground)]">{member.fullName}</h2>
            <p className="text-sm text-[var(--muted)]">{member.phone}</p>
            {member.email && <p className="text-sm text-[var(--muted)]">{member.email}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-xs font-medium text-[var(--foreground)]">{member.role}</span>
              {member.gender && <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-xs text-[var(--muted)]">{member.gender}</span>}
              {member.org && <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent)] text-xs text-[var(--muted)]">{member.org.title}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Trainings', value: memberTrainings.length, icon: BookOpen, color: 'text-purple-500' },
          { label: 'Completed', value: completedTrainings, icon: CheckCircle, color: 'text-green-500' },
          { label: 'Certificates', value: activeCerts, icon: Award, color: 'text-blue-500' },
          { label: 'Avg. Rating', value: overallRating ? `${overallRating}/10` : '—', icon: Star, color: 'text-yellow-500' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4 text-center">
              <Icon className={`w-6 h-6 mx-auto mb-1 ${stat.color}`} />
              <p className="text-xl font-bold text-[var(--foreground)]">{stat.value}</p>
              <p className="text-xs text-[var(--muted)]">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Training History */}
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-3">Training History</h3>
        {memberTrainings.length === 0 ? (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-8 text-center text-[var(--muted)] text-sm">No trainings found.</div>
        ) : (
          <div className="space-y-3">
            {memberTrainings.map((mt) => {
              const status = mt.groupTraining?.status ?? 'Pending';
              const StatusIcon = STATUS_ICON[status] ?? Clock;
              return (
                <div key={mt._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--foreground)] text-sm">{mt.training.title}</p>
                      <Link href={`/dashboard/groups/${mt.group._id}`} className="text-xs text-[var(--primary)] hover:underline">{mt.group.title}</Link>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                        <StatusIcon className="w-3 h-3" /> {status}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-semibold text-[var(--foreground)]">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        {mt.rating !== null ? `${mt.rating}/10` : '—'}
                      </span>
                    </div>
                  </div>
                  {mt.ratedBy && (
                    <p className="text-xs text-[var(--muted)] mt-1">Rated by {mt.ratedBy.fullName} · {mt.ratedAt ? new Date(mt.ratedAt).toLocaleDateString() : ''}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Certificates */}
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-3">Certificates</h3>
        {certificates.length === 0 ? (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-8 text-center text-[var(--muted)] text-sm">No certificates issued.</div>
        ) : (
          <div className="space-y-3">
            {certificates.map((c) => (
              <div key={c._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)] text-sm">{c.training.title}</p>
                    <p className="text-xs text-[var(--muted)]">{c.certificateNo} · {c.group.title}</p>
                    <p className="text-xs text-[var(--muted)]">Issued by {c.issuedBy.fullName} · {new Date(c.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Groups quick links */}
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-3">Groups</h3>
        {memberTrainings.length === 0 ? (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-8 text-center text-[var(--muted)] text-sm">Not in any group.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Array.from(new Map(memberTrainings.map(mt => [mt.group._id, mt.group])).values()).map((g) => (
              <Link key={g._id} href={`/dashboard/groups/${g._id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--primary)] transition-colors text-sm">
                <Users className="w-4 h-4 text-[var(--primary)]" />
                {g.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
