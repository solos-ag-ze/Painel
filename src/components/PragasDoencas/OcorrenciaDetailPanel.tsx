import { useState, useEffect } from 'react';
import { AuthService } from '../../services/authService';
import { Ocorrencia } from './mockOcorrencias';
import { X, Edit2, CheckCircle, Trash2 } from 'lucide-react';
import { formatDateBR } from '../../lib/dateUtils';
import ImageViewerModal from './ImageViewerModal';
import { supabase } from '../../lib/supabase';

interface OcorrenciaDetailPanelProps {
  ocorrencia: Ocorrencia | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (ocorrencia: Ocorrencia) => void;
  onMarkResolved: (ocorrencia: Ocorrencia) => void;
  onDelete: (id: number) => void;
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

const DetailField = ({ label, value }: { label: string; value?: string | string[] | null }) => {
  if (!value) return null;

  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  return (
    <div className="mb-4">
      <p className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[13px] font-semibold text-[#004417]">{displayValue}</p>
    </div>
  );
};

export default function OcorrenciaDetailPanel({
  ocorrencia,
  isOpen,
  onClose,
  onEdit,
  onMarkResolved,
  onDelete,
}: OcorrenciaDetailPanelProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const rawFp = ocorrencia?.fotoPrincipal;
    const fp = typeof rawFp === 'string' ? rawFp.trim() : rawFp;
    const currentUser = AuthService.getInstance().getCurrentUser();
    const myUserId = currentUser?.user_id;
    if (!fp) {
      setImageSrc(null);
      return;
    }

    if (typeof fp === 'string' && fp.startsWith('http')) {
      const publicMarker = '/storage/v1/object/public/';
      const objMarker = '/storage/v1/object/';
      if (fp.includes(publicMarker)) {
        setImageSrc(fp);
        return;
      }

      if (fp.includes(objMarker)) {
        (async () => {
          try {
            const idx = fp.indexOf(objMarker) + objMarker.length;
            const after = fp.slice(idx);
            const parts = after.split('/');
            if (parts.length >= 2) {
              const key = parts.slice(1).join('/');
              const candidates: string[] = [];
              if (key.includes('/')) candidates.push(key);
              else {
                if (myUserId) candidates.push(`${myUserId}/${key}`);
                candidates.push(key);
              }

              for (const candidate of candidates) {
                try {
                  const { data, error } = await supabase.storage
                    .from('pragas_e_doencas')
                    .createSignedUrl(candidate, 60);
                  if (!error && data?.signedUrl) {
                    if (mounted) setImageSrc(data.signedUrl);
                    return;
                  }
                } catch (err) {
                  // continue
                }
              }
            }
          } catch (e) {
            // fallthrough
          }
        })();
      }

      setImageSrc(fp);
      return;
    }

    (async () => {
      const candidates: string[] = [];
      if (typeof fp === 'string' && fp.includes('/')) candidates.push(fp);
      else {
        if (myUserId) candidates.push(`${myUserId}/${fp}`);
        candidates.push(fp as string);
      }

      for (const candidate of candidates) {
        try {
          const { data, error } = await supabase.storage
            .from('pragas_e_doencas')
            .createSignedUrl(candidate, 60);
          if (!error && data?.signedUrl) {
            if (mounted) setImageSrc(data.signedUrl);
            return;
          }
        } catch (err) {
          // continua para próxima candidate
        }
      }
      if (mounted) setImageSrc(null);
    })();

    return () => { mounted = false; };
  }, [ocorrencia]);

  if (!isOpen || !ocorrencia) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-[rgba(0,68,23,0.08)] p-4 md:p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[#004417] mb-4">
              {ocorrencia.nomePraga || 'Ocorrência sem identificação'}
            </h2>
            <div className="flex gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(ocorrencia.status)}`}>
                {ocorrencia.status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[rgba(0,68,23,0.08)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#004417]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Foto Principal */}
          {ocorrencia.fotoPrincipal && (
            <div>
              <p className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium uppercase tracking-wide mb-2">Foto Principal</p>
              <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center text-5xl overflow-hidden">
                {imageSrc ? (
                        <img
                          src={imageSrc}
                    alt="Foto da ocorrência"
                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setIsImageViewerOpen(true)}
                  />
                ) : (
                  <span>{ocorrencia.fotoPrincipal}</span>
                )}
              </div>
            </div>
          )}

          {/* Informações Básicas */}
          <div>
            <h3 className="text-xl font-bold text-[#004417] mb-4">
              Informações Básicas
            </h3>
            <DetailField label="Talhão" value={ocorrencia.talhao} />
            <DetailField label="Data da Ocorrência" value={formatDateBR(ocorrencia.dataOcorrencia)} />
            <DetailField label="Fase da Lavoura" value={ocorrencia.faseLavoura} />
            <DetailField label="Tipo" value={ocorrencia.tipoOcorrencia} />
            <DetailField label="Severidade" value={ocorrencia.severidade} />
            <DetailField label="Área Afetada" value={ocorrencia.areaAfetada} />
          </div>

          {/* Observações e Sintomas */}
          <div>
            <h3 className="text-xl font-bold text-[#004417] mb-4">
              Observações
            </h3>
            <DetailField label="Sintomas Observados" value={ocorrencia.sintomas} />
            <DetailField label="Ação Tomada" value={ocorrencia.acaoTomada} />
          </div>

          {/* Diagnóstico e Detalhes */}
          {(ocorrencia.diagnostico || ocorrencia.descricaoDetalhada) && (
            <div>
              <h3 className="text-xl font-bold text-[#004417] mb-4">
                Diagnóstico
              </h3>
              <DetailField label="Confirmação" value={ocorrencia.diagnostico} />
              <DetailField label="Descrição Detalhada" value={ocorrencia.descricaoDetalhada} />
              <DetailField label="Clima Recente" value={ocorrencia.climaRecente} />
            </div>
          )}

          {/* Tratamento */}
          {(ocorrencia.produtosAplicados || ocorrencia.dataAplicacao || ocorrencia.recomendacoes) && (
            <div>
              <h3 className="text-xl font-bold text-[#004417] mb-4">
                Tratamento
              </h3>
              <DetailField label="Produtos Aplicados" value={ocorrencia.produtosAplicados} />
              <DetailField label="Data da Aplicação" value={ocorrencia.dataAplicacao ? formatDateBR(ocorrencia.dataAplicacao) : undefined} />
              <DetailField label="Recomendações" value={ocorrencia.recomendacoes} />
            </div>
          )}

          {/* Anexos */}
          {ocorrencia.anexos && ocorrencia.anexos.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-[#004417] mb-4">
                Anexos
              </h3>
              <div className="space-y-2">
                {ocorrencia.anexos.map((anexo, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-[rgba(0,68,23,0.02)] rounded-lg text-[13px] text-[#004417] font-medium hover:bg-[rgba(0,68,23,0.08)] cursor-pointer transition-colors border border-[rgba(0,68,23,0.08)]"
                  >
                    <div className="text-lg">
                      {anexo.endsWith('.pdf') ? '📄' : '🖼️'}
                    </div>
                    {anexo}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[rgba(0,68,23,0.08)] p-4 md:p-6 space-y-2">
          <button
            onClick={() => {
              onEdit(ocorrencia);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
          {ocorrencia.status !== 'Resolvida' && (
            <button
              onClick={() => {
                onMarkResolved(ocorrencia);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 hover:bg-[#00A651] hover:bg-opacity-10 text-[#00A651] rounded-lg font-medium transition-colors text-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Marcar como Resolvida
            </button>
          )}
          <button
            onClick={() => {
              onDelete(ocorrencia.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 hover:bg-[#F7941F] hover:bg-opacity-10 text-[#F7941F] rounded-lg font-medium transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {imageSrc && (
        <ImageViewerModal
          isOpen={isImageViewerOpen}
          imageUrl={imageSrc}
          onClose={() => setIsImageViewerOpen(false)}
          altText={`Foto: ${ocorrencia.nomePraga || 'Ocorrência'}`}
        />
      )}
    </>
  );
}
