'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

// ==========================================
// POPOVER
// ==========================================

type PopoverPosition = 'top' | 'bottom' | 'left' | 'right';
type PopoverAlign = 'start' | 'center' | 'end';

interface PopoverProps {
  /** Elemento que ativa o popover */
  trigger: React.ReactNode;
  /** Conteúdo do popover */
  children: React.ReactNode;
  /** Posição do popover */
  position?: PopoverPosition;
  /** Alinhamento */
  align?: PopoverAlign;
  /** Classes adicionais para o container do popover */
  className?: string;
  /** Se o popover está aberto (controlado) */
  open?: boolean;
  /** Callback quando abre/fecha */
  onOpenChange?: (open: boolean) => void;
  /** Largura do popover */
  width?: 'auto' | 'trigger' | number;
}

const positionClasses: Record<PopoverPosition, string> = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
  left: 'right-full mr-2',
  right: 'left-full ml-2',
};

const alignClasses: Record<PopoverAlign, Record<'horizontal' | 'vertical', string>> = {
  start: { horizontal: 'left-0', vertical: 'top-0' },
  center: { horizontal: 'left-1/2 -translate-x-1/2', vertical: 'top-1/2 -translate-y-1/2' },
  end: { horizontal: 'right-0', vertical: 'bottom-0' },
};

export function Popover({
  trigger,
  children,
  position = 'bottom',
  align = 'start',
  className,
  open,
  onOpenChange,
  width = 'auto',
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = React.useCallback((value: boolean) => {
    if (open === undefined) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  }, [open, onOpenChange]);

  // Fechar ao clicar fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  // Fechar com ESC
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, setIsOpen]);

  const isHorizontal = position === 'left' || position === 'right';
  const alignClass = alignClasses[align][isHorizontal ? 'vertical' : 'horizontal'];

  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  
  useEffect(() => {
    if (width === 'trigger' && triggerRef.current && isOpen) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [width, isOpen]);

  const widthStyle: React.CSSProperties = {};
  if (width === 'trigger' && triggerWidth) {
    widthStyle.width = triggerWidth;
  } else if (typeof width === 'number') {
    widthStyle.width = width;
  }

  return (
    <div className="relative inline-flex">
      {/* Trigger */}
      <div 
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={widthStyle}
          className={cn(
            'absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 animate-scale-in',
            positionClasses[position],
            alignClass,
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ==========================================
// DROPDOWN MENU
// ==========================================

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: PopoverAlign;
  className?: string;
}

export function DropdownMenu({ 
  trigger, 
  children, 
  align = 'start',
  className 
}: DropdownMenuProps) {
  return (
    <Popover 
      trigger={trigger} 
      position="bottom" 
      align={align}
      className={cn('py-1 min-w-40', className)}
    >
      {children}
    </Popover>
  );
}

// ==========================================
// DROPDOWN ITEM
// ==========================================

interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function DropdownItem({
  children,
  onClick,
  disabled = false,
  destructive = false,
  icon,
  className,
}: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
        disabled 
          ? 'text-gray-400 cursor-not-allowed' 
          : destructive 
            ? 'text-red-600 hover:bg-red-50'
            : 'text-gray-700 hover:bg-gray-100',
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

// ==========================================
// DROPDOWN SEPARATOR
// ==========================================

export function DropdownSeparator() {
  return <div className="h-px my-1 bg-gray-200" />;
}

// ==========================================
// DROPDOWN LABEL
// ==========================================

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {children}
    </div>
  );
}

// ==========================================
// SELECT DROPDOWN (para formulários)
// ==========================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectDropdownProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  disabled = false,
  className,
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
      position="bottom"
      align="start"
      width="trigger"
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center justify-between w-full h-10 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-400 transition-transform',
            isOpen && 'transform rotate-180'
          )} />
        </button>
      }
      className="py-1 max-h-60 overflow-auto"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={option.disabled}
          onClick={() => {
            onChange?.(option.value);
            setIsOpen(false);
          }}
          className={cn(
            'w-full px-3 py-2 text-sm text-left transition-colors',
            option.disabled 
              ? 'text-gray-400 cursor-not-allowed'
              : option.value === value
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          {option.label}
        </button>
      ))}
    </Popover>
  );
}
