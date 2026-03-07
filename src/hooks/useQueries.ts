// Hooks de React Query para dados do Firebase

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProdutos, getProdutoById, createProduto, updateProduto, deleteProduto, buscarProdutos, getEstoqueBaixo } from '@/lib/firebase/produtos';
import { getClientes, getClienteById, createCliente, updateCliente, deleteCliente, buscarClientes, getAniversariantes, getAniversariantesDoMes, getAniversariantesDaSemana } from '@/lib/firebase/clientes';
import { getVendas, getVendaById, getVendaCompleta, cancelarVenda, getResumoVendasPeriodo, getProdutosMaisVendidos } from '@/lib/firebase/vendas';
import { criarVendaAtomicamente } from '@/lib/firebase/transactions';
import { getCaixaAberto, abrirCaixa, fecharCaixa, getResumoCaixa, getMovimentosCaixa, getHistoricoCaixas, realizarSangria, realizarSuprimento, registrarMovimentoCaixa } from '@/lib/firebase/caixa';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria, getMarcas, createMarca, updateMarca, deleteMarca, getFornecedores, createFornecedor, updateFornecedor } from '@/lib/firebase/categorias';
import { getTrocas, criarTroca, aprovarTroca, recusarTroca } from '@/lib/firebase/trocas';
import { darEntradaEstoque, darSaidaEstoque, getMovimentosEstoque } from '@/lib/firebase/estoque';
import type {
  Produto,
  Cliente,
  Categoria,
  Marca,
  Fornecedor,
  Status,
} from '@/types';
import type { Troca } from '@/lib/firebase/trocas';

// ==========================================
// QUERY KEYS
// ==========================================

export const queryKeys = {
  produtos: {
    all: ['produtos'] as const,
    lists: () => [...queryKeys.produtos.all, 'list'] as const,
    list: (status?: Status) => [...queryKeys.produtos.lists(), { status }] as const,
    details: () => [...queryKeys.produtos.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.produtos.details(), id] as const,
    search: (termo: string) => [...queryKeys.produtos.all, 'search', termo] as const,
    estoqueBaixo: () => [...queryKeys.produtos.all, 'estoqueBaixo'] as const,
    maisVendidos: (dataInicio: string, dataFim: string) => [...queryKeys.produtos.all, 'maisVendidos', dataInicio, dataFim] as const,
  },
  clientes: {
    all: ['clientes'] as const,
    lists: () => [...queryKeys.clientes.all, 'list'] as const,
    list: (status?: Status) => [...queryKeys.clientes.lists(), { status }] as const,
    details: () => [...queryKeys.clientes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clientes.details(), id] as const,
    search: (termo: string) => [...queryKeys.clientes.all, 'search', termo] as const,
    aniversariantes: () => [...queryKeys.clientes.all, 'aniversariantes'] as const,
    aniversariantesDoMes: (mes: number) => [...queryKeys.clientes.all, 'aniversariantesDoMes', mes] as const,
    aniversariantesDaSemana: () => [...queryKeys.clientes.all, 'aniversariantesDaSemana'] as const,
  },
  vendas: {
    all: ['vendas'] as const,
    lists: () => [...queryKeys.vendas.all, 'list'] as const,
    list: (filtros?: Record<string, unknown>) => [...queryKeys.vendas.lists(), filtros] as const,
    details: () => [...queryKeys.vendas.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.vendas.details(), id] as const,
    completa: (id: string) => [...queryKeys.vendas.all, 'completa', id] as const,
    resumo: (dataInicio: Date, dataFim: Date) => [...queryKeys.vendas.all, 'resumo', dataInicio.toISOString(), dataFim.toISOString()] as const,
  },
  caixa: {
    all: ['caixa'] as const,
    aberto: (usuarioId: string) => [...queryKeys.caixa.all, 'aberto', usuarioId] as const,
    resumo: (caixaId: string) => [...queryKeys.caixa.all, 'resumo', caixaId] as const,
    movimentos: (caixaId: string) => [...queryKeys.caixa.all, 'movimentos', caixaId] as const,
    historico: (filtros?: Record<string, unknown>) => [...queryKeys.caixa.all, 'historico', filtros] as const,
  },
  categorias: {
    all: ['categorias'] as const,
    list: (status?: Status) => [...queryKeys.categorias.all, 'list', { status }] as const,
  },
  marcas: {
    all: ['marcas'] as const,
    list: (status?: Status) => [...queryKeys.marcas.all, 'list', { status }] as const,
  },
  fornecedores: {
    all: ['fornecedores'] as const,
    list: (status?: Status) => [...queryKeys.fornecedores.all, 'list', { status }] as const,
  },
  trocas: {
    all: ['trocas'] as const,
    lists: () => [...queryKeys.trocas.all, 'list'] as const,
    list: (filtros?: Record<string, unknown>) => [...queryKeys.trocas.lists(), filtros] as const,
  },
  estoque: {
    all: ['estoque'] as const,
    movimentos: (filtros?: Record<string, unknown>) => [...queryKeys.estoque.all, 'movimentos', filtros] as const,
  },
};

// ==========================================
// PRODUTOS HOOKS
// ==========================================

export function useProdutos(status?: Status) {
  return useQuery({
    queryKey: queryKeys.produtos.list(status),
    queryFn: () => getProdutos(status),
  });
}

export function useProduto(id: string) {
  return useQuery({
    queryKey: queryKeys.produtos.detail(id),
    queryFn: () => getProdutoById(id),
    enabled: !!id,
  });
}

export function useBuscarProdutos(termo: string) {
  return useQuery({
    queryKey: queryKeys.produtos.search(termo),
    queryFn: () => buscarProdutos(termo),
    enabled: termo.length >= 2,
  });
}

export function useEstoqueBaixo() {
  return useQuery({
    queryKey: queryKeys.produtos.estoqueBaixo(),
    queryFn: () => getEstoqueBaixo(),
  });
}

export function useProdutosMaisVendidos(dataInicio: Date, dataFim: Date, topN: number = 10) {
  return useQuery({
    queryKey: queryKeys.produtos.maisVendidos(dataInicio.toISOString(), dataFim.toISOString()),
    queryFn: () => getProdutosMaisVendidos(dataInicio, dataFim, topN),
  });
}

export function useCreateProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Produto, 'id' | 'createdAt' | 'updatedAt' | 'margem'>) =>
      createProduto(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
    },
  });
}

export function useUpdateProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; produto: Partial<Produto> }) =>
      updateProduto(data.id, data.produto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.lists() });
    },
  });
}

export function useDeleteProduto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
    },
  });
}

// ==========================================
// CLIENTES HOOKS
// ==========================================

export function useClientes(status?: Status) {
  return useQuery({
    queryKey: queryKeys.clientes.list(status),
    queryFn: () => getClientes(status),
  });
}

export function useCliente(id: string) {
  return useQuery({
    queryKey: queryKeys.clientes.detail(id),
    queryFn: () => getClienteById(id),
    enabled: !!id,
  });
}

export function useBuscarClientes(termo: string) {
  return useQuery({
    queryKey: queryKeys.clientes.search(termo),
    queryFn: () => buscarClientes(termo),
    enabled: termo.length >= 2,
  });
}

export function useAniversariantes() {
  return useQuery({
    queryKey: queryKeys.clientes.aniversariantes(),
    queryFn: () => getAniversariantes(),
  });
}

export function useAniversariantesDoMes(mes?: number) {
  return useQuery({
    queryKey: queryKeys.clientes.aniversariantesDoMes(mes ?? new Date().getMonth() + 1),
    queryFn: () => getAniversariantesDoMes(mes),
  });
}

export function useAniversariantesDaSemana() {
  return useQuery({
    queryKey: queryKeys.clientes.aniversariantesDaSemana(),
    queryFn: () => getAniversariantesDaSemana(),
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt' | 'totalCompras' | 'ultimaCompra'>) =>
      createCliente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientes.all });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; cliente: Partial<Cliente> }) =>
      updateCliente(data.id, data.cliente),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientes.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clientes.lists() });
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCliente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clientes.all });
    },
  });
}

// ==========================================
// VENDAS HOOKS
// ==========================================

export function useVendas(filtros?: {
  dataInicio?: Date;
  dataFim?: Date;
  usuarioId?: string;
  status?: 'finalizada' | 'cancelada';
  clienteId?: string;
}) {
  return useQuery({
    queryKey: queryKeys.vendas.list(filtros as Record<string, unknown>),
    queryFn: () => getVendas(filtros),
  });
}

export function useVenda(id: string) {
  return useQuery({
    queryKey: queryKeys.vendas.detail(id),
    queryFn: () => getVendaById(id),
    enabled: !!id,
  });
}

export function useVendaCompleta(id: string) {
  return useQuery({
    queryKey: queryKeys.vendas.completa(id),
    queryFn: () => getVendaCompleta(id),
    enabled: !!id,
  });
}

export function useResumoVendas(dataInicio: Date, dataFim: Date) {
  return useQuery({
    queryKey: queryKeys.vendas.resumo(dataInicio, dataFim),
    queryFn: () => getResumoVendasPeriodo(dataInicio, dataFim),
  });
}

export function useCreateVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: criarVendaAtomicamente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.caixa.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
    },
  });
}

export function useCancelarVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { vendaId: string; motivo: string; usuarioId: string }) =>
      cancelarVenda(data.vendaId, data.motivo, data.usuarioId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vendas.detail(variables.vendaId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.vendas.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.caixa.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
    },
  });
}

// ==========================================
// CAIXA HOOKS
// ==========================================

export function useCaixaAberto(usuarioId: string) {
  return useQuery({
    queryKey: queryKeys.caixa.aberto(usuarioId),
    queryFn: () => getCaixaAberto(usuarioId),
    enabled: !!usuarioId,
    refetchInterval: 30000,
  });
}

export function useResumoCaixa(caixaId: string) {
  return useQuery({
    queryKey: queryKeys.caixa.resumo(caixaId),
    queryFn: () => getResumoCaixa(caixaId),
    enabled: !!caixaId,
  });
}

export function useMovimentosCaixa(caixaId: string) {
  return useQuery({
    queryKey: queryKeys.caixa.movimentos(caixaId),
    queryFn: () => getMovimentosCaixa(caixaId),
    enabled: !!caixaId,
  });
}

export function useHistoricoCaixas(filtros?: { dataInicio?: Date; dataFim?: Date; usuarioId?: string }) {
  return useQuery({
    queryKey: queryKeys.caixa.historico(filtros as Record<string, unknown>),
    queryFn: () => getHistoricoCaixas(filtros?.dataInicio, filtros?.dataFim, filtros?.usuarioId),
  });
}

export function useAbrirCaixa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { usuarioId: string; saldoInicial: number }) =>
      abrirCaixa(data.usuarioId, data.saldoInicial),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caixa.all });
    },
  });
}

export function useFecharCaixa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { caixaId: string; saldoConferido: number; observacao?: string }) =>
      fecharCaixa(data.caixaId, data.saldoConferido, data.observacao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caixa.all });
    },
  });
}

export function useSangria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { caixaId: string; valor: number; motivo: string; usuarioId: string }) =>
      realizarSangria(data.caixaId, data.valor, data.motivo, data.usuarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caixa.all });
    },
  });
}

export function useSuprimento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { caixaId: string; valor: number; motivo: string; usuarioId: string }) =>
      realizarSuprimento(data.caixaId, data.valor, data.motivo, data.usuarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caixa.all });
    },
  });
}

export function useRegistrarMovimentoCaixa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registrarMovimentoCaixa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caixa.all });
    },
  });
}

// ==========================================
// CATEGORIAS HOOKS
// ==========================================

export function useCategorias(status?: Status) {
  return useQuery({
    queryKey: queryKeys.categorias.list(status),
    queryFn: () => getCategorias(status),
  });
}

export function useCreateCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Categoria, 'id' | 'createdAt'>) => createCategoria(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categorias.all });
    },
  });
}

export function useUpdateCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; categoria: Partial<Omit<Categoria, 'id' | 'createdAt'>> }) =>
      updateCategoria(data.id, data.categoria),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categorias.all });
    },
  });
}

export function useDeleteCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCategoria(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categorias.all });
    },
  });
}

// ==========================================
// MARCAS HOOKS
// ==========================================

export function useMarcas(status?: Status) {
  return useQuery({
    queryKey: queryKeys.marcas.list(status),
    queryFn: () => getMarcas(status),
  });
}

export function useCreateMarca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Marca, 'id' | 'createdAt'>) => createMarca(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marcas.all });
    },
  });
}

export function useUpdateMarca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; marca: Partial<Omit<Marca, 'id' | 'createdAt'>> }) =>
      updateMarca(data.id, data.marca),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marcas.all });
    },
  });
}

export function useDeleteMarca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMarca(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marcas.all });
    },
  });
}

// ==========================================
// FORNECEDORES HOOKS
// ==========================================

export function useFornecedores(status?: Status) {
  return useQuery({
    queryKey: queryKeys.fornecedores.list(status),
    queryFn: () => getFornecedores(status),
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Fornecedor, 'id' | 'createdAt'>) => createFornecedor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fornecedores.all });
    },
  });
}

export function useUpdateFornecedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; fornecedor: Partial<Omit<Fornecedor, 'id' | 'createdAt'>> }) =>
      updateFornecedor(data.id, data.fornecedor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.fornecedores.all });
    },
  });
}

// ==========================================
// TROCAS HOOKS
// ==========================================

export function useTrocas(filtros?: {
  dataInicio?: Date;
  dataFim?: Date;
  status?: string;
  tipo?: 'troca' | 'devolucao';
}) {
  return useQuery({
    queryKey: queryKeys.trocas.list(filtros as Record<string, unknown>),
    queryFn: () => getTrocas(filtros),
  });
}

export function useCriarTroca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Troca, 'id' | 'createdAt' | 'status'>) => criarTroca(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trocas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
    },
  });
}

export function useAprovarTroca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { trocaId: string; usuarioId: string }) =>
      aprovarTroca(data.trocaId, data.usuarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trocas.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
    },
  });
}

export function useRecusarTroca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { trocaId: string; motivo: string }) =>
      recusarTroca(data.trocaId, data.motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trocas.all });
    },
  });
}

// ==========================================
// ESTOQUE HOOKS
// ==========================================

export function useMovimentosEstoque(filtros?: {
  dataInicio?: Date;
  dataFim?: Date;
  tipo?: string;
  variacaoId?: string;
}) {
  return useQuery({
    queryKey: queryKeys.estoque.movimentos(filtros as Record<string, unknown>),
    queryFn: () => getMovimentosEstoque(filtros as Parameters<typeof getMovimentosEstoque>[0]),
  });
}

export function useDarEntradaEstoque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: darEntradaEstoque,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.estoque.all });
    },
  });
}

export function useDarSaidaEstoque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: darSaidaEstoque,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.produtos.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.estoque.all });
    },
  });
}
