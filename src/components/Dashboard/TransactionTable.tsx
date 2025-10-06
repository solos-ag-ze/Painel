import React, { useState } from 'react';
import {
  Calendar,
  Tag,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  CheckCircle,
  Clock,
  PiggyBank,
  Paperclip
} from 'lucide-react';
import { TransacaoFinanceira } from '../../lib/supabase';
import { FinanceService } from '../../services/financeService';
import { format, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateBR } from '../../lib/dateUtils';
import AttachmentModal from '../Financeiro/AttachmentModal';

interface TransactionTableProps {
  transactions: TransacaoFinanceira[];
  limit?: number; // ✅ Nova prop opcional
}

export default function TransactionTable({ transactions, limit }: TransactionTableProps) {
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
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
  const formatDate = (dateString: string) => {
    return formatDateBR(dateString);
  };

  const parseDate = (dateStr?: string): Date => {
    if (dateStr && dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    return new Date(dateStr || '');
  };

  // Esta função é essencial e mais simples que a original para o que você precisa
const isFutureDate = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  try {
    const transactionDate = parseISO(dateStr);
    const today = startOfDay(new Date());
    const transactionDateSemHora = startOfDay(transactionDate);
    return transactionDateSemHora > today;
  } catch {
    return false;
  }
};

// Forma mais simples e direta de escrever os filtros

const futureTransactions = transactions.filter(t =>
  // Para ser FUTURA, precisa cumprir AMBAS as condições:
  t.status === 'Agendado' && isFutureDate(t.data_agendamento_pagamento)
);

const recentTransactions = transactions.filter(t =>
  // Para ser RECENTE, basta que a condição de ser futura seja FALSA.
  !(t.status === 'Agendado' && isFutureDate(t.data_agendamento_pagamento))
);

  // Filter transactions based on type
  // ✅ VERSÃO CORRIGIDA E MAIS CLARA
const filterTransactions = (transactionList: TransacaoFinanceira[]) => {
  // Se o filtro for 'all', retorna a lista completa sem fazer nada.
  if (filterType === 'all') {
    return transactionList;
  }

  // Caso contrário, filtra a lista...
  return transactionList.filter(transaction => {
    const isEntrada = Number(transaction.valor) > 0;

    // Se o filtro for 'receita', mantenha o item APENAS SE for uma entrada.
    if (filterType === 'receita') {
      return isEntrada;
    } 
    // Se o filtro for 'despesa', mantenha o item APENAS SE NÃO for uma entrada.
    else if (filterType === 'despesa') {
      return !isEntrada;
    }

    // Como segurança, se não for nenhuma das opções, não mostra (não deve acontecer).
    return false;
  });
};

  const filteredRecentTransactions = filterTransactions(recentTransactions);
  const filteredFutureTransactions = filterTransactions(futureTransactions);

  const renderTransactionCard = (transaction: TransacaoFinanceira, isFuture = false) => {
    const isIncome = Number(transaction.valor) > 0;
    
    return (
      <div
        key={transaction.id_lancamento || transaction.id_transacao} 
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
            <span className="text-gray-600">Data:</span>
            <p className="font-medium text-gray-900">
              {isFuture 
      ? formatDate(transaction.data_agendamento_pagamento || '')
      : formatDate(transaction.data_transacao || transaction.data_registro || '')
    }
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Forma de Pagamento:</span>
            <p className="font-medium text-gray-900">{transaction.forma_pagamento_recebimento || 'Não informado'}</p>
          </div>
        </div>
        
        {/* Botão de anexo no canto inferior direito */}
        <div className="flex justify-end mt-3">
          <div className="relative">
            <button
              onClick={() => openAttachmentModal(
                transaction.id_transacao || '',
                transaction.descricao || 'Transação'
              )}
              className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200"
              title="Gerenciar anexo"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            {transaction.anexo_compartilhado_url && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"
                   title="Tem anexo" />
            )}
            {transaction.numero_parcelas && transaction.numero_parcelas > 1 && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white"
                   title={`${transaction.numero_parcelas} parcelas`}>
                {transaction.numero_parcelas}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-sm rounded-full ${filterType === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterType('receita')}
            className={`px-3 py-1 text-sm rounded-full ${filterType === 'receita' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
          >
            Receitas
          </button>
          <button
            onClick={() => setFilterType('despesa')}
            className={`px-3 py-1 text-sm rounded-full ${filterType === 'despesa' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
          >
            Despesas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Transactions Column */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transações Realizadas</h3>
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Realizadas ({filteredRecentTransactions.length})</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredRecentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma transação encontrada</p>
                <p className="text-sm">
                  {filterType !== 'all' 
                    ? `Nenhuma ${filterType} realizada encontrada`
                    : 'Registre transações via WhatsApp do ZÉ'
                  }
                </p>
              </div>
            ) : (
              [...filteredRecentTransactions]
                .sort((a, b) => {
  // ✅ Usa a data correta para transações realizadas
                  const dateA = new Date(a.data_transacao || a.data_registro || '').getTime();
                  const dateB = new Date(b.data_transacao || b.data_registro || '').getTime();
  // ✅ Subtrai B de A para ordenar da mais nova para a mais antiga (decrescente)
                  return dateB - dateA;
                  })
// ✅ Corrigido para 'false', pois são transações recentes/realizadas
                .slice(0, limit) // ✅ APLIQUE O LIMITE AQUI
                .map((transaction) => renderTransactionCard(transaction, false))
            )}
          </div>
        </div>

        {/* Future Transactions Column */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transações Planejadas</h3>
            <div className="flex items-center space-x-2 text-blue-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Planejadas ({filteredFutureTransactions.length})</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {filteredFutureTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma transação planejada</p>
                <p className="text-sm">
                  {filterType !== 'all' 
                    ? `Nenhuma ${filterType} planejada encontrada`
                    : 'Programe transações via WhatsApp do ZÉ'
                  }
                </p>
              </div>
            ) : (
              [...filteredFutureTransactions]
                .sort((a, b) => {
    // ✅ CORRETO: Usando a data de agendamento
                  const dateA = new Date(a.data_agendamento_pagamento || '').getTime();
                  const dateB = new Date(b.data_agendamento_pagamento || '').getTime();
                  return dateA - dateB; // Ordena da mais próxima para a mais distante
                })
                .slice(0, limit) // ✅ APLIQUE O LIMITE AQUI
                .map((transaction) => renderTransactionCard(transaction, true))
            )}
          </div>
        </div>
      </div>

      {/* Modal de anexos */}
      <AttachmentModal
        isOpen={attachmentModal.isOpen}
        onClose={closeAttachmentModal}
        transactionId={attachmentModal.transactionId}
        transactionDescription={attachmentModal.description}
      />
    </div>
  );
}

