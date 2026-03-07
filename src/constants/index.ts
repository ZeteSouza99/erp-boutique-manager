// Constantes do sistema Boutique Manager

// ==========================================
// FORMAS DE PAGAMENTO
// ==========================================

export const FORMAS_PAGAMENTO = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  credito: 'Crédito',
  debito: 'Débito',
  crediario: 'Crediário',
  credito_loja: 'Crédito da Loja',
} as const;

export const FORMAS_PAGAMENTO_OPTIONS = Object.entries(FORMAS_PAGAMENTO).map(
  ([value, label]) => ({ value, label })
);

// ==========================================
// STATUS
// ==========================================

export const STATUS = {
  ativo: 'Ativo',
  inativo: 'Inativo',
} as const;

export const STATUS_VENDA = {
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
} as const;

export const STATUS_CAIXA = {
  aberto: 'Aberto',
  fechado: 'Fechado',
} as const;

export const STATUS_CREDITO = {
  ativo: 'Ativo',
  utilizado: 'Utilizado',
  expirado: 'Expirado',
} as const;

export const STATUS_DESPESA = {
  pendente: 'Pendente',
  pago: 'Pago',
} as const;

// ==========================================
// PERFIS DE USUÁRIO
// ==========================================

export const PERFIS_USUARIO = {
  admin: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
} as const;

// Limites de desconto por perfil (em percentual)
export const DESCONTO_LIMITES = {
  admin: 100,
  gerente: 20,
  vendedor: 10,
} as const;

// ==========================================
// TIPOS DE MOVIMENTAÇÃO
// ==========================================

export const TIPO_MOVIMENTO_ESTOQUE = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
} as const;

export const MOTIVO_MOVIMENTO_ESTOQUE = {
  compra: 'Compra',
  venda: 'Venda',
  troca: 'Troca',
  perda: 'Perda',
  ajuste_inventario: 'Ajuste de Inventário',
  devolucao: 'Devolução',
} as const;

export const TIPO_MOVIMENTO_CAIXA = {
  abertura: 'Abertura',
  venda: 'Venda',
  sangria: 'Sangria',
  suprimento: 'Suprimento',
  fechamento: 'Fechamento',
} as const;

// ==========================================
// TROCAS E DEVOLUÇÕES
// ==========================================

export const TIPO_TROCA = {
  troca: 'Troca',
  devolucao: 'Devolução',
} as const;

export const MOTIVO_TROCA = {
  defeito: 'Defeito',
  tamanho: 'Tamanho Incorreto',
  cor: 'Cor Diferente',
  arrependimento: 'Arrependimento',
  outro: 'Outro',
} as const;

export const ORIGEM_CREDITO = {
  troca: 'Troca',
  devolucao: 'Devolução',
  promocao: 'Promoção',
} as const;

// ==========================================
// CATEGORIAS DE DESPESA
// ==========================================

export const CATEGORIA_DESPESA = {
  aluguel: 'Aluguel',
  luz: 'Luz',
  agua: 'Água',
  internet: 'Internet',
  embalagem: 'Embalagem',
  frete: 'Frete',
  marketing: 'Marketing',
  salarios: 'Salários',
  outros: 'Outros',
} as const;

export const CATEGORIA_DESPESA_OPTIONS = Object.entries(CATEGORIA_DESPESA).map(
  ([value, label]) => ({ value, label })
);

// ==========================================
// TIPO DE DESCONTO
// ==========================================

export const TIPO_DESCONTO = {
  percentual: 'Percentual (%)',
  valor: 'Valor (R$)',
} as const;

// ==========================================
// CONFIGURAÇÕES PADRÃO
// ==========================================

export const CONFIG = {
  ESTOQUE_MINIMO_PADRAO: 3,
  ITENS_POR_PAGINA: 20,
  DIAS_VALIDADE_CREDITO: 90,
  TIMEOUT_BUSCA_MS: 300,
  MAX_ITENS_AUTOCOMPLETE: 10,
} as const;

// ==========================================
// COLLECTIONS DO FIREBASE
// ==========================================

export const COLLECTIONS = {
  USUARIOS: 'usuarios',
  PRODUTOS: 'produtos',
  CATEGORIAS: 'categorias',
  MARCAS: 'marcas',
  FORNECEDORES: 'fornecedores',
  CLIENTES: 'clientes',
  VENDAS: 'vendas',
  VENDA_ITENS: 'vendaItens',
  PAGAMENTOS: 'pagamentos',
  CAIXAS: 'caixas',
  CAIXA_MOVIMENTOS: 'caixaMovimentos',
  ESTOQUE_MOVIMENTOS: 'estoqueMovimentos',
  TROCAS: 'trocas',
  TROCA_ITENS: 'trocaItens',
  CREDITOS_CLIENTE: 'creditosCliente',
  DESPESAS: 'despesas',
  CONFIGURACOES: 'configuracoes',
  LOGS_AUDITORIA: 'logsAuditoria',
} as const;

// ==========================================
// CORES PARA BADGES/STATUS
// ==========================================

export const BADGE_COLORS = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-800',
} as const;

export const STATUS_COLORS = {
  ativo: BADGE_COLORS.success,
  inativo: BADGE_COLORS.neutral,
  finalizada: BADGE_COLORS.success,
  cancelada: BADGE_COLORS.danger,
  aberto: BADGE_COLORS.success,
  fechado: BADGE_COLORS.neutral,
  pendente: BADGE_COLORS.warning,
  pago: BADGE_COLORS.success,
  utilizado: BADGE_COLORS.info,
  expirado: BADGE_COLORS.danger,
} as const;
