// React import not required with new JSX runtime
import ActivityCard from './ActivityCard';

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
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,68,23,0.08)] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#004417]">Atividades Agrícolas</h3>
        <div className="text-sm text-[#004417]/65 font-medium">Últimas {activities.length} atividades</div>
      </div>

      <div className="space-y-4">
            {sortedActivities.map((activity) => (
              <ActivityCard key={activity.id_atividade} atividade={activity} />
            ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhuma atividade encontrada</p>
        </div>
      )}

      {/* Attachment modal handled inside each ActivityCard */}
    </div>
  );
}