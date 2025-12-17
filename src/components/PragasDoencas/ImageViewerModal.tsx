import { X } from 'lucide-react';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  altText?: string;
}

export default function ImageViewerModal({
  isOpen,
  imageUrl,
  onClose,
  altText = 'Imagem ampliada',
}: ImageViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-90"
        onClick={onClose}
      />

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
        aria-label="Fechar"
      >
        <X className="w-6 h-6 text-gray-900" />
      </button>

      {/* Image Container */}
      <div className="relative max-w-7xl max-h-[90vh] w-full">
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
