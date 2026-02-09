import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TransacaoFinanceira } from '../../lib/supabase';
import { formatDateTimeBR } from '../../lib/dateUtils';
import { formatSmartCurrency } from '../../lib/currencyFormatter';
import TransactionEditModal from './TransactionEditModal';
import NfDeleteConfirmModal from '../Estoque/NfDeleteConfirmModal';

interface Props {
  isOpen: boolean;
  transactions: TransacaoFinanceira[];
  onClose: () => void;
  onEdit: (id: string, payload: Partial<TransacaoFinanceira> & { talhao_id?: string | undefined }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onConfirmItem: (id: string) => Promise<void>;
  onConfirmAll: () => Promise<void>;
}

export default function IncompleteFinancialReviewModal({ isOpen, transactions, onClose, onEdit, onDelete, onConfirmItem, onConfirmAll }: Props) {
  const [processing, setProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);
  const [editingTx, setEditingTx] = useState<TransacaoFinanceira | null>(null);

  // Fecha automaticamente quando não houver mais transações para revisar
  useEffect(() => {
    if (isOpen && transactions.length === 0) {
      const timer = setTimeout(() => {
        onClose();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transactions.length]);

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-start justify-center pt-6 sm:pt-10 bg-black/40 h-screen min-h-screen overflow-auto">
      <div className="w-[95vw] sm:w-[1400px] sm:max-w-[95vw] max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] overflow-auto bg-white sm:rounded-lg rounded-t-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[#004417]">Revisar lançamentos incompletos</h3>
            <div className="text-sm text-[#092f20] mt-1">Revise e confirme cada lançamento ou exclua se não for necessário.</div>
          </div>
          <div>
            <button onClick={onClose} aria-label="Fechar" className="p-2 rounded hover:bg-gray-100">Fechar</button>
          </div>
        </div>

        <div className="mt-6">
          {/* Mobile: cards stacked vertically */}
          <div className="sm:hidden flex flex-col gap-4">
            {transactions.map((tx) => (
              <div key={tx.id_transacao} className="bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.04)] p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {(function renderTypeBadge() {
                      const t = String(tx.tipo_transacao || (tx as any).tipo || '').toUpperCase();
                      if (t === 'GASTO') {
                        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-50 text-[#F7941F]">{t}</span>;
                      }
                      if (t === 'RECEITA') {
                        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#86b646] bg-opacity-10 text-[#004417]">{t}</span>;
                      }
                      return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-[#092f20]">{t || '-'}</span>;
                    })()}
                  </div>
                  <div className="mt-1 text-xs text-[#092f20]">{tx.descricao || '-'}</div>
                  <div className="mt-1 text-xs text-[#092f20]">Valor: {tx.valor != null ? formatSmartCurrency(tx.valor) : '-'}</div>
                  <div className="mt-1 text-xs text-[#092f20]">Categoria: {tx.categoria || '-'}</div>
                  <div className="mt-1 text-xs text-[#092f20]">Talhão: {tx.nome_talhao || '-'}</div>
                  <div className="mt-1 text-xs text-[#092f20]">Pagador/Recebedor: {tx.pagador_recebedor || '-'}</div>
                  <div className="mt-1 text-xs text-[#092f20]">Forma: {(tx as any).forma_pagamento || tx.forma_pagamento_recebimento || '-'}</div>
                  
                  <div className="mt-1 text-xs text-[#092f20]">Status: {(tx as any).status || (tx as any).situacao || '-'}</div>
                  <div className="mt-1 text-xs text-[#004417]/65">{(tx.data_registro || tx.data_agendamento_pagamento || tx.data_transacao) ? `Lançado em ${formatDateTimeBR(tx.data_registro || tx.data_agendamento_pagamento || tx.data_transacao)}` : '-'}</div>
                
                </div>

                  <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => setEditingTx(tx)} className="flex-1 text-sm px-3 py-2 bg-[#86b646] bg-opacity-10 hover:bg-[#86b646] hover:bg-opacity-20 text-[#004417] rounded transition-colors">Editar</button>
                  <button
                    onClick={async () => {
                      setProcessing(true);
                      try {
                        if (tx.id_transacao) {
                          await onEdit(tx.id_transacao, { is_completed: true });
                        }
                        await onConfirmItem(tx.id_transacao || '');
                      } finally {
                        setProcessing(false);
                      }
                    }}
                    className="flex-1 text-sm px-3 py-2 bg-[#397738] hover:bg-[#004417] text-white rounded"
                  >
                    Confirmar
                  </button>
                  <button onClick={() => setDeleteTarget({ id: tx.id_transacao || '', name: tx.descricao })} className="flex-1 text-sm px-3 py-2 bg-orange-50 hover:bg-orange-100 text-[#F7941F] rounded font-medium">Excluir</button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: grid de cards (3 colunas) */}
          <div className="hidden sm:block overflow-auto bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {transactions.map((tx) => (
                <div key={tx.id_transacao} className="bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.04)] p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {(function renderTypeBadge() {
                        const t = String(tx.tipo_transacao || (tx as any).tipo || '').toUpperCase();
                        if (t === 'GASTO') {
                          return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-50 text-[#F7941F]">{t}</span>;
                        }
                        if (t === 'RECEITA') {
                          return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#86b646] bg-opacity-10 text-[#004417]">{t}</span>;
                        }
                        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-[#092f20]">{t || '-'}</span>;
                      })()}
                    </div>
                    <div className="mt-1 text-xs text-[#092f20]">{tx.descricao || '-'}</div>
                    <div className="mt-1 text-xs text-[#092f20]">Valor: {tx.valor != null ? formatSmartCurrency(tx.valor) : '-'}</div>
                    <div className="mt-1 text-xs text-[#092f20]">Categoria: {tx.categoria || '-'}</div>
                    <div className="mt-1 text-xs text-[#092f20]">Talhão: {tx.nome_talhao || '-'}</div>
                    <div className="mt-1 text-xs text-[#092f20]">Pagador/Recebedor: {tx.pagador_recebedor || '-'}</div>
                    <div className="mt-1 text-xs text-[#092f20]">Forma: {(tx as any).forma_pagamento || tx.forma_pagamento_recebimento || '-'}</div>
                    <div className="mt-1 text-xs text-[#092f20]">Status: {(tx as any).status || (tx as any).situacao || '-'}</div>
                    <div className="mt-1 text-xs text-[#004417]/65">{(tx.data_registro || tx.data_agendamento_pagamento || tx.data_transacao) ? `Lançado em ${formatDateTimeBR(tx.data_registro || tx.data_agendamento_pagamento || tx.data_transacao)}` : '-'}</div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setEditingTx(tx)} className="flex-1 text-sm px-3 py-2 bg-[#86b646] bg-opacity-10 hover:bg-[#86b646] hover:bg-opacity-20 text-[#004417] rounded transition-colors">Editar</button>
                    <button
                      onClick={async () => {
                        setProcessing(true);
                        try {
                          if (tx.id_transacao) {
                            await onEdit(tx.id_transacao, { is_completed: true });
                          }
                          await onConfirmItem(tx.id_transacao || '');
                        } finally {
                          setProcessing(false);
                        }
                      }}
                      className="flex-1 text-sm px-3 py-2 bg-[#397738] hover:bg-[#004417] text-white rounded"
                    >
                      Confirmar
                    </button>
                    <button onClick={() => setDeleteTarget({ id: tx.id_transacao || '', name: tx.descricao })} className="flex-1 text-sm px-3 py-2 bg-orange-50 hover:bg-orange-100 text-[#F7941F] rounded font-medium">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button disabled={processing} onClick={async () => { setProcessing(true); try { await onConfirmAll(); } finally { setProcessing(false); } }} className="px-4 py-2 bg-[#397738] hover:bg-[#004417] text-white rounded font-semibold transition-colors">{processing ? 'Processando...' : 'Confirmar todos'}</button>
        </div>

        <NfDeleteConfirmModal
          isOpen={!!deleteTarget}
          itemName={deleteTarget?.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (deleteTarget) {
              await onDelete(deleteTarget.id);
              setDeleteTarget(null);
            }
          }}
        />

        <TransactionEditModal
          isOpen={!!editingTx}
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSave={async (id, payload) => {
            await onEdit(id, payload);
          }}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
