export function getRatingBg(rating: number | null): string {
  if (rating === null) return '';
  if (rating <= 4) return 'bg-red-50/80 dark:bg-red-950/25';
  if (rating <= 6) return 'bg-yellow-50/80 dark:bg-yellow-950/25';
  if (rating <= 7.5) return '';
  return 'bg-green-50/80 dark:bg-green-950/25';
}

export function getRatingTextClass(rating: number | null): string {
  if (rating === null) return 'px-3 rounded-lg bg-[var(--muted)]';
  if (rating <= 4) return 'px-3 rounded-lg bg-red-600 dark:text-red-400 font-semibold';
  if (rating <= 6) return 'px-3 rounded-lg bg-yellow-600 dark:text-yellow-500 font-semibold';
  if (rating <= 7.5) return 'px-3 rounded-lg bg-[var(--foreground)]';
  return 'px-3 rounded-lg bg-green-600 dark:bg-green-400 font-semibold';
}

export function getRatingDotClass(rating: number | null): string {
  if (rating === null) return 'bg-gray-300 dark:bg-gray-600';
  if (rating <= 4) return 'bg-red-500';
  if (rating <= 6) return 'bg-yellow-500';
  if (rating <= 7.5) return 'bg-gray-400';
  return 'bg-green-500';
}

export function computeAvgRating(ratings: { rating: number }[]): number | null {
  if (!ratings || ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b.rating, 0);
  return parseFloat((sum / ratings.length).toFixed(1));
}

export function groupRatingsByRole(ratings: { raterRole: string; rating: number; ratedBy?: { fullName: string } }[]) {
  const grouped: Record<string, number[]> = {};
  ratings.forEach((r) => {
    if (!grouped[r.raterRole]) grouped[r.raterRole] = [];
    grouped[r.raterRole].push(r.rating);
  });
  return Object.entries(grouped).map(([role, vals]) => ({
    role,
    avg: parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)),
    count: vals.length,
  }));
}
