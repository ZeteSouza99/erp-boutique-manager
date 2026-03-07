// Serviço de Produtos - Firebase Firestore

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Produto, Variacao, Status } from '@/types';

// Função helper para remover campos undefined (Firebase não aceita undefined)
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;
}

const COLLECTION_PRODUTOS = 'produtos';

// ==========================================
// PRODUTOS
// ==========================================

export async function getProdutos(status?: Status): Promise<Produto[]> {
  let q = query(collection(db, COLLECTION_PRODUTOS), orderBy('nome'));

  if (status) {
    q = query(collection(db, COLLECTION_PRODUTOS), where('status', '==', status), orderBy('nome'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Produto[];
}

export async function getProdutoById(id: string): Promise<Produto | null> {
  const docRef = doc(db, COLLECTION_PRODUTOS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    updatedAt: docSnap.data().updatedAt?.toDate(),
  } as Produto;
}

export async function createProduto(
  data: Omit<Produto, 'id' | 'createdAt' | 'updatedAt' | 'margem'>
): Promise<string> {
  // Calcular margem
  const custo = data.precoCusto || 0;
  const margem = data.precoVenda > 0
    ? ((data.precoVenda - custo) / data.precoVenda) * 100
    : 0;

  // Remover campos undefined (Firebase não aceita)
  const produtoLimpo = removeUndefined({
    ...data,
    margem,
    // Limpar variações embutidas
    variacoes: data.variacoes?.map(v => removeUndefined({
      id: v.id,
      sku: v.sku || '',
      codigoBarras: v.codigoBarras || '',
      tamanho: v.tamanho,
      cor: v.cor,
      estoque: v.estoque || 0
    })),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const docRef = await addDoc(collection(db, COLLECTION_PRODUTOS), produtoLimpo);

  return docRef.id;
}

export async function updateProduto(
  id: string,
  data: Partial<Omit<Produto, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_PRODUTOS, id);

  // Recalcular margem se preço ou custo foram alterados
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  if (data.precoVenda !== undefined || data.precoCusto !== undefined) {
    const produto = await getProdutoById(id);
    if (produto) {
      const preco = data.precoVenda ?? produto.precoVenda;
      const custo = data.precoCusto ?? produto.precoCusto ?? 0;
      updateData.margem = preco > 0 ? ((preco - custo) / preco) * 100 : 0;
    }
  }

  // Remover campos undefined (Firebase não aceita)
  const updateDataLimpo = removeUndefined(updateData as Record<string, unknown>);

  await updateDoc(docRef, updateDataLimpo);
}

export async function deleteProduto(id: string): Promise<void> {
  // Soft delete - apenas inativa
  await updateProduto(id, { status: 'inativo' });
}

export async function buscarProdutos(termo: string, maxResultados: number = 20): Promise<Produto[]> {
  const termoLower = termo.toLowerCase().trim();
  if (!termoLower || termoLower.length < 2) return [];

  const resultados: Map<string, Produto> = new Map();

  // 1. Busca exata por SKU (mais comum em PDV - leitura de código de barras)
  const skuQuery = query(
    collection(db, COLLECTION_PRODUTOS),
    where('sku', '==', termo.toUpperCase()),
    where('status', '==', 'ativo'),
    limit(1)
  );

  const skuSnapshot = await getDocs(skuQuery);
  for (const docSnap of skuSnapshot.docs) {
    const produto = mapDocToProduto(docSnap);
    if (produto) resultados.set(produto.id!, produto);
  }

  // Se encontrou por SKU exato, retorna (caso mais comum em PDV)
  if (resultados.size > 0) {
    return Array.from(resultados.values());
  }

  // 2. Busca por prefixo de nome usando campo normalizado (se existir)
  // Ou busca paginada de produtos ativos com filtro client-side
  const produtosQuery = query(
    collection(db, COLLECTION_PRODUTOS),
    where('status', '==', 'ativo'),
    orderBy('nome'),
    limit(100) // Limita para não carregar todo o banco
  );

  const snapshot = await getDocs(produtosQuery);

  for (const docSnap of snapshot.docs) {
    if (resultados.size >= maxResultados) break;

    const produto = mapDocToProduto(docSnap);
    if (!produto || resultados.has(produto.id!)) continue;

    // Verifica se o produto corresponde ao termo
    const matches =
      produto.nome.toLowerCase().includes(termoLower) ||
      produto.sku?.toLowerCase().includes(termoLower) ||
      produto.codigoInterno?.toLowerCase().includes(termoLower) ||
      produto.codigoBarras?.toLowerCase().includes(termoLower) ||
      produto.marca?.toLowerCase().includes(termoLower) ||
      produto.categoriaNome?.toLowerCase().includes(termoLower) ||
      produto.variacoes?.some(v =>
        v.sku?.toLowerCase().includes(termoLower) ||
        v.codigoBarras?.toLowerCase().includes(termoLower)
      );

    if (matches) {
      resultados.set(produto.id!, produto);
    }
  }

  return Array.from(resultados.values());
}

// Helper para mapear documento Firestore para Produto
function mapDocToProduto(docSnap: { id: string; data: () => Record<string, unknown> }): Produto | null {
  const data = docSnap.data();
  if (!data) return null;

  return {
    id: docSnap.id,
    ...data,
    createdAt: (data.createdAt as { toDate?: () => Date })?.toDate?.(),
    updatedAt: (data.updatedAt as { toDate?: () => Date })?.toDate?.(),
  } as Produto;
}

export async function generateSKU(prefixo: string): Promise<string> {
  // Gera um SKU único baseado no prefixo e um contador
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefixo}-${timestamp.slice(-4)}${random}`;
}

// ==========================================
// VARIAÇÕES (embutidas no produto)
// ==========================================

export async function getVariacaoEmProduto(
  produtoId: string,
  variacaoId: string
): Promise<{ variacao: Variacao; produto: Produto } | null> {
  const produto = await getProdutoById(produtoId);
  if (!produto || !produto.variacoes) return null;

  const variacao = produto.variacoes.find(v => v.id === variacaoId);
  if (!variacao) return null;

  return { variacao, produto };
}

export async function atualizarEstoqueVariacao(
  variacaoId: string,
  quantidadeAjuste: number,
  produtoId?: string
): Promise<void> {
  let targetProduto: Produto | null = null;

  if (produtoId) {
    targetProduto = await getProdutoById(produtoId);
  } else {
    // Buscar em todos os produtos
    const todosProdutos = await getProdutos();
    for (const produto of todosProdutos) {
      if (produto.variacoes?.some(v => v.id === variacaoId)) {
        targetProduto = produto;
        break;
      }
    }
  }

  if (!targetProduto || !targetProduto.variacoes) {
    throw new Error('Variação não encontrada');
  }

  const variacaoIndex = targetProduto.variacoes.findIndex(v => v.id === variacaoId);
  if (variacaoIndex === -1) {
    throw new Error('Variação não encontrada no produto');
  }

  const variacao = targetProduto.variacoes[variacaoIndex];
  const novoEstoque = (variacao.estoque || 0) + quantidadeAjuste;
  if (novoEstoque < 0) throw new Error('Estoque não pode ser negativo');

  // Atualizar a variação embutida no produto
  const novasVariacoes = [...targetProduto.variacoes];
  novasVariacoes[variacaoIndex] = { ...variacao, estoque: novoEstoque };

  await updateProduto(targetProduto.id!, { variacoes: novasVariacoes });
}

// ==========================================
// CONSULTAS DE ESTOQUE
// ==========================================

export async function getEstoqueBaixo(): Promise<(Variacao & { produto: Produto })[]> {
  const produtos = await getProdutos('ativo');
  const variacoesBaixas: (Variacao & { produto: Produto })[] = [];

  for (const produto of produtos) {
    if (!produto.variacoes) continue;

    const estoqueMinimo = produto.estoqueMinimo || 0;

    for (const variacao of produto.variacoes) {
      if (variacao.estoque < estoqueMinimo) {
        variacoesBaixas.push({ ...variacao, produto });
      }
    }
  }

  return variacoesBaixas;
}

// ==========================================
// GERAÇÃO DE SKU
// ==========================================

export function gerarSKU(nome: string, tamanho?: string, cor?: string): string {
  const base = nome
    .substring(0, 6)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const tam = tamanho?.substring(0, 2).toUpperCase() || '';
  const c = cor?.substring(0, 3).toUpperCase() || '';
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();

  return `${base}${tam}${c}-${random}`;
}

export async function verificarSKUDisponivel(sku: string): Promise<boolean> {
  // Verifica em produtos (campo codigoInterno)
  const qProd = query(
    collection(db, COLLECTION_PRODUTOS),
    where('codigoInterno', '==', sku)
  );
  const snapProd = await getDocs(qProd);
  if (!snapProd.empty) return false;

  // Verifica em variações embutidas nos produtos
  const todosProdutos = await getProdutos();
  for (const produto of todosProdutos) {
    if (produto.variacoes?.some(v => v.sku === sku)) {
      return false;
    }
  }

  return true;
}
