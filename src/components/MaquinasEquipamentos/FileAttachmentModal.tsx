import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  Paperclip,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  Camera
} from 'lucide-react';
import { AttachmentService } from '../../services/attachmentService';

const attachmentService = new AttachmentService();

interface FileAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  maquinaId: string;
  maquinaDescription: string;
}

interface ConfirmState {
  type: 'delete' | 'replace' | null;
  uploadType?: 'primeiro_envio' | 'segundo_envio';
  onConfirm?: () => void;
}

export default function FileAttachmentModal({
  isOpen,
  onClose,
  maquinaId,
  maquinaDescription
}: FileAttachmentModalProps) {
  const [confirmState, setConfirmState] = useState<ConfirmState>({ type: null });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState<'primeiro_envio' | 'segundo_envio' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMessage(null);
      checkAttachments();
      console.log('🆔 Modal aberto para máquina ID:', maquinaId);
    }
  }, [isOpen, maquinaId]);

  const checkAttachments = async () => {
    try {
      setLoading(true);
      console.log('🔄 Verificando anexos para máquina:', maquinaId);

      const attachmentInfo = await attachmentService.getAttachmentInfo(maquinaId);
      console.log('📋 Resultado da verificação:', attachmentInfo);

      if (attachmentInfo) {
        setPhotoUrl(attachmentInfo.url_primeiro_envio);
        setPhotoType(attachmentInfo.primeiroEnvioType);
        setDocumentUrl(attachmentInfo.url_segundo_envio);
        setDocumentType(attachmentInfo.segundoEnvioType);
      } else {
        setPhotoUrl(null);
        setPhotoType(null);
        setDocumentUrl(null);
        setDocumentType(null);
      }
    } catch (error) {
      console.error('Erro ao verificar anexos:', error);
      setMessage({ type: 'error', text: 'Erro ao verificar anexos' });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-8 h-8" />;

    const type = fileType.toLowerCase();

    if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
      return <ImageIcon className="w-8 h-8 text-blue-600" />;
    }

    if (['xls', 'xlsx', 'csv'].includes(type)) {
      return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    }

    if (['zip', 'rar'].includes(type)) {
      return <FileArchive className="w-8 h-8 text-orange-600" />;
    }

    if (['pdf', 'doc', 'docx', 'txt', 'xml'].includes(type)) {
      return <FileText className="w-8 h-8 text-red-600" />;
    }

    return <File className="w-8 h-8 text-gray-600" />;
  };

  const isImageFile = (fileType: string | null) => {
    if (!fileType) return false;
    const type = fileType.toLowerCase();
    return type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type);
  };

  const handleDownload = async (url: string | null, type: string | null, label: string) => {
    try {
      setLoading(true);
      setMessage(null);

      if (!url) {
        throw new Error('URL do arquivo não encontrada');
      }

      const result = await attachmentService.downloadFile(url);

      if (result.data && result.fileType) {
        const tempUrl = URL.createObjectURL(result.data);

        let extension = 'bin';
        if (result.fileType === 'xml') extension = 'xml';
        else if (result.fileType === 'jpg') extension = 'jpg';
        else if (result.fileType === 'pdf') extension = 'pdf';
        else if (result.fileType === 'png') extension = 'png';
        else if (result.fileType === 'doc') extension = 'doc';
        else if (result.fileType === 'docx') extension = 'docx';

        const link = document.createElement('a');
        link.href = tempUrl;
        link.download = `${label.toLowerCase().replace(' ', '_')}_${maquinaId}_${Date.now()}.${extension}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(tempUrl);

        setMessage({ type: 'success', text: 'Download iniciado com sucesso!' });
      } else {
        throw new Error(result.error || 'Erro ao fazer download');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao fazer download'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (uploadType: 'primeiro_envio' | 'segundo_envio', isReplace = false) => {
    const currentFile = uploadType === 'primeiro_envio' ? photoUrl : documentUrl;

    if (isReplace && currentFile) {
      setConfirmState({
        type: 'replace',
        uploadType,
        onConfirm: () => {
          setConfirmState({ type: null });
          if (uploadType === 'primeiro_envio') {
            photoInputRef.current?.click();
          } else {
            documentInputRef.current?.click();
          }
        }
      });
    } else {
      if (uploadType === 'primeiro_envio') {
        photoInputRef.current?.click();
      } else {
        documentInputRef.current?.click();
      }
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    uploadType: 'primeiro_envio' | 'segundo_envio'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingType(uploadType);
      setMessage(null);

      // Validação específica para foto (apenas imagens)
      if (uploadType === 'primeiro_envio') {
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(file.type)) {
          throw new Error('Para foto da máquina, apenas imagens são permitidas (JPG, PNG, GIF, WEBP)');
        }
      }

      const currentFile = uploadType === 'primeiro_envio' ? photoUrl : documentUrl;
      const isReplacement = !!currentFile;

      console.log(`📤 ${isReplacement ? 'Substituindo' : 'Enviando'} arquivo para:`, uploadType);

      const result = await attachmentService.uploadFile(maquinaId, file, uploadType);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `${uploadType === 'primeiro_envio' ? 'Foto' : 'Documento'} ${isReplacement ? 'substituído' : 'enviado'} com sucesso!`
        });
        await checkAttachments();
      } else {
        throw new Error(result.error || 'Erro ao fazer upload');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao processar arquivo'
      });
    } finally {
      setUploadingType(null);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleDelete = (uploadType: 'primeiro_envio' | 'segundo_envio') => {
    const url = uploadType === 'primeiro_envio' ? photoUrl : documentUrl;

    if (!url) {
      setMessage({ type: 'error', text: 'URL do arquivo não encontrada para exclusão.' });
      return;
    }

    setConfirmState({
      type: 'delete',
      uploadType,
      onConfirm: async () => {
        setConfirmState({ type: null });
        try {
          setLoading(true);
          setMessage(null);
          console.log('🗑️ Excluindo arquivo:', { maquinaId, uploadType, url });

          const result = await attachmentService.deleteFile(url, maquinaId, uploadType);
          console.log('🗑️ Resultado da exclusão:', result);

          if (result.success) {
            setMessage({
              type: 'success',
              text: `${uploadType === 'primeiro_envio' ? 'Foto' : 'Documento'} excluído com sucesso!`
            });
            await checkAttachments();
          } else {
            throw new Error(result.error || 'Erro ao excluir arquivo');
          }
        } catch (error) {
          console.error('🗑️ Erro ao excluir:', error);
          setMessage({
            type: 'error',
            text: error instanceof Error ? error.message : 'Erro ao excluir arquivo'
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Modal de confirmação */}
      {confirmState.type && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] bg-black/40">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-yellow-500 mb-2" />
            <p className="text-base text-center mb-4 text-[#092f20] font-medium">
              Atenção: ao confirmar, o arquivo{confirmState.type === 'replace' ? ' atual' : ''} será excluído de forma definitiva do Painel da Fazenda e do nosso banco de dados. Deseja continuar?
            </p>
            <div className="flex gap-4 mt-2">
              <button
                className="px-4 py-2 rounded-lg bg-[#f3f4f6] text-[#092f20] hover:bg-[#e5e7eb]"
                onClick={() => setConfirmState({ type: null })}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-[#ffeaea] text-[#b71c1c] hover:bg-[#ffd6d6]"
                onClick={confirmState.onConfirm}
                disabled={loading}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Paperclip className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#092f20]">Gerenciar Anexos</h3>
              <p className="text-sm text-gray-600 truncate max-w-64">{maquinaDescription}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            disabled={loading || uploadingType !== null}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de feedback */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </span>
          </div>
        )}

        <div className="space-y-6">
          {/* SEÇÃO: FOTO DA MÁQUINA */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-6 h-6 text-blue-600" />
              <h4 className="text-lg font-bold text-[#092f20]">Foto da Máquina</h4>
              <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                photoUrl ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {photoUrl ? 'Foto anexada' : 'Sem foto'}
              </div>
            </div>

            {/* Preview da foto quando existe */}
            {photoUrl && isImageFile(photoType) && (
              <div className="mb-4 bg-white p-3 rounded-lg">
                <img
                  src={photoUrl}
                  alt="Foto da Máquina"
                  className="w-full h-64 object-contain rounded-lg"
                  onLoad={() => console.log('✅ Foto carregada:', photoUrl)}
                  onError={(e) => {
                    console.error('❌ Erro ao carregar foto:', photoUrl);
                    const img = e.target as HTMLImageElement;
                    if (!img.dataset.retried) {
                      img.dataset.retried = 'true';
                      img.src = photoUrl + '&retry=' + Date.now();
                    }
                  }}
                />
              </div>
            )}

            {/* Área de upload quando NÃO tem foto */}
            {!photoUrl && (
              <div className="mb-4">
                <div
                  className="border-2 border-dashed border-blue-300 bg-white rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                  onClick={() => handleFileSelect('primeiro_envio', false)}
                >
                  <Camera className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Clique para adicionar uma foto
                  </p>
                  <p className="text-xs text-gray-500">
                    Apenas imagens: JPG, PNG, GIF, WEBP (máx. 10MB)
                  </p>
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex flex-wrap gap-2">
              {!photoUrl ? (
                <button
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={() => handleFileSelect('primeiro_envio', false)}
                  disabled={uploadingType !== null}
                >
                  {uploadingType === 'primeiro_envio' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingType === 'primeiro_envio' ? 'Enviando...' : 'Adicionar Foto'}
                </button>
              ) : (
                <>
                  <button
                    className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors border border-blue-300"
                    onClick={() => handleDownload(photoUrl, photoType, 'foto_maquina')}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    onClick={() => handleFileSelect('primeiro_envio', true)}
                    disabled={uploadingType !== null}
                  >
                    {uploadingType === 'primeiro_envio' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Substituir Foto
                  </button>
                  <button
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    onClick={() => handleDelete('primeiro_envio')}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </>
              )}
            </div>
          </div>

          {/* SEÇÃO: DOCUMENTO DA MÁQUINA */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border-2 border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-6 h-6 text-gray-600" />
              <h4 className="text-lg font-bold text-[#092f20]">Documento da Máquina</h4>
              <div className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                documentUrl ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {documentUrl ? 'Documento anexado' : 'Sem documento'}
              </div>
            </div>

            {/* Preview do documento quando existe */}
            {documentUrl && (
              <div className="mb-4 bg-white p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(documentType)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Documento anexado</p>
                    <p className="text-xs text-gray-500">
                      Tipo: {documentType?.toUpperCase() || 'Desconhecido'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Área de upload quando NÃO tem documento */}
            {!documentUrl && (
              <div className="mb-4">
                <div
                  className="border-2 border-dashed border-gray-300 bg-white rounded-lg p-8 text-center hover:border-gray-500 transition-colors cursor-pointer"
                  onClick={() => handleFileSelect('segundo_envio', false)}
                >
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Clique para adicionar um documento
                  </p>
                  <p className="text-xs text-gray-500">
                    Todos os tipos de arquivo aceitos (máx. 10MB)
                  </p>
                </div>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex flex-wrap gap-2">
              {!documentUrl ? (
                <button
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                  onClick={() => handleFileSelect('segundo_envio', false)}
                  disabled={uploadingType !== null}
                >
                  {uploadingType === 'segundo_envio' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingType === 'segundo_envio' ? 'Enviando...' : 'Adicionar Documento'}
                </button>
              ) : (
                <>
                  <button
                    className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
                    onClick={() => handleDownload(documentUrl, documentType, 'documento_maquina')}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                    onClick={() => handleFileSelect('segundo_envio', true)}
                    disabled={uploadingType !== null}
                  >
                    {uploadingType === 'segundo_envio' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Substituir Documento
                  </button>
                  <button
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    onClick={() => handleDelete('segundo_envio')}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Inputs de arquivo ocultos */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={(e) => handleFileChange(e, 'primeiro_envio')}
          className="hidden"
        />
        <input
          ref={documentInputRef}
          type="file"
          accept="*/*"
          onChange={(e) => handleFileChange(e, 'segundo_envio')}
          className="hidden"
        />
      </div>
    </div>
  );
}
