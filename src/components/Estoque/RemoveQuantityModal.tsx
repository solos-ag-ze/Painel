// src/components/Estoque/RemoveQuantityModal.tsx
import React from "react";
import { X } from "lucide-react";
import { ProdutoEstoque } from "../../services/estoqueService";

interface RemoveQuantityModalProps {
  isOpen: boolean;
  product: ProdutoEstoque | null;
  quantidade: number;
  setQuantidade: (q: number) => void;
  observacao: string;
  setObservacao: (o: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function RemoveQuantityModal({
  isOpen,
  product,
  quantidade,
  setQuantidade,
  observacao,
  setObservacao,
  onConfirm,
  onClose,
}: RemoveQuantityModalProps) {
  if (!isOpen || !product) return null;

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

  const estoqueAtual = product.quantidade;
  const isInvalid = quantidade <= 0 || quantidade > estoqueAtual;

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
        <p className="text-sm text-gray-600 mb-2">
          Produto: <strong>{product.nome_produto}</strong>
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Quantidade atual:{" "}
          <strong>
            {estoqueAtual} {product.unidade}
          </strong>
        </p>

        {/* Input */}
        <div className="flex items-center gap-2 mb-4">
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

        {/* Validação */}
        {isInvalid && (
          <p className="text-red-500 text-sm mb-3">
            Valor inválido: deve ser maior que 0 e menor ou igual a{" "}
            {estoqueAtual}.
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
            onClick={onConfirm}
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
