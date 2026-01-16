import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PendingNfItem } from './NfEditItemModal';
import NfDeleteConfirmModal from './NfDeleteConfirmModal';
import { convertFromStandardUnit } from '../../lib/unitConverter';

interface NfMeta {
  numero?: string;
  fornecedor?: string;
  recebidoEm?: string;
}

interface Props {
  isOpen: boolean;
  meta?: NfMeta;
  items: PendingNfItem[];
  onClose: () => void;
  onEditItem: (item: PendingNfItem) => void;
  onDeleteItem: (id: string) => void;
  onConfirmItem: (id: string) => void;
  onConfirmAll: () => Promise<void>;
}

export default function NfReviewModal({ isOpen, meta, items, onClose, onEditItem, onDeleteItem, onConfirmItem, onConfirmAll }: Props) {
  const [processing, setProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);

  const formatQuantity = (quantidadePadrao: number, unidadePadrao?: string | null, unidadeDesejada?: string | null) => {
    try {
      const from = unidadePadrao || 'un';
      const to = unidadeDesejada || from;
      const converted = convertFromStandardUnit(Number(quantidadePadrao || 0), from, to);
      if (Number.isInteger(converted)) return String(converted);
      // Mostrar até 3 casas decimais, remover zeros à direita
      return String(Number(converted.toFixed(3)).toString());
    } catch (e) {
      return String(quantidadePadrao || 0);
    }
  };

  if (!isOpen) return null;
  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-start justify-center pt-6 sm:pt-10 bg-black/40 h-screen min-h-screen overflow-auto">
      <div className="w-[95vw] sm:w-[1400px] sm:max-w-[95vw] max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] overflow-auto bg-white sm:rounded-lg rounded-t-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[#004417]">Revisar produtos da NF</h3>
            <div className="text-sm text-[#092f20] mt-1">NF {meta?.numero ?? ''} • {meta?.fornecedor ?? ''} • recebida no WhatsApp {meta?.recebidoEm ?? ''}</div>
          </div>
          <div>
            <button onClick={onClose} aria-label="Fechar" className="p-2 rounded hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="mt-6">
          {/* Mobile: cards stacked vertically */}
          <div className="sm:hidden flex flex-col gap-4">
            {items.map((it) => (
              <div key={it.id} className="bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.04)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#004417] truncate">{it.nome_produto}</div>
                    <div className="mt-1 text-xs text-[#092f20]">{it.categoria} • {it.unidade_valor_original ?? it.unidade}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[#092f20] whitespace-nowrap">{formatQuantity(it.quantidade, it.unidade, it.unidade_valor_original)}</div>
                    <div className="text-xs text-[#092f20] mt-1">{it.valor_unitario != null ? `R$ ${Number(it.valor_unitario).toFixed(2)}` : '-'}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => onEditItem(it)} className="flex-1 text-sm px-3 py-2 bg-[#86b646] bg-opacity-10 hover:bg-[#86b646] hover:bg-opacity-20 text-[#004417] rounded transition-colors">Editar</button>
                  <button onClick={() => onConfirmItem(it.id)} className="flex-1 text-sm px-3 py-2 bg-[#397738] hover:bg-[#004417] text-white rounded">Confirmar</button>
                  <button onClick={() => setDeleteTarget({ id: it.id, name: it.nome_produto })} className="flex-1 text-sm px-3 py-2 bg-orange-50 hover:bg-orange-100 text-[#F7941F] rounded font-medium">Excluir</button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: original table */}
          <div className="hidden sm:block overflow-x-auto bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[rgba(0,0,0,0.03)]">
                  <th className="px-3 py-4 text-left text-[14px] font-bold text-[#004417]">Produto</th>
                  <th className="px-6 py-4 text-left text-[14px] font-bold text-[#004417]">Categoria</th>
                  <th className="px-6 py-4 text-center text-[14px] font-bold text-[#004417]">Unidade</th>
                  <th className="px-6 py-4 text-center text-[14px] font-bold text-[#004417]">Quantidade</th>
                  <th className="px-6 py-4 text-center text-[14px] font-bold text-[#004417]">Valor unitário</th>
                  <th className="px-6 py-4 text-left text-[14px] font-bold text-[#004417]"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="bg-white border-b border-[rgba(0,0,0,0.06)]">
                    <td className="px-3 py-5 text-sm text-[#004417] font-medium align-top">{it.nome_produto}</td>
                    <td className="px-6 py-5 text-sm text-[#004417] font-medium align-top">{it.categoria}</td>
                      <td className="px-6 py-5 text-sm text-[#004417] font-medium align-top text-center">{it.unidade_valor_original ?? it.unidade}</td>
                    <td className="px-6 py-5 text-sm text-[#092f20] font-medium align-top whitespace-nowrap text-center">{formatQuantity(it.quantidade, it.unidade, it.unidade_valor_original)}</td>
                    <td className="px-6 py-5 text-sm font-medium text-[#092f20] align-top whitespace-nowrap text-center">{it.valor_unitario != null ? `R$ ${Number(it.valor_unitario).toFixed(2)}` : '-'}</td>
                    <td className="px-6 py-5 text-sm text-right align-top whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button onClick={() => onEditItem(it)} className="text-sm px-3 py-1 bg-[#86b646] bg-opacity-10 hover:bg-[#86b646] hover:bg-opacity-20 text-[#004417] rounded transition-colors">Editar</button>
                        <button onClick={() => onConfirmItem(it.id)} className="text-sm px-3 py-1 bg-[#397738] hover:bg-[#004417] text-white rounded transition-colors">Confirmar</button>
                        <button onClick={() => setDeleteTarget({ id: it.id, name: it.nome_produto })} className="text-sm px-3 py-1 bg-orange-50 hover:bg-orange-100 text-[#F7941F] rounded font-medium transition-colors">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button disabled={processing} onClick={async () => { setProcessing(true); try { await onConfirmAll(); } finally { setProcessing(false); } }} className="px-4 py-2 bg-[#397738] hover:bg-[#004417] text-white rounded font-semibold transition-colors">{processing ? 'Processando...' : 'Confirmar todos e lançar no estoque'}</button>
        </div>
        {/* Delete confirmation modal */}
        <NfDeleteConfirmModal
          isOpen={!!deleteTarget}
          itemName={deleteTarget?.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            if (deleteTarget) {
              onDeleteItem(deleteTarget.id);
              setDeleteTarget(null);
            }
          }}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
