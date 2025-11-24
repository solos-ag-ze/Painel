import { supabase } from '../lib/supabase';

export interface NotificationRow {
  id: number | string;
  user_id: string;
  payload: any;
  created_at: string;
  read?: boolean;
}

/**
 * Recupera notificações do usuário a partir da tabela `notificacoes_produtor`.
 * Se `userId` não for passado, tenta obter o usuário pela sessão atual do Supabase.
 */
export async function getNotificationsForUser(userId?: string): Promise<NotificationRow[]> {
  try {
    let resolvedUserId = userId;

    if (!resolvedUserId) {
      // tentativa de fallback para sessão atual
      // supabase.auth.getUser() retorna { data: { user }, error }
      // função disponível nas versões modernas do client
      // não é crítica: se não houver usuário, a query retorna vazia
      // e o caller deve passar explicitamente o userId quando necessário.
      // @ts-ignore
      const userResp = await supabase.auth.getUser?.();
      const user = userResp?.data?.user;
      if (user && user.id) resolvedUserId = user.id;
    }

    const query = supabase
      .from('notificacoes_produtor')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    const finalQuery = resolvedUserId ? query.eq('user_id', resolvedUserId) : query;

    const { data, error } = await finalQuery;

    if (error) {
      console.error('Erro ao buscar notificações:', error.message || error);
      throw error;
    }

    return (data as NotificationRow[]) || [];
  } catch (err) {
    console.error('getNotificationsForUser error', err);
    throw err;
  }
}

export default { getNotificationsForUser };

export async function markNotificationRead(notificationId: number | string) {
  try {
    // tenta marcar tanto a coluna `read` quanto a coluna `lida` (algumas instalações usam nomes diferentes)
    const { data, error } = await supabase
      .from('notificacoes_produtor')
      .update({ read: true, lida: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      throw error;
    }

    // debug: mostrar resultado para ajudar diagnóstico em ambiente dev
    // eslint-disable-next-line no-console
    console.debug('markNotificationRead result for', notificationId, { data });

    return data;
  } catch (err) {
    console.error('markNotificationRead error', err);
    throw err;
  }
}
