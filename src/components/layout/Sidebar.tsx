'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, UsersRound, GraduationCap,
  BookOpen, Wallet, Receipt, Settings, Leaf, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/members', label: 'Members', icon: UsersRound },
  { href: '/dashboard/groups', label: 'Groups', icon: UsersRound },
  { href: '/dashboard/instructors', label: 'Instructors', icon: GraduationCap },
  { href: '/dashboard/trainings', label: 'Trainings', icon: BookOpen },
  { href: '/dashboard/funds', label: 'Funds', icon: Wallet },
  { href: '/dashboard/installments', label: 'Installments', icon: Receipt },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside
      className={`h-screen flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } bg-[var(--sidebar)] text-[var(--sidebar-fg)] shadow-xl`}
    >
      <div className="flex items-center justify-between p-4 border-b border-[#2d6a4f]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-[#74c69d]" />
            <span className="font-bold text-lg leading-tight">
              <span className="text-[#74c69d]">Agri</span>NGO
            </span>
          </div>
        )}
        {collapsed && <Leaf className="w-6 h-6 text-[#74c69d] mx-auto" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-[#2d6a4f] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                active
                  ? 'bg-[#2d6a4f] text-white'
                  : 'hover:bg-[#2d6a4f]/60 text-[var(--sidebar-fg)]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-[#2d6a4f]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-red-900/50 text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
