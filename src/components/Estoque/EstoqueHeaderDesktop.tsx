// src/components/Estoque/EstoqueHeaderDesktop.tsx
import React from "react";

interface Props {
  resumoEstoque: {
    total: number;
    valorTotal: number;
  };
  onOpenModal: () => void;
}

export default function EstoqueHeaderDesktop({ resumoEstoque, onOpenModal }: Props) {
  return (
    <div className="hidden md:block">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Título e subtítulo */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#092f20]">Controle de Estoque</h2>
          <p className="text-sm font-medium text-[#397738]">
            Produtos cadastrados via WhatsApp
          </p>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total de produtos */}
          <div className="bg-[#86b646]/10 p-6 rounded-lg">
            <p>Total de Produtos</p>
            <p className="text-3xl font-bold">{resumoEstoque.total}</p>
          </div>

          {/* Valor total */}
          <div className="bg-[#8fa49d]/10 p-6 rounded-lg">
            <p>Valor Total</p>
            <p className="text-3xl font-bold">
              R$ {resumoEstoque.valorTotal.toLocaleString()}
            </p>
          </div>

          {/* Botão cadastrar */}
          <div className="bg-[#397738]/10 p-6 rounded-lg border-2 border-dashed border-[#397738]/30">
            <button
              onClick={onOpenModal}
              className="w-full h-full text-[#397738]"
            >
              + Cadastrar Produto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
