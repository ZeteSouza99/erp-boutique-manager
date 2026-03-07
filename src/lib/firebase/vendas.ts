// Serviço de Vendas - Firebase Firestore

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  Venda,
  VendaItem,
  Pagamento,
  VendaCompleta,
  StatusVenda,
  FormaPagamento,
} from '@/types';
import { cancelarVendaAtomicamente } from './transactions';

const COLLECTION_VENDAS = 'vendas';
const COLLECTION_VENDA_ITENS = 'vendaItens';
const COLLECTION_PAGAMENTOS = 'pagamentos';

// ==========================================
// VENDAS
// ==========================================

export async function getVendas(
  filtros?: {
    dataInicio?: Date;
    dataFim?: Date;
    usuarioId?: string;
    status?: StatusVenda;
    clienteId?: string;
  },
  limitCount: number = 50,
  lastDoc?: DocumentSnapshot
): Promise<{ vendas: Venda[]; lastDoc: DocumentSnapshot | null }> {
  // Use Firestore where() for status filter (index: status + createdAt)
  let q;
  if (filtros?.status) {
    q = query(
      collection(db, COLLECTION_VENDAS),
      where('status', '==', filtros.status),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
  } else {
    q = query(
      collection(db, COLLECTION_VENDAS),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
  }

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  let vendas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    cancelamentoData: doc.data().cancelamentoData?.toDate(),
  })) as Venda[];

  // Client-side filtering for fields without composite indexes
  if (filtros?.usuarioId) {
    vendas = vendas.filter(v => v.usuarioId === filtros.usuarioId);
  }
  if (filtros?.clienteId) {
    vendas = vendas.filter(v => v.clienteId === filtros.clienteId);
  }
  if (filtros?.dataInicio) {
    vendas = vendas.filter(v => {
      const vendaDate = v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt);
      return vendaDate >= filtros.dataInicio!;
    });
  }
  if (filtros?.dataFim) {
    vendas = vendas.filter(v => {
      const vendaDate = v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt);
      return vendaDate <= filtros.dataFim!;
    });
  }

  return {
    vendas,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
  };
}

export async function getVendaById(id: string): Promise<Venda | null> {
  const docRef = doc(db, COLLECTION_VENDAS, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    cancelamentoData: docSnap.data().cancelamentoData?.toDate(),
  } as Venda;
}

export async function getVendaCompleta(id: string): Promise<VendaCompleta | null> {
  const venda = await getVendaById(id);
  if (!venda) return null;

  // Check for embedded items (new denormalized format)
  let itens: VendaItem[];
  if (venda.itens && Array.isArray(venda.itens) && venda.itens.length > 0) {
    itens = venda.itens;
  } else {
    // Legacy fallback: query vendaItens collection
    const qItens = query(
      collection(db, COLLECTION_VENDA_ITENS),
      where('vendaId', '==', id)
    );
    const snapshotItens = await getDocs(qItens);
    itens = snapshotItens.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as VendaItem[];
  }

  // Check for embedded payments (new denormalized format)
  let pagamentos: Pagamento[];
  if (venda.pagamentos && Array.isArray(venda.pagamentos) && venda.pagamentos.length > 0) {
    pagamentos = venda.pagamentos;
  } else {
    // Legacy fallback: query pagamentos collection
    const qPag = query(
      collection(db, COLLECTION_PAGAMENTOS),
      where('vendaId', '==', id)
    );
    const snapshotPag = await getDocs(qPag);
    pagamentos = snapshotPag.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Pagamento[];
  }

  return {
    ...venda,
    itens,
    pagamentos,
  };
}

// ==========================================
// CANCELAR VENDA
// ==========================================

export async function cancelarVenda(
  vendaId: string,
  motivo: string,
  usuarioId: string
): Promise<void> {
  return cancelarVendaAtomicamente(vendaId, motivo, usuarioId);
}

// ==========================================
// RELATÓRIOS
// ==========================================

export async function getResumoVendasPeriodo(
  dataInicio: Date,
  dataFim: Date
): Promise<{
  totalVendas: number;
  quantidadeVendas: number;
  ticketMedio: number;
  porFormaPagamento: Record<FormaPagamento, number>;
}> {
  // Query with Firestore where() clauses (composite index: status + createdAt)
  const q = query(
    collection(db, COLLECTION_VENDAS),
    where('status', '==', 'finalizada'),
    where('createdAt', '>=', Timestamp.fromDate(dataInicio)),
    where('createdAt', '<=', Timestamp.fromDate(dataFim)),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const vendas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Venda[];

  const totalVendas = vendas.reduce((acc, v) => acc + v.total, 0);
  const quantidadeVendas = vendas.length;
  const ticketMedio = quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0;

  const porFormaPagamento: Record<FormaPagamento, number> = {
    dinheiro: 0,
    pix: 0,
    cartao_credito: 0,
    cartao_debito: 0,
    credito: 0,
    debito: 0,
    crediario: 0,
    credito_loja: 0,
  };

  // Read payments from embedded data when available
  for (const venda of vendas) {
    if (venda.pagamentos && Array.isArray(venda.pagamentos) && venda.pagamentos.length > 0) {
      // New format: embedded payments
      for (const pag of venda.pagamentos) {
        if (pag.forma && porFormaPagamento[pag.forma] !== undefined) {
          porFormaPagamento[pag.forma] += pag.valor;
        }
      }
    } else {
      // Legacy fallback: query payments collection (expected to be rare)
      const qPag = query(
        collection(db, COLLECTION_PAGAMENTOS),
        where('vendaId', '==', venda.id)
      );
      const pagSnapshot = await getDocs(qPag);
      pagSnapshot.docs.forEach(doc => {
        const pag = doc.data() as Pagamento;
        if (pag.forma && porFormaPagamento[pag.forma] !== undefined) {
          porFormaPagamento[pag.forma] += pag.valor;
        }
      });
    }
  }

  return {
    totalVendas,
    quantidadeVendas,
    ticketMedio,
    porFormaPagamento,
  };
}

export async function getProdutosMaisVendidos(
  dataInicio: Date,
  dataFim: Date,
  limite: number = 10
): Promise<{ produtoId: string; nome: string; quantidade: number; valor: number }[]> {
  // Query with Firestore where() clauses (composite index: status + createdAt)
  const q = query(
    collection(db, COLLECTION_VENDAS),
    where('status', '==', 'finalizada'),
    where('createdAt', '>=', Timestamp.fromDate(dataInicio)),
    where('createdAt', '<=', Timestamp.fromDate(dataFim)),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  const vendas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Venda[];

  const produtosMap = new Map<string, { nome: string; quantidade: number; valor: number }>();

  for (const venda of vendas) {
    // Read items from embedded data when available
    let itens: VendaItem[];
    if (venda.itens && Array.isArray(venda.itens) && venda.itens.length > 0) {
      // New format: embedded items
      itens = venda.itens;
    } else {
      // Legacy fallback: query vendaItens collection
      const qItens = query(
        collection(db, COLLECTION_VENDA_ITENS),
        where('vendaId', '==', venda.id)
      );
      const itensSnapshot = await getDocs(qItens);
      itens = itensSnapshot.docs.map(doc => doc.data() as VendaItem);
    }

    for (const item of itens) {
      const produtoId = item.produtoId;
      if (!produtoId) continue;

      const nome = item.nomeProduto || item.produtoNome || 'Produto desconhecido';
      const current = produtosMap.get(produtoId) || { nome, quantidade: 0, valor: 0 };
      produtosMap.set(produtoId, {
        nome: current.nome,
        quantidade: current.quantidade + item.quantidade,
        valor: current.valor + item.subtotal,
      });
    }
  }

  return Array.from(produtosMap.entries())
    .map(([produtoId, data]) => ({ produtoId, ...data }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, limite);
}
