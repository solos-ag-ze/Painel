// src/services/activityService.ts
import { supabase } from '../lib/supabase';
import type {
  LancamentoAgricola,
  LancamentoTalhao,
  LancamentoResponsavel,
  LancamentoProduto,
  LancamentoMaquina,
} from '../lib/supabase';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface LancamentoComData extends LancamentoAgricola {
  dataFormatada: string;
  talhoes?: LancamentoTalhao[];
  responsaveis?: LancamentoResponsavel[];
  produtos?: LancamentoProduto[];
  maquinas?: LancamentoMaquina[];
}

export class ActivityService {
  /** Lista lançamentos (com filhos) — retorna em ordem decrescente por data_atividade */
  static async getLancamentos(userId?: string, limit: number = 50): Promise<LancamentoComData[]> {
    try {
      const query = supabase
        .from('lancamentos_agricolas')
        .select(
          `*, lancamento_talhoes(*), lancamento_responsaveis(*), lancamento_produtos(*), lancamento_maquinas(*)`
        )
        .order('data_atividade', { ascending: false })
        .limit(limit);

      if (userId) query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar lançamentos:', error);
        return [];
      }

      return (data || []).map((l: any) => ({
        ...l,
        dataFormatada: this.formatDate(l.data_atividade || l.created_at || ''),
        talhoes: l.lancamento_talhoes || [],
        responsaveis: l.lancamento_responsaveis || [],
        produtos: l.lancamento_produtos || [],
        maquinas: l.lancamento_maquinas || [],
      }));
    } catch (err) {
      console.error('Erro no ActivityService.getLancamentos:', err);
      return [];
    }
  }

  static async getLancamentoById(atividade_id: string): Promise<LancamentoComData | null> {
    try {
      const { data, error } = await supabase
        .from('lancamentos_agricolas')
        .select(
          `*, lancamento_talhoes(*), lancamento_responsaveis(*), lancamento_produtos(*), lancamento_maquinas(*)`
        )
        .eq('atividade_id', atividade_id)
        .single();

      if (error) {
        console.error('Erro ao buscar lancamento por id:', error);
        return null;
      }

      const l: any = data;
      
      // Enriquecer produtos com unidade do estoque se quantidade_un estiver vazio
      const produtosEnriquecidos = await Promise.all(
        (l.lancamento_produtos || []).map(async (p: any) => {
          let unidade = p.quantidade_un;
          
          // Se quantidade_un estiver vazio/null e temos produto_id, buscar do estoque
          if ((!unidade || unidade === '') && p.produto_id) {
            try {
              const { data: produtoEstoque } = await supabase
                .from('estoque_de_produtos')
                .select('unidade_de_medida')
                .eq('id', p.produto_id)
                .single();
              
              if (produtoEstoque?.unidade_de_medida) {
                unidade = produtoEstoque.unidade_de_medida;
              }
            } catch (err) {
              console.error(`Erro ao buscar unidade do produto ${p.produto_id}:`, err);
            }
          }
          
          return {
            ...p,
            quantidade_un: unidade || 'un'
          };
        })
      );
      
      return {
        ...l,
        dataFormatada: this.formatDate(l.data_atividade || l.created_at || ''),
        talhoes: l.lancamento_talhoes || [],
        responsaveis: l.lancamento_responsaveis || [],
        produtos: produtosEnriquecidos,
        maquinas: l.lancamento_maquinas || [],
      };
    } catch (err) {
      console.error('Erro no ActivityService.getLancamentoById:', err);
      return null;
    }
  }

  static async createLancamento(
    payload: Partial<LancamentoAgricola>,
    {
      talhoes,
      responsaveis,
      produtos,
      maquinas,
    }: {
      talhoes?: Partial<LancamentoTalhao>[];
      responsaveis?: Partial<LancamentoResponsavel>[];
      produtos?: Partial<LancamentoProduto>[];
      maquinas?: Partial<LancamentoMaquina>[];
    } = {}
  ) {
    const { data: lancData, error: lancErr } = await supabase
      .from('lancamentos_agricolas')
      .insert([payload])
      .select()
      .single();

    if (lancErr) return { error: lancErr };

    const atividade_id = (lancData as any).atividade_id as string;

  const inserts: any[] = [];
  if (talhoes?.length) inserts.push(supabase.from('lancamento_talhoes').insert(talhoes.map(t => ({ ...t, atividade_id }))));
  if (responsaveis?.length) inserts.push(supabase.from('lancamento_responsaveis').insert(responsaveis.map(r => ({ ...r, atividade_id }))));
  if (produtos?.length) inserts.push(supabase.from('lancamento_produtos').insert(produtos.map(p => ({ ...p, atividade_id }))));
  if (maquinas?.length) inserts.push(supabase.from('lancamento_maquinas').insert(maquinas.map(m => ({ ...m, atividade_id }))));

  const insertResults = inserts.length ? await Promise.all(inserts as unknown as Promise<any>[]) : [];

    return { data: lancData, inserts: insertResults };
  }

  static async updateLancamento(atividade_id: string, changes: Partial<LancamentoAgricola>) {
    const { data, error } = await supabase
      .from('lancamentos_agricolas')
      .update(changes)
      .eq('atividade_id', atividade_id)
      .select()
      .single();

    return { data, error };
  }

  static async deleteLancamento(atividade_id: string) {
    // Remover filhos explicitamente
    await supabase.from('lancamento_talhoes').delete().eq('atividade_id', atividade_id);
    await supabase.from('lancamento_responsaveis').delete().eq('atividade_id', atividade_id);
    await supabase.from('lancamento_produtos').delete().eq('atividade_id', atividade_id);
    await supabase.from('lancamento_maquinas').delete().eq('atividade_id', atividade_id);

    const { data, error } = await supabase
      .from('lancamentos_agricolas')
      .delete()
      .eq('atividade_id', atividade_id)
      .select();

    return { data, error };
  }

  static getAnexoPublicUrl(bucket: string, path: string) {
    return supabase.storage.from(bucket).getPublicUrl(path);
  }

  static formatDate(dateString: string): string {
    try {
      if (!dateString) return 'Data não informada';

      let date: Date;
      if (dateString.includes('T')) {
        date = new Date(dateString);
      } else if (dateString.includes('/')) {
        const [dia, mes, ano] = dateString.split('/');
        if (ano.length === 4) {
          date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        } else {
          date = new Date(parseInt(ano) + 2000, parseInt(mes) - 1, parseInt(dia));
        }
      } else if (dateString.includes('-')) {
        date = parseISO(dateString);
      } else {
        return dateString;
      }

      if (!isValid(date)) return dateString;
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error, dateString);
      return dateString || 'Data não informada';
    }
  }

  static getAtividadeIcon(nomeAtividade: string): string {
    const icons: { [key: string]: string } = {
      'Pulverização': '💧',
      'Adubação': '🌱',
      'Plantio': '🌿',
      'Colheita': '☕',
      'Poda': '✂️',
      'Irrigação': '💦',
      'Capina': '🌾',
      'Análise': '🔬',
      'Manutenção': '🔧'
    };

    for (const [key, icon] of Object.entries(icons)) {
      if ((nomeAtividade || '').toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return '🚜';
  }
}
