import { useState, useEffect } from 'react';
import { EstoqueService } from '../../services/estoqueService';
import { createPortal } from 'react-dom';
import type { ActivityPayload } from '../../types/activity';
import ActivityEditModal from './ActivityEditModal';
import { formatDateBR, formatDateTimeBR } from '../../lib/dateUtils';
import NfDeleteConfirmModal from '../Estoque/NfDeleteConfirmModal';

interface Props {
  isOpen: boolean;
  activities: ActivityPayload[];
  onClose: () => void;
  onEdit: (id: string, payload: ActivityPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onConfirmItem: (id: string) => Promise<string | null>;
  onConfirmAll: () => Promise<void>;
}

export default function IncompleteActivitiesReviewModal({ isOpen, activities, onClose, onEdit, onDelete, onConfirmItem, onConfirmAll }: Props) {
  const [produtosCadastro, setProdutosCadastro] = useState<any[]>([]);
    // Carregar produtos do cadastro_produtos ao abrir o modal
    useEffect(() => {
      async function fetchProdutos() {
        try {
          const list = await EstoqueService.getProdutosCadastro && await EstoqueService.getProdutosCadastro();
          setProdutosCadastro(list || []);
        } catch (e) {
          setProdutosCadastro([]);
        }
      }
      if (isOpen) fetchProdutos();
    }, [isOpen]);
  const [processing, setProcessing] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityPayload | null>(null);
  const [fifoError, setFifoError] = useState<string | null>(null);

  // Fecha automaticamente quando não houver mais atividades para revisar
  useEffect(() => {
    if (isOpen && activities.length === 0) {
      const timer = setTimeout(() => {
        onClose();
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activities.length]);

  if (!isOpen) return null;

  // Ordena atividades por created_at (mais recente primeiro)
  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA; // Decrescente (mais recente primeiro)
  });

  // Enriquecer produtos das atividades com dados do cadastro_produtos
  function enrichProdutos(produtos: any[]) {
    return (produtos || []).map((p) => {
      const cadastro = produtosCadastro.find((c) => c.id === (p.produto_id || p.produto_catalogo_id));
      return {
        ...p,
        nome: cadastro?.nome || p.nome_produto || p.nome || '-',
        unidade_base: cadastro?.unidade_base,
        marca: cadastro?.marca_ou_fabricante,
        categoria: cadastro?.categoria,
        fornecedor: cadastro?.fornecedor,
        registro_mapa: cadastro?.registro_mapa,
      };
    });
  }

  // Debug: log activities to check structure
  console.log('🔍 IncompleteActivities modal activities:', sortedActivities);
  sortedActivities.forEach(act => {
    console.log(`Activity "${act.descricao}":`, { 
      produtos: act.produtos, 
      maquinas: act.maquinas,
      responsaveis: act.responsaveis,
      created_at: act.created_at,
      data_atividade: act.data_atividade,
      updated_at: act.updated_at
    });
  });

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-start justify-center pt-6 sm:pt-10 bg-black/40 h-screen min-h-screen overflow-auto">
      <div className="w-[95vw] sm:w-[1400px] sm:max-w-[95vw] max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-5rem)] overflow-auto bg-white sm:rounded-lg rounded-t-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-[#004417]">Revisar atividades incompletas</h3>
            <div className="text-sm text-[#092f20] mt-1">Revise e confirme cada atividade agrícola ou exclua se não for necessária.</div>
          </div>
          <div>
            <button onClick={onClose} aria-label="Fechar" className="p-2 rounded hover:bg-gray-100">Fechar</button>
          </div>
        </div>

        {/* Banner de erro FIFO */}
        {fifoError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-red-500 text-lg mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Não foi possível confirmar</p>
              <p className="text-sm text-red-700 mt-1">{fifoError}</p>
            </div>
            <button onClick={() => setFifoError(null)} className="text-red-400 hover:text-red-600 text-lg px-1">&times;</button>
          </div>
        )}

        <div className="mt-6">
          {/* Mobile: cards stacked vertically */}
          <div className="sm:hidden flex flex-col gap-4">
            {sortedActivities.map((act) => (
              <div key={act.id || act.descricao} className="bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.04)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#004417] truncate">{act.descricao}</div>
                    <div className="mt-1 text-xs text-[#092f20]">Talhão: {act.nome_talhao ? act.nome_talhao.charAt(0).toUpperCase() + act.nome_talhao.slice(1) : '-'}</div>
                    {(act.responsaveis && Array.isArray(act.responsaveis) && act.responsaveis.length > 0) && (
                      <div className="mt-2 text-xs text-[#092f20]">
                        <span className="font-semibold text-[13px] text-[#004417]">Responsáveis:</span> {act.responsaveis.map((r: any) => r.nome).filter(Boolean).join(', ')}
                      </div>
                    )}
                    {(act.produtos && Array.isArray(act.produtos) && act.produtos.length > 0) && (
                      <div className="mt-2 text-xs text-[#092f20]">
                        <div className="font-semibold text-[13px] text-[#004417]">Produtos:</div>
                        <ul className="list-disc ml-4">
                          {enrichProdutos(act.produtos).map((p: any, idx: number) => {
                            const nomeProduto = p.nome || '-';
                            const nomeCapitalizado = nomeProduto === '-' ? nomeProduto : nomeProduto.charAt(0).toUpperCase() + nomeProduto.slice(1);
                            return (
                              <li key={p.id || idx} className="text-xs text-[#092f20]">
                                {nomeCapitalizado}
                                {p.marca ? ` (${p.marca})` : ''}
                                {p.categoria ? ` — ${p.categoria}` : ''}
                                {' — '}{p.quantidade_val || p.quantidade || '-'} {p.quantidade_un || p.unidade || p.unidade_base || ''}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {(act.maquinas && Array.isArray(act.maquinas) && act.maquinas.length > 0) && (
                      <div className="mt-2 text-xs text-[#092f20]">
                        <div className="font-semibold text-[13px] text-[#004417]">Máquinas:</div>
                        <ul className="list-disc ml-4">
                          {act.maquinas.map((m: any, idx: number) => {
                            const nomeMaquina = m.nome_maquina || m.nome || '-';
                            const nomeCapitalizado = nomeMaquina === '-' ? nomeMaquina : nomeMaquina.charAt(0).toUpperCase() + nomeMaquina.slice(1);
                            return (
                              <li key={m.id || idx} className="text-xs text-[#092f20]">{nomeCapitalizado} — {(m.horas_maquina ?? m.horas) ? `${m.horas_maquina ?? m.horas}h` : '-'}</li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {(act.observacoes) && (
                      <div className="mt-2 text-xs text-[#092f20]"><span className="font-semibold text-[13px] text-[#004417]">Observações:</span> {act.observacoes}</div>
                    )}
                    <div className="mt-2 text-xs text-[#004417]/65">
                      {act.created_at ? `Lançado em ${formatDateTimeBR(act.created_at)}` : '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => setEditingActivity(act)} className="flex-1 text-sm px-3 py-2 bg-[#86b646] bg-opacity-10 hover:bg-[#86b646] hover:bg-opacity-20 text-[#004417] rounded transition-colors">Editar</button>
                  <button disabled={confirmingId === act.id} onClick={async () => { setFifoError(null); setConfirmingId(act.id || ''); const err = await onConfirmItem(act.id || ''); if (err) setFifoError(err); setConfirmingId(null); }} className="flex-1 text-sm px-3 py-2 bg-[#397738] hover:bg-[#004417] text-white rounded disabled:opacity-50">{confirmingId === act.id ? 'Processando...' : 'Confirmar'}</button>
                  <button onClick={() => setDeleteTarget({ id: act.id || '', name: act.descricao })} className="flex-1 text-sm px-3 py-2 bg-orange-50 hover:bg-orange-100 text-[#F7941F] rounded font-medium">Excluir</button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/tablet: grid de cards (3 colunas) */}
          <div className="hidden sm:block overflow-auto bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sortedActivities.map((act) => (
                <div key={act.id || act.descricao} className="bg-white rounded-lg shadow-sm border border-[rgba(0,0,0,0.04)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#004417] truncate">{act.descricao}</div>
                      <div className="mt-1 text-xs text-[#092f20]">{''}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-[#092f20] whitespace-nowrap">{act.nome_talhao ? act.nome_talhao.charAt(0).toUpperCase() + act.nome_talhao.slice(1) : '-'}</div>
                    </div>
                  </div>

                  {(act.responsaveis && Array.isArray(act.responsaveis) && act.responsaveis.length > 0) && (
                    <div className="mt-3 text-xs text-[#092f20]">
                      <span className="font-semibold text-[13px] text-[#004417]">Responsáveis:</span> {act.responsaveis.map((r: any) => r.nome).filter(Boolean).join(', ')}
                    </div>
                  )}

                  {(act.produtos && Array.isArray(act.produtos) && act.produtos.length > 0) && (
                    <div className="mt-2 text-xs text-[#092f20]">
                      <div className="font-semibold text-[13px] text-[#004417]">Produtos:</div>
                      <ul className="list-disc ml-4">
                        {act.produtos.map((p: any, idx: number) => {
                          const nomeProduto = p.nome_produto || p.nome || '-';
                          const nomeCapitalizado = nomeProduto === '-' ? nomeProduto : nomeProduto.charAt(0).toUpperCase() + nomeProduto.slice(1);
                          return (
                            <li key={p.id || idx} className="text-xs text-[#092f20]">
                              {nomeCapitalizado} — {p.quantidade_val || p.quantidade || '-'} {p.quantidade_un || p.unidade || ''}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {(act.maquinas && Array.isArray(act.maquinas) && act.maquinas.length > 0) && (
                    <div className="mt-2 text-xs text-[#092f20]">
                      <div className="font-semibold text-[13px] text-[#004417]">Máquinas:</div>
                      <ul className="list-disc ml-4">
                        {act.maquinas.map((m: any, idx: number) => {
                          const nomeMaquina = m.nome_maquina || m.nome || '-';
                          const nomeCapitalizado = nomeMaquina === '-' ? nomeMaquina : nomeMaquina.charAt(0).toUpperCase() + nomeMaquina.slice(1);
                          return (
                            <li key={m.id || idx} className="text-xs text-[#092f20]">{nomeCapitalizado} — {(m.horas_maquina ?? m.horas) ? `${m.horas_maquina ?? m.horas}h` : '-'}</li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {(act.observacoes) && (
                    <div className="mt-2 text-xs text-[#092f20]"><span className="font-semibold text-[13px] text-[#004417]">Observações:</span> {act.observacoes}</div>
                  )}

                  <div className="mt-2 text-xs text-[#004417]/65">
                    {act.created_at ? `Lançado em ${formatDateTimeBR(act.created_at)}` : '-'}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => setEditingActivity(act)} className="flex-1 text-sm px-3 py-2 bg-[#86b646] bg-opacity-10 hover:bg-[#86b646] hover:bg-opacity-20 text-[#004417] rounded transition-colors">Editar</button>
                    <button disabled={confirmingId === act.id} onClick={async () => { setFifoError(null); setConfirmingId(act.id || ''); const err = await onConfirmItem(act.id || ''); if (err) setFifoError(err); setConfirmingId(null); }} className="flex-1 text-sm px-3 py-2 bg-[#397738] hover:bg-[#004417] text-white rounded disabled:opacity-50">{confirmingId === act.id ? 'Processando...' : 'Confirmar'}</button>
                    <button onClick={() => setDeleteTarget({ id: act.id || '', name: act.descricao })} className="flex-1 text-sm px-3 py-2 bg-orange-50 hover:bg-orange-100 text-[#F7941F] rounded font-medium">Excluir</button>
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

        <ActivityEditModal
          isOpen={!!editingActivity}
          transaction={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSave={async (id, payload) => {
            await onEdit(id, payload);
          }}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
