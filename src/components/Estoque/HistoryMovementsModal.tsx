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
  onProdutosUpdate?: () => Promise<void>; // Callback para atualizar produtos após mudanças
}

export default function HistoryMovementsModal({ isOpen, product, onClose, onProdutosUpdate }: Props) {
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
      // ✅ CONVERTER todas as quantidades para unidade padrão (mg ou mL)
      // pois o banco pode ter valores em diferentes unidades (ton, kg, g, mg)
      let allSaidas = 0;
      let allEntradas = 0;

      // Determinar a unidade padrão com base no primeiro produto
      const primeiraUnidade = product.produtos[0]?.unidade || 'un';
      const unidadePadrao = isMassUnit(primeiraUnidade) ? 'mg' : (isVolumeUnit(primeiraUnidade) ? 'mL' : null);

      for (const p of product.produtos) {
        try {
          const resp = await EstoqueService.getMovimentacoesExpandidas(p.id, 1, 1000);
          const data = resp?.data || [];
          
          // Converter cada movimentação para unidade padrão antes de somar
          const saidas = data
            .filter(m => m.tipo === 'saida')
            .reduce((sum, m) => {
              const converted = convertToStandardUnit(m.quantidade, m.unidade);
              return sum + converted.quantidade;
            }, 0);
          
          const entradas = data
            .filter(m => m.tipo === 'entrada')
            .reduce((sum, m) => {
              const converted = convertToStandardUnit(m.quantidade, m.unidade);
              return sum + converted.quantidade;
            }, 0);
          
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
          const quantidade = l.quantidade_val || 0;
          const unidade = l.quantidade_un || 'un';
          const converted = convertToStandardUnit(quantidade, unidade);
          allSaidas += converted.quantidade;
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
          const converted = convertToStandardUnit(quantidadeInicial, p.unidade);
          allEntradas += converted.quantidade;
        }
      }

      console.log('📊 Totais calculados (unidade padrão):', {
        totalEntradas: allEntradas,
        totalSaidas: allSaidas,
        unidadePadrao
      });

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

      // ✅ AGRUPAR movimentações FIFO que ocorrem no mesmo segundo
      const movimentacoesAgrupadas: any[] = [];
      const grupos = new Map<string, any[]>();

      allMovements.forEach(mov => {
        // Chave: timestamp (sem milissegundos) + tipo + observação + source
        const timestamp = new Date(mov.created_at).toISOString().split('.')[0]; // Remove milissegundos
        const chave = `${timestamp}_${mov.tipo}_${mov.observacao || ''}_${mov._source || ''}`;
        
        if (!grupos.has(chave)) {
          grupos.set(chave, []);
        }
        grupos.get(chave)!.push(mov);
      });

      // Consolidar grupos: se houver múltiplas movimentações, somar quantidades e valores
      grupos.forEach(movs => {
        if (movs.length === 1) {
          // Apenas uma movimentação, adicionar diretamente
          movimentacoesAgrupadas.push(movs[0]);
        } else {
          // Múltiplas movimentações FIFO: consolidar em uma única entrada
          const primeiraMovimentacao = movs[0];
          const quantidadeTotal = movs.reduce((sum, m) => sum + (Number(m.quantidade) || 0), 0);
          const valorTotalMovimentacao = movs.reduce((sum, m) => sum + (Number(m.valor_total_movimentacao) || 0), 0);
          
          movimentacoesAgrupadas.push({
            ...primeiraMovimentacao,
            quantidade: quantidadeTotal,
            valor_total_movimentacao: valorTotalMovimentacao,
            _agrupado: true,
            _quantidade_produtos: movs.length
          });
        }
      });

      setTotalCount(movimentacoesAgrupadas.length);

      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedItems = movimentacoesAgrupadas.slice(startIndex, endIndex);

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
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,68,23,0.1)] w-full max-w-[760px] max-h-[90vh] flex flex-col overflow-hidden">

          <div className="flex items-center justify-between p-6 border-b border-[rgba(0,68,23,0.08)]">
            <div className="flex-1">
              <h3 className="text-[18px] font-bold text-[#004417] mb-3">
                {product?.nome}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 text-[14px] text-[rgba(0,68,23,0.8)]">
                <div className="whitespace-nowrap"><strong className="font-semibold">Total Entradas:</strong> <span className="font-bold text-[#004417]">{(() => {
                  // totalEntradas já está em unidade padrão (mg ou mL)
                  const primeiraUnidade = product?.produtos[0]?.unidade || 'un';
                  const unidadePadrao = isMassUnit(primeiraUnidade) ? 'mg' : (isVolumeUnit(primeiraUnidade) ? 'mL' : primeiraUnidade);
                  const scaled = autoScaleQuantity(totalEntradas, unidadePadrao);
                  return `${scaled.quantidade} ${formatUnitAbbreviated(scaled.unidade)}`;
                })()}</span></div>
                <div className="whitespace-nowrap"><strong className="font-semibold">Total Saídas:</strong> <span className="font-bold text-[#004417]">{(() => {
                  // totalSaidas já está em unidade padrão (mg ou mL)
                  const primeiraUnidade = product?.produtos[0]?.unidade || 'un';
                  const unidadePadrao = isMassUnit(primeiraUnidade) ? 'mg' : (isVolumeUnit(primeiraUnidade) ? 'mL' : primeiraUnidade);
                  const scaled = autoScaleQuantity(totalSaidas, unidadePadrao);
                  return `${scaled.quantidade} ${formatUnitAbbreviated(scaled.unidade)}`;
                })()}</span></div>
                <div className="whitespace-nowrap"><strong className="font-semibold">Em estoque:</strong> <span className="font-bold text-[#004417]">{product?.totalEstoqueDisplay.toFixed(2)} <span className="text-[rgba(0,68,23,0.7)] text-[13px]">{formatUnitAbbreviated(product?.unidadeDisplay || product?.produtos[0]?.unidade)}</span></span></div>
              </div>
              
            </div>
            <button
              onClick={onClose}
              className="text-[rgba(0,68,23,0.5)] hover:text-[#00A651] p-1.5 rounded-lg transition-colors ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[rgba(0,166,81,0.3)] scrollbar-track-transparent" data-modal-content>
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
                    <div key={`${m.produto_id}-${m.id}`} className="bg-white shadow-[0_2px_8px_rgba(0,68,23,0.04)] border border-[rgba(0,68,23,0.08)] rounded-xl p-5 relative mb-4">
                      <div className="flex items-start justify-between">

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  {(() => {
                                    const isLanc = m._source === 'lancamento';
                                    const badgeClass = isLanc
                                      ? 'bg-[rgba(247,148,31,0.1)] text-[#F7941F]'
                                      : (m.tipo === 'entrada'
                                        ? 'bg-[rgba(0,166,81,0.1)] text-[#00A651]'
                                        : 'bg-[rgba(247,148,31,0.1)] text-[#F7941F]');
                                    const badgeLabel = isLanc ? 'Aplicação' : (m.tipo === 'entrada' ? 'Entrada' : 'Saída');
                                    const qty = isLanc ? (m.quantidade_val ?? 0) : (m.quantidade ?? 0);
                                    const unit = isLanc ? (m.quantidade_un || m.unidade) : m.unidade;
                                    const qtyUsed = autoScaleQuantity(qty, unit);

                                    return (
                                      <>
                                        <span className={`inline-flex px-3 py-1 rounded-full text-[13px] font-medium ${badgeClass}`}>
                                          {badgeLabel}
                                        </span>
                                        <span className="font-bold text-[#004417] text-[18px] whitespace-nowrap">
                                          {qtyUsed.quantidade} {qtyUsed.unidade}
                                        </span>
                                      </>
                                    );
                                  })()}
                                </div>
                            <div className="text-[rgba(0,68,23,0.65)] text-[13px] text-right">
                              <div>{formatDate(m.created_at)}</div>
                              <div>{formatTime(m.created_at)}</div>
                            </div>
                          </div>

                          {m.observacao && (
                            <p className="text-[13px] text-[rgba(0,68,23,0.85)] mt-2 mb-3">{m.observacao}</p>
                          )}

                          {/* Se for lançamento (aplicação) mostramos atividade, quantidade usada/un e custo calculado */}
                          {m._source === 'lancamento' && (() => {
                            const qtyUsed = autoScaleQuantity(m.quantidade_val ?? 0, m.quantidade_un || m.unidade);
                            return (
                              <div className="text-[13px] text-[rgba(0,68,23,0.85)] space-y-2 mt-2">
                                <div><strong className="font-semibold text-[#004417]">Atividade:</strong> {m.nome_atividade || '—'}</div>
                                <div><strong className="font-semibold text-[#004417]">Quantidade usada:</strong> {qtyUsed.quantidade} {qtyUsed.unidade}</div>
                                <div><strong className="font-semibold text-[#004417]">Custo do produto usado:</strong> {m.custo_calculado != null ? formatSmartCurrency(Number(m.custo_calculado)) : '—'}</div>
                              </div>
                            );
                          })()}

                          {m.tipo === 'entrada' && (() => {
                            // ✅ SIMPLIFICADO: usar valor_unitario diretamente (já contém valor_total)
                            const valorUnitario = m.valor;
                            const unidadeValorOriginal = m.unidade_valor_original || m.unidade;

                            return (
                              <div className="text-[13px] text-[rgba(0,68,23,0.85)] space-y-2 mt-2">
                                <div><strong className="font-semibold text-[#004417]">Marca:</strong> {m.marca || '—'}</div>
                                <div><strong className="font-semibold text-[#004417]">Categoria:</strong> {m.categoria || '—'}</div>
                                <div><strong className="font-semibold text-[#004417]">Fornecedor:</strong> {m.fornecedor || '—'}</div>
                                <div><strong className="font-semibold text-[#004417]">Lote:</strong> {m.lote || '—'}</div>
                                <div><strong className="font-semibold text-[#004417]">Validade:</strong> {formatValidity(m.validade)}</div>
                                <div><strong className="font-semibold text-[#004417]">Registro MAPA:</strong> {m.registro_mapa || '—'}</div>
                                {valorUnitario !== null && valorUnitario !== undefined && valorUnitario > 0 && (
                                  <div><strong className="font-semibold text-[#004417]">Valor:</strong> {formatSmartCurrency(Number(valorUnitario))} / {unidadeValorOriginal}</div>
                                )}
                              </div>
                            );
                          })()}

                          {m.tipo === 'saida' && m._source !== 'lancamento' && (() => {
                            // ✅ USAR VALORES HISTÓRICOS salvos no momento da transação
                            // Estes valores são imutáveis e representam o custo real no momento da saída
                            const valorTotalMovimentacao = m.valor_total_movimentacao || 0;
                            const valorUnitarioMomento = m.valor_unitario_momento || 0;
                            const unidadeValorMomento = m.unidade_valor_momento;
                            
                            console.log('🔍 DEBUG Saída - Dados da movimentação:', {
                              id: m.id,
                              quantidade: m.quantidade,
                              unidade: m.unidade,
                              valor_total_movimentacao: m.valor_total_movimentacao,
                              valor_unitario_momento: m.valor_unitario_momento,
                              unidade_valor_momento: m.unidade_valor_momento
                            });
                            
                            // Se temos o valor total pré-calculado, usar diretamente
                            // Caso contrário, calcular usando o valor unitário do momento
                            let valorTotalSaida = valorTotalMovimentacao;
                            
                            if (valorTotalSaida === 0 && valorUnitarioMomento > 0) {
                              // Fallback: calcular manualmente se valor_total_movimentacao não foi salvo
                              const unidadePadrao = m.unidade; // mg ou mL
                              let quantidadeSaidaConvertida = m.quantidade;
                              
                              if (unidadeValorMomento && unidadePadrao !== unidadeValorMomento) {
                                if (isMassUnit(unidadePadrao) && isMassUnit(unidadeValorMomento)) {
                                  quantidadeSaidaConvertida = convertFromStandardUnit(m.quantidade, 'mg', unidadeValorMomento);
                                } else if (isVolumeUnit(unidadePadrao) && isVolumeUnit(unidadeValorMomento)) {
                                  quantidadeSaidaConvertida = convertFromStandardUnit(m.quantidade, 'mL', unidadeValorMomento);
                                }
                              }
                              
                              valorTotalSaida = valorUnitarioMomento * quantidadeSaidaConvertida;
                            }

                            return valorTotalSaida > 0 ? (
                              <div className="text-[13px] text-[rgba(0,68,23,0.85)] space-y-2 mt-2">
                                <div><strong className="font-semibold text-[#004417]">Valor total da saída:</strong> {formatSmartCurrency(valorTotalSaida)}</div>
                                {valorUnitarioMomento > 0 && unidadeValorMomento && (
                                  <div className="text-[12px] text-[rgba(0,68,23,0.65)]">
                                    Valor unitário no momento: {formatSmartCurrency(valorUnitarioMomento)} / {unidadeValorMomento}
                                  </div>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {m.tipo === 'entrada' && (
                        <div className="md:absolute md:bottom-4 md:right-4 mt-3 md:mt-0 flex justify-end">
                          <button
                            onClick={() => openAttachmentModal(
                              m.produto_id.toString(),
                              m.nome_produto || 'Produto'
                            )}
                            className="text-[#004417] hover:text-[#00A651] transition-colors p-1.5 rounded-lg hover:bg-[rgba(0,166,81,0.08)]"
                            title="Gerenciar Anexos"
                          >
                            <Paperclip className="w-[18px] h-[18px]" />
                          </button>
                        </div>
                      )}
                      {m._source === 'lancamento' && m.atividade_id && (
                        <div className="md:absolute md:bottom-4 md:right-4 mt-3 md:mt-0 flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setActivityAttachmentModal({ isOpen: true, activityId: String(m.atividade_id), activityDescription: m.nome_atividade || 'Atividade' })}
                            className="p-2 text-[#004417] hover:text-[#00A651] hover:bg-[rgba(0,166,81,0.08)] rounded-lg transition-colors"
                            title="Gerenciar anexo da atividade"
                          >
                            <Paperclip className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setActivityDetailModal({ isOpen: true, activityId: String(m.atividade_id) })}
                            className="p-2 text-[#004417] hover:text-[#00A651] hover:bg-[rgba(0,166,81,0.08)] rounded-lg transition-colors"
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
