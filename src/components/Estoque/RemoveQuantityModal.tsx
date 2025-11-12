// src/components/Estoque/RemoveQuantityModal.tsx
import { X, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { EstoqueService } from "../../services/estoqueService";
import { ProdutoAgrupado } from "../../services/agruparProdutosService";
import { convertToStandardUnit } from "../../lib/unitConverter";
import { formatSmartCurrency } from "../../lib/currencyFormatter";

interface RemoveQuantityModalProps {
  isOpen: boolean;
  productGroup: ProdutoAgrupado | null;
  quantidade: number;
  setQuantidade: (q: number) => void;
  observacao: string;
  setObservacao: (o: string) => void;
  onConfirm: (unidade: string) => void;
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
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("");
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState<string[]>([]);
  const [estoqueDisponivelNaUnidade, setEstoqueDisponivelNaUnidade] = useState<number>(0);
  const [isInvalid, setIsInvalid] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");

  useEffect(() => {
    if (!productGroup || productGroup.produtos.length === 0) return;

    // Detectar unidades compatíveis baseadas no primeiro produto
    const primeiraUnidade = productGroup.produtos[0].unidade;
    const unidades = EstoqueService.getCompatibleUnits(primeiraUnidade);
    setUnidadesDisponiveis(unidades);

    // Definir unidade display como padrão
    setUnidadeSelecionada(productGroup.unidadeDisplay);
  }, [productGroup]);

  useEffect(() => {
    if (!productGroup || !unidadeSelecionada) return;

    // Converter estoque total disponível para a unidade selecionada
    const unidadeBase = productGroup.produtos[0].unidade;

    try {
      const estoqueEmUnidadePadrao = convertToStandardUnit(
        productGroup.totalEstoqueDisplay,
        productGroup.unidadeDisplay
      );

      const estoqueNaUnidadeSelecionada = convertToStandardUnit(
        estoqueEmUnidadePadrao.quantidade,
        estoqueEmUnidadePadrao.unidade
      );

      // Converter de volta para unidade escolhida
      const quantidadeConvertida =
        estoqueNaUnidadeSelecionada.unidade === unidadeSelecionada
          ? estoqueNaUnidadeSelecionada.quantidade
          : convertToStandardUnit(productGroup.totalEstoque, unidadeBase).quantidade;

      // Converter para unidade selecionada
      const resultado = convertToStandardUnit(quantidadeConvertida, unidadeBase);
      const fatorConversao = getConversionFactor(resultado.unidade, unidadeSelecionada);

      setEstoqueDisponivelNaUnidade(quantidadeConvertida / fatorConversao);
    } catch (error) {
      console.error("Erro ao converter estoque:", error);
      setEstoqueDisponivelNaUnidade(productGroup.totalEstoqueDisplay);
    }
  }, [productGroup, unidadeSelecionada]);

  useEffect(() => {
    // Validar quantidade digitada
    if (quantidade <= 0) {
      setIsInvalid(true);
      setMensagemErro("A quantidade deve ser maior que zero");
    } else if (quantidade > estoqueDisponivelNaUnidade) {
      setIsInvalid(true);
      setMensagemErro(
        `Quantidade indisponível. Você possui apenas ${estoqueDisponivelNaUnidade.toFixed(2)} ${unidadeSelecionada} em estoque`
      );
    } else {
      setIsInvalid(false);
      setMensagemErro("");
    }
  }, [quantidade, estoqueDisponivelNaUnidade, unidadeSelecionada]);

  const getConversionFactor = (fromUnit: string, toUnit: string): number => {
    const massFactors: Record<string, number> = {
      'mg': 1,
      'g': 1000,
      'kg': 1000000,
      'ton': 1000000000
    };

    const volumeFactors: Record<string, number> = {
      'mL': 1,
      'L': 1000
    };

    if (massFactors[fromUnit] && massFactors[toUnit]) {
      return massFactors[toUnit] / massFactors[fromUnit];
    }

    if (volumeFactors[fromUnit] && volumeFactors[toUnit]) {
      return volumeFactors[toUnit] / volumeFactors[fromUnit];
    }

    return 1;
  };

  if (!isOpen || !productGroup) return null;

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

        {/* Nome do Produto */}
        <p className="text-sm text-gray-600 mb-4">
          Produto: <strong>{productGroup.nome}</strong>
        </p>

        {/* Informações de Estoque */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <p className="text-sm text-gray-600">
            Quantidade disponível:{" "}
            <strong>
              {productGroup.totalEstoqueDisplay} {productGroup.unidadeDisplay}
            </strong>
          </p>
          <p className="text-sm text-gray-600">
            Valor médio:{" "}
            <strong className="text-[#397738]">
              {formatSmartCurrency(productGroup.mediaPrecoDisplay)} /{" "}
              {productGroup.unidadeValorOriginal || productGroup.unidadeDisplay}
            </strong>
          </p>
        </div>

        {/* Texto informativo sobre FIFO */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            ℹ️ A remoção será feita automaticamente dos lotes mais antigos (FIFO)
          </p>
        </div>

        {/* Seletor de Unidade */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#092f20] mb-1">
            Unidade
          </label>
          <select
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-transparent"
            value={unidadeSelecionada}
            onChange={(e) => setUnidadeSelecionada(e.target.value)}
          >
            {unidadesDisponiveis.map((unidade) => (
              <option key={unidade} value={unidade}>
                {unidade}
              </option>
            ))}
          </select>
        </div>

        {/* Input de Quantidade */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-[#092f20] mb-1">
            Quantidade a remover
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
              placeholder="Ex: 10"
              className={`w-full px-3 py-2 border rounded-lg text-center focus:ring-2 focus:ring-[#397738] focus:border-transparent ${
                isInvalid ? "border-red-500" : "border-gray-300"
              }`}
            />
            <button
              onClick={handleIncrement}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              +
            </button>
          </div>
        </div>

        {/* Mensagem de Erro */}
        {isInvalid && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{mensagemErro}</p>
          </div>
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
            onClick={() => onConfirm(unidadeSelecionada)}
            disabled={isInvalid}
            className={`px-4 py-2 rounded-lg text-white ${
              isInvalid
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            Remover do Estoque
          </button>
        </div>
      </div>
    </div>
  );
}
