// src/components/Estoque/AttachmentProductModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  Paperclip,
  FileText,
  AlertCircle,
  CheckCircle,
  FileCode,
  File
} from 'lucide-react';
import { AttachmentProductService, AttachmentFile } from '../../services/attachmentProductService';

interface AttachmentProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function AttachmentProductModal({
  isOpen,
  onClose,
  productId,
  productName
}: AttachmentProductModalProps) {
  const [confirmState, setConfirmState] = useState<{
    type: 'delete-image' | 'delete-file' | 'replace-image' | 'replace-file' | null;
    onConfirm?: () => void;
  }>({ type: null });
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imageKey, setImageKey] = useState<number>(Date.now());
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAttachments([]);
      setMessage(null);
      setImageKey(Date.now());
      checkAttachments();
      console.log('🆔 Modal aberto para produto ID:', productId);
    }
  }, [isOpen, productId]);

  const checkAttachments = async () => {
    try {
      setLoading(true);
      console.log('🔄 Verificando anexos para produto:', productId);
      const files = await AttachmentProductService.listAttachments(productId);
      setAttachments(files);

      if (files.length > 0) {
        setImageKey(Date.now());
      }
    } catch (error) {
      console.error('❌ Erro ao verificar anexos:', error);
      setMessage({ type: 'error', text: 'Erro ao verificar anexos' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: 'image' | 'file') => {
    try {
      setLoading(true);
      setMessage(null);

      console.log('📥 Iniciando download:', { productId, type });

      await AttachmentProductService.downloadAttachment(productId, type === 'file' ? 'pdf' : 'jpg');

      console.log('✅ Download concluído com sucesso');
      setMessage({ type: 'success', text: 'Download iniciado com sucesso!' });
    } catch (error) {
      console.error('💥 Erro no download:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao fazer download'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (isReplace = false) => {
    if (isReplace) {
      setConfirmState({
        type: 'replace-image',
        onConfirm: () => {
          setConfirmState({ type: null });
          imageInputRef.current?.click();
        }
      });
    } else {
      imageInputRef.current?.click();
    }
  };

  const handleFileSelect = (isReplace = false) => {
    if (isReplace) {
      setConfirmState({
        type: 'replace-file',
        onConfirm: () => {
          setConfirmState({ type: null });
          fileInputRef.current?.click();
        }
      });
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isReplacing = attachments.some(a => a.type === 'image');

    try {
      setLoading(true);
      setMessage(null);
      console.log('📤 Iniciando upload da imagem...', isReplacing ? '(substituição)' : '(nova)');
      console.log('📁 Arquivo selecionado:', file.name, file.type, file.size, 'bytes');

      const error = AttachmentProductService.validateFile(file);
      if (error) {
        setMessage({ type: 'error', text: error });
        return;
      }

      await AttachmentProductService.uploadAttachment(productId, file);
      console.log('✅ Imagem salva com sucesso');

      console.log('⏳ Aguardando propagação do upload...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔄 Recarregando lista de anexos...');
      await checkAttachments();

      const successMessage = isReplacing ? 'Imagem substituída com sucesso!' : 'Imagem salva com sucesso!';
      setMessage({ type: 'success', text: successMessage });
      console.log('🎉 Processo de upload concluído');
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar imagem';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isReplacing = attachments.some(a => a.type === 'pdf');

    try {
      setLoading(true);
      setMessage(null);
      console.log('📤 Iniciando upload do arquivo...', isReplacing ? '(substituição)' : '(novo)');
      console.log('📁 Arquivo selecionado:', file.name, file.type, file.size, 'bytes');

      const error = AttachmentProductService.validateFile(file);
      if (error) {
        setMessage({ type: 'error', text: error });
        return;
      }

      await AttachmentProductService.uploadAttachment(productId, file);
      console.log('✅ Arquivo salvo com sucesso');

      console.log('⏳ Aguardando propagação do upload...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔄 Recarregando lista de anexos...');
      await checkAttachments();

      const successMessage = isReplacing ? 'Arquivo substituído com sucesso!' : 'Arquivo salvo com sucesso!';
      setMessage({ type: 'success', text: successMessage });
      console.log('🎉 Processo de upload concluído');
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar arquivo';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = () => {
    setConfirmState({
      type: 'delete-image',
      onConfirm: async () => {
        setConfirmState({ type: null });
        try {
          setLoading(true);
          setMessage(null);
          await AttachmentProductService.deleteSingleAttachment(productId, 'jpg');
          setMessage({ type: 'success', text: 'Imagem excluída!' });
          await checkAttachments();
        } catch (error) {
          setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao excluir imagem' });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteFile = () => {
    setConfirmState({
      type: 'delete-file',
      onConfirm: async () => {
        setConfirmState({ type: null });
        try {
          setLoading(true);
          setMessage(null);
          await AttachmentProductService.deleteSingleAttachment(productId, 'pdf');
          setMessage({ type: 'success', text: 'Arquivo excluído!' });
          await checkAttachments();
        } catch (error) {
          setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao excluir arquivo' });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const getFileIcon = (fileType: 'pdf' | 'xml' | 'file') => {
    if (fileType === 'pdf') return FileText;
    if (fileType === 'xml') return FileCode;
    return File;
  };

  const getFileTypeLabel = (fileType: 'pdf' | 'xml' | 'file') => {
    if (fileType === 'pdf') return 'PDF anexado';
    if (fileType === 'xml') return 'XML anexado';
    return 'Arquivo anexado';
  };

  const getFileIconColor = (fileType: 'pdf' | 'xml' | 'file') => {
    if (fileType === 'pdf') return 'text-red-600';
    if (fileType === 'xml') return 'text-purple-600';
    return 'text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {confirmState.type && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-yellow-500 mb-2" />
            <p className="text-base text-center mb-4 text-[#092f20] font-medium">
              Atenção: ao confirmar, o arquivo{confirmState.type.startsWith('replace') ? ' atual' : ''} será excluído de forma definitiva do Painel da Fazenda e do nosso banco de dados. Deseja continuar?
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
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Paperclip className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#092f20]">Gerenciar Anexos</h3>
              <p className="text-sm text-gray-600 truncate max-w-48">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            disabled={loading}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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

        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4">
            {!attachments.find(a => a.type === 'image') && (
              <button
                className="flex items-center justify-center gap-2 bg-[#86b646] text-white py-2 rounded hover:bg-[#397738] transition-colors"
                onClick={() => handleImageSelect(false)}
                disabled={loading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> Anexar Imagem
              </button>
            )}
            {!attachments.find(a => a.type === 'pdf' || a.type === 'xml' || a.type === 'file') && (
              <button
                className="flex items-center justify-center gap-2 bg-[#397738] text-white py-2 rounded hover:bg-[#86b646] transition-colors"
                onClick={() => handleFileSelect(false)}
                disabled={loading}
              >
                <FileText className="w-5 h-5" /> Anexar Arquivo
              </button>
            )}
          </div>

          {attachments.find(a => a.type === 'image') && (
            <div className="flex flex-col items-center gap-2 bg-gray-50 p-3 rounded-lg border">
              <img
                key={imageKey}
                src={`${attachments.find(a => a.type === 'image')?.url}&t=${imageKey}`}
                alt="Imagem anexada"
                className="max-h-32 mb-2 rounded border"
                onLoad={() => console.log('🖼️ Imagem carregada:', imageKey)}
                onError={(e) => console.error('❌ Erro ao carregar imagem:', e)}
              />
              <div className="flex gap-2 mb-2">
                <button
                  className="bg-[#f3f4f6] text-[#092f20] px-2 py-1 rounded hover:bg-[#e5e7eb] flex items-center gap-1 transition-colors"
                  onClick={() => handleDownload('image')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-[#eaf4ec] text-[#092f20] px-3 py-1 rounded hover:bg-[#d3e7d8] flex items-center gap-1 transition-colors"
                  onClick={() => handleImageSelect(true)}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" /> Substituir Imagem
                </button>
                <button
                  className="bg-[#ffeaea] text-[#b71c1c] px-3 py-1 rounded hover:bg-[#ffd6d6] flex items-center gap-1 transition-colors"
                  onClick={handleDeleteImage}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" /> Excluir Imagem
                </button>
              </div>
            </div>
          )}

          {attachments.find(a => a.type === 'pdf' || a.type === 'xml' || a.type === 'file') && (
            <div className="flex flex-col items-center gap-2 bg-gray-50 p-3 rounded-lg border">
              {(() => {
                const attachment = attachments.find(a => a.type === 'pdf' || a.type === 'xml' || a.type === 'file');
                if (!attachment) return null;

                const FileIcon = getFileIcon(attachment.type as 'pdf' | 'xml' | 'file');
                const iconColor = getFileIconColor(attachment.type as 'pdf' | 'xml' | 'file');
                const fileLabel = getFileTypeLabel(attachment.type as 'pdf' | 'xml' | 'file');

                return (
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <div className={iconColor}>
                      <FileIcon className="w-8 h-8" />
                    </div>
                    <span className="font-medium text-[#092f20]">{fileLabel}</span>
                  </div>
                );
              })()}
              <div className="flex gap-2 mb-2">
                <button
                  className="bg-[#f3f4f6] text-[#092f20] px-2 py-1 rounded hover:bg-[#e5e7eb] flex items-center gap-1 transition-colors"
                  onClick={() => handleDownload('file')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-[#eaf4ec] text-[#092f20] px-3 py-1 rounded hover:bg-[#d3e7d8] flex items-center gap-1 transition-colors"
                  onClick={() => handleFileSelect(true)}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" /> Substituir Arquivo
                </button>
                <button
                  className="bg-[#ffeaea] text-[#b71c1c] px-3 py-1 rounded hover:bg-[#ffd6d6] flex items-center gap-1 transition-colors"
                  onClick={handleDeleteFile}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" /> Excluir Arquivo
                </button>
              </div>
            </div>
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,image/avif,image/heic,image/heif"
          onChange={handleImageChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,application/xml,text/xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
