'use client';

import { useState, useCallback } from 'react';
import type { FormaPagamento, Pagamento } from '@/types';
import { generateId } from '@/lib/utils';

interface UsePagamentoReturn {
  pagamentos: Pagamento[];
  totalPago: number;
  troco: number;
  faltante: number;
  isPago: boolean;
  adicionarPagamento: (forma: FormaPagamento, valor: number, extras?: Partial<Pagamento>) => void;
  removerPagamento: (id: string) => void;
  limparPagamentos: () => void;
  setTotalVenda: (valor: number) => void;
}

export function usePagamento(totalInicial: number = 0): UsePagamentoReturn {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [totalVenda, setTotalVenda] = useState(totalInicial);

  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const faltante = Math.max(0, totalVenda - totalPago);
  const troco = Math.max(0, totalPago - totalVenda);
  const isPago = totalPago >= totalVenda && totalVenda > 0;

  const adicionarPagamento = useCallback((
    forma: FormaPagamento,
    valor: number,
    extras?: Partial<Pagamento>
  ) => {
    if (valor <= 0) return;

    const novoPagamento: Pagamento = {
      id: generateId(),
      forma,
      valor,
      ...extras,
      createdAt: new Date(),
    };

    setPagamentos(prev => [...prev, novoPagamento]);
  }, []);

  const removerPagamento = useCallback((id: string) => {
    setPagamentos(prev => prev.filter(p => p.id !== id));
  }, []);

  const limparPagamentos = useCallback(() => {
    setPagamentos([]);
  }, []);

  const handleSetTotalVenda = useCallback((valor: number) => {
    setTotalVenda(valor);
  }, []);

  return {
    pagamentos,
    totalPago,
    troco,
    faltante,
    isPago,
    adicionarPagamento,
    removerPagamento,
    limparPagamentos,
    setTotalVenda: handleSetTotalVenda,
  };
}
