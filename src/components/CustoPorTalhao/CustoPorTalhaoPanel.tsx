import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  ChevronRight, 
  X, 
  Info,
  Paperclip,
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

  const [custosPorTalhao, setCustosPorTalhao] = useState<CustoTalhao[]>([]);
  const [talhaoSelecionado, setTalhaoSelecionado] = useState<CustoTalhao | null>(null);
  const [detalhesCusto, setDetalhesCusto] = useState<DetalheCusto[]>([]);
  const [painelLateralAberto, setPainelLateralAberto] = useState(false);
  const [modalPendenciasAberto, setModalPendenciasAberto] = useState(false);

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
          Custo por Talhão (Competência por Área)
        </h1>
        <p className="text-gray-600 mt-1">Custos agrícolas consolidados por área e macrogrupo</p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#004417] mb-2">
              Safra
            </label>
            <select
              value={filtros.safra}
              onChange={(e) => setFiltros({ ...filtros, safra: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
            >
              <option value="2024/2025">2024/2025</option>
              <option value="2023/2024">2023/2024</option>
              <option value="2022/2023">2022/2023</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#004417] mb-2">
              Fazenda
            </label>
            <select
              value={filtros.fazenda}
              onChange={(e) => setFiltros({ ...filtros, fazenda: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
            >
              <option value="">Todas as fazendas</option>
              <option value="fazenda1">Fazenda Santa Maria</option>
              <option value="fazenda2">Fazenda Boa Vista</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#004417] mb-2">
              Talhão
            </label>
            <select
              multiple
              value={filtros.talhoes}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setFiltros({ ...filtros, talhoes: values });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
            >
              <option value="talhao1">Talhão 1A</option>
              <option value="talhao2">Talhão 2B</option>
              <option value="talhao3">Talhão 3C</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#004417] mb-2">
              Macrogrupo
            </label>
            <select
              value={filtros.macrogrupo}
              onChange={(e) => setFiltros({ ...filtros, macrogrupo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
            >
              <option value="Todos">Todos</option>
              <option value="Insumos">Insumos</option>
              <option value="Operacional">Operacional</option>
              <option value="Serviços/Logística">Serviços/Logística</option>
              <option value="Administrativos">Administrativos</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#004417] mb-2">
              Período (mês/ano)
            </label>
            <input
              type="month"
              value={filtros.mesAno}
              onChange={(e) => setFiltros({ ...filtros, mesAno: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleFiltrar}
            className="px-6 py-2.5 bg-[#00A651] text-white font-semibold rounded-lg hover:bg-[#004417] transition-colors duration-200"
          >
            Filtrar resultados
          </button>
        </div>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Total de Custos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-transform duration-200 hover:scale-101">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-lg bg-[#00A651]/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#004417]" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600 font-medium">Total de Custos</p>
            <p className="text-2xl font-bold text-[#004417] mt-1">
              {formatCurrency(totalCustos)}
            </p>
          </div>
        </div>

        {/* Custo Médio / ha */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-transform duration-200 hover:scale-101">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-lg bg-[#CADB2A]/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#004417]" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600 font-medium">Custo Médio / ha</p>
            <p className="text-2xl font-bold text-[#004417] mt-1">
              {formatCurrency(custoMedioHa)}/ha
            </p>
          </div>
        </div>

        {/* % por Macrogrupo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-transform duration-200 hover:scale-101">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[#004417]" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600 font-medium">% por Macrogrupo</p>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Insumos</span>
                <span className="font-semibold text-[#004417]">58%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-[#00A651] h-1.5 rounded-full" style={{ width: '58%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Pendências */}
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 transition-transform duration-200 hover:scale-101 cursor-pointer"
          onClick={() => setModalPendenciasAberto(true)}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-lg bg-[#F7941F]/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#F7941F]" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600 font-medium">Pendências</p>
            <p className="text-2xl font-bold text-[#004417] mt-1 flex items-center gap-2">
              {totalPendencias}
              <span className="text-xs text-gray-500 font-normal">Ver detalhes →</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabela Principal */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-[#004417] mb-4">Custo por Talhão</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#004417]/5 border-b border-gray-200">
                <th className="text-left p-3 text-sm font-bold text-[#004417]">Talhão</th>
                {macrogrupos.map(grupo => (
                  <th key={grupo.key} className="text-right p-3 text-sm font-bold text-[#004417] relative group">
                    <span className="flex items-center justify-end gap-1">
                      {grupo.label}
                      <Info className="w-3.5 h-3.5 text-gray-400" />
                    </span>
                    <div className="hidden group-hover:block absolute top-full right-0 mt-1 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {grupo.tooltip}
                    </div>
                  </th>
                ))}
                <th className="text-right p-3 text-sm font-bold text-[#004417]">Total</th>
                <th className="text-right p-3 text-sm font-bold text-[#004417]">R$/ha</th>
              </tr>
            </thead>
            <tbody>
              {custosPorTalhao.map((talhao, index) => (
                <tr
                  key={index}
                  onClick={() => handleClickTalhao(talhao)}
                  className="border-b border-gray-100 hover:bg-[#00A651]/8 cursor-pointer transition-colors"
                  style={{ backgroundColor: index % 2 === 0 ? 'rgba(0, 68, 23, 0.02)' : 'transparent' }}
                >
                  <td className="p-3 text-sm font-medium text-[#004417]">{talhao.talhao}</td>
                  <td className="p-3 text-sm text-gray-700 text-right">{formatCurrency(talhao.insumos)}</td>
                  <td className="p-3 text-sm text-gray-700 text-right">{formatCurrency(talhao.operacional)}</td>
                  <td className="p-3 text-sm text-gray-700 text-right">{formatCurrency(talhao.servicosLogistica)}</td>
                  <td className="p-3 text-sm text-gray-700 text-right">{formatCurrency(talhao.administrativos)}</td>
                  <td className="p-3 text-sm text-gray-700 text-right">{formatCurrency(talhao.outros)}</td>
                  <td className="p-3 text-sm font-bold text-[#004417] text-right">{formatCurrency(talhao.total)}</td>
                  <td className="p-3 text-sm font-semibold text-[#00A651] text-right">{formatCurrency(talhao.custoHa)}/ha</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Painel Lateral (Drill-down) */}
      {painelLateralAberto && talhaoSelecionado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col">
            {/* Header do Painel */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#004417]">{talhaoSelecionado.talhao}</h3>
                <p className="text-sm text-gray-600">Detalhamento de custos</p>
              </div>
              <button
                onClick={() => setPainelLateralAberto(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Conteúdo do Painel */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#004417]/5 border-b border-gray-200">
                      <th className="text-left p-3 text-sm font-bold text-[#004417]">Data</th>
                      <th className="text-left p-3 text-sm font-bold text-[#004417]">Categoria</th>
                      <th className="text-left p-3 text-sm font-bold text-[#004417]">Descrição</th>
                      <th className="text-left p-3 text-sm font-bold text-[#004417]">Origem</th>
                      <th className="text-right p-3 text-sm font-bold text-[#004417]">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhesCusto.map((detalhe, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-gray-50"
                        style={{ backgroundColor: index % 2 === 0 ? 'rgba(0, 68, 23, 0.02)' : 'transparent' }}
                      >
                        <td className="p-3 text-sm text-gray-700">{detalhe.data}</td>
                        <td className="p-3 text-sm text-gray-700">{detalhe.categoria}</td>
                        <td className="p-3 text-sm text-gray-700">{detalhe.descricao}</td>
                        <td className="p-3 text-sm">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                            detalhe.origem === 'Financeiro' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {detalhe.origem === 'Financeiro' ? '💸' : '🌱'} {detalhe.origem}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-semibold text-[#004417] text-right">
                          {formatCurrency(detalhe.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodapé do Painel */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm">
                  <span className="text-gray-600">💰 Total: </span>
                  <span className="font-bold text-[#004417]">{formatCurrency(talhaoSelecionado.total)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">📐 Custo/ha: </span>
                  <span className="font-bold text-[#00A651]">{formatCurrency(talhaoSelecionado.custoHa)}/ha</span>
                </div>
              </div>
              <button
                className="w-full px-4 py-2.5 bg-[#00A651] text-white font-semibold rounded-lg hover:bg-[#004417] transition-colors flex items-center justify-center gap-2"
              >
                <Paperclip className="w-4 h-4" />
                Ver anexos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pendências */}
      {modalPendenciasAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#004417]">Pendências</h3>
                <p className="text-sm text-gray-600">{totalPendencias} itens pendentes</p>
              </div>
              <button
                onClick={() => setModalPendenciasAberto(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#004417]/5 border-b border-gray-200">
                    <th className="text-left p-3 text-sm font-bold text-[#004417]">Tipo</th>
                    <th className="text-left p-3 text-sm font-bold text-[#004417]">Referência</th>
                    <th className="text-left p-3 text-sm font-bold text-[#004417]">Descrição</th>
                    <th className="text-left p-3 text-sm font-bold text-[#004417]">Status</th>
                    <th className="text-center p-3 text-sm font-bold text-[#004417]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendenciasMock.map((pendencia, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100"
                      style={{ backgroundColor: index % 2 === 0 ? 'rgba(0, 68, 23, 0.02)' : 'transparent' }}
                    >
                      <td className="p-3 text-sm text-gray-700">{pendencia.tipo}</td>
                      <td className="p-3 text-sm text-gray-700">{pendencia.referencia}</td>
                      <td className="p-3 text-sm text-gray-700">{pendencia.descricao}</td>
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
                          <ExternalLink className="w-3.5 h-3.5" />
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
