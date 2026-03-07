'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Produto, Variacao, VendaItem } from '@/types';
import { generateId } from '@/lib/utils';

// Estende VendaItem com informações extras para o carrinho
export interface ItemCarrinho extends VendaItem {
  produto?: Produto;
  variacao?: Variacao;
  estoqueDisponivel: number;
}

// Dados serializados para localStorage (sem objetos pesados)
interface CarrinhoSerializado {
  itens: Omit<ItemCarrinho, 'produto' | 'variacao'>[];
  descontoPercentual: number;
  descontoValor: number;
}

const CART_STORAGE_KEY = 'boutique-carrinho';

function lerCarrinhoDoStorage(): CarrinhoSerializado | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CarrinhoSerializado;
  } catch (error) {
    console.warn('Erro ao ler carrinho do localStorage:', error);
    return null;
  }
}

function salvarCarrinhoNoStorage(data: CarrinhoSerializado): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Erro ao salvar carrinho no localStorage:', error);
  }
}

function limparCarrinhoDoStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.warn('Erro ao limpar carrinho do localStorage:', error);
  }
}

/** Serializa os itens do carrinho, removendo objetos produto/variacao pesados */
function serializarItens(itens: ItemCarrinho[]): Omit<ItemCarrinho, 'produto' | 'variacao'>[] {
  return itens.map(({ produto: _produto, variacao: _variacao, ...rest }) => rest);
}

interface UseCarrinhoReturn {
  carrinho: ItemCarrinho[];
  total: number;
  subtotal: number;
  totalItens: number;
  quantidadeItens: number;
  desconto: number;
  descontoPercentual: number;
  adicionarItem: (produto: Produto, variacao: Variacao) => boolean;
  removerItem: (produtoId: string, variacaoId: string) => void;
  atualizarQuantidade: (produtoId: string, variacaoId: string, quantidade: number) => boolean;
  incrementarQuantidade: (produtoId: string, variacaoId: string) => boolean;
  decrementarQuantidade: (produtoId: string, variacaoId: string) => void;
  aplicarDesconto: (percentual: number) => void;
  aplicarDescontoValor: (valor: number) => void;
  aplicarDescontoItem: (produtoId: string, variacaoId: string, percentual: number) => void;
  limparCarrinho: () => void;
  isEmpty: boolean;
}

export function useCarrinho(): UseCarrinhoReturn {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>(() => {
    const saved = lerCarrinhoDoStorage();
    if (saved?.itens && saved.itens.length > 0) {
      // Restore items from localStorage (without produto/variacao objects)
      return saved.itens as ItemCarrinho[];
    }
    return [];
  });

  const [descontoPercentual, setDescontoPercentual] = useState(() => {
    const saved = lerCarrinhoDoStorage();
    return saved?.descontoPercentual ?? 0;
  });

  const [descontoValor, setDescontoValor] = useState(() => {
    const saved = lerCarrinhoDoStorage();
    return saved?.descontoValor ?? 0;
  });

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    if (carrinho.length === 0 && descontoPercentual === 0 && descontoValor === 0) {
      limparCarrinhoDoStorage();
      return;
    }
    salvarCarrinhoNoStorage({
      itens: serializarItens(carrinho),
      descontoPercentual,
      descontoValor,
    });
  }, [carrinho, descontoPercentual, descontoValor]);

  // Cálculos
  const subtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
  const quantidadeItens = carrinho.length;

  // Desconto pode ser percentual ou valor fixo
  const descontoCalculado = descontoPercentual > 0
    ? subtotal * (descontoPercentual / 100)
    : descontoValor;
  const desconto = Math.min(descontoCalculado, subtotal); // Não pode ser maior que subtotal
  const total = subtotal - desconto;

  const getEstoqueVariacao = (variacao: Variacao): number => {
    return variacao.estoque;
  };

  const adicionarItem = useCallback((produto: Produto, variacao: Variacao): boolean => {
    const estoqueDisponivel = getEstoqueVariacao(variacao);

    // Verificar se já existe no carrinho
    const itemExistente = carrinho.find(
      item => item.produtoId === produto.id && item.variacaoId === variacao.id
    );

    if (itemExistente) {
      // Verificar estoque
      if (itemExistente.quantidade >= estoqueDisponivel) {
        return false; // Estoque insuficiente
      }

      setCarrinho(prev => prev.map(item =>
        item.produtoId === produto.id && item.variacaoId === variacao.id
          ? {
              ...item,
              quantidade: item.quantidade + 1,
              subtotal: (item.quantidade + 1) * item.precoUnitario * (1 - (item.desconto || 0) / 100),
              produto,
              variacao,
              estoqueDisponivel,
            }
          : item
      ));
      return true;
    }

    // Verificar estoque para novo item
    if (estoqueDisponivel < 1) {
      return false; // Sem estoque
    }

    const novoItem: ItemCarrinho = {
      id: generateId(),
      produtoId: produto.id!,
      variacaoId: variacao.id!,
      quantidade: 1,
      precoUnitario: produto.precoVenda,
      precoOriginal: produto.precoVenda,
      custoUnitario: produto.precoCusto,
      desconto: 0,
      subtotal: produto.precoVenda,
      nomeProduto: produto.nome,
      produtoNome: produto.nome,
      sku: variacao.sku || produto.sku,
      tamanho: variacao.tamanho,
      cor: variacao.cor,
      produto,
      variacao,
      estoqueDisponivel,
    };

    setCarrinho(prev => [...prev, novoItem]);
    return true;
  }, [carrinho]);

  const removerItem = useCallback((produtoId: string, variacaoId: string) => {
    setCarrinho(prev => prev.filter(
      item => !(item.produtoId === produtoId && item.variacaoId === variacaoId)
    ));
  }, []);

  const atualizarQuantidade = useCallback((
    produtoId: string,
    variacaoId: string,
    quantidade: number
  ): boolean => {
    if (quantidade < 1) {
      removerItem(produtoId, variacaoId);
      return true;
    }

    const item = carrinho.find(
      i => i.produtoId === produtoId && i.variacaoId === variacaoId
    );

    if (!item) return false;

    // Verificar estoque
    if (quantidade > item.estoqueDisponivel) {
      return false;
    }

    setCarrinho(prev => prev.map(item =>
      item.produtoId === produtoId && item.variacaoId === variacaoId
        ? {
            ...item,
            quantidade,
            subtotal: quantidade * item.precoUnitario * (1 - (item.desconto || 0) / 100)
          }
        : item
    ));
    return true;
  }, [carrinho, removerItem]);

  const incrementarQuantidade = useCallback((produtoId: string, variacaoId: string): boolean => {
    const item = carrinho.find(
      i => i.produtoId === produtoId && i.variacaoId === variacaoId
    );
    if (!item) return false;
    return atualizarQuantidade(produtoId, variacaoId, item.quantidade + 1);
  }, [carrinho, atualizarQuantidade]);

  const decrementarQuantidade = useCallback((produtoId: string, variacaoId: string) => {
    const item = carrinho.find(
      i => i.produtoId === produtoId && i.variacaoId === variacaoId
    );
    if (!item) return;
    atualizarQuantidade(produtoId, variacaoId, item.quantidade - 1);
  }, [carrinho, atualizarQuantidade]);

  const aplicarDesconto = useCallback((percentual: number) => {
    setDescontoPercentual(Math.min(100, Math.max(0, percentual)));
    setDescontoValor(0); // Reseta desconto por valor
  }, []);

  const aplicarDescontoValor = useCallback((valor: number) => {
    setDescontoValor(Math.max(0, valor));
    setDescontoPercentual(0); // Reseta desconto percentual
  }, []);

  const aplicarDescontoItem = useCallback((
    produtoId: string,
    variacaoId: string,
    percentual: number
  ) => {
    setCarrinho(prev => prev.map(item =>
      item.produtoId === produtoId && item.variacaoId === variacaoId
        ? {
            ...item,
            desconto: Math.min(100, Math.max(0, percentual)),
            precoUnitario: item.precoOriginal! * (1 - Math.min(100, Math.max(0, percentual)) / 100),
            subtotal: item.quantidade * item.precoOriginal! * (1 - Math.min(100, Math.max(0, percentual)) / 100)
          }
        : item
    ));
  }, []);

  const limparCarrinho = useCallback(() => {
    setCarrinho([]);
    setDescontoPercentual(0);
    setDescontoValor(0);
    limparCarrinhoDoStorage();
  }, []);

  return {
    carrinho,
    total,
    subtotal,
    totalItens,
    quantidadeItens,
    desconto,
    descontoPercentual,
    adicionarItem,
    removerItem,
    atualizarQuantidade,
    incrementarQuantidade,
    decrementarQuantidade,
    aplicarDesconto,
    aplicarDescontoValor,
    aplicarDescontoItem,
    limparCarrinho,
    isEmpty: carrinho.length === 0,
  };
}
