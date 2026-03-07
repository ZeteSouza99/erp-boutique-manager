// Serviço de Caixa - Firebase Firestore

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
import { 
  Caixa, 
  CaixaMovimento, 
  StatusCaixa,
  TipoMovimentoCaixa,
  FormaPagamento,
  ResumoCaixa,
} from '@/types';

const COLLECTION_CAIXAS = 'caixas';
const COLLECTION_CAIXA_MOVIMENTOS = 'caixaMovimentos';

// ==========================================
// CAIXA
// ==========================================

export async function getCaixaAberto(usuarioId: string): Promise<Caixa | null> {
  const q = query(
    collection(db, COLLECTION_CAIXAS),
    where('usuarioId', '==', usuarioId),
    where('status', '==', 'aberto'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    dataAbertura: doc.data().dataAbertura?.toDate(),
    dataFechamento: doc.data().dataFechamento?.toDate(),
  } as Caixa;
}

export async function getCaixaById(id: string): Promise<Caixa | null> {
  const docRef = doc(db, COLLECTION_CAIXAS, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    dataAbertura: docSnap.data().dataAbertura?.toDate(),
    dataFechamento: docSnap.data().dataFechamento?.toDate(),
  } as Caixa;
}

export async function abrirCaixa(
  usuarioId: string,
  saldoInicial: number
): Promise<string> {
  // Verificar se já tem caixa aberto
  const caixaAberto = await getCaixaAberto(usuarioId);
  if (caixaAberto) {
    throw new Error('Já existe um caixa aberto para este usuário');
  }
  
  const caixaData = {
    usuarioId,
    dataAbertura: Timestamp.now(),
    saldoInicial,
    status: 'aberto' as StatusCaixa,
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_CAIXAS), caixaData);
  
  // Registrar movimento de abertura
  await registrarMovimentoCaixa({
    caixaId: docRef.id,
    tipo: 'abertura',
    valor: saldoInicial,
    usuarioId,
    motivo: 'Abertura de caixa',
  });
  
  return docRef.id;
}

export async function fecharCaixa(
  caixaId: string,
  saldoConferido: number,
  observacao?: string
): Promise<void> {
  const caixa = await getCaixaById(caixaId);
  if (!caixa) {
    throw new Error('Caixa não encontrado');
  }
  
  if (caixa.status === 'fechado') {
    throw new Error('Caixa já está fechado');
  }
  
  // Calcular saldo esperado
  const resumo = await getResumoCaixa(caixaId);
  const saldoEsperado = resumo.saldoEsperado;
  const diferenca = saldoConferido - saldoEsperado;
  
  await updateDoc(doc(db, COLLECTION_CAIXAS, caixaId), {
    dataFechamento: Timestamp.now(),
    saldoEsperado,
    saldoConferido,
    diferenca,
    observacaoFechamento: observacao || null,
    status: 'fechado' as StatusCaixa,
  });
  
  // Registrar movimento de fechamento
  await registrarMovimentoCaixa({
    caixaId,
    tipo: 'fechamento',
    valor: saldoConferido,
    usuarioId: caixa.usuarioId,
    motivo: observacao,
  });
}

// ==========================================
// MOVIMENTOS
// ==========================================

export async function registrarMovimentoCaixa(data: {
  caixaId: string;
  tipo: TipoMovimentoCaixa;
  valor: number;
  formaPagamento?: FormaPagamento;
  motivo?: string;
  vendaId?: string;
  usuarioId: string;
}): Promise<string> {
  const movimentoData = {
    caixaId: data.caixaId,
    tipo: data.tipo,
    valor: data.valor,
    formaPagamento: data.formaPagamento || null,
    motivo: data.motivo || null,
    vendaId: data.vendaId || null,
    usuarioId: data.usuarioId,
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_CAIXA_MOVIMENTOS), movimentoData);
  return docRef.id;
}

export async function realizarSangria(
  caixaId: string,
  valor: number,
  motivo: string,
  usuarioId: string
): Promise<void> {
  const caixa = await getCaixaById(caixaId);
  if (!caixa) {
    throw new Error('Caixa não encontrado');
  }
  
  if (caixa.status === 'fechado') {
    throw new Error('Caixa está fechado');
  }
  
  // Verificar se tem saldo suficiente em DINHEIRO (sangria só retira dinheiro físico)
  const resumo = await getResumoCaixa(caixaId);
  const totalDinheiro = (resumo.porFormaPagamento?.dinheiro || 0) + caixa.saldoInicial - resumo.totalSangrias;
  if (valor > totalDinheiro) {
    throw new Error('Valor da sangria maior que o dinheiro em caixa');
  }
  
  await registrarMovimentoCaixa({
    caixaId,
    tipo: 'sangria',
    valor: -valor, // Negativo pois é saída
    usuarioId,
    motivo,
  });
}

export async function realizarSuprimento(
  caixaId: string,
  valor: number,
  motivo: string,
  usuarioId: string
): Promise<void> {
  const caixa = await getCaixaById(caixaId);
  if (!caixa) {
    throw new Error('Caixa não encontrado');
  }
  
  if (caixa.status === 'fechado') {
    throw new Error('Caixa está fechado');
  }
  
  await registrarMovimentoCaixa({
    caixaId,
    tipo: 'suprimento',
    valor,
    usuarioId,
    motivo,
  });
}

export async function getMovimentosCaixa(caixaId: string): Promise<CaixaMovimento[]> {
  // Usando índice composto caixaId + createdAt
  const q = query(
    collection(db, COLLECTION_CAIXA_MOVIMENTOS),
    where('caixaId', '==', caixaId),
    orderBy('createdAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as CaixaMovimento[];
}

// ==========================================
// RESUMO
// ==========================================

export async function getResumoCaixa(caixaId: string): Promise<ResumoCaixa> {
  const caixa = await getCaixaById(caixaId);
  if (!caixa) {
    throw new Error('Caixa não encontrado');
  }
  
  const movimentos = await getMovimentosCaixa(caixaId);
  
  let totalVendas = 0;
  let quantidadeVendas = 0;
  let sangrias = 0;
  let quantidadeSangrias = 0;
  let suprimentos = 0;
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
  
  for (const mov of movimentos) {
    switch (mov.tipo) {
      case 'venda':
        totalVendas += mov.valor;
        quantidadeVendas++;
        if (mov.formaPagamento) {
          porFormaPagamento[mov.formaPagamento] += mov.valor;
        }
        break;
      case 'sangria':
        sangrias += Math.abs(mov.valor);
        quantidadeSangrias++;
        break;
      case 'suprimento':
        suprimentos += mov.valor;
        break;
    }
  }
  
  // Saldo esperado = inicial + suprimentos + vendas em dinheiro - sangrias
  const saldoEsperado = caixa.saldoInicial + suprimentos + porFormaPagamento.dinheiro - sangrias;
  
  // Combinar formas de pagamento equivalentes (credito + cartao_credito, debito + cartao_debito)
  const totalCredito = porFormaPagamento.credito + porFormaPagamento.cartao_credito;
  const totalDebito = porFormaPagamento.debito + porFormaPagamento.cartao_debito;
  
  return {
    totalVendas,
    quantidadeVendas,
    ticketMedio: quantidadeVendas > 0 ? totalVendas / quantidadeVendas : 0,
    porFormaPagamento,
    sangrias,
    suprimentos,
    saldoEsperado,
    saldoAtual: saldoEsperado,
    totalEntradas: totalVendas + suprimentos,
    totalSaidas: sangrias,
    totalDinheiro: porFormaPagamento.dinheiro,
    totalPix: porFormaPagamento.pix,
    totalCartaoCredito: totalCredito,
    totalCartaoDebito: totalDebito,
    totalSangrias: sangrias,
    quantidadeSangrias,
  };
}

// ==========================================
// HISTÓRICO
// ==========================================

export async function getHistoricoCaixas(
  dataInicio?: Date,
  dataFim?: Date,
  usuarioId?: string
): Promise<Caixa[]> {
  let q = query(
    collection(db, COLLECTION_CAIXAS),
    orderBy('dataAbertura', 'desc'),
    limit(50)
  );
  
  if (usuarioId) {
    q = query(q, where('usuarioId', '==', usuarioId));
  }
  
  const snapshot = await getDocs(q);
  const caixas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dataAbertura: doc.data().dataAbertura?.toDate(),
    dataFechamento: doc.data().dataFechamento?.toDate(),
  })) as Caixa[];
  
  // Filtrar por data no cliente
  return caixas.filter(c => {
    if (dataInicio && c.dataAbertura < dataInicio) return false;
    if (dataFim && c.dataAbertura > dataFim) return false;
    return true;
  });
}
