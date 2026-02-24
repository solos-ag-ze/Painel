import { Controller, useFormContext } from 'react-hook-form';
import type { Control, UseFormRegister, UseFormSetValue, FieldValues } from 'react-hook-form';

interface ProdutoRowItem {
  id?: string;
  produto_catalogo_id?: string | null;
  nome?: string;
  nome_produto?: string;
  quantidade?: number | string | null;
  unidade?: string;
}

interface AvailableProduto {
  produto_id?: string;
  id?: string;
  nome_produto: string;
}

interface Props {
  p: ProdutoRowItem;
  idx: number;
  availableProdutos: AvailableProduto[];
  control: Control<FieldValues>;
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  remove: (i: number) => void;
}

export default function ProdutoRow({ p, idx, availableProdutos, control, register, setValue, remove }: Props) {
  const { formState } = useFormContext();
  const errors = (formState.errors as any)?.produtos?.[idx] || {};

  return (
    <div key={p.id || idx} className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
      {!p.produto_catalogo_id && (
        <div className="col-span-1 sm:col-span-6 bg-orange-50 border border-orange-200 rounded p-2 text-sm text-orange-700 flex items-center gap-2">
          <span>⚠️</span>
          <span>Este produto não está cadastrado no estoque</span>
        </div>
      )}

      <div className="col-span-1 sm:col-span-2">
        {availableProdutos.length > 0 ? (
          <>
            <select
              id={`produtos-${idx}-nome`}
              aria-invalid={Boolean(errors?.nome)}
              aria-describedby={errors?.nome ? `produtos-${idx}-nome-error` : undefined}
              className="w-full border rounded px-2 py-2"
              {...register(`produtos.${idx}.nome` as const)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setValue(`produtos.${idx}.nome` as const, '');
                  setValue(`produtos.${idx}.produto_catalogo_id` as const, null);
                } else {
                  const matchProd = availableProdutos.find(ap => ap.nome_produto === val);
                  setValue(`produtos.${idx}.nome` as const, val);
                  setValue(`produtos.${idx}.produto_catalogo_id` as const, matchProd?.produto_id || null);
                }
              }}
            >
              <option value="">Outro...</option>
              {availableProdutos.map(ap => (
                <option key={ap.produto_id || ap.id} value={ap.nome_produto}>{ap.nome_produto}</option>
              ))}
            </select>
            {!availableProdutos.some(ap => ap.nome_produto === (p.nome || '')) && (
              <>
              <input
                id={`produtos-${idx}-nome-custom`}
                aria-invalid={Boolean(errors?.nome)}
                aria-describedby={errors?.nome ? `produtos-${idx}-nome-error` : undefined}
                className="mt-2 w-full border rounded px-2 py-2"
                placeholder="Nome do produto"
                {...register(`produtos.${idx}.nome` as const)}
              />
              {errors?.nome && <p id={`produtos-${idx}-nome-error`} className="mt-1 text-sm text-[#D92D20]">{errors.nome?.message}</p>}
              </>
            )}
          </>
        ) : (
          <input
            className="col-span-1 sm:col-span-2 border rounded px-2 py-2"
            placeholder="Nome do produto"
            {...register(`produtos.${idx}.nome` as const)}
          />
        )}
      </div>

      <Controller
        control={control}
        name={`produtos.${idx}.quantidade` as const}
        render={({ field }) => (
          <>
            <input
              id={`produtos-${idx}-quantidade`}
              type="number"
              step="any"
              min={0}
              aria-invalid={Boolean(errors?.quantidade)}
              aria-describedby={errors?.quantidade ? `produtos-${idx}-quantidade-error` : undefined}
              className="col-span-1 sm:col-span-1 border rounded px-2 py-2"
              placeholder="Quantidade"
              value={field.value ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v === '' ? undefined : Number(v));
              }}
            />
            {errors?.quantidade && <p id={`produtos-${idx}-quantidade-error`} className="mt-1 text-sm text-[#D92D20]">{errors.quantidade?.message}</p>}
          </>
        )}
      />

      <select
        className="col-span-1 sm:col-span-1 border rounded px-2 py-2"
        {...register(`produtos.${idx}.unidade` as const)}
      >
        <option value="mg">mg</option>
        <option value="g">g</option>
        <option value="kg">kg</option>
        <option value="ton">ton</option>
        <option value="mL">mL</option>
        <option value="L">L</option>
        <option value="un">un</option>
      </select>

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
