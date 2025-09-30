import { supabase } from '../lib/supabase';
import type { Talhao, VinculoUsuarioPropriedade, Propriedade } from '../lib/supabase';


export class TalhaoService {
  /**
   * Gets the total cultivated coffee area for a user
   */
  static async getAreaCultivadaCafe(
    userId: string,
    propriedadeId?: string
  ): Promise<number> {
    try {
      // First get all propriedade IDs linked to this user
      let query = supabase
        .from<VinculoUsuarioPropriedade>('vinculo_usuario_propriedade')
        .select('id_propriedade')
        .eq('user_id', userId)  
        .eq('ativo', true);

      if (propriedadeId) {
        query = query.eq('id_propriedade', propriedadeId);
      }

      const { data: vinculos, error: vinculoError } = await query;

      if (vinculoError || !vinculos || vinculos.length === 0) {
        console.warn('No active properties found for user');
        return 0;
      }

      const propriedadeIds = vinculos.map(v => v.id_propriedade);

      // Now query the sum of areas directly from the database
      const { data, error } = await supabase
        .from('talhoes')
        .select('area')
        .in('id_propriedade', propriedadeIds)
        .eq('cultura', 'Café')
        .eq('talhao_default', false)
        .eq('ativo', true);

      if (error) {
        console.error('Error calculating coffee area:', error);
        return 0;
      }

      // Sum all areas (convert to number if needed)
      const totalArea = data.reduce((sum, talhao) => {
        // Ensure area is treated as a number
        const area = typeof talhao.area === 'string' 
          ? parseFloat(talhao.area.replace(',', '.')) 
          : talhao.area;
        return sum + (area || 0);
      }, 0);

      return parseFloat(totalArea.toFixed(2)); // Return with 2 decimal places
    } catch (error) {
      console.error('Unexpected error in getAreaCultivadaCafe:', error);
      return 0;
    }
  }


static async getTotalProducaoFazenda(
  userId: string,
  propriedadeId?: string
): Promise<number> {
  try {
    // 1. Buscar as propriedades vinculadas ao usuário
    let propQuery = supabase
      .from('vinculo_usuario_propriedade')
      .select('id_propriedade')
      .eq('user_id', userId);

    if (propriedadeId) {
      propQuery = propQuery.eq('id_propriedade', propriedadeId);
    }

    const { data: vinculos, error: vinculoError } = await propQuery;

    if (vinculoError) throw vinculoError;
    if (!vinculos || !vinculos.length) return 0;

    const propriedadesIds = vinculos.map(v => v.id_propriedade);

    // 2. Buscar talhões dessas propriedades (apenas ativos e não default)
    const { data: talhoes, error: talhaoError } = await supabase
      .from('talhoes')
      .select('area, produtividade_saca, nome') // Including nome for debugging
      .in('id_propriedade', propriedadesIds)
      .eq('talhao_default', false)
      .eq('ativo', true);

    if (talhaoError) throw talhaoError;
    if (!talhoes || !talhoes.length) return 0;

    // 3. Calcular soma de (área × produtividade) para cada talhão
    let totalProducao = 0;
    
    for (const talhao of talhoes) {
      // Normalizar valores de área
      let area = 0;
      if (talhao.area) {
        area = typeof talhao.area === 'string' 
          ? parseFloat(talhao.area.replace(',', '.')) 
          : Number(talhao.area);
      }
      
      // Normalizar valores de produtividade
      let produtividade = 0;
      if (talhao.produtividade_saca) {
        produtividade = typeof talhao.produtividade_saca === 'string'
          ? parseFloat(talhao.produtividade_saca.replace(',', '.'))
          : Number(talhao.produtividade_saca);
      }
      
      // Somar apenas se ambos os valores são válidos e positivos
      if (area > 0 && produtividade > 0) {
        const producaoTalhao = area * produtividade;
        totalProducao += producaoTalhao;
        
        // Log para debug (remover em produção)
        console.log(`Talhão ${talhao.nome || 'N/A'}: ${area}ha × ${produtividade} sacas/ha = ${producaoTalhao.toFixed(2)} sacas`);
      }
    }

    console.log(`Total de produção da fazenda: ${totalProducao.toFixed(2)} sacas`);
    
    // 4. Retornar total de produção com 2 casas decimais
    return parseFloat(totalProducao.toFixed(2));
    
  } catch (error) {
    console.error('Erro ao calcular produção total da fazenda:', error);
    return 0;
  }
}

  
  /**
   * Gets all coffee fields for a user with area values as numbers
   */
  static async getTalhoesCafe(
    userId: string,
    options?: {
      onlyActive?: boolean;
      propriedadeId?: string;
    }
  ): Promise<Talhao[]> {
    try {
      // Get propriedade IDs linked to user
      let query = supabase
        .from<VinculoUsuarioPropriedade>('vinculo_usuario_propriedade')
        .select('id_propriedade')
        .eq('user_id', userId);

      if (options?.onlyActive !== false) {
        query = query.eq('ativo', true);
      }

      if (options?.propriedadeId) {
        query = query.eq('id_propriedade', options.propriedadeId);
      }

      const { data: vinculos, error: vinculoError } = await query;

      if (vinculoError || !vinculos || vinculos.length === 0) {
        return [];
      }

      const propriedadeIds = vinculos.map(v => v.id_propriedade);

      // Get talhoes
      let talhaoQuery = supabase
        .from<Talhao>('talhoes')
        .select('*')
        .in('id_propriedade', propriedadeIds)
        .eq('cultura', 'Café');

      if (options?.onlyActive !== false) {
        talhaoQuery = talhaoQuery.eq('ativo', true);
      }

      const { data: talhoes, error } = await talhaoQuery;

      if (error) throw error;

      // Ensure all area values are numbers
      return (talhoes || []).map(talhao => ({
        ...talhao,
        area: typeof talhao.area === 'string' 
          ? parseFloat(talhao.area.replace(',', '.')) 
          : talhao.area
      }));
    } catch (error) {
      console.error('Error fetching talhoes:', error);
      return [];
    }
  }
static async getTalhoesNonDefault(
    userId: string,
    options?: {
      onlyActive?: boolean;
      propriedadeId?: string;
    }
  ): Promise<Talhao[]> {
    try {
      // Get propriedade IDs linked to user
      let query = supabase
        .from<VinculoUsuarioPropriedade>('vinculo_usuario_propriedade')
        .select('id_propriedade')
        .eq('user_id', userId);
      
      if (options?.onlyActive !== false) {
        query = query.eq('ativo', true);
      }
      
      if (options?.propriedadeId) {
        query = query.eq('id_propriedade', options.propriedadeId);
      }
      
      const { data: vinculos, error: vinculoError } = await query;
      
      if (vinculoError || !vinculos || vinculos.length === 0) {
        return [];
      }
      
      const propriedadeIds = vinculos.map(v => v.id_propriedade);
      
      // Get talhoes where talhao_default is false
      let talhaoQuery = supabase
        .from<Talhao>('talhoes')
        .select('*')
        .in('id_propriedade', propriedadeIds)
        .eq('talhao_default', false);  // Only non-default talhões
      
      if (options?.onlyActive !== false) {
        talhaoQuery = talhaoQuery.eq('ativo', true);
      }
      
      const { data: talhoes, error } = await talhaoQuery;
      
      if (error) throw error;
      
      // Ensure all area values are numbers
      return (talhoes || []).map(talhao => ({
        ...talhao,
        area: typeof talhao.area === 'string' 
          ? parseFloat(talhao.area.replace(',', '.')) 
          : talhao.area
      }));
    } catch (error) {
      console.error('Error fetching non-default talhoes:', error);
      return [];
    }
  }
  /**
   * Gets detailed coffee field data including productivity
   */
  static async getTalhoesDetalhados(
    userId: string
  ): Promise<Array<Talhao & { propriedade?: Propriedade }>> {
    try {
      const talhoes = await this.getTalhoesCafe(userId);

      // Get propriedade info for each talhao
      const propriedadeIds = [...new Set(talhoes.map(t => t.id_propriedade))];
      const { data: propriedades, error: propError } = await supabase
        .from<Propriedade>('propriedades')
        .select('*')
        .in('id_propriedade', propriedadeIds);

      if (propError) console.warn('Error fetching propriedades:', propError);

      return talhoes.map(talhao => ({
        ...talhao,
        propriedade: propriedades?.find(p => p.id_propriedade === talhao.id_propriedade)
      }));
    } catch (error) {
      console.error('Error getting detailed talhoes:', error);
      return [];
    }
  }

  /**
   * Gets all talhões created by a specific user (using criado_por column)
   */
  static async getTalhoesPorCriador(
    userId: string,
    options?: {
      onlyActive?: boolean;
      cultura?: string;
    }
  ): Promise<Talhao[]> {
    try {
      console.log('Buscando talhões para userId:', userId);
      
      let query = supabase
        .from<Talhao>('talhoes')
        .select('*')
        .eq('criado_por', userId);

      if (options?.onlyActive !== false) {
        query = query.eq('ativo', true);
      }

      if (options?.cultura) {
        query = query.eq('cultura', options.cultura);
      }

      const { data: talhoes, error } = await query.order('data_criacao', { ascending: false });

      console.log('Resultado da consulta talhões:', { talhoes, error });
      if (error) throw error;

      // Ensure all area values are numbers
      return (talhoes || []).map(talhao => ({
        ...talhao,
        area: typeof talhao.area === 'string' 
          ? parseFloat(talhao.area.replace(',', '.')) 
          : talhao.area
      }));
    } catch (error) {
      console.error('Error fetching talhoes by creator:', error);
      return [];
    }
  }
  /**
   * Toggles talhao active status
   */
  static async toggleTalhaoStatus(
    talhaoId: string
  ): Promise<{ success: boolean; newStatus?: boolean }> {
    try {
      // Get current status
      const { data: talhao, error: fetchError } = await supabase
        .from<Talhao>('talhoes')
        .select('ativo')
        .eq('id_talhao', talhaoId)
        .single();

      if (fetchError || !talhao) throw fetchError;

      // Toggle status
      const newStatus = !talhao.ativo;
      const { error: updateError } = await supabase
        .from('talhoes')
        .update({ ativo: newStatus })
        .eq('id_talhao', talhaoId);

      if (updateError) throw updateError;
      return { success: true, newStatus };
    } catch (error) {
      console.error('Error toggling talhao status:', error);
      return { success: false };
    }
  }

  /**
   * Gets a single talhao by ID with propriedade info
   */
  static async getTalhaoById(
    talhaoId: string
  ): Promise<(Talhao & { propriedade?: Propriedade }) | null> {
    try {
      const { data: talhao, error } = await supabase
        .from<Talhao>('talhoes')
        .select('*')
        .eq('id_talhao', talhaoId)
        .single();

      if (error || !talhao) throw error;

      // Get propriedade info
      const { data: propriedade } = await supabase
        .from<Propriedade>('propriedades')
        .select('*')
        .eq('id_propriedade', talhao.id_propriedade)
        .single();

      return { ...talhao, propriedade: propriedade || undefined };
    } catch (error) {
      console.error('Error fetching talhao:', error);
      return null;
    }
  }

  /**
   * Método para verificar a estrutura da tabela talhoes e debug
   */
  static async verificarEstruturaTalhoes(): Promise<void> {
    try {
      console.log('🔍 Verificando estrutura da tabela talhoes...');
      
      // Teste simples de consulta
      const { data, error, count } = await supabase
        .from('talhoes')
        .select('*', { count: 'exact' })
        .limit(5);
      
      console.log('📊 Resultado da verificação:', {
        totalRegistros: count,
        primeirosRegistros: data,
        erro: error
      });
      
      if (data && data.length > 0) {
        console.log('✅ Estrutura da tabela talhoes está OK');
        console.log('📋 Exemplo de registro:', data[0]);
      } else {
        console.log('⚠️ Tabela talhoes está vazia ou inacessível');
      }
      
    } catch (error) {
      console.error('❌ Erro na verificação da estrutura:', error);
    }
  }

  static async getProdutividadeFazenda(
    userId: string,
    propriedadeId?: string
  ): Promise<number> {
    try {
      // Busca todos os talhões de café ativos para o usuário
      const talhoes = await this.getTalhoesCafe(userId, {
        onlyActive: true,
        propriedadeId
      });

      if (!talhoes.length) return 0;

      let soma = 0;

        if (area > 0) {
          soma += prod / area;
        }
   

      return parseFloat(soma.toFixed(2));
    } catch (error) {
      console.error('Erro ao calcular produtividade da fazenda:', error);
      return 0;
    }
  }

static async getProdutividadeFazendaTeste(
  userId: string,
  propriedadeId?: string
): Promise<number> {
  try {
    // 1. Buscar as propriedades vinculadas ao usuário
    let propQuery = supabase
      .from('vinculo_usuario_propriedade')
      .select('id_propriedade')
      .eq('user_id', userId);

    if (propriedadeId) {
      propQuery = propQuery.eq('id_propriedade', propriedadeId);
    }

    const { data: vinculos, error: vinculoError } = await propQuery;

    if (vinculoError) throw vinculoError;
    if (!vinculos || !vinculos.length) return 0;

    const propriedadesIds = vinculos.map(v => v.id_propriedade);

    // 2. Buscar talhões dessas propriedades
    const { data: talhoes, error: talhaoError } = await supabase
      .from('talhoes')
      .select('area, produtividade_saca')
      .in('id_propriedade', propriedadesIds)
      .eq('talhao_default', false)
      .eq('ativo', true);

    if (talhaoError) throw talhaoError;
    if (!talhoes || !talhoes.length) return 0;

    // 3. Calcular produtividade média ponderada pela área
    let totalProducao = 0;
    let totalArea = 0;
    
    for (const talhao of talhoes) {
      const area = talhao.area ?? 0;
      const produtividade = talhao.produtividade_saca ?? 0;
      
      if (area > 0 && produtividade > 0) {
        totalProducao += produtividade * area; // Produção deste talhão
        totalArea += area; // Área total
      }
    }

    // 4. Retornar produtividade média ponderada
    return totalArea > 0 ? parseFloat((totalProducao / totalArea).toFixed(2)) : 0;
  } catch (error) {
    console.error('Erro ao calcular produtividade da fazenda:', error);
    return 0;
  }
}

  static async getTotalAreaFazenda(
  userId: string,
  propriedadeId?: string
): Promise<number> {
  try {
    // 1. Buscar as propriedades vinculadas ao usuário
    let propQuery = supabase
      .from('vinculo_usuario_propriedade')
      .select('id_propriedade')
      .eq('user_id', userId);
    
    if (propriedadeId) {
      propQuery = propQuery.eq('id_propriedade', propriedadeId);
    }
    
    const { data: vinculos, error: vinculoError } = await propQuery;
    if (vinculoError) throw vinculoError;
    if (!vinculos || !vinculos.length) return 0;
    
    const propriedadesIds = vinculos.map(v => v.id_propriedade);
    
    // 2. Buscar talhões dessas propriedades (sem filtro de ativo, mas excluindo default)
    const { data: talhoes, error: talhaoError } = await supabase
      .from('talhoes')
      .select('area')
      .in('id_propriedade', propriedadesIds)
      .eq('talhao_default', false);
    
    if (talhaoError) throw talhaoError;
    if (!talhoes || !talhoes.length) return 0;
    
    // 3. Calcular área total
    let totalArea = 0;
    
    for (const talhao of talhoes) {
      const area = talhao.area ?? 0;
      
      if (area > 0) {
        totalArea += area;
      }
    }
    
    // 4. Retornar área total
    return parseFloat(totalArea.toFixed(2));
  } catch (error) {
    console.error('Erro ao calcular área total da fazenda:', error);
    return 0;
  }
}



 static async getTalhaoDefaultId(
  userId: string,
  propriedadeId?: string
): Promise<string | null> {  // Changed return type to string | null
  try {
    console.log('🔍 Buscando talhão default para userId:', userId, 'propriedadeId:', propriedadeId);
    
    // 1. Buscar as propriedades vinculadas ao usuário
    let propQuery = supabase
      .from('vinculo_usuario_propriedade')
      .select('id_propriedade')
      .eq('user_id', userId);
    
    if (propriedadeId) {
      propQuery = propQuery.eq('id_propriedade', propriedadeId);
    }
    
    const { data: vinculos, error: vinculoError } = await propQuery;
    console.log('📋 Vínculos encontrados:', vinculos);
    
    if (vinculoError) {
      console.error('❌ Erro ao buscar vínculos:', vinculoError);
      throw vinculoError;
    }
    
    if (!vinculos || !vinculos.length) {
      console.log('⚠️ Nenhum vínculo encontrado para o usuário');
      return null;
    }
    
    const propriedadesIds = vinculos.map(v => v.id_propriedade);
    console.log('🏠 IDs das propriedades:', propriedadesIds);
    
    // 2. Buscar o talhão default das propriedades do usuário
    const { data: talhoes, error: talhaoError } = await supabase
      .from('talhoes')
      .select('id_talhao')  // Changed from 'id' to 'id_talhao' to match your component
      .in('id_propriedade', propriedadesIds)
      .eq('talhao_default', true)
      .limit(1);
    
    console.log('🌾 Talhões default encontrados:', talhoes);
    
    if (talhaoError) {
      console.error('❌ Erro ao buscar talhões:', talhaoError);
      throw talhaoError;
    }
    
    if (!talhoes || !talhoes.length) {
      console.log('⚠️ Nenhum talhão default encontrado');
      return null;
    }
    
    const defaultTalhaoId = talhoes[0].id_talhao;  // Changed from 'id' to 'id_talhao'
    console.log('✅ Talhão default ID encontrado:', defaultTalhaoId);
    
    return defaultTalhaoId;
    
  } catch (error) {
    console.error('💥 Erro detalhado ao encontrar Talhão Default:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;  // Return null instead of 0
  }
}
  
  static async getProdutividadeFazendaPeso(
  userId: string,
  propriedadeId?: string
): Promise<number> {
  try {
    // Busca todos os talhões de café ativos para o usuário
    const talhoes = await this.getTalhoesCafe(userId, {
      onlyActive: true,
      propriedadeId
    });
    
    if (!talhoes.length) return 0;
    
    let totalProduction = 0;
    let totalArea = 0;
    
    talhoes.forEach(t => {
      const prod = typeof t.produtividade === 'string'
        ? parseFloat(t.produtividade.replace(',', '.'))
        : Number(t.produtividade) || 0;
      const area = typeof t.area === 'string'
        ? parseFloat(t.area.replace(',', '.'))
        : Number(t.area) || 0;
      
      if (area > 0 && prod > 0) {
        totalProduction += prod * area;  // Total production for this talhão
        totalArea += area;               // Add to total area
      }
    });
    
    // Return weighted average productivity
    return totalArea > 0 ? parseFloat((totalProduction / totalArea).toFixed(2)) : 0;
    
  } catch (error) {
    console.error('Erro ao calcular produtividade da fazenda:', error);
    return 0;
  }
}
}