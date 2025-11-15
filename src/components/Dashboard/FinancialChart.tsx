import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DadosGrafico, FinanceService } from '../../services/financeService';

interface FinancialChartProps {
  data: DadosGrafico[];
}

export default function FinancialChart({ data }: FinancialChartProps) {
  // 🔍 DEBUG: Log dos dados recebidos pelo componente do gráfico
  React.useEffect(() => {
    console.log('📈 GRÁFICO - Dados recebidos:', data);
    console.log('📈 GRÁFICO - Quantidade de meses:', data.length);
    
    if (data.length > 0) {
      console.log('📈 GRÁFICO - Primeiro item:', data[0]);
      console.log('📈 GRÁFICO - Último item:', data[data.length - 1]);
      
      // Verificar se há receitas nos dados
      const totalReceitas = data.reduce((acc, item) => acc + (item.receitas || 0), 0);
      const totalDespesas = data.reduce((acc, item) => acc + (item.despesas || 0), 0);
      
      console.log('📈 GRÁFICO - Total receitas:', totalReceitas);
      console.log('📈 GRÁFICO - Total despesas:', totalDespesas);
      console.log('📈 GRÁFICO - Tem receitas?', totalReceitas > 0);
      console.log('📈 GRÁFICO - Tem despesas?', totalDespesas > 0);
    }
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-[rgba(0,68,23,0.08)] rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
          <p className="font-semibold text-[#004417] mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {FinanceService.formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,68,23,0.08)] p-6 transition-transform duration-200 hover:scale-[1.01]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#004417]">Evolução Financeira</h3>
        <div className="text-sm text-[#004417]/65 font-medium">Últimos 6 meses</div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,68,23,0.08)" vertical={false} />
            <XAxis 
              dataKey="mes" 
              stroke="rgba(0,68,23,0.6)"
              fontSize={12}
              fontWeight={500}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="rgba(0,68,23,0.6)"
              fontSize={12}
              fontWeight={500}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
            <Line 
              type="monotone" 
              dataKey="receitas" 
              stroke="#00A651" 
              strokeWidth={2.5}
              name="Receitas"
              dot={{ fill: '#CADB2A', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#00A651', stroke: 'white', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="despesas" 
              stroke="#F7941F" 
              strokeWidth={2.5}
              name="Despesas"
              dot={{ fill: '#F7941F', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: 'white', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}