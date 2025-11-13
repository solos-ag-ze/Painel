import React, { useEffect, useState } from 'react';
import { TrendingUp, Minus } from 'lucide-react';
import { FinanceService} from '../../services/financeService';
import { CustoConabService } from '../../services/custoService';

interface CustoItem {
  categoria: string;
  realHectare: number;
  realSaca: number;
  estimadoHectare: number;
  estimadoSaca: number;
  valor: number;   
}
interface Estatistica {
  categoria: string;
  valor?: number;
  total?: number;
}

const CustosTable: React.FC<{ userId: string; areaCultivada: number; produtividade: number }> = ({
  userId,
  areaCultivada,
  produtividade,
}) => {
  const [custos, setCustos] = useState<CustoItem[]>([]);
  const [custoService] = useState(() => new CustoConabService());

  // Category mapping from financial categories to CustoService discriminacao

  useEffect(() => {
    const fetchData = async () => {
      const estatisticas = await FinanceService.getTransactionsByCategory(userId);
      console.log("Dados recebidos do serviço:", estatisticas);
      const processados = updateCustosWithFinancialData(estatisticas, areaCultivada, produtividade);
      setCustos(processados); // Aqui sim atualiza o estado
    };

    fetchData();
  }, [userId, areaCultivada, produtividade]);

  const toNumber = (x: unknown): number => {
    if (typeof x === "number") return x;
    if (typeof x === "string") {
      // remove separador de milhar e troca vírgula por ponto
      const s = x.replace(/\./g, "").replace(",", ".");
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };




 const updateCustosWithFinancialData = (
  estatisticas: Estatistica[],
  areaCultivadaIn: number | string,
  produtividadeIn: number | string
) => {
  const areaCultivada = toNumber(areaCultivadaIn);
  const produtividade = toNumber(produtividadeIn);

  // 1. Agrupa valores reais do usuário, excluindo categoria "Receita"
  const grouped = estatisticas.reduce((acc, est) => {
    const categoria = est.categoria || "Sem categoria";
    // Ignora categoria "Receita"
    if (categoria === "Receita") {
      return acc;
    }
    const valorCategoria = Math.abs(est.valor ?? est.total ?? 0);
    acc[categoria] = (acc[categoria] || 0) + valorCategoria;
    return acc;
  }, {} as Record<string, number>);

  // 2. Pega todas as categorias da CONAB como base (já sem "Receita")
  const todasCategorias = CustoConabService.getAllCustos();

  // 3. Monta array final, mesmo que valor real = 0
  return todasCategorias.map((item) => {
    const valor = grouped[item.discriminacao] ?? 0;
    const realHectare = areaCultivada > 0 ? valor / areaCultivada : 0;
    const realSaca = produtividade > 0 ? realHectare / produtividade : 0;

    return {
      categoria: item.discriminacao,
      valor,
      realHectare: realHectare,
      realSaca: realSaca,
      estimadoHectare: item.custoPorHa,
      estimadoSaca: item.custoPorSaca,
    };
  });
};


  useEffect(() => {
    console.log("Custos no estado >>>", custos);
  }, [custos]);

  const formatNumber = (num: number, decimals: number = 4): string => {
    return num.toFixed(decimals).replace('.', ',');
  };

  // Sort custos alphabetically by categoria
  const custosSorted = [...custos].sort((a, b) =>
    a.categoria.localeCompare(b.categoria, 'pt-BR')
  );

  // Totals
  const totalRealHectare = custos.reduce((acc, item) => acc + item.realHectare, 0);
  const totalRealSaca = custos.reduce((acc, item) => acc + item.realSaca, 0);
  const totalEstimadoHectare = custos.reduce((acc, item) => acc + item.estimadoHectare, 0);
  const totalEstimadoSaca = custos.reduce((acc, item) => acc + item.estimadoSaca, 0);
  
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#397738]" />
            <span className="text-sm font-medium text-[#092f20]">Custo Real/ha</span>
          </div>
          <p className="text-2xl font-bold text-[#092f20]">R$ {formatNumber(totalRealHectare)}</p>
          <p className="text-sm text-[#397738]">Calculado com dados reais</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Minus className="w-5 h-5 text-[#8fa49d]" />
            <span className="text-sm font-medium text-[#092f20]">Custo Real/Saca</span>
          </div>
          <p className="text-2xl font-bold text-[#092f20]">R$ {formatNumber(totalRealSaca)}</p>
          <p className="text-sm text-[#8fa49d]">Calculado com dados reais</p>
        </div>
      </div>

      {/* Custo por Hectare Table */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-[#092f20]">Custos por Hectare</h3>
        <div className="shadow rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#092f20] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Categoria</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Estimado (R$/ha)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Real (R$/ha)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {custosSorted.map((item, index) => (
                <tr key={`ha-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs sm:text-sm text-gray-900 break-words max-w-[120px]">
                    {item.categoria}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-black">
                      R$ {formatNumber(item.estimadoHectare)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-green-600">
                      R$ {formatNumber(item.realHectare)}
                    </span>
                  </td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="bg-[#092f20]/10 font-semibold">
                <td className="px-4 py-4 text-sm text-[#092f20]">TOTAL GERAL</td>
                <td className="px-4 py-4 text-center text-sm text-[#092f20]">
                  R$ {formatNumber(totalEstimadoHectare)}
                </td>
                <td className="px-4 py-4 text-center text-sm text-[#092f20]">
                  R$ {formatNumber(totalRealHectare)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Custo por Saca Table */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-[#092f20]">Custos por Saca</h3>
        <div className="shadow rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#092f20] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Categoria</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Estimado (R$/sc)</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Real (R$/sc)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {custosSorted.map((item, index) => (
                <tr key={`saca-${index}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs sm:text-sm text-gray-900 break-words max-w-[120px]">
                    {item.categoria}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-black">
                      R$ {formatNumber(item.estimadoSaca)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-green-600">
                      R$ {formatNumber(item.realSaca)}
                    </span>
                  </td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="bg-[#092f20]/10 font-semibold">
                <td className="px-4 py-4 text-sm text-[#092f20]">TOTAL GERAL</td>
                <td className="px-4 py-4 text-center text-sm text-[#092f20]">
                  R$ {formatNumber(totalEstimadoSaca)}
                </td>
                <td className="px-4 py-4 text-center text-sm text-[#092f20]">
                  R$ {formatNumber(totalRealSaca)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustosTable;