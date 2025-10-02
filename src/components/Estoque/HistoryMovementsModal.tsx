// src/components/Estoque/HistoryMovementsModal.tsx
import { useEffect, useState } from 'react';
import { X, Paperclip } from 'lucide-react';
import { MovimentacaoExpandida, EstoqueService } from '../../services/estoqueService';
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import AttachmentProductModal from './AttachmentProductModal';

interface Props {
  isOpen: boolean;
  product: ProdutoAgrupado | null;
  onClose: () => void;
}

export default function HistoryMovementsModal({ isOpen, product, onClose }: Props) {
  const [items, setItems] = useState<MovimentacaoExpandida[]>([]);
  const [loading, setLoading] = useState(false);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });
  const [attachmentModal, setAttachmentModal] = useState({
    isOpen: false,
    productId: '',
    productName: ''
  });

  useEffect(() => {
    if (!isOpen || !product) return;
    
    const loadData = async () => {
      setLoading(true);
      
      try {
        const allMovements: MovimentacaoExpandida[] = [];
        
        for (const p of product.produtos) {
          const resp = await EstoqueService.getMovimentacoesExpandidas(p.id, 1, 50);
          allMovements.push(...resp.data);
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
          }
        }

        allMovements.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setItems(allMovements);

        const entradas = allMovements.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.quantidade, 0);
        const saidas = allMovements.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + m.quantidade, 0);
        setTotais({ entradas, saidas });

      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, product]);

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
                <span><strong>Entradas:</strong> {totais.entradas}</span>
                <span><strong>Saídas:</strong> {totais.saidas}</span>
                <span><strong>Total em estoque:</strong> {product?.totalEstoque}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
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
