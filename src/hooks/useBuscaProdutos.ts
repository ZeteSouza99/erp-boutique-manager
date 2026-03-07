'use client';

import { useState, useCallback, useEffect } from 'react';
import { buscarProdutos } from '@/lib/firebase/produtos';
import { useDebounce } from './useDebounce';
import type { Produto } from '@/types';

interface UseBuscaProdutosOptions {
  debounceMs?: number;
  minChars?: number;
  autoSearch?: boolean;
}

interface UseBuscaProdutosReturn {
  termo: string;
  setTermo: (termo: string) => void;
  produtos: Produto[];
  loading: boolean;
  error: Error | null;
  buscar: (termo?: string) => Promise<void>;
  limpar: () => void;
}

export function useBuscaProdutos(options: UseBuscaProdutosOptions = {}): UseBuscaProdutosReturn {
  const { debounceMs = 300, minChars = 2, autoSearch = true } = options;

  const [termo, setTermo] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const termoDebouncado = useDebounce(termo, debounceMs);

  const buscar = useCallback(async (termoBusca?: string) => {
    const termoAtual = termoBusca ?? termo;
    
    if (termoAtual.length < minChars) {
      setProdutos([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resultado = await buscarProdutos(termoAtual);
      setProdutos(resultado);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao buscar produtos'));
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  }, [termo, minChars]);

  // Auto-search quando termo muda (debounced)
  useEffect(() => {
    if (autoSearch) {
      if (termoDebouncado.length < minChars) {
        setProdutos([]);
        return;
      }
      buscar(termoDebouncado);
    }
  }, [termoDebouncado, autoSearch, minChars, buscar]);

  const limpar = useCallback(() => {
    setTermo('');
    setProdutos([]);
    setError(null);
  }, []);

  return {
    termo,
    setTermo,
    produtos,
    loading,
    error,
    buscar,
    limpar,
  };
}
