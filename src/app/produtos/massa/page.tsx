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
  Textarea,
  Select,
  Modal,
  Loading,
  Badge
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { 
  ArrowLeft, 
  ArrowRight,
  Plus, 
  Trash2, 
  Save,
  Package,
  Check
} from 'lucide-react';
import { createProduto, generateSKU } from '@/lib/firebase/produtos';
import { 
  getCategorias, 
  getMarcas, 
  getFornecedores,
  createCategoria,
  createMarca,
  createFornecedor
} from '@/lib/firebase/categorias';
import type { Produto, Variacao, Categoria, Marca, Fornecedor } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Tamanhos e cores padrão
const TAMANHOS_PADRAO = ['PP', 'P', 'M', 'G', 'GG', 'XG', '36', '38', '40', '42', '44', '46', 'Único'];
const CORES_PADRAO = ['Preto', 'Branco', 'Azul', 'Vermelho', 'Rosa', 'Verde', 'Amarelo', 'Marrom', 'Cinza', 'Bege', 'Azul Marinho', 'Vinho', 'Nude', 'Laranja', 'Roxo'];

// Função para formatar valor monetário
function formatarMoeda(valor: string): string {
  const apenasNumeros = valor.replace(/\D/g, '');
  if (!apenasNumeros) return '';
  const numero = parseInt(apenasNumeros, 10) / 100;
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Função para converter valor formatado para número
function parseMoeda(valor: string): number {
  if (!valor) return 0;
  return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
}

interface VariacaoGerada {
  id: string;
  tamanho: string;
  cor: string;
  sku: string;
  estoque: number;
  precoVenda: string;
  precoCusto: string;
  usarPrecoBase: boolean;
}

export default function CadastroMassaPage() {
  const { user, loading: authLoading, isAdmin, isGerente } = useAuth();
  const router = useRouter();
  const { success, error: showError, warning } = useToast();

  // Estados gerais
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [etapaAtual, setEtapaAtual] = useState(1);
  
  // Listas do Firebase
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  // Etapa 1 - Informações Básicas
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [skuBase, setSkuBase] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');

  // Etapa 2 - Preços Base
  const [precoCustoBase, setPrecoCustoBase] = useState('');
  const [precoVendaBase, setPrecoVendaBase] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('3');
  const [estoqueInicial, setEstoqueInicial] = useState('0');

  // Etapa 3 - Seleção de Variações
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState<string[]>([]);
  const [coresSelecionadas, setCoresSelecionadas] = useState<string[]>([]);
  const [corPersonalizada, setCorPersonalizada] = useState('');
  const [tamanhoPersonalizado, setTamanhoPersonalizado] = useState('');
  
  // Etapa 4 - Variações Geradas
  const [variacoesGeradas, setVariacoesGeradas] = useState<VariacaoGerada[]>([]);

  // Modais de cadastro rápido
  const [showModalCategoria, setShowModalCategoria] = useState(false);
  const [showModalMarca, setShowModalMarca] = useState(false);
  const [showModalFornecedor, setShowModalFornecedor] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novaMarca, setNovaMarca] = useState('');
  const [novoFornecedor, setNovoFornecedor] = useState({ nome: '', telefone: '', email: '' });

  // Carregar dados iniciais
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && !isAdmin && !isGerente) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, isGerente, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [cats, mrcs, forns] = await Promise.all([
          getCategorias(),
          getMarcas(),
          getFornecedores()
        ]);
        setCategorias(cats);
        setMarcas(mrcs);
        setFornecedores(forns);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Gerar variações quando mudar seleção
  useEffect(() => {
    if (tamanhosSelecionados.length > 0 && coresSelecionadas.length > 0) {
      const novasVariacoes: VariacaoGerada[] = [];
      
      tamanhosSelecionados.forEach(tamanho => {
        coresSelecionadas.forEach(cor => {
          const skuVariacao = `${skuBase || 'PROD'}-${tamanho}-${cor.substring(0, 2).toUpperCase()}`;
          const existente = variacoesGeradas.find(
            v => v.tamanho === tamanho && v.cor === cor
          );
          
          novasVariacoes.push({
            id: existente?.id || uuidv4(),
            tamanho,
            cor,
            sku: existente?.sku || skuVariacao,
            estoque: existente?.estoque ?? (parseInt(estoqueInicial) || 0),
            precoVenda: existente?.precoVenda || precoVendaBase,
            precoCusto: existente?.precoCusto || precoCustoBase,
            usarPrecoBase: existente?.usarPrecoBase ?? true
          });
        });
      });
      
      setVariacoesGeradas(novasVariacoes);
    } else {
      setVariacoesGeradas([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamanhosSelecionados, coresSelecionadas, skuBase, estoqueInicial]);

  // Atualizar preços base nas variações
  useEffect(() => {
    setVariacoesGeradas(prev => prev.map(v => ({
      ...v,
      precoVenda: v.usarPrecoBase ? precoVendaBase : v.precoVenda,
      precoCusto: v.usarPrecoBase ? precoCustoBase : v.precoCusto
    })));
  }, [precoVendaBase, precoCustoBase]);

  // Handlers de seleção
  const toggleTamanho = (tamanho: string) => {
    setTamanhosSelecionados(prev => 
      prev.includes(tamanho) 
        ? prev.filter(t => t !== tamanho)
        : [...prev, tamanho]
    );
  };

  const toggleCor = (cor: string) => {
    setCoresSelecionadas(prev => 
      prev.includes(cor) 
        ? prev.filter(c => c !== cor)
        : [...prev, cor]
    );
  };

  const adicionarCorPersonalizada = () => {
    if (corPersonalizada.trim() && !coresSelecionadas.includes(corPersonalizada.trim())) {
      setCoresSelecionadas(prev => [...prev, corPersonalizada.trim()]);
      setCorPersonalizada('');
    }
  };

  const adicionarTamanhoPersonalizado = () => {
    if (tamanhoPersonalizado.trim() && !tamanhosSelecionados.includes(tamanhoPersonalizado.trim())) {
      setTamanhosSelecionados(prev => [...prev, tamanhoPersonalizado.trim()]);
      setTamanhoPersonalizado('');
    }
  };

  // Handler para atualizar variação individual
  const atualizarVariacao = (id: string, campo: keyof VariacaoGerada, valor: string | number | boolean) => {
    setVariacoesGeradas(prev => prev.map(v => {
      if (v.id !== id) return v;
      
      if (campo === 'usarPrecoBase') {
        return {
          ...v,
          usarPrecoBase: valor as boolean,
          precoVenda: valor ? precoVendaBase : v.precoVenda,
          precoCusto: valor ? precoCustoBase : v.precoCusto
        };
      }
      
      return { ...v, [campo]: valor };
    }));
  };

  const removerVariacao = (id: string) => {
    const variacao = variacoesGeradas.find(v => v.id === id);
    if (variacao) {
      // Verificar se é a última variação dessa cor ou tamanho
      const outrasComMesmaCor = variacoesGeradas.filter(v => v.cor === variacao.cor && v.id !== id);
      const outrasComMesmoTamanho = variacoesGeradas.filter(v => v.tamanho === variacao.tamanho && v.id !== id);
      
      if (outrasComMesmaCor.length === 0) {
        setCoresSelecionadas(prev => prev.filter(c => c !== variacao.cor));
      }
      if (outrasComMesmoTamanho.length === 0) {
        setTamanhosSelecionados(prev => prev.filter(t => t !== variacao.tamanho));
      }
    }
    setVariacoesGeradas(prev => prev.filter(v => v.id !== id));
  };

  // Handlers de cadastro rápido
  const handleSalvarCategoria = async () => {
    if (!novaCategoria.trim()) return;
    try {
      const id = await createCategoria({ nome: novaCategoria.trim(), status: 'ativo' });
      const novasCategorias = await getCategorias();
      setCategorias(novasCategorias);
      setCategoriaId(id);
      setNovaCategoria('');
      setShowModalCategoria(false);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      showError('Erro', 'Erro ao criar categoria');
    }
  };

  const handleSalvarMarca = async () => {
    if (!novaMarca.trim()) return;
    try {
      const id = await createMarca({ nome: novaMarca.trim(), status: 'ativo' });
      const novasMarcas = await getMarcas();
      setMarcas(novasMarcas);
      setMarcaId(id);
      setNovaMarca('');
      setShowModalMarca(false);
    } catch (error) {
      console.error('Erro ao criar marca:', error);
      showError('Erro', 'Erro ao criar marca');
    }
  };

  const handleSalvarFornecedor = async () => {
    if (!novoFornecedor.nome.trim()) return;
    try {
      const id = await createFornecedor({
        nome: novoFornecedor.nome.trim(),
        telefone: novoFornecedor.telefone || undefined,
        email: novoFornecedor.email || undefined,
        status: 'ativo'
      });
      const novosFornecedores = await getFornecedores();
      setFornecedores(novosFornecedores);
      setFornecedorId(id);
      setNovoFornecedor({ nome: '', telefone: '', email: '' });
      setShowModalFornecedor(false);
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
      showError('Erro', 'Erro ao criar fornecedor');
    }
  };

  // Validações por etapa
  const validarEtapa1 = () => {
    if (!nome.trim()) {
      warning('Atenção', 'Informe o nome do produto');
      return false;
    }
    return true;
  };

  const validarEtapa2 = () => {
    if (!precoVendaBase || parseMoeda(precoVendaBase) <= 0) {
      warning('Atenção', 'Informe o preço de venda');
      return false;
    }
    return true;
  };

  const validarEtapa3 = () => {
    if (tamanhosSelecionados.length === 0) {
      warning('Atenção', 'Selecione pelo menos um tamanho');
      return false;
    }
    if (coresSelecionadas.length === 0) {
      warning('Atenção', 'Selecione pelo menos uma cor');
      return false;
    }
    return true;
  };

  const avancarEtapa = () => {
    if (etapaAtual === 1 && !validarEtapa1()) return;
    if (etapaAtual === 2 && !validarEtapa2()) return;
    if (etapaAtual === 3 && !validarEtapa3()) return;
    setEtapaAtual(prev => Math.min(prev + 1, 4));
  };

  const voltarEtapa = () => {
    setEtapaAtual(prev => Math.max(prev - 1, 1));
  };

  // Salvar produto
  const handleSalvar = async () => {
    if (variacoesGeradas.length === 0) {
      warning('Atenção', 'Adicione pelo menos uma variação');
      return;
    }

    setSalvando(true);
    try {
      const variacoes: Variacao[] = variacoesGeradas.map(v => ({
        id: v.id,
        tamanho: v.tamanho,
        cor: v.cor,
        sku: v.sku,
        codigoBarras: '',
        estoque: v.estoque
      }));

      const skuFinal = skuBase || await generateSKU(nome.substring(0, 3).toUpperCase());

      const produto: Omit<Produto, 'id' | 'createdAt' | 'updatedAt'> = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        sku: skuFinal,
        codigoBarras: '',
        categoriaId: categoriaId || undefined,
        marcaId: marcaId || undefined,
        fornecedorId: fornecedorId || undefined,
        precoCusto: parseMoeda(precoCustoBase),
        precoVenda: parseMoeda(precoVendaBase),
        estoqueMinimo: parseInt(estoqueMinimo) || 3,
        variacoes,
        ativo: true
      };

      await createProduto(produto);
      success('Sucesso', 'Produto cadastrado com sucesso!');
      router.push('/produtos');
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      showError('Erro', 'Erro ao salvar produto. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // Calcular margem
  const margemBase = useMemo(() => {
    const custo = parseMoeda(precoCustoBase);
    const venda = parseMoeda(precoVendaBase);
    if (custo > 0 && venda > 0) {
      return ((venda - custo) / custo * 100).toFixed(1);
    }
    return '0';
  }, [precoCustoBase, precoVendaBase]);

  // Resumo das variações
  const totalVariacoes = variacoesGeradas.length;
  const totalEstoque = variacoesGeradas.reduce((sum, v) => sum + v.estoque, 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || (!isAdmin && !isGerente)) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cadastro em Massa</h1>
              <p className="text-sm text-gray-500">Adicione produtos com múltiplas variações de forma rápida</p>
            </div>
          </div>
        </div>

        {/* Indicador de Etapas */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((etapa) => (
            <div key={etapa} className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  etapaAtual === etapa 
                    ? 'bg-blue-600 text-white' 
                    : etapaAtual > etapa 
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {etapaAtual > etapa ? <Check className="h-5 w-5" /> : etapa}
              </div>
              {etapa < 4 && (
                <div className={`w-16 h-1 mx-1 ${etapaAtual > etapa ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4 text-sm text-gray-600">
          <span className={etapaAtual === 1 ? 'font-bold text-blue-600' : ''}>Informações</span>
          <span className={etapaAtual === 2 ? 'font-bold text-blue-600' : ''}>Preços</span>
          <span className={etapaAtual === 3 ? 'font-bold text-blue-600' : ''}>Variações</span>
          <span className={etapaAtual === 4 ? 'font-bold text-blue-600' : ''}>Revisão</span>
        </div>

        {/* Etapa 1 - Informações Básicas */}
        {etapaAtual === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Informações do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nome do Produto *"
                placeholder="Ex: Blusa Básica, Calça Jeans, Vestido Longo..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />

              <Textarea
                label="Descrição"
                placeholder="Descrição detalhada do produto..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="SKU Base"
                  placeholder="Ex: BLU-BAS (será gerado automaticamente se vazio)"
                  value={skuBase}
                  onChange={(e) => setSkuBase(e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-gray-700">Categoria</label>
                    <button
                      type="button"
                      onClick={() => setShowModalCategoria(true)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...categorias.map(c => ({ value: c.id!, label: c.nome }))
                    ]}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-gray-700">Marca</label>
                    <button
                      type="button"
                      onClick={() => setShowModalMarca(true)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Select
                    value={marcaId}
                    onChange={(e) => setMarcaId(e.target.value)}
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...marcas.map(m => ({ value: m.id!, label: m.nome }))
                    ]}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <label className="text-sm font-medium text-gray-700">Fornecedor</label>
                    <button
                      type="button"
                      onClick={() => setShowModalFornecedor(true)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Select
                    value={fornecedorId}
                    onChange={(e) => setFornecedorId(e.target.value)}
                    options={[
                      { value: '', label: 'Selecione...' },
                      ...fornecedores.map(f => ({ value: f.id!, label: f.nome }))
                    ]}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Etapa 2 - Preços */}
        {etapaAtual === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Preços Base</CardTitle>
              <p className="text-sm text-gray-500">Defina os preços padrão. Você poderá ajustar por variação depois.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Preço de Custo (R$)"
                  type="text"
                  placeholder="0,00"
                  value={precoCustoBase}
                  onChange={(e) => setPrecoCustoBase(formatarMoeda(e.target.value))}
                />

                <Input
                  label="Preço de Venda (R$) *"
                  type="text"
                  placeholder="0,00"
                  value={precoVendaBase}
                  onChange={(e) => setPrecoVendaBase(formatarMoeda(e.target.value))}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margem</label>
                  <div className={`h-10 px-3 flex items-center rounded-md border ${
                    parseFloat(margemBase) >= 50 ? 'bg-green-50 border-green-200 text-green-700' :
                    parseFloat(margemBase) >= 30 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                    'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    <span className="font-bold">{margemBase}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Estoque Mínimo (alerta)"
                  type="number"
                  min="0"
                  value={estoqueMinimo}
                  onChange={(e) => setEstoqueMinimo(e.target.value)}
                />

                <Input
                  label="Estoque Inicial (por variação)"
                  type="number"
                  min="0"
                  value={estoqueInicial}
                  onChange={(e) => setEstoqueInicial(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Etapa 3 - Seleção de Variações */}
        {etapaAtual === 3 && (
          <div className="space-y-6">
            {/* Tamanhos */}
            <Card>
              <CardHeader>
                <CardTitle>Selecione os Tamanhos</CardTitle>
                <p className="text-sm text-gray-500">Clique para selecionar/desselecionar</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {TAMANHOS_PADRAO.map((tamanho) => (
                    <button
                      key={tamanho}
                      type="button"
                      onClick={() => toggleTamanho(tamanho)}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                        tamanhosSelecionados.includes(tamanho)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {tamanho}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Tamanho personalizado..."
                    value={tamanhoPersonalizado}
                    onChange={(e) => setTamanhoPersonalizado(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button variant="outline" onClick={adicionarTamanhoPersonalizado}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {tamanhosSelecionados.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">
                      Tamanhos selecionados: {tamanhosSelecionados.join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cores */}
            <Card>
              <CardHeader>
                <CardTitle>Selecione as Cores / Estampas</CardTitle>
                <p className="text-sm text-gray-500">Clique para selecionar/desselecionar</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {CORES_PADRAO.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => toggleCor(cor)}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                        coresSelecionadas.includes(cor)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {cor}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Cor ou estampa personalizada..."
                    value={corPersonalizada}
                    onChange={(e) => setCorPersonalizada(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button variant="outline" onClick={adicionarCorPersonalizada}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {coresSelecionadas.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">
                      Cores selecionadas: {coresSelecionadas.join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview das combinações */}
            {tamanhosSelecionados.length > 0 && coresSelecionadas.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        Serão geradas {totalVariacoes} variações
                      </p>
                      <p className="text-sm text-gray-500">
                        {tamanhosSelecionados.length} tamanho(s) × {coresSelecionadas.length} cor(es)
                      </p>
                    </div>
                    <Badge variant="primary" className="text-lg px-4 py-2">
                      {totalVariacoes} variações
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Etapa 4 - Revisão */}
        {etapaAtual === 4 && (
          <div className="space-y-6">
            {/* Resumo do Produto */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nome</p>
                    <p className="font-medium">{nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">SKU Base</p>
                    <p className="font-medium">{skuBase || '(automático)'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Preço de Venda</p>
                    <p className="font-medium text-green-600">R$ {precoVendaBase}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total de Variações</p>
                    <p className="font-medium">{totalVariacoes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Variações */}
            <Card>
              <CardHeader>
                <CardTitle>Variações ({totalVariacoes})</CardTitle>
                <p className="text-sm text-gray-500">Ajuste o estoque e preços individualmente se necessário</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3">Tamanho</th>
                        <th className="text-left p-3">Cor</th>
                        <th className="text-left p-3">SKU</th>
                        <th className="text-center p-3">Estoque</th>
                        <th className="text-center p-3">Preço Base?</th>
                        <th className="text-right p-3">Preço Venda</th>
                        <th className="text-center p-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variacoesGeradas.map((variacao) => (
                        <tr key={variacao.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <Badge variant="secondary">{variacao.tamanho}</Badge>
                          </td>
                          <td className="p-3">{variacao.cor}</td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={variacao.sku}
                              onChange={(e) => atualizarVariacao(variacao.id, 'sku', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              value={variacao.estoque}
                              onChange={(e) => atualizarVariacao(variacao.id, 'estoque', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded text-center text-sm"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={variacao.usarPrecoBase}
                              onChange={(e) => atualizarVariacao(variacao.id, 'usarPrecoBase', e.target.checked)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={variacao.usarPrecoBase ? precoVendaBase : variacao.precoVenda}
                              onChange={(e) => atualizarVariacao(variacao.id, 'precoVenda', formatarMoeda(e.target.value))}
                              disabled={variacao.usarPrecoBase}
                              className={`w-24 px-2 py-1 border rounded text-right text-sm ${
                                variacao.usarPrecoBase ? 'bg-gray-100' : ''
                              }`}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removerVariacao(variacao.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={3} className="p-3 text-right">Total:</td>
                        <td className="p-3 text-center">{totalEstoque} un</td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navegação */}
        <div className="flex justify-between pt-4">
          <Button 
            variant="outline" 
            onClick={voltarEtapa}
            disabled={etapaAtual === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {etapaAtual < 4 ? (
            <Button onClick={avancarEtapa}>
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleSalvar}
              loading={salvando}
              disabled={variacoesGeradas.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Produto
            </Button>
          )}
        </div>
      </div>

      {/* Modais de Cadastro Rápido */}
      <Modal
        isOpen={showModalCategoria}
        onClose={() => setShowModalCategoria(false)}
        title="Nova Categoria"
      >
        <div className="space-y-4">
          <Input
            label="Nome da Categoria"
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            placeholder="Ex: Blusas, Calças, Vestidos..."
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

      <Modal
        isOpen={showModalMarca}
        onClose={() => setShowModalMarca(false)}
        title="Nova Marca"
      >
        <div className="space-y-4">
          <Input
            label="Nome da Marca"
            value={novaMarca}
            onChange={(e) => setNovaMarca(e.target.value)}
            placeholder="Ex: Zara, Renner, Farm..."
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

      <Modal
        isOpen={showModalFornecedor}
        onClose={() => setShowModalFornecedor(false)}
        title="Novo Fornecedor"
      >
        <div className="space-y-4">
          <Input
            label="Nome do Fornecedor *"
            value={novoFornecedor.nome}
            onChange={(e) => setNovoFornecedor(prev => ({ ...prev, nome: e.target.value }))}
            placeholder="Nome do fornecedor"
          />
          <Input
            label="Telefone"
            value={novoFornecedor.telefone}
            onChange={(e) => setNovoFornecedor(prev => ({ ...prev, telefone: e.target.value }))}
            placeholder="(00) 00000-0000"
          />
          <Input
            label="Email"
            type="email"
            value={novoFornecedor.email}
            onChange={(e) => setNovoFornecedor(prev => ({ ...prev, email: e.target.value }))}
            placeholder="email@fornecedor.com"
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
