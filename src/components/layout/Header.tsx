'use client';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/store/authStore';
import { Bell, User } from 'lucide-react';

export function Header() {
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-[var(--card)] border-b border-[var(--card-border)] flex items-center justify-between px-6 shadow-sm">
      <div>
        <h2 className="text-sm font-medium text-[var(--muted)]">Welcome back,</h2>
        <h1 className="text-base font-semibold text-[var(--foreground)]">{user?.fullName}</h1>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button className="p-2 rounded-lg hover:bg-[var(--accent)] transition-colors relative">
          <Bell className="w-5 h-5 text-[var(--muted)]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-[var(--card-border)]">
          <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none text-[var(--foreground)]">{user?.fullName}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
