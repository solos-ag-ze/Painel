// src/services/estoqueService.ts
import { supabase } from '../lib/supabase';
import { AuthService } from './authService';

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
  lote: string | null;
  validade: string | null;
  fornecedor: string | null;
  registro_mapa: string | null;
  produto_created_at: string;
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
        registro_mapa
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

    const { error } = await supabase
      .from('estoque_de_produtos')
      .insert([
        {
          user_id: userId,
          nome_do_produto: nome,
          marca_ou_fabricante: marca,
          categoria,
          unidade_de_medida: unidade,
          quantidade_em_estoque: quantidade,
          valor_unitario: valor,
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

    const { data, error } = await supabase
      .from('estoque_de_produtos')
      .insert([
        {
          user_id: userId,
          nome_do_produto: produto.nome_produto,
          marca_ou_fabricante: produto.marca,
          categoria: produto.categoria,
          unidade_de_medida: produto.unidade,
          quantidade_em_estoque: produto.quantidade,
          valor_unitario: produto.valor,
          lote: produto.lote,
          validade: produto.validade || '1999-12-31', // Data padrão se vazio
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

    // Mapear resposta para o formato esperado
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
}
