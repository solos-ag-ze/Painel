// src/components/Estoque/HistoryMovementsModal.tsx
import { useEffect, useState } from 'react';
import { X, Paperclip } from 'lucide-react';
import { EstoqueService, LancamentoProdutoEntry } from '../../services/estoqueService';
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import AttachmentProductModal from './AttachmentProductModal';
import Pagination from './Pagination';
import { formatUnitAbbreviated } from '../../lib/formatUnit';

interface Props {
  isOpen: boolean;
  product: ProdutoAgrupado | null;
  onClose: () => void;
}

export default function HistoryMovementsModal({ isOpen, product, onClose }: Props) {
  // items pode conter movimentacoes (MovimentacaoExpandida) e lançamentos (normalizados)
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totais, setTotais] = useState({ entradas: 0, saidas: 0 });
  // ...existing code...
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
      // Primeiro, somamos todas as saídas registradas nas movimentações por produto
      let allSaidas = 0;

      for (const p of product.produtos) {
        try {
          const resp = await EstoqueService.getMovimentacoesExpandidas(p.id, 1, 1000);
          const data = resp?.data || [];
          const saidas = data.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + m.quantidade, 0);
          allSaidas += saidas;
        } catch (err) {
          console.error(`Erro ao buscar movimentações para totais (produto ${p.id}):`, err);
        }
      }

      // Em seguida, adicionamos as saídas vindas de lançamentos (aplicações)
      try {
        const produtoIds = product.produtos.map(p => p.id);
        const lancamentos = await EstoqueService.getLancamentosPorProdutos(produtoIds);
        for (const l of lancamentos) {
          const q = l.quantidade_val || 0;
          allSaidas += q; // lançamentos são consumos (saídas)
        }
      } catch (err) {
        console.error('Erro ao buscar lançamentos para totais:', err);
      }

      // Agora inferimos as entradas históricas a partir do estoque atual:
      // entradas_históricas = estoque_atual + total_saídas
      // Usamos o total de estoque agregado do agrupamento quando disponível,
      // caso contrário somamos as quantidades individuais dos produtos.
      const totalEstoqueGroup = typeof product.totalEstoque !== 'undefined' && product.totalEstoque !== null
        ? Number(product.totalEstoque)
        : product.produtos.reduce((s, pr) => s + (Number(pr.quantidade) || 0), 0);

      const allEntradas = totalEstoqueGroup + allSaidas;

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
  const allMovements: any[] = [];
  let totalMovements = 0;
  const debugInfos: any[] = [];

  for (const p of product.produtos) {
        try {
          const resp = await EstoqueService.getMovimentacoesExpandidas(p.id, 1, 1000);
          const data = resp?.data || [];
          allMovements.push(...data);
          totalMovements += data.length;
        } catch (err) {
          console.error(`Erro ao buscar movimentações para produto ${p.id}:`, err);
          // continuar para próximo produto
        }
      }

      // Não adicionamos entradas iniciais aqui — elas serão adicionadas após
      // incluirmos os lançamentos, de modo que possamos calcular o valor original
      // (estoque atual + todas as saídas) por produto.

      // Buscar lançamentos (aplicações) de produtos e normalizar
      const produtoIds = product.produtos.map(p => p.id);
      try {
        const lancamentos: LancamentoProdutoEntry[] = await EstoqueService.getLancamentosPorProdutos(produtoIds);
        for (const l of lancamentos) {
        const produtoInfo = product.produtos.find(p => p.id === l.produto_id as any);
        const quantidade_val = l.quantidade_val ?? 0;
        const unidade_quant = l.quantidade_un || produtoInfo?.unidade || 'un';
        const valorUnitario = produtoInfo?.valor ?? null;
        const custoCalculado = valorUnitario != null ? Number(valorUnitario) * Number(quantidade_val) : null;

        const mapped = {
          id: l.id,
          produto_id: l.produto_id,
          user_id: produtoInfo?.user_id || null,
          tipo: 'saida', // trata como saída para fins de exibição
          quantidade: quantidade_val,
          observacao: l.observacao || null,
          created_at: l.atividade?.created_at || l.created_at || new Date().toISOString(),
          nome_produto: produtoInfo?.nome_produto || product.nome,
          marca: produtoInfo?.marca || null,
          categoria: produtoInfo?.categoria || null,
          unidade: unidade_quant,
          valor: valorUnitario,
          lote: produtoInfo?.lote || null,
          validade: produtoInfo?.validade || null,
          fornecedor: produtoInfo?.fornecedor || null,
          registro_mapa: produtoInfo?.registro_mapa || null,
          produto_created_at: produtoInfo?.created_at || null,
          // campos específicos de lançamento
          nome_atividade: l.atividade?.nome_atividade || 'Atividade',
          atividade_id: l.atividade_id,
          quantidade_val: quantidade_val,
          quantidade_un: unidade_quant,
          custo_calculado: custoCalculado,
          _source: 'lancamento'
        };

          allMovements.push(mapped);
          totalMovements += 1;
        }
      } catch (err) {
        console.error('Erro ao buscar lançamentos de produtos:', err);
      }

      // coletar debug por produto (opcional, ativo via VITE_DEBUG_HISTORY)
      for (const p of product.produtos) {
        const totalSaidasProduto = allMovements
          .filter(m => m.produto_id === p.id && m.tipo === 'saida')
          .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);

        const hasEntradaRegistrada = allMovements.some(m => m.produto_id === p.id && m.tipo === 'entrada' && m._source !== 'entrada_inicial');

        debugInfos.push({
          produto_id: p.id,
          produto_nome: p.nome_produto,
          estoque_atual: Number(p.quantidade) || 0,
          totalSaidasProduto,
          hasEntradaRegistrada,
        });
      }

      // Agora que temos movimentações e lançamentos no `allMovements`, podemos
      // reconstituir a entrada inicial original para cada produto que não tem
      // uma movimentação do tipo 'entrada' registrada. A quantidade original
      // é: estoque_atual (p.quantidade) + total_saidas_do_produto.
      for (const p of product.produtos) {
        const hasEntradaRegistrada = allMovements.some(m => m.produto_id === p.id && m.tipo === 'entrada' && m._source !== 'entrada_inicial');
        if (!hasEntradaRegistrada) {
          // total de saídas para este produto (considerando movimentações e lançamentos)
          const totalSaidasProduto = allMovements
            .filter(m => m.produto_id === p.id && m.tipo === 'saida')
            .reduce((s, m) => s + (Number(m.quantidade) || 0), 0);

          const quantidadeOriginal = (Number(p.quantidade) || 0) + totalSaidasProduto;

          if (quantidadeOriginal > 0) {
            const entradaInicial = {
              id: -p.id,
              produto_id: p.id,
              user_id: p.user_id,
              tipo: 'entrada',
              quantidade: quantidadeOriginal,
              observacao: 'Entrada inicial (valor informado no cadastro do produto)',
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
              _source: 'entrada_inicial'
            };
            allMovements.push(entradaInicial);
            totalMovements += 1;
          }
        }
      }

  // (debug removed)

      allMovements.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // No activity-aggregated entries: keep only original movimentações list

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatValidity = (validadeStr: string | null) => {
    if (!validadeStr) return '—';
    
    const date = new Date(validadeStr);
    const defaultDate = new Date('2000-01-01');

    // Se a data for 01/01/2000, retorna "-"
    if (date.getTime() === defaultDate.getTime()) {
      return '—';
    }
    
    return date.toLocaleDateString('pt-BR');
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
        <div className="bg-white rounded-md shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {product?.nome}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-4 text-sm text-gray-600 mt-2">
                <span className="whitespace-nowrap"><strong>Total Entradas:</strong> {totalEntradas} {formatUnitAbbreviated(product?.produtos[0]?.unidade)}</span>
                <span className="whitespace-nowrap"><strong>Total Saídas:</strong> {totalSaidas} {formatUnitAbbreviated(product?.produtos[0]?.unidade)}</span>
                <span className="whitespace-nowrap"><strong>Em estoque:</strong> {product?.totalEstoque} {formatUnitAbbreviated(product?.produtos[0]?.unidade)}</span>
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
              <div className="space-y-6">
                {/* Debug panel quando VITE_DEBUG_HISTORY=true */}
                {import.meta.env.VITE_DEBUG_HISTORY === 'true' && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4 text-xs text-gray-800">
                    <div className="font-medium text-sm mb-1">Debug histórico (apenas VITE_DEBUG_HISTORY)</div>
                    <pre className="whitespace-pre-wrap max-h-40 overflow-auto">{JSON.stringify({ totalEntradas, totalSaidas, debugInfos: (typeof debugInfos !== 'undefined' ? debugInfos : []) }, null, 2)}</pre>
                  </div>
                )}
                {/* Original movement items */}

                {/* Original movement items */}
                <div className="space-y-4">
                  {items.map((m) => (
                    <div key={`${m.produto_id}-${m.id}`} className="border rounded-lg p-4 bg-gray-50 relative">
                      <div className="flex items-start justify-between">

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {(() => {
                                    const isLanc = m._source === 'lancamento';
                                    const badgeClass = isLanc
                                      ? 'bg-red-100 text-red-700'
                                      : (m.tipo === 'entrada'
                                        ? 'bg-[#397738]/10 text-[#397738]'
                                        : 'bg-red-100 text-red-700');
                                    const badgeLabel = isLanc ? 'Aplicação' : (m.tipo === 'entrada' ? 'Entrada' : 'Saída');
                                    const qty = isLanc ? (m.quantidade_val ?? 0) : (m.quantidade ?? 0);
                                    const unit = isLanc ? (m.quantidade_un || m.unidade) : m.unidade;

                                    return (
                                      <>
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                                          {badgeLabel}
                                        </span>
                                        <span className="font-medium text-gray-900 whitespace-nowrap">
                                          {qty} {formatUnitAbbreviated(unit)}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>
                            <div className="text-gray-500 text-xs text-right">
                              <div>{formatDate(m.created_at)}</div>
                              <div>{formatTime(m.created_at)}</div>
                            </div>
                          </div>

                          {m.observacao && (
                            <p className="text-sm text-gray-600 mt-2">{m.observacao}</p>
                          )}

                          {/* Se for lançamento (aplicação) mostramos atividade, quantidade usada/un e custo calculado */}
                          {m._source === 'lancamento' && (
                            <div className="text-sm text-gray-600 space-y-1 mt-2">
                              <div><strong>Atividade:</strong> {m.nome_atividade || '—'}</div>
                              <div><strong>Quantidade usada:</strong> {m.quantidade_val ?? 0} {m.quantidade_un || m.unidade}</div>
                              <div><strong>Custo (calculado):</strong> {m.custo_calculado != null ? `R$ ${Number(m.custo_calculado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</div>
                            </div>
                          )}

                          {m.tipo === 'entrada' && (
                            <div className="text-sm text-gray-600 space-y-1 mt-2">
                              <div><strong>Marca:</strong> {m.marca || '—'}</div>
                              <div><strong>Fornecedor:</strong> {m.fornecedor || '—'}</div>
                              <div><strong>Lote:</strong> {m.lote || '—'}</div>
                              <div><strong>Validade:</strong> {formatValidity(m.validade)}</div>
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
