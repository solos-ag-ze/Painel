import { useState } from "react";
import { Documento } from "./mockDocumentos";
import { X, Download, Edit2, Trash2, Loader2, ZoomIn, Copy, Check } from "lucide-react";
import { formatDateBR } from "../../lib/dateUtils";
import { DocumentosService } from "../../services/documentosService";

interface DocumentoDetailPanelProps {
  documento: Documento | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

// Detecta se é dispositivo móvel
const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
  const isImage = ["JPG", "JPEG", "PNG", "GIF", "WEBP", "BMP"].includes(fileExtension);

  const [isDownloading, setIsDownloading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Para IMAGENS no mobile: abre em tela cheia para "pressionar e segurar"
  const handleOpenImage = async () => {
    if (!documento.arquivo_url) return;
    
    setIsDownloading(true);
    try {
      const signedUrl = await DocumentosService.getSignedUrl(documento.arquivo_url, 600);
      if (signedUrl) {
        setFullscreenImage(signedUrl);
      } else {
        alert('Não foi possível carregar a imagem.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao carregar imagem.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Para OUTROS ARQUIVOS: redireciona para signed URL
  const handleDownloadFile = async () => {
    if (!documento.arquivo_url) return;

    setIsDownloading(true);
    try {
      const signedUrl = await DocumentosService.getSignedUrl(documento.arquivo_url, 600);
      
      if (!signedUrl) {
        alert('Não foi possível preparar o download.');
        return;
      }

      // Desktop: tenta download via fetch + blob
      if (!isMobileDevice()) {
        try {
          const response = await fetch(signedUrl);
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = documento.titulo || `documento.${fileExtension.toLowerCase()}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
            return;
          }
        } catch (e) {
          console.log('Blob download falhou, usando redirect');
        }
      }

      // Mobile/Fallback: redireciona para a signed URL
      // O navegador/WebView vai tentar abrir ou baixar nativamente
      window.location.href = signedUrl;
      
    } catch (error) {
      console.error('Erro ao baixar:', error);
      alert('Erro ao baixar o arquivo.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Copia link para área de transferência
  const handleCopyLink = async () => {
    if (!documento.arquivo_url) return;
    
    try {
      const signedUrl = await DocumentosService.getSignedUrl(documento.arquivo_url, 600);
      if (signedUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(signedUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
      }
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  // Modal de imagem fullscreen
  if (fullscreenImage) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-black/80">
          <p className="text-white text-sm font-medium truncate flex-1 mr-4">
            {documento.titulo || 'Imagem'}
          </p>
          <button
            onClick={() => setFullscreenImage(null)}
            className="p-2 bg-white/20 rounded-full"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Imagem */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <img
            src={fullscreenImage}
            alt={documento.titulo || 'Documento'}
            className="max-w-full max-h-full object-contain"
            style={{ touchAction: 'manipulation' }}
          />
        </div>

        {/* Instrução */}
        <div className="p-4 bg-black/80">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <p className="text-white text-sm font-medium">
              📲 Pressione e segure a imagem para salvar
            </p>
            <p className="text-white/70 text-xs mt-1">
              Ou use o menu do navegador (⋮) → "Salvar imagem"
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
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 mb-6 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="text-6xl mb-3">{icon}</div>
              <p className="text-sm text-gray-600">
                Arquivo {fileExtension}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isImage ? 'Toque em "Ver Imagem" para visualizar' : 'Toque em "Baixar" para abrir'}
              </p>
            </div>
          </div>

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
          {/* Botão principal - diferente para imagem vs outros */}
          {isImage ? (
            <button
              onClick={handleOpenImage}
              disabled={!documento.arquivo_url || isDownloading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#004417] hover:bg-[#003015] text-white rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <ZoomIn className="w-4 h-4" />
                  Ver Imagem (para salvar)
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDownloadFile}
              disabled={!documento.arquivo_url || isDownloading}
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
                  {documento.arquivo_url ? 'Baixar Arquivo' : 'Arquivo indisponível'}
                </>
              )}
            </button>
          )}

          {/* Botão copiar link - alternativa */}
          <button
            onClick={handleCopyLink}
            disabled={!documento.arquivo_url}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors text-xs disabled:opacity-50"
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                Link copiado! Cole no navegador.
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar link (alternativa)
              </>
            )}
          </button>

          <button
            onClick={() => {
              onEdit(documento.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors text-sm"
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
