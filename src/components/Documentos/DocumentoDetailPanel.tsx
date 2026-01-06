import { useState, useEffect } from "react";
import { Documento } from "./mockDocumentos";
import { X, Download, Edit2, Trash2, Loader2, ImageIcon, ZoomIn } from "lucide-react";
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

const getFileExtension = (arquivoUrl?: string): string => {
  if (!arquivoUrl) return "FILE";
  const fileName = arquivoUrl.split('/').pop() || "";
  const extension = fileName.split('.').pop() || "";
  return extension.toUpperCase();
};

const getPreviewIcon = (formato: string) => {
  const type = formato.toUpperCase();
  if (type === "PDF") return "📄";
  if (["JPG", "JPEG", "PNG", "GIF", "WEBP"].includes(type)) return "🖼️";
  if (["DOC", "DOCX"].includes(type)) return "📝";
  if (["XLS", "XLSX"].includes(type)) return "📊";
  return "📎";
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
  const icon = getPreviewIcon(fileExtension);
  const isImage = isImageFile(fileExtension);

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

      // Abre a signed URL em nova aba (URL temporária, não expõe bucket)
      window.open(signedUrl, '_blank');
      
    } catch (error) {
      console.error('Erro ao baixar:', error);
      alert('Erro ao baixar o arquivo.');
    } finally {
      setIsDownloading(false);
    }
  };

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

        {/* Footer com instrução */}
        <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
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
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 mb-6 flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <div className="text-6xl mb-3">{icon}</div>
                <p className="text-sm text-gray-600">
                  Arquivo {fileExtension}
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
              {documento.created_at && (
                <MetadataField
                  label="Data de Cadastro"
                  value={formatDateBR(documento.created_at)}
                />
              )}
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
          </div>
        </div>

        {/* Footer com botões */}
        <div className="border-t border-gray-200 p-4 md:p-6 space-y-2">
          {/* Botão baixar apenas para arquivos não-imagem */}
          {!isImage && documento.arquivo_url && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#004417] hover:bg-[#003015] text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
