import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatDateTimeBR, parseDateFromDB } from '../../lib/dateUtils';
import NfDeleteConfirmModal from '../Estoque/NfDeleteConfirmModal';
import MaquinaEditModal from './MaquinaEditModal';

interface MaquinaData {
  id_maquina: string;
  nome?: string | null;
  categoria?: string | null;
  marca_modelo?: string | null;
  horimetro_atual?: number | null;
  valor_compra?: number | null;
  data_compra?: string | null;
  fornecedor?: string | null;
  numero_serie?: string | null;
  created_at?: string | null;
}

interface Props {
  isOpen: boolean;
  maquinas: MaquinaData[];
  onClose: () => void;
  onEdit: (id: string, payload: Partial<MaquinaData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onConfirmItem: (id: string) => Promise<void>;
  onConfirmAll: () => Promise<void>;
}

export default function IncompleteMaquinasReviewModal({ isOpen, maquinas, onClose, onEdit, onDelete, onConfirmItem, onConfirmAll }: Props) {
  const [processing, setProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);
  const [editingMaquina, setEditingMaquina] = useState<MaquinaData | null>(null);

  // Fecha automaticamente quando não houver mais máquinas para revisar
  useEffect(() => {
    if (isOpen && maquinas.length === 0) {
      const timer = setTimeout(() => {
        onClose();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, maquinas.length]);

  if (!isOpen) return null;

  const formatCurrency = (v: number | null | undefined) => {
    if (v == null) return '-';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const renderCard = (m: MaquinaData) => (
    <div key={m.id_maquina} className="bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.04)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#004417] truncate">{m.nome || 'Máquina sem nome'}</div>
          <div className="mt-1 text-xs text-[#092f20]">Categoria: {m.categoria || '-'}</div>
          <div className="mt-1 text-xs text-[#092f20]">Marca/Modelo: {m.marca_modelo || '-'}</div>
          <div className="mt-1 text-xs text-[#092f20]">Horímetro: {m.horimetro_atual != null ? String(m.horimetro_atual) : '-'}</div>
          <div className="mt-1 text-xs text-[#092f20]">Valor de compra: {formatCurrency(m.valor_compra)}</div>
          <div className="mt-1 text-xs text-[#092f20]">Data de compra: {m.data_compra ? (() => { const d = parseDateFromDB(m.data_compra); return d && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '-'; })() : '-'}</div>
          <div className="mt-1 text-xs text-[#092f20]">Fornecedor: {m.fornecedor || '-'}</div>
          <div className="mt-1 text-xs text-[#092f20]">Nº série: {m.numero_serie || '-'}</div>
          <div className="mt-1 text-xs text-[#004417]/65">{m.created_at ? `Lançado em ${formatDateTimeBR(m.created_at)}` : '-'}</div>
        </div>
        <div className="text-right" />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => setEditingMaquina(m)} className="flex-1 text-sm px-3 py-2 bg-[#86b646] bg-opacity-10 hover:bg-[#86b646] hover:bg-opacity-20 text-[#004417] rounded transition-colors">Editar</button>
        <button onClick={() => onConfirmItem(m.id_maquina)} className="flex-1 text-sm px-3 py-2 bg-[#397738] hover:bg-[#004417] text-white rounded">Confirmar</button>
        <button onClick={() => setDeleteTarget({ id: m.id_maquina, name: m.nome || undefined })} className="flex-1 text-sm px-3 py-2 bg-orange-50 hover:bg-orange-100 text-[#F7941F] rounded font-medium">Excluir</button>
      </div>
    </div>
  );

  // Ordena máquinas por `created_at` — mais recentes primeiro
  const sortedMaquinas = (maquinas || []).slice().sort((a, b) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-start justify-center pt-6 sm:pt-10 bg-black/40 h-screen min-h-screen overflow-auto">
      <div className="w-[95vw] sm:w-[1400px] sm:max-w-[95vw] max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] overflow-auto bg-white sm:rounded-lg rounded-t-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[#004417]">Revisar máquinas</h3>
            <div className="text-sm text-[#092f20] mt-1">Revise e confirme cada máquina ou exclua se não for necessário.</div>
          </div>
          <div>
            <button onClick={onClose} aria-label="Fechar" className="p-2 rounded hover:bg-gray-100">Fechar</button>
          </div>
        </div>

        <div className="mt-6">
          <div className="sm:hidden flex flex-col gap-4">
            {sortedMaquinas.map(renderCard)}
          </div>

          <div className="hidden sm:block overflow-auto bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sortedMaquinas.map(renderCard)}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            disabled={processing}
            onClick={async () => { setProcessing(true); try { await onConfirmAll(); } finally { setProcessing(false); } }}
            className="px-4 py-2 bg-[#397738] hover:bg-[#004417] text-white rounded font-semibold transition-colors"
          >
            {processing ? 'Processando...' : 'Confirmar todas'}
          </button>
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

        <MaquinaEditModal
          isOpen={!!editingMaquina}
          maquina={editingMaquina}
          onClose={() => setEditingMaquina(null)}
          onSave={async (id: string, payload: Partial<MaquinaData>) => { await onEdit(id, payload); }}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
