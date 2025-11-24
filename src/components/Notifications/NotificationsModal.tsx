import { X } from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications?: any[];
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  onOpenAdjustment?: (data: {
    productName?: string;
    deficitQty?: number;
    unit?: string;
    suggestedPrice?: number;
    activityLabel?: string;
    activityDate?: string;
    notificationId?: number | string;
  }) => void;
}

export default function NotificationsModal({ isOpen, onClose, notifications, loading, onRefresh, onOpenAdjustment }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[18px] shadow-[0_8px_24px_rgba(0,68,23,0.12)] w-full max-w-[560px]">
        <div className="flex items-start justify-between p-6 border-b border-[rgba(0,68,23,0.06)]">
          <div>
            <h3 className="text-2xl font-bold text-[#004417]">Notificações</h3>
            <p className="mt-1 text-sm text-[rgba(0,68,23,0.7)]">Notificações recentes do sistema. Ações rápidas estão disponíveis quando aplicável.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[rgba(0,68,23,0.5)] hover:text-[#00A651] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <NotificationsPanel
            notifications={notifications}
            loading={loading}
            onRefresh={onRefresh}
            showHeader={false}
            className="p-0"
            onOpenAdjustment={onOpenAdjustment}
          />
        </div>
      </div>
    </div>
  );
}
