// src/components/Estoque/ListaProdutosMobile.tsx
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import { formatUnitFull } from '../../lib/formatUnit';
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
  unreadCount?: number;
  toggleNotifications?: () => Promise<void>;
  notifButtonRef?: React.RefObject<HTMLButtonElement>;
}

export default function ListaProdutosMobile({
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
    <div className="block md:hidden bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,68,23,0.08)] overflow-hidden relative">
      {/* Cabeçalho */}
      <div className="px-4 py-4 border-b border-[rgba(0,68,23,0.08)] flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[#004417]">Produtos em Estoque</h3>
        <div>
          <button
            ref={notifButtonRef}
            onClick={async () => {
              // debug
              // eslint-disable-next-line no-console
              console.log('DEBUG: mobile notif button clicked');
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
                  {item.totalEstoqueDisplay.toFixed(2)} <span className="text-[13px] text-[rgba(0,68,23,0.7)]">{formatUnitFull(item.unidadeDisplay)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-[rgba(0,68,23,0.6)] mb-0.5">Valor Méd.</p>
                <p className="text-[15px] font-bold text-[#004417]">
                  {item.mediaPrecoDisplay != null && item.unidadeValorOriginal
                    ? `${formatSmartCurrency(Number(item.mediaPrecoDisplay))} / ${formatUnitFull(item.unidadeValorOriginal)}`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Badge Estoque Negativo */}
            {item.totalEstoqueDisplay < 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-red-700">Estoque Negativo</p>
                    <p className="text-xs text-red-600">{Math.abs(item.totalEstoqueDisplay).toFixed(2)} {formatUnitFull(item.unidadeDisplay)}</p>
                  </div>
                </div>
                <button
                  onClick={() => onAjustarEstoque?.(item)}
                  className="w-full px-3 py-1.5 bg-red-600 text-white rounded-md active:bg-red-700 text-xs font-medium transition-colors"
                >
                  Ajustar Estoque
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
