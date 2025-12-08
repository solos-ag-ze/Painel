// src/components/Estoque/ListaProdutosMobile.tsx
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import { formatUnitFull } from '../../lib/formatUnit';
import { formatCurrency } from '../../lib/currencyFormatter';
import { AlertTriangle } from 'lucide-react';

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
  onAjustarEstoque?: (product: ProdutoAgrupado) => void;
}

export default function ListaProdutosMobile({
  produtos,
  getCategoryIcon,
  setHistoryModal,
  setRemoveModal,
  onAjustarEstoque,
}: Props) {
  return (
    <div className="block md:hidden bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,68,23,0.08)] overflow-hidden relative">
      {/* Cabeçalho */}
      <div className="px-4 py-4 border-b border-[rgba(0,68,23,0.08)]">
        <h3 className="text-[16px] font-bold text-[#004417]">Produtos em Estoque</h3>
      </div>

      {/* Lista */}
      <div className="divide-y divide-[rgba(0,68,23,0.08)]">
        {produtos.map((item) => (
          <div key={item.nome} className="p-4 space-y-3 active:bg-[rgba(0,68,23,0.02)] transition-all">
            {/* Cabeçalho: ícone + nome */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 flex items-center justify-center bg-[rgba(0,68,23,0.05)] rounded-xl">
                {getCategoryIcon(item.categorias[0] || '')}
              </div>
              <div className="flex-1">
                <h4 className="text-[15px] font-bold text-[#004417] leading-tight">
                  {item.nome}
                </h4>
                <span className="inline-block text-[12px] font-medium px-2 py-0.5 bg-[rgba(0,166,81,0.1)] text-[#00A651] rounded-xl mt-1">
                  {item.categorias.join(', ')}
                </span>
              </div>
            </div>

            {/* Quantidade e Valor */}
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-[13px] text-[rgba(0,68,23,0.6)] mb-0.5">Qtd.</p>
                <p className="text-[15px] font-semibold text-[#004417]">
                  {(item.quantidadeLiquidaAtual ?? item.totalEstoqueDisplay).toFixed(2)}{' '}
                  <span className="text-[13px] text-[rgba(0,68,23,0.7)]">{formatUnitFull(item.unidadeDisplay)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-[rgba(0,68,23,0.6)] mb-0.5">Valor Méd.</p>
                <p className="text-[15px] font-bold text-[#004417]">
                  {(() => {
                    const valorMedio = item.mediaPrecoAtual ?? item.mediaPrecoDisplay;
                    const unidadeValor = item.unidadeValorOriginal || item.unidadeDisplay;

                    if (valorMedio == null || unidadeValor == null) return "—";

                    return `${formatCurrency(Number(valorMedio))} / ${formatUnitFull(unidadeValor)}`;
                  })()}
                </p>
              </div>
            </div>

            {/* Badge Estoque Negativo */}
            {item.totalEstoqueDisplay < 0 && (
              <div className="bg-[#FFF6EB] border border-[rgba(247,148,31,0.45)] rounded-xl px-3.5 py-3 shadow-[0_4px_12px_rgba(0,68,23,0.06)]">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[rgba(247,148,31,0.16)] flex items-center justify-center text-[#F7941F]">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#B85800]">Estoque negativo</p>
                    <p className="text-[12px] text-[#7A4A0E]">
                      {Math.abs(item.totalEstoqueDisplay).toFixed(2)}{' '}
                      {formatUnitFull(item.unidadeDisplay)} em déficit
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onAjustarEstoque?.(item)}
                  className="w-full px-3 py-1.5 text-[12px] font-semibold text-[#004417] bg-white border border-[rgba(0,68,23,0.18)] rounded-lg active:bg-[rgba(0,68,23,0.05)] transition-colors"
                >
                  Ajustar estoque
                </button>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-2">
              {(
                  <>
                    <button
                      onClick={() => setHistoryModal({ isOpen: true, product: item })}
                      className="px-3 py-1.5 bg-[rgba(0,68,23,0.05)] text-[#004417] active:bg-[rgba(0,166,81,0.12)] rounded-lg text-[13px] font-medium transition-all"
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
                      className="px-3 py-1.5 bg-[rgba(247,148,31,0.1)] text-[#F7941F] active:bg-[rgba(247,148,31,0.15)] rounded-lg text-[13px] font-medium transition-all"
                    >
                      Remover
                    </button>
                  </>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
