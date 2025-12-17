import { DividaFinanciamento } from '../../services/dividasFinanciamentosService';
import { ChevronRight } from 'lucide-react';

interface DividaCardProps {
  divida: DividaFinanciamento;
  onViewDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onLiquidar: (id: string) => void;
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

const renderField = (label: string, value?: string | number | null) => {
  if (!value) return null;
  return (
    <div className="mb-3">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
};

export default function DividaCard({
  divida,
  onViewDetails,
  onEdit,
  onLiquidar,
}: DividaCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      {/* Header com título e badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{divida.nome}</h3>
          <p className="text-sm text-gray-600 mt-1">{divida.credor}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ml-2 ${getSituacaoBadgeColor(divida.situacao)}`}>
          {divida.situacao}
        </span>
      </div>

      {/* Campos exibidos (ocultando os vazios) */}
      <div className="space-y-2 mb-5 pb-4 border-b border-gray-100">
        {renderField('Tipo', divida.tipo)}
        {renderField('Data da Contratação', divida.data_contratacao)}
        {renderField('Valor Contratado', `R$ ${divida.valor_contratado.toLocaleString('pt-BR')}`)}
        {renderField('Taxa', divida.taxa)}
        {renderField('Carência', divida.carencia)}
        {renderField('Garantia', divida.garantia)}
        {renderField('Responsável', divida.responsavel)}
        {renderField('Observações', divida.observacoes)}
      </div>

      {/* Forma de pagamento */}
      {(divida.forma_pagamento ||
        divida.pagamento_parcelado?.numParcelas ||
        divida.pagamento_parcela?.valor ||
        divida.pagamento_producao?.quantidadeSacas) && (
        <div className="mb-5 pb-4 border-b border-gray-100">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">Forma de Pagamento</p>

          {divida.forma_pagamento && (
            <div className="mb-2 p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-medium">
                {divida.forma_pagamento}
              </p>
            </div>
          )}

          {divida.pagamento_parcelado?.numParcelas > 0 && divida.pagamento_parcelado?.valorParcela > 0 && (
            <div className="mb-2 p-2 bg-gray-100 rounded-lg">
              <p className="text-xs text-gray-700 font-medium">
                {divida.pagamento_parcelado.numParcelas}x R$ {divida.pagamento_parcelado.valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {divida.pagamento_parcela?.valor > 0 && (
            <div className="mb-2 p-2 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 font-medium">
                Parcela Única: R$ {divida.pagamento_parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {divida.pagamento_producao?.quantidadeSacas > 0 && (
            <div className="p-2 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-600 font-medium">
                {divida.pagamento_producao.quantidadeSacas} sacas de {divida.pagamento_producao.produto}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(divida.id)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          Ver detalhes
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onEdit(divida.id)}
          className="flex-1 px-3 py-2 bg-[#00A651] hover:bg-[#008c44] rounded-lg text-sm font-medium text-white transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => onLiquidar(divida.id)}
          className="flex-1 px-3 py-2 border border-[#F7941F] bg-orange-50 hover:bg-orange-100 rounded-lg text-sm font-medium text-[#F7941F] transition-colors"
        >
          Liquidar
        </button>
      </div>
    </div>
  );
}
