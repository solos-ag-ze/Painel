import React from 'react';

type Produto = {
  nome_produto?: string;
  quantidade_val?: number | null;
  quantidade_un?: string | null;
  dose_val?: number | null;
  dose_un?: string | null;
  nome?: string;
  quantidade?: string;
  unidade?: string;
};

export default function ProductList({ produtos }: { produtos?: Produto[] }) {
  if (!produtos || produtos.length === 0) {
    return <li className="text-[rgba(0,68,23,0.75)] font-medium">Não informado</li>;
  }

  return (
    <>
      {produtos.map((p, idx) => (
        <li key={idx} className="flex justify-between">
          <span className="font-semibold text-[#004417]">{p.nome_produto ?? p.nome}</span>
          <span className="text-[rgba(0,68,23,0.75)] font-medium text-right">
            {p.quantidade_val ?? p.quantidade ?? '-'} {p.quantidade_un ?? p.unidade ?? ''}
            {p.dose_val ? ` · ${p.dose_val} ${p.dose_un ?? ''}` : ''}
          </span>
        </li>
      ))}
    </>
  );
}
