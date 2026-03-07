'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Loading, Badge } from '@/components/ui';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertTriangle,
  Cake,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useResumoVendas, useProdutos, useAniversariantes, useCaixaAberto, useResumoCaixa } from '@/hooks/useQueries';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ResumoVendasPeriodo } from '@/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Compute date ranges once (stable references for React Query keys)
  const { inicioHoje, fimHoje, inicioMes, fimMes } = useMemo(() => {
    const hoje = new Date();
    return {
      inicioHoje: startOfDay(hoje),
      fimHoje: endOfDay(hoje),
      inicioMes: startOfMonth(hoje),
      fimMes: endOfMonth(hoje),
    };
  }, []);

  // React Query hooks
  const { data: vendasHojeRaw, isLoading: loadingVendasHoje } = useResumoVendas(inicioHoje, fimHoje);
  const { data: vendasMesRaw, isLoading: loadingVendasMes } = useResumoVendas(inicioMes, fimMes);
  const vendasHoje = vendasHojeRaw as ResumoVendasPeriodo | undefined;
  const vendasMes = vendasMesRaw as ResumoVendasPeriodo | undefined;
  const { data: produtos, isLoading: loadingProdutos } = useProdutos();
  const { data: aniversariantes, isLoading: loadingAniversariantes } = useAniversariantes();
  const { data: caixaAberto } = useCaixaAberto(user?.uid || '');
  const { data: resumoCaixa } = useResumoCaixa(caixaAberto?.id || '');

  const isLoading = loadingVendasHoje || loadingVendasMes || loadingProdutos || loadingAniversariantes;

  // Compute derived data
  const estoqueBaixo = useMemo(() => {
    if (!produtos) return [];
    return produtos.filter(p => {
      const estoqueTotal = p.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
      return estoqueTotal <= (p.estoqueMinimo || 3);
    });
  }, [produtos]);

  const aniversariantesList = aniversariantes || [];

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loading size="lg" />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Vendas Hoje */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Vendas Hoje</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(vendasHoje?.totalVendas || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {vendasHoje?.totalVendasFinalizadas || 0} vendas
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vendas do Mes */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Vendas do Mes</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(vendasMes?.totalVendas || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {vendasMes?.totalVendasFinalizadas || 0} vendas
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ticket Medio */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ticket Medio</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(vendasMes?.ticketMedio || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        no mes atual
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Caixa Atual */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Caixa Atual</p>
                      {caixaAberto ? (
                        <>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(resumoCaixa?.saldoAtual || 0)}
                          </p>
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3" />
                            Aberto
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-2xl font-bold text-gray-400">
                            --
                          </p>
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <ArrowDownRight className="h-3 w-3" />
                            Fechado
                          </p>
                        </>
                      )}
                    </div>
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      caixaAberto ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <DollarSign className={`h-6 w-6 ${
                        caixaAberto ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Segunda linha de cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Estoque Baixo */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Estoque Baixo
                    {estoqueBaixo.length > 0 && (
                      <Badge variant="warning" className="ml-2">
                        {estoqueBaixo.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {estoqueBaixo.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      Todos os produtos estao com estoque adequado.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {estoqueBaixo.slice(0, 5).map((produto) => {
                        const estoqueTotal = produto.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
                        return (
                          <div
                            key={produto.id}
                            className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{produto.nome}</p>
                              <p className="text-xs text-gray-500">{produto.sku}</p>
                            </div>
                            <Badge variant="warning">
                              {estoqueTotal} un
                            </Badge>
                          </div>
                        );
                      })}
                      {estoqueBaixo.length > 5 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          E mais {estoqueBaixo.length - 5} produtos...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Aniversariantes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Cake className="h-5 w-5 text-pink-500" />
                    Aniversariantes do Mes
                    {aniversariantesList.length > 0 && (
                      <Badge variant="primary" className="ml-2">
                        {aniversariantesList.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aniversariantesList.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      Nenhum aniversariante este mes.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {aniversariantesList.slice(0, 5).map((cliente) => (
                        <div
                          key={cliente.id}
                          className="flex items-center justify-between p-3 bg-pink-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-pink-200 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-pink-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{cliente.nome}</p>
                              <p className="text-xs text-gray-500">{cliente.telefone}</p>
                            </div>
                          </div>
                          {cliente.dataNascimento && (
                            <Badge variant="primary">
                              {format(new Date(cliente.dataNascimento), 'dd/MM')}
                            </Badge>
                          )}
                        </div>
                      ))}
                      {aniversariantesList.length > 5 && (
                        <p className="text-sm text-gray-500 text-center pt-2">
                          E mais {aniversariantesList.length - 5} aniversariantes...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Resumo de Vendas por Forma de Pagamento */}
            {vendasMes && vendasMes.porFormaPagamento && Object.keys(vendasMes.porFormaPagamento).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendas por Forma de Pagamento (Mes)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Object.entries(vendasMes.porFormaPagamento || {}).map(([forma, valor]) => (
                      <div key={forma} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">{forma.replace('_', ' ')}</p>
                        <p className="text-lg font-bold text-gray-900 mt-1">
                          {formatCurrency(valor)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
