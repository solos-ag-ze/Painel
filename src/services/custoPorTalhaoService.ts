import { supabase } from '../lib/supabase';
import { TalhaoService } from './talhaoService';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Interface para custo de produto por talhão
 */
interface CustoProdutoTalhao {
  talhao_id: string;
  produto_id: number;
  produto_nome: string;
  quantidade_total: number;
  unidade: string;
  custo_total: number;
}

/**
 * Busca custos de insumos das atividades agrícolas por talhão
 * Calcula o custo dos produtos aplicados em cada talhão baseado em:
 * - lancamentos_agricolas: atividades registradas
 * - lancamento_produtos: produtos utilizados nas atividades
 * - lancamento_talhoes: talhões onde as atividades foram realizadas
 * - produtos_estoque: para buscar o preço unitário dos produtos
 */
async function getCustosInsumosPorTalhao(
  userId: string,
  dataInicio: Date | null,
  dataFim: Date | null
): Promise<Record<string, number>> {
  try {
    // 1. Buscar atividades agrícolas no período
    let queryAtividades = supabase
      .from('lancamentos_agricolas')
      .select('atividade_id, data_atividade')
      .eq('user_id', userId);

    if (dataInicio) {
      queryAtividades = queryAtividades.gte('data_atividade', format(dataInicio, 'yyyy-MM-dd'));
    }
    if (dataFim) {
      queryAtividades = queryAtividades.lte('data_atividade', format(dataFim, 'yyyy-MM-dd'));
    }

    const { data: atividades, error: errorAtividades } = await queryAtividades;

    if (errorAtividades) {
      return {};
    }

    if (!atividades || atividades.length === 0) {
      return {};
    }

    const atividadeIds = atividades.map(a => a.atividade_id);

    // 2. Buscar produtos utilizados nas atividades com custo já calculado
    const { data: produtos, error: errorProdutos } = await supabase
      .from('lancamento_produtos')
      .select('atividade_id, produto_id, quantidade_val, quantidade_un, custo_total_item, nome_produto')
      .in('atividade_id', atividadeIds)
      .not('produto_id', 'is', null);

    if (errorProdutos) {
      return {};
    }

    if (!produtos || produtos.length === 0) {
      return {};
    }

    // 3. Buscar talhões vinculados às atividades
    const { data: talhoes, error: errorTalhoes } = await supabase
      .from('lancamento_talhoes')
      .select('atividade_id, talhao_id')
      .in('atividade_id', atividadeIds);

    if (errorTalhoes) {
      return {};
    }

    // Criar mapa atividade_id -> talhao_ids[]
    const atividadeTalhoesMap = new Map<string, string[]>();
    (talhoes || []).forEach(t => {
      if (!atividadeTalhoesMap.has(t.atividade_id)) {
        atividadeTalhoesMap.set(t.atividade_id, []);
      }
      atividadeTalhoesMap.get(t.atividade_id)!.push(t.talhao_id);
    });

    // 4. Buscar talhões non-default para distribuição proporcional
    const talhoesNonDefault = await TalhaoService.getTalhoesNonDefault(userId, { onlyActive: true });
    const talhoesElegiveis = (talhoesNonDefault || []).filter(t => t && !t.talhao_default && (t.area || 0) > 0);
    
    // Criar mapa de talhões elegíveis por ID
    const talhoesElegivelMap = new Map<string, { id: string; nome: string; area: number }>();
    let totalAreaElegivel = 0;
    
    talhoesElegiveis.forEach(t => {
      talhoesElegivelMap.set(t.id_talhao, {
        id: t.id_talhao,
        nome: t.nome,
        area: t.area || 0
      });
      totalAreaElegivel += (t.area || 0);
    });

    // 5. Calcular custos por talhão usando custo_total_item
    const custosPorTalhao: Record<string, number> = {};
    const custosDetalhados: CustoProdutoTalhao[] = [];
    let custosSemVinculo = 0;

    produtos.forEach(produto => {
      const talhoesAtividade = atividadeTalhoesMap.get(produto.atividade_id) || [];

      // Usar custo_total_item que já vem calculado da tabela
      // Divide por 1 bilhão para ajustar a escala do valor
      const custoTotal = (typeof produto.custo_total_item === 'string'
        ? parseFloat(produto.custo_total_item)
        : (produto.custo_total_item || 0)) / 1000000000;

      if (custoTotal <= 0) {
        return; // Pula se não tem custo
      }

      const quantidade = typeof produto.quantidade_val === 'string'
        ? parseFloat(produto.quantidade_val)
        : (produto.quantidade_val || 0);

      // Verificar se algum talhão vinculado é non-default
      const talhoesValidos = talhoesAtividade.filter(talhaoId => talhoesElegivelMap.has(talhaoId));

      if (talhoesValidos.length > 0) {
        // Caso 1: Tem talhões non-default vinculados - divide igualmente entre eles
        const custoPorTalhao = custoTotal / talhoesValidos.length;

        talhoesValidos.forEach(talhaoId => {
          if (!custosPorTalhao[talhaoId]) {
            custosPorTalhao[talhaoId] = 0;
          }
          custosPorTalhao[talhaoId] += custoPorTalhao;

          // Guardar detalhamento
          custosDetalhados.push({
            talhao_id: talhaoId,
            produto_id: produto.produto_id!,
            produto_nome: produto.nome_produto || 'Produto sem nome',
            quantidade_total: quantidade / talhoesValidos.length,
            unidade: produto.quantidade_un || 'un',
            custo_total: custoPorTalhao
          });
        });
      } else {
        // Caso 2: Sem talhões non-default vinculados - acumular para distribuição proporcional
        custosSemVinculo += custoTotal;
      }
    });

    // 6. Buscar movimentações de estoque do tipo "saida" no período
    let queryEstoque = supabase
      .from('estoque_de_produtos')
      .select('valor_total, tipo_de_movimentacao, created_at')
      .eq('user_id', userId)
      .eq('tipo_de_movimentacao', 'saida');

    if (dataInicio) {
      queryEstoque = queryEstoque.gte('created_at', format(dataInicio, 'yyyy-MM-dd'));
    }
    if (dataFim) {
      queryEstoque = queryEstoque.lte('created_at', format(dataFim, 'yyyy-MM-dd') + 'T23:59:59');
    }

    const { data: movimentacoesEstoque, error: errorEstoque } = await queryEstoque;

    // Somar valores das saídas de estoque
    let custosSaidasEstoque = 0;
    (movimentacoesEstoque || []).forEach(mov => {
      const valor = typeof mov.valor_total === 'string'
        ? parseFloat(mov.valor_total)
        : (mov.valor_total || 0);
      custosSaidasEstoque += Math.abs(valor);
    });

    // 7. Distribuir custos sem vínculo + saídas de estoque proporcionalmente por área
    const custosTotaisParaDistribuir = custosSemVinculo + custosSaidasEstoque;

    if (custosTotaisParaDistribuir > 0 && totalAreaElegivel > 0) {
      talhoesElegivelMap.forEach((talhao, talhaoId) => {
        const proporcao = talhao.area / totalAreaElegivel;
        const custoDistribuido = custosTotaisParaDistribuir * proporcao;

        if (!custosPorTalhao[talhaoId]) {
          custosPorTalhao[talhaoId] = 0;
        }
        custosPorTalhao[talhaoId] += custoDistribuido;
      });
    }

    return custosPorTalhao;
  } catch {
    return {};
  }
}

/**
 * Busca o valor total de movimentações de estoque do tipo saída
 * para calcular insumos por talhão (distribuição proporcional por área)
 * @deprecated Usar getCustosInsumosPorTalhao() que calcula baseado nas atividades agrícolas
 */
async function getTotalMovimentacoesEstoque(
  userId: string,
  dataInicio: Date | null,
  dataFim: Date | null
): Promise<number> {
  try {
    let query = supabase
      .from('movimentacoes_estoque')
      .select('valor_total_movimentacao, tipo, created_at')
      .eq('user_id', userId)
      .eq('tipo', 'saida');

    if (dataInicio) {
      query = query.gte('created_at', format(dataInicio, 'yyyy-MM-dd'));
    }
    if (dataFim) {
      query = query.lte('created_at', format(dataFim, 'yyyy-MM-dd') + 'T23:59:59');
    }

    const { data, error } = await query;

    if (error) {
      return 0;
    }

    // Somar todos os valores de movimentações de saída
    const total = (data || []).reduce((acc, mov) => {
      const valor = typeof mov.valor_total_movimentacao === 'string' 
        ? parseFloat(mov.valor_total_movimentacao) 
        : (mov.valor_total_movimentacao || 0);
      return acc + Math.abs(valor);
    }, 0);

    return total;
  } catch {
    return 0;
  }
}

export interface CustoTalhao {
  id: string;
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
  origem: 'Financeiro' | 'Atividade Agrícola' | 'Estoque';
  valor: number;
  macrogrupo: string;
}

export interface Pendencia {
  tipo: string;
  referencia: string;
  descricao: string;
  status: string;
}

export interface FiltrosCustoPorTalhao {
  safra?: string;
  fazenda?: string;
  talhoes?: string[];
  macrogrupo?: string;
  mesAno?: string; // formato 'YYYY-MM'
}

// Mapeamento de categorias para macrogrupos
// Baseado nas categorias reais do banco de dados
const MACRO_CATEGORIAS = {
  insumos: [
    // Coluna 'insumos' será zerada - não busca de transacoes_financeiras
  ],
  operacional: [
    'Máquinas e Equipamentos',
    'Irrigação',
    'Aluguel de Máquinas',
    'Mão de obra',
    'Manutenção e Instalações',
    // Categorias observadas nos logs
    'Operação com máquinas',
    'Aluguel Máquinas',
    'Tratores e Colheitadeiras',
    'Operação com Avião',
    'Máquinas',
    'Implementos',
  ],
  servicosLogistica: [
    'Transporte',
    'Beneficiamento',
    'Despesas de armazenagem',
    'Classificação',
    'Assistência Técnica',
    'Serviços Diversos',
    'Análise de Solo'
  ],
  administrativos: [
    'Despesas Administrativas',
    'Despesas Gerais',
    'Encargos Sociais',
    'Arrendamento',
    'Seguro',
    'Gestão/Administração'
  ],
  outros: [
    'Outros',
    'Venda'
  ]
} as const;

// Keywords para identificação por descrição (fallback quando categoria não bate)
const KEYWORDS_MACROGRUPOS = {
  insumos: [], // Coluna 'insumos' será zerada - não busca de transacoes_financeiras
  operacional: [
    'diesel', 'gasolina', 'combustivel', 'combustível',
    'manutenc', 'manutenção', 'repar',
    'mao de obra', 'mão de obra', 'salario', 'salário',
    'trator', 'colheita', 'irrigação',
    'mourão', 'mourao', 'cerca', 'instalação', 'instalacao',
    'óleo', 'oleo', 'lubrificante', 'lubrific', 'oficina', 'peça', 'peca', 'corrente', 'filtro',
    // Palavras-chave adicionais dos logs
    'maquinas', 'máquinas', 'operacao', 'operação', 'aviao', 'avião',
    'colheitadeira', 'pulverizador', 'implementos', 'aluguel maquinas'
  ],
  servicosLogistica: ['transporte', 'frete', 'beneficiament', 'armazen', 'classifica', 'assistência', 'assistencia', 'analise de solo', 'análise de solo'],
  administrativos: ['administrativ', 'encargo', 'arrend', 'seguro', 'imposto', 'taxa', 'gestao', 'gestão', 'administracao', 'administração'],
  outros: ['outro', 'venda']
} as const;

export class CustoPorTalhaoService {
  /**
   * Helper para normalizar strings (remover acentos e caracteres especiais)
   */
  public static normalize(input: string): string {
    if (!input) return '';
    try {
      return input
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    } catch {
      return input.toString().trim().toLowerCase();
    }
  }

  /**
   * Identifica o macrogrupo de uma transação baseado na categoria ou descrição
   */
  private static identificarMacrogrupo(categoria: string, descricao: string): keyof typeof MACRO_CATEGORIAS | null {
    const catLower = (categoria || '').toLowerCase();
    const descNorm = this.normalize(descricao);

    // Primeiro tenta por categoria exata
    for (const [grupo, categorias] of Object.entries(MACRO_CATEGORIAS)) {
      if (categorias.some(c => c.toLowerCase() === catLower)) {
        return grupo as keyof typeof MACRO_CATEGORIAS;
      }
    }

    // Se não encontrou, tenta por keywords na descrição
    for (const [grupo, keywords] of Object.entries(KEYWORDS_MACROGRUPOS)) {
      if (keywords.some(kw => descNorm.includes(kw))) {
        return grupo as keyof typeof MACRO_CATEGORIAS;
      }
    }

    return null;
  }

  /**
   * Identifica macrogrupo SOMENTE pela categoria (sem keywords),
   * para alinhar o detalhamento com a regra solicitada.
   */
  private static identificarMacrogrupoPorCategoria(categoria: string): keyof typeof MACRO_CATEGORIAS | null {
    const catNorm = this.normalize(categoria || '');
    for (const [grupo, categorias] of Object.entries(MACRO_CATEGORIAS)) {
      if (categorias.some(c => this.normalize(c) === catNorm)) {
        return grupo as keyof typeof MACRO_CATEGORIAS;
      }
    }
    return null;
  }

  /**
   * Calcula as datas de início e fim da safra
   * Safra agrícola brasileira: Maio do ano X até Abril do ano X+1
   * Exemplo: safra "2024/2025" = 01/05/2024 a 30/04/2025
   */
  private static calcularPeriodoSafra(safra: string): { inicio: Date; fim: Date } {
    // Extrai o primeiro ano da safra (ex: "2024/2025" -> 2024)
    const match = safra.match(/(\d{4})/);
    const anoInicio = match ? parseInt(match[1]) : new Date().getFullYear();
    
    return {
      inicio: new Date(anoInicio, 4, 1), // 1º de Maio
      fim: new Date(anoInicio + 1, 3, 30, 23, 59, 59) // 30 de Abril do próximo ano
    };
  }

  /**
   * Busca custos consolidados por talhão com filtros completos
   */
  static async getCustosPorTalhao(
    userId: string,
    filtros: FiltrosCustoPorTalhao = {}
  ): Promise<CustoTalhao[]> {
    try {
      // 1. Buscar talhões do usuário (non-default e ativos)
      const talhoes = await TalhaoService.getTalhoesNonDefault(userId, { onlyActive: true });
      const eligibleTalhoes = (talhoes || []).filter(t => t && !t.talhao_default && (t.area || 0) > 0);

      if (eligibleTalhoes.length === 0) {
        return [];
      }

      // Filtrar talhões se especificado nos filtros
      let talhoesParaProcessar = eligibleTalhoes;
      if (filtros.talhoes && filtros.talhoes.length > 0) {
        talhoesParaProcessar = eligibleTalhoes.filter(t => 
          filtros.talhoes!.includes(t.id_talhao) || filtros.talhoes!.includes(t.nome)
        );
      }

      // Filtrar por fazenda se especificado
      if (filtros.fazenda) {
        talhoesParaProcessar = talhoesParaProcessar.filter(t => 
          t.id_propriedade === filtros.fazenda
        );
      }

      // Criar mapa de talhões para lookup rápido
      let totalArea = 0;
      for (const t of talhoesParaProcessar) {
        totalArea += (t.area || 0);
      }

      // 2. Calcular período de filtro
      let dataInicio: Date | null = null;
      let dataFim: Date | null = null;

      // Filtro por mês específico
      if (filtros.mesAno) {
        const [ano, mes] = filtros.mesAno.split('-').map(Number);
        const dataRef = new Date(ano, mes - 1, 1);
        dataInicio = startOfMonth(dataRef);
        dataFim = endOfMonth(dataRef);
      }
      // Filtro por safra
      else if (filtros.safra) {
        const periodo = this.calcularPeriodoSafra(filtros.safra);
        dataInicio = periodo.inicio;
        dataFim = periodo.fim;
      }
      // Default: safra atual
      else {
        const hoje = new Date();
        const anoAtual = hoje.getMonth() >= 4 ? hoje.getFullYear() : hoje.getFullYear() - 1;
        const safraAtual = `${anoAtual}/${anoAtual + 1}`;
        const periodo = this.calcularPeriodoSafra(safraAtual);
        dataInicio = periodo.inicio;
        dataFim = periodo.fim;
      }

      // 3. Buscar custos de insumos das atividades agrícolas por talhão
      const custosInsumosPorTalhao = await getCustosInsumosPorTalhao(userId, dataInicio, dataFim);

      // 4. Buscar transações financeiras do período com vínculos de talhões
      let query = supabase
        .from('transacoes_financeiras')
        .select(`
          id_transacao, 
          valor, 
          categoria, 
          descricao, 
          data_agendamento_pagamento, 
          tipo_transacao, 
          status,
          transacoes_talhoes(
            id_talhao
          )
        `)
        .eq('user_id', userId)
        .eq('tipo_transacao', 'GASTO')
        .eq('status', 'Pago');

      if (dataInicio) {
        query = query.gte('data_agendamento_pagamento', format(dataInicio, 'yyyy-MM-dd'));
      }
      if (dataFim) {
        query = query.lte('data_agendamento_pagamento', format(dataFim, 'yyyy-MM-dd') + 'T23:59:59');
      }

      const { data: transacoes, error } = await query;

      if (error) {
        throw error;
      }



      // 5. Inicializar resultado com todos os talhões
      const resultado: Record<string, CustoTalhao> = {};
      for (const t of talhoesParaProcessar) {
        resultado[t.id_talhao] = {
          id: t.id_talhao,
          talhao: t.nome,
          area: t.area || 0,
          insumos: 0,
          operacional: 0,
          servicosLogistica: 0,
          administrativos: 0,
          outros: 0,
          total: 0,
          custoHa: 0
        };
      }

      // 6. Atribuir custos de insumos específicos a cada talhão
      for (const talhaoId of Object.keys(custosInsumosPorTalhao)) {
        if (resultado[talhaoId]) {
          resultado[talhaoId].insumos = custosInsumosPorTalhao[talhaoId];
        }
      }

      // Acumuladores para custos sem vínculo específico (exceto insumos que vem do estoque)
      const semVinculo: Record<keyof typeof MACRO_CATEGORIAS, number> = {
        insumos: 0,
        operacional: 0,
        servicosLogistica: 0,
        administrativos: 0,
        outros: 0
      };

      // 7. Processar cada transação financeira (exceto insumos que já vem do estoque)
      let contadorVinculadas = 0;
      let contadorSemVinculo = 0;
      let contadorPuladas = 0;
      
      for (const tr of (transacoes || [])) {
        const valor = typeof tr.valor === 'string' ? parseFloat(tr.valor) : (tr.valor || 0);
        const valorAbs = Math.abs(valor);

        // Identificar macrogrupo
        const macrogrupo = this.identificarMacrogrupo(tr.categoria || '', tr.descricao || '');
        
        if (!macrogrupo) {
          contadorPuladas++;
          continue;
        }

        // Pular insumos - eles são calculados a partir das movimentações de estoque
        if (macrogrupo === 'insumos') {
          contadorPuladas++;
          continue;
        }

        // Filtrar por macrogrupo se especificado
        if (filtros.macrogrupo && filtros.macrogrupo !== 'Todos' && filtros.macrogrupo !== macrogrupo) {
          contadorPuladas++;
          continue;
        }

        // Verificar vínculo com talhão usando transacoes_talhoes
        const talhoesVinculados = (tr as any).transacoes_talhoes || [];
        const talhaoIds = talhoesVinculados.map((t: any) => t.id_talhao).filter(Boolean);

        if (talhaoIds.length > 0) {
          // Dividir valor entre os talhões vinculados
          const valorPorTalhao = valorAbs / talhaoIds.length;
          
          for (const talhaoId of talhaoIds) {
            if (resultado[talhaoId]) {
              resultado[talhaoId][macrogrupo] += valorPorTalhao;
              contadorVinculadas++;
            }
          }
        } else {
          // Acumular para distribuição proporcional
          semVinculo[macrogrupo] += valorAbs;
          contadorSemVinculo++;
        }
      }


      // 8. Distribuir custos sem vínculo proporcionalmente pela área (exceto insumos)
      if (totalArea > 0) {
        for (const grupo of Object.keys(semVinculo) as Array<keyof typeof semVinculo>) {
          // Pular insumos - já foram distribuídos a partir do estoque
          if (grupo === 'insumos') continue;
          
          const totalGrupo = semVinculo[grupo];
          if (totalGrupo <= 0) continue;

          for (const id of Object.keys(resultado)) {
            const talhao = resultado[id];
            const proporcao = talhao.area / totalArea;
            talhao[grupo] += totalGrupo * proporcao;
          }
        }
      }

      // 9. Calcular totais e custo/ha
      const resultadoFinal = Object.values(resultado).map(t => {
        const total = t.insumos + t.operacional + t.servicosLogistica + t.administrativos + t.outros;
        return {
          ...t,
          total,
          custoHa: t.area > 0 ? total / t.area : 0
        };
      });
      
      return resultadoFinal;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca detalhes de custos de um talhão específico
   * Usa EXATAMENTE a mesma lógica de getCustosInsumosPorTalhao
   */
  static async getDetalhesCustoTalhao(
    userId: string,
    talhaoId: string,
    filtros: FiltrosCustoPorTalhao
  ): Promise<DetalheCusto[]> {
    try {
      const detalhes: DetalheCusto[] = [];

      // Calcular período de filtro
      let dataInicio: Date | null = null;
      let dataFim: Date | null = null;

      if (filtros.mesAno) {
        const [ano, mes] = filtros.mesAno.split('-').map(Number);
        const dataRef = new Date(ano, mes - 1, 1);
        dataInicio = startOfMonth(dataRef);
        dataFim = endOfMonth(dataRef);
      } else if (filtros.safra) {
        const periodo = this.calcularPeriodoSafra(filtros.safra);
        dataInicio = periodo.inicio;
        dataFim = periodo.fim;
      } else {
        const hoje = new Date();
        const anoAtual = hoje.getMonth() >= 4 ? hoje.getFullYear() : hoje.getFullYear() - 1;
        const safraAtual = `${anoAtual}/${anoAtual + 1}`;
        const periodo = this.calcularPeriodoSafra(safraAtual);
        dataInicio = periodo.inicio;
        dataFim = periodo.fim;
      }

      // 1. Buscar TODAS as atividades agrícolas no período
      let queryAtividades = supabase
        .from('lancamentos_agricolas')
        .select('atividade_id, nome_atividade, data_atividade')
        .eq('user_id', userId);

      if (dataInicio) {
        queryAtividades = queryAtividades.gte('data_atividade', format(dataInicio, 'yyyy-MM-dd'));
      }
      if (dataFim) {
        queryAtividades = queryAtividades.lte('data_atividade', format(dataFim, 'yyyy-MM-dd'));
      }

      const { data: atividades } = await queryAtividades;

      // Mesmo sem atividades, continuar para buscar transações financeiras
      const atividadesParaProcessar = atividades || [];
      const atividadeIds = atividadesParaProcessar.map(a => a.atividade_id);

      // 2. Buscar produtos das atividades
      let produtos: any[] = [];
      let talhoes: any[] = [];
      
      if (atividadeIds.length > 0) {
        const { data: produtosData } = await supabase
          .from('lancamento_produtos')
          .select('atividade_id, produto_id, quantidade_val, quantidade_un, custo_total_item, nome_produto')
          .in('atividade_id', atividadeIds)
          .not('produto_id', 'is', null);
        
        produtos = produtosData || [];

        // 3. Buscar talhões vinculados às atividades
        const { data: talhoesData } = await supabase
          .from('lancamento_talhoes')
          .select('atividade_id, talhao_id')
          .in('atividade_id', atividadeIds);
        
        talhoes = talhoesData || [];
      }

      // Criar mapa atividade_id -> talhao_ids[]
      const atividadeTalhoesMap = new Map<string, string[]>();
      (talhoes || []).forEach(t => {
        if (!atividadeTalhoesMap.has(t.atividade_id)) {
          atividadeTalhoesMap.set(t.atividade_id, []);
        }
        atividadeTalhoesMap.get(t.atividade_id)!.push(t.talhao_id);
      });

      // 4. Buscar talhões non-default para saber quais são elegíveis
      const talhoesNonDefault = await TalhaoService.getTalhoesNonDefault(userId, { onlyActive: true });
      const talhoesElegiveis = (talhoesNonDefault || []).filter(t => t && !t.talhao_default && (t.area || 0) > 0);
      
      const talhoesElegivelMap = new Map<string, { id: string; nome: string; area: number }>();
      let totalAreaElegivel = 0;
      
      talhoesElegiveis.forEach(t => {
        talhoesElegivelMap.set(t.id_talhao, {
          id: t.id_talhao,
          nome: t.nome,
          area: t.area || 0
        });
        totalAreaElegivel += (t.area || 0);
      });

      // Calcular proporção deste talhão específico
      const talhaoInfo = talhoesElegivelMap.get(talhaoId);
      const areaTalhao = talhaoInfo?.area || 0;
      const proporcaoTalhao = totalAreaElegivel > 0 ? areaTalhao / totalAreaElegivel : 0;

      // Criar mapa atividade_id -> atividade
      const atividadeMap = new Map<string, any>();
      atividadesParaProcessar.forEach(a => atividadeMap.set(a.atividade_id, a));

      // 5. Processar produtos (MESMA LÓGICA do getCustosInsumosPorTalhao)
      (produtos || []).forEach(produto => {
        const talhoesAtividade = atividadeTalhoesMap.get(produto.atividade_id) || [];
        const atividade = atividadeMap.get(produto.atividade_id);

        if (!atividade) return;

        // Calcular custo (mesma escala)
        const custoTotal = (typeof produto.custo_total_item === 'string'
          ? parseFloat(produto.custo_total_item)
          : (produto.custo_total_item || 0)) / 1000000000;

        if (custoTotal <= 0) return;

        const quantidade = typeof produto.quantidade_val === 'string'
          ? parseFloat(produto.quantidade_val)
          : (produto.quantidade_val || 0);

        // Verificar se tem talhões non-default vinculados
        const talhoesValidos = talhoesAtividade.filter(tid => talhoesElegivelMap.has(tid));

        if (talhoesValidos.length > 0) {
          // Caso 1: Tem talhões non-default vinculados - verifica se o nosso talhão está incluído
          if (talhoesValidos.includes(talhaoId)) {
            const custoPorTalhao = custoTotal / talhoesValidos.length;
            
            detalhes.push({
              data: format(parseISO(atividade.data_atividade), 'dd/MM/yyyy', { locale: ptBR }),
              categoria: 'Insumos',
              descricao: `${atividade.nome_atividade} - ${produto.nome_produto || 'Produto'} (${quantidade} ${produto.quantidade_un || 'un'})`,
              origem: 'Atividade Agrícola',
              valor: custoPorTalhao,
              macrogrupo: 'insumos'
            });
          }
        } else {
          // Caso 2: Sem talhões non-default vinculados - distribuir proporcionalmente
          if (proporcaoTalhao > 0) {
            const valorProporcional = custoTotal * proporcaoTalhao;
            
            if (valorProporcional > 0) {
              detalhes.push({
                data: format(parseISO(atividade.data_atividade), 'dd/MM/yyyy', { locale: ptBR }),
                categoria: 'Insumos',
                descricao: `${atividade.nome_atividade} - ${produto.nome_produto || 'Produto'} (${quantidade} ${produto.quantidade_un || 'un'}) - ${(proporcaoTalhao * 100).toFixed(2)}% da área`,
                origem: 'Atividade Agrícola',
                valor: valorProporcional,
                macrogrupo: 'insumos'
              });
            }
          }
        }
      });

      // 6. Buscar saídas de estoque
      let queryEstoque = supabase
        .from('estoque_de_produtos')
        .select('valor_total, tipo_de_movimentacao, created_at, nome_do_produto')
        .eq('user_id', userId)
        .eq('tipo_de_movimentacao', 'saida');

      if (dataInicio) {
        queryEstoque = queryEstoque.gte('created_at', format(dataInicio, 'yyyy-MM-dd'));
      }
      if (dataFim) {
        queryEstoque = queryEstoque.lte('created_at', format(dataFim, 'yyyy-MM-dd') + 'T23:59:59');
      }

      const { data: saidasEstoque } = await queryEstoque;

      // 7. Adicionar saídas de estoque proporcionalmente
      if (proporcaoTalhao > 0 && saidasEstoque && saidasEstoque.length > 0) {
        saidasEstoque.forEach((saida: any) => {
          const valorTotal = typeof saida.valor_total === 'string'
            ? parseFloat(saida.valor_total)
            : (saida.valor_total || 0);

          const valorProporcional = Math.abs(valorTotal) * proporcaoTalhao;

          if (valorProporcional > 0) {
            detalhes.push({
              data: format(parseISO(saida.created_at), 'dd/MM/yyyy', { locale: ptBR }),
              categoria: 'Insumos',
              descricao: `Saída de Estoque - ${saida.nome_do_produto || 'Produto'} (${(proporcaoTalhao * 100).toFixed(2)}% da área)`,
              origem: 'Estoque',
              valor: valorProporcional,
              macrogrupo: 'insumos'
            });
          }
        });
      }

      // 8. Adicionar DETALHES de Operacional a partir de transações financeiras
      let queryFinanceiro = supabase
        .from('transacoes_financeiras')
        .select(`
          id_transacao, 
          valor, 
          categoria, 
          descricao, 
          data_agendamento_pagamento, 
          tipo_transacao, 
          status,
          transacoes_talhoes(
            id_talhao
          )
        `)
        .eq('user_id', userId)
        .eq('tipo_transacao', 'GASTO')
        .eq('status', 'Pago');

      if (dataInicio) {
        queryFinanceiro = queryFinanceiro.gte('data_agendamento_pagamento', format(dataInicio, 'yyyy-MM-dd'));
      }
      if (dataFim) {
        queryFinanceiro = queryFinanceiro.lte('data_agendamento_pagamento', format(dataFim, 'yyyy-MM-dd') + 'T23:59:59');
      }

      const { data: transacoes } = await queryFinanceiro;

      // Total de área para proporcional
      const totalAreaElegivelOper = talhoesElegiveis.reduce((acc, t) => acc + (t.area || 0), 0);
      const talhaoInfoOper = talhoesElegiveis.find(t => t.id_talhao === talhaoId);
      const proporcaoTalhaoOper = totalAreaElegivelOper > 0 ? ((talhaoInfoOper?.area || 0) / totalAreaElegivelOper) : 0;

      // Mapear nome do macrogrupo para label de exibição
      const macroLabels: Record<string, string> = {
        operacional: 'Operacional',
        servicosLogistica: 'Serviços/Logística',
        administrativos: 'Administrativos',
        outros: 'Outros'
      };

      (transacoes || []).forEach(tr => {
        const valor = typeof tr.valor === 'string' ? parseFloat(tr.valor) : (tr.valor || 0);
        const valorAbs = Math.abs(valor);
        if (valorAbs <= 0) return;

        // Verificar classificação de cada transação
        const macroClassificado = this.identificarMacrogrupo(tr.categoria || '', tr.descricao || '');
        
        // Pular insumos (já calculados separadamente) e transações não classificadas
        if (!macroClassificado || macroClassificado === 'insumos') {
          return;
        }

        const labelCategoria = macroLabels[macroClassificado] || macroClassificado;

        // Verificar vínculo com talhão usando transacoes_talhoes
        const talhoesVinculados = (tr as any).transacoes_talhoes || [];
        const talhaoIdsVinculados = talhoesVinculados.map((t: any) => t.id_talhao).filter(Boolean);

        if (talhaoIdsVinculados.includes(talhaoId)) {
          // Transação vinculada diretamente a este talhão
          const valorPorTalhao = talhaoIdsVinculados.length > 1 ? valorAbs / talhaoIdsVinculados.length : valorAbs;
          
          detalhes.push({
            data: format(parseISO(tr.data_agendamento_pagamento), 'dd/MM/yyyy', { locale: ptBR }),
            categoria: labelCategoria,
            descricao: tr.descricao || tr.categoria || labelCategoria,
            origem: 'Financeiro',
            valor: valorPorTalhao,
            macrogrupo: macroClassificado
          });
        } else if (talhaoIdsVinculados.length === 0 && proporcaoTalhaoOper > 0) {
          // Sem vínculo específico: distribuir proporcionalmente
          const valorProp = valorAbs * proporcaoTalhaoOper;
          if (valorProp > 0) {
            detalhes.push({
              data: format(parseISO(tr.data_agendamento_pagamento), 'dd/MM/yyyy', { locale: ptBR }),
              categoria: labelCategoria,
              descricao: `${tr.descricao || tr.categoria || labelCategoria} - ${(proporcaoTalhaoOper * 100).toFixed(2)}% da área`,
              origem: 'Financeiro',
              valor: valorProp,
              macrogrupo: macroClassificado
            });
          }
        }
      });

      // Ordenar por data (mais recente primeiro)
      return detalhes.sort((a, b) => {
        const [diaA, mesA, anoA] = a.data.split('/').map(Number);
        const [diaB, mesB, anoB] = b.data.split('/').map(Number);
        const dataA = new Date(anoA, mesA - 1, diaA);
        const dataB = new Date(anoB, mesB - 1, diaB);
        return dataB.getTime() - dataA.getTime();
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca pendências relacionadas a custos
   */
  static async getPendencias(_userId: string): Promise<Pendencia[]> {
    try {
      // TODO: Implementar lógica de busca de pendências
      // Verificar notas fiscais sem detalhes, consumos sem estoque, etc.
      
      return [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calcula indicadores agregados
   */
  static async getIndicadores(
    _userId: string,
    _filtros: FiltrosCustoPorTalhao
  ): Promise<{
    totalCustos: number;
    custoMedioHa: number;
    totalPendencias: number;
    distribuicaoMacrogrupos: Record<string, number>;
  }> {
    try {
      // TODO: Implementar cálculo de indicadores
      
      return {
        totalCustos: 0,
        custoMedioHa: 0,
        totalPendencias: 0,
        distribuicaoMacrogrupos: {}
      };
    } catch (error) {
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
    } catch {
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
    } catch {
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
    } catch {
      return [];
    }
  }

  /**
   * Agrupa e retorna valores de insumos por talhão para um dia específico.
   * - Filtra transações do tipo GASTO e status Pago com data_agendamento_pagamento = data
   * - Identifica insumos por categoria OU por keywords na descrição
   * - Quando `area_vinculada` contém o nome do talhão, atribui ao talhão
   * - Quando sem vínculo, distribui proporcionalmente pela área dos talhões non-default
   */
  static async getInsumosPorTalhao(
    userId: string,
    dataAgendamento: string
  ): Promise<Record<string, { id: string; nome: string; area: number; insumos: number; operacional: number; servicosLogistica: number; administrativos: number; outros: number; receita: number }>> {
    try {
      // Carrega talhões non-default e ativos do usuário, filtrando area>0 e talhao_default=false
      const talhoes = await TalhaoService.getTalhoesNonDefault(userId, { onlyActive: true });
      const eligibleTalhoes = (talhoes || []).filter(t => t && !t.talhao_default && (t.area || 0) > 0);

      // helper: normaliza strings removendo acentos, caracteres extras e espaços
      const normalize = (input: string) => {
        if (!input) return '';
        try {
          return input
            .toString()
            .normalize('NFD')
            .replace(/[ -\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s-]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        } catch (e) {
          return input.toString().trim().toLowerCase();
        }
      };

      // mapa nome normalizado -> talhão
      const nameMap = new Map<string, typeof eligibleTalhoes[0]>();
      const talhaoNames: string[] = []; // Lista de nomes normalizados para busca flexível
      let totalArea = 0;
      for (const t of eligibleTalhoes) {
        const nameKey = normalize(t.nome || '');
        nameMap.set(nameKey, t);
        talhaoNames.push(nameKey);
        totalArea += (t.area || 0);
      }

      /**
       * Busca o talhão correspondente ao area_vinculada
       * Tenta match exato primeiro, depois busca se contém o nome do talhão
       */
      const findTalhaoByAreaVinculada = (areaVinculada: string): typeof eligibleTalhoes[0] | null => {
        if (!areaVinculada) return null;
        
        const areaKey = normalize(areaVinculada);
        
        // 1. Match exato
        if (nameMap.has(areaKey)) {
          return nameMap.get(areaKey)!;
        }
        
        // 2. Busca se area_vinculada contém algum nome de talhão
        for (const talhaoName of talhaoNames) {
          if (areaKey.includes(talhaoName) || talhaoName.includes(areaKey)) {
            return nameMap.get(talhaoName)!;
          }
        }
        
        return null;
      };

      // Macrogrupos: categorias do banco de dados e keywords
      const macroCategorias = {
        insumos: [
          // Coluna 'insumos' será zerada - não busca de transacoes_financeiras
        ],
        operacional: [
          'Máquinas e Equipamentos',
          'Irrigação',
          'Aluguel de Máquinas',
          'Mão de obra',
          'Manutenção e Instalações'
        ],
        servicosLogistica: [
          'Transporte',
          'Beneficiamento',
          'Despesas de armazenagem',
          'Classificação',
          'Assistência Técnica',
          'Serviços Diversos',
          'Análise de Solo'
        ],
        administrativos: [
          'Despesas Administrativas',
          'Despesas Gerais',
          'Encargos Sociais',
          'Arrendamento',
          'Seguro',
          'Gestão/Administração'
        ],
        outros: [
          'Outros',
          'Venda'
        ],
        receita: [
          'Receita'
        ]
      } as const;

      const keywords = {
        insumos: [], // Coluna 'insumos' será zerada - não busca de transacoes_financeiras
        operacional: ['diesel', 'gasolina', 'combustivel', 'combustível', 'manutenc', 'manutenção', 'repar', 'mao de obra', 'mão de obra', 'salario', 'salário', 'trator', 'colheita', 'irrigação', 'mourão', 'mourao', 'cerca', 'instalação', 'instalacao'],
        servicosLogistica: ['transporte', 'frete', 'beneficiament', 'armazen', 'classifica', 'assistência', 'assistencia', 'analise de solo', 'análise de solo'],
        administrativos: ['administrativ', 'encargo', 'arrend', 'seguro', 'imposto', 'taxa', 'gestao', 'gestão', 'administracao', 'administração'],
        outros: ['outro', 'venda'],
        receita: ['receita']
      } as const;

      // Consulta transações até o final do dia (inclusive)
      // dataAgendamento é esperado no formato 'YYYY-MM-DD'
      const endOfDay = `${dataAgendamento}T23:59:59`;
      const { data: transacoes, error } = await supabase
        .from('transacoes_financeiras')
        .select('id_transacao, valor, categoria, descricao, area_vinculada, data_agendamento_pagamento, tipo_transacao, status')
        .eq('user_id', userId)
        .eq('tipo_transacao', 'GASTO')
        .eq('status', 'Pago')
        .lte('data_agendamento_pagamento', endOfDay);

      if (error) {
        throw error;
      }

      // inicializa resultado com talhões elegíveis e todos os macrogrupos
      const result: Record<string, { id: string; nome: string; area: number; insumos: number; operacional: number; servicosLogistica: number; administrativos: number; outros: number; receita: number }> = {};
      for (const t of eligibleTalhoes) {
        result[t.id_talhao] = {
          id: t.id_talhao,
          nome: t.nome,
          area: t.area || 0,
          insumos: 0,
          operacional: 0,
          servicosLogistica: 0,
          administrativos: 0,
          outros: 0,
          receita: 0
        };
      }

      // acumuladores para itens sem vínculo por macrogrupo
      const semVinculo: Record<string, number> = {
        insumos: 0,
        operacional: 0,
        servicosLogistica: 0,
        administrativos: 0,
        outros: 0,
        receita: 0
      };

      for (const tr of (transacoes || [])) {
        const valor = typeof tr.valor === 'string' ? parseFloat(tr.valor) : (tr.valor || 0);
        const valorAbs = Math.abs(valor || 0);

        // identificar macrogrupo por categoria ou descricao
        const categoria = (tr.categoria || '') as string;
        const descricaoRaw = (tr.descricao || '').toString();
        const descricao = normalize(descricaoRaw);

        // detect by exact category (case-insensitive) first
        const catLower = (categoria || '').toString().toLowerCase();
        let matchedGroup: keyof typeof semVinculo | null = null;
        for (const g of Object.keys(macroCategorias) as Array<keyof typeof macroCategorias>) {
          const cats = (macroCategorias as any)[g] as string[];
          if (cats.some(c => c.toLowerCase() === catLower)) {
            matchedGroup = g as keyof typeof semVinculo;
            break;
          }
        }

        // if not matched by category, try keywords in description
        if (!matchedGroup) {
          for (const g of Object.keys(keywords) as Array<keyof typeof keywords>) {
            const kws = (keywords as any)[g] as string[];
            if (kws.some(k => descricao.includes(k))) {
              matchedGroup = g as keyof typeof semVinculo;
              break;
            }
          }
        }

        if (!matchedGroup) {
          continue;
        }

        const areaVinc = (tr.area_vinculada || '').toString().trim();
        const talhaoVinculado = findTalhaoByAreaVinculada(areaVinc);

        if (talhaoVinculado) {
          // atribui todo o valor ao talhão vinculado
          if (!result[talhaoVinculado.id_talhao]) {
            result[talhaoVinculado.id_talhao] = {
              id: talhaoVinculado.id_talhao,
              nome: talhaoVinculado.nome,
              area: talhaoVinculado.area || 0,
              insumos: 0,
              operacional: 0,
              servicosLogistica: 0,
              administrativos: 0,
              outros: 0,
              receita: 0
            };
          }
          // acumula no grupo identificado
          (result[talhaoVinculado.id_talhao] as any)[matchedGroup] += valorAbs;
        } else {
          // sem vínculo detectável — acumula para distribuir depois por grupo
          semVinculo[matchedGroup] += valorAbs;
        }
      }

      // distribuir semVinculo proporcionalmente pela area por grupo
      if (totalArea > 0) {
        for (const groupKey of Object.keys(semVinculo)) {
          const totalForGroup = semVinculo[groupKey] || 0;
          if (totalForGroup <= 0) continue;
          for (const id of Object.keys(result)) {
            const tal = result[id];
            const share = (tal.area / totalArea) * totalForGroup;
            (tal as any)[groupKey] += share;
          }
        }
      }

      return result;
    } catch (error) {
      throw error;
    }
  }
}
