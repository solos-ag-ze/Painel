import { useEffect, useRef, useState } from 'react';
import { X, Download, Upload, Loader2, Trash2 } from 'lucide-react';
import { AuthService } from '../../services/authService';
import { UserService } from '../../services/userService';
import { PragasDoencasService } from '../../services/pragasDoencasService';

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string;
  imagePath?: string;
  ocorrenciaId?: number;
  ocorrenciaNome?: string;
  onClose: () => void;
  onImageDeleted?: () => void;
  onImageReplaced?: (newPath: string, newUrl: string) => void;
  altText?: string;
}

export default function ImageViewerModal({
  isOpen,
  imageUrl,
  imagePath,
  ocorrenciaId,
  ocorrenciaNome,
  onClose,
  onImageDeleted,
  onImageReplaced,
  altText = 'Imagem ampliada',
}: ImageViewerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleEnviarWhatsApp = async () => {
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
      const fileName = imagePath?.split('/').pop() || 'imagem';
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
      const payload = {
        telefone: usuario.telefone.replace(/\D/g, ''),
        arquivo_url: imageUrl,
        titulo: ocorrenciaNome || 'Imagem de Praga/Doença',
        tipo_arquivo: isImage ? 'image' : 'document',
        mime_type: isImage ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'application/octet-stream',
        nome_arquivo: fileName
      };
      const isDev = import.meta.env.MODE === 'development' ||
        (typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
      const webhookUrl = isDev
        ? '/api/whatsapp/enviar-documento-whatsapp'
        : import.meta.env.VITE_WHATSAPP_WEBHOOK_URL;
      if (!webhookUrl) {
        console.error('[PragasDoencas][WhatsApp] Webhook URL não configurada');
        return;
      }
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const fileName = imagePath?.split('/').pop() || 'imagem.jpg';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (error) {
      console.error('Erro ao baixar:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReplaceImage = () => {
    console.log('[ImageViewerModal] handleReplaceImage - clicou no botão substituir');
    console.log('[ImageViewerModal] fileInputRef.current:', fileInputRef.current);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[ImageViewerModal] handleFileChange - evento disparado');
    console.log('[ImageViewerModal] event.target.files:', event.target.files);
    console.log('[ImageViewerModal] event.target.files?.length:', event.target.files?.length);
    
    const file = event.target.files?.[0];
    console.log('[ImageViewerModal] file:', file?.name, 'size:', file?.size, 'type:', file?.type);
    console.log('[ImageViewerModal] imagePath:', imagePath);
    console.log('[ImageViewerModal] ocorrenciaId:', ocorrenciaId);
    
    if (!file) {
      console.log('[ImageViewerModal] Saindo - usuário cancelou seleção ou file é undefined');
      return;
    }
    if (!imagePath) {
      console.log('[ImageViewerModal] Saindo - imagePath é undefined');
      return;
    }
    if (!ocorrenciaId) {
      console.log('[ImageViewerModal] Saindo - ocorrenciaId é undefined');
      return;
    }
    try {
      const userId = AuthService.getInstance().getCurrentUser()?.user_id;
      console.log('[ImageViewerModal] userId:', userId);
      if (!userId) {
        console.error('[ImageViewerModal] Usuário não autenticado');
        return;
      }
      console.log('[ImageViewerModal] Chamando PragasDoencasService.replaceImage...');
      const newPath = await PragasDoencasService.replaceImage(file, imagePath, ocorrenciaId, userId);
      console.log('[ImageViewerModal] replaceImage retornou:', newPath);
      if (!newPath) {
        console.error('[ImageViewerModal] Erro ao substituir imagem - newPath é null');
        return;
      }
      
      // Gerar signed URL para a nova imagem
      console.log('[ImageViewerModal] Gerando signed URL para nova imagem...');
      const newSignedUrl = await PragasDoencasService.getSignedUrl(newPath, 3600, userId);
      console.log('[ImageViewerModal] Nova signed URL:', newSignedUrl);
      
      if (!newSignedUrl) {
        console.error('[ImageViewerModal] Erro ao gerar signed URL - forçando reload');
        window.location.reload();
        return;
      }
      
      console.log('[ImageViewerModal] Sucesso! Chamando callback com novo path e URL...');
      onImageReplaced?.(newPath, newSignedUrl);
      onClose();
    } catch (error) {
      console.error('[ImageViewerModal] Erro ao substituir:', error);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async () => {
    console.log('[ImageViewerModal] handleDeleteImage - clicou no botão excluir');
    console.log('[ImageViewerModal] imagePath:', imagePath);
    console.log('[ImageViewerModal] ocorrenciaId:', ocorrenciaId);
    
    if (!imagePath || !ocorrenciaId) {
      console.log('[ImageViewerModal] Saindo - falta imagePath ou ocorrenciaId');
      return;
    }
    try {
      console.log('[ImageViewerModal] Chamando PragasDoencasService.deleteImage...');
      const deleted = await PragasDoencasService.deleteImage(imagePath, ocorrenciaId);
      console.log('[ImageViewerModal] deleteImage retornou:', deleted);
      if (!deleted) {
        console.error('[ImageViewerModal] Erro ao excluir imagem - deleted é false');
        return;
      }
      console.log('[ImageViewerModal] Sucesso! Chamando callbacks...');
      onImageDeleted?.();
      onClose();
    } catch (error) {
      console.error('[ImageViewerModal] Erro ao excluir:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Version */}
      <div className="fixed inset-0 z-[60] md:hidden flex items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black bg-opacity-90"
          onClick={onClose}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10 shadow-lg"
          aria-label="Fechar"
        >
          <X className="w-5 h-5 text-gray-900" />
        </button>

        {/* Image Container Mobile */}
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[90vw] max-h-[65vh] flex items-center justify-center flex-1">
            <img
              src={imageUrl}
              alt={altText}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3 pb-4">
            <button
              onClick={handleEnviarWhatsApp}
              disabled={isSendingWhatsApp}
              className="flex items-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSendingWhatsApp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <WhatsAppIcon />
                  Enviar WhatsApp
                </>
              )}
            </button>

            <button
              onClick={handleReplaceImage}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Substituir
            </button>

            <button
              onClick={handleDeleteImage}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Version - Optimized for Landscape Images */}
      <div className="fixed inset-0 z-[60] hidden md:flex items-center justify-center px-8 py-6">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black bg-opacity-95"
          onClick={onClose}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-3 bg-white rounded-full hover:bg-gray-100 transition-all hover:scale-105 z-10 shadow-2xl"
          aria-label="Fechar"
        >
          <X className="w-6 h-6 text-gray-900" />
        </button>

        {/* Image Container Desktop - Landscape Optimized */}
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <div className="relative w-[95vw] max-w-[1600px] h-[70vh] flex items-center justify-center flex-1">
            <img
              src={imageUrl}
              alt={altText}
              className="w-full h-full object-contain rounded-2xl shadow-2xl"
              style={{ maxHeight: '70vh', maxWidth: '95vw' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3 pb-6">
            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-100 text-[#004417] rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Baixando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download
                </>
              )}
            </button>

            <button
              onClick={handleReplaceImage}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Substituir
            </button>

            <button
              onClick={handleDeleteImage}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
