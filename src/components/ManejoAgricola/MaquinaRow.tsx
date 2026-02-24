import { Controller, useFormContext } from 'react-hook-form';
import type { Control, UseFormRegister, FieldValues } from 'react-hook-form';

interface MaquinaRowItem {
  id?: string;
  nome?: string;
  horas?: number | string | null;
}

interface Props {
  m: MaquinaRowItem;
  idx: number;
  availableMaquinas: Array<{ id_maquina: string; nome: string }>;
  control: Control<FieldValues>;
  register: UseFormRegister<FieldValues>;
  remove: (i: number) => void;
}

export default function MaquinaRow({ m, idx, availableMaquinas, control, register, remove }: Props) {
  const { formState } = useFormContext();
  const errors = (formState.errors as any)?.maquinas?.[idx] || {};

  return (
    <div key={m.id || idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
      <div className="col-span-1 sm:col-span-2">
        {availableMaquinas.length > 0 ? (
          <>
            <select
              id={`maquinas-${idx}-nome`}
              aria-invalid={Boolean(errors?.nome)}
              aria-describedby={errors?.nome ? `maquinas-${idx}-nome-error` : undefined}
              className="w-full border rounded px-2 py-2"
              {...register(`maquinas.${idx}.nome` as const)}
            >
              <option value="">Outro...</option>
              {availableMaquinas.map(am => (
                <option key={am.id_maquina} value={am.nome}>{am.nome}</option>
              ))}
            </select>
            {!availableMaquinas.some(am => am.nome === (m.nome || '')) && (
              <>
              <input
                id={`maquinas-${idx}-nome-custom`}
                aria-invalid={Boolean(errors?.nome)}
                aria-describedby={errors?.nome ? `maquinas-${idx}-nome-error` : undefined}
                className="mt-2 w-full border rounded px-2 py-2"
                placeholder="Nome da máquina"
                {...register(`maquinas.${idx}.nome` as const)}
              />
              {errors?.nome && <p id={`maquinas-${idx}-nome-error`} className="mt-1 text-sm text-[#D92D20]">{errors.nome?.message}</p>}
              </>
            )}
          </>
        ) : (
          <input
            id={`maquinas-${idx}-nome-none`}
            aria-invalid={Boolean(errors?.nome)}
            aria-describedby={errors?.nome ? `maquinas-${idx}-nome-error` : undefined}
            className="col-span-1 sm:col-span-2 border rounded px-2 py-2"
            placeholder="Nome da máquina"
            {...register(`maquinas.${idx}.nome` as const)}
          />
        )}
      </div>

      <Controller
        control={control}
        name={`maquinas.${idx}.horas` as const}
        render={({ field }) => (
          <>
          <input
            id={`maquinas-${idx}-horas`}
            type="number"
            step={1}
            min={0}
            aria-invalid={Boolean(errors?.horas)}
            aria-describedby={errors?.horas ? `maquinas-${idx}-horas-error` : undefined}
            className="col-span-1 sm:col-span-1 border rounded px-2 py-2"
            placeholder="Horas inteiras"
            value={field.value ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              field.onChange(v === '' ? undefined : Math.trunc(Number(v)));
            }}
          />
          {errors?.horas && <p id={`maquinas-${idx}-horas-error`} className="mt-1 text-sm text-[#D92D20]">{errors.horas?.message}</p>}
          </>
        )}
      />

      <div className="col-span-1 sm:col-span-6 text-right">
        <button
          type="button"
          onClick={() => remove(idx)}
          className="text-sm text-[#F7941F]"
        >Remover</button>
      </div>
    </div>
  );
}
