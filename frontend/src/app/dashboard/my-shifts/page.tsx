'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shift } from '@/types';
import ShiftCard from '@/components/ShiftCard';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

export default function MyShiftsPage() {
  const { user } = useAuthStore();
  
  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get('/shifts');
      return res.data;
    }
  });

  const myShifts = shifts?.filter(s => 
    s.claims.some(c => c.user_id === user?.id)
  ) || [];

  // Group by date
  const groupedShifts = myShifts.reduce((acc, shift) => {
    const date = new Date(shift.start_time);
    const dateStr = format(date, 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  const sortedDates = Object.keys(groupedShifts).sort();

  if (user?.role !== 'staff') {
    return <div>Unauthorized</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Shifts</h1>
        <p className="text-gray-500">View and manage your claimed shifts</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full max-w-md rounded-md" />
          <Skeleton className="h-24 w-full max-w-md rounded-md" />
        </div>
      ) : myShifts.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center flex flex-col items-center shadow-sm">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <CalendarDays className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No upcoming shifts</h3>
          <p className="text-gray-500 max-w-sm mt-1">
            You haven't claimed any shifts yet. Head over to the Available Shifts page to find and claim open roles.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(dateStr => {
            const date = new Date(dateStr);
            return (
              <div key={dateStr} className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-gray-500" />
                  {format(date, 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedShifts[dateStr].map(shift => (
                    <ShiftCard key={shift.id} shift={shift} view="staff" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
