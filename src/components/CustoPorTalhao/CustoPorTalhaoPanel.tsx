import { useState, useEffect, useCallback } from 'react';
import { BarChart3, X, Info, RefreshCw, ChevronDown } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { CustoPorTalhaoService, CustoTalhao, FiltrosCustoPorTalhao } from '../../services/custoPorTalhaoService';

// Interfaces
interface Filtros {
  safra: string;
  fazenda: string;
  talhoes: string[];
  macrogrupo: string;
  mesAno: string;
}

interface DetalheCusto {
  data: string;
  categoria: string;
  descricao: string;
  origem: 'Financeiro' | 'Atividade Agrícola' | 'Estoque';
  valor: number;
  macrogrupo?: string;
}

// Calcula a safra atual baseado no mês (Maio a Abril)
const calcularSafraAtual = (): string => {
  const hoje = new Date();
  const anoAtual = hoje.getMonth() >= 4 ? hoje.getFullYear() : hoje.getFullYear() - 1;
  return `${anoAtual}/${anoAtual + 1}`;
};

export default function CustoPorTalhaoPanel() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    safra: calcularSafraAtual(),
    fazenda: '',
    talhoes: [],
    macrogrupo: 'Todos',
    mesAno: ''
  });
  const [filtroTalhao, setFiltroTalhao] = useState('todos');

  const [custosTalhoes, setCustosTalhoes] = useState<CustoTalhao[]>([]);
  const [talhaoSelecionado, setTalhaoSelecionado] = useState<CustoTalhao | null>(null);
  const [detalhesCusto, setDetalhesCusto] = useState<DetalheCusto[]>([]);
  const [painelLateralAberto, setPainelLateralAberto] = useState(false);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [modalPendenciasAberto, setModalPendenciasAberto] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [talhaoExpandido, setTalhaoExpandido] = useState<string | null>(null);
  const [filtroDetalheMacrogrupo, setFiltroDetalheMacrogrupo] = useState<'Todos' | 'insumos' | 'operacional' | 'servicosLogistica' | 'administrativos' | 'outros'>('Todos');
  const [tooltipAberto, setTooltipAberto] = useState<string | null>(null);


  // Dados iniciais simples — removidos os mocks complexos
  const totalPendencias = 0;

  const macrogrupos = [
    { key: 'insumos', label: 'Insumos', tooltip: 'Fertilizantes, Defensivos Agrícolas, Sementes e mudas' },
    { key: 'operacional', label: 'Operacional', tooltip: 'Máquinas e Equipamentos, Irrigação, Aluguel de Máquinas, Mão de obra, Manutenção e Instalações' },
    { key: 'servicosLogistica', label: 'Serviços/Logística', tooltip: 'Transporte, Beneficiamento, Despesas de armazenagem, Classificação, Assistência Técnica, Serviços Diversos, Análise de Solo, Embalagens' },
    { key: 'administrativos', label: 'Administrativos', tooltip: 'Despesas Administrativas, Despesas Gerais, Encargos Sociais, Arrendamento, Seguro, Gestão/Administração' },
    { key: 'outros', label: 'Outros', tooltip: 'Outros' }
  ];

  // Função para carregar custos por talhão
  const carregarCustos = useCallback(async (currentUserId: string, filtrosAtuais: Filtros) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Converter filtros do componente para o formato do service
      const filtrosService: FiltrosCustoPorTalhao = {
        safra: filtrosAtuais.safra || undefined,
        fazenda: filtrosAtuais.fazenda || undefined,
        talhoes: filtrosAtuais.talhoes.length > 0 ? filtrosAtuais.talhoes : undefined,
        macrogrupo: filtrosAtuais.macrogrupo !== 'Todos' ? filtrosAtuais.macrogrupo : undefined,
        mesAno: filtrosAtuais.mesAno || undefined
      };

      // Timeout de segurança para evitar loading infinito em produção
      const timeoutMs = 15000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error('Tempo excedido ao carregar custos (timeout).'));
        }, timeoutMs);
      });

      const custos = await Promise.race([
        CustoPorTalhaoService.getCustosPorTalhao(currentUserId, filtrosService),
        timeoutPromise
      ]);
      setCustosTalhoes(custos || []);
    } catch (err) {
      // Exibir fallback informativo e evitar loading infinito
      setErrorMessage('Não foi possível carregar os custos em produção. Verifique a conexão e credenciais do Supabase.');
      setCustosTalhoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega dados iniciais ao montar
  useEffect(() => {
    let mounted = true;
    const initPanel = async () => {
      try {
        const auth = AuthService.getInstance();
        let currentUser = auth.getCurrentUser();
        if (!currentUser) {
          currentUser = await auth.init();
        }

        if (!currentUser) {
          return;
        }

        if (!mounted) return;
        setUserId(currentUser.user_id);

        // Carregar custos com filtros iniciais
        await carregarCustos(currentUser.user_id, filtros);
      } catch {
        // Erro ao inicializar painel
      }
    };

    initPanel();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recarregar quando filtros mudarem
  useEffect(() => {
    if (userId) {
      carregarCustos(userId, filtros);
    }
  }, [userId, filtros, carregarCustos]);

  useEffect(() => {
    setTalhaoExpandido(null);
  }, [custosTalhoes]);

  const toggleTalhaoFiltroSelecao = (talhaoNome: string) => {
    setFiltros(prev => {
      const jaSelecionado = prev.talhoes.includes(talhaoNome);
      return {
        ...prev,
        talhoes: jaSelecionado
          ? prev.talhoes.filter(nome => nome !== talhaoNome)
          : [...prev.talhoes, talhaoNome]
      };
    });
  };

  const handleVerAnexos = () => {
    // TODO: Implementar modal de anexos do talhão selecionado
  };

  // Filtra talhões exibidos baseado no filtro local
  const talhoesFiltrados = filtroTalhao === 'todos'
    ? custosTalhoes
    : custosTalhoes.filter(t => t.talhao === filtroTalhao);

  const handleTalhaoSelect = async (talhao: CustoTalhao) => {
    setTalhaoSelecionado(talhao);
    setPainelLateralAberto(true);
    setLoadingDetalhes(true);
    setDetalhesCusto([]);

    try {
      if (!userId) return;

      const detalhes = await CustoPorTalhaoService.getDetalhesCustoTalhao(
        userId,
        talhao.id,
        {
          safra: filtros.safra,
          mesAno: filtros.mesAno
        }
      );

      setDetalhesCusto(detalhes);
      setFiltroDetalheMacrogrupo('Todos');
    } catch {
      // Erro ao carregar detalhes
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const toggleTalhaoExpandido = (talhaoId: string) => {
    setTalhaoExpandido(prev => (prev === talhaoId ? null : talhaoId));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Calcula totais gerais
  const totaisGerais = talhoesFiltrados.reduce((acc, t) => ({
    insumos: acc.insumos + t.insumos,
    operacional: acc.operacional + t.operacional,
    servicosLogistica: acc.servicosLogistica + t.servicosLogistica,
    administrativos: acc.administrativos + t.administrativos,
    outros: acc.outros + t.outros,
    total: acc.total + t.total,
    area: acc.area + t.area
  }), { insumos: 0, operacional: 0, servicosLogistica: 0, administrativos: 0, outros: 0, total: 0, area: 0 });

  const macroTotais = macrogrupos.reduce((acc, grupo) => {
    acc[grupo.key] = custosTalhoes.reduce((sum, talhao) => sum + ((talhao as any)[grupo.key] || 0), 0);
    return acc;
  }, {} as Record<string, number>);
  const totalMacro = Object.values(macroTotais).reduce((acc, valor) => acc + valor, 0);
  const talhoesDisponiveis = Array.from(new Set(custosTalhoes.map(t => t.talhao))).filter(Boolean);

  return (
    <div className="space-y-6">
      {errorMessage && !loading && (
        <div className="bg-[#fff7f7] border border-[#f3b7b7] text-[#7a1d1d] rounded-xl p-4">
          <div className="text-sm font-semibold">Problema ao carregar dados</div>
          <div className="text-sm mt-1">{errorMessage}</div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (userId) carregarCustos(userId, filtros);
              }}
              className="px-3 py-2 rounded-lg text-sm font-semibold border border-[rgba(0,68,23,0.15)] text-[#004417] bg-white hover:bg-[rgba(0,68,23,0.05)]"
            >
              Tentar novamente
            </button>
            <span className="text-xs text-[rgba(0,68,23,0.65)] self-center">Usuário: {userId || '—'} • Talhões retornados: {custosTalhoes.length}</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#004417] flex items-center gap-2">
            Custo por Talhão
          </h1>
          <p className="text-[#1d3a2d] mt-1">Custos agrícolas divididos por área</p>
        </div>
      </div>

      {/* Mobile Experience: filtros + indicadores */}
      <div className="lg:hidden space-y-6">
        {/* Filtros superiores */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,68,23,0.08)] border border-[rgba(0,68,23,0.08)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#004417]">Filtrar por Talhão</h3>
            </div>
            <span className="text-xs text-[rgba(0,68,23,0.65)] font-semibold">{custosTalhoes.length} {custosTalhoes.length === 1 ? 'talhão' : 'talhões'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {talhoesDisponiveis.length === 0 && (
                <span className="text-xs text-[rgba(0,68,23,0.65)]">Nenhum talhão disponível</span>
              )}
              {talhoesDisponiveis.map((talhaoNome) => {
                const selecionado = filtros.talhoes.includes(talhaoNome);
                return (
                  <button
                    key={talhaoNome}
                    type="button"
                    onClick={() => toggleTalhaoFiltroSelecao(talhaoNome)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${selecionado
                        ? 'bg-[rgba(0,166,81,0.15)] border-[#00A651] text-[#004417]'
                        : 'bg-white border-[rgba(0,68,23,0.15)] text-[#004417]'
                      }`}
                  >
                    {talhaoNome}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Indicadores */}
        {!loading && (
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,68,23,0.08)] border border-[rgba(0,68,23,0.08)] p-5 flex flex-col gap-3 transform transition-transform duration-200 hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#004417]">% por Macrogrupo</h3>
                </div>

              </div>
              <div className="space-y-2">
                {macrogrupos.map((grupo) => {
                  const valor = macroTotais[grupo.key] || 0;
                  const percentual = totalMacro > 0 ? (valor / totalMacro) * 100 : 0;
                  return (
                    <div key={grupo.key} className="relative">
                      <div className="flex items-center justify-between text-xs font-semibold text-[#004417]">
                        <span className="flex items-center gap-1">
                          {grupo.label}
                          <button
                            type="button"
                            onClick={() => setTooltipAberto(tooltipAberto === grupo.key ? null : grupo.key)}
                            className="p-0.5"
                          >
                            <Info className="w-3 h-3 text-[#004417]" />
                          </button>
                        </span>
                        <span>{percentual.toFixed(1)}%</span>
                      </div>
                      {tooltipAberto === grupo.key && (
                        <div className="absolute left-0 top-full mt-1 bg-[#004417] text-white text-xs rounded px-3 py-2 z-20 max-w-[280px] shadow-lg">
                          {grupo.tooltip}
                        </div>
                      )}
                      <div className="h-2 w-full bg-[rgba(0,68,23,0.08)] rounded-full">
                        <div
                          className="h-full bg-[#00A651] rounded-full"
                          style={{ width: `${percentual}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtro por Talhões - Desktop */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5 hidden lg:block">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#004417]">Filtrar por Talhão</h3>
          <div className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium">
            {custosTalhoes.length} {custosTalhoes.length === 1 ? 'talhão encontrado' : 'talhões encontrados'}
          </div>
        </div>

        <div className="flex items-center flex-row flex-nowrap gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
          {['todos', ...custosTalhoes.map(t => t.talhao)].map((opcao) => (
            <button
              key={opcao}
              onClick={() => setFiltroTalhao(opcao)}
              className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all duration-200 whitespace-nowrap snap-start flex-shrink-0 ${filtroTalhao === opcao
                  ? 'bg-[rgba(0,166,81,0.10)] border border-[#00A651] text-[#004417] font-semibold'
                  : 'bg-white border border-[rgba(0,68,23,0.10)] text-[#004417] hover:bg-[rgba(0,68,23,0.03)] hover:border-[rgba(0,68,23,0.12)]'
                }`}
            >
              {opcao === 'todos' ? 'Todos os Talhões' : opcao}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-[#00A651] animate-spin" />
          <span className="ml-3 text-[#1d3a2d]">Carregando custos...</span>
        </div>
      )}

      {/* Tabela Principal - Desktop (≥1024px) */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 hidden lg:block">
          <h3 className="text-lg font-bold text-[#004417] mb-4">Custo por Talhão</h3>

          <div className="overflow-x-auto bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[rgba(0,166,81,0.06)] rounded-t-2xl">
                  <th className="px-6 py-4 text-left text-[14px] font-bold text-[#004417]">Talhão</th>
                  <th className="px-6 py-4 text-center text-[14px] font-bold text-[#004417]">Área (ha)</th>
                  {macrogrupos.map(grupo => (
                    <th key={grupo.key} className="px-6 py-4 text-center text-[14px] font-bold text-[#004417] relative group">
                      <span className="flex items-center justify-center gap-1">
                        <span className="whitespace-nowrap">{grupo.label}</span>
                        <Info className="w-3.5 h-3.5 text-[#004417]" />
                      </span>
                      <div className="hidden group-hover:block absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-[#004417] text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        {grupo.tooltip}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-4 text-center text-[14px] font-bold text-[#004417]">Total</th>
                  <th className="px-6 py-4 text-center text-[14px] font-bold text-[#004417]">R$/ha</th>
                </tr>
              </thead>
              <tbody>
                {talhoesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[#1d3a2d]">
                      {custosTalhoes.length === 0
                        ? 'Nenhum custo encontrado para a safra selecionada. Verifique se há lançamentos financeiros com status "Pago" no período.'
                        : 'Nenhum talhão corresponde ao filtro selecionado.'}
                    </td>
                  </tr>
                ) : (
                  <>
                    {talhoesFiltrados.map((t, index) => (
                      <tr
                        key={t.id || index}
                        onClick={() => handleTalhaoSelect(t)}
                        className="bg-white border-b border-[rgba(0,0,0,0.06)] transition-all hover:bg-[rgba(0,166,81,0.08)] cursor-pointer"
                      >
                        <td className="px-6 py-5 text-sm text-left font-bold text-[#00A651] align-top">{t.talhao}</td>
                        <td className="px-6 py-5 text-sm text-center text-[#1d3a2d] align-top">{t.area.toFixed(2)}</td>
                        {macrogrupos.map(gr => (
                          <td key={gr.key} className="px-6 py-5 text-sm text-center text-[#1d3a2d] font-semibold align-top">
                            {formatCurrency((t as any)[gr.key] || 0)}
                          </td>
                        ))}
                        <td className="px-6 py-5 text-sm font-bold text-[#004417] text-center align-top">
                          {formatCurrency(t.total)}
                        </td>
                        <td className="px-6 py-5 text-sm font-semibold text-[#00A651] text-center align-top">
                          {formatCurrency(t.custoHa)}/ha
                        </td>
                      </tr>
                    ))}
                    {/* Linha de Totais */}
                    {talhoesFiltrados.length > 1 && (
                      <tr className="bg-[rgba(0,166,81,0.06)] font-bold">
                        <td className="px-6 py-5 text-sm text-left font-bold text-[#004417]">TOTAL</td>
                        <td className="px-6 py-5 text-sm text-center text-[#004417]">{totaisGerais.area.toFixed(2)}</td>
                        {macrogrupos.map(gr => (
                          <td key={gr.key} className="px-6 py-5 text-sm text-center text-[#004417]">
                            {formatCurrency((totaisGerais as any)[gr.key] || 0)}
                          </td>
                        ))}
                        <td className="px-6 py-5 text-sm text-center text-[#004417]">
                          {formatCurrency(totaisGerais.total)}
                        </td>
                        <td className="px-6 py-5 text-sm text-center text-[#00A651]">
                          {formatCurrency(totaisGerais.area > 0 ? totaisGerais.total / totaisGerais.area : 0)}/ha
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cards Mobile - Accordion */}
      {!loading && (
        <div className="lg:hidden space-y-4">
          {talhoesFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] border border-[rgba(0,68,23,0.08)] p-6 text-center text-[#1d3a2d]">
              {custosTalhoes.length === 0
                ? 'Nenhum custo encontrado para a safra selecionada.'
                : 'Nenhum talhão corresponde ao filtro selecionado.'}
            </div>
          ) : (
            talhoesFiltrados.map((t, index) => {
              const talhaoId = t.id || `${t.talhao}-${index}`;
              const expandido = talhaoExpandido === talhaoId;
              return (
                <div
                  key={talhaoId}
                  className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,68,23,0.08)] border border-[rgba(0,68,23,0.08)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleTalhaoSelect(t)}
                      className="flex-1 text-left"
                    >
                      <h4 className="text-lg font-bold text-[#004417]">{t.talhao}</h4>
                      <span className="text-sm text-[#1d3a2d]">{t.area.toFixed(2)} ha</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTalhaoExpandido(talhaoId)}
                      className="h-10 w-10 flex items-center justify-center rounded-full border border-[rgba(0,68,23,0.12)] bg-[rgba(0,68,23,0.03)]"
                      aria-label="Expandir talhão"
                    >
                      <ChevronDown
                        className={`w-5 h-5 text-[#004417] transition-transform ${expandido ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>
                  <div
                    className={`transition-all duration-300 overflow-hidden ${expandido ? 'max-h-[600px] mt-4' : 'max-h-0'}`}
                  >
                    <div className="space-y-4 text-sm text-[#1d3a2d]">
                      <div className="grid grid-cols-2 gap-3">
                        {macrogrupos.map((gr) => (
                          <div key={gr.key} className="flex flex-col gap-1 relative">
                            <span className="text-[rgba(0,68,23,0.75)] font-semibold flex items-center gap-1">
                              {gr.label}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTooltipAberto(tooltipAberto === `${talhaoId}-${gr.key}` ? null : `${talhaoId}-${gr.key}`);
                                }}
                                className="p-0.5"
                              >
                                <Info className="w-3 h-3 text-[#004417]" />
                              </button>
                            </span>
                            {tooltipAberto === `${talhaoId}-${gr.key}` && (
                              <div className="absolute left-0 top-full mt-1 bg-[#004417] text-white text-xs rounded px-3 py-2 z-20 max-w-[250px] shadow-lg">
                                {gr.tooltip}
                              </div>
                            )}
                            <span className="text-base font-bold text-[#004417]">{formatCurrency((t as any)[gr.key] || 0)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between bg-[rgba(0,68,23,0.03)] rounded-xl px-4 py-3">
                        <div>
                          <p className="text-xs text-[rgba(0,68,23,0.75)]">Total</p>
                          <p className="text-lg font-bold text-[#004417]">{formatCurrency(t.total)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[rgba(0,68,23,0.75)]">Custo / ha</p>
                          <p className="text-lg font-bold text-[#00A651]">{formatCurrency(t.custoHa)}/ha</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTalhaoSelect(t)}
                        className="w-full text-sm font-bold text-[#004417] border border-[#00A651] rounded-xl py-3 flex items-center justify-center gap-2 hover:bg-[rgba(0,166,81,0.08)] transition-colors"
                      >
                        Abrir detalhamento
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Central (Drill-down) */}
      {painelLateralAberto && talhaoSelecionado && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setPainelLateralAberto(false)}
          />

          {/* Conteúdo centralizado */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-5xl max-h-[85vh] shadow-2xl rounded-xl overflow-hidden flex flex-col" role="dialog" aria-modal="true">
              {/* Header do Modal */}
              <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: 'white' }}>
                <div>
                  <h3 className="text-xl font-bold text-[#004417]">{talhaoSelecionado.talhao}</h3>
                  <p className="text-sm text-[#1d3a2d]">Detalhamento de custos</p>
                </div>
                <button
                  onClick={() => setPainelLateralAberto(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: '#004417' }}
                >
                  <X className="w-5 h-5 text-[#004417]" />
                </button>
              </div>

              {/* Conteúdo do Modal */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingDetalhes ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-[#00A651] animate-spin" />
                    <span className="ml-3 text-[#1d3a2d]">Carregando detalhes...</span>
                  </div>
                ) : (
                  <div>
                    {/* Filtro de macrogrupo no modal */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      {[
                        { key: 'Todos', label: 'Todos' },
                        { key: 'insumos', label: 'Insumos' },
                        { key: 'operacional', label: 'Operacional' },
                        { key: 'servicosLogistica', label: 'Serviços/Logística' },
                        { key: 'administrativos', label: 'Administrativos' },
                        { key: 'outros', label: 'Outros' }
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setFiltroDetalheMacrogrupo(opt.key as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filtroDetalheMacrogrupo === opt.key
                            ? 'bg-[rgba(0,166,81,0.12)] border-[#00A651] text-[#004417]'
                            : 'bg-white border-[rgba(0,68,23,0.15)] text-[#004417]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {(() => {
                      const itensFiltrados = filtroDetalheMacrogrupo === 'Todos'
                        ? detalhesCusto
                        : detalhesCusto.filter(d => d.macrogrupo === filtroDetalheMacrogrupo);

                      return (
                        <>
                          {/* Desktop: tabela */}
                          <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-[rgba(0,166,81,0.06)] rounded-t-2xl">
                            <th className="px-6 py-4 text-left text-[14px] font-bold text-[#004417]">Data</th>
                            <th className="px-6 py-4 text-left text-[14px] font-bold text-[#004417]">Categoria</th>
                            <th className="px-6 py-4 text-left text-[14px] font-bold text-[#004417]">Descrição</th>
                            <th className="px-6 py-4 text-left text-[14px] font-bold text-[#004417]">Origem</th>
                            <th className="px-6 py-4 text-right text-[14px] font-bold text-[#004417]">Valor</th>
                          </tr>
                        </thead>
                            <tbody>
                              {itensFiltrados.length === 0 ? (
                            <tr>
                                  <td colSpan={5} className="px-6 py-5 text-center text-sm text-[#1d3a2d]">
                                Nenhum detalhamento disponível para este filtro.
                              </td>
                            </tr>
                          ) : (
                          itensFiltrados.map((detalhe, index) => (
                            <tr key={index} className="bg-white border-b border-[rgba(0,0,0,0.06)]">
                              <td className="px-6 py-5 text-sm text-[#1d3a2d]">{detalhe.data}</td>
                              <td className="px-6 py-5 text-sm text-[#1d3a2d]">{detalhe.categoria}</td>
                              <td className="px-6 py-5 text-sm text-[#1d3a2d]">{detalhe.descricao}</td>
                              <td className="px-6 py-5 text-sm">
                                <span className={`text-sm font-medium ${detalhe.origem === 'Financeiro' ? 'text-[#004417]' : detalhe.origem === 'Estoque' ? 'text-[#7A5F00]' : 'text-[#00A651]'
                                  }`}>
                                  {detalhe.origem}
                                </span>
                              </td>
                              <td className="px-6 py-5 text-sm font-semibold text-[#004417] text-right">{formatCurrency(detalhe.valor)}</td>
                            </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                          {/* Mobile: cards separados */}
                          <div className="lg:hidden space-y-4">
                          {itensFiltrados.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm border border-[rgba(0,0,0,0.06)] p-4 text-center text-sm text-[#1d3a2d]">
                              Nenhum detalhamento disponível para este filtro.
                            </div>
                          ) : (
                            itensFiltrados.map((detalhe, index) => (
                              <div key={index} className="bg-white rounded-xl shadow-sm border border-[rgba(0,0,0,0.06)] p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <div className="text-sm text-[#1d3a2d]">{detalhe.data}</div>
                                    <div className="text-base font-bold text-[#004417] truncate">{detalhe.categoria}</div>
                                    <div className="text-sm text-[#1d3a2d] mt-1 truncate">{detalhe.descricao}</div>
                                  </div>
                                  <div className="flex-shrink-0 text-right">
                                    <div className={`text-sm font-medium ${detalhe.origem === 'Financeiro' ? 'text-[#004417]' : detalhe.origem === 'Estoque' ? 'text-[#7A5F00]' : 'text-[#00A651]'}`}>
                                      {detalhe.origem}
                                    </div>
                                    <div className="text-lg font-bold text-[#004417] mt-2">{formatCurrency(detalhe.valor)}</div>
                                  </div>
                                </div>
                              </div>
                              ))
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="p-6 space-y-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'white' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="text-[#1d3a2d]">Total: </span>
                    <span className="font-bold text-[#004417]">{formatCurrency(talhaoSelecionado.total)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[#1d3a2d]">Custo/ha: </span>
                    <span className="font-bold text-[#00A651]">{formatCurrency(talhaoSelecionado.custoHa)}/ha</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pendências */}
      {modalPendenciasAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            {/* Header do Modal */}
            <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: 'white' }}>
              <div>
                <h3 className="text-xl font-bold text-[#004417]">Pendências</h3>
                <p className="text-sm text-[#1d3a2d]">{totalPendencias} itens pendentes</p>
              </div>
              <button
                onClick={() => setModalPendenciasAberto(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#004417' }}
              >
                <X className="w-5 h-5 text-[#004417]" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#004417' }}>
                    <th className="text-left p-3 text-sm font-bold text-white">Tipo</th>
                    <th className="text-left p-3 text-sm font-bold text-white">Referência</th>
                    <th className="text-left p-3 text-sm font-bold text-white">Descrição</th>
                    <th className="text-left p-3 text-sm font-bold text-white">Status</th>
                    <th className="text-center p-3 text-sm font-bold text-white">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {totalPendencias === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-sm text-[#1d3a2d]">Sem pendências</td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-sm text-[#1d3a2d]">Há pendências — implementar listagem</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
