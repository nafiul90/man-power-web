'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Building2, Tags, MapPin, UsersRound,
  Wallet, Receipt, Settings, Leaf, LogOut, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Map,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: { href: string; label: string }[];
}

const superAdminNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/organizations', label: 'Organizations', icon: Building2 },
];

const orgOwnerNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/categories', label: 'Categories', icon: Tags },
  {
    href: '/dashboard/zones',
    label: 'Zones',
    icon: Map,
    children: [
      { href: '/dashboard/zones/divisions', label: 'Divisions' },
      { href: '/dashboard/zones/districts', label: 'Districts' },
      { href: '/dashboard/zones/upazilas', label: 'Upazilas' },
      { href: '/dashboard/zones/unions', label: 'Unions' },
    ],
  },
  { href: '/dashboard/groups', label: 'Groups', icon: UsersRound },
];

const defaultNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function getNavByRole(role: string): NavItem[] {
  switch (role) {
    case 'Super Admin': return superAdminNav;
    case 'Org Owner': return orgOwnerNav;
    default: return defaultNav;
  }
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() =>
    item.children?.some((c) => pathname.startsWith(c.href)) ?? false
  );
  const isActive = pathname === item.href || (!item.children && pathname.startsWith(item.href + '/'));
  const Icon = item.icon;

  if (item.children) {
    const anyChildActive = item.children.some((c) => pathname.startsWith(c.href));
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center w-full gap-3 px-3 py-2.5 rounded-lg transition-all ${
            anyChildActive ? 'bg-[#2d6a4f] text-white' : 'hover:bg-[#2d6a4f]/60 text-[var(--sidebar-fg)]'
          }`}
        >
          <Icon className="w-5 h-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map((child) => {
              const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    childActive
                      ? 'bg-[#52b788]/30 text-white font-medium'
                      : 'text-[#b7e4c7] hover:bg-[#2d6a4f]/60'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        isActive ? 'bg-[#2d6a4f] text-white' : 'hover:bg-[#2d6a4f]/60 text-[var(--sidebar-fg)]'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
    </Link>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { logout, user } = useAuthStore();
  const router = useRouter();
  const navItems = getNavByRole(user?.role ?? '');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside
      className={`h-screen flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      } bg-[var(--sidebar)] text-[var(--sidebar-fg)] shadow-xl shrink-0`}
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

      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2 scrollbar-thin">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="p-2 border-t border-[#2d6a4f]">
        {!collapsed && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-[#74c69d] font-medium truncate">{user?.fullName}</p>
            <p className="text-xs text-[#6b9e7b]">{user?.role}</p>
          </div>
        )}
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
