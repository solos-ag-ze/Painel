// src/services/activityService.ts
import { supabase } from '../lib/supabase';
import { AtividadeAgricola } from '../lib/supabase';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AtividadeComData extends AtividadeAgricola {
  dataFormatada: string;
}

export class ActivityService {
  static async getAtividades(userId: string, limit: number = 10): Promise<AtividadeComData[]> {
    try {
      if (!userId) {
        console.error('Erro: user_id é obrigatório para buscar atividades');
        return [];
      }

      console.log('[ActivityService] Buscando atividades para user_id:', userId);

      const { data, error } = await supabase
        .from('atividades_agricolas')
        .select('*')
        .eq('user_id', userId)
        .order('data', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar atividades:', error);
        return [];
      }

      console.log('[ActivityService] Atividades encontradas:', data?.length || 0);

      return (data || []).map(atividade => ({
        ...atividade,
        dataFormatada: this.formatDate(atividade.data || '')
      }));
    } catch (error) {
      console.error('Erro no serviço de atividades:', error);
      return [];
    }
  }

  static async getAtividadesUltimos30Dias(userId: string): Promise<AtividadeComData[]> {
    try {
      if (!userId) {
        console.error('Erro: user_id é obrigatório para buscar atividades');
        return [];
      }

      console.log('[ActivityService] Buscando atividades dos últimos 30 dias para user_id:', userId);

      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 30);

      const { data, error } = await supabase
        .from('atividades_agricolas')
        .select('*')
        .eq('user_id', userId)
        .gte('data', dataInicio.toISOString().split('T')[0])
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao buscar atividades dos últimos 30 dias:', error);
        return [];
      }

      console.log('[ActivityService] Atividades dos últimos 30 dias encontradas:', data?.length || 0);

      return (data || []).map(atividade => ({
        ...atividade,
        dataFormatada: this.formatDate(atividade.data || '')
      }));
    } catch (error) {
      console.error('Erro no serviço de atividades:', error);
      return [];
    }
  }

  static async getAtividadesPorTipo(userId: string): Promise<{ [tipo: string]: number }> {
    try {
      if (!userId) {
        console.error('Erro: user_id é obrigatório para buscar atividades');
        return {};
      }

      console.log('[ActivityService] Buscando atividades por tipo para user_id:', userId);

      const { data, error } = await supabase
        .from('atividades_agricolas')
        .select('nome_atividade')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar atividades por tipo:', error);
        return {};
      }

      console.log('[ActivityService] Tipos de atividades encontrados:', data?.length || 0);

      const contagem: { [tipo: string]: number } = {};
      (data || []).forEach(atividade => {
        const tipo = atividade.nome_atividade || 'Outros';
        contagem[tipo] = (contagem[tipo] || 0) + 1;
      });

      return contagem;
    } catch (error) {
      console.error('Erro no serviço de atividades:', error);
      return {};
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
      if (nomeAtividade.toLowerCase().includes(key.toLowerCase())) {
        return icon;
      }
    }
    return '🚜';
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
}
