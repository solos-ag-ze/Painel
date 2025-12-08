import React, { useState, useEffect } from 'react';
import { BarChart, TrendingUp, Percent, Loader2, AlertCircle } from 'lucide-react';
import { FinanceService } from '../../services/financeService';
import { TalhaoService } from '../../services/talhaoService';
import { AuthService } from '../../services/authService';

// Interfaces moved to a common place or defined within the component if they are not reused
interface TalhaoData {
  id_talhao: string;
  nome: string;
  area: number;
  produtividade_media?: number;
  propriedade?: {
    nome: string;
  };
}
interface CustoItem {
  categoria: string;
  realHectare: number;
  realSaca: number;
  total: number;
}

// Mapeamento de categorias -> seção (I–VI)
const categorySections: Record<string, string> = {
  // I. CUSTOS VARIÁVEIS
  "Sementes": "I. CUSTOS VARIÁVEIS",
  "Fertilizantes": "I. CUSTOS VARIÁVEIS",
  "Defensivos": "I. CUSTOS VARIÁVEIS",
  "Serviços de terceiros": "I. CUSTOS VARIÁVEIS",
  "Mão de obra temporária": "I. CUSTOS VARIÁVEIS",

  // II. CUSTOS OPERACIONAIS
  "Combustível e lubrificantes": "II. CUSTOS OPERACIONAIS",
  "Manutenção de máquinas": "II. CUSTOS OPERACIONAIS",
  "Reparos em benfeitorias": "II. CUSTOS OPERACIONAIS",

  // III. DESPESAS FIXAS
  "Mão de obra fixa": "III. DESPESAS FIXAS",
  "Seguros": "III. DESPESAS FIXAS",
  "Impostos": "III. DESPESAS FIXAS",
  "Arrendamento": "III. DESPESAS FIXAS",
  "Depreciação": "III. DESPESAS FIXAS",

  // IV. OUTROS CUSTOS
  "Despesas administrativas": "IV. OUTROS CUSTOS",
  "Assistência técnica": "IV. OUTROS CUSTOS",
  "Taxas bancárias": "IV. OUTROS CUSTOS",
  "Outros": "IV. OUTROS CUSTOS",

  // V. CUSTOS FINANCEIROS
  "Juros sobre custeio": "V. CUSTOS FINANCEIROS",
  "Juros sobre investimento": "V. CUSTOS FINANCEIROS",

  // VI. DESPESAS PÓS-COLHEITA
  "Transporte": "VI. DESPESAS PÓS-COLHEITA",
  "Armazenagem": "VI. DESPESAS PÓS-COLHEITA",
  "Beneficiamento": "VI. DESPESAS PÓS-COLHEITA",
  "Impostos pós-colheita": "VI. DESPESAS PÓS-COLHEITA",
};

// Import the separate CustosTable component
import CustosTable from './CustosTable'; // Adjust the import path as needed

export default function CustoSafraPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [produtividade, setProdutividade] = useState(28);
  const [areaCultivada, setAreaCultivada] = useState(0);
  const [_talhoes, setTalhoes] = useState<TalhaoData[]>([]);
  const [_dadosFinanceiros, setDadosFinanceiros] = useState<{
    estatisticas: any[];
    balance: any;
  } | null>(null);
  // Removed custos state since it's now handled by the CustosTable component

  // Get user ID from auth service
  const authService = AuthService.getInstance();
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.user_id || '';

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [areaCafe, talhoesDetalhados, estatisticasFinanceiras, balanceGeral, produtividadeFazenda] = await Promise.all([
        TalhaoService.getAreaCultivadaCafe(userId),
        TalhaoService.getTalhoesDetalhados(userId),
        FinanceService.getTransactionsByCategory(userId),
        FinanceService.getOverallBalance(userId),
        TalhaoService.getProdutividadeFazendaTeste(userId)
      ]);

      setAreaCultivada(areaCafe);
      setTalhoes(talhoesDetalhados as TalhaoData[]);
      setDadosFinanceiros({
        estatisticas: estatisticasFinanceiras,
        balance: balanceGeral
      });

      // Uses the productivity calculated by TalhaoService
      console.log('Produtividade calculada:', produtividadeFazenda);
if (produtividadeFazenda !== null && produtividadeFazenda !== undefined) {
  console.log('Usando produtividade calculada:', produtividadeFazenda);
  setProdutividade(produtividadeFazenda);
} else {
  console.log('Usando produtividade padrão: 28');
  setProdutividade(28);
}
      

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Removed updateCustosWithFinancialData function since it's now handled by CustosTable

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  // Totals will be calculated by the CustosTable component internally
  // These values are now just for display in the summary cards
  const totalRealHectare = 0; // Will be updated when CustosTable provides the data
  const totalRealSaca = 0; // Will be updated when CustosTable provides the data

  

  // Productivity comparison
  const produtividadeConab = 28.0;
  const diferencaProdutividade = produtividade - produtividadeConab;
  const percentualDiferenca = ((diferencaProdutividade / produtividadeConab) * 100);

  

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-8 h-8 text-[#86b646] animate-spin" />
          <span className="text-lg text-[#092f20]">Carregando dados da fazenda...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="text-red-800 font-semibold">Erro ao carregar dados</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title (outside white cards) */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-[#004417]">Custo Safra</h1>
        <p className="text-sm text-[#004417]/80 font-medium">Custos reais por hectare e por saca</p>
      </div>
      {/* Header with Productivity */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-6">
        {/* Productivity Fields - unified visual group */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-[rgba(0,68,23,0.08)] flex items-start gap-4">
            <BarChart className="w-6 h-6 text-[#00A651] flex-shrink-0 mt-1" />
            <div>
              <div className="text-sm font-semibold text-[#004417]">Produtividade da Fazenda</div>
              <div className="text-2xl font-bold text-[#004417] mt-1">{produtividade.toFixed(1)} <span className="text-sm text-[rgba(0,68,23,0.75)]">sacas/ha</span></div>
              <p className="text-[13px] text-[rgba(0,68,23,0.75)] mt-2">Calculado dos talhões cadastrados</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[rgba(0,68,23,0.08)] flex items-start gap-4">
            <TrendingUp className="w-6 h-6 text-[#CADB2A] flex-shrink-0 mt-1" />
            <div>
              <div className="text-sm font-semibold text-[#004417]">Produtividade Média Brasil</div>
              <div className="text-2xl font-bold text-[#004417] mt-1">{produtividadeConab.toFixed(1)} <span className="text-sm text-[rgba(0,68,23,0.75)]">sacas/ha</span></div>
              <p className="text-[13px] text-[rgba(0,68,23,0.75)] mt-2">(Conab 2024)</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[rgba(0,68,23,0.08)] flex items-start gap-4">
            <Percent className="w-6 h-6 text-[#00A651] flex-shrink-0 mt-1" />
            <div>
              <div className="text-sm font-semibold text-[#004417]">Comparação</div>
              <div className="text-2xl font-bold text-[#004417] mt-1">{diferencaProdutividade > 0 ? '+' : ''}{diferencaProdutividade.toFixed(1)} sacas/ha</div>
              <p className="text-[13px] text-[rgba(0,68,23,0.75)] mt-2">{Math.abs(percentualDiferenca).toFixed(1)}% {diferencaProdutividade >= 0 ? 'acima' : 'abaixo'} da média</p>
            </div>
          </div>
        </div>
      </div>
      

      {/* Main table */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] overflow-hidden">
        <div className="p-6">
          <CustosTable
            userId={userId}
            areaCultivada={areaCultivada}
            produtividade={produtividade}
          />
        </div>
      </div>
      {/* Card Info Modal removed - restored original cards */}
    </div>
  );
}