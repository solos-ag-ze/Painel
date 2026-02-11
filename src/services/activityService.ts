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
import { AuthService } from './authService';

export interface LancamentoComData extends LancamentoAgricola {
  dataFormatada: string;
  talhoes?: LancamentoTalhao[];
  responsaveis?: LancamentoResponsavel[];
  produtos?: LancamentoProduto[];
  maquinas?: LancamentoMaquina[];
}

export class ActivityService {
  /** Lista lançamentos (com filhos) — retorna em ordem decrescente por data_atividade */
  static async getLancamentos(userId?: string, limit: number = 50, onlyCompleted?: boolean): Promise<LancamentoComData[]> {
    try {
      const query = supabase
        .from('lancamentos_agricolas')
        .select(
          `*, 
          lancamento_talhoes(*), 
          lancamento_responsaveis(*), 
          lancamento_produtos(*), 
          lancamento_maquinas(*)`
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) query.eq('user_id', userId);
      
      // Se onlyCompleted for true, filtra apenas atividades completas
      if (onlyCompleted === true) {
        query.eq('is_completed', true);
      }

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
          `*, 
          lancamento_talhoes(*), 
          lancamento_responsaveis(*), 
          lancamento_produtos(*), 
          lancamento_maquinas(*)`
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

  static async updateLancamento(atividade_id: string, changes: Partial<any>) {
    console.log('🔄 ActivityService.updateLancamento() - Iniciando atualização');
    console.log('Atividade ID:', atividade_id);
    console.log('Changes (payload):', changes);

    const userId = AuthService.getInstance().getCurrentUser()?.user_id;

    // ═══ 1) Mapear campos do frontend → colunas reais do banco ═══
    const dbChanges: Record<string, any> = {};

    // descricao (frontend) → nome_atividade (banco)
    if ('descricao' in changes && changes.descricao !== undefined) {
      dbChanges.nome_atividade = changes.descricao;
    }
    if ('nome_atividade' in changes) dbChanges.nome_atividade = changes.nome_atividade;

    // data_atividade → garantir formato date (sem timestamp)
    if ('data_atividade' in changes && changes.data_atividade !== undefined) {
      dbChanges.data_atividade = changes.data_atividade ? String(changes.data_atividade).slice(0, 10) : null;
    }

    // observacoes (frontend, plural) → observacao (banco, singular)
    if ('observacoes' in changes && changes.observacoes !== undefined) {
      dbChanges.observacao = changes.observacoes;
    }
    if ('observacao' in changes) dbChanges.observacao = changes.observacao;

    // nome_talhao (frontend) → area_atividade (banco)
    if ('nome_talhao' in changes && changes.nome_talhao !== undefined) {
      dbChanges.area_atividade = changes.nome_talhao;
    }
    if ('area_atividade' in changes) dbChanges.area_atividade = changes.area_atividade;

    // Campos que existem diretamente na tabela
    if ('esperando_por_anexo' in changes) dbChanges.esperando_por_anexo = changes.esperando_por_anexo;
    if ('is_completed' in changes) dbChanges.is_completed = changes.is_completed;
    if ('estoque_excedido' in changes) dbChanges.estoque_excedido = changes.estoque_excedido;

    console.log('Payload mapeado para o banco:', dbChanges);

    // ═══ 2) Atualizar tabela principal ═══
    let mainResult = { data: null as any, error: null as any };
    if (Object.keys(dbChanges).length > 0) {
      const { data, error } = await supabase
        .from('lancamentos_agricolas')
        .update(dbChanges)
        .eq('atividade_id', atividade_id)
        .select()
        .single();

      mainResult = { data, error };
      if (error) {
        console.error('❌ Erro ao atualizar lancamentos_agricolas:', error);
      } else {
        console.log('✅ Tabela principal atualizada:', data);
      }
    }

    // ═══ 3) Atualizar talhões vinculados (lancamento_talhoes) ═══
    if (changes.talhao_ids || changes.talhoes) {
      const talhaoIds: string[] = changes.talhao_ids || (changes.talhoes || []).map((t: any) => t.talhao_id);
      try {
        await supabase.from('lancamento_talhoes').delete().eq('atividade_id', atividade_id);
        if (talhaoIds.length > 0) {
          const rows = talhaoIds.map((id: string) => ({ atividade_id, talhao_id: id, user_id: userId }));
          const { error: errTalhoes } = await supabase.from('lancamento_talhoes').insert(rows);
          if (errTalhoes) console.error('❌ Erro ao atualizar talhões:', errTalhoes);
          else console.log('✅ Talhões atualizados:', talhaoIds);
        }
      } catch (e) {
        console.error('❌ Erro ao atualizar talhões:', e);
      }
    }

    // ═══ 4) Atualizar responsáveis (lancamento_responsaveis) ═══
    if (changes.responsaveis) {
      try {
        await supabase.from('lancamento_responsaveis').delete().eq('atividade_id', atividade_id);
        const validResp = (changes.responsaveis as any[]).filter((r: any) => r.nome && r.nome.trim());
        if (validResp.length > 0) {
          const rows = validResp.map((r: any) => ({ atividade_id, nome: r.nome.trim(), user_id: userId }));
          const { error: errResp } = await supabase.from('lancamento_responsaveis').insert(rows);
          if (errResp) console.error('❌ Erro ao atualizar responsáveis:', errResp);
          else console.log('✅ Responsáveis atualizados:', validResp.length);
        }
      } catch (e) {
        console.error('❌ Erro ao atualizar responsáveis:', e);
      }
    }

    // ═══ 5) Atualizar produtos (lancamento_produtos) ═══
    if (changes.produtos) {
      try {
        await supabase.from('lancamento_produtos').delete().eq('atividade_id', atividade_id);
        const validProd = (changes.produtos as any[]).filter((p: any) => p.nome && p.nome.trim());
        if (validProd.length > 0) {
          const rows = validProd.map((p: any) => ({
            atividade_id,
            nome_produto: p.nome.trim(),
            quantidade_val: p.quantidade ? Number(p.quantidade) : null,
            quantidade_un: p.unidade || null,
            produto_catalogo_id: p.produto_catalogo_id || null,
            user_id: userId
          }));
          const { error: errProd } = await supabase.from('lancamento_produtos').insert(rows);
          if (errProd) console.error('❌ Erro ao atualizar produtos:', errProd);
          else console.log('✅ Produtos atualizados:', validProd.length);
        }
      } catch (e) {
        console.error('❌ Erro ao atualizar produtos:', e);
      }
    }

    // ═══ 6) Atualizar máquinas (lancamento_maquinas) ═══
    if (changes.maquinas) {
      try {
        await supabase.from('lancamento_maquinas').delete().eq('atividade_id', atividade_id);
        const validMaq = (changes.maquinas as any[]).filter((m: any) => m.nome && m.nome.trim());
        if (validMaq.length > 0) {
          const rows = validMaq.map((m: any) => ({
            atividade_id,
            nome_maquina: m.nome.trim(),
            horas_maquina: m.horas ? Number(m.horas) : null,
            user_id: userId
          }));
          const { error: errMaq } = await supabase.from('lancamento_maquinas').insert(rows);
          if (errMaq) console.error('❌ Erro ao atualizar máquinas:', errMaq);
          else console.log('✅ Máquinas atualizadas:', validMaq.length);
        }
      } catch (e) {
        console.error('❌ Erro ao atualizar máquinas:', e);
      }
    }

    return mainResult;
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
