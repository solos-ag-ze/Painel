import { Ocorrencia } from './mockOcorrencias';
import { ChevronRight, Edit2, CheckCircle } from 'lucide-react';
import { formatDateBR } from '../../lib/dateUtils';

interface OcorrenciaCardProps {
  ocorrencia: Ocorrencia;
  onViewDetails: (ocorrencia: Ocorrencia) => void;
  onEdit: (ocorrencia: Ocorrencia) => void;
  onMarkResolved: (ocorrencia: Ocorrencia) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Nova':
      return 'bg-[#F7941F] bg-opacity-20 text-[#F7941F]';
    case 'Em acompanhamento':
      return 'bg-[#CADB2A] bg-opacity-30 text-[#004417]';
    case 'Resolvida':
      return 'bg-[#00A651] bg-opacity-20 text-[#004417]';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const renderField = (label: string, value?: string | null) => {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs text-gray-600">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
    </div>
  );
};

export default function OcorrenciaCard({
  ocorrencia,
  onViewDetails,
  onEdit,
  onMarkResolved,
}: OcorrenciaCardProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      {/* Topo: Foto + Título + Tags */}
      <div className="flex gap-3 mb-3">
        {/* Foto Miniatura */}
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-3xl">
          {ocorrencia.fotoPrincipal || '📋'}
        </div>

        {/* Título e Subtítulo */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {ocorrencia.nomePraga || 'Ocorrência sem identificação'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {ocorrencia.talhao} – {formatDateBR(ocorrencia.dataOcorrencia)}
          </p>

          {/* Tags */}
          <div className="flex gap-1 mt-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(ocorrencia.status)}`}>
              {ocorrencia.status}
            </span>
          </div>
        </div>
      </div>

      {/* Corpo: Campos principais */}
      <div className="space-y-1.5 mb-3 pb-3 border-b border-gray-100 text-xs">
        {renderField('Tipo', ocorrencia.tipoOcorrencia)}
        {renderField('Fase', ocorrencia.faseLavoura)}
        {renderField('Severidade', ocorrencia.severidade)}
        {renderField('Área afetada', ocorrencia.areaAfetada)}
        {ocorrencia.sintomas && (
          <div className="flex gap-2">
            <span className="font-medium text-gray-600">Sintomas:</span>
            <span className="text-gray-600 line-clamp-1">{ocorrencia.sintomas}</span>
          </div>
        )}
        {ocorrencia.acaoTomada && (
          <div className="flex gap-2">
            <span className="font-medium text-gray-600">Ação:</span>
            <span className="text-gray-600 line-clamp-1">{ocorrencia.acaoTomada}</span>
          </div>
        )}
      </div>

      {/* Rodapé: Botões */}
      {isMobile ? (
        <button
          onClick={() => onViewDetails(ocorrencia)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg text-sm font-medium transition-colors"
        >
          Ver detalhes
          <ChevronRight className="w-4 h-4" />
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => onViewDetails(ocorrencia)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-medium text-gray-700 transition-colors"
          >
            Ver
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => onEdit(ocorrencia)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Edit2 className="w-3 h-3" />
            Editar
          </button>
          {ocorrencia.status !== 'Resolvida' && (
            <button
              onClick={() => onMarkResolved(ocorrencia)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 hover:bg-[#00A651] hover:bg-opacity-10 text-[#00A651] rounded-lg text-xs font-medium transition-colors"
            >
              <CheckCircle className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
