'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/store/authStore';

const staffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  profession: z.enum(['doctor', 'nurse', 'receptionist'], {
    errorMap: () => ({ message: 'Please select a valid profession' })
  }),
  password: z.string().optional(),
  confirm_password: z.string().optional(),
}).refine(data => {
  if (data.password && data.password !== data.confirm_password) {
    return false;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirm_password"]
});

export type StaffFormData = z.infer<typeof staffSchema>;

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any; // The user being edited, undefined if creating
  onSubmit: (data: StaffFormData) => void;
  isLoading?: boolean;
}

export default function StaffFormDialog({ open, onOpenChange, user, onSubmit, isLoading }: StaffFormDialogProps) {
  const { register, handleSubmit, reset, setValue, watch, setError, formState: { errors } } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: '',
      email: '',
      profession: '' as any,
      password: '',
      confirm_password: '',
    }
  });

  const professionValue = watch('profession');

  useEffect(() => {
    if (open) {
      if (user) {
        reset({
          name: user.name,
          email: user.email,
          profession: user.profession as any,
          password: '',
          confirm_password: '',
        });
      } else {
        reset({
          name: '',
          email: '',
          profession: '' as any,
          password: '',
          confirm_password: '',
        });
      }
    }
  }, [open, user, reset]);

  const onFormSubmit = (data: StaffFormData) => {
    if (!user && (!data.password || data.password.length < 6)) {
      setError('password', { message: 'Password must be at least 6 characters' });
      return;
    }
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Edit Staff Member' : 'Create Staff Member'}</DialogTitle>
          <DialogDescription>
            {user ? 'Update staff details below.' : 'Add a new staff member to the clinic.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-4">
          
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input id="name" {...register('name')} placeholder="Full Name" />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
            <Input id="email" type="email" {...register('email')} placeholder="email@clinic.com" />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Profession <span className="text-red-500">*</span></Label>
            <Select value={professionValue} onValueChange={(val: any) => setValue('profession', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select profession..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
            {errors.profession && <p className="text-sm text-red-500">{errors.profession.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {user ? 'New Password (optional)' : 'Password '}
              {!user && <span className="text-red-500">*</span>}
            </Label>
            <Input id="password" type="password" {...register('password')} placeholder="••••••••" />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">
              {user ? 'Confirm New Password' : 'Confirm Password '}
              {!user && <span className="text-red-500">*</span>}
            </Label>
            <Input id="confirm_password" type="password" {...register('confirm_password')} placeholder="••••••••" />
            {errors.confirm_password && <p className="text-sm text-red-500">{errors.confirm_password.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user ? 'Save Changes' : 'Create Staff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
