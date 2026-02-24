import ProductList from './ProductList';
import MachineList from './MachineList';
import ActivityActions from './ActivityActions';
import { getIconByType } from './manejoUtils';

export default function ActivityCard({
  atividade,
  atividadeDisplay,
  onEdit,
  onHistory,
  onAttachment
}: any) {
  // use shared getIconByType

  return (
    <div className="p-5 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,68,23,0.06)] transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getIconByType(atividade.nome_atividade || atividade.descricao || '')}
          <div>
            <h4 className="font-semibold text-[#004417]">{atividadeDisplay.descricao}</h4>
            <p className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium">{atividade.dataFormatada}</p>
          </div>
        </div>
        <span className="text-xs bg-[#00A651]/20 text-[#00A651] font-semibold px-2 py-1 rounded-full">{atividadeDisplay.talhao}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-[rgba(0,68,23,0.75)] font-medium">Produtos:</span>
          <ul className="mt-1 space-y-1">
            <ProductList produtos={atividade.produtos} />
          </ul>
        </div>
        <div>
          <span className="text-[rgba(0,68,23,0.75)] font-medium">Máquinas:</span>
          <ul className="mt-1 space-y-1">
            <MachineList maquinas={atividade.maquinas} />
          </ul>

          <div className="mt-2">
            <span className="text-[rgba(0,68,23,0.75)] font-medium">Responsáveis:</span>
            <p className="mt-1 text-sm text-[rgba(0,68,23,0.75)]">{atividade.responsaveis && atividade.responsaveis.length > 0 ? atividade.responsaveis.map((r: any) => r.nome).join(', ') : 'Não informado'}</p>
          </div>
        </div>
      </div>

      {atividadeDisplay.observacoes && (
        <div className="mt-3">
          <div>
            <div className="flex-1">
              <span className="text-[rgba(0,68,23,0.75)] font-medium text-sm">Observações:</span>
              <p className="text-sm text-[#00A651] mt-1">{atividadeDisplay.observacoes}</p>
            </div>
          </div>
          <div className="mt-3 border-t border-[rgba(0,68,23,0.08)]" />
          <div className="mt-3 pt-3 flex items-center justify-between">
            <div className="text-xs text-[#004417]/65">
              {atividade.created_at && (
                <>Lançado em {new Date(atividade.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
              )}
            </div>
            <ActivityActions atividade={atividade} onEdit={onEdit} onHistory={onHistory} onAttachment={onAttachment} />
          </div>
        </div>
      )}

      {!atividadeDisplay.observacoes && (
        <div className="mt-3 pt-3 border-t border-[rgba(0,68,23,0.08)]">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#004417]/65">
              {atividade.created_at && (
                <>Lançado em {new Date(atividade.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
              )}
            </div>
            <ActivityActions atividade={atividade} onEdit={onEdit} onHistory={onHistory} onAttachment={onAttachment} />
          </div>
        </div>
      )}
    </div>
  );
}
