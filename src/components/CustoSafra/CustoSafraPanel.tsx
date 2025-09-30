import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from 'lucide-react';
import { FinanceService, getTransactionsByCategory } from '../../services/financeService';
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
  const [talhoes, setTalhoes] = useState<TalhaoData[]>([]);
  const [dadosFinanceiros, setDadosFinanceiros] = useState<{
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

  const getComparacaoIcon = () => {
    if (diferencaProdutividade > 0) return '↗️';
    if (diferencaProdutividade < 0) return '↘️';
    return '➖';
  };

  const getComparacaoColor = () => {
    if (diferencaProdutividade > 0) return 'text-[#397738]';
    if (diferencaProdutividade < 0) return 'text-[#86b646]';
    return 'text-gray-600';
  };

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
      {/* Header with Productivity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        {/* Property Data */}
        <div className="bg-[#397738]/10 border border-[#397738]/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-2 h-2 bg-[#397738] rounded-full"></div>
            <span className="text-sm font-medium text-[#092f20]">Dados da Propriedade</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-[#397738] font-medium">ÁREA CULTIVADA</span>
              <p className="text-lg font-bold text-[#092f20]">{areaCultivada.toFixed(1)} ha</p>
            </div>
            <div>
              <span className="text-xs text-[#397738] font-medium">TALHÕES ATIVOS</span>
              <p className="text-lg font-bold text-[#092f20]">{talhoes.length}</p>
            </div>
            <div>
              <span className="text-xs text-[#397738] font-medium">TRANSAÇÕES FINANCEIRAS</span>
              <p className="text-lg font-bold text-[#092f20]">{dadosFinanceiros?.balance?.totalTransactions ?? 0} lançamentos</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#092f20]">Custo de Produção da Safra</h2>
              <p className="text-sm text-gray-600">Análise detalhada dos custos por hectare e por saca</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-2 text-sm bg-[#86b646]/20 text-[#397738] rounded-lg hover:bg-[#86b646]/30 transition-colors"
          >
            Atualizar Dados
          </button>
        </div>

        {/* Productivity Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#86b646]/10 p-4 rounded-lg">
            <label className="block text-sm font-medium text-[#092f20] mb-2">
              Produtividade da Fazenda
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold bg-gray-50">
                {produtividade.toFixed(1)}
              </div>
              <span className="text-sm text-gray-600 whitespace-nowrap">sacas/ha</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Calculado dos talhões cadastrados</p>
          </div>

          <div className="bg-[#397738]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#397738]" />
              <span className="text-sm font-medium text-[#092f20]">Produtividade Média Brasil</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20]">{produtividadeConab.toFixed(1)}</p>
            <p className="text-sm text-[#397738]">sacas/ha (Conab 2024)</p>
          </div>

          <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getComparacaoIcon()}</span>
              <span className="text-sm font-medium text-[#092f20]">Comparação</span>
            </div>
            <p className={`text-lg font-bold ${getComparacaoColor()}`}>
              {diferencaProdutividade > 0 ? '+' : ''}{diferencaProdutividade.toFixed(1)} sacas/ha
            </p>
            <p className={`text-sm ${getComparacaoColor()}`}>
              {Math.abs(percentualDiferenca).toFixed(1)}% {diferencaProdutividade >= 0 ? 'acima' : 'abaixo'} da média
            </p>
          </div>
        </div>
      </div>
      

      {/* Main table */}
      <div className="p-6 bg-white shadow-md rounded-lg">
        <h2 className="text-xl font-bold text-[#092f20] mb-4">Custos da Safra</h2>
        <CustosTable
          userId={userId}
          areaCultivada={areaCultivada}
          produtividade={produtividade}
        />
      </div>
    </div>
  );
}