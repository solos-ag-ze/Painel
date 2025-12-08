// React import not required with new JSX runtime
import ActivityCard from './ActivityCard';
import { Sprout } from 'lucide-react';

interface ActivityListProps {
  activities: Array<{
    id_atividade: string;
    nome_atividade?: string;
    observacao?: string;
    dataFormatada?: string;
    area?: string | number;
    produtos?: Array<{
      nome_produto?: string;
      quantidade_val?: number | null;
      quantidade_un?: string | null;
      dose_val?: number | null;
      dose_un?: string | null;
    }>;
    maquinas?: Array<{
      nome_maquina?: string;
      horas_maquina?: number | null;
    }>;
    responsaveis?: Array<{
      nome?: string;
    }>;
  }>;
}

export default function ActivityList({ activities }: ActivityListProps) {
  // No local attachment modal here; each ActivityCard manages its own attachment modal
  // Activities are already sorted by data_registro from the backend
  // No need to re-sort on frontend
  const sortedActivities = activities;
  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <div className="grid grid-cols-3 items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-[#004417]">Atividades Agrícolas</h3>
        </div>
        <div></div>
        <div className="flex items-center justify-end space-x-2 text-[#004417]/65">
          <Sprout className="w-4 h-4 text-[#00A651]" />
          <span className="text-sm text-right font-medium">Últimas {activities.length} atividades</span>
        </div>
      </div>

      <div>
        {sortedActivities.length === 0 ? (
          <div className="text-center py-8 text-[#004417]/70">
            <p>Nenhuma atividade encontrada</p>
          </div>
        ) : (
          sortedActivities.map((activity, idx) => (
            <div key={activity.id_atividade}>
              <ActivityCard atividade={activity} />
              {idx < sortedActivities.length - 1 && (
                <div className="h-[1px] bg-[rgba(0,68,23,0.06)] my-3 mx-1 rounded-sm" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Attachment modal handled inside each ActivityCard */}
    </div>
  );
}