'use client';

import { useState, useCallback, useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Loading
} from '@/components/ui';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2,
  Receipt,
  X,
} from 'lucide-react';

// Hooks customizados existentes
import { 
  useCarrinho, 
  useBuscaProdutos, 
  useBuscaClientes,  
  usePagamento,
  useCaixa,
  useToast
} from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';

// Componentes reutilizáveis do PDV
import { 
  BuscaProdutos, 
  ModalVariacao, 
  SeletorCliente 
} from '@/components/pdv';
import { ModalPagamento } from '@/components/pdv/ModalPagamento';

// Transação atômica para garantir consistência
import { criarVendaAtomicamente } from '@/lib/firebase/transactions';

import type {
  Produto,
  Variacao,
} from '@/types';
import { formatCurrency } from '@/lib/utils';
import { DESCONTO_LIMITES } from '@/constants';

export default function PDVPage() {
  const { user, userData, canDiscount } = useAuth();
  const { success, error: showError } = useToast();
  
  // Hooks de estado do PDV
  const carrinho = useCarrinho();
  const buscaProdutos = useBuscaProdutos();
  const buscaClientes = useBuscaClientes();
  const pagamento = usePagamento(carrinho.total);
  const caixa = useCaixa();

  // Estados locais mínimos
  const [showModalVariacao, setShowModalVariacao] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [showModalPagamento, setShowModalPagamento] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [finalizando, setFinalizando] = useState(false);

  // Atualizar total do pagamento quando carrinho muda
  const { setTotalVenda } = pagamento;
  useEffect(() => {
    setTotalVenda(carrinho.total);
  }, [carrinho.total, setTotalVenda]);

  // Handlers
  const handleSelecionarProduto = useCallback((produto: Produto) => {
    if (produto.variacoes && produto.variacoes.length > 1) {
      setProdutoSelecionado(produto);
      setShowModalVariacao(true);
    } else if (produto.variacoes && produto.variacoes.length === 1) {
      const adicionado = carrinho.adicionarItem(produto, produto.variacoes[0]);
      if (!adicionado) {
        showError('Estoque insuficiente', 'Não há estoque disponível para este produto');
      }
    }
    buscaProdutos.limpar();
  }, [carrinho, buscaProdutos, showError]);

  const handleSelecionarVariacao = useCallback((produto: Produto, variacao: Variacao) => {
    const adicionado = carrinho.adicionarItem(produto, variacao);
    if (!adicionado) {
      showError('Estoque insuficiente', 'Não há estoque disponível para esta variação');
    }
    setShowModalVariacao(false);
    setProdutoSelecionado(null);
  }, [carrinho, showError]);

  const handleAplicarDesconto = useCallback((percentual: number) => {
    if (!canDiscount(percentual)) {
      const limite = DESCONTO_LIMITES[userData?.perfil || 'vendedor'];
      showError('Desconto não permitido', `Você pode aplicar até ${limite}% de desconto`);
      return;
    }
    carrinho.aplicarDesconto(percentual);
  }, [canDiscount, userData, carrinho, showError]);

  const handleFinalizarVenda = useCallback(async () => {
    if (carrinho.isEmpty) {
      showError('Carrinho vazio', 'Adicione itens ao carrinho');
      return;
    }

    if (!caixa.isAberto) {
      showError('Caixa fechado', 'Abra o caixa antes de realizar vendas');
      return;
    }

    if (pagamento.faltante > 0.01) {
      showError('Pagamento incompleto', 'O valor pago é menor que o total');
      return;
    }

    setFinalizando(true);
    try {
      // Usar transação atômica para garantir consistência
      const resultado = await criarVendaAtomicamente({
        clienteId: buscaClientes.clienteSelecionado?.id,
        clienteNome: buscaClientes.clienteSelecionado?.nome,
        caixaId: caixa.caixa!.id,
        usuarioId: user!.uid,
        usuarioNome: userData?.nome || user!.email || 'Vendedor',
        itens: carrinho.carrinho.map(item => ({
          produtoId: item.produtoId,
          variacaoId: item.variacaoId,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          precoOriginal: item.precoOriginal,
          custoUnitario: item.custoUnitario,
          desconto: item.desconto,
          subtotal: item.subtotal,
          nomeProduto: item.nomeProduto,
          sku: item.sku,
          tamanho: item.tamanho,
          cor: item.cor,
        })),
        pagamentos: pagamento.pagamentos.map(p => ({
          forma: p.forma,
          valor: p.valor,
          troco: p.troco,
          bandeira: p.bandeira,
          nsu: p.nsu,
        })),
        subtotal: carrinho.subtotal,
        descontoTipo: carrinho.descontoPercentual > 0 ? 'percentual' : 'valor',
        descontoValor: carrinho.desconto,
        total: carrinho.total,
        observacao: observacoes,
      });

      success('Venda finalizada!', `Venda #${resultado.numero} registrada com sucesso`);
      
      // Limpar tudo
      carrinho.limparCarrinho();
      pagamento.limparPagamentos();
      buscaClientes.limpar();
      setObservacoes('');
      setShowModalPagamento(false);
      
      // Recarregar caixa para atualizar resumo
      caixa.recarregar();
    } catch (err) {
      console.error('Erro ao finalizar venda:', err);
      showError('Erro na venda', err instanceof Error ? err.message : 'Erro ao finalizar venda');
    } finally {
      setFinalizando(false);
    }
  }, [
    carrinho, 
    pagamento, 
    buscaClientes, 
    caixa, 
    user, 
    userData, 
    observacoes, 
    success, 
    showError
  ]);

  const limparTudo = useCallback(() => {
    carrinho.limparCarrinho();
    buscaClientes.limpar();
    pagamento.limparPagamentos();
    setObservacoes('');
  }, [carrinho, buscaClientes, pagamento]);

  // Loading state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loading size="lg" />
      </div>
    );
  }

  const maxDesconto = DESCONTO_LIMITES[userData?.perfil || 'vendedor'];

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4">
        {/* Área de busca e produtos */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Busca de produtos - usando componente reutilizável */}
          <Card>
            <CardContent className="p-4">
              <BuscaProdutos
                termo={buscaProdutos.termo}
                setTermo={buscaProdutos.setTermo}
                produtos={buscaProdutos.produtos}
                loading={buscaProdutos.loading}
                onSelectProduto={handleSelecionarProduto}
              />
            </CardContent>
          </Card>

          {/* Seletor de cliente - usando componente reutilizável */}
          <Card>
            <CardContent className="p-4">
              <SeletorCliente
                termo={buscaClientes.termo}
                setTermo={buscaClientes.setTermo}
                clientes={buscaClientes.clientes}
                loading={buscaClientes.loading}
                clienteSelecionado={buscaClientes.clienteSelecionado}
                onSelectCliente={buscaClientes.selecionarCliente}
              />
            </CardContent>
          </Card>

          {/* Aviso de caixa fechado */}
          {!caixa.loading && !caixa.isAberto && (
            <Card className="border-yellow-300 bg-yellow-50">
              <CardContent className="p-4">
                <p className="text-yellow-800 font-medium">
                  ⚠️ Caixa fechado. Abra o caixa para realizar vendas.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Itens do carrinho */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Itens ({carrinho.quantidadeItens})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-24rem)]">
              {carrinho.isEmpty ? (
                <div className="p-8 text-center text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Carrinho vazio</p>
                  <p className="text-sm">Busque um produto para começar</p>
                </div>
              ) : (
                <div className="divide-y">
                  {carrinho.carrinho.map((item) => (
                    <div key={`${item.produtoId}-${item.variacaoId}`} className="p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{item.nomeProduto}</p>
                        <p className="text-sm text-gray-500">
                          {item.tamanho} / {item.cor} | {item.sku}
                        </p>
                        <p className="text-sm text-green-600 font-medium">
                          {formatCurrency(item.precoUnitario)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => carrinho.decrementarQuantidade(item.produtoId, item.variacaoId)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {item.quantidade}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const ok = carrinho.incrementarQuantidade(item.produtoId, item.variacaoId);
                            if (!ok) showError('Estoque insuficiente', 'Não há mais estoque disponível');
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-24 text-right">
                        <p className="font-bold">{formatCurrency(item.subtotal)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => carrinho.removerItem(item.produtoId, item.variacaoId)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Área de resumo e pagamento */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(carrinho.subtotal)}</span>
                </div>
                {carrinho.desconto > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Desconto</span>
                    <span>-{formatCurrency(carrinho.desconto)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(carrinho.total)}</span>
                </div>
              </div>

              {/* Desconto rápido */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Desconto rápido</p>
                <div className="flex gap-2">
                  {[5, 10, 15].map(perc => (
                    <Button
                      key={perc}
                      variant={carrinho.descontoPercentual === perc ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleAplicarDesconto(perc)}
                      disabled={carrinho.isEmpty || perc > maxDesconto}
                    >
                      {perc}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setShowModalPagamento(true)}
                  disabled={carrinho.isEmpty || !caixa.isAberto}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  Pagar
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={limparTudo}
                  disabled={carrinho.isEmpty}
                >
                  <X className="h-5 w-5 mr-2" />
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de seleção de variação */}
      <ModalVariacao
        produto={produtoSelecionado}
        isOpen={showModalVariacao}
        onClose={() => {
          setShowModalVariacao(false);
          setProdutoSelecionado(null);
        }}
        onSelect={handleSelecionarVariacao}
      />

      {/* Modal de pagamento - usando componente reutilizável */}
      <ModalPagamento
        isOpen={showModalPagamento}
        onClose={() => setShowModalPagamento(false)}
        total={carrinho.total}
        pagamentos={pagamento.pagamentos}
        onAddPagamento={pagamento.adicionarPagamento}
        onRemovePagamento={pagamento.removerPagamento}
        onFinalizarVenda={handleFinalizarVenda}
        loading={finalizando}
        descontoPercentual={carrinho.descontoPercentual}
        onDescontoChange={handleAplicarDesconto}
        maxDesconto={maxDesconto}
      />
    </AppLayout>
  );
}
