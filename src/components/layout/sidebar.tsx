'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Wallet,
  FileText,
  Settings,
  Menu,
  X,
  LogOut,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: ('admin' | 'gerente' | 'vendedor')[];
}

const navItems: NavItem[] = [
  { 
    label: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    roles: ['admin', 'gerente', 'vendedor'],
  },
  { 
    label: 'PDV', 
    href: '/pdv', 
    icon: ShoppingCart,
    roles: ['admin', 'gerente', 'vendedor'],
  },
  { 
    label: 'Produtos', 
    href: '/produtos', 
    icon: Package,
    roles: ['admin', 'gerente', 'vendedor'],
  },
  { 
    label: 'Estoque', 
    href: '/estoque', 
    icon: Boxes,
    roles: ['admin', 'gerente'],
  },
  { 
    label: 'Vendas', 
    href: '/vendas', 
    icon: FileText,
    roles: ['admin', 'gerente', 'vendedor'],
  },
  { 
    label: 'Trocas', 
    href: '/trocas', 
    icon: RefreshCw,
    roles: ['admin', 'gerente'],
  },
  { 
    label: 'Clientes', 
    href: '/clientes', 
    icon: Users,
    roles: ['admin', 'gerente', 'vendedor'],
  },
  { 
    label: 'Caixa', 
    href: '/caixa', 
    icon: Wallet,
    roles: ['admin', 'gerente', 'vendedor'],
  },
  { 
    label: 'Relatórios', 
    href: '/relatorios', 
    icon: FileText,
    roles: ['admin', 'gerente'],
  },
  { 
    label: 'Configurações', 
    href: '/configuracoes', 
    icon: Settings,
    roles: ['admin'],
  },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();
  const { usuario, signOut } = useAuth();

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    if (!usuario) return false;
    return item.roles.includes(usuario.perfil);
  });

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          <h1 className="text-xl font-bold">
            <span className="text-blue-400">Boutique</span> Manager
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-gray-800 p-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {usuario?.nome?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium truncate">{usuario?.nome || 'Usuário'}</p>
                <p className="text-xs text-gray-400 capitalize">{usuario?.perfil || 'vendedor'}</p>
              </div>
              <ChevronDown className={cn('h-4 w-4 transition-transform', showUserMenu && 'rotate-180')} />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
