// src/components/Estoque/RemoveQuantityModal.tsx
import { X } from "lucide-react";
import { ProdutoAgrupado } from "../../services/agruparProdutosService";
import { convertBetweenUnits, isMassUnit, isVolumeUnit } from "../../lib/unitConverter";
import { formatSmartCurrency } from "../../lib/currencyFormatter";
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
  if (!isOpen || !productGroup) return null;

  // Determinar as unidades disponíveis baseado no tipo do produto
  const primeiraUnidade = productGroup.produtos[0]?.unidade || 'un';
  const ehMassa = isMassUnit(primeiraUnidade);
  const ehVolume = isVolumeUnit(primeiraUnidade);
  
  const unidadesDisponiveis = ehMassa
    ? ['mg', 'g', 'kg', 'ton']
    : ehVolume
    ? ['mL', 'L']
    : ['un'];

  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>(
    productGroup.unidadeValorOriginal || productGroup.unidadeDisplay
  );

  // Atualizar unidade selecionada quando o produto mudar
  useEffect(() => {
    if (productGroup) {
      setUnidadeSelecionada(productGroup.unidadeValorOriginal || productGroup.unidadeDisplay);
    }
  }, [productGroup]);

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

  // Validar se a quantidade é válida (comparando com totalEstoqueDisplay que está na unidade de referência)
  const isInvalid = quantidade <= 0 || quantidadeConvertida > productGroup.totalEstoqueDisplay;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#092f20]">
            Remover do Estoque
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Produto */}
        <p className="text-sm text-gray-600 mb-4">
          Produto: <strong>{productGroup.nome}</strong>
        </p>

        {/* Informações do Estoque */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <p className="text-sm text-gray-600">
            Quantidade disponível:{" "}
            <strong>
              {productGroup.totalEstoqueDisplay.toFixed(2)} {productGroup.unidadeDisplay}
            </strong>
          </p>
          {productGroup.mediaPrecoOriginal !== null && productGroup.mediaPrecoOriginal > 0 && (
            <p className="text-sm text-gray-600">
              Valor médio:{" "}
              <strong className="text-[#397738]">
                {formatSmartCurrency(productGroup.mediaPrecoOriginal)} / {productGroup.unidadeValorOriginal}
              </strong>
            </p>
          )}
        </div>

        {/* Seletor de Unidade */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#092f20] mb-1">
            Unidade de Medida
          </label>
          <select
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-transparent"
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
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#092f20] mb-1">
            Quantidade a Remover
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDecrement}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              -
            </button>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantidade}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-center"
            />
            <button
              onClick={handleIncrement}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              +
            </button>
          </div>
          {/* Feedback visual da conversão */}
          {unidadeSelecionada !== unidadeReferencia && (
            <p className="text-xs text-gray-500 mt-1">
              = {quantidadeConvertida.toFixed(2)} {unidadeReferencia}
            </p>
          )}
        </div>

        {/* Validação */}
        {isInvalid && (
          <p className="text-red-500 text-sm mb-3">
            Valor inválido: deve ser maior que 0 e não pode exceder o estoque disponível.
          </p>
        )}

        {/* Observação */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#092f20] mb-1">
            Observação (motivo da saída)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-transparent border-gray-300"
            placeholder="Ex.: Produto vencido, uso na lavoura, ajuste de estoque..."
            rows={3}
          />
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(quantidadeConvertida)}
            disabled={isInvalid}
            className={`px-4 py-2 rounded-lg text-white ${
              isInvalid
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  );
}
