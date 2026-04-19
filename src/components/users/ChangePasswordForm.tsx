'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const schema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

interface Props {
  userName: string;
  onSubmit: (password: string) => Promise<void>;
  isSubmitting: boolean;
}

const inputClass = 'w-full px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-sm pr-12';

export function ChangePasswordForm({ userName, onSubmit, isSubmitting }: Props) {
  const [show, setShow] = useState({ new: false, confirm: false });
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <div>
      <p className="text-sm text-[var(--muted)] mb-4">
        Change password for <span className="font-semibold text-[var(--foreground)]">{userName}</span>
      </p>
      <form onSubmit={handleSubmit((d) => onSubmit(d.newPassword))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">New Password *</label>
          <div className="relative">
            <input {...register('newPassword')} type={show.new ? 'text' : 'password'} className={inputClass} placeholder="Min 6 characters" />
            <button type="button" onClick={() => setShow(s => ({ ...s, new: !s.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              {show.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Confirm Password *</label>
          <div className="relative">
            <input {...register('confirmPassword')} type={show.confirm ? 'text' : 'password'} className={inputClass} placeholder="Repeat password" />
            <button type="button" onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              {show.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold rounded-lg transition-all disabled:opacity-60 text-sm">
            {isSubmitting ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
