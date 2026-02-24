import React from 'react';
import { MapPin, Coffee, Calendar, Sprout } from 'lucide-react';
import type { Talhao } from '../../lib/supabase';

interface Props {
  talhao: Talhao;
  atividadesCount: number;
}

export default function TalhaoInfoCard({ talhao, atividadesCount }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#00A651]/20 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-[#00A651]" />
          </div>
          <h3 className="text-lg font-bold text-[#004417]">Informações Técnicas</h3>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[#00A651]">
            {atividadesCount} {atividadesCount === 1 ? 'atividade' : 'atividades'} neste talhão
          </p>
        </div>
      </div>

      <div className="bg-[#00A651]/8 p-4 rounded-xl mb-4">
        <div className="flex flex-wrap items-center gap-4 text-sm md:text-base">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[#00A651] rounded-full"></div>
            <span className="font-bold text-[#004417] text-lg">{talhao.nome || 'Sem nome'}</span>
          </div>
          <div className="text-[rgba(0,68,23,0.15)]">|</div>
          <div className="flex items-center space-x-1">
            <span className="font-semibold text-[#004417]">{talhao.area ? Number(talhao.area).toFixed(1) : '0.0'} ha</span>
          </div>
          <div className="text-[rgba(0,68,23,0.15)]">|</div>
          <div className="flex items-center space-x-1">
            <Coffee className="w-4 h-4 text-[#00A651]" />
            <span className="text-[#004417] font-medium">{talhao.cultura || 'Café'}</span>
          </div>
          <div className="text-[rgba(0,68,23,0.15)]">|</div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4 text-[#00A651]" />
            <span className="text-[#004417] font-medium">Criado: {talhao.data_criacao ? new Date(talhao.data_criacao).toLocaleDateString('pt-BR') : 'N/A'}</span>
          </div>

          <div className="text-[rgba(0,68,23,0.15)]">|</div>
          <div className="flex items-center space-x-1">
            <span className="text-[#004417] font-medium">Variedade: {talhao.variedade_plantada || '-'}</span>
          </div>

          <div className="text-[rgba(0,68,23,0.15)]">|</div>
          <div className="flex items-center space-x-1">
            <span className="text-[#004417] font-medium">Quantidade de Pés: {talhao.quantidade_de_pes || '-'}</span>
          </div>

          <div className="text-[rgba(0,68,23,0.15)]">|</div>
          <div className="flex items-center space-x-1">
            <span className="text-[#004417] font-medium">Ano de Plantio: {talhao.ano_de_plantio ? new Date(talhao.ano_de_plantio).getFullYear() : '-'}</span>
          </div>

          {talhao.produtividade_saca && (
            <>
              <div className="text-[rgba(0,68,23,0.15)]">|</div>
              <div className="flex items-center space-x-1">
                <Sprout className="w-4 h-4 text-[#00A651]" />
                <span className="text-[#004417] font-medium">{talhao.produtividade_saca} sc/ha</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
