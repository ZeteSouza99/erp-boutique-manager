'use client';

import * as React from 'react';
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from './modal';
import { Button } from './button';

// ==========================================
// CONFIRMATION DIALOG
// ==========================================

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  /** Se o dialog está aberto */
  isOpen: boolean;
  /** Callback ao fechar (cancelar) */
  onClose: () => void;
  /** Callback ao confirmar */
  onConfirm: () => void | Promise<void>;
  /** Título do dialog */
  title: string;
  /** Descrição/mensagem */
  description?: string;
  /** Variante visual */
  variant?: ConfirmVariant;
  /** Texto do botão de confirmação */
  confirmLabel?: string;
  /** Texto do botão de cancelamento */
  cancelLabel?: string;
  /** Se está processando a confirmação */
  loading?: boolean;
  /** Ícone customizado */
  icon?: React.ReactNode;
}

const variantConfig: Record<ConfirmVariant, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  buttonVariant: 'danger' | 'warning' | 'primary' | 'default';
}> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonVariant: 'danger',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    buttonVariant: 'warning',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonVariant: 'primary',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    buttonVariant: 'primary',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  variant = 'danger',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Erro na confirmação:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = loading || isProcessing;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" persistent={isLoading}>
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4">
        {/* Ícone */}
        <div className={cn('p-3 rounded-full shrink-0', config.iconBg)}>
          {icon || <IconComponent className={cn('h-6 w-6', config.iconColor)} />}
        </div>

        {/* Conteúdo */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={config.buttonVariant}
          onClick={handleConfirm}
          loading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// ==========================================
// DELETE CONFIRMATION (shortcut)
// ==========================================

interface DeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  /** Nome do item a ser excluído */
  itemName?: string;
  /** Tipo do item (ex: "produto", "cliente") */
  itemType?: string;
  loading?: boolean;
}

export function DeleteConfirm({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'item',
  loading,
}: DeleteConfirmProps) {
  const title = itemName 
    ? `Excluir "${itemName}"?` 
    : `Excluir ${itemType}?`;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      variant="danger"
      title={title}
      description={`Esta ação não pode ser desfeita. O ${itemType} será removido permanentemente.`}
      confirmLabel="Excluir"
      loading={loading}
    />
  );
}

// ==========================================
// HOOK PARA GERENCIAR CONFIRMAÇÃO
// ==========================================

interface UseConfirmOptions {
  title: string;
  description?: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
}

export function useConfirm() {
  const [state, setState] = React.useState<{
    isOpen: boolean;
    options: UseConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = React.useCallback((options: UseConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = React.useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, options: null, resolve: null });
  }, [state]);

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, options: null, resolve: null });
  }, [state]);

  const ConfirmDialogComponent = React.useMemo(() => {
    if (!state.options) return null;

    return (
      <ConfirmDialog
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        {...state.options}
      />
    );
  }, [state.isOpen, state.options, handleClose, handleConfirm]);

  return {
    confirm,
    ConfirmDialog: ConfirmDialogComponent,
  };
}
