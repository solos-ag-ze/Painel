import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#86b646] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#092f20] font-medium">Carregando dados...</p>
        <p className="text-sm text-gray-600 mt-2">Conectando com o banco de dados</p>
      </div>
    </div>
  );
}