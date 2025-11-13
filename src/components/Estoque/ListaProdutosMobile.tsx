// src/components/Estoque/ListaProdutosMobile.tsx
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import { formatUnitFull } from '../../lib/formatUnit';
import { formatSmartCurrency } from '../../lib/currencyFormatter';

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

export default function ListaProdutosMobile({
  produtos,
  getCategoryIcon,
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
                  {item.totalEstoqueDisplay} {formatUnitFull(item.unidadeDisplay)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">Valor Méd.</p>
                <p className="font-bold text-[#397738]">
                  {item.mediaPrecoDisplay != null
                    ? `${formatSmartCurrency(Number(item.mediaPrecoDisplay))} / ${formatUnitFull(item.unidadeDisplay)}`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-2">
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
