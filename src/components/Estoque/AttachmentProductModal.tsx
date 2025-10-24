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
  Table,
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
  // Estado para confirmação customizada
  const [confirmState, setConfirmState] = useState<{
    type: 'delete-image' | 'delete-pdf' | 'replace-image' | 'replace-pdf' | null;
    onConfirm?: () => void;
  }>({ type: null });
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAttachments([]); // Limpa anexos antigos
      setMessage(null);   // Limpa mensagens antigas
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
    } catch (error) {
      console.error('Erro ao listar anexos:', error);
      setMessage({ type: 'error', text: 'Erro ao listar anexos' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: 'image' | 'pdf') => {
    try {
      setLoading(true);
      setMessage(null);
  await AttachmentProductService.downloadAttachment(productId, type === 'pdf' ? 'pdf' : 'jpg');
      setMessage({ type: 'success', text: 'Download iniciado com sucesso!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao fazer download' 
      });
    } finally {
      setLoading(false);
    }
  };


  // Adicionar/substituir imagem/pdf: confirmação só para substituir
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
  const handlePdfSelect = (isReplace = false) => {
    if (isReplace) {
      setConfirmState({
        type: 'replace-pdf',
        onConfirm: () => {
          setConfirmState({ type: null });
          pdfInputRef.current?.click();
        }
      });
    } else {
      pdfInputRef.current?.click();
    }
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      setMessage(null);
      const error = AttachmentProductService.validateFile(file);
      if (error) {
        setMessage({ type: 'error', text: error });
        return;
      }
      await AttachmentProductService.uploadAttachment(productId, file);
      setMessage({ type: 'success', text: 'Imagem salva com sucesso!' });
      await checkAttachments();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao processar imagem' });
    } finally {
      setLoading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      setMessage(null);
      const error = AttachmentProductService.validateFile(file);
      if (error) {
        setMessage({ type: 'error', text: error });
        return;
      }
      await AttachmentProductService.uploadAttachment(productId, file);
      setMessage({ type: 'success', text: 'Arquivo PDF salvo com sucesso!' });
      await checkAttachments();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao processar arquivo' });
    } finally {
      setLoading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };


  // Excluir individualmente imagem ou PDF
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

  const handleDeletePdf = () => {
    setConfirmState({
      type: 'delete-pdf',
      onConfirm: async () => {
        setConfirmState({ type: null });
        try {
          setLoading(true);
          setMessage(null);
          await AttachmentProductService.deleteSingleAttachment(productId, 'pdf');
          setMessage({ type: 'success', text: 'Arquivo PDF excluído!' });
          await checkAttachments();
        } catch (error) {
          setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao excluir arquivo' });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const getFileIcon = (fileType: 'image' | 'pdf') => {
    if (fileType === 'pdf') return FileText;
    return File;
  };

  const getFileTypeLabel = (fileType: 'image' | 'pdf') => {
    if (fileType === 'pdf') return 'PDF anexado';
    return 'Arquivo anexado';
  };

  const getFileIconColor = (fileType: 'image' | 'pdf') => {
    if (fileType === 'pdf') return 'text-red-600';
    return 'text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Modal de confirmação customizado */}
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
        {/* Header */}
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
        <div className="mb-6 space-y-4">
          {/* Botões de anexar sempre disponíveis para o tipo que não existe */}
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
            {!attachments.find(a => a.type === 'pdf') && (
              <button
                className="flex items-center justify-center gap-2 bg-[#397738] text-white py-2 rounded hover:bg-[#86b646] transition-colors"
                onClick={() => handlePdfSelect(false)}
                disabled={loading}
              >
                <FileText className="w-5 h-5" /> Anexar Arquivo
              </button>
            )}
          </div>

          {/* Se houver imagem */}
          {attachments.find(a => a.type === 'image') && (
            <div className="flex flex-col items-center gap-2 bg-gray-50 p-3 rounded-lg border">
              <img
                src={attachments.find(a => a.type === 'image')?.url}
                alt="Imagem anexada"
                className="max-h-32 mb-2 rounded border"
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

          {/* Se houver PDF */}
          {attachments.find(a => a.type === 'pdf') && (
            <div className="flex flex-col items-center gap-2 bg-gray-50 p-3 rounded-lg border">
              {(() => {
                const attachment = attachments.find(a => a.type === 'pdf');
                if (!attachment) return null;

                const FileIcon = getFileIcon(attachment.type);
                const iconColor = getFileIconColor(attachment.type);
                const fileLabel = getFileTypeLabel(attachment.type);

                return (
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <div className={iconColor}>
                      <FileIcon className="w-8 h-8" />
                    </div>
                    <span className="font-medium text-[#092f20]">{fileLabel}</span>
                    {attachment.name && (
                      <p className="text-xs text-gray-500 truncate max-w-xs">{attachment.name}</p>
                    )}
                  </div>
                );
              })()}
              <div className="flex gap-2 mb-2">
                <button
                  className="bg-[#f3f4f6] text-[#092f20] px-2 py-1 rounded hover:bg-[#e5e7eb] flex items-center gap-1 transition-colors"
                  onClick={() => handleDownload('pdf')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-[#eaf4ec] text-[#092f20] px-3 py-1 rounded hover:bg-[#d3e7d8] flex items-center gap-1 transition-colors"
                  onClick={() => handlePdfSelect(true)}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" /> Substituir Arquivo
                </button>
                <button
                  className="bg-[#ffeaea] text-[#b71c1c] px-3 py-1 rounded hover:bg-[#ffd6d6] flex items-center gap-1 transition-colors"
                  onClick={handleDeletePdf}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" /> Excluir Arquivo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inputs ocultos */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,image/avif"
          onChange={handleImageChange}
          className="hidden"
        />
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf,application/xml,text/xml,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
          onChange={handlePdfChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
