'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Loading
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Package
} from 'lucide-react';
import { generateSKU } from '@/lib/firebase/produtos';
import {
  useCategorias,
  useMarcas,
  useFornecedores,
  useCreateProduto,
  useCreateCategoria,
  useCreateMarca,
  useCreateFornecedor,
} from '@/hooks/useQueries';
import { produtoSchema, type ProdutoFormData } from '@/lib/validations';
import { formatarMoeda, parseMoeda } from '@/lib/utils';
import type { Produto } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Tamanhos e cores padrão
const TAMANHOS_PADRAO = ['PP', 'P', 'M', 'G', 'GG', 'XG', '36', '38', '40', '42', '44', '46'];
const CORES_PADRAO = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Rosa', 'Verde', 'Amarelo', 'Marrom', 'Cinza', 'Bege'];

export default function NovoProdutoPage() {
  const { user, loading: authLoading, isAdmin, isGerente } = useAuth();
  const router = useRouter();
  const { success, error: showError, warning } = useToast();

  const { data: categorias = [], isLoading: loadingCategorias } = useCategorias();
  const { data: marcas = [], isLoading: loadingMarcas } = useMarcas();
  const { data: fornecedores = [], isLoading: loadingFornecedores } = useFornecedores();

  const createProdutoMutation = useCreateProduto();
  const createCategoriaMutation = useCreateCategoria();
  const createMarcaMutation = useCreateMarca();
  const createFornecedorMutation = useCreateFornecedor();

  const loading = loadingCategorias || loadingMarcas || loadingFornecedores;

  const [salvando, setSalvando] = useState(false);

  // react-hook-form setup
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema) as Resolver<ProdutoFormData>,
    defaultValues: {
      nome: '',
      descricao: '',
      sku: '',
      codigoBarras: '',
      categoriaId: '',
      marcaId: '',
      fornecedorId: '',
      precoCusto: undefined,
      precoVenda: undefined as unknown as number,
      estoqueMinimo: 3,
      variacoes: [],
      status: 'ativo',
      fotoUrl: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variacoes',
  });

  // Watch values for display calculations
  const watchedSku = watch('sku');
  const watchedNome = watch('nome');

  // Currency display state (formatted strings for the inputs)
  const [precoCustoDisplay, setPrecoCustoDisplay] = useState('');
  const [precoVendaDisplay, setPrecoVendaDisplay] = useState('');

  // Estados dos modais de cadastro rápido
  const [showModalCategoria, setShowModalCategoria] = useState(false);
  const [showModalMarca, setShowModalMarca] = useState(false);
  const [showModalFornecedor, setShowModalFornecedor] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novaMarca, setNovaMarca] = useState('');
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: '', telefone: '', email: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !isAdmin && !isGerente) {
      router.push('/produtos');
    }
  }, [user, authLoading, isAdmin, isGerente, router]);

  // Funções para cadastro rápido
  const handleSalvarCategoria = async () => {
    if (!novaCategoria.trim()) {
      warning('Atenção', 'Informe o nome da categoria');
      return;
    }
    try {
      const id = await createCategoriaMutation.mutateAsync({ nome: novaCategoria.trim(), status: 'ativo' });
      setValue('categoriaId', id);
      setNovaCategoria('');
      setShowModalCategoria(false);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      showError('Erro', 'Erro ao criar categoria');
    }
  };

  const handleSalvarMarca = async () => {
    if (!novaMarca.trim()) {
      warning('Atenção', 'Informe o nome da marca');
      return;
    }
    try {
      const id = await createMarcaMutation.mutateAsync({ nome: novaMarca.trim(), status: 'ativo' });
      setValue('marcaId', id);
      setNovaMarca('');
      setShowModalMarca(false);
    } catch (error) {
      console.error('Erro ao criar marca:', error);
      showError('Erro', 'Erro ao criar marca');
    }
  };

  const handleSalvarFornecedor = async () => {
    if (!novoFornecedor.nome.trim()) {
      warning('Atenção', 'Informe o nome do fornecedor');
      return;
    }
    try {
      const id = await createFornecedorMutation.mutateAsync({
        nome: novoFornecedor.nome.trim(),
        telefone: novoFornecedor.telefone || undefined,
        email: novoFornecedor.email || undefined,
        status: 'ativo'
      });
      setValue('fornecedorId', id);
      setNovoFornecedor({ nome: '', telefone: '', email: '' });
      setShowModalFornecedor(false);
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      showError('Erro', 'Erro ao criar fornecedor');
    }
  };

  const handleGerarSKU = async () => {
    const nome = getValues('nome');
    if (!nome) {
      warning('Atenção', 'Informe o nome do produto primeiro');
      return;
    }
    const novoSku = await generateSKU(nome.substring(0, 3).toUpperCase());
    setValue('sku', novoSku);
  };

  const handleAdicionarVariacao = () => {
    append({
      id: uuidv4(),
      sku: '',
      tamanho: '',
      cor: '',
      estoque: 0,
    });
  };

  const handleGerarSKUVariacao = (index: number) => {
    const variacao = getValues(`variacoes.${index}`);
    const baseSku = watchedSku || watchedNome.substring(0, 3).toUpperCase();
    const skuVariacao = `${baseSku}-${variacao.tamanho || 'X'}-${(variacao.cor || 'X').substring(0, 3).toUpperCase()}`;
    setValue(`variacoes.${index}.sku`, skuVariacao);
  };

  const handleAdicionarVariacoesEmMassa = () => {
    const tamanhosSelecionados = ['P', 'M', 'G', 'GG'];
    const coresSelecionadas = ['Preto', 'Branco'];
    const baseSku = watchedSku || watchedNome.substring(0, 3).toUpperCase();

    tamanhosSelecionados.forEach(tamanho => {
      coresSelecionadas.forEach(cor => {
        append({
          id: uuidv4(),
          sku: `${baseSku}-${tamanho}-${cor.substring(0, 3).toUpperCase()}`,
          tamanho,
          cor,
          estoque: 0,
        });
      });
    });
  };

  const onSubmit = async (data: ProdutoFormData) => {
    setSalvando(true);
    try {
      const categoriaSelecionada = categorias.find(c => c.id === data.categoriaId);
      const marcaSelecionada = marcas.find(m => m.id === data.marcaId);

      const produto: Omit<Produto, 'id' | 'createdAt' | 'updatedAt'> = {
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || '',
        sku: data.sku || await generateSKU(data.nome.substring(0, 3).toUpperCase()),
        codigoBarras: data.codigoBarras?.trim() || undefined,
        categoriaId: data.categoriaId || undefined,
        categoriaNome: categoriaSelecionada?.nome,
        marca: marcaSelecionada?.nome,
        fornecedorId: data.fornecedorId || undefined,
        precoCusto: data.precoCusto || undefined,
        precoVenda: data.precoVenda,
        estoqueMinimo: data.estoqueMinimo ?? 3,
        variacoes: data.variacoes.map(v => ({
          id: v.id,
          sku: v.sku || `${data.sku}-${v.tamanho}-${v.cor?.substring(0, 3).toUpperCase()}`,
          codigoBarras: v.codigoBarras,
          tamanho: v.tamanho,
          cor: v.cor,
          estoque: v.estoque || 0,
        })),
        ativo: true,
      };

      await createProdutoMutation.mutateAsync(produto);
      success('Sucesso', 'Produto cadastrado com sucesso!');
      router.push('/produtos');
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      showError('Erro', 'Erro ao salvar produto. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
            <p className="text-gray-500">Cadastre um novo produto no catálogo</p>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
          {/* Informações básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Produto *"
                  placeholder="Ex: Vestido Floral"
                  {...register('nome')}
                  error={errors.nome?.message}
                />
                <div className="flex gap-2">
                  <Input
                    label="SKU"
                    placeholder="Ex: VES-001"
                    {...register('sku')}
                    error={errors.sku?.message}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGerarSKU}
                    className="mt-6"
                  >
                    Gerar
                  </Button>
                </div>
              </div>

              <Input
                label="Código de Barras"
                placeholder="Ex: 7891234567890"
                {...register('codigoBarras')}
                error={errors.codigoBarras?.message}
              />

              <Textarea
                label="Descrição"
                placeholder="Descrição detalhada do produto..."
                {...register('descricao')}
                error={errors.descricao?.message}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Categorização */}
          <Card>
            <CardHeader>
              <CardTitle>Categorização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      label="Categoria"
                      {...register('categoriaId')}
                      error={errors.categoriaId?.message}
                      options={[
                        { value: '', label: 'Selecione...' },
                        ...categorias.map(c => ({ value: c.id!, label: c.nome }))
                      ]}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowModalCategoria(true)}
                    title="Adicionar categoria"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      label="Marca"
                      {...register('marcaId')}
                      error={errors.marcaId?.message}
                      options={[
                        { value: '', label: 'Selecione...' },
                        ...marcas.map(m => ({ value: m.id!, label: m.nome }))
                      ]}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowModalMarca(true)}
                    title="Adicionar marca"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Select
                      label="Fornecedor"
                      {...register('fornecedorId')}
                      error={errors.fornecedorId?.message}
                      options={[
                        { value: '', label: 'Selecione...' },
                        ...fornecedores.map(f => ({ value: f.id!, label: f.nome }))
                      ]}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowModalFornecedor(true)}
                    title="Adicionar fornecedor"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preços */}
          <Card>
            <CardHeader>
              <CardTitle>Preços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller
                  control={control}
                  name="precoCusto"
                  render={({ field }) => (
                    <Input
                      label="Preço de Custo"
                      placeholder="0,00"
                      type="text"
                      value={precoCustoDisplay}
                      onChange={(e) => {
                        const formatted = formatarMoeda(e.target.value);
                        setPrecoCustoDisplay(formatted);
                        field.onChange(parseMoeda(formatted));
                      }}
                      onBlur={field.onBlur}
                      error={errors.precoCusto?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="precoVenda"
                  render={({ field }) => (
                    <Input
                      label="Preço de Venda *"
                      placeholder="0,00"
                      type="text"
                      value={precoVendaDisplay}
                      onChange={(e) => {
                        const formatted = formatarMoeda(e.target.value);
                        setPrecoVendaDisplay(formatted);
                        field.onChange(parseMoeda(formatted));
                      }}
                      onBlur={field.onBlur}
                      error={errors.precoVenda?.message}
                    />
                  )}
                />
                <Input
                  label="Estoque Mínimo"
                  placeholder="3"
                  type="number"
                  {...register('estoqueMinimo', { valueAsNumber: true })}
                  error={errors.estoqueMinimo?.message}
                />
              </div>
              {precoCustoDisplay && precoVendaDisplay && parseMoeda(precoCustoDisplay) > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Margem de lucro:</strong>{' '}
                    {(((parseMoeda(precoVendaDisplay) - parseMoeda(precoCustoDisplay)) / parseMoeda(precoCustoDisplay)) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variações */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Variações (Tamanhos/Cores) *</CardTitle>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleAdicionarVariacoesEmMassa}>
                    + Adicionar em Massa
                  </Button>
                  <Button type="button" size="sm" onClick={handleAdicionarVariacao}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {errors.variacoes?.message && (
                <p className="text-sm text-red-500 mb-2">{errors.variacoes.message}</p>
              )}
              {fields.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhuma variação adicionada</p>
                  <p className="text-sm">Clique em &quot;Adicionar&quot; para criar variações</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-end gap-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="w-32">
                        <Select
                          label="Tamanho"
                          {...register(`variacoes.${index}.tamanho`)}
                          error={errors.variacoes?.[index]?.tamanho?.message}
                          options={[
                            { value: '', label: 'Selecione...' },
                            ...TAMANHOS_PADRAO.map(t => ({ value: t, label: t }))
                          ]}
                          className="w-32"
                        />
                      </div>
                      <div className="w-40">
                        <Select
                          label="Cor"
                          {...register(`variacoes.${index}.cor`)}
                          error={errors.variacoes?.[index]?.cor?.message}
                          options={[
                            { value: '', label: 'Selecione...' },
                            ...CORES_PADRAO.map(c => ({ value: c, label: c }))
                          ]}
                          className="w-40"
                        />
                      </div>
                      <div className="flex gap-2 flex-1">
                        <Input
                          label="SKU Variação"
                          {...register(`variacoes.${index}.sku`)}
                          error={errors.variacoes?.[index]?.sku?.message}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleGerarSKUVariacao(index)}
                          className="mt-6"
                          title="Gerar SKU"
                        >
                          Gerar
                        </Button>
                      </div>
                      <Input
                        label="Estoque"
                        type="number"
                        {...register(`variacoes.${index}.estoque`, { valueAsNumber: true })}
                        error={errors.variacoes?.[index]?.estoque?.message}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:bg-red-50 mb-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" loading={salvando}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Produto
            </Button>
          </div>
        </form>
      </div>

      {/* Modal Nova Categoria */}
      <Modal
        isOpen={showModalCategoria}
        onClose={() => setShowModalCategoria(false)}
        title="Nova Categoria"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nome da Categoria *"
            placeholder="Ex: Vestidos, Camisas, Calças..."
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowModalCategoria(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarCategoria}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Nova Marca */}
      <Modal
        isOpen={showModalMarca}
        onClose={() => setShowModalMarca(false)}
        title="Nova Marca"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nome da Marca *"
            placeholder="Ex: Zara, H&M, Forever 21..."
            value={novaMarca}
            onChange={(e) => setNovaMarca(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowModalMarca(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarMarca}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Novo Fornecedor */}
      <Modal
        isOpen={showModalFornecedor}
        onClose={() => setShowModalFornecedor(false)}
        title="Novo Fornecedor"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Nome do Fornecedor *"
            placeholder="Nome ou razão social"
            value={novoFornecedor.nome}
            onChange={(e) => setNovoFornecedor(prev => ({ ...prev, nome: e.target.value }))}
          />
          <Input
            label="Telefone"
            placeholder="(00) 00000-0000"
            value={novoFornecedor.telefone}
            onChange={(e) => setNovoFornecedor(prev => ({ ...prev, telefone: e.target.value }))}
          />
          <Input
            label="Email"
            placeholder="email@fornecedor.com"
            type="email"
            value={novoFornecedor.email}
            onChange={(e) => setNovoFornecedor(prev => ({ ...prev, email: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowModalFornecedor(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarFornecedor}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
