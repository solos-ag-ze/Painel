import { useState, useEffect, useCallback } from 'react';
import { BarChart3, X, Info, RefreshCw } from 'lucide-react';
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
    origem: 'Financeiro' | 'Atividade Agrícola';
    valor: number;
  }

  // Calcula a safra atual baseado no mês (Maio a Abril)
  const calcularSafraAtual = (): string => {
    const hoje = new Date();
    const anoAtual = hoje.getMonth() >= 4 ? hoje.getFullYear() : hoje.getFullYear() - 1;
    return `${anoAtual}/${anoAtual + 1}`;
  };

  export default function CustoPorTalhaoPanel() {
    const [loading, setLoading] = useState(false);
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
    const [detalhesCusto] = useState<DetalheCusto[]>([]);
    const [painelLateralAberto, setPainelLateralAberto] = useState(false);
    const [modalPendenciasAberto, setModalPendenciasAberto] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    

    // Dados iniciais simples — removidos os mocks complexos
    const totalPendencias = 0;

    const macrogrupos = [
      { key: 'insumos', label: 'Insumos', tooltip: 'Fertilizantes, defensivos, sementes' },
      { key: 'operacional', label: 'Operacional', tooltip: 'Combustível, manutenção, reparos' },
      { key: 'servicosLogistica', label: 'Serviços/Logística', tooltip: 'Transporte, armazenagem, serviços terceirizados' },
      { key: 'administrativos', label: 'Administrativos', tooltip: 'Despesas fixas, seguros, impostos' },
      { key: 'outros', label: 'Outros', tooltip: 'Despesas diversas' }
    ];

    // Função para carregar custos por talhão
    const carregarCustos = useCallback(async (currentUserId: string, filtrosAtuais: Filtros) => {
      setLoading(true);
      try {
        console.log('📊 Carregando custos por talhão...', { userId: currentUserId, filtros: filtrosAtuais });
        
        // Converter filtros do componente para o formato do service
        const filtrosService: FiltrosCustoPorTalhao = {
          safra: filtrosAtuais.safra || undefined,
          fazenda: filtrosAtuais.fazenda || undefined,
          talhoes: filtrosAtuais.talhoes.length > 0 ? filtrosAtuais.talhoes : undefined,
          macrogrupo: filtrosAtuais.macrogrupo !== 'Todos' ? filtrosAtuais.macrogrupo : undefined,
          mesAno: filtrosAtuais.mesAno || undefined
        };

        const custos = await CustoPorTalhaoService.getCustosPorTalhao(currentUserId, filtrosService);
        setCustosTalhoes(custos || []);
        
        console.log('✅ Custos carregados:', custos?.length || 0, 'talhões');
      } catch (err) {
        console.error('❌ Erro ao carregar custos por talhão:', err);
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
            console.warn('Usuário não autenticado — nenhum dado será carregado');
            return;
          }

          if (!mounted) return;
          setUserId(currentUser.user_id);
          
          // Carregar custos com filtros iniciais
          await carregarCustos(currentUser.user_id, filtros);
        } catch (err) {
          console.error('Erro ao inicializar painel:', err);
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
      console.info('📎 Abrir modal de anexos do talhão selecionado');
    };

    // Filtra talhões exibidos baseado no filtro local
    const talhoesFiltrados = filtroTalhao === 'todos' 
      ? custosTalhoes 
      : custosTalhoes.filter(t => t.talhao === filtroTalhao);

    const handleTalhaoSelect = (talhao: CustoTalhao) => {
      setTalhaoSelecionado(talhao);
      setPainelLateralAberto(true);
    };

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
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

    const talhoesDisponiveis = Array.from(new Set(custosTalhoes.map(t => t.talhao))).filter(Boolean);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#004417] flex items-center gap-2">
              Custo por Talhão
            </h1>
            <p className="text-[#1d3a2d] mt-1">Custos agrícolas dividos por área</p>
          </div>
        </div>

        {/* Mobile Experience: filtros */}
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
                      className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                        selecionado
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
                className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all duration-200 whitespace-nowrap snap-start flex-shrink-0 ${
                  filtroTalhao === opcao
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
        
            <div className="overflow-x-auto bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[rgba(0,166,81,0.06)] rounded-t-2xl">
                    <th className="px-6 py-4 text-left text-[14px] font-bold text-[#004417]">Talhão</th>
                    <th className="px-6 py-4 text-right text-[14px] font-bold text-[#004417]">Área (ha)</th>
                    {macrogrupos.map(grupo => (
                      <th key={grupo.key} className="px-6 py-4 text-right text-[14px] font-bold text-[#004417] relative group">
                        <span className="flex items-center justify-end gap-1">
                          <span className="whitespace-nowrap">{grupo.label}</span>
                          <Info className="w-3.5 h-3.5 text-[#004417]" />
                        </span>
                        <div className="hidden group-hover:block absolute top-full right-0 mt-1 bg-[#004417] text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                          {grupo.tooltip}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-right text-[14px] font-bold text-[#004417]">Total</th>
                    <th className="px-6 py-4 text-right text-[14px] font-bold text-[#004417]">R$/ha</th>
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
                          <td className="px-6 py-5 text-sm text-[#004417] font-medium align-top">{t.talhao}</td>
                          <td className="px-6 py-5 text-sm text-right text-[#1d3a2d] align-top">{t.area.toFixed(2)}</td>
                          {macrogrupos.map(gr => (
                            <td key={gr.key} className="px-6 py-5 text-sm text-right text-[#1d3a2d] font-semibold align-top">
                              {formatCurrency((t as any)[gr.key] || 0)}
                            </td>
                          ))}
                          <td className="px-6 py-5 text-sm font-bold text-[#004417] text-right align-top">
                            {formatCurrency(t.total)}
                          </td>
                          <td className="px-6 py-5 text-sm font-semibold text-[#00A651] text-right align-top">
                            {formatCurrency(t.custoHa)}/ha
                          </td>
                        </tr>
                      ))}
                      {/* Linha de Totais */}
                      {talhoesFiltrados.length > 1 && (
                        <tr className="bg-[rgba(0,166,81,0.06)] font-bold">
                          <td className="px-6 py-5 text-sm text-[#004417]">TOTAL</td>
                          <td className="px-6 py-5 text-sm text-right text-[#004417]">{totaisGerais.area.toFixed(2)}</td>
                          {macrogrupos.map(gr => (
                            <td key={gr.key} className="px-6 py-5 text-sm text-right text-[#004417]">
                              {formatCurrency((totaisGerais as any)[gr.key] || 0)}
                            </td>
                          ))}
                          <td className="px-6 py-5 text-sm text-right text-[#004417]">
                            {formatCurrency(totaisGerais.total)}
                          </td>
                          <td className="px-6 py-5 text-sm text-right text-[#00A651]">
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

        {/* Visualização por Macrogrupo - Mobile */}
        {!loading && (
          <div className="lg:hidden">
            <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,68,23,0.08)] border border-[rgba(0,68,23,0.08)] p-5">
              {talhoesFiltrados.length === 0 ? (
                <div className="text-center text-sm text-[#1d3a2d] py-6">
                  {custosTalhoes.length === 0
                    ? 'Nenhum custo encontrado para a safra selecionada.'
                    : 'Nenhum talhão corresponde ao filtro selecionado.'}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-3 px-3">
                  <table className="min-w-[720px] text-xs">
                    <thead>
                      <tr className="bg-[rgba(0,166,81,0.06)] text-[#004417]">
                        <th className="text-left font-bold px-3 py-2">Talhão</th>
                        <th className="text-right font-bold px-3 py-2">Área (ha)</th>
                        {macrogrupos.map((grupo) => (
                          <th key={grupo.key} className="text-right font-bold px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <span>{grupo.label}</span>
                              <Info className="w-3 h-3 text-[#004417]" />
                            </div>
                          </th>
                        ))}
                        <th className="text-right font-bold px-3 py-2">Total</th>
                        <th className="text-right font-bold px-3 py-2">R$/ha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {talhoesFiltrados.map((t, index) => (
                        <tr
                          key={t.id || index}
                          onClick={() => handleTalhaoSelect(t)}
                          className="border-b border-[rgba(0,0,0,0.06)] text-[#1d3a2d] hover:bg-[rgba(0,166,81,0.08)] transition-colors cursor-pointer"
                        >
                          <td className="px-3 py-3 font-semibold text-[#004417]">{t.talhao}</td>
                          <td className="px-3 py-3 text-right">{t.area.toFixed(2)}</td>
                          {macrogrupos.map((grupo) => (
                            <td key={grupo.key} className="px-3 py-3 text-right font-semibold">
                              {formatCurrency((t as any)[grupo.key] || 0)}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-right font-bold text-[#004417]">{formatCurrency(t.total)}</td>
                          <td className="px-3 py-3 text-right font-bold text-[#00A651]">{formatCurrency(t.custoHa)}/ha</td>
                        </tr>
                      ))}
                      {talhoesFiltrados.length > 1 && (
                        <tr className="bg-[rgba(0,166,81,0.06)] text-[#004417] font-bold">
                          <td className="px-3 py-3">TOTAL</td>
                          <td className="px-3 py-3 text-right">{totaisGerais.area.toFixed(2)}</td>
                          {macrogrupos.map((grupo) => (
                            <td key={grupo.key} className="px-3 py-3 text-right">
                              {formatCurrency((totaisGerais as any)[grupo.key] || 0)}
                            </td>
                          ))}
                          <td className="px-3 py-3 text-right">{formatCurrency(totaisGerais.total)}</td>
                          <td className="px-3 py-3 text-right text-[#00A651]">
                            {formatCurrency(totaisGerais.area > 0 ? totaisGerais.total / totaisGerais.area : 0)}/ha
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Painel Lateral (Drill-down) */}
        {painelLateralAberto && talhaoSelecionado && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col rounded-none lg:rounded-l-2xl" role="dialog" aria-modal="true">
              {/* Header do Painel */}
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

              {/* Conteúdo do Painel */}
              <div className="flex-1 overflow-y-auto p-6">
                <div>
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
                        {detalhesCusto.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-5 text-center text-sm text-[#1d3a2d]">
                              Nenhum detalhamento disponível para este talhão.
                            </td>
                          </tr>
                        ) : (
                          detalhesCusto.map((detalhe, index) => (
                            <tr key={index} className="bg-white border-b border-[rgba(0,0,0,0.06)]">
                              <td className="px-6 py-5 text-sm text-[#1d3a2d]">{detalhe.data}</td>
                              <td className="px-6 py-5 text-sm text-[#1d3a2d]">{detalhe.categoria}</td>
                              <td className="px-6 py-5 text-sm text-[#1d3a2d]">{detalhe.descricao}</td>
                              <td className="px-6 py-5 text-sm">
                                <span className={`text-sm font-medium ${
                                  detalhe.origem === 'Financeiro' ? 'text-[#004417]' : 'text-[#00A651]'
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
                    {detalhesCusto.length === 0 ? (
                      <div className="bg-white rounded-xl shadow-sm border border-[rgba(0,0,0,0.06)] p-4 text-center text-sm text-[#1d3a2d]">
                        Nenhum detalhamento disponível para este talhão.
                      </div>
                    ) : (
                      detalhesCusto.map((detalhe, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-[rgba(0,0,0,0.06)] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm text-[#1d3a2d]">{detalhe.data}</div>
                              <div className="text-base font-bold text-[#004417] truncate">{detalhe.categoria}</div>
                              <div className="text-sm text-[#1d3a2d] mt-1 truncate">{detalhe.descricao}</div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <div className={`text-sm font-medium ${detalhe.origem === 'Financeiro' ? 'text-[#004417]' : 'text-[#00A651]'}`}>
                                {detalhe.origem}
                              </div>
                              <div className="text-lg font-bold text-[#004417] mt-2">{formatCurrency(detalhe.valor)}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Rodapé do Painel */}
              <div className="p-6 space-y-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'white' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="text-[#1d3a2d]">💰 Total: </span>
                    <span className="font-bold text-[#004417]">{formatCurrency(talhaoSelecionado.total)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[#1d3a2d]">📐 Custo/ha: </span>
                    <span className="font-bold text-[#00A651]">{formatCurrency(talhaoSelecionado.custoHa)}/ha</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleVerAnexos}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#00A651] text-sm font-semibold text-[#004417] hover:bg-[rgba(0,166,81,0.08)] transition-colors"
                  >
                    📎 Ver anexos
                  </button>
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
