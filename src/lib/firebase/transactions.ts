// Servico de Transacoes Atomicas - Firebase Firestore
// Garante consistencia de dados em operacoes complexas

import {
  doc,
  runTransaction,
  writeBatch,
  Timestamp,
  Transaction,
  collection,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/constants';
import type {
  VendaItem,
  Pagamento,
  FormaPagamento,
  TipoMovimentoCaixa,
  Variacao,
} from '@/types';

// ==========================================
// TIPOS PARA TRANSACOES
// ==========================================

interface DadosVenda {
  clienteId?: string;
  clienteNome?: string;
  caixaId: string;
  usuarioId: string;
  usuarioNome?: string;
  itens: VendaItem[];
  pagamentos: Pagamento[];
  subtotal: number;
  descontoTipo?: 'percentual' | 'valor';
  descontoValor?: number;
  total: number;
  observacao?: string;
}

interface ResultadoVenda {
  vendaId: string;
  numero: string;
}

// ==========================================
// TRANSACAO: CRIAR VENDA COMPLETA
// ==========================================

/**
 * Cria uma venda completa de forma atomica:
 * - Cria documento da venda (com itens e pagamentos denormalizados)
 * - Cria itens da venda em subcollection
 * - Cria pagamentos em subcollection
 * - Atualiza estoque de cada produto (com rastreamento antes/depois)
 * - Registra movimentos de caixa
 * - Atualiza dados do cliente (se houver)
 * - Gera numero sequencial atomico via documento contador
 */
export async function criarVendaAtomicamente(dados: DadosVenda): Promise<ResultadoVenda> {
  return runTransaction(db, async (transaction) => {
    // 1. Verificar se o caixa esta aberto
    const caixaRef = doc(db, COLLECTIONS.CAIXAS, dados.caixaId);
    const caixaSnap = await transaction.get(caixaRef);

    if (!caixaSnap.exists()) {
      throw new Error('Caixa nao encontrado');
    }

    if (caixaSnap.data().status !== 'aberto') {
      throw new Error('O caixa esta fechado');
    }

    // 2. Verificar e reservar estoque de cada item
    for (const item of dados.itens) {
      await verificarEReservarEstoque(transaction, item);
    }

    // 3. Gerar numero da venda (sequencial atomico)
    const numero = await gerarNumeroVenda(transaction);

    // 4. Calcular campos denormalizados
    const formasPagamento = [...new Set(dados.pagamentos.map(p => p.forma))];
    const totalItens = dados.itens.reduce((sum, item) => sum + item.quantidade, 0);

    // 5. Criar documento da venda (com dados denormalizados)
    const vendaRef = doc(collection(db, COLLECTIONS.VENDAS));
    const vendaData = {
      numero,
      clienteId: dados.clienteId || null,
      clienteNome: dados.clienteNome || null,
      caixaId: dados.caixaId,
      usuarioId: dados.usuarioId,
      usuarioNome: dados.usuarioNome || null,
      subtotal: dados.subtotal,
      descontoTipo: dados.descontoTipo || null,
      descontoValor: dados.descontoValor || 0,
      desconto: dados.descontoValor || 0,
      total: dados.total,
      status: 'finalizada',
      observacao: dados.observacao || null,
      // Dados denormalizados para leitura rapida em documento unico
      itens: dados.itens,
      pagamentos: dados.pagamentos,
      formasPagamento,
      totalItens,
      createdAt: Timestamp.now(),
    };

    transaction.set(vendaRef, vendaData);

    // 6. Criar itens da venda em subcollection e atualizar estoque
    for (const item of dados.itens) {
      // Criar item
      const itemRef = doc(collection(db, COLLECTIONS.VENDA_ITENS));
      transaction.set(itemRef, {
        vendaId: vendaRef.id,
        ...item,
        createdAt: Timestamp.now(),
      });

      // Atualizar estoque (ja verificado acima) com rastreamento antes/depois
      await atualizarEstoqueNaTransacao(transaction, item, 'saida', vendaRef.id);
    }

    // 7. Criar pagamentos em subcollection
    for (const pagamento of dados.pagamentos) {
      const pagamentoRef = doc(collection(db, COLLECTIONS.PAGAMENTOS));
      transaction.set(pagamentoRef, {
        vendaId: vendaRef.id,
        ...pagamento,
        createdAt: Timestamp.now(),
      });

      // Registrar movimento de caixa
      await registrarMovimentoCaixaNaTransacao(
        transaction,
        dados.caixaId,
        'venda',
        pagamento.valor,
        pagamento.forma,
        dados.usuarioId,
        vendaRef.id
      );
    }

    // 8. Atualizar dados do cliente (se houver)
    if (dados.clienteId) {
      const clienteRef = doc(db, COLLECTIONS.CLIENTES, dados.clienteId);
      const clienteSnap = await transaction.get(clienteRef);

      if (clienteSnap.exists()) {
        const clienteData = clienteSnap.data();
        transaction.update(clienteRef, {
          totalCompras: (clienteData.totalCompras || 0) + dados.total,
          ultimaCompra: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    }

    return {
      vendaId: vendaRef.id,
      numero,
    };
  });
}

// ==========================================
// TRANSACAO: CANCELAR VENDA
// ==========================================

export async function cancelarVendaAtomicamente(
  vendaId: string,
  motivo: string,
  usuarioId: string
): Promise<void> {
  return runTransaction(db, async (transaction) => {
    // 1. Buscar venda
    const vendaRef = doc(db, COLLECTIONS.VENDAS, vendaId);
    const vendaSnap = await transaction.get(vendaRef);

    if (!vendaSnap.exists()) {
      throw new Error('Venda nao encontrada');
    }

    const vendaData = vendaSnap.data();

    if (vendaData.status === 'cancelada') {
      throw new Error('Esta venda ja foi cancelada');
    }

    // 2. Buscar itens da venda para estornar estoque
    // Usa itens denormalizados no documento da venda
    if (vendaData.itens && Array.isArray(vendaData.itens)) {
      for (const item of vendaData.itens) {
        await atualizarEstoqueNaTransacao(transaction, item, 'entrada', vendaId);
      }
    }

    // 3. Atualizar status da venda
    transaction.update(vendaRef, {
      status: 'cancelada',
      cancelamentoMotivo: motivo,
      cancelamentoData: Timestamp.now(),
      cancelamentoUsuarioId: usuarioId,
    });

    // 4. Estornar valores do cliente (se houver)
    if (vendaData.clienteId) {
      const clienteRef = doc(db, COLLECTIONS.CLIENTES, vendaData.clienteId);
      const clienteSnap = await transaction.get(clienteRef);

      if (clienteSnap.exists()) {
        const clienteData = clienteSnap.data();
        transaction.update(clienteRef, {
          totalCompras: Math.max(0, (clienteData.totalCompras || 0) - vendaData.total),
          updatedAt: Timestamp.now(),
        });
      }
    }
  });
}

// ==========================================
// TRANSACAO: ABRIR/FECHAR CAIXA
// ==========================================

export async function abrirCaixaAtomicamente(
  usuarioId: string,
  saldoInicial: number
): Promise<string> {
  return runTransaction(db, async (transaction) => {
    // Verificar se ja tem caixa aberto
    // Nota: Em producao, usar uma query especifica
    const caixaRef = doc(collection(db, COLLECTIONS.CAIXAS));

    const caixaData = {
      usuarioId,
      dataAbertura: Timestamp.now(),
      saldoInicial,
      status: 'aberto',
    };

    transaction.set(caixaRef, caixaData);

    // Registrar movimento de abertura
    const movimentoRef = doc(collection(db, COLLECTIONS.CAIXA_MOVIMENTOS));
    transaction.set(movimentoRef, {
      caixaId: caixaRef.id,
      tipo: 'abertura',
      valor: saldoInicial,
      usuarioId,
      motivo: 'Abertura de caixa',
      createdAt: Timestamp.now(),
    });

    return caixaRef.id;
  });
}

export async function fecharCaixaAtomicamente(
  caixaId: string,
  saldoConferido: number,
  usuarioId: string,
  observacao?: string
): Promise<void> {
  // 1. Consultar movimentos do caixa FORA da transacao
  //    (Firestore transactions so permitem get() por referencia de documento)
  const movimentosQuery = query(
    collection(db, COLLECTIONS.CAIXA_MOVIMENTOS),
    where('caixaId', '==', caixaId)
  );
  const movimentosSnap = await getDocs(movimentosQuery);

  // 2. Calcular totais por tipo de movimento
  let totalVendas = 0;
  let totalSangrias = 0;
  let totalSuprimentos = 0;

  movimentosSnap.forEach((movDoc) => {
    const mov = movDoc.data();
    switch (mov.tipo) {
      case 'venda':
        totalVendas += mov.valor || 0;
        break;
      case 'sangria':
        totalSangrias += mov.valor || 0;
        break;
      case 'suprimento':
        totalSuprimentos += mov.valor || 0;
        break;
    }
  });

  // 3. Executar a transacao para atualizar atomicamente o documento do caixa
  return runTransaction(db, async (transaction) => {
    const caixaRef = doc(db, COLLECTIONS.CAIXAS, caixaId);
    const caixaSnap = await transaction.get(caixaRef);

    if (!caixaSnap.exists()) {
      throw new Error('Caixa nao encontrado');
    }

    const caixaData = caixaSnap.data();

    if (caixaData.status === 'fechado') {
      throw new Error('Este caixa ja foi fechado');
    }

    // Saldo esperado = saldoInicial + vendas + suprimentos - sangrias
    const saldoEsperado = caixaData.saldoInicial + totalVendas + totalSuprimentos - totalSangrias;
    const diferenca = saldoConferido - saldoEsperado;

    transaction.update(caixaRef, {
      status: 'fechado',
      dataFechamento: Timestamp.now(),
      saldoEsperado,
      saldoConferido,
      diferenca,
      totalVendas,
      totalSangrias,
      totalSuprimentos,
      observacaoFechamento: observacao || null,
    });

    // Registrar movimento de fechamento
    const movimentoRef = doc(collection(db, COLLECTIONS.CAIXA_MOVIMENTOS));
    transaction.set(movimentoRef, {
      caixaId,
      tipo: 'fechamento',
      valor: saldoConferido,
      usuarioId,
      motivo: 'Fechamento de caixa',
      createdAt: Timestamp.now(),
    });
  });
}

// ==========================================
// FUNCOES AUXILIARES
// ==========================================

async function verificarEReservarEstoque(
  transaction: Transaction,
  item: VendaItem
): Promise<void> {
  const produtoRef = doc(db, COLLECTIONS.PRODUTOS, item.produtoId);
  const produtoSnap = await transaction.get(produtoRef);

  if (!produtoSnap.exists()) {
    throw new Error(`Produto nao encontrado: ${item.produtoId}`);
  }

  const produtoData = produtoSnap.data();

  // Verificar estoque na variacao
  if (produtoData.variacoes && Array.isArray(produtoData.variacoes)) {
    const variacao = produtoData.variacoes.find(
      (v: Variacao) => v.id === item.variacaoId
    );

    if (!variacao) {
      throw new Error(`Variacao nao encontrada: ${item.variacaoId}`);
    }

    if (variacao.estoque < item.quantidade) {
      throw new Error(
        `Estoque insuficiente para ${item.nomeProduto || produtoData.nome}. ` +
        `Disponivel: ${variacao.estoque}, Solicitado: ${item.quantidade}`
      );
    }
  }
}

async function atualizarEstoqueNaTransacao(
  transaction: Transaction,
  item: VendaItem,
  tipo: 'entrada' | 'saida',
  documentoRef: string
): Promise<void> {
  const produtoRef = doc(db, COLLECTIONS.PRODUTOS, item.produtoId);
  const produtoSnap = await transaction.get(produtoRef);

  if (!produtoSnap.exists()) return;

  const produtoData = produtoSnap.data();

  if (produtoData.variacoes && Array.isArray(produtoData.variacoes)) {
    let estoqueAnterior = 0;
    let estoquePosterior = 0;

    const variacoesAtualizadas = produtoData.variacoes.map(
      (v: Variacao) => {
        if (v.id === item.variacaoId) {
          estoqueAnterior = v.estoque;
          const novoEstoque = tipo === 'entrada'
            ? v.estoque + item.quantidade
            : v.estoque - item.quantidade;
          estoquePosterior = Math.max(0, novoEstoque);
          return { ...v, estoque: estoquePosterior };
        }
        return v;
      }
    );

    transaction.update(produtoRef, {
      variacoes: variacoesAtualizadas,
      updatedAt: Timestamp.now(),
    });

    // Registrar movimento de estoque com rastreamento antes/depois
    const movimentoRef = doc(collection(db, COLLECTIONS.ESTOQUE_MOVIMENTOS));
    transaction.set(movimentoRef, {
      produtoId: item.produtoId,
      variacaoId: item.variacaoId,
      tipo,
      motivo: tipo === 'saida' ? 'venda' : 'devolucao',
      quantidade: item.quantidade,
      estoqueAnterior,
      estoquePosterior,
      documentoRef,
      createdAt: Timestamp.now(),
    });
  }
}

/**
 * Gera numero sequencial de venda usando documento contador atomico.
 * O contador fica em `contadores/vendas` com campo `ultimoSequencial`.
 * Deve ser chamada dentro de uma transacao para garantir unicidade.
 */
async function gerarNumeroVenda(transaction: Transaction): Promise<string> {
  const ano = new Date().getFullYear();
  const contadorRef = doc(db, 'contadores', 'vendas');
  const contadorSnap = await transaction.get(contadorRef);

  let sequencial: number;

  if (contadorSnap.exists()) {
    sequencial = (contadorSnap.data().ultimoSequencial || 0) + 1;
  } else {
    sequencial = 1;
  }

  transaction.set(contadorRef, { ultimoSequencial: sequencial }, { merge: true });

  return `${ano}-${sequencial.toString().padStart(5, '0')}`;
}

async function registrarMovimentoCaixaNaTransacao(
  transaction: Transaction,
  caixaId: string,
  tipo: TipoMovimentoCaixa,
  valor: number,
  formaPagamento: FormaPagamento,
  usuarioId: string,
  vendaId?: string
): Promise<void> {
  const movimentoRef = doc(collection(db, COLLECTIONS.CAIXA_MOVIMENTOS));
  transaction.set(movimentoRef, {
    caixaId,
    tipo,
    valor,
    formaPagamento,
    usuarioId,
    vendaId: vendaId || null,
    createdAt: Timestamp.now(),
  });
}

// ==========================================
// BATCH OPERATIONS
// ==========================================

/**
 * Atualiza estoque de multiplos produtos em batch
 * Util para importacoes ou ajustes em massa
 */
export async function atualizarEstoqueEmBatch(
  atualizacoes: Array<{
    produtoId: string;
    variacaoId: string;
    novoEstoque: number;
  }>
): Promise<void> {
  const batch = writeBatch(db);

  for (const atualizacao of atualizacoes) {
    const produtoRef = doc(db, COLLECTIONS.PRODUTOS, atualizacao.produtoId);
    const produtoSnap = await getDoc(produtoRef);

    if (produtoSnap.exists()) {
      const produtoData = produtoSnap.data();

      if (produtoData.variacoes && Array.isArray(produtoData.variacoes)) {
        const variacoesAtualizadas = produtoData.variacoes.map(
          (v: Variacao) => {
            if (v.id === atualizacao.variacaoId) {
              return { ...v, estoque: atualizacao.novoEstoque };
            }
            return v;
          }
        );

        batch.update(produtoRef, {
          variacoes: variacoesAtualizadas,
          updatedAt: Timestamp.now(),
        });
      }
    }
  }

  await batch.commit();
}

/**
 * Cria multiplos produtos em batch
 */
export async function criarProdutosEmBatch(
  produtos: Array<Omit<import('@/types').Produto, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<string[]> {
  const batch = writeBatch(db);
  const ids: string[] = [];

  for (const produto of produtos) {
    const produtoRef = doc(collection(db, COLLECTIONS.PRODUTOS));
    ids.push(produtoRef.id);

    batch.set(produtoRef, {
      ...produto,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }

  await batch.commit();
  return ids;
}
