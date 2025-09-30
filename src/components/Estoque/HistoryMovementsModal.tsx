// src/components/Estoque/HistoryMovementsModal.tsx
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ProdutoEstoque, MovimentacaoEstoque, EstoqueService } from '../../services/estoqueService';

interface Props {
  isOpen: boolean;
  product: ProdutoEstoque | null;
  onClose: () => void;
}

export default function HistoryMovementsModal({ isOpen, product, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MovimentacaoEstoque[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });
  const pageSize = 20;

  useEffect(() => {
    if (!isOpen || !product) return;
    setPage(1);
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product]);

  async function load(p: number) {
    if (!product) return;
    setLoading(true);
    try {
      const resp = await EstoqueService.getMovimentacoes(product.id, p, pageSize);
      setItems(resp.items);
      setTotal(resp.total);
      setTotais(resp.totais);
      setPage(p);
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
      alert('❌ Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  if (!isOpen || !product) return null;

  const fmtDataHora = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div
        className="
          bg-white rounded-t-2xl shadow-xl w-full h-[90vh] max-h-[90vh] flex flex-col
          md:rounded-xl md:max-w-2xl md:h-auto md:max-h-[85vh]
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-lg font-semibold text-[#092f20]">Histórico de Movimentações</h3>
            <p className="text-sm text-gray-600 truncate">
              {product.nome_produto} • {product.marca || '—'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Totais → apenas saídas */}
        <div className="p-4 border-b">
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-red-700">Saídas</p>
            <p className="text-lg font-bold text-red-800">
              - {totais.saidas} {product.unidade}
            </p>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-2 md:px-4">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Carregando…</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Nenhuma movimentação encontrada.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map(m => (
                <li key={m.id} className="p-4 flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-500">{fmtDataHora(m.created_at)}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {m.observacao || '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium
                      ${m.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {m.tipo}
                    </span>
                    <div className={`mt-1 font-semibold ${m.tipo === 'entrada' ? 'text-green-700' : 'text-red-700'}`}>
                      {m.tipo === 'entrada' ? '+' : '-'} {Number(m.quantidade)} {product.unidade}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Paginação */}
        <div className="p-3 border-t flex items-center justify-between text-sm sticky bottom-0 bg-white">
          <span className="text-gray-500">
            Página {page} de {pages} • {total} mov.
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => load(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 border rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => load(Math.min(pages, page + 1))}
              disabled={page >= pages || loading}
              className="px-3 py-1.5 border rounded disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
