import { useEffect, useState, useCallback } from 'react';
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

// ============================================================================
// Types
// ============================================================================

interface Props {
  isOpen: boolean;
  product: ProdutoAgrupado | null;
  onClose: () => void;
}

interface MovementItem {
  id: string | number;
  produto_id: number;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  unidade: string;
  observacao?: string | null;
  created_at: string;
  nome_produto: string;
  marca?: string | null;
  categoria?: string | null;
  valor?: number | null;
  unidade_valor_original?: string | null;
  valor_total?: number | null;
  valor_medio?: number | null;
  lote?: string | null;
  validade?: string | null;
  fornecedor?: string | null;
  registro_mapa?: string | null;
  entrada_referencia?: { id: number; lote: string | null; created_at: string } | null;
  _source: 'entrada' | 'saida' | 'lancamento';
  _agrupado?: boolean;
  _quantidade_lotes?: number;
  _entradas_referencia?: { lote: string | null; created_at: string }[];
  nome_atividade?: string;
  atividade_id?: number;
  quantidade_val?: number;
  quantidade_un?: string;
  custo_calculado?: number | null;
}

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 10;
const DEFAULT_DATES = [new Date('1999-12-31').getTime(), new Date('2000-01-01').getTime()];

// ============================================================================
// Helpers
// ============================================================================

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const formatValidity = (validadeStr: string | null | undefined): string => {
  if (!validadeStr) return '—';
  const time = new Date(validadeStr).getTime();
  return DEFAULT_DATES.includes(time) ? '—' : new Date(validadeStr).toLocaleDateString('pt-BR');
};

const getUnidadePadraoFromUnit = (unidade: string): string => {
  if (isMassUnit(unidade)) return 'mg';
  if (isVolumeUnit(unidade)) return 'mL';
  return unidade;
};

const formatQuantityDisplay = (quantidade: number, unidadePadrao: string): string => {
  const scaled = autoScaleQuantity(quantidade, unidadePadrao);
  return `${scaled.quantidade} ${formatUnitAbbreviated(scaled.unidade)}`;
};

// ============================================================================
// Component
// ============================================================================

export default function HistoryMovementsModal({ isOpen, product, onClose }: Props) {
  const [items, setItems] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalEntradas, setTotalEntradas] = useState(0);
  const [totalSaidas, setTotalSaidas] = useState(0);

  const [attachmentModal, setAttachmentModal] = useState({ isOpen: false, productId: '', productName: '' });
  const [activityAttachmentModal, setActivityAttachmentModal] = useState({ isOpen: false, activityId: '', activityDescription: '' });
  const [activityDetailModal, setActivityDetailModal] = useState({ isOpen: false, activityId: '' });

  const unidadePadrao = product?.produtos[0]?.unidade 
    ? getUnidadePadraoFromUnit(product.produtos[0].unidade) 
    : 'un';

  // --------------------------------------------------------------------------
  // Data Loading
  // --------------------------------------------------------------------------

  const loadTotals = useCallback(async () => {
    if (!product) return;

    try {
      const entradas = product.entradas.reduce((sum, e) => sum + (e.quantidade || 0), 0);
      let saidas = product.saidas.reduce((sum, s) => sum + (s.quantidade || 0), 0);

      const produtoIds = product.produtos.map(p => p.id);
      const lancamentos = await EstoqueService.getLancamentosPorProdutos(produtoIds);

      for (const l of lancamentos) {
        const quantidade = l.quantidade_val ?? 0;
        const unidade = l.quantidade_un || 'un';
        
        if (unidadePadrao !== 'un' && unidade !== unidadePadrao) {
          saidas += convertToStandardUnit(quantidade, unidade).quantidade;
        } else {
          saidas += quantidade;
        }
      }

      setTotalEntradas(entradas);
      setTotalSaidas(saidas);
    } catch (error) {
      console.error('Erro ao carregar totais:', error);
    }
  }, [product, unidadePadrao]);

  const calcularCustoLancamento = useCallback((lancamento: LancamentoProdutoEntry, produtoInfo: any): number | null => {
    const quantidadeVal = lancamento.quantidade_val ?? 0;
    const unidadeQuant = lancamento.quantidade_un || produtoInfo?.unidade || 'un';

    if (quantidadeVal <= 0 || !produtoInfo) return null;

    const unidadeValorOriginal = produtoInfo.unidade_valor_original || produtoInfo.unidade || 'un';
    let valorUnitarioNaUnidadeOriginal = 0;

    if (produtoInfo.valor_total != null && produtoInfo.quantidade_inicial > 0) {
      const unidadeProd = produtoInfo.unidade;
      let quantidadeInicialConvertida = produtoInfo.quantidade_inicial;

      if (unidadeProd !== unidadeValorOriginal) {
        if (isMassUnit(unidadeProd) && isMassUnit(unidadeValorOriginal)) {
          quantidadeInicialConvertida = convertFromStandardUnit(produtoInfo.quantidade_inicial, 'mg', unidadeValorOriginal);
        } else if (isVolumeUnit(unidadeProd) && isVolumeUnit(unidadeValorOriginal)) {
          quantidadeInicialConvertida = convertFromStandardUnit(produtoInfo.quantidade_inicial, 'mL', unidadeValorOriginal);
        }
      }
      
      // Validar divisão por zero
      if (quantidadeInicialConvertida <= 0) return null;
      valorUnitarioNaUnidadeOriginal = produtoInfo.valor_total / quantidadeInicialConvertida;
    } else if (produtoInfo.valor != null) {
      const unidadeProd = produtoInfo.unidade;
      if (unidadeProd !== unidadeValorOriginal) {
        const fatorConversao = convertToStandardUnit(1, unidadeValorOriginal).quantidade;
        valorUnitarioNaUnidadeOriginal = produtoInfo.valor * fatorConversao;
      } else {
        valorUnitarioNaUnidadeOriginal = produtoInfo.valor;
      }
    }

    // Se não conseguiu calcular o valor unitário, retornar null
    if (!valorUnitarioNaUnidadeOriginal || !isFinite(valorUnitarioNaUnidadeOriginal)) return null;

    let quantidadeNaUnidadeDoValor = quantidadeVal;
    if (unidadeQuant !== unidadeValorOriginal) {
      if (isMassUnit(unidadeQuant) && isMassUnit(unidadeValorOriginal)) {
        const quantidadeEmMg = convertToStandardUnit(quantidadeVal, unidadeQuant).quantidade;
        quantidadeNaUnidadeDoValor = convertFromStandardUnit(quantidadeEmMg, 'mg', unidadeValorOriginal);
      } else if (isVolumeUnit(unidadeQuant) && isVolumeUnit(unidadeValorOriginal)) {
        const quantidadeEmMl = convertToStandardUnit(quantidadeVal, unidadeQuant).quantidade;
        quantidadeNaUnidadeDoValor = convertFromStandardUnit(quantidadeEmMl, 'mL', unidadeValorOriginal);
      }
    }

    const custoFinal = valorUnitarioNaUnidadeOriginal * quantidadeNaUnidadeDoValor;
    
    // Validar resultado final
    if (!isFinite(custoFinal) || isNaN(custoFinal)) return null;
    
    return custoFinal;
  }, []);

  const loadData = useCallback(async (page: number) => {
    if (!product) return;
    setLoading(true);

    try {
      const allMovements: MovementItem[] = [];

      // Mapear entradas
      for (const entrada of product.entradas) {
        allMovements.push({
          id: entrada.id,
          produto_id: entrada.id,
          tipo: 'entrada',
          quantidade: entrada.quantidade,
          created_at: entrada.created_at || new Date().toISOString(),
          nome_produto: entrada.nome_produto,
          marca: entrada.marca,
          categoria: entrada.categoria,
          unidade: entrada.unidade,
          valor: entrada.valor,
          unidade_valor_original: entrada.unidade_valor_original,
          valor_total: entrada.valor_total,
          valor_medio: entrada.valor_medio,
          lote: entrada.lote,
          validade: entrada.validade,
          fornecedor: entrada.fornecedor,
          registro_mapa: entrada.registro_mapa,
          _source: 'entrada'
        });
      }

      // Mapear saídas
      for (const saida of product.saidas) {
        const entradaRef = product.entradas.find(e => e.id === saida.entrada_referencia_id);
        allMovements.push({
          id: saida.id,
          produto_id: saida.id,
          tipo: 'saida',
          quantidade: saida.quantidade,
          created_at: saida.created_at || new Date().toISOString(),
          nome_produto: saida.nome_produto,
          marca: saida.marca,
          categoria: saida.categoria,
          unidade: saida.unidade,
          valor: saida.valor,
          unidade_valor_original: saida.unidade_valor_original,
          valor_total: saida.valor_total,
          valor_medio: saida.valor_medio,
          lote: saida.lote,
          validade: saida.validade,
          fornecedor: saida.fornecedor,
          registro_mapa: saida.registro_mapa,
          entrada_referencia: entradaRef ? { id: entradaRef.id, lote: entradaRef.lote, created_at: entradaRef.created_at || new Date().toISOString() } : null,
          _source: 'saida'
        });
      }

      // Buscar lançamentos (aplicações)
      const produtoIds = product.produtos.map(p => p.id);
      try {
        const lancamentos = await EstoqueService.getLancamentosPorProdutos(produtoIds);
        for (const l of lancamentos) {
          const produtoInfo = product.produtos.find(p => Number(p.id) === Number(l.produto_id));
          const quantidadeVal = l.quantidade_val ?? 0;
          const unidadeQuant = l.quantidade_un || produtoInfo?.unidade || 'un';

          allMovements.push({
            id: l.id,
            produto_id: l.produto_id as number,
            tipo: 'saida',
            quantidade: quantidadeVal,
            observacao: l.observacao,
            created_at: l.atividade?.created_at || l.created_at || new Date().toISOString(),
            nome_produto: produtoInfo?.nome_produto || product.nome,
            marca: produtoInfo?.marca,
            categoria: produtoInfo?.categoria,
            unidade: unidadeQuant,
            valor: produtoInfo?.valor,
            lote: produtoInfo?.lote,
            validade: produtoInfo?.validade,
            fornecedor: produtoInfo?.fornecedor,
            registro_mapa: produtoInfo?.registro_mapa,
            nome_atividade: l.atividade?.nome_atividade || 'Atividade',
            atividade_id: l.atividade_id ? Number(l.atividade_id) : undefined,
            quantidade_val: quantidadeVal,
            quantidade_un: unidadeQuant,
            custo_calculado: calcularCustoLancamento(l, produtoInfo),
            _source: 'lancamento'
          });
        }
      } catch (err) {
        console.error('Erro ao buscar lançamentos:', err);
      }

      // Ordenar por data (mais recente primeiro)
      allMovements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Agrupar saídas FIFO simultâneas
      const grupos = new Map<string, MovementItem[]>();
      allMovements.forEach(mov => {
        const timestamp = new Date(mov.created_at).toISOString().split('.')[0];
        const chave = `${timestamp}_${mov.tipo}_${mov.observacao || ''}`;
        if (!grupos.has(chave)) grupos.set(chave, []);
        grupos.get(chave)!.push(mov);
      });

      const movimentacoesAgrupadas: MovementItem[] = [];
      grupos.forEach(movs => {
        if (movs.length === 1) {
          movimentacoesAgrupadas.push(movs[0]);
        } else {
          const primeiro = movs[0];
          const quantidadeTotal = movs.reduce((sum, m) => sum + (m.quantidade || 0), 0);
          const valorTotal = movs.reduce((sum, m) => sum + (m.valor_total || (m.valor_medio ? m.valor_medio * m.quantidade : 0)), 0);
          const entradasRef = movs.filter(m => m.entrada_referencia).map(m => m.entrada_referencia!);

          movimentacoesAgrupadas.push({
            ...primeiro,
            quantidade: quantidadeTotal,
            valor_total: valorTotal,
            _agrupado: true,
            _quantidade_lotes: movs.length,
            _entradas_referencia: entradasRef
          });
        }
      });

      setTotalCount(movimentacoesAgrupadas.length);

      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      setItems(movimentacoesAgrupadas.slice(startIndex, startIndex + ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  }, [product, calcularCustoLancamento]);

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (isOpen && product) {
      setCurrentPage(1);
      loadTotals();
    }
  }, [isOpen, product, loadTotals]);

  useEffect(() => {
    if (isOpen && product) {
      loadData(currentPage);
    }
  }, [isOpen, product, currentPage, loadData]);

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    document.querySelector('[data-modal-content]')?.scrollTo(0, 0);
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (!isOpen || !product) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-[16px] shadow-[0_4px_12px_rgba(0,68,23,0.1)] w-full max-w-[760px] max-h-[90vh] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[rgba(0,68,23,0.08)]">
            <div className="flex-1">
              <h3 className="text-[18px] font-bold text-[#004417] mb-3">{product.nome}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 text-[14px] text-[rgba(0,68,23,0.8)]">
                <div className="whitespace-nowrap">
                  <strong className="font-semibold">Total Entradas:</strong>{' '}
                  <span className="font-bold text-[#004417]">{formatQuantityDisplay(totalEntradas, unidadePadrao)}</span>
                </div>
                <div className="whitespace-nowrap">
                  <strong className="font-semibold">Total Saídas:</strong>{' '}
                  <span className="font-bold text-[#004417]">{formatQuantityDisplay(totalSaidas, unidadePadrao)}</span>
                </div>
                <div className="whitespace-nowrap">
                  <strong className="font-semibold">Em estoque:</strong>{' '}
                  <span className="font-bold text-[#004417]">
                    {product.totalEstoqueDisplay.toFixed(2)}{' '}
                    <span className="text-[rgba(0,68,23,0.7)] text-[13px]">
                      {formatUnitAbbreviated(product.unidadeDisplay || product.produtos[0]?.unidade)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[rgba(0,68,23,0.5)] hover:text-[#00A651] p-1.5 rounded-lg transition-colors ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-[rgba(0,166,81,0.25)] scrollbar-track-transparent" data-modal-content>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="text-gray-600 mt-2">Carregando histórico...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma movimentação encontrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((m) => (
                  <MovementCard
                    key={`${m.produto_id}-${m.id}`}
                    movement={m}
                    onOpenAttachment={(id, name) => setAttachmentModal({ isOpen: true, productId: id, productName: name })}
                    onOpenActivityAttachment={(id, desc) => setActivityAttachmentModal({ isOpen: true, activityId: id, activityDescription: desc })}
                    onOpenActivityDetail={(id) => setActivityDetailModal({ isOpen: true, activityId: id })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalCount > ITEMS_PER_PAGE && (
            <div className="p-4 border-t border-[rgba(0,68,23,0.08)] bg-[rgba(0,68,23,0.01)]">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / ITEMS_PER_PAGE)}
                totalItems={totalCount}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
                isLoading={loading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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
        activityDescription=""
      />
    </>
  );
}

// ============================================================================
// MovementCard Component
// ============================================================================

interface MovementCardProps {
  movement: MovementItem;
  onOpenAttachment: (productId: string, productName: string) => void;
  onOpenActivityAttachment: (activityId: string, description: string) => void;
  onOpenActivityDetail: (activityId: string) => void;
}

function MovementCard({ movement: m, onOpenAttachment, onOpenActivityAttachment, onOpenActivityDetail }: MovementCardProps) {
  const isLancamento = m._source === 'lancamento';
  const isEntrada = m.tipo === 'entrada';
  const badgeClass = isLancamento
    ? 'bg-[rgba(202,219,42,0.18)] text-[#004417]'
    : isEntrada
      ? 'bg-[rgba(0,166,81,0.15)] text-[#00A651]'
      : 'bg-[rgba(247,148,31,0.15)] text-[#F7941F]';

  const badgeLabel = isLancamento ? 'Aplicação' : isEntrada ? 'Entrada' : 'Saída';
  const qty = isLancamento ? (m.quantidade_val ?? 0) : (m.quantidade ?? 0);
  const unit = isLancamento ? (m.quantidade_un || m.unidade || 'un') : (m.unidade || 'un');
  const qtyScaled = autoScaleQuantity(qty, unit);
  
  // Garantir que quantidade exibida não seja NaN
  const quantidadeDisplay = isNaN(qtyScaled.quantidade) ? 0 : qtyScaled.quantidade;
  const unidadeDisplay = qtyScaled.unidade || 'un';

  return (
    <div className="bg-white border border-[rgba(0,68,23,0.08)] shadow-[0_2px_8px_rgba(0,68,23,0.04)] rounded-xl p-5 relative">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-3 py-1.5 rounded-full text-[13px] font-semibold ${badgeClass}`}>
                {badgeLabel}
              </span>
              <span className="font-bold text-[18px] whitespace-nowrap text-[#004417]">
                {quantidadeDisplay} {unidadeDisplay}
              </span>
              {m._agrupado && (
                <span className="text-[11px] text-[#004417] bg-[rgba(0,68,23,0.05)] px-2 py-1 rounded">
                  {m._quantidade_lotes} lotes
                </span>
              )}
            </div>
            <div className="text-[rgba(0,68,23,0.65)] text-[13px] text-right">
              <div className="font-medium">{formatDate(m.created_at)}</div>
              <div className="text-[12px]">{formatTime(m.created_at)}</div>
            </div>
          </div>

          {/* Observação */}
          {m.observacao && (
            <p className="text-[13px] text-[rgba(0,68,23,0.85)] mt-2 mb-3 italic bg-[rgba(0,68,23,0.03)] px-3 py-2 rounded-lg">
              "{m.observacao || ""}"
            </p>
          )}

          {/* Lançamento (Aplicação) */}
          {isLancamento && (
            <LancamentoDetails
              nomeAtividade={m.nome_atividade}
              quantidade={m.quantidade_val ?? 0}
              unidade={m.quantidade_un || m.unidade || 'un'}
              custoCalculado={m.custo_calculado}
            />
          )}

          {/* Entrada */}
          {isEntrada && <EntradaDetails movement={m} />}

          {/* Saída (não lançamento) */}
          {!isEntrada && !isLancamento && <SaidaDetails movement={m} />}
        </div>
      </div>

      {/* Action Buttons */}
      {isEntrada && (
        <div className="md:absolute md:bottom-4 md:right-4 mt-3 md:mt-0 flex justify-end">
          <button
            onClick={() => onOpenAttachment(m.produto_id.toString(), m.nome_produto || 'Produto')}
            className="text-[#004417] hover:text-[#00A651] transition-colors p-1.5 rounded-lg hover:bg-[rgba(0,166,81,0.08)]"
            title="Gerenciar Anexos"
          >
            <Paperclip className="w-[18px] h-[18px]" />
          </button>
        </div>
      )}

      
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function LancamentoDetails({ nomeAtividade, quantidade, unidade, custoCalculado }: {
  nomeAtividade?: string;
  quantidade: number;
  unidade: string;
  custoCalculado?: number | null;
}) {
  const qtyScaled = autoScaleQuantity(quantidade, unidade);
  
  // Verifica se o custo é válido (não null, não undefined e não NaN)
  const custoValido = custoCalculado != null && !isNaN(custoCalculado) && isFinite(custoCalculado);
  
  // Validar qtyScaled para prevenir NaN na renderização
  const quantidadeDisplay = isNaN(qtyScaled.quantidade) ? 0 : qtyScaled.quantidade;
  const unidadeDisplay = qtyScaled.unidade || 'un';
  
  return (
    <div className="mt-3 rounded-lg border border-[rgba(0,68,23,0.08)] bg-[rgba(202,219,42,0.08)] p-3 text-[13px] text-[rgba(0,68,23,0.85)] space-y-2">
      <div><strong className="font-semibold text-[#004417]">Atividade:</strong> {nomeAtividade || '—'}</div>
      <div><strong className="font-semibold text-[#004417]">Quantidade usada:</strong> {quantidadeDisplay} {unidadeDisplay}</div>
      <div><strong className="font-semibold text-[#004417]">Custo do produto usado:</strong> {custoValido ? formatSmartCurrency(custoCalculado) : '—'}</div>
    </div>
  );
}

function EntradaDetails({ movement: m }: { movement: MovementItem }) {
  const valorUnitario = m.valor || m.valor_medio;
  const unidadeValorOriginal = m.unidade_valor_original || m.unidade;

  return (
    <div className="bg-white rounded-lg p-4 mt-3 border border-[rgba(0,68,23,0.08)]">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px] text-[rgba(0,68,23,0.85)]">
        <div><strong className="font-semibold text-[#004417]">Marca:</strong> {m.marca || '—'}</div>
        <div><strong className="font-semibold text-[#004417]">Categoria:</strong> {m.categoria || '—'}</div>
        <div><strong className="font-semibold text-[#004417]">Fornecedor:</strong> {m.fornecedor || '—'}</div>
        <div><strong className="font-semibold text-[#004417]">Lote:</strong> {m.lote || '—'}</div>
        <div><strong className="font-semibold text-[#004417]">Validade:</strong> {formatValidity(m.validade)}</div>
        <div><strong className="font-semibold text-[#004417]">Registro MAPA:</strong> {m.registro_mapa || '—'}</div>
      </div>
      {valorUnitario != null && valorUnitario > 0 && (
        <div className="mt-4 pt-3 border-t border-[rgba(0,68,23,0.08)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[13px]">
            <div>
              <strong className="font-semibold text-[#004417]">Valor Unitário:</strong>{' '}
              <span className="text-[#004417]">{formatSmartCurrency(valorUnitario)} / {unidadeValorOriginal}</span>
            </div>
            {m.valor_total && (
              <div className="text-[15px] font-bold text-[#00A651]">
                Total: {formatSmartCurrency(m.valor_total)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SaidaDetails({ movement: m }: { movement: MovementItem }) {
  const valorTotal = m.valor_total || (m.valor_medio ? m.valor_medio * m.quantidade : 0);
  const valorUnitario = m.valor || m.valor_medio;
  const unidadeValorOriginal = m.unidade_valor_original || m.unidade;

  return (
    <div className="bg-white rounded-lg p-4 mt-3 border border-[rgba(0,68,23,0.08)]">
      {m._agrupado && m._entradas_referencia && m._entradas_referencia.length > 0 && (
        <div className="mb-3 pb-3 border-b border-[rgba(0,68,23,0.08)]">
          <strong className="font-semibold text-[#004417] text-[13px]">Lotes removidos (FIFO):</strong>
          <div className="mt-2 space-y-1">
            {m._entradas_referencia.map((entrada, idx) => (
              <div key={idx} className="text-[12px] text-[rgba(0,68,23,0.7)] flex items-center gap-2">
                <span className="w-2 h-2 bg-[#CADB2A] rounded-full" />
                Lote: {entrada.lote || 'S/N'} • {formatDate(entrada.created_at)}
              </div>
            ))}
          </div>
        </div>
      )}
      {valorTotal > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-[13px] text-[rgba(0,68,23,0.85)]">
            <strong className="font-semibold text-[#004417]">Valor Unitário:</strong>{' '}
            <span className="text-[#004417]">{formatSmartCurrency(Number(valorUnitario))} / {unidadeValorOriginal}</span>
          </div>
          <div className="text-[15px] font-bold text-[#F7941F]">
            Total: {formatSmartCurrency(valorTotal)}
          </div>
        </div>
      )}
    </div>
  );
}
