import { useState } from "react";
import { mockDocumentos, Documento } from "./mockDocumentos";
import DocumentoCard from "./DocumentoCard";
import DocumentoDetailPanel from "./DocumentoDetailPanel";
import DocumentosSearchBar from "./DocumentosSearchBar";
import { Upload } from "lucide-react";

export default function DocumentosPanel() {
  const [documentos, setDocumentos] = useState<Documento[]>(mockDocumentos);
  const [filteredDocumentos, setFilteredDocumentos] =
    useState<Documento[]>(mockDocumentos);
  const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleViewDetails = (id: number) => {
    const doc = documentos.find((d) => d.id === id);
    if (doc) {
      setSelectedDocumento(doc);
      setIsDetailOpen(true);
      console.log("👁️ Ver detalhes do documento:", id);
    }
  };

  const handleEdit = (id: number) => {
    console.log("✏️ Editar metadados do documento:", id);
    // Em uma implementação real, abriria um modal de edição
  };

  const handleDelete = (id: number) => {
    console.log("🗑️ Deletar documento:", id);
    // Em uma implementação real, removeria o documento
    setDocumentos((prev) => prev.filter((d) => d.id !== id));
    setFilteredDocumentos((prev) => prev.filter((d) => d.id !== id));
    if (selectedDocumento?.id === id) {
      setIsDetailOpen(false);
      setSelectedDocumento(null);
    }
  };

  const handleDownload = (id: number) => {
    console.log("📥 Baixar documento:", id);
    // Em uma implementação real, faria download do arquivo
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#004417]">Documentos</h1>
        </div>
        <button
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors cursor-not-allowed opacity-50"
          disabled
          title="Upload será implementado em breve"
        >
          <Upload className="w-5 h-5" />
          Upload
        </button>
      </div>

      {/* Search and Filters */}
      <DocumentosSearchBar
        documentos={documentos}
        onFilterChange={setFilteredDocumentos}
      />

      {/* Content Grid - Desktop */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDocumentos.length > 0 ? (
          filteredDocumentos.map((documento) => (
            <DocumentoCard
              key={documento.id}
              documento={documento}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600 mb-4">Nenhum documento encontrado</p>
            <p className="text-sm text-gray-500">
              Tente ajustar os filtros ou termos de busca
            </p>
          </div>
        )}
      </div>

      {/* Content List - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredDocumentos.length > 0 ? (
          filteredDocumentos.map((documento) => (
            <DocumentoCard
              key={documento.id}
              documento={documento}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">Nenhum documento encontrado</p>
            <p className="text-sm text-gray-500">
              Tente ajustar os filtros ou termos de busca
            </p>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <DocumentoDetailPanel
        documento={selectedDocumento}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedDocumento(null);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
