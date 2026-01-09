import { useState, useEffect } from 'react';
import { AuthService } from '../../services/authService';
import { Ocorrencia } from './mockOcorrencias';
import { ChevronRight, Edit2, CheckCircle } from 'lucide-react';
import { formatDateBR } from '../../lib/dateUtils';
import ImageViewerModal from './ImageViewerModal';
import { supabase } from '../../lib/supabase';

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
    <div className="flex gap-2 text-[13px] text-[rgba(0,68,23,0.75)]">
      <span className="font-semibold">{label}:</span>
      <span className="font-medium text-[#004417]">{value}</span>
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
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const rawFp = ocorrencia.fotoPrincipal;
    const fp = typeof rawFp === 'string' ? rawFp.trim() : rawFp;
    const currentUser = AuthService.getInstance().getCurrentUser();
    const myUserId = currentUser?.user_id;
    if (!fp) {
      setImageSrc(null);
      setImagePath(null);
      return;
    }

    // Função auxiliar para extrair path do storage a partir de uma URL
    const extractPathFromUrl = (url: string): string | null => {
      const bucketName = 'pragas_e_doencas';
      // Tenta extrair de URL de storage (public ou signed)
      const publicMarker = `/storage/v1/object/public/${bucketName}/`;
      const objMarker = `/storage/v1/object/${bucketName}/`;
      
      if (url.includes(publicMarker)) {
        const idx = url.indexOf(publicMarker) + publicMarker.length;
        return url.slice(idx).split('?')[0]; // Remove query params
      }
      if (url.includes(objMarker)) {
        const idx = url.indexOf(objMarker) + objMarker.length;
        return url.slice(idx).split('?')[0]; // Remove query params
      }
      return null;
    };

    if (typeof fp === 'string' && fp.startsWith('http')) {
      const publicMarker = '/storage/v1/object/public/';
      const objMarker = '/storage/v1/object/';
      
      // If it's explicitly a public storage URL, use it as-is
      if (fp.includes(publicMarker)) {
        const extractedPath = extractPathFromUrl(fp);
        console.log('[OcorrenciaCard] URL pública detectada, path extraído:', extractedPath);
        setImageSrc(fp);
        setImagePath(extractedPath);
        return;
      }

      // If it's a storage object URL (non-public), try to extract the object path
      if (fp.includes(objMarker)) {
        (async () => {
          try {
            const idx = fp.indexOf(objMarker) + objMarker.length;
            const after = fp.slice(idx); // e.g. 'pragas_e_doencas/11.jpg' or 'pragas_e_doencas/userId/11.jpg'
            const parts = after.split('/');
            // remove the bucket segment
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
                    if (mounted) {
                      console.log('[OcorrenciaCard] Signed URL gerada, path:', candidate);
                      setImageSrc(data.signedUrl);
                      setImagePath(candidate);
                    }
                    return;
                  }
                } catch (err) {
                  // continue
                }
              }
              // Fallback: usa a URL como está, mas extrai o path
              if (mounted) {
                const fallbackPath = extractPathFromUrl(fp) || key;
                console.log('[OcorrenciaCard] Fallback URL storage, path:', fallbackPath);
                setImageSrc(fp);
                setImagePath(fallbackPath);
              }
            }
          } catch (e) {
            // fallthrough to use fp as last resort
            const fallbackPath = extractPathFromUrl(fp);
            if (mounted) {
              console.log('[OcorrenciaCard] Erro, usando fallback path:', fallbackPath);
              setImageSrc(fp);
              setImagePath(fallbackPath);
            }
          }
        })();
        return;
      }

      // If it's an arbitrary HTTP URL (not public storage) we may not have access.
      // Use it as-is as a last resort so developer can see what's stored.
      console.log('[OcorrenciaCard] URL HTTP arbitrária, sem path extraível');
      setImageSrc(fp);
      setImagePath(null);
      return;
    }

    // Tenta gerar signed url localmente. Prioriza `${userId}/${fp}` quando aplicável,
    // depois tenta o fp na raiz.
    (async () => {
      const candidates: string[] = [];
      if (fp.includes('/')) candidates.push(fp);
      else {
        if (myUserId) candidates.push(`${myUserId}/${fp}`);
        candidates.push(fp);
      }

      for (const candidate of candidates) {
        try {
          const { data, error } = await supabase.storage
            .from('pragas_e_doencas')
            .createSignedUrl(candidate, 60);
          if (!error && data?.signedUrl) {
            if (mounted) {
              setImageSrc(data.signedUrl);
              setImagePath(candidate);
            }
            return;
          }
        } catch (err) {
          // continue para próxima candidate
        }
      }
      if (mounted) {
        setImageSrc(null);
        setImagePath(null);
      }
    })();

    return () => { mounted = false; };
  }, [ocorrencia.fotoPrincipal]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      {/* Topo: Foto + Título + Tags */}
      <div className="flex gap-3 mb-3">
        {/* Foto Miniatura */}
        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-3xl overflow-hidden">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Foto da ocorrência"
              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setIsImageViewerOpen(true);
              }}
            />
          ) : (
            <span>{ocorrencia.fotoPrincipal || '📋'}</span>
          )}
        </div>

        {/* Título e Subtítulo */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-[#004417] truncate">
            {ocorrencia.nomePraga || 'Ocorrência sem identificação'}
          </h3>
          <p className="text-xs text-[rgba(0,68,23,0.75)] font-medium mt-0.5">
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
      <div className="space-y-1.5 mb-3 pb-3 border-b border-[rgba(0,68,23,0.08)]">
        {renderField('Tipo', ocorrencia.tipoOcorrencia)}
        {renderField('Fase', ocorrencia.faseLavoura)}
        {renderField('Severidade', ocorrencia.severidade)}
        {renderField('Área afetada', ocorrencia.areaAfetada)}
        {ocorrencia.sintomas && (
          <div className="flex gap-2 text-[13px]">
            <span className="font-semibold text-[rgba(0,68,23,0.75)]">Sintomas:</span>
            <span className="font-medium text-[#004417] line-clamp-1">{ocorrencia.sintomas}</span>
          </div>
        )}
        {ocorrencia.acaoTomada && (
          <div className="flex gap-2 text-[13px]">
            <span className="font-semibold text-[rgba(0,68,23,0.75)]">Ação:</span>
            <span className="font-medium text-[#004417] line-clamp-1">{ocorrencia.acaoTomada}</span>
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

      {/* Image Viewer Modal */}
      {imageSrc && (
        <ImageViewerModal
          isOpen={isImageViewerOpen}
          imageUrl={imageSrc}
          imagePath={imagePath || undefined}
          ocorrenciaId={ocorrencia.id}
          ocorrenciaNome={ocorrencia.nomePraga}
          onClose={() => setIsImageViewerOpen(false)}
          onImageDeleted={() => {
            setImageSrc(null);
            setImagePath(null);
          }}
          onImageReplaced={(newPath, newUrl) => {
            console.log('[OcorrenciaCard] Imagem substituída:', { newPath, newUrl });
            setImagePath(newPath);
            setImageSrc(newUrl);
          }}
          altText={`Foto: ${ocorrencia.nomePraga || 'Ocorrência'}`}
        />
      )}
    </div>
  );
}
