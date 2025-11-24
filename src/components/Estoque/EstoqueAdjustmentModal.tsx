import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import { formatSmartCurrency, useCurrencyInput } from '../../lib/currencyFormatter';
import { EstoqueService } from '../../services/estoqueService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productGroup: ProdutoAgrupado | null;
  deficitQty: number;
  deficitUnit: string;
  suggestedPrice?: number | null;
  activityLabel?: string | null;
  activityDate?: string | null;
  onSaved?: () => Promise<void> | void;
}

export default function EstoqueAdjustmentModal({ isOpen, onClose, productGroup, deficitQty, deficitUnit, suggestedPrice = 0, activityLabel, activityDate, onSaved }: Props) {
  const [quantidade, setQuantidade] = useState<string>('0');
  const currency = useCurrencyInput(suggestedPrice ?? 0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuantidade((deficitQty || 0).toFixed(2));
      currency.setValue(suggestedPrice ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, deficitQty, suggestedPrice]);

  if (!isOpen || !productGroup) return null;

  const produtoNome = productGroup.nome;

  const handleSubmit = async () => {
    const qtd = Number(String(quantidade).replace(',', '.'));
    const preco = currency.numericValue;

    if (!qtd || qtd <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }
    if (!preco || preco <= 0) {
      alert('Informe um preço válido.');
      return;
    }

    // escolher lote padrão: menor id do grupo (sem permitir seleção)
    const produtosDoGrupo = productGroup.produtos || [];
    if (!produtosDoGrupo.length) {
      alert('Não há lote deste produto. Registre a compra pelo fluxo padrão.');
      return;
    }
    const loteId = Math.min(...produtosDoGrupo.map(p => p.id));

    try {
      setSubmitting(true);
      await EstoqueService.processarEntrada(loteId, qtd, preco);
      // sucesso
      if (onSaved) await onSaved();
      onClose();
    } catch (err: any) {
      console.error('Erro ao processar entrada corretiva:', err);
      alert(err?.message || 'Erro ao processar entrada.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[18px] shadow-[0_8px_24px_rgba(0,68,23,0.12)] w-full max-w-md">
        <div className="flex items-start justify-between p-6 border-b border-[rgba(0,68,23,0.06)]">
          <div>
            <h2 className="text-2xl font-bold text-[#004417]">Ajuste de Estoque</h2>
            <p className="mt-2 text-sm text-[rgba(0,68,23,0.7)]">Uma atividade usou mais produto do que estava registrado. Informe o valor da quantidade excedente para fechar o custo.</p>
          </div>
          <button onClick={onClose} className="text-[rgba(0,68,23,0.5)] hover:text-[#00A651] rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-[rgba(0,166,81,0.03)] border-l-4 border-[rgba(247,148,31,0.9)] p-4 rounded-md">
            <div className="text-sm text-[rgba(0,68,23,0.8)] font-semibold">⚠ Produto: <span className="font-bold">{produtoNome}</span></div>
            {activityLabel && <div className="mt-1 text-sm text-[rgba(0,68,23,0.8)]">Atividade: <span className="font-bold">{activityLabel}</span></div>}
            {activityDate && <div className="mt-1 text-sm text-[rgba(0,68,23,0.8)]">Data: <span className="font-bold">{activityDate}</span></div>}
            <div className="mt-2 text-sm text-[rgba(0,68,23,0.9)]">Quantidade excedente: <span className="font-bold">{Number(deficitQty || 0).toFixed(2)} {deficitUnit}</span></div>
          </div>

          <div>
            <label className="block text-sm text-[#004417] mb-1">Quantidade a registrar</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="flex-1 px-4 py-3 rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,68,23,0.06)] text-[#004417]"
              />
              <div className="text-[14px] text-[rgba(0,68,23,0.7)]">{deficitUnit}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#004417] mb-1">Valor por {deficitUnit}</label>
            <input
              type="text"
              value={currency.displayValue}
              onChange={(e) => currency.handleChange(e.target.value)}
              className="w-full px-4 py-3 rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,68,23,0.06)] text-[#004417]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white text-[#004417] rounded-[12px] hover:bg-[rgba(0,166,81,0.04)] mr-3"
              disabled={submitting}
            >
              Cancelar
            </button>

            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#00A651] text-white rounded-[12px] hover:bg-[#008a44] transition-colors"
              disabled={submitting}
            >
              {submitting ? 'Registrando...' : '🟩 Registrar Entrada'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
