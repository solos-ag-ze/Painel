import React, { useEffect, useState } from 'react';
import { TrendingUp, Minus, Info, X } from 'lucide-react';
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
  const [selectedInfo, setSelectedInfo] = useState<null | 'ha' | 'saca'>(null);

  // Category mapping from financial categories to CustoService discriminacao

  useEffect(() => {
    const fetchData = async () => {
      const estatisticas = await FinanceService.getTransactionsByCategory(userId);
      console.log("Dados recebidos do serviço:", estatisticas);
      // Debug: contar e somar transações classificadas como 'Insumos'
      try {
        const totalRecebidas = Array.isArray(estatisticas) ? estatisticas.length : 0;
        const insumosArr = (estatisticas || []).filter(e => String(e.categoria || '').trim().toLowerCase() === 'insumos');
        const insumosCount = insumosArr.length;
        const insumosSum = insumosArr.reduce((s, it) => s + Math.abs(Number((it as any).valor ?? (it as any).total ?? 0) || 0), 0);
        console.log(`DEBUG CustosTable: total transacoes=${totalRecebidas}, insumos_count=${insumosCount}, insumos_sum=R$ ${insumosSum.toFixed(2)}`);
      } catch (err) {
        console.error('DEBUG CustosTable erro ao calcular insumos:', err);
      }
      const processados = updateCustosWithFinancialData(estatisticas, areaCultivada, produtividade);
      // Debug: verificar se os 3 destinos receberam valor após distribuição
      try {
        const f = processados.find(p => p.categoria === 'Fertilizantes');
        const d = processados.find(p => p.categoria === 'Defensivos Agrícolas');
        const s = processados.find(p => p.categoria === 'Sementes e mudas');
        console.log(`DEBUG CustosTable processed: Fertilizantes=${(f?.valor||0).toFixed(2)} Defensivos=${(d?.valor||0).toFixed(2)} Sementes=${(s?.valor||0).toFixed(2)}`);
      } catch (err) {
        console.error('DEBUG CustosTable erro ao logar processados:', err);
      }
      // Debug: log detalhado dos itens com valor diferente de zero
      try {
        const nonZero = processados.filter(p => (p.valor || 0) !== 0);
        if (nonZero.length) {
          console.log('DEBUG CustosTable non-zero items:');
          nonZero.forEach(it => console.log(`${it.categoria}: valor=${(it.valor||0).toFixed(2)} R$ /ha=${(it.realHectare||0).toFixed(6)} R$/sc=${(it.realSaca||0).toFixed(6)}`));
        } else {
          console.log('DEBUG CustosTable non-zero items: none');
        }
      } catch (err) {
        console.error('DEBUG CustosTable erro ao logar nonZero:', err);
      }
      setCustos(processados); // Aqui sim atualiza o estado
      // Verificação rápida: soma dos valores deve corresponder ao totalRealHectare * areaCultivada
      try {
        const sumValores = processados.reduce((s, p) => s + (p.valor || 0), 0);
        const expectedTotalRealHectare = areaCultivada > 0 ? sumValores / areaCultivada : 0;
        console.log(`VERIF Custos: sumValores=R$ ${sumValores.toFixed(2)}, area=${areaCultivada}, expectedTotalRealHectare=R$ ${expectedTotalRealHectare.toFixed(6)}`);
      } catch (err) {
        console.error('VERIF Custos erro:', err);
      }
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

  // 1. Agrupa valores reais do usuário, excluindo categoria "Receita".
  //    Se a categoria financeira for 'Insumos', divide igualmente entre
  //    Fertilizantes, Defensivos Agrícolas e Sementes e mudas.
  const grouped = estatisticas.reduce((acc, est) => {
    const rawCat = est.categoria || "Sem categoria";
    const categoria = String(rawCat).trim();
    // Ignora categoria "Receita"
    if (categoria.toLowerCase() === "receita") {
      return acc;
    }

    const valorCategoria = Math.abs(est.valor ?? est.total ?? 0);

    // Se categorizado como 'insumos' (qualquer capitalização), distribuir
    // igualmente entre as três discriminações da CONAB.
    if (categoria.toLowerCase() === 'insumos') {
      const part = valorCategoria / 3;
      acc['Fertilizantes'] = (acc['Fertilizantes'] || 0) + part;
      acc['Defensivos Agrícolas'] = (acc['Defensivos Agrícolas'] || 0) + part;
      acc['Sementes e mudas'] = (acc['Sementes e mudas'] || 0) + part;
      return acc;
    }

    acc[categoria] = (acc[categoria] || 0) + valorCategoria;
    return acc;
  }, {} as Record<string, number>);

  // 2. Pega todas as categorias da CONAB como base (já sem "Receita")
  const todasCategorias = CustoConabService.getAllCustos();

  // 3. Monta array final, mesmo que valor real = 0
  const base = todasCategorias.map((item) => {
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

  return base;
};


  useEffect(() => {
    console.log("Custos no estado >>>", custos);
  }, [custos]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5 transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-[#00A651]" />
              <span className="text-sm font-semibold text-[#004417]">Custo Real/ha</span>
            </div>
            <button onClick={() => setSelectedInfo('ha')} aria-label="Informações Custo Real por hectare" className="text-[#004417] hover:opacity-80">
              <Info className="w-4 h-4" />
            </button>
          </div>
          <p className="text-4xl font-extrabold text-[#00A651]">R$ {formatNumber(totalRealHectare)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5 transition-transform duration-200 hover:scale-[1.01]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Minus className="w-5 h-5 text-[#00A651]" />
              <span className="text-sm font-semibold text-[#004417]">Custo Real/Saca</span>
            </div>
            <button onClick={() => setSelectedInfo('saca')} aria-label="Informações Custo Real por saca" className="text-[#004417] hover:opacity-80">
              <Info className="w-4 h-4" />
            </button>
          </div>
          <p className="text-4xl font-extrabold text-[#00A651]">R$ {formatNumber(totalRealSaca)}</p>
        </div>
      </div>

      {/* Custo por Hectare Table */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[#004417]">Custos por Hectare</h3>
        <div className="overflow-x-auto bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[rgba(0,166,81,0.06)] rounded-t-2xl">
                <th className="px-3 py-4 text-left text-[14px] font-bold text-[#004417]">Categoria</th>
                <th className="px-6 py-4 text-right text-[14px] font-bold text-[#004417]">Estimado (R$/ha)</th>
                <th className="px-6 py-4 text-right text-[14px] font-bold text-[#004417]">Real (R$/ha)</th>
              </tr>
            </thead>
            <tbody>
              {custosSorted.map((item, index) => (
                <tr key={`ha-${index}`} className="bg-white border-b border-[rgba(0,0,0,0.06)]">
                  <td className="px-3 py-5 text-sm text-[#004417] font-medium align-top">{item.categoria}</td>
                  <td className="px-6 py-5 text-sm text-right text-[#004417] font-medium align-top whitespace-nowrap">R$ {formatNumber(item.estimadoHectare)}</td>
                  <td className="px-6 py-5 text-sm text-right font-bold text-[#00A651] align-top whitespace-nowrap">R$ {formatNumber(item.realHectare)}</td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="total-geral bg-[rgba(0,166,81,0.06)]">
                <td className="px-3 py-4 text-sm text-[#004417] font-bold">TOTAL GERAL</td>
                <td className="px-5 py-4 text-right text-sm text-[#004417] font-bold whitespace-nowrap">
                  R$ {formatNumber(totalEstimadoHectare)}
                </td>
                <td className="px-5 py-4 text-right text-sm text-[#004417] font-bold whitespace-nowrap">
                  R$ {formatNumber(totalRealHectare)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Custo por Saca Table */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-[#004417]">Custos por Saca</h3>
        <div className="overflow-x-auto bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-[rgba(0,166,81,0.06)] rounded-t-2xl">
                <th className="px-3 py-4 text-left text-[14px] font-bold text-[#004417]">Categoria</th>
                <th className="px-6 py-4 text-right text-[14px] font-bold text-[#004417]">Estimado (R$/sc)</th>
                <th className="px-6 py-4 text-right text-[14px] font-bold text-[#004417]">Real (R$/sc)</th>
              </tr>
            </thead>
            <tbody>
              {custosSorted.map((item, index) => (
                <tr key={`saca-${index}`} className="bg-white border-b border-[rgba(0,0,0,0.06)]">
                  <td className="px-3 py-5 text-sm text-[#004417] font-medium align-top">{item.categoria}</td>
                  <td className="px-6 py-5 text-sm text-right text-[#004417] font-medium align-top whitespace-nowrap">R$ {formatNumber(item.estimadoSaca)}</td>
                  <td className="px-6 py-5 text-sm text-right font-bold text-[#00A651] align-top whitespace-nowrap">R$ {formatNumber(item.realSaca)}</td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="total-geral bg-[rgba(0,166,81,0.06)]">
                <td className="px-3 py-4 text-sm text-[#004417] font-bold">TOTAL GERAL</td>
                <td className="px-5 py-4 text-right text-sm text-[#004417] font-bold whitespace-nowrap">
                  R$ {formatNumber(totalEstimadoSaca)}
                </td>
                <td className="px-5 py-4 text-right text-sm text-[#004417] font-bold whitespace-nowrap">
                  R$ {formatNumber(totalRealSaca)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Info Modal for KPI explanations */}
      {selectedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedInfo(null)} />
          <div className="bg-white rounded-xl p-6 z-10 max-w-md w-full mx-4">
            <div className="flex items-start justify-between">
              <h4 className="text-lg font-bold text-[#004417]">
                {selectedInfo === 'ha' ? 'Custo Real por Hectare' : 'Custo Real por Saca'}
              </h4>
              <button onClick={() => setSelectedInfo(null)} aria-label="Fechar" className="text-[#004417] hover:opacity-80">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-[#004417]">Calculado com dados reais do financeiro do usuário. Os valores por hectare e por saca consideram todos os lançamentos categorizados e a área/productividade informadas.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustosTable;