// src/services/activityService.ts
import { supabase } from '../lib/supabase';
import { AtividadeAgricola } from '../lib/supabase';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AtividadeComData extends AtividadeAgricola {
  dataFormatada: string;
}

export class ActivityService {
  static async getAtividades(limit: number = 10): Promise<AtividadeComData[]> {
    try {
      const { data, error } = await supabase
        .from('atividades_agricolas')
        .select('*')
        .order('data', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar atividades:', error);
        return [];
      }

      return (data || []).map(atividade => ({
        ...atividade,
        dataFormatada: this.formatDate(atividade.data || '')
      }));
    } catch (error) {
      console.error('Erro no serviço de atividades:', error);
      return [];
    }
  }

  static async getAtividadesUltimos30Dias(): Promise<AtividadeComData[]> {
    try {
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 30);

      const { data, error } = await supabase
        .from('atividades_agricolas')
        .select('*')
        .gte('data', dataInicio.toISOString().split('T')[0])
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao buscar atividades dos últimos 30 dias:', error);
        return [];
      }

      return (data || []).map(atividade => ({
        ...atividade,
        dataFormatada: this.formatDate(atividade.data || '')
      }));
    } catch (error) {
      console.error('Erro no serviço de atividades:', error);
      return [];
    }
  }

  static async getAtividadesPorTipo(): Promise<{ [tipo: string]: number }> {
    try {
      const { data, error } = await supabase
        .from('atividades_agricolas')
        .select('nome_atividade');

      if (error) {
        console.error('Erro ao buscar atividades por tipo:', error);
        return {};
      }

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
