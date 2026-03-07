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
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import {
  Search,
  Package,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useProdutos, useDarEntradaEstoque, useDarSaidaEstoque } from '@/hooks/useQueries';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { movimentoEstoqueSchema, type MovimentoEstoqueFormData } from '@/lib/validations';

import type { Produto, Variacao } from '@/types';

export default function EstoquePage() {
  const { user, loading: authLoading, isAdmin, isGerente } = useAuth();
  const router = useRouter();
  const { success, error: showError, warning } = useToast();

  const { data: produtos = [], isLoading: loading, refetch: refetchProdutos } = useProdutos();
  const entradaEstoqueMutation = useDarEntradaEstoque();
  const saidaEstoqueMutation = useDarSaidaEstoque();

  const [busca, setBusca] = useState('');
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'baixo' | 'zerado'>('todos');

  // Modal de movimentação
  const [showModalMovimento, setShowModalMovimento] = useState(false);
  const [tipoMovimento, setTipoMovimento] = useState<'entrada' | 'saida'>('entrada');
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<Variacao | null>(null);
  const [salvando, setSalvando] = useState(false);

  const movimentoForm = useForm<MovimentoEstoqueFormData>({
    resolver: zodResolver(movimentoEstoqueSchema),
    defaultValues: {
      variacaoId: '',
      tipo: 'entrada',
      quantidade: 1,
      motivo: 'compra',
      observacao: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const abrirModalMovimento = (tipo: 'entrada' | 'saida', produto: Produto, variacao: Variacao) => {
    setTipoMovimento(tipo);
    setProdutoSelecionado(produto);
    setVariacaoSelecionada(variacao);
    movimentoForm.reset({
      variacaoId: variacao.id,
      tipo: tipo === 'entrada' ? 'entrada' : 'saida',
      quantidade: 1,
      motivo: tipo === 'entrada' ? 'compra' : 'ajuste_inventario',
      observacao: '',
    });
    setShowModalMovimento(true);
  };

  const handleSalvarMovimento = async (data: MovimentoEstoqueFormData) => {
    if (!variacaoSelecionada) {
      warning('Atenção', 'Selecione uma variação');
      return;
    }

    setSalvando(true);
    try {
      if (tipoMovimento === 'entrada') {
        await entradaEstoqueMutation.mutateAsync({
          produtoId: produtoSelecionado!.id!,
          variacaoId: variacaoSelecionada.id,
          quantidade: data.quantidade,
          motivo: data.motivo as 'compra' | 'devolucao' | 'ajuste_inventario',
          observacao: data.observacao,
          usuarioId: user!.uid
        });
      } else {
        await saidaEstoqueMutation.mutateAsync({
          produtoId: produtoSelecionado!.id!,
          variacaoId: variacaoSelecionada.id,
          quantidade: data.quantidade,
          motivo: data.motivo as 'perda' | 'ajuste_inventario',
          observacao: data.observacao,
          usuarioId: user!.uid
        });
      }

      success('Sucesso', 'Movimento registrado com sucesso!');
      setShowModalMovimento(false);
    } catch (error) {
      console.error('Erro ao registrar movimento:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao registrar movimento';
      showError('Erro', errorMessage);
    } finally {
      setSalvando(false);
    }
  };

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(p => {
    // Filtro de busca
    if (busca) {
      const termo = busca.toLowerCase();
      if (!p.nome.toLowerCase().includes(termo) && 
          !p.sku?.toLowerCase().includes(termo) &&
          !p.codigoBarras?.toLowerCase().includes(termo)) {
        return false;
      }
    }

    // Calcular estoque total
    const estoqueTotal = p.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;

    // Filtro de estoque
    if (filtroEstoque === 'baixo' && estoqueTotal > (p.estoqueMinimo || 3)) {
      return false;
    }
    if (filtroEstoque === 'zerado' && estoqueTotal > 0) {
      return false;
    }

    return true;
  });

  // Totalizadores
  const totalProdutos = produtos.length;
  const produtosBaixoEstoque = produtos.filter(p => {
    const estoque = p.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
    return estoque > 0 && estoque <= (p.estoqueMinimo || 3);
  }).length;
  const produtosSemEstoque = produtos.filter(p => {
    const estoque = p.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
    return estoque === 0;
  }).length;

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
            <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
            <p className="text-gray-500">Controle de estoque dos produtos</p>
          </div>
          <Button onClick={() => refetchProdutos()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroEstoque('todos')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total de Produtos</p>
                  <p className="text-xl font-bold text-gray-900">{totalProdutos}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroEstoque('baixo')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estoque Baixo</p>
                  <p className="text-xl font-bold text-orange-600">{produtosBaixoEstoque}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroEstoque('zerado')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sem Estoque</p>
                  <p className="text-xl font-bold text-red-600">{produtosSemEstoque}</p>
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
                    placeholder="Buscar por nome, SKU ou código de barras..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant={filtroEstoque === 'todos' ? 'primary' : 'outline'}
                  onClick={() => setFiltroEstoque('todos')}
                >
                  Todos
                </Button>
                <Button 
                  variant={filtroEstoque === 'baixo' ? 'primary' : 'outline'}
                  onClick={() => setFiltroEstoque('baixo')}
                >
                  Estoque Baixo
                </Button>
                <Button 
                  variant={filtroEstoque === 'zerado' ? 'primary' : 'outline'}
                  onClick={() => setFiltroEstoque('zerado')}
                >
                  Sem Estoque
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Produtos */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Package className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="divide-y">
                {produtosFiltrados.map((produto) => {
                  const estoqueTotal = produto.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
                  const estoqueBaixo = estoqueTotal > 0 && estoqueTotal <= (produto.estoqueMinimo || 3);
                  const semEstoque = estoqueTotal === 0;

                  return (
                    <div key={produto.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900">{produto.nome}</h3>
                          <p className="text-sm text-gray-500">
                            SKU: {produto.sku} | {produto.marca || 'Sem marca'}
                          </p>
                        </div>
                        <Badge 
                          variant={semEstoque ? 'danger' : estoqueBaixo ? 'warning' : 'success'}
                        >
                          {estoqueTotal} un
                        </Badge>
                      </div>
                      
                      {/* Variações */}
                      {produto.variacoes && produto.variacoes.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
                          {produto.variacoes.map((variacao) => (
                            <div 
                              key={variacao.id}
                              className={`flex items-center justify-between p-2 rounded-lg border ${
                                variacao.estoque === 0 
                                  ? 'bg-red-50 border-red-200' 
                                  : variacao.estoque <= 3 
                                    ? 'bg-orange-50 border-orange-200' 
                                    : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {variacao.tamanho} - {variacao.cor}
                                </p>
                                <p className="text-xs text-gray-500">{variacao.estoque} un</p>
                              </div>
                              {(isAdmin || isGerente) && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => abrirModalMovimento('entrada', produto, variacao)}
                                    className="p-1 hover:bg-green-100 rounded text-green-600"
                                    title="Entrada"
                                  >
                                    <ArrowUpCircle className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => abrirModalMovimento('saida', produto, variacao)}
                                    className="p-1 hover:bg-red-100 rounded text-red-600"
                                    title="Saída"
                                    disabled={variacao.estoque === 0}
                                  >
                                    <ArrowDownCircle className="h-5 w-5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Movimento */}
      <Modal
        isOpen={showModalMovimento}
        onClose={() => { setShowModalMovimento(false); movimentoForm.reset(); }}
        title={tipoMovimento === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}
      >
        <form onSubmit={movimentoForm.handleSubmit(handleSalvarMovimento)} className="space-y-4">
          {produtoSelecionado && variacaoSelecionada && (
            <>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">{produtoSelecionado.nome}</p>
                <p className="text-sm text-gray-500">
                  {variacaoSelecionada.tamanho} - {variacaoSelecionada.cor}
                </p>
                <p className="text-sm text-gray-500">
                  Estoque atual: {variacaoSelecionada.estoque} un
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade *
                </label>
                <Input
                  type="number"
                  min="1"
                  {...movimentoForm.register('quantidade', { valueAsNumber: true })}
                  placeholder="Digite a quantidade"
                  error={movimentoForm.formState.errors.quantidade?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo *
                </label>
                <select
                  {...movimentoForm.register('motivo')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                >
                  {tipoMovimento === 'entrada' ? (
                    <>
                      <option value="compra">Compra</option>
                      <option value="devolucao">Devolução de Cliente</option>
                      <option value="ajuste_inventario">Ajuste de Inventário</option>
                    </>
                  ) : (
                    <>
                      <option value="perda">Perda/Avaria</option>
                      <option value="ajuste_inventario">Ajuste de Inventário</option>
                    </>
                  )}
                </select>
                {movimentoForm.formState.errors.motivo && (
                  <p className="mt-1 text-sm text-red-500">{movimentoForm.formState.errors.motivo.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observação
                </label>
                <Input
                  {...movimentoForm.register('observacao')}
                  placeholder="Observação opcional"
                  error={movimentoForm.formState.errors.observacao?.message}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => { setShowModalMovimento(false); movimentoForm.reset(); }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant={tipoMovimento === 'entrada' ? 'primary' : 'danger'}
                  type="submit"
                  disabled={salvando}
                  className="flex-1"
                >
                  {salvando ? 'Salvando...' : tipoMovimento === 'entrada' ? 'Dar Entrada' : 'Dar Saída'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </AppLayout>
  );
}
