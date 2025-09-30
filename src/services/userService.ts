import { supabase } from '../lib/supabase';
import type { Usuario } from '../lib/supabase';

export class UserService {
  static async getUserById(userId: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as Usuario;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw new Error('Falha ao conectar com o banco de dados. Verifique sua conexão.');
    }
  }

  static async updateUser(userId: string, updates: Partial<Usuario>): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as Usuario;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw new Error('Falha ao conectar com o banco de dados. Verifique sua conexão.');
    }
  }
}