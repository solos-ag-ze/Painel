// src/components/Estoque/AttachmentProductModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
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
    if (fileType === 'pdf') return 'text-orange-600';
    return 'text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Modal de confirmação customizado */}
      {confirmState.type && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,68,23,0.1)] max-w-sm w-full p-6 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-[#F7941F] mb-2" />
            <p className="text-[14px] text-center mb-4 text-[#004417] font-medium">
              Atenção: ao confirmar, o arquivo{confirmState.type.startsWith('replace') ? ' atual' : ''} será excluído de forma definitiva do Painel da Fazenda e do nosso banco de dados. Deseja continuar?
            </p>
            <div className="flex gap-3 mt-2">
              <button
                className="px-6 py-2 rounded-xl bg-[rgba(0,68,23,0.05)] text-[#004417] hover:bg-[rgba(0,68,23,0.08)] font-semibold transition-all"
                onClick={() => setConfirmState({ type: null })}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="px-6 py-2 rounded-xl bg-[rgba(247,148,31,0.1)] text-[#F7941F] hover:bg-[rgba(247,148,31,0.15)] font-semibold transition-all"
                onClick={confirmState.onConfirm}
                disabled={loading}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,68,23,0.1)] max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[18px] font-bold text-[#004417] mb-2">Gerenciar Anexos</h3>
            <p className="text-[14px] text-[rgba(0,68,23,0.7)] truncate max-w-64">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[rgba(0,68,23,0.5)] hover:text-[#00A651] rounded-lg transition-colors"
            disabled={loading}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de feedback */}
        {message && (
          <div className={`mb-4 p-3 rounded-xl flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-[rgba(0,166,81,0.1)] border border-[rgba(0,166,81,0.2)]' 
              : 'bg-[rgba(247,148,31,0.1)] border border-[rgba(247,148,31,0.2)]'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-[#00A651]" />
            ) : (
              <AlertCircle className="w-5 h-5 text-[#F7941F]" />
            )}
            <span className={`text-[13px] font-medium ${
              message.type === 'success' ? 'text-[#004417]' : 'text-[#004417]'
            }`}>
              {message.text}
            </span>
          </div>
        )}

        {/* Área de anexos */}
        <div className="mb-6 space-y-4">
          {/* Botões de anexar sempre disponíveis para o tipo que não existe */}
          <div className="flex flex-col gap-3">
            {!attachments.find(a => a.type === 'image') && (
              <button
                className="flex items-center justify-center gap-2 bg-[#00A651] text-white py-3 rounded-xl hover:bg-[#004417] transition-all duration-200 font-semibold h-12"
                onClick={() => handleImageSelect(false)}
                disabled={loading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> Anexar Imagem
              </button>
            )}
            {!attachments.find(a => a.type === 'pdf') && (
              <button
                className="flex items-center justify-center gap-2 bg-[#004417] text-white py-3 rounded-xl hover:bg-[#006F2E] transition-all duration-200 font-semibold h-12"
                onClick={() => handlePdfSelect(false)}
                disabled={loading}
              >
                <FileText className="w-5 h-5" /> Anexar Arquivo
              </button>
            )}
          </div>

          {/* Se houver imagem */}
          {attachments.find(a => a.type === 'image') && (
            <div className="flex flex-col items-center gap-3 bg-[rgba(0,68,23,0.02)] p-4 rounded-xl border border-[rgba(0,68,23,0.08)]">
              <img
                src={attachments.find(a => a.type === 'image')?.url}
                alt="Imagem anexada"
                className="max-h-32 mb-2 rounded-lg border border-[rgba(0,68,23,0.1)]"
              />
              <div className="flex gap-2 mb-2">
                <button
                  className="bg-[rgba(0,68,23,0.05)] text-[#004417] px-3 py-1.5 rounded-lg hover:bg-[rgba(0,68,23,0.08)] flex items-center gap-1.5 transition-all font-medium text-[13px]"
                  onClick={() => handleDownload('image')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-[rgba(0,166,81,0.1)] text-[#00A651] px-3 py-1.5 rounded-lg hover:bg-[rgba(0,166,81,0.15)] flex items-center gap-1.5 transition-all font-medium text-[13px]"
                  onClick={() => handleImageSelect(true)}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" /> Substituir Imagem
                </button>
                <button
                  className="bg-[rgba(247,148,31,0.1)] text-[#F7941F] px-3 py-1.5 rounded-lg hover:bg-[rgba(247,148,31,0.15)] flex items-center gap-1.5 transition-all font-medium text-[13px]"
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
            <div className="flex flex-col items-center gap-3 bg-[rgba(0,68,23,0.02)] p-4 rounded-xl border border-[rgba(0,68,23,0.08)]">
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
                    <span className="font-semibold text-[#004417] text-[14px]">{fileLabel}</span>
                  </div>
                );
              })()}
              <div className="flex gap-2 mb-2">
                <button
                  className="bg-[rgba(0,68,23,0.05)] text-[#004417] px-3 py-1.5 rounded-lg hover:bg-[rgba(0,68,23,0.08)] flex items-center gap-1.5 transition-all font-medium text-[13px]"
                  onClick={() => handleDownload('pdf')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-[rgba(0,166,81,0.1)] text-[#00A651] px-3 py-1.5 rounded-lg hover:bg-[rgba(0,166,81,0.15)] flex items-center gap-1.5 transition-all font-medium text-[13px]"
                  onClick={() => handlePdfSelect(true)}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" /> Substituir Arquivo
                </button>
                <button
                  className="bg-[rgba(247,148,31,0.1)] text-[#F7941F] px-3 py-1.5 rounded-lg hover:bg-[rgba(247,148,31,0.15)] flex items-center gap-1.5 transition-all font-medium text-[13px]"
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
