import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AtividadeComData } from '../../services/activityService';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityChartProps {
  activities: AtividadeComData[];
}

export default function ActivityChart({ activities }: ActivityChartProps) {
  // Agrupa atividades por data
  const activityData = activities.reduce((acc, activity) => {
    if (!activity.data) return acc;
    
    try {
      const date = format(parseISO(activity.data), 'dd/MM', { locale: ptBR });
      const existing = acc.find(item => item.data === date);
      
      if (existing) {
        existing.quantidade += 1;
      } else {
        acc.push({ data: date, quantidade: 1 });
      }
    } catch (error) {
      console.error('Erro ao processar data da atividade:', error);
    }
    
    return acc;
  }, [] as { data: string; quantidade: number }[]);

  // Ordena por data
  const sortedData = activityData.sort((a, b) => {
    try {
      const dateA = new Date(a.data.split('/').reverse().join('-'));
      const dateB = new Date(b.data.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    } catch {
      return 0;
    }
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-[#092f20]">{label}</p>
          <p className="text-sm text-[#397738]">
            {payload[0].value} {payload[0].value === 1 ? 'atividade' : 'atividades'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#092f20]">Cronograma de Atividades</h3>
        <div className="text-sm text-gray-600">Últimos 30 dias</div>
      </div>

      {sortedData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="data" 
                stroke="#666"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="quantidade" 
                fill="#397738"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">Nenhuma atividade nos últimos 30 dias</p>
        </div>
      )}
    </div>
  );
}