import React from 'react';

type Maquina = { nome_maquina?: string | null; horas_maquina?: number | null; nome?: string; horas?: string };

export default function MachineList({ maquinas }: { maquinas?: Maquina[] }) {
  if (!maquinas || maquinas.length === 0) {
    return <li className="text-[rgba(0,68,23,0.75)] font-medium">Não informado</li>;
  }

  return (
    <>
      {maquinas.map((m, idx) => (
        <li key={idx} className="flex justify-between">
          <span className="font-semibold text-[#004417]">{m.nome_maquina ?? m.nome}</span>
          <span className="text-[rgba(0,68,23,0.75)] font-medium">{m.horas_maquina ?? m.horas ?? '-'} h</span>
        </li>
      ))}
    </>
  );
}
