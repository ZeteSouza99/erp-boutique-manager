// Serviço de Estoque - Firebase Firestore

import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  EstoqueMovimento,
  TipoMovimentoEstoque,
  MotivoMovimentoEstoque,
} from '@/types';
import { getProdutoById, atualizarEstoqueVariacao } from './produtos';

const COLLECTION_ESTOQUE_MOVIMENTOS = 'estoqueMovimentos';

// ==========================================
// MOVIMENTOS DE ESTOQUE
// ==========================================

export async function registrarMovimentoEstoque(data: {
  produtoId: string;
  variacaoId: string;
  tipo: TipoMovimentoEstoque;
  motivo: MotivoMovimentoEstoque;
  quantidade: number;
  documentoRef?: string;
  observacao?: string;
  usuarioId: string;
}): Promise<string> {
  // Fetch product and find variation in embedded array
  const produto = await getProdutoById(data.produtoId);
  if (!produto) {
    throw new Error('Produto não encontrado');
  }

  const variacao = produto.variacoes?.find(v => v.id === data.variacaoId);
  if (!variacao) {
    throw new Error('Variação não encontrada');
  }

  const estoqueAnterior = variacao.estoque || 0;
  let quantidadeAjuste = data.quantidade;

  // Ajustar sinal baseado no tipo
  if (data.tipo === 'saida') {
    quantidadeAjuste = -Math.abs(data.quantidade);
  } else if (data.tipo === 'entrada') {
    quantidadeAjuste = Math.abs(data.quantidade);
  }

  const estoquePosterior = estoqueAnterior + quantidadeAjuste;

  if (estoquePosterior < 0) {
    throw new Error('Estoque não pode ficar negativo');
  }

  const movimentoData = {
    produtoId: data.produtoId,
    variacaoId: data.variacaoId,
    tipo: data.tipo,
    motivo: data.motivo,
    quantidade: Math.abs(data.quantidade),
    estoqueAnterior,
    estoquePosterior,
    documentoRef: data.documentoRef || null,
    observacao: data.observacao || null,
    usuarioId: data.usuarioId,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_ESTOQUE_MOVIMENTOS), movimentoData);

  // Atualizar estoque da variação (passing produtoId for embedded lookup)
  await atualizarEstoqueVariacao(data.variacaoId, quantidadeAjuste, data.produtoId);

  return docRef.id;
}

export async function darEntradaEstoque(data: {
  produtoId: string;
  variacaoId: string;
  quantidade: number;
  motivo: 'compra' | 'devolucao' | 'ajuste_inventario';
  documentoRef?: string;
  observacao?: string;
  usuarioId: string;
}): Promise<string> {
  return registrarMovimentoEstoque({
    ...data,
    tipo: 'entrada',
  });
}

export async function darSaidaEstoque(data: {
  produtoId: string;
  variacaoId: string;
  quantidade: number;
  motivo: 'venda' | 'troca' | 'perda' | 'ajuste_inventario';
  documentoRef?: string;
  observacao?: string;
  usuarioId: string;
}): Promise<string> {
  return registrarMovimentoEstoque({
    ...data,
    tipo: 'saida',
  });
}

export async function ajustarEstoqueInventario(data: {
  produtoId: string;
  variacaoId: string;
  quantidadeContada: number;
  observacao?: string;
  usuarioId: string;
}): Promise<string> {
  // Fetch product and find variation in embedded array
  const produto = await getProdutoById(data.produtoId);
  if (!produto) {
    throw new Error('Produto não encontrado');
  }

  const variacao = produto.variacoes?.find(v => v.id === data.variacaoId);
  if (!variacao) {
    throw new Error('Variação não encontrada');
  }

  const diferenca = data.quantidadeContada - (variacao.estoque || 0);

  if (diferenca === 0) {
    throw new Error('Quantidade contada é igual ao estoque atual');
  }

  return registrarMovimentoEstoque({
    produtoId: data.produtoId,
    variacaoId: data.variacaoId,
    tipo: 'ajuste',
    motivo: 'ajuste_inventario',
    quantidade: Math.abs(diferenca),
    observacao: data.observacao || `Ajuste de inventário: ${diferenca > 0 ? '+' : ''}${diferenca}`,
    usuarioId: data.usuarioId,
  });
}

// ==========================================
// HISTÓRICO
// ==========================================

export async function getMovimentosEstoque(
  filtros?: {
    dataInicio?: Date;
    dataFim?: Date;
    tipo?: TipoMovimentoEstoque;
    variacaoId?: string;
  }
): Promise<EstoqueMovimento[]> {
  let q = query(
    collection(db, COLLECTION_ESTOQUE_MOVIMENTOS),
    orderBy('createdAt', 'desc')
  );

  if (filtros?.tipo) {
    q = query(q, where('tipo', '==', filtros.tipo));
  }

  if (filtros?.variacaoId) {
    q = query(q, where('variacaoId', '==', filtros.variacaoId));
  }

  const snapshot = await getDocs(q);
  const movimentos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as EstoqueMovimento[];

  // Filtrar por data no cliente
  return movimentos.filter(m => {
    if (filtros?.dataInicio && m.createdAt && m.createdAt < filtros.dataInicio) return false;
    if (filtros?.dataFim && m.createdAt && m.createdAt > filtros.dataFim) return false;
    return true;
  });
}

export async function getHistoricoMovimentosVariacao(
  variacaoId: string
): Promise<EstoqueMovimento[]> {
  const q = query(
    collection(db, COLLECTION_ESTOQUE_MOVIMENTOS),
    where('variacaoId', '==', variacaoId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as EstoqueMovimento[];
}

export async function getHistoricoMovimentosPeriodo(
  dataInicio: Date,
  dataFim: Date,
  tipo?: TipoMovimentoEstoque
): Promise<EstoqueMovimento[]> {
  let q = query(
    collection(db, COLLECTION_ESTOQUE_MOVIMENTOS),
    orderBy('createdAt', 'desc')
  );

  if (tipo) {
    q = query(q, where('tipo', '==', tipo));
  }

  const snapshot = await getDocs(q);
  const movimentos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as EstoqueMovimento[];

  return movimentos.filter(m => {
    const data = m.createdAt;
    return data >= dataInicio && data <= dataFim;
  });
}
