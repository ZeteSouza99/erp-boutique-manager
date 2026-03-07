'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ==========================================
// TABS
// ==========================================

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = React.createContext<TabsContextType | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// ==========================================
// TABS ROOT
// ==========================================

interface TabsProps {
  /** Valor da tab ativa (controlado) */
  value?: string;
  /** Tab padrão inicial (não-controlado) */
  defaultValue?: string;
  /** Callback quando tab muda */
  onValueChange?: (value: string) => void;
  /** Orientação das tabs */
  orientation?: 'horizontal' | 'vertical';
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  children,
  className,
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  
  const activeTab = value !== undefined ? value : internalValue;
  
  const setActiveTab = React.useCallback((tab: string) => {
    if (value === undefined) {
      setInternalValue(tab);
    }
    onValueChange?.(tab);
  }, [value, onValueChange]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div 
        className={cn(
          orientation === 'vertical' && 'flex gap-4',
          className
        )}
        data-orientation={orientation}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// ==========================================
// TABS LIST
// ==========================================

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div 
      role="tablist"
      className={cn(
        'inline-flex items-center justify-start rounded-lg bg-gray-100 p-1 gap-1',
        className
      )}
    >
      {children}
    </div>
  );
}

// ==========================================
// TAB TRIGGER
// ==========================================

interface TabsTriggerProps {
  /** Valor único da tab */
  value: string;
  /** Se a tab está desabilitada */
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ 
  value, 
  disabled = false, 
  children, 
  className 
}: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;
  const tabId = `tab-${value}`;
  const panelId = `tabpanel-${value}`;

  return (
    <button
      id={tabId}
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
        className
      )}
    >
      {children}
    </button>
  );
}

// ==========================================
// TAB CONTENT
// ==========================================

interface TabsContentProps {
  /** Valor da tab que este conteúdo pertence */
  value: string;
  children: React.ReactNode;
  className?: string;
  /** Se deve manter o conteúdo montado quando inativo */
  forceMount?: boolean;
}

export function TabsContent({ 
  value, 
  children, 
  className,
  forceMount = false,
}: TabsContentProps) {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;
  const panelId = `tabpanel-${value}`;
  const tabId = `tab-${value}`;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      hidden={!isActive}
      className={cn(
        'mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        isActive && 'animate-fade-in',
        className
      )}
    >
      {children}
    </div>
  );
}

// ==========================================
// TABS VARIANTE: UNDERLINE
// ==========================================

export function TabsListUnderline({ children, className }: TabsListProps) {
  return (
    <div 
      role="tablist"
      className={cn(
        'inline-flex items-center justify-start border-b border-gray-200 gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTriggerUnderline({ 
  value, 
  disabled = false, 
  children, 
  className 
}: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap py-2 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',
        isActive 
          ? 'border-blue-600 text-blue-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
        className
      )}
    >
      {children}
    </button>
  );
}

// ==========================================
// TABS VARIANTE: PILLS
// ==========================================

export function TabsListPills({ children, className }: TabsListProps) {
  return (
    <div 
      role="tablist"
      className={cn(
        'inline-flex items-center justify-start gap-2',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTriggerPill({ 
  value, 
  disabled = false, 
  children, 
  className 
}: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',
        isActive 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900',
        className
      )}
    >
      {children}
    </button>
  );
}
