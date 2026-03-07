'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCaixaAberto, abrirCaixa, fecharCaixa, getResumoCaixa } from '@/lib/firebase/caixa';
import { useAuth } from '@/contexts/AuthContext';
import type { Caixa, ResumoCaixa } from '@/types';

interface UseCaixaReturn {
  caixa: Caixa | null;
  resumo: ResumoCaixa | null;
  loading: boolean;
  error: Error | null;
  isAberto: boolean;
  abrirCaixa: (saldoInicial: number) => Promise<string | null>;
  fecharCaixa: (saldoConferido: number, observacao?: string) => Promise<boolean>;
  recarregar: () => Promise<void>;
}

export function useCaixa(): UseCaixaReturn {
  const { user } = useAuth();
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [resumo, setResumo] = useState<ResumoCaixa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const carregarCaixa = useCallback(async () => {
    if (!user) {
      setCaixa(null);
      setResumo(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const caixaAberto = await getCaixaAberto(user.uid);
      setCaixa(caixaAberto);

      if (caixaAberto) {
        try {
          const resumoCaixa = await getResumoCaixa(user.uid);
          setResumo(resumoCaixa);
        } catch {
          // Resumo pode falhar se não houver movimentos
          setResumo(null);
        }
      } else {
        setResumo(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar caixa'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Carregar caixa ao montar
  useEffect(() => {
    carregarCaixa();
  }, [carregarCaixa]);

  const handleAbrirCaixa = useCallback(async (saldoInicial: number): Promise<string | null> => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      const caixaId = await abrirCaixa(user.uid, saldoInicial);
      await carregarCaixa();
      return caixaId;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao abrir caixa'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, carregarCaixa]);

  const handleFecharCaixa = useCallback(async (
    saldoConferido: number,
    observacao?: string
  ): Promise<boolean> => {
    if (!caixa) return false;

    setLoading(true);
    setError(null);

    try {
      await fecharCaixa(caixa.id, saldoConferido, observacao);
      await carregarCaixa();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao fechar caixa'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [caixa, carregarCaixa]);

  return {
    caixa,
    resumo,
    loading,
    error,
    isAberto: !!caixa && caixa.status === 'aberto',
    abrirCaixa: handleAbrirCaixa,
    fecharCaixa: handleFecharCaixa,
    recarregar: carregarCaixa,
  };
}
