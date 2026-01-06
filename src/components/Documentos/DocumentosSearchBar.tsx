import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Documento } from "./mockDocumentos";

interface DocumentosSearchBarProps {
  documentos: Documento[];
  onFilterChange: (filtered: Documento[]) => void;
}

type TipoDocumento =
  | "Pessoal"
  | "Cadastro da fazenda"
  | "Contratos"
  | "Comprovantes de pagamento"
  | "Ambiental / ESG / EUDR"
  | "Técnico"
  | "Outros";

const TIPOS: TipoDocumento[] = [
  "Pessoal",
  "Cadastro da fazenda",
  "Contratos",
  "Comprovantes de pagamento",
  "Ambiental / ESG / EUDR",
  "Técnico",
  "Outros",
];

export default function DocumentosSearchBar({
  documentos,
  onFilterChange,
}: DocumentosSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<TipoDocumento | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const applyFilters = () => {
    let filtered = [...documentos];

    // Busca por título, tipo ou observação
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          (doc.titulo && doc.titulo.toLowerCase().includes(term)) ||
          (doc.tipo && doc.tipo.toLowerCase().includes(term)) ||
          (doc.observacao && doc.observacao.toLowerCase().includes(term)) ||
          (doc.safra && doc.safra.toLowerCase().includes(term)) ||
          (doc.tema && doc.tema.toLowerCase().includes(term))
      );
    }

    // Filtro por tipo
    if (selectedType) {
      filtered = filtered.filter((doc) => doc.tipo === selectedType);
    }

    onFilterChange(filtered);
  };

  // Chamar applyFilters sempre que algum filtro muda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setTimeout(() => applyFilters(), 0);
  };

  const handleTypeChange = (type: TipoDocumento | "") => {
    setSelectedType(type);
    setTimeout(() => applyFilters(), 0);
  };

  const hasActiveFilters = searchTerm.trim() || selectedType;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, tipo ou descrição..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A651] focus:border-transparent outline-none text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
            hasActiveFilters
              ? "bg-[#00A651] text-white hover:bg-[#008c44]"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 text-xs bg-white text-[#00A651] rounded-full px-2 py-0.5">
              ativo
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Tipo de Documento */}
          <div>
            <label className="block text-sm font-medium text-[#004417] mb-2">
              Tipo de Documento
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTypeChange("")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedType === ""
                    ? "bg-[#00A651] text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Todos
              </button>
              {TIPOS.map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => handleTypeChange(tipo)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedType === tipo
                      ? "bg-[#00A651] text-white"
                      : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
