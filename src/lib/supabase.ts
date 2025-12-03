// src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const serviceRole = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// 🔧 Detecta ambiente de desenvolvimento
const isDevelopment = () => {
  if (import.meta.env.MODE === 'development') return true;
  if (import.meta.env.VITE_ZE_AMBIENTE === 'development') return true;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      return true;
    }
  }
  if (import.meta.env.DEV === true) return true;
  return false;
};

const DEV_MODE = isDevelopment();

// 🔑 Em desenvolvimento, use service role para bypass de RLS
// Em produção, use anon key (RLS será aplicado baseado no JWT do n8n)
const apiKey = DEV_MODE && serviceRole ? serviceRole : anon;

console.log('🔧 Supabase Client Mode:', {
  mode: import.meta.env.MODE,
  isDev: DEV_MODE,
  usingServiceRole: DEV_MODE && !!serviceRole
});

// Singleton Supabase client
export const supabase: SupabaseClient = createClient(url, apiKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

// Helper para injetar o token do n8n em PRODUÇÃO
export async function setAccessToken(token: string) {
  const { error } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: 'dummy-refresh', // 🔑 precisa ser não vazio
  });

  if (error) {
    console.error('❌ Falha ao setar token no Supabase:', error.message);
    throw error;
  }

  console.log('🔑 JWT custom injetado no Supabase para RLS');
}

// ------------------
// Tipagens do schema
// ------------------

export interface Usuario {
  user_id: string;
  nome: string;
  telefone?: string;
  cidade?: string;
  cultura?: string;
  estado?: string;
  pais?: string;
  status?: string;
  tamanho_area?: string;
  cafe_com_ze: boolean;
  created_at?: string;
}

export interface CotacaoDiariaCafe {
  id: number;
  cultura: string;
  municipio: string;
  preco: string;      // ex: "R$1.959,00"
  variacao: string;   // ex: "+1,03"
}

export interface TransacaoFinanceira {
  id_transacao: string;
  id_lancamento?: string;
  user_id: string;
  tipo_transacao: string;
  valor: number;
  data_transacao: Date;
  descricao?: string;
  pagador_recebedor?: string;
  categoria: string;
  forma_pagamento_recebimento: string;
  status: string;
  data_agendamento_pagamento?: Date;
  data_registro?: Date;
  parcela?: string;
  numero_parcelas?: number;
  id_transacao_pai?: string;
  anexo_compartilhado_url?: string;
  anexo_arquivo_url?: string;
  id_grupo_anexo?: string;
  parcela_com_anexo_original?: boolean;
}

export interface AtividadeAgricola {
  id_atividade: string;
  user_id: string;
  nome_atividade: string;
  area?: string;
  produto_usado?: string;
  quantidade?: string;
  responsavel?: string;
  observacao?: string;
  data?: string;
  dose_usada?: string;
  id_talhoes?: string;
  data_registro?: string;
}

export interface VinculoUsuarioPropriedade {
  id_propriedade: string;
  user_id: string;
  papel?: string;
  ativo?: boolean;
  created_at?: string;
}

export interface Propriedade {
  id_propriedade: string;
  nome: string;
  localizacao?: string;
  cidade?: string;
  estado?: string;
  area_total?: number;
  data_cadastro?: string;
  ativo?: boolean;
}

export interface Talhao {
  id_talhao: string;
  id_propriedade: string;
  criado_por: string;
  data_criacao?: string;
  nome: string;
  area: number;
  ultima_modificacao?: string;
  cultura: string;
  ativo?: boolean;
  talhao_default?: boolean;
  produtividade_saca?: number | null;
  variedade_plantada?: string | null;
  quantidade_de_pes?: number | null;
  ano_de_plantio?: string | null;
}

export interface ProdutoEstoque {
  id: number;
  user_id: string;
  nome_produto: string;
  marca: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number | null;    // mantém padrão com banco
  lote: string | null;
  validade: string | null;
  fornecedor: string | null;        // novo campo
  registro_mapa: string | null;  // novo campo
  created_at?: string;
}

export interface MaquinasEquipamentos {
  id_maquina: string;
  user_id: string;
  id_propriedade: string | null;
  nome: string;
  marca_modelo: string | null;
  categoria: string | null;
  horimetro_atual: number | null;
  valor_compra: number | null;
  data_compra: string | null;
  fornecedor: string | null;
  numero_serie: string | null;
  url_primeiro_envio: string | null;
  url_segundo_envio: string | null;
  created_at?: string;
}

// ------------------
// Tipos para novo modelo de lançamentos agrícolas
// ------------------

export interface LancamentoAgricola {
  atividade_id: string; // uuid PK
  user_id: string | null;
  nome_atividade?: string | null;
  data_atividade?: string | null; // date (ISO yyyy-mm-dd)
  area_atividade?: string | null;
  observacao?: string | null;
  created_at?: string | null; // timestampz
  updated_at?: string | null; // timestampz
}

export interface LancamentoTalhao {
  atividade_id: string; // uuid FK
  talhao_id: string;
}

export interface LancamentoResponsavel {
  id: number;
  atividade_id: string;
  nome?: string | null;
}

export interface LancamentoProduto {
  id: number;
  atividade_id: string;
  nome_produto?: string | null;
  quantidade_val?: number | null;
  quantidade_un?: string | null;
  dose_val?: number | null;
  dose_un?: string | null;
  produto_id?: number | null;
}

export interface LancamentoMaquina {
  id: number;
  atividade_id: string;
  maquina_id?: string | null;
  nome_maquina?: string | null;
  horas_maquina?: number | null;
}

/**
 * Constroi um path de anexo a partir do id da atividade e extensão opcional.
 * Ex: anexoPathFor('uuid', 'jpg') => 'uuid.jpg'
 */
export function anexoPathFor(atividade_id: string, ext?: string) {
  if (!ext) return atividade_id;
  return `${atividade_id}.${ext}`;
}

/**
 * Retorna URL pública do arquivo no storage (não valida existência).
 * Uso: getAnexoPublicUrl('anexos', anexoPathFor(atividade_id, 'jpg'))
 */
export function getAnexoPublicUrl(bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path);
}
