import { useEffect, useState, useCallback } from 'react';
import { X, Paperclip } from 'lucide-react';
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import { EstoqueService } from '../../services/estoqueService';
import AttachmentProductModal from './AttachmentProductModal';
import ActivityAttachmentModal from '../ManejoAgricola/ActivityAttachmentModal';
import ActivityDetailModal from '../ManejoAgricola/ActivityDetailModal';
import Pagination from './Pagination';
import { formatUnitAbbreviated } from '../../lib/formatUnit';
import { autoScaleQuantity, convertFromStandardUnit, convertToStandardUnit, isMassUnit, isVolumeUnit, convertBetweenUnits } from '../../lib/unitConverter';
import { formatCurrency } from '../../lib/currencyFormatter';

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
  tipo: 'entrada' | 'saida' | 'aplicacao';
  quantidade: number;
  unidade: string;
  unidade_base?: string; // <- Adicionado para refletir campo da view
  observacao?: string | null;
  created_at: string;
  nome_produto: string;
  marca?: string | null;
  categoria?: string | null;
  valor?: number | null;
  unidade_valor_original?: string | null;
  numero_nota_fiscal?: string | null;
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
  nota_fiscal?: boolean | null;
  unidade_nota_fiscal?: string | null;
  custo_total_aplicacao?: number | null;
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

const formatQuantityDisplay = (quantidade: number, unidade: string): string => {
  // Se a unidade não for reconhecida por autoScale, exibe a quantidade e unidade originais
  try {
    const scaled = autoScaleQuantity(quantidade, unidade);
    // Se autoScale retornou unidade diferente de 'un', usa ela; senão, usa a original
    if (scaled.unidade && scaled.unidade !== 'un') {
      return `${scaled.quantidade} ${formatUnitAbbreviated(scaled.unidade)}`;
    }
    // Se unidade original não for 'un', exibe a original
    if (unidade && unidade !== 'un') {
      return `${quantidade} ${formatUnitAbbreviated(unidade)}`;
    }
    // Fallback
    return `${quantidade} un`;
  } catch {
    // Em caso de erro, exibe a quantidade e unidade originais
    return `${quantidade} ${formatUnitAbbreviated(unidade)}`;
  }
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

  // Unidade base real das movimentações (view)
  const [unidadeMovimentacao, setUnidadeMovimentacao] = useState<string>('un');

  // --------------------------------------------------------------------------
  // Data Loading
  // --------------------------------------------------------------------------

  // Agora os totais são calculados a partir das movimentações reais (allMovements)
  const calcularTotaisMovimentacoes = useCallback((movs: MovementItem[]) => {
    let entradas = 0;
    let saidas = 0;
    let unidadeBase = 'un';
    if (movs.length > 0) {
      unidadeBase = movs[0].unidade_base || movs[0].unidade_valor_original || movs[0].unidade || 'un';
    }
    movs.forEach((m) => {
      // `m.quantidade` já representa a quantidade na unidade base (mudei o mapeamento abaixo)
      let quantidade = m.quantidade ?? 0;
      if (m.tipo === 'entrada') {
        entradas += quantidade;
      } else {
        saidas += quantidade;
      }
    });
    setTotalEntradas(entradas);
    setTotalSaidas(saidas);
    setUnidadeMovimentacao(unidadeBase);
  }, []);

  const loadData = useCallback(async (page: number) => {
    if (!product) return;
    setLoading(true);
    try {
      // Busca movimentações completas da view para todos os produtos do grupo
      const produtoIds = product.produtos.map(p => p.produto_id || p.id);
      console.log('[HistoryMovementsModal] Buscando movimentações para produtoIds:', produtoIds);
      const allMovementsRaw = await EstoqueService.getMovimentacoesPorProdutos(produtoIds);
      console.log('[HistoryMovementsModal] Resultado bruto da view vw_estoque_movimentacoes_completas:', allMovementsRaw);
      if (allMovementsRaw && allMovementsRaw.length > 0) {
        console.log('[HistoryMovementsModal] RAW movement keys example:', Object.keys(allMovementsRaw[0]));
        allMovementsRaw.forEach((mov: any, idx: number) => {
          console.log(`[HistoryMovementsModal] raw[${idx}] sample fields: quantidade=${mov.quantidade} quantidade_base=${mov.quantidade_base} quantidade_documento=${mov.quantidade_documento} quantidade_original=${mov.quantidade_original} unidade=${mov.unidade} unidade_base=${mov.unidade_base} unidade_documento=${mov.unidade_documento} unidade_original=${mov.unidade_original}`);
        });
      }

      // Mapeamento dos campos da view para MovementItem
      // Observação: priorizamos a quantidade convertida para unidade base (`quantidade_documento_em_base`)
      // quando disponível; caso contrário usamos `quantidade_base`.
      const allMovements: MovementItem[] = allMovementsRaw.map((mov: any) => ({
        id: mov.movimento_id || mov.id,
        produto_id: mov.produto_id,
        // Usa o campo correto ('tipo' ou 'tipo_movimento'), trata como .toUpperCase()
        tipo: (() => {
          const tipoMov = String(mov.tipo_movimento ?? mov.tipo ?? '').toUpperCase();
          const docTipo = String(mov.documento_tipo ?? mov.origem_tipo ?? '').toUpperCase();
          if (tipoMov === 'ENTRADA') return 'entrada';
          if (tipoMov === 'SAIDA' && docTipo === 'APLICACAO') return 'aplicacao';
          return 'saida';
        })(),
        // `quantidade` deve representar a quantidade em UNIDADE BASE (para totais).
        // Se a view expôs `quantidade_documento_em_base` (conversão do item do documento para a unidade base),
        // usamos esse valor. Senão, usamos `quantidade_base` presente no movimento.
        quantidade: (mov.quantidade_documento_em_base != null ? Number(mov.quantidade_documento_em_base) : (Number(mov.quantidade_base) || 0)),
        unidade: mov.unidade_base || 'un',
        observacao: mov.observacao || null,
        created_at: mov.criado_em,
        nome_produto: mov.nome_produto || '',
        marca: mov.marca,
        categoria: mov.categoria,
        valor: mov.custo_unitario_base ? Number(mov.custo_unitario_base) : null,
        unidade_valor_original: mov.unidade_base,
        numero_nota_fiscal: null, // pode mapear se houver campo
        valor_total: mov.valor_total ? Number(mov.valor_total) : null,
        valor_medio: mov.custo_unitario_base ? Number(mov.custo_unitario_base) : null,
        lote: mov.lote,
        validade: mov.validade,
        fornecedor: mov.fornecedor,
        registro_mapa: mov.registro_mapa,
        entrada_referencia: null, // pode mapear se houver campo
        // _source: identifica o tipo para exibição
        _source: (() => {
          const tipoRaw = mov.tipo ?? mov.tipo_movimento ?? '';
          const tipo = String(tipoRaw).toUpperCase();
          if (tipo === 'ENTRADA') return 'entrada';
          if (tipo === 'APLICACAO') return 'lancamento';
          return 'saida';
        })(),
        _agrupado: false,
        _quantidade_lotes: undefined,
        _entradas_referencia: undefined,
        nome_atividade: mov.nome_atividade || mov.atividade_nome || mov.atividade || undefined,
        atividade_id: mov.atividade_id || undefined,
        // Para exibição da aplicação, preferir os campos originais do documento (quantidade/unidade do item)
        quantidade_val: (
          mov.quantidade_documento ?? mov.quantidade ?? mov.quantidade_original ?? mov.quantidade_item ?? mov.quantidade_itens ?? mov.qtde ?? null
        ) != null ? Number(mov.quantidade_documento ?? mov.quantidade ?? mov.quantidade_original ?? mov.quantidade_item ?? mov.quantidade_itens ?? mov.qtde) : (mov.quantidade_base ? Number(mov.quantidade_base) : undefined),
        quantidade_un: (
          mov.unidade_documento ?? mov.unidade ?? mov.unidade_original ?? mov.unidade_item ?? mov.unidade_itens ?? null
        ) || mov.unidade_base || undefined,
        custo_calculado: mov.valor_total ? Number(mov.valor_total) : undefined,
        // Prioriza custo calculado no documento (campo calculado na view), depois fallback para custo_total_aplicacao ou custo_calculado
        custo_total_aplicacao: mov.custo_total_aplicacao_documento ? Number(mov.custo_total_aplicacao_documento) : (mov.custo_total_aplicacao ? Number(mov.custo_total_aplicacao) : undefined),
        nota_fiscal: undefined,
        unidade_nota_fiscal: undefined,
      }));

      // Calcular totais reais a partir das movimentações
      calcularTotaisMovimentacoes(allMovements);

      // Paginação manual
      allMovements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setTotalCount(allMovements.length);
      const startIndex = (page - 1) * ITEMS_PER_PAGE;
      const paginated = allMovements.slice(startIndex, startIndex + ITEMS_PER_PAGE);
      console.log('[HistoryMovementsModal] Movimentações paginadas para exibir:', paginated);
      setItems(paginated);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
  }, [product, calcularTotaisMovimentacoes]);

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (isOpen && product) {
      setCurrentPage(1);
    }
  }, [isOpen, product]);

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
                  <span className="font-bold text-[#004417]">{formatQuantityDisplay(totalEntradas, unidadeMovimentacao)}</span>
                </div>
                <div className="whitespace-nowrap">
                  <strong className="font-semibold">Total Saídas:</strong>{' '}
                  <span className="font-bold text-[#004417]">{formatQuantityDisplay(totalSaidas, unidadeMovimentacao)}</span>
                </div>
                <div className="whitespace-nowrap">
                  <strong className="font-semibold">Em estoque:</strong>{' '}
                  <span className="font-bold text-[#004417]">{formatQuantityDisplay(totalEntradas - totalSaidas, unidadeMovimentacao)}</span>
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
}

function MovementCard({ movement: m, onOpenAttachment }: MovementCardProps) {
  // Considera aplicação se tipo === 'aplicacao' OU _source === 'lancamento'
  const isAplicacao = m.tipo === 'aplicacao' || m._source === 'lancamento';
  const isEntrada = m.tipo === 'entrada';
  const badgeClass = isAplicacao
    ? 'bg-[rgba(202,219,42,0.18)] text-[#004417]'
    : isEntrada
      ? 'bg-[rgba(0,166,81,0.15)] text-[#00A651]'
      : 'bg-[rgba(247,148,31,0.15)] text-[#F7941F]';

  const badgeLabel = isAplicacao ? 'Aplicação' : isEntrada ? 'Entrada' : 'Saída';
  const qty = isAplicacao ? (m.quantidade_val ?? 0) : (m.quantidade ?? 0);
  const unit = isAplicacao ? (m.quantidade_un || m.unidade || 'un') : (m.unidade || 'un');

  // Validar quantidade de entrada - se for NaN, null ou inválida, usar 0
  let qtySegura = 0;
  if (typeof qty === 'number' && !isNaN(qty) && isFinite(qty)) {
    qtySegura = qty;
  }

  // Validar unidade - se vazia ou inválida, usar 'un'
  const unitSegura = (unit && typeof unit === 'string' && unit.trim() !== '') ? unit : 'un';

  // Para entradas, converter para unidade_valor_original se disponível
  let quantidadeParaExibir = qtySegura;
  let unidadeParaExibir = unitSegura;

  if (isEntrada && m.unidade_valor_original && m.unidade_valor_original !== unitSegura) {
    try {
      quantidadeParaExibir = convertBetweenUnits(qtySegura, unitSegura, m.unidade_valor_original);
      unidadeParaExibir = m.unidade_valor_original;
    } catch (error) {
      console.error('Erro ao converter para unidade_valor_original:', error);
    }
  }

  // Escalar com try-catch e validação completa
  let resultadoFinal = { quantidade: quantidadeParaExibir, unidade: unidadeParaExibir };

  try {
    const scaled = autoScaleQuantity(quantidadeParaExibir, unidadeParaExibir);

    // Validar resultado do autoScaleQuantity
    if (scaled &&
        typeof scaled.quantidade === 'number' &&
        !isNaN(scaled.quantidade) &&
        isFinite(scaled.quantidade) &&
        scaled.unidade &&
        typeof scaled.unidade === 'string') {
      resultadoFinal = scaled;
    }
  } catch (error) {
    console.error('Erro ao escalar quantidade no badge:', error);
  }

  // Formatar para exibição com garantia de formato numérico válido
  const quantidadeDisplay = resultadoFinal.quantidade.toFixed(2);
  const unidadeDisplay = resultadoFinal.unidade;

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
                {String(quantidadeDisplay).replace(/NaN/g, '0.00')} {String(unidadeDisplay).replace(/NaN/g, 'un')}
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

          {/* Aplicação */}
          {isAplicacao && (
            <LancamentoDetails
              nomeAtividade={m.nome_atividade}
              quantidade={m.quantidade_val ?? 0}
              unidade={m.quantidade_un || m.unidade || 'un'}
              custoCalculado={m.custo_calculado}
              valorUnitario={m.valor}
              unidadeValor={m.unidade_valor_original || m.unidade}
              valorTotal={m.valor_total}
              custoTotalAplicacao={m.custo_total_aplicacao}
            />
          )}

          {/* Entrada */}
          {isEntrada && <EntradaDetails movement={m} />}

          {/* Saída (não aplicação/entrada) */}
          {!isEntrada && !isAplicacao && <SaidaDetails movement={m} />}
        </div>
      </div>

      {/* Action Buttons */}
      {isEntrada && (
        <div className="mt-3 flex justify-end">
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

function LancamentoDetails({ nomeAtividade, quantidade, unidade, custoCalculado, valorUnitario, unidadeValor, valorTotal, custoTotalAplicacao }: {
  nomeAtividade?: string;
  quantidade: number;
  unidade: string;
  custoCalculado?: number | null;
  valorUnitario?: number | null;
  unidadeValor?: string | null;
  valorTotal?: number | null;
  custoTotalAplicacao?: number | null;
}) {
    let quantidadeSegura = 0;
    if (typeof quantidade === 'number' && !isNaN(quantidade) && isFinite(quantidade)) {
      quantidadeSegura = quantidade;
    }
    const unidadeSegura = (unidade && typeof unidade === 'string' && unidade.trim() !== '') ? unidade : 'un';

    // Fallback de custo: prioriza custo_total_aplicacao (documento) > valor_total > custo_calculado > valorUnitario * quantidade
    let custoFinal = null;
    if (custoTotalAplicacao != null && !isNaN(custoTotalAplicacao) && isFinite(custoTotalAplicacao) && custoTotalAplicacao > 0) {
      custoFinal = custoTotalAplicacao;
    } else if (valorTotal != null && !isNaN(valorTotal) && isFinite(valorTotal) && valorTotal > 0) {
      custoFinal = valorTotal;
    } else if (custoCalculado != null && !isNaN(custoCalculado) && isFinite(custoCalculado) && custoCalculado > 0) {
      custoFinal = custoCalculado;
    } else if (
      valorUnitario != null &&
      typeof valorUnitario === 'number' &&
      !isNaN(valorUnitario) &&
      isFinite(valorUnitario) &&
      valorUnitario > 0
    ) {
      custoFinal = quantidadeSegura * valorUnitario;
    }

    // Formatação
    let quantidadeFormatada = quantidadeSegura.toFixed(2);
    let unidadeFormatada = unidadeSegura;
    try {
      const qtyScaled = autoScaleQuantity(quantidadeSegura, unidadeSegura);
      if (
        qtyScaled &&
        typeof qtyScaled.quantidade === 'number' &&
        !isNaN(qtyScaled.quantidade) &&
        isFinite(qtyScaled.quantidade) &&
        qtyScaled.unidade
      ) {
        quantidadeFormatada = qtyScaled.quantidade.toFixed(2);
        unidadeFormatada = qtyScaled.unidade;
      }
    } catch {}

    const atividadeTexto = String(nomeAtividade || '—').replace(/NaN/g, '—');
    const quantidadeTexto = String(quantidadeFormatada).replace(/NaN/g, '0.00');
    const unidadeTexto = String(unidadeFormatada).replace(/NaN/g, 'un');

    return (
      <div className="mt-3 rounded-lg border border-[rgba(0,68,23,0.08)] bg-[rgba(202,219,42,0.08)] p-3 text-[13px] text-[rgba(0,68,23,0.85)]">
        {/* Removido: título da atividade e quantidade usada para cards de aplicação */}
        {/* Exibe apenas o custo do produto usado */}
        {custoFinal != null && custoFinal > 0 ? (
          <div>
            <strong className="font-semibold text-[#004417]">Custo do produto usado:</strong> {formatCurrency(custoFinal)}
          </div>
        ) : (
          <div>
            <strong className="font-semibold text-[#004417]">Custo do produto usado:</strong> —
          </div>
        )}
      </div>
    );
  }

function EntradaDetails({ movement: m }: { movement: MovementItem }) {
  const valorUnitario = m.valor || m.valor_medio;
  const valorUnitarioValido = valorUnitario != null && !isNaN(valorUnitario) && isFinite(valorUnitario) && valorUnitario > 0;
  const valorTotalValido = m.valor_total != null && !isNaN(m.valor_total) && isFinite(m.valor_total) && m.valor_total > 0;
  const unidadeValorOriginal = m.nota_fiscal
    ? (m.unidade_nota_fiscal || m.unidade_valor_original || m.unidade)
    : (m.unidade_valor_original || m.unidade);

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
      {m.nota_fiscal && m.numero_nota_fiscal && (
        <div className="mt-2 text-[13px] text-[rgba(0,68,23,0.85)]">
          <strong className="font-semibold text-[#004417]">NF:</strong> {m.numero_nota_fiscal}
        </div>
      )}
      {valorUnitarioValido && (
        <div className="mt-4 pt-3 border-t border-[rgba(0,68,23,0.08)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[13px]">
            <div>
              <strong className="font-semibold text-[#004417]">Valor Unitário:</strong>{' '}
              <span className="text-[#004417]">{formatCurrency(valorUnitario)} / {unidadeValorOriginal}</span>
            </div>
            {valorTotalValido && (
              <div className="text-[15px] font-bold text-[#00A651]">
                Total: {formatCurrency(m.valor_total!)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SaidaDetails({ movement: m }: { movement: MovementItem }) {
  // Validar quantidade antes de usar
  const quantidade = typeof m.quantidade === 'number' && !isNaN(m.quantidade) ? m.quantidade : 0;

  // Calcular valorTotal com validação
  let valorTotal = 0;
  if (m.valor_total != null && !isNaN(m.valor_total) && isFinite(m.valor_total)) {
    valorTotal = m.valor_total;
  } else if (m.valor_medio != null && !isNaN(m.valor_medio) && isFinite(m.valor_medio)) {
    valorTotal = m.valor_medio * quantidade;
  }

  // Validar valorUnitario
  const valorUnitario = m.valor || m.valor_medio;
  const valorUnitarioValido = valorUnitario != null && !isNaN(valorUnitario) && isFinite(valorUnitario) && valorUnitario > 0;

  const unidadeValorOriginal = m.nota_fiscal
    ? (m.unidade_nota_fiscal || m.unidade_valor_original || m.unidade)
    : (m.unidade_valor_original || m.unidade);

  return (
    <div className="bg-white rounded-lg p-4 mt-3 border border-[rgba(0,68,23,0.08)]">
      {m._agrupado && m._entradas_referencia && m._entradas_referencia.length > 0 && (
        <div className="mb-3 pb-3 border-b border-[rgba(0,68,23,0.08)]">
          <strong className="font-semibold text-[#004417] text-[13px]">Lotes removidos:</strong>
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
      {m.nota_fiscal && m.numero_nota_fiscal && (
        <div className="mt-2 text-[13px] text-[rgba(0,68,23,0.85)]">
          <strong className="font-semibold text-[#004417]">NF:</strong> {m.numero_nota_fiscal}
        </div>
      )}

      {valorUnitarioValido && !isNaN(valorTotal) && isFinite(valorTotal) && valorTotal > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="text-[13px] text-[rgba(0,68,23,0.85)]">
            <strong className="font-semibold text-[#004417]">Valor Unitário:</strong>{' '}
            <span className="text-[#004417]">{formatCurrency(valorUnitario)} / {unidadeValorOriginal}</span>
          </div>
          <div className="text-[15px] font-bold text-[#F7941F]">
            Total: {formatCurrency(valorTotal)}
          </div>
        </div>
      )}
    </div>
  );
}
