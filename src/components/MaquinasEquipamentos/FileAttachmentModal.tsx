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
  File
} from 'lucide-react';
import { AttachmentService } from '../../services/attachmentService';

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

interface ConfirmState {
  type: 'delete' | 'replace' | null;
  slotId?: 'primeiro_envio' | 'segundo_envio';
  onConfirm?: () => void;
}

export default function FileAttachmentModal({
  isOpen,
  onClose,
  maquinaId,
  maquinaDescription
}: FileAttachmentModalProps) {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    type: null
  });
  const [fileSlots, setFileSlots] = useState<FileSlot[]>([
    { id: 'primeiro_envio', hasFile: false, url: null, fileType: null },
    { id: 'segundo_envio', hasFile: false, url: null, fileType: null }
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadSlot, setActiveUploadSlot] = useState<'primeiro_envio' | 'segundo_envio' | null>(null);

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

  const handleFileSelect = (slotId: 'primeiro_envio' | 'segundo_envio', isReplace = false) => {
    const currentSlot = fileSlots.find(slot => slot.id === slotId);

    if (isReplace && currentSlot?.hasFile) {
      setConfirmState({
        type: 'replace',
        slotId,
        onConfirm: () => {
          setConfirmState({ type: null });
          setActiveUploadSlot(slotId);
          fileInputRef.current?.click();
        }
      });
    } else {
      setActiveUploadSlot(slotId);
      fileInputRef.current?.click();
    }
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

  const handleDelete = (slot: FileSlot) => {
    if (!slot.url) {
      setMessage({ type: 'error', text: 'URL do arquivo não encontrada para exclusão.' });
      return;
    }

    setConfirmState({
      type: 'delete',
      slotId: slot.id,
      onConfirm: async () => {
        setConfirmState({ type: null });
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
      }
    });
  };


  if (!isOpen) return null;

  const totalFiles = fileSlots.filter(slot => slot.hasFile).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Modal de confirmação customizado */}
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
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
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
            disabled={loading || uploadingSlot !== null}
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

        {/* Área de anexos */}
        <div className="space-y-4 mb-6">
          {fileSlots.map((slot) => (
            <div key={slot.id} className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-[#092f20]">{slot.label}</h4>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  slot.hasFile
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {slot.hasFile ? 'Arquivo anexado' : 'Nenhum arquivo'}
                </div>
              </div>

              {/* Botões de ação quando NÃO tem arquivo */}
              {!slot.hasFile && (
                <div className="flex flex-col gap-2">
                  <button
                    className="flex items-center justify-center gap-2 bg-[#86b646] text-white py-2 rounded hover:bg-[#397738] transition-colors"
                    onClick={() => handleFileSelect(slot.id, false)}
                    disabled={uploadingSlot !== null}
                  >
                    {uploadingSlot === slot.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingSlot === slot.id ? 'Enviando...' : 'Anexar Arquivo'}
                  </button>
                </div>
              )}

              {/* Preview e controles quando TEM arquivo */}
              {slot.hasFile && slot.url && (
                <div className="flex flex-col items-center gap-2">
                  {/* Preview do arquivo */}
                  <div className="mb-2 w-full">
                    {(() => {
                      const isImage = isImageFile(slot.fileType);
                      return isImage ? (
                        <img
                          src={slot.url}
                          alt={slot.label}
                          className="max-h-32 mx-auto rounded border"
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
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-gray-600 py-2">
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

                  {/* Botão Download */}
                  <div className="flex gap-2 mb-2">
                    <button
                      className="bg-[#f3f4f6] text-[#092f20] px-3 py-1 rounded hover:bg-[#e5e7eb] flex items-center gap-1 transition-colors"
                      onClick={() => handleDownload(slot)}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download
                    </button>
                  </div>

                  {/* Botões Substituir e Excluir */}
                  <div className="flex gap-2">
                    <button
                      className="bg-[#eaf4ec] text-[#092f20] px-3 py-1 rounded hover:bg-[#d3e7d8] flex items-center gap-1 transition-colors"
                      onClick={() => handleFileSelect(slot.id, true)}
                      disabled={uploadingSlot !== null}
                    >
                      {uploadingSlot === slot.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Substituir Arquivo
                    </button>
                    <button
                      className="bg-[#ffeaea] text-[#b71c1c] px-3 py-1 rounded hover:bg-[#ffd6d6] flex items-center gap-1 transition-colors"
                      onClick={() => handleDelete(slot)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" /> Excluir Arquivo
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input de arquivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.jpg,.jpeg,.pdf,image/jpeg,application/xml,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}