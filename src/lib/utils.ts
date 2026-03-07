// Funções utilitárias centralizadas do Boutique Manager
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Timestamp } from 'firebase/firestore';

// ==========================================
// CSS/TAILWIND
// ==========================================

/**
 * Combina classes CSS com suporte a Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// FORMATAÇÃO DE MOEDA
// ==========================================

/**
 * Formata número para moeda brasileira (R$)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata número para moeda em input (sem R$)
 * Exemplo: 1234.56 -> "1.234,56"
 */
export function formatCurrencyInput(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata string de input de moeda enquanto digita
 * Remove caracteres não numéricos e formata
 */
export function formatarMoeda(valor: string): string {
  const numeros = valor.replace(/\D/g, '');
  const numero = parseInt(numeros || '0', 10) / 100;
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte string formatada de moeda para número
 * Exemplo: "1.234,56" -> 1234.56
 */
export function parseMoeda(valor: string): number {
  return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * Formata número como porcentagem
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ==========================================
// FORMATAÇÃO DE DATA/HORA
// ==========================================

/**
 * Formata data brasileira (dd/mm/aaaa)
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR').format(d);
}

/**
 * Formata data e hora brasileira
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

/**
 * Formata hora apenas (HH:mm)
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    timeStyle: 'short',
  }).format(d);
}

/**
 * Formata data relativa (há 2 dias, ontem, etc)
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Há ${Math.floor(diffDays / 30)} meses`;
  return `Há ${Math.floor(diffDays / 365)} anos`;
}

/**
 * Formata data para input HTML (yyyy-mm-dd)
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

// ==========================================
// FORMATAÇÃO DE DOCUMENTOS
// ==========================================

/**
 * Formata telefone brasileiro
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Formata CPF
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '-';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  return cpf;
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '-';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length === 14) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }
  return cnpj;
}

/**
 * Remove formatação de documento (CPF/CNPJ/Telefone)
 */
export function cleanDocument(doc: string): string {
  return doc.replace(/\D/g, '');
}

// ==========================================
// CÁLCULOS COMERCIAIS
// ==========================================

/**
 * Calcula margem de lucro percentual
 */
export function calcularMargem(custo: number, precoVenda: number): number {
  if (precoVenda <= 0) return 0;
  return ((precoVenda - custo) / precoVenda) * 100;
}

/**
 * Calcula preço de venda baseado em custo e margem desejada
 */
export function calcularPrecoVenda(custo: number, margemDesejada: number): number {
  if (margemDesejada >= 100) return custo * 10; // Evita divisão por zero
  return custo / (1 - margemDesejada / 100);
}

/**
 * Calcula lucro bruto
 */
export function calcularLucroBruto(custo: number, precoVenda: number, quantidade: number = 1): number {
  return (precoVenda - custo) * quantidade;
}

/**
 * Aplica desconto percentual
 */
export function aplicarDescontoPercentual(valor: number, percentual: number): number {
  return valor * (1 - percentual / 100);
}

/**
 * Calcula troco
 */
export function calcularTroco(valorPago: number, valorTotal: number): number {
  return Math.max(0, valorPago - valorTotal);
}

// ==========================================
// GERAÇÃO DE IDs E CÓDIGOS
// ==========================================

/**
 * Gera ID único simples (para uso temporário em frontend)
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Gera número de venda formatado (ANO-SEQUENCIAL)
 */
export function gerarNumeroVenda(sequencial: number): string {
  const ano = new Date().getFullYear();
  return `${ano}-${sequencial.toString().padStart(5, '0')}`;
}

/**
 * Gera SKU baseado em parâmetros
 */
export function gerarSKU(categoria: string, nome: string, tamanho?: string, cor?: string): string {
  const catCode = categoria.substring(0, 3).toUpperCase();
  const nomeCode = nome.substring(0, 3).toUpperCase();
  const tamCode = tamanho ? `-${tamanho.toUpperCase()}` : '';
  const corCode = cor ? `-${cor.substring(0, 3).toUpperCase()}` : '';
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${catCode}${nomeCode}${tamCode}${corCode}-${random}`;
}

// ==========================================
// CONVERSÕES FIREBASE
// ==========================================

/**
 * Converte Timestamp do Firebase para Date
 */
export function toDate(field: unknown): Date {
  if (!field) return new Date();
  if (field instanceof Date) return field;
  if (field instanceof Timestamp) return field.toDate();
  if (typeof field === 'object' && 'toDate' in field && typeof (field as { toDate: () => Date }).toDate === 'function') {
    return (field as { toDate: () => Date }).toDate();
  }
  if (typeof field === 'string' || typeof field === 'number') {
    return new Date(field);
  }
  return new Date();
}

/**
 * Remove campos undefined de um objeto (Firebase não aceita undefined)
 */
export function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;
}

/**
 * Converte objeto com possíveis Timestamps para objeto com Dates
 */
export function convertTimestamps<T extends Record<string, unknown>>(
  obj: T,
  dateFields: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of dateFields) {
    if (obj[field]) {
      (result as Record<string, unknown>)[field as string] = toDate(obj[field]);
    }
  }
  return result;
}

// ==========================================
// VALIDAÇÕES
// ==========================================

/**
 * Valida CPF
 */
export function validarCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

/**
 * Valida CNPJ
 */
export function validarCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação do primeiro dígito verificador
  let tamanho = cleaned.length - 2;
  let numeros = cleaned.substring(0, tamanho);
  const digitos = cleaned.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  
  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = cleaned.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  
  return true;
}

/**
 * Valida email
 */
export function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ==========================================
// STRINGS
// ==========================================

/**
 * Remove acentos de string
 */
export function removeAcentos(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Capitaliza primeira letra de cada palavra
 */
export function capitalize(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Trunca texto com reticências
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Normaliza string para busca (lowercase, sem acentos)
 */
export function normalizeForSearch(str: string): string {
  return removeAcentos(str.toLowerCase().trim());
}

// ==========================================
// ARRAYS E OBJETOS
// ==========================================

/**
 * Agrupa array por propriedade
 */
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Soma valores de array por propriedade
 */
export function sumBy<T>(array: T[], key: keyof T): number {
  return array.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
}

/**
 * Ordena array por propriedade
 */
export function sortBy<T>(array: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Remove duplicatas de array por propriedade
 */
export function uniqueBy<T, K extends keyof T>(array: T[], key: K): T[] {
  const seen = new Set<T[K]>();
  return array.filter((item) => {
    if (seen.has(item[key])) return false;
    seen.add(item[key]);
    return true;
  });
}

// ==========================================
// DEBOUNCE/THROTTLE
// ==========================================

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ==========================================
// CLIPBOARD
// ==========================================

/**
 * Copia texto para clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para navegadores antigos
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

// ==========================================
// DOWNLOAD
// ==========================================

/**
 * Dispara download de arquivo
 */
export function downloadFile(data: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converte array de objetos para CSV
 */
export function arrayToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const header = columns.map((col) => `"${col.header}"`).join(';');
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      return String(value);
    }).join(';')
  );
  return [header, ...rows].join('\n');
}
