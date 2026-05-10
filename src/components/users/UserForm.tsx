'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { User } from '@/lib/auth';
import { groupService } from '@/services/group.service';
import { useAuthStore } from '@/store/authStore';

const ROLES = [
  'Super Admin', 'Org Owner', 'Manager', 'Instructor', 'Accountant', 'Member',
  'Team Leader', 'Secretary', 'Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin',
] as const;

const baseSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  phone: z.string().min(1, 'Phone is required'),
  nidNumber: z.string().min(1, 'NID number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  role: z.enum(ROLES),
  groupId: z.string().optional(),
});

type FormData = z.infer<typeof baseSchema>;

const inputClass =
  'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm';
const labelClass = 'block text-sm font-medium text-[var(--foreground)] mb-1.5';

interface Group { _id: string; title: string }

interface UserFormProps {
  user?: User | null;
  onSubmit: (data: FormData) => Promise<void>;
  isSubmitting: boolean;
}

export function UserForm({ user, onSubmit, isSubmitting }: UserFormProps) {
  const isEdit = !!user;
  const [groups, setGroups] = useState<Group[]>([]);
  const { user: currentUser } = useAuthStore();

  // Mirrors the backend ALLOWED_ASSIGN_ROLES matrix in user.route.js.
  const LEAF = ['Team Leader', 'Secretary', 'Instructor', 'Accountant', 'Member'];
  const ROLE_LIMITS: Record<string, string[]> = {
    'Super Admin':    ['Org Owner', 'Manager', 'Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF, 'Super Admin'],
    'Org Owner':      ['Manager', 'Division Admin', 'District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF],
    'Manager':        [...LEAF],
    'Division Admin': ['District Admin', 'Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF],
    'District Admin': ['Upazila Admin', 'Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF],
    'Upazila Admin':  ['Thana Admin', 'Union Admin', 'Ward Admin', ...LEAF],
    'Thana Admin':    ['Union Admin', 'Ward Admin', ...LEAF],
    'Union Admin':    ['Ward Admin', ...LEAF],
    'Ward Admin':     [...LEAF],
    'Team Leader':    ['Member'],
    'Secretary':      ['Member'],
  };

  // When editing an existing user with a role outside the creator's allowed list,
  // include their current role so the dropdown can render it.
  const baseRoles = ROLE_LIMITS[currentUser?.role ?? ''] ?? [];
  const availableRoles = isEdit && user?.role && !baseRoles.includes(user.role)
    ? [user.role, ...baseRoles]
    : baseRoles;

  const schema = isEdit
    ? baseSchema
    : baseSchema.extend({ password: z.string().min(6, 'Password must be at least 6 characters') });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: user
      ? {
          fullName: user.fullName,
          phone: user.phone,
          nidNumber: user.nidNumber ?? '',
          email: user.email || '',
          gender: (user.gender as FormData['gender']) || undefined,
          role: user.role as FormData['role'],
        }
      : { role: 'Member' },
  });

  const userId = isEdit ? (user as unknown as { userId?: string })?.userId : undefined;

  useEffect(() => {
    groupService.getAll({ limit: '200' })
      .then((r) => setGroups(r.data.data.groups))
      .catch(() => {});
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isEdit && userId && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent)] border border-[var(--card-border)]">
          <span className="text-xs text-[var(--muted)]">User ID:</span>
          <span className="text-xs font-mono font-semibold text-[var(--primary)]">{userId}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full Name *</label>
          <input {...register('fullName')} className={inputClass} placeholder="John Doe" />
          {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Phone *</label>
          <input {...register('phone')} className={inputClass} placeholder="+8801XXXXXXXXX" />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>NID Number *</label>
          <input {...register('nidNumber')} className={inputClass} placeholder="National ID number" inputMode="numeric" />
          {errors.nidNumber && <p className="text-red-500 text-xs mt-1">{errors.nidNumber.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input {...register('email')} type="email" className={inputClass} placeholder="john@example.com" />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
      </div>

      {!isEdit && (
        <div>
          <label className={labelClass}>Password *</label>
          <input {...register('password')} type="password" className={inputClass} placeholder="Min 6 characters" />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Gender</label>
          <select {...register('gender')} className={inputClass}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Role *</label>
          <select {...register('role')} className={inputClass}>
            {availableRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Assign to Group <span className="text-[var(--muted)] font-normal">(optional)</span></label>
        <select {...register('groupId')} className={inputClass}>
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g._id} value={g._id}>{g.title}</option>
          ))}
        </select>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
