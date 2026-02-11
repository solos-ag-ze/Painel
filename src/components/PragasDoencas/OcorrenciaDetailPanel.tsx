import { useState, useEffect, useRef } from 'react';
import { AuthService } from '../../services/authService';
import { UserService } from '../../services/userService';
import { Ocorrencia } from './mockOcorrencias';
import { X, Edit2, CheckCircle, Trash2, RefreshCw, Loader2, AlertCircle, Download } from 'lucide-react';
import { formatDateBR } from '../../lib/dateUtils';
import ImageViewerModal from './ImageViewerModal';
import { supabase } from '../../lib/supabase';
import { PragasDoencasService } from '../../services/pragasDoencasService';

// Ícone do WhatsApp como componente
const WhatsAppIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Detecta se está no WebView do WhatsApp ou outro in-app browser
const isInAppBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /WhatsApp|FBAN|FBAV|Instagram|Line|Twitter|Snapchat/i.test(ua);
};

interface OcorrenciaDetailPanelProps {
  ocorrencia: Ocorrencia | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (ocorrencia: Ocorrencia) => void;
  onMarkResolved: (ocorrencia: Ocorrencia) => void;
  onDelete: (id: number) => void;
  onFileUpdated?: (ocorrencia: Ocorrencia) => void;
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
  onFileUpdated,
}: OcorrenciaDetailPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemovingFile, setIsRemovingFile] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [showBrowserWarning, setShowBrowserWarning] = useState(false);
  const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const rawFp = ocorrencia?.fotoPrincipal;
    const fp = typeof rawFp === 'string' ? rawFp.trim() : rawFp;
    const currentUser = AuthService.getInstance().getCurrentUser();
    const myUserId = currentUser?.user_id;

    // Extrair path do storage (aceita path relativo, signed URL, URL pública)
    const storagePath = PragasDoencasService.extractStoragePath(fp);
    if (!storagePath) {
      setImageSrc(null);
      setImagePath(null);
      return;
    }

    // Gerar signed URL via service (aceita qualquer formato)
    (async () => {
      const signedUrl = await PragasDoencasService.getSignedUrl(fp, 3600, myUserId);
      if (mounted) {
        if (signedUrl) {
          setImageSrc(signedUrl);
          setImagePath(storagePath.includes('/') ? storagePath : (myUserId ? `${myUserId}/${storagePath}` : storagePath));
        } else {
          setImageSrc(null);
          setImagePath(null);
        }
      }
    })();

    return () => { mounted = false; };
  }, [ocorrencia]);

  // Substituir imagem da ocorrência
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ocorrencia) return;

    // Validar tamanho (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    // Validar tipo (apenas imagens)
    if (!file.type.startsWith('image/')) {
      alert('Apenas imagens são permitidas');
      return;
    }

    setIsUploadingFile(true);
    try {
      const currentUser = AuthService.getInstance().getCurrentUser();
      const userId = currentUser?.user_id;
      if (!userId) {
        alert('Usuário não autenticado');
        return;
      }

      let newPath: string | null = null;

      if (imagePath) {
        // Substituir imagem existente
        newPath = await PragasDoencasService.replaceImage(file, imagePath, ocorrencia.id, userId);
      } else {
        // Upload nova imagem
        newPath = await PragasDoencasService.uploadImage(file, ocorrencia.id, userId);
        if (newPath) {
          // Atualizar banco com novo path
          await supabase
            .from('pragas_e_doencas')
            .update({ foto_principal: newPath })
            .eq('id', ocorrencia.id);
        }
      }

      if (newPath) {
        // Atualizar preview
        const signedUrl = await PragasDoencasService.getSignedUrl(newPath, 3600, userId);
        setImageSrc(signedUrl);
        setImagePath(newPath);

        // Notificar componente pai
        if (onFileUpdated) {
          onFileUpdated({
            ...ocorrencia,
            fotoPrincipal: newPath,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao substituir imagem:', error);
      alert('Erro ao substituir imagem. Tente novamente.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remover imagem da ocorrência
  const handleRemoveFile = async () => {
    if (!ocorrencia || !imagePath) return;
    setIsRemovingFile(true);
    try {
      const success = await PragasDoencasService.deleteImage(imagePath, ocorrencia.id);
      if (success) {
        setImageSrc(null);
        setImagePath(null);
        if (onFileUpdated) {
          onFileUpdated({
            ...ocorrencia,
            fotoPrincipal: undefined,
          });
        }
      }
    } catch (err) {
      console.error('Erro ao remover imagem:', err);
    } finally {
      setIsRemovingFile(false);
      setShowRemoveConfirm(false);
    }
  };

  // Download da imagem via signed URL (mesma lógica do ImageViewerModal)
  const handleDownload = async () => {
    if (!imageSrc) return;

    setIsDownloading(true);
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileName = imagePath?.split('/').pop() || 'imagem.jpg';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (error) {
      console.error('Erro ao baixar:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Abre URL no navegador externo
  const openInExternalBrowser = () => {
    if (!pendingDownloadUrl) return;
    
    const link = document.createElement('a');
    link.href = pendingDownloadUrl;
    link.target = '_system';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      setShowBrowserWarning(false);
      setPendingDownloadUrl(null);
    }, 1000);
  };

  // Enviar imagem para o WhatsApp do usuário (mesma lógica do ImageViewerModal)
  const handleEnviarWhatsApp = async () => {
    if (!imageSrc) return;

    setIsSendingWhatsApp(true);
    try {
      const userId = AuthService.getInstance().getCurrentUser()?.user_id;
      if (!userId) {
        setIsSendingWhatsApp(false);
        return;
      }
      const usuario = await UserService.getUserById(userId);
      if (!usuario?.telefone) {
        setIsSendingWhatsApp(false);
        return;
      }
      const fileName = imagePath?.split('/').pop() || 'imagem';
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
      const payload = {
        telefone: usuario.telefone.replace(/\D/g, ''),
        arquivo_url: imageSrc,
        titulo: ocorrencia?.nomePraga || 'Imagem de Praga/Doença',
        tipo_arquivo: isImage ? 'image' : 'document',
        mime_type: isImage ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'application/octet-stream',
        nome_arquivo: fileName
      };
      const isDev = import.meta.env.MODE === 'development' ||
        (typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
      const webhookUrl = isDev
        ? '/api/whatsapp/enviar-documento-whatsapp'
        : import.meta.env.VITE_WHATSAPP_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('[PragasDoencas][WhatsApp] Webhook URL não configurada');
        return;
      }
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (!isOpen || !ocorrencia) return null;

  // Modal de confirmação de remoção de imagem
  if (showRemoveConfirm) {
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-30 z-[60]" onClick={() => setShowRemoveConfirm(false)} />
        <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-[#F7941F] mb-3" />
            <h3 className="text-lg font-bold text-[#004417] mb-2 text-center">
              Remover imagem?
            </h3>
            <p className="text-sm text-center mb-4 text-[#004417]/70">
              A imagem será removida desta ocorrência. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 mt-2 w-full">
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-white text-[#004417] hover:bg-[rgba(0,68,23,0.03)] font-medium transition-colors border border-gray-200"
                onClick={() => setShowRemoveConfirm(false)}
                disabled={isRemovingFile}
              >
                Cancelar
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-[#F7941F]/10 text-[#F7941F] hover:bg-[#F7941F]/20 font-medium transition-colors flex items-center justify-center gap-2"
                onClick={handleRemoveFile}
                disabled={isRemovingFile}
              >
                {isRemovingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Remover
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Modal de aviso para abrir no navegador
  if (showBrowserWarning && pendingDownloadUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🌐</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Abrir no navegador
            </h3>
            <p className="text-sm text-gray-600">
              Para baixar esta imagem, você precisa abrir no navegador do seu celular (Safari ou Chrome).
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={openInExternalBrowser}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#004417] hover:bg-[#003015] text-white rounded-lg font-medium transition-colors text-sm"
            >
              Abrir no navegador
            </button>
            
            <button
              onClick={() => {
                if (navigator.clipboard && pendingDownloadUrl) {
                  navigator.clipboard.writeText(pendingDownloadUrl);
                  alert('Link copiado! Cole no navegador para baixar.');
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
            >
              Copiar link
            </button>
            
            <button
              onClick={() => {
                setShowBrowserWarning(false);
                setPendingDownloadUrl(null);
              }}
              className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 font-medium transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          {/* Input oculto para upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="replace-image-input"
          />

          {/* Foto Principal */}
          {ocorrencia.fotoPrincipal && (
            <div>
              <p className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium uppercase tracking-wide mb-2">Foto Principal</p>
              <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center text-5xl overflow-hidden relative">
                {isUploadingFile ? (
                  <Loader2 className="w-8 h-8 text-[#004417] animate-spin" />
                ) : imageSrc ? (
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
              {/* Botões de substituir e remover imagem */}
              <div className="mt-2 flex items-center justify-center gap-4">
                <label
                  htmlFor="replace-image-input"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#00A651] hover:text-[#008a44] hover:bg-[#00A651]/5 rounded-lg cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Substituir
                </label>
                <button
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[#F7941F] hover:text-[#e07d0d] hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </button>
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
          {/* Mobile: Botão Enviar no WhatsApp */}
          {ocorrencia.fotoPrincipal && (
            <button
              onClick={handleEnviarWhatsApp}
              disabled={isSendingWhatsApp || !imageSrc}
              className="w-full flex items-center justify-center gap-1 px-3 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-medium transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed md:hidden"
            >
              {isSendingWhatsApp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <WhatsAppIcon />
                  <span>Enviar Imagem</span>
                </>
              )}
            </button>
          )}

          {/* Desktop: Botão Baixar */}
          {ocorrencia.fotoPrincipal && (
            <button
              onClick={handleDownload}
              disabled={isDownloading || !imageSrc}
              className="hidden w-full items-center justify-center gap-2 px-4 py-3 bg-[#004417] hover:bg-[#003015] text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed md:flex"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Baixar
                </>
              )}
            </button>
          )}

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
          imagePath={imagePath || undefined}
          ocorrenciaId={ocorrencia.id}
          ocorrenciaNome={ocorrencia.nomePraga}
          onClose={() => setIsImageViewerOpen(false)}
          altText={`Foto: ${ocorrencia.nomePraga || 'Ocorrência'}`}
        />
      )}
    </>
  );
}
