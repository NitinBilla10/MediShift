'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CalendarDays, Upload, LogOut, Stethoscope, LayoutDashboard, Clock, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const managerLinks = [
    { name: 'Coverage', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Manage Shifts', href: '/dashboard/shifts', icon: CalendarDays },
    { name: 'Staff Management', href: '/dashboard/staff', icon: Users },
    { name: 'Import CSV', href: '/dashboard/import', icon: Upload },
  ];

  const staffLinks = [
    { name: 'Available Shifts', href: '/dashboard', icon: CalendarDays },
    { name: 'My Shifts', href: '/dashboard/my-shifts', icon: Clock },
  ];

  const links = user?.role === 'manager' ? managerLinks : staffLinks;

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="flex h-16 items-center px-6 border-b border-gray-200">
        <Stethoscope className="w-6 h-6 text-primary mr-2" />
        <span className="font-semibold text-lg tracking-tight">MediShift</span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon
                  className={cn(
                    "mr-3 flex-shrink-0 h-5 w-5",
                    isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-500"
                  )}
                  aria-hidden="true"
                />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => logout()}
          className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
        >
          <LogOut className="mr-3 h-5 w-5 text-gray-400" />
          Logout
        </button>
      </div>
    </div>
  );
}
