import { supabase } from '../lib/supabase';

export class CadastroProdutosService {
  /**
   * Retorna lista de produtos do catálogo (`cadastro_produtos`).
   * Sempre retorna array ([]) em caso de erro.
   */
  static async getProdutosCadastro(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('cadastro_produtos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao buscar cadastro_produtos:', error);
        return [];
      }

      const rows = data || [];
      // Normalizar campos para o shape esperado pelo frontend
      const mapped = (rows as any[]).map(r => ({
        ...r,
        nome_produto: r.nome ?? r.nome_produto ?? '',
        marca_ou_fabricante: r.marca_ou_fabricante ?? r.marca ?? null,
        unidade_base: r.unidade_base ?? r.unidade ?? null,
      }));

      return mapped;
    } catch (e) {
      console.error('Erro inesperado ao buscar cadastro_produtos:', e);
      return [];
    }
  }
}

export default CadastroProdutosService;
