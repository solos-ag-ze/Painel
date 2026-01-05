import { Documento } from "./mockDocumentos";
import {
  FileText,
  FileJson,
  Image,
  ChevronRight,
  Trash2,
  Edit2,
} from "lucide-react";
import { formatDateBR } from "../../lib/dateUtils";

interface DocumentoCardProps {
  documento: Documento;
  onViewDetails: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const getIconByFormat = (formato: string) => {
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

export default function DocumentoCard({
  documento,
  onViewDetails,
  onEdit,
  onDelete,
}: DocumentoCardProps) {
  const expired = isExpired(documento.validade);
  const daysLeft = daysUntilExpiry(documento.validade);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow h-full">
      {/* Header com ícone e nome */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-bold text-[#092f20] truncate"
            title={documento.nomeArquivo}
          >
            {documento.nomeArquivo}
          </h3>
        </div>
      </div>

      {/* Tipo de documento */}
      <div className="mb-3">
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTypeColor(
            documento.tipo
          )}`}
        >
          {documento.tipo}
        </span>
      </div>

      {/* Metadados */}
      <div className="space-y-2 mb-3 pb-3 border-b border-gray-100 text-xs">
        <div className="flex items-center gap-2 text-gray-600">
          <span className="font-medium">Recebido:</span>
          <span>{formatDateBR(documento.dataRecebimento)}</span>
        </div>

        {/* Descrição curta */}
        {documento.descricao && (
          <div className="text-gray-600 line-clamp-2">
            <span className="font-medium">Desc:</span> {documento.descricao}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(documento.id)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
        >
          Ver
          <ChevronRight className="w-3 h-3" />
        </button>
        <button
          onClick={() => onEdit(documento.id)}
          className="flex items-center justify-center gap-1 px-3 py-2 bg-[#00A651] hover:bg-[#008c44] rounded-lg text-xs font-medium text-white transition-colors"
          title="Editar metadados"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={() => onDelete(documento.id)}
          className="flex items-center justify-center gap-1 px-3 py-2 border border-[#F7941F]/30 hover:bg-[#F7941F]/10 rounded-lg text-xs font-medium text-[#F7941F] transition-colors"
          title="Excluir documento"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
