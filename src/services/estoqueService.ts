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
  lote: string | null;
  validade: string | null;
  created_at?: string;
  fornecedor?: string | null;
  registro_mapa?: string | null;
  unidade_valor_original?: string | null; // unidade que o valor foi originalmente inserido
  quantidade_inicial: number; // quantidade original informada no cadastro
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

    const { data, error } = await supabase
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

  static async calcularValorTotalEstoque(): Promise<number> {
    const userId = await this.getCurrentUserId();

    const { data: produtos, error: produtosError } = await supabase
      .from('estoque_de_produtos')
      .select('id, valor_total, valor_unitario, quantidade_em_estoque, quantidade_inicial, unidade_de_medida, unidade_valor_original')
      .eq('user_id', userId);

    if (produtosError) {
      console.error('❌ Erro ao buscar produtos para cálculo:', produtosError);
      throw produtosError;
    }

    if (!produtos || produtos.length === 0) {
      console.log('📦 Nenhum produto encontrado no estoque');
      return 0;
    }

    let valorTotalProdutos = 0;
    for (const produto of produtos) {
      const valorTotalProduto = Number(produto.valor_total) || 0;
      valorTotalProdutos += valorTotalProduto;
    }

    console.log(`💰 Valor total inicial dos produtos: R$ ${valorTotalProdutos.toFixed(2)}`);

    const { data: movimentacoes, error: movimentacoesError } = await supabase
      .from('movimentacoes_estoque')
      .select('produto_id, tipo, quantidade')
      .eq('user_id', userId);

    if (movimentacoesError) {
      console.error('❌ Erro ao buscar movimentações:', movimentacoesError);
      throw movimentacoesError;
    }

    let valorSaidas = 0;
    let valorEntradas = 0;

    if (movimentacoes && movimentacoes.length > 0) {
      console.log(`📊 Processando ${movimentacoes.length} movimentações`);

      for (const mov of movimentacoes) {
        const produto = produtos.find(p => p.id === mov.produto_id);

        if (produto && produto.valor_total) {
          const quantidadeMovimento = Number(mov.quantidade) || 0;
          const valorTotal = Number(produto.valor_total) || 0;
          const quantidadeInicial = Number((produto as any).quantidade_inicial) || 1;
          
          // Calcular proporção: (valor_total / quantidade_inicial) × quantidade_movimento
          const valorMovimento = (valorTotal / quantidadeInicial) * quantidadeMovimento;

          if (mov.tipo === 'saida') {
            valorSaidas += valorMovimento;
            console.log(`  ➖ Saída: ${quantidadeMovimento} × (R$ ${valorTotal.toFixed(2)} / ${quantidadeInicial}) = R$ ${valorMovimento.toFixed(2)}`);
          } else if (mov.tipo === 'entrada') {
            valorEntradas += valorMovimento;
            console.log(`  ➕ Entrada: ${quantidadeMovimento} × (R$ ${valorTotal.toFixed(2)} / ${quantidadeInicial}) = R$ ${valorMovimento.toFixed(2)}`);
          }
        } else {
          console.warn(`⚠️ Produto ${mov.produto_id} não encontrado ou sem valor total`);
        }
      }
    } else {
      console.log('📊 Nenhuma movimentação encontrada');
    }

    const { data: lancamentos, error: lancamentosError } = await supabase
      .from('lancamento_produtos')
      .select('produto_id, quantidade_val, quantidade_un')
      .in('produto_id', produtos.map(p => p.id));

    let valorProdutosUsados = 0;

    if (lancamentosError) {
      console.warn('⚠️ Erro ao buscar lançamentos de produtos:', lancamentosError);
    } else if (lancamentos && lancamentos.length > 0) {
      console.log(`🌾 Processando ${lancamentos.length} produtos usados em atividades`);

      for (const lancamento of lancamentos) {
        const produto = produtos.find(p => p.id === lancamento.produto_id);

        if (produto && produto.valor_total) {
          const quantidadeUsada = Number(lancamento.quantidade_val) || 0;
          const valorTotal = Number(produto.valor_total) || 0;
          const quantidadeInicial = Number((produto as any).quantidade_inicial) || 1;

          // Calcular proporção: (valor_total / quantidade_inicial) × quantidade_usada
          const valorUsado = (valorTotal / quantidadeInicial) * quantidadeUsada;
          valorProdutosUsados += valorUsado;

          console.log(`  🌱 Produto usado: ${quantidadeUsada} × (R$ ${valorTotal.toFixed(2)} / ${quantidadeInicial}) = R$ ${valorUsado.toFixed(2)}`);
        }
      }
    } else {
      console.log('🌾 Nenhum produto usado em atividades encontrado');
    }

    console.log(`💸 Total de saídas: R$ ${valorSaidas.toFixed(2)}`);
    console.log(`💵 Total de entradas adicionais: R$ ${valorEntradas.toFixed(2)}`);
    console.log(`🌾 Total de produtos usados: R$ ${valorProdutosUsados.toFixed(2)}`);

    const valorTotalEstoque = valorTotalProdutos + valorEntradas - valorSaidas - valorProdutosUsados;

    console.log(`🏦 Valor total em estoque: R$ ${Math.max(0, valorTotalEstoque).toFixed(2)}`);

    return Math.max(0, valorTotalEstoque);
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
  }): Promise<ProdutoEstoque> {
    const userId = await this.getCurrentUserId();
    
    // ✅ Buscar propriedade ativa do usuário
    const propriedadeId = await this.getPropriedadeIdDoUsuario(userId);

    const valorTotal = produto.valor || 0;
    
    // ✅ Converter quantidade para unidade padrão (mg para massa, mL para volume)
    const converted = convertToStandardUnit(produto.quantidade, produto.unidade);
    
    // ✅ Valor unitário REAL na unidade ORIGINAL (sem conversão)
    // Exemplo: R$ 5.000 ÷ 1000 kg = R$ 5/kg
    const valorUnitario = produto.quantidade > 0 
      ? valorTotal / produto.quantidade 
      : 0;

    console.log('📊 Cadastro de produto COM CONVERSÃO para unidade padrão:');
    console.log(`  - Entrada usuário: ${produto.quantidade} ${produto.unidade}`);
    console.log(`  - Conversão: ${converted.quantidade} ${converted.unidade}`);
    console.log(`  - Valor total: R$ ${valorTotal.toFixed(2)}`);
    console.log(`  - Valor unitário: R$ ${valorUnitario.toFixed(2)}/${produto.unidade}`);
    console.log(`  - Propriedade ID: ${propriedadeId || 'N/A'}`);

    const { data, error } = await supabase
      .from('estoque_de_produtos')
      .insert([
        {
          user_id: userId,
          propriedade_id: propriedadeId,
          nome_do_produto: produto.nome_produto,
          marca_ou_fabricante: produto.marca,
          categoria: produto.categoria,
          // ✅ Salvar em unidade PADRÃO (mg/mL)
          unidade_de_medida: converted.unidade,
          quantidade_em_estoque: converted.quantidade,
          quantidade_inicial: converted.quantidade,
          // ✅ Valor unitário na unidade original
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          unidade_valor_original: produto.unidade,
          lote: produto.lote,
          validade: produto.validade || '1999-12-31',
          fornecedor: produto.fornecedor,
          registro_mapa: produto.registro_mapa,
          // ✅ Tipo de movimentação inicial sempre é 'entrada'
          tipo_de_movimentacao: 'entrada',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao adicionar produto:', error);
      throw error;
    }

    console.log('✅ Produto cadastrado com sucesso no banco de dados');

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

  static async atualizarQuantidade(id: number, novaQuantidade: number): Promise<void> {
    const { error } = await supabase
      .from('estoque_de_produtos')
      .update({ quantidade_em_estoque: novaQuantidade })
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao atualizar quantidade:', error);
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
    const propriedadeId = await this.getPropriedadeIdDoUsuario(userId);

    console.log('🔄 Iniciando remoção FIFO (novo sistema):', {
      produto: nomeProduto,
      quantidadeRemover,
      observacao,
      entradaIds: entradaIds,
      entradaIdsCount: entradaIds?.length
    });

    // Buscar todas as ENTRADAS deste produto, ordenadas por created_at (FIFO)
    let query = supabase
      .from('estoque_de_produtos')
      .select('*')
      .eq('user_id', userId)
      .or('tipo_de_movimentacao.eq.entrada,tipo_de_movimentacao.is.null') // Entradas ou legado (null = entrada)
      .order('created_at', { ascending: true }); // Mais antigos primeiro (FIFO)

    // Se tivermos IDs específicos, usamos eles (mais seguro)
    if (entradaIds && entradaIds.length > 0) {
      query = query.in('id', entradaIds);
    } else {
      // Fallback para busca por nome se não tiver IDs
      query = query.ilike('nome_do_produto', nomeProduto);
    }

    const { data: entradas, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Erro ao buscar entradas para remoção FIFO:', fetchError);
      throw fetchError;
    }

    if (!entradas || entradas.length === 0) {
      console.warn('⚠️ Nenhuma entrada encontrada. IDs procurados:', entradaIds);
      throw new Error('Nenhuma entrada encontrada para este produto.');
    }
    
    console.log(`✅ Encontradas ${entradas.length} entradas para processar.`);

    // Buscar todas as SAÍDAS e APLICAÇÕES já existentes para calcular saldo de cada entrada
    let querySaidas = supabase
      .from('estoque_de_produtos')
      .select('*')
      .eq('user_id', userId)
      // ⚠️ IMPORTANTE: Ignorar 'aplicacao' aqui para alinhar com o frontend (agruparProdutosService)
      // O frontend ignora 'aplicacao' da tabela estoque_de_produtos e usa apenas lancamento_produtos
      // Se incluirmos 'aplicacao' aqui, podemos contar duas vezes ou divergir do saldo exibido
      .eq('tipo_de_movimentacao', 'saida');

    if (entradaIds && entradaIds.length > 0) {
      querySaidas = querySaidas.in('entrada_referencia_id', entradaIds);
    } else {
      querySaidas = querySaidas.ilike('nome_do_produto', nomeProduto);
    }

    const { data: saidasExistentes, error: saidasError } = await querySaidas;

    if (saidasError) {
      console.error('❌ Erro ao buscar saídas existentes:', saidasError);
      throw saidasError;
    }
    
    // Buscar lançamentos (tabela antiga) para abater do saldo
    // Isso garante consistência com o painel que subtrai lançamentos
    let lancamentos: LancamentoProdutoEntry[] = [];
    try {
      lancamentos = await EstoqueService.getLancamentosPorProdutos(entradas.map(e => e.id));
    } catch (err) {
      console.warn('⚠️ Erro ao buscar lançamentos (ignorando):', err);
    }

    // Calcular saldo disponível por entrada
    // Saldo = quantidade_em_estoque da entrada - soma das saídas referenciando essa entrada - lançamentos
    const saldoPorEntrada: Map<number, number> = new Map();
    
    for (const entrada of entradas) {
      // 1. Subtrair saídas/aplicações da tabela estoque_de_produtos
      const saidasDestaEntrada = (saidasExistentes || []).filter(
        (s: any) => s.entrada_referencia_id === entrada.id
      );
      const totalSaido = saidasDestaEntrada.reduce(
        (sum: number, s: any) => sum + (s.quantidade_em_estoque || 0), 
        0
      );
      
      // 2. Subtrair lançamentos da tabela lancamento_produtos
      const lancamentosDestaEntrada = lancamentos.filter(l => Number(l.produto_id) === entrada.id);
      let totalLancado = 0;
      lancamentosDestaEntrada.forEach(l => {
         const qtd = l.quantidade_val || 0;
         const und = l.quantidade_un || 'un';
         // Converter para a unidade da entrada (que deve ser a padrão mg/mL)
         if (entrada.unidade_de_medida) {
            totalLancado += convertBetweenUnits(qtd, und, entrada.unidade_de_medida);
         }
      });

      const saldo = (entrada.quantidade_em_estoque || 0) - totalSaido - totalLancado;
      saldoPorEntrada.set(entrada.id, Math.max(0, saldo));
      
      console.log(`   📦 Entrada ID ${entrada.id} (${entrada.nome_do_produto}):`);
      console.log(`      Inicial: ${entrada.quantidade_em_estoque}`);
      console.log(`      - Saídas: ${totalSaido}`);
      console.log(`      - Lançamentos: ${totalLancado}`);
      console.log(`      = Saldo: ${saldo}`);
      
      if (saidasDestaEntrada.length > 0) {
        console.log(`      🔻 Saídas detalhadas:`, saidasDestaEntrada.map((s: any) => `${s.id} (${s.tipo_de_movimentacao}): ${s.quantidade_em_estoque}`));
      }
    }

    // Determinar unidade de referência
    const primeiraEntrada = entradas[0];
    const unidadeReferencia = unidadeValorGrupo || primeiraEntrada.unidade_valor_original || primeiraEntrada.unidade_de_medida;
    
    // Converter quantidade a remover para unidade padrão (mg/mL)
    const converted = convertToStandardUnit(quantidadeRemover, unidadeReferencia);
    const quantidadeRemoverPadrao = converted.quantidade;

    console.log('🔄 Conversão para unidade padrão:', {
      quantidadeOriginal: quantidadeRemover,
      unidadeReferencia,
      quantidadePadrao: quantidadeRemoverPadrao,
      unidadePadrao: converted.unidade
    });

    let quantidadeRestante = quantidadeRemoverPadrao;

    // Processar FIFO: remover das entradas mais antigas primeiro
    for (const entrada of entradas) {
      if (quantidadeRestante <= 0) break;

      const saldoDisponivel = saldoPorEntrada.get(entrada.id) || 0;
      if (saldoDisponivel <= 0) continue; // Entrada já esgotada

      const quantidadeARemover = Math.min(quantidadeRestante, saldoDisponivel);

      console.log(`  🔹 Criando saída da entrada ID ${entrada.id}:`, {
        saldoDisponivel,
        quantidadeARemover,
        created_at: entrada.created_at,
      });

      // Criar registro de SAÍDA referenciando esta entrada
      const valorUnitario = mediaPrecoGrupo ?? entrada.valor_medio ?? entrada.valor_unitario ?? null;
      
      // ✅ Calcular valor_total corretamente: converter quantidade de mg/mL para unidade_valor_original
      let valorTotal = null;
      if (valorUnitario) {
        const unidadeDoValor = unidadeValorGrupo || entrada.unidade_valor_original || entrada.unidade_de_medida;
        const unidadePadrao = entrada.unidade_de_medida; // mg ou mL
        
        // Converter quantidadeARemover (em mg/mL) para unidade_valor_original
        const quantidadeNaUnidadeDoValor = convertFromStandardUnit(
          quantidadeARemover,
          unidadePadrao,
          unidadeDoValor
        );
        
        valorTotal = valorUnitario * quantidadeNaUnidadeDoValor;
        
        console.log(`  💰 Cálculo valor: ${valorUnitario} × ${quantidadeNaUnidadeDoValor} ${unidadeDoValor} = R$ ${valorTotal.toFixed(2)}`);
      }
      
      const { error: insertError } = await supabase
        .from('estoque_de_produtos')
        .insert({
          user_id: userId,
          propriedade_id: propriedadeId,
          nome_do_produto: entrada.nome_do_produto,
          marca_ou_fabricante: entrada.marca_ou_fabricante,
          categoria: entrada.categoria,
          unidade_de_medida: entrada.unidade_de_medida, // Mesma unidade da entrada (mg/mL)
          quantidade_em_estoque: quantidadeARemover,    // Quantidade removida
          quantidade_inicial: quantidadeARemover,
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          unidade_valor_original: unidadeValorGrupo || entrada.unidade_valor_original,
          lote: entrada.lote,
          validade: entrada.validade,
          fornecedor: entrada.fornecedor,
          registro_mapa: entrada.registro_mapa,
          tipo_de_movimentacao: 'saida',
          entrada_referencia_id: entrada.id,           // Referência à entrada (FIFO)
          produto_id: entrada.produto_id,              // Mesmo produto_id do grupo
          observacoes_das_movimentacoes: observacao || null,
        });

      if (insertError) {
        console.error('❌ Erro ao criar registro de saída:', insertError);
        throw insertError;
      }

      quantidadeRestante -= quantidadeARemover;
      console.log(`  ✅ Saída criada. Restante a remover: ${quantidadeRestante}`);
    }

    // Verificar se conseguiu remover tudo (com tolerância)
    const TOLERANCE = 10000; // 10.000 mg ou 10 mL
    if (quantidadeRestante > TOLERANCE) {
      console.warn('⚠️ Quantidade solicitada excede o estoque disponível.');
      throw new Error('Quantidade solicitada excede o estoque disponível.');
    }

    console.log('✅ Remoção FIFO concluída com sucesso!');
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
  static async getMovimentacoesPorProdutos(produtoIds: (number | string)[]): Promise<MovimentacaoEstoque[]> {
    if (!produtoIds || produtoIds.length === 0) return [];
    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select('*')
      .in('produto_id', produtoIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar movimentações por produtos:', error);
      throw error;
    }

    return (data || []) as MovimentacaoEstoque[];
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
