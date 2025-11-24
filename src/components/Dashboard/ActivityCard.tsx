import { useState } from 'react';
import { Sprout, Droplets, Package, Leaf, Scissors, Bug, Paperclip } from 'lucide-react';
import ActivityAttachmentModal from '../ManejoAgricola/ActivityAttachmentModal';

interface Props {
  atividade: any;
  talhaoLabel?: string;
}

function getIconByType(nomeAtividade: string) {
  const tipo = (nomeAtividade || '').toLowerCase();
  if (tipo.includes('pulverização') || tipo.includes('pulverizar')) return <Droplets className="w-5 h-5 text-[#397738]" />;
  if (tipo.includes('adubação') || tipo.includes('adubar')) return <Package className="w-5 h-5 text-[#86b646]" />;
  if (tipo.includes('capina') || tipo.includes('roçada')) return <Leaf className="w-5 h-5 text-[#397738]" />;
  if (tipo.includes('poda')) return <Scissors className="w-5 h-5 text-[#8fa49d]" />;
  if (tipo.includes('irrigação') || tipo.includes('irrigar')) return <Droplets className="w-5 h-5 text-[#86b646]" />;
  if (tipo.includes('análise') || tipo.includes('coleta')) return <Bug className="w-5 h-5 text-[#8fa49d]" />;
  return <Sprout className="w-5 h-5 text-[#397738]" />;
}

function getStatusColorByType(nomeAtividade: string) {
  const tipo = (nomeAtividade || '').toLowerCase();
  if (tipo.includes('pulverização') || tipo.includes('pulverizar')) return 'bg-[#397738]/10 border-[#397738]/30';
  if (tipo.includes('adubação') || tipo.includes('adubar')) return 'bg-[#86b646]/10 border-[#86b646]/30';
  if (tipo.includes('capina') || tipo.includes('roçada')) return 'bg-[#397738]/10 border-[#397738]/30';
  if (tipo.includes('poda')) return 'bg-[#8fa49d]/10 border-[#8fa49d]/30';
  if (tipo.includes('irrigação') || tipo.includes('irrigar')) return 'bg-[#86b646]/10 border-[#86b646]/30';
  if (tipo.includes('análise') || tipo.includes('coleta')) return 'bg-[#8fa49d]/10 border-[#8fa49d]/30';
  return 'bg-[#397738]/10 border-[#397738]/30';
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
    <div className={`relative p-4 rounded-xl bg-white transition-all duration-200 hover:scale-[1.01]`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getIconByType(atividade.nome_atividade || '')}
          <div>
              <h4 className="font-semibold text-[#004417]">{atividadeDisplay.descricao}</h4>
              <p className="text-sm text-[#004417]/65 font-medium">{atividade.dataFormatada || atividade.data || atividade.data_atividade}</p>
          </div>
        </div>
        <span className="text-xs bg-[rgba(0,166,81,0.08)] text-[#00A651] px-2 py-1 rounded-md">{atividadeDisplay.talhao}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-[#004417]/65 font-medium">Produtos:</span>
          <ul className="mt-1 space-y-1">
            {atividade.produtos && atividade.produtos.length > 0 ? (
                atividade.produtos.map((p: any, idx: number) => ( 
                <li key={idx} className="flex justify-between">
                  <span className="font-semibold text-[#004417]">{p.nome_produto}</span>
                    <span className="text-[#004417]/65 text-right font-medium">{p.quantidade_val ?? '-'} {p.quantidade_un ?? ''}{p.dose_val ? ` · ${p.dose_val} ${p.dose_un ?? ''}` : ''}</span>
                </li>
              ))
                ) : (
                <li className="text-[#004417]/65 font-medium">Não informado</li>
            )}
          </ul>
        </div>
        <div>
          <span className="text-[#004417]/65 font-medium">Máquinas:</span>
          <ul className="mt-1 space-y-1">
            {atividade.maquinas && atividade.maquinas.length > 0 ? (
                atividade.maquinas.map((m: any, idx: number) => ( 
                <li key={idx} className="flex justify-between">
                  <span className="font-semibold text-[#004417]">{m.nome_maquina}</span>
                    <span className="text-[#004417]/65 font-medium">{m.horas_maquina ?? '-'} h</span>
                </li>
              ))
            ) : (
               <li className="text-[#004417]/65 font-medium">Não informado</li>
            )}
          </ul>
        </div>
        <div />
        <div>
          <span className="text-[#004417]/65 font-medium">Responsável:</span>
          {atividade.responsaveis && atividade.responsaveis.length > 0 ? (
            <p className="mt-1 text-sm font-semibold text-[#004417]">{atividade.responsaveis.map((r: any) => r.nome).join(', ')}</p>
          ) : (
            <p className="mt-1 text-[#004417]/65 font-medium">Não informado</p>
          )}
        </div>
      </div>

      {atividadeDisplay.observacoes && (
        <div className="mt-3 pt-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-[#004417]/65 font-medium">Observações:</span>
                <p className="text-sm text-[#004417] mt-1">{atividadeDisplay.observacoes}</p>
            </div>
            <button onClick={() => openAttachmentModal(atividade.id_atividade || atividade.atividade_id, atividade.nome_atividade || 'Atividade')} className="p-2 text-[#004417]/65 hover:text-[#00A651] hover:bg-white rounded-lg transition-colors shadow-sm border-0 flex-shrink-0 ml-2" title="Gerenciar anexo">
              <Paperclip className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {!atividadeDisplay.observacoes && (
        <div className="mt-3 pt-3">
          <div className="flex items-center justify-end">
            <button onClick={() => openAttachmentModal(atividade.id_atividade || atividade.atividade_id, atividade.nome_atividade || 'Atividade')} className="p-2 text-[#004417]/65 hover:text-[#00A651] hover:bg-white rounded-lg transition-colors shadow-sm border-0" title="Gerenciar anexo">
              <Paperclip className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ActivityAttachmentModal isOpen={attachmentModal.isOpen} onClose={closeAttachmentModal} activityId={attachmentModal.activityId} activityDescription={attachmentModal.description} />
    </div>
  );
}
