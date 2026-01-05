import { useState, useEffect } from "react";
import { Documento } from "./mockDocumentos";
import DocumentoCard from "./DocumentoCard";
import DocumentoDetailPanel from "./DocumentoDetailPanel";
import DocumentosSearchBar from "./DocumentosSearchBar";
import UploadDocumentoModal from "./UploadDocumentoModal";
import { Upload, AlertCircle } from "lucide-react";
import { DocumentosService } from "../../services/documentosService";
import { AuthService } from "../../services/authService";

export default function DocumentosPanel() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [filteredDocumentos, setFilteredDocumentos] = useState<Documento[]>([]);
  const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [documentoParaEditar, setDocumentoParaEditar] = useState<Documento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    documentoId: number | null;
    documentoNome: string;
  }>({ isOpen: false, documentoId: null, documentoNome: "" });

  useEffect(() => {
    loadDocumentos();
  }, []);

  const loadDocumentos = async () => {
    try {
      setIsLoading(true);
      console.log("[DocumentosPanel] Carregando documentos...");

      const authService = AuthService.getInstance();
      const currentUser = authService.getCurrentUser();

      if (!currentUser) {
        console.warn("[DocumentosPanel] Usuário não autenticado");
        return;
      }

      const docs = await DocumentosService.getAll(currentUser.user_id);
      console.log(`[DocumentosPanel] ✓ ${docs.length} documentos carregados`);

      setDocumentos(docs);
      setFilteredDocumentos(docs);
    } catch (error) {
      console.error("[DocumentosPanel] ✗ Erro ao carregar documentos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (id: number) => {
    const doc = documentos.find((d) => d.id === id);
    if (doc) {
      setSelectedDocumento(doc);
      setIsDetailOpen(true);
      console.log("👁️ Ver detalhes do documento:", id);
    }
  };

  const handleEdit = (id: number) => {
    const doc = documentos.find((d) => d.id === id);
    if (doc) {
      console.log("✏️ Editar metadados do documento:", id);
      setDocumentoParaEditar(doc);
      setIsUploadOpen(true);
      setIsDetailOpen(false);
    }
  };

  const handleDeleteRequest = (id: number) => {
    const doc = documentos.find((d) => d.id === id);
    setDeleteConfirm({
      isOpen: true,
      documentoId: id,
      documentoNome: doc?.titulo || "documento",
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.documentoId === null) return;

    const id = deleteConfirm.documentoId;
    console.log("[DocumentosPanel] Deletando documento:", id);

    try {
      const documento = documentos.find((d) => d.id === id);
      const success = await DocumentosService.delete(id, documento?.arquivo_url);

      if (success) {
        console.log("[DocumentosPanel] ✓ Documento deletado com sucesso");
        setDocumentos((prev) => prev.filter((d) => d.id !== id));
        setFilteredDocumentos((prev) => prev.filter((d) => d.id !== id));
        if (selectedDocumento?.id === id) {
          setIsDetailOpen(false);
          setSelectedDocumento(null);
        }
      } else {
        alert("Erro ao excluir documento. Tente novamente.");
      }
    } catch (error) {
      console.error("[DocumentosPanel] ✗ Erro ao deletar documento:", error);
      alert("Erro ao excluir documento. Tente novamente.");
    }

    setDeleteConfirm({ isOpen: false, documentoId: null, documentoNome: "" });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ isOpen: false, documentoId: null, documentoNome: "" });
  };

  const handleDownload = (id: number) => {
    console.log("📥 Baixar documento:", id);
    // Em uma implementação real, faria download do arquivo
  };

  const handleUpload = (documento: Documento) => {
    if (documentoParaEditar) {
      console.log("[DocumentosPanel] Atualizando documento na lista:", documento);
      setDocumentos((prev) =>
        prev.map((d) => (d.id === documento.id ? documento : d))
      );
      setFilteredDocumentos((prev) =>
        prev.map((d) => (d.id === documento.id ? documento : d))
      );
      if (selectedDocumento?.id === documento.id) {
        setSelectedDocumento(documento);
      }
    } else {
      console.log("[DocumentosPanel] Adicionando novo documento à lista:", documento);
      setDocumentos((prev) => [documento, ...prev]);
      setFilteredDocumentos((prev) => [documento, ...prev]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 flex flex-col items-center mx-4">
            <AlertCircle className="w-8 h-8 text-[#F7941F] mb-3" />
            <h3 className="text-lg font-bold text-[#004417] mb-2 text-center">
              Excluir documento?
            </h3>
            <p className="text-sm text-center mb-2 text-[#004417]/80">
              <span className="font-semibold">
                {deleteConfirm.documentoNome}
              </span>
            </p>
            <p className="text-sm text-center mb-4 text-[#004417]/70">
              Atenção: ao confirmar, o documento será excluído de forma
              definitiva do Painel da Fazenda. Deseja continuar?
            </p>
            <div className="flex gap-3 mt-2 w-full">
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-[rgba(0,68,23,0.12)] text-[#004417] hover:bg-[rgba(0,68,23,0.03)] font-medium transition-colors"
                onClick={handleDeleteCancel}
              >
                Cancelar
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg bg-[#F7941F]/10 text-[#F7941F] hover:bg-[#F7941F]/20 font-medium transition-colors"
                onClick={handleDeleteConfirm}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#004417]">Documentos</h1>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors"
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00A651]"></div>
        </div>
      )}

      {/* Content Grid - Desktop */}
      {!isLoading && (
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDocumentos.length > 0 ? (
          filteredDocumentos.map((documento) => (
            <DocumentoCard
              key={documento.id}
              documento={documento}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
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
      )}

      {/* Content List - Mobile */}
      {!isLoading && (
        <div className="md:hidden space-y-3">
        {filteredDocumentos.length > 0 ? (
          filteredDocumentos.map((documento) => (
            <DocumentoCard
              key={documento.id}
              documento={documento}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
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
      )}

      {/* Detail Panel */}
      <DocumentoDetailPanel
        documento={selectedDocumento}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedDocumento(null);
        }}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
      />

      {/* Upload Modal */}
      <UploadDocumentoModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setDocumentoParaEditar(null);
        }}
        onUploaded={handleUpload}
        documentoParaEditar={documentoParaEditar}
      />
    </div>
  );
}
