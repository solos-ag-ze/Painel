// src/components/Estoque/ListaProdutosDesktop.tsx
import { ProdutoAgrupado } from '../../services/agruparProdutosService';

type ModalParams = {
  isOpen: boolean;
  product: ProdutoAgrupado | null;
  quantidade?: number;
  observacao?: string;
};

interface Props {
  produtos: ProdutoAgrupado[];
  getCategoryIcon: (categoria: string) => JSX.Element;
  setHistoryModal: (params: ModalParams) => void;
  setRemoveModal: (params: ModalParams) => void;
}

export default function ListaProdutosDesktop({
  produtos,
  getCategoryIcon,
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
            key={item.nome}
            className="relative flex flex-col md:flex-row md:items-center gap-4 p-6 hover:bg-[#8fa49d]/5 border-t border-gray-100 first:border-t-0"
          >
            {/* 1) ÍCONE */}
            <div className="w-20 flex items-center justify-center">
              {getCategoryIcon(item.categorias[0] || '')}
            </div>

            {/* 2) NOME / CATEGORIA */}
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-[#092f20] truncate">
                {item.nome}
              </h4>
              <span className="text-xs font-medium px-2 py-0.5 bg-[#397738]/10 text-[#397738] rounded-full">
                {item.categorias.join(', ')}
              </span>
            </div>

            {/* 3) QUANTIDADE / VALOR MÉDIO */}
            <div className="flex gap-6 shrink-0">
              <div className="text-center">
                <p className="text-xs text-gray-500">Quantidade</p>
                <p className="text-lg font-bold text-[#092f20]">
                  {item.totalEstoque} {item.unidades[0]}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Valor Médio</p>
                <p className="text-lg font-bold text-[#397738]">
                  {item.mediaPreco != null
                    ? `R$ ${Number(item.mediaPreco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                    : "—"}
                </p>
              </div>
            </div>

            {/* 4) BOTÕES */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setHistoryModal({ isOpen: true, product: item })}
                className="px-3 py-1.5 bg-[#397738]/10 text-[#397738] hover:bg-[#397738]/10 rounded-lg border border-[#397738]/10 text-xs flex items-center gap-1"
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
                className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg border border-red-200 text-xs flex items-center gap-1"
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
