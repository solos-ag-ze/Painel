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
  Loader2
} from 'lucide-react';
import { AttachmentService } from '../../services/attachmentService';

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  transactionDescription: string;
}

export default function AttachmentModal({ 
  isOpen, 
  onClose, 
  transactionId, 
  transactionDescription 
}: AttachmentModalProps) {
  const [hasAttachment, setHasAttachment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      testConnection();
      checkAttachment();
      // Debug: listar todos os anexos
      AttachmentService.listAllAttachments();
      // Debug adicional: mostrar ID da transação
      console.log('🆔 Modal aberto para transação ID:', transactionId);
    }
  }, [isOpen, transactionId]);

  const testConnection = async () => {
    try {
      const isConnected = await AttachmentService.testS3Connection();
      if (!isConnected) {
        setMessage({ type: 'error', text: 'Erro de conexão com o Supabase Storage' });
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
    }
  };

  const checkAttachment = async () => {
    try {
      setLoading(true);
      console.log('🔄 Verificando anexo para transação:', transactionId);
      const exists = await AttachmentService.hasAttachment(transactionId);
      console.log('📋 Resultado da verificação:', exists);
      setHasAttachment(exists);
      
      if (exists) {
        console.log('🖼️ Buscando URL da imagem...');
        const url = await AttachmentService.getAttachmentUrl(transactionId);
        console.log('🔗 URL obtida:', url);
        setAttachmentUrl(url);
      } else {
        console.log('❌ Nenhum anexo encontrado');
        setAttachmentUrl(null);
      }
    } catch (error) {
      console.error('Erro ao verificar anexo:', error);
      setMessage({ type: 'error', text: 'Erro ao verificar anexo' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      setMessage(null);
      await AttachmentService.downloadAttachment(transactionId);
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

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setMessage(null);
      
      // Validar arquivo
      AttachmentService.validateImageFile(file);
      
      // Upload ou substituição
      if (hasAttachment) {
        await AttachmentService.replaceAttachment(transactionId, file);
        setMessage({ type: 'success', text: 'Anexo substituído com sucesso!' });
      } else {
        await AttachmentService.uploadAttachment(transactionId, file);
        setMessage({ type: 'success', text: 'Anexo adicionado com sucesso!' });
      }
      
      // Atualizar estado
      await checkAttachment();
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao processar arquivo' 
      });
    } finally {
      setLoading(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este anexo? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      await AttachmentService.deleteAttachment(transactionId);
      setMessage({ type: 'success', text: 'Anexo excluído com sucesso!' });
      await checkAttachment();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao excluir anexo' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (url: string | null) => {
    if (url) {
      setShowImageModal(true);
    }
  };

  const handleSaveImage = async (url: string | null) => {
    if (!url) return;
    
    try {
      setMessage(null);
      
      // Fetch da imagem
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro ao baixar imagem');
      
      const blob = await response.blob();
      
      // Criar URL temporária
      const tempUrl = URL.createObjectURL(blob);
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = tempUrl;
      link.download = `anexo_${transactionId}_${Date.now()}.jpg`;
      
      // Adicionar ao DOM, clicar e remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL temporária
      URL.revokeObjectURL(tempUrl);
      
      setMessage({ type: 'success', text: 'Imagem salva com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar imagem' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Paperclip className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#092f20]">Gerenciar Anexo</h3>
              <p className="text-sm text-gray-600 truncate max-w-48">{transactionDescription}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview da imagem se existir */}
        {hasAttachment && attachmentUrl && (
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-200">
              <div className="flex items-center justify-center relative group">
                <img 
                  src={attachmentUrl} 
                  alt="Anexo da transação"
                  className="max-w-full max-h-48 rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                  crossOrigin="anonymous"
                  onClick={() => handleImageClick(attachmentUrl)}
                  onError={(e) => {
                    console.error('❌ Erro ao carregar imagem:', attachmentUrl);
                    // Tentar recarregar uma vez
                    const img = e.target as HTMLImageElement;
                    if (!img.dataset.retried) {
                      img.dataset.retried = 'true';
                      img.src = attachmentUrl + '&retry=' + Date.now();
                    } else {
                      setAttachmentUrl(null);
                      setHasAttachment(false);
                    }
                  }}
                  onLoad={() => console.log('✅ Imagem carregada com sucesso:', attachmentUrl)}
                />
                {/* Overlay com ícones */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(attachmentUrl);
                      }}
                      className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                      title="Ampliar imagem"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveImage(attachmentUrl);
                      }}
                      className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                      title="Salvar imagem"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botão para forçar atualização */}
        <div className="mb-4">
          <button
            onClick={checkAttachment}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar Status</span>
          </button>
        </div>
        {/* Status */}
        <div className="mb-6">
          <div className={`flex items-center space-x-2 p-3 rounded-lg ${
            hasAttachment 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-gray-50 border border-gray-200'
          }`}>
            {hasAttachment ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Anexo encontrado</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Nenhum anexo encontrado</span>
              </>
            )}
          </div>
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

        {/* Botões de ação */}
        <div className="grid grid-cols-2 gap-3">
          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={!hasAttachment || loading}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              hasAttachment && !loading
                ? 'bg-[#397738] text-white hover:bg-[#092f20]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Download</span>
          </button>

          {/* Upload/Substituir */}
          <button
            onClick={handleFileSelect}
            disabled={loading}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#86b646] text-white hover:bg-[#397738]'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : hasAttachment ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{hasAttachment ? 'Substituir' : 'Adicionar'}</span>
          </button>

          {/* Excluir */}
          <button
            onClick={handleDelete}
            disabled={!hasAttachment || loading}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              hasAttachment && !loading
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Excluir</span>
          </button>

          {/* Fechar */}
          <button
            onClick={onClose}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <X className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>

        {/* Input de arquivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modal de Zoom da Imagem */}
        {showImageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4">
            <div className="relative max-w-full max-h-full">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-all z-10"
              >
                <X className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => handleSaveImage(attachmentUrl)}
                className="absolute top-4 left-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white transition-all z-10"
                title="Salvar imagem"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              <img
                src={attachmentUrl}
                alt="Anexo ampliado"
                className="max-w-full max-h-full object-contain rounded-lg"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}