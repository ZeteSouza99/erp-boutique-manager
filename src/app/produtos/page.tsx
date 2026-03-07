'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Loading,
  Table,
  TableRow,
  TableCell,
  useConfirm,
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { useProdutos, useDeleteProduto } from '@/hooks/useQueries';

export default function ProdutosPage() {
  const { user, loading: authLoading, isAdmin, isGerente } = useAuth();
  const router = useRouter();
  const { error: showError } = useToast();
  const { confirm: confirmDialog, ConfirmDialog: ConfirmDialogEl } = useConfirm();

  const { data: produtos = [], isLoading: loading } = useProdutos();
  const deleteProdutoMutation = useDeleteProduto();

  const [termoBusca, setTermoBusca] = useState('');
  const [filtroCategoria] = useState('');
  const [filtroEstoque, setFiltroEstoque] = useState<'todos' | 'baixo' | 'zerado'>('todos');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleDelete = async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'Excluir Produto',
      description: 'Tem certeza que deseja excluir este produto?',
      variant: 'danger',
      confirmLabel: 'Excluir',
    });
    if (!confirmed) return;

    try {
      await deleteProdutoMutation.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      showError('Erro', 'Erro ao excluir produto');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Filtrar produtos
  const produtosFiltrados = produtos.filter(produto => {
    // Filtro de busca
    if (termoBusca) {
      const termo = termoBusca.toLowerCase();
      const match = 
        produto.nome.toLowerCase().includes(termo) ||
        produto.sku.toLowerCase().includes(termo) ||
        produto.codigoBarras?.toLowerCase().includes(termo);
      if (!match) return false;
    }

    // Filtro de categoria
    if (filtroCategoria && produto.categoriaId !== filtroCategoria) {
      return false;
    }

    // Filtro de estoque
    const estoqueTotal = produto.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
    if (filtroEstoque === 'baixo' && estoqueTotal > (produto.estoqueMinimo || 3)) {
      return false;
    }
    if (filtroEstoque === 'zerado' && estoqueTotal > 0) {
      return false;
    }

    return true;
  });

  // Estatísticas
  const totalProdutos = produtos.length;
  const produtosEstoqueBaixo = produtos.filter(p => {
    const estoque = p.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
    return estoque <= (p.estoqueMinimo || 3) && estoque > 0;
  }).length;
  const produtosZerados = produtos.filter(p => {
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

  const columns = ['Produto', 'SKU', 'Categoria', 'Preço', 'Estoque', 'Ações'];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
            <p className="text-gray-500">Gerencie o catálogo de produtos da loja</p>
          </div>
          {(isAdmin || isGerente) && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/produtos/massa')}>
                <Layers className="h-4 w-4 mr-2" />
                Cadastro em Massa
              </Button>
              <Button onClick={() => router.push('/produtos/novo')}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </div>
          )}
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total de Produtos</p>
                <p className="text-2xl font-bold">{totalProdutos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Estoque Baixo</p>
                <p className="text-2xl font-bold text-orange-600">{produtosEstoqueBaixo}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sem Estoque</p>
                <p className="text-2xl font-bold text-red-600">{produtosZerados}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome, SKU ou código..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filtroEstoque === 'todos' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroEstoque('todos')}
                >
                  Todos
                </Button>
                <Button
                  variant={filtroEstoque === 'baixo' ? 'warning' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroEstoque('baixo')}
                >
                  Estoque Baixo
                </Button>
                <Button
                  variant={filtroEstoque === 'zerado' ? 'danger' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroEstoque('zerado')}
                >
                  Sem Estoque
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de produtos */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Package className="h-12 w-12 mb-2 text-gray-300" />
                <p>Nenhum produto encontrado</p>
                {termoBusca && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setTermoBusca('')}
                  >
                    Limpar busca
                  </Button>
                )}
              </div>
            ) : (
              <Table columns={columns}>
                {produtosFiltrados.map(produto => {
                  const estoqueTotal = produto.variacoes?.reduce((sum, v) => sum + v.estoque, 0) || 0;
                  const estoqueBaixo = estoqueTotal <= (produto.estoqueMinimo || 3);

                  return (
                    <TableRow key={produto.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{produto.nome}</p>
                          {produto.marca && (
                            <p className="text-xs text-gray-500">{produto.marca}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {produto.sku}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {produto.categoriaNome || 'Sem categoria'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-green-600">
                            {formatCurrency(produto.precoVenda)}
                          </p>
                          {produto.precoCusto && (
                            <p className="text-xs text-gray-500">
                              Custo: {formatCurrency(produto.precoCusto)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            estoqueTotal === 0 ? 'danger' : 
                            estoqueBaixo ? 'warning' : 
                            'success'
                          }
                        >
                          {estoqueTotal} un
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/produtos/${produto.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(produto.id!)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {ConfirmDialogEl}
    </AppLayout>
  );
}
