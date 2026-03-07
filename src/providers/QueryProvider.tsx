'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tempo que os dados ficam "fresh" (não refetch)
            staleTime: 1000 * 60 * 5, // 5 minutos
            // Tempo que os dados ficam em cache
            gcTime: 1000 * 60 * 30, // 30 minutos (antigo cacheTime)
            // Retry em caso de erro
            retry: 1,
            // Refetch ao focar na janela
            refetchOnWindowFocus: true,
            // Refetch ao reconectar
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry em mutações
            retry: 0,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Exportar QueryClient para uso em outros lugares se necessário
export { QueryClient };
