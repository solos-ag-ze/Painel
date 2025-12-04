// src/components/Estoque/ListaProdutosDesktop.tsx
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import { formatUnitFull, formatUnitAbbreviated } from '../../lib/formatUnit';
import { autoScaleQuantity } from '../../lib/unitConverter';
import { formatSmartCurrency } from '../../lib/currencyFormatter';
import { Bell } from 'lucide-react';
import React from 'react';

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
  onRegisterEntry?: (product: ProdutoAgrupado) => void;
  onAjustarEstoque?: (product: ProdutoAgrupado) => void;
  // notificações (opcionais)
  unreadCount?: number;
  toggleNotifications?: () => Promise<void>;
  notifButtonRef?: React.RefObject<HTMLButtonElement>;
}

export default function ListaProdutosDesktop({
  produtos,
  getCategoryIcon,
  setHistoryModal,
  setRemoveModal,
  onRegisterEntry, // eslint-disable-line @typescript-eslint/no-unused-vars
  onAjustarEstoque,
  unreadCount,
  toggleNotifications,
  notifButtonRef,
}: Props) {
  return (
    <div className="hidden md:block bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,68,23,0.08)] overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 py-5 border-b border-[rgba(0,68,23,0.08)] flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[#004417]">Produtos em Estoque</h3>

        {/* botão discreto de notificações (se habilitado) */}
        <div className="ml-4">
          <button
            ref={notifButtonRef}
            onClick={async () => {
              // debug
              // eslint-disable-next-line no-console
              console.log('DEBUG: desktop notif button clicked');
              await toggleNotifications?.();
            }}
            title="Notificações"
            className="relative p-2 rounded-md bg-white/60 hover:bg-white/80 shadow-sm border border-gray-200"
          >
            <Bell className="w-5 h-5 text-[#004417]" />
            {unreadCount && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-orange-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* notifications modal is controlled by parent (EstoquePanel) */}

      {/* Lista */}
      <div className="divide-y divide-[rgba(0,68,23,0.08)]">
        {produtos.map((item) => (
          <div
            key={item.nome}
            className="relative flex flex-col md:flex-row md:items-center gap-4 p-6 hover:bg-[rgba(0,68,23,0.02)] transition-all hover:scale-[1.005]"
          >
            {/* 1) ÍCONE */}
            <div className="w-12 h-12 flex items-center justify-center bg-[rgba(0,68,23,0.05)] rounded-xl">
              {getCategoryIcon(item.categorias[0] || '')}
            </div>

            {/* 2) NOME / CATEGORIA */}
            <div className="flex-1 min-w-0">
              <h4 className="text-[15px] font-bold text-[#004417] truncate mb-1">
                {item.nome}
              </h4>
              <div className="flex items-center gap-2">
                <span className="inline-block text-[12px] font-medium px-2 py-0.5 bg-[rgba(0,166,81,0.1)] text-[#00A651] rounded-xl">
                  {item.categorias.join(', ')}
                </span>
              </div>
            </div>

            {/* 3) QUANTIDADE / VALOR MÉDIO */}
            <div className="flex gap-8 shrink-0">
              <div>
                <p className="text-[13px] text-[rgba(0,68,23,0.6)] mb-0.5">Quantidade</p>
                <p className="text-[15px] font-semibold text-[#004417]">
                  {(() => {
                    const { quantidade, unidade } = autoScaleQuantity(item.totalEstoqueDisplay, item.unidadeDisplay);
                    return (
                      <>
                        {quantidade}{' '}
                        <span className="text-[13px] text-[rgba(0,68,23,0.7)]">
                          {formatUnitAbbreviated(unidade)}
                        </span>
                      </>
                    );
                  })()}
                </p>
              </div>
              <div>
                <p className="text-[13px] text-[rgba(0,68,23,0.6)] mb-0.5">Valor Médio</p>
                <p className="text-[15px] font-bold text-[#004417]">
                  {item.mediaPrecoDisplay != null && item.unidadeValorOriginal
                    ? `${formatSmartCurrency(Number(item.mediaPrecoDisplay))} / ${formatUnitFull(item.unidadeValorOriginal)}`
                    : "—"}            
                </p>
              </div>
            </div>

            {/* 3.5) BADGE ESTOQUE NEGATIVO */}
            {item.totalEstoqueDisplay < 0 && (
              <div className="flex-shrink-0">
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-[200px]">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-red-700 truncate">Estoque Negativo</p>
                      <p className="text-xs text-red-600">{Math.abs(item.totalEstoqueDisplay).toFixed(2)} {formatUnitAbbreviated(item.unidadeDisplay)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAjustarEstoque?.(item)}
                    className="mt-2 w-full px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-xs font-medium transition-colors"
                  >
                    Ajustar Estoque
                  </button>
                </div>
              </div>
            )}

            {/* 4) AÇÕES */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              {(
                  <>
                    <button
                      onClick={() => setHistoryModal({ isOpen: true, product: item })}
                      className="px-3 py-2 bg-[rgba(0,68,23,0.05)] text-[#004417] hover:bg-[rgba(0,166,81,0.12)] rounded-lg text-[13px] font-medium transition-all"
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
                      className="px-3 py-2 bg-[rgba(247,148,31,0.1)] text-[#F7941F] hover:bg-[rgba(247,148,31,0.15)] rounded-lg text-[13px] font-medium transition-all"
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
