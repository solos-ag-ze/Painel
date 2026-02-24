import React from 'react';
import type { Talhao } from '../../lib/supabase';

interface Props {
  talhoes: Talhao[];
  value: string;
  onChange: (val: string) => void;
  talhaoDefault?: string | null;
}

export default function TalhaoFilter({ talhoes, value, onChange, talhaoDefault }: Props) {
  const opcoes = ['todos', ...talhoes.map(t => t.id_talhao)];

  const getNomeTalhaoPorId = (talhaoId: string): string => {
    const talhao = talhoes.find(t => t.id_talhao === talhaoId);
    if (!talhao) return 'Talhão não encontrado';
    return talhaoId === talhaoDefault ? 'Sem talhão vinculado' : talhao.nome || 'Sem nome';
  };

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#004417]">Filtrar por Talhão</h3>
        <div className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium">
          {talhoes.length} {talhoes.length === 1 ? 'talhão encontrado' : 'talhões encontrados'}
        </div>
      </div>

      <div className="flex items-center flex-row flex-nowrap gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
        {opcoes.map((opcao) => (
          <button
            key={opcao}
            onClick={() => onChange(opcao)}
            className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all duration-200 whitespace-nowrap snap-start flex-shrink-0 ${
              value === opcao
                ? 'bg-[rgba(0,166,81,0.10)] border border-[#00A651] text-[#004417] font-semibold'
                : 'bg-white border border-[rgba(0,68,23,0.10)] text-[#004417] hover:bg-[rgba(0,68,23,0.03)] hover:border-[rgba(0,68,23,0.12)]'
            }`}
          >
            {opcao === 'todos' ? 'Sem Filtro' : getNomeTalhaoPorId(opcao)}
          </button>
        ))}
      </div>
    </div>
  );
}
