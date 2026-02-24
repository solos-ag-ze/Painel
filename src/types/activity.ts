export interface ProdutoItem {
  id: string;
  nome: string;
  quantidade: string;
  unidade: string;
  produto_catalogo_id?: string | null;
}

export interface MaquinaItem {
  id: string;
  nome: string;
  horas: string; // horas inteiras como string para input
}

export interface ActivityPayload {
  id?: string;
  data_atividade?: string;
  created_at?: string;
  updated_at?: string;
  // `nome_talhao` mantém compatibilidade com formatos antigos (string),
  // `talhoes` é a lista de vínculos para múltiplos talhões (cada item tem `talhao_id`).
  nome_talhao?: string;
  talhoes?: { talhao_id: string }[];
  // alternativa simples: array de ids
  talhao_ids?: string[];
  produtos?: ProdutoItem[];
  maquinas?: MaquinaItem[];
  imagem?: File;
  arquivo?: File;
  observacoes?: string;
  descricao?: string;
  // responsáveis pela atividade (nome simples ou objeto com id opcional)
  responsaveis?: Array<{ id?: string; nome: string }>;
}

export type ActivityWithMeta = ActivityPayload & { is_completed?: boolean };
