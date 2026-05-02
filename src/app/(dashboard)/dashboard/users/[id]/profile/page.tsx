'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Star, Award, BookOpen, Users, CheckCircle, Clock,
  PlayCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { userService } from '@/services/user.service';
import { memberTrainingService } from '@/services/memberTraining.service';
import { certificateService } from '@/services/certificate.service';

interface RatingEntry {
  _id: string;
  ratedBy: { _id: string; fullName: string; phone?: string; userId?: string; role: string };
  raterRole: string;
  rating: number;
  ratedAt: string;
}

interface UserProfile {
  _id: string;
  userId?: string;
  fullName: string;
  phone: string;
  role: string;
  email?: string;
  gender?: string;
  org?: { title: string };
  directRatings?: RatingEntry[];
}

interface MemberTrainingRecord {
  _id: string;
  training: { _id: string; title: string; purpose?: string };
  group: { _id: string; title: string } | null;
  groupTraining: { _id: string; status: string } | null;
  ratings: RatingEntry[];
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
  Pending: Clock, Started: PlayCircle, Completed: CheckCircle,
};

function ratingColor(r: number) {
  if (r <= 4) return { bg: 'border-red-100 dark:border-red-950/60', text: 'text-red-700 dark:text-red-300', badge: 'bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-300', bar: 'bg-red-500' };
  if (r <= 6) return { bg: 'border-yellow-100 dark:border-yellow-950/60', text: 'text-yellow-700 dark:text-yellow-300', badge: 'bg-yellow-200 dark:bg-yellow-900/60 text-yellow-800 dark:text-yellow-300', bar: 'bg-yellow-500' };
  if (r <= 7.5) return { bg: 'border-blue-50 dark:border-blue-950/40', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300', bar: 'bg-blue-400' };
  return { bg: 'border-green-100 dark:border-green-950/60', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-200 dark:bg-green-900/60 text-green-800 dark:text-green-300', bar: 'bg-green-500' };
}

function RatingBadge({ rating }: { rating: number }) {
  const c = ratingColor(rating);
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-sm font-bold ${c.badge}`}>
      ★ {rating.toFixed(1)}/10
    </span>
  );
}

function RatersTable({ ratings, showSource }: { ratings: (RatingEntry & { source?: string })[]; showSource?: boolean }) {
  if (ratings.length === 0) {
    return <p className="text-xs text-[var(--muted)] italic px-4 py-3">No ratings yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-[var(--accent)]/40">
            <th className="text-left px-4 py-2.5 font-semibold text-[var(--foreground)]">#</th>
            <th className="text-left px-4 py-2.5 font-semibold text-[var(--foreground)]">Name</th>
            <th className="text-left px-4 py-2.5 font-semibold text-[var(--foreground)] hidden sm:table-cell">User ID</th>
            <th className="text-left px-4 py-2.5 font-semibold text-[var(--foreground)] hidden md:table-cell">Phone</th>
            <th className="text-left px-4 py-2.5 font-semibold text-[var(--foreground)]">Role</th>
            <th className="text-left px-4 py-2.5 font-semibold text-[var(--foreground)]">Rating</th>
            {showSource && <th className="text-left px-4 py-2.5 font-semibold text-[var(--foreground)] hidden lg:table-cell">Source</th>}
            <th className="text-left px-4 py-2.5 font-semibold text-[var(--foreground)] hidden md:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {ratings.map((r, i) => {
            const c = ratingColor(r.rating);
            return (
              <tr key={r._id ?? i} className="border-b border-[var(--card-border)] hover:bg-[var(--accent)]/20 transition-colors">
                <td className="px-4 py-2.5 text-[var(--muted)]">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium text-[var(--foreground)]">{r.ratedBy?.fullName ?? '—'}</td>
                <td className="px-4 py-2.5 hidden sm:table-cell">
                  <span className="font-mono text-[var(--primary)] bg-[var(--accent)] px-1.5 py-0.5 rounded text-[11px]">{r.ratedBy?.userId ?? '—'}</span>
                </td>
                <td className="px-4 py-2.5 text-[var(--muted)] hidden md:table-cell">{r.ratedBy?.phone ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--foreground)] text-[11px]">{r.raterRole}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs ${c.badge}`}>
                    ★ {r.rating.toFixed(1)}
                  </span>
                </td>
                {showSource && (
                  <td className="px-4 py-2.5 text-[var(--muted)] hidden lg:table-cell truncate max-w-[160px]">{r.source ?? '—'}</td>
                )}
                <td className="px-4 py-2.5 text-[var(--muted)] hidden md:table-cell">
                  {r.ratedAt ? new Date(r.ratedAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<UserProfile | null>(null);
  const [memberTrainings, setMemberTrainings] = useState<MemberTrainingRecord[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTraining, setExpandedTraining] = useState<string | null>(null);

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
      // handled by empty state
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const directRatings: (RatingEntry & { source: string })[] = useMemo(
    () => (member?.directRatings ?? []).map(r => ({ ...r, source: 'Direct' })),
    [member]
  );

  const allMtRatings: (RatingEntry & { source: string })[] = useMemo(
    () => memberTrainings.flatMap(mt =>
      (mt.ratings ?? []).map(r => ({ ...r, source: mt.training?.title ?? 'Training' }))
    ),
    [memberTrainings]
  );

  const allRatings = useMemo(() => [...allMtRatings, ...directRatings], [allMtRatings, directRatings]);

  const overallAvg = useMemo(() => {
    if (allRatings.length === 0) return null;
    return parseFloat((allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length).toFixed(1));
  }, [allRatings]);

  const byRole = useMemo(() => {
    const map: Record<string, number[]> = {};
    allRatings.forEach(r => {
      if (!map[r.raterRole]) map[r.raterRole] = [];
      map[r.raterRole].push(r.rating);
    });
    return Object.entries(map)
      .map(([role, vals]) => ({
        role,
        avg: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
        count: vals.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [allRatings]);

  const uniqueRaters = useMemo(() => {
    const seen = new Set<string>();
    allRatings.forEach(r => { if (r.ratedBy?._id) seen.add(r.ratedBy._id); });
    return seen.size;
  }, [allRatings]);

  const completedTrainings = memberTrainings.filter(mt => mt.groupTraining?.status === 'Completed').length;
  const activeCerts = certificates.filter(c => c.status === 'Active').length;
  const overallC = overallAvg !== null ? ratingColor(overallAvg) : null;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!member) return <div className="text-center py-24 text-[var(--muted)]">Member not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl">

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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <span className="text-sm text-[var(--muted)]">{member.phone}</span>
              {member.userId && (
                <span className="text-xs font-mono text-[var(--primary)] bg-[var(--accent)] px-1.5 py-0.5 rounded">{member.userId}</span>
              )}
              {member.email && <span className="text-sm text-[var(--muted)]">{member.email}</span>}
            </div>
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
          { label: 'Avg. Rating', value: overallAvg !== null ? `${overallAvg}/10` : '—', icon: Star, color: overallC?.text ?? 'text-yellow-500' },
        ].map(stat => {
          const Icon = stat.icon;
          const isRating = stat.label === 'Avg. Rating';
          return (
            <div key={stat.label} className={`rounded-xl border p-4 text-center ${isRating && overallC ? `${overallC.bg} border-transparent` : 'bg-[var(--card)] border-[var(--card-border)]'}`}>
              <Icon className={`w-6 h-6 mx-auto mb-1 ${stat.color}`} />
              <p className={`text-xl font-bold ${isRating && overallC ? overallC.text : 'text-[var(--foreground)]'}`}>{stat.value}</p>
              <p className="text-xs text-[var(--muted)]">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── RATING OVERVIEW ── */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--card-border)] flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <h3 className="text-base font-semibold text-[var(--foreground)]">Rating Overview</h3>
        </div>
        <div className="p-5">
          {allRatings.length === 0 ? (
            <div className="text-center py-6">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-sm font-medium border border-red-200 dark:border-red-900">
                No Rating Yet
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Big avg */}
              <div className={`flex flex-col items-center justify-center rounded-xl p-6 min-w-[150px] shrink-0 border ${overallC?.bg}`}>
                <p className={`text-6xl font-extrabold leading-none ${overallC?.text}`}>{overallAvg}</p>
                <p className={`text-base font-semibold mt-1 ${overallC?.text}`}>/ 10</p>
                <div className="mt-3 text-center space-y-0.5">
                  <p className="text-xs text-[var(--muted)]">{allRatings.length} rating{allRatings.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-[var(--muted)]">{uniqueRaters} unique rater{uniqueRaters !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-[var(--muted)]">{directRatings.length} direct · {allMtRatings.length} from trainings</p>
                </div>
              </div>

              {/* By-role breakdown */}
              <div className="flex-1">
                <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Breakdown by Rater Role</p>
                <div className="space-y-2.5">
                  {byRole.map(({ role, avg, count }) => {
                    const c = ratingColor(avg);
                    return (
                      <div key={role} className="flex items-center gap-3">
                        <span className="w-32 text-xs font-medium text-[var(--foreground)] shrink-0 truncate">{role}</span>
                        <div className="flex-1 bg-[var(--accent)] rounded-full h-2.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width: `${(avg / 10) * 100}%` }} />
                        </div>
                        <span className={`w-10 text-sm font-bold text-right shrink-0 ${c.text}`}>{avg}</span>
                        <span className="w-20 text-xs text-[var(--muted)] shrink-0 text-right">{count} rating{count !== 1 ? 's' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ALL INDIVIDUAL RATINGS TABLE ── */}
      {allRatings.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--card-border)]">
            <h3 className="text-base font-semibold text-[var(--foreground)]">All Individual Ratings</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {allRatings.length} total ratings from {uniqueRaters} unique rater{uniqueRaters !== 1 ? 's' : ''}
            </p>
          </div>
          <RatersTable ratings={allRatings} showSource />
        </div>
      )}

      {/* ── DIRECT RATINGS (supervisors) ── */}
      {directRatings.length > 0 && (
        <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--card-border)]">
            <h3 className="text-base font-semibold text-[var(--foreground)]">Direct Ratings</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">Ratings given directly by supervisors</p>
          </div>
          <RatersTable ratings={directRatings} />
        </div>
      )}

      {/* ── TRAINING-WISE RATINGS ── */}
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-3">Training History & Ratings</h3>
        {memberTrainings.length === 0 ? (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-8 text-center text-[var(--muted)] text-sm">No trainings found.</div>
        ) : (
          <div className="space-y-3">
            {memberTrainings.map(mt => {
              const status = mt.groupTraining?.status ?? 'Pending';
              const StatusIcon = STATUS_ICON[status] ?? Clock;
              const mtRatings = mt.ratings ?? [];
              const mtAvg = mtRatings.length > 0
                ? parseFloat((mtRatings.reduce((s, r) => s + r.rating, 0) / mtRatings.length).toFixed(1))
                : null;
              const isExpanded = expandedTraining === mt._id;
              return (
                <div key={mt._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden">
                  <button
                    onClick={() => setExpandedTraining(isExpanded ? null : mt._id)}
                    className="w-full text-left p-4 hover:bg-[var(--accent)]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--foreground)] text-sm">{mt.training?.title ?? '—'}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {mt.group && (
                            <span className="text-xs text-[var(--primary)] bg-[var(--accent)] px-2 py-0.5 rounded">{mt.group.title}</span>
                          )}
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                            <StatusIcon className="w-3 h-3" /> {status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {mtAvg !== null ? (
                          <RatingBadge rating={mtAvg} />
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--muted)]">No rating</span>
                        )}
                        <span className="text-xs text-[var(--muted)]">{mtRatings.length} rater{mtRatings.length !== 1 ? 's' : ''}</span>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
                          : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
                        }
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-[var(--card-border)]">
                      <RatersTable ratings={mtRatings} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CERTIFICATES ── */}
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-3">Certificates</h3>
        {certificates.length === 0 ? (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-8 text-center text-[var(--muted)] text-sm">No certificates issued.</div>
        ) : (
          <div className="space-y-3">
            {certificates.map(c => (
              <div key={c._id} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)] text-sm">{c.training.title}</p>
                    <p className="text-xs text-[var(--muted)]">{c.certificateNo} · {c.group?.title}</p>
                    <p className="text-xs text-[var(--muted)]">Issued by {c.issuedBy.fullName} · {new Date(c.issuedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${c.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── GROUPS ── */}
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)] mb-3">Groups</h3>
        {memberTrainings.filter(mt => mt.group).length === 0 ? (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-8 text-center text-[var(--muted)] text-sm">Not in any group.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Array.from(
              new Map(memberTrainings.filter(mt => mt.group).map(mt => [mt.group!._id, mt.group!])).values()
            ).map(g => (
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
