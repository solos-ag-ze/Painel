// src/services/estoqueService.ts
import { supabase } from '../lib/supabase';
import { AuthService } from './authService';
import { ActivityService } from './activityService';
import { convertToStandardUnit, convertFromStandardUnit, isMassUnit, isVolumeUnit, convertBetweenUnits } from '../lib/unitConverter';

export interface ProdutoEstoque {
  id: number;
  user_id: string;
  nome_produto: string; // mapeado de nome_do_produto
  marca: string; // mapeado de marca_ou_fabricante
  categoria: string;
  unidade: string; // mapeado de unidade_de_medida
  quantidade: number; // mapeado de quantidade_em_estoque
  valor: number | null; // mapeado de valor_unitario
  status?: string | null; // possível coluna adicional
  numero_nota_fiscal?: string | null;
  lote: string | null;
  validade: string | null;
  created_at?: string;
  fornecedor?: string | null;
  registro_mapa?: string | null;
  unidade_valor_original?: string | null; // unidade que o valor foi originalmente inserido
  quantidade_inicial: number; // quantidade original informada no cadastro
  nota_fiscal?: boolean | null;
  unidade_nota_fiscal?: string | null;
  valor_total?: number | null; // valor total do produto (valor_unitario × quantidade_inicial)
  valor_medio?: number | null; // valor médio calculado pela function do banco
  tipo_de_movimentacao?: 'entrada' | 'saida' | 'aplicacao' | null; // tipo da movimentação
  entrada_referencia_id?: number | null; // ID da entrada de referência (para saídas FIFO)
  produto_id?: string | null; // UUID do produto (para agrupar entradas/saídas)
  observacoes_das_movimentacoes?: string | null;
}

export interface MovimentacaoEstoque {
  id: number;
  produto_id: number;
  user_id: string;
  tipo: 'entrada' | 'saida' | 'aplicacao';
  quantidade: number;
  observacao?: string | null;
  created_at: string;
  unidade_momento?: string | null;
}

export interface MovimentacaoExpandida extends MovimentacaoEstoque {
  nome_produto: string;
  marca: string;
  categoria: string;
  unidade: string;
  valor: number | null;
  unidade_valor_original: string | null;
  lote: string | null;
  validade: string | null;
  fornecedor: string | null;
  registro_mapa: string | null;
  produto_created_at: string;
}

// Tipo para representar um registro de lancamento_produtos (com join em lancamentos_agricolas)
export interface LancamentoProdutoEntry {
  id: number;
  atividade_id: string | null;
  produto_id: number;
  quantidade_val: number | null;
  quantidade_un: string | null;
  observacao?: string | null;
  created_at?: string | null;
  atividade?: {
    atividade_id?: string | null;
    nome_atividade?: string | null;
    created_at?: string | null;
  } | null;
}

export class EstoqueService {
    /**
     * Busca produtos do novo estoque (ledger FIFO) usando a view vw_estoque_saldo
     */
    static async getProdutosNovoEstoque(): Promise<any[]> {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('vw_estoque_saldo')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        console.error('Erro ao buscar produtos do novo estoque:', error);
        return [];
      }
      return data || [];
    }
  
     /**
      * Busca o valor total do estoque do usuário usando a view vw_estoque_valor_total
      */
     static async getValorTotalEstoque(): Promise<number | null> {
       const userId = await this.getCurrentUserId();
       const { data, error } = await supabase
         .from('vw_estoque_valor_total')
         .select('valor_total')
         .eq('user_id', userId)
         .maybeSingle();
 
       if (error) {
         console.error('Erro ao buscar valor total do estoque:', error);
         return null;
       }
       return data?.valor_total ?? null;
     }
  // Cache de lançamentos para melhorar performance
  private static lancamentosCache: { data: LancamentoProdutoEntry[], timestamp: number } | null = null;
  private static readonly CACHE_TTL = 30000; // 30 segundos

  private static async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log('🔐 Usuário autenticado via Supabase:', user.id);
      return user.id;
    }

    const authService = AuthService.getInstance();
    const authUser = authService.getCurrentUser();
    if (authUser) {
      console.log('🔐 Usuário via AuthService:', authUser.user_id);
      return authUser.user_id;
    }

    if (import.meta.env.VITE_ZE_AMBIENTE === 'development') {
      const devUserId = 'c7f13743-67ef-45d4-807c-9f5de81d4999';
      console.log('🔓 Usando usuário de desenvolvimento:', devUserId);
      return devUserId;
    }

    throw new Error("⚠️ Usuário não autenticado!");
  }

  /**
   * Busca a propriedade ativa do usuário via vinculo_usuario_propriedade
   */
  private static async getPropriedadeIdDoUsuario(userId: string): Promise<string | null> {
    try {
      console.log('🔍 Buscando propriedade para o usuário:', userId);
      
      // Usar maybeSingle() ao invés de single() para não dar erro se não encontrar
      const { data, error } = await supabase
        .from('vinculo_usuario_propriedade')
        .select('id_propriedade')
        .eq('user_id', userId)
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar propriedade do usuário:', error);
        console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2));
        return null;
      }

      if (!data) {
        console.warn('⚠️ Nenhuma propriedade ativa encontrada para o usuário:', userId);
        
        // Tentar buscar sem o filtro de ativo para debug
        const { data: todasPropriedades, error: errDebug } = await supabase
          .from('vinculo_usuario_propriedade')
          .select('id_propriedade, ativo')
          .eq('user_id', userId);
        
        if (!errDebug && todasPropriedades) {
          console.log('🔍 Debug - Todas as propriedades do usuário:', todasPropriedades);
        }
        
        return null;
      }

      console.log('✅ Propriedade encontrada para o usuário:', data.id_propriedade);
      return data.id_propriedade;
    } catch (err) {
      console.error('❌ Falha ao buscar propriedade do usuário:', err);
      return null;
    }
  }

  static async getProdutos(): Promise<ProdutoEstoque[]> {
    const userId = await this.getCurrentUserId();
    // Tenta selecionar também colunas opcionais relacionadas a NF (se existirem).
    // Se a coluna não existir no banco, fará fallback para a seleção padrão.
    let data: any = null;
    let error: any = null;

    try {
      const resp = await supabase
        .from('estoque_de_produtos')
        .select(`
          id,
          created_at,
          user_id,
          nome_do_produto,
          marca_ou_fabricante,
          categoria,
          unidade_de_medida,
          quantidade_em_estoque,
          valor_unitario,
          lote,
          validade,
          fornecedor,
          registro_mapa,
          unidade_valor_original,
          unidade_nota_fiscal,
          quantidade_inicial,
          valor_total,
          valor_medio,
          tipo_de_movimentacao,
          produto_id,
          observacoes_das_movimentacoes,
          entrada_referencia_id,
          status,
          nota_fiscal,
          numero_nota_fiscal
        `)
        .eq('user_id', userId)
        .eq('tipo_de_movimentacao', 'entrada')
        .order('created_at', { ascending: false });

      data = resp.data;
      error = resp.error;

      // Se o erro indicar coluna desconhecida, refazer sem os campos extras
      if (error && /column|invalid|does not exist/i.test(String(error.message || error))) {
        console.warn('Colunas NF não encontradas em estoque_de_produtos, fazendo fallback sem elas.');
        const resp2 = await supabase
          .from('estoque_de_produtos')
          .select(`
            id,
            created_at,
            user_id,
            nome_do_produto,
            marca_ou_fabricante,
            categoria,
            unidade_de_medida,
            quantidade_em_estoque,
            valor_unitario,
            lote,
            validade,
            fornecedor,
            registro_mapa,
            unidade_valor_original,
            unidade_nota_fiscal,
            quantidade_inicial,
            valor_total,
            valor_medio,
            tipo_de_movimentacao,
            produto_id,
            observacoes_das_movimentacoes,
            entrada_referencia_id
          `)
          .eq('user_id', userId)
          .eq('tipo_de_movimentacao', 'entrada')
          .order('created_at', { ascending: false });

        data = resp2.data;
        error = resp2.error;
      }
    } catch (e) {
      console.error('Erro ao buscar produtos (getProdutos):', e);
      error = e;
    }

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      throw error;
    }

    // Mapear nomes das colunas
    const produtosMapeados: ProdutoEstoque[] = (data || []).map((produto: any) => ({
      id: produto.id,
      user_id: produto.user_id,
      nome_produto: produto.nome_do_produto,
      marca: produto.marca_ou_fabricante,
      categoria: produto.categoria,
      unidade: produto.unidade_de_medida,
      quantidade: produto.quantidade_em_estoque,
      valor: produto.valor_unitario,
      status: produto.status ?? null,
      nota_fiscal: produto.nota_fiscal ?? null,
      numero_nota_fiscal: produto.numero_nota_fiscal ?? null,
      unidade_nota_fiscal: produto.unidade_nota_fiscal ?? null,
      lote: produto.lote,
      validade: produto.validade,
      created_at: produto.created_at,
      fornecedor: produto.fornecedor,
      registro_mapa: produto.registro_mapa,
      unidade_valor_original: produto.unidade_valor_original,
      quantidade_inicial: produto.quantidade_inicial,
      valor_total: produto.valor_total,
      valor_medio: produto.valor_medio,
      tipo_de_movimentacao: produto.tipo_de_movimentacao,
      produto_id: produto.produto_id,
      observacoes_das_movimentacoes: produto.observacoes_das_movimentacoes,
      entrada_referencia_id: produto.entrada_referencia_id,
    }));

    return produtosMapeados;
  }

  /**
   * Busca TODAS as movimentações (entrada, saída e aplicação) do estoque.
   * Usado para histórico completo e análises que precisam ver todas as movimentações.
   */
  static async getAllMovimentacoes(): Promise<ProdutoEstoque[]> {
    const userId = await this.getCurrentUserId();
    let data: any = null;
    let error: any = null;

    try {
      const resp = await supabase
        .from('estoque_de_produtos')
        .select(`
          id,
          created_at,
          user_id,
          nome_do_produto,
          marca_ou_fabricante,
          categoria,
          unidade_de_medida,
          quantidade_em_estoque,
          valor_unitario,
          lote,
          validade,
          fornecedor,
          registro_mapa,
          unidade_valor_original,
          unidade_nota_fiscal,
          quantidade_inicial,
          valor_total,
          valor_medio,
          tipo_de_movimentacao,
          produto_id,
          observacoes_das_movimentacoes,
          entrada_referencia_id,
          status,
          nota_fiscal,
          numero_nota_fiscal
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      data = resp.data;
      error = resp.error;

      // Se o erro indicar coluna desconhecida, refazer sem os campos extras
      if (error && /column|invalid|does not exist/i.test(String(error.message || error))) {
        console.warn('Colunas NF não encontradas em estoque_de_produtos, fazendo fallback sem elas.');
        const resp2 = await supabase
          .from('estoque_de_produtos')
          .select(`
            id,
            created_at,
            user_id,
            nome_do_produto,
            marca_ou_fabricante,
            categoria,
            unidade_de_medida,
            quantidade_em_estoque,
            valor_unitario,
            lote,
            validade,
            fornecedor,
            registro_mapa,
            unidade_valor_original,
            unidade_nota_fiscal,
            quantidade_inicial,
            valor_total,
            valor_medio,
            tipo_de_movimentacao,
            produto_id,
            observacoes_das_movimentacoes,
            entrada_referencia_id
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        data = resp2.data;
        error = resp2.error;
      }
    } catch (e) {
      console.error('Erro ao buscar todas movimentações (getAllMovimentacoes):', e);
      error = e;
    }

    if (error) {
      console.error('❌ Erro ao buscar todas movimentações:', error);
      throw error;
    }

    // Mapear nomes das colunas
    const produtosMapeados: ProdutoEstoque[] = (data || []).map((produto: any) => ({
      id: produto.id,
      user_id: produto.user_id,
      nome_produto: produto.nome_do_produto,
      marca: produto.marca_ou_fabricante,
      categoria: produto.categoria,
      unidade: produto.unidade_de_medida,
      quantidade: produto.quantidade_em_estoque,
      valor: produto.valor_unitario,
      status: produto.status ?? null,
      nota_fiscal: produto.nota_fiscal ?? null,
      numero_nota_fiscal: produto.numero_nota_fiscal ?? null,
      unidade_nota_fiscal: produto.unidade_nota_fiscal ?? null,
      lote: produto.lote,
      validade: produto.validade,
      created_at: produto.created_at,
      fornecedor: produto.fornecedor,
      registro_mapa: produto.registro_mapa,
      unidade_valor_original: produto.unidade_valor_original,
      quantidade_inicial: produto.quantidade_inicial,
      valor_total: produto.valor_total,
      valor_medio: produto.valor_medio,
      tipo_de_movimentacao: produto.tipo_de_movimentacao,
      produto_id: produto.produto_id,
      observacoes_das_movimentacoes: produto.observacoes_das_movimentacoes,
      entrada_referencia_id: produto.entrada_referencia_id,
    }));

    return produtosMapeados;
  }

  static async adicionarProduto(
    nome: string,
    marca: string,
    categoria: string,
    unidade: string,
    quantidade: number,
    valor: number,
    lote?: string,
    validade?: string,
    fornecedor?: string,
    registroMapa?: string
  ): Promise<void> {
    const userId = await this.getCurrentUserId();

    const converted = convertToStandardUnit(quantidade, unidade);
    const valorTotal = converted.quantidade * valor;

    const { error } = await supabase
      .from('estoque_de_produtos')
      .insert([
        {
          user_id: userId,
          nome_do_produto: nome,
          marca_ou_fabricante: marca,
          categoria,
          unidade_de_medida: converted.unidade,
          quantidade_em_estoque: converted.quantidade,
          quantidade_inicial: converted.quantidade,
          valor_unitario: valor,
          valor_total: valorTotal,
          unidade_valor_original: unidade,
          lote: lote || null,
          validade: validade || null,
          fornecedor: fornecedor || null,
          registro_mapa: registroMapa || null,
        },
      ]);

    if (error) {
      console.error('❌ Erro ao adicionar produto:', error);
      throw error;
    }
  }

  static async addProduto(produto: {
    nome_produto: string;
    marca: string;
    categoria: string;
    unidade: string;
    quantidade: number;
    valor: number | null;
    lote: string | null;
    validade: string | null;
    fornecedor: string | null;
    registro_mapa: string | null;
  }): Promise<ProdutoEstoque | null> {
    const userId = await this.getCurrentUserId();
    // Buscar propriedade ativa do usuário (não usada no RPC, mas mantida para logging)
    const propriedadeId = await this.getPropriedadeIdDoUsuario(userId);

    const valorTotal = produto.valor || 0;
    const converted = convertToStandardUnit(produto.quantidade, produto.unidade);
    const valorUnitario = produto.quantidade > 0 
      ? valorTotal / produto.quantidade 
      : 0;

    console.log('📊 Cadastro de produto COM CONVERSÃO para unidade padrão:');
    console.log(`  - Entrada usuário: ${produto.quantidade} ${produto.unidade}`);
    console.log(`  - Conversão: ${converted.quantidade} ${converted.unidade}`);
    console.log(`  - Valor total: R$ ${valorTotal.toFixed(2)}`);
    console.log(`  - Valor unitário: R$ ${valorUnitario.toFixed(2)}/${produto.unidade}`);
    console.log(`  - Propriedade ID: ${propriedadeId || 'N/A'}`);

    // Novo fluxo: cadastro via RPC registrar_produto_e_entrada
    try {
      const { data, error } = await supabase.rpc('registrar_produto_e_entrada', {
        p_nome: produto.nome_produto,
        p_marca: produto.marca,
        p_categoria: produto.categoria,
        p_unidade_base: produto.unidade,
        p_registro_mapa: produto.registro_mapa,
        p_fornecedor: produto.fornecedor,
        p_quantidade: produto.quantidade,
        p_valor_total: produto.valor,
        p_lote: produto.lote,
        p_validade: produto.validade,
        p_user_id: userId,
      });
      if (error) {
        console.error('Erro ao cadastrar produto via RPC:', error);
        return null;
      }
      if (data) {
        console.log('Retorno do RPC registrar_produto_e_entrada:', data);
        return {
          id: data.id,
          user_id: data.user_id,
          nome_produto: data.nome_do_produto,
          marca: data.marca_ou_fabricante,
          categoria: data.categoria,
          unidade: data.unidade_de_medida,
          quantidade: data.quantidade_em_estoque,
          valor: data.valor_unitario,
          lote: data.lote,
          validade: data.validade,
          created_at: data.created_at,
          fornecedor: data.fornecedor,
          registro_mapa: data.registro_mapa,
          unidade_valor_original: data.unidade_valor_original,
          quantidade_inicial: data.quantidade_inicial,
        };
      }
      return null;
    } catch (err) {
      console.error('Erro inesperado ao cadastrar produto:', err);
      return null;
    }
  }

  static async atualizarQuantidade(
    id: number,
    novaQuantidade: number,
    valorUnitario?: number | null,
    unidadeValorOriginal?: string | null
  ): Promise<void> {
    // Primeiro, tentar buscar o produto para obter a unidade padrão armazenada
    let produto: any = null;
    try {
      const { data, error } = await supabase
        .from('estoque_de_produtos')
        .select('unidade_de_medida, unidade_valor_original')
        .eq('id', id)
        .single();

      if (error) {
        console.warn('⚠️ Aviso: não foi possível buscar produto para calcular valor_total:', error);
      } else {
        produto = data;
      }
    } catch (err) {
      console.warn('⚠️ Falha ao buscar produto (ignorar e prosseguir):', err);
    }

    const unidadePadrao = produto?.unidade_de_medida ?? 'un';
    const unidadeOrig = unidadeValorOriginal ?? produto?.unidade_valor_original ?? unidadePadrao;

    let valorTotal: number | null = null;
    if (valorUnitario != null && !Number.isNaN(Number(valorUnitario))) {
      try {
        const quantidadeOriginal = convertFromStandardUnit(novaQuantidade, unidadePadrao, unidadeOrig);
        valorTotal = Number(valorUnitario) * Number(quantidadeOriginal);
      } catch (e) {
        console.warn('⚠️ Falha ao calcular valor_total (conversão):', e);
        valorTotal = null;
      }
    }

    const updateObj: any = {
      quantidade_em_estoque: novaQuantidade,
      quantidade_inicial: novaQuantidade,
    };

    // Definir valor_total (pode ser null se não tivermos valorUnitario)
    updateObj.valor_total = valorTotal != null && Number.isFinite(valorTotal) ? valorTotal : null;

    const { error } = await supabase
      .from('estoque_de_produtos')
      .update(updateObj)
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao atualizar quantidade/quantidade_inicial/valor_total:', error);
      throw error;
    }
  }

  static async removerProduto(id: number): Promise<void> {
    const { error } = await supabase
      .from('estoque_de_produtos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao remover produto:', error);
      throw error;
    }
  }

  static async editarProduto(
    id: number,
    nome: string,
    marca: string,
    categoria: string,
    unidade: string,
    valor: number,
    unidade_valor_original?: string | null,
    lote?: string,
    validade?: string,
    fornecedor?: string,
    registroMapa?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('estoque_de_produtos')
      .update({
        nome_do_produto: nome,
        marca_ou_fabricante: marca,
        categoria,
        unidade_de_medida: unidade,
        valor_unitario: valor,
        unidade_valor_original: unidade_valor_original ?? null,
        lote: lote || null,
        validade: validade || null,
        fornecedor: fornecedor || null,
        registro_mapa: registroMapa || null,
      })
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao editar produto:', error);
      throw error;
    }
  }

  /**
   * Marca um produto como confirmado (altera status de 'pendente' para 'confirmado')
   */
  static async confirmarPendencia(id: number | string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('estoque_de_produtos')
        .update({ status: 'confirmado' })
        .eq('id', Number(id));

      if (error) {
        console.error('❌ Erro ao confirmar pendência (id ' + id + '):', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('❌ Falha ao confirmar pendência:', err);
      return false;
    }
  }

  /**
   * Marca múltiplos produtos como confirmados (bulk).
   */
  static async confirmarMultiplasPendencias(ids: Array<number | string>): Promise<boolean> {
    try {
      const numericIds = ids.map(i => Number(i));
      const { error } = await supabase
        .from('estoque_de_produtos')
        .update({ status: 'confirmado' })
        .in('id', numericIds);

      if (error) {
        console.error('❌ Erro ao confirmar múltiplas pendências:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('❌ Falha ao confirmar múltiplas pendências:', err);
      return false;
    }
  }

  static async registrarMovimentacao(
    produtoId: number,
    tipo: 'entrada' | 'saida',
    quantidade: number,
    observacao?: string,
    valorUnitarioMomento?: number | null,
    unidadeValorMomento?: string | null,
    unidadeMomento?: string | null
  ): Promise<any> {
    const userId = await this.getCurrentUserId();

    // Calcular valor total da movimentação se houver valor unitário
    // ⚠️ IMPORTANTE: quantidade está em unidade padrão (mg/mL)
    // valorUnitarioMomento está em unidadeValorMomento (ton/kg/L)
    // Precisamos converter a quantidade para a mesma unidade do valor antes de multiplicar
    let valorTotalMovimentacao = null;
    
    if (valorUnitarioMomento != null && valorUnitarioMomento > 0 && unidadeValorMomento && unidadeMomento) {
      // Converter quantidade de unidade padrão (mg/mL) para unidadeValorMomento
      let quantidadeConvertida = quantidade;
      
      if (unidadeMomento !== unidadeValorMomento) {
        if (isMassUnit(unidadeMomento) && isMassUnit(unidadeValorMomento)) {
          // Converter de mg para unidadeValorMomento
          quantidadeConvertida = convertFromStandardUnit(quantidade, 'mg', unidadeValorMomento);
        } else if (isVolumeUnit(unidadeMomento) && isVolumeUnit(unidadeValorMomento)) {
          // Converter de mL para unidadeValorMomento
          quantidadeConvertida = convertFromStandardUnit(quantidade, 'mL', unidadeValorMomento);
        }
      }
      
      valorTotalMovimentacao = valorUnitarioMomento * quantidadeConvertida;
      
      console.log('💰 Cálculo valor_total_movimentacao:', {
        produto_id: produtoId,
        quantidade_padrao: quantidade,
        unidade_padrao: unidadeMomento,
        quantidade_convertida: quantidadeConvertida,
        unidade_valor: unidadeValorMomento,
        valor_unitario: valorUnitarioMomento,
        valor_total: valorTotalMovimentacao
      });
    }

    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .insert([
        {
          produto_id: produtoId,
          user_id: userId,
          tipo,
          quantidade,
          observacao: observacao || null,
          unidade_momento: unidadeMomento || null,
          valor_unitario_momento: valorUnitarioMomento || null,
          unidade_valor_momento: unidadeValorMomento || null,
          valor_total_movimentacao: valorTotalMovimentacao,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao registrar movimentação:', error);
      throw error;
    }

    return data;
  }

  /**
   * Chama a função RPC `processar_entrada_estoque` no banco.
   * O backend faz o abatimento do déficit e o restante entra no lote.
   */
  static async processarEntrada(p_produto_id: number, p_qtd: number, p_preco_unit: number): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('processar_entrada_estoque', {
        p_produto_id: p_produto_id,
        p_qtd: p_qtd,
        p_preco_unit: p_preco_unit,
      });

      if (error) {
        console.error('❌ Erro ao chamar RPC processar_entrada_estoque:', error);
        throw error;
      }

      // Registrar movimentação de entrada no histórico para que o ajuste apareça no histórico
      try {
        // Buscar informações do produto para saber a unidade de referência
        const { data: produto, error: prodErr } = await supabase
          .from('estoque_de_produtos')
          .select('id, unidade_de_medida, unidade_valor_original')
          .eq('id', p_produto_id)
          .single();

        if (prodErr) {
          console.warn('Aviso: não foi possível buscar produto após processar entrada (movimentação não registrada):', prodErr);
        } else if (produto) {
          const unidadeMomento = produto.unidade_de_medida || produto.unidade_valor_original || null;
          const unidadeValorMomento = produto.unidade_valor_original || unidadeMomento || null;

          // Converter quantidade informada para unidade padrão (mg/mL) antes de registrar
          const converted = unidadeMomento ? convertToStandardUnit(p_qtd, unidadeMomento) : { quantidade: p_qtd, unidade: unidadeMomento };
          const quantidadePadrao = Number(converted.quantidade) || 0;

          const movimentacaoCriada = await this.registrarMovimentacao(
            p_produto_id,
            'entrada',
            quantidadePadrao,
            'Ajuste de estoque (entrada) via app',
            p_preco_unit != null ? Number(p_preco_unit) : null,
            unidadeValorMomento,
            unidadeMomento
          );

          // retornar também a movimentação criada para o frontend poder atualizar o histórico
          return { rpcResult: data, movimentacao: movimentacaoCriada };
        }
      } catch (movErr) {
        console.warn('Erro ao registrar movimentação de entrada após RPC processar_entrada_estoque:', movErr);
      }

      return { rpcResult: data, movimentacao: null };
    } catch (err) {
      console.error('❌ processarEntrada falhou:', err);
      throw err;
    }
  }

  /**
   * Remove quantidade de um produto agrupado seguindo FIFO (First In, First Out)
   * NOVO SISTEMA: Cria registros de SAÍDA na tabela estoque_de_produtos
   * 
   * @param nomeProduto Nome do produto para buscar todas as entradas
   * @param quantidadeRemover Quantidade a remover (na unidade de referência do produto: kg, L, un, etc.)
   * @param observacao Observação/motivo da saída
   * @param mediaPrecoGrupo Preço médio do grupo (para registrar no histórico)
   * @param unidadeValorGrupo Unidade de valor do grupo
   * @param entradaIds Lista opcional de IDs das entradas que compõem este grupo (para garantir que removemos das entradas corretas)
   */
  static async removerQuantidadeFIFO(
    nomeProduto: string,
    quantidadeRemover: number,
    observacao?: string,
    mediaPrecoGrupo?: number | null,
    unidadeValorGrupo?: string | null,
    entradaIds?: number[]
  ): Promise<void> {
    const userId = await this.getCurrentUserId();

    console.log('🔄 Iniciando registro de saída via RPC:', {
      produto: nomeProduto,
      quantidadeRemover,
      observacao,
      mediaPrecoGrupo,
      unidadeValorGrupo
    });

    // Chamar RPC registrar_produto_e_saida
    const { data, error } = await supabase.rpc('registrar_produto_e_saida', {
      p_nome: nomeProduto,
      p_marca: null,
      p_categoria: null,
      p_unidade_base: unidadeValorGrupo || null,
      p_registro_mapa: null,
      p_fornecedor: null,
      p_quantidade: quantidadeRemover,
      p_valor_total: mediaPrecoGrupo ? mediaPrecoGrupo * quantidadeRemover : null,
      p_lote: null,
      p_validade: null,
      p_user_id: userId
    });

    if (error) {
      console.error('❌ Erro ao registrar saída via RPC:', error);
      throw error;
    }

    console.log('✅ Saída registrada com sucesso!', { data });
  }

  static async getMovimentacoesExpandidas(
    produtoId: number,
    page = 1,
    limit = 10
  ): Promise<{ data: MovimentacaoExpandida[]; hasMore: boolean; totalCount: number }> {
    const userId = await this.getCurrentUserId();
    const offset = (page - 1) * limit;

    const { count } = await supabase
      .from('movimentacoes_estoque')
      .select('*', { count: 'exact', head: true })
      .eq('produto_id', produtoId)
      .eq('user_id', userId);

    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select(`
        *,
        produto:estoque_de_produtos!inner(
          nome_do_produto,
          marca_ou_fabricante,
          categoria,
          unidade_de_medida,
          valor_unitario,
          unidade_valor_original,
          lote,
          validade,
          fornecedor,
          registro_mapa,
          created_at
        )
      `)
      .eq('produto_id', produtoId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Erro ao buscar movimentações expandidas:', error);
      throw error;
    }

    const movimentacoes: MovimentacaoExpandida[] = (data || []).map((mov: any) => ({
      id: mov.id,
      produto_id: mov.produto_id,
      user_id: mov.user_id,
      tipo: mov.tipo,
      quantidade: mov.quantidade,
      observacao: mov.observacao,
      created_at: mov.created_at,
      nome_produto: mov.produto.nome_do_produto,
      marca: mov.produto.marca_ou_fabricante,
      categoria: mov.produto.categoria,
      unidade: mov.unidade_momento || mov.produto.unidade_de_medida,
      valor: mov.produto.valor_unitario,
      unidade_valor_original: mov.produto.unidade_valor_original,
      lote: mov.produto.lote,
      validade: mov.produto.validade,
      fornecedor: mov.produto.fornecedor,
      registro_mapa: mov.produto.registro_mapa,
      produto_created_at: mov.produto.created_at,
      // ✅ Campos históricos salvos no momento da transação (imutáveis)
      valor_unitario_momento: mov.valor_unitario_momento,
      unidade_valor_momento: mov.unidade_valor_momento,
      valor_total_movimentacao: mov.valor_total_movimentacao,
    }));

    const totalCount = count || 0;
    const hasMore = data ? data.length === limit : false;
    return { data: movimentacoes, hasMore, totalCount };
  }

  static async getMovimentacoes(page = 1, limit = 10): Promise<{ data: MovimentacaoEstoque[]; hasMore: boolean }> {
    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Erro ao buscar movimentações:', error);
      throw error;
    }

    const hasMore = data ? data.length === limit : false;
    return { data: data || [], hasMore };
  }

  /**
   * Busca movimentações para um conjunto de produtos (útil para histórico por grupo)
   */
  /**
   * Busca movimentações completas para um conjunto de produtos usando a nova view vw_estoque_movimentacoes_completas
   * Retorna todos os campos necessários para o histórico detalhado
   */
  static async getMovimentacoesPorProdutos(produtoIds: (number | string)[]): Promise<any[]> {
    if (!produtoIds || produtoIds.length === 0) return [];
    const { data, error } = await supabase
      .from('vw_estoque_movimentacoes_completas')
      .select('*')
      .in('produto_id', produtoIds)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar movimentações completas:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Busca lançamentos (aplicações) de produtos para um conjunto de produtos
   * Faz join em `lancamentos_agricolas` para trazer nome_atividade e created_at da atividade
   */
  static async getLancamentosPorProdutos(produtoIds: (number | string)[]): Promise<LancamentoProdutoEntry[]> {
    if (!produtoIds || produtoIds.length === 0) return [];

    // Normalizar IDs para números
    const idsNumericos = produtoIds.map(id => Number(id)).filter(id => !isNaN(id));
    if (idsNumericos.length === 0) return [];

    // ⚡ Verificar cache primeiro (30s TTL)
    const now = Date.now();
    if (this.lancamentosCache && (now - this.lancamentosCache.timestamp) < this.CACHE_TTL) {
      // Filtrar apenas os produtos solicitados (comparando como números)
      return this.lancamentosCache.data.filter(l => idsNumericos.includes(Number(l.produto_id)));
    }

    // ⚡ OTIMIZAÇÃO: Buscar com JOIN em uma única query
    const { data: rows, error } = await supabase
      .from('lancamento_produtos')
      .select(`
        id,
        atividade_id,
        produto_id,
        quantidade_val,
        quantidade_un,
        lancamentos_agricolas (
          atividade_id,
          nome_atividade,
          created_at,
          data_atividade
        )
      `)
      .in('produto_id', idsNumericos);

    if (error) {
      console.error('❌ Erro ao buscar lancamento_produtos com JOIN:', error);
      return [];
    }

    // Mapear resultados com atividade já incluída
    const results: LancamentoProdutoEntry[] = (rows || []).map((row: any) => {
      const atividadeData = row.lancamentos_agricolas;
      
      return {
        id: row.id,
        atividade_id: row.atividade_id,
        produto_id: Number(row.produto_id),
        quantidade_val: row.quantidade_val,
        quantidade_un: row.quantidade_un,
        observacao: null,
        created_at: atividadeData?.created_at || atividadeData?.data_atividade || null,
        atividade: atividadeData ? {
          atividade_id: atividadeData.atividade_id,
          nome_atividade: atividadeData.nome_atividade,
          created_at: atividadeData.created_at || atividadeData.data_atividade
        } : null
      };
    });

    // Salvar no cache
    this.lancamentosCache = { data: results, timestamp: now };

    return results;
  }

  /**
   * Limpa o cache de lançamentos
   * Útil após adicionar/editar/remover lançamentos
   */
  static clearLancamentosCache(): void {
    this.lancamentosCache = null;
  }
}
