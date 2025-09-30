import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Search, 
  CreditCard,
  PiggyBank,
  Wallet,
  BarChart3,
  Paperclip,
  Clock,
  Target,
  TrendingUp as TrendingUpIcon,
  Filter,
  ChevronDown,
  AlertCircle,
  Info,
  Plus,
  X
} from 'lucide-react';
import { 
  FinanceService, 
  PeriodBalance, 
  FilterPeriod 
} from '../../services/financeService';
import { AuthService } from '../../services/authService';
import { TransacaoFinanceira } from '../../lib/supabase';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import ErrorMessage from '../Dashboard/ErrorMessage';
import AttachmentModal from './AttachmentModal';

const FinanceiroPanel: React.FC = () => {
  const INITIAL_ITEM_COUNT = 10; // 📌 Definimos o numero 10 como constante para utilizar no carregamento parcial das transações
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [periodBalance, setPeriodBalance] = useState<PeriodBalance>({
    totalEntradas: 0,
    totalSaidas: 0,
    saldoReal: 0,
    transacoesRealizadas: 0,
    transacoesFuturas: 0
  });
  const [transacoesRealizadas, setTransacoesRealizadas] = useState<TransacaoFinanceira[]>([]);
  const [transacoesFuturas, setTransacoesFuturas] = useState<TransacaoFinanceira[]>([]);
  // ✅ NOVOS ESTADOS: Para guardar a lista completa que vem da API
  const [todasTransacoesRealizadas, setTodasTransacoesRealizadas] = useState<TransacaoFinanceira[]>([]);
  const [todasTransacoesFuturas, setTodasTransacoesFuturas] = useState<TransacaoFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('todos');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [attachmentModal, setAttachmentModal] = useState<{
    isOpen: boolean;
    transactionId: string;
    description: string;
  }>({
    isOpen: false,
    transactionId: '',
    description: ''
  });

  const openAttachmentModal = (transactionId: string, description: string) => {
    setAttachmentModal({
      isOpen: true,
      transactionId,
      description
    });
  };

  const closeAttachmentModal = () => {
    setAttachmentModal({
      isOpen: false,
      transactionId: '',
      description: ''
    });
  };

  const toggleTooltip = (tooltipId: string) => {
    setActiveTooltip(activeTooltip === tooltipId ? null : tooltipId);
  };
  const filterOptions = [
    { value: 'todos', label: 'Todos os períodos', description: 'Período' },
    { value: 'ultimos-7-dias', label: 'Últimos 7 dias', description: 'Período passado' },
    { value: 'ultimos-30-dias', label: 'Últimos 30 dias', description: 'Período passado' },
    { value: 'mes-atual', label: 'Mês atual', description: 'Inclui futuro' },
    { value: 'safra-atual', label: 'Safra atual', description: '25/26' },
    { value: 'proximos-7-dias', label: 'Próximos 7 dias', description: 'Apenas futuro' },
    { value: 'proximos-30-dias', label: 'Próximos 30 dias', description: 'Apenas futuro' },
    { value: 'personalizado', label: 'Período personalizado', description: 'Escolha as datas' }
  ];

  useEffect(() => {
    loadFinancialData();
  }, [filterPeriod, customStartDate, customEndDate]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const authService = AuthService.getInstance();
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      const customStart = customStartDate ? new Date(customStartDate) : undefined;
      const customEnd = customEndDate ? new Date(customEndDate) : undefined;

      const [balance, transactions] = await Promise.all([
        FinanceService.getPeriodBalance(currentUser.user_id, filterPeriod, customStart, customEnd),
        FinanceService.getTransactionsByPeriod(currentUser.user_id, filterPeriod, customStart, customEnd)
      ]);

      setPeriodBalance(balance);
      
      // ✅ LÓGICA ALTERADA AQUI
      // 1. Guarda a lista COMPLETA em segundo plano
      setTodasTransacoesRealizadas(transactions.realizadas);
      // ✅ CORREÇÃO: Ordena as transações futuras antes de armazenar
      const transacoesFuturasOrdenadas = [...transactions.futuras].sort((a, b) => {
        const dateA = new Date(a.data_agendamento_pagamento || '').getTime();
        const dateB = new Date(b.data_agendamento_pagamento || '').getTime();
        return dateA - dateB; // Ordem crescente: mais próximas primeiro
      });
      setTodasTransacoesFuturas(transacoesFuturasOrdenadas);
      
      // 2. Mostra apenas os 10 primeiros itens inicialmente
      setTransacoesRealizadas(transactions.realizadas.slice(0, INITIAL_ITEM_COUNT));
      setTransacoesFuturas(transacoesFuturasOrdenadas.slice(0, INITIAL_ITEM_COUNT));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados financeiros');
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilterLabel = () => {
    const option = filterOptions.find(opt => opt.value === filterPeriod);
    return option?.label || 'Filtro selecionado';
  };

  const isPastPeriod = () => {
    return ['ultimos-7-dias', 'ultimos-30-dias'].includes(filterPeriod);
  };

  const isFuturePeriod = () => {
    return ['proximos-7-dias', 'proximos-30-dias'].includes(filterPeriod);
  };

  const shouldShowProjected = () => {
    return !isPastPeriod() && periodBalance.saldoProjetado !== undefined;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadFinancialData} />;
  }

  const renderTransactionCard = (transaction: TransacaoFinanceira, isFuture = false) => {
    const isIncome = Number(transaction.valor) > 0;
    
    return (
      <div
        key={transaction.id_transacao}
        className={`relative p-4 rounded-lg border-2 hover:shadow-sm transition-shadow ${
          isIncome 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 pr-8">
            {isIncome ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
            <div>
              <h4 className="font-medium text-gray-900">{transaction.descricao}</h4>
              {transaction.pagador_recebedor && (
                <p className="text-sm text-gray-600">{transaction.pagador_recebedor}</p>
              )}
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            isFuture
              ? (isIncome ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800')
              : (isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')
          }`}>
            {isFuture ? 'Planejada' : (isIncome ? 'Entrada' : 'Saída')}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Valor:</span>
            <p className={`font-medium ${
              isIncome ? 'text-green-600' : 'text-red-600'
            }`}>
              {FinanceService.formatCurrency(Math.abs(Number(transaction.valor)))}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Categoria:</span>
            <p className="font-medium text-gray-900">{transaction.categoria || 'Sem categoria'}</p>
          </div>
          <div>
            <span className="text-gray-600">Data de pagamento:</span>
            <p className="font-medium text-gray-900">
              {isFuture 
                ? FinanceService.formatDataPagamento(transaction.data_agendamento_pagamento || '')
                : FinanceService.formatDataPagamento(transaction.data_agendamento_pagamento || transaction.data_agendamento_pagamento || '')
              }
            </p>
          </div>
          <div>
            <span className="text-gray-600">Forma de pagamento:</span>
            <p className="font-medium text-gray-900">{transaction.forma_pagamento_recebimento || 'Não informado'}</p>
          </div>
          {/* Campo Parcela - só aparece se tiver valor */}
          {transaction.parcela && (
            <div>
              <p className="font-medium text-gray-900"><span className="text-gray-600">Parcela: </span>{transaction.parcela}</p>
            </div>
          )}
        </div>
        
        {/* Botão de anexo */}
        <div className="flex justify-between items-center mt-3">
          {/* Informação de lançamento para transações futuras */}
          {transaction.data_registro && (
            <div className="text-xs text-gray-500 flex-shrink-0">
              Lançado em {new Date(transaction.data_registro).toLocaleDateString('pt-BR')}
            </div>
          )}
          {/* Espaçador quando não há informação de lançamento */}
          {(!isFuture || !transaction.data_registro) && <div className="flex-1"></div>}
          
          <button
            onClick={() => openAttachmentModal(
              transaction.id_transacao || '',
              transaction.descricao || 'Transação'
            )}
            className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200 flex-shrink-0"
            title="Gerenciar anexo"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Aviso de Isenção de Responsabilidade */}
      <div className="bg-[#bb9009]/10 border border-[#bb9009]/30 rounded-xl p-4 md:p-6">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-[#bb9009] rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#bb9009] mb-1">Aviso Importante</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              Este painel é apenas um registro de conferência. O Zé da Safra não executa pagamentos, transferências ou movimentações financeiras.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#092f20]">Filtros por Período</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium">{getFilterLabel()}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setFilterPeriod(option.value as FilterPeriod);
                    if (option.value !== 'personalizado') {
                      setShowFilters(false);
                    }
                  }}
                  className={`p-3 text-left rounded-lg border-2 transition-colors ${
                    filterPeriod === option.value
                      ? 'bg-[#397738]/10 border-[#397738] text-[#397738]'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                </button>
              ))}
            </div>

            {filterPeriod === 'personalizado' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-[#397738]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#397738] focus:border-[#397738]"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards de Saldo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Fluxo de Caixa</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Card 1: Entradas */}
          <div className="p-4 rounded-lg border bg-emerald-50 border-emerald-100">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="text-xs md:text-sm font-medium text-gray-900">
                {/* ✅ ALTERAÇÃO AQUI */}
                {isFuturePeriod() ? 'Entradas Planejadas' : 'Entradas (Período)'}
              </span>
            </div>
            <p className="text-sm md:text-2xl font-bold text-emerald-600 mt-2">
              {FinanceService.formatCurrency(periodBalance.totalEntradas)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {/* ✅ ALTERAÇÃO AQUI */}
              {isFuturePeriod() ? 'Total de entradas planejadas' : 'Total de entradas registradas'}
            </p>
          </div>
            
          {/* Card 2: Saídas */}
          <div className="p-4 rounded-lg border bg-red-50 border-red-100">
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-xs md:text-sm font-medium text-gray-900">
                {/* ✅ ALTERAÇÃO AQUI */}
                {isFuturePeriod() ? 'Saídas Planejadas' : 'Saídas (Período)'}
              </span>
            </div>
            <p className="text-sm md:text-2xl font-bold text-red-600 mt-2">
              {FinanceService.formatCurrency(periodBalance.totalSaidas)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {/* ✅ ALTERAÇÃO AQUI */}
              {isFuturePeriod() ? 'Total de saídas planejadas' : 'Total de saídas registradas'}
            </p>
          </div>
          
          {/* Card 3: Saldo Real (agora condicional) */}
          {!isPastPeriod() && (
            <div className={`p-4 rounded-lg border ${
              periodBalance.saldoReal >= 0 
                ? 'bg-blue-50 border-blue-100' 
                : 'bg-orange-50 border-orange-100'
            }`}>
              <div className="flex items-center space-x-2">
                <Wallet className={`w-5 h-5 ${
                  periodBalance.saldoReal >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`} />
                <span className="text-xs md:text-sm font-medium text-gray-900">
                  {isFuturePeriod() ? 'Saldo Atual' : 'Saldo Atual (Hoje)'}
                </span>
                <button
                  onClick={() => toggleTooltip('saldo-real')}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-sm md:text-2xl font-bold mt-2 ${
                periodBalance.saldoReal >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {FinanceService.formatCurrency(periodBalance.saldoReal)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Saldo até hoje (lançamentos feitos)
              </p>
            </div>
          )}
          
          {shouldShowProjected() && (
            <div className={`p-4 rounded-lg border ${
              (periodBalance.saldoProjetado || 0) >= 0 
                ? 'bg-purple-50 border-purple-100' 
                : 'bg-yellow-50 border-yellow-100'
            }`}>
              <div className="flex items-center space-x-2">
                <Target className={`w-5 h-5 ${
                  (periodBalance.saldoProjetado || 0) >= 0 ? 'text-purple-600' : 'text-yellow-600'
                }`} />
                <span className="text-xs md:text-sm font-medium text-gray-900">
                  {filterPeriod === 'todos' ? 'Saldo Projetado (Geral)' : 'Saldo Projetado (Período)'}
                </span>
                <button
                  onClick={() => toggleTooltip('saldo-projetado')}
                  className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <p className={`text-sm md:text-2xl font-bold mt-2 ${
                (periodBalance.saldoProjetado || 0) >= 0 ? 'text-purple-600' : 'text-yellow-600'
              }`}>
                {FinanceService.formatCurrency(periodBalance.saldoProjetado || 0)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-500">
                  {filterPeriod === 'todos' ? 'Saldo hoje + futuros (total)' : 'Saldo hoje + futuros do período'}
                </p>
                {/* Future impacts plus icon */}
                {(periodBalance.impactoFuturo7Dias !== undefined || periodBalance.impactoFuturo30Dias !== undefined) && (
                  <button
                    onClick={() => toggleTooltip('impacto-futuro')}
                    className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Colunas de Transações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Coluna Esquerda - Transações Realizadas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transações Realizadas</h3>
            <div className="flex items-center space-x-2 text-green-600">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm">({transacoesRealizadas.length})</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {transacoesRealizadas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma transação encontrada</p>
                <p className="text-sm">
                  {filterPeriod === 'todos' 
                    ? 'Registre transações via WhatsApp do ZÉ'
                    : 'Nenhuma transação realizada neste período'
                  }
                </p>
              </div>
            ) : (
              transacoesRealizadas.map((transaction) => renderTransactionCard(transaction, false))
            )}
            {/* ✅ LÓGICA DE BOTÃO ATUALIZADA */}
            {/* Apenas mostra os botões se a lista completa for maior que o limite inicial */}
            {todasTransacoesRealizadas.length > INITIAL_ITEM_COUNT && (
              <div className="pt-2">
                {transacoesRealizadas.length <= INITIAL_ITEM_COUNT ? (
                  // Se a lista visível está RECOLHIDA, mostra o botão "Ver todas"
                  <button
                    onClick={() => setTransacoesRealizadas(todasTransacoesRealizadas)}
                    className="w-full px-4 py-2 text-sm font-semibold text-[#397738] bg-white border-2 border-[#86b646] rounded-lg hover:bg-[#86b646]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#397738]"
                  >
                    Ver todas ({todasTransacoesRealizadas.length})
                  </button>
                ) : (
                  // Se a lista visível está EXPANDIDA, mostra o botão "Ver menos"
                  <button
                    onClick={() => setTransacoesRealizadas(todasTransacoesRealizadas.slice(0, INITIAL_ITEM_COUNT))}
                    className="w-full px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                  >
                    Ver menos
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita - Transações Futuras */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transações Futuras</h3>
            <div className="flex items-center space-x-2 text-blue-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">({transacoesFuturas.length})</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {transacoesFuturas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum lançamento futuro neste período</p>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  Todos os valores dependem exclusivamente das informações lançadas pelo produtor.
                </p>
              </div>
            ) : (
              [...transacoesFuturas]
                .sort((a, b) => {
                  // Ordena transações futuras da data mais próxima para a mais distante (ASC)
                  const dateA = new Date(a.data_agendamento_pagamento || '').getTime();
                  const dateB = new Date(b.data_agendamento_pagamento || '').getTime();
                  return dateA - dateB; // Ordem crescente: datas mais próximas primeiro
                })
                .map((transaction) => renderTransactionCard(transaction, true))
            )}

            {/* ✅ BOTÃO ADICIONADO AQUI */}
            {/* ✅ LÓGICA DE BOTÃO ATUALIZADA PARA TRANSAÇÕES FUTURAS */}
            {todasTransacoesFuturas.length > INITIAL_ITEM_COUNT && (
              <div className="pt-2">
                {transacoesFuturas.length <= INITIAL_ITEM_COUNT ? (
                  <button
                    onClick={() => {
                      console.log('🔍 Debug - Ver todas clicado');
                      console.log('📊 todasTransacoesFuturas.length:', todasTransacoesFuturas.length);
                      console.log('📋 Primeiras 5 transações:', todasTransacoesFuturas.slice(0, 5).map(t => ({
                        id: t.id_transacao,
                        descricao: t.descricao,
                        data: t.data_agendamento_pagamento
                      })));
                      setTransacoesFuturas(todasTransacoesFuturas);
                      console.log('✅ Estado atualizado para mostrar todas as transações');
                    }}
                    className="w-full px-4 py-2 text-sm font-semibold text-blue-600 bg-white border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Ver todas ({todasTransacoesFuturas.length})
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      console.log('🔍 Debug - Ver menos clicado');
                      console.log('📊 Voltando para os primeiros', INITIAL_ITEM_COUNT, 'itens');
                      // Mostrar apenas as 10 primeiras (mais próximas) da lista já ordenada
                      setTransacoesFuturas(todasTransacoesFuturas.slice(0, INITIAL_ITEM_COUNT));
                      console.log('✅ Estado atualizado para mostrar menos transações');
                    }}
                    className="w-full px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                  >
                    Ver menos
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé de Compliance */}
      <div className="bg-[#bb9009]/10 border border-[#bb9009]/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-[#bb9009] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-[#bb9009] mb-1">Isenção de Responsabilidade</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              Os valores exibidos aqui são apenas um resumo dos lançamentos feitos pelo produtor via WhatsApp. 
              O Zé da Safra não movimenta contas, não executa pagamentos nem garante recebimentos.
            </p>
          </div>
        </div>
      </div>

      {/* Estado vazio geral */}
      {transacoesRealizadas.length === 0 && transacoesFuturas.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="w-16 h-16 bg-[#86b646]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <PiggyBank className="w-8 h-8 text-[#86b646]" />
          </div>
          <h3 className="text-lg font-semibold text-[#092f20] mb-2">Sem lançamentos neste período</h3>
          <p className="text-gray-600 mb-4">
            Para registrar, envie pelo WhatsApp do Zé.
          </p>
          <div className="bg-[#bb9009]/10 p-4 rounded-lg">
            <p className="text-sm text-[#bb9009]">
              <strong>Atenção:</strong> este painel é apenas para controle; nenhuma transação financeira é realizada pelo sistema.
            </p>
          </div>
        </div>
      )}

      {/* Modais de Informação */}
      {activeTooltip === 'saldo-real' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-blue-600" />
              </div>
              
              <h3 className="text-lg font-bold text-blue-600 mb-2">
                Saldo Atual
              </h3>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                <strong>Saldo Atual:</strong> Mostra a soma de entradas e saídas já registradas pelo produtor no período selecionado. É apenas um controle, não representa saldo bancário.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTooltip === 'saldo-projetado' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-purple-600" />
              </div>
              
              <h3 className="text-lg font-bold text-purple-600 mb-2">
                Saldo Projetado
              </h3>
              
              <p className="text-gray-600 mb-6 leading-relaxed">
                <strong>Saldo Projetado:</strong> Mostra o saldo atual somado com todas as transações futuras agendadas. Ajuda a prever o fluxo de caixa considerando os compromissos futuros.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTooltip === 'impacto-futuro' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-purple-600" />
              </div>
              
              <h3 className="text-lg font-bold text-purple-600 mb-2">
                Impactos Futuros
              </h3>
              
              <div className="space-y-3 mb-6">
                {periodBalance.impactoFuturo7Dias !== undefined && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Próximos 7 dias:</span>
                    <span className={`font-medium ${
                      periodBalance.impactoFuturo7Dias >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {periodBalance.impactoFuturo7Dias >= 0 ? '+' : ''}
                      {FinanceService.formatCurrency(periodBalance.impactoFuturo7Dias)}
                    </span>
                  </div>
                )}
                {periodBalance.impactoFuturo30Dias !== undefined && (
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">Próximos 30 dias:</span>
                    <span className={`font-medium ${
                      periodBalance.impactoFuturo30Dias >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {periodBalance.impactoFuturo30Dias >= 0 ? '+' : ''}
                      {FinanceService.formatCurrency(periodBalance.impactoFuturo30Dias)}
                    </span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-600 mb-6">
                Estes valores mostram o impacto das transações agendadas nos próximos períodos.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de anexos */}
      <AttachmentModal
        isOpen={attachmentModal.isOpen}
        onClose={closeAttachmentModal}
        transactionId={attachmentModal.transactionId}
        transactionDescription={attachmentModal.description}
      />
    </div>
  );
};

export default FinanceiroPanel;