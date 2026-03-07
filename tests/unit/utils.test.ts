// Testes Unitários - Funções utilitárias

import {
  formatCurrency,
  formatarMoeda,
  parseMoeda,
  formatDate,
  formatCPF,
  formatCNPJ,
  formatPhone,
  calcularMargem,
  calcularTroco,
  validarCPF,
  validarCNPJ,
  validarEmail,
  groupBy,
  sumBy,
  sortBy,
  uniqueBy,
  debounce,
  capitalize,
  truncate,
  generateId,
} from '@/lib/utils';

describe('Formatação de Moeda', () => {
  test('formatCurrency formata valores corretamente', () => {
    // Usa regex para lidar com espaço normal (U+0020) ou non-breaking (U+00A0)
    expect(formatCurrency(100)).toMatch(/R\$\s*100,00/);
    expect(formatCurrency(1234.56)).toMatch(/R\$\s*1\.234,56/);
    expect(formatCurrency(0)).toMatch(/R\$\s*0,00/);
  });

  test('formatarMoeda formata input corretamente', () => {
    expect(formatarMoeda('1234')).toBe('12,34');
    expect(formatarMoeda('100')).toBe('1,00');
    expect(formatarMoeda('')).toBe('0,00');
  });

  test('parseMoeda converte string para número', () => {
    expect(parseMoeda('12,34')).toBe(12.34);
    expect(parseMoeda('1.234,56')).toBe(1234.56);
    expect(parseMoeda('')).toBe(0);
  });
});

describe('Formatação de Datas', () => {
  test('formatDate formata datas corretamente', () => {
    const date = new Date(2024, 0, 15); // Usa construtor com mês/ano para evitar timezone
    expect(formatDate(date)).toMatch(/15\/01\/2024/);
  });

  test('formatDate lida com null/undefined', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });
});

describe('Formatação de Documentos', () => {
  test('formatCPF formata CPF corretamente', () => {
    expect(formatCPF('12345678900')).toBe('123.456.789-00');
    expect(formatCPF('123.456.789-00')).toBe('123.456.789-00');
  });

  test('formatCNPJ formata CNPJ corretamente', () => {
    expect(formatCNPJ('12345678000199')).toBe('12.345.678/0001-99');
  });

  test('formatPhone formata telefone corretamente', () => {
    expect(formatPhone('11999998888')).toBe('(11) 99999-8888');
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444');
  });
});

describe('Cálculos Comerciais', () => {
  test('calcularMargem calcula margem de lucro', () => {
    expect(calcularMargem(60, 100)).toBe(40);
    expect(calcularMargem(100, 100)).toBe(0);
    expect(calcularMargem(50, 100)).toBe(50);
  });

  test('calcularTroco calcula troco corretamente', () => {
    expect(calcularTroco(100, 50)).toBe(50);
    expect(calcularTroco(100, 100)).toBe(0);
    expect(calcularTroco(50, 100)).toBe(0); // valorPago < valorTotal retorna 0
  });
});

describe('Validações', () => {
  test('validarCPF valida CPFs corretamente', () => {
    expect(validarCPF('52998224725')).toBe(true);
    expect(validarCPF('11111111111')).toBe(false);
    expect(validarCPF('12345678900')).toBe(false);
    expect(validarCPF('')).toBe(false);
  });

  test('validarCNPJ valida CNPJs corretamente', () => {
    expect(validarCNPJ('11222333000181')).toBe(true);
    expect(validarCNPJ('11111111111111')).toBe(false);
    expect(validarCNPJ('')).toBe(false);
  });

  test('validarEmail valida emails corretamente', () => {
    expect(validarEmail('test@example.com')).toBe(true);
    expect(validarEmail('test@')).toBe(false);
    expect(validarEmail('')).toBe(false);
  });
});

describe('Utilitários de Array', () => {
  const items = [
    { id: 1, categoria: 'A', valor: 10 },
    { id: 2, categoria: 'B', valor: 20 },
    { id: 3, categoria: 'A', valor: 30 },
  ];

  test('groupBy agrupa itens por chave', () => {
    const grouped = groupBy(items, 'categoria');
    expect(grouped['A']).toHaveLength(2);
    expect(grouped['B']).toHaveLength(1);
  });

  test('sumBy soma valores por propriedade', () => {
    expect(sumBy(items, 'valor')).toBe(60);
  });

  test('sortBy ordena por propriedade', () => {
    const sorted = sortBy(items, 'valor', 'desc');
    expect(sorted[0].valor).toBe(30);
    expect(sorted[2].valor).toBe(10);
  });

  test('uniqueBy remove duplicatas por chave', () => {
    const unique = uniqueBy(items, 'categoria');
    expect(unique).toHaveLength(2);
  });
});

describe('Utilitários de String', () => {
  test('capitalize capitaliza primeira letra', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('')).toBe('');
  });

  test('truncate corta texto', () => {
    expect(truncate('Hello World', 5)).toBe('He...');
    expect(truncate('Hi', 10)).toBe('Hi');
  });
});

describe('Utilitários Gerais', () => {
  test('generateId gera ID único', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1.length).toBeGreaterThan(10);
  });

  test('debounce atrasa execução', async () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn('a');
    debouncedFn('b');
    debouncedFn('c');

    expect(mockFn).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('c');
  });
});
