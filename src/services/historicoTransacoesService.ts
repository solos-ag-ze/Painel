import { supabase } from '../lib/supabase';

/**
 * Interface que representa um registro de histórico de edição
 */
export interface HistoricoEdicao {
  id: string;
  id_transacao: string;
  id_transacao_pai?: string | null;
  user_id: string;
  nome_editor: string;
  dados_anteriores: Record<string, unknown>;
  dados_novos: Record<string, unknown>;
  campos_alterados: string[];
  editado_em: string;
}

/**
 * Interface para exibição formatada do histórico
 */
export interface HistoricoEdicaoFormatado {
  id: string;
  editadoEm: Date;
  nomeEditor: string;
  alteracoes: Array<{
    campo: string;
    valorAnterior: unknown;
    valorNovo: unknown;
  }>;
  /** Se true, é uma confirmação de transação (única alteração foi is_completed) */
  isConfirmacao?: boolean;
  /** Se true, é o registro de criação (snapshot no INSERT) */
  isCriacao?: boolean;
  /** Dados completos da transação (preenchido quando isConfirmacao = true) */
  dadosTransacao?: Record<string, unknown>;
}

/**
 * Service para gerenciar histórico de edições de transações financeiras.
 * Segue o padrão do projeto: métodos estáticos, nunca lança exceções.
 */
export class HistoricoTransacoesService {
  /**
   * Registra uma edição no histórico.
   * Calcula automaticamente quais campos foram alterados comparando dados anteriores e novos.
   * 
   * @param idTransacao - UUID da transação editada
   * @param userId - UUID do usuário que editou
   * @param nomeEditor - Nome do usuário que editou (evita JOINs na consulta)
   * @param dadosAnteriores - Objeto com os dados ANTES da edição
   * @param dadosNovos - Objeto com os dados DEPOIS da edição
   * @returns true se registrou com sucesso, false em caso de erro
   */
  static async registrarEdicao(
    idTransacao: string,
    userId: string,
    nomeEditor: string,
    dadosAnteriores: Record<string, unknown>,
    dadosNovos: Record<string, unknown>
  ): Promise<boolean> {
    try {
      // Calcular quais campos foram alterados
      const camposAlterados = this.calcularCamposAlterados(dadosAnteriores, dadosNovos);

      // Se não houve alteração real, não registra
      if (camposAlterados.length === 0) {
        console.log('HistoricoTransacoesService: Nenhum campo foi alterado, histórico não registrado');
        return true; // Não é um erro, apenas não havia o que registrar
      }

      // Verificar se é uma confirmação (única alteração é is_completed)
      const isConfirmacao = camposAlterados.length === 1 && 
        camposAlterados[0] === 'is_completed' &&
        dadosNovos['is_completed'] === true;

      let dadosAnterioresFiltrados: Record<string, unknown>;
      let dadosNovosFiltrados: Record<string, unknown>;

      if (isConfirmacao) {
        // Para confirmações, salvar todos os dados da transação
        dadosAnterioresFiltrados = this.filtrarCamposExibicao(dadosAnteriores);
        dadosNovosFiltrados = this.filtrarCamposExibicao(dadosNovos);
      } else {
        // Filtrar dados para incluir apenas campos relevantes (evita gravar campos internos)
        dadosAnterioresFiltrados = this.filtrarCamposRelevantes(dadosAnteriores, camposAlterados);
        dadosNovosFiltrados = this.filtrarCamposRelevantes(dadosNovos, camposAlterados);
      }

      const { error } = await supabase
        .from('historico_transacoes_financeiras')
        .insert({
          id_transacao: idTransacao,
          // tentar salvar o id_transacao_pai quando disponível (dados novos > anteriores)
          id_transacao_pai: dadosNovos['id_transacao_pai'] ?? dadosAnteriores['id_transacao_pai'] ?? null,
          user_id: userId,
          nome_editor: nomeEditor,
          dados_anteriores: dadosAnterioresFiltrados,
          dados_novos: dadosNovosFiltrados,
          campos_alterados: camposAlterados,
        });

      if (error) {
        console.error('HistoricoTransacoesService: Erro ao registrar edição:', error);
        return false;
      }

      console.log('HistoricoTransacoesService: Edição registrada com sucesso', {
        idTransacao,
        camposAlterados,
        nomeEditor,
        isConfirmacao,
      });

      return true;
    } catch (err) {
      console.error('HistoricoTransacoesService: Erro crítico ao registrar edição:', err);
      return false;
    }
  }

  /**
   * Busca o histórico de edições de uma transação específica.
   * Retorna ordenado por editado_em DESC (mais recente primeiro).
   * 
   * @param idTransacao - UUID da transação
   * @returns Array de registros de histórico ou array vazio em caso de erro
   */
  static async getHistoricoByTransacao(idTransacao: string): Promise<HistoricoEdicao[]> {
    try {
      // Primeiro, tentar descobrir se a transação é uma parcela (tem parent)
      let parentId: string | null = null;
      try {
        const txRes = await supabase
          .from('transacoes_financeiras')
          .select('id_transacao_pai')
          .eq('id_transacao', idTransacao)
          .limit(1)
          .single();
        if (!txRes.error && txRes.data) {
          parentId = txRes.data.id_transacao_pai || null;
        }
      } catch (e) {
        // ignore - fallback to simple query
      }

      let query;
      if (parentId) {
        // Se é parcela, buscar histórico da própria parcela e do pai (e também entradas onde parent_id aponta para o pai)
        query = supabase
          .from('historico_transacoes_financeiras')
          .select('*')
          .or(`id_transacao.eq.${idTransacao},id_transacao.eq.${parentId},id_transacao_pai.eq.${parentId}`)
          .order('editado_em', { ascending: false });
      } else {
        query = supabase
          .from('historico_transacoes_financeiras')
          .select('*')
          .or(`id_transacao.eq.${idTransacao},id_transacao_pai.eq.${idTransacao}`)
          .order('editado_em', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('HistoricoTransacoesService: Erro ao buscar histórico:', error);
        return [];
      }

      return (data || []) as HistoricoEdicao[];
    } catch (err) {
      console.error('HistoricoTransacoesService: Erro crítico ao buscar histórico:', err);
      return [];
    }
  }

  /**
   * Busca o histórico formatado para exibição no modal.
   * Converte os dados brutos em um formato mais amigável para o frontend.
   * 
   * @param idTransacao - UUID da transação
   * @returns Array formatado para exibição ou array vazio em caso de erro
   */
  static async getHistoricoFormatado(idTransacao: string): Promise<HistoricoEdicaoFormatado[]> {
    try {
      const historico = await this.getHistoricoByTransacao(idTransacao);

      // Categorizar eventos: criação (insert), confirmação (is_completed) e edições
      const criacoes: HistoricoEdicaoFormatado[] = [];
      const confirmacoes: HistoricoEdicaoFormatado[] = [];
      const edicoes: HistoricoEdicaoFormatado[] = [];

      for (const registro of historico) {
        const isConfirmacao = registro.campos_alterados.length === 1 &&
          registro.campos_alterados[0] === 'is_completed' &&
          registro.dados_novos['is_completed'] === true;

        const campos = Array.isArray(registro.campos_alterados) ? registro.campos_alterados : [];
        const isCriacao = campos.includes('criada') || campos.includes('insert') ||
          (registro.nome_editor === 'Sistema' && Object.keys(registro.dados_anteriores || {}).length === 0);

        if (isCriacao) {
          criacoes.push({
            id: registro.id,
            editadoEm: new Date(registro.editado_em),
            nomeEditor: registro.nome_editor,
            alteracoes: [],
            isCriacao: true,
            dadosTransacao: registro.dados_novos,
          });
          continue;
        }

        if (isConfirmacao) {
          confirmacoes.push({
            id: registro.id,
            editadoEm: new Date(registro.editado_em),
            nomeEditor: registro.nome_editor,
            alteracoes: [],
            isConfirmacao: true,
            dadosTransacao: registro.dados_novos,
          });
          continue;
        }

        // Mapear e formatar as alterações
        const alteracoesFormatadas = campos.map((campo) => ({
          campo: this.formatarNomeCampo(campo),
          valorAnterior: this.formatarValor(campo, registro.dados_anteriores?.[campo]),
          valorNovo: this.formatarValor(campo, registro.dados_novos?.[campo]),
        }));

        const alteracoesReais = alteracoesFormatadas.filter((alt) => alt.valorAnterior !== alt.valorNovo);

        if (alteracoesReais.length > 0) {
          edicoes.push({
            id: registro.id,
            editadoEm: new Date(registro.editado_em),
            nomeEditor: registro.nome_editor,
            alteracoes: alteracoesReais,
          });
        }
      }

      // Ordenar cada grupo por data (desc) e retornar na ordem requerida: Criado, Confirmado, Editado
      const sortDesc = (a: HistoricoEdicaoFormatado, b: HistoricoEdicaoFormatado) => b.editadoEm.getTime() - a.editadoEm.getTime();
      criacoes.sort(sortDesc);
      confirmacoes.sort(sortDesc);
      edicoes.sort(sortDesc);

      return [
        ...criacoes,
        ...confirmacoes,
        ...edicoes,
      ];
    } catch (err) {
      console.error('HistoricoTransacoesService: Erro ao formatar histórico:', err);
      return [];
    }
  }

  /**
   * Calcula quais campos foram alterados comparando dois objetos.
   * Ignora campos internos/técnicos que não devem ser rastreados.
   */
  private static calcularCamposAlterados(
    anterior: Record<string, unknown>,
    novo: Record<string, unknown>
  ): string[] {
    // Campos que não devem ser considerados como "alteração"
    const camposIgnorados = new Set([
      'id_transacao',
      'user_id',
      'created_at',
      'data_registro',
      'updated_at',
      'alocacoes', // Calculado separadamente
      'transacoes_talhoes', // Campo de relacionamento
      'talhao_id', // Usar nome_talhao para exibição amigável
    ]);

    const camposAlterados: string[] = [];

    // Pegar todas as chaves de ambos os objetos
    const todasChaves = new Set([
      ...Object.keys(anterior),
      ...Object.keys(novo),
    ]);

    for (const chave of todasChaves) {
      // Ignorar campos técnicos
      if (camposIgnorados.has(chave)) continue;

      const valorAnterior = anterior[chave];
      const valorNovo = novo[chave];

      // Comparar valores (tratando null/undefined como equivalentes)
      if (!this.valoresIguais(valorAnterior, valorNovo, chave)) {
        camposAlterados.push(chave);
      }
    }

    return camposAlterados;
  }

  /**
   * Compara dois valores considerando null/undefined como equivalentes
   * e tratando datas e números de forma especial.
   */
  private static valoresIguais(a: unknown, b: unknown, campo?: string): boolean {
    // Valores que devem ser tratados como "vazio"
    const valoresVazios = ['sem talhão específico', 'sem talhao especifico', 'nenhum', '-'];
    
    const isVazio = (v: unknown): boolean => {
      if (v === null || v === undefined || v === '') return true;
      const str = String(v).trim().toLowerCase();
      return valoresVazios.includes(str);
    };

    // Tratar null/undefined e valores equivalentes a vazio como iguais
    const aVazio = isVazio(a);
    const bVazio = isVazio(b);
    if (aVazio && bVazio) return true;
    if (aVazio !== bVazio) return false;

    // Comparar como string para evitar problemas com tipos
    let strA = String(a).trim();
    let strB = String(b).trim();

    // Campos que devem ser comparados case-insensitive
    const camposCaseInsensitive = ['tipo_transacao', 'status', 'categoria', 'tipo_pagamento'];
    if (campo && camposCaseInsensitive.includes(campo)) {
      strA = strA.toLowerCase();
      strB = strB.toLowerCase();
    }

    // Tentar comparar como números se ambos parecem numéricos
    const numA = Number(strA);
    const numB = Number(strB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA === numB;
    }

    return strA === strB;
  }

  /**
   * Filtra os dados para incluir apenas os campos alterados + alguns campos de contexto.
   */
  private static filtrarCamposRelevantes(
    dados: Record<string, unknown>,
    camposAlterados: string[]
  ): Record<string, unknown> {
    const resultado: Record<string, unknown> = {};

    for (const campo of camposAlterados) {
      if (campo in dados) {
        resultado[campo] = dados[campo];
      }
    }

    return resultado;
  }

  /**
   * Filtra os dados para exibição da transação completa (usado em confirmações).
   * Inclui apenas campos relevantes para visualização do usuário.
   */
  private static filtrarCamposExibicao(
    dados: Record<string, unknown>
  ): Record<string, unknown> {
    const camposExibicao = [
      'tipo_transacao',
      'descricao',
      'valor',
      'categoria',
      'data_transacao',
      'data_agendamento_pagamento',
      'pagador_recebedor',
      'forma_pagamento_recebimento',
      'forma_pagamento',
      'tipo_pagamento',
      'status',
      'nome_talhao',
      'area_vinculada',
      'numero_parcelas',
      'parcela',
      'observacao',
      'is_completed',
    ];

    const resultado: Record<string, unknown> = {};

    for (const campo of camposExibicao) {
      if (campo in dados && dados[campo] !== null && dados[campo] !== undefined && dados[campo] !== '') {
        resultado[campo] = dados[campo];
      }
    }

    return resultado;
  }

  /**
   * Formata o nome do campo para exibição amigável.
   */
  private static formatarNomeCampo(campo: string): string {
    const mapeamento: Record<string, string> = {
      descricao: 'Descrição',
      valor: 'Valor',
      categoria: 'Categoria',
      data_transacao: 'Data da transação',
      data_agendamento_pagamento: 'Data de pagamento',
      pagador_recebedor: 'Pagador/Recebedor',
      forma_pagamento_recebimento: 'Forma de pagamento',
      forma_pagamento: 'Forma de pagamento',
      tipo_pagamento: 'Condição',
      condicao_pagamento: 'Condição',
      status: 'Status',
      tipo_transacao: 'Tipo',
      numero_parcelas: 'Número de parcelas',
      parcela: 'Parcela',
      observacao: 'Observação',
      anexo_arquivo_url: 'Anexo',
      anexo_compartilhado_url: 'Anexo compartilhado',
      propriedade_id: 'Propriedade',
      area_vinculada: 'Área vinculada',
      is_completed: 'Confirmada',
      ativo: 'Ativo',
      talhao_id: 'Talhão',
      nome_talhao: 'Talhão',
    };

    return mapeamento[campo] || campo.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Formata o valor de um campo para exibição amigável.
   */
  private static formatarValor(campo: string, valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') {
      return '(vazio)';
    }

    // Formatar valores monetários
    if (campo === 'valor') {
      const num = Number(valor);
      if (!isNaN(num)) {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(num);
      }
    }

    // Formatar datas
    if (campo.includes('data') || campo.includes('_em')) {
      try {
        const strValor = String(valor);
        // Se já está no formato YYYY-MM-DD, formata diretamente sem conversão de timezone
        if (/^\d{4}-\d{2}-\d{2}$/.test(strValor)) {
          const [ano, mes, dia] = strValor.split('-');
          return `${dia}/${mes}/${ano}`;
        }
        // Fallback para outros formatos
        const date = new Date(strValor);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        }
      } catch {
        // Se falhar, retorna valor original
      }
    }

    // Formatar booleanos
    if (campo === 'is_completed' || campo === 'ativo') {
      return valor === true ? 'Sim' : 'Não';
    }

    // Normalizar tipo_transacao para exibição capitalizada
    if (campo === 'tipo_transacao') {
      const str = String(valor).toLowerCase();
      if (str === 'gasto') return 'Gasto';
      if (str === 'receita') return 'Receita';
    }

    // Normalizar tipo_pagamento para exibição consistente
    if (campo === 'tipo_pagamento') {
      const str = String(valor).toLowerCase();
      if (str === 'à vista' || str === 'a vista') return 'À Vista';
      if (str === 'parcelado') return 'Parcelado';
    }

    return String(valor);
  }
}
