// src/components/Estoque/EstoqueHeaderMobile.tsx
import React from "react";
import { formatSmartCurrency } from '../../lib/currencyFormatter';

interface Props {
  resumoEstoque: {
    total: number;
    valorTotal: number;
  };
  onOpenModal: () => void;
}

export default function EstoqueHeaderMobile({ resumoEstoque, onOpenModal }: Props) {
  return (
    <div className="block md:hidden">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        {/* Título e subtítulo */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#092f20]">Controle de Estoque</h2>
          <p className="text-xs text-gray-600">Produtos cadastrados via WhatsApp</p>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-1 gap-4">
          {/* Total de Produtos */}
          <div className="bg-[#86b646]/10 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600">Total de Produtos</p>
            <p className="text-xl font-bold text-[#092f20]">{resumoEstoque.total}</p>
          </div>

          {/* Valor Total */}
          <div className="bg-[#8fa49d]/10 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600">Valor Total</p>
            <p className="text-xl font-bold text-[#092f20]">
              {formatSmartCurrency(resumoEstoque.valorTotal)}
            </p>
          </div>

          {/* Botão cadastrar */}
          <div className="bg-[#397738]/10 p-4 rounded-lg border-2 border-dashed border-[#397738]/30">
            <button
              onClick={onOpenModal}
              className="w-full text-[#397738] font-medium"
            >
              + Cadastrar Produto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
