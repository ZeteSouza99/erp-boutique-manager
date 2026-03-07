'use client';

import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import { Bell, Search } from 'lucide-react';

export function Header() {
  const { usuario } = useAuth();
  const today = new Date();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Search (desktop only) */}
      <div className="hidden md:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produtos, clientes..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Mobile spacer */}
      <div className="md:hidden w-10" />

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Date */}
        <div className="hidden sm:block text-sm text-gray-500">
          {formatDate(today)}
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </button>

        {/* User info (desktop only) */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-medium">{usuario?.nome}</p>
            <p className="text-xs text-gray-500 capitalize">{usuario?.perfil}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
