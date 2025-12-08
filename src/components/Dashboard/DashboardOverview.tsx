// React import not required with new JSX runtime
import { useState, useEffect } from 'react';
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
import { FinanceService, ResumoFinanceiro, DadosGrafico, OverallBalance, ResumoMensalFinanceiro, PeriodBalance } from '../../services/financeService';
import { ActivityService } from '../../services/activityService';
import { CotacaoService } from '../../services/cotacaoService';
import { formatSmartCurrency } from '../../lib/currencyFormatter';
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
  const [ultimas5Transacoes, setUltimas5Transacoes] = useState<TransacaoFinanceira[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [atividadesGrafico, setAtividadesGrafico] = useState<Array<{ data?: string }>>([]);
  const [cotacaoAtual, setCotacaoAtual] = useState<number | null>(null);
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
    // Period balance used to sync Dashboard StatsCard with FinanceiroPanel
    const [periodBalanceDashboard, setPeriodBalanceDashboard] = useState<PeriodBalance>({
      totalEntradas: 0,
      totalSaidas: 0,
      saldoReal: 0,
      transacoesRealizadas: 0,
      transacoesFuturas: 0
    });

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
      const [user,
        resumo,
        grafico,
        lancamentos,
        proximas5,
        ultimas5,
        overall,
        periodBalance,
        atividadesRecentes,
        atividades30Dias,
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
        FinanceService.getUltimas5TransacoesExecutadas(currentUser.user_id),
        FinanceService.getOverallBalance(currentUser.user_id),
        FinanceService.getPeriodBalance(currentUser.user_id, 'todos'),
  ActivityService.getLancamentos(currentUser.user_id, 5),
  ActivityService.getLancamentos(currentUser.user_id, 100),
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
      setUltimas5Transacoes(ultimas5);
      setOverallBalance(overall);
      // Sincroniza o saldo do dashboard com o resultado canônico do serviço
      setPeriodBalanceDashboard(periodBalance);
      
      // DEBUG: Log dos dados do gráfico para verificação
      console.log('📊 Dados do gráfico carregados:', grafico);
      console.log('💰 Exemplo de dados:', grafico.slice(0, 2));
      
  // Map activities to include a human-readable talhao label using talhoes list
  const mappedAtividades = (atividadesRecentes || []).map((l: any) => {
    const talhoesLanc = l.lancamento_talhoes || l.talhoes || [];
    // If we have the talhoes list from TalhaoService, map ids to names
    const nomes = talhoesLanc
      .map((t: any) => {
        const match = (talhoes || []).find((th: any) => th.id_talhao === t.talhao_id || th.id_talhao === t.talho_id);
        return match ? match.nome : t.talhao_id || t.talho_id || null;
      })
      .filter(Boolean);

    const talhaoLabel = nomes.length > 0 ? nomes.join(', ') : (l.area_atividade || l.area || null);

    return {
      ...l,
      talhao: talhaoLabel || 'Área não informada'
    };
  });

  setAtividades(mappedAtividades);

      setAtividadesGrafico((atividades30Dias || []).map((l: any) => ({ data: l.data_atividade || l.created_at })));
      // Buscar cotação atual separadamente e tratar falhas explicitamente
      try {
        const cot = await CotacaoService.getCotacaoAtual();
        setCotacaoAtual(cot);
      } catch (cotErr) {
        console.error('Não foi possível obter cotação atual:', cotErr);
        setCotacaoAtual(null);
      }
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
  const cotacaoDia = cotacaoAtual ?? 0;
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
  subtitle: undefined,
  value: FinanceService.formatCurrency(somaTransacoesAteHoje),
  change: (
    <div className="flex flex-col">
      <span className="text-sm text-[#004417]/70">
        Saldo projetado: {FinanceService.formatCurrency(periodBalanceDashboard.saldoProjetado ?? overallBalance.totalBalance)}
      </span>
    </div>
  ),
  changeType: 'neutral', // Changed from conditional to neutral
  icon: DollarSign,
  color: 'green',
  modalContent: (
    <div className="text-[#004417]/80">
      <p>Saldo geral de todas as transações</p>
    </div>
  )
},
  {
    title: 'Cotação Café (sc 60kg)',
    value: cotacaoAtual != null ? CotacaoService.formatCurrency(cotacaoAtual) : 'Indisponível',
    change: `${variacaoCotacao} hoje`,
    changeType: 'neutral', // Changed from 'positive' to neutral
    icon: Coffee,
    color: 'orange',
    modalContent: (
      <div className="text-[#004417]/80">
        <p>Cotação Café (sc/60kg) — Cereja Descascado (referência Cooxupé) - cotação do dia.</p>
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
    <div className="text-[#004417]/80">
      <p>Produtividade total estimada × cotação Cooxupé.</p>
    </div>
  )
},
  {
    title: 'Custo Médio por Saca',
    value: (
      <span className="text-sm md:text-base font-medium whitespace-nowrap">
        {producaoTotal > 0
          ? `${formatSmartCurrency(custoMedioSaca)}/sc`
          : 'N/A'
        }
      </span>
    ),
    change: producaoTotal > 0 ? `${producaoTotal.toFixed(1)} sacas estimadas` : 'Cadastre talhões',
    changeType: 'neutral', // Changed from conditional to neutral
    icon: WheatDollarIcon,
    color: 'grey',
    modalContent: (
      <div className="text-[#004417]/80">
        <p>Custo total ÷ produção total estimada.</p>
      </div>
    )
  },
  {
    title: 'Custo Médio por Hectare',
    value: (
      <span className="text-sm md:text-base font-medium whitespace-nowrap">
        {areaCultivada > 0
          ? `${formatSmartCurrency(custoMedioHectar)}/ha`
          : 'N/A'
        }
      </span>
    ),
    change: areaCultivada > 0 ? `${areaCultivada.toFixed(2)} ha cultivados` : 'Cadastre talhões',
    changeType: 'neutral', // Changed from conditional to neutral
    icon: LandPlotDollarIcon,
    color: 'red',
    modalContent: (
      <div className="text-[#004417]/80">
        <p>Custo total ÷ área total cultivada (ha).</p>
      </div>
    )
  }
];

  return (
    <div className="p-6 space-y-8">
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

      {/* User profile moved to header modal; removed card from dashboard */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={(stat as any).title}
            subtitle={(stat as any).subtitle}
            value={(stat as any).value}
            change={(stat as any).change}
            changeType={(stat as any).changeType}
            icon={(stat as any).icon}
            color={(stat as any).color}
            modalContent={(stat as any).modalContent}
          />
        ))}
      </div>
    
      <div>
        <div className="bg-white rounded-xl shadow-card p-6">
          <h3 className="text-lg font-bold text-[#004417] mb-4">
            Resumo Financeiro do Mês {isDataLoaded ? '' : '(Carregando...)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[rgba(0,166,81,0.06)] p-4 rounded-xl">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[#00A651] flex-shrink-0" />
                <span className="text-xs font-semibold text-[#004417]">Receitas</span>
              </div>
              <p className="text-lg font-bold text-[#004417] leading-tight break-words">
                {FinanceService.formatCurrency(resumoMensalFinanceiro.totalReceitas)}
              </p>
            </div>
            <div className="bg-[rgba(247,148,31,0.06)] p-4 rounded-xl">
              <div className="flex items-center space-x-2 mb-3">
                <TrendingDown className="w-4 h-4 text-[#F7941F] flex-shrink-0" />
                <span className="text-xs font-semibold text-[#004417]">Despesas</span>
              </div>
              <p className="text-lg font-bold text-[#004417] leading-tight break-words">
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
          <RecentTransactions transactions={transacoes} ultimas5={ultimas5Transacoes} />
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
        <div className="bg-white rounded-xl shadow-card p-6 text-center">
          <div className="w-16 h-16 bg-[rgba(0,166,81,0.06)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-8 h-8 text-[#00A651]" />
          </div>
          <h3 className="text-lg font-semibold text-[#004417] mb-2">
            {!isDataLoaded ? 'Carregando dados...' : 'Bem-vindo ao Zé · Solos.ag!'}
          </h3>
          <p className="text-[#004417]/70 mb-4">
            {!isDataLoaded 
              ? 'Conectando com o banco de dados para buscar suas informações.'
              : 'Seus dados aparecerão aqui conforme você for interagindo com o ZÉ via WhatsApp.'
            }
          </p>
          <div className="bg-[rgba(0,166,81,0.06)] p-4 rounded-lg">
            <p className="text-sm text-[#00A651]">
              <strong>Dica:</strong> Comece enviando informações sobre sua fazenda, 
              lançamentos financeiros ou atividades agrícolas no WhatsApp do ZÉ.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}