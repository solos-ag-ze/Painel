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
      // 1. Ordena transações realizadas: primeiro por data de registro (lançamento mais recente primeiro)
      const transacoesRealizadasOrdenadas = [...transactions.realizadas].sort((a, b) => {
        // Critério principal: data_registro (DESC) - lançamento mais recente aparece primeiro
        const registroA = new Date(a.data_registro || '').getTime();
        const registroB = new Date(b.data_registro || '').getTime();

        if (registroB !== registroA) {
          return registroB - registroA; // Ordem decrescente: lançamento mais recente primeiro
        }

        // Critério secundário (desempate): data_agendamento_pagamento (DESC)
        const dateA = new Date(a.data_agendamento_pagamento || '').getTime();
        const dateB = new Date(b.data_agendamento_pagamento || '').getTime();
        return dateB - dateA; // Ordem decrescente: mais recente primeiro
      });

      // 2. Guarda a lista COMPLETA ordenada em segundo plano
      setTodasTransacoesRealizadas(transacoesRealizadasOrdenadas);

      // 3. Ordena as transações futuras antes de armazenar
      const transacoesFuturasOrdenadas = [...transactions.futuras].sort((a, b) => {
        // Primeiro critério: data_agendamento_pagamento (ASC)
        const dateA = new Date(a.data_agendamento_pagamento || '').getTime();
        const dateB = new Date(b.data_agendamento_pagamento || '').getTime();

        if (dateA !== dateB) {
          return dateA - dateB; // Ordem crescente: mais próximas primeiro
        }

        // Segundo critério (desempate): data_registro (DESC)
        const registroA = new Date(a.data_registro || '').getTime();
        const registroB = new Date(b.data_registro || '').getTime();
        return registroB - registroA; // Ordem decrescente: lançamento mais recente primeiro
      });
      setTodasTransacoesFuturas(transacoesFuturasOrdenadas);

      // 4. Mostra apenas os 10 primeiros itens inicialmente
      setTransacoesRealizadas(transacoesRealizadasOrdenadas.slice(0, INITIAL_ITEM_COUNT));
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
        className={`relative rounded-xl p-[18px] transition-all duration-200 ${
          isIncome ? 'bg-[rgba(0,166,81,0.08)]' : 'bg-[rgba(247,148,31,0.10)]'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 pr-8">
            <div>
              <h4 className="font-semibold text-[#004417]">{transaction.descricao}</h4>
              {transaction.pagador_recebedor && (
                <p className="text-sm text-[#004417]/65 mt-0.5">{transaction.pagador_recebedor}</p>
              )}
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-[8px] font-medium ${
            isIncome ? 'bg-[rgba(0,166,81,0.15)] text-[#00A651]' : 'bg-[rgba(247,148,31,0.15)] text-[#F7941F]'
          }`}>
            {isFuture ? 'Planejada' : (isIncome ? 'Entrada' : 'Saída')}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <span className="text-[#004417]/65">Valor:</span>
            <p className="font-bold text-[#004417]">
              {FinanceService.formatCurrency(Math.abs(Number(transaction.valor)))}
            </p>
          </div>
          <div>
            <span className="text-[#004417]/65">Categoria:</span>
            <p className="font-semibold text-[#004417]">{transaction.categoria || 'Sem categoria'}</p>
          </div>
          <div>
            <span className="text-[#004417]/65">Data de pagamento:</span>
              <p className="font-semibold text-[#004417]">
              {isFuture 
                ? FinanceService.formatDataPagamento(String(transaction.data_agendamento_pagamento || ''))
                : FinanceService.formatDataPagamento(String(transaction.data_agendamento_pagamento || transaction.data_agendamento_pagamento || ''))
              }
            </p>
          </div>
          <div>
            <span className="text-[#004417]/65">Forma de pagamento:</span>
            <p className="font-semibold text-[#004417]">{transaction.forma_pagamento_recebimento || 'Não informado'}</p>
          </div>
          {/* Campo Parcela - só aparece se tiver valor */}
          {transaction.parcela && (
            <div>
              <p className="font-semibold text-[#004417]"><span className="text-[#004417]/65">Parcela: </span>{transaction.parcela}</p>
            </div>
          )}
        </div>
        
        {/* Botão de anexo */}
        <div className="flex justify-between items-center mt-3">
          {/* Informação de lançamento para transações futuras */}
          {transaction.data_registro && (
            <div className="text-xs text-[#004417]/65 flex-shrink-0">
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
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isIncome ? 'text-[#00A651] hover:bg-[#00A651]/10' : 'text-[#F7941F] hover:bg-[#F7941F]/10'}`}
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
      {/* Aviso Importante removido — ícone de isenção ficará somente no final da página */}

      

      {/* Cards de Saldo */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-[#004417]">Fluxo de Caixa</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {/* Card 1: Entradas */}
          <div className="bg-[rgba(0,166,81,0.10)] rounded-xl p-5 shadow-card transition-transform duration-200 hover:scale-[1.01]">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#00A651]/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#00A651]" />
              </div>
            </div>
            <p className="text-sm font-semibold text-[#004417] mb-1">
              {isFuturePeriod() ? 'Entradas Planejadas' : 'Entradas (Período)'}
            </p>
            <p className="text-[22px] font-bold text-[#004417] mb-1">
              {FinanceService.formatCurrency(periodBalance.totalEntradas)}
            </p>
            <p className="text-[13px] text-[#004417]/65">
              {isFuturePeriod() ? 'Total de entradas planejadas' : 'Total de entradas registradas'}
            </p>
          </div>
            
          {/* Card 2: Saídas */}
          <div className="bg-[rgba(247,148,31,0.12)] rounded-xl p-5 shadow-card transition-transform duration-200 hover:scale-[1.01]">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#F7941F]/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-[#F7941F]" />
              </div>
            </div>
            <p className="text-sm font-semibold text-[#004417] mb-1">
              {isFuturePeriod() ? 'Saídas Planejadas' : 'Saídas (Período)'}
            </p>
            <p className="text-[22px] font-bold text-[#004417] mb-1">
              {FinanceService.formatCurrency(periodBalance.totalSaidas)}
            </p>
            <p className="text-[13px] text-[#004417]/65">
              {isFuturePeriod() ? 'Total de saídas planejadas' : 'Total de saídas registradas'}
            </p>
          </div>
          
          {/* Card 3: Saldo Real (agora condicional) */}
          {!isPastPeriod() && (
            <div className="bg-white rounded-xl p-5 shadow-sm transition-transform duration-200 hover:scale-[1.01]">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#00A651]/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-[#00A651]" />
                </div>
                <button
                  onClick={() => toggleTooltip('saldo-real')}
                  className="p-1 text-[#00A651] hover:bg-[#00A651]/10 rounded transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm font-semibold text-[#004417] mb-1">
                {isFuturePeriod() ? 'Saldo Atual' : 'Saldo Atual (Hoje)'}
              </p>
              <p className="text-[22px] font-bold text-[#004417] mb-1">
                {FinanceService.formatCurrency(periodBalance.saldoReal)}
              </p>
              <p className="text-[13px] text-[#004417]/65">
                Saldo até hoje (lançamentos feitos)
              </p>
            </div>
          )}
          
          {shouldShowProjected() && (
            <div className="bg-white rounded-xl p-5 shadow-sm transition-transform duration-200 hover:scale-[1.01]">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#CADB2A]/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#004417]" />
                </div>
                <button
                  onClick={() => toggleTooltip('saldo-projetado')}
                  className="p-1 text-[#004417] hover:bg-[#CADB2A]/20 rounded transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm font-semibold text-[#004417] mb-1">
                {filterPeriod === 'todos' ? 'Saldo Projetado (Geral)' : 'Saldo Projetado (Período)'}
              </p>
              <p className="text-[22px] font-bold text-[#004417] mb-1">
                {FinanceService.formatCurrency(periodBalance.saldoProjetado || 0)}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[#004417]/65">
                  {filterPeriod === 'todos' ? 'Saldo hoje + futuros (total)' : 'Saldo hoje + futuros do período'}
                </p>
                {(periodBalance.impactoFuturo7Dias !== undefined || periodBalance.impactoFuturo30Dias !== undefined) && (
                  <button
                    onClick={() => toggleTooltip('impacto-futuro')}
                    className="p-1 text-[#004417] hover:bg-[#CADB2A]/20 rounded transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-card p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#00A651]/10 rounded-lg flex items-center justify-center">
              <Filter className="w-5 h-5 text-[#00A651]" />
            </div>
            <h3 className="text-lg font-semibold text-[#004417]">Filtros por Período</h3>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 bg-white border border-[rgba(0,68,23,0.10)] text-[#004417] font-medium hover:bg-[rgba(0,68,23,0.03)] rounded-[10px] transition-colors"
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
                  className={`p-3 text-left rounded-[10px] transition-colors border ${filterPeriod === option.value ? 'bg-[rgba(0,166,81,0.10)] border-[#00A651] text-[#004417] font-semibold' : 'bg-white border-[rgba(0,68,23,0.06)] text-[rgba(0,68,23,0.8)] hover:bg-[rgba(0,68,23,0.03)] hover:border-[rgba(0,68,23,0.12)]'}`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-[rgba(0,68,23,0.65)] mt-1">{option.description}</div>
                </button>
              ))}
            </div>

            {filterPeriod === 'personalizado' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-[rgba(0,68,23,0.85)] mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[rgba(0,68,23,0.12)] rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-[#00A651]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[rgba(0,68,23,0.85)] mb-2">Data Final</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[rgba(0,68,23,0.12)] rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-[#00A651]"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Colunas de Transações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Transações Realizadas */}
        <div className="bg-white rounded-xl shadow-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#004417]">Transações Realizadas</h3>
            <div className="flex items-center space-x-2 text-[#00A651]">
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-semibold">({transacoesRealizadas.length})</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {transacoesRealizadas.length === 0 ? (
              <div className="text-center py-8 bg-[rgba(0,166,81,0.05)] rounded-xl text-[#004417] p-6">
                <PiggyBank className="w-12 h-12 mx-auto mb-3 text-[#00A651]" />
                <p className="font-medium text-[#004417]">Nenhuma transação encontrada</p>
                <p className="text-sm mt-1">
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
                    className="w-full px-4 py-2.5 text-sm font-semibold text-[#00A651] bg-white border border-[#00A651] rounded-[10px] hover:bg-[rgba(0,166,81,0.10)] transition-colors"
                  >
                    Ver todas ({todasTransacoesRealizadas.length})
                  </button>
                ) : (
                  // Se a lista visível está EXPANDIDA, mostra o botão "Ver menos"
                  <button
                    onClick={() => setTransacoesRealizadas(todasTransacoesRealizadas.slice(0, INITIAL_ITEM_COUNT))}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-[#004417]/65 bg-white border border-[rgba(0,68,23,0.06)] rounded-[10px] hover:bg-[rgba(0,68,23,0.03)] transition-colors"
                  >
                    Ver menos
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita - Transações Futuras */}
        <div className="bg-white rounded-xl shadow-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#004417]">Transações Futuras</h3>
            <div className="flex items-center space-x-2 text-[#00A651]">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">({transacoesFuturas.length})</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {transacoesFuturas.length === 0 ? (
              <div className="text-center py-8 bg-[rgba(0,166,81,0.05)] rounded-xl text-[#004417] p-6">
                <Clock className="w-12 h-12 mx-auto mb-3 text-[#00A651]" />
                <p className="font-medium text-[#004417]">Nenhum lançamento futuro neste período</p>
                <p className="text-sm mt-2 leading-relaxed">
                  Todos os valores dependem exclusivamente das informações lançadas pelo produtor.
                </p>
              </div>
            ) : (
              transacoesFuturas.map((transaction) => renderTransactionCard(transaction, true))
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
                    className="w-full px-4 py-2.5 text-sm font-semibold text-[#00A651] bg-white border border-[#00A651] rounded-[10px] hover:bg-[rgba(0,166,81,0.10)] transition-colors"
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
                    className="w-full px-4 py-2.5 text-sm font-semibold text-[#004417]/65 bg-white border border-[rgba(0,68,23,0.06)] rounded-[10px] hover:bg-[rgba(0,68,23,0.03)] transition-colors"
                  >
                    Ver menos
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé de Compliance - substituído por ícone que abre modal com texto combinado */}
      <div className="flex justify-end mt-6">
        <button
          onClick={() => toggleTooltip('disclaimer')}
          className="p-2 rounded-lg text-[#004417] bg-white border border-[rgba(0,68,23,0.06)] hover:bg-[rgba(0,68,23,0.03)] transition-colors"
          title="Aviso de responsabilidade"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Estado vazio geral */}
      {transacoesRealizadas.length === 0 && transacoesFuturas.length === 0 && (
        <div className="bg-[rgba(0,166,81,0.05)] rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-[rgba(0,166,81,0.10)] rounded-full flex items-center justify-center mx-auto mb-4">
            <PiggyBank className="w-8 h-8 text-[#00A651]" />
          </div>
          <h3 className="text-lg font-bold text-[#004417] mb-2">Sem lançamentos neste período</h3>
          <p className="text-[#004417] mb-4">
            Para registrar, envie pelo WhatsApp do Zé.
          </p>
          <div className="bg-[rgba(247,148,31,0.06)] border-l-4 border-[#F7941F] p-4 rounded-lg">
            <p className="text-sm text-[#004417]">
              <strong className="text-[#004417]">Atenção:</strong> este painel é apenas para controle; nenhuma transação financeira é realizada pelo sistema.
            </p>
          </div>
        </div>
      )}

      {/* Modais de Informação */}
      {activeTooltip === 'saldo-real' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-[rgba(0,166,81,0.08)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-[#00A651]" />
              </div>
              
              <h3 className="text-lg font-bold text-[#004417] mb-2">
                Saldo Atual
              </h3>
              
              <p className="text-[#004417]/80 mb-6 leading-relaxed">
                <strong>Saldo Atual:</strong> Mostra a soma de entradas e saídas já registradas pelo produtor no período selecionado. É apenas um controle, não representa saldo bancário.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="flex-1 px-4 py-2 bg-[#004417] text-white rounded-lg hover:bg-[#003015] transition-colors"
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
              <div className="w-16 h-16 bg-[rgba(0,166,81,0.08)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-[#00A651]" />
              </div>
              
              <h3 className="text-lg font-bold text-[#004417] mb-2">
                Saldo Projetado
              </h3>
              
              <p className="text-[#004417]/80 mb-6 leading-relaxed">
                <strong>Saldo Projetado:</strong> Mostra o saldo atual somado com todas as transações futuras agendadas. Ajuda a prever o fluxo de caixa considerando os compromissos futuros.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="flex-1 px-4 py-2 bg-[#004417] text-white rounded-lg hover:bg-[#003015] transition-colors"
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
              <div className="w-16 h-16 bg-[rgba(0,166,81,0.08)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-[#00A651]" />
              </div>
              
              <h3 className="text-lg font-bold text-[#004417] mb-2">
                Impactos Futuros
              </h3>
              
              <div className="space-y-3 mb-6">
                {periodBalance.impactoFuturo7Dias !== undefined && (
                  <div className="flex justify-between items-center p-3 bg-[rgba(0,166,81,0.04)] rounded-lg">
                    <span className="text-sm text-[rgba(0,68,23,0.85)]">Próximos 7 dias:</span>
                    <span className={`font-medium ${
                      periodBalance.impactoFuturo7Dias >= 0 ? 'text-[#00A651]' : 'text-red-600'
                    }`}>
                      {periodBalance.impactoFuturo7Dias >= 0 ? '+' : ''}
                      {FinanceService.formatCurrency(periodBalance.impactoFuturo7Dias)}
                    </span>
                  </div>
                )}
                {periodBalance.impactoFuturo30Dias !== undefined && (
                  <div className="flex justify-between items-center p-3 bg-[rgba(0,166,81,0.04)] rounded-lg">
                    <span className="text-sm text-[rgba(0,68,23,0.85)]">Próximos 30 dias:</span>
                    <span className={`font-medium ${
                      periodBalance.impactoFuturo30Dias >= 0 ? 'text-[#00A651]' : 'text-red-600'
                    }`}>
                      {periodBalance.impactoFuturo30Dias >= 0 ? '+' : ''}
                      {FinanceService.formatCurrency(periodBalance.impactoFuturo30Dias)}
                    </span>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-[rgba(0,68,23,0.75)] mb-6">
                Estes valores mostram o impacto das transações agendadas nos próximos períodos.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="flex-1 px-4 py-2 bg-[#004417] text-white rounded-lg hover:bg-[#003015] transition-colors"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTooltip === 'disclaimer' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
            <div className="text-left">
              <div className="flex items-center justify-center w-16 h-16 bg-[rgba(0,166,81,0.08)] rounded-full mx-auto mb-4">
                <Info className="w-8 h-8 text-[#00A651]" />
              </div>

              <h3 className="text-lg font-bold text-[#004417] mb-3 text-center">Aviso e Isenção de Responsabilidade</h3>

              <div className="space-y-4 text-sm text-[#004417]/90 mb-4">
                <p>
                  Este painel é apenas um registro de conferência. O Zé não executa pagamentos, transferências ou movimentações financeiras.
                </p>
                <p>
                  Os valores exibidos aqui são apenas um resumo dos lançamentos feitos pelo produtor via WhatsApp. O Zé não movimenta contas, não executa pagamentos nem garante recebimentos.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="flex-1 px-4 py-2 bg-[#004417] text-white rounded-lg hover:bg-[#003015] transition-colors"
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