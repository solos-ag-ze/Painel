import { useState } from 'react';
import { Sprout, Droplets, Package, Leaf, Scissors, Bug, Paperclip } from 'lucide-react';
import ActivityAttachmentModal from '../ManejoAgricola/ActivityAttachmentModal';
import { autoScaleQuantity } from '../../lib/unitConverter';

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
    <div className={`p-4 rounded-lg border-2 ${getStatusColorByType(atividade.nome_atividade || '')} hover:shadow-sm transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getIconByType(atividade.nome_atividade || '')}
          <div>
            <h4 className="font-medium text-[#092f20]">{atividadeDisplay.descricao}</h4>
            <p className="text-sm text-gray-600">{atividade.dataFormatada || atividade.data || atividade.data_atividade}</p>
          </div>
        </div>
        <span className="text-xs bg-[#397738]/10 text-[#397738] px-2 py-1 rounded-full">{atividadeDisplay.talhao}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-600">Produtos:</span>
          <ul className="mt-1 space-y-1">
            {atividade.produtos && atividade.produtos.length > 0 ? (
              atividade.produtos.map((p: any, idx: number) => {
                const scaledQty = p.quantidade_val && p.quantidade_un
                  ? autoScaleQuantity(p.quantidade_val, p.quantidade_un)
                  : null;
                const scaledDose = p.dose_val && p.dose_un
                  ? autoScaleQuantity(p.dose_val, p.dose_un)
                  : null;
                return (
                  <li key={idx} className="flex justify-between">
                    <span className="font-medium text-[#092f20]">{p.nome_produto}</span>
                    <span className="text-gray-500 text-right">
                      {scaledQty ? `${scaledQty.quantidade} ${scaledQty.unidade}` : '-'}
                      {scaledDose ? ` · ${scaledDose.quantidade} ${scaledDose.unidade}` : ''}
                    </span>
                  </li>
                );
              })
            ) : (
              <li className="text-gray-500">Não informado</li>
            )}
          </ul>
        </div>
        <div>
          <span className="text-gray-600">Máquinas:</span>
          <ul className="mt-1 space-y-1">
            {atividade.maquinas && atividade.maquinas.length > 0 ? (
              atividade.maquinas.map((m: any, idx: number) => (
                <li key={idx} className="flex justify-between">
                  <span className="font-medium text-[#092f20]">{m.nome_maquina}</span>
                  <span className="text-gray-500">{m.horas_maquina ?? '-'} h</span>
                </li>
              ))
            ) : (
              <li className="text-gray-500">Não informado</li>
            )}

            <div className="mt-2">
              <span className="text-gray-600">Responsável:</span>
              <p className="mt-1 text-sm text-[#092f20]">{atividade.responsaveis && atividade.responsaveis.length > 0 ? atividade.responsaveis.map((r: any) => r.nome).join(', ') : 'Não informado'}</p>
            </div>
          </ul>
        </div>
      </div>

      {atividadeDisplay.observacoes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-gray-600 text-sm">Observações:</span>
              <p className="text-sm text-[#397738] mt-1">{atividadeDisplay.observacoes}</p>
            </div>
            <button onClick={() => openAttachmentModal(atividade.id_atividade || atividade.atividade_id, atividade.nome_atividade || 'Atividade')} className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200 flex-shrink-0 ml-2" title="Gerenciar anexo">
              <Paperclip className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {!atividadeDisplay.observacoes && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-end">
            <button onClick={() => openAttachmentModal(atividade.id_atividade || atividade.atividade_id, atividade.nome_atividade || 'Atividade')} className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200" title="Gerenciar anexo">
              <Paperclip className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <ActivityAttachmentModal isOpen={attachmentModal.isOpen} onClose={closeAttachmentModal} activityId={attachmentModal.activityId} activityDescription={attachmentModal.description} />
    </div>
  );
}
