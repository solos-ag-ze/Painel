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
    // Primeiro, tentar marcar a coluna `lida` que é a usada em muitas instalações.
    // Se a tabela tiver outra convenção (`read`), tentamos em fallback.
    try {
      const { data, error, status } = await supabase
        .from('notificacoes_produtor')
        .update({ lida: true })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        // Se PostgREST reclamar de coluna desconhecida (cache/schema mismatch), vamos tratar abaixo
        throw { error, status };
      }

      console.debug('markNotificationRead (lida) result for', notificationId, { status, data });
      return data;
    } catch (firstErr: any) {
      // tenta fallback para coluna `read` (caso o schema use esse nome)
      try {
        const { data, error, status } = await supabase
          .from('notificacoes_produtor')
          .update({ read: true })
          .eq('id', notificationId)
          .select()
          .single();

        if (error) {
          console.error('Erro ao marcar notificação como lida (fallback read):', { error, status, notificationId });
          throw error;
        }

        console.debug('markNotificationRead (read) result for', notificationId, { status, data });
        return data;
      } catch (secondErr) {
        // registrar detalhes para diagnóstico (inclui status HTTP quando disponível)
        console.error('Erro ao marcar notificação como lida (tentativas lida/read falharam):', { firstErr, secondErr, notificationId });
        throw secondErr;
      }
    }
  } catch (err) {
    console.error('markNotificationRead error', err);
    throw err;
  }
}
