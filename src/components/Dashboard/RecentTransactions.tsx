import React, { useState } from 'react';
import {
  CheckCircle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Paperclip,
  Calendar
} from 'lucide-react';
import { TransacaoFinanceira } from '../../lib/supabase';
import { FinanceService } from '../../services/financeService';
import { parseISO, startOfDay } from 'date-fns';
import { formatDateBR } from '../../lib/dateUtils';
import AttachmentModal from '../Financeiro/AttachmentModal';

interface RecentTransactionsProps {
  transactions: TransacaoFinanceira[];
  ultimas5?: TransacaoFinanceira[];
}

export default function RecentTransactions({ transactions, ultimas5 }: RecentTransactionsProps) {
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
    if (transaction.status !== 'Agendado') return false;
    
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

  // Get the 5 most recent executed transactions
  const recentTransactions = React.useMemo(() => {
    // Se temos dados otimizados vindo da prop ultimas5, usa eles diretamente
    if (ultimas5 && ultimas5.length > 0) {
      console.log('✅ Usando últimas 5 transações otimizadas do backend:', ultimas5.length);
      return ultimas5;
    }

    // Fallback: filtrar localmente (lógica antiga)
    console.log('⚠️ Usando fallback: filtrando transações localmente');
    // First, filter out future transactions
    const executedTransactions = transactions.filter(transaction => !isFutureTransaction(transaction));

    // Then sort by data_registro (most recent first) and take only 5
    return executedTransactions
      .sort((a, b) => {
        const dateA = new Date(a.data_registro || '').getTime();
        const dateB = new Date(b.data_registro || '').getTime();

        if (dateB !== dateA) {
          return dateB - dateA; // Descending order: most recent data_registro first
        }

        // Fallback: if data_registro is the same, use data_agendamento_pagamento
        const pagamentoA = new Date(a.data_agendamento_pagamento || '').getTime();
        const pagamentoB = new Date(b.data_agendamento_pagamento || '').getTime();
        return pagamentoB - pagamentoA;
      })
      .slice(0, 5); // Exactly 5 most recent transactions
  }, [transactions, ultimas5]);

  const formatDate = (dateString?: string) => {
    return formatDateBR(dateString);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-card p-6">
        <div className="grid grid-cols-3 items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#004417]">Transações Recentes</h3>
          </div>
          <div></div>
          <div className="flex items-center justify-end space-x-2 text-[#004417]/65">
            <CheckCircle className="w-4 h-4 text-[#00A651]" />
              <span className="text-sm text-right font-medium">Últimas {recentTransactions.length} transações</span>
          </div>
        </div>
        
        <div className="space-y-4">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-[#004417]/70">
              <div className="flex items-center space-x-2 text-[#00A651]">
                <p>Nenhuma transação executada encontrada</p>
                <p className="text-sm">Registre transações via WhatsApp do ZÉ</p>
              </div>
            </div>
          ) : (
            recentTransactions.map((transaction, idx) => {
              const isIncome = Number(transaction.valor) > 0;
              
              return (
                <div key={transaction.id_transacao}>
                  <div className="relative p-4 rounded-xl bg-white transition-all duration-200 hover:scale-[1.01]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3 pr-8">
                      {isIncome ? (
                        <TrendingUp className="w-5 h-5 text-[#00A651]" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-[#F7941F]" />
                      )}
                      <div>
                        <h4 className="font-semibold text-[#004417]">{transaction.descricao}</h4>
                        {transaction.pagador_recebedor && (
                          <p className="text-sm text-[#004417]/65 font-medium">{transaction.pagador_recebedor}</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                      isIncome ? 'bg-[rgba(0,166,81,0.08)] text-[#00A651]' : 'bg-[rgba(247,148,31,0.08)] text-[#F7941F]'
                    }`}>
                      {isIncome ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-[#004417]/65 font-medium">Valor:</span>
                      <p className={`font-bold ${
                        isIncome ? 'text-[#00A651]' : 'text-[#F7941F]'
                      }`}>
                        {FinanceService.formatCurrency(Math.abs(Number(transaction.valor)))}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#004417]/65 font-medium">Categoria:</span>
                      <p className="font-semibold text-[#004417]">{transaction.categoria || 'Sem categoria'}</p>
                    </div>
                    <div>
                      <span className="text-[#004417]/65 font-medium">Data de pagamento:</span>
                      <p className="font-semibold text-[#004417]">
                        {FinanceService.formatDataPagamento(String(transaction.data_agendamento_pagamento || transaction.data_transacao || ''))}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#004417]/65 font-medium">Talhão:</span>
                      <p className="font-semibold text-[#004417]">{transaction.nome_talhao || 'Sem talhão específico'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#004417]/65 font-medium">Forma de pagamento:</span>
                      <p className="font-semibold text-[#004417]">{transaction.forma_pagamento_recebimento || 'Não informado'}</p>
                    </div>
                    {/* Campo Parcela - só aparece se tiver valor */}
                    {transaction.parcela && (
                      <div className="col-span-2">
                        <p className="font-semibold text-[#004417]"><span className="text-[#004417]/65 font-medium">Parcela: </span>{transaction.parcela}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Botão de anexo */}
                  <div className="flex justify-between items-center mt-3">
                    {/* Informação de lançamento para transações futuras */}
                    {transaction.data_registro && (
                      <div className="text-xs text-[#004417]/65 font-medium flex-shrink-0">
                        Lançado em {new Date(transaction.data_registro).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    )}
                    {/* Espaçador quando não há informação de lançamento */}
                    {!transaction.data_registro && <div className="flex-1"></div>}
                    
                    <button
                      onClick={() => openAttachmentModal(
                        transaction.id_transacao || '',
                        transaction.descricao || 'Transação'
                      )}
                      className="p-2 text-[#004417]/65 hover:text-[#00A651] hover:bg-white rounded-lg transition-colors border-0 flex-shrink-0"
                      title="Gerenciar anexo"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>
                  </div>

                  {/* Divider between items (except last) */}
                  {idx < recentTransactions.length - 1 && (
                    <div className="h-[1px] bg-[rgba(0,68,23,0.06)] my-3 mx-1 rounded-sm" />
                  )}
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