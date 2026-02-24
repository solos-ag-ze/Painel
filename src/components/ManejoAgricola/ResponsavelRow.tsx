import type { UseFormRegister, FieldValues } from 'react-hook-form';

interface ResponsavelItem { id?: string; nome?: string }

interface Props {
  r: ResponsavelItem;
  idx: number;
  register: UseFormRegister<FieldValues>;
  remove: (i: number) => void;
}

export default function ResponsavelRow({ r, idx, register, remove }: Props) {
  return (
    <div key={r.id || idx} className="flex gap-2 items-center">
      <input
        className="flex-1 border rounded px-2 py-2"
        placeholder="Nome do responsável"
        {...register(`responsaveis.${idx}.nome` as const)}
      />
      <button
        type="button"
        onClick={() => remove(idx)}
        className="text-sm text-[#F7941F]"
      >Remover</button>
    </div>
  );
}
