// src/components/Estoque/HistoryMovementsModal.tsx
import { useEffect, useState } from 'react';
import { X, Paperclip, Plus } from 'lucide-react';
import { EstoqueService, LancamentoProdutoEntry } from '../../services/estoqueService';
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import AttachmentProductModal from './AttachmentProductModal';
import ActivityAttachmentModal from '../ManejoAgricola/ActivityAttachmentModal';
import ActivityDetailModal from '../ManejoAgricola/ActivityDetailModal';
import Pagination from './Pagination';
import { formatUnitAbbreviated } from '../../lib/formatUnit';
import { autoScaleQuantity, convertFromStandardUnit, convertToStandardUnit, isMassUnit, isVolumeUnit } from '../../lib/unitConverter';
import { formatSmartCurrency } from '../../lib/currencyFormatter';

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
  const [activityAttachmentModal, setActivityAttachmentModal] = useState({
    isOpen: false,
    activityId: '',
    activityDescription: ''
  });
  const [activityDetailModal, setActivityDetailModal] = useState({ isOpen: false, activityId: '' });
  const [debugInfos, setDebugInfos] = useState<any[]>([]);

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
      // Primeiro, somamos todas as entradas e saídas registradas nas movimentações por produto
      let allSaidas = 0;
      let allEntradas = 0;

      for (const p of product.produtos) {
        try {
          const resp = await EstoqueService.getMovimentacoesExpandidas(p.id, 1, 1000);
          const data = resp?.data || [];
          const saidas = data.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + m.quantidade, 0);
          const entradas = data.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.quantidade, 0);
          allSaidas += saidas;
          allEntradas += entradas;
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

      // Adicionamos as quantidades iniciais dos produtos que não têm entradas registradas
      for (const p of product.produtos) {
        const hasEntradaRegistrada = await (async () => {
          try {
            const resp = await EstoqueService.getMovimentacoesExpandidas(p.id, 1, 1000);
            const data = resp?.data || [];
            return data.some(m => m.tipo === 'entrada');
          } catch {
            return false;
          }
        })();

        if (!hasEntradaRegistrada) {
          const quantidadeInicial = Number(p.quantidade_inicial) || 0;
          allEntradas += quantidadeInicial;
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
  const allMovements: any[] = [];
  let totalMovements = 0;
  let localDebugInfos: any[] = [];

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

        let custoCalculado = null;
        if (quantidade_val > 0 && produtoInfo) {
          // A unidade em que o valor unitário foi cadastrado
          const unidadeValorOriginal = produtoInfo.unidade_valor_original || produtoInfo.unidade || 'un';

          // Calcular o valor unitário original na unidade_valor_original
          let valorUnitarioNaUnidadeOriginal = 0;
          
          if (produtoInfo.valor_total != null && produtoInfo.quantidade_inicial > 0) {
            // quantidade_inicial está na unidade padrão (mg/mL)
            // Precisamos converter para unidade_valor_original
            const unidadePadrao = produtoInfo.unidade; // mg ou mL
            let quantidadeInicialConvertida = produtoInfo.quantidade_inicial;

            if (unidadePadrao !== unidadeValorOriginal) {
              if (isMassUnit(unidadePadrao) && isMassUnit(unidadeValorOriginal)) {
                // Converter de mg para unidadeValorOriginal
                quantidadeInicialConvertida = convertFromStandardUnit(
                  produtoInfo.quantidade_inicial, 
                  'mg', 
                  unidadeValorOriginal
                );
              } else if (isVolumeUnit(unidadePadrao) && isVolumeUnit(unidadeValorOriginal)) {
                // Converter de mL para unidadeValorOriginal
                quantidadeInicialConvertida = convertFromStandardUnit(
                  produtoInfo.quantidade_inicial, 
                  'mL', 
                  unidadeValorOriginal
                );
              }
            }

            // Agora calculamos: valor_total / quantidade_inicial_convertida
            valorUnitarioNaUnidadeOriginal = produtoInfo.valor_total / quantidadeInicialConvertida;
          } else if (produtoInfo.valor != null) {
            // Fallback: converter valor do banco (em mg/mL) para unidade_valor_original
            const unidadePadrao = produtoInfo.unidade; // mg ou mL
            
            if (unidadePadrao !== unidadeValorOriginal) {
              if (isMassUnit(unidadePadrao) && isMassUnit(unidadeValorOriginal)) {
                const fatorConversao = convertToStandardUnit(1, unidadeValorOriginal).quantidade;
                valorUnitarioNaUnidadeOriginal = produtoInfo.valor * fatorConversao;
              } else if (isVolumeUnit(unidadePadrao) && isVolumeUnit(unidadeValorOriginal)) {
                const fatorConversao = convertToStandardUnit(1, unidadeValorOriginal).quantidade;
                valorUnitarioNaUnidadeOriginal = produtoInfo.valor * fatorConversao;
              } else {
                valorUnitarioNaUnidadeOriginal = produtoInfo.valor;
              }
            } else {
              valorUnitarioNaUnidadeOriginal = produtoInfo.valor;
            }
          }

          console.log('🔍 Calculando custo do produto usado:', {
            produto_id: l.produto_id,
            quantidade_val,
            unidade_quant,
            valorUnitarioNaUnidadeOriginal,
            unidadeValorOriginal,
            valor_total: produtoInfo.valor_total,
            quantidade_inicial: produtoInfo.quantidade_inicial
          });

          // Converter a quantidade usada para a unidade_valor_original
          let quantidadeNaUnidadeDoValor = quantidade_val;

          if (unidade_quant !== unidadeValorOriginal) {
            console.log('  → Unidades diferentes, convertendo...');
            
            // Caso 1: ambas são unidades de massa
            if (isMassUnit(unidade_quant) && isMassUnit(unidadeValorOriginal)) {
              // Converter quantidade_val de unidade_quant para mg (padrão)
              const quantidadeEmMg = convertToStandardUnit(quantidade_val, unidade_quant).quantidade;
              console.log(`  → Convertido para mg: ${quantidadeEmMg}`);
              // Converter de mg para unidadeValorOriginal
              quantidadeNaUnidadeDoValor = convertFromStandardUnit(quantidadeEmMg, 'mg', unidadeValorOriginal);
              console.log(`  → Convertido de mg para ${unidadeValorOriginal}: ${quantidadeNaUnidadeDoValor}`);
            }
            // Caso 2: ambas são unidades de volume
            else if (isVolumeUnit(unidade_quant) && isVolumeUnit(unidadeValorOriginal)) {
              // Converter quantidade_val de unidade_quant para mL (padrão)
              const quantidadeEmMl = convertToStandardUnit(quantidade_val, unidade_quant).quantidade;
              console.log(`  → Convertido para mL: ${quantidadeEmMl}`);
              // Converter de mL para unidadeValorOriginal
              quantidadeNaUnidadeDoValor = convertFromStandardUnit(quantidadeEmMl, 'mL', unidadeValorOriginal);
              console.log(`  → Convertido de mL para ${unidadeValorOriginal}: ${quantidadeNaUnidadeDoValor}`);
            }
            // Caso 3: tipos incompatíveis (massa vs volume ou vs 'un') - manter quantidade original
            else {
              console.log('  → Tipos incompatíveis, mantendo quantidade original');
            }
          } else {
            console.log('  → Unidades iguais, sem conversão necessária');
          }

          // Custo = valor unitário (na unidade_valor_original) × quantidade (na unidade_valor_original)
          custoCalculado = valorUnitarioNaUnidadeOriginal * quantidadeNaUnidadeDoValor;
          console.log(`  → Custo calculado: R$ ${custoCalculado.toFixed(2)} (${valorUnitarioNaUnidadeOriginal}/unidade × ${quantidadeNaUnidadeDoValor} unidades)`);
        }

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
          valor: produtoInfo?.valor ?? null,
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

        localDebugInfos.push({
          produto_id: p.id,
          produto_nome: p.nome_produto,
          estoque_atual: Number(p.quantidade) || 0,
          totalSaidasProduto,
          hasEntradaRegistrada,
        });
      }

  // Agora que temos movimentações e lançamentos no `allMovements`, podemos
      // adicionar a entrada inicial original para cada produto que não tem
      // uma movimentação do tipo 'entrada' registrada. A quantidade original
      // vem diretamente do campo quantidade_inicial do banco de dados.
      for (const p of product.produtos) {
        const hasEntradaRegistrada = allMovements.some(m => m.produto_id === p.id && m.tipo === 'entrada' && m._source !== 'entrada_inicial');
        if (!hasEntradaRegistrada) {
          const quantidadeOriginal = Number(p.quantidade_inicial) || 0;

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
              unidade_valor_original: p.unidade_valor_original,
              valor_total: p.valor_total,
              quantidade_inicial: p.quantidade_inicial,
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

        // salvar debug infos no estado para que o painel (VITE_DEBUG_HISTORY) possa renderizar
        setDebugInfos(localDebugInfos);
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
    const defaultDate1 = new Date('1999-12-31');
    const defaultDate2 = new Date('2000-01-01');

    // Se a data for 31/12/1999 ou 01/01/2000, retorna "-" (datas padrão para "sem validade")
    if (date.getTime() === defaultDate1.getTime() || date.getTime() === defaultDate2.getTime()) {
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
                <span className="whitespace-nowrap"><strong>Total Entradas:</strong> {(() => {
                  const scaled = autoScaleQuantity(totalEntradas, product?.produtos[0]?.unidade || 'un');
                  return `${scaled.quantidade} ${formatUnitAbbreviated(scaled.unidade)}`;
                })()}</span>
                <span className="whitespace-nowrap"><strong>Total Saídas:</strong> {(() => {
                  const scaled = autoScaleQuantity(totalSaidas, product?.produtos[0]?.unidade || 'un');
                  return `${scaled.quantidade} ${formatUnitAbbreviated(scaled.unidade)}`;
                })()}</span>
                <span className="whitespace-nowrap"><strong>Em estoque:</strong> {product?.totalEstoqueDisplay} {formatUnitAbbreviated(product?.unidadeDisplay || product?.produtos[0]?.unidade)}</span>
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
                                    const qtyUsed = autoScaleQuantity(qty, unit);

                                    return (
                                      <>
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
                                          {badgeLabel}
                                        </span>
                                        <span className="font-medium text-gray-900 whitespace-nowrap">
                                          {qtyUsed.quantidade} {qtyUsed.unidade}
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
                          {m._source === 'lancamento' && (() => {
                            const qtyUsed = autoScaleQuantity(m.quantidade_val ?? 0, m.quantidade_un || m.unidade);
                            return (
                              <div className="text-sm text-gray-600 space-y-1 mt-2">
                                <div><strong>Atividade:</strong> {m.nome_atividade || '—'}</div>
                                <div><strong>Quantidade usada:</strong> {qtyUsed.quantidade} {qtyUsed.unidade}</div>
                                <div><strong>Custo do produto usado:</strong> {m.custo_calculado != null ? formatSmartCurrency(Number(m.custo_calculado)) : '—'}</div>
                              </div>
                            );
                          })()}

                          {m.tipo === 'entrada' && (() => {
                            const unidadeValorOriginal = m.unidade_valor_original || m.unidade;
                            let valorDisplay = null;
                            let unidadeValorDisplay = unidadeValorOriginal;

                            // Se for entrada inicial e tivermos valor_total e quantidade_inicial
                            if (m._source === 'entrada_inicial' && m.valor_total != null && m.quantidade_inicial > 0) {
                              // Calcular valor unitário: valor_total / quantidade_inicial
                              const valorUnitarioCalculado = m.valor_total / m.quantidade_inicial;
                              
                              // Converter para unidade original se necessário
                              const unidadeAtual = m.unidade;
                              
                              if (unidadeAtual !== unidadeValorOriginal) {
                                if (isMassUnit(unidadeAtual) && isMassUnit(unidadeValorOriginal)) {
                                  const fatorConversao = convertToStandardUnit(1, unidadeValorOriginal).quantidade;
                                  valorDisplay = valorUnitarioCalculado * fatorConversao;
                                } else if (isVolumeUnit(unidadeAtual) && isVolumeUnit(unidadeValorOriginal)) {
                                  const fatorConversao = convertToStandardUnit(1, unidadeValorOriginal).quantidade;
                                  valorDisplay = valorUnitarioCalculado * fatorConversao;
                                } else {
                                  valorDisplay = valorUnitarioCalculado;
                                }
                              } else {
                                valorDisplay = valorUnitarioCalculado;
                              }
                            }
                            // Para outras entradas (não iniciais), usar a lógica anterior
                            else if (m.valor !== null && m.valor !== undefined) {
                              const unidadePadrao = m.unidade;
                              
                              if (unidadePadrao !== unidadeValorOriginal) {
                                if (isMassUnit(unidadePadrao) && isMassUnit(unidadeValorOriginal)) {
                                  const fatorConversao = convertToStandardUnit(1, unidadeValorOriginal).quantidade;
                                  valorDisplay = m.valor * fatorConversao;
                                } else if (isVolumeUnit(unidadePadrao) && isVolumeUnit(unidadeValorOriginal)) {
                                  const fatorConversao = convertToStandardUnit(1, unidadeValorOriginal).quantidade;
                                  valorDisplay = m.valor * fatorConversao;
                                } else {
                                  valorDisplay = m.valor;
                                }
                              } else {
                                valorDisplay = m.valor;
                              }
                            }

                            return (
                              <div className="text-sm text-gray-600 space-y-1 mt-2">
                                <div><strong>Marca:</strong> {m.marca || '—'}</div>
                                <div><strong>Categoria:</strong> {m.categoria || '—'}</div>
                                <div><strong>Fornecedor:</strong> {m.fornecedor || '—'}</div>
                                <div><strong>Lote:</strong> {m.lote || '—'}</div>
                                <div><strong>Validade:</strong> {formatValidity(m.validade)}</div>
                                <div><strong>Registro MAPA:</strong> {m.registro_mapa || '—'}</div>
                                {valorDisplay !== null && valorDisplay !== undefined && (
                                  <div><strong>Valor:</strong> {formatSmartCurrency(Number(valorDisplay))} / {unidadeValorDisplay}</div>
                                )}
                              </div>
                            );
                          })()}

                          {m.tipo === 'saida' && m.valor && m._source !== 'lancamento' && (
                            <div className="text-sm text-gray-600 space-y-1 mt-2">
                              <div><strong>Valor total da saída:</strong> {formatSmartCurrency(Number(m.valor) * m.quantidade)}</div>
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
                                          {m._source === 'lancamento' && m.atividade_id && (
                                            <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                              <button
                                                onClick={() => setActivityAttachmentModal({ isOpen: true, activityId: String(m.atividade_id), activityDescription: m.nome_atividade || 'Atividade' })}
                                                className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200"
                                                title="Gerenciar anexo da atividade"
                                              >
                                                <Paperclip className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => setActivityDetailModal({ isOpen: true, activityId: String(m.atividade_id) })}
                                                className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200"
                                                title="Abrir atividade"
                                              >
                                                <Plus className="w-4 h-4" />
                                              </button>
                                            </div>
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
        <ActivityAttachmentModal
          isOpen={activityAttachmentModal.isOpen}
          onClose={() => setActivityAttachmentModal({ isOpen: false, activityId: '', activityDescription: '' })}
          activityId={activityAttachmentModal.activityId}
          activityDescription={activityAttachmentModal.activityDescription}
        />
        <ActivityDetailModal
          isOpen={activityDetailModal.isOpen}
          onClose={() => setActivityDetailModal({ isOpen: false, activityId: '' })}
          activityId={activityDetailModal.activityId}
          activityDescription={''}
        />
    </>
  );
}
