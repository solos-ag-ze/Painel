// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL!;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Singleton, sem persistir sessão do GoTrue (vamos injetar o token manualmente)
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export async function login(login: string, password: string) {
  
}

// helper para injetar o token do n8n
export async function setAccessToken(token: string) {
  const { error } = await supabase.auth.setSession({
    access_token: token,
    refresh_token: 'dummy-refresh', // 🔑 precisa ser não vazio
  });

  if (error) {
    console.error('❌ Falha ao setar token no Supabase:', error.message);
    throw error;
  }

  console.log('🔑 JWT custom injetado no Supabase');
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
