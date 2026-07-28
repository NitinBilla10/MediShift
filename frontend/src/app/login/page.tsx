'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Stethoscope, Loader2 } from 'lucide-react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { api, API_URL } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().min(1, 'Please enter your email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      // OAuth2 requires form URL encoded data
      const formData = new URLSearchParams();
      formData.append('username', data.email);
      formData.append('password', data.password);

      const response = await axios.post(`${API_URL}/auth/login/access-token`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return response.data;
    },
    onSuccess: async (data) => {
      // Get user profile with the token
      try {
        const userRes = await axios.post(
          `${API_URL}/auth/test-token`,
          {},
          { headers: { Authorization: `Bearer ${data.access_token}` } }
        );
        login(userRes.data, data.access_token);
        toast.success('Logged in successfully');
        router.push('/dashboard');
      } catch (err) {
        toast.error('Failed to fetch user profile');
      }
    },
    onError: () => {
      toast.error('Invalid email or password');
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  const onSubmit = (data: LoginForm) => {
    setIsLoading(true);
    loginMutation.mutate(data);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-white">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access the clinic scheduler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="manager@clinic.com"
                {...register('email')}
                className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                className={errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-sm text-center text-gray-500 border-t pt-6">
          <p>
            Use <span className="font-medium text-gray-700">manager@clinic.com</span> or <span className="font-medium text-gray-700">staff1@clinic.com</span><br/>
            Password: <span className="font-medium text-gray-700">password123</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
