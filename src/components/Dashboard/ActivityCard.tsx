import { useState } from 'react';
import { Sprout, Droplets, Package, Leaf, Scissors, Bug, Paperclip } from 'lucide-react';
import ActivityAttachmentModal from '../ManejoAgricola/ActivityAttachmentModal';

interface Props {
  atividade: any;
  talhaoLabel?: string;
}

function getIconByType(nomeAtividade: string) {
  const tipo = (nomeAtividade || '').toLowerCase();
  if (tipo.includes('pulverização') || tipo.includes('pulverizar')) return <Droplets className="w-5 h-5 text-[#00A651]" />;
  if (tipo.includes('adubação') || tipo.includes('adubar')) return <Package className="w-5 h-5 text-[#00A651]" />;
  if (tipo.includes('capina') || tipo.includes('roçada')) return <Leaf className="w-5 h-5 text-[#00A651]" />;
  if (tipo.includes('poda')) return <Scissors className="w-5 h-5 text-[#00A651]" />;
  if (tipo.includes('irrigação') || tipo.includes('irrigar')) return <Droplets className="w-5 h-5 text-[#00A651]" />;
  if (tipo.includes('análise') || tipo.includes('coleta')) return <Bug className="w-5 h-5 text-[#00A651]" />;
  return <Sprout className="w-5 h-5 text-[#00A651]" />;
}

export default function ActivityCard({ atividade, talhaoLabel }: Props) {
  const [attachmentModal, setAttachmentModal] = useState<{ isOpen: boolean; activityId: string; description: string }>({ isOpen: false, activityId: '', description: '' });

  const openAttachmentModal = (activityId: string, description: string) => {
    setAttachmentModal({ isOpen: true, activityId, description });
  };

  const closeAttachmentModal = () => {
    setAttachmentModal({ isOpen: false, activityId: '', description: '' });
  };

  const atividadeDisplay = {
    descricao: atividade.nome_atividade || atividade.tipo || '',
    // Prefer a precomputed human-readable talhao name if present (set by DashboardOverview mapping or Manejo panel)
    talhao: atividade.talhao || talhaoLabel || atividade.id_talhoes || 'Área não informada',
    observacoes: atividade.observacao || atividade.observacoes || ''
  };

  return (
    <div className="p-5 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,68,23,0.06)] transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getIconByType(atividade.nome_atividade || '')}
          <div>
              <h4 className="font-semibold text-[#004417]">{atividadeDisplay.descricao}</h4>
              <p className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium">{atividade.dataFormatada || atividade.data || atividade.data_atividade}</p>
          </div>
        </div>
        <span className="text-xs bg-[#00A651]/20 text-[#00A651] font-semibold px-2 py-1 rounded-full">{atividadeDisplay.talhao}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-[rgba(0,68,23,0.75)] font-medium">Produtos:</span>
          <ul className="mt-1 space-y-1">
            {atividade.produtos && atividade.produtos.length > 0 ? (
                atividade.produtos.map((p: any, idx: number) => ( 
                <li key={idx} className="flex justify-between">
                  <span className="font-semibold text-[#004417]">{p.nome_produto}</span>
                    <span className="text-[rgba(0,68,23,0.75)] font-medium text-right">{p.quantidade_val ?? '-'} {p.quantidade_un ?? ''}{p.dose_val ? ` · ${p.dose_val} ${p.dose_un ?? ''}` : ''}</span>
                </li>
              ))
                ) : (
                <li className="text-[rgba(0,68,23,0.75)] font-medium">Não informado</li>
            )}
          </ul>
        </div>
        <div>
          <span className="text-[rgba(0,68,23,0.75)] font-medium">Máquinas:</span>
          <ul className="mt-1 space-y-1">
            {atividade.maquinas && atividade.maquinas.length > 0 ? (
                atividade.maquinas.map((m: any, idx: number) => ( 
                <li key={idx} className="flex justify-between">
                  <span className="font-semibold text-[#004417]">{m.nome_maquina}</span>
                    <span className="text-[rgba(0,68,23,0.75)] font-medium">{m.horas_maquina ?? '-'} h</span>
                </li>
              ))
            ) : (
               <li className="text-[rgba(0,68,23,0.75)] font-medium">Não informado</li>
            )}
          </ul>

          <div className="mt-2">
            <span className="text-[rgba(0,68,23,0.75)] font-medium">Responsável:</span>
            <p className="mt-1 text-sm text-[rgba(0,68,23,0.75)]">{atividade.responsaveis && atividade.responsaveis.length > 0 ? atividade.responsaveis.map((r: any) => r.nome).join(', ') : 'Não informado'}</p>
          </div>
        </div>
      </div>

      {atividadeDisplay.observacoes && (
        <div className="mt-3 pt-3 border-t border-[rgba(0,68,23,0.08)]">
          <div className="flex items-start justify-between">
            <div className="flex-shrink-0 text-xs text-[#004417]/65 mr-3">
              {atividade.created_at && (
                <>Lançado em {new Date(atividade.created_at).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</>
              )}
            </div>
            <div className="flex-1">
              <span className="text-[rgba(0,68,23,0.75)] font-medium text-sm">Observações:</span>
              <p className="text-sm text-[#00A651] mt-1">{atividadeDisplay.observacoes}</p>
            </div>
            <div className="flex-shrink-0 ml-3">
              <button
                onClick={() => openAttachmentModal(
                  atividade.id_atividade || atividade.atividade_id || '',
                  atividade.nome_atividade || 'Atividade'
                )}
                className="p-2 text-[#00A651] hover:opacity-90 bg-transparent border-0 shadow-none flex-shrink-0"
                title="Gerenciar anexo"
              >
                <Paperclip className="w-4 h-4 text-[#00A651]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {!atividadeDisplay.observacoes && (
        <div className="mt-3 pt-3 border-t border-[rgba(0,68,23,0.08)]">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#004417]/65">
              {atividade.created_at && (
                <>Lançado em {new Date(atividade.created_at).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</>
              )}
            </div>
            <div>
              <button
                onClick={() => openAttachmentModal(
                  atividade.id_atividade || atividade.atividade_id || '',
                  atividade.nome_atividade || 'Atividade'
                )}
                className="p-2 text-[#00A651] hover:opacity-90 bg-transparent border-0 shadow-none"
                title="Gerenciar anexo"
              >
                <Paperclip className="w-4 h-4 text-[#00A651]" />
              </button>
            </div>
          </div>
        </div>
      )}

      <ActivityAttachmentModal isOpen={attachmentModal.isOpen} onClose={closeAttachmentModal} activityId={attachmentModal.activityId} activityDescription={attachmentModal.description} />
    </div>
  );
}
