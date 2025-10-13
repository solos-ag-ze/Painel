import { supabase, TransacaoFinanceira } from '../lib/supabase';
import { startOfMonth, endOfMonth, format, parseISO, subMonths, startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateBR } from '../lib/dateUtils';


export interface ResumoFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
  saldoLiquido: number;
  transacoesCount: number;
}

export interface DadosGrafico {
  mes: string;
  receitas: number;
  despesas: number;
}

interface ResumoMensalFinanceiro {
  totalReceitas: number;
  totalDespesas: number;
}

export interface OverallBalance {
  totalBalance: number;
  totalReceitas: number;
  totalDespesas: number;
  totalTransactions: number;
}

export interface ConsolidatedBalance {
  saldoReal: number;      // Saldo de transações já processadas
  saldoProjetado: number;      // Saldo incluindo transações futuras
  impactoFuturo7Dias: number;  // Impacto das transações dos próximos 7 dias
  impactoFuturo30Dias: number; // Impacto das transações dos próximos 30 dias
  totalTransacoesReais: number;
  totalTransacoesFuturas: number;
}

export interface PeriodBalance {
  totalEntradas: number;
  totalSaidas: number;
  saldoReal: number;
  saldoProjetado?: number;
  impactoFuturo7Dias?: number;
  impactoFuturo30Dias?: number;
  transacoesRealizadas: number;
  transacoesFuturas: number;
}

export type FilterPeriod = 
  | 'ultimos-7-dias'
  | 'ultimos-30-dias' 
  | 'mes-atual'
  | 'safra-atual'
  | 'proximos-7-dias'
  | 'proximos-30-dias'
  | 'personalizado'
  | 'todos';

export class FinanceService {
  static async getResumoFinanceiro(userId: string): Promise<ResumoFinanceiro> {
    try {
      const agora = new Date();
      const inicioMes = startOfMonth(agora);
      const fimMes = endOfMonth(agora);

      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('tipo_transacao, valor')
        .eq('user_id', userId)
        .gte('data_agendamento_pagamento', format(inicioMes, 'yyyy-MM-dd'))
        .lte('data_agendamento_pagamento', format(fimMes, 'yyyy-MM-dd'));

      if (error) {
        console.error('Erro ao buscar resumo financeiro:', error);
        return { totalReceitas: 0, totalDespesas: 0, saldoLiquido: 0, transacoesCount: 0 };
      }

      if (!data || data.length === 0) {
        return { totalReceitas: 0, totalDespesas: 0, saldoLiquido: 0, transacoesCount: 0 };
      }

      const receitas = data
        .filter(item => Number(item.valor) > 0)
        .reduce((acc, item) => acc + Number(item.valor), 0);

      const despesas = data
        .filter(item => Number(item.valor) < 0)
        .reduce((acc, item) => acc + Math.abs(Number(item.valor)), 0);

      return {
        totalReceitas: receitas,
        totalDespesas: despesas,
        saldoLiquido: receitas - despesas,
        transacoesCount: data.length
      };
    } catch (error) {
      console.error('Erro no serviço financeiro:', error);
      return { totalReceitas: 0, totalDespesas: 0, saldoLiquido: 0, transacoesCount: 0 };
    }
  }

  static async getOverallBalance(userId: string): Promise<OverallBalance> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('tipo_transacao, valor')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar saldo geral:', error);
        return { totalBalance: 0, totalReceitas: 0, totalDespesas: 0, totalTransactions: 0 };
      }

      if (!data || data.length === 0) {
        return { totalBalance: 0, totalReceitas: 0, totalDespesas: 0, totalTransactions: 0 };
      }

      const receitas = data
        .filter(item => Number(item.valor) > 0)
        .reduce((acc, item) => acc + Number(item.valor), 0);

      const despesas = data
        .filter(item => Number(item.valor) < 0)
        .reduce((acc, item) => acc + Math.abs(Number(item.valor)), 0);

      return {
        totalBalance: receitas - despesas,
        totalReceitas: receitas,
        totalDespesas: despesas,
        totalTransactions: data.length
      };
    } catch (error) {
      console.error('Erro ao calcular saldo geral:', error);
      return { totalBalance: 0, totalReceitas: 0, totalDespesas: 0, totalTransactions: 0 };
    }
  }

  static async getLancamentos(userId: string, limit: number = 10): Promise<TransacaoFinanceira[]> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('user_id', userId)
        .order('data_agendamento_pagamento', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar lançamentos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro no serviço financeiro:', error);
      return [];
    }
  }

  static async getDadosGrafico(userId: string): Promise<DadosGrafico[]> {
    try {
      console.log('🔍 INICIANDO getDadosGrafico para userId:', userId);
      
      const agora = new Date();
      const dataInicio = new Date(agora);
      dataInicio.setMonth(dataInicio.getMonth() - 5);
      dataInicio.setDate(1);
      
      console.log('📅 Período do gráfico:', {
        inicio: dataInicio.toISOString(),
        fim: agora.toISOString()
      });

      // 🔍 CORREÇÃO: Buscar TODAS as transações com tipo_transacao para identificar RECEITA vs GASTO
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('valor, data_agendamento_pagamento, descricao, tipo_transacao')
        .eq('user_id', userId)
        .gte('data_agendamento_pagamento', format(dataInicio, 'yyyy-MM-dd'))
        .order('data_agendamento_pagamento', { ascending: true });

      console.log('📊 Dados brutos da consulta:', {
        totalTransacoes: data?.length || 0,
        erro: error,
        primeiras5: data?.slice(0, 5).map(t => ({
          descricao: t.descricao,
          valor: t.valor,
          tipo_transacao: t.tipo_transacao,
          data: t.data_agendamento_pagamento
        }))
      });

      if (error) {
        console.error('Erro ao buscar dados do gráfico:', error);
        return [];
      }

      if (!data || data.length === 0) {
        const mesesVazios = [];
        for (let i = 5; i >= 0; i--) {
          const mes = subMonths(agora, i);
          mesesVazios.push({
            mes: format(mes, 'MMM/yy', { locale: ptBR }),
            receitas: 0,
            despesas: 0
          });
        }
        return mesesVazios;
      }

      console.log('📈 Processando transações para o gráfico...');
      const dadosPorMes: { [key: string]: { receitas: number; despesas: number; mesFormatado?: string } } = {};

      // 🔍 CORREÇÃO: Processar cada transação usando tipo_transacao em vez de sinal do valor
      data.forEach(item => {
  if (!item.data_agendamento_pagamento) return;

  try {
    const dataTransacao = parseISO(item.data_agendamento_pagamento);
    const mes = format(dataTransacao, 'yyyy-MM');
    const mesFormatado = format(dataTransacao, 'MMM/yy', { locale: ptBR });

    if (!dadosPorMes[mes]) {
      dadosPorMes[mes] = { receitas: 0, despesas: 0, mesFormatado };
    }

    const valorOriginal = Number(item.valor) || 0;
    const valorAbsoluto = Math.abs(valorOriginal);
    const tipoTransacao = item.tipo_transacao?.toUpperCase();

    // 💡 LÓGICA CORRIGIDA AQUI!
    // Prioriza o tipo_transacao, mas usa o sinal do valor como fallback.
    if (tipoTransacao === 'RECEITA' || (!tipoTransacao && valorOriginal > 0)) {
      // Se for RECEITA ou se não tiver tipo e o valor for positivo
      dadosPorMes[mes].receitas += valorAbsoluto;
      
      console.log('✅ RECEITA adicionada (Lógica Robusta):', {
        valor: valorAbsoluto,
        totalReceitasMes: dadosPorMes[mes].receitas,
        mes: mesFormatado,
        descricao: item.descricao,
        motivo: tipoTransacao ? 'Via tipo_transacao' : 'Via valor > 0'
      });

    } else if (tipoTransacao === 'GASTO' || (!tipoTransacao && valorOriginal < 0)) {
      // Se for GASTO ou se não tiver tipo e o valor for negativo
      dadosPorMes[mes].despesas += valorAbsoluto;

      console.log('❌ DESPESA adicionada (Lógica Robusta):', {
        valor: valorAbsoluto,
        totalDespesasMes: dadosPorMes[mes].despesas,
        mes: mesFormatado,
        descricao: item.descricao,
        motivo: tipoTransacao ? 'Via tipo_transacao' : 'Via valor < 0'
      });
      
    } else {
      // Transações com valor 0 ou tipo não identificado serão logadas aqui
      console.log('⚠️ TRANSAÇÃO IGNORADA:', {
        valorOriginal: valorOriginal,
        tipoTransacao: tipoTransacao,
        descricao: item.descricao,
        mes: mesFormatado
      });
    }

  } catch (dateError) {
    console.error('Erro ao processar data:', dateError, item.data_agendamento_pagamento);
  }
});


      // Garantir que todos os últimos 6 meses apareçam no gráfico
      for (let i = 5; i >= 0; i--) {
        const mes = subMonths(agora, i);
        const mesKey = format(mes, 'yyyy-MM');
        const mesFormatado = format(mes, 'MMM/yy', { locale: ptBR });
        
        if (!dadosPorMes[mesKey]) {
          dadosPorMes[mesKey] = { receitas: 0, despesas: 0, mesFormatado };
        }
      }

      const resultado: DadosGrafico[] = [];
    
    // Itera pelos últimos 6 meses a partir de hoje, garantindo a ordem correta.
    for (let i = 5; i >= 0; i--) {
      const mesReferencia = subMonths(agora, i);
      const mesKey = format(mesReferencia, 'yyyy-MM'); // Ex: '2025-09'
      const mesFormatado = format(mesReferencia, 'MMM/yy', { locale: ptBR }); // Ex: 'set/25'

      // Pega os dados já processados para este mês ou usa zero se não houver transações.
      const dadosDoMes = dadosPorMes[mesKey] || { receitas: 0, despesas: 0 };
      
      resultado.push({
        mes: mesFormatado,
        receitas: dadosDoMes.receitas,
        despesas: dadosDoMes.despesas
      });
    }

    console.log('📊 RESULTADO FINAL CORRIGIDO DO GRÁFICO:', resultado);
    console.log('📈 Resumo por mês (Corrigido):');
    resultado.forEach(mes => {
      console.log(`${mes.mes}: Receitas R$ ${mes.receitas.toLocaleString()} | Despesas R$ ${mes.despesas.toLocaleString()}`);
    });
      
      // VALIDAÇÃO FINAL: Verificar se há receitas nos dados
      const totalReceitas = resultado.reduce((acc, mes) => acc + mes.receitas, 0);
      const totalDespesas = resultado.reduce((acc, mes) => acc + mes.despesas, 0);
      console.log('🔍 VALIDAÇÃO FINAL:', {
        totalReceitas,
        totalDespesas,
        temReceitas: totalReceitas > 0,
        temDespesas: totalDespesas > 0
      });
      
      return resultado;
    } catch (error) {
      console.error('Erro no serviço financeiro:', error);
      return [];
    }
  }

  static async getLancamentosPorPeriodo(
    userId: string, 
    dataInicio?: Date, 
    dataFim?: Date
  ): Promise<TransacaoFinanceira[]> {
    try {
      let query = supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('user_id', userId);

      if (dataInicio) {
        query = query.gte('data_agendamento_pagamento', dataInicio.toISOString());
      }

      if (dataFim) {
        query = query.lte('data_agendamento_pagamento', dataFim.toISOString());
      }

      const { data, error } = await query.order('data_agendamento_pagamento', { ascending: false });

      if (error) {
        console.error('Erro ao buscar lançamentos por período:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro no serviço financeiro:', error);
      return [];
    }
  }

  static async getLancamentosFuturos(userId: string): Promise<TransacaoFinanceira[]> {
    try {
      const agora = new Date();
      const hoje = format(agora, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'Agendado') // Condição 1: Status deve ser 'Agendado'
        .gt('data_agendamento_pagamento', hoje)    // Condição 2: A data do agendamento deve ser futura
        .order('data_agendamento_pagamento', { ascending: true }); // Ordena pela data de agendamento

      if (error) {
        console.error('Erro ao buscar lançamentos futuros:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Erro crítico no serviço financeiro ao buscar lançamentos futuros:', error);
      return [];
    }
  }

  /**
   * Busca as próximas 5 transações futuras ordenadas por data de pagamento
   * Considera status 'Agendado' e 'Pago' com data_agendamento_pagamento maior que hoje
   */
  static async getProximas5TransacoesFuturas(userId: string): Promise<TransacaoFinanceira[]> {
    try {
      const agora = new Date();
      const hoje = format(agora, 'yyyy-MM-dd HH:mm:ss');

      console.log('🔍 Buscando próximas 5 transações futuras para userId:', userId);
      console.log('📅 Data/hora atual:', hoje);

      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['Agendado', 'Pago'])
        .gt('data_agendamento_pagamento', hoje)
        .order('data_agendamento_pagamento', { ascending: true })
        .limit(5);

      if (error) {
        console.error('❌ Erro ao buscar próximas 5 transações futuras:', error);
        return [];
      }

      console.log('✅ Próximas 5 transações futuras encontradas:', data?.length || 0);

      if (data && data.length > 0) {
        console.log('📊 Detalhes das transações:');
        data.forEach((t, index) => {
          console.log(`  ${index + 1}. ${t.descricao} - ${t.data_agendamento_pagamento} - ${FinanceService.formatCurrency(Number(t.valor))}`);
        });
      }

      return data || [];

    } catch (error) {
      console.error('❌ Erro crítico ao buscar próximas 5 transações futuras:', error);
      return [];
    }
  }

  /**
   * Busca as últimas 5 transações executadas ordenadas por data de registro (lançamento mais recente primeiro)
   * Considera transações com status diferente de 'Agendado' OU com data_agendamento_pagamento menor ou igual a hoje
   */
  static async getUltimas5TransacoesExecutadas(userId: string): Promise<TransacaoFinanceira[]> {
    try {
      const agora = new Date();
      const hoje = format(agora, 'yyyy-MM-dd');

      console.log('🔍 Buscando últimas 5 transações executadas para userId:', userId);
      console.log('📅 Data atual:', hoje);

      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('user_id', userId)
        .or(`status.neq.Agendado,and(status.eq.Agendado,data_agendamento_pagamento.lte.${hoje})`)
        .order('data_registro', { ascending: false })
        .order('data_agendamento_pagamento', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Erro ao buscar últimas 5 transações executadas:', error);
        return [];
      }

      console.log('✅ Últimas 5 transações executadas encontradas:', data?.length || 0);

      if (data && data.length > 0) {
        console.log('📊 Detalhes das transações (ordenadas por data_registro):');
        data.forEach((t, index) => {
          console.log(`  ${index + 1}. ${t.descricao} - Lançado: ${t.data_registro} - Pagamento: ${t.data_agendamento_pagamento} - ${FinanceService.formatCurrency(Number(t.valor))}`);
        });
      }

      return data || [];

    } catch (error) {
      console.error('❌ Erro crítico ao buscar últimas 5 transações executadas:', error);
      return [];
    }
  }


  
  static async getTransactionsByCategory(userId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('valor, categoria')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      // Filtra apenas os valores negativos
      return (data ?? [])
        .map(item => ({ ...item, valor: Number(item.valor) }))
        .filter(item => item.valor < 0); // Mantém só negativos

    } catch (err) {
      console.error('Error in financial service:', err);
      return [];
    }
  }

  static async getSomaTransacoesAteHoje(userId: string): Promise<number> {
  try {
    const hoje = new Date();
    const hojeSemHora = format(hoje, 'yyyy-MM-dd');

  
    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .select('valor, status, data_agendamento_pagamento')
      .eq('user_id', userId)
      .or(`status.neq.Agendado,and(status.eq.Agendado,data_agendamento_pagamento.lte.${hojeSemHora})`);

    if (error) {
      console.error('Erro ao buscar transações até hoje (otimizado):', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }


    const somaTotal = data.reduce((acc, transacao) => {
      const valor = Number(transacao.valor) || 0;
      return acc + valor;
    }, 0);

    console.log(`Soma otimizada de transações até hoje para usuário ${userId}:`, {
      totalTransacoes: data.length,
      somaTotal: this.formatCurrency(somaTotal)
    });

    return somaTotal;

  } catch (error) {
    console.error('Erro ao calcular soma otimizada de transações até hoje:', error);
    return 0;
  }
}


static async getResumoMensalFinanceiro(userId: string): Promise<{ totalReceitas: number; totalDespesas: number }> {
  try {
    const agora = new Date();
    const inicioMes = startOfMonth(agora);
    const hoje = endOfDay(agora); // End of today instead of end of month
    
    console.log('Buscando resumo mensal até hoje:', {
      inicio: format(inicioMes, 'dd/MM/yyyy'),
      ate: format(hoje, 'dd/MM/yyyy'),
      userId
    });

    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .select('tipo_transacao, valor, status, data_agendamento_pagamento')
      .eq('user_id', userId)
      .gte('data_agendamento_pagamento', format(inicioMes, 'yyyy-MM-dd'))
      .lte('data_agendamento_pagamento', format(hoje, 'yyyy-MM-dd'));

    if (error) {
      console.error('Erro ao buscar resumo financeiro mensal:', error);
      return { totalReceitas: 0, totalDespesas: 0 };
    }

    if (!data || data.length === 0) {
      console.log('Nenhuma transação encontrada do início do mês até hoje');
      return { totalReceitas: 0, totalDespesas: 0 };
    }

 
    const transacoesProcessadas = data.filter(transacao => 
      this.isTransacaoProcessada(transacao)
    );

    console.log('Transações encontradas:', {
      total: data.length,
      processadas: transacoesProcessadas.length,
      futuras: data.length - transacoesProcessadas.length
    });

    const receitas = transacoesProcessadas
      .filter(item => Number(item.valor) > 0)
      .reduce((acc, item) => acc + Number(item.valor), 0);


    const despesas = transacoesProcessadas
      .filter(item => Number(item.valor) < 0)
      .reduce((acc, item) => acc + Math.abs(Number(item.valor)), 0);

    console.log('Resumo mensal até hoje calculado:', {
      totalReceitas: this.formatCurrency(receitas),
      totalDespesas: this.formatCurrency(despesas),
      transacoesProcessadas: transacoesProcessadas.length,
      periodo: `${format(inicioMes, 'dd/MM')} até ${format(hoje, 'dd/MM/yyyy')}`
    });

    return {
      totalReceitas: receitas,
      totalDespesas: despesas
    };

  } catch (error) {
    console.error('Erro no serviço financeiro mensal:', error);
    return { totalReceitas: 0, totalDespesas: 0 };
  }
}
  
  /**
   * Calcula saldos consolidados baseados em todas as transações do usuário
   */
  static async getConsolidatedBalance(userId: string): Promise<ConsolidatedBalance> {
    try {
      // Busca todas as transações do usuário
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar transações consolidadas:', error);
        return this.getEmptyConsolidatedBalance();
      }

      if (!data || data.length === 0) {
        return this.getEmptyConsolidatedBalance();
      }

      const hoje = new Date();
      const em7Dias = new Date();
      em7Dias.setDate(hoje.getDate() + 7);
      const em30Dias = new Date();
      em30Dias.setDate(hoje.getDate() + 30);

      // Separa transações em categorias baseadas no status e data
      const transacoesReais = data.filter(t => this.isTransacaoProcessada(t));
      const transacoesFuturas = data.filter(t => this.isTransacaoFutura(t));
      const transacoesFuturas7Dias = transacoesFuturas.filter(t => 
        this.isTransacaoNoPeriodo(t, hoje, em7Dias)
      );
      const transacoesFuturas30Dias = transacoesFuturas.filter(t => 
        this.isTransacaoNoPeriodo(t, hoje, em30Dias)
      );

      // Calcula saldos
      const saldoReal = this.calcularSaldoTransacoes(transacoesReais);
      
      // ✅ NOVA LÓGICA: Calcula entradas e saídas separadamente
      const entradas7Dias = this.calcularEntradas(transacoesFuturas7Dias);
      const saidas7Dias = this.calcularSaidas(transacoesFuturas7Dias);
      const impacto7Dias = entradas7Dias - saidas7Dias;
      
      const entradas30Dias = this.calcularEntradas(transacoesFuturas30Dias);
      const saidas30Dias = this.calcularSaidas(transacoesFuturas30Dias);
      const impacto30Dias = entradas30Dias - saidas30Dias;
      
      const saldoFuturoTotal = this.calcularSaldoTransacoes(transacoesFuturas);

      return {
        saldoReal,
        saldoProjetado: saldoReal + saldoFuturoTotal,
        impactoFuturo7Dias: impacto7Dias,
        impactoFuturo30Dias: impacto30Dias,
        totalTransacoesReais: transacoesReais.length,
        totalTransacoesFuturas: transacoesFuturas.length
      };

    } catch (error) {
      console.error('Erro ao calcular saldos consolidados:', error);
      return this.getEmptyConsolidatedBalance();
    }
  }

  /**
   * Verifica se uma transação já foi processada (não é futura)
   */
  private static isTransacaoProcessada(transacao: TransacaoFinanceira): boolean {
    // Se não tem status de agendado, considera como processada
    if (transacao.status !== 'Agendado') {
      return true;
    }

    // Se tem status agendado mas não tem data de agendamento, considera processada
    if (!transacao.data_agendamento_pagamento) {
      return true;
    }

    // Se tem data de agendamento no passado ou hoje, considera processada
    try {
      const dataAgendamento = parseISO(transacao.data_agendamento_pagamento);
      const hoje = startOfDay(new Date());
      const dataAgendamentoSemHora = startOfDay(dataAgendamento);
      
      return dataAgendamentoSemHora <= hoje;
    } catch {
      //return true; // Se não conseguir parsear a data, considera processada
    }
  }

  /**
   * Verifica se uma transação é futura (agendada para o futuro)
   */
  private static isTransacaoFutura(transacao: TransacaoFinanceira): boolean {
    return !this.isTransacaoProcessada(transacao);
  }

  /**
   * Verifica se uma transação está dentro de um período específico
   */
  private static isTransacaoNoPeriodo(
  transacao: TransacaoFinanceira,  
  dataInicio: Date,  
  dataFim: Date
): boolean {
  if (!transacao.data_agendamento_pagamento) return false;

  try {
    const dataTransacao = new Date(transacao.data_agendamento_pagamento);
    // Verifica se a transação está dentro do período (inclusive)
    return dataTransacao >= dataInicio && dataTransacao <= dataFim;
  } catch {
    return false;
  }
}

  /**
   * Calcula o saldo de uma lista de transações
   */
  private static calcularSaldoTransacoes(transacoes: TransacaoFinanceira[]): number {
    return transacoes.reduce((saldo, transacao) => {
      const valor = Number(transacao.valor) || 0;
      return saldo + valor;
    }, 0);
  }

  /**
   * Retorna um objeto de saldo consolidado vazio
   */
  private static getEmptyConsolidatedBalance(): ConsolidatedBalance {
    return {
      saldoReal: 0,
      saldoProjetado: 0,
      impactoFuturo7Dias: 0,
      impactoFuturo30Dias: 0,
      totalTransacoesReais: 0,
      totalTransacoesFuturas: 0
    };
  }

  /**
   * Calcula saldos para um período específico de forma inteligente.
   */
  static async getPeriodBalance(
    userId: string, 
    filterPeriod: FilterPeriod,
    customStartDate?: Date,
    customEndDate?: Date
  ): Promise<PeriodBalance> {
    try {
      // 1. Busca todas as transações do usuário (eficiente para filtrar na memória)
      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar transações para período:', error);
        return this.getEmptyPeriodBalance();
      }

      if (!data || data.length === 0) {
        return this.getEmptyPeriodBalance();
      }

      // 2. Determina as datas do período e se ele é estritamente futuro
      const { startDate, endDate, includeFuture } = this.getPeriodDates(
        filterPeriod, 
        customStartDate, 
        customEndDate
      );
      
      // 💡 NOVO: Identifica se o filtro é apenas para o futuro.
      const isFutureOnlyPeriod = filterPeriod === 'proximos-7-dias' || filterPeriod === 'proximos-30-dias';

      // 3. Filtra transações que pertencem ao período selecionado
      const transacoesPeriodo = data.filter(t => {
        const dataTransacao = this.getTransactionDate(t);
        if (!dataTransacao) return false;
        return dataTransacao >= startDate && dataTransacao <= endDate;
      });

      // 4. Separa as transações do período em realizadas e futuras
      const transacoesRealizadasPeriodo = transacoesPeriodo.filter(t => this.isTransacaoProcessada(t));
      const transacoesFuturasPeriodo = transacoesPeriodo.filter(t => this.isTransacaoFutura(t));

      // 5. 💡 LÓGICA PRINCIPAL ALTERADA AQUI
      //    Define qual conjunto de transações usar para os cards de Entradas/Saídas.
      const transacoesParaCards = isFutureOnlyPeriod 
        ? transacoesFuturasPeriodo   // Se for período futuro, usa as transações futuras.
        : transacoesRealizadasPeriodo; // Senão, usa as transações já realizadas.

      const totalEntradas = this.calcularEntradas(transacoesParaCards);
      const totalSaidas = this.calcularSaidas(transacoesParaCards);
      
      // 6. 💡 MELHORIA: Calcula o saldo real GLOBAL do usuário para o card "Saldo Atual (Hoje)".
      //    Isso garante que o valor seja sempre o saldo consolidado até o momento.
      const todasTransacoesReais = data.filter(t => this.isTransacaoProcessada(t));
      const saldoRealGlobal = this.calcularSaldoTransacoes(todasTransacoesReais);

      const result: PeriodBalance = {
        totalEntradas,
        totalSaidas,
        saldoReal: saldoRealGlobal, // Usa o saldo global, mais preciso para o usuário.
        transacoesRealizadas: transacoesRealizadasPeriodo.length,
        transacoesFuturas: transacoesFuturasPeriodo.length
      };

      // 7. Adiciona projeções se o período incluir o futuro
      if (includeFuture) {
        const saldoFuturoPeriodo = this.calcularSaldoTransacoes(transacoesFuturasPeriodo);
        // O saldo projetado agora é o saldo real GLOBAL + o impacto futuro do período selecionado.
        result.saldoProjetado = saldoRealGlobal + saldoFuturoPeriodo;

        // A lógica de impacto futuro para 7/30 dias permanece a mesma e funcional.
        if (filterPeriod === 'todos' || filterPeriod === 'safra-atual' || filterPeriod === 'mes-atual') {
          const hoje = new Date();
          const em7Dias = new Date();
          em7Dias.setDate(hoje.getDate() + 7);
          const em30Dias = new Date();
          em30Dias.setDate(hoje.getDate() + 30);

          const todasTransacoesFuturas = data.filter(t => this.isTransacaoFutura(t));

          const transacoesFuturas7Dias = todasTransacoesFuturas.filter(t => 
            this.isTransacaoNoPeriodo(t, hoje, em7Dias)
          );
          const transacoesFuturas30Dias = todasTransacoesFuturas.filter(t => 
            this.isTransacaoNoPeriodo(t, hoje, em30Dias)
          );

          // ✅ NOVA LÓGICA: Calcula entradas e saídas separadamente
          const entradas7Dias = this.calcularEntradas(transacoesFuturas7Dias);
          const saidas7Dias = this.calcularSaidas(transacoesFuturas7Dias);
          result.impactoFuturo7Dias = saldoRealGlobal + entradas7Dias - saidas7Dias;
          
          const entradas30Dias = this.calcularEntradas(transacoesFuturas30Dias);
          const saidas30Dias = this.calcularSaidas(transacoesFuturas30Dias);
          result.impactoFuturo30Dias = saldoRealGlobal + entradas30Dias - saidas30Dias;
        }
      }

      return result;

    } catch (error) {
      console.error('Erro ao calcular saldos do período:', error);
      return this.getEmptyPeriodBalance();
    }
  }

  /**
   * Determina as datas de início e fim baseado no tipo de filtro
   */
  private static getPeriodDates(
  filterPeriod: FilterPeriod,
  customStartDate?: Date,
  customEndDate?: Date
): { startDate: Date; endDate: Date; includeFuture: boolean } {
  const hoje = new Date();
  console.log('🗓️ Data atual (hoje):', hoje.toISOString());
  
  let startDate: Date;
  let endDate: Date;
  let includeFuture = false;

  switch (filterPeriod) {
    case 'ultimos-7-dias':
      startDate = startOfDay(subDays(hoje, 7));
      // Fim do período é o final do dia de hoje (23:59:59)
      endDate = endOfDay(subDays(hoje, 1));
      break;

    case 'ultimos-30-dias':
      startDate = startOfDay(subDays(hoje, 30));
      // Fim do período é o final do dia de hoje (23:59:59)
      endDate = endOfDay(subDays(hoje, 1));
      break;

    case 'mes-atual':
      startDate = subDays(startOfMonth(hoje), 1);
      // Fim do período é o final do último dia do mês
      endDate = subDays(endOfMonth(hoje), 1);
      includeFuture = true;
      break;
    
    // ... os outros cases continuam como estavam, mas vamos ajustá-los por consistência
    
    case 'safra-atual':
        const anoSafra = hoje.getMonth() >= 4 ? hoje.getFullYear() : hoje.getFullYear() - 1;
        startDate = new Date(anoSafra, 4, 1);
        endDate = endOfDay(new Date(anoSafra + 1, 3, 30));
        includeFuture = true;
        break;

    case 'proximos-7-dias':
        startDate = startOfDay(hoje);
        endDate = endOfDay(addDays(hoje, 7));
        includeFuture = true;
        break;
    
    case 'proximos-30-dias':
        startDate = startOfDay(hoje);
        endDate = endOfDay(addDays(hoje, 30));
        includeFuture = true;
        break;

    case 'personalizado':
        startDate = customStartDate ? startOfDay(customStartDate) : new Date(2020, 0, 1);
        endDate = customEndDate ? endOfDay(customEndDate) : endOfDay(hoje);
        includeFuture = (customEndDate || hoje) > hoje;
        break;

    // ... case 'todos' pode continuar o mesmo
    default:
        startDate = new Date(2020, 0, 1);
        endDate = new Date(2030, 11, 31);
        includeFuture = true;
        break;
  }
  
  console.log('📅 Filtro aplicado:', filterPeriod);
  console.log('📅 Data de início:', startDate.toISOString());
  console.log('📅 Data final:', endDate.toISOString());
  console.log('🔮 Inclui futuro:', includeFuture);
  console.log('---');
  
  return { startDate, endDate, includeFuture };
}
  
static async getTotalNegativeTransactions(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('transacoes_financeiras')
      .select('valor')
      .eq('user_id', userId)
      .lt('valor', 0); // Filtra apenas valores negativos

    if (error) {
      console.error('Erro ao buscar transações negativas:', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    // Soma todos os valores negativos (mantém o sinal negativo)
    const totalNegativo = data.reduce((acc, item) => {
      const valor = Number(item.valor) || 0;
      return acc + valor;
    }, 0);

    return totalNegativo;
  } catch (error) {
    console.error('Erro no serviço financeiro ao calcular total de transações negativas:', error);
    return 0;
  }
}
  /**
   * Obtém a data relevante de uma transação
   */
  private static getTransactionDate(transacao: TransacaoFinanceira): Date | null {
    // Para transações futuras, usa data de agendamento
    if (this.isTransacaoFutura(transacao) && transacao.data_agendamento_pagamento) {
      try {
        return parseISO(transacao.data_agendamento_pagamento);
      } catch {
        return null;
      }
    }

    // Para transações processadas, usa data da transação ou registro
    const dataStr = transacao.data_agendamento_pagamento; // || transacao.data_registro;
    if (!dataStr) return null;

    try {
      return parseISO(dataStr);
    } catch {
      return null;
    }
  }

  /**
   * Calcula total de entradas de uma lista de transações
   */
  private static calcularEntradas(transacoes: TransacaoFinanceira[]): number {
    return transacoes
      .filter(t => Number(t.valor) > 0)
      .reduce((acc, t) => acc + Number(t.valor), 0);
  }

  /**
   * Calcula total de saídas de uma lista de transações
   */
  private static calcularSaidas(transacoes: TransacaoFinanceira[]): number {
    return transacoes
      .filter(t => Number(t.valor) < 0)
      .reduce((acc, t) => acc + Math.abs(Number(t.valor)), 0);
  }

  /**
   * Retorna um objeto de saldo de período vazio
   */
  private static getEmptyPeriodBalance(): PeriodBalance {
    return {
      totalEntradas: 0,
      totalSaidas: 0,
      saldoReal: 0,
      transacoesRealizadas: 0,
      transacoesFuturas: 0
    };
  }

  /**
   * Filtra transações por período e tipo
   */
  static async getTransactionsByPeriod(
    userId: string,
    filterPeriod: FilterPeriod,
    customStartDate?: Date,
    customEndDate?: Date
  ): Promise<{ realizadas: TransacaoFinanceira[]; futuras: TransacaoFinanceira[] }> {
    try {
      console.log('🔍 Buscando transações por período:', filterPeriod);
      
      // 1. OBTÉM AS DATAS DO PERÍODO
      const { startDate, endDate } = this.getPeriodDates(
        filterPeriod,
        customStartDate,
        customEndDate
      );
      
      console.log('📅 Período calculado:', {
        inicio: format(startDate, 'dd/MM/yyyy HH:mm:ss'),
        fim: format(endDate, 'dd/MM/yyyy HH:mm:ss'),
        filterPeriod
      });
  
      // 2. BUSCA TODAS AS TRANSAÇÕES DO USUÁRIO
      // Ordenação composta: primeiro por data_registro (mais recente primeiro), depois por data_agendamento_pagamento
      const { data: todasTransacoes, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('user_id', userId)
        .order('data_registro', { ascending: false })
        .order('data_agendamento_pagamento', { ascending: false });
  
      if (error) {
        console.error('Erro ao buscar transações:', error);
        return { realizadas: [], futuras: [] };
      }
      
      console.log('📊 Total de transações encontradas:', todasTransacoes?.length || 0);
  
      const realizadas: TransacaoFinanceira[] = [];
      const futuras: TransacaoFinanceira[] = [];
  
      // 3. FILTRA E CLASSIFICA CADA TRANSAÇÃO
      (todasTransacoes || []).forEach(transacao => {
        const dataTransacao = this.getTransactionDate(transacao);
        if (!dataTransacao) return;
        
        // Normaliza a data da transação para comparação
        const dataTransacaoSemHora = new Date(dataTransacao.getFullYear(), dataTransacao.getMonth(), dataTransacao.getDate());
        const dataInicioSemHora = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const dataFimSemHora = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        // Verifica se está no período
        const estaNoPeriodo = dataTransacaoSemHora >= dataInicioSemHora && dataTransacaoSemHora <= dataFimSemHora;
        
        if (estaNoPeriodo) {
          if (this.isTransacaoProcessada(transacao)) {
            realizadas.push(transacao);
            console.log('✅ Transação realizada no período:', {
              descricao: transacao.descricao,
              data: format(dataTransacao, 'dd/MM/yyyy'),
              valor: transacao.valor
            });
          } else {
            futuras.push(transacao);
            console.log('⏰ Transação futura no período:', {
              descricao: transacao.descricao,
              data: format(dataTransacao, 'dd/MM/yyyy'),
              valor: transacao.valor
            });
          }
        }
      });
      
      console.log('📈 Resultado final:', {
        realizadas: realizadas.length,
        futuras: futuras.length
      });
  
      return { realizadas, futuras };
  
    } catch (error) {
      console.error('Erro ao buscar transações por período:', error);
      return { realizadas: [], futuras: [] };
    }
  }


  static getCategoriaIcon(categoria: string): string {
    const icons: { [key: string]: string } = {
      'Vendas': '💰',
      'Insumos': '🌱',
      'Manutenção': '🔧',
      'Combustível': '⛽',
      'Financiamento': '🏦',
      'Seguro': '🛡️',
      'Mão de obra': '👷',
      'Equipamentos': '🚜',
      'Sem categoria': '📋',
      'Outros': '📋'
    };
    return icons[categoria] || '📋';
  }

  static formatCurrency(value: number): string {
    if (isNaN(value) || value === null || value === undefined) {
      return 'R$ 0,00';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  static formatDataPagamento(dataText?: string): string {
    if (!dataText) return 'Data não informada';

    try {
      // Se já está no formato brasileiro (dd/MM/yyyy), retorna direto
      if (dataText.includes('/')) {
        return dataText;
      }

      // Usa a função utilitária que trata corretamente o problema de timezone
      return formatDateBR(dataText);
    } catch (error) {
      console.error('Erro ao formatar data de pagamento:', error);
      return dataText;
    }
  }
}
