// Schemas de validação Zod para o Boutique Manager

import { z } from 'zod';

// ==========================================
// HELPERS DE VALIDAÇÃO
// ==========================================

const telefoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;

// Mensagens de erro padrão
const messages = {
  required: 'Campo obrigatório',
  email: 'Email inválido',
  telefone: 'Telefone inválido. Use o formato (XX) XXXXX-XXXX',
  cpf: 'CPF inválido. Use o formato XXX.XXX.XXX-XX',
  cnpj: 'CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX',
  min: (min: number) => `Mínimo de ${min} caracteres`,
  max: (max: number) => `Máximo de ${max} caracteres`,
  positive: 'Valor deve ser positivo',
  integer: 'Valor deve ser um número inteiro',
  minValue: (min: number) => `Valor mínimo: ${min}`,
  maxValue: (max: number) => `Valor máximo: ${max}`,
};

// ==========================================
// SCHEMAS DE AUTENTICAÇÃO
// ==========================================

export const loginSchema = z.object({
  email: z.string({ message: messages.required }).email(messages.email).trim().toLowerCase(),
  password: z.string({ message: messages.required }).min(6, messages.min(6)),
});

export const signUpSchema = z.object({
  nome: z
    .string({ message: messages.required })
    .min(3, messages.min(3))
    .max(100, messages.max(100))
    .trim(),
  email: z.string({ message: messages.required }).email(messages.email).trim().toLowerCase(),
  password: z.string({ message: messages.required }).min(6, messages.min(6)),
  confirmPassword: z.string({ message: messages.required }),
  perfil: z.enum(['admin', 'gerente', 'vendedor'], {
    message: messages.required,
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;

// ==========================================
// SCHEMAS DE PRODUTO
// ==========================================

export const variacaoSchema = z.object({
  id: z.string(),
  sku: z.string().optional(),
  codigoBarras: z.string().optional(),
  tamanho: z.string({ message: messages.required }),
  cor: z.string({ message: messages.required }),
  estoque: z.number().int(messages.integer).min(0, messages.minValue(0)).default(0),
});

export const produtoSchema = z.object({
  sku: z
    .string({ message: messages.required })
    .min(2, messages.min(2))
    .max(50, messages.max(50))
    .trim(),
  codigoBarras: z.string().optional(),
  nome: z
    .string({ message: messages.required })
    .min(3, messages.min(3))
    .max(200, messages.max(200))
    .trim(),
  descricao: z.string().max(500, messages.max(500)).optional(),
  categoriaId: z.string().optional(),
  categoriaNome: z.string().optional(),
  marcaId: z.string().optional(),
  marca: z.string().optional(),
  fornecedorId: z.string().optional(),
  precoCusto: z.number().min(0, messages.minValue(0)).optional(),
  custo: z.number().min(0, messages.minValue(0)).optional(),
  precoVenda: z.number({ message: messages.required }).positive(messages.positive),
  estoqueMinimo: z.number().int(messages.integer).min(0, messages.minValue(0)).default(3),
  variacoes: z.array(variacaoSchema).min(1, 'Adicione pelo menos uma variação'),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
  fotoUrl: z.string().url().optional().or(z.literal('')),
});

export type ProdutoFormData = z.infer<typeof produtoSchema>;
export type VariacaoFormData = z.infer<typeof variacaoSchema>;

// ==========================================
// SCHEMAS DE CLIENTE
// ==========================================

export const clienteSchema = z.object({
  nome: z
    .string({ message: messages.required })
    .min(3, messages.min(3))
    .max(200, messages.max(200))
    .trim(),
  telefone: z
    .string()
    .regex(telefoneRegex, messages.telefone)
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email(messages.email)
    .trim()
    .toLowerCase()
    .optional()
    .or(z.literal('')),
  cpf: z
    .string()
    .regex(cpfRegex, messages.cpf)
    .optional()
    .or(z.literal('')),
  dataNascimento: z.date().optional().or(z.string().optional()),
  endereco: z.string().max(300, messages.max(300)).optional(),
  observacoes: z.string().max(500, messages.max(500)).optional(),
  aceiteLgpd: z.boolean().default(false),
  aceiteMarketing: z.boolean().default(false),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
});

export type ClienteFormData = z.infer<typeof clienteSchema>;

// ==========================================
// SCHEMAS DE VENDA
// ==========================================

export const itemVendaSchema = z.object({
  produtoId: z.string({ message: messages.required }),
  variacaoId: z.string({ message: messages.required }),
  quantidade: z.number().int(messages.integer).positive(messages.positive),
  precoUnitario: z.number().positive(messages.positive),
  precoOriginal: z.number().positive(messages.positive).optional(),
  custoUnitario: z.number().min(0).optional(),
  desconto: z.number().min(0).max(100).optional(),
  subtotal: z.number().positive(messages.positive),
});

export const pagamentoSchema = z.object({
  forma: z.enum([
    'dinheiro',
    'pix',
    'cartao_credito',
    'cartao_debito',
    'credito',
    'debito',
    'crediario',
    'credito_loja',
  ]),
  valor: z.number().positive(messages.positive),
  troco: z.number().min(0).optional(),
  creditoClienteId: z.string().optional(),
  bandeira: z.string().optional(),
  nsu: z.string().optional(),
});

export const vendaSchema = z.object({
  clienteId: z.string().optional(),
  caixaId: z.string({ message: 'Caixa é obrigatório' }),
  itens: z.array(itemVendaSchema).min(1, 'Adicione pelo menos um item'),
  pagamentos: z.array(pagamentoSchema).min(1, 'Adicione pelo menos um pagamento'),
  descontoTipo: z.enum(['percentual', 'valor']).optional(),
  descontoValor: z.number().min(0).optional(),
  observacao: z.string().max(500, messages.max(500)).optional(),
});

export type ItemVendaFormData = z.infer<typeof itemVendaSchema>;
export type PagamentoFormData = z.infer<typeof pagamentoSchema>;
export type VendaFormData = z.infer<typeof vendaSchema>;

// ==========================================
// SCHEMAS DE CAIXA
// ==========================================

export const abrirCaixaSchema = z.object({
  saldoInicial: z.number({ message: messages.required }).min(0, messages.minValue(0)),
});

export const fecharCaixaSchema = z.object({
  saldoConferido: z.number({ message: messages.required }).min(0, messages.minValue(0)),
  observacao: z.string().max(500, messages.max(500)).optional(),
});

export const sangriaSuprimentoSchema = z.object({
  valor: z.number({ message: messages.required }).positive(messages.positive),
  motivo: z.string({ message: messages.required }).min(3, messages.min(3)).max(200, messages.max(200)),
});

export type AbrirCaixaFormData = z.infer<typeof abrirCaixaSchema>;
export type FecharCaixaFormData = z.infer<typeof fecharCaixaSchema>;
export type SangriaSuprimentoFormData = z.infer<typeof sangriaSuprimentoSchema>;

// ==========================================
// SCHEMAS DE ESTOQUE
// ==========================================

export const movimentoEstoqueSchema = z.object({
  variacaoId: z.string({ message: messages.required }),
  tipo: z.enum(['entrada', 'saida', 'ajuste']),
  motivo: z.enum([
    'compra',
    'venda',
    'troca',
    'perda',
    'ajuste_inventario',
    'devolucao',
  ]),
  quantidade: z.number().int(messages.integer).positive(messages.positive),
  observacao: z.string().max(500, messages.max(500)).optional(),
});

export type MovimentoEstoqueFormData = z.infer<typeof movimentoEstoqueSchema>;

// ==========================================
// SCHEMAS DE CATEGORIA/MARCA/FORNECEDOR
// ==========================================

export const categoriaSchema = z.object({
  nome: z
    .string({ message: messages.required })
    .min(2, messages.min(2))
    .max(100, messages.max(100))
    .trim(),
  descricao: z.string().max(300, messages.max(300)).optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
});

export const marcaSchema = z.object({
  nome: z
    .string({ message: messages.required })
    .min(2, messages.min(2))
    .max(100, messages.max(100))
    .trim(),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
});

export const fornecedorSchema = z.object({
  nome: z
    .string({ message: messages.required })
    .min(3, messages.min(3))
    .max(200, messages.max(200))
    .trim(),
  telefone: z
    .string()
    .regex(telefoneRegex, messages.telefone)
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email(messages.email)
    .trim()
    .toLowerCase()
    .optional()
    .or(z.literal('')),
  cnpj: z
    .string()
    .regex(cnpjRegex, messages.cnpj)
    .optional()
    .or(z.literal('')),
  endereco: z.string().max(300, messages.max(300)).optional(),
  observacoes: z.string().max(500, messages.max(500)).optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
});

export type CategoriaFormData = z.infer<typeof categoriaSchema>;
export type MarcaFormData = z.infer<typeof marcaSchema>;
export type FornecedorFormData = z.infer<typeof fornecedorSchema>;

// ==========================================
// SCHEMAS DE TROCA/DEVOLUÇÃO
// ==========================================

export const trocaItemSchema = z.object({
  produtoId: z.string({ message: messages.required }),
  variacaoId: z.string({ message: messages.required }),
  quantidade: z.number().int(messages.integer).positive(messages.positive),
  valorUnitario: z.number().positive(messages.positive),
  retornaEstoque: z.boolean().default(true),
});

export const trocaSchema = z.object({
  vendaOriginalId: z.string({ message: messages.required }),
  clienteId: z.string().optional(),
  tipo: z.enum(['troca', 'devolucao']),
  motivo: z.enum(['defeito', 'tamanho', 'cor', 'arrependimento', 'outro']),
  motivoDetalhe: z.string().max(500, messages.max(500)).optional(),
  itens: z.array(trocaItemSchema).min(1, 'Selecione pelo menos um item'),
});

export type TrocaItemFormData = z.infer<typeof trocaItemSchema>;
export type TrocaFormData = z.infer<typeof trocaSchema>;

// ==========================================
// SCHEMAS DE DESPESA
// ==========================================

export const despesaSchema = z.object({
  descricao: z
    .string({ message: messages.required })
    .min(3, messages.min(3))
    .max(200, messages.max(200))
    .trim(),
  categoria: z.enum([
    'aluguel',
    'luz',
    'agua',
    'internet',
    'embalagem',
    'frete',
    'marketing',
    'salarios',
    'outros',
  ]),
  valor: z.number({ message: messages.required }).positive(messages.positive),
  dataVencimento: z.date().optional().or(z.string().optional()),
  dataPagamento: z.date().optional().or(z.string().optional()),
  formaPagamento: z
    .enum([
      'dinheiro',
      'pix',
      'cartao_credito',
      'cartao_debito',
      'credito',
      'debito',
      'crediario',
      'credito_loja',
    ])
    .optional(),
  status: z.enum(['pendente', 'pago']).default('pendente'),
});

export type DespesaFormData = z.infer<typeof despesaSchema>;

// ==========================================
// SCHEMAS DE CONFIGURAÇÕES
// ==========================================

export const configuracaoSchema = z.object({
  nomeEmpresa: z.string().min(2, messages.min(2)).max(200, messages.max(200)).optional(),
  cnpj: z.string().regex(cnpjRegex, messages.cnpj).optional().or(z.literal('')),
  endereco: z.string().max(300, messages.max(300)).optional(),
  telefone: z.string().regex(telefoneRegex, messages.telefone).optional().or(z.literal('')),
  email: z.string().email(messages.email).optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  estoqueMinimoPadrao: z.number().int().min(0).default(3),
  diasValidadeCredito: z.number().int().min(1).default(90),
});

export type ConfiguracaoFormData = z.infer<typeof configuracaoSchema>;
