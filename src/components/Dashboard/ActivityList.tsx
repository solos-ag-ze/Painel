import React from 'react';
import { Calendar, MapPin, User, Package } from 'lucide-react';
import { AtividadeComData } from '../../services/activityService';
import { ActivityService } from '../../services/activityService';

interface ActivityListProps {
  activities: AtividadeComData[];
}

export default function ActivityList({ activities }: ActivityListProps) {
  const sortedActivities = [...activities].sort((a, b) => {
    const dateA = new Date(a.data as string).getTime();
    const dateB = new Date(b.data as string).getTime();
    return dateB - dateA; // for descending order (most recent first)
  });
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#092f20]">Atividades Agrícolas</h3>
        <div className="text-sm text-gray-600">Últimas {activities.length} atividades</div>
      </div>

      <div className="space-y-4">
        {sortedActivities.map((activity) => (
          <div key={activity.id_atividade} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {ActivityService.getAtividadeIcon(activity.nome_atividade)}
                </span>
                <div>
                  <h4 className="font-medium text-[#092f20]">{activity.nome_atividade}</h4>
                  {activity.observacao && (
                    <p className="text-sm text-gray-600 mt-1">{activity.observacao}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{activity.dataFormatada}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {activity.area && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-[#397738]" />
                  <div>
                    <p className="text-gray-600">Área</p>
                    <p className="font-medium text-[#092f20]">{activity.area}</p>
                  </div>
                </div>
              )}

              {activity.produto_usado && (
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4 text-[#86b646]" />
                  <div>
                    <p className="text-gray-600">Produto</p>
                    <p className="font-medium text-[#092f20]">{activity.produto_usado}</p>
                  </div>
                </div>
              )}

              {activity.quantidade && (
                <div>
                  <p className="text-gray-600">Quantidade</p>
                  <p className="font-medium text-[#092f20]">{activity.quantidade}</p>
                </div>
              )}

              {activity.responsavel && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-[#8fa49d]" />
                  <div>
                    <p className="text-gray-600">Responsável</p>
                    <p className="font-medium text-[#092f20]">{activity.responsavel}</p>
                  </div>
                </div>
              )}
            </div>

            {activity.dose_usada && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Dose utilizada:</span> {activity.dose_usada}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhuma atividade encontrada</p>
        </div>
      )}
    </div>
  );
}