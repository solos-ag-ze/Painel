import { useState, useEffect } from "react";
import { Documento } from "./mockDocumentos";
import { X, Download, Edit2, Trash2, Loader2, ImageIcon, ZoomIn, FileText } from "lucide-react";
import { formatDateBR } from "../../lib/dateUtils";
import { DocumentosService } from "../../services/documentosService";

interface DocumentoDetailPanelProps {
  documento: Documento | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
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
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm text-gray-900">{value}</p>
    </div>
  );
};

export default function DocumentoDetailPanel({
  documento,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: DocumentoDetailPanelProps) {
  if (!isOpen || !documento) return null;

  const fileExtension = getFileExtension(documento.arquivo_url);
  const isImage = isImageFile(fileExtension);

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [showBrowserWarning, setShowBrowserWarning] = useState(false);
  const [pendingDownloadUrl, setPendingDownloadUrl] = useState<string | null>(null);

  // Carrega preview da imagem quando o painel abre
  useEffect(() => {
    if (isOpen && isImage && documento.arquivo_url) {
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
  }, [isOpen, documento.arquivo_url, isImage]);

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
        <div className="border-b border-gray-200 p-4 md:p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold text-[#004417] break-words">
              {documento.titulo || 'Documento sem título'}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              {fileExtension}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Preview */}
          {isImage ? (
            <div 
              className="bg-gray-100 rounded-lg border border-gray-200 mb-6 overflow-hidden cursor-pointer relative group"
              onClick={() => imagePreviewUrl && setShowFullscreenModal(true)}
            >
              {imageLoading ? (
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
          ) : (
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-[#004417]">
                  {getFileTypeName(fileExtension)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Toque em "Baixar" para abrir
                </p>
              </div>
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
              <h3 className="text-sm font-bold text-[#004417] mb-3 uppercase tracking-wide">
                Informações
              </h3>
              <MetadataField label="Safra" value={documento.safra} />
              <MetadataField label="Categoria" value={documento.tema} />
            </div>

            {documento.observacao && (
              <div>
                <h3 className="text-sm font-bold text-[#004417] mb-3 uppercase tracking-wide">
                  Observação
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
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
          {/* Botão baixar: sempre para arquivos, apenas desktop para imagens */}
          {documento.arquivo_url && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`w-full items-center justify-center gap-2 px-4 py-3 bg-[#004417] hover:bg-[#003015] text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                isImage ? 'hidden md:flex' : 'flex'
              }`}
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[#F7941F]/30 hover:bg-[#F7941F]/10 text-[#F7941F] rounded-lg font-medium transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>
    </>
  );
}
