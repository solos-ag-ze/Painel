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
import { supabase } from '../../lib/supabase';
import IncompleteFinancialBanner from './IncompleteFinancialBanner';
import IncompleteFinancialReviewModal from './IncompleteFinancialReviewModal';
import IncompleteActivitiesBanner from './IncompleteActivitiesBanner';
import IncompleteActivitiesReviewModal from './IncompleteActivitiesReviewModal';
import { ActivityService } from '../../services/activityService';
import { CotacaoService } from '../../services/cotacaoService';
import { formatSmartCurrency } from '../../lib/currencyFormatter';
import { TalhaoService } from '../../services/talhaoService';
import { Usuario, TransacaoFinanceira, Talhao } from '../../lib/supabase';
import type { ActivityPayload } from '../../types/activity';
import IncompleteTalhoesBanner from './IncompleteTalhoesBanner';
import IncompleteTalhoesReviewModal from './IncompleteTalhoesReviewModal';
import IncompleteMaquinasBanner from './IncompleteMaquinasBanner';
import IncompleteMaquinasReviewModal from './IncompleteMaquinasReviewModal';

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
  const [incompleteTransactions, setIncompleteTransactions] = useState<TransacaoFinanceira[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [incompleteTalhoes, setIncompleteTalhoes] = useState<Talhao[]>([]);
  const [isTalhoesReviewOpen, setIsTalhoesReviewOpen] = useState(false);
  const [incompleteActivities, setIncompleteActivities] = useState<ActivityPayload[]>([]);
  const [isActivitiesReviewOpen, setIsActivitiesReviewOpen] = useState(false);
  const [incompleteMaquinas, setIncompleteMaquinas] = useState<any[]>([]);
  const [isMaquinasReviewOpen, setIsMaquinasReviewOpen] = useState(false);
  const [allMaquinas, setAllMaquinas] = useState<any[]>([]);
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

  // Normaliza lançamentos retornados pelo ActivityService para o formato esperado pelos modais/cards
  // Resolve o nome da máquina: prioriza maquinas_equipamentos (via maquina_id), fallback para nome_maquina
  const resolveMaquinaNome = (m: any, maqList: any[]) => {
    if (m.maquina_id && maqList.length > 0) {
      const found = maqList.find((eq: any) => eq.id_maquina === m.maquina_id);
      if (found) return found.nome;
    }
    return m.nome_maquina || m.nome || '';
  };

  const normalizeActivities = (list: any[] = [], talhoesList?: any[], maqList?: any[]) => {
    const talhoesRef = talhoesList || talhoesCafe || [];
    const maqRef = maqList || allMaquinas || [];
    return (list || []).map((l: any) => {
      const talhoesLanc = l.lancamento_talhoes || l.talhoes || [];
      const nomes = talhoesLanc
        .map((t: any) => {
          const match = talhoesRef.find((th: any) => th.id_talhao === t.talhao_id || th.id_talhao === t.talho_id || th.id === t.talhao_id || th.id === t.talho_id);
          return match ? match.nome : null;
        })
        .filter(Boolean as any);

      const talhaoLabel = nomes.length > 0 ? nomes.join(', ') : (l.area_atividade || l.area || null);

      return {
        id: l.atividade_id || l.id,
        descricao: l.nome_atividade || l.descricao || '',
        data_atividade: l.data_atividade || l.created_at || null,
        created_at: l.created_at || null,
        updated_at: l.updated_at || null,
        nome_talhao: talhaoLabel || 'Área não informada',
        produtos: l.lancamento_produtos || l.produtos || [],
        maquinas: (l.lancamento_maquinas || l.maquinas || []).map((m: any) => ({ id: m.id || m.maquina_id, nome: resolveMaquinaNome(m, maqRef), horas: m.horas_maquina ?? m.horas ?? '', maquina_id: m.maquina_id })),
        responsaveis: (l.lancamento_responsaveis || l.responsaveis || []).map((r: any) => ({ id: r.id, nome: r.nome })),
        observacoes: l.observacoes || l.observacao || ''
      };
    });
  };

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
  ActivityService.getLancamentos(currentUser.user_id, 5, true),
  ActivityService.getLancamentos(currentUser.user_id, 100),
        CotacaoService.getCotacaoCompleta(),
        TalhaoService.getAreaCultivadaCafe(currentUser.user_id),
        TalhaoService.getTalhoesByUserId(currentUser.user_id),
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
      // carregar transações incompletas (Supabase)
      try {
        const incompletas = await FinanceService.getIncompleteTransactionsWithTalhao(currentUser.user_id);
        setIncompleteTransactions(incompletas || []);
      } catch (e) {
        console.warn('Erro ao carregar transações incompletas:', e);
        setIncompleteTransactions([]);
      }
      // Carregar máquinas do usuário para resolver nomes via maquina_id
      let userMaquinas: any[] = [];
      try {
        const { data: maqData } = await supabase
          .from('maquinas_equipamentos')
          .select('id_maquina, nome')
          .eq('user_id', currentUser.user_id);
        userMaquinas = maqData || [];
        setAllMaquinas(userMaquinas);
      } catch (e) {
        console.warn('Erro ao carregar máquinas do usuário:', e);
      }

      // carregar atividades incompletas (Supabase) e normalizar para ActivityPayload
      try {
        const allActs = await ActivityService.getLancamentos(currentUser.user_id, 100);
        console.log('📋 Total de atividades carregadas:', allActs?.length || 0);
        // Filtrar apenas atividades incompletas (is_completed = false ou null)
        const incActs = (allActs || []).filter((l: any) => !l.is_completed);
        console.log('⏳ Atividades incompletas encontradas:', incActs.length);
        const mappedIncActs = (incActs || []).map((l: any) => {
          const talhoesLanc = l.lancamento_talhoes || l.talhoes || [];
          const nomes = talhoesLanc
            .map((t: any) => {
              // Agora o JOIN traz t.talhoes com { id_talhao, nome }
              if (t.talhoes && t.talhoes.nome) {
                return t.talhoes.nome;
              }
              // Fallback: tentar procurar nos talhões carregados
              const match = (talhoes || []).find((th: any) => th.id_talhao === t.talhao_id);
              return match ? match.nome : null;
            })
            .filter(Boolean as any);

          const talhaoLabel = nomes.length > 0 ? nomes.join(', ') : (l.area_atividade || l.area || null);

          // O service já mapeia lancamento_responsaveis → responsaveis (idem produtos/maquinas)
          const rawResp = l.lancamento_responsaveis || l.responsaveis || [];
          const rawProd = l.lancamento_produtos || l.produtos || [];
          const rawMaq  = l.lancamento_maquinas || l.maquinas || [];

          return {
            id: l.atividade_id || l.id,
            descricao: l.nome_atividade || l.descricao || '',
            data_atividade: l.data_atividade || l.created_at || null,
            created_at: l.created_at || null,
            updated_at: l.updated_at || null,
            nome_talhao: talhaoLabel || 'Área não informada',
            produtos: rawProd,
            maquinas: rawMaq.map((m: any) => ({ id: m.id || m.maquina_id, nome: resolveMaquinaNome(m, userMaquinas), horas: m.horas_maquina ?? m.horas ?? '', maquina_id: m.maquina_id })),
            responsaveis: rawResp.map((r: any) => ({ id: r.id, nome: r.nome })),
            observacoes: l.observacoes || l.observacao || ''
          };
        });

        setIncompleteActivities(mappedIncActs || []);
      } catch (e) {
        console.warn('Erro ao carregar atividades:', e);
        setIncompleteActivities([]);
      }

      // carregar talhões incompletos (talhoes.is_completed = false)
      try {
        const { data: talhoesInc, error: tError } = await supabase
          .from('talhoes')
          .select('*')
          .or(`user_id.eq.${currentUser.user_id},criado_por.eq.${currentUser.user_id}`)
          .eq('is_completed', false);

        if (tError) throw tError;
        setIncompleteTalhoes(talhoesInc || []);
      } catch (e) {
        console.warn('Erro ao carregar talhões incompletos:', e);
        setIncompleteTalhoes([]);
      }

      // carregar máquinas incompletas (maquinas_equipamentos.is_completed = false)
      try {
        const { data: maqInc, error: maqError } = await supabase
          .from('maquinas_equipamentos')
          .select('*')
          .eq('user_id', currentUser.user_id)
          .eq('is_completed', false);

        if (maqError) throw maqError;
        setIncompleteMaquinas(maqInc || []);
      } catch (e) {
        console.warn('Erro ao carregar máquinas incompletas:', e);
        setIncompleteMaquinas([]);
      }
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
        return match ? match.nome : null;
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
      <span className="text-sm text-[#004417]/70">Saldo projetado:</span>
      <span className="text-sm text-[#004417]/70">{FinanceService.formatCurrency(periodBalanceDashboard.saldoProjetado ?? 0)}</span>
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

      {/* Incomplete talhões banner (mostrar apenas se houver 1+ talhão incompleto) */}
      {incompleteTalhoes.length > 0 && (
        <div className="mb-6">
          <IncompleteTalhoesBanner count={incompleteTalhoes.length} onReview={() => setIsTalhoesReviewOpen(true)} />
        </div>
      )}

      {/* Incomplete machines banner (mostrar apenas se houver 1+ máquina incompleta) */}
      {incompleteMaquinas.length > 0 && (
        <div className="mb-6">
          <IncompleteMaquinasBanner count={incompleteMaquinas.length} onReview={() => setIsMaquinasReviewOpen(true)} />
        </div>
      )}

      {/* Incomplete transactions (mostrar apenas se existir 1+ transação incompleta) */}
      {incompleteTransactions.length > 0 && (
        <div className="mb-6">
          <IncompleteFinancialBanner count={incompleteTransactions.length} onReview={() => setIsReviewOpen(true)} />
        </div>
      )}

      {/* Incomplete activities banner (mostrar apenas se houver 1+ atividade incompleta) */}
      {incompleteActivities.length > 0 && (
        <div className="mb-6">
          <IncompleteActivitiesBanner count={incompleteActivities.length} onReview={() => setIsActivitiesReviewOpen(true)} />
        </div>
      )}

      <IncompleteTalhoesReviewModal
        isOpen={isTalhoesReviewOpen}
        talhoes={incompleteTalhoes}
        onClose={() => setIsTalhoesReviewOpen(false)}
        onEdit={async (id, payload) => {
          try {
            setIncompleteTalhoes((prev) => (prev || []).map(t => (t.id_talhao === id ? { ...t, ...payload } as any : t)));
            await supabase.from('talhoes').update(payload).eq('id_talhao', id);
          } catch (err) {
            console.error('Erro ao atualizar talhão:', err);
          }

          // reload incompletos
          const currentUser = AuthService.getInstance().getCurrentUser();
          if (currentUser) {
            try {
              const { data: talhoesInc } = await supabase
                .from('talhoes')
                .select('*')
                .or(`user_id.eq.${currentUser.user_id},criado_por.eq.${currentUser.user_id}`)
                .eq('is_completed', false);
              setIncompleteTalhoes(talhoesInc || []);
            } catch (e) {
              console.warn('Erro ao recarregar talhões incompletos:', e);
            }
          }
        }}
        onDelete={async (id) => {
          try {
            await supabase.from('talhoes').delete().eq('id_talhao', id);
          } catch (err) {
            console.error('Erro ao deletar talhão:', err);
          }
          const currentUser = AuthService.getInstance().getCurrentUser();
          if (currentUser) {
            try {
              const { data: talhoesInc } = await supabase
                .from('talhoes')
                .select('*')
                .or(`user_id.eq.${currentUser.user_id},criado_por.eq.${currentUser.user_id}`)
                .eq('is_completed', false);
              setIncompleteTalhoes(talhoesInc || []);
            } catch (e) {
              console.warn('Erro ao recarregar talhões incompletos:', e);
            }
          }
        }}
        onConfirmItem={async (id) => {
          try {
            const currentUser = AuthService.getInstance().getCurrentUser();
            if (currentUser) await supabase.from('talhoes').update({ is_completed: true }).eq('id_talhao', id).or(`user_id.eq.${currentUser.user_id},criado_por.eq.${currentUser.user_id}`);
          } catch (err) {
            console.error('Erro ao confirmar talhão:', err);
          }
          // reload
          const currentUser2 = AuthService.getInstance().getCurrentUser();
          if (currentUser2) {
            const { data: talhoesInc } = await supabase
              .from('talhoes')
              .select('*')
              .or(`user_id.eq.${currentUser2.user_id},criado_por.eq.${currentUser2.user_id}`)
              .eq('is_completed', false);
            setIncompleteTalhoes(talhoesInc || []);
          }
        }}
        onConfirmAll={async () => {
          try {
            const currentUser = AuthService.getInstance().getCurrentUser();
            if (currentUser) await supabase.from('talhoes').update({ is_completed: true }).or(`user_id.eq.${currentUser.user_id},criado_por.eq.${currentUser.user_id}`).eq('is_completed', false);
          } catch (err) {
            console.error('Erro ao confirmar todos talhões:', err);
          }
          // reload
          const currentUser2 = AuthService.getInstance().getCurrentUser();
          if (currentUser2) {
            const { data: talhoesInc } = await supabase
              .from('talhoes')
              .select('*')
              .or(`user_id.eq.${currentUser2.user_id},criado_por.eq.${currentUser2.user_id}`)
              .eq('is_completed', false);
            setIncompleteTalhoes(talhoesInc || []);
          }
          setIsTalhoesReviewOpen(false);
        }}
      />

      <IncompleteMaquinasReviewModal
        isOpen={isMaquinasReviewOpen}
        maquinas={incompleteMaquinas}
        onClose={() => setIsMaquinasReviewOpen(false)}
        onEdit={async (id, payload) => {
          try {
            setIncompleteMaquinas((prev) => (prev || []).map(m => (m.id_maquina === id ? { ...m, ...payload } : m)));
            await supabase.from('maquinas_equipamentos').update(payload).eq('id_maquina', id);
          } catch (err) {
            console.error('Erro ao atualizar máquina:', err);
          }
          // reload incompletas
          const currentUser = AuthService.getInstance().getCurrentUser();
          if (currentUser) {
            try {
              const { data: maqInc } = await supabase
                .from('maquinas_equipamentos')
                .select('*')
                .eq('user_id', currentUser.user_id)
                .eq('is_completed', false);
              setIncompleteMaquinas(maqInc || []);
            } catch (e) {
              console.warn('Erro ao recarregar máquinas incompletas:', e);
            }
          }
        }}
        onDelete={async (id) => {
          try {
            await supabase.from('maquinas_equipamentos').delete().eq('id_maquina', id);
          } catch (err) {
            console.error('Erro ao deletar máquina:', err);
          }
          const currentUser = AuthService.getInstance().getCurrentUser();
          if (currentUser) {
            try {
              const { data: maqInc } = await supabase
                .from('maquinas_equipamentos')
                .select('*')
                .eq('user_id', currentUser.user_id)
                .eq('is_completed', false);
              setIncompleteMaquinas(maqInc || []);
            } catch (e) {
              console.warn('Erro ao recarregar máquinas incompletas:', e);
            }
          }
        }}
        onConfirmItem={async (id) => {
          try {
            await supabase.from('maquinas_equipamentos').update({ is_completed: true }).eq('id_maquina', id);
          } catch (err) {
            console.error('Erro ao confirmar máquina:', err);
          }
          const currentUser = AuthService.getInstance().getCurrentUser();
          if (currentUser) {
            const { data: maqInc } = await supabase
              .from('maquinas_equipamentos')
              .select('*')
              .eq('user_id', currentUser.user_id)
              .eq('is_completed', false);
            setIncompleteMaquinas(maqInc || []);
          }
        }}
        onConfirmAll={async () => {
          try {
            const currentUser = AuthService.getInstance().getCurrentUser();
            if (currentUser) await supabase.from('maquinas_equipamentos').update({ is_completed: true }).eq('user_id', currentUser.user_id).eq('is_completed', false);
          } catch (err) {
            console.error('Erro ao confirmar todas máquinas:', err);
          }
          const currentUser2 = AuthService.getInstance().getCurrentUser();
          if (currentUser2) {
            const { data: maqInc } = await supabase
              .from('maquinas_equipamentos')
              .select('*')
              .eq('user_id', currentUser2.user_id)
              .eq('is_completed', false);
            setIncompleteMaquinas(maqInc || []);
          }
          setIsMaquinasReviewOpen(false);
        }}
      />

      <IncompleteFinancialReviewModal
        isOpen={isReviewOpen}
        transactions={incompleteTransactions}
        onClose={() => setIsReviewOpen(false)}
        onEdit={async (id, payload) => {
          // Atualização otimista: atualiza o item localmente antes da chamada ao backend
          try {
            setIncompleteTransactions((prev) => (
              (prev || []).map((t) => {
                if (t.id_transacao !== id) return t;
                // mesclar valores do payload (podem incluir nome_talhao)
                return { ...t, ...payload } as any;
              })
            ));

            const talhaoId = (payload as any).talhao_id || undefined;
            const ok = await FinanceService.updateTransaction(id, payload as any, talhaoId);
            if (!ok) console.warn('Atualização retornou false para id', id);
          } catch (err) {
            console.error('Erro ao atualizar transação:', err);
          }

          // Recarrega a lista definitiva do servidor para garantir consistência
          const userId = AuthService.getInstance().getCurrentUser()?.user_id || '';
          const updated = await FinanceService.getIncompleteTransactionsWithTalhao(userId);
          setIncompleteTransactions(updated || []);
        }}
        onDelete={async (id) => {
          try {
            await supabase.from('transacoes_financeiras').delete().eq('id_transacao', id);
          } catch (err) {
            console.error('Erro ao deletar transação:', err);
          }
          const userId = AuthService.getInstance().getCurrentUser()?.user_id || '';
          const updated = await FinanceService.getIncompleteTransactionsWithTalhao(userId);
          setIncompleteTransactions(updated || []);
        }}
        onConfirmItem={async (id) => {
          try {
            // localizar transação no cache local para decidir comportamento
            const tx = (incompleteTransactions || []).find(t => t.id_transacao === id);
            const shouldCreateParcels = Boolean(tx && ((tx as any).numero_parcelas && Number((tx as any).numero_parcelas) > 1) || String(((tx as any).condicao_pagamento) || '').toLowerCase() === 'parcelado');

            if (shouldCreateParcels) {
              // chama a RPC que cria as parcelas filhas atomically
              const res = await FinanceService.createParcelasFromParent(id);
              if (!res) {
                console.error('Falha ao criar parcelas para transação pai', id);
              }
            } else {
              await supabase.from('transacoes_financeiras').update({ is_completed: true }).eq('id_transacao', id);
            }
          } catch (err) {
            console.error('Erro ao processar confirmação da transação:', err);
          }

          // Recarregar lista para refletir mudanças
          const userId = AuthService.getInstance().getCurrentUser()?.user_id || '';
          const updated = await FinanceService.getIncompleteTransactionsWithTalhao(userId);
          setIncompleteTransactions(updated || []);
        }}
        onConfirmAll={async () => {
          const userId = AuthService.getInstance().getCurrentUser()?.user_id || '';
          const current = await FinanceService.getIncompleteTransactionsWithTalhao(userId);
          for (const t of current) {
            try {
              await supabase.from('transacoes_financeiras').update({ is_completed: true }).eq('id_transacao', t.id_transacao);
            } catch (err) {
              console.error('Erro ao marcar transação como completa:', err, t.id_transacao);
            }
          }
          const updated = await FinanceService.getIncompleteTransactionsWithTalhao(userId);
          setIncompleteTransactions(updated || []);
          setIsReviewOpen(false);
        }}
      />

      <IncompleteActivitiesReviewModal
        isOpen={isActivitiesReviewOpen}
        activities={incompleteActivities}
        onClose={() => setIsActivitiesReviewOpen(false)}
        onEdit={async (id, payload) => {
          try {
            console.log('📝 DashboardOverview - onEdit chamado');
            console.log('Activity ID:', id);
            console.log('Payload recebido:', payload);
            
            await ActivityService.updateLancamento(id, payload as any);
            
            console.log('✅ ActivityService.updateLancamento concluído');
          } catch (err) {
            console.error('❌ Erro ao atualizar atividade no onEdit:', err);
          }
          const userId = AuthService.getInstance().getCurrentUser()?.user_id || '';
          const [updated, freshTalhoes] = await Promise.all([
            ActivityService.getLancamentos(userId, 100),
            TalhaoService.getTalhoesCafe(userId)
          ]);
          setTalhoesCafe(freshTalhoes);
          setIncompleteActivities(normalizeActivities((updated || []).filter((l: any) => !l.is_completed), freshTalhoes, allMaquinas));
        }}
        onDelete={async (id) => {
          try {
            await ActivityService.deleteLancamento(id);
          } catch (err) {
            console.error('Erro ao deletar atividade:', err);
          }
          const userId = AuthService.getInstance().getCurrentUser()?.user_id || '';
          const [updated, freshTalhoes] = await Promise.all([
            ActivityService.getLancamentos(userId, 100),
            TalhaoService.getTalhoesCafe(userId)
          ]);
          setTalhoesCafe(freshTalhoes);
          setIncompleteActivities(normalizeActivities((updated || []).filter((l: any) => !l.is_completed), freshTalhoes, allMaquinas));
        }}
        onConfirmItem={async (id) => {
          try {
            // 1) Marcar como completa
            const { error: updateErr } = await supabase.from('lancamentos_agricolas').update({ is_completed: true }).eq('atividade_id', id);
            if (updateErr) throw updateErr;

            // 2) Registrar aplicação no novo estoque via RPC
            // Aqui você deve montar os dados do produto/atividade conforme necessário
            // Exemplo genérico:
            const atividade = incompleteActivities.find(a => a.id === id);
            if (!atividade || !atividade.produtos || !atividade.produtos.length) {
              return 'Atividade ou produtos não encontrados.';
            }
            for (const produto of atividade.produtos) {
              const payload = {
                p_nome: produto.nome_produto || produto.nome,
                p_marca: produto.marca || null,
                p_categoria: produto.categoria || null,
                p_unidade_base: produto.unidade || produto.quantidade_un || null,
                p_registro_mapa: produto.registro_mapa || null,
                p_fornecedor: produto.fornecedor || null,
                p_quantidade: produto.quantidade_val || produto.quantidade || null,
                p_valor_total: produto.valor_total || null,
                p_lote: produto.lote || null,
                p_validade: produto.validade || null,
                p_user_id: AuthService.getInstance().getCurrentUser()?.user_id
              };
              console.log('[APLICACAO] Iniciando registro de aplicação no estoque:', payload);
              const { data, error: aplicacaoErr } = await supabase.rpc('registrar_produto_e_aplicacao', payload);
              if (aplicacaoErr) {
                console.error('[APLICACAO] Erro ao registrar aplicação:', aplicacaoErr);
                await supabase.from('lancamentos_agricolas').update({ is_completed: false }).eq('atividade_id', id);
                return aplicacaoErr.message || 'Erro ao registrar aplicação no estoque';
              }
              console.log('[APLICACAO] Aplicação registrada com sucesso. Documento ID:', data);
            }
          } catch (err: any) {
            console.error('Erro ao confirmar atividade:', err);
            return err?.message || 'Erro ao confirmar atividade';
          }
          const userId = AuthService.getInstance().getCurrentUser()?.user_id || '';
          const [updated, freshTalhoes] = await Promise.all([
            ActivityService.getLancamentos(userId, 100),
            TalhaoService.getTalhoesCafe(userId)
          ]);
          setTalhoesCafe(freshTalhoes);
          setIncompleteActivities(normalizeActivities((updated || []).filter((l: any) => !l.is_completed), freshTalhoes, allMaquinas));
          return null;
        }}
        onConfirmAll={async () => {
          const userId = AuthService.getInstance().getCurrentUser()?.user_id || '';
          const erros: string[] = [];
          // Processar uma por uma para que falhas individuais não bloqueiem as demais
          for (const act of incompleteActivities) {
            const actId = act.id;
            if (!actId) continue;
            try {
              const { error: updateErr } = await supabase.from('lancamentos_agricolas').update({ is_completed: true }).eq('atividade_id', actId);
              if (updateErr) { erros.push(`${act.descricao || actId}: ${updateErr.message}`); continue; }

              const { error: fifoErr } = await supabase.rpc('fn_baixar_estoque_fifo_lancamento', { p_atividade_id: actId });
              if (fifoErr) {
                // Reverter
                await supabase.from('lancamentos_agricolas').update({ is_completed: false }).eq('atividade_id', actId);
                erros.push(`${act.descricao || actId}: ${fifoErr.message}`);
              }
            } catch (err: any) {
              erros.push(`${act.descricao || actId}: ${err?.message || 'Erro desconhecido'}`);
            }
          }
          if (erros.length > 0) {
            alert('Algumas atividades não puderam ser confirmadas (estoque insuficiente ou erro):\n\n' + erros.join('\n'));
          }
          const [updated, freshTalhoes] = await Promise.all([
            ActivityService.getLancamentos(userId, 100),
            TalhaoService.getTalhoesCafe(userId)
          ]);
          setTalhoesCafe(freshTalhoes);
          const remaining = normalizeActivities((updated || []).filter((l: any) => !l.is_completed), freshTalhoes, allMaquinas);
          setIncompleteActivities(remaining);
          if (remaining.length === 0) setIsActivitiesReviewOpen(false);
        }}
      />

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <RecentTransactions transactions={transacoes} ultimas5={ultimas5Transacoes} />
        <PlannedTransactions transactions={transacoes} proximas5={proximas5Transacoes} />
      </div>

      

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