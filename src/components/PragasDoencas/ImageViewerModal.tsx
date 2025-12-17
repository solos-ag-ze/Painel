import { useEffect } from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 md:px-8">
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
        <X className="w-5 h-5 md:w-6 md:h-6 text-gray-900" />
      </button>

      {/* Image Container */}
      <div className="relative w-full max-w-xs md:max-w-4xl max-h-[50vh] md:h-[90vh]">
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
