// Testes Unitários - Schemas de Validação Zod

import {
  produtoSchema,
  loginSchema,
  clienteSchema,
  abrirCaixaSchema,
  fecharCaixaSchema,
  categoriaSchema,
} from '@/lib/validations';

describe('Schema de Login', () => {
  test('valida login correto', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '123456',
    });
    expect(result.success).toBe(true);
  });

  test('rejeita email inválido', () => {
    const result = loginSchema.safeParse({
      email: 'invalid-email',
      password: '123456',
    });
    expect(result.success).toBe(false);
  });

  test('rejeita senha curta', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '123',
    });
    expect(result.success).toBe(false);
  });
});

describe('Schema de Produto', () => {
  const produtoValido = {
    nome: 'Camiseta Básica',
    sku: 'CAM-001',
    categoriaId: 'cat-123',
    precoCusto: 25.00,
    precoVenda: 50.00,
    variacoes: [
      { id: 'var-1', tamanho: 'M', cor: 'Preto', estoque: 10, estoqueMinimo: 2, sku: 'CAM-001-M-PT' }
    ],
  };

  test('valida produto correto', () => {
    const result = produtoSchema.safeParse(produtoValido);
    expect(result.success).toBe(true);
  });

  test('rejeita nome muito curto', () => {
    const result = produtoSchema.safeParse({
      ...produtoValido,
      nome: 'AB',
    });
    expect(result.success).toBe(false);
  });

  test('rejeita preço negativo', () => {
    const result = produtoSchema.safeParse({
      ...produtoValido,
      precoCusto: -10,
    });
    expect(result.success).toBe(false);
  });

  test('rejeita produto sem variações', () => {
    const result = produtoSchema.safeParse({
      ...produtoValido,
      variacoes: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('Schema de Cliente', () => {
  const clienteValido = {
    nome: 'João Silva',
    telefone: '(11) 99999-8888',
    email: 'joao@email.com',
  };

  test('valida cliente correto', () => {
    const result = clienteSchema.safeParse(clienteValido);
    expect(result.success).toBe(true);
  });

  test('valida cliente sem email', () => {
    const result = clienteSchema.safeParse({
      nome: 'João Silva',
      telefone: '(11) 99999-8888',
    });
    expect(result.success).toBe(true);
  });

  test('rejeita nome muito curto', () => {
    const result = clienteSchema.safeParse({
      ...clienteValido,
      nome: 'AB',
    });
    expect(result.success).toBe(false);
  });

  test('rejeita email inválido', () => {
    const result = clienteSchema.safeParse({
      ...clienteValido,
      email: 'email-invalido',
    });
    expect(result.success).toBe(false);
  });
});

describe('Schema de Caixa', () => {
  test('valida abertura de caixa', () => {
    const result = abrirCaixaSchema.safeParse({
      saldoInicial: 100,
    });
    expect(result.success).toBe(true);
  });

  test('rejeita saldo inicial negativo', () => {
    const result = abrirCaixaSchema.safeParse({
      saldoInicial: -50,
    });
    expect(result.success).toBe(false);
  });

  test('valida fechamento de caixa', () => {
    const result = fecharCaixaSchema.safeParse({
      saldoConferido: 500,
      observacao: 'Fechamento normal',
    });
    expect(result.success).toBe(true);
  });
});

describe('Schema de Categoria', () => {
  test('valida categoria correta', () => {
    const result = categoriaSchema.safeParse({
      nome: 'Camisetas',
      descricao: 'Camisetas em geral',
    });
    expect(result.success).toBe(true);
  });

  test('rejeita nome muito curto', () => {
    const result = categoriaSchema.safeParse({
      nome: 'A',
    });
    expect(result.success).toBe(false);
  });
});
