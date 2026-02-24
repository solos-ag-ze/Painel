import React from 'react';
import { MapPin } from 'lucide-react';

export default function TalhaoEmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-6">
      <div className="text-center py-8">
        <MapPin className="w-12 h-12 text-[#00A651] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-[#004417] mb-2">Nenhum talhão encontrado</h3>
        <p className="text-[rgba(0,68,23,0.75)] font-medium mb-4">
          Você ainda não possui talhões cadastrados. Os talhões são criados automaticamente 
          quando você registra atividades agrícolas via WhatsApp do Zé.
        </p>
        <div className="bg-[#00A651]/10 p-4 rounded-xl border border-[#00A651]/20">
          <p className="text-sm text-[#004417] font-medium">
            <strong className="text-[#00A651]">Como criar talhões:</strong> Envie informações sobre suas atividades 
            agrícolas no WhatsApp do ZÉ, mencionando a área ou talhão onde foram realizadas.
          </p>
        </div>
      </div>
    </div>
  );
}
