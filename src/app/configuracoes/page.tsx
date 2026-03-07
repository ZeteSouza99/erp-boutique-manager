'use client';

import { useState, useEffect } from 'react';
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
  Loading,
  Modal,
  useConfirm,
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import {
  Tag,
  Building2,
  Truck,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import {
  useCategorias,
  useCreateCategoria,
  useUpdateCategoria,
  useDeleteCategoria,
  useMarcas,
  useCreateMarca,
  useUpdateMarca,
  useDeleteMarca,
  useFornecedores,
  useCreateFornecedor,
  useUpdateFornecedor
} from '@/hooks/useQueries';
import type { Categoria, Marca, Fornecedor, Status } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  categoriaSchema,
  marcaSchema,
  fornecedorSchema,
  type CategoriaFormData,
  type MarcaFormData,
  type FornecedorFormData,
} from '@/lib/validations';

type TabType = 'categorias' | 'marcas' | 'fornecedores';

export default function ConfiguracoesPage() {
  const { user, loading: authLoading, isAdmin, isGerente } = useAuth();
  const router = useRouter();
  const { error: showError } = useToast();
  const { confirm: confirmDialog, ConfirmDialog: ConfirmDialogEl } = useConfirm();

  const [activeTab, setActiveTab] = useState<TabType>('categorias');

  // React Query hooks
  const { data: categorias = [], isLoading: loadingCategorias } = useCategorias();
  const { data: marcas = [], isLoading: loadingMarcas } = useMarcas();
  const { data: fornecedores = [], isLoading: loadingFornecedores } = useFornecedores();

  const loading = loadingCategorias || loadingMarcas || loadingFornecedores;

  // Mutation hooks
  const createCategoriaMutation = useCreateCategoria();
  const updateCategoriaMutation = useUpdateCategoria();
  const deleteCategoriaMutation = useDeleteCategoria();
  const createMarcaMutation = useCreateMarca();
  const updateMarcaMutation = useUpdateMarca();
  const deleteMarcaMutation = useDeleteMarca();
  const createFornecedorMutation = useCreateFornecedor();
  const updateFornecedorMutation = useUpdateFornecedor();

  // Modal state
  const [showModalCategoria, setShowModalCategoria] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [showModalMarca, setShowModalMarca] = useState(false);
  const [marcaEditando, setMarcaEditando] = useState<Marca | null>(null);
  const [showModalFornecedor, setShowModalFornecedor] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);

  // React Hook Form instances
  const categoriaForm = useForm<z.input<typeof categoriaSchema>, unknown, CategoriaFormData>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nome: '', descricao: '' },
  });

  const marcaForm = useForm<z.input<typeof marcaSchema>, unknown, MarcaFormData>({
    resolver: zodResolver(marcaSchema),
    defaultValues: { nome: '' },
  });

  const fornecedorForm = useForm<z.input<typeof fornecedorSchema>, unknown, FornecedorFormData>({
    resolver: zodResolver(fornecedorSchema),
    defaultValues: { nome: '', cnpj: '', telefone: '', email: '', endereco: '', observacoes: '' },
  });

  // Derived loading states from mutations
  const salvandoCategoria = createCategoriaMutation.isPending || updateCategoriaMutation.isPending;
  const salvandoMarca = createMarcaMutation.isPending || updateMarcaMutation.isPending;
  const salvandoFornecedor = createFornecedorMutation.isPending || updateFornecedorMutation.isPending;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !isAdmin && !isGerente) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, isGerente, router]);

  // ========== CATEGORIAS ==========
  const abrirModalCategoria = (categoria?: Categoria) => {
    if (categoria) {
      setCategoriaEditando(categoria);
      categoriaForm.reset({ nome: categoria.nome, descricao: categoria.descricao || '' });
    } else {
      setCategoriaEditando(null);
      categoriaForm.reset({ nome: '', descricao: '' });
    }
    setShowModalCategoria(true);
  };

  const handleSalvarCategoria = async (data: CategoriaFormData) => {
    try {
      if (categoriaEditando) {
        await updateCategoriaMutation.mutateAsync({ id: categoriaEditando.id!, categoria: { nome: data.nome.trim() } });
      } else {
        await createCategoriaMutation.mutateAsync({ nome: data.nome.trim(), status: 'ativo' });
      }
      setShowModalCategoria(false);
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      showError('Erro', 'Erro ao salvar categoria');
    }
  };

  const handleExcluirCategoria = async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'Excluir Categoria',
      description: 'Tem certeza que deseja excluir esta categoria?',
      variant: 'danger',
      confirmLabel: 'Excluir',
    });
    if (!confirmed) return;

    try {
      await deleteCategoriaMutation.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
      showError('Erro', 'Erro ao excluir categoria. Pode haver produtos vinculados.');
    }
  };

  // ========== MARCAS ==========
  const abrirModalMarca = (marca?: Marca) => {
    if (marca) {
      setMarcaEditando(marca);
      marcaForm.reset({ nome: marca.nome });
    } else {
      setMarcaEditando(null);
      marcaForm.reset({ nome: '' });
    }
    setShowModalMarca(true);
  };

  const handleSalvarMarca = async (data: MarcaFormData) => {
    try {
      if (marcaEditando) {
        await updateMarcaMutation.mutateAsync({ id: marcaEditando.id!, marca: { nome: data.nome.trim() } });
      } else {
        await createMarcaMutation.mutateAsync({ nome: data.nome.trim(), status: 'ativo' });
      }
      setShowModalMarca(false);
    } catch (error) {
      console.error('Erro ao salvar marca:', error);
      showError('Erro', 'Erro ao salvar marca');
    }
  };

  const handleExcluirMarca = async (id: string) => {
    const confirmed = await confirmDialog({
      title: 'Excluir Marca',
      description: 'Tem certeza que deseja excluir esta marca?',
      variant: 'danger',
      confirmLabel: 'Excluir',
    });
    if (!confirmed) return;

    try {
      await deleteMarcaMutation.mutateAsync(id);
    } catch (error) {
      console.error('Erro ao excluir marca:', error);
      showError('Erro', 'Erro ao excluir marca. Pode haver produtos vinculados.');
    }
  };

  // ========== FORNECEDORES ==========
  const abrirModalFornecedor = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setFornecedorEditando(fornecedor);
      fornecedorForm.reset({
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj || '',
        telefone: fornecedor.telefone || '',
        email: fornecedor.email || '',
        endereco: fornecedor.endereco || '',
        observacoes: fornecedor.observacoes || '',
      });
    } else {
      setFornecedorEditando(null);
      fornecedorForm.reset({ nome: '', cnpj: '', telefone: '', email: '', endereco: '', observacoes: '' });
    }
    setShowModalFornecedor(true);
  };

  const handleSalvarFornecedor = async (data: FornecedorFormData) => {
    try {
      const dados = {
        nome: data.nome.trim(),
        cnpj: data.cnpj?.trim() || undefined,
        telefone: data.telefone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        endereco: data.endereco?.trim() || undefined,
        status: 'ativo' as Status,
      };

      if (fornecedorEditando) {
        await updateFornecedorMutation.mutateAsync({ id: fornecedorEditando.id!, fornecedor: dados });
      } else {
        await createFornecedorMutation.mutateAsync(dados);
      }
      setShowModalFornecedor(false);
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      showError('Erro', 'Erro ao salvar fornecedor');
    }
  };

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500">Gerencie categorias, marcas e fornecedores</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('categorias')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'categorias'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Tag className="h-4 w-4 inline mr-2" />
            Categorias
          </button>
          <button
            onClick={() => setActiveTab('marcas')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'marcas'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="h-4 w-4 inline mr-2" />
            Marcas
          </button>
          <button
            onClick={() => setActiveTab('fornecedores')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'fornecedores'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="h-4 w-4 inline mr-2" />
            Fornecedores
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : (
          <>
            {/* CATEGORIAS */}
            {activeTab === 'categorias' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Categorias de Produtos</CardTitle>
                  <Button onClick={() => abrirModalCategoria()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Categoria
                  </Button>
                </CardHeader>
                <CardContent>
                  {categorias.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhuma categoria cadastrada</p>
                  ) : (
                    <div className="divide-y">
                      {categorias.map((categoria) => (
                        <div key={categoria.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Tag className="h-5 w-5 text-gray-400" />
                            <span className="font-medium text-gray-900">{categoria.nome}</span>
                            <Badge variant={categoria.status === 'ativo' ? 'success' : 'warning'}>
                              {categoria.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => abrirModalCategoria(categoria)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleExcluirCategoria(categoria.id!)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* MARCAS */}
            {activeTab === 'marcas' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Marcas</CardTitle>
                  <Button onClick={() => abrirModalMarca()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Marca
                  </Button>
                </CardHeader>
                <CardContent>
                  {marcas.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhuma marca cadastrada</p>
                  ) : (
                    <div className="divide-y">
                      {marcas.map((marca) => (
                        <div key={marca.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-5 w-5 text-gray-400" />
                            <span className="font-medium text-gray-900">{marca.nome}</span>
                            <Badge variant={marca.status === 'ativo' ? 'success' : 'warning'}>
                              {marca.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => abrirModalMarca(marca)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleExcluirMarca(marca.id!)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* FORNECEDORES */}
            {activeTab === 'fornecedores' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Fornecedores</CardTitle>
                  <Button onClick={() => abrirModalFornecedor()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Fornecedor
                  </Button>
                </CardHeader>
                <CardContent>
                  {fornecedores.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhum fornecedor cadastrado</p>
                  ) : (
                    <div className="divide-y">
                      {fornecedores.map((fornecedor) => (
                        <div key={fornecedor.id} className="flex items-center justify-between py-3">
                          <div>
                            <div className="flex items-center gap-3">
                              <Truck className="h-5 w-5 text-gray-400" />
                              <span className="font-medium text-gray-900">{fornecedor.nome}</span>
                              <Badge variant={fornecedor.status === 'ativo' ? 'success' : 'warning'}>
                                {fornecedor.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 ml-8">
                              {[fornecedor.telefone, fornecedor.email].filter(Boolean).join(' | ') || 'Sem contato'}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => abrirModalFornecedor(fornecedor)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Modal Categoria */}
      <Modal
        isOpen={showModalCategoria}
        onClose={() => setShowModalCategoria(false)}
        title={categoriaEditando ? 'Editar Categoria' : 'Nova Categoria'}
      >
        <form onSubmit={categoriaForm.handleSubmit(handleSalvarCategoria)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <Input
              {...categoriaForm.register('nome')}
              placeholder="Nome da categoria"
              error={categoriaForm.formState.errors.nome?.message}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModalCategoria(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvandoCategoria} className="flex-1">
              {salvandoCategoria ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Marca */}
      <Modal
        isOpen={showModalMarca}
        onClose={() => setShowModalMarca(false)}
        title={marcaEditando ? 'Editar Marca' : 'Nova Marca'}
      >
        <form onSubmit={marcaForm.handleSubmit(handleSalvarMarca)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <Input
              {...marcaForm.register('nome')}
              placeholder="Nome da marca"
              error={marcaForm.formState.errors.nome?.message}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModalMarca(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvandoMarca} className="flex-1">
              {salvandoMarca ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Fornecedor */}
      <Modal
        isOpen={showModalFornecedor}
        onClose={() => setShowModalFornecedor(false)}
        title={fornecedorEditando ? 'Editar Fornecedor' : 'Novo Fornecedor'}
      >
        <form onSubmit={fornecedorForm.handleSubmit(handleSalvarFornecedor)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <Input
              {...fornecedorForm.register('nome')}
              placeholder="Nome do fornecedor"
              error={fornecedorForm.formState.errors.nome?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <Input
                {...fornecedorForm.register('cnpj')}
                placeholder="00.000.000/0000-00"
                error={fornecedorForm.formState.errors.cnpj?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <Input
                {...fornecedorForm.register('telefone')}
                placeholder="(00) 00000-0000"
                error={fornecedorForm.formState.errors.telefone?.message}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <Input
              type="email"
              {...fornecedorForm.register('email')}
              placeholder="email@fornecedor.com"
              error={fornecedorForm.formState.errors.email?.message}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <Input
              {...fornecedorForm.register('endereco')}
              placeholder="Endereço completo"
              error={fornecedorForm.formState.errors.endereco?.message}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => setShowModalFornecedor(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={salvandoFornecedor} className="flex-1">
              {salvandoFornecedor ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>

      {ConfirmDialogEl}
    </AppLayout>
  );
}
