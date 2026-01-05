import React, { useState, useRef, useEffect } from "react";
import { X, Save, Upload, FileText, File, Image } from "lucide-react";
import SuccessToast from "../common/SuccessToast";
import { DocumentosService, Documento } from "../../services/documentosService";
import { AuthService } from "../../services/authService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (documento: Documento) => void;
  documentoParaEditar?: Documento | null;
}

const TIPOS_DOCUMENTO = [
  "Cadastro / Registro da Fazenda",
  "Certificação / Auditoria",
  "Contrato",
  "Laudo / Relatório",
  "Trabalhista / Funcionário",
  "Outro",
];

const SAFRAS = ["Safra atual", "Safra anterior", "Outro ano"];

const AREAS = [
  "Agrícola",
  "Ambiental / ESG",
  "Cadastro da Fazenda",
  "Financeiro",
  "Trabalhista / Pessoas",
  "Outro",
];

// Tipos de arquivo aceitos
const ACCEPTED_FILE_TYPES = [
  // Documentos
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".rtf",
  ".odt",
  ".ods",
  ".odp",
  // Imagens
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  // Outros
  ".csv",
  ".zip",
  ".rar",
].join(",");

const MAX_FILE_SIZE_MB = 10;

export default function UploadDocumentoModal({
  isOpen,
  onClose,
  onUploaded,
  documentoParaEditar,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    tipo: "",
    titulo: "",
    safra: "",
    anoCustomizado: "",
    area: "",
    observacao: "",
    anexo: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [arquivoAtualUrl, setArquivoAtualUrl] = useState<string | null>(null);

  const isEditMode = !!documentoParaEditar;

  useEffect(() => {
    if (documentoParaEditar && isOpen) {
      const safraValue = documentoParaEditar.safra || "";
      const isSafraCustomizada = safraValue && !["Safra atual", "Safra anterior"].includes(safraValue);

      setFormData({
        tipo: documentoParaEditar.tipo || "",
        titulo: documentoParaEditar.titulo || "",
        safra: isSafraCustomizada ? "Outro ano" : safraValue,
        anoCustomizado: isSafraCustomizada ? safraValue : "",
        area: documentoParaEditar.tema || "",
        observacao: documentoParaEditar.observacao || "",
        anexo: null,
      });
      setArquivoAtualUrl(documentoParaEditar.arquivo_url || null);
      setFilePreview(null);
    } else if (!isOpen) {
      setFormData({
        tipo: "",
        titulo: "",
        safra: "",
        anoCustomizado: "",
        area: "",
        observacao: "",
        anexo: null,
      });
      setArquivoAtualUrl(null);
      setFilePreview(null);
      setErrors({});
    }
  }, [documentoParaEditar, isOpen]);

  if (!isOpen) return null;

  const generateFilePreview = (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleFileChange = (file: File | null) => {
    if (file) {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_FILE_SIZE_MB) {
        setErrors((prev) => ({
          ...prev,
          anexo: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE_MB}MB`,
        }));
        return;
      }
      generateFilePreview(file);
    } else {
      setFilePreview(null);
    }
    setFormData((prev) => ({ ...prev, anexo: file }));
    if (errors.anexo) setErrors((prev) => ({ ...prev, anexo: "" }));
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, anexo: null }));
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!isEditMode && !formData.anexo) {
      newErrors.anexo = "O anexo é obrigatório";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const authService = AuthService.getInstance();
      const currentUser = authService.getCurrentUser();

      if (!currentUser) {
        throw new Error("Usuário não autenticado");
      }

      const safraFinal = formData.safra === "Outro ano" ? formData.anoCustomizado : formData.safra;

      if (isEditMode && documentoParaEditar) {
        console.log("[UploadDocumentoModal] Modo de edição - Atualizando documento...");

        let arquivoUrl = arquivoAtualUrl;

        if (formData.anexo) {
          console.log("[UploadDocumentoModal] Fazendo upload do novo arquivo:", formData.anexo.name);
          arquivoUrl = await DocumentosService.uploadFile(formData.anexo, currentUser.user_id);
        }

        const documentoAtualizado = await DocumentosService.update(documentoParaEditar.id, {
          tipo: formData.tipo || "Outros",
          titulo: formData.titulo || (formData.anexo?.name) || documentoParaEditar.titulo,
          safra: safraFinal || undefined,
          tema: formData.area || undefined,
          observacao: formData.observacao || undefined,
          arquivo_url: arquivoUrl || undefined,
        });

        if (!documentoAtualizado) {
          throw new Error("Erro ao atualizar documento no banco de dados");
        }

        console.log("[UploadDocumentoModal] ✓ Documento atualizado com sucesso:", documentoAtualizado);

        onUploaded(documentoAtualizado);
        setToastMessage("Documento atualizado com sucesso!");
        setShowToast(true);
      } else {
        console.log("[UploadDocumentoModal] Modo de criação - Iniciando upload...");

        if (!formData.anexo) {
          throw new Error("Nenhum arquivo selecionado");
        }

        console.log("[UploadDocumentoModal] Fazendo upload do arquivo:", formData.anexo.name);
        const arquivoUrl = await DocumentosService.uploadFile(formData.anexo, currentUser.user_id);

        console.log("[UploadDocumentoModal] Arquivo enviado, criando registro no banco...");

        const novoDocumento = await DocumentosService.create({
          user_id: currentUser.user_id,
          arquivo_url: arquivoUrl,
          tipo: formData.tipo || "Outros",
          titulo: formData.titulo || formData.anexo.name,
          safra: safraFinal || undefined,
          tema: formData.area || undefined,
          observacao: formData.observacao || undefined,
          status: "Novo",
        });

        if (!novoDocumento) {
          throw new Error("Erro ao criar documento no banco de dados");
        }

        console.log("[UploadDocumentoModal] ✓ Documento cadastrado com sucesso:", novoDocumento);

        onUploaded(novoDocumento);
        setToastMessage("Documento enviado com sucesso!");
        setShowToast(true);
      }

      setFormData({
        tipo: "",
        titulo: "",
        safra: "",
        anoCustomizado: "",
        area: "",
        observacao: "",
        anexo: null,
      });

      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error("[UploadDocumentoModal] ✗ Erro ao processar documento:", error);
      alert(
        error instanceof Error ? error.message : "Erro ao processar documento."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tipo: "",
      titulo: "",
      safra: "",
      anoCustomizado: "",
      area: "",
      observacao: "",
      anexo: null,
    });
    setErrors({});
    onClose();
  };

  return (
    <>
      <SuccessToast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-[18px] shadow-[0_1px_6px_rgba(0,68,23,0.12)] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-[#004417]">
              {isEditMode ? "Editar Documento" : "Upload de Documento"}
            </h2>
            <button onClick={handleClose}>
              <X className="w-5 h-5 text-[#004417]" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Upload de Arquivo */}
            <div>
              <label className="block text-sm font-medium text-[#004417] mb-1">
                Anexar arquivo {!isEditMode && <span className="text-[#F7941F]">*</span>}
                {isEditMode && <span className="text-[rgba(0,68,23,0.4)]">(opcional - deixe em branco para manter o arquivo atual)</span>}
              </label>
              <div
                className={`border-2 border-dashed rounded-[12px] p-6 text-center transition-colors ${
                  errors.anexo
                    ? "border-[#F7941F] bg-[#F7941F]/5"
                    : formData.anexo || (isEditMode && arquivoAtualUrl)
                    ? "border-[#00A651] bg-[#00A651]/5"
                    : "border-[rgba(0,68,23,0.12)] hover:border-[rgba(0,166,81,0.3)]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] || null)
                  }
                  className="hidden"
                  id="documento-upload"
                />
                {formData.anexo ? (
                  <div className="flex flex-col items-center gap-3">
                    {filePreview ? (
                      <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-[#00A651] flex items-center justify-center bg-white">
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-[rgba(0,166,81,0.1)] border-2 border-[#00A651] flex items-center justify-center">
                        <FileText className="w-10 h-10 text-[#00A651]" />
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#004417] break-words max-w-xs">
                        {formData.anexo.name}
                      </p>
                      <p className="text-xs text-[rgba(0,68,23,0.6)] mt-1">
                        {(formData.anexo.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-xs text-[#F7941F] hover:text-[#e08419] font-medium transition-colors"
                    >
                      Remover arquivo
                    </button>
                  </div>
                ) : isEditMode && arquivoAtualUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-lg bg-[rgba(0,166,81,0.1)] border-2 border-[#00A651] flex items-center justify-center">
                      <FileText className="w-10 h-10 text-[#00A651]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#004417]">
                        Arquivo atual mantido
                      </p>
                      <p className="text-xs text-[rgba(0,68,23,0.6)] mt-1">
                        {documentoParaEditar?.titulo || "Arquivo existente"}
                      </p>
                    </div>
                    <label htmlFor="documento-upload" className="text-xs text-[#00A651] hover:text-[#008a44] font-medium transition-colors cursor-pointer">
                      Substituir arquivo
                    </label>
                  </div>
                ) : (
                  <label htmlFor="documento-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 mx-auto mb-2 text-[rgba(0,68,23,0.35)]" />
                    <p className="text-sm text-[rgba(0,68,23,0.6)]">
                      Clique para selecionar um arquivo
                    </p>
                    <p className="text-xs text-[rgba(0,68,23,0.5)] mt-1">
                      PDF, Imagens, Documentos, Planilhas (máx.{" "}
                      {MAX_FILE_SIZE_MB}MB)
                    </p>
                  </label>
                )}
              </div>
              {errors.anexo && (
                <p className="text-[#F7941F] text-xs mt-1">{errors.anexo}</p>
              )}
            </div>

            {/* Tipo de Documento */}
            <div>
              <label className="block text-sm font-medium text-[#004417] mb-1">
                Tipo de documento{" "}
                <span className="text-[rgba(0,68,23,0.4)]">(opcional)</span>
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => handleInputChange("tipo", e.target.value)}
                className="w-full px-4 py-3 rounded-[12px] bg-white text-[#004417] appearance-none shadow-[0_1px_3px_rgba(0,68,23,0.06)] border border-[rgba(0,68,23,0.08)]"
              >
                <option value="">Selecione...</option>
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            {/* Título do Documento */}
            <div>
              <label className="block text-sm font-medium text-[#004417] mb-1">
                Título do documento{" "}
                <span className="text-[rgba(0,68,23,0.4)]">(opcional)</span>
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => handleInputChange("titulo", e.target.value)}
                className="w-full px-4 py-3 rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,68,23,0.06)] text-[#004417] placeholder:text-gray-400 border border-[rgba(0,68,23,0.08)]"
                placeholder="Ex.: Contrato de arrendamento 2025"
              />
            </div>

            {/* Safra e Área - Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ano ou Safra */}
              <div>
                <label className="block text-sm font-medium text-[#004417] mb-1">
                  Ano ou safra relacionada{" "}
                  <span className="text-[rgba(0,68,23,0.4)]">(opcional)</span>
                </label>
                <select
                  value={formData.safra}
                  onChange={(e) => handleInputChange("safra", e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] bg-white text-[#004417] appearance-none shadow-[0_1px_3px_rgba(0,68,23,0.06)] border border-[rgba(0,68,23,0.08)]"
                >
                  <option value="">Selecione...</option>
                  {SAFRAS.map((safra) => (
                    <option key={safra} value={safra}>
                      {safra}
                    </option>
                  ))}
                </select>
                {formData.safra === "Outro ano" && (
                  <input
                    type="number"
                    value={formData.anoCustomizado}
                    onChange={(e) => handleInputChange("anoCustomizado", e.target.value)}
                    className="w-full px-4 py-3 rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,68,23,0.06)] text-[#004417] placeholder:text-gray-400 border border-[rgba(0,68,23,0.08)] mt-2"
                    placeholder="Ex.: 2024"
                    min="1900"
                    max="2100"
                  />
                )}
              </div>

              {/* Área Relacionada */}
              <div>
                <label className="block text-sm font-medium text-[#004417] mb-1">
                  Área relacionada{" "}
                  <span className="text-[rgba(0,68,23,0.4)]">(opcional)</span>
                </label>
                <select
                  value={formData.area}
                  onChange={(e) => handleInputChange("area", e.target.value)}
                  className="w-full px-4 py-3 rounded-[12px] bg-white text-[#004417] appearance-none shadow-[0_1px_3px_rgba(0,68,23,0.06)] border border-[rgba(0,68,23,0.08)]"
                >
                  <option value="">Selecione...</option>
                  {AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Observação */}
            <div>
              <label className="block text-sm font-medium text-[#004417] mb-1">
                Observação{" "}
                <span className="text-[rgba(0,68,23,0.4)]">(opcional)</span>
              </label>
              <textarea
                value={formData.observacao}
                onChange={(e) =>
                  handleInputChange("observacao", e.target.value)
                }
                rows={3}
                className="w-full px-4 py-3 rounded-[12px] bg-white shadow-[0_1px_3px_rgba(0,68,23,0.06)] text-[#004417] placeholder:text-gray-400 border border-[rgba(0,68,23,0.08)] resize-none"
                placeholder="Adicione informações relevantes sobre o documento..."
              />
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 bg-white text-[#004417] rounded-[12px] border border-[rgba(0,68,23,0.12)] hover:bg-[rgba(0,166,81,0.04)] transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-[#00A651] text-white rounded-[12px] hover:bg-[#008a44] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isEditMode ? "Salvando..." : "Enviando..."}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditMode ? "Salvar Alterações" : "Enviar Documento"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
