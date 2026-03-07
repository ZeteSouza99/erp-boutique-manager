'use client';

import { useState } from 'react';
import { X, Banknote, CreditCard, QrCode, Wallet, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Badge } from '@/components/ui';
import type { FormaPagamento, Pagamento } from '@/types';
import { formatCurrency, formatarMoeda, parseMoeda } from '@/lib/utils';
import { FORMAS_PAGAMENTO } from '@/constants';

// ==========================================
// MODAL DE PAGAMENTO
// ==========================================

interface ModalPagamentoProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  pagamentos: Pagamento[];
  onAddPagamento: (forma: FormaPagamento, valor: number) => void;
  onRemovePagamento: (id: string) => void;
  onFinalizarVenda: () => void;
  loading?: boolean;
  descontoPercentual: number;
  onDescontoChange: (percentual: number) => void;
  maxDesconto: number;
}

export function ModalPagamento({
  isOpen,
  onClose,
  total,
  pagamentos,
  onAddPagamento,
  onRemovePagamento,
  onFinalizarVenda,
  loading = false,
  descontoPercentual,
  onDescontoChange,
  maxDesconto,
}: ModalPagamentoProps) {
  const [formaSelecionada, setFormaSelecionada] = useState<FormaPagamento>('dinheiro');
  const [valorInput, setValorInput] = useState('');

  const totalPago = pagamentos.reduce((acc, p) => acc + p.valor, 0);
  const faltante = Math.max(0, total - totalPago);
  const troco = Math.max(0, totalPago - total);
  const isPago = totalPago >= total;

  const formasPagamento: { forma: FormaPagamento; label: string; icon: typeof Banknote }[] = [
    { forma: 'dinheiro', label: 'Dinheiro', icon: Banknote },
    { forma: 'pix', label: 'PIX', icon: QrCode },
    { forma: 'cartao_credito', label: 'Crédito', icon: CreditCard },
    { forma: 'cartao_debito', label: 'Débito', icon: CreditCard },
    { forma: 'crediario', label: 'Crediário', icon: Wallet },
  ];

  const handleAddPagamento = () => {
    const valor = parseMoeda(valorInput);
    if (valor > 0) {
      onAddPagamento(formaSelecionada, valor);
      setValorInput('');
    }
  };

  const handlePreencherRestante = () => {
    if (faltante > 0) {
      setValorInput(formatarMoeda((faltante * 100).toString()));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Pagamento</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Desconto */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Desconto (máximo {maxDesconto}%)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={descontoPercentual}
                onChange={(e) => {
                  const valor = Math.min(maxDesconto, Math.max(0, Number(e.target.value)));
                  onDescontoChange(valor);
                }}
                min={0}
                max={maxDesconto}
                className="w-24"
              />
              <span className="flex items-center text-gray-500">%</span>
            </div>
          </div>

          {/* Total */}
          <div className="text-center py-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Total a Pagar</p>
            <p className="text-3xl font-bold text-blue-700">{formatCurrency(total)}</p>
          </div>

          {/* Formas de Pagamento */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {formasPagamento.map(({ forma, label, icon: Icon }) => (
                <button
                  key={forma}
                  onClick={() => setFormaSelecionada(forma)}
                  className={`p-3 border rounded-lg flex flex-col items-center gap-1 transition-colors ${
                    formaSelecionada === forma
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <Input
                type="text"
                value={valorInput}
                onChange={(e) => setValorInput(formatarMoeda(e.target.value))}
                placeholder="0,00"
                className="text-lg"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handlePreencherRestante}
                variant="outline"
                disabled={faltante <= 0}
              >
                Restante
              </Button>
              <Button onClick={handleAddPagamento} disabled={parseMoeda(valorInput) <= 0}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Lista de Pagamentos */}
          {pagamentos.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Pagamentos Adicionados</p>
              <div className="space-y-2">
                {pagamentos.map((pagamento) => (
                  <div
                    key={pagamento.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        {FORMAS_PAGAMENTO[pagamento.forma]}
                      </Badge>
                      <span className="font-medium">{formatCurrency(pagamento.valor)}</span>
                    </div>
                    <button
                      onClick={() => onRemovePagamento(pagamento.id!)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Pago</span>
              <span className="font-medium">{formatCurrency(totalPago)}</span>
            </div>
            {faltante > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Faltante</span>
                <span className="font-medium">{formatCurrency(faltante)}</span>
              </div>
            )}
            {troco > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Troco</span>
                <span className="font-medium">{formatCurrency(troco)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={onFinalizarVenda}
            disabled={!isPago || loading}
            loading={loading}
            className="flex-1"
          >
            Finalizar Venda
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// BOTÕES DE AÇÃO RÁPIDA DE PAGAMENTO
// ==========================================

interface BotoesValorRapidoProps {
  onSelect: (valor: number) => void;
  valores?: number[];
}

export function BotoesValorRapido({ 
  onSelect, 
  valores = [10, 20, 50, 100, 200] 
}: BotoesValorRapidoProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {valores.map((valor) => (
        <button
          key={valor}
          onClick={() => onSelect(valor)}
          className="px-3 py-1 text-sm border rounded-full hover:bg-gray-50 transition-colors"
        >
          {formatCurrency(valor)}
        </button>
      ))}
    </div>
  );
}

// ==========================================
// RESUMO DE TROCO
// ==========================================

interface TrocoDisplayProps {
  valorPago: number;
  total: number;
}

export function TrocoDisplay({ valorPago, total }: TrocoDisplayProps) {
  const troco = valorPago - total;

  if (troco <= 0) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
      <p className="text-sm text-green-600 mb-1">Troco</p>
      <p className="text-2xl font-bold text-green-700">{formatCurrency(troco)}</p>
    </div>
  );
}
