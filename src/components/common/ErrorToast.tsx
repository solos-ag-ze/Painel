import React, { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function ErrorToast({
  message,
  isVisible,
  onClose,
  duration = 5000
}: ErrorToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-slide-down">
      <div className="bg-white rounded-lg shadow-2xl border-l-4 border-[#F7941F] min-w-[300px] max-w-md">
        <div className="flex items-center gap-3 p-4">
          <div className="flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-[#F7941F]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar notificação"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-1 bg-gray-100 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-[#F7941F] animate-shrink"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
