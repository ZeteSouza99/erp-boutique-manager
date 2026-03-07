'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Loading,
  Modal,
} from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import {
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Lock,
  Unlock,
  Receipt,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';
import {
  useCaixaAberto,
  useResumoCaixa,
  useMovimentosCaixa,
  useAbrirCaixa,
  useFecharCaixa,
  useSangria,
  useRegistrarMovimentoCaixa,
} from '@/hooks/useQueries';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  abrirCaixaSchema,
  fecharCaixaSchema,
  sangriaSuprimentoSchema,
  type AbrirCaixaFormData,
  type FecharCaixaFormData,
  type SangriaSuprimentoFormData,
} from '@/lib/validations';

export default function CaixaPage() {
  const { user, loading: authLoading, isAdmin, isGerente } = useAuth();
  const router = useRouter();
  const { error: showError } = useToast();

  const userId = user?.uid || '';
  const { data: caixaAberto = null, isLoading: loadingCaixa } = useCaixaAberto(userId);
  const caixaId = caixaAberto?.id || '';
  const { data: resumo = null } = useResumoCaixa(caixaId);
  const { data: movimentosRaw = [] } = useMovimentosCaixa(caixaId);

  const movimentos = useMemo(() => [...movimentosRaw].reverse(), [movimentosRaw]);

  const abrirCaixaMutation = useAbrirCaixa();
  const fecharCaixaMutation = useFecharCaixa();
  const sangriaMutation = useSangria();
  const registrarMovimentoMutation = useRegistrarMovimentoCaixa();

  const loading = loadingCaixa;
  
  // Modais
  const [showModalAbrir, setShowModalAbrir] = useState(false);
  const [showModalFechar, setShowModalFechar] = useState(false);
  const [showModalMovimento, setShowModalMovimento] = useState(false);
  const [showModalSangria, setShowModalSangria] = useState(false);

  // Formulários com react-hook-form
  const [tipoMovimento, setTipoMovimento] = useState<'entrada' | 'saida'>('entrada');
  const [processando, setProcessando] = useState(false);

  const abrirCaixaForm = useForm<AbrirCaixaFormData>({
    resolver: zodResolver(abrirCaixaSchema),
    defaultValues: { saldoInicial: 0 },
  });

  const fecharCaixaForm = useForm<FecharCaixaFormData>({
    resolver: zodResolver(fecharCaixaSchema),
    defaultValues: { saldoConferido: 0, observacao: '' },
  });

  const sangriaForm = useForm<SangriaSuprimentoFormData>({
    resolver: zodResolver(sangriaSuprimentoSchema),
    defaultValues: { valor: 0, motivo: '' },
  });

  // Reuse sangriaSuprimentoSchema for the movimento (suprimento) modal too
  const movimentoForm = useForm<SangriaSuprimentoFormData>({
    resolver: zodResolver(sangriaSuprimentoSchema),
    defaultValues: { valor: 0, motivo: '' },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);




  const handleAbrirCaixa = async (data: AbrirCaixaFormData) => {
    setProcessando(true);
    try {
      await abrirCaixaMutation.mutateAsync({ usuarioId: user!.uid, saldoInicial: data.saldoInicial });
      setShowModalAbrir(false);
      abrirCaixaForm.reset();
    } catch (error) {
      console.error('Erro ao abrir caixa:', error);
      showError('Erro', 'Erro ao abrir caixa');
    } finally {
      setProcessando(false);
    }
  };

  const handleFecharCaixa = async (data: FecharCaixaFormData) => {
    setProcessando(true);
    try {
      await fecharCaixaMutation.mutateAsync({
        caixaId: caixaAberto!.id!,
        saldoConferido: data.saldoConferido,
        observacao: data.observacao || undefined
      });
      setShowModalFechar(false);
      fecharCaixaForm.reset();
    } catch (error) {
      console.error('Erro ao fechar caixa:', error);
      showError('Erro', 'Erro ao fechar caixa');
    } finally {
      setProcessando(false);
    }
  };

  const handleRegistrarMovimento = async (data: SangriaSuprimentoFormData) => {
    setProcessando(true);
    try {
      const tipoReal = tipoMovimento === 'saida' ? 'sangria' : 'suprimento';
      const valorReal = tipoMovimento === 'saida' ? -data.valor : data.valor;

      await registrarMovimentoMutation.mutateAsync({
        caixaId: caixaAberto!.id!,
        tipo: tipoReal,
        valor: valorReal,
        motivo: data.motivo,
        formaPagamento: 'dinheiro',
        usuarioId: user!.uid,
      });

      setShowModalMovimento(false);
      movimentoForm.reset();
    } catch (error) {
      console.error('Erro ao registrar movimento:', error);
      showError('Erro', 'Erro ao registrar movimento');
    } finally {
      setProcessando(false);
    }
  };

  const handleRealizarSangria = async (data: SangriaSuprimentoFormData) => {
    if (data.valor > (resumo?.totalDinheiro || 0)) {
      sangriaForm.setError('valor', { message: 'Valor maior que o dinheiro disponível em caixa' });
      return;
    }

    setProcessando(true);
    try {
      await sangriaMutation.mutateAsync({
        caixaId: caixaAberto!.id!,
        valor: data.valor,
        motivo: data.motivo,
        usuarioId: user!.uid
      });

      setShowModalSangria(false);
      sangriaForm.reset();
    } catch (error) {
      console.error('Erro ao realizar sangria:', error);
      showError('Erro', 'Erro ao realizar sangria');
    } finally {
      setProcessando(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Controle de Caixa</h1>
            <p className="text-gray-500">
              {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          {!caixaAberto ? (
            <Button onClick={() => setShowModalAbrir(true)}>
              <Unlock className="h-4 w-4 mr-2" />
              Abrir Caixa
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowModalMovimento(true)}>
                <DollarSign className="h-4 w-4 mr-2" />
                Movimento
              </Button>
              {(isAdmin || isGerente) && (
                <Button variant="outline" onClick={() => setShowModalSangria(true)}>
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Sangria
                </Button>
              )}
              <Button variant="danger" onClick={() => setShowModalFechar(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Fechar Caixa
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loading size="lg" />
          </div>
        ) : !caixaAberto ? (
          /* Caixa fechado */
          <Card>
            <CardContent className="p-12 text-center">
              <Lock className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Caixa Fechado</h2>
              <p className="text-gray-500 mb-6">
                O caixa ainda não foi aberto hoje. Clique no botão acima para iniciar.
              </p>
              <Button onClick={() => setShowModalAbrir(true)}>
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Caixa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Status do caixa */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Valor de Abertura</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(caixaAberto.saldoInicial)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {caixaAberto.dataAbertura && format(new Date(caixaAberto.dataAbertura), 'HH:mm')}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Wallet className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Entradas</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(resumo?.totalEntradas || 0)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {resumo?.quantidadeVendas || 0} vendas
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Saídas</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(resumo?.totalSaidas || 0)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {resumo?.quantidadeSangrias || 0} sangrias
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Saldo Atual</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(resumo?.saldoAtual || caixaAberto.saldoInicial)}
                      </p>
                      <Badge variant="success" className="mt-1">
                        Caixa Aberto
                      </Badge>
                    </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo por forma de pagamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Por Forma de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Dinheiro</span>
                      </div>
                      <span className="font-bold text-green-600">
                        {formatCurrency(resumo?.totalDinheiro || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">PIX</span>
                      </div>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(resumo?.totalPix || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Cartão Crédito</span>
                      </div>
                      <span className="font-bold text-purple-600">
                        {formatCurrency(resumo?.totalCartaoCredito || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">Cartão Débito</span>
                      </div>
                      <span className="font-bold text-orange-600">
                        {formatCurrency(resumo?.totalCartaoDebito || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Últimos movimentos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Últimos Movimentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {movimentos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Nenhum movimento registrado</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {movimentos.slice(0, 20).map((mov) => (
                        <div 
                          key={mov.id} 
                          className={`flex justify-between items-center p-3 rounded-lg ${
                            mov.tipo === 'venda' ? 'bg-green-50' :
                            mov.tipo === 'sangria' ? 'bg-red-50' :
                            mov.tipo === 'suprimento' ? 'bg-blue-50' :
                            'bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {mov.tipo === 'venda' ? 'Venda' :
                               mov.tipo === 'sangria' ? 'Sangria' :
                               mov.tipo === 'suprimento' ? 'Suprimento' :
                               mov.tipo === 'abertura' ? 'Abertura' :
                               mov.tipo}
                            </p>
                            <p className="text-xs text-gray-500">
                              {mov.createdAt && format(new Date(mov.createdAt), 'HH:mm', { locale: ptBR })}
                              {mov.formaPagamento && ` • ${mov.formaPagamento}`}
                              {mov.motivo && ` • ${mov.motivo}`}
                            </p>
                          </div>
                          <span className={`font-bold ${
                            mov.tipo === 'sangria' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {mov.tipo === 'sangria' ? '-' : '+'}{formatCurrency(Math.abs(mov.valor))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Modal Abrir Caixa */}
      <Modal
        isOpen={showModalAbrir}
        onClose={() => { setShowModalAbrir(false); abrirCaixaForm.reset(); }}
        title="Abrir Caixa"
      >
        <form onSubmit={abrirCaixaForm.handleSubmit(handleAbrirCaixa)} className="space-y-4">
          <p className="text-gray-600">
            Informe o valor inicial em dinheiro no caixa.
          </p>
          <Input
            label="Valor de Abertura"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...abrirCaixaForm.register('saldoInicial', { valueAsNumber: true })}
            error={abrirCaixaForm.formState.errors.saldoInicial?.message}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => { setShowModalAbrir(false); abrirCaixaForm.reset(); }}>
              Cancelar
            </Button>
            <Button type="submit" loading={processando}>
              Abrir Caixa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Fechar Caixa */}
      <Modal
        isOpen={showModalFechar}
        onClose={() => { setShowModalFechar(false); fecharCaixaForm.reset(); }}
        title="Fechar Caixa"
      >
        <form onSubmit={fecharCaixaForm.handleSubmit(handleFecharCaixa)} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Saldo esperado:</span>
              <span className="font-bold">{formatCurrency(resumo?.saldoAtual || 0)}</span>
            </div>
          </div>

          <Input
            label="Valor em Caixa (conferido)"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...fecharCaixaForm.register('saldoConferido', { valueAsNumber: true })}
            error={fecharCaixaForm.formState.errors.saldoConferido?.message}
          />

          {fecharCaixaForm.watch('saldoConferido') > 0 && (
            <div className={`p-3 rounded-lg ${
              Math.abs(fecharCaixaForm.watch('saldoConferido') - (resumo?.saldoAtual || 0)) < 0.01
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              <p className="font-medium">
                Diferença: {formatCurrency(fecharCaixaForm.watch('saldoConferido') - (resumo?.saldoAtual || 0))}
              </p>
            </div>
          )}

          <Input
            label="Observações"
            placeholder="Observações do fechamento..."
            {...fecharCaixaForm.register('observacao')}
            error={fecharCaixaForm.formState.errors.observacao?.message}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => { setShowModalFechar(false); fecharCaixaForm.reset(); }}>
              Cancelar
            </Button>
            <Button variant="danger" type="submit" loading={processando}>
              Fechar Caixa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Movimento */}
      <Modal
        isOpen={showModalMovimento}
        onClose={() => { setShowModalMovimento(false); movimentoForm.reset(); }}
        title="Registrar Movimento"
      >
        <form onSubmit={movimentoForm.handleSubmit(handleRegistrarMovimento)} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={tipoMovimento === 'entrada' ? 'primary' : 'outline'}
              className="flex-1"
              onClick={() => setTipoMovimento('entrada')}
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Entrada
            </Button>
            <Button
              type="button"
              variant={tipoMovimento === 'saida' ? 'danger' : 'outline'}
              className="flex-1"
              onClick={() => setTipoMovimento('saida')}
            >
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Saída
            </Button>
          </div>

          <Input
            label="Valor"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...movimentoForm.register('valor', { valueAsNumber: true })}
            error={movimentoForm.formState.errors.valor?.message}
          />

          <Input
            label="Descrição"
            placeholder="Descrição do movimento..."
            {...movimentoForm.register('motivo')}
            error={movimentoForm.formState.errors.motivo?.message}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => { setShowModalMovimento(false); movimentoForm.reset(); }}>
              Cancelar
            </Button>
            <Button type="submit" loading={processando}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Sangria */}
      <Modal
        isOpen={showModalSangria}
        onClose={() => { setShowModalSangria(false); sangriaForm.reset(); }}
        title="Realizar Sangria"
      >
        <form onSubmit={sangriaForm.handleSubmit(handleRealizarSangria)} className="space-y-4">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-yellow-800">
              <strong>Atenção:</strong> Sangria é a retirada de dinheiro do caixa para segurança ou depósito.
            </p>
            <p className="text-sm text-yellow-700 mt-2">
              Dinheiro disponível: <strong>{formatCurrency(resumo?.totalDinheiro || 0)}</strong>
            </p>
          </div>

          <Input
            label="Valor da Sangria"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...sangriaForm.register('valor', { valueAsNumber: true })}
            error={sangriaForm.formState.errors.valor?.message}
          />

          <Input
            label="Motivo"
            placeholder="Motivo da sangria..."
            {...sangriaForm.register('motivo')}
            error={sangriaForm.formState.errors.motivo?.message}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={() => { setShowModalSangria(false); sangriaForm.reset(); }}>
              Cancelar
            </Button>
            <Button variant="danger" type="submit" loading={processando}>
              Realizar Sangria
            </Button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
