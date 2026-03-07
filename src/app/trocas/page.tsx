'use client';

import { useState, useEffect } from 'react';
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
  Plus,
  Eye,
  Check,
  X,
  RefreshCw,
  ArrowLeftRight,
} from 'lucide-react';
import {
  useTrocas,
  useCriarTroca,
  useAprovarTroca,
  useRecusarTroca
} from '@/hooks/useQueries';
import type { Troca, TrocaItem } from '@/lib/firebase/trocas';
import { getVendaCompleta } from '@/lib/firebase/vendas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MotivoTroca, VendaCompleta } from '@/types';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { trocaSchema, type TrocaFormData } from '@/lib/validations';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const motivoLabels: Record<MotivoTroca, string> = {
  defeito: 'Defeito',
  tamanho: 'Tamanho Errado',
  cor: 'Cor Diferente',
  arrependimento: 'Arrependimento',
  outro: 'Outro'
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  recusada: 'Recusada',
  finalizada: 'Finalizada'
};

const statusColors: Record<string, 'warning' | 'success' | 'danger' | 'primary'> = {
  pendente: 'warning',
  aprovada: 'success',
  recusada: 'danger',
  finalizada: 'primary'
};

export default function TrocasPage() {
  const { user, loading: authLoading, isAdmin, isGerente } = useAuth();
  const router = useRouter();
  const { success, error: showError, warning } = useToast();
  const { confirm: confirmDialog, ConfirmDialog: ConfirmDialogEl } = useConfirm();

  // Filter state
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');

  // React Query hooks
  const { data: trocas = [], isLoading: loading, refetch } = useTrocas(
    filtroStatus ? { status: filtroStatus } : undefined
  );
  const criarTrocaMutation = useCriarTroca();
  const aprovarTrocaMutation = useAprovarTroca();
  const recusarTrocaMutation = useRecusarTroca();

  // Modal de detalhes
  const [showModalDetalhes, setShowModalDetalhes] = useState(false);
  const [trocaSelecionada, setTrocaSelecionada] = useState<Troca | null>(null);

  // Modal de nova troca
  const [showModalNova, setShowModalNova] = useState(false);
  const [vendaIdBusca, setVendaIdBusca] = useState('');
  const [vendaEncontrada, setVendaEncontrada] = useState<VendaCompleta | null>(null);
  const [itensSelecionados, setItensSelecionados] = useState<Record<string, number>>({});
  const [buscandoVenda, setBuscandoVenda] = useState(false);

  // Modal for recusa motivo
  const [showModalRecusa, setShowModalRecusa] = useState(false);
  const [recusaTrocaId, setRecusaTrocaId] = useState('');
  const [recusaMotivo, setRecusaMotivo] = useState('');

  const trocaForm = useForm<TrocaFormData>({
    resolver: zodResolver(trocaSchema) as Resolver<TrocaFormData>,
    defaultValues: {
      vendaOriginalId: '',
      clienteId: '',
      tipo: 'troca',
      motivo: 'tamanho',
      motivoDetalhe: '',
      itens: [],
    },
  });

  const salvando = criarTrocaMutation.isPending;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleVerDetalhes = async (troca: Troca) => {
    setTrocaSelecionada(troca);
    setShowModalDetalhes(true);
  };

  const handleBuscarVenda = async () => {
    if (!vendaIdBusca.trim()) {
      warning('Atenção', 'Digite o ID da venda');
      return;
    }

    setBuscandoVenda(true);
    try {
      const venda = await getVendaCompleta(vendaIdBusca.trim());
      if (!venda) {
        showError('Erro', 'Venda não encontrada');
        return;
      }
      if (venda.status === 'cancelada') {
        showError('Erro', 'Esta venda já foi cancelada');
        return;
      }
      setVendaEncontrada(venda);
      setItensSelecionados({});
      trocaForm.setValue('vendaOriginalId', venda.id!);
      trocaForm.setValue('clienteId', venda.clienteId || '');
    } catch (error) {
      console.error('Erro ao buscar venda:', error);
      showError('Erro', 'Erro ao buscar venda');
    } finally {
      setBuscandoVenda(false);
    }
  };

  const handleSelecionarItem = (itemIndex: number, quantidade: number) => {
    setItensSelecionados(prev => ({
      ...prev,
      [itemIndex]: quantidade
    }));
  };

  const handleCriarTroca = async (data: TrocaFormData) => {
    if (!vendaEncontrada) {
      warning('Atenção', 'Selecione uma venda');
      return;
    }

    const itensParaTroca = Object.entries(itensSelecionados)
      .filter(([, qtd]) => qtd > 0)
      .map(([index, qtd]) => {
        const item = vendaEncontrada.itens![parseInt(index)];
        return {
          produtoId: item.produtoId,
          produtoNome: item.produtoNome,
          variacaoId: item.variacaoId,
          variacaoDescricao: item.variacaoDescricao || '',
          quantidade: qtd,
          precoUnitario: item.precoUnitario,
          subtotal: item.precoUnitario * qtd
        } as TrocaItem;
      });

    if (itensParaTroca.length === 0) {
      trocaForm.setError('itens', { message: 'Selecione pelo menos um item para troca' });
      return;
    }

    try {
      const valorTotal = itensParaTroca.reduce((sum, item) => sum + item.subtotal, 0);

      await criarTrocaMutation.mutateAsync({
        vendaId: vendaEncontrada.id!,
        clienteId: vendaEncontrada.clienteId,
        clienteNome: vendaEncontrada.clienteNome,
        tipo: data.tipo,
        motivo: data.motivo,
        observacao: data.motivoDetalhe,
        itens: itensParaTroca,
        valorTotal,
        usuarioId: user!.uid,
        usuarioNome: user!.displayName || ''
      });

      success('Sucesso', 'Troca registrada com sucesso!');
      setShowModalNova(false);
      resetarFormulario();
    } catch (error) {
      console.error('Erro ao criar troca:', error);
      showError('Erro', 'Erro ao criar troca');
    }
  };

  const handleAprovarTroca = async (trocaId: string) => {
    const confirmed = await confirmDialog({
      title: 'Aprovar Troca',
      description: 'Confirma a aprovação desta troca? O estoque será restaurado.',
      variant: 'warning',
      confirmLabel: 'Aprovar',
    });
    if (!confirmed) {
      return;
    }

    try {
      await aprovarTrocaMutation.mutateAsync({ trocaId, usuarioId: user!.uid });
      success('Sucesso', 'Troca aprovada com sucesso!');
      setShowModalDetalhes(false);
    } catch (error) {
      console.error('Erro ao aprovar troca:', error);
      showError('Erro', 'Erro ao aprovar troca');
    }
  };

  const handleRecusarTroca = async (trocaId: string) => {
    setRecusaTrocaId(trocaId);
    setRecusaMotivo('');
    setShowModalRecusa(true);
  };

  const handleConfirmarRecusa = async () => {
    if (!recusaMotivo.trim()) {
      warning('Atenção', 'Informe o motivo da recusa');
      return;
    }

    try {
      await recusarTrocaMutation.mutateAsync({ trocaId: recusaTrocaId, motivo: recusaMotivo.trim() });
      success('Sucesso', 'Troca recusada');
      setShowModalDetalhes(false);
      setShowModalRecusa(false);
      setRecusaTrocaId('');
      setRecusaMotivo('');
    } catch (error) {
      console.error('Erro ao recusar troca:', error);
      showError('Erro', 'Erro ao recusar troca');
    }
  };

  const resetarFormulario = () => {
    setVendaIdBusca('');
    setVendaEncontrada(null);
    setItensSelecionados({});
    trocaForm.reset();
  };

  // Filtrar trocas
  const trocasFiltradas = trocas.filter(t => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      t.id?.toLowerCase().includes(termo) ||
      t.clienteNome?.toLowerCase().includes(termo) ||
      t.vendaId?.toLowerCase().includes(termo)
    );
  });

  // Totalizadores
  const totalPendentes = trocas.filter(t => t.status === 'pendente').length;
  const totalAprovadas = trocas.filter(t => t.status === 'aprovada').length;

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
            <h1 className="text-2xl font-bold text-gray-900">Trocas e Devoluções</h1>
            <p className="text-gray-500">Gerencie trocas e devoluções de produtos</p>
          </div>
          <Button onClick={() => setShowModalNova(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Troca
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <ArrowLeftRight className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pendentes de Aprovação</p>
                  <p className="text-xl font-bold text-orange-600">{totalPendentes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Aprovadas (mês)</p>
                  <p className="text-xl font-bold text-green-600">{totalAprovadas}</p>
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
                    placeholder="Buscar por ID, cliente ou venda..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                >
                  <option value="">Todos Status</option>
                  <option value="pendente">Pendentes</option>
                  <option value="aprovada">Aprovadas</option>
                  <option value="recusada">Recusadas</option>
                </select>
                <Button onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Trocas */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
              </div>
            ) : trocasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ArrowLeftRight className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma troca encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {trocasFiltradas.map((troca) => (
                      <tr key={troca.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {troca.createdAt && format(troca.createdAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {troca.clienteNome || 'Consumidor Final'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {troca.tipo === 'troca' ? 'Troca' : 'Devolução'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {motivoLabels[troca.motivo]}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formatCurrency(troca.valorTotal)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusColors[troca.status]}>
                            {statusLabels[troca.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalhes(troca)}
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
        isOpen={showModalDetalhes}
        onClose={() => { setShowModalDetalhes(false); setTrocaSelecionada(null); }}
        title="Detalhes da Troca"
      >
        {trocaSelecionada && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Data</p>
                <p className="font-medium text-gray-900">
                  {trocaSelecionada.createdAt && format(trocaSelecionada.createdAt, "dd/MM/yyyy HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge variant={statusColors[trocaSelecionada.status]}>
                  {statusLabels[trocaSelecionada.status]}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="font-medium text-gray-900">{trocaSelecionada.clienteNome || 'Consumidor Final'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tipo/Motivo</p>
                <p className="font-medium text-gray-900">
                  {trocaSelecionada.tipo === 'troca' ? 'Troca' : 'Devolução'} - {motivoLabels[trocaSelecionada.motivo]}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Itens</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500">Produto</th>
                      <th className="px-3 py-2 text-center text-gray-500">Qtd</th>
                      <th className="px-3 py-2 text-right text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {trocaSelecionada.itens?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-gray-900">
                          {item.produtoNome}
                          <span className="text-gray-500 text-xs ml-1">({item.variacaoDescricao})</span>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-900">{item.quantidade}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between text-lg font-bold border-t pt-4">
              <span className="text-gray-900">Valor Total</span>
              <span className="text-gray-900">{formatCurrency(trocaSelecionada.valorTotal)}</span>
            </div>

            {trocaSelecionada.observacao && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Observação</p>
                <p className="text-gray-900">{trocaSelecionada.observacao}</p>
              </div>
            )}

            {trocaSelecionada.status === 'pendente' && (isAdmin || isGerente) && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="danger"
                  onClick={() => handleRecusarTroca(trocaSelecionada.id!)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Recusar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleAprovarTroca(trocaSelecionada.id!)}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal de Nova Troca */}
      <Modal
        isOpen={showModalNova}
        onClose={() => { setShowModalNova(false); resetarFormulario(); }}
        title="Nova Troca/Devolução"
        size="lg"
      >
        <form onSubmit={trocaForm.handleSubmit(handleCriarTroca)} className="space-y-4">
          {/* Buscar Venda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ID da Venda *
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Cole o ID da venda aqui"
                value={vendaIdBusca}
                onChange={(e) => setVendaIdBusca(e.target.value)}
                className="flex-1"
              />
              <Button type="button" onClick={handleBuscarVenda} disabled={buscandoVenda}>
                {buscandoVenda ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
            {trocaForm.formState.errors.vendaOriginalId && (
              <p className="mt-1 text-sm text-red-500">{trocaForm.formState.errors.vendaOriginalId.message}</p>
            )}
          </div>

          {/* Venda Encontrada */}
          {vendaEncontrada && (
            <>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Venda encontrada!</strong> {vendaEncontrada.clienteNome || 'Consumidor Final'} - {formatCurrency(vendaEncontrada.total)}
                </p>
              </div>

              {/* Selecionar Itens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione os itens para troca/devolução
                </label>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {vendaEncontrada.itens?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.produtoNome}</p>
                        <p className="text-sm text-gray-500">
                          {item.variacaoDescricao} - {formatCurrency(item.precoUnitario)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Max: {item.quantidade}</span>
                        <Input
                          type="number"
                          min="0"
                          max={item.quantidade}
                          value={itensSelecionados[idx] || 0}
                          onChange={(e) => handleSelecionarItem(idx, Math.min(parseInt(e.target.value) || 0, item.quantidade))}
                          className="w-20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {trocaForm.formState.errors.itens && (
                  <p className="mt-1 text-sm text-red-500">{trocaForm.formState.errors.itens.message}</p>
                )}
              </div>

              {/* Tipo e Motivo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    {...trocaForm.register('tipo')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    <option value="troca">Troca</option>
                    <option value="devolucao">Devolução</option>
                  </select>
                  {trocaForm.formState.errors.tipo && (
                    <p className="mt-1 text-sm text-red-500">{trocaForm.formState.errors.tipo.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <select
                    {...trocaForm.register('motivo')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    <option value="defeito">Defeito</option>
                    <option value="tamanho">Tamanho Errado</option>
                    <option value="cor">Cor Diferente</option>
                    <option value="arrependimento">Arrependimento</option>
                    <option value="outro">Outro</option>
                  </select>
                  {trocaForm.formState.errors.motivo && (
                    <p className="mt-1 text-sm text-red-500">{trocaForm.formState.errors.motivo.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                <Input
                  {...trocaForm.register('motivoDetalhe')}
                  placeholder="Observação opcional"
                  error={trocaForm.formState.errors.motivoDetalhe?.message}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => { setShowModalNova(false); resetarFormulario(); }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={salvando}
                  className="flex-1"
                >
                  {salvando ? 'Registrando...' : 'Registrar Troca'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Modal de Recusa */}
      <Modal
        isOpen={showModalRecusa}
        onClose={() => { setShowModalRecusa(false); setRecusaTrocaId(''); setRecusaMotivo(''); }}
        title="Motivo da Recusa"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Motivo da recusa *"
            placeholder="Informe o motivo da recusa..."
            value={recusaMotivo}
            onChange={(e) => setRecusaMotivo(e.target.value)}
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => { setShowModalRecusa(false); setRecusaTrocaId(''); setRecusaMotivo(''); }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmarRecusa}
              className="flex-1"
            >
              Confirmar Recusa
            </Button>
          </div>
        </div>
      </Modal>

      {ConfirmDialogEl}
    </AppLayout>
  );
}
