'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, UserPlus, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import StaffFormDialog, { StaffFormData } from '@/components/StaffFormDialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function StaffManagementPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(undefined);
  
  const { data: staffList, isLoading } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const payload = {
        name: data.name,
        email: data.email,
        profession: data.profession,
        role: 'staff',
        password: data.password || undefined,
      };

      if (editingStaff) {
        await api.put(`/users/${editingStaff.id}`, payload);
      } else {
        await api.post('/users/', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDialogOpen(false);
      setEditingStaff(undefined);
      toast.success(editingStaff ? 'Staff updated successfully' : 'Staff created successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save staff');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Staff deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete staff');
    }
  });

  if (user?.role !== 'manager') {
    return <div>Unauthorized</div>;
  }

  const handleEdit = (staff: any) => {
    setEditingStaff(staff);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStaff(undefined);
    setIsDialogOpen(true);
  };

  const handleDelete = (userId: string) => {
    if (confirm('Are you sure you want to delete this staff member? This will also remove their shift claims.')) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Staff Management</h1>
          <p className="text-gray-500">Add, update, or remove clinic staff</p>
        </div>
        <div className="flex gap-2">
          <div>
            <input 
              type="file" 
              accept=".csv" 
              id="staff-upload"
              className="hidden"
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const f = e.target.files[0];
                  if (!confirm('Note: All imported staff will be assigned the default password "password123". Do you want to proceed?')) {
                    e.target.value = '';
                    return;
                  }
                  const formData = new FormData();
                  formData.append('file', f);
                  try {
                    toast.loading('Uploading staff CSV...', { id: 'csv-upload' });
                    await api.post('/imports/staff', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    toast.success('Staff imported successfully!', { id: 'csv-upload' });
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                  } catch (err: any) {
                    toast.error(err.response?.data?.detail || 'Staff import failed', { id: 'csv-upload' });
                  }
                  // Reset input
                  e.target.value = '';
                }
              }}
            />
            <Button variant="outline" onClick={() => document.getElementById('staff-upload')?.click()}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </div>
          <Button onClick={handleCreate}>
            <UserPlus className="w-4 h-4 mr-2" />
            Create Staff
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Profession</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : staffList?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                staffList?.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{staff.name}</td>
                    <td className="px-6 py-4 text-gray-500">{staff.email}</td>
                    <td className="px-6 py-4 capitalize">
                      <Badge variant="outline" className="font-normal">
                        {staff.profession}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(staff)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleDelete(staff.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <StaffFormDialog 
        open={isDialogOpen} 
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingStaff(undefined);
        }} 
        user={editingStaff}
        onSubmit={createMutation.mutate}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
