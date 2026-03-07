import * as React from 'react';
import { cn } from '@/lib/utils';

// ==========================================
// SKELETON BASE
// ==========================================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
      {...props}
    />
  );
}

// ==========================================
// SKELETON TEXT
// ==========================================

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  widths?: (string | number)[];
}

export function SkeletonText({ lines = 3, className, widths }: SkeletonTextProps) {
  const defaultWidths = ['100%', '90%', '75%', '85%', '60%'];
  
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4" 
          style={{ width: widths?.[i] ?? defaultWidths[i % defaultWidths.length] }}
        />
      ))}
    </div>
  );
}

// ==========================================
// SKELETON AVATAR
// ==========================================

interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function SkeletonAvatar({ size = 'md', className }: SkeletonAvatarProps) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <Skeleton className={cn('rounded-full', sizes[size], className)} />
  );
}

// ==========================================
// SKELETON BUTTON
// ==========================================

interface SkeletonButtonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonButton({ size = 'md', className }: SkeletonButtonProps) {
  const sizes = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };

  return (
    <Skeleton className={cn('rounded-md', sizes[size], className)} />
  );
}

// ==========================================
// SKELETON CARD
// ==========================================

interface SkeletonCardProps {
  className?: string;
  hasImage?: boolean;
  lines?: number;
}

export function SkeletonCard({ className, hasImage = false, lines = 2 }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border bg-white p-4 space-y-4', className)}>
      {hasImage && (
        <Skeleton className="h-40 w-full rounded-md" />
      )}
      <div className="space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

// ==========================================
// SKELETON TABLE
// ==========================================

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn('rounded-lg border bg-white overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-gray-50 border-b px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Body */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3 flex gap-4 items-center">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className="h-4 flex-1" 
                style={{ width: `${70 + Math.random() * 30}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// SKELETON LIST
// ==========================================

interface SkeletonListProps {
  items?: number;
  className?: string;
  hasAvatar?: boolean;
}

export function SkeletonList({ items = 5, className, hasAvatar = false }: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border bg-white">
          {hasAvatar && <SkeletonAvatar size="md" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// SKELETON STATS GRID
// ==========================================

interface SkeletonStatsProps {
  count?: number;
  className?: string;
}

export function SkeletonStats({ count = 4, className }: SkeletonStatsProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// SKELETON DASHBOARD
// ==========================================

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats Cards */}
      <SkeletonStats count={4} />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Placeholder */}
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>

        {/* List */}
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <SkeletonList items={4} />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SKELETON PRODUTO
// ==========================================

export function SkeletonProduto() {
  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SKELETON PDV
// ==========================================

export function SkeletonPDV() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Busca e Produtos */}
      <div className="lg:col-span-2 space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProduto key={i} />
          ))}
        </div>
      </div>

      {/* Carrinho */}
      <div className="rounded-lg border bg-white p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <SkeletonList items={3} />
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
        <SkeletonButton size="lg" className="w-full" />
      </div>
    </div>
  );
}
