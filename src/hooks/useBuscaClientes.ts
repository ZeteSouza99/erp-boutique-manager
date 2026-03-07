'use client';

import { useState, useCallback, useEffect } from 'react';
import { buscarClientes } from '@/lib/firebase/clientes';
import { useDebounce } from './useDebounce';
import type { Cliente } from '@/types';

interface UseBuscaClientesOptions {
  debounceMs?: number;
  minChars?: number;
  autoSearch?: boolean;
}

interface UseBuscaClientesReturn {
  termo: string;
  setTermo: (termo: string) => void;
  clientes: Cliente[];
  loading: boolean;
  error: Error | null;
  buscar: (termo?: string) => Promise<void>;
  limpar: () => void;
  clienteSelecionado: Cliente | null;
  selecionarCliente: (cliente: Cliente | null) => void;
}

export function useBuscaClientes(options: UseBuscaClientesOptions = {}): UseBuscaClientesReturn {
  const { debounceMs = 300, minChars = 2, autoSearch = true } = options;

  const [termo, setTermo] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);

  const termoDebouncado = useDebounce(termo, debounceMs);

  const buscar = useCallback(async (termoBusca?: string) => {
    const termoAtual = termoBusca ?? termo;
    
    if (termoAtual.length < minChars) {
      setClientes([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resultado = await buscarClientes(termoAtual);
      setClientes(resultado);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao buscar clientes'));
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }, [termo, minChars]);

  // Auto-search quando termo muda (debounced)
  useEffect(() => {
    if (autoSearch) {
      if (termoDebouncado.length < minChars) {
        setClientes([]);
        return;
      }
      buscar(termoDebouncado);
    }
  }, [termoDebouncado, autoSearch, minChars, buscar]);

  const limpar = useCallback(() => {
    setTermo('');
    setClientes([]);
    setError(null);
    setClienteSelecionado(null);
  }, []);

  const selecionarCliente = useCallback((cliente: Cliente | null) => {
    setClienteSelecionado(cliente);
    if (cliente) {
      setTermo('');
      setClientes([]);
    }
  }, []);

  return {
    termo,
    setTermo,
    clientes,
    loading,
    error,
    buscar,
    limpar,
    clienteSelecionado,
    selecionarCliente,
  };
}
