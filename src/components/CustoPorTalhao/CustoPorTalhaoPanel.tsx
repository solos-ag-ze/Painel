import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  X,
  Info,
  ExternalLink
} from 'lucide-react';
import { AuthService } from '../../services/authService';

  // Interfaces
  interface Filtros {
    safra: string;
    fazenda: string;
    talhoes: string[];
    macrogrupo: string;
    mesAno: string;
  }

  interface CustoTalhao {
    talhao: string;
    area: number;
    insumos: number;
    operacional: number;
    servicosLogistica: number;
    administrativos: number;
    outros: number;
    total: number;
    custoHa: number;
  }

  interface DetalheCusto {
    data: string;
    categoria: string;
    descricao: string;
    origem: 'Financeiro' | 'Atividade Agrícola';
    valor: number;
  }

  interface Pendencia {
    tipo: string;
    referencia: string;
    descricao: string;
    status: string;
  }

  export default function CustoPorTalhaoPanel() {
    const [loading, setLoading] = useState(false);
    const [filtros, setFiltros] = useState<Filtros>({
      safra: '2024/2025',
      fazenda: '',
      talhoes: [],
      macrogrupo: 'Todos',
      mesAno: ''
    });
    const [filtroTalhao, setFiltroTalhao] = useState('todos');

    const [custosPorTalhao, setCustosPorTalhao] = useState<CustoTalhao[]>([]);
    const [talhaoSelecionado, setTalhaoSelecionado] = useState<CustoTalhao | null>(null);
    const [detalhesCusto, setDetalhesCusto] = useState<DetalheCusto[]>([]);
    const [painelLateralAberto, setPainelLateralAberto] = useState(false);
    const [modalPendenciasAberto, setModalPendenciasAberto] = useState(false);
    const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

    // Mock data - substituir por chamadas reais ao serviço
    const totalCustos = 285000;
    const custoMedioHa = 3250;
    const totalPendencias = 12;

    const pendenciasMock: Pendencia[] = [
      {
        tipo: 'NF sem detalhe',
        referencia: 'Fertilizante BASF',
        descricao: 'Falta unidade',
        status: 'pendente_detalhe'
      },
      {
        tipo: 'Consumo sem estoque',
        referencia: 'Glifosato',
        descricao: 'Atividade 22/07',
        status: 'revisão interna'
      }
    ];

    const custosTalhaoMock: CustoTalhao[] = [
      {
        talhao: 'Talhão 1A',
        area: 12.5,
        insumos: 45000,
        operacional: 12000,
        servicosLogistica: 8000,
        administrativos: 3500,
        outros: 1500,
        total: 70000,
        custoHa: 5600
      },
      {
        talhao: 'Talhão 2B',
        area: 18.3,
        insumos: 62000,
        operacional: 18500,
        servicosLogistica: 11200,
        administrativos: 5100,
        outros: 2400,
        total: 99200,
        custoHa: 5421
      },
      {
        talhao: 'Talhão 3C',
        area: 25.0,
        insumos: 78500,
        operacional: 23000,
        servicosLogistica: 14300,
        administrativos: 6800,
        outros: 3200,
        total: 125800,
        custoHa: 5032
      }
    ];

    const detalhesCustoMock: DetalheCusto[] = [
      {
        data: '12/06/2024',
        categoria: 'Mão de Obra',
        descricao: 'Diaristas colheita',
        origem: 'Financeiro',
        valor: 2100
      },
      {
        data: '05/07/2024',
        categoria: 'Fertilizante',
        descricao: 'NPK 20-05-20',
        origem: 'Atividade Agrícola',
        valor: 12800
      },
      {
        data: '18/08/2024',
        categoria: 'Defensivo',
        descricao: 'Glifosato Premium',
        origem: 'Atividade Agrícola',
        valor: 4500
      }
    ];

    const macrogrupos = [
      { key: 'insumos', label: 'Insumos', tooltip: 'Fertilizantes, defensivos, sementes' },
      { key: 'operacional', label: 'Operacional', tooltip: 'Combustível, manutenção, reparos' },
      { key: 'servicosLogistica', label: 'Serviços/Logística', tooltip: 'Transporte, armazenagem, serviços terceirizados' },
      { key: 'administrativos', label: 'Administrativos', tooltip: 'Despesas fixas, seguros, impostos' },
      { key: 'outros', label: 'Outros', tooltip: 'Despesas diversas' }
    ];

    const handleFiltrar = () => {
      setLoading(true);
      // Simular carregamento
      setTimeout(() => {
        setCustosPorTalhao(custosTalhaoMock);
        setLoading(false);
      }, 500);
    };

    // Carrega dados iniciais ao montar para popular lista de talhões
    useEffect(() => {
      handleFiltrar();
    }, []);

    const handleClickTalhao = (talhao: CustoTalhao) => {
      setTalhaoSelecionado(talhao);
      setDetalhesCusto(detalhesCustoMock);
      setPainelLateralAberto(true);
    };

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    useEffect(() => {
      // Carregar dados iniciais
      handleFiltrar();
    }, []);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#004417] flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Custo por Talhão
          </h1>
          <p className="text-[#1d3a2d] mt-1">Resumo dos custos por área</p>
        </div>

        {/* Filtro por Talhões (igual ao Manejo Agrícola) */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#004417]">Filtrar por Talhão</h3>
            <div className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium">
              {custosPorTalhao.length} {custosPorTalhao.length === 1 ? 'talhão encontrado' : 'talhões encontrados'}
            </div>
          </div>

          <div className="flex items-center flex-row flex-nowrap gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
            {['todos', ...custosPorTalhao.map(c => c.talhao)].map((opcao) => (
              <button
                key={opcao}
                onClick={() => setFiltroTalhao(opcao)}
                className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all duration-200 whitespace-nowrap snap-start flex-shrink-0 ${
                  filtroTalhao === opcao
                    ? 'bg-[rgba(0,166,81,0.10)] border border-[#00A651] text-[#004417] font-semibold'
                    : 'bg-white border border-[rgba(0,68,23,0.10)] text-[#004417] hover:bg-[rgba(0,68,23,0.03)] hover:border-[rgba(0,68,23,0.12)]'
                }`}
              >
                {opcao === 'todos' ? 'Sem Filtro' : opcao}
              </button>
            ))}
          </div>
        </div>

        {/* Cards de Indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-5">
          {/* Total de Custos */}
          <div className="bg-white rounded-xl shadow-sm border border-[rgba(0,0,0,0.06)] p-5 transition-transform duration-200 hover:scale-101">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-lg bg-[#00A651]/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#004417]" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-[#1d3a2d] font-medium">Total de Custos</p>
              <p className="text-2xl font-bold text-[#004417] mt-1">
                {formatCurrency(totalCustos)}
              </p>
            </div>
          </div>

          {/* Custo Médio / ha */}
          <div className="bg-white rounded-xl shadow-sm border border-[rgba(0,0,0,0.06)] p-5 transition-transform duration-200 hover:scale-101">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-lg bg-[#CADB2A]/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#004417]" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-[#1d3a2d] font-medium">Custo Médio / ha</p>
              <p className="text-2xl font-bold text-[#004417] mt-1">
                {formatCurrency(custoMedioHa)}/ha
              </p>
            </div>
          </div>
        </div>

        {/* Tabela Principal - Desktop (≥1024px) */}
        <div className="bg-white rounded-xl shadow-sm border border-[rgba(0,0,0,0.06)] p-6 hidden lg:block">
          <h3 className="text-lg font-bold text-[#004417] mb-4">Custo por Talhão</h3>
        
          <div className="overflow-x-auto bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="bg-[rgba(0,166,81,0.06)] rounded-t-2xl">
                  <th className="px-6 py-4 text-left text-[14px] font-bold text-[#004417]">Talhão</th>
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
                {custosPorTalhao.map((talhao, index) => (
                  <tr
                    key={index}
                    onClick={() => handleClickTalhao(talhao)}
                    className="bg-white border-b border-[rgba(0,0,0,0.06)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] cursor-pointer transition-all"
                  >
                    <td className="px-6 py-5 text-sm text-[#004417] font-medium align-top">{talhao.talhao}</td>
                    <td className="px-6 py-5 text-sm text-right text-[#1d3a2d] font-semibold align-top">{formatCurrency(talhao.insumos)}</td>
                    <td className="px-6 py-5 text-sm text-right text-[#1d3a2d] font-semibold align-top">{formatCurrency(talhao.operacional)}</td>
                    <td className="px-6 py-5 text-sm text-right text-[#1d3a2d] font-semibold align-top">{formatCurrency(talhao.servicosLogistica)}</td>
                    <td className="px-6 py-5 text-sm text-right text-[#1d3a2d] font-semibold align-top">{formatCurrency(talhao.administrativos)}</td>
                    <td className="px-6 py-5 text-sm text-right text-[#1d3a2d] font-semibold align-top">{formatCurrency(talhao.outros)}</td>
                    <td className="px-6 py-5 text-sm font-bold text-[#004417] text-right align-top">{formatCurrency(talhao.total)}</td>
                    <td className="px-6 py-5 text-sm font-semibold text-[#00A651] text-right align-top">{formatCurrency(talhao.custoHa)}/ha</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards Mobile - Vertical (≤1023px) */}
        <div className="lg:hidden space-y-4">
          {custosPorTalhao.map((talhao, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-[rgba(0,0,0,0.06)] p-4"
            >
              {/* Header do Card (clicável para expandir) */}
              <div className="flex items-center justify-between mb-3" onClick={() => setOpenCards(prev => ({ ...prev, [talhao.talhao]: !prev[talhao.talhao] }))}>
                <div>
                  <h4 className="text-lg font-bold text-[#004417]">{talhao.talhao}</h4>
                  <p className="text-sm text-[#1d3a2d]/80 mt-1">Área: {talhao.area} ha</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#1d3a2d]/80 font-medium">Total</p>
                  <p className="text-xl font-bold text-[#004417]">{formatCurrency(talhao.total)}</p>
                  <p className="text-sm font-semibold text-[#00A651] mt-1">{formatCurrency(talhao.custoHa)}/ha</p>
                </div>
              </div>

              {/* Closed hint */}
              {!openCards[talhao.talhao] && (
                <div className="text-sm text-[#1d3a2d]/70 mb-3">▼ Clique para ver detalhes das categorias</div>
              )}

              {/* Macrogrupos (colapsável) */}
              {openCards[talhao.talhao] && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#00A651]"></div>
                      <span className="text-sm font-medium text-[#1d3a2d]">Insumos</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1d3a2d]">{formatCurrency(talhao.insumos)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#CADB2A]"></div>
                      <span className="text-sm font-medium text-[#1d3a2d]">Operacional</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1d3a2d]">{formatCurrency(talhao.operacional)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#86b646]"></div>
                      <span className="text-sm font-medium text-[#1d3a2d]">Serviços/Logística</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1d3a2d]">{formatCurrency(talhao.servicosLogistica)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#397738]"></div>
                      <span className="text-sm font-medium text-[#1d3a2d]">Administrativos</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1d3a2d]">{formatCurrency(talhao.administrativos)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#0000001a]"></div>
                      <span className="text-sm font-medium text-[#1d3a2d]">Outros</span>
                    </div>
                    <span className="text-sm font-semibold text-[#1d3a2d]">{formatCurrency(talhao.outros)}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleClickTalhao(talhao)}
                  className="flex-1 px-4 py-2.5 bg-[#00A651] text-white font-semibold rounded-lg hover:bg-[#004417] transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  Ver detalhes
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => setOpenCards(prev => ({ ...prev, [talhao.talhao]: !prev[talhao.talhao] }))}
                  className="px-3 py-2.5 border border-[rgba(0,0,0,0.06)] rounded-lg text-[#004417] font-medium"
                >
                  {openCards[talhao.talhao] ? 'Recolher' : 'Expandir'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Painel Lateral (Drill-down) */}
        {painelLateralAberto && talhaoSelecionado && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col">
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
                        {detalhesCusto.map((detalhe, index) => (
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
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: cards separados */}
                  <div className="lg:hidden space-y-4">
                    {detalhesCusto.map((detalhe, index) => (
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
                    ))}
                  </div>
                </div>
              </div>

              {/* Rodapé do Painel */}
                <div className="p-6" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'white' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm">
                    <span className="text-[#1d3a2d]">💰 Total: </span>
                    <span className="font-bold text-[#004417]">{formatCurrency(talhaoSelecionado.total)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-[#1d3a2d]">📐 Custo/ha: </span>
                    <span className="font-bold text-[#00A651]">{formatCurrency(talhaoSelecionado.custoHa)}/ha</span>
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
                    {pendenciasMock.map((pendencia, index) => (
                      <tr
                        key={index}
                        style={{ backgroundColor: index % 2 === 0 ? 'rgba(0,166,81,0.04)' : 'white', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                      >
                        <td className="p-3 text-sm text-[#1d3a2d]">{pendencia.tipo}</td>
                        <td className="p-3 text-sm text-[#1d3a2d]">{pendencia.referencia}</td>
                        <td className="p-3 text-sm text-[#1d3a2d]">{pendencia.descricao}</td>
                        <td className="p-3 text-sm">
                          <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-[#F7941F]/20 text-[#F7941F]">
                            {pendencia.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => window.location.href = '/painel/estoque'}
                            className="inline-flex items-center gap-1 text-sm text-[#00A651] hover:text-[#004417] font-medium"
                          >
                            🔍 Ver no Estoque
                            <ExternalLink className="w-3.5 h-3.5 text-[#00A651]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
