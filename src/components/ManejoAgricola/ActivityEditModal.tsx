import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ActivityPayload, ProdutoItem, MaquinaItem } from '../../types/activity';
import { MaquinaService } from '../../services/maquinaService';
import logger from '../../lib/logger';
import type { MaquinasEquipamentos } from '../../lib/supabase';
import { AuthService } from '../../services/authService';
import { N8nService } from '../../services/n8nService';
import { PropriedadeService } from '../../services/propriedadeService';
import useLoadActivity from '../../hooks/useLoadActivity';
import useTalhoes from '../../hooks/useTalhoes';
import useProdutos from '../../hooks/useProdutos';
import { useForm, useFieldArray, useWatch, FormProvider } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ErrorToast from '../common/ErrorToast';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import ProdutoRow from './ProdutoRow';
import MaquinaRow from './MaquinaRow';
import ResponsavelRow from './ResponsavelRow';

interface Props {
  isOpen: boolean;
  transaction?: ActivityPayload | null;
  onClose: () => void;
  onSave: (id: string, payload: ActivityPayload) => Promise<void>;
}

export default function ActivityEditModal({ isOpen, transaction, onClose, onSave }: Props) {
  const { local, loading: loadingActivity } = useLoadActivity(transaction);
  const { availableTalhoes } = useTalhoes(isOpen);
  const { availableProdutos } = useProdutos(isOpen);
  const [availableMaquinas, setAvailableMaquinas] = useState<Array<{ id_maquina: string; nome: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);

  // zod schema for validation with stronger checks
  const produtoSchema = z.object({
    id: z.string().optional(),
    nome: z.string().optional(),
    quantidade: z.preprocess((val) => {
      if (typeof val === 'string') {
        const s = val.trim();
        if (s === '') return undefined;
        const n = Number(s.replace(',', '.'));
        return Number.isNaN(n) ? val : n;
      }
      return val;
    }, z.number().positive({ message: 'Quantidade deve ser maior que 0' })).optional(),
    unidade: z.string().optional(),
    produto_catalogo_id: z.string().nullable().optional(),
  });

  const maquinaSchema = z.object({
    id: z.string().optional(),
    nome: z.string().optional(),
    horas: z.preprocess((val) => {
      if (typeof val === 'string') {
        const s = val.trim();
        if (s === '') return undefined;
        const n = Number(s);
        return Number.isNaN(n) ? val : Math.trunc(n);
      }
      return val;
    }, z.number().int().min(0, { message: 'Horas deve ser inteiro >= 0' })).optional(),
    maquina_id: z.string().nullable().optional(),
  });

  const responsavelSchema = z.object({ id: z.string().optional(), nome: z.string().optional() });

  const schema = z.object({
    descricao: z.string().max(50).nullable().optional(),
    data_atividade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida. Use YYYY-MM-DD' }).nullable().optional(),
    nome_talhao: z.string().optional(),
    talhao_ids: z.array(z.string()).optional(),
    produtos: z.array(produtoSchema).optional(),
    maquinas: z.array(maquinaSchema).optional(),
    observacoes: z.string().max(100).nullable().optional(),
    responsaveis: z.array(responsavelSchema).optional(),
  });

  type ProdutoFormItem = Omit<ProdutoItem, 'quantidade'> & { quantidade?: number | null };
  type MaquinaFormItem = Omit<MaquinaItem, 'horas'> & { horas?: number | null };

  type FormValues = {
    descricao?: string | null;
    data_atividade?: string | null;
    nome_talhao?: string;
    talhao_ids?: string[];
    produtos?: ProdutoFormItem[];
    maquinas?: MaquinaFormItem[];
    observacoes?: string | null;
    responsaveis?: Array<{ id?: string; nome?: string }>;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      descricao: '',
      data_atividade: '',
      nome_talhao: '',
      talhao_ids: [],
      produtos: [],
      maquinas: [],
      observacoes: '',
      responsaveis: [],
    }
  });

  const { control, register, handleSubmit, reset, setValue, formState } = form;
  const produtosFieldArray = useFieldArray<FormValues, 'produtos'>({ control, name: 'produtos' });
  const maquinasFieldArray = useFieldArray<FormValues, 'maquinas'>({ control, name: 'maquinas' });
  const responsaveisFieldArray = useFieldArray<FormValues, 'responsaveis'>({ control, name: 'responsaveis' });
  // useWatch para observar apenas os campos necessários e reduzir re-renders
  const descricao = useWatch<FormValues>({ control, name: 'descricao' }) as string | undefined;
  const observacoes = useWatch<FormValues>({ control, name: 'observacoes' }) as string | undefined;
  const watchedTalhaoIds = useWatch<FormValues>({ control, name: 'talhao_ids' }) as string[] | undefined;

  useEffect(() => {
    async function loadMaquinas() {
      try {
        const userId = AuthService.getInstance().getCurrentUser()?.user_id;
        if (!userId) return;
        // Suporta método estático se exposto pela classe, caso contrário instancia
        const timeoutMs = 8000;
        const callPromise = (async () => {
          if (typeof (MaquinaService as any).getMaquinasByUserId === 'function') {
            return await (MaquinaService as any).getMaquinasByUserId(userId);
          }
          const svc = new MaquinaService();
          return await svc.getMaquinasByUserId(userId);
        })();

        const list = await Promise.race([
          callPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
        ]);

        setAvailableMaquinas(((list as MaquinasEquipamentos[]) || []).map((m: MaquinasEquipamentos) => ({ id_maquina: m.id_maquina, nome: m.nome })));
      } catch (e) {
        logger.error('Erro ao carregar máquinas:', e);
        setAvailableMaquinas([]);
        setErrorMessage(typeof e === 'object' && e && 'message' in e ? (e as any).message : 'Erro ao carregar máquinas. Tente novamente.');
        setShowError(true);
      }
    }

    if (isOpen) loadMaquinas();
  }, [isOpen]);

  // limpar mensagens de erro ao reabrir o modal
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setShowError(false);
    }
  }, [isOpen]);

  // quando a carga local (vinda do hook) muda, resetar o form
  useEffect(() => {
    if (!local) return;
    // normalize numeric fields for the form (quantidade, horas)
    const produtosNorm = (local.produtos || []).map((p: ProdutoItem) => ({
      ...p,
      quantidade: p && p.quantidade !== undefined && p.quantidade !== null && p.quantidade !== '' ? Number(String(p.quantidade).replace(',', '.')) : undefined,
    }));
    const maquinasNorm = (local.maquinas || []).map((m: MaquinaItem) => ({
      ...m,
      horas: m && m.horas !== undefined && m.horas !== null && m.horas !== '' ? Math.trunc(Number(m.horas)) : undefined,
    }));

    reset({
      descricao: local.descricao ?? '',
      data_atividade: local.data_atividade ?? '',
      nome_talhao: local.nome_talhao ?? '',
      talhao_ids: local.talhao_ids ?? [],
      produtos: produtosNorm,
      maquinas: maquinasNorm,
      observacoes: local.observacoes ?? '',
      responsaveis: local.responsaveis ?? [],
    });
  }, [local, reset]);

  if (!isOpen) return null;
  

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload: ActivityPayload = {
        descricao: values.descricao ?? undefined,
        data_atividade: values.data_atividade ?? undefined,
        nome_talhao: values.nome_talhao ?? undefined,
        talhoes: values.talhao_ids ? values.talhao_ids.map(id => ({ talhao_id: id })) : undefined,
        produtos: values.produtos ? values.produtos.map(p => ({
          id: p.id ?? '',
          nome: p.nome ?? '',
          quantidade: p.quantidade != null ? String(p.quantidade) : '',
          unidade: p.unidade ?? '',
          produto_catalogo_id: p.produto_catalogo_id ?? undefined,
        })) : [],
        maquinas: values.maquinas ? values.maquinas.map(m => ({
          id: m.id ?? '',
          nome: m.nome ?? '',
          horas: m.horas != null ? String(Math.trunc(m.horas)) : '',
        })) : [],
        observacoes: values.observacoes ?? undefined,
        responsaveis: values.responsaveis ? values.responsaveis.map(r => ({ id: r.id, nome: r.nome ?? '' })) : [],
      };

      logger.debug('📝 ActivityEditModal - Iniciando salvamento (form)');
      logger.debug('Transaction ID:', transaction?.id);
      logger.debug('Payload completo:', payload);
      await onSave(transaction?.id || '', payload);
      logger.info('✅ Atividade salva com sucesso');

      // Após salvar a atividade, enviar payload completo para webhook do n8n
      try {
        const userId = AuthService.getInstance().getCurrentUser()?.user_id || null;
        const propriedadeId = userId ? await PropriedadeService.getPropriedadeAtivaDoUsuario(userId) : null;
        const webhookPayload = {
          atividade_id: transaction?.id || null,
          salvo_em: new Date().toISOString(),
          usuario_id: userId,
          propriedade_id: propriedadeId,
          atividade: payload,
        };

        await N8nService.sendActivityWebhook(webhookPayload);
      } catch (hookErr) {
        logger.error('Erro ao enviar payload para n8n:', hookErr);
        setErrorMessage('Atividade salva, porém falha ao enviar dados para automação (n8n).');
        setShowError(true);
      }

      onClose();
    } catch (e: unknown) {
      logger.error('❌ Erro ao salvar atividade:', e);
      const msg = (e && typeof e === 'object' && 'message' in e && typeof (e as any).message === 'string') ? (e as any).message : 'Erro ao salvar atividade. Tente novamente.';
      setErrorMessage(msg);
      setShowError(true);
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[10002] flex items-end sm:items-center justify-center bg-black/40">
      <div className="w-[90vw] sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white rounded-lg p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-[#004417]">Editar atividade</h3>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-[#F7941F]" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} aria-label="Formulário de edição de atividade">
        <FormProvider {...form}>
        {loadingActivity ? <div className="mt-4"><LoadingSpinner /></div> : (

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label htmlFor="descricao" className="flex flex-col">
            <span className="text-sm font-medium text-[#092f20]">Descrição</span>
            <input
              id="descricao"
              aria-invalid={Boolean(formState.errors?.descricao)}
              aria-describedby={formState.errors?.descricao ? 'descricao-error' : 'descricao-help'}
              className="mt-1 border rounded px-3 py-2 focus:border-[#397738]"
              {...register('descricao')}
              maxLength={50}
            />
            {formState.errors?.descricao ? (
              <p id="descricao-error" className="mt-1 text-sm text-[#D92D20]">{(formState.errors.descricao as any)?.message}</p>
            ) : (String(descricao || '').length >= 50) && (
              <p id="descricao-help" className="mt-1 text-sm text-[#F7941F]">Você atingiu o limite de 50 caracteres. Use uma descrição curta.</p>
            )}
          </label>

          <label htmlFor="data_atividade" className="flex flex-col">
            <span className="text-sm font-medium text-[#092f20]">Data da atividade</span>
            <input
              id="data_atividade"
              type="date"
              aria-invalid={Boolean(formState.errors?.data_atividade)}
              aria-describedby={formState.errors?.data_atividade ? 'data_atividade-error' : undefined}
              className="mt-1 border rounded px-3 py-2 focus:border-[#397738]"
              {...register('data_atividade')}
            />
            {formState.errors?.data_atividade && (
              <p id="data_atividade-error" className="mt-1 text-sm text-[#D92D20]">{(formState.errors.data_atividade as any)?.message}</p>
            )}
          </label>

          <div className="col-span-1 sm:col-span-2">
            <span className="text-sm font-medium text-[#092f20]">Talhões vinculados</span>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded p-2">
              {availableTalhoes.length === 0 && (
                <div className="text-sm text-[rgba(0,68,23,0.6)]">Nenhum talhão encontrado</div>
              )}
              {availableTalhoes.map((t) => (
                <label key={t.id_talhao} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean((watchedTalhaoIds || []).includes(t.id_talhao))}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const current = (watchedTalhaoIds || []) as string[];
                      const setIds = new Set(current);
                      if (checked) setIds.add(t.id_talhao);
                      else setIds.delete(t.id_talhao);
                      setValue('talhao_ids', Array.from(setIds));
                    }}
                  />
                  <span className="text-sm text-[#092f20]">{t.nome}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#092f20]">Responsáveis</span>
              <button
                type="button"
                onClick={() => responsaveisFieldArray.append({ id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now()), nome: '' })}
                className="px-3 py-1 bg-[#86b646] text-white rounded-md text-sm"
              >
                + Adicionar
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {responsaveisFieldArray.fields.map((r, idx) => (
                <ResponsavelRow key={r.id || idx} r={r} idx={idx} register={register} remove={responsaveisFieldArray.remove} />
              ))}
            </div>
          </div>

          {/* Produtos utilizados: múltiplos */}
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#092f20]">Produtos utilizados</span>
                <div className="text-xs text-[#092f20]">Adicione produtos usados na atividade (quantidade + unidade).</div>
              </div>
              <button
                type="button"
                onClick={() => produtosFieldArray.append({ id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now()), nome: availableProdutos[0]?.nome_produto || '', quantidade: undefined, unidade: 'kg' })}
                className="px-3 py-1 bg-[#86b646] text-white rounded-md text-sm"
              >
                + Adicionar produto
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {produtosFieldArray.fields.map((p, idx) => (
                <ProdutoRow
                  key={p.id || idx}
                  p={p}
                  idx={idx}
                  availableProdutos={availableProdutos}
                  control={control}
                  register={register}
                  setValue={setValue}
                  remove={produtosFieldArray.remove}
                />
              ))}
            </div>
          </div>

          {/* Máquinas utilizadas: múltiplas */}
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between mt-4">
              <div>
                <span className="text-sm font-medium text-[#092f20]">Máquinas utilizadas</span>
                <div className="text-xs text-[#092f20]">Digite o nome da máquina e informe horas inteiras (ex.: 1, 2).</div>
              </div>
              <button
                type="button"
                onClick={() => maquinasFieldArray.append({ id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now()), nome: availableMaquinas[0]?.nome || '', horas: undefined })}
                className="px-3 py-1 bg-[#86b646] text-white rounded-md text-sm"
              >
                + Adicionar máquina
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {maquinasFieldArray.fields.map((m, idx) => (
                <MaquinaRow
                  key={m.id || idx}
                  m={m}
                  idx={idx}
                  availableMaquinas={availableMaquinas}
                  control={control}
                  register={register}
                  remove={maquinasFieldArray.remove}
                />
              ))}
            </div>
          </div>

          {/* Campos de transação removidos neste modal de atividade */}

          <label htmlFor="observacoes" className="flex flex-col col-span-1 sm:col-span-2">
            <span className="text-sm font-medium text-[#092f20]">Observações</span>
            <input
              id="observacoes"
              aria-invalid={Boolean(formState.errors?.observacoes)}
              aria-describedby={formState.errors?.observacoes ? 'observacoes-error' : undefined}
              className="mt-1 border rounded px-3 py-2 focus:border-[#397738]"
              {...register('observacoes')}
              maxLength={100}
            />
            {formState.errors?.observacoes ? (
              <p id="observacoes-error" className="mt-1 text-sm text-[#D92D20]">{(formState.errors.observacoes as any)?.message}</p>
            ) : (String(observacoes || '').length >= 100) && (
              <p className="mt-1 text-sm text-[#F7941F]">Você atingiu o limite de 100 caracteres.</p>
            )}
          </label>          
        </div>
        )}
        </FormProvider>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-white border">Cancelar</button>
          <button
            type="submit"
            disabled={saving || !formState.isValid || loadingActivity}
            className="px-4 py-2 rounded bg-[#397738] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        </form>
      </div>
    </div>
  );

  return createPortal(
    <>
      {modal}
      <ErrorToast message={errorMessage} isVisible={showError} onClose={() => setShowError(false)} />
    </>,
    document.body
  );
}
