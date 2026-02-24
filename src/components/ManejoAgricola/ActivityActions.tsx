import React from 'react';
import { Edit2, History, Paperclip } from 'lucide-react';

export default function ActivityActions({
  onEdit,
  onHistory,
  onAttachment,
  atividade
}: {
  atividade: any;
  onEdit: (atividade: any) => void;
  onHistory: (id: string) => void;
  onAttachment: (id: string, desc: string) => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onEdit(atividade)}
        className="p-2 text-[#00A651] hover:opacity-90 bg-transparent border-0 shadow-none"
        title="Editar lançamento"
      >
        <Edit2 className="w-4 h-4 text-[#00A651]" />
      </button>
      <button
        onClick={() => onHistory(atividade.id_atividade || atividade.id || '')}
        className="p-2 text-[#00A651] hover:opacity-90 bg-transparent border-0 shadow-none"
        title="Ver histórico"
      >
        <History className="w-4 h-4 text-[#00A651]" />
      </button>
      <button
        onClick={() => onAttachment(atividade.id_atividade || atividade.id || '', atividade.nome_atividade || atividade.descricao || 'Atividade')}
        className="p-2 text-[#00A651] hover:opacity-90 bg-transparent border-0 shadow-none"
        title="Gerenciar anexo"
      >
        <Paperclip className="w-4 h-4 text-[#00A651]" />
      </button>
    </div>
  );
}
