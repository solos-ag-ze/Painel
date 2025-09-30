// src/components/Estoque/ListaProdutosDesktop.tsx
import React from "react";
import { Minus, Paperclip } from "lucide-react";
import { ProdutoEstoque } from "../../services/estoqueService";

interface Props {
  produtos: ProdutoEstoque[];
  formatDate: (dateString: string | null) => string;
  getCategoryIcon: (categoria: string) => JSX.Element;
  openAttachmentModal: (productId: string, productName: string) => void;
  setHistoryModal: (value: { isOpen: boolean; product: ProdutoEstoque | null }) => void;
  setRemoveModal: (value: { isOpen: boolean; product: ProdutoEstoque | null; quantidade: number; observacao: string }) => void;
}

export default function ListaProdutosDesktop({
  produtos,
  formatDate,
  getCategoryIcon,
  openAttachmentModal,
  setHistoryModal,
  setRemoveModal,
}: Props) {
  return (
    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#092f20]">Produtos em Estoque</h3>
      </div>

      {/* Lista */}
      <div>
        {produtos.map((item) => (
          <div
            key={item.id}
            className="relative flex flex-col md:flex-row md:items-center gap-4 p-6 hover:bg-[#8fa49d]/5 border-t border-gray-100 first:border-t-0"
          >
            {/* 1) ÍCONE */}
            <div className="w-20 flex items-center justify-center">
              {getCategoryIcon(item.categoria)}
            </div>

            {/* 2) NOME / MARCA / CATEGORIA */}
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-[#092f20] truncate">
                {item.nome_produto}
              </h4>
              <p className="text-sm text-gray-600 truncate">
                {item.marca || "Marca não informada"}
              </p>
              <p className="text-sm text-gray-700 font-medium truncate">
                {item.fornecedor || "—"}
              </p>
              <span className="text-xs font-medium px-2 py-0.5 bg-[#397738]/10 text-[#397738] rounded-full">
                {item.categoria}
              </span>
            </div>

            {/* 3) QUANTIDADE / VALOR UNITÁRIO */}
            <div className="flex gap-6 shrink-0">
              <div className="text-center">
                <p className="text-xs text-gray-500">Quantidade</p>
                <p className="text-lg font-bold text-[#092f20]">
                  {item.quantidade} {item.unidade}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Valor Unitário</p>
                <p className="text-lg font-bold text-[#397738]">
                  {item.valor != null
                    ? `R$ ${Number(item.valor).toLocaleString("pt-BR")}`
                    : "—"}
                </p>
              </div>
            </div>

            {/* 4) BOTÕES */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() =>
                  openAttachmentModal(String(item.id), item.nome_produto)
                }
                className="px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg border border-gray-200 text-xs flex items-center gap-1"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                onClick={() => setHistoryModal({ isOpen: true, product: item })}
                className="px-3 py-1.5 bg-[#397738]/10 text-[#397738] hover:bg-[#397738]/10 rounded-lg border border-[#397738]/10 text-xs flex items-center gap-1"
              >
                📊 Histórico
              </button>

              <button
                onClick={() =>
                  setRemoveModal({
                    isOpen: true,
                    product: item,
                    quantidade: 1,
                    observacao: "",
                  })
                }
                className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg border border-red-200 text-xs flex items-center gap-1"
              >
                <Minus className="w-4 h-4" /> Remover
              </button>
            </div>

            {/* 5) RODAPÉ */}
            <div className="absolute bottom-2 left-28 md:left-auto md:right-6 text-xs text-gray-400 flex gap-4">
              <span>Lote: {item.lote ?? "-"}</span>
              <span>Validade: {formatDate(item.validade)}</span>
              <span>Lançado em {formatDate(item.created_at ?? null)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
