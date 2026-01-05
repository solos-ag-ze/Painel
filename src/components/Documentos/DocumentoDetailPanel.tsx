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

const getPreviewIcon = (formato: string) => {
  const type = formato.toUpperCase();
  if (type === "PDF") return "📄";
  if (["JPG", "PNG", "GIF", "WEBP"].includes(type)) return "🖼️";
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

const isExpired = (validade?: string) => {
  if (!validade) return false;
  const expireDate = new Date(validade);
  return expireDate < new Date();
};

const daysUntilExpiry = (validade?: string) => {
  if (!validade) return null;
  const expireDate = new Date(validade);
  const today = new Date();
  const diffTime = expireDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
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

  const expired = isExpired(documento.validade);
  const daysLeft = daysUntilExpiry(documento.validade);

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
            <h2 className="text-lg md:text-xl font-bold text-[#092f20] break-words">
              {documento.nomeArquivo}
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              {documento.tamanho} • {documento.formato}
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
              <div className="text-6xl mb-3">
                {getPreviewIcon(documento.formato)}
              </div>
              <p className="text-sm text-gray-600">
                Preview mockado de {documento.formato}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Clique em "Baixar" para fazer download
              </p>
            </div>
          </div>

          {/* Tipo de documento */}
          <div className="mb-4">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(
                documento.tipo
              )}`}
            >
              {documento.tipo}
            </span>
          </div>

          {/* Metadados */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-[#004417] mb-3 uppercase tracking-wide">
                Informações
              </h3>
              <MetadataField label="Origem" value={documento.origem} />
              <MetadataField
                label="Data de Recebimento"
                value={formatDateBR(documento.dataRecebimento)}
              />
            </div>

            {/* Validade */}
            {documento.validade && (
              <div>
                <h3 className="text-sm font-bold text-[#004417] mb-3 uppercase tracking-wide">
                  Validade
                </h3>
                <div
                  className={`p-3 rounded-lg ${
                    expired
                      ? "bg-[#004417]/5 border border-[#004417]/20"
                      : "bg-[#00A651]/10 border border-[#00A651]/30"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      expired ? "text-[#004417]" : "text-[#00A651]"
                    }`}
                  >
                    {expired ? "🔴 Expirado" : "✅ Válido"}
                  </p>
                  <p
                    className={`text-sm ${
                      expired ? "text-[#004417]/80" : "text-[#397738]"
                    }`}
                  >
                    {expired
                      ? `Expirou em ${formatDateBR(documento.validade)}`
                      : `Expira em ${daysLeft} dias (${formatDateBR(
                          documento.validade
                        )})`}
                  </p>
                </div>
              </div>
            )}

            {/* Descrição */}
            {documento.descricao && (
              <div>
                <h3 className="text-sm font-bold text-[#004417] mb-3 uppercase tracking-wide">
                  Descrição
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {documento.descricao}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer com botões */}
        <div className="border-t border-gray-200 p-4 md:p-6 space-y-2">
          <button
            onClick={() => {
              console.log("📥 Baixar documento:", documento.id);
              // Mock download
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Baixar
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
