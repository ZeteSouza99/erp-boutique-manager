'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Loading
} from '@/components/ui';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  Filter
} from 'lucide-react';
import { useResumoVendas, useProdutos, useClientes } from '@/hooks/useQueries';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ResumoVendasPeriodo } from '@/types';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formasPagamentoLabel: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartao Credito',
  cartao_debito: 'Cartao Debito',
  credito: 'Credito',
  debito: 'Debito',
  crediario: 'Crediario',
  credito_loja: 'Credito Loja'
};

type PeriodoPreset = 'hoje' | 'semana' | 'mes' | 'mes_anterior' | 'custom';

export default function RelatoriosPage() {
  const { user, loading: authLoading, isAdmin, isGerente } = useAuth();
  const router = useRouter();

  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>('mes');
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !isAdmin && !isGerente) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, isGerente, router]);

  const aplicarPeriodo = (preset: PeriodoPreset) => {
    setPeriodoPreset(preset);
    const hoje = new Date();

    switch (preset) {
      case 'hoje':
        setDataInicio(format(startOfDay(hoje), 'yyyy-MM-dd'));
        setDataFim(format(endOfDay(hoje), 'yyyy-MM-dd'));
        break;
      case 'semana':
        setDataInicio(format(startOfWeek(hoje, { locale: ptBR }), 'yyyy-MM-dd'));
        setDataFim(format(endOfWeek(hoje, { locale: ptBR }), 'yyyy-MM-dd'));
        break;
      case 'mes':
        setDataInicio(format(startOfMonth(hoje), 'yyyy-MM-dd'));
        setDataFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
        break;
      case 'mes_anterior':
        const mesAnterior = subMonths(hoje, 1);
        setDataInicio(format(startOfMonth(mesAnterior), 'yyyy-MM-dd'));
        setDataFim(format(endOfMonth(mesAnterior), 'yyyy-MM-dd'));
        break;
    }
  };

  // Convert date strings to Date objects for React Query hooks
  const inicioDate = useMemo(
    () => startOfDay(new Date(dataInicio + 'T00:00:00')),
    [dataInicio]
  );
  const fimDate = useMemo(
    () => endOfDay(new Date(dataFim + 'T00:00:00')),
    [dataFim]
  );

  // React Query hooks
  const { data: resumoVendasRaw, isLoading: loadingResumo } = useResumoVendas(inicioDate, fimDate);
  const resumoVendas = resumoVendasRaw as ResumoVendasPeriodo | undefined;
  const { data: produtos = [], isLoading: loadingProdutos } = useProdutos();
  const { data: clientes = [], isLoading: loadingClientes } = useClientes();

  const loading = loadingResumo || loadingProdutos || loadingClientes;

  // Calcular estatisticas de estoque
  const produtosBaixoEstoque = produtos.filter(p => {
    const estoque = p.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
    return estoque > 0 && estoque <= (p.estoqueMinimo || 3);
  }).length;

  const produtosSemEstoque = produtos.filter(p => {
    const estoque = p.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
    return estoque === 0;
  }).length;

  const valorEstoque = produtos.reduce((total, p) => {
    const estoque = p.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
    return total + (estoque * (p.precoCusto || 0));
  }, 0);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatorios</h1>
            <p className="text-gray-500">Analise de vendas e desempenho da loja</p>
          </div>
        </div>

        {/* Filtros de Periodo */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={periodoPreset === 'hoje' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPeriodo('hoje')}
                >
                  Hoje
                </Button>
                <Button
                  variant={periodoPreset === 'semana' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPeriodo('semana')}
                >
                  Esta Semana
                </Button>
                <Button
                  variant={periodoPreset === 'mes' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPeriodo('mes')}
                >
                  Este Mes
                </Button>
                <Button
                  variant={periodoPreset === 'mes_anterior' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => aplicarPeriodo('mes_anterior')}
                >
                  Mes Anterior
                </Button>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => { setDataInicio(e.target.value); setPeriodoPreset('custom'); }}
                  className="w-40"
                />
                <span className="text-gray-500">ate</span>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => { setDataFim(e.target.value); setPeriodoPreset('custom'); }}
                  className="w-40"
                />
                <Button>
                  <Filter className="h-4 w-4 mr-2" />
                  Aplicar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : (
          <>
            {/* Cards de Resumo de Vendas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total em Vendas</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(resumoVendas?.totalVendas || 0)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Quantidade de Vendas</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {resumoVendas?.totalVendasFinalizadas || 0}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ticket Medio</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(resumoVendas?.ticketMedio || 0)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Itens Vendidos</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {resumoVendas?.totalItens || 0}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vendas por Forma de Pagamento */}
            {resumoVendas?.porFormaPagamento && Object.keys(resumoVendas.porFormaPagamento).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendas por Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Object.entries(resumoVendas.porFormaPagamento || {}).map(([forma, valor]) => (
                      <div key={forma} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase mb-1">
                          {formasPagamentoLabel[forma] || forma}
                        </p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(valor)}
                        </p>
                        {resumoVendas.totalVendas > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {((valor / resumoVendas.totalVendas) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estatisticas Adicionais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Resumo de Estoque */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Resumo de Estoque
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Total de Produtos</span>
                      <span className="font-bold text-gray-900">{produtos.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <span className="text-orange-700">Estoque Baixo</span>
                      <Badge variant="warning">{produtosBaixoEstoque}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-red-700">Sem Estoque</span>
                      <Badge variant="danger">{produtosSemEstoque}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-blue-700">Valor em Estoque (custo)</span>
                      <span className="font-bold text-blue-900">{formatCurrency(valorEstoque)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumo de Clientes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Resumo de Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Total de Clientes</span>
                      <span className="font-bold text-gray-900">{clientes.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-green-700">Clientes Ativos</span>
                      <span className="font-bold text-green-900">
                        {clientes.filter(c => c.status === 'ativo').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-purple-700">Aniversariantes (mes)</span>
                      <span className="font-bold text-purple-900">
                        {clientes.filter(c => {
                          if (!c.dataNascimento) return false;
                          const nascimento = new Date(c.dataNascimento);
                          return nascimento.getMonth() === new Date().getMonth();
                        }).length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vendas Canceladas */}
            {(resumoVendas?.totalVendasCanceladas || 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-red-600">Vendas Canceladas no Periodo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-500 uppercase mb-1">Quantidade</p>
                      <p className="text-2xl font-bold text-red-600">{resumoVendas?.totalVendasCanceladas || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-500 uppercase mb-1">Valor Total</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(resumoVendas?.valorCancelado || 0)}
                      </p>
                    </div>
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
