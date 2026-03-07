'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ==========================================
// TOOLTIP
// ==========================================

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  /** Conteúdo do tooltip */
  content: React.ReactNode;
  /** Elemento que ativa o tooltip */
  children: React.ReactElement;
  /** Posição do tooltip */
  position?: TooltipPosition;
  /** Delay para mostrar (ms) */
  delay?: number;
  /** Classe CSS adicional */
  className?: string;
  /** Se true, desabilita o tooltip */
  disabled?: boolean;
}

const positionClasses: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const arrowClasses: Record<TooltipPosition, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-x-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-x-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-y-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-y-transparent border-l-transparent',
};

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = React.useId();

  const showTooltip = React.useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [delay, disabled]);

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (disabled) {
    return children;
  }

  return (
    <div 
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap animate-fade-in',
            positionClasses[position],
            className
          )}
        >
          {content}
          {/* Arrow */}
          <span 
            className={cn(
              'absolute w-0 h-0 border-4',
              arrowClasses[position]
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
}

// ==========================================
// TOOLTIP PROVIDER (para controle global)
// ==========================================

interface TooltipContextType {
  globalDelay: number;
  disabled: boolean;
}

const TooltipContext = React.createContext<TooltipContextType>({
  globalDelay: 200,
  disabled: false,
});

export function TooltipProvider({
  children,
  delay = 200,
  disabled = false,
}: {
  children: React.ReactNode;
  delay?: number;
  disabled?: boolean;
}) {
  return (
    <TooltipContext.Provider value={{ globalDelay: delay, disabled }}>
      {children}
    </TooltipContext.Provider>
  );
}

export function useTooltipContext() {
  return React.useContext(TooltipContext);
}
