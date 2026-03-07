'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Loading,
  Modal,
  useConfirm,
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import {
  Search,
  Eye,
  X,
  DollarSign,
  ShoppingBag,
  Receipt,
  Filter
} from 'lucide-react';
import { useVendas, useVendaCompleta, useCancelarVenda } from '@/hooks/useQueries';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { StatusVenda } from '@/types';

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

export default function VendasPage() {
  const { user, loading: authLoading, isAdmin, isGerente } = useAuth();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { confirm: confirmDialog, ConfirmDialog: ConfirmDialogEl } = useConfirm();

  const [filtroStatus, setFiltroStatus] = useState<StatusVenda | ''>('');
  const [dataInicio, setDataInicio] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [busca, setBusca] = useState('');

  // Modal de detalhes
  const [showModal, setShowModal] = useState(false);
  const [selectedVendaId, setSelectedVendaId] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Build filtros object for React Query hook
  const filtros = useMemo(() => {
    const f: {
      dataInicio?: Date;
      dataFim?: Date;
      status?: 'finalizada' | 'cancelada';
    } = {};

    if (dataInicio) {
      f.dataInicio = startOfDay(new Date(dataInicio + 'T00:00:00'));
    }
    if (dataFim) {
      f.dataFim = endOfDay(new Date(dataFim + 'T00:00:00'));
    }
    if (filtroStatus) {
      f.status = filtroStatus as 'finalizada' | 'cancelada';
    }

    return f;
  }, [dataInicio, dataFim, filtroStatus]);

  // React Query hooks
  const { data: vendasData, isLoading: loading } = useVendas(filtros);
  const { data: vendaSelecionada, isLoading: loadingDetalhes } = useVendaCompleta(selectedVendaId);
  const cancelarMutation = useCancelarVenda();

  const vendas = vendasData?.vendas || [];

  const handleVerDetalhes = (vendaId: string) => {
    setSelectedVendaId(vendaId);
    setShowModal(true);
  };

  const handleCancelarVenda = async (vendaId: string) => {
    const confirmed = await confirmDialog({
      title: 'Cancelar Venda',
      description: 'Tem certeza que deseja cancelar esta venda? O estoque sera restaurado.',
      variant: 'danger',
      confirmLabel: 'Cancelar Venda',
    });
    if (!confirmed) {
      return;
    }

    try {
      await cancelarMutation.mutateAsync({
        vendaId,
        motivo: 'Cancelamento pelo sistema',
        usuarioId: user!.uid
      });
      success('Sucesso', 'Venda cancelada com sucesso!');
      setShowModal(false);
      setSelectedVendaId('');
    } catch (error) {
      console.error('Erro ao cancelar venda:', error);
      showError('Erro', 'Erro ao cancelar venda');
    }
  };

  // Filtrar vendas pela busca
  const vendasFiltradas = vendas.filter(v => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      v.id?.toLowerCase().includes(termo) ||
      v.clienteNome?.toLowerCase().includes(termo) ||
      v.usuarioNome?.toLowerCase().includes(termo)
    );
  });

  // Totalizadores
  const totalVendas = vendasFiltradas.filter(v => v.status === 'finalizada').reduce((sum, v) => sum + v.total, 0);
  const qtdVendas = vendasFiltradas.filter(v => v.status === 'finalizada').length;
  const qtdCanceladas = vendasFiltradas.filter(v => v.status === 'cancelada').length;

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
            <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
            <p className="text-gray-500">Historico de vendas realizadas</p>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total no Periodo</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(totalVendas)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vendas Finalizadas</p>
                  <p className="text-xl font-bold text-gray-900">{qtdVendas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vendas Canceladas</p>
                  <p className="text-xl font-bold text-gray-900">{qtdCanceladas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por ID, cliente ou vendedor..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-40"
                />
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-40"
                />
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value as StatusVenda | '')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                >
                  <option value="">Todos Status</option>
                  <option value="finalizada">Finalizadas</option>
                  <option value="cancelada">Canceladas</option>
                </select>
                <Button>
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Vendas */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
              </div>
            ) : vendasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Receipt className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma venda encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itens</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vendasFiltradas.map((venda) => (
                      <tr key={venda.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {venda.createdAt && format(venda.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {venda.clienteNome || 'Consumidor Final'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {venda.usuarioNome || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {venda.itens?.length || '-'} itens
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formatCurrency(venda.total)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {venda.pagamentos?.map(p => p.forma ? (formasPagamentoLabel[p.forma] || p.forma) : '').join(', ') || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={venda.status === 'finalizada' ? 'success' : 'danger'}>
                            {venda.status === 'finalizada' ? 'Finalizada' : 'Cancelada'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalhes(venda.id!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedVendaId(''); }}
        title="Detalhes da Venda"
        size="lg"
      >
        {loadingDetalhes ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : vendaSelecionada ? (
          <div className="space-y-6">
            {/* Info da Venda */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Data</p>
                <p className="font-medium text-gray-900">
                  {vendaSelecionada.createdAt && format(vendaSelecionada.createdAt, "dd/MM/yyyy HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="font-medium text-gray-900">{vendaSelecionada.clienteNome || 'Consumidor Final'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vendedor</p>
                <p className="font-medium text-gray-900">{vendaSelecionada.usuarioNome || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant={vendaSelecionada.status === 'finalizada' ? 'success' : 'danger'}>
                  {vendaSelecionada.status === 'finalizada' ? 'Finalizada' : 'Cancelada'}
                </Badge>
              </div>
            </div>

            {/* Itens */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Itens</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500">Produto</th>
                      <th className="px-3 py-2 text-center text-gray-500">Qtd</th>
                      <th className="px-3 py-2 text-right text-gray-500">Preco Unit.</th>
                      <th className="px-3 py-2 text-right text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {vendaSelecionada.itens?.map((item, idx) => {
                      // Compatibilidade: usar produtoNome ou nomeProduto do item, ou buscar do produto carregado
                      const nomeProduto = item.produtoNome || item.nomeProduto || item.produto?.nome || 'Produto';
                      const descVariacao = item.variacaoDescricao ||
                        (item.variacao ? [item.variacao.tamanho, item.variacao.cor].filter(Boolean).join(' - ') : '') ||
                        [item.tamanho, item.cor].filter(Boolean).join(' - ');

                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2 text-gray-900">
                            {nomeProduto}
                            {descVariacao && (
                              <span className="text-gray-500 text-xs ml-1">({descVariacao})</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-900">{item.quantidade}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(item.precoUnitario)}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagamentos */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Pagamentos</h4>
              <div className="space-y-2">
                {vendaSelecionada.pagamentos?.map((pag, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-900">{pag.forma ? (formasPagamentoLabel[pag.forma] || pag.forma) : '-'}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(pag.valor)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totais */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900">{formatCurrency(vendaSelecionada.subtotal)}</span>
              </div>
              {(vendaSelecionada.desconto || 0) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Desconto</span>
                  <span>-{formatCurrency(vendaSelecionada.desconto || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatCurrency(vendaSelecionada.total)}</span>
              </div>
            </div>

            {/* Acoes */}
            {vendaSelecionada.status === 'finalizada' && (isAdmin || isGerente) && (
              <div className="border-t pt-4">
                <Button
                  variant="danger"
                  onClick={() => handleCancelarVenda(vendaSelecionada.id!)}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar Venda
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Erro ao carregar detalhes</p>
        )}
      </Modal>

      {ConfirmDialogEl}
    </AppLayout>
  );
}
