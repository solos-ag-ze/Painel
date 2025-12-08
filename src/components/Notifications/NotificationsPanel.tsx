import React, { useEffect, useState } from 'react';
import { getNotificationsForUser, NotificationRow, markNotificationRead } from '../../services/notificationService';
import { ActivityService } from '../../services/activityService';
import { Check } from 'lucide-react';

interface Props {
  userId?: string;
  notifications?: NotificationRow[]; // se fornecido, renderiza esses em vez de buscar
  loading?: boolean; // permitir controle externo do estado de loading
  onRefresh?: () => Promise<void>;
  showHeader?: boolean;
  className?: string;
  onOpenAdjustment?: (data: {
    productName?: string;
    deficitQty?: number;
    unit?: string;
    suggestedPrice?: number;
    activityLabel?: string;
    activityDate?: string;
  }) => void;
}

export const NotificationsPanel: React.FC<Props> = ({ userId, notifications: notificationsProp, loading: loadingProp, onRefresh, showHeader = true, className = '', onOpenAdjustment }) => {
  const [internalNotifications, setInternalNotifications] = useState<NotificationRow[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityNames, setActivityNames] = useState<Record<string, { nome?: string; data?: string }>>({});

  const notifications = notificationsProp ?? internalNotifications;
  const loading = typeof loadingProp === 'boolean' ? loadingProp : internalLoading;

  async function load() {
    if (onRefresh) {
      try {
        setError(null);
        await onRefresh();
      } catch (err: any) {
        setError(err?.message || String(err));
      }
      return;
    }

    try {
      setInternalLoading(true);
      setError(null);
      const rows = await getNotificationsForUser(userId);
      setInternalNotifications(rows);
    } catch (err: any) {
      console.error('Erro ao carregar notificações', err);
      setError(err?.message || String(err));
    } finally {
      setInternalLoading(false);
    }
  }

  useEffect(() => {
    // se o pai não estiver controlando as notificações, carregamos por conta própria
    if (!notificationsProp) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    // DEBUG: log quando o painel monta e quando as notificações são atualizadas
    // eslint-disable-next-line no-console
    console.log('DEBUG: NotificationsPanel mounted/updated - notifications.length=', notifications.length, 'loading=', loading);
  }, [notifications, loading]);

  useEffect(() => {
    // quando notificações mudam, buscar nomes das atividades referenciadas (por id)
    const fetchActivityNames = async () => {
      try {
        const ids = new Set<string>();
        (notificationsProp ?? internalNotifications).forEach((n) => {
          let p = n.payload;
          if (typeof p === 'string') {
            try { p = JSON.parse(p); } catch (e) { /* ignore */ }
          }
          if (p && p.atividade_id) ids.add(String(p.atividade_id));
        });

        const toFetch: string[] = [];
        ids.forEach((id) => { if (!activityNames[id]) toFetch.push(id); });
        if (!toFetch.length) return;

        const results = await Promise.all(toFetch.map(id => ActivityService.getLancamentoById(id)));
        const mapUpdate: Record<string, { nome?: string; data?: string }> = {};
        results.forEach((res, idx) => {
          const id = toFetch[idx];
          if (res) mapUpdate[id] = { nome: res.nome_atividade || (res as any).nome || '', data: res.dataFormatada || '' };
        });
        setActivityNames(prev => ({ ...prev, ...mapUpdate }));
      } catch (err) {
        // não bloquear UI por falha nesta busca
        console.warn('Erro ao buscar nomes de atividade para notificações', err);
      }
    };

    fetchActivityNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsProp, internalNotifications]);

  return (
    <div className={`p-3 bg-white rounded-md shadow-md border ${className}`}> 
      {showHeader && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Notificações</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="text-xs text-[#00A651] hover:underline"
              disabled={loading}
            >
              Atualizar
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-gray-500">Carregando...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {!loading && notifications.length === 0 && (
        <div className="text-sm text-gray-600">Nenhuma notificação encontrada.</div>
      )}

      <ul className="space-y-3 max-h-[60vh] overflow-auto pr-2">
        {notifications.map((n) => {
          const raw = n.payload;
          let payload: any = raw;
          if (typeof raw === 'string') {
            try {
              payload = JSON.parse(raw);
            } catch (e) {
              payload = raw;
            }
          }

          // ex: { faltando: [{"nome_produto":"Gesso...","unidade_medida":"ton","quantidade_faltante":10}], atividade_id: '...' }
          if (payload && Array.isArray(payload.faltando)) {
            return payload.faltando.map((item: any, idx: number) => {
              const productName = item.nome_produto || item.nome || item.productName || item.name;
              const qty = Number(item.quantidade_faltante ?? item.quantidade ?? item.qtd ?? 0) || 0;
              const unit = item.unidade_medida || item.unit || '';

              return (
                  <li key={`${n.id}-faltando-${idx}`} className="relative p-4 bg-white border rounded-lg shadow-sm">
                    <div className={`absolute top-3 right-3 transition-transform transition-opacity duration-200 ${n.read ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                      <Check className="w-5 h-5 text-[#00A651]" />
                    </div>
                    <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
                      <div className="mt-2 text-sm text-[rgba(0,68,23,0.85)] font-semibold">{productName}</div>
                      <div className="mt-1 text-sm text-gray-700">Quantidade faltante: <span className="font-bold">{qty.toFixed(2)} {unit}</span></div>
                      {payload.atividade_id && (
                        <div className="mt-1 text-xs text-gray-500">Atividade: {activityNames[String(payload.atividade_id)]?.nome || String(payload.atividade_id)}</div>
                      )}
                      {!payload.atividade_id && payload.atividade && (
                        <div className="mt-1 text-xs text-gray-500">Atividade: {String(payload.atividade)}</div>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {typeof onOpenAdjustment === 'function' && (
                        <button
                          onClick={() => onOpenAdjustment({ productName, deficitQty: qty, unit, suggestedPrice: undefined, activityLabel: payload.atividade, activityDate: undefined, notificationId: n.id })}
                          className="text-sm px-3 py-1 bg-[#00A651] text-white rounded-md hover:opacity-95"
                        >
                          Ajustar
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            });
          }

          // fallback: exibir payload como JSON formatado em um card simples
          return (
            <li key={String(n.id)} className="relative p-3 bg-gray-50 border rounded-md">
              <div className={`absolute top-3 right-3 transition-transform transition-opacity duration-200 ${n.read ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                <Check className="w-4 h-4 text-[#00A651]" />
              </div>
              <div className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
              <pre className="mt-2 text-sm text-gray-800 whitespace-pre-wrap break-words bg-white p-3 rounded-md border">{typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}</pre>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default NotificationsPanel;
