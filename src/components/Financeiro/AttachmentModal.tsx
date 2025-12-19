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
import { AttachmentService } from '../../services/attachmentService';
import { supabase } from '../../lib/supabase';

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  transactionDescription: string;
}

interface TransactionGroupInfo {
  id_grupo_anexo: string | null;
  numero_parcelas: number;
  parcela_atual: string | null;
  tem_grupo: boolean;
}

export type AttachmentFile = {
  url: string;
  type: 'image' | 'pdf' | 'xml' | 'file';
  name: string;
};

export default function AttachmentModal({
  isOpen,
  onClose,
  transactionId,
  transactionDescription
}: AttachmentModalProps) {
  const [confirmState, setConfirmState] = useState<{
    type: 'delete-image' | 'delete-file' | 'replace-image' | 'replace-file' | null;
    onConfirm?: () => void;
  }>({ type: null });
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [groupInfo, setGroupInfo] = useState<TransactionGroupInfo | null>(null);
  const [imageKey, setImageKey] = useState<number>(Date.now());
  const [fileKey, setFileKey] = useState<number>(Date.now());
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAttachments([]);
      setMessage(null);
      setGroupInfo(null);
      setImageKey(Date.now());
      setFileKey(Date.now());
      loadTransactionInfo();
      checkAttachments();
      console.log('🆔 Modal aberto para transação ID:', transactionId);
    }
  }, [isOpen, transactionId]);

  const loadTransactionInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('id_grupo_anexo, numero_parcelas, parcela, id_transacao_pai')
        .eq('id_transacao', transactionId)
        .single();

      if (error) {
        console.error('Erro ao carregar informações da transação:', error);
        return;
      }

      const info: TransactionGroupInfo = {
        id_grupo_anexo: data.id_grupo_anexo,
        numero_parcelas: data.numero_parcelas || 1,
        parcela_atual: data.parcela,
        tem_grupo: !!data.id_transacao_pai || (data.numero_parcelas && data.numero_parcelas > 1)
      };

      setGroupInfo(info);
      console.log('📊 Informações do grupo:', info);
    } catch (error) {
      console.error('Erro ao carregar informações do grupo:', error);
    }
  };

  const checkAttachments = async (forceRefresh = false) => {
    try {
      setLoading(true);
      console.log('🔄 Verificando anexos para transação:', transactionId, forceRefresh ? '(refresh forçado)' : '');

      const files: AttachmentFile[] = [];

      const imageExists = await AttachmentService.hasAttachment(transactionId);
      console.log('📸 Imagem existe?', imageExists);

      if (imageExists) {
        const imageUrl = await AttachmentService.getAttachmentUrl(transactionId, forceRefresh);
        console.log('🔗 URL da imagem obtida:', imageUrl);
        if (imageUrl) {
          files.push({
            url: imageUrl,
            type: 'image',
            name: `${transactionId}.jpg`
          });
        }
      }

      const fileExists = await AttachmentService.hasFileAttachment(transactionId);
      console.log('📄 Arquivo existe?', fileExists);

      if (fileExists) {
        const fileUrl = await AttachmentService.getFileAttachmentUrl(transactionId, forceRefresh);
        console.log('🔗 URL do arquivo obtida:', fileUrl);
        if (fileUrl) {
          // Extrair extensão do arquivo a partir da URL (antes dos query params)
          const cleanUrl = fileUrl.split('?')[0];
          const ext = cleanUrl.includes('.') ? cleanUrl.split('.').pop()?.toLowerCase() : undefined;
          const fileType = ext === 'pdf' ? 'pdf' : ext === 'xml' ? 'xml' : 'file';
          const extension = ext || 'file';
          files.push({
            url: fileUrl,
            type: fileType as 'pdf' | 'xml' | 'file',
            name: `${transactionId}.${extension}`
          });
        }
      }

      console.log('📋 Total de anexos encontrados:', files.length);
      setAttachments(files);
    } catch (error) {
      console.error('Erro ao verificar anexos:', error);
      setMessage({ type: 'error', text: 'Erro ao verificar anexos' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (type: 'image' | 'file') => {
    try {
      setLoading(true);
      setMessage(null);

      console.log('📥 Iniciando download:', { transactionId, type });

      if (type === 'image') {
        await AttachmentService.downloadAttachment(transactionId);
      } else {
        await AttachmentService.downloadFileAttachment(transactionId);
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

      AttachmentService.validateImageFile(file);

      // Usar método correto dependendo se é substituição ou novo upload
      if (isReplacing) {
        await AttachmentService.replaceAttachment(transactionId, file);
        console.log('✅ Imagem substituída com sucesso');
      } else {
        await AttachmentService.uploadAttachment(transactionId, file);
        console.log('✅ Nova imagem carregada com sucesso');
      }

      // Forçar atualização do cache da imagem
      setImageKey(Date.now());

      // Aguardar propagação no storage
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('🔄 Recarregando lista de anexos...');
      // Forçar refresh da URL ao recarregar após substituição
      await checkAttachments(true);

      const successMessage = isReplacing ? 'Imagem substituída com sucesso!' : 'Imagem salva com sucesso!';
      setMessage({ type: 'success', text: successMessage });
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao processar imagem' });
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

      AttachmentService.validateFile(file);

      if (isReplacing) {
        await AttachmentService.replaceFileAttachment(transactionId, file);
        console.log('✅ Arquivo substituído com sucesso');
      } else {
        await AttachmentService.uploadFileAttachment(transactionId, file);
        console.log('✅ Novo arquivo carregado com sucesso');
      }

      setFileKey(Date.now());

      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('🔄 Recarregando lista de anexos...');
      await checkAttachments(true);

      const successMessage = isReplacing ? 'Arquivo substituído com sucesso!' : 'Arquivo salvo com sucesso!';
      setMessage({ type: 'success', text: successMessage });
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Erro ao processar arquivo' });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = () => {
    const mensagemConfirmacao = groupInfo?.tem_grupo
      ? `Atenção: Este anexo é compartilhado com ${groupInfo.numero_parcelas} parcela${groupInfo.numero_parcelas > 1 ? 's' : ''}. Ao confirmar, o arquivo será excluído de forma definitiva do Painel da Fazenda e do nosso banco de dados, afetando todas as parcelas. Deseja continuar?`
      : 'Atenção: ao confirmar, o arquivo será excluído de forma definitiva do Painel da Fazenda e do nosso banco de dados. Deseja continuar?';

    setConfirmState({
      type: 'delete-image',
      onConfirm: async () => {
        setConfirmState({ type: null });
        try {
          setLoading(true);
          setMessage(null);
          await AttachmentService.deleteAttachment(transactionId);
          const mensagemSucesso = groupInfo?.tem_grupo
            ? `Imagem excluída de todas as ${groupInfo.numero_parcelas} parcelas!`
            : 'Imagem excluída!';
          setMessage({ type: 'success', text: mensagemSucesso });
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
    const mensagemConfirmacao = groupInfo?.tem_grupo
      ? `Atenção: Este anexo é compartilhado com ${groupInfo.numero_parcelas} parcela${groupInfo.numero_parcelas > 1 ? 's' : ''}. Ao confirmar, o arquivo será excluído de forma definitiva do Painel da Fazenda e do nosso banco de dados, afetando todas as parcelas. Deseja continuar?`
      : 'Atenção: ao confirmar, o arquivo será excluído de forma definitiva do Painel da Fazenda e do nosso banco de dados. Deseja continuar?';

    setConfirmState({
      type: 'delete-file',
      onConfirm: async () => {
        setConfirmState({ type: null });
        try {
          setLoading(true);
          setMessage(null);
          await AttachmentService.deleteFileAttachment(transactionId);
          const mensagemSucesso = groupInfo?.tem_grupo
            ? `Arquivo excluído de todas as ${groupInfo.numero_parcelas} parcelas!`
            : 'Arquivo excluído!';
          setMessage({ type: 'success', text: mensagemSucesso });
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

  // Pre-compute attachments to avoid multiple finds and build URLs safely
  const imageAttachment = attachments.find(a => a.type === 'image') || null;
  const fileAttachment = attachments.find(a => a.type === 'pdf' || a.type === 'xml' || a.type === 'file') || null;

  const buildCacheBustedUrl = (url: string | undefined | null, key: number) => {
    if (!url) return '';
    return url.includes('?') ? `${url}&t=${key}` : `${url}?t=${key}`;
  };

  const [diagnosticInfo, setDiagnosticInfo] = useState<{
    ok: boolean;
    status: number | null;
    contentType?: string | null;
    url?: string;
  } | null>(null);

  // Diagnostic fetch to inspect image URL response (helps identificar 400/403/CORS)
  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!imageAttachment?.url) {
        setDiagnosticInfo(null);
        return;
      }

      const urlToCheck = imageAttachment.url.split('?')[0];
      console.log('🧪 Diagnostic: verificando URL de imagem (HEAD):', urlToCheck);
      try {
        const res = await fetch(urlToCheck, { method: 'HEAD', cache: 'no-cache', mode: 'cors' });
        if (!mounted) return;
        console.log('🧪 Diagnostic HEAD result:', res.status, res.headers.get('content-type'));
        setDiagnosticInfo({ ok: res.ok, status: res.status, contentType: res.headers.get('content-type'), url: urlToCheck });
        if (!res.ok) {
          // tentar GET para inspecionar corpo (pode conter página de erro)
          const getRes = await fetch(urlToCheck, { method: 'GET', cache: 'no-cache', mode: 'cors' });
          console.log('🧪 Diagnostic GET result:', getRes.status, getRes.headers.get('content-type'));
          const text = await getRes.text().catch(() => null);
          console.log('🧪 Diagnostic GET body (truncated):', typeof text === 'string' ? text?.slice(0, 300) : text);
        }
      } catch (err) {
        console.error('🧪 Diagnostic fetch error:', err);
        setDiagnosticInfo({ ok: false, status: null, contentType: null, url: imageAttachment.url });
      }
    };
    run();
    return () => { mounted = false; };
  }, [imageAttachment?.url, imageKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Modal de confirmação customizado */}
      {confirmState.type && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 text-[#F7941F] mb-2" />
            <p className="text-base text-center mb-4 text-[#004417] font-medium">
              {confirmState.type === 'delete-image' && groupInfo?.tem_grupo
                ? `Atenção: Este anexo é compartilhado com ${groupInfo.numero_parcelas} parcela${groupInfo.numero_parcelas > 1 ? 's' : ''}. Ao confirmar, o arquivo${confirmState.type.startsWith('replace') ? ' atual' : ''} será excluído de forma definitiva do Painel da Fazenda e do nosso banco de dados, afetando todas as parcelas. Deseja continuar?`
                : `Atenção: ao confirmar, o arquivo${confirmState.type.startsWith('replace') ? ' atual' : ''} será excluído de forma definitiva do Painel da Fazenda e do nosso banco de dados. Deseja continuar?`
              }
            </p>
            <div className="flex gap-4 mt-2">
              <button
                className="px-4 py-2 rounded-lg bg-white border border-[rgba(0,68,23,0.06)] text-[#004417] hover:bg-[rgba(0,68,23,0.03)]"
                onClick={() => setConfirmState({ type: null })}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-[rgba(247,148,31,0.12)] text-[#F7941F] hover:bg-[rgba(247,148,31,0.18)]"
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
            <div className="w-8 h-8 bg-[rgba(0,166,81,0.12)] rounded-lg flex items-center justify-center">
              <Paperclip className="w-5 h-5 text-[#00A651]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#004417]">Gerenciar Anexos</h3>
              <p className="text-sm text-[#004417]/80 truncate max-w-48">{transactionDescription}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[rgba(0,68,23,0.65)] hover:text-[#004417] rounded"
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
                className="flex items-center justify-center gap-2 bg-[#00A651] text-white py-2 rounded hover:bg-[#003015] transition-colors"
                onClick={() => handleImageSelect(false)}
                disabled={loading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg> Anexar Imagem
              </button>
            )}
            {!attachments.find(a => a.type === 'pdf' || a.type === 'xml' || a.type === 'file') && (
              <button
                className="flex items-center justify-center gap-2 bg-[#004417] text-white py-2 rounded hover:bg-[#003015] transition-colors"
                onClick={() => handleFileSelect(false)}
                disabled={loading}
              >
                <FileText className="w-5 h-5" /> Anexar Arquivo
              </button>
            )}
          </div>

          {/* Se houver imagem */}
          {imageAttachment && (
            <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-[rgba(0,68,23,0.06)]">
              <img
                key={imageKey}
                src={buildCacheBustedUrl(imageAttachment.url, imageKey)}
                alt="Imagem anexada"
                className="max-h-32 mb-2 rounded"
                onLoad={() => console.log('🖼️ Imagem carregada:', imageKey)}
                onError={(e) => console.error('❌ Erro ao carregar imagem:', e)}
              />
              <div className="flex gap-2 mb-2">
                <button
                  className="bg-white border border-[rgba(0,68,23,0.06)] text-[#004417] px-2 py-1 rounded hover:bg-[rgba(0,68,23,0.03)] flex items-center gap-1 transition-colors"
                  onClick={() => handleDownload('image')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-[rgba(0,166,81,0.08)] text-[#004417] px-3 py-1 rounded hover:bg-[rgba(0,166,81,0.12)] flex items-center gap-1 transition-colors"
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

          {/* Se houver arquivo (PDF, XML) */}
          {fileAttachment && (
            <div className="flex flex-col items-center gap-2 bg-white p-3 rounded-lg border border-[rgba(0,68,23,0.06)]">
              {
                (() => {
                  const attachment = fileAttachment;
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
                })()
              }
              <div className="flex gap-2 mb-2">
                <button
                  className="bg-white border border-[rgba(0,68,23,0.06)] text-[#004417] px-2 py-1 rounded hover:bg-[rgba(0,68,23,0.03)] flex items-center gap-1 transition-colors"
                  onClick={() => handleDownload('file')}
                  disabled={loading}
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-[rgba(0,166,81,0.08)] text-[#004417] px-3 py-1 rounded hover:bg-[rgba(0,166,81,0.12)] flex items-center gap-1 transition-colors"
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

        {/* Inputs ocultos */}
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