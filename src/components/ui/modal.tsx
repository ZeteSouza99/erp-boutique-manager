'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** ID único para acessibilidade - gerado automaticamente se não fornecido */
  id?: string;
  /** Se true, desabilita fechamento por ESC e click no overlay */
  persistent?: boolean;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]',
};

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  size = 'md',
  id,
  persistent = false,
}: ModalProps) {
  const generatedId = React.useId();
  const modalId = id || generatedId;
  const titleId = `${modalId}-title`;
  const descId = `${modalId}-desc`;
  const modalRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  // Gerenciar overflow do body
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Salvar elemento com foco anterior
      previousActiveElement.current = document.activeElement as HTMLElement;
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Focus trap e keyboard handling
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC para fechar (se não for persistent)
      if (e.key === 'Escape' && !persistent) {
        onClose();
        return;
      }

      // Tab trap - manter foco dentro do modal
      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Focar no modal ao abrir
    setTimeout(() => {
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 10);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Restaurar foco ao fechar
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose, persistent]);
  
  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (!persistent) onClose();
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      role="presentation"
    >
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative z-50 w-full bg-white rounded-lg shadow-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-scale-in',
          sizes[size]
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-4 border-b">
            <div>
              {title && (
                <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-sm text-gray-500 mt-1">
                  {description}
                </p>
              )}
            </div>
            {!persistent && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Fechar modal"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Componentes auxiliares do Modal
export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex justify-end gap-2 pt-4 border-t mt-4', className)}>
      {children}
    </div>
  );
}
