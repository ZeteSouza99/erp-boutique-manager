// Serviço de Clientes - Firebase Firestore

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
  Cliente, 
  CreditoCliente,
  Status,
  StatusCredito,
  OrigemCredito,
  Aniversariante,
} from '@/types';

const COLLECTION_CLIENTES = 'clientes';
const COLLECTION_CREDITOS = 'creditosCliente';

// ==========================================
// CLIENTES
// ==========================================

export async function getClientes(status?: Status): Promise<Cliente[]> {
  let q = query(collection(db, COLLECTION_CLIENTES), orderBy('nome'));
  
  if (status) {
    q = query(collection(db, COLLECTION_CLIENTES), where('status', '==', status), orderBy('nome'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    dataNascimento: doc.data().dataNascimento?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  })) as Cliente[];
}

export async function getClienteById(id: string): Promise<Cliente | null> {
  const docRef = doc(db, COLLECTION_CLIENTES, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    dataNascimento: docSnap.data().dataNascimento?.toDate(),
    createdAt: docSnap.data().createdAt?.toDate(),
    updatedAt: docSnap.data().updatedAt?.toDate(),
  } as Cliente;
}

export async function getClienteByTelefone(telefone: string): Promise<Cliente | null> {
  const q = query(
    collection(db, COLLECTION_CLIENTES),
    where('telefone', '==', telefone)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
    dataNascimento: doc.data().dataNascimento?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
  } as Cliente;
}

export async function createCliente(
  data: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // Verificar se telefone já existe
  if (data.telefone) {
    const existente = await getClienteByTelefone(data.telefone);
    if (existente) {
      throw new Error('Já existe um cliente com este telefone');
    }
  }
  
  // Remover campos undefined (Firebase não aceita)
  const clienteData: Record<string, unknown> = {
    nome: data.nome,
    status: data.status || 'ativo',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // Adicionar campos opcionais apenas se tiverem valor
  if (data.telefone) clienteData.telefone = data.telefone;
  if (data.email) clienteData.email = data.email;
  if (data.cpf) clienteData.cpf = data.cpf;
  if (data.endereco) clienteData.endereco = data.endereco;
  if (data.observacoes) clienteData.observacoes = data.observacoes;
  if (data.dataNascimento) {
    clienteData.dataNascimento = Timestamp.fromDate(data.dataNascimento as Date);
  }
  
  const docRef = await addDoc(collection(db, COLLECTION_CLIENTES), clienteData);
  return docRef.id;
}

export async function updateCliente(
  id: string, 
  data: Partial<Omit<Cliente, 'id' | 'createdAt'>>
): Promise<void> {
  // Verificar se telefone já existe em outro cliente
  if (data.telefone) {
    const existente = await getClienteByTelefone(data.telefone);
    if (existente && existente.id !== id) {
      throw new Error('Já existe um cliente com este telefone');
    }
  }
  
  // Remover campos undefined (Firebase não aceita)
  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };
  
  // Adicionar apenas campos com valor definido
  if (data.nome !== undefined) updateData.nome = data.nome;
  if (data.telefone !== undefined) updateData.telefone = data.telefone || null;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.cpf !== undefined) updateData.cpf = data.cpf || null;
  if (data.endereco !== undefined) updateData.endereco = data.endereco || null;
  if (data.observacoes !== undefined) updateData.observacoes = data.observacoes || null;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.dataNascimento !== undefined) {
    updateData.dataNascimento = data.dataNascimento 
      ? Timestamp.fromDate(data.dataNascimento as Date) 
      : null;
  }
  
  const docRef = doc(db, COLLECTION_CLIENTES, id);
  await updateDoc(docRef, updateData);
}

export async function deleteCliente(id: string): Promise<void> {
  // Soft delete - apenas inativa o cliente
  await updateCliente(id, { status: 'inativo' });
}

export async function buscarClientes(termo: string): Promise<Cliente[]> {
  const clientes = await getClientes('ativo');
  const termoLower = termo.toLowerCase();
  
  return clientes.filter(c => 
    c.nome.toLowerCase().includes(termoLower) ||
    c.telefone?.includes(termo) ||
    c.email?.toLowerCase().includes(termoLower)
  );
}

// ==========================================
// ANIVERSARIANTES
// ==========================================

export async function getAniversariantesDoMes(mes?: number): Promise<Aniversariante[]> {
  const mesAtual = mes ?? new Date().getMonth() + 1;
  const clientes = await getClientes('ativo');
  
  return clientes
    .filter(c => {
      if (!c.dataNascimento) return false;
      const mesNascimento = c.dataNascimento.getMonth() + 1;
      return mesNascimento === mesAtual;
    })
    .map(c => ({
      clienteId: c.id,
      nome: c.nome,
      telefone: c.telefone,
      dataNascimento: c.dataNascimento!,
      dia: c.dataNascimento!.getDate(),
    }))
    .sort((a, b) => a.dia - b.dia);
}

// Alias para compatibilidade
export async function getAniversariantes(): Promise<Cliente[]> {
  const clientes = await getClientes('ativo');
  const mesAtual = new Date().getMonth();
  
  return clientes.filter(c => {
    if (!c.dataNascimento) return false;
    const mesNascimento = new Date(c.dataNascimento).getMonth();
    return mesNascimento === mesAtual;
  });
}

export async function getAniversariantesDaSemana(): Promise<Aniversariante[]> {
  const hoje = new Date();
  const clientes = await getClientes('ativo');
  
  return clientes
    .filter(c => {
      if (!c.dataNascimento) return false;
      
      // Criar data de aniversário este ano
      const aniversarioEsteAno = new Date(
        hoje.getFullYear(),
        c.dataNascimento.getMonth(),
        c.dataNascimento.getDate()
      );
      
      // Verificar se está nos próximos 7 dias
      const diffTime = aniversarioEsteAno.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 7;
    })
    .map(c => ({
      clienteId: c.id,
      nome: c.nome,
      telefone: c.telefone,
      dataNascimento: c.dataNascimento!,
      dia: c.dataNascimento!.getDate(),
    }))
    .sort((a, b) => a.dia - b.dia);
}

// ==========================================
// CRÉDITOS
// ==========================================

export async function getCreditosCliente(clienteId: string): Promise<CreditoCliente[]> {
  const q = query(
    collection(db, COLLECTION_CREDITOS),
    where('clienteId', '==', clienteId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    validade: doc.data().validade?.toDate(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as CreditoCliente[];
}

export async function getCreditosDisponiveis(clienteId: string): Promise<CreditoCliente[]> {
  const creditos = await getCreditosCliente(clienteId);
  const hoje = new Date();
  
  return creditos.filter(c => 
    c.status === 'ativo' && 
    c.valorDisponivel > 0 &&
    c.validade > hoje
  );
}

export async function getSaldoCreditoCliente(clienteId: string): Promise<number> {
  const creditos = await getCreditosDisponiveis(clienteId);
  return creditos.reduce((acc, c) => acc + c.valorDisponivel, 0);
}

export async function criarCredito(data: {
  clienteId: string;
  valor: number;
  origem: OrigemCredito;
  trocaId?: string;
  validadeDias?: number; // Padrão 90 dias
}): Promise<string> {
  const validadeDias = data.validadeDias ?? 90;
  const validade = new Date();
  validade.setDate(validade.getDate() + validadeDias);
  
  const creditoData = {
    clienteId: data.clienteId,
    valorOriginal: data.valor,
    valorUtilizado: 0,
    valorDisponivel: data.valor,
    origem: data.origem,
    trocaId: data.trocaId || null,
    validade: Timestamp.fromDate(validade),
    status: 'ativo' as StatusCredito,
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_CREDITOS), creditoData);
  return docRef.id;
}

export async function utilizarCredito(
  creditoId: string,
  valor: number
): Promise<void> {
  const docRef = doc(db, COLLECTION_CREDITOS, creditoId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Crédito não encontrado');
  }
  
  const credito = docSnap.data() as CreditoCliente;
  
  if (credito.status !== 'ativo') {
    throw new Error('Crédito não está ativo');
  }
  
  if (valor > credito.valorDisponivel) {
    throw new Error('Valor maior que o crédito disponível');
  }
  
  const novoUtilizado = credito.valorUtilizado + valor;
  const novoDisponivel = credito.valorDisponivel - valor;
  const novoStatus = novoDisponivel <= 0 ? 'utilizado' : 'ativo';
  
  await updateDoc(docRef, {
    valorUtilizado: novoUtilizado,
    valorDisponivel: novoDisponivel,
    status: novoStatus,
  });
}

// Função para verificar e expirar créditos vencidos
export async function verificarCreditosExpirados(): Promise<void> {
  const hoje = new Date();
  
  const q = query(
    collection(db, COLLECTION_CREDITOS),
    where('status', '==', 'ativo')
  );
  
  const snapshot = await getDocs(q);
  
  for (const docSnap of snapshot.docs) {
    const credito = docSnap.data();
    const validade = credito.validade?.toDate();
    
    if (validade && validade < hoje) {
      await updateDoc(doc(db, COLLECTION_CREDITOS, docSnap.id), {
        status: 'expirado',
      });
    }
  }
}
