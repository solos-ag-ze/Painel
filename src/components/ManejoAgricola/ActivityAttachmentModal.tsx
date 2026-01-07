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
  File,
  Loader2
} from 'lucide-react';
import { ActivityAttachmentService } from '../../services/activityAttachmentService';
import { AuthService } from '../../services/authService';
import { UserService } from '../../services/userService';
import { DocumentosService } from '../../services/documentosService';

interface ActivityAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  activityDescription: string;
}

export type AttachmentFile = {
  url: string;
  type: 'image' | 'pdf' | 'xml' | 'file';
  name: string;
};

// Ícone do WhatsApp como componente
const WhatsAppIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function ActivityAttachmentModal({
  isOpen,
  onClose,
  activityId,
  activityDescription
}: ActivityAttachmentModalProps) {
  const [confirmState, setConfirmState] = useState<{
    type: 'delete-image' | 'delete-file' | 'replace-image' | 'replace-file' | null;
    onConfirm?: () => void;
  }>({ type: null });
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imageKey, setImageKey] = useState<number>(Date.now());
  const [fileKey, setFileKey] = useState<number>(Date.now());
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAttachments([]);
      setMessage(null);
      setImageKey(Date.now());
      setFileKey(Date.now());
      checkAttachments();
      console.log('🆔 Modal aberto para atividade ID:', activityId);
    }
  }, [isOpen, activityId]);

  const checkAttachments = async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log('🔄 Verificando anexos para atividade:', activityId, forceRefresh ? '(refresh forçado)' : '');

      const files: AttachmentFile[] = [];

      const imageUrl = await ActivityAttachmentService.getAttachmentUrl(activityId, forceRefresh);
      console.log('📸 URL da imagem:', imageUrl);

      if (imageUrl) {
        files.push({
          url: imageUrl,
          type: 'image',
          name: `${activityId}.jpg`
        });
        console.log('✅ Imagem adicionada à lista de anexos');
      }

      const fileUrl = await ActivityAttachmentService.getFileAttachmentUrl(activityId, forceRefresh);
      console.log('📄 URL do arquivo:', fileUrl);

      if (fileUrl) {
        const fileType = fileUrl.includes('.pdf') ? 'pdf' : fileUrl.includes('.xml') ? 'xml' : 'file';
        const extension = fileType === 'pdf' ? 'pdf' : fileType === 'xml' ? 'xml' : 'file';
        files.push({
          url: fileUrl,
          type: fileType as 'pdf' | 'xml' | 'file',
          name: `${activityId}.${extension}`
        });
        console.log('✅ Arquivo adicionado à lista de anexos');
      }

      console.log('📋 Total de anexos encontrados:', files.length);
      setAttachments(files);

      if (files.length > 0) {
        setImageKey(Date.now());
        setFileKey(Date.now());
      }
    } catch (error) {
      console.error('❌ Erro ao verificar anexos:', error);
      setMessage({ type: 'error', text: 'Erro ao verificar anexos' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarWhatsApp = async (attachmentUrl: string, fileName: string) => {
    setIsSendingWhatsApp(true);
    try {
      const userId = AuthService.getInstance().getCurrentUser()?.user_id;
      if (!userId) {
        setIsSendingWhatsApp(false);
        return;
      }

      const usuario = await UserService.getUserById(userId);
      if (!usuario?.telefone) {
        setIsSendingWhatsApp(false);
        return;
      }

      const urlWithoutQuery = attachmentUrl.split('?')[0];
      const extension = (urlWithoutQuery.split('.').pop() || '').toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);

      const payload = {
        telefone: usuario.telefone.replace(/\D/g, ''),
        arquivo_url: attachmentUrl,
        titulo: activityDescription || 'Anexo de Atividade',
        tipo_arquivo: isImage ? 'image' : 'document',
        mime_type: isImage ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'application/octet-stream',
        nome_arquivo: fileName
      };

      console.log('[ManejoAgricola][WhatsApp] Enviando:', { telefone: payload.telefone, tipo: payload.tipo_arquivo, extension });

      const isDev = import.meta.env.MODE === 'development' ||
                    (typeof window !== 'undefined' &&
                     (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

      const webhookUrl = isDev
        ? '/api/whatsapp/enviar-documento-whatsapp'
        : import.meta.env.VITE_WHATSAPP_WEBHOOK_URL;

      if (!webhookUrl) {
        console.error('[ManejoAgricola][WhatsApp] Webhook URL não configurada');
        return;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error('[ManejoAgricola][WhatsApp] Erro na resposta:', response.status);
      } else {
        console.log('[ManejoAgricola][WhatsApp] Enviado com sucesso');
      }
    } catch (error) {
      console.error('[ManejoAgricola][WhatsApp] Erro ao enviar:', error);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleDownload = async (type: 'image' | 'file') => {
    try {
      setLoading(true);
      setMessage(null);

      console.log('📥 Iniciando download:', { activityId, type });

      if (type === 'image') {
        await ActivityAttachmentService.downloadAttachment(activityId);
      } else {
        await ActivityAttachmentService.downloadFileAttachment(activityId);
      }

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

      ActivityAttachmentService.validateImageFile(file);

      if (isReplacing) {
        await ActivityAttachmentService.replaceAttachment(activityId, file);
        console.log('✅ Imagem substituída com sucesso');
      } else {
        await ActivityAttachmentService.uploadAttachment(activityId, file);
        console.log('✅ Nova imagem carregada com sucesso');
      }

      console.log('⏳ Aguardando propagação do upload...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔄 Recarregando lista de anexos com refresh forçado...');
      await checkAttachments(true);

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

    const isReplacing = attachments.some(a => a.type === 'pdf' || a.type === 'xml' || a.type === 'file');

    try {
      setLoading(true);
      setMessage(null);
      console.log('📤 Iniciando upload do arquivo...', isReplacing ? '(substituição)' : '(novo)');
      console.log('📁 Arquivo selecionado:', file.name, file.type, file.size, 'bytes');

      ActivityAttachmentService.validateFile(file);

      if (isReplacing) {
        await ActivityAttachmentService.replaceFileAttachment(activityId, file);
        console.log('✅ Arquivo substituído com sucesso');
      } else {
        await ActivityAttachmentService.uploadFileAttachment(activityId, file);
        console.log('✅ Novo arquivo carregado com sucesso');
      }

      console.log('⏳ Aguardando propagação do upload...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🔄 Recarregando lista de anexos com refresh forçado...');
      await checkAttachments(true);

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
          await ActivityAttachmentService.deleteAttachment(activityId);
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
          await ActivityAttachmentService.deleteFileAttachment(activityId);
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

  const buildImageSrc = (url: string | undefined, key: number) => {
    if (!url) return '';
    // se for blob URL, não adiciona cache-bust
    if (url.startsWith('blob:')) return url;
    // caso já contenha query string, use &t=, caso contrário ?t=
    return url.includes('?') ? `${url}&t=${key}` : `${url}?t=${key}`;
  };

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
              <p className="text-sm text-gray-600 truncate max-w-48">{activityDescription}</p>
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
                src={buildImageSrc(attachments.find(a => a.type === 'image')?.url, imageKey)}
                alt="Imagem anexada"
                className="max-h-32 mb-2 rounded border"
                onLoad={() => console.log('🖼️ Imagem carregada:', imageKey)}
                onError={(e) => console.error('❌ Erro ao carregar imagem:', e)}
              />
              {/* Mobile: Botão WhatsApp */}
              <div className="flex md:hidden gap-2 mb-2">
                <button
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                  onClick={() => {
                    const imageUrl = attachments.find(a => a.type === 'image')?.url;
                    if (imageUrl) handleEnviarWhatsApp(imageUrl, `${activityId}.jpg`);
                  }}
                  disabled={isSendingWhatsApp || loading}
                >
                  {isSendingWhatsApp ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><WhatsAppIcon /> Enviar WhatsApp</>
                  )}
                </button>
              </div>
              {/* Desktop: Botão Download */}
              <div className="hidden md:flex gap-2 mb-2">
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
              {/* Mobile: Botão WhatsApp */}
              <div className="flex md:hidden gap-2 mb-2">
                <button
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                  onClick={() => {
                    const fileAtt = attachments.find(a => a.type === 'pdf' || a.type === 'xml' || a.type === 'file');
                    if (fileAtt) handleEnviarWhatsApp(fileAtt.url, fileAtt.name);
                  }}
                  disabled={isSendingWhatsApp || loading}
                >
                  {isSendingWhatsApp ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><WhatsAppIcon /> Enviar WhatsApp</>
                  )}
                </button>
              </div>
              {/* Desktop: Botão Download */}
              <div className="hidden md:flex gap-2 mb-2">
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
