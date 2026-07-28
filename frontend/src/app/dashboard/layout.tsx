'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import DashboardSidebar from '@/components/DashboardSidebar';
import Navbar from '@/components/Navbar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const token = localStorage.getItem('access_token');
      // If no token in storage and not authenticated in store, kick them out
      if (!isAuthenticated && !token) {
        router.push('/login');
      }
    }
  }, [mounted, isAuthenticated, router]);

  if (!mounted) {
    return null;
  }

  // If Zustand hasn't hydrated yet but we have a token, wait (render nothing)
  if (!isAuthenticated && localStorage.getItem('access_token')) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50/50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
