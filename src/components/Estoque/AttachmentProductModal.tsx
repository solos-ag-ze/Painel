// src/components/Estoque/AttachmentProductModal.tsx
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
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
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
      const error = AttachmentProductService.validateFile(file);
      if (error) {
        setMessage({ type: 'error', text: error });
        return;
      }

      // Upload (imagem ou PDF)
      await AttachmentProductService.uploadAttachment(productId, file);
      setMessage({ type: 'success', text: 'Anexo salvo com sucesso!' });
      
      // Atualizar estado
      await checkAttachments();
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao processar arquivo' 
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir os anexos deste produto?')) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      await AttachmentProductService.deleteAttachment(productId);
      setMessage({ type: 'success', text: 'Anexos excluídos com sucesso!' });
      await checkAttachments();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao excluir anexos' 
      });
    } finally {
      setLoading(false);
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
              <h3 className="text-lg font-semibold text-[#092f20]">Gerenciar Anexos</h3>
              <p className="text-sm text-gray-600 truncate max-w-48">{productName}</p>
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

        {/* Lista de anexos */}
        <div className="mb-6 space-y-3">
          {attachments.length === 0 && (
            <div className="text-sm text-gray-600">Nenhum anexo encontrado</div>
          )}

          {attachments.map(att => (
            <div key={att.name} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border">
              <div className="flex items-center space-x-2">
                {att.type === 'image' ? (
                  <img src={att.url} alt={att.name} className="w-12 h-12 object-cover rounded" />
                ) : (
                  <span className="text-red-600 font-medium">📄 PDF</span>
                )}
                <span className="text-sm truncate max-w-[150px]">{att.name}</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(att.type)}
                  disabled={loading}
                  className="p-2 text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-4 h-4" />
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

        {/* Botões de ação */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={checkAttachments}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleFileSelect}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium bg-[#86b646] text-white hover:bg-[#397738] transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>Adicionar</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={attachments.length === 0 || loading}
            className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              attachments.length > 0 && !loading
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>Excluir</span>
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <X className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
