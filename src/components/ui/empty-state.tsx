'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  FileText, 
  Search, 
  Inbox,
  AlertCircle,
  type LucideIcon
} from 'lucide-react';
import { Button } from './button';

// ==========================================
// EMPTY STATE
// ==========================================

type EmptyStateVariant = 
  | 'default' 
  | 'search' 
  | 'products' 
  | 'clients' 
  | 'sales' 
  | 'documents'
  | 'error';

interface EmptyStateProps {
  /** Variante pré-definida com ícone e texto padrão */
  variant?: EmptyStateVariant;
  /** Ícone customizado (sobrescreve variante) */
  icon?: LucideIcon;
  /** Título principal */
  title?: string;
  /** Descrição complementar */
  description?: string;
  /** Texto do botão de ação */
  actionLabel?: string;
  /** Callback do botão de ação */
  onAction?: () => void;
  /** Ação secundária */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** Classes CSS adicionais */
  className?: string;
  /** Tamanho do componente */
  size?: 'sm' | 'md' | 'lg';
  /** Conteúdo adicional abaixo das ações */
  children?: React.ReactNode;
}

const variantConfig: Record<EmptyStateVariant, { 
  icon: LucideIcon; 
  title: string; 
  description: string;
  iconColor: string;
}> = {
  default: {
    icon: Inbox,
    title: 'Nenhum item encontrado',
    description: 'Não há dados para exibir no momento.',
    iconColor: 'text-gray-400',
  },
  search: {
    icon: Search,
    title: 'Nenhum resultado',
    description: 'Tente buscar com outras palavras-chave.',
    iconColor: 'text-gray-400',
  },
  products: {
    icon: Package,
    title: 'Nenhum produto cadastrado',
    description: 'Comece adicionando seu primeiro produto ao catálogo.',
    iconColor: 'text-blue-400',
  },
  clients: {
    icon: Users,
    title: 'Nenhum cliente cadastrado',
    description: 'Adicione clientes para acompanhar suas compras.',
    iconColor: 'text-green-400',
  },
  sales: {
    icon: ShoppingCart,
    title: 'Nenhuma venda registrada',
    description: 'As vendas realizadas aparecerão aqui.',
    iconColor: 'text-purple-400',
  },
  documents: {
    icon: FileText,
    title: 'Nenhum documento',
    description: 'Os documentos gerados aparecerão aqui.',
    iconColor: 'text-orange-400',
  },
  error: {
    icon: AlertCircle,
    title: 'Erro ao carregar dados',
    description: 'Ocorreu um problema. Tente novamente.',
    iconColor: 'text-red-400',
  },
};

const sizeConfig = {
  sm: {
    container: 'py-6 px-4',
    icon: 'h-10 w-10',
    title: 'text-base',
    description: 'text-sm',
    iconBg: 'p-3',
  },
  md: {
    container: 'py-12 px-6',
    icon: 'h-12 w-12',
    title: 'text-lg',
    description: 'text-sm',
    iconBg: 'p-4',
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'h-16 w-16',
    title: 'text-xl',
    description: 'text-base',
    iconBg: 'p-5',
  },
};

export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  size = 'md',
  children,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const sizeStyles = sizeConfig[size];
  const Icon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeStyles.container,
        className
      )}
    >
      {/* Ícone */}
      <div className={cn(
        'rounded-full bg-gray-100 mb-4',
        sizeStyles.iconBg
      )}>
        <Icon className={cn(sizeStyles.icon, config.iconColor)} />
      </div>

      {/* Título */}
      <h3 className={cn(
        'font-semibold text-gray-900 mb-1',
        sizeStyles.title
      )}>
        {displayTitle}
      </h3>

      {/* Descrição */}
      <p className={cn(
        'text-gray-500 mb-4 max-w-sm',
        sizeStyles.description
      )}>
        {displayDescription}
      </p>

      {/* Ações */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}

      {/* Conteúdo adicional */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ==========================================
// EMPTY STATE PARA LISTAS
// ==========================================

interface EmptyListProps {
  /** Termo de busca atual (para mensagem contextual) */
  searchTerm?: string;
  /** Nome do tipo de item (ex: "produto", "cliente") */
  itemType?: string;
  /** Callback para limpar busca */
  onClearSearch?: () => void;
  /** Callback para adicionar novo item */
  onAdd?: () => void;
  className?: string;
}

export function EmptyList({
  searchTerm,
  itemType = 'item',
  onClearSearch,
  onAdd,
  className,
}: EmptyListProps) {
  const isSearching = searchTerm && searchTerm.length > 0;

  return (
    <EmptyState
      variant={isSearching ? 'search' : 'default'}
      title={isSearching 
        ? `Nenhum ${itemType} encontrado` 
        : `Nenhum ${itemType} cadastrado`
      }
      description={isSearching 
        ? `Sua busca por "${searchTerm}" não retornou resultados.`
        : `Adicione seu primeiro ${itemType} para começar.`
      }
      actionLabel={isSearching ? 'Limpar busca' : `Adicionar ${itemType}`}
      onAction={isSearching ? onClearSearch : onAdd}
      size="sm"
      className={className}
    />
  );
}

// ==========================================
// EMPTY STATE PARA CARRINHO
// ==========================================

export function EmptyCart({ 
  onBrowse, 
  className 
}: { 
  onBrowse?: () => void; 
  className?: string;
}) {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="Carrinho vazio"
      description="Adicione produtos para iniciar uma venda."
      actionLabel={onBrowse ? "Buscar produtos" : undefined}
      onAction={onBrowse}
      size="sm"
      className={className}
    />
  );
}

// ==========================================
// EMPTY STATE PARA ERROS
// ==========================================

export function ErrorState({
  title = 'Erro ao carregar',
  description = 'Ocorreu um problema ao carregar os dados.',
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      variant="error"
      title={title}
      description={description}
      actionLabel={onRetry ? 'Tentar novamente' : undefined}
      onAction={onRetry}
      className={className}
    />
  );
}
