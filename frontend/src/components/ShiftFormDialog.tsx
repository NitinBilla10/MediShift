'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parse } from 'date-fns';
import { Shift, ShiftRequirement } from '@/types';
import { Trash2, Plus } from 'lucide-react';

import { Controller } from 'react-hook-form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const requirementSchema = z.object({
  role_name: z.enum(['doctor', 'nurse', 'receptionist'], {
    errorMap: () => ({ message: 'Please select a valid role' })
  }),
  count_required: z.coerce.number().min(1, 'Must be at least 1')
});

const shiftSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  requirements: z.array(requirementSchema).min(1, 'At least one requirement is needed')
});

type ShiftFormValues = z.infer<typeof shiftSchema>;

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: Shift;
  onSubmit: (data: { start_time: string, end_time: string, requirements: { role_name: string, count_required: number }[] }) => void;
  isLoading?: boolean;
}

export default function ShiftFormDialog({ open, onOpenChange, shift, onSubmit, isLoading }: ShiftFormDialogProps) {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<ShiftFormValues>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '17:00',
      requirements: [{ role_name: 'nurse', count_required: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "requirements"
  });

  useEffect(() => {
    if (shift && open) {
      const startDate = new Date(shift.start_time);
      const endDate = new Date(shift.end_time);
      reset({
        date: format(startDate, 'yyyy-MM-dd'),
        start_time: format(startDate, 'HH:mm'),
        end_time: format(endDate, 'HH:mm'),
        requirements: shift.requirements.map(r => ({
          role_name: r.role_name as any,
          count_required: r.count_required
        }))
      });
    } else if (open && !shift) {
      reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '09:00',
        end_time: '17:00',
        requirements: [{ role_name: 'nurse', count_required: 1 }]
      });
    }
  }, [shift, open, reset]);

  const handleFormSubmit = (data: ShiftFormValues) => {
    // Construct valid ISO strings
    const startObj = parse(`${data.date} ${data.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
    let endObj = parse(`${data.date} ${data.end_time}`, 'yyyy-MM-dd HH:mm', new Date());
    
    // If end time is before start time, it means overnight
    if (endObj < startObj) {
      endObj.setDate(endObj.getDate() + 1);
    }
    
    onSubmit({
      start_time: startObj.toISOString(),
      end_time: endObj.toISOString(),
      requirements: data.requirements
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>{shift ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" {...register('date')} />
            {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" {...register('start_time')} />
              {errors.start_time && <p className="text-red-500 text-xs">{errors.start_time.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" {...register('end_time')} />
              {errors.end_time && <p className="text-red-500 text-xs">{errors.end_time.message}</p>}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between items-center">
              <Label>Requirements</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ role_name: 'nurse', count_required: 1 })}>
                <Plus className="w-4 h-4 mr-1" /> Add Role
              </Button>
            </div>
            
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Controller
                      name={`requirements.${index}.role_name` as const}
                      control={control}
                      render={({ field: selectField }) => (
                        <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                          <SelectTrigger className={errors.requirements?.[index]?.role_name ? "border-red-500" : ""}>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="doctor">Doctor</SelectItem>
                            <SelectItem value="nurse">Nurse</SelectItem>
                            <SelectItem value="receptionist">Receptionist</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.requirements?.[index]?.role_name && (
                      <p className="text-red-500 text-[10px]">{errors.requirements[index]?.role_name?.message}</p>
                    )}
                  </div>
                  <div className="w-20 space-y-1">
                    <Input type="number" min="1" {...register(`requirements.${index}.count_required` as const)} className={errors.requirements?.[index]?.count_required ? "border-red-500" : ""} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(index)} disabled={fields.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{shift ? 'Save Changes' : 'Create Shift'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
