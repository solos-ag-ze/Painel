/**
 * Serviço para gerenciar anexos compartilhados entre parcelas de transações
 *
 * Este serviço facilita a integração com automações (como n8n) que precisam
 * vincular anexos a transações parceladas.
 */

import { supabase } from '../lib/supabase';

export interface ParcelaInfo {
  id_transacao: string;
  parcela: string | null;
  numero_parcela: number;
  id_grupo_anexo: string;
  anexo_compartilhado_url: string | null;
}

export class SharedAttachmentService {
  /**
   * Busca todas as parcelas de um grupo de transação
   */
  static async getParcelasByGrupo(id_grupo_anexo: string): Promise<ParcelaInfo[]> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('id_transacao, parcela, id_grupo_anexo, anexo_compartilhado_url, numero_parcelas')
        .eq('id_grupo_anexo', id_grupo_anexo)
        .order('data_agendamento_pagamento', { ascending: true });

      if (error) {
        console.error('Erro ao buscar parcelas do grupo:', error);
        return [];
      }

      return data.map((t, index) => ({
        id_transacao: t.id_transacao,
        parcela: t.parcela,
        numero_parcela: index + 1,
        id_grupo_anexo: t.id_grupo_anexo,
        anexo_compartilhado_url: t.anexo_compartilhado_url
      }));
    } catch (error) {
      console.error('Erro ao buscar parcelas:', error);
      return [];
    }
  }

  /**
   * Busca todas as parcelas relacionadas a uma transação específica
   * Útil quando você tem o ID de uma parcela e quer encontrar as outras
   */
  static async getParcelasRelacionadas(id_transacao: string): Promise<ParcelaInfo[]> {
    try {
      // Primeiro busca a transação para obter o id_grupo_anexo
      const { data: transacao, error: transacaoError } = await supabase
        .from('transacoes_financeiras')
        .select('id_grupo_anexo')
        .eq('id_transacao', id_transacao)
        .single();

      if (transacaoError || !transacao?.id_grupo_anexo) {
        console.error('Erro ao buscar transação:', transacaoError);
        return [];
      }

      // Busca todas as parcelas do mesmo grupo
      return await this.getParcelasByGrupo(transacao.id_grupo_anexo);
    } catch (error) {
      console.error('Erro ao buscar parcelas relacionadas:', error);
      return [];
    }
  }

  /**
   * Propaga manualmente a URL de anexo para todas as parcelas de um grupo
   * Útil para sincronização quando o trigger do banco não executar
   */
  static async propagarAnexoParaParcelas(
    id_grupo_anexo: string,
    anexo_url: string
  ): Promise<{ success: boolean; updated: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .update({ anexo_compartilhado_url: anexo_url })
        .eq('id_grupo_anexo', id_grupo_anexo)
        .select();

      if (error) {
        console.error('Erro ao propagar anexo:', error);
        return { success: false, updated: 0, error: error.message };
      }

      console.log(`✅ Anexo propagado para ${data.length} parcelas`);
      return { success: true, updated: data.length };
    } catch (error) {
      console.error('Erro ao propagar anexo:', error);
      return {
        success: false,
        updated: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Verifica se uma transação faz parte de um grupo de parcelas
   */
  static async verificarGrupoParcelas(id_transacao: string): Promise<{
    tem_grupo: boolean;
    id_grupo_anexo: string | null;
    numero_parcelas: number;
    id_transacao_pai: string | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('id_grupo_anexo, numero_parcelas, id_transacao_pai')
        .eq('id_transacao', id_transacao)
        .single();

      if (error || !data) {
        console.error('Erro ao verificar grupo:', error);
        return {
          tem_grupo: false,
          id_grupo_anexo: null,
          numero_parcelas: 1,
          id_transacao_pai: null
        };
      }

      const tem_grupo = !!data.id_transacao_pai || (data.numero_parcelas && data.numero_parcelas > 1);

      return {
        tem_grupo,
        id_grupo_anexo: data.id_grupo_anexo,
        numero_parcelas: data.numero_parcelas || 1,
        id_transacao_pai: data.id_transacao_pai
      };
    } catch (error) {
      console.error('Erro ao verificar grupo de parcelas:', error);
      return {
        tem_grupo: false,
        id_grupo_anexo: null,
        numero_parcelas: 1,
        id_transacao_pai: null
      };
    }
  }

  /**
   * Obtém informações detalhadas sobre o anexo de um grupo
   */
  static async getAnexoGrupoInfo(id_grupo_anexo: string): Promise<{
    tem_anexo: boolean;
    url: string | null;
    total_parcelas: number;
    parcelas_com_anexo: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('anexo_compartilhado_url')
        .eq('id_grupo_anexo', id_grupo_anexo);

      if (error || !data) {
        console.error('Erro ao buscar anexo do grupo:', error);
        return {
          tem_anexo: false,
          url: null,
          total_parcelas: 0,
          parcelas_com_anexo: 0
        };
      }

      const parcelas_com_anexo = data.filter(p => p.anexo_compartilhado_url).length;
      const primeira_url = data.find(p => p.anexo_compartilhado_url)?.anexo_compartilhado_url || null;

      return {
        tem_anexo: parcelas_com_anexo > 0,
        url: primeira_url,
        total_parcelas: data.length,
        parcelas_com_anexo
      };
    } catch (error) {
      console.error('Erro ao buscar informações do anexo:', error);
      return {
        tem_anexo: false,
        url: null,
        total_parcelas: 0,
        parcelas_com_anexo: 0
      };
    }
  }

  /**
   * Limpa o anexo compartilhado de todas as parcelas de um grupo
   */
  static async limparAnexoGrupo(id_grupo_anexo: string): Promise<{
    success: boolean;
    cleared: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .update({
          anexo_compartilhado_url: null,
          parcela_com_anexo_original: false
        })
        .eq('id_grupo_anexo', id_grupo_anexo)
        .select();

      if (error) {
        console.error('Erro ao limpar anexo do grupo:', error);
        return { success: false, cleared: 0, error: error.message };
      }

      console.log(`🗑️ Anexo limpo de ${data.length} parcelas`);
      return { success: true, cleared: data.length };
    } catch (error) {
      console.error('Erro ao limpar anexo:', error);
      return {
        success: false,
        cleared: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Função auxiliar para debugging - lista todos os grupos de anexo
   */
  static async listarGruposComAnexo(user_id: string): Promise<{
    id_grupo_anexo: string;
    numero_parcelas: number;
    tem_anexo: boolean;
    url: string | null;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('id_grupo_anexo, anexo_compartilhado_url, numero_parcelas')
        .eq('user_id', user_id)
        .not('id_grupo_anexo', 'is', null);

      if (error || !data) {
        console.error('Erro ao listar grupos:', error);
        return [];
      }

      // Agrupa por id_grupo_anexo
      const grupos = new Map<string, { numero_parcelas: number; url: string | null }>();

      data.forEach(t => {
        if (t.id_grupo_anexo) {
          if (!grupos.has(t.id_grupo_anexo)) {
            grupos.set(t.id_grupo_anexo, {
              numero_parcelas: t.numero_parcelas || 1,
              url: t.anexo_compartilhado_url
            });
          }
        }
      });

      return Array.from(grupos.entries()).map(([id_grupo, info]) => ({
        id_grupo_anexo: id_grupo,
        numero_parcelas: info.numero_parcelas,
        tem_anexo: !!info.url,
        url: info.url
      }));
    } catch (error) {
      console.error('Erro ao listar grupos com anexo:', error);
      return [];
    }
  }
}
