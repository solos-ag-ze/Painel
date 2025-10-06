import React, { useState } from 'react';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Paperclip
} from 'lucide-react';
import { TransacaoFinanceira } from '../../lib/supabase';
import { FinanceService } from '../../services/financeService';
import { parseISO, startOfDay } from 'date-fns';
import AttachmentModal from '../Financeiro/AttachmentModal';

interface PlannedTransactionsProps {
  transactions: TransacaoFinanceira[];
  proximas5?: TransacaoFinanceira[];
}

export default function PlannedTransactions({ transactions, proximas5 }: PlannedTransactionsProps) {
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

  // Helper function to check if a transaction is future/planned
  const isFutureTransaction = (transaction: TransacaoFinanceira): boolean => {
    // Must have "Agendado" status
    if (transaction.status !== 'Agendado') return false;
    
    // Must have a future scheduled date
    if (!transaction.data_agendamento_pagamento) return false;
    
    try {
      const agendamentoDate = parseISO(transaction.data_agendamento_pagamento);
      const today = startOfDay(new Date());
      const agendamentoDateSemHora = startOfDay(agendamentoDate);
      return agendamentoDateSemHora > today;
    } catch {
      return false;
    }
  };

  // Get the next 5 planned transactions
  const plannedTransactions = React.useMemo(() => {
    // Se temos dados otimizados vindo da prop proximas5, usa eles diretamente
    if (proximas5 && proximas5.length > 0) {
      console.log('✅ Usando próximas 5 transações otimizadas do backend:', proximas5.length);
      return proximas5;
    }

    // Fallback: filtrar localmente (lógica antiga)
    console.log('⚠️ Usando fallback: filtrando transações localmente');
    const futureTransactions = transactions.filter(transaction => isFutureTransaction(transaction));

    return futureTransactions
      .sort((a, b) => {
        const dateA = new Date(a.data_agendamento_pagamento || '').getTime();
        const dateB = new Date(b.data_agendamento_pagamento || '').getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [transactions, proximas5]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data não informada';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="grid grid-cols-3 items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Transações Futuras</h3>
          </div>
          <div></div>
          <div className="flex items-center justify-end space-x-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm text-right">Próximas {plannedTransactions.length} transações</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {plannedTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma transação agendada</p>
              <p className="text-sm">Programe transações via WhatsApp do ZÉ</p>
            </div>
          ) : (
            plannedTransactions.map((transaction) => {
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
                      isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isIncome ? 'Entrada' : 'Saída'}
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
                        {FinanceService.formatDataPagamento(transaction.data_agendamento_pagamento || '')}
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
                    {/* Informação de lançamento */}
                    {transaction.data_registro && (
                      <div className="text-xs text-gray-500 flex-shrink-0">
                        Lançado em {new Date(transaction.data_registro).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {/* Espaçador quando não há informação de lançamento */}
                    {!transaction.data_registro && <div className="flex-1"></div>}
                    
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
            })
          )}
        </div>
      </div>

      {/* Attachment Modal */}
      <AttachmentModal
        isOpen={attachmentModal.isOpen}
        onClose={closeAttachmentModal}
        transactionId={attachmentModal.transactionId}
        transactionDescription={attachmentModal.description}
      />
    </>
  );
}