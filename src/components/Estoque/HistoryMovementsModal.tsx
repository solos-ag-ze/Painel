// src/components/Estoque/HistoryMovementsModal.tsx
import { useEffect, useState } from 'react';
import { X, Paperclip } from 'lucide-react';
import { MovimentacaoExpandida, EstoqueService } from '../../services/estoqueService';
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import AttachmentProductModal from './AttachmentProductModal';
import Pagination from './Pagination';

interface Props {
  isOpen: boolean;
  product: ProdutoAgrupado | null;
  onClose: () => void;
}

export default function HistoryMovementsModal({ isOpen, product, onClose }: Props) {
  const [items, setItems] = useState<MovimentacaoExpandida[]>([]);
  const [loading, setLoading] = useState(false);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);
  const itemsPerPage = 10;
  const [attachmentModal, setAttachmentModal] = useState({
    isOpen: false,
    productId: '',
    productName: ''
  });

  useEffect(() => {
    if (!isOpen || !product) return;

    setCurrentPage(1);
    loadTotals();
  }, [isOpen, product]);

  useEffect(() => {
    if (!isOpen || !product) return;

    loadData(currentPage);
  }, [isOpen, product, currentPage]);

  const loadTotals = async () => {
    if (!product) return;

    try {
      let allEntradas = 0;
      let allSaidas = 0;

      for (const p of product.produtos) {
        const resp = await EstoqueService.getMovimentacoesExpandidas(p.id, 1, 1000);
        const entradas = resp.data.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.quantidade, 0);
        const saidas = resp.data.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + m.quantidade, 0);
        allEntradas += entradas;
        allSaidas += saidas;

        if (p.quantidade > 0) {
          allEntradas += p.quantidade;
        }
      }

      setTotalEntradas(allEntradas);
      setTotalSaidas(allSaidas);
    } catch (error) {
      console.error('Erro ao carregar totais:', error);
    }
  };

  const loadData = async (page: number) => {
    if (!product) return;

    setLoading(true);

    try {
      const allMovements: MovimentacaoExpandida[] = [];
      let totalMovements = 0;

      for (const p of product.produtos) {
        const resp = await EstoqueService.getMovimentacoesExpandidas(p.id, 1, 1000);
        allMovements.push(...resp.data);
        totalMovements += resp.totalCount;
      }

      for (const p of product.produtos) {
        if (p.quantidade > 0) {
          const entradaInicial: MovimentacaoExpandida = {
            id: -p.id,
            produto_id: p.id,
            user_id: p.user_id,
            tipo: 'entrada',
            quantidade: p.quantidade,
            observacao: null,
            created_at: p.created_at || new Date().toISOString(),
            nome_produto: p.nome_produto,
            marca: p.marca,
            categoria: p.categoria,
            unidade: p.unidade,
            valor: p.valor,
            lote: p.lote,
            validade: p.validade,
            fornecedor: p.fornecedor || null,
            registro_mapa: p.registro_mapa || null,
            produto_created_at: p.created_at || new Date().toISOString(),
          };
          allMovements.push(entradaInicial);
          totalMovements += 1;
        }
      }

      allMovements.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTotalCount(totalMovements);

      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedItems = allMovements.slice(startIndex, endIndex);

      setItems(paginatedItems);

      const entradas = paginatedItems.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.quantidade, 0);
      const saidas = paginatedItems.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + m.quantidade, 0);
      setTotais({ entradas, saidas });

    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const modalContent = document.querySelector('[data-modal-content]');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openAttachmentModal = (productId: string, productName: string) => {
    setAttachmentModal({
      isOpen: true,
      productId,
      productName
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Histórico - {product?.nome}
              </h3>
              <div className="flex gap-4 text-sm text-gray-600 mt-1">
                <span><strong>Total Entradas:</strong> {totalEntradas} {product?.produtos[0]?.unidade || ''}</span>
                <span><strong>Total Saídas:</strong> {totalSaidas} {product?.produtos[0]?.unidade || ''}</span>
                <span><strong>Em estoque:</strong> {product?.totalEstoque} {product?.produtos[0]?.unidade || ''}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6" data-modal-content>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Carregando histórico...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma movimentação encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((m) => (
                  <div key={`${m.produto_id}-${m.id}`} className="border rounded-lg p-4 bg-gray-50 relative">
                    <div className="flex items-start justify-between">

                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              m.tipo === 'entrada'
                                ? 'bg-[#397738]/10 text-[#397738]'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                            <span className="font-medium text-gray-900">
                              {m.quantidade} {m.unidade}
                            </span>
                          </div>
                          <span className="text-gray-500 text-sm">
                            {formatDateTime(m.created_at)}
                          </span>
                        </div>

                        {m.observacao && (
                          <p className="text-sm text-gray-600 mt-2">{m.observacao}</p>
                        )}

                        {m.tipo === 'entrada' && (
                          <div className="text-sm text-gray-600 space-y-1 mt-2">
                            <div><strong>Marca:</strong> {m.marca || '—'}</div>
                            <div><strong>Fornecedor:</strong> {m.fornecedor || '—'}</div>
                            <div><strong>Lote:</strong> {m.lote || '—'}</div>
                            <div><strong>Validade:</strong> {m.validade ? new Date(m.validade).toLocaleDateString('pt-BR') : '—'}</div>
                            {m.valor && (
                              <div><strong>Valor unitário:</strong> R$ {Number(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            )}
                          </div>
                        )}

                        {m.tipo === 'saida' && m.valor && (
                          <div className="text-sm text-gray-600 space-y-1 mt-2">
                            <div><strong>Valor total da saída:</strong> R$ {(Number(m.valor) * m.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {m.tipo === 'entrada' && (
                      <button
                        onClick={() => openAttachmentModal(
                          m.produto_id.toString(),
                          m.nome_produto || 'Produto'
                        )}
                        className="absolute bottom-4 right-4 text-gray-600 hover:text-gray-800 transition-colors"
                        title="Ver anexos"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {totalCount > itemsPerPage && (
            <div className="p-4 border-t">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / itemsPerPage)}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                isLoading={loading}
              />
            </div>
          )}
        </div>
      </div>

      <AttachmentProductModal
        isOpen={attachmentModal.isOpen}
        onClose={() => setAttachmentModal({ isOpen: false, productId: '', productName: '' })}
        productId={attachmentModal.productId}
        productName={attachmentModal.productName}
      />
    </>
  );
}
