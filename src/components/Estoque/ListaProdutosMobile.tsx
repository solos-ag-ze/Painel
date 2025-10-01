// src/components/Estoque/ListaProdutosMobile.tsx
import { Paperclip } from "lucide-react";
import { ProdutoAgrupado } from '../../services/agruparProdutosService';

type ModalParams = {
  isOpen: boolean;
  product: ProdutoAgrupado | null;
  quantidade?: number;
  observacao?: string;
};

interface Props {
  produtos: ProdutoAgrupado[];
  formatDate: (dateString: string | null) => string;
  getCategoryIcon: (categoria: string) => JSX.Element;
  openAttachmentModal: (productId: string, productName: string) => void;
  setHistoryModal: (params: ModalParams) => void;
  setRemoveModal: (params: ModalParams) => void;
}

export default function ListaProdutosMobile({
  produtos,
  formatDate,
  getCategoryIcon,
  openAttachmentModal,
  setHistoryModal,
  setRemoveModal,
}: Props) {
  return (
    <div className="block md:hidden bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-base font-semibold text-[#092f20]">Produtos em Estoque</h3>
      </div>

      {/* Lista */}
      <div className="divide-y divide-gray-100">
        {produtos.map((item) => (
          <div key={item.nome} className="p-4 space-y-3 hover:bg-[#8fa49d]/5">
            {/* Cabeçalho: ícone + nome */}
            <div className="flex items-center gap-3">
              <div className="w-12 flex items-center justify-center">
                {getCategoryIcon(item.categorias[0] || '')}
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-[#092f20] md:text-lg md:font-semibold">
                  {item.nome}
                </h4>
                <p className="text-xs text-gray-600">
                  {item.marcas.join(', ') || "Marca não informada"}
                </p>
                <p className="text-xs text-gray-700 font-medium">
                  {item.fornecedores.map(f => f.fornecedor).join(', ') || "—"}
                </p>
                <span className="text-[11px] font-medium text-[#397738]">
                  {item.categorias.join(', ')}
                </span>
              </div>
            </div>

            {/* Quantidade e Valor */}
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-gray-500">Qtd.</p>
                <p className="font-bold">
                  {item.totalEstoque} {item.unidades[0]}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Valor Méd.</p>
                <p className="font-bold text-[#397738]">
                  {item.mediaPreco != null
                    ? `R$ ${Number(item.mediaPreco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Rodapé: lote, validade e data */}
            <div className="flex flex-wrap text-xs text-gray-400 gap-4">
              <span>Lotes: {item.lotes.filter(Boolean).join(', ') || '-'}</span>
              <span>Val.: {item.validades.filter(Boolean).map(formatDate).join(', ') || '-'}</span>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() =>
                  openAttachmentModal(String(item.produtos[0].id), item.nome)
                }
                className="px-2 py-1 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg border border-gray-200 text-xs flex items-center gap-1"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <button
                onClick={() => setHistoryModal({ isOpen: true, product: item })}
                className="px-2 py-1 bg-[#397738]/10 text-[#397738] hover:bg-[#397738]/10 rounded-lg border border-[#397738]/10 text-xs flex items-center gap-1"
              >
                Histórico
              </button>

              <button
                onClick={() =>
                  setRemoveModal({
                    isOpen: true,
                    product: item
                  })
                }
                className="px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg border border-red-200 text-xs flex items-center gap-1"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
