// Serviço de Trocas e Devoluções - Firebase Firestore

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
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  TipoTroca,
  MotivoTroca,
} from '@/types';
import { darEntradaEstoque } from './estoque';

const COLLECTION_TROCAS = 'trocas';

export interface Troca {
  id?: string;
  vendaId: string;
  clienteId?: string;
  clienteNome?: string;
  tipo: TipoTroca;
  motivo: MotivoTroca;
  observacao?: string;
  itens: TrocaItem[];
  valorTotal: number;
  creditoGerado?: number;
  status: 'pendente' | 'aprovada' | 'recusada' | 'finalizada';
  usuarioId: string;
  usuarioNome?: string;
  createdAt?: Date;
  finalizadaEm?: Date;
}

export interface TrocaItem {
  produtoId: string;
  produtoNome: string;
  variacaoId: string;
  variacaoDescricao: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

// ==========================================
// TROCAS
// ==========================================

export async function getTrocas(
  filtros?: {
    dataInicio?: Date;
    dataFim?: Date;
    status?: string;
    tipo?: TipoTroca;
  }
): Promise<Troca[]> {
  let q = query(collection(db, COLLECTION_TROCAS), orderBy('createdAt', 'desc'));
  
  if (filtros?.status) {
    q = query(q, where('status', '==', filtros.status));
  }
  
  if (filtros?.tipo) {
    q = query(q, where('tipo', '==', filtros.tipo));
  }
  
  const snapshot = await getDocs(q);
  const trocas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    finalizadaEm: doc.data().finalizadaEm?.toDate(),
  })) as Troca[];
  
  // Filtrar por data no cliente
  return trocas.filter(t => {
    if (filtros?.dataInicio && t.createdAt && t.createdAt < filtros.dataInicio) return false;
    if (filtros?.dataFim && t.createdAt && t.createdAt > filtros.dataFim) return false;
    return true;
  });
}

export async function getTrocaById(id: string): Promise<Troca | null> {
  const docRef = doc(db, COLLECTION_TROCAS, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    finalizadaEm: docSnap.data().finalizadaEm?.toDate(),
  } as Troca;
}

export async function criarTroca(data: Omit<Troca, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const trocaData = {
    ...data,
    status: 'pendente',
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_TROCAS), trocaData);
  return docRef.id;
}

export async function aprovarTroca(trocaId: string, usuarioId: string): Promise<void> {
  const trocaRef = doc(db, COLLECTION_TROCAS, trocaId);
  const troca = await getTrocaById(trocaId);
  
  if (!troca) {
    throw new Error('Troca não encontrada');
  }
  
  if (troca.status !== 'pendente') {
    throw new Error('Apenas trocas pendentes podem ser aprovadas');
  }
  
  // Dar entrada no estoque para cada item
  for (const item of troca.itens) {
    await darEntradaEstoque({
      produtoId: item.produtoId,
      variacaoId: item.variacaoId,
      quantidade: item.quantidade,
      motivo: 'devolucao',
      observacao: `Troca/Devolução #${trocaId}`,
      usuarioId: usuarioId
    });
  }
  
  // Atualizar status da troca
  await updateDoc(trocaRef, {
    status: 'aprovada',
    creditoGerado: troca.valorTotal,
    finalizadaEm: Timestamp.now(),
  });
}

export async function recusarTroca(trocaId: string, motivo: string): Promise<void> {
  const troca = await getTrocaById(trocaId);
  if (!troca) {
    throw new Error('Troca não encontrada');
  }
  
  if (troca.status !== 'pendente') {
    throw new Error('Apenas trocas pendentes podem ser recusadas');
  }
  
  const trocaRef = doc(db, COLLECTION_TROCAS, trocaId);
  await updateDoc(trocaRef, {
    status: 'recusada',
    observacao: motivo,
    finalizadaEm: Timestamp.now(),
  });
}

export async function finalizarTroca(trocaId: string): Promise<void> {
  const trocaRef = doc(db, COLLECTION_TROCAS, trocaId);
  
  await updateDoc(trocaRef, {
    status: 'finalizada',
    finalizadaEm: Timestamp.now(),
  });
}
