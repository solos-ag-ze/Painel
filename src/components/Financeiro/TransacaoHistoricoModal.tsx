import { useEffect, useState } from 'react';
import { X, Clock, ArrowRight, CheckCircle } from 'lucide-react';

// ícone customizado do WhatsApp (não existe em lucide-react padrão)
const WhatsAppIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

import {
  HistoricoTransacoesService,
  HistoricoEdicaoFormatado,
} from '../../services/historicoTransacoesService';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import { formatSmartCurrency } from '../../lib/currencyFormatter';
import { formatDateBR, parseDateFromDB } from '../../lib/dateUtils';

interface TransacaoHistoricoModalProps {
  isOpen: boolean;
  onClose: () => void;
  idTransacao: string;
}

export default function TransacaoHistoricoModal({
  isOpen,
  onClose,
  idTransacao,
}: TransacaoHistoricoModalProps) {
  const [historico, setHistorico] = useState<HistoricoEdicaoFormatado[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar histórico quando o modal abre
  useEffect(() => {
    if (isOpen && idTransacao) {
      loadHistorico();
    }
  }, [isOpen, idTransacao]);

  const loadHistorico = async () => {
    setLoading(true);
    try {
      const dados = await HistoricoTransacoesService.getHistoricoFormatado(idTransacao);
      setHistorico(dados);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDataHora = (data: Date): string => {
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Renderiza os dados completos da transação confirmada
  const renderDadosTransacao = (dados: Record<string, unknown>) => {
    const camposExibir = [
      { key: 'tipo_transacao', label: 'Tipo' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'valor', label: 'Valor', format: (v: unknown) => formatSmartCurrency(Number(v) || 0) },
      { key: 'categoria', label: 'Categoria' },
      { key: 'data_transacao', label: 'Data', format: (v: unknown) => v ? formatDateBR(parseDateFromDB(String(v))) : '-' },
      { key: 'pagador_recebedor', label: 'Pagador/Recebedor' },
      { key: 'forma_pagamento_recebimento', label: 'Forma de Pagamento' },
      { key: 'status', label: 'Status' },
      { key: 'nome_talhao', label: 'Talhão' },
    ];

    return (
      <div className="grid grid-cols-2 gap-2">
        {camposExibir.map(({ key, label, format }) => {
          const valor = dados[key];
          if (valor === null || valor === undefined || valor === '') return null;
          const valorFormatado = format ? format(valor) : String(valor);
          return (
            <div key={key} className="bg-white rounded-md p-2 border border-gray-100">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-medium text-[#004417]">{valorFormatado}</p>
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  // Agrupa histórico: edições (mais recentes → antigas), confirmações, lançamentos (último)
  const criacoes = historico.filter((h) => h.isCriacao);
  const confirmacoes = historico.filter((h) => h.isConfirmacao);
  const edicoes = historico.filter((h) => !h.isCriacao && !h.isConfirmacao);

  const edicoesOrdenadas = [...edicoes].sort((a, b) => a.editadoEm.getTime() - b.editadoEm.getTime());
  const confirmacoesOrdenadas = [...confirmacoes].sort((a, b) => b.editadoEm.getTime() - a.editadoEm.getTime());
  const criacoesOrdenadas = [...criacoes].sort((a, b) => a.editadoEm.getTime() - b.editadoEm.getTime()); // mais antigas primeiro

  const timeline = [...criacoesOrdenadas, ...confirmacoesOrdenadas,...edicoesOrdenadas];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-[#004417]">
              Histórico de Edições
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6" data-modal-content>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : historico.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Esta transação não possui histórico de edições
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  As edições futuras serão registradas aqui
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Timeline vertical */}
                {timeline.map((edicao, index) => (
                  <div key={edicao.id} className="relative">
                    {/* Linha conectora (exceto último item) */}
                    {index < timeline.length - 1 && (
                      <div className="absolute left-[15px] top-[40px] w-[2px] h-[calc(100%+24px)] bg-gray-200" />
                    )}

                    <div className="flex gap-4">
                      {/* Ícone de timeline */}
                      <div className={`flex-shrink-0 w-8 h-8 ${edicao.isCriacao ? 'bg-[#25D366]' : edicao.isConfirmacao ? 'bg-[#86b646]' : 'bg-[#00A651]'} rounded-full flex items-center justify-center relative z-10`}>
                        {edicao.isCriacao ? (
                          <div className="text-white"><WhatsAppIcon /></div>
                        ) : edicao.isConfirmacao ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Clock className="w-4 h-4 text-white" />
                        )}
                      </div>

                      {/* Card de edição */}
                      <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
                        {/* Cabeçalho da edição */}
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-[#004417]">
                              {edicao.isCriacao ? 'Lançado' : edicao.isConfirmacao ? 'Confirmado' : 'Editado'} em {formatDataHora(edicao.editadoEm)}
                            </p>
                        </div>

                        {/* Conteúdo: dados da transação (confirmação) ou lista de alterações */}
                        {edicao.isConfirmacao && edicao.dadosTransacao ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Transação confirmada com os seguintes dados:</p>
                            {renderDadosTransacao(edicao.dadosTransacao)}
                          </div>
                        ) : edicao.isCriacao && edicao.dadosTransacao ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Lançamento original (chegou via WhatsApp):</p>
                            {renderDadosTransacao(edicao.dadosTransacao)}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {edicao.alteracoes.map((alteracao, altIndex) => (
                              <div
                                key={altIndex}
                                className="bg-white rounded-md p-3 border border-gray-100"
                              >
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                  {alteracao.campo}
                                </p>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-600 line-through">
                                    {String(alteracao.valorAnterior)}
                                  </span>
                                  <ArrowRight className="w-4 h-4 text-[#00A651] flex-shrink-0" />
                                  <span className="text-[#004417] font-semibold">
                                    {String(alteracao.valorNovo)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-white bg-[#00A651] rounded-lg hover:bg-[#00A651]/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
