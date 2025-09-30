import { supabase } from '../lib/supabase';

export interface CotacaoCafe {
  id: number;
  cultura: string;
  municipio: string;
  preco: string; // Vem como string "R$1.959,00"
  variacao: string; // Vem como string "+1,03"
}

export class CotacaoService {
  static async getCotacaoAtual(): Promise<number> {
    try {
      console.log('🔍 Buscando cotação atual da tabela cotacao_diaria_cafe...');
      
      // Primeiro teste: buscar sem filtro
      const { data: allRecords, error: allError } = await supabase
        .from('cotacao_diaria_cafe')
        .select('*')
        .limit(5);

      console.log('📋 Primeiros registros da tabela:', { allRecords, allError });

      // Segundo teste: buscar com maybeSingle em vez de single
      const { data, error } = await supabase
        .from('cotacao_diaria_cafe')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      console.log('📊 Resposta do Supabase:', { data, error });

      if (error) {
        console.error('❌ Erro ao buscar cotação:', error);
        console.log('🔄 Usando valor padrão: 1726');
        return 1726; // Valor padrão em caso de erro
      }

      if (data?.preco) {
        console.log('💰 Preço encontrado na tabela:', data.preco);
        // Converte "R$1.959,00" para número 1959
        const precoNumerico = this.parsePrecoString(data.preco);
        console.log('🔢 Preço convertido para número:', precoNumerico);
        return precoNumerico;
      }

      console.log('⚠️ Nenhum preço encontrado, usando valor padrão: 1726');
      return 1726; // Valor padrão se não encontrar
    } catch (error) {
      console.error('💥 Erro no serviço de cotação:', error);
      return 1726; // Valor padrão em caso de erro
    }
  }

  static async getCotacaoCompleta(): Promise<CotacaoCafe | null> {
    try {
      console.log('🔍 Buscando cotação completa da tabela cotacao_diaria_cafe...');
      
      const { data, error } = await supabase
        .from('cotacao_diaria_cafe')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      console.log('📊 Resposta completa do Supabase:', { data, error });

      if (error) {
        console.error('❌ Erro ao buscar cotação completa:', error);
        return null;
      }

      console.log('✅ Cotação completa encontrada:', data);
      return data;
    } catch (error) {
      console.error('💥 Erro no serviço de cotação completa:', error);
      return null;
    }
  }

  // Converte string "R$1.959,00" para número 1959
  static parsePrecoString(precoString: string): number {
    if (!precoString) {
      console.log('⚠️ Preço string vazia, retornando 1726');
      return 1726;
    }
    
    console.log('🔄 Convertendo preço:', precoString);
    
    // Remove "R$", pontos e substitui vírgula por ponto
    const numeroLimpo = precoString
      .replace(/R\$/, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();
    
    console.log('🧹 Número limpo:', numeroLimpo);
    
    const numero = parseFloat(numeroLimpo);
    const resultado = isNaN(numero) ? 1726 : numero;
    
    console.log('🎯 Resultado final da conversão:', resultado);
    return resultado;
  }

  // Converte string "+1,03" para número 1.03
  static parseVariacaoString(variacaoString: string): number {
    if (!variacaoString) return 0;
    
    console.log('🔄 Convertendo variação:', variacaoString);
    
    const numeroLimpo = variacaoString.replace(',', '.');
    const numero = parseFloat(numeroLimpo);
    const resultado = isNaN(numero) ? 0 : numero;
    
    console.log('📈 Variação convertida:', resultado);
    return resultado;
  }

  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  static formatVariacao(variacao: number): string {
    const sinal = variacao >= 0 ? '+' : '';
    return `${sinal}${variacao.toFixed(2)}%`;
  }

  // Método para testar a conexão com a tabela
  static async testarConexao(): Promise<void> {
    try {
      console.log('🧪 Testando conexão com a tabela cotacao_diaria_cafe...');
      
      // Verificar se conseguimos acessar a tabela
      const { data: tableInfo, error: tableError } = await supabase
        .from('cotacao_diaria_cafe')
        .select('count(*)', { count: 'exact' });

      console.log('📊 Info da tabela:', { tableInfo, tableError });

      // Primeiro, vamos ver se a tabela existe e quais dados tem
      const { data: allData, error: allError } = await supabase
        .from('cotacao_diaria_cafe')
        .select('*')
        .limit(10);

      console.log('📋 Todos os dados da tabela:', { allData, allError });

      // Se a tabela estiver vazia, vamos mostrar uma mensagem específica
      if (allData && allData.length === 0) {
        console.log('⚠️ TABELA VAZIA: A tabela cotacao_diaria_cafe não tem nenhum registro!');
        console.log('💡 SOLUÇÃO: Execute a migração SQL para inserir os dados.');
      }

      // Agora vamos buscar especificamente o ID 1
      const { data: id1Data, error: id1Error } = await supabase
        .from('cotacao_diaria_cafe')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      console.log('🎯 Dados do ID 1:', { id1Data, id1Error });

      // Se não encontrar o ID 1, mostrar mensagem específica  
      if (!id1Data) {
        console.log('❌ REGISTRO ID=1 NÃO ENCONTRADO!');
        console.log('💡 SOLUÇÃO: Insira um registro com ID=1 na tabela.');
      } else {
        console.log('✅ REGISTRO ID=1 ENCONTRADO:', id1Data);
      }

      // Teste direto de consulta simples
      console.log('🔍 Teste de consulta simples...');
      const { data: simpleTest, error: simpleError } = await supabase
        .from('cotacao_diaria_cafe')
        .select('id, preco')
        .limit(1);
      
      console.log('🧪 Resultado do teste simples:', { simpleTest, simpleError });

    } catch (error) {
      console.error('💥 Erro no teste de conexão:', error);
    }
  }
}