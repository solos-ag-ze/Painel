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
  deficits?: Record<string, { deficit_quantidade: number; unidade_base: string }>;
  onRegisterEntry?: (product: ProdutoAgrupado) => void;
  unreadCount?: number;
  toggleNotifications?: () => Promise<void>;
  notifButtonRef?: React.RefObject<HTMLButtonElement>;
}

export default function ListaProdutosMobile({
  produtos,
  getCategoryIcon,
  setHistoryModal,
  setRemoveModal,
  deficits,
  onRegisterEntry,
  unreadCount,
  toggleNotifications,
  notifButtonRef,
}: Props) {
  
  function normalizeName(name: string | null | undefined) {
    if (!name || typeof name !== 'string') return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }
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

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-2">
              {(() => {
                const key = normalizeName(item.nome);
                const deficit = deficits?.[key];
                if (deficit && Number(deficit.deficit_quantidade) > 0) {
                  return (
                    <button
                      onClick={() => onRegisterEntry && onRegisterEntry(item)}
                      className="bg-[rgba(0,166,81,0.1)] text-[#00A651] px-3 py-1.5 rounded-lg hover:bg-[rgba(0,166,81,0.15)] transition-all font-medium text-[13px]"
                    >
                      Registrar entrada
                    </button>
                  );
                }

                return (
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
                );
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
