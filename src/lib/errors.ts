// Sistema de erros customizados do Boutique Manager

// ==========================================
// CLASSE BASE DE ERRO
// ==========================================

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 400,
    isOperational: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ==========================================
// ERROS DE AUTENTICAÇÃO
// ==========================================

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code, 401);
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message: string = 'Você não está autenticado') {
    super(message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Você não tem permissão para realizar esta ação') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class SessionExpiredError extends AuthError {
  constructor() {
    super('Sua sessão expirou. Faça login novamente.', 'SESSION_EXPIRED');
  }
}

// ==========================================
// ERROS DE VALIDAÇÃO
// ==========================================

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(message: string, errors: Record<string, string[]> = {}) {
    super(message, 'VALIDATION_ERROR', 400);
    this.errors = errors;
  }
}

export class RequiredFieldError extends ValidationError {
  constructor(field: string) {
    super(`O campo ${field} é obrigatório`, { [field]: ['Campo obrigatório'] });
  }
}

export class InvalidFormatError extends ValidationError {
  constructor(field: string, expectedFormat: string) {
    super(`O campo ${field} está em formato inválido. Esperado: ${expectedFormat}`, {
      [field]: [`Formato esperado: ${expectedFormat}`],
    });
  }
}

// ==========================================
// ERROS DE RECURSOS
// ==========================================

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} não encontrado(a): ${identifier}`
      : `${resource} não encontrado(a)`;
    super(message, 'NOT_FOUND', 404);
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string, field: string) {
    super(`Já existe ${resource} com este ${field}`, 'DUPLICATE', 409);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

// ==========================================
// ERROS DE ESTOQUE
// ==========================================

export class EstoqueInsuficienteError extends AppError {
  public readonly produtoId: string;
  public readonly variacaoId: string;
  public readonly estoqueAtual: number;
  public readonly quantidadeSolicitada: number;

  constructor(
    produtoId: string,
    variacaoId: string,
    estoqueAtual: number,
    quantidadeSolicitada: number
  ) {
    const message = `Estoque insuficiente. Disponível: ${estoqueAtual}, Solicitado: ${quantidadeSolicitada}`;
    super(message, 'ESTOQUE_INSUFICIENTE', 400);
    this.produtoId = produtoId;
    this.variacaoId = variacaoId;
    this.estoqueAtual = estoqueAtual;
    this.quantidadeSolicitada = quantidadeSolicitada;
  }
}

export class EstoqueNegativoError extends AppError {
  constructor() {
    super('Estoque não pode ficar negativo', 'ESTOQUE_NEGATIVO', 400);
  }
}

// ==========================================
// ERROS DE CAIXA
// ==========================================

export class CaixaNaoAbertoError extends AppError {
  constructor() {
    super('Não há caixa aberto. Abra o caixa antes de continuar.', 'CAIXA_NAO_ABERTO', 400);
  }
}

export class CaixaJaAbertoError extends AppError {
  constructor() {
    super('Já existe um caixa aberto para este usuário', 'CAIXA_JA_ABERTO', 400);
  }
}

export class CaixaFechadoError extends AppError {
  constructor() {
    super('Este caixa já foi fechado', 'CAIXA_FECHADO', 400);
  }
}

// ==========================================
// ERROS DE VENDA
// ==========================================

export class VendaSemItensError extends AppError {
  constructor() {
    super('A venda precisa ter pelo menos um item', 'VENDA_SEM_ITENS', 400);
  }
}

export class VendaSemPagamentoError extends AppError {
  constructor() {
    super('A venda precisa ter pelo menos um pagamento', 'VENDA_SEM_PAGAMENTO', 400);
  }
}

export class PagamentoInsuficienteError extends AppError {
  public readonly totalVenda: number;
  public readonly totalPago: number;

  constructor(totalVenda: number, totalPago: number) {
    const faltante = totalVenda - totalPago;
    super(
      `Valor pago insuficiente. Faltam R$ ${faltante.toFixed(2)}`,
      'PAGAMENTO_INSUFICIENTE',
      400
    );
    this.totalVenda = totalVenda;
    this.totalPago = totalPago;
  }
}

export class VendaCanceladaError extends AppError {
  constructor() {
    super('Esta venda já foi cancelada', 'VENDA_CANCELADA', 400);
  }
}

export class DescontoNaoPermitidoError extends AppError {
  public readonly descontoSolicitado: number;
  public readonly limitePermitido: number;

  constructor(descontoSolicitado: number, limitePermitido: number) {
    super(
      `Desconto não permitido. Você pode aplicar até ${limitePermitido}%`,
      'DESCONTO_NAO_PERMITIDO',
      403
    );
    this.descontoSolicitado = descontoSolicitado;
    this.limitePermitido = limitePermitido;
  }
}

// ==========================================
// ERROS DE CLIENTE
// ==========================================

export class CreditoInsuficienteError extends AppError {
  public readonly creditoDisponivel: number;
  public readonly valorSolicitado: number;

  constructor(creditoDisponivel: number, valorSolicitado: number) {
    super(
      `Crédito insuficiente. Disponível: R$ ${creditoDisponivel.toFixed(2)}`,
      'CREDITO_INSUFICIENTE',
      400
    );
    this.creditoDisponivel = creditoDisponivel;
    this.valorSolicitado = valorSolicitado;
  }
}

export class CreditoExpiradoError extends AppError {
  constructor() {
    super('Este crédito está expirado', 'CREDITO_EXPIRADO', 400);
  }
}

// ==========================================
// ERROS DE REDE/FIREBASE
// ==========================================

export class NetworkError extends AppError {
  constructor(message: string = 'Erro de conexão. Verifique sua internet.') {
    super(message, 'NETWORK_ERROR', 503, true);
  }
}

export class FirebaseError extends AppError {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message, 'FIREBASE_ERROR', 500);
    this.originalError = originalError;
  }
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Verifica se o erro é um erro operacional (esperado)
 */
export function isOperationalError(error: unknown): boolean {
  return error instanceof AppError && error.isOperational;
}

/**
 * Converte erros do Firebase para erros da aplicação
 */
export function handleFirebaseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const firebaseError = error as { code?: string; message?: string };
  const code = firebaseError.code || 'unknown';
  const message = firebaseError.message || 'Erro desconhecido';

  // Mapear códigos de erro do Firebase
  const errorMap: Record<string, () => AppError> = {
    'auth/user-not-found': () => new AuthError('Usuário não encontrado', 'USER_NOT_FOUND'),
    'auth/wrong-password': () => new AuthError('Senha incorreta', 'WRONG_PASSWORD'),
    'auth/email-already-in-use': () => new DuplicateError('usuário', 'email'),
    'auth/weak-password': () => new ValidationError('A senha deve ter pelo menos 6 caracteres'),
    'auth/invalid-email': () => new ValidationError('Email inválido'),
    'auth/too-many-requests': () =>
      new AppError('Muitas tentativas. Aguarde um momento.', 'TOO_MANY_REQUESTS', 429),
    'permission-denied': () => new ForbiddenError(),
    'not-found': () => new NotFoundError('Recurso'),
    unavailable: () => new NetworkError(),
  };

  const errorFactory = errorMap[code];
  if (errorFactory) {
    return errorFactory();
  }

  return new FirebaseError(message, error instanceof Error ? error : undefined);
}

/**
 * Extrai mensagem amigável de qualquer erro
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}

/**
 * Logger de erros para desenvolvimento/produção
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error instanceof AppError
              ? { code: error.code, statusCode: error.statusCode }
              : {}),
          }
        : error,
    context,
  };

  // Em desenvolvimento, log no console
  if (process.env.NODE_ENV === 'development') {
    console.error('[AppError]', errorInfo);
  }

  // Em produção, enviar para serviço de monitoramento (Sentry, etc)
  // TODO: Integrar com Sentry ou similar
}
