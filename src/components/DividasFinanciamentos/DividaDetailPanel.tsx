import { DividaFinanciamento } from '../../services/dividasFinanciamentosService';
import { X, Edit2, Trash2, CheckCircle } from 'lucide-react';

interface DividaDetailPanelProps {
  divida: DividaFinanciamento | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onLiquidar: (id: string) => void;
  onDelete: (id: string) => void;
}

const getSituacaoBadgeColor = (situacao: string) => {
  switch (situacao) {
    case 'Ativa':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'Liquidada':
      return 'bg-green-50 text-[#00A651] border border-green-200';
    case 'Renegociada':
      return 'bg-orange-50 text-[#F7941F] border border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

const DetailField = ({ label, value }: { label: string; value?: string | number | null }) => {
  if (!value) return null;
  return (
    <div className="mb-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
};

export default function DividaDetailPanel({
  divida,
  isOpen,
  onClose,
  onEdit,
  onLiquidar,
  onDelete,
}: DividaDetailPanelProps) {
  if (!isOpen || !divida) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right-96">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{divida.nome}</h2>
            <p className="text-sm text-gray-600 mt-1">{divida.credor}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getSituacaoBadgeColor(divida.situacao)}`}>
              {divida.situacao}
            </span>
          </div>

          {/* Informações Básicas */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
              Informações Básicas
            </h3>
            <DetailField label="Tipo" value={divida.tipo} />
            <DetailField label="Credor" value={divida.credor} />
            <DetailField label="Data da Contratação" value={divida.data_contratacao} />
            <DetailField label="Responsável" value={divida.responsavel} />
          </div>

          {/* Valores e Taxas */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
              Valores e Taxas
            </h3>
            <DetailField
              label="Valor Contratado"
              value={`R$ ${divida.valor_contratado.toLocaleString('pt-BR')}`}
            />
            <DetailField label="Taxa" value={divida.taxa} />
            <DetailField label="Carência" value={divida.carencia} />
          </div>

          {/* Garantias e Pagamento */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
              Garantias e Pagamento
            </h3>
            <DetailField label="Garantia" value={divida.garantia} />
            <DetailField label="Forma de Pagamento" value={divida.forma_pagamento} />
          </div>

          {/* Observações */}
          {divida.observacoes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Observações
              </h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {divida.observacoes}
              </p>
            </div>
          )}

          {/* Cronograma de Pagamento */}
          {(divida.pagamento_parcelado?.numParcelas ||
            divida.pagamento_parcela?.valor ||
            divida.pagamento_producao?.quantidadeSacas) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Cronograma de Pagamento
              </h3>
              {divida.pagamento_parcelado?.numParcelas && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 mb-3">
                  <p className="text-sm text-gray-700">
                    <strong>Parcelado:</strong> {divida.pagamento_parcelado.numParcelas} parcelas de R${' '}
                    {divida.pagamento_parcelado.valorParcela.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  {divida.pagamento_parcelado.primeiradata && (
                    <p className="text-sm text-gray-600">
                      Primeira parcela: {divida.pagamento_parcelado.primeiradata}
                    </p>
                  )}
                </div>
              )}
              {divida.pagamento_parcela?.valor && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-2 mb-3">
                  <p className="text-sm text-gray-700">
                    <strong>Parcela Única:</strong> R${' '}
                    {divida.pagamento_parcela.valor.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  {divida.pagamento_parcela.data && (
                    <p className="text-sm text-gray-600">
                      Data: {divida.pagamento_parcela.data}
                    </p>
                  )}
                </div>
              )}
              {divida.pagamento_producao?.quantidadeSacas && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <p className="text-sm text-gray-700">
                    <strong>Com Produção:</strong> {divida.pagamento_producao.quantidadeSacas} sacas de{' '}
                    {divida.pagamento_producao.produto}
                  </p>
                  {divida.pagamento_producao.precoPorSaca && (
                    <p className="text-sm text-gray-600">
                      Preço: R$ {divida.pagamento_producao.precoPorSaca.toLocaleString('pt-BR')} / saca
                    </p>
                  )}
                  {divida.pagamento_producao.dataPeriodo && (
                    <p className="text-sm text-gray-600">
                      Período: {divida.pagamento_producao.dataPeriodo}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Anexos */}
          {divida.anexos && divida.anexos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Anexos
              </h3>
              <div className="space-y-2">
                {divida.anexos.map((anexo, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="w-5 h-5 bg-gray-300 rounded flex items-center justify-center text-xs font-bold text-gray-700">
                      📄
                    </div>
                    {anexo}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer com botões */}
        <div className="border-t border-gray-100 p-4 space-y-2">
          <button
            onClick={() => {
              onEdit(divida.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={() => {
              onLiquidar(divida.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#F7941F] bg-orange-50 hover:bg-orange-100 text-[#F7941F] rounded-lg font-medium transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Liquidar
          </button>
          <button
            onClick={() => {
              onDelete(divida.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>
    </>
  );
}
