// src/services/estoqueService.ts
import { supabase } from '../lib/supabase';
import { AuthService } from './authService';

export interface ProdutoEstoque {
  id: number;
  user_id: string;
  nome_produto: string;
  marca: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  valor: number | null; // valor que vem de "valor_unitario" no banco
  lote: string | null;
  validade: string | null;
  created_at?: string;
  fornecedor?: string | null;       // <--- novo
  registro_mapa?: string | null; // <--- novo
}

export interface MovimentacaoEstoque {
  id: number;
  produto_id: number;
  user_id: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  observacao: string | null;
  created_at: string;
}

export class EstoqueService {
  private static getCurrentUserId(): string {
    const authService = AuthService.getInstance();
    const user = authService.getCurrentUser();
    if (!user) throw new Error("⚠️ Usuário não autenticado!");
    return user.user_id;
  }

  // SELECT → busca e normaliza nomes do banco
  static async getProdutos(): Promise<ProdutoEstoque[]> {
    const userId = this.getCurrentUserId();

    const { data, error } = await supabase
      .from('estoque_de_produtos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar produtos:', error);
      throw error;
    }

    return (data ?? []).map((r: any): ProdutoEstoque => ({
      id: r.id,
      user_id: r.user_id,
      nome_produto: r.nome_do_produto ?? '',
      marca: r.marca_ou_fabricante ?? '',
      categoria: r.categoria ?? 'Outro',
      unidade: r.unidade_de_medida ?? '',
      quantidade: Number(r.quantidade_em_estoque ?? 0),
      valor: r.valor_unitario != null ? Number(r.valor_unitario) : null,
      lote: r.lote ?? null,
      validade: r.validade ?? null,
      created_at: r.created_at ?? undefined,
      fornecedor: r.fornecedor ?? null,            // <--- novo
      registro_mapa: r.registro_mapa ?? null // <--- novo
    }));
  }

  // INSERT → usa os nomes REAIS da tabela
  static async addProduto(
    produto: Omit<ProdutoEstoque, 'id' | 'user_id' | 'created_at'>
  ): Promise<ProdutoEstoque> {
    const userId = this.getCurrentUserId();

    const payload = {
      user_id: userId,
      nome_do_produto: produto.nome_produto,
      marca_ou_fabricante: produto.marca,
      categoria: produto.categoria,
      unidade_de_medida: produto.unidade,
      quantidade_em_estoque: produto.quantidade,
      valor_unitario: produto.valor,
      lote: produto.lote,
      validade: produto.validade,
      fornecedor: produto.fornecedor,            // <--- novo
      registro_mapa: produto.registro_mapa // <--- novo
    };

    const { data, error } = await supabase
      .from('estoque_de_produtos')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('❌ Erro ao inserir produto:', error);
      throw error;
    }

    return {
      id: data.id,
      user_id: data.user_id,
      nome_produto: data.nome_do_produto,
      marca: data.marca_ou_fabricante,
      categoria: data.categoria,
      unidade: data.unidade_de_medida ?? '',
      quantidade: Number(data.quantidade_em_estoque ?? 0),
      valor: data.valor_unitario != null ? Number(data.valor_unitario) : null,
      lote: data.lote ?? null,
      validade: data.validade ?? null,
      created_at: data.created_at ?? undefined,
      fornecedor: data.fornecedor ?? null,            // <--- novo
      registro_mapa: data.registro_mapa ?? null // <--- novo
    };
  }

  // UPDATE → remover quantidade
  static async removerQuantidade(
    produtoId: number,
    quantidade: number,
    observacao?: string
  ): Promise<ProdutoEstoque> {
    const userId = this.getCurrentUserId();

    // 1) Buscar produto atual
    const { data: produto, error: fetchError } = await supabase
      .from('estoque_de_produtos')
      .select('*')
      .eq('id', produtoId)
      .single();
  
    if (fetchError || !produto) {
      throw new Error('Produto não encontrado');
    }
  
    // 2) Calcular nova quantidade
    const atual = Number(produto.quantidade_em_estoque ?? 0);
    const novaQtd = atual - quantidade;
    if (novaQtd < 0) {
      throw new Error('Quantidade a remover maior que a disponível');
    }
  
    // 3) Persistir a nova quantidade
    const { data, error } = await supabase
      .from('estoque_de_produtos')
      .update({ quantidade_em_estoque: novaQtd })
      .eq('id', produtoId)
      .select('*')
      .single();
  
    if (error || !data) {
      console.error('❌ Erro ao atualizar quantidade:', error);
      throw error || new Error('Erro ao atualizar');
    }
  
    // 4) Registrar a movimentação (saida)
    await this.registrarMovimentacao(produtoId, 'saida', quantidade, observacao);
  
    // 5) Retornar o produto normalizado
    return {
      id: data.id,
      user_id: data.user_id,
      nome_produto: data.nome_do_produto,
      marca: data.marca_ou_fabricante,
      categoria: data.categoria,
      unidade: data.unidade_de_medida,
      quantidade: Number(data.quantidade_em_estoque ?? 0),
      valor: data.valor_unitario != null ? Number(data.valor_unitario) : null,
      lote: data.lote ?? null,
      validade: data.validade ?? null,
      created_at: data.created_at ?? undefined,
      fornecedor: data.fornecedor ?? null,            // <--- novo
      registro_mapa: data.registro_mapa ?? null // <--- novo
    };
  }

  // INSERT → registra movimentação de estoque
  static async registrarMovimentacao(
    produtoId: number,
    tipo: 'entrada' | 'saida',
    quantidade: number,
    observacao?: string
  ): Promise<void> {
    const userId = this.getCurrentUserId();

    console.log("🔎 Inserindo movimentação:", { produtoId, userId, tipo, quantidade, observacao });

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

  // SELECT → busca movimentações com paginação
  static async getMovimentacoes(
    produtoId: number,
    page = 1,
    pageSize = 20
  ): Promise<{ items: MovimentacaoEstoque[]; total: number; totais: { entradas: number; saidas: number } }> {
    const userId = this.getCurrentUserId();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('movimentacoes_estoque')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('produto_id', produtoId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('❌ Erro ao buscar movimentações:', error);
      throw error;
    }

    let entradas = 0, saidas = 0;
    for (const m of data ?? []) {
      if (m.tipo === 'entrada') entradas += Number(m.quantidade);
      else if (m.tipo === 'saida') saidas += Number(m.quantidade);
    }

    return {
      items: (data ?? []) as MovimentacaoEstoque[],
      total: count ?? 0,
      totais: { entradas, saidas },
    };
  }
}
