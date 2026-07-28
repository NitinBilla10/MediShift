'use client';

import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { Menu } from 'lucide-react';
import { Button } from './ui/button';

export default function Navbar() {
  const { user } = useAuthStore();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10 flex-shrink-0 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center md:hidden">
        <Button variant="ghost" size="icon" className="-ml-2">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open sidebar</span>
        </Button>
      </div>
      
      <div className="flex-1 flex justify-end">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-gray-500 text-xs">{user.email}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {user.role}
            </Badge>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
