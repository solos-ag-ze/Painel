// src/services/estoqueService.ts
import { supabase } from '../lib/supabase';
import { AuthService } from './authService';
import { ActivityService } from './activityService';
import { convertToStandardUnit, convertFromStandardUnit } from '../lib/unitConverter';

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
}

export interface MovimentacaoEstoque {
  id: number;
  produto_id: number;
  user_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  observacao?: string | null;
  created_at: string;
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
        unidade_valor_original
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      throw error;
    }

    // Mapear nomes das colunas
    const produtosMapeados: ProdutoEstoque[] = (data || []).map(produto => ({
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
    }));

    return produtosMapeados;
  }

  static async calcularValorTotalEstoque(): Promise<number> {
    const userId = await this.getCurrentUserId();

    const { data: produtos, error: produtosError } = await supabase
      .from('estoque_de_produtos')
      .select('id, valor_total, valor_unitario, quantidade_em_estoque, unidade_de_medida, unidade_valor_original')
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

        if (produto && produto.valor_unitario) {
          const quantidade = Number(mov.quantidade) || 0;
          const valorUnitario = Number(produto.valor_unitario) || 0;
          const valorMovimento = quantidade * valorUnitario;

          if (mov.tipo === 'saida') {
            valorSaidas += valorMovimento;
            console.log(`  ➖ Saída: ${quantidade} × R$ ${valorUnitario.toFixed(2)} = R$ ${valorMovimento.toFixed(2)}`);
          } else if (mov.tipo === 'entrada') {
            valorEntradas += valorMovimento;
            console.log(`  ➕ Entrada: ${quantidade} × R$ ${valorUnitario.toFixed(2)} = R$ ${valorMovimento.toFixed(2)}`);
          }
        } else {
          console.warn(`⚠️ Produto ${mov.produto_id} não encontrado ou sem valor unitário`);
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

        if (produto && produto.valor_unitario) {
          const quantidadeUsada = Number(lancamento.quantidade_val) || 0;
          const unidadeLancamento = lancamento.quantidade_un || produto.unidade_de_medida;
          const valorUnitario = Number(produto.valor_unitario) || 0;
          const unidadeValorOriginal = produto.unidade_valor_original || produto.unidade_de_medida;

          let quantidadeConvertida = quantidadeUsada;

          if (unidadeLancamento !== unidadeValorOriginal) {
            quantidadeConvertida = convertFromStandardUnit(
              quantidadeUsada,
              unidadeLancamento,
              unidadeValorOriginal
            );
          }

          const valorUsado = quantidadeConvertida * valorUnitario;
          valorProdutosUsados += valorUsado;

          console.log(`  🌱 Produto usado: ${quantidadeUsada} ${unidadeLancamento} → ${quantidadeConvertida.toFixed(2)} ${unidadeValorOriginal} × R$ ${valorUnitario.toFixed(2)} = R$ ${valorUsado.toFixed(2)}`);
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

    const converted = convertToStandardUnit(produto.quantidade, produto.unidade);
    const valorTotal = produto.valor || 0;
    const valorUnitario = produto.quantidade > 0 ? valorTotal / produto.quantidade : 0;

    console.log('📊 Cálculo de valores do produto:');
    console.log(`  - Quantidade original: ${produto.quantidade} ${produto.unidade}`);
    console.log(`  - Quantidade convertida: ${converted.quantidade} ${converted.unidade}`);
    console.log(`  - Valor total informado: R$ ${valorTotal.toFixed(2)}`);
    console.log(`  - Valor unitário calculado: R$ ${valorUnitario.toFixed(6)} por ${produto.unidade}`);

    const { data, error } = await supabase
      .from('estoque_de_produtos')
      .insert([
        {
          user_id: userId,
          nome_do_produto: produto.nome_produto,
          marca_ou_fabricante: produto.marca,
          categoria: produto.categoria,
          unidade_de_medida: converted.unidade,
          quantidade_em_estoque: converted.quantidade,
          valor_unitario: valorUnitario,
          valor_total: valorTotal,
          unidade_valor_original: produto.unidade,
          lote: produto.lote,
          validade: produto.validade || '1999-12-31',
          fornecedor: produto.fornecedor,
          registro_mapa: produto.registro_mapa,
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
    observacao?: string
  ): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { error } = await supabase
      .from('movimentacoes_estoque')
      .insert([
        {
          produto_id: produtoId,
          user_id: userId,
          tipo,
          quantidade,
          observacao: observacao || null,
        },
      ]);

    if (error) {
      console.error('❌ Erro ao registrar movimentação:', error);
      throw error;
    }
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
      unidade: mov.produto.unidade_de_medida,
      valor: mov.produto.valor_unitario,
      unidade_valor_original: mov.produto.unidade_valor_original,
      lote: mov.produto.lote,
      validade: mov.produto.validade,
      fornecedor: mov.produto.fornecedor,
      registro_mapa: mov.produto.registro_mapa,
      produto_created_at: mov.produto.created_at,
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

    // Busca registros em lancamento_produtos primeiro
    const { data: rows, error } = await supabase
      .from('lancamento_produtos')
      .select('id, atividade_id, produto_id, quantidade_val, quantidade_un, observacao, created_at')
      .in('produto_id', produtoIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar registros de lancamento_produtos (query direta):', error);
      // fallback: buscar lançamentos via ActivityService.getLancamentos e filtrar produtos
      try {
        const userId = await this.getCurrentUserId();
        // traz lançamentos do usuário (limit razoável)
        const activities = await ActivityService.getLancamentos(userId, 500);
        const resultsFallback: LancamentoProdutoEntry[] = [];
        for (const act of activities) {
          const produtos = (act as any).produtos || [];
          for (const p of produtos) {
            if (produtoIds.includes(p.produto_id)) {
              resultsFallback.push({
                id: p.id,
                atividade_id: act.atividade_id,
                produto_id: p.produto_id,
                quantidade_val: p.quantidade_val,
                quantidade_un: p.quantidade_un,
                observacao: p.observacao,
                created_at: p.created_at || act.created_at || act.data_atividade,
                atividade: { atividade_id: act.atividade_id, nome_atividade: act.nome_atividade, created_at: act.created_at || act.data_atividade }
              });
            }
          }
        }

        return resultsFallback;
      } catch (fbErr) {
        console.error('❌ Fallback falhou ao buscar lançamentos via ActivityService:', fbErr);
        throw error; // rethrow original
      }
    }

    const results: LancamentoProdutoEntry[] = [];

    // Para cada registro, busca a atividade completa para obter nome_atividade e created_at
    for (const row of (rows || []) as any[]) {
      const atividade_id = row.atividade_id as string | undefined;
      let atividade: any = null;
      if (atividade_id) {
        try {
          atividade = await ActivityService.getLancamentoById(atividade_id);
        } catch (err) {
          console.error(`Erro ao buscar atividade ${atividade_id}:`, err);
        }
      }

      results.push({
        id: row.id,
        atividade_id: row.atividade_id,
        produto_id: row.produto_id,
        quantidade_val: row.quantidade_val,
        quantidade_un: row.quantidade_un,
        observacao: row.observacao,
        created_at: row.created_at,
        atividade: atividade ? { atividade_id: atividade.atividade_id, nome_atividade: atividade.nome_atividade, created_at: atividade.created_at || atividade.data_atividade } : null,
      });
    }

    return results;
  }
}
