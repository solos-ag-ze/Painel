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
  File,
  Loader2,
  Table
} from 'lucide-react';
import { AttachmentService } from '../../services/attachmentService';
import { AuthService } from '../../services/authService';
import { UserService } from '../../services/userService';
import { supabase } from '../../lib/supabase';

const attachmentService = new AttachmentService();

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface FileAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  maquinaId: string;
  maquinaDescription: string;
}

type AttachmentFile = {
  url: string;
  publicUrl?: string;
  type: 'image' | 'pdf' | 'xml' | 'file';
  name: string;
  slotId: 'primeiro_envio' | 'segundo_envio';
};

export default function FileAttachmentModal({
  isOpen,
  onClose,
  maquinaId,
  maquinaDescription
}: FileAttachmentModalProps) {
  const [confirmState, setConfirmState] = useState<{
    type: 'delete-primeiro' | 'delete-segundo' | 'replace-primeiro' | 'replace-segundo' | null;
    onConfirm?: () => void;
  }>({ type: null });
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [imageKey, setImageKey] = useState<number>(Date.now());
  const primeiroInputRef = useRef<HTMLInputElement>(null);
  const segundoInputRef = useRef<HTMLInputElement>(null);
  const [isSendingPrimeiro, setIsSendingPrimeiro] = useState(false);
  const [isSendingSegundo, setIsSendingSegundo] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAttachments([]);
      setMessage(null);
      setImageKey(Date.now());
      checkAttachments();
      console.log('🆔 [Maquinas] Modal aberto para máquina ID:', maquinaId);
    }
  }, [isOpen, maquinaId]);

  const checkAttachments = async () => {
    try {
      setLoading(true);
      console.log('🔄 [Maquinas] Verificando anexos para máquina:', maquinaId);

      // Buscar informações da tabela
      const { data: maquinaData, error } = await supabase
        .from('maquinas_equipamentos_anexos')
        .select('url_primeiro_envio, url_segundo_envio')
        .eq('id_maquina', maquinaId)
        .single();

      if (error || !maquinaData) {
        console.log('ℹ️ [Maquinas] Nenhum anexo encontrado');
        setAttachments([]);
        return;
      }

      const files: AttachmentFile[] = [];
      const BUCKET_NAME = 'maquinas_equipamentos';

      // Processar primeiro anexo
      if (maquinaData.url_primeiro_envio) {
        const storedPath = maquinaData.url_primeiro_envio;
        const fileName = getFileNameFromPath(storedPath);
        const fileType = getFileTypeFromPath(storedPath);

        console.log('📎 [Maquinas] Primeiro anexo:', { storedPath, fileName, fileType });

        // Tentar obter URL pública
        const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storedPath);
        const publicUrl = publicData?.publicUrl || null;

        // Tentar obter URL assinada para preview
        let displayUrl = publicUrl;
        try {
          const { data: signedData } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(storedPath, 3600);
          if (signedData?.signedUrl) {
            displayUrl = signedData.signedUrl;
          }
        } catch (err) {
          console.log('⚠️ [Maquinas] Erro ao criar signed URL, usando public URL');
        }

        if (displayUrl) {
          files.push({
            url: displayUrl,
            publicUrl: publicUrl || displayUrl,
            type: fileType,
            name: fileName || 'primeiro_anexo',
            slotId: 'primeiro_envio'
          });
        }
      }

      // Processar segundo anexo
      if (maquinaData.url_segundo_envio) {
        const storedPath = maquinaData.url_segundo_envio;
        const fileName = getFileNameFromPath(storedPath);
        const fileType = getFileTypeFromPath(storedPath);

        console.log('📎 [Maquinas] Segundo anexo:', { storedPath, fileName, fileType });

        // Tentar obter URL pública
        const { data: publicData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storedPath);
        const publicUrl = publicData?.publicUrl || null;

        // Tentar obter URL assinada para preview
        let displayUrl = publicUrl;
        try {
          const { data: signedData } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(storedPath, 3600);
          if (signedData?.signedUrl) {
            displayUrl = signedData.signedUrl;
          }
        } catch (err) {
          console.log('⚠️ [Maquinas] Erro ao criar signed URL, usando public URL');
        }

        if (displayUrl) {
          files.push({
            url: displayUrl,
            publicUrl: publicUrl || displayUrl,
            type: fileType,
            name: fileName || 'segundo_anexo',
            slotId: 'segundo_envio'
          });
        }
      }

      console.log('📋 [Maquinas] Anexos encontrados:', files);
      setAttachments(files);

      if (files.length > 0) {
        setImageKey(Date.now());
      }
    } catch (error) {
      console.error('❌ [Maquinas] Erro ao verificar anexos:', error);
      setMessage({ type: 'error', text: 'Erro ao verificar anexos' });
    } finally {
      setLoading(false);
    }
  };

  const getFileNameFromPath = (path: string | null): string | null => {
    if (!path) return null;
    try {
      const parts = path.split('/');
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  };

  const getFileTypeFromPath = (path: string): 'image' | 'pdf' | 'xml' | 'file' => {
    const ext = path.split('.').pop()?.toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'];

    if (imageExts.includes(ext || '')) {
      return 'image';
    }
    if (ext === 'pdf') return 'pdf';
    if (ext === 'xml') return 'xml';
    return 'file';
  };

  const buildImageSrc = (url: string | null) => {
    if (!url) return '';
    if (url.startsWith('blob:')) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}t=${Date.now()}`;
  };

  const getFileIcon = (fileType: 'pdf' | 'xml' | 'file') => {
    if (fileType === 'pdf') return FileText;
    if (fileType === 'xml') return FileCode;
    if (fileType === 'file') return File;
    return File;
  };

  const getFileIconColor = (fileType: 'pdf' | 'xml' | 'file') => {
    if (fileType === 'pdf') return 'text-red-600';
    if (fileType === 'xml') return 'text-purple-600';
    return 'text-[#00A651]';
  };

  const getFileTypeLabel = (fileType: 'pdf' | 'xml' | 'file') => {
    if (fileType === 'pdf') return 'PDF anexado';
    if (fileType === 'xml') return 'XML anexado';
    return 'Arquivo anexado';
  };

  const handleDownload = async (slotId: 'primeiro_envio' | 'segundo_envio') => {
    try {
      setLoading(true);
      setMessage(null);

      console.log('📥 [Maquinas] Iniciando download:', { maquinaId, slotId });

      const attachment = attachments.find(a => a.slotId === slotId);
      if (!attachment?.url) {
        throw new Error('URL do arquivo não encontrada');
      }

      const result = await attachmentService.downloadFile(attachment.url);

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

        const safeLabel = (slotId || 'arquivo').toLowerCase().replace(/[^a-z0-9]/g, '_');
        const link = document.createElement('a');
        link.href = tempUrl;
        link.download = `${safeLabel}_${maquinaId}_${Date.now()}.${extension}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(tempUrl);
        console.log('✅ [Maquinas] Download concluído com sucesso');
        setMessage({ type: 'success', text: 'Download iniciado com sucesso!' });
      } else {
        throw new Error('Dados inválidos retornados do servidor');
      }
    } catch (error) {
      console.error('💥 [Maquinas] Erro no download:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao fazer download'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnviarWhatsApp = async (attachment: AttachmentFile) => {
    console.log('[Maquinas] Iniciando envio WhatsApp:', {
      slotId: attachment.slotId,
      fileName: attachment.name,
      url: attachment.url,
      publicUrl: attachment.publicUrl
    });

    const setLoadingState = attachment.slotId === 'primeiro_envio' ? setIsSendingPrimeiro : setIsSendingSegundo;
    setLoadingState(true);

    try {
      const urlToSend = attachment.publicUrl || attachment.url;
      console.log('[Maquinas] URL a ser enviada:', urlToSend);

      if (!urlToSend || urlToSend.startsWith('blob:')) {
        console.error('[Maquinas][WhatsApp] URL inválida ou local detectada!');
        setMessage({ type: 'error', text: 'Erro ao obter URL externa do anexo. Por favor, tente novamente.' });
        setLoadingState(false);
        return;
      }

      console.log('[Maquinas] Obtendo usuário atual...');
      const currentUser = AuthService.getInstance().getCurrentUser();
      console.log('[Maquinas] Usuário atual:', currentUser);
      const userId = currentUser?.user_id;

      if (!userId) {
        console.error('[Maquinas][WhatsApp] userId não encontrado:', { currentUser });
        setMessage({ type: 'error', text: 'Usuário não autenticado' });
        setLoadingState(false);
        return;
      }

      console.log('[Maquinas] Buscando dados do usuário com ID:', userId);
      const usuario = await UserService.getUserById(userId);
      console.log('[Maquinas] Dados do usuário:', usuario);

      if (!usuario?.telefone) {
        console.error('[Maquinas][WhatsApp] Telefone do usuário não encontrado:', { usuario });
        setMessage({ type: 'error', text: 'Telefone não cadastrado' });
        setLoadingState(false);
        return;
      }

      const urlWithoutQuery = urlToSend.split('?')[0];
      const extension = (urlWithoutQuery.split('.').pop() || '').toLowerCase();
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);

      const payload = {
        telefone: usuario.telefone.replace(/\D/g, ''),
        arquivo_url: urlToSend,
        titulo: maquinaDescription || 'Anexo da Máquina',
        tipo_arquivo: isImage ? 'image' : 'document',
        mime_type: isImage ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'application/octet-stream',
        nome_arquivo: attachment.name
      };

      console.log('[Maquinas] Payload preparado:', payload);

      const isDev = import.meta.env.MODE === 'development' ||
                    (typeof window !== 'undefined' &&
                     (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

      console.log('[Maquinas] Environment:', { isDev, mode: import.meta.env.MODE });

      const webhookUrl = isDev
        ? '/api/whatsapp/enviar-documento-whatsapp'
        : import.meta.env.VITE_WHATSAPP_WEBHOOK_URL;

      console.log('[Maquinas] Webhook URL:', webhookUrl);

      if (!webhookUrl) {
        console.error('[Maquinas][WhatsApp] Webhook URL não configurada');
        setMessage({ type: 'error', text: 'Webhook não configurado' });
        setLoadingState(false);
        return;
      }

      console.log('[Maquinas] Enviando para webhook...');
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('[Maquinas] Resposta do webhook:', { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Maquinas] Erro na resposta do webhook:', { status: response.status, error: errorText });
        setMessage({ type: 'error', text: 'Erro ao enviar para WhatsApp' });
      } else {
        console.log('[Maquinas] Envio WhatsApp concluído com sucesso!');
        setMessage({ type: 'success', text: 'Enviado para WhatsApp com sucesso!' });
      }
    } catch (error) {
      console.error('[Maquinas] Erro ao enviar WhatsApp:', error);
      setMessage({ type: 'error', text: 'Erro ao enviar para WhatsApp' });
    } finally {
      setLoadingState(false);
    }
  };

  const handleFileSelect = (slotId: 'primeiro_envio' | 'segundo_envio', isReplace = false) => {
    const currentAttachment = attachments.find(a => a.slotId === slotId);

    if (isReplace && currentAttachment) {
      const confirmType = slotId === 'primeiro_envio' ? 'replace-primeiro' : 'replace-segundo';
      setConfirmState({
        type: confirmType,
        onConfirm: () => {
          setConfirmState({ type: null });
          if (slotId === 'primeiro_envio') {
            primeiroInputRef.current?.click();
          } else {
            segundoInputRef.current?.click();
          }
        }
      });
    } else {
      if (slotId === 'primeiro_envio') {
        primeiroInputRef.current?.click();
      } else {
        segundoInputRef.current?.click();
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, slotId: 'primeiro_envio' | 'segundo_envio') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isReplacing = attachments.some(a => a.slotId === slotId);

    try {
      setLoading(true);
      setMessage(null);
      console.log('📤 [Maquinas] Iniciando upload...', isReplacing ? '(substituição)' : '(novo)');
      console.log('📁 [Maquinas] Arquivo selecionado:', file.name, file.type, file.size, 'bytes');

      const result = await attachmentService.uploadFile(
        maquinaId,
        file,
        slotId,
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Arquivo ${isReplacing ? 'substituído' : 'enviado'} com sucesso!`
        });
        await checkAttachments();
      } else {
        throw new Error(result.error || 'Erro ao fazer upload');
      }
    } catch (error) {
      console.error('💥 [Maquinas] Erro no upload:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erro ao processar arquivo'
      });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const handleDelete = (slotId: 'primeiro_envio' | 'segundo_envio') => {
    const attachment = attachments.find(a => a.slotId === slotId);
    if (!attachment?.url) {
      setMessage({ type: 'error', text: 'URL do arquivo não encontrada para exclusão.' });
      return;
    }

    const confirmType = slotId === 'primeiro_envio' ? 'delete-primeiro' : 'delete-segundo';
    setConfirmState({
      type: confirmType,
      onConfirm: async () => {
        setConfirmState({ type: null });
        try {
          setLoading(true);
          setMessage(null);

          const result = await attachmentService.deleteFile(attachment.url!, maquinaId, slotId);

          if (result.success) {
            setMessage({ type: 'success', text: 'Arquivo excluído com sucesso!' });
            await checkAttachments();
          } else {
            throw new Error(result.error || 'Erro ao excluir arquivo');
          }
        } catch (error) {
          console.error('💥 [Maquinas] Erro ao excluir:', error);
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

  const primeiroAttachment = attachments.find(a => a.slotId === 'primeiro_envio');
  const segundoAttachment = attachments.find(a => a.slotId === 'segundo_envio');

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
              <p className="text-sm text-gray-600 truncate max-w-48">{maquinaDescription}</p>
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
            {!primeiroAttachment && (
              <button
                className="flex items-center justify-center gap-2 bg-[#86b646] text-white py-2 rounded hover:bg-[#397738] transition-colors"
                onClick={() => handleFileSelect('primeiro_envio', false)}
                disabled={loading}
              >
                <FileText className="w-5 h-5" /> Anexar Primeiro Arquivo
              </button>
            )}
            {!segundoAttachment && (
              <button
                className="flex items-center justify-center gap-2 bg-[#397738] text-white py-2 rounded hover:bg-[#86b646] transition-colors"
                onClick={() => handleFileSelect('segundo_envio', false)}
                disabled={loading}
              >
                <FileText className="w-5 h-5" /> Anexar Segundo Arquivo
              </button>
            )}
          </div>

          {primeiroAttachment && (
            <div className="flex flex-col items-center gap-2 bg-gray-50 p-3 rounded-lg border">
              {primeiroAttachment.type === 'image' ? (
                <img
                  key={`primeiro-${imageKey}`}
                  src={buildImageSrc(primeiroAttachment.url)}
                  alt="Primeiro anexo"
                  className="max-h-32 mb-2 rounded border"
                  onLoad={() => console.log('🖼️ [Maquinas] Imagem carregada')}
                  onError={(e) => console.error('❌ [Maquinas] Erro ao carregar imagem:', e)}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className={getFileIconColor(primeiroAttachment.type as 'pdf' | 'xml' | 'file')}>
                    {React.createElement(getFileIcon(primeiroAttachment.type as 'pdf' | 'xml' | 'file'), { className: "w-8 h-8" })}
                  </div>
                  <span className="font-medium text-[#092f20]">{getFileTypeLabel(primeiroAttachment.type as 'pdf' | 'xml' | 'file')}</span>
                </div>
              )}
              <div className="flex md:hidden gap-2 mb-2">
                <button
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                  onClick={() => handleEnviarWhatsApp(primeiroAttachment)}
                  disabled={isSendingPrimeiro || loading}
                >
                  {isSendingPrimeiro ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><WhatsAppIcon /> Enviar</>
                  )}
                </button>
              </div>
              <div className="hidden md:flex gap-2 mb-2">
                <button
                  className="bg-[#f3f4f6] text-[#092f20] px-2 py-1 rounded hover:bg-[#e5e7eb] flex items-center gap-1 transition-colors"
                  onClick={() => handleDownload('primeiro_envio')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-[#eaf4ec] text-[#092f20] px-3 py-1 rounded hover:bg-[#d3e7d8] flex items-center gap-1 transition-colors"
                  onClick={() => handleFileSelect('primeiro_envio', true)}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" /> Substituir
                </button>
                <button
                  className="bg-[#ffeaea] text-[#b71c1c] px-3 py-1 rounded hover:bg-[#ffd6d6] flex items-center gap-1 transition-colors"
                  onClick={() => handleDelete('primeiro_envio')}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            </div>
          )}

          {segundoAttachment && (
            <div className="flex flex-col items-center gap-2 bg-gray-50 p-3 rounded-lg border">
              {segundoAttachment.type === 'image' ? (
                <img
                  key={`segundo-${imageKey}`}
                  src={buildImageSrc(segundoAttachment.url)}
                  alt="Segundo anexo"
                  className="max-h-32 mb-2 rounded border"
                  onLoad={() => console.log('🖼️ [Maquinas] Imagem carregada')}
                  onError={(e) => console.error('❌ [Maquinas] Erro ao carregar imagem:', e)}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 mb-2">
                  <div className={getFileIconColor(segundoAttachment.type as 'pdf' | 'xml' | 'file')}>
                    {React.createElement(getFileIcon(segundoAttachment.type as 'pdf' | 'xml' | 'file'), { className: "w-8 h-8" })}
                  </div>
                  <span className="font-medium text-[#092f20]">{getFileTypeLabel(segundoAttachment.type as 'pdf' | 'xml' | 'file')}</span>
                </div>
              )}
              <div className="flex md:hidden gap-2 mb-2">
                <button
                  className="bg-[#25D366] hover:bg-[#128C7E] text-white px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                  onClick={() => handleEnviarWhatsApp(segundoAttachment)}
                  disabled={isSendingSegundo || loading}
                >
                  {isSendingSegundo ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><WhatsAppIcon /> Enviar</>
                  )}
                </button>
              </div>
              <div className="hidden md:flex gap-2 mb-2">
                <button
                  className="bg-[#f3f4f6] text-[#092f20] px-2 py-1 rounded hover:bg-[#e5e7eb] flex items-center gap-1 transition-colors"
                  onClick={() => handleDownload('segundo_envio')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-[#eaf4ec] text-[#092f20] px-3 py-1 rounded hover:bg-[#d3e7d8] flex items-center gap-1 transition-colors"
                  onClick={() => handleFileSelect('segundo_envio', true)}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4" /> Substituir
                </button>
                <button
                  className="bg-[#ffeaea] text-[#b71c1c] px-3 py-1 rounded hover:bg-[#ffd6d6] flex items-center gap-1 transition-colors"
                  onClick={() => handleDelete('segundo_envio')}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            </div>
          )}
        </div>

        <input
          ref={primeiroInputRef}
          type="file"
          accept=".xml,.jpg,.jpeg,.pdf,.png,.webp,.gif,.bmp,.svg,.avif,.doc,.docx,.xls,.xlsx,.csv,.txt,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml,image/avif,application/xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
          onChange={(e) => handleFileChange(e, 'primeiro_envio')}
          className="hidden"
        />
        <input
          ref={segundoInputRef}
          type="file"
          accept=".xml,.jpg,.jpeg,.pdf,.png,.webp,.gif,.bmp,.svg,.avif,.doc,.docx,.xls,.xlsx,.csv,.txt,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/svg+xml,image/avif,application/xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
          onChange={(e) => handleFileChange(e, 'segundo_envio')}
          className="hidden"
        />
      </div>
    </div>
  );
}
