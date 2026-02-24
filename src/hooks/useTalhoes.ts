import { useEffect, useState } from 'react';
import { AuthService } from '../services/authService';
import { TalhaoService } from '../services/talhaoService';

export function useTalhoes(isOpen: boolean) {
  const [availableTalhoes, setAvailableTalhoes] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    async function loadTalhoes() {
      setLoading(true);
      try {
        const userId = AuthService.getInstance().getCurrentUser()?.user_id;
        if (!userId) return;
        const list = await TalhaoService.getTalhoesByUserId(userId);
        if (!mounted) return;
        setAvailableTalhoes((list || []).filter((t) => t.talhao_default !== true));
      } catch (e) {
        console.error('Erro ao carregar talhões (hook):', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadTalhoes();
    return () => { mounted = false; };
  }, [isOpen]);

  return { availableTalhoes, loading } as const;
}

export default useTalhoes;
