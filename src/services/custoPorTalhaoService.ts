import { supabase } from '../lib/supabase';

export interface CustoTalhao {
  talhao: string;
  area: number;
  insumos: number;
  operacional: number;
  servicosLogistica: number;
  administrativos: number;
  outros: number;
  total: number;
  custoHa: number;
}

export interface DetalheCusto {
  data: string;
  categoria: string;
  descricao: string;
  origem: 'Financeiro' | 'Atividade Agrícola';
  valor: number;
}

export interface Pendencia {
  tipo: string;
  referencia: string;
  descricao: string;
  status: string;
}

export interface FiltrosCustoPorTalhao {
  safra: string;
  fazenda?: string;
  talhoes?: string[];
  macrogrupo?: string;
  mesAno?: string;
}

export class CustoPorTalhaoService {
  /**
   * Busca custos consolidados por talhão
   */
  static async getCustosPorTalhao(
    userId: string,
    filtros: FiltrosCustoPorTalhao
  ): Promise<CustoTalhao[]> {
    try {
      // Implementar lógica de busca no Supabase
      // Aqui você integrará com as tabelas existentes de custos, talhões e atividades
      
      const { data, error } = await supabase
        .from('talhoes')
        .select(`
          id_talhao,
          nome,
          area,
          propriedade:id_propriedade (nome)
        `)
        .eq('usuario_id', userId);

      if (error) throw error;

      // Mock de dados - substituir com cálculo real
      return data?.map(talhao => ({
        talhao: talhao.nome,
        area: talhao.area,
        insumos: 0,
        operacional: 0,
        servicosLogistica: 0,
        administrativos: 0,
        outros: 0,
        total: 0,
        custoHa: 0
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar custos por talhão:', error);
      throw error;
    }
  }

  /**
   * Busca detalhes de custos de um talhão específico
   */
  static async getDetalhesCustoTalhao(
    userId: string,
    talhaoId: string,
    filtros: FiltrosCustoPorTalhao
  ): Promise<DetalheCusto[]> {
    try {
      // Implementar lógica de busca de detalhes
      // Combinar dados de transações financeiras e atividades agrícolas
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar detalhes de custo:', error);
      throw error;
    }
  }

  /**
   * Busca pendências relacionadas a custos
   */
  static async getPendencias(userId: string): Promise<Pendencia[]> {
    try {
      // Implementar lógica de busca de pendências
      // Verificar notas fiscais sem detalhes, consumos sem estoque, etc.
      
      return [];
    } catch (error) {
      console.error('Erro ao buscar pendências:', error);
      throw error;
    }
  }

  /**
   * Calcula indicadores agregados
   */
  static async getIndicadores(
    userId: string,
    filtros: FiltrosCustoPorTalhao
  ): Promise<{
    totalCustos: number;
    custoMedioHa: number;
    totalPendencias: number;
    distribuicaoMacrogrupos: Record<string, number>;
  }> {
    try {
      // Implementar cálculo de indicadores
      
      return {
        totalCustos: 0,
        custoMedioHa: 0,
        totalPendencias: 0,
        distribuicaoMacrogrupos: {}
      };
    } catch (error) {
      console.error('Erro ao calcular indicadores:', error);
      throw error;
    }
  }

  /**
   * Lista safras disponíveis para o usuário
   */
  static async getSafras(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('talhoes')
        .select('safra')
        .eq('usuario_id', userId)
        .order('safra', { ascending: false });

      if (error) throw error;

      // Remover duplicatas
      const safras = [...new Set(data?.map(t => t.safra).filter(Boolean) || [])];
      return safras;
    } catch (error) {
      console.error('Erro ao buscar safras:', error);
      return [];
    }
  }

  /**
   * Lista fazendas disponíveis para o usuário
   */
  static async getFazendas(userId: string): Promise<Array<{ id: string; nome: string }>> {
    try {
      const { data, error } = await supabase
        .from('propriedades')
        .select('id_propriedade, nome')
        .eq('usuario_id', userId);

      if (error) throw error;

      return data?.map(p => ({
        id: p.id_propriedade,
        nome: p.nome
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar fazendas:', error);
      return [];
    }
  }

  /**
   * Lista talhões disponíveis para o usuário
   */
  static async getTalhoes(
    userId: string,
    fazendaId?: string
  ): Promise<Array<{ id: string; nome: string }>> {
    try {
      let query = supabase
        .from('talhoes')
        .select('id_talhao, nome')
        .eq('usuario_id', userId);

      if (fazendaId) {
        query = query.eq('id_propriedade', fazendaId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(t => ({
        id: t.id_talhao,
        nome: t.nome
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar talhões:', error);
      return [];
    }
  }
}
