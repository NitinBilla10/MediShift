import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Shift } from '@/types';
import ShiftCard from '@/components/ShiftCard';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CalendarCheck, Clock, CalendarDays } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StaffDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { user } = useAuthStore();
  
  const { data: shifts, isLoading, isError } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get('/shifts');
      return res.data;
    }
  });

  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => setCurrentDate(new Date());

  const myShifts = shifts?.filter(s => s.claims.some(c => c.user_id === user?.id)) || [];
  const upcomingShifts = myShifts.filter(s => new Date(s.start_time) >= new Date());
  
  const todayShifts = myShifts.filter(s => isSameDay(new Date(s.start_time), new Date()));
  
  const availableShifts = shifts?.filter(s => 
    new Date(s.start_time) >= new Date() &&
    !s.claims.some(c => c.user_id === user?.id) &&
    s.requirements.some(req => {
      const filled = s.claims.filter(c => c.role_name === req.role_name).length;
      return req.role_name === user?.profession && filled < req.count_required;
    })
  ) || [];

  return (
    <div className="space-y-6">

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Upcoming Shifts</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingShifts.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled in the future</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Working Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayShifts.length > 0 ? 'Yes' : 'No'}</div>
            <p className="text-xs text-muted-foreground">{todayShifts.length} shift(s) today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available to Claim</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableShifts.length}</div>
            <p className="text-xs text-muted-foreground">Open roles for your profession</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Available Shifts</h1>
          <p className="text-gray-500">View and claim open shifts</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white rounded-md border p-1 shadow-sm">
          <Button variant="ghost" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="font-medium" onClick={goToToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-4 snap-x">
        {weekDays.map((day) => {
          const isToday = isSameDay(day, new Date());
          const dayShifts = shifts?.filter(s => isSameDay(new Date(s.start_time), day)) || [];
          
          return (
            <div key={day.toISOString()} className="flex flex-col min-w-[280px] sm:min-w-[320px] shrink-0 snap-start bg-white rounded-lg border overflow-hidden">
              <div className={`p-3 text-center border-b ${isToday ? 'bg-primary text-primary-foreground font-semibold' : 'bg-gray-50 text-gray-700'}`}>
                <div className="text-xs uppercase tracking-wider font-semibold opacity-80">{format(day, 'EEE')}</div>
                <div className="text-xl mt-0.5">{format(day, 'd')}</div>
              </div>
              
              <div className="p-3 flex-1 flex flex-col gap-3 min-h-[300px] bg-gray-50/30">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-md" />
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
                ) : isError ? (
                  <div className="text-sm text-red-500 p-2 text-center">Failed to load shifts</div>
                ) : dayShifts.length > 0 ? (
                  dayShifts.map(shift => (
                    <ShiftCard key={shift.id} shift={shift} view="staff" />
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic">
                    No shifts
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
