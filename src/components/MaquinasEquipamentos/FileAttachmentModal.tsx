import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  Paperclip,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { AttachmentService } from '../../services/attachmentService';

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
  fileName?: string | null;
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
    { id: 'primeiro_envio', label: 'Primeiro Anexo', hasFile: false, url: null, fileType: null, fileName: null },
    { id: 'segundo_envio', label: 'Segundo Anexo', hasFile: false, url: null, fileType: null, fileName: null }
  ]);
  const [loading, setLoading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMessage(null);
      checkAttachments();
    }
  }, [isOpen, maquinaId]);

  const checkAttachments = async () => {
    try {
      setLoading(true);
      const attachmentInfo = await attachmentService.getAttachmentInfo(maquinaId);
      
      if (attachmentInfo) {
        setFileSlots([
          {
            id: 'primeiro_envio',
            label: 'Primeiro Anexo',
            hasFile: attachmentInfo.hasPrimeiroEnvio,
            url: attachmentInfo.url_primeiro_envio,
            fileType: attachmentInfo.primeiroEnvioType,
            fileName: getFileNameFromUrl(attachmentInfo.url_primeiro_envio)
          },
          {
            id: 'segundo_envio',
            label: 'Segundo Anexo',
            hasFile: attachmentInfo.hasSegundoEnvio,
            url: attachmentInfo.url_segundo_envio,
            fileType: attachmentInfo.segundoEnvioType,
            fileName: getFileNameFromUrl(attachmentInfo.url_segundo_envio)
          }
        ]);
      } else {
        setFileSlots([
          { id: 'primeiro_envio', label: 'Primeiro Anexo', hasFile: false, url: null, fileType: null, fileName: null },
          { id: 'segundo_envio', label: 'Segundo Anexo', hasFile: false, url: null, fileType: null, fileName: null }
        ]);
      }
    } catch (error) {
      console.error('Erro ao verificar anexos:', error);
      setMessage({ type: 'error', text: 'Erro ao verificar anexos' });
    } finally {
      setLoading(false);
    }
  };

  const getFileNameFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const urlWithoutParams = url.split('?')[0];
      const parts = urlWithoutParams.split('/');
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  };

  const isImageFile = (fileType: string | null) => {
    if (!fileType) return false;
    return fileType.startsWith('image/') ||
           fileType === 'jpg' ||
           fileType === 'jpeg' ||
           fileType === 'png' ||
           fileType === 'gif' ||
           fileType === 'webp';
  };

  const handleDownload = async (slot: FileSlot) => {
    try {
      setLoading(true);
      setMessage(null);

      if (!slot.url) {
        throw new Error('URL do arquivo não encontrada');
      }

      const result = await attachmentService.downloadFile(slot.url);

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.data) {
        throw new Error('Nenhum dado recebido do servidor');
      }

      if (result.data && result.fileType) {
        const tempUrl = URL.createObjectURL(result.data);

        let extension = 'bin';
        if (result.fileType === 'xml') extension = 'xml';
        else if (result.fileType === 'jpg' || result.fileType === 'jpeg') extension = 'jpg';
        else if (result.fileType === 'pdf') extension = 'pdf';
        else if (result.fileType === 'png') extension = 'png';
        else if (result.fileType === 'webp') extension = 'webp';

        const safeLabel = (slot.id || 'arquivo').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const link = document.createElement('a');
        link.href = tempUrl;
        link.download = `${safeLabel}_${maquinaId}_${Date.now()}.${extension}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(tempUrl);
        setMessage({ type: 'success', text: 'Download iniciado com sucesso!' });
      } else {
        throw new Error('Dados inválidos retornados do servidor');
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

  const openFileExplorer = (slotId: 'primeiro_envio' | 'segundo_envio') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml,.jpg,.jpeg,.pdf,.png,.webp,image/jpeg,image/png,image/webp,application/xml,application/pdf';
    input.onchange = (e) => handleFileChange(e as any, slotId);
    input.click();
  };

  const handleFileSelect = (slotId: 'primeiro_envio' | 'segundo_envio', isReplace = false) => {
    const currentSlot = fileSlots.find(slot => slot.id === slotId);

    if (isReplace && currentSlot?.hasFile) {
      setConfirmState({
        type: 'replace',
        slotId,
        onConfirm: () => {
          setConfirmState({ type: null });
          openFileExplorer(slotId);
        }
      });
    } else {
      openFileExplorer(slotId);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, slotId: 'primeiro_envio' | 'segundo_envio') => {
    const file = event.target.files?.[0];
    if (!file || !slotId) return;

    try {
      setUploadingSlot(slotId);
      setMessage(null);

      const currentSlot = fileSlots.find(slot => slot.id === slotId);
      const isReplacement = currentSlot?.hasFile || false;

      const result = await attachmentService.uploadFile(
        maquinaId,
        file,
        slotId,
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
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao processar arquivo'
      });
    } finally {
      setUploadingSlot(null);
      event.target.value = '';
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
          
          const result = await attachmentService.deleteFile(slot.url!, maquinaId, slot.id);

          if (result.success) {
            setMessage({ type: 'success', text: 'Arquivo excluído com sucesso!' });
            await checkAttachments();
          } else {
            throw new Error(result.error || 'Erro ao excluir arquivo');
          }
        } catch (error) {
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
                    onClick={() => handleFileSelect(slot.id)}
                    className="flex items-center justify-center gap-2 bg-[#86b646] text-white py-2 rounded hover:bg-[#397738] transition-colors"
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
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-2">
                          <div className="text-[#397738]">
                            <CheckCircle className="w-8 h-8" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-[#397738]">
                              Arquivo anexado
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
      </div>
    </div>
  );
}
