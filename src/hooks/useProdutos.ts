import { useEffect, useState } from 'react';
import { EstoqueService } from '../services/estoqueService';

export function useProdutos(isOpen: boolean) {
  const [availableProdutos, setAvailableProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    async function loadProdutos() {
      setLoading(true);
      try {
        const list = await EstoqueService.getProdutos();
        if (!mounted) return;
        setAvailableProdutos(list || []);
      } catch (e) {
        console.error('Erro ao carregar produtos (hook):', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProdutos();
    return () => { mounted = false; };
  }, [isOpen]);

  return { availableProdutos, loading } as const;
}

export default useProdutos;
