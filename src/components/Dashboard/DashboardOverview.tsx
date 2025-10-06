import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Coffee, 
  Package, 
  Calendar,
  AlertTriangle,
  BarChart3,
  Wheat, 
  LandPlot
} from 'lucide-react';
import StatsCard from './StatsCard';
import UserProfile from './UserProfile';
import FinancialChart from './FinancialChart';
import TransactionTable from './TransactionTable';
import RecentTransactions from './RecentTransactions';
import PlannedTransactions from './PlannedTransactions';
import ActivityList from './ActivityList';
import ActivityChart from './ActivityChart';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import WeatherWidget from './WeatherWidget';
import { AuthService } from '../../services/authService';
import { UserService } from '../../services/userService';
import { FinanceService, ResumoFinanceiro, DadosGrafico, OverallBalance } from '../../services/financeService';
import { ActivityService, AtividadeComData } from '../../services/activityService';
import { CotacaoService } from '../../services/cotacaoService';
import { TalhaoService } from '../../services/talhaoService';
import { Usuario, TransacaoFinanceira } from '../../lib/supabase';

function WheatDollarIcon({ size = 20, className = "" }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Wheat (background) */}
      <Wheat size={size} className="text-current" />
      {/* DollarSign (foreground, smaller and positioned) */}
      <DollarSign 
        size={Math.round(size * 0.45)} 
        className="absolute text-current font-bold" 
        style={{ 
          right: '-2px', 
          top: '-2px',
          filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))'
        }} 
      />
    </div>
  );
}

function LandPlotDollarIcon({ size = 20, className = "" }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
   
      <LandPlot size={size} className="text-current" />
     
      <DollarSign 
        size={Math.round(size * 0.45)} 
        className="absolute text-current font-bold" 
        style={{ 
          right: '-2px', 
          top: '-2px',
          filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))'
        }} 
      />
    </div>
  );
}

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<Usuario | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [resumoFinanceiro, setResumoFinanceiro] = useState<ResumoFinanceiro>({
    totalReceitas: 0,
    totalDespesas: 0,
    saldoLiquido: 0,
    transacoesCount: 0
  });
  const [overallBalance, setOverallBalance] = useState<OverallBalance>({
    totalBalance: 0,
    totalReceitas: 0,
    totalDespesas: 0,
    totalTransactions: 0
  });
  const [dadosGrafico, setDadosGrafico] = useState<DadosGrafico[]>([]);
  const [transacoes, setTransacoes] = useState<TransacaoFinanceira[]>([]);
  const [proximas5Transacoes, setProximas5Transacoes] = useState<TransacaoFinanceira[]>([]);
  const [atividades, setAtividades] = useState<AtividadeComData[]>([]);
  const [atividadesGrafico, setAtividadesGrafico] = useState<AtividadeComData[]>([]);
  const [cotacaoAtual, setCotacaoAtual] = useState(1726);
  const [variacaoCotacao, setVariacaoCotacao] = useState('+2.5');
  const [areaCultivada, setAreaCultivada] = useState(0);
  const [talhoesCafe, setTalhoesCafe] = useState<Array<{nome: string, area: number}>>([]);
  const [estoqueStatus] = useState({ percentual: 85, itensAbaixoMinimo: 3 });
  const [producaoTotal, setProducaoTotal] = useState(0);
  const [custoTotal, setCustoTotal] = useState(0);
    const [resumoMensalFinanceiro, setResumoMensalFinanceiro] = useState<ResumoMensalFinanceiro>({
    totalReceitas: 0,
    totalDespesas: 0,
  });
  const [somaTransacoesAteHoje, setSomaTransacoesAteHoje] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const authService = AuthService.getInstance();
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Load all data in parallel
      const [
        user,
        resumo,
        grafico,
        lancamentos,
        proximas5,
        overall,
        atividadesRecentes,
        atividades30Dias,
        cotacao,
        cotacaoCompleta,
        areaCafe,
        talhoes,
        producaoTotal,
        custoTotalNegativo,
         resumoMensalFinanceiro,
        somaTransacoesAteHoje
      ] = await Promise.all([
        UserService.getUserById(currentUser.user_id),
        FinanceService.getResumoFinanceiro(currentUser.user_id),
        FinanceService.getDadosGrafico(currentUser.user_id),
        FinanceService.getLancamentos(currentUser.user_id, 100),
        FinanceService.getProximas5TransacoesFuturas(currentUser.user_id),
        FinanceService.getOverallBalance(currentUser.user_id),
        ActivityService.getAtividades(currentUser.user_id, 5),
        ActivityService.getAtividadesUltimos30Dias(currentUser.user_id),
        CotacaoService.getCotacaoAtual(),
        CotacaoService.getCotacaoCompleta(),
        TalhaoService.getAreaCultivadaCafe(currentUser.user_id),
        TalhaoService.getTalhoesCafe(currentUser.user_id),
        TalhaoService.getTotalProducaoFazenda(currentUser.user_id),
        FinanceService.getTotalNegativeTransactions(currentUser.user_id),
        FinanceService.getResumoMensalFinanceiro(currentUser.user_id),
        FinanceService.getSomaTransacoesAteHoje(currentUser.user_id)
      ]);

      // Set state
      setUserData(user);
      setResumoFinanceiro(resumo);
      setDadosGrafico(grafico);
      setTransacoes(lancamentos);
      setProximas5Transacoes(proximas5);
      setOverallBalance(overall);
      
      // DEBUG: Log dos dados do gráfico para verificação
      console.log('📊 Dados do gráfico carregados:', grafico);
      console.log('💰 Exemplo de dados:', grafico.slice(0, 2));
      
      setAtividades(atividadesRecentes);
      setAtividadesGrafico(atividades30Dias);
      setCotacaoAtual(cotacao);
      setAreaCultivada(areaCafe);
      setTalhoesCafe(talhoes);
      setProducaoTotal(producaoTotal);
      setCustoTotal(Math.abs(custoTotalNegativo));
      setResumoMensalFinanceiro(resumoMensalFinanceiro);
      setSomaTransacoesAteHoje(somaTransacoesAteHoje);
      
      if (cotacaoCompleta?.variacao) {
        const variacaoNum = CotacaoService.parseVariacaoString(cotacaoCompleta.variacao);
        const variacaoFormatada = CotacaoService.formatVariacao(variacaoNum);
        setVariacaoCotacao(variacaoFormatada);
      }

      setIsDataLoaded(true);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const reloadData = () => {
    setLoading(true);
    setError(null);
    loadDashboardData();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={reloadData} />;
  }

  // Calculate estimated revenue and costs
  const cotacaoDia = cotacaoAtual;
  const receitaEstimada = producaoTotal * cotacaoDia;
  const custoMedioHectar = areaCultivada > 0 ? custoTotal / areaCultivada : 0;
  const custoMedioSaca = producaoTotal > 0 ? custoTotal / producaoTotal : 0;

  console.log('custo medio hectar', custoMedioHectar);
  console.log('custo total', custoTotal);
  console.log('area cultivada', areaCultivada);

  // Stats configuration
  const stats = [
  {
  title: 'Saldo Atual',
  value: FinanceService.formatCurrency(somaTransacoesAteHoje),
  change: (
    <div className="flex flex-col">
     
      <span className="text-sm text-gray-700">
        Saldo projetado: {FinanceService.formatCurrency(overallBalance.totalBalance)}
      </span>
    </div>
  ),
  changeType: 'neutral', // Changed from conditional to neutral
  icon: DollarSign,
  color: 'green',
  modalContent: (
    <div className="text-gray-700">
      <p>Saldo geral de todas as transações</p>
    </div>
  )
},
  {
    title: 'Cotação Café (sc 60kg)',
    value: `R$ ${cotacaoAtual.toLocaleString()}`,
    change: `${variacaoCotacao} hoje`,
    changeType: 'neutral', // Changed from 'positive' to neutral
    icon: Coffee,
    color: 'orange',
    modalContent: (
      <div className="text-gray-700">
        <p>Cotação Café (sc/60kg) — Cereja Descascado (referência Cooxupé).</p>
      </div>
    )
  },
  {
  title: 'Receita Estimada da Safra',
  value: (
    <span className="text-sm md:text-base font-medium whitespace-nowrap">
      {areaCultivada > 0 
        ? <>
            R$ {(receitaEstimada / 1_000_000).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} <span className="ml-0.5">mi</span>
          </>
        : 'N/A'
      }
    </span>
  ),
  change: areaCultivada > 0 ? (
    <>
      {talhoesCafe.length} {talhoesCafe.length !== 1 ? 'talhões' : 'talhão'} {talhoesCafe.length !== 1 ? 'ativos' : 'ativo'}
    </>
  ) : (
    'Cadastre talhões'
  ),
  changeType: 'neutral',
  icon: BarChart3,
  color: 'green',
  modalContent: (
    <div className="text-gray-700">
      <p>Produtividade total estimada × cotação Cooxupé.</p>
    </div>
  )
},
  {
    title: 'Custo Médio por saca',
    value: (
      <span className="text-sm md:text-base font-medium whitespace-nowrap">
        {producaoTotal > 0 
          ? `R$ ${custoMedioSaca.toLocaleString('pt-BR', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}/sc` 
          : 'N/A'
        }
      </span>
    ),
    change: producaoTotal > 0 ? `${producaoTotal.toFixed(1)} sacas estimadas` : 'Cadastre talhões',
    changeType: 'neutral', // Changed from conditional to neutral
    icon: WheatDollarIcon,
    color: 'grey',
    modalContent: (
      <div className="text-gray-700">
        <p>Custo total ÷ produção total estimada.</p>
      </div>
    )
  },
  {
    title: 'Custo Médio por Hectare (estimado)',
    value: (
      <span className="text-sm md:text-base font-medium whitespace-nowrap">
        {areaCultivada > 0 
          ? `R$ ${custoMedioHectar.toLocaleString('pt-BR', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}/ha` 
          : 'N/A'
        }
      </span>
    ),
    change: areaCultivada > 0 ? `${areaCultivada.toFixed(2)} ha cultivados` : 'Cadastre talhões',
    changeType: 'neutral', // Changed from conditional to neutral
    icon: LandPlotDollarIcon,
    color: 'red',
    modalContent: (
      <div className="text-gray-700">
        <p>Custo total ÷ área total cultivada (ha).</p>
      </div>
    )
  }
];

  return (
    <div className="space-y-6">
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Debug Info:</h4>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>User ID: {AuthService.getInstance().getCurrentUser()?.user_id}</p>
            <p>Dados carregados: {isDataLoaded ? 'Sim' : 'Não'}</p>
            <p>Talhões de café: {talhoesCafe.length} (Área: {areaCultivada} ha)</p>
          </div>
        </div>
      )}

      {userData && <UserProfile user={userData} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>
    
      <div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-lg font-semibold text-[#092f20] mb-4">
            Resumo Financeiro do Mês {isDataLoaded ? '' : '(Carregando...)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#397738]/10 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#397738] flex-shrink-0" />
                <span className="text-xs font-medium text-[#092f20]">Receitas</span>
              </div>
              <p className="text-lg font-bold text-[#092f20] leading-tight break-words">
                {FinanceService.formatCurrency(resumoMensalFinanceiro.totalReceitas)}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingDown className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-xs font-medium text-red-900">Despesas</span>
              </div>
              <p className="text-lg font-bold text-red-800 leading-tight break-words">
                {FinanceService.formatCurrency(resumoMensalFinanceiro.totalDespesas)}
              </p>
             
            
            </div>
          </div>
        </div>
      </div>
      

      

      {dadosGrafico.length > 0 && <FinancialChart data={dadosGrafico} />}

      {/* Transaction Sections */}
      {transacoes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <RecentTransactions transactions={transacoes} />
          <PlannedTransactions transactions={transacoes} proximas5={proximas5Transacoes} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityList activities={atividades} />
        <ActivityChart activities={atividadesGrafico} />
      </div>

      <WeatherWidget 
        city={userData?.cidade} 
        state={userData?.estado} 
      />

      {!isDataLoaded || (atividades.length === 0 && transacoes.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-16 h-16 bg-[#86b646]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-8 h-8 text-[#86b646]" />
          </div>
          <h3 className="text-lg font-semibold text-[#092f20] mb-2">
            {!isDataLoaded ? 'Carregando dados...' : 'Bem-vindo ao ZÉ DA SAFRA!'}
          </h3>
          <p className="text-gray-600 mb-4">
            {!isDataLoaded 
              ? 'Conectando com o banco de dados para buscar suas informações.'
              : 'Seus dados aparecerão aqui conforme você for interagindo com o ZÉ via WhatsApp.'
            }
          </p>
          <div className="bg-[#86b646]/10 p-4 rounded-lg">
            <p className="text-sm text-[#397738]">
              <strong>Dica:</strong> Comece enviando informações sobre sua fazenda, 
              lançamentos financeiros ou atividades agrícolas no WhatsApp do ZÉ.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}