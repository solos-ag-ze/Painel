import { supabase } from '../lib/supabase';

interface VinculoPropriedade {
  id_propriedade: string;
  ativo?: boolean;
}

export class PropriedadeService {
  /**
   * Retorna a propriedade ativa do usuário ou o primeiro vínculo disponível
   */
  static async getPropriedadeAtivaDoUsuario(userId: string): Promise<string | null> {
    if (!userId) {
      console.warn('⚠️ [PropriedadeService] getPropriedadeAtivaDoUsuario chamado sem userId');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('vinculo_usuario_propriedade')
        .select('id_propriedade')
        .eq('user_id', userId)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar propriedade ativa do usuário:', error);
      }

      if (data?.id_propriedade) {
        return data.id_propriedade;
      }

      const { data: fallbackList, error: fallbackError } = await supabase
        .from('vinculo_usuario_propriedade')
        .select('id_propriedade')
        .eq('user_id', userId)
        .limit(1);

      if (fallbackError) {
        console.error('❌ Erro ao buscar propriedades do usuário (fallback):', fallbackError);
        return null;
      }

      if (fallbackList && fallbackList.length > 0) {
        return fallbackList[0].id_propriedade;
      }

      console.warn('⚠️ Nenhuma propriedade encontrada para o usuário:', userId);
      return null;
    } catch (err) {
      console.error('❌ Falha inesperada ao resolver propriedade do usuário:', err);
      return null;
    }
  }
}
