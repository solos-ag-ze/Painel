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

const getFileExtension = (arquivoUrl?: string): string => {
  if (!arquivoUrl) return "FILE";
  const fileName = arquivoUrl.split('/').pop() || "";
  const extension = fileName.split('.').pop() || "";
  return extension.toUpperCase();
};

const getIconByFormat = (formato: string) => {
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

export default function DocumentoCard({
  documento,
  onViewDetails,
  onEdit,
  onDelete,
}: DocumentoCardProps) {
  const fileExtension = getFileExtension(documento.arquivo_url);
  const icon = getIconByFormat(fileExtension);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow h-full">
      {/* Header com ícone e nome */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-bold text-[#092f20] truncate"
            title={documento.titulo || 'Sem título'}
          >
            {documento.titulo || 'Documento sem título'}
          </h3>
        </div>
      </div>

      {/* Badges de tipo e status */}
      <div className="mb-3 flex gap-2 flex-wrap">
        {documento.tipo && (
          <span
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTypeColor(
              documento.tipo
            )}`}
          >
            {documento.tipo}
          </span>
        )}
      </div>

      {/* Metadados */}
      <div className="space-y-2 mb-3 pb-3 border-b border-gray-100 text-xs">
        {documento.safra && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium">Safra:</span>
            <span>{documento.safra}</span>
          </div>
        )}

        {documento.tema && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium">Categoria:</span>
            <span>{documento.tema}</span>
          </div>
        )}

        {documento.observacao && (
          <div className="text-gray-600 line-clamp-2">
            <span className="font-medium">Obs:</span> {documento.observacao}
          </div>
        )}
        
        {documento.created_at && (
          <div className="text-xs text-[#004417]/65 mt-2">
            Cadastrado em {new Date(documento.created_at).toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
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
