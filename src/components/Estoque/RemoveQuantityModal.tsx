// src/components/Estoque/RemoveQuantityModal.tsx
import { X } from "lucide-react";
import { ProdutoAgrupado } from "../../services/agruparProdutosService";
import { convertBetweenUnits, isMassUnit, isVolumeUnit } from "../../lib/unitConverter";
import { formatCurrency } from "../../lib/currencyFormatter";
import { useState, useEffect } from "react";

interface RemoveQuantityModalProps {
  isOpen: boolean;
  productGroup: ProdutoAgrupado | null;
  quantidade: number;
  setQuantidade: (q: number) => void;
  observacao: string;
  setObservacao: (o: string) => void;
  onConfirm: (quantidadeConvertida: number) => void;
  onClose: () => void;
}

export default function RemoveQuantityModal({
  isOpen,
  productGroup,
  quantidade,
  setQuantidade,
  observacao,
  setObservacao,
  onConfirm,
  onClose,
}: RemoveQuantityModalProps) {
  // 🔧 HOOKS PRIMEIRO - antes de qualquer return
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>('kg');

  // Log ao abrir o modal para visualizar o objeto recebido
  useEffect(() => {
    if (isOpen && productGroup) {
      console.group('🟢 RemoveQuantityModal - ProdutoAgrupado recebido');
      console.log('productGroup:', productGroup);
      console.log('produtos:', productGroup.produtos);
      console.log('entradas:', productGroup.entradas);
      console.log('saidas:', productGroup.saidas);
      console.log('unidadeDisplay:', productGroup.unidadeDisplay);
      console.log('totalEstoqueDisplay:', productGroup.totalEstoqueDisplay);
      console.log('mediaPrecoOriginal:', productGroup.mediaPrecoOriginal);
      console.groupEnd();
    }
    if (productGroup) {
      setUnidadeSelecionada(productGroup.unidadeValorOriginal || productGroup.unidadeDisplay);
    }
  }, [isOpen, productGroup]);

  // ✅ Early return DEPOIS dos hooks
  if (!isOpen || !productGroup) return null;

  // Determinar as unidades disponíveis baseado na unidade_base (ou unidadeDisplay)
  const unidadeReferenciaSeletor = productGroup.unidade_base || productGroup.unidadeDisplay || 'un';
  const ehMassa = isMassUnit(unidadeReferenciaSeletor);
  const ehVolume = isVolumeUnit(unidadeReferenciaSeletor);

  const unidadesDisponiveis = ehMassa
    ? ['mg', 'g', 'kg', 'ton']
    : ehVolume
    ? ['mL', 'L']
    : ['un'];

  const handleInputChange = (value: string) => {
    const num = parseFloat(value.replace(",", "."));
    if (!isNaN(num)) setQuantidade(num);
  };

  const handleIncrement = () =>
    setQuantidade(Number((quantidade + 1).toFixed(2)));

  const handleDecrement = () => {
    if (quantidade > 0.01) {
      setQuantidade(Number((quantidade - 1).toFixed(2)));
    }
  };

  // Converter a quantidade informada pelo usuário para a unidade de referência do produto
  // Ex: usuário digita 2 toneladas, produto está em kg → converte para 2000 kg
  const unidadeReferencia = productGroup.unidadeValorOriginal || productGroup.unidadeDisplay;
  const quantidadeConvertida = convertBetweenUnits(
    quantidade,
    unidadeSelecionada,
    unidadeReferencia
  );

  // Validar se a quantidade é válida (comparando com saldo_atual que está na unidade base)
  // Usar tolerância maior para evitar erros de precisão de ponto flutuante ao zerar estoque
  // Aumentado para 0.01 para permitir zerar estoque com variações de arredondamento
  const TOLERANCE = 0.01;
  const isInvalid = quantidade <= 0 || quantidadeConvertida > (productGroup.saldo_atual + TOLERANCE);

  // 🔍 Handler com logs detalhados
  const handleConfirm = () => {
    console.group('🚀 RemoveQuantityModal - Confirmação de Remoção');
    
    console.log('📦 Produto:', productGroup.nome);
    console.log('📊 Dados do Grupo:', {
      totalEstoqueDisplay: productGroup.totalEstoqueDisplay,
      unidadeDisplay: productGroup.unidadeDisplay,
      unidadeValorOriginal: productGroup.unidadeValorOriginal,
      mediaPrecoOriginal: productGroup.mediaPrecoOriginal,
      mediaPrecoDisplay: productGroup.mediaPrecoDisplay,
      produtos: productGroup.produtos.map(p => ({
        id: p.id,
        nome: p.nome_produto,
        quantidade: p.quantidade,
        quantidade_inicial: p.quantidade_inicial,
        unidade: p.unidade,
        valor: p.valor,
        valor_medio: p.valor_medio,
        unidade_valor_original: p.unidade_valor_original
      }))
    });
    
    console.log('👤 Entrada do Usuário:', {
      quantidadeDigitada: quantidade,
      unidadeSelecionada: unidadeSelecionada
    });
    
    console.log('🔄 Conversão:', {
      de: `${quantidade} ${unidadeSelecionada}`,
      para: `${quantidadeConvertida} ${unidadeReferencia}`,
      formula: `${quantidade} × (fator_${unidadeSelecionada} / fator_${unidadeReferencia})`,
      TOLERANCE: 0.0001
    });
    
    console.log('✅ Validação:', {
      isInvalid,
      quantidadeValida: quantidade > 0,
      condicao1: quantidadeConvertida <= productGroup.totalEstoqueDisplay,
      condicao2: quantidadeConvertida <= (productGroup.totalEstoqueDisplay + 0.0001),
      estoqueDisponivel: productGroup.totalEstoqueDisplay,
      quantidadeARemover: quantidadeConvertida,
      diferenca: productGroup.totalEstoqueDisplay - quantidadeConvertida,
      diferencaAbsoluta: Math.abs(productGroup.totalEstoqueDisplay - quantidadeConvertida),
      podeZerar: Math.abs(productGroup.totalEstoqueDisplay - quantidadeConvertida) <= 0.0001
    });
    
    console.log('📝 Observação:', observacao || '(nenhuma)');
    
    console.log('🎯 Parâmetros enviados para EstoqueService.removerQuantidadeFIFO:', {
      nome: productGroup.nome,
      quantidadeConvertida: quantidadeConvertida,
      observacao: observacao,
      mediaPrecoGrupo: productGroup.mediaPrecoDisplay,
      unidadeValorGrupo: productGroup.unidadeValorOriginal
    });
    
    console.log('➡️ Chamando onConfirm() com quantidadeConvertida:', quantidadeConvertida);
    
    console.groupEnd();
    
    onConfirm(quantidadeConvertida);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,68,23,0.1)] max-w-[520px] w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[rgba(0,68,23,0.08)]">
          <h3 className="text-[18px] font-bold text-[#004417]">
            Remover do Estoque
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[rgba(0,68,23,0.5)] hover:text-[#00A651] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Produto */}
        <div className="mb-4">
          <p className="text-[14px] font-semibold text-[#004417] mb-1">Produto</p>
          <p className="text-[16px] font-bold text-[#004417]">{productGroup.nome}</p>
        </div>

        {/* Informações do Estoque */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <p className="text-[14px] font-semibold text-[#004417] mb-1">
              Quantidade disponível
            </p>
            <p className="text-[16px] font-bold text-[#004417]">
              {typeof productGroup.saldo_atual === 'number' ? productGroup.saldo_atual.toFixed(2) : '0.00'} {productGroup.unidade_base || productGroup.unidadeDisplay}
            </p>
          </div>
          {productGroup.custo_unitario_base !== undefined && productGroup.custo_unitario_base > 0 && (
            <div className="text-right">
              <p className="text-[14px] font-semibold text-[#004417] mb-1">
                Valor unitário
              </p>
              <p className="text-[15px] font-bold text-[#00A651]">
                {formatCurrency(productGroup.custo_unitario_base)}
                <span className="text-[rgba(0,68,23,0.7)]"> / {productGroup.unidade_base || productGroup.unidadeDisplay}</span>
              </p>
            </div>
          )}
        </div>

        {/* Seletor de Unidade */}
        <div className="mb-5">
          <label className="block text-[14px] font-semibold text-[#004417] mb-2">
            Unidade de Medida
          </label>
          <select
            className="w-full px-3 py-3 border border-[rgba(0,68,23,0.15)] rounded-xl bg-white text-[#004417] text-[14px] focus:ring-2 focus:ring-[#00A651] focus:border-transparent hover:border-[#00A651] transition-colors"
            value={unidadeSelecionada}
            onChange={(e) => setUnidadeSelecionada(e.target.value)}
          >
            {unidadesDisponiveis.map(unidade => (
              <option key={unidade} value={unidade}>
                {unidade}
              </option>
            ))}
          </select>
        </div>

        {/* Input de Quantidade */}
        <div className="mb-5">
          <label className="block text-[14px] font-semibold text-[#004417] mb-2">
            Quantidade a Remover
          </label>
          <div className="flex items-center bg-[rgba(0,68,23,0.03)] rounded-xl h-12 overflow-hidden">
            <button
              onClick={handleDecrement}
              className="px-4 h-full bg-white hover:bg-[rgba(0,68,23,0.05)] text-[#004417] hover:text-[#00A651] text-[18px] font-bold transition-colors active:bg-[rgba(0,68,23,0.08)]"
            >
              −
            </button>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantidade}
              onChange={(e) => handleInputChange(e.target.value)}
              className="flex-1 px-3 text-center text-[16px] font-bold text-[#004417] bg-transparent border-none focus:outline-none"
            />
            <button
              onClick={handleIncrement}
              className="px-4 h-full bg-white hover:bg-[rgba(0,68,23,0.05)] text-[#004417] hover:text-[#00A651] text-[18px] font-bold transition-colors active:bg-[rgba(0,68,23,0.08)]"
            >
              +
            </button>
          </div>
          {/* Feedback visual da conversão */}
          {unidadeSelecionada !== unidadeReferencia && (
            <p className="text-[12px] text-[rgba(0,68,23,0.6)] mt-2">
              = {quantidadeConvertida.toFixed(2)} {unidadeReferencia}
            </p>
          )}
        </div>

        {/* Validação */}
        {isInvalid && (
          <p className="text-[#F7941F] text-[13px] mb-4 font-medium">
            Valor inválido: deve ser maior que 0 e não pode exceder o estoque disponível.
          </p>
        )}

        {/* Observação */}
        <div className="mb-6">
          <label className="block text-[14px] font-semibold text-[#004417] mb-2">
            Observação (motivo da saída)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full px-3 py-3 border border-[rgba(0,68,23,0.15)] rounded-xl bg-white text-[#004417] text-[14px] placeholder:text-[rgba(0,68,23,0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,166,81,0.15)] focus:border-[#00A651] hover:border-[#00A651] transition-colors resize-none"
            placeholder="Ex.: Produto vencido, uso na lavoura, ajuste de estoque..."
            rows={3}
          />
        </div>

        {/* Ações */}
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl text-[#004417] font-semibold hover:bg-[rgba(0,68,23,0.05)] transition-all duration-200"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isInvalid}
            className={`px-8 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              isInvalid
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-[#F7941F] text-white hover:bg-[#D97706]"
            }`}
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
