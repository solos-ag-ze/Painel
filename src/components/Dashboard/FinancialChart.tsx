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
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-[#092f20] mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {FinanceService.formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#092f20]">Evolução Financeira</h3>
        <div className="text-sm text-gray-600">Últimos 6 meses</div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="mes" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="receitas" 
              stroke="#397738" 
              strokeWidth={3}
              name="Receitas"
              dot={{ fill: '#397738', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#397738', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="despesas" 
              stroke="#dc2626" 
              strokeWidth={3}
              name="Despesas"
              dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}