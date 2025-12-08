import React from 'react';
import { X, Info } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ComponentType<any>;
  iconColor?: string;
  showFooter?: boolean;
  showHeader?: boolean;
  contentClassName?: string;
}

const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  icon: Icon = Info,
  iconColor = 'text-blue-600',
  showFooter = true,
  showHeader = true,
  contentClassName = 'p-4',
}) => {
  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header: show title/icon if requested, otherwise render only close button */}
        {showHeader ? (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full bg-gray-100 ${iconColor}`}>
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fechar modal"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        ) : (
          <div className="flex justify-end p-2">
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fechar modal"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={contentClassName}>{children}</div>

        {/* Footer (optional) */}
        {showFooter && (
          <div className="flex justify-end p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#397738] text-white rounded-lg hover:bg-[#2d5a2a] transition-colors"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoModal;