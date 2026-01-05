import { Documento } from "./mockDocumentos";
import { X, Download, Edit2, Trash2 } from "lucide-react";
import { formatDateBR } from "../../lib/dateUtils";

interface DocumentoDetailPanelProps {
  documento: Documento | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

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

const getStatusColor = (status?: string) => {
  switch (status) {
    case "Novo":
      return "bg-blue-100 text-blue-700";
    case "Organizado":
      return "bg-green-100 text-green-700";
    case "Pendente":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
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

  const handleDownload = () => {
    if (documento.arquivo_url) {
      window.open(documento.arquivo_url, '_blank');
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 flex flex-col overflow-hidden transition-transform duration-300 ${
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
                Clique em "Baixar" para abrir/fazer download
              </p>
            </div>
          </div>

          {/* Badges de tipo e status */}
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
            {documento.status && (
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                  documento.status
                )}`}
              >
                {documento.status}
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
              <MetadataField label="Tema" value={documento.tema} />
            </div>

            {/* Observação */}
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
          <button
            onClick={handleDownload}
            disabled={!documento.arquivo_url}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            {documento.arquivo_url ? 'Baixar / Abrir' : 'Arquivo indisponível'}
          </button>
          <button
            onClick={() => {
              onEdit(documento.id);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors text-sm"
          >
            <Edit2 className="w-4 h-4" />
            Editar Metadados
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
