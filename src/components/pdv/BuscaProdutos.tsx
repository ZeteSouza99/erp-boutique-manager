'use client';

import { useState } from 'react';
import { Search, X, User } from 'lucide-react';
import { Input, Badge, Loading } from '@/components/ui';
import type { Produto, Cliente, Variacao } from '@/types';
import { formatCurrency } from '@/lib/utils';

// ==========================================
// BARRA DE BUSCA DE PRODUTOS
// ==========================================

interface BuscaProdutosProps {
  termo: string;
  setTermo: (termo: string) => void;
  produtos: Produto[];
  loading: boolean;
  onSelectProduto: (produto: Produto) => void;
  placeholder?: string;
}

export function BuscaProdutos({
  termo,
  setTermo,
  produtos,
  loading,
  onSelectProduto,
  placeholder = 'Buscar produto por nome, SKU ou código...',
}: BuscaProdutosProps) {
  const [isFocused, setIsFocused] = useState(false);
  const showResults = isFocused && (produtos.length > 0 || loading || termo.length >= 2);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-lg"
        />
        {termo && (
          <button
            onClick={() => setTermo('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-auto">
          {loading ? (
            <div className="p-4 flex justify-center">
              <Loading size="sm" />
            </div>
          ) : produtos.length > 0 ? (
            <ul>
              {produtos.map((produto) => (
                <li
                  key={produto.id}
                  onClick={() => {
                    onSelectProduto(produto);
                    setTermo('');
                  }}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{produto.nome}</p>
                      <p className="text-sm text-gray-500">SKU: {produto.sku}</p>
                      {produto.variacoes && produto.variacoes.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {produto.variacoes.slice(0, 3).map((v) => (
                            <Badge key={v.id} variant="secondary" className="text-xs">
                              {v.tamanho} {v.cor}
                            </Badge>
                          ))}
                          {produto.variacoes.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{produto.variacoes.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-blue-600">
                      {formatCurrency(produto.precoVenda)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : termo.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhum produto encontrado
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MODAL DE SELEÇÃO DE VARIAÇÃO
// ==========================================

interface ModalVariacaoProps {
  produto: Produto | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (produto: Produto, variacao: Variacao) => void;
}

export function ModalVariacao({ produto, isOpen, onClose, onSelect }: ModalVariacaoProps) {
  if (!isOpen || !produto) return null;

  const variacoes = produto.variacoes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-900">{produto.nome}</h3>
            <p className="text-sm text-gray-500">Selecione a variação</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2">
          {variacoes.map((variacao) => {
            const estoque = variacao.estoque;
            const semEstoque = estoque <= 0;

            return (
              <button
                key={variacao.id}
                onClick={() => !semEstoque && onSelect(produto, variacao)}
                disabled={semEstoque}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  semEstoque
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <p className="font-medium">
                  {variacao.tamanho} - {variacao.cor}
                </p>
                <p className={`text-sm ${semEstoque ? 'text-red-400' : 'text-gray-500'}`}>
                  {semEstoque ? 'Sem estoque' : `Estoque: ${estoque}`}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SELETOR DE CLIENTE
// ==========================================

interface SeletorClienteProps {
  termo: string;
  setTermo: (termo: string) => void;
  clientes: Cliente[];
  loading: boolean;
  clienteSelecionado: Cliente | null;
  onSelectCliente: (cliente: Cliente | null) => void;
}

export function SeletorCliente({
  termo,
  setTermo,
  clientes,
  loading,
  clienteSelecionado,
  onSelectCliente,
}: SeletorClienteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const showResults = isFocused && !clienteSelecionado && (clientes.length > 0 || loading || termo.length >= 2);

  if (clienteSelecionado) {
    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{clienteSelecionado.nome}</p>
            {clienteSelecionado.telefone && (
              <p className="text-sm text-gray-500">{clienteSelecionado.telefone}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => onSelectCliente(null)}
          className="p-1 hover:bg-blue-100 rounded"
        >
          <X className="h-5 w-5 text-blue-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Buscar cliente (opcional)..."
          className="pl-10"
        />
      </div>

      {showResults && (
        <div className="absolute z-40 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 flex justify-center">
              <Loading size="sm" />
            </div>
          ) : clientes.length > 0 ? (
            <ul>
              {clientes.map((cliente) => (
                <li
                  key={cliente.id}
                  onClick={() => {
                    onSelectCliente(cliente);
                    setTermo('');
                  }}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <p className="font-medium text-gray-900">{cliente.nome}</p>
                  {cliente.telefone && (
                    <p className="text-sm text-gray-500">{cliente.telefone}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : termo.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhum cliente encontrado
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ==========================================
// ITEM DO CARRINHO
// ==========================================

interface ItemCarrinhoProps {
  item: {
    produtoId: string;
    variacaoId: string;
    nomeProduto?: string;
    sku?: string;
    tamanho?: string;
    cor?: string;
    quantidade: number;
    precoUnitario: number;
    subtotal: number;
    estoqueDisponivel?: number;
  };
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export function ItemCarrinho({ item, onIncrement, onDecrement, onRemove }: ItemCarrinhoProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{item.nomeProduto}</p>
        <p className="text-sm text-gray-500">
          {item.tamanho} - {item.cor}
        </p>
        <p className="text-sm text-blue-600">{formatCurrency(item.precoUnitario)}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onDecrement}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
        >
          -
        </button>
        <span className="w-8 text-center font-medium">{item.quantidade}</span>
        <button
          onClick={onIncrement}
          disabled={item.estoqueDisponivel !== undefined && item.quantidade >= item.estoqueDisponivel}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>

      <div className="text-right">
        <p className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</p>
        <button
          onClick={onRemove}
          className="text-xs text-red-600 hover:underline"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

// ==========================================
// RESUMO DO CARRINHO
// ==========================================

interface ResumoCarrinhoProps {
  subtotal: number;
  desconto: number;
  total: number;
  totalItens: number;
}

export function ResumoCarrinho({ subtotal, desconto, total, totalItens }: ResumoCarrinhoProps) {
  return (
    <div className="border-t pt-4 space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Subtotal ({totalItens} {totalItens === 1 ? 'item' : 'itens'})</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {desconto > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Desconto</span>
          <span>-{formatCurrency(desconto)}</span>
        </div>
      )}
      <div className="flex justify-between text-lg font-bold text-gray-900">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
