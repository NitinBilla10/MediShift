'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Shift } from '@/types';
import ShiftCard from '@/components/ShiftCard';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ShiftFormDialog from '@/components/ShiftFormDialog';
import { toast } from 'sonner';

export default function ManageShiftsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get('/shifts');
      return res.data;
    }
  });

  const [editingShift, setEditingShift] = useState<Shift | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingShift) {
        await api.put(`/shifts/${editingShift.id}`, data);
      } else {
        await api.post('/shifts', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      setIsDialogOpen(false);
      setEditingShift(undefined);
      toast.success(editingShift ? 'Shift updated successfully' : 'Shift created successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save shift');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      await api.delete(`/shifts/${shiftId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete shift');
    }
  });

  if (user?.role !== 'manager') {
    return <div>Unauthorized</div>;
  }

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingShift(undefined);
    setIsDialogOpen(true);
  };

  const handleDelete = (shiftId: string) => {
    if (confirm('Are you sure you want to delete this shift?')) {
      deleteMutation.mutate(shiftId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Manage Shifts</h1>
          <p className="text-gray-500">Create, edit, and delete shifts</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Shift
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {shifts?.map(shift => (
          <ShiftCard 
            key={shift.id} 
            shift={shift} 
            view="manager" 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
      
      <ShiftFormDialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingShift(undefined);
        }} 
        shift={editingShift}
        onSubmit={createMutation.mutate}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
