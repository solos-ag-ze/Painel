import { useState, useEffect, useRef } from "react";
import { Documento } from "./mockDocumentos";
import { X, Download, Edit2, Trash2, Loader2, ImageIcon, ZoomIn, FileText, RefreshCw } from "lucide-react";
import { DocumentosService } from "../../services/documentosService";
import { AuthService } from "../../services/authService";
import { UserService } from "../../services/userService";

// Ícone do WhatsApp como componente para evitar warning de static flag
const WhatsAppIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface DocumentoDetailPanelProps {
  documento: Documento | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onFileUpdated?: (documento: Documento) => void;
}

const isImageFile = (extension: string): boolean => {
  return ["JPG", "JPEG", "PNG", "GIF", "WEBP", "BMP"].includes(extension.toUpperCase());
};

// Detecta se está no WebView do WhatsApp ou outro in-app browser
const isInAppBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /WhatsApp|FBAN|FBAV|Instagram|Line|Twitter|Snapchat/i.test(ua);
};

const getFileExtension = (arquivoUrl?: string): string => {
  if (!arquivoUrl) return "FILE";
  const fileName = arquivoUrl.split('/').pop() || "";
  const extension = fileName.split('.').pop() || "";
  return extension.toUpperCase();
};

const getFileTypeName = (extension: string): string => {
  const ext = extension.toUpperCase();
  if (ext === "PDF") return "Documento";
  if (["JPG", "JPEG", "PNG", "GIF", "WEBP", "BMP"].includes(ext)) return "Imagem";
  if (["DOC", "DOCX", "TXT", "RTF", "ODT"].includes(ext)) return "Documento";
  if (["XLS", "XLSX", "CSV", "ODS"].includes(ext)) return "Planilha";
  if (["PPT", "PPTX", "ODP"].includes(ext)) return "Apresentação";
  if (["ZIP", "RAR", "7Z"].includes(ext)) return "Arquivo compactado";
  return "Arquivo";
};



const getTypeColor = (tipo: string) => {
  switch (tipo) {
    case "Pessoal":
      return "bg-[#004417]/10 text-[#004417]";
    case "Cadastro da fazenda":
      return "bg-[#00A651]/10 text-[#004417]";
    case "Contratos":
      return "bg-[#397738]/10 text-[#397738]";
    case "Comprovantes de pagamento":
      return "bg-[#86b646]/15 text-[#004417]";
    case "Ambiental / ESG / EUDR":
      return "bg-[#00A651]/15 text-[#003015]";
    case "Técnico":
      return "bg-[#092f20]/10 text-[#092f20]";
    case "Outros":
      return "bg-gray-100 text-[#004417]";
    default:
      return "bg-gray-100 text-[#004417]";
  }
};

const MetadataField = ({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) => {
  if (!value) return null;
  return (
    <div className="mb-3">
      <p className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-[13px] font-semibold text-[#004417]">{value}</p>
    </div>
  );
};

export default function DocumentoDetailPanel({
  documento,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onFileUpdated,
}: DocumentoDetailPanelProps) {
  // IMPORTANTE: Todos os hooks devem vir ANTES de qualquer return condicional
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showBrowserWarning, setShowBrowserWarning] = useState(false);
  const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const fileExtension = documento ? getFileExtension(documento.arquivo_url) : 'FILE';
  const isImage = isImageFile(fileExtension);

  // Carrega preview da imagem quando o painel abre
  useEffect(() => {
    if (isOpen && isImage && documento?.arquivo_url) {
      setImageLoading(true);
      setImageError(false);
      
      DocumentosService.getSignedUrl(documento.arquivo_url, 600)
        .then((url) => {
          if (url) {
            setImagePreviewUrl(url);
          } else {
            setImageError(true);
          }
        })
        .catch(() => {
          setImageError(true);
        })
        .finally(() => {
          setImageLoading(false);
        });
    }
    
    // Limpa quando fecha
    return () => {
      setImagePreviewUrl(null);
      setImageError(false);
      setShowFullscreenModal(false);
      setPdfViewerUrl(null);
      setShowPdfViewer(false);
      setShowBrowserWarning(false);
      setPendingDownloadUrl(null);
    };
  }, [isOpen, documento?.arquivo_url, isImage]);

  // Return condicional APÓS todos os hooks
  if (!isOpen || !documento) return null;

  // Download de arquivos não-imagem via signed URL
  const handleDownload = async () => {
    if (!documento.arquivo_url) return;

    setIsDownloading(true);
    try {
      const signedUrl = await DocumentosService.getSignedUrl(documento.arquivo_url, 600);
      
      if (!signedUrl) {
        alert('Não foi possível preparar o download.');
        return;
      }

      // Se estiver em in-app browser (WhatsApp, Instagram, etc), mostra aviso
      if (isInAppBrowser()) {
        setPendingDownloadUrl(signedUrl);
        setShowBrowserWarning(true);
        setIsDownloading(false);
        return;
      }

      // Tenta download via fetch + blob
      try {
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error('Fetch failed');
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = documento.titulo || `documento.${fileExtension.toLowerCase()}`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch {
        // Fallback: mostra aviso para abrir no navegador
        setPendingDownloadUrl(signedUrl);
        setShowBrowserWarning(true);
      }
      
    } catch (error) {
      console.error('Erro ao baixar:', error);
      alert('Erro ao baixar o arquivo. Tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Abre URL no navegador externo (funciona melhor que window.open em alguns casos)
  const openInExternalBrowser = () => {
    if (!pendingDownloadUrl) return;
    
    // Tenta forçar abertura no navegador externo
    const link = document.createElement('a');
    link.href = pendingDownloadUrl;
    link.target = '_system'; // Para Cordova/apps híbridos
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Fecha o modal após um delay
    setTimeout(() => {
      setShowBrowserWarning(false);
      setPendingDownloadUrl(null);
    }, 1000);
  };

  // Enviar arquivo para o WhatsApp do usuário via webhook n8n
  const handleEnviarWhatsApp = async () => {
    if (!documento?.id || !documento.arquivo_url) return;

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

      await DocumentosService.sendToWhatsApp(documento.id, usuario.telefone);
      // Não exibe alertas de sucesso ou erro
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      // Não exibe alertas
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Substituir arquivo do documento
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !documento) return;

    // Validar tamanho (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    setIsUploadingFile(true);
    try {
      const userId = AuthService.getInstance().getCurrentUser()?.user_id;
      if (!userId) {
        alert('Usuário não autenticado');
        return;
      }

      // Upload do novo arquivo
      const arquivoUrl = await DocumentosService.uploadFile(file, userId);
      
      // Atualizar documento no banco
      const documentoAtualizado = await DocumentosService.update(documento.id, {
        arquivo_url: arquivoUrl,
        titulo: documento.titulo || file.name,
      });

      if (documentoAtualizado && onFileUpdated) {
        onFileUpdated(documentoAtualizado);
        // Recarrega preview se for imagem
        if (isImageFile(getFileExtension(arquivoUrl))) {
          setImageLoading(true);
          const url = await DocumentosService.getSignedUrl(arquivoUrl, 600);
          setImagePreviewUrl(url);
          setImageLoading(false);
        }
      }
    } catch (error) {
      console.error('Erro ao substituir arquivo:', error);
      alert('Erro ao substituir arquivo. Tente novamente.');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
              Para baixar este arquivo, você precisa abrir no navegador do seu celular (Safari ou Chrome).
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
                // Copia o link
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

  // Modal visualizador de PDF
  if (showPdfViewer && pdfViewerUrl) {
    return (
      <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col">
        {/* Header do modal */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2 flex-1 mr-4">
            <FileText className="w-5 h-5 text-white" />
            <p className="text-white text-sm font-medium truncate">
              {documento.titulo || 'Documento PDF'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowPdfViewer(false);
              setPdfViewerUrl(null);
            }}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-100">
          <iframe
            src={pdfViewerUrl}
            className="w-full h-full border-0"
            title={documento.titulo || 'Visualizador de PDF'}
          />
        </div>

        {/* Footer com instrução */}
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-white text-sm font-medium">
              📄 Visualizando documento
            </p>
            <p className="text-white/70 text-xs mt-1">
              Use os controles do visualizador para navegar ou fazer zoom
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Modal Fullscreen para imagens
  if (showFullscreenModal && imagePreviewUrl) {
    return (
      <div 
        className="fixed inset-0 bg-black/95 z-[100] flex flex-col"
        onClick={() => setShowFullscreenModal(false)}
      >
        {/* Header do modal */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <p className="text-white text-sm font-medium truncate flex-1 mr-4">
            {documento.titulo || 'Imagem'}
          </p>
          <button
            onClick={() => setShowFullscreenModal(false)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Imagem centralizada */}
        <div 
          className="flex-1 flex items-center justify-center p-4 overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imagePreviewUrl}
            alt={documento.titulo || 'Documento'}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            style={{ touchAction: 'pinch-zoom' }}
          />
        </div>

        {/* Footer com instrução - apenas mobile */}
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent md:hidden">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-white text-sm font-medium">
              📲 Pressione e segure a imagem para salvar
            </p>
            <p className="text-white/70 text-xs mt-1">
              Ou faça captura de tela
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-[60] transition-opacity md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 !top-0 !bottom-0 !m-0 w-full md:w-96 bg-white shadow-2xl z-[70] flex flex-col overflow-hidden transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="border-b border-[rgba(0,68,23,0.08)] p-4 md:p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="font-semibold text-[#004417] break-words">
              {documento.titulo || 'Documento sem título'}
            </h2>
            <p className="text-xs md:text-sm text-[rgba(0,68,23,0.75)] font-medium mt-1">
              {fileExtension}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[rgba(0,68,23,0.05)] rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5 text-[rgba(0,68,23,0.5)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Input oculto para upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.csv,.zip,.rar"
            onChange={handleFileChange}
            className="hidden"
            id="replace-file-input"
          />

          {/* Preview */}
          {isImage ? (
            <div className="mb-6">
              <div
                className="bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative group"
                onClick={() => imagePreviewUrl && setShowFullscreenModal(true)}
              >
                {imageLoading || isUploadingFile ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-[#004417] animate-spin" />
                  </div>
                ) : imageError ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <ImageIcon className="w-12 h-12 mb-2" />
                    <p className="text-sm">Não foi possível carregar a imagem</p>
                  </div>
                ) : imagePreviewUrl ? (
                  <>
                    <img
                      src={imagePreviewUrl}
                      alt={documento.titulo || 'Imagem do documento'}
                      className="w-full h-auto max-h-[300px] object-contain bg-gray-50"
                      onError={() => setImageError(true)}
                    />
                    {/* Overlay com ícone de zoom */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-lg">
                        <ZoomIn className="w-6 h-6 text-[#004417]" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              {/* Botão de substituir arquivo */}
              <label
                htmlFor="replace-file-input"
                className="mt-2 flex items-center justify-center gap-2 px-3 py-2 text-sm text-[#00A651] hover:text-[#008a44] hover:bg-[#00A651]/5 rounded-lg cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Substituir arquivo
              </label>
            </div>
          ) : (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-6 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold text-[#004417]">
                    {getFileTypeName(fileExtension)}
                  </p>
                </div>
              </div>
              {/* Botão de substituir arquivo */}
              <label
                htmlFor="replace-file-input"
                className="mt-2 flex items-center justify-center gap-2 px-3 py-2 text-sm text-[#00A651] hover:text-[#008a44] hover:bg-[#00A651]/5 rounded-lg cursor-pointer transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Substituir arquivo
              </label>
            </div>
          )}

          {/* Badges de tipo */}
          <div className="mb-4 flex gap-2 flex-wrap">
            {documento.tipo && (
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(
                  documento.tipo
                )}`}
              >
                {documento.tipo}
              </span>
            )}
          </div>

          {/* Metadados */}
          <div className="space-y-4">
            <div>
              <h3 className="text-[13px] font-bold text-[#004417] mb-3 uppercase tracking-wide">
                Informações
              </h3>
              <MetadataField label="Safra" value={documento.safra} />
              <MetadataField label="Categoria" value={documento.tema} />
            </div>

            {documento.observacao && (
              <div>
                <h3 className="text-[13px] font-bold text-[#004417] mb-3 uppercase tracking-wide">
                  Observação
                </h3>
                <p className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium bg-[rgba(0,68,23,0.02)] p-3 rounded-lg">
                  {documento.observacao}
                </p>
              </div>
            )}

            {documento.created_at && (
              <div className="pt-2">
                <p className="text-xs text-[#004417]/65">
                  Cadastrado em {new Date(documento.created_at).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer com botões */}
        <div className="border-t border-gray-200 p-4 md:p-6 space-y-2">
          {/* Mobile: Botão Enviar no WhatsApp */}
          {documento.arquivo_url && (
            <button
              onClick={handleEnviarWhatsApp}
              disabled={isSendingWhatsApp}
              className="w-full flex md:hidden items-center justify-center gap-1 px-3 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-medium transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingWhatsApp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <WhatsAppIcon />
                  <span>{isImage ? 'Enviar Imagem' : 'Enviar Arquivo'}</span>
                </>
              )}
            </button>
          )}

          {/* Desktop: Botão Baixar */}
          {documento.arquivo_url && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full hidden md:flex items-center justify-center gap-2 px-4 py-3 bg-[#004417] hover:bg-[#003015] text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
              onEdit(documento.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
          <button
            onClick={() => {
              onDelete(documento.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 hover:bg-[#F7941F]/10 text-[#F7941F] rounded-lg font-medium transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>
    </>
  );
}
