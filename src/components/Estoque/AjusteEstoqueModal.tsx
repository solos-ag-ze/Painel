// src/components/Estoque/AjusteEstoqueModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { EstoqueService } from '../../services/estoqueService';
import { formatCurrencyInput, formatCurrency } from '../../lib/currencyFormatter';
import { formatUnitFull } from '../../lib/formatUnit';
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import { convertBetweenUnits, convertValueBetweenUnits } from '../../lib/unitConverter';
import DateInput from '../common/DateInput';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  productGroup: ProdutoAgrupado | null;
  onSaved: () => void;
}

export default function AjusteEstoqueModal({ isOpen, onClose, productGroup, onSaved }: Props) {
  const [quantidade, setQuantidade] = useState('');
  const [valor, setValor] = useState('');
  const [valorDisplay, setValorDisplay] = useState('R$ 0,00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lote, setLote] = useState('');
  const [validade, setValidade] = useState('');
  const [fornecedor, setFornecedor] = useState('');

  const quantidadeFaltante = productGroup
    ? Math.abs((productGroup.quantidadeLiquidaAtual ?? productGroup.totalEstoqueDisplay) || 0)
    : 0;
  const unidade = productGroup?.unidadeDisplay || '';

  const precoSugerido = useMemo(() => {
    if (!productGroup || !productGroup.entradas.length) return 0;

    const EPSILON = 1e-6;
    const unidadeBase = productGroup.unidadeDisplay
      || productGroup.unidadeValorOriginal
      || productGroup.entradas[0]?.unidade_valor_original
      || productGroup.entradas[0]?.unidade
      || 'un';

    const entradasOrdenadas = [...productGroup.entradas].sort((a, b) => {
      const dataA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dataB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dataB - dataA;
    });

    for (const entrada of entradasOrdenadas) {
      const unidadeEntrada = entrada.unidade || unidadeBase;
      const unidadeValorEntrada = entrada.unidade_valor_original || unidadeEntrada;
      const quantidadeBruta = Number(entrada.quantidade_inicial ?? entrada.quantidade ?? 0) || 0;
      const quantidadeConvertida = convertBetweenUnits(quantidadeBruta, unidadeEntrada, unidadeBase);

      if (!Number.isFinite(quantidadeConvertida) || Math.abs(quantidadeConvertida) < EPSILON) {
        continue;
      }

      const valorTotalEntrada = Number(entrada.valor_total ?? 0) || 0;
      if (valorTotalEntrada > 0) {
        return valorTotalEntrada / quantidadeConvertida;
      }

      const valorInformado = Number(entrada.valor ?? entrada.valor_medio ?? 0) || 0;
      if (valorInformado > 0) {
        return convertValueBetweenUnits(valorInformado, unidadeValorEntrada, unidadeBase);
      }
    }

    return 0;
  }, [productGroup]);

  useEffect(() => {
    if (isOpen && productGroup) {
      // Pré-preencher com quantidade mínima necessária
      setQuantidade(quantidadeFaltante.toFixed(2));
      
      // Pré-preencher com preço médio do grupo
      const precoParaSugestao = Number.isFinite(precoSugerido) && precoSugerido > 0
        ? Math.round(precoSugerido * 100)
        : 0;
      const result = formatCurrencyInput(precoParaSugestao.toString());
      setValor(result.numeric.toString());
      setValorDisplay(result.formatted);

      // Campos adicionais começam sempre em branco para evitar preenchimento indevido
      setLote('');
      setValidade('');
      setFornecedor('');
    }
  }, [isOpen, productGroup, quantidadeFaltante, precoSugerido]);

  if (!isOpen || !productGroup) return null;

  const handleValorChange = (value: string) => {
    const result = formatCurrencyInput(value);
    setValor(result.numeric.toString());
    setValorDisplay(result.formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const qtd = Number(quantidade);
    const valorUnitario = Number(valor);

    if (qtd <= 0) {
      alert('Quantidade deve ser maior que zero');
      return;
    }

    if (qtd < quantidadeFaltante) {
      const confirmar = confirm(
        `Você está adicionando ${qtd} ${unidade}, mas o déficit é de ${quantidadeFaltante.toFixed(2)} ${unidade}.\n\nO estoque ainda ficará negativo. Deseja continuar?`
      );
      if (!confirmar) return;
    }

    if (valorUnitario <= 0) {
      alert('Valor unitário deve ser maior que zero');
      return;
    }

    if (!fornecedor.trim()) {
      alert('Informe o fornecedor responsável pela entrada.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Cadastrar nova entrada para zerar o déficit
      await EstoqueService.addProduto({
        nome_produto: productGroup.nome,
        marca: productGroup.marcas[0] || 'Ajuste',
        categoria: productGroup.categorias[0] || 'Outro',
        unidade: unidade,
        quantidade: qtd,
        valor: valorUnitario * qtd, // Valor total
        lote: lote || null,
        validade: validade || null,
        fornecedor: fornecedor || null,
        registro_mapa: null,
      });

      onSaved();
      onClose();
      
      // Resetar form
      setQuantidade('');
      setValor('');
      setValorDisplay('R$ 0,00');
      setLote('');
      setValidade('');
      setFornecedor('');
    } catch (error) {
      console.error('❌ Erro ao ajustar estoque:', error);
      alert(error instanceof Error ? error.message : 'Erro ao ajustar estoque.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[18px] shadow-[0_1px_6px_rgba(0,68,23,0.12)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[rgba(0,68,23,0.08)]">
          <h2 className="text-xl font-bold text-[#004417]">Ajustar Estoque Negativo</h2>
          <button onClick={onClose} className="hover:bg-[rgba(0,68,23,0.05)] p-1 rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#004417]" />
          </button>
        </div>

        {/* Alerta de Estoque Negativo */}
        <div className="p-6 pb-0">
          <div className="bg-[#FFF6EB] border-l-4 border-[#F7941F] p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#F7941F] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#B85800] mb-1">
                  Estoque Negativo Detectado
                </p>
                <p className="text-sm text-[#7A4A0E]">
                  <strong>{productGroup.nome}</strong> está com déficit de{' '}
                  <strong className="font-bold">{quantidadeFaltante.toFixed(2)} {formatUnitFull(unidade)}</strong>
                </p>
                <p className="text-xs text-[#7A4A0E] mt-2">
                  Registre uma entrada para corrigir o saldo do estoque.
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-[#004417] mb-2">
              Quantidade a Adicionar <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min={0}
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="w-full px-4 py-3 pr-16 rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,68,23,0.06)] border border-[rgba(0,68,23,0.12)] text-[#004417] placeholder:text-gray-400 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                placeholder="0.00"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[rgba(0,68,23,0.6)]">
                {formatUnitFull(unidade)}
              </span>
            </div>
            <p className="text-xs text-[rgba(0,68,23,0.6)] mt-1.5">
              Mínimo recomendado: <strong>{quantidadeFaltante.toFixed(2)} {formatUnitFull(unidade)}</strong>
            </p>
          </div>

          {/* Valor Unitário */}
          <div>
            <label className="block text-sm font-medium text-[#004417] mb-2">
              Valor Unitário <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={valorDisplay}
                onChange={(e) => handleValorChange(e.target.value)}
                onFocus={() => {
                  if (valorDisplay === 'R$ 0,00') {
                    setValor('0');
                    setValorDisplay('');
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value || e.target.value.trim() === '') {
                    const result = formatCurrencyInput('0');
                    setValor('0');
                    setValorDisplay(result.formatted);
                  }
                }}
                className="w-full px-4 py-3 pr-20 rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,68,23,0.06)] border border-[rgba(0,68,23,0.12)] text-[#004417] font-medium text-lg placeholder:text-gray-400 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
                placeholder="R$ 0,00"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[rgba(0,68,23,0.6)]">
                / {formatUnitFull(unidade)}
              </span>
            </div>
            <p className="text-xs text-[rgba(0,68,23,0.6)] mt-1.5">
              Sugestão (última entrada): <strong>{formatCurrency(precoSugerido)}</strong>
            </p>
          </div>

          {/* Fornecedor */}
          <div>
            <label className="block text-sm font-medium text-[#004417] mb-2">
              Fornecedor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              className="w-full px-4 py-3 rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,68,23,0.06)] border border-[rgba(0,68,23,0.12)] text-[#004417] placeholder:text-gray-400 focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
              placeholder="Ex.: Cooxupé, Agro Silva"
              required
            />
          </div>

          {/* Informações Adicionais (Opcional) */}
          <div className="border-t border-[rgba(0,68,23,0.08)] pt-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#004417] mb-3">Informações Adicionais (Opcional)</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#004417] mb-1">Lote</label>
                <input
                  type="text"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-white shadow-[0_1px_3px_rgba(0,68,23,0.06)] border border-[rgba(0,68,23,0.08)] text-[#004417] placeholder:text-gray-400"
                  placeholder="Ex.: L001-2025"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#004417] mb-1">Validade</label>
                <DateInput
                  value={validade}
                  onChange={setValidade}
                  placeholder="Selecione a validade"
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview do Valor Total */}
          {Number(quantidade) > 0 && Number(valor) > 0 && (
            <div className="bg-[rgba(0,166,81,0.08)] border border-[rgba(0,166,81,0.15)] rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-[#004417]">Valor Total da Entrada</span>
                <span className="text-lg font-bold text-[#00A651]">
                  {formatCurrency(Number(quantidade) * Number(valor))}
                </span>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white text-[#004417] rounded-[12px] hover:bg-[rgba(0,166,81,0.04)] transition-colors border border-[rgba(0,68,23,0.12)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-[#00A651] text-white rounded-[12px] hover:bg-[#008a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Registrar Entrada</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
