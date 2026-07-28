'use client';

import { format } from 'date-fns';
import { Shift } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Edit2, Trash2, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShiftCardProps {
  shift: Shift;
  view: 'manager' | 'staff';
  onEdit?: (shift: Shift) => void;
  onDelete?: (shiftId: string) => void;
}

export default function ShiftCard({ shift, view, onEdit, onDelete }: ShiftCardProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const start = new Date(shift.start_time);
  const end = new Date(shift.end_time);
  
  const isOvernight = end.getDate() !== start.getDate();

  const { data: staffList } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
    enabled: view === 'manager'
  });

  // Calculate coverage status
  let totalRequired = 0;
  let totalFilled = 0;

  shift.requirements.forEach(req => {
    totalRequired += req.count_required;
    const filledForRole = shift.claims.filter(c => c.role_name === req.role_name).length;
    totalFilled += filledForRole;
  });

  const isFullyStaffed = totalFilled >= totalRequired;
  const isEmpty = totalFilled === 0;

  let statusColor = "bg-amber-100 text-amber-800 border-amber-200";
  let statusText = "Partially Staffed";

  if (isFullyStaffed) {
    statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
    statusText = "Fully Staffed";
  } else if (isEmpty) {
    statusColor = "bg-red-100 text-red-800 border-red-200";
    statusText = "Unstaffed";
  }

  const claimMutation = useMutation({
    mutationFn: async ({ roleName, userId }: { roleName: string, userId?: string }) => {
      let url = `/claims/${shift.id}/claim`;
      if (userId) {
        url += `?user_id=${userId}`;
      }
      await api.post(url, { role_name: roleName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift claimed/assigned successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to claim shift');
    }
  });

  const unclaimMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/claims/${shift.id}/claim`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift unclaimed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to unclaim shift');
    }
  });

  const myClaim = shift.claims.find(c => c.user_id === user?.id);

  return (
    <div className="bg-white rounded-md border shadow-sm hover:shadow-md transition-shadow p-3 flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="flex items-start gap-2 text-gray-900 font-semibold min-w-max">
          <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-medium">{format(start, 'MMM d, yyyy')}</span>
            <span>
              {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
              {isOvernight && <sup className="text-[10px] text-gray-500 ml-0.5">+1</sup>}
            </span>
          </div>
        </div>
        {view === 'manager' && (
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${statusColor}`}>
              {statusText}
            </Badge>
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-800 hover:bg-blue-50" onClick={() => onEdit(shift)}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => onDelete(shift.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {shift.requirements.map(req => {
          const filled = shift.claims.filter(c => c.role_name === req.role_name).length;
          const isFilled = filled >= req.count_required;
          const isMyRole = myClaim?.role_name === req.role_name;

          return (
            <div key={req.id} className="flex flex-col gap-1.5 p-2 rounded bg-gray-50 border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="font-medium capitalize text-gray-700">{req.role_name}</span>
                <span className={`text-xs font-semibold ${isFilled ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {filled} / {req.count_required} Filled
                </span>
              </div>
              
              {view === 'staff' && (
                <div className="pt-1">
                  {isMyRole ? (
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="w-full h-7 text-xs"
                      onClick={() => unclaimMutation.mutate()}
                      disabled={unclaimMutation.isPending}
                    >
                      Unclaim
                    </Button>
                  ) : !isFilled && !myClaim ? (
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="w-full h-7 text-xs"
                      onClick={() => claimMutation.mutate({ roleName: req.role_name })}
                      disabled={claimMutation.isPending}
                    >
                      Claim Role
                    </Button>
                  ) : null}
                </div>
              )}

              {view === 'manager' && (
                <div className="pt-1 flex flex-col gap-2">
                  {Array.from({ length: req.count_required }).map((_, idx) => {
                    const claimsForRole = shift.claims.filter(c => c.role_name === req.role_name);
                    const claim = claimsForRole[idx];
                    
                    return (
                      <Select 
                        key={`${idx}-${claim?.user_id || 'unassigned'}`}
                        value={claim?.user_id || undefined}
                        onValueChange={async (val) => {
                          if (val === "unassign") {
                            if (claim) {
                              try {
                                await api.delete(`/claims/${shift.id}/claim?user_id=${claim.user_id}`);
                                queryClient.invalidateQueries({ queryKey: ['shifts'] });
                                toast.success('Staff unassigned');
                              } catch (err: any) {
                                toast.error(err.response?.data?.detail || 'Failed to unassign');
                              }
                            }
                            return;
                          }
                          
                          try {
                            if (claim && claim.user_id !== val) {
                              await api.delete(`/claims/${shift.id}/claim?user_id=${claim.user_id}`);
                            }
                            if (!claim || claim.user_id !== val) {
                              await claimMutation.mutateAsync({ roleName: req.role_name, userId: val ?? undefined });
                            }
                          } catch (err: any) {
                            // Mutation handles its own errors
                          }
                        }}
                        disabled={claimMutation.isPending}
                      >
                        <SelectTrigger className="h-7 text-xs w-full bg-white">
                          <SelectValue placeholder="Assign staff...">
                            {claim ? (staffList ? (staffList.find(s => s.id === claim.user_id)?.name || "Unknown Staff") : "Loading...") : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {claim && <SelectItem value="unassign" className="text-red-600 focus:bg-red-50 focus:text-red-700">Unassign Staff</SelectItem>}
                          {(staffList || []).filter(s => s.profession === req.role_name).map(staff => (
                            <SelectItem key={staff.id} value={staff.id} className="text-xs">
                              {staff.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
