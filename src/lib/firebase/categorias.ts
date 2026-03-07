// Serviço de Categorias e Marcas - Firebase Firestore

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
import { Categoria, Marca, Fornecedor, Status } from '@/types';

const COLLECTION_CATEGORIAS = 'categorias';
const COLLECTION_MARCAS = 'marcas';
const COLLECTION_FORNECEDORES = 'fornecedores';

// ==========================================
// CATEGORIAS
// ==========================================

export async function getCategorias(status?: Status): Promise<Categoria[]> {
  let q = query(collection(db, COLLECTION_CATEGORIAS), orderBy('nome'));
  
  if (status) {
    q = query(collection(db, COLLECTION_CATEGORIAS), where('status', '==', status), orderBy('nome'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Categoria[];
}

export async function getCategoriaById(id: string): Promise<Categoria | null> {
  const docRef = doc(db, COLLECTION_CATEGORIAS, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
  } as Categoria;
}

export async function createCategoria(
  data: Omit<Categoria, 'id' | 'createdAt'>
): Promise<string> {
  const categoriaData = {
    ...data,
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_CATEGORIAS), categoriaData);
  return docRef.id;
}

export async function updateCategoria(
  id: string, 
  data: Partial<Omit<Categoria, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_CATEGORIAS, id);
  await updateDoc(docRef, data);
}

export async function deleteCategoria(id: string): Promise<void> {
  // Soft-delete: marca como inativo em vez de excluir
  const docRef = doc(db, COLLECTION_CATEGORIAS, id);
  await updateDoc(docRef, { 
    status: 'inativo' as Status,
    updatedAt: Timestamp.now()
  });
}

// ==========================================
// MARCAS
// ==========================================

export async function getMarcas(status?: Status): Promise<Marca[]> {
  let q = query(collection(db, COLLECTION_MARCAS), orderBy('nome'));
  
  if (status) {
    q = query(collection(db, COLLECTION_MARCAS), where('status', '==', status), orderBy('nome'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Marca[];
}

export async function getMarcaById(id: string): Promise<Marca | null> {
  const docRef = doc(db, COLLECTION_MARCAS, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
  } as Marca;
}

export async function createMarca(
  data: Omit<Marca, 'id' | 'createdAt'>
): Promise<string> {
  const marcaData = {
    ...data,
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_MARCAS), marcaData);
  return docRef.id;
}

export async function updateMarca(
  id: string, 
  data: Partial<Omit<Marca, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_MARCAS, id);
  await updateDoc(docRef, data);
}

export async function deleteMarca(id: string): Promise<void> {
  // Soft-delete: marca como inativo em vez de excluir
  const docRef = doc(db, COLLECTION_MARCAS, id);
  await updateDoc(docRef, { 
    status: 'inativo' as Status,
    updatedAt: Timestamp.now()
  });
}

// ==========================================
// FORNECEDORES
// ==========================================

export async function getFornecedores(status?: Status): Promise<Fornecedor[]> {
  let q = query(collection(db, COLLECTION_FORNECEDORES), orderBy('nome'));
  
  if (status) {
    q = query(collection(db, COLLECTION_FORNECEDORES), where('status', '==', status), orderBy('nome'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  })) as Fornecedor[];
}

export async function getFornecedorById(id: string): Promise<Fornecedor | null> {
  const docRef = doc(db, COLLECTION_FORNECEDORES, id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) return null;
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
  } as Fornecedor;
}

export async function createFornecedor(
  data: Omit<Fornecedor, 'id' | 'createdAt'>
): Promise<string> {
  const fornecedorData = {
    ...data,
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_FORNECEDORES), fornecedorData);
  return docRef.id;
}

export async function updateFornecedor(
  id: string, 
  data: Partial<Omit<Fornecedor, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION_FORNECEDORES, id);
  await updateDoc(docRef, data);
}
