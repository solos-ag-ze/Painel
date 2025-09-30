import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#092f20] mb-2">Erro ao carregar dados</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center space-x-2 px-4 py-2 bg-[#092f20] text-white rounded-lg hover:bg-[#397738] transition-colors mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar novamente</span>
          </button>
        )}
        
        <div className="mt-6 p-4 bg-[#86b646]/10 rounded-lg">
          <p className="text-sm text-[#397738]">
            <strong>Dica:</strong> Verifique sua conexão com a internet e tente novamente.
          </p>
        </div>
      </div>
    </div>
  );
}