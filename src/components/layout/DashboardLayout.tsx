'use client';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sprout } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized, initAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      router.push('/login');
    }
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <Sprout className="w-10 h-10 text-[var(--primary)] animate-pulse" />
          <p className="text-[var(--muted)] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
