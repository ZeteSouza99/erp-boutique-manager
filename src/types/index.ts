// Tipos base do sistema Boutique Manager

// ==========================================
// TIPOS BASE
// ==========================================

export type Status = 'ativo' | 'inativo';

export type PerfilUsuario = 'admin' | 'gerente' | 'vendedor';

export type FormaPagamento = 
  | 'dinheiro' 
  | 'pix' 
  | 'cartao_credito' 
  | 'cartao_debito' 
  | 'credito'
  | 'debito'
  | 'crediario' 
  | 'credito_loja';

export type TipoMovimentoEstoque = 'entrada' | 'saida' | 'ajuste';

export type MotivoMovimentoEstoque = 
  | 'compra' 
  | 'venda' 
  | 'troca' 
  | 'perda' 
  | 'ajuste_inventario' 
  | 'devolucao';

export type StatusVenda = 'finalizada' | 'cancelada';

export type TipoDesconto = 'percentual' | 'valor';

export type TipoTroca = 'troca' | 'devolucao';

export type MotivoTroca = 
  | 'defeito' 
  | 'tamanho' 
  | 'cor' 
  | 'arrependimento' 
  | 'outro';

export type TipoMovimentoCaixa = 
  | 'abertura' 
  | 'venda' 
  | 'sangria' 
  | 'suprimento' 
  | 'fechamento';

export type StatusCaixa = 'aberto' | 'fechado';

export type StatusCredito = 'ativo' | 'utilizado' | 'expirado';

export type OrigemCredito = 'troca' | 'devolucao' | 'promocao';

export type CategoriaDespesa = 
  | 'aluguel' 
  | 'luz' 
  | 'agua' 
  | 'internet' 
  | 'embalagem' 
  | 'frete' 
  | 'marketing' 
  | 'salarios' 
  | 'outros';

export type StatusDespesa = 'pendente' | 'pago';

// ==========================================
// ENTIDADES
// ==========================================

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  telefone?: string;
  status: Status;
  ultimoAcesso?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
  status: Status;
  createdAt: Date;
}

export interface Marca {
  id: string;
  nome: string;
  status: Status;
  createdAt: Date;
}

export interface Fornecedor {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cnpj?: string;
  endereco?: string;
  observacoes?: string;
  status: Status;
  createdAt: Date;
}

export interface Produto {
  id?: string;
  sku: string; // Código interno
  codigoInterno?: string; // Para compatibilidade
  codigoBarras?: string;
  nome: string;
  descricao?: string;
  categoriaId?: string;
  categoriaNome?: string;
  marcaId?: string;
  marca?: string;
  fornecedorId?: string;
  precoCusto?: number;
  precoVenda: number;
  margem?: number;
  estoqueMinimo?: number;
  variacoes?: Variacao[];
  status?: Status;
  ativo?: boolean;
  fotoUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Variacao {
  id: string;
  sku?: string;
  codigoBarras?: string;
  tamanho: string;
  cor: string;
  estoque: number;
}

export interface EstoqueMovimento {
  id: string;
  variacaoId: string;
  tipo: TipoMovimentoEstoque;
  motivo: MotivoMovimentoEstoque;
  quantidade: number;
  estoqueAnterior: number;
  estoquePosterior: number;
  documentoRef?: string; // ID da venda, compra, etc
  observacao?: string;
  usuarioId: string;
  createdAt: Date;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  dataNascimento?: Date;
  endereco?: string;
  observacoes?: string; // Preferências, tamanhos
  aceiteLgpd: boolean;
  aceiteMarketing: boolean;
  totalCompras?: number;
  ultimaCompra?: Date;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditoCliente {
  id: string;
  clienteId: string;
  valorOriginal: number;
  valorUtilizado: number;
  valorDisponivel: number;
  origem: OrigemCredito;
  trocaId?: string;
  validade: Date;
  status: StatusCredito;
  createdAt: Date;
}

export interface Venda {
  id: string;
  numero: string; // Ex: 2026-00001
  clienteId?: string;
  clienteNome?: string;
  caixaId: string;
  usuarioId: string;
  usuarioNome?: string;
  subtotal: number;
  descontoTipo?: TipoDesconto;
  descontoValor?: number;
  desconto?: number;
  total: number;
  status: StatusVenda;
  cancelamentoMotivo?: string;
  cancelamentoData?: Date;
  cancelamentoUsuarioId?: string;
  observacao?: string;
  itens?: VendaItem[];
  pagamentos?: Pagamento[];
  createdAt: Date;
}

export interface VendaItem {
  id?: string;
  vendaId?: string;
  produtoId: string;
  variacaoId: string;
  quantidade: number;
  precoUnitario: number;
  precoOriginal?: number;
  custoUnitario?: number;
  desconto?: number;
  descontoItem?: number;
  subtotal: number;
  nomeProduto?: string;
  produtoNome?: string;
  variacaoDescricao?: string;
  sku?: string;
  tamanho?: string;
  cor?: string;
}

export interface Pagamento {
  id?: string;
  vendaId?: string;
  forma: FormaPagamento;
  valor: number;
  troco?: number;
  creditoClienteId?: string;
  bandeira?: string;
  nsu?: string;
  createdAt?: Date;
}

export interface Caixa {
  id: string;
  usuarioId: string;
  dataAbertura: Date;
  saldoInicial: number;
  dataFechamento?: Date;
  saldoEsperado?: number;
  saldoConferido?: number;
  diferenca?: number;
  observacaoFechamento?: string;
  status: StatusCaixa;
}

export interface CaixaMovimento {
  id: string;
  caixaId: string;
  tipo: TipoMovimentoCaixa;
  valor: number;
  formaPagamento?: FormaPagamento;
  motivo?: string;
  vendaId?: string;
  usuarioId: string;
  createdAt: Date;
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor: number;
  dataVencimento?: Date;
  dataPagamento?: Date;
  formaPagamento?: FormaPagamento;
  caixaId?: string;
  comprovanteUrl?: string;
  status: StatusDespesa;
  usuarioId: string;
  createdAt: Date;
}

export interface Troca {
  id: string;
  numero: string;
  vendaOriginalId: string;
  clienteId?: string;
  tipo: TipoTroca;
  motivo: MotivoTroca;
  motivoDetalhe?: string;
  valorDevolvido: number;
  novaVendaId?: string;
  creditoGeradoId?: string;
  diferencaPagar?: number;
  diferencaCredito?: number;
  usuarioId: string;
  createdAt: Date;
}

export interface TrocaItem {
  id: string;
  trocaId: string;
  produtoId: string;
  variacaoId: string;
  quantidade: number;
  valorUnitario: number;
  retornaEstoque: boolean;
}

export interface LogAuditoria {
  id: string;
  usuarioId: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  dadosAnteriores?: Record<string, unknown>;
  dadosNovos?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

export interface Configuracao {
  id: string;
  chave: string;
  valor: string;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  descricao?: string;
}

// ==========================================
// TIPOS AUXILIARES (para UI)
// ==========================================

export interface ProdutoComVariacoes extends Omit<Produto, 'marca'> {
  categoria?: Categoria;
  marca?: Marca | string;
}

export interface VendaCompleta extends Venda {
  itens: (VendaItem & { variacao?: Variacao; produto?: Produto })[];
  pagamentos: Pagamento[];
  cliente?: Cliente;
  usuario?: Usuario;
  clienteNome?: string;
  usuarioNome?: string;
  desconto?: number;
}

export interface ItemCarrinho {
  produtoId: string;
  variacaoId: string;
  nome?: string;
  nomeProduto?: string;
  sku?: string;
  tamanho?: string;
  cor?: string;
  quantidade: number;
  precoUnitario: number;
  precoOriginal?: number;
  custoUnitario?: number;
  desconto?: number;
  subtotal: number;
  estoqueDisponivel?: number;
}

export interface ResumoCaixa {
  totalVendas: number;
  quantidadeVendas: number;
  ticketMedio: number;
  porFormaPagamento: Record<FormaPagamento, number>;
  sangrias: number;
  suprimentos: number;
  saldoEsperado: number;
  saldoAtual: number;
  totalEntradas: number;
  totalSaidas: number;
  totalDinheiro: number;
  totalPix: number;
  totalCartaoCredito: number;
  totalCartaoDebito: number;
  totalSangrias: number;
  quantidadeSangrias: number;
}

export interface ResumoVendasPeriodo {
  totalVendas: number;
  totalVendasFinalizadas?: number;
  totalVendasCanceladas?: number;
  valorCancelado?: number;
  totalItens?: number;
  quantidadeVendas: number;
  ticketMedio: number;
  porFormaPagamento: Record<FormaPagamento, number>;
  vendasPorFormaPagamento?: Record<string, number>;
}

export interface AlertaEstoqueBaixo {
  produtoId: string;
  variacaoId: string;
  nomeProduto: string;
  tamanho?: string;
  cor?: string;
  estoqueAtual: number;
  estoqueMinimo: number;
}

export interface Aniversariante {
  clienteId: string;
  nome: string;
  telefone?: string;
  dataNascimento: Date;
  dia: number;
}

