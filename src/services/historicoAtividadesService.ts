import { supabase } from '../lib/supabase';
import {
  calcularCamposAlterados,
  valoresIguais,
  filtrarCamposRelevantes,
  filtrarCamposExibicao,
  formatarNomeCampo,
  formatarValor,
  normalizeActivitySnapshot,
} from './historicoUtils';

export interface HistoricoEdicaoAtividade {
  id: string;
  atividade_id: string;
  id_lancamento_pai?: string | null;
  user_id: string;
  nome_editor: string;
  dados_anteriores: Record<string, unknown>;
  dados_novos: Record<string, unknown>;
  campos_alterados: string[];
  editado_em: string;
}

export interface HistoricoEdicaoAtividadeFormatado {
  id: string;
  editadoEm: Date;
  nomeEditor: string;
  alteracoes: Array<{ campo: string; valorAnterior: unknown; valorNovo: unknown }>;
  /** confirmação (is_completed) */
  isConfirmacao?: boolean;
  /** marca criação */
  isCriacao?: boolean;
  dadosAtividade?: Record<string, unknown>;
}

export class HistoricoAtividadesService {
  static async registrarEdicao(
    atividadeId: string,
    userId: string,
    nomeEditor: string,
    dadosAnteriores: Record<string, unknown>,
    dadosNovos: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // Não ignorar arrays filhos — queremos detectar alterações em responsáveis, produtos, talhões e máquinas
      const extrasIgnorados = new Set<string>();

      // Comparar usando snapshots normalizados (canonical) para evitar diferenças
      // superficiais entre aliases, case ou pequenas variações de formatação.
      const normAnteriores = normalizeActivitySnapshot(dadosAnteriores || {});
      const normNovos = normalizeActivitySnapshot(dadosNovos || {});

      // debug detalhado para responsaveis/produtos: imprimir arrays normalizados
      try {
        if (process.env.NODE_ENV !== 'production') {
          // importar dinamicamente helpers (evita ciclos em alguns loaders)
          const utils = await import('./historicoUtils');
          const rA = utils.normalizeResponsaveisForCompare(normAnteriores['responsaveis']);
          const rB = utils.normalizeResponsaveisForCompare(normNovos['responsaveis']);
          const pA = utils.normalizeProdutosForCompare(normAnteriores['produtos']);
          const pB = utils.normalizeProdutosForCompare(normNovos['produtos']);
          console.debug('Historico.debug normalized.responsaveis:', { rA, rB });
          console.debug('Historico.debug normalized.produtos:', { pA, pB });
          console.debug('Historico.debug raw.responsaveis:', {
            antes: normAnteriores['responsaveis'],
            novo: normNovos['responsaveis'],
          });
          console.debug('Historico.debug raw.produtos:', {
            antes: normAnteriores['produtos'],
            novo: normNovos['produtos'],
          });
        }
      } catch (e) {
        // ignore debug errors
      }

      let camposAlterados = calcularCamposAlterados(normAnteriores, normNovos, extrasIgnorados);
      // garantir unicidade de campos (evita registros duplicados por aliases)
      camposAlterados = Array.from(new Set(camposAlterados));
      // LOG para debugging em dev
      try {
        console.debug('HistoricoAtividadesService.registrarEdicao camposAlterados:', camposAlterados);
        console.debug('dadosAnteriores keys:', Object.keys(normAnteriores || {}));
        console.debug('dadosNovos keys:', Object.keys(normNovos || {}));
      } catch (e) {
        // ignore logging error
      }

      if (camposAlterados.length === 0) {
        console.log('HistoricoAtividadesService: nenhum campo alterado, nada a registrar');
        return true;
      }

      const isConfirmacao =
        camposAlterados.includes('is_completed') &&
        dadosNovos['is_completed'] === true;

      // Registrar snapshot completo dos objetos NEW/OLD sem filtragem.
      // Mesmo que alguns campos sejam técnicos, o requisito é armazenar
      // todos os campos da tabela `lancamentos_agricolas` sem exceção.
      const dadosAnterioresFiltrados = { ...(dadosAnteriores || {}) } as Record<string, unknown>;
      const dadosNovosFiltrados = { ...(dadosNovos || {}) } as Record<string, unknown>;

      const { error } = await supabase.from('historico_lancamentos_agricolas').insert({
        atividade_id: atividadeId,
        id_lancamento_pai: dadosNovos['id_lancamento_pai'] ?? dadosAnteriores['id_lancamento_pai'] ?? null,
        user_id: userId,
        nome_editor: nomeEditor,
        dados_anteriores: dadosAnterioresFiltrados,
        dados_novos: dadosNovosFiltrados,
        campos_alterados: camposAlterados,
      });

      if (error) {
        console.error('HistoricoAtividadesService: erro ao inserir edicao', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('HistoricoAtividadesService: excecao', err);
      return false;
    }
  }

  static async getHistoricoByAtividade(
    atividadeId: string
  ): Promise<HistoricoEdicaoAtividade[]> {
    try {
      const query = supabase
        .from('historico_lancamentos_agricolas')
        .select('*')
        .eq('atividade_id', atividadeId)
        .order('editado_em', { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.error('HistoricoAtividadesService: erro ao buscar', error);
        return [];
      }

      // Garantir que campos JSONB venham como objetos (alguns adaptadores retornam strings)
      const normalized = (data || []).map((row: any) => {
        const copy = { ...row } as any;
        try {
          if (typeof copy.dados_novos === 'string') copy.dados_novos = JSON.parse(copy.dados_novos);
        } catch (e) {
          // keep original
        }
        try {
          if (typeof copy.dados_anteriores === 'string') copy.dados_anteriores = JSON.parse(copy.dados_anteriores);
        } catch (e) {
          // keep original
        }
        // canonicalize snapshot keys to avoid 'lancamento_*' vs canonical keys
        try {
          copy.dados_novos = normalizeActivitySnapshot(copy.dados_novos || {});
        } catch (e) {
          // ignore
        }
        try {
          copy.dados_anteriores = normalizeActivitySnapshot(copy.dados_anteriores || {});
        } catch (e) {
          // ignore
        }
        return copy;
      });

      return normalized as HistoricoEdicaoAtividade[];
    } catch (err) {
      console.error('HistoricoAtividadesService: excecao', err);
      return [];
    }
  }

  static async getHistoricoFormatado(
    atividadeId: string
  ): Promise<HistoricoEdicaoAtividadeFormatado[]> {
    try {
      const historico = await this.getHistoricoByAtividade(atividadeId);

      const criacoes: HistoricoEdicaoAtividadeFormatado[] = [];
      const confirmacoes: HistoricoEdicaoAtividadeFormatado[] = [];
      const edicoes: HistoricoEdicaoAtividadeFormatado[] = [];

      for (const registro of historico) {
          const campos = Array.isArray(registro.campos_alterados)
            ? Array.from(new Set(registro.campos_alterados))
            : [];

        const isConfirmacao =
          campos.includes('is_completed') &&
          registro.dados_novos?.['is_completed'] === true;
        const isCriacao =
          campos.includes('criação') ||
          (registro.nome_editor === 'Sistema' &&
            Object.keys(registro.dados_anteriores || {}).length === 0);

        if (isCriacao) {
          criacoes.push({
            id: registro.id,
            editadoEm: new Date(registro.editado_em),
            nomeEditor: registro.nome_editor,
            alteracoes: [],
            isCriacao: true,
            dadosAtividade: registro.dados_novos,
          });
          continue;
        }

        if (isConfirmacao) {
          confirmacoes.push({
            id: registro.id,
            editadoEm: new Date(registro.editado_em),
            nomeEditor: registro.nome_editor,
            alteracoes: [],
            isConfirmacao: true,
            dadosAtividade: registro.dados_novos,
          });
          continue;
        }

        const alteracoesFormatadas = campos.map((campo) => ({
          campo: formatarNomeCampo(campo),
          valorAnterior: formatarValor(campo, registro.dados_anteriores?.[campo]),
          valorNovo: formatarValor(campo, registro.dados_novos?.[campo]),
        }));

        const alteracoesReais = alteracoesFormatadas.filter(
          (alt) => alt.valorAnterior !== alt.valorNovo
        );

        if (alteracoesReais.length > 0) {
          edicoes.push({
            id: registro.id,
            editadoEm: new Date(registro.editado_em),
            nomeEditor: registro.nome_editor,
            alteracoes: alteracoesReais,
          });
        }
      }

      const sortDesc = (
        a: HistoricoEdicaoAtividadeFormatado,
        b: HistoricoEdicaoAtividadeFormatado
      ) => b.editadoEm.getTime() - a.editadoEm.getTime();
      const sortAsc = (
        a: HistoricoEdicaoAtividadeFormatado,
        b: HistoricoEdicaoAtividadeFormatado
      ) => a.editadoEm.getTime() - b.editadoEm.getTime();

      // manter criações e confirmações com entradas mais recentes primeiro,
      // mas exibições de edição devem aparecer da mais antiga → mais recente.
      criacoes.sort(sortDesc);
      confirmacoes.sort(sortDesc);
      edicoes.sort(sortAsc);

      return [...criacoes, ...confirmacoes, ...edicoes];
    } catch (err) {
      console.error('HistoricoAtividadesService: error formatting', err);
      return [];
    }
  }
}
