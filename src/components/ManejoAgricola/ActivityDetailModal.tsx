import { useEffect, useState } from 'react';
import { X, Paperclip } from 'lucide-react';
import { ActivityService, LancamentoComData } from '../../services/activityService';
import ActivityAttachmentModal from './ActivityAttachmentModal';
import { autoScaleQuantity } from '../../lib/unitConverter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  activityDescription?: string;
}

export default function ActivityDetailModal({ isOpen, onClose, activityId, activityDescription }: Props) {
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<LancamentoComData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attachmentModal, setAttachmentModal] = useState<{ isOpen: boolean; activityId: string; description: string }>({ isOpen: false, activityId: '', description: '' });

  useEffect(() => {
    if (!isOpen) return;
    if (!activityId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ActivityService.getLancamentoById(activityId);
        setActivity(data);
      } catch (err) {
        console.error('Erro ao carregar atividade:', err);
        setError('Erro ao carregar atividade');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, activityId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#092f20]">{activity?.nome_atividade || activityDescription || 'Atividade'}</h3>
            <p className="text-sm text-gray-500">{activity?.dataFormatada || activity?.created_at || ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAttachmentModal({ isOpen: true, activityId: activityId, description: activity?.nome_atividade || activityDescription || 'Atividade' })}
              className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200"
              title="Gerenciar anexo"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 rounded" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Carregando atividade...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">{error}</div>
        ) : activity ? (
          <div className="space-y-4">
            {/* Talhões */}
            {activity.talhoes && activity.talhoes.length > 0 && (
              <div className="bg-[rgba(0,68,23,0.03)] rounded-lg p-4 border border-[rgba(0,68,23,0.08)]">
                <h4 className="text-sm font-semibold text-[#004417] mb-2">Talhões</h4>
                <div className="flex flex-wrap gap-2">
                  {activity.talhoes.map((t: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#00A651] text-white">
                      {t.nome_talhao || `Talhão ${idx + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Produtos */}
              <div className="bg-white rounded-lg p-4 border border-[rgba(0,68,23,0.08)]">
                <h4 className="text-sm font-semibold text-[#004417] mb-2">Produtos</h4>
                <ul className="space-y-2">
                  {activity.produtos && activity.produtos.length > 0 ? (
                    activity.produtos.map((p: any, idx: number) => {
                      const quantidade = p.quantidade_val ?? 0;
                      const unidade = p.quantidade_un || 'un';
                      const qtyUsed = autoScaleQuantity(quantidade, unidade);
                      const quantidadeDisplay = (!qtyUsed.quantidade || isNaN(qtyUsed.quantidade) || !isFinite(qtyUsed.quantidade)) ? 0 : qtyUsed.quantidade;
                      
                      return (
                        <li key={idx} className="flex justify-between items-center pb-2 border-b border-[rgba(0,68,23,0.08)] last:border-0 last:pb-0">
                          <span className="font-medium text-[#092f20]">{p.nome_produto}</span>
                          <span className="text-[#00A651] font-semibold">{quantidadeDisplay.toFixed(2)} {qtyUsed.unidade || unidade}</span>
                        </li>
                      );
                    })
                  ) : (
                    <li className="text-gray-500 text-center py-2">Nenhum produto informado</li>
                  )}
                </ul>
              </div>

              {/* Máquinas */}
              <div className="bg-white rounded-lg p-4 border border-[rgba(0,68,23,0.08)]">
                <h4 className="text-sm font-semibold text-[#004417] mb-2">Máquinas</h4>
                <ul className="space-y-2">
                  {activity.maquinas && activity.maquinas.length > 0 ? (
                    activity.maquinas.map((m: any, idx: number) => (
                      <li key={idx} className="flex justify-between items-center pb-2 border-b border-[rgba(0,68,23,0.08)] last:border-0 last:pb-0">
                        <span className="font-medium text-[#092f20]">{m.nome_maquina}</span>
                        <span className="text-[#00A651] font-semibold">{m.horas_maquina ?? '-'} h</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500 text-center py-2">Nenhuma máquina informada</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Responsáveis */}
            {activity.responsaveis && activity.responsaveis.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-[rgba(0,68,23,0.08)]">
                <h4 className="text-sm font-semibold text-[#004417] mb-2">Responsáveis</h4>
                <div className="flex flex-wrap gap-2">
                  {activity.responsaveis.map((r: any, idx: number) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[rgba(0,166,81,0.15)] text-[#004417]">
                      {r.nome || `Responsável ${idx + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            {activity.observacao && (
              <div className="bg-[rgba(202,219,42,0.08)] rounded-lg p-4 border border-[rgba(0,68,23,0.08)]">
                <h4 className="text-sm font-semibold text-[#004417] mb-2">Observações</h4>
                <p className="text-sm text-[rgba(0,68,23,0.85)] italic">"{activity.observacao}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">Atividade não encontrada</div>
        )}

        <ActivityAttachmentModal
          isOpen={attachmentModal.isOpen}
          onClose={() => setAttachmentModal({ isOpen: false, activityId: '', description: '' })}
          activityId={attachmentModal.activityId}
          activityDescription={attachmentModal.description}
        />
      </div>
    </div>
  );
}
