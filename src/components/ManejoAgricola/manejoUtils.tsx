import React from 'react';
import { Droplets, Package, Leaf, Scissors, Bug, Sprout } from 'lucide-react';

export function getIconByType(nomeAtividade: string) {
  const tipo = (nomeAtividade || '').toLowerCase();
  if (tipo.includes('pulverização') || tipo.includes('pulverizar')) {
    return <Droplets className="w-5 h-5 text-[#00A651]" />;
  }
  if (tipo.includes('adubação') || tipo.includes('adubar')) {
    return <Package className="w-5 h-5 text-[#00A651]" />;
  }
  if (tipo.includes('capina') || tipo.includes('roçada')) {
    return <Leaf className="w-5 h-5 text-[#00A651]" />;
  }
  if (tipo.includes('poda')) {
    return <Scissors className="w-5 h-5 text-[#00A651]" />;
  }
  if (tipo.includes('irrigação') || tipo.includes('irrigar')) {
    return <Droplets className="w-5 h-5 text-[#00A651]" />;
  }
  if (tipo.includes('análise') || tipo.includes('coleta')) {
    return <Bug className="w-5 h-5 text-[#00A651]" />;
  }
  return <Sprout className="w-5 h-5 text-[#00A651]" />;
}

export function parseDateWithoutTime(dateString: string): Date | null {
  if (!dateString) return null;
  try {
    let date: Date;
    if (dateString.includes('T')) {
      date = new Date(dateString);
    } else if (dateString.includes('/')) {
      const partes = dateString.split('/');
      if (partes.length === 3) {
        const [primeira, segunda, terceira] = partes;
        if (terceira.length === 4) {
          date = new Date(parseInt(terceira), parseInt(segunda) - 1, parseInt(primeira));
        } else {
          date = new Date(parseInt(terceira) + 2000, parseInt(primeira) - 1, parseInt(segunda));
        }
      } else {
        return null;
      }
    } else if (dateString.includes('-')) {
      if (dateString.length === 10) {
        date = new Date(dateString);
      } else {
        return null;
      }
    } else {
      return null;
    }

    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  } catch (error) {
    console.error('Erro ao processar data:', error, dateString);
    return null;
  }
}

export function mapAtividadeToDisplay(atividade: any, getNomesTalhoesAtividade: (a: any) => string) {
  return {
    ...atividade,
    tipo: atividade.nome_atividade,
    descricao: atividade.nome_atividade,
    talhao: getNomesTalhoesAtividade(atividade),
    observacoes: atividade.observacao || ''
  };
}
