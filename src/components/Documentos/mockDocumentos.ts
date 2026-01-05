export interface Documento {
  id: number;
  user_id: string;
  propriedade_id?: string;
  arquivo_url?: string;
  status?: string;
  tipo?: string;
  titulo?: string;
  safra?: string;
  tema?: string;
  observacao?: string;
  created_at?: string;
}

export const mockDocumentos: Documento[] = [];
