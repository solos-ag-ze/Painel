import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2, 
  Paperclip,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  File
} from 'lucide-react';
import { AttachmentService } from '../../services/attachmentService';
import { MaquinaService } from '../../services/maquinaService';

// Create AttachmentService instance
const attachmentService = new AttachmentService();

interface FileAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  maquinaId: string;
  maquinaDescription: string;
}

interface FileSlot {
  id: 'primeiro_envio' | 'segundo_envio';
  label: string;
  hasFile: boolean;
  url: string | null;
  fileType: string | null;
}

export default function FileAttachmentModal({ 
  isOpen, 
  onClose, 
  maquinaId, 
  maquinaDescription 
}: FileAttachmentModalProps) {
  const [fileSlots, setFileSlots] = useState<FileSlot[]>([
    { id: 'primeiro_envio', label: 'Primeiro Arquivo', hasFile: false, url: null, fileType: null },
    { id: 'segundo_envio', label: 'Segundo Arquivo', hasFile: false, url: null, fileType: null }
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadSlot, setActiveUploadSlot] = useState<'primeiro_envio' | 'segundo_envio' | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkAttachments();
    }
  }, [isOpen, maquinaId]);

  const checkAttachments = async () => {
    try {
      setLoading(true);
      console.log('🔄 Verificando anexos para máquina:', maquinaId);
      
      const attachmentInfo = await attachmentService.getAttachmentInfo(maquinaId);
      console.log('📋 Resultado da verificação:', attachmentInfo);
      
      if (attachmentInfo) {
        setFileSlots([
          {
            id: 'primeiro_envio',
            label: 'Primeiro Arquivo',
            hasFile: attachmentInfo.hasPrimeiroEnvio,
            url: attachmentInfo.url_primeiro_envio,
            fileType: attachmentInfo.primeiroEnvioType
          },
          {
            id: 'segundo_envio',
            label: 'Segundo Arquivo',
            hasFile: attachmentInfo.hasSegundoEnvio,
            url: attachmentInfo.url_segundo_envio,
            fileType: attachmentInfo.segundoEnvioType
          }
        ]);
      } else {
        // If no attachment info found, reset to empty state
        setFileSlots([
          { id: 'primeiro_envio', label: 'Primeiro Arquivo', hasFile: false, url: null, fileType: null },
          { id: 'segundo_envio', label: 'Segundo Arquivo', hasFile: false, url: null, fileType: null }
        ]);
      }
    } catch (error) {
      console.error('Erro ao verificar anexos:', error);
      setMessage({ type: 'error', text: 'Erro ao verificar anexos' });
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5" />;
    
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5" />;
    }
    
    return <FileText className="w-5 h-5" />;
  };

  const isImageFile = (fileType: string | null) => {
    if (!fileType) return false;
    
    // Verifica se é um tipo de imagem
    const isImage = fileType.startsWith('image/') || 
                   fileType === 'jpg' || 
                   fileType === 'jpeg' || 
                   fileType === 'png' || 
                   fileType === 'gif' || 
                   fileType === 'webp';
    
    console.log('🖼️ Verificando se é imagem:', { fileType, isImage });
    return isImage;
  };

  const handleDownload = async (slot: FileSlot) => {
    try {
      setLoading(true);
      setMessage(null);
      
      if (!slot.url) {
        throw new Error('URL do arquivo não encontrada');
      }
      
      const result = await attachmentService.downloadFile(slot.url);
      
      if (result.data && result.fileType) {
        // Criar URL temporária
        const tempUrl = URL.createObjectURL(result.data);
        
        let extension = 'bin';
        if (result.fileType === 'xml') extension = 'xml';
        else if (result.fileType === 'jpg') extension = 'jpg';
        else if (result.fileType === 'pdf') extension = 'pdf';

        // Criar link para download
        const link = document.createElement('a');
        link.href = tempUrl;
        link.download = `${slot.label.toLowerCase().replace(' ', '_')}_${maquinaId}_${Date.now()}.${extension}`;
        
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

  const handleFileSelect = (slotId: 'primeiro_envio' | 'segundo_envio') => {
    setActiveUploadSlot(slotId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeUploadSlot) return;

    try {
      setUploadingSlot(activeUploadSlot);
      setMessage(null);
      
      // Find the current slot to check if it has an existing file
      const currentSlot = fileSlots.find(slot => slot.id === activeUploadSlot);
      const isReplacement = currentSlot?.hasFile || false;
      
      console.log(`📤 ${isReplacement ? 'Replacing' : 'Uploading'} file for slot:`, activeUploadSlot);

      const result = await attachmentService.uploadFile(
        maquinaId, 
        file,
        activeUploadSlot,
      );
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Arquivo ${isReplacement ? 'substituído' : 'enviado'} com sucesso!` 
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
      setUploadingSlot(null);
      setActiveUploadSlot(null);
      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (slot: FileSlot) => {
    if (!confirm(`Tem certeza que deseja excluir o ${slot.label.toLowerCase()}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    if (!slot.url) {
      setMessage({ type: 'error', text: 'URL do arquivo não encontrada para exclusão.' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      console.log('🗑️ Attempting to delete:', {
        maquinaId,
        slotId: slot.id,
        hasFile: slot.hasFile,
        url: slot.url
      });

      const result = await attachmentService.deleteFile(slot.url, maquinaId, slot.id);
      console.log('🗑️ Delete result:', result);

      if (result.success) {
        setMessage({ type: 'success', text: 'Arquivo excluído com sucesso!' });
        await checkAttachments();
      } else {
        throw new Error(result.error || 'Erro ao excluir arquivo');
      }
      
    } catch (error) {
      console.error('🗑️ Delete error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao excluir arquivo'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (url: string | null) => {
    if (url) {
      setCurrentImageUrl(url);
      setShowImageModal(true);
    }
  };

  const handleSaveImage = async (url: string | null) => {
    if (!url) return;
    
    try {
      setMessage(null);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao baixar imagem');
      
      const blob = await response.blob();
      const tempUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = tempUrl;
      link.download = `anexo_maquina_${maquinaId}_${Date.now()}.jpg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(tempUrl);
      
      setMessage({ type: 'success', text: 'Imagem salva com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar imagem' });
    }
  };

  if (!isOpen) return null;

  const totalFiles = fileSlots.filter(slot => slot.hasFile).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Paperclip className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#092f20]">Gerenciar Arquivos</h3>
              <p className="text-sm text-gray-600 truncate max-w-64">{maquinaDescription}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            disabled={loading || uploadingSlot !== null}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Geral */}
        <div className="mb-6">
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            totalFiles > 0 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center space-x-2">
              {totalFiles > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-500" />
              )}
              <span className={`text-sm font-medium ${
                totalFiles > 0 ? 'text-green-800' : 'text-gray-700'
              }`}>
                {totalFiles > 0 ? `${totalFiles} arquivo(s) encontrado(s)` : 'Nenhum arquivo encontrado'}
              </span>
            </div>
            <button
              onClick={checkAttachments}
              disabled={loading}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-white hover:bg-gray-50 rounded border transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Slots de Arquivos */}
        <div className="space-y-4 mb-6">
          {fileSlots.map((slot) => (
            <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{slot.label}</h4>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  slot.hasFile 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {slot.hasFile ? 'Enviado' : 'Vazio'}
                </div>
              </div>

              {/* Preview do arquivo */}
              {slot.hasFile && slot.url && (
                <div className="mb-3">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    {(() => {
                      const isImage = isImageFile(slot.fileType);
                      console.log('🔍 Debug preview:', { 
                        slotId: slot.id, 
                        hasFile: slot.hasFile, 
                        url: slot.url, 
                        fileType: slot.fileType, 
                        isImage 
                      });
                      
                      return isImage ? (
                        <div className="flex items-center justify-center relative group">
                          <img 
                            src={slot.url} 
                            alt={slot.label}
                            className="max-w-full max-h-32 rounded cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => handleImageClick(slot.url)}
                            onLoad={() => console.log('✅ Imagem carregada:', slot.url)}
                            onError={(e) => {
                              console.error('❌ Erro ao carregar imagem:', slot.url);
                              const img = e.target as HTMLImageElement;
                              if (!img.dataset.retried) {
                                img.dataset.retried = 'true';
                                img.src = slot.url + '&retry=' + Date.now();
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => handleImageClick(slot.url)}
                              className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                              title="Ampliar imagem"
                            >
                              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3 text-gray-600">
                          {getFileIcon(slot.fileType)}
                          <div>
                            <p className="text-sm font-medium">Arquivo anexado</p>
                            <p className="text-xs text-gray-500">
                              {slot.fileType || 'Tipo desconhecido'}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Botões de ação para cada slot */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(slot)}
                  disabled={!slot.hasFile || loading}
                  className={`flex items-center space-x-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                    slot.hasFile && !loading
                      ? 'bg-[#397738] text-white hover:bg-[#092f20]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  <span>Baixar</span>
                </button>

                <button
                  onClick={() => handleFileSelect(slot.id)}
                  disabled={uploadingSlot !== null}
                  className={`flex items-center space-x-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                    uploadingSlot === slot.id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#86b646] text-white hover:bg-[#397738]'
                  }`}
                >
                  {uploadingSlot === slot.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : slot.hasFile ? (
                    <RefreshCw className="w-3 h-3" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  <span>{slot.hasFile ? 'Substituir' : 'Enviar'}</span>
                </button>

                <button
                  onClick={() => handleDelete(slot)}
                  disabled={!slot.hasFile || loading}
                  className={`flex items-center space-x-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                    slot.hasFile && !loading
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          ))}
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

        {/* Botão Fechar */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            disabled={loading || uploadingSlot !== null}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <X className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>

        {/* Input de arquivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.jpg,.jpeg,.pdf,image/jpeg,application/xml,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modal de Zoom da Imagem */}
        {showImageModal && currentImageUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4">
            <div className="relative max-w-full max-h-full">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-all z-10"
              >
                <X className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => handleSaveImage(currentImageUrl)}
                className="absolute top-4 left-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-all z-10"
                title="Salvar imagem"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              <img
                src={currentImageUrl}
                alt="Anexo ampliado"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}