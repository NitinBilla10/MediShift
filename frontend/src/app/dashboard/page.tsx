'use client';

import { useAuthStore } from '@/store/authStore';
import ManagerDashboard from '@/features/dashboard/ManagerDashboard';
import StaffDashboard from '@/features/dashboard/StaffDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <div className="h-full">
      {user.role === 'manager' ? <ManagerDashboard /> : <StaffDashboard />}
    </div>
  );
}
