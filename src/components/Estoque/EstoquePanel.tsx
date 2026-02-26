// src/components/Estoque/EstoquePanel.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Package, Sprout, Hammer, Bug,
  Microscope, Droplets
} from 'lucide-react';
import { AuthService } from '../../services/authService';
import { EstoqueService, ProdutoEstoque } from '../../services/estoqueService';
import AttachmentProductModal from './AttachmentProductModal';
import RemoveQuantityModal from './RemoveQuantityModal';
import HistoryMovementsModal from './HistoryMovementsModal';
import FormProdutoModal from './FormProdutoModal';
import NfReviewModal from './NfReviewModal';
import NfEditItemModal, { PendingNfItem } from './NfEditItemModal';
import EstoqueHeaderDesktop from "./EstoqueHeaderDesktop";
import EstoqueHeaderMobile from "./EstoqueHeaderMobile";
import ListaProdutosDesktop from "./ListaProdutosDesktop";
import ListaProdutosMobile from "./ListaProdutosMobile";
import EstoqueFiltros from "./EstoqueFiltros";
import { agruparProdutos, ProdutoAgrupado } from '../../services/agruparProdutosService';
import SuccessToast from '../common/SuccessToast';
import AjusteEstoqueModal from './AjusteEstoqueModal';
import { convertBetweenUnits, convertValueBetweenUnits } from '../../lib/unitConverter';
import { formatDateTimeBR } from '../../lib/dateUtils';

export default function EstoquePanel() {
  // 📌 Constantes
  const INITIAL_ITEM_COUNT = 10;

  // 📌 Estados principais
  const [showModal, setShowModal] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [produtosAgrupados, setProdutosAgrupados] = useState<ProdutoAgrupado[]>([]);
  const [resumoEstoque, setResumoEstoque] = useState({
    total: 0,
    valorTotal: 0
  });
  
  // 📌 Estados dos filtros
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ordem, setOrdem] = useState("");
  const [ordemDirecao, setOrdemDirecao] = useState<"asc" | "desc">("asc");

  // 📌 Controle de exibição (Ver mais / Ver menos)
  const [mostrarTodos, setMostrarTodos] = useState(false);

  // 📌 Estados para os modais
  const [removeModal, setRemoveModal] = useState({
    isOpen: false,
    productGroup: null as ProdutoAgrupado | null,
    quantidade: 1,
    observacao: '',
  });
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    product: null as ProdutoAgrupado | null,
  });

  // 📌 Estado para modal de ajuste simples (Solução 1)
  const [ajusteModal, setAjusteModal] = useState({ isOpen: false, product: null as ProdutoAgrupado | null });

  // 🧮 Helpers para calcular resumo de estoque a partir dos grupos
  const EPSILON = 1e-6;

  const calcularResumoGrupoFIFO = (grupo: ProdutoAgrupado) => {
    if (!grupo.entradas.length) {
      const quantidadeLiquidaFallback = Number(grupo.totalEstoqueDisplay) || 0;
      const precoMedioFallback = Number(grupo.mediaPrecoDisplay) || 0;
      const valorFallback = quantidadeLiquidaFallback * precoMedioFallback;
      return {
        quantidadeLiquida: quantidadeLiquidaFallback,
        valorAtual: quantidadeLiquidaFallback > EPSILON ? valorFallback : 0,
        mediaAtual: quantidadeLiquidaFallback > EPSILON ? precoMedioFallback : 0,
      };
    }

    const ordenarPorData = (a?: string, b?: string) => {
      const dataA = a ? new Date(a).getTime() : 0;
      const dataB = b ? new Date(b).getTime() : 0;
      return dataA - dataB;
    };

    const entradasOrdenadas = [...grupo.entradas].sort((a, b) => ordenarPorData(a.created_at, b.created_at));
    const saidasOrdenadas = [...grupo.saidas].sort((a, b) => ordenarPorData(a.created_at, b.created_at));

    const unidadeBase = grupo.unidadeValorOriginal
      || grupo.unidadeDisplay
      || entradasOrdenadas[0]?.unidade_valor_original
      || entradasOrdenadas[0]?.unidade
      || 'un';

    type Lote = { quantidade: number; valorUnitario: number };

    const lotes: Lote[] = entradasOrdenadas
      .map((entrada) => {
        const unidadeEntrada = entrada.unidade || unidadeBase;
        const unidadeValorEntrada = entrada.unidade_valor_original || unidadeEntrada;
        const quantidadeBruta = Number(entrada.quantidade_inicial ?? entrada.quantidade ?? 0) || 0;
        const quantidadeConvertida = convertBetweenUnits(quantidadeBruta, unidadeEntrada, unidadeBase);

        if (!Number.isFinite(quantidadeConvertida) || Math.abs(quantidadeConvertida) < EPSILON) {
          return null;
        }

        const valorTotalEntrada = Number(entrada.valor_total ?? 0) || 0;
        let valorUnitario = 0;

        if (valorTotalEntrada > 0) {
          valorUnitario = valorTotalEntrada / quantidadeConvertida;
        } else {
          const valorInformado = Number(entrada.valor ?? 0) || 0;
          if (valorInformado > 0) {
            valorUnitario = convertValueBetweenUnits(valorInformado, unidadeValorEntrada, unidadeBase);
          }
        }

        return {
          quantidade: quantidadeConvertida,
          valorUnitario,
        } satisfies Lote;
      })
      .filter((lote): lote is Lote => Boolean(lote));

    if (!lotes.length) {
      const quantidadeLiquidaFallback = Number(grupo.totalEstoqueDisplay) || 0;
      const precoMedioFallback = Number(grupo.mediaPrecoDisplay) || 0;
      const valorFallback = quantidadeLiquidaFallback * precoMedioFallback;
      return {
        quantidadeLiquida: quantidadeLiquidaFallback,
        valorAtual: quantidadeLiquidaFallback > EPSILON ? valorFallback : 0,
        mediaAtual: quantidadeLiquidaFallback > EPSILON ? precoMedioFallback : 0,
      };
    }

    let valorTotalGrupo = lotes.reduce((acc, lote) => acc + lote.quantidade * (lote.valorUnitario || 0), 0);
    let quantidadeLiquida = lotes.reduce((acc, lote) => acc + lote.quantidade, 0);
    let ultimoValorUnitario = lotes[lotes.length - 1]?.valorUnitario || grupo.mediaPrecoDisplay || 0;

    const consumirDoEstoque = (quantidadeSaida: number) => {
      if (quantidadeSaida <= 0) return;

      while (quantidadeSaida > EPSILON && lotes.length) {
        const lote = lotes[0];
        const valorUnitarioLote = lote.valorUnitario || ultimoValorUnitario;
        const quantidadeConsumida = Math.min(quantidadeSaida, lote.quantidade);

        valorTotalGrupo -= quantidadeConsumida * (valorUnitarioLote || 0);
        lote.quantidade -= quantidadeConsumida;
        quantidadeSaida -= quantidadeConsumida;
        quantidadeLiquida -= quantidadeConsumida;
        ultimoValorUnitario = valorUnitarioLote || ultimoValorUnitario;

        if (lote.quantidade <= EPSILON) {
          lotes.shift();
        }
      }

      if (quantidadeSaida > EPSILON) {
        quantidadeLiquida -= quantidadeSaida;
        valorTotalGrupo -= quantidadeSaida * (ultimoValorUnitario || 0);
      }
    };

    saidasOrdenadas.forEach((saida) => {
      const unidadeSaida = saida.unidade || unidadeBase;
      const quantidadeBrutaSaida = Number(saida.quantidade ?? 0) || 0;
      const quantidadeConvertidaSaida = convertBetweenUnits(quantidadeBrutaSaida, unidadeSaida, unidadeBase);

      if (Number.isFinite(quantidadeConvertidaSaida) && quantidadeConvertidaSaida > 0) {
        consumirDoEstoque(quantidadeConvertidaSaida);
      }
    });

    if (Math.abs(quantidadeLiquida) <= EPSILON) {
      return {
        quantidadeLiquida,
        valorAtual: 0,
        mediaAtual: 0,
      };
    }

    const valorAtual = valorTotalGrupo;
    const mediaAtual = valorAtual / quantidadeLiquida;

    return {
      quantidadeLiquida,
      valorAtual,
      mediaAtual,
    };
  };

  const enriquecerGruposComValor = (grupos: ProdutoAgrupado[]) => {
    return grupos.map((grupo) => {
      const resumo = calcularResumoGrupoFIFO(grupo);
      return {
        ...grupo,
        valorAtualEstoque: Number(resumo.valorAtual.toFixed(2)),
        mediaPrecoAtual: Math.abs(resumo.quantidadeLiquida) > EPSILON ? Number(resumo.mediaAtual.toFixed(2)) : undefined,
        quantidadeLiquidaAtual: Number(resumo.quantidadeLiquida.toFixed(6)),
      };
    });
  };

  const atualizarResumo = (grupos: ProdutoAgrupado[], valorTotalOverride?: number | null) => {
    const total = grupos.length;
    let valorTotal = grupos.reduce((acc, grupo) => {
      if (grupo.valorAtualEstoque != null) return acc + grupo.valorAtualEstoque;
      const estoqueLiquidoFallback = Number(grupo.totalEstoqueDisplay) || 0;
      const precoMedioFallback = Number(grupo.mediaPrecoDisplay) || 0;
      return acc + estoqueLiquidoFallback * precoMedioFallback;
    }, 0);
    if (typeof valorTotalOverride === 'number' && !isNaN(valorTotalOverride)) {
      valorTotal = valorTotalOverride;
    }
    console.log('[Resumo Estoque] total:', total, 'valorTotal:', valorTotal);
    setResumoEstoque({
      total,
      valorTotal: Number(valorTotal.toFixed(2)),
    });
  };

  const refetchAll = async () => {
    try {
      // Carrega todos os produtos (incluindo pendentes) para detectar NF pendente,
      // mas usa somente os visíveis (sem pendentes) para exibir/agrupamentos.
      const dadosTodos = await EstoqueService.getAllMovimentacoes();
      const dadosVisiveis = (dadosTodos || []).filter(p => (p.status || '').toLowerCase() !== 'pendente');

      const grupos = await agruparProdutos(dadosVisiveis);
      setProdutos(dadosVisiveis);
      const gruposEnriquecidos = enriquecerGruposComValor(grupos);
      setProdutosAgrupados(gruposEnriquecidos);
      atualizarResumo(gruposEnriquecidos);

      // Detectar produtos com status pendente usando o conjunto completo
      detectPendingFromProdutos(dadosTodos);
    } catch (err) {
      console.error('Erro ao refetch all:', err);
    }
  };

  const detectPendingFromProdutos = (dados: ProdutoEstoque[]) => {
    if (!dados || !dados.length) { setPendingNf(null); return; }
    const pendentes = dados.filter(p => (p.status || '').toLowerCase() === 'pendente');
    if (!pendentes.length) { setPendingNf(null); return; }

    const items: PendingNfItem[] = pendentes.map(p => ({
      id: String(p.id),
      nome_produto: p.nome_produto,
      marca: p.marca || null,
      categoria: p.categoria || null,
      unidade: p.unidade || 'un',
      unidade_valor_original: p.unidade_valor_original ?? p.unidade ?? 'un',
      quantidade: p.quantidade || 0,
      valor_unitario: p.valor ?? null,
      lote: p.lote ?? null,
      validade: p.validade ?? null,
    }));

    const primeira = pendentes[0];
    setPendingNf({
      numero: primeira.numero_nota_fiscal ?? undefined,
      fornecedor: primeira.fornecedor ?? undefined,
      recebidoEm: primeira.created_at ? formatDateTimeBR(primeira.created_at) : undefined,
      items,
    });
  };

  // ----- Handlers para NF pendente -----
  const handleEditNfItem = (item: PendingNfItem) => {
    setEditingItem(item);
  };

  const handleSaveEditedItem = (item: PendingNfItem) => {
    setPendingNf((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map(i => i.id === item.id ? item : i) };
    });
    setEditingItem(null);
  };

  const handleDeleteNfItem = (id: string) => {
    // Realiza remoção no banco e atualiza UI
    (async () => {
      try {
        const numericId = Number(id);
        await EstoqueService.removerProduto(numericId);

        setPendingNf((prev) => {
          if (!prev) return prev;
          return { ...prev, items: prev.items.filter(i => i.id !== id) };
        });

        await refetchAll();
        setToastMessage('Produto pendente excluído com sucesso.');
        setShowToast(true);
      } catch (err) {
        console.error('Erro ao excluir pendência NF:', err);
        alert('Erro ao excluir item. Veja o console.');
      }
    })();
  };

  const handleConfirmNfItem = async (id: string) => {
    if (!pendingNf) return;
    try {
      const success = await EstoqueService.confirmarPendencia(Number(id));
      if (!success) {
        alert('Não foi possível confirmar o item. Veja o console.');
        return;
      }

      // Remover item confirmado da lista local de pendências
      setPendingNf((prev) => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter(i => i.id !== id) };
      });

      // Recarregar dados visíveis/estado
      await refetchAll();
      setToastMessage('Item confirmado com sucesso.');
      setShowToast(true);
    } catch (err) {
      console.error('Erro ao confirmar item NF:', err);
      alert('Erro ao confirmar item. Veja o console.');
    }
  };

  const handleConfirmAll = async () => {
    if (!pendingNf) return;
    try {
      const ids = pendingNf.items.map(i => Number(i.id));
      const success = await EstoqueService.confirmarMultiplasPendencias(ids);
      if (!success) {
        alert('Não foi possível confirmar todos os itens. Veja o console.');
        return;
      }

      // Recarregar e limpar pendência
      await refetchAll();
      setPendingNf(null);
      setShowNfModal(false);
      setToastMessage('Produtos confirmados com sucesso.');
      setShowToast(true);
    } catch (err) {
      console.error('Erro ao confirmar todos itens NF:', err);
      alert('Erro ao processar a NF. Veja o console.');
    }
  };

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [attachmentModal, setAttachmentModal] = useState<{ isOpen: boolean; productId: string; productName: string }>({ isOpen: false, productId: '', productName: '' });

  // Estados para fluxo NF pendente (recebimento via WhatsApp / n8n)
  const [pendingNf, setPendingNf] = useState<null | { numero?: string; fornecedor?: string; recebidoEm?: string; items: PendingNfItem[] }>(null);
  const [showNfModal, setShowNfModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PendingNfItem | null>(null);
  // ...existing code...

  // 🔄 Carregar produtos ao montar
  useEffect(() => {
    const carregarProdutosNovoEstoque = async () => {
      try {
        // Busca produtos do ledger FIFO via view vw_estoque_saldo
        const produtosFIFO = await EstoqueService.getProdutosNovoEstoque();
        console.log('[vw_estoque_saldo] Produtos retornados:', produtosFIFO);
        setProdutos(produtosFIFO);
        // Agrupamento pode ser ajustado conforme a estrutura da view
        const grupos = await agruparProdutos(produtosFIFO);
        console.log('[Agrupamento] Grupos montados:', grupos);
        // Mapear saldo_atual/unidade_base para cada grupo
        const gruposComSaldo = grupos.map(grupo => {
          const produtoView = produtosFIFO.find(p => p.nome_produto === grupo.nome);
          console.log(`[Grupo: ${grupo.nome}] produtoView:`, produtoView);
          return {
            ...grupo,
            saldo_atual: produtoView?.saldo_atual,
            unidade_base: produtoView?.unidade_base,
            unidadeDisplay: produtoView?.unidade_base,
            unidadeValorOriginal: produtoView?.unidade_base,
            custo_unitario_base: produtoView?.custo_unitario_base,
          };
        });
        console.log('[Final] Grupos com saldo:', gruposComSaldo);
        setProdutosAgrupados(gruposComSaldo);
        // Busca valor total do estoque via view específica
        const valorTotal = await EstoqueService.getValorTotalEstoque();
        console.log('[vw_estoque_valor_total] Valor total retornado:', valorTotal);
        atualizarResumo(gruposComSaldo, valorTotal);
      } catch (error) {
        console.error("❌ Erro ao carregar estoque (novo fluxo):", error);
      }
    };

    carregarProdutosNovoEstoque();

    // Auto-atualização a cada 30 segundos
    const intervalo = setInterval(async () => {
      try {
        await carregarProdutosNovoEstoque();
      } catch (error) {
        console.error("❌ Erro ao atualizar estoque automaticamente:", error);
      }
    }, 30000);
    return () => clearInterval(intervalo);
  }, []);

  // (Removido: reagrupar produtos automaticamente ao mudar produtos)

  // ...existing code...

  // 📌 Ícone por categoria
  const getCategoryIcon = (categoria: string) => {
    const c = (categoria || '').toLowerCase();
    if (c.includes('fertilizante')) return <Sprout className="w-6 h-6 text-[#004417]" />;
    if (c.includes('corretivo')) return <Hammer className="w-6 h-6 text-[#004417]" />;
    if (c.includes('herbicida')) return <Package className="w-6 h-6 text-[#004417]" />;
    if (c.includes('inseticida')) return <Bug className="w-6 h-6 text-[#004417]" />;
    if (c.includes('fungicida')) return <Microscope className="w-6 h-6 text-[#004417]" />;
    if (c.includes('foliar') || c.includes('nutricional')) return <Droplets className="w-6 h-6 text-[#004417]" />;
    if (c.includes('adjuvante') || c.includes('óleo')) return <Droplets className="w-6 h-6 text-[#004417]" />;
    return <Package className="w-6 h-6 text-[#004417]" />;
  };

  // Wrappers para passar às listas (garante assinatura correta)
  const openHistoryModal = (params: { isOpen: boolean; product: ProdutoAgrupado | null }) => {
    setHistoryModal(params);
  };

  // 🔎 Aplicação dos filtros e ordenação nos grupos (useMemo para evitar loops)
  const produtosAgrupadosFiltrados = useMemo(() => {
    return produtosAgrupados
      .filter((grupo) => (typeof grupo.nome === 'string' ? grupo.nome.toLowerCase().includes(search.toLowerCase()) : false))
      .filter((grupo) => {
        if (!categoria) return true;
        const categorias = Array.isArray(grupo.categorias) ? grupo.categorias : [];
        return categorias.includes(categoria);
      })
      .sort((a, b) => {
        if (ordem === "alfabetica") {
          return ordemDirecao === "asc"
            ? a.nome.localeCompare(b.nome)
            : b.nome.localeCompare(a.nome);
        }
        if (ordem === "dataLancamento") {
          const da = new Date(a.produtos[0].created_at || "").getTime();
          const db = new Date(b.produtos[0].created_at || "").getTime();
          return ordemDirecao === "asc" ? da - db : db - da;
        }
        if (ordem === "validade") {
          const va = new Date(a.validades.filter(v => v)[0] || "").getTime();
          const vb = new Date(b.validades.filter(v => v)[0] || "").getTime();
          return ordemDirecao === "asc" ? va - vb : vb - va;
        }
        return 0;
      });
  }, [produtosAgrupados, search, categoria, ordem, ordemDirecao]);

  // 📄 Paginação dos grupos
  const gruposExibidos = mostrarTodos 
    ? produtosAgrupadosFiltrados 
    : produtosAgrupadosFiltrados.slice(0, INITIAL_ITEM_COUNT);

  return (
    <>
      <SuccessToast
        message={toastMessage}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
      <div className="space-y-6 relative">
      {/* Header (título + cards) com banner integrado */}
      <EstoqueHeaderDesktop
        resumoEstoque={resumoEstoque}
        onOpenModal={() => setShowModal(true)}
        pendingNf={pendingNf ? { numero: pendingNf.numero, fornecedor: pendingNf.fornecedor, recebidoEm: pendingNf.recebidoEm } : null}
        onReviewNf={() => setShowNfModal(true)}
      />
      <EstoqueHeaderMobile
        resumoEstoque={resumoEstoque}
        onOpenModal={() => setShowModal(true)}
        pendingNf={pendingNf ? { numero: pendingNf.numero, fornecedor: pendingNf.fornecedor, recebidoEm: pendingNf.recebidoEm } : null}
        onReviewNf={() => setShowNfModal(true)}
      />
      {/* Filtros */}
      <EstoqueFiltros
        search={search}
        setSearch={setSearch}
        categoria={categoria}
        setCategoria={setCategoria}
        ordem={ordem}
        setOrdem={setOrdem}
        ordemDirecao={ordemDirecao}
        setOrdemDirecao={setOrdemDirecao}
      />

      {/* Listas */}
            <ListaProdutosDesktop
        produtos={gruposExibidos}
        getCategoryIcon={getCategoryIcon}
        setHistoryModal={openHistoryModal}
        setRemoveModal={(params) => {
          const { isOpen, product } = params;
          setRemoveModal(prev => ({
            ...prev,
            isOpen,
            productGroup: product,
            quantidade: 1,
            observacao: '',
          }));
        }}
        onAjustarEstoque={(product) => setAjusteModal({ isOpen: true, product })}
      />

            <ListaProdutosMobile
        produtos={gruposExibidos}
        getCategoryIcon={getCategoryIcon}
        setHistoryModal={openHistoryModal}
        setRemoveModal={(params) => {
          const { isOpen, product } = params;
          setRemoveModal(prev => ({
            ...prev,
            isOpen,
            productGroup: product,
            quantidade: 1,
            observacao: '',
          }));
        }}
        onAjustarEstoque={(product) => setAjusteModal({ isOpen: true, product })}
      />

      {/* Modal de Ajuste de Estoque Simples (Solução 1) */}
      <AjusteEstoqueModal
        isOpen={ajusteModal.isOpen}
        onClose={() => setAjusteModal({ isOpen: false, product: null })}
        productGroup={ajusteModal.product}
        onSaved={async () => {
          await refetchAll();
          setToastMessage('Estoque ajustado com sucesso!');
          setShowToast(true);
        }}
      />

      {/* Botões de Ver mais / Ver menos */}
      {produtosAgrupadosFiltrados.length > INITIAL_ITEM_COUNT && (
        <div className="flex justify-center pt-4">
          {!mostrarTodos ? (
            <button
              onClick={() => setMostrarTodos(true)}
              className="px-6 py-2.5 text-[13px] font-semibold text-[#004417] bg-white rounded-xl hover:bg-[rgba(0,166,81,0.08)] transition-all"
            >
              Ver todos ({produtosAgrupadosFiltrados.length} grupos)
            </button>
          ) : (
            <button
              onClick={() => setMostrarTodos(false)}
              className="px-6 py-2.5 text-[13px] font-semibold text-[rgba(0,68,23,0.7)] bg-[rgba(0,68,23,0.03)] rounded-xl hover:bg-[rgba(0,68,23,0.05)] transition-all"
            >
              Ver menos
            </button>
          )}
        </div>
      )}

      {/* Modal de Anexo */}
      <AttachmentProductModal
        isOpen={attachmentModal.isOpen}
        onClose={() => setAttachmentModal({ isOpen: false, productId: '', productName: '' })}
        productId={attachmentModal.productId}
        productName={attachmentModal.productName}
      />

      {/* Modal de revisão de NF */}
      <NfReviewModal
        isOpen={showNfModal}
        meta={pendingNf ? { numero: pendingNf.numero, fornecedor: pendingNf.fornecedor, recebidoEm: pendingNf.recebidoEm } : undefined}
        items={pendingNf?.items || []}
        onClose={() => setShowNfModal(false)}
        onEditItem={(item) => handleEditNfItem(item)}
        onDeleteItem={(id) => handleDeleteNfItem(id)}
        onConfirmItem={(id) => handleConfirmNfItem(id)}
        onConfirmAll={() => handleConfirmAll()}
      />

      {/* Modal mini para editar item NF */}
      <NfEditItemModal
        isOpen={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={(it) => handleSaveEditedItem(it)}
      />

      {/* Modal Cadastro */}
      {showModal && (
        <FormProdutoModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCreated={async (produto) => {
            setProdutos((prev) => [produto, ...prev]);
          }}
        />
      )}

      {/* Modal de Remover Quantidade */}
      <RemoveQuantityModal
        isOpen={removeModal.isOpen}
        productGroup={removeModal.productGroup}
        quantidade={removeModal.quantidade}
        setQuantidade={(q) => setRemoveModal((prev) => ({ ...prev, quantidade: q }))}
        observacao={removeModal.observacao}
        setObservacao={(obs) => setRemoveModal((prev) => ({ ...prev, observacao: obs }))}
        onConfirm={async (quantidadeConvertida: number) => {
          if (!removeModal.productGroup) return;
          try {
            const idsEntradas = removeModal.productGroup.entradas.map(e => e.id);
            await EstoqueService.removerQuantidadeFIFO(
              removeModal.productGroup.nome,
              quantidadeConvertida,
              removeModal.observacao,
              removeModal.productGroup.mediaPrecoAtual ?? removeModal.productGroup.mediaPrecoDisplay,
              removeModal.productGroup.unidadeValorOriginal,
              idsEntradas
            );
            // Recarrega produtos do ledger FIFO
            const produtosFIFO = await EstoqueService.getProdutosNovoEstoque();
            setProdutos(produtosFIFO);
            const grupos = await agruparProdutos(produtosFIFO);
            const gruposComSaldo = grupos.map(grupo => {
              const produtoView = produtosFIFO.find(p => p.nome_produto === grupo.nome);
              return {
                ...grupo,
                saldo_atual: produtoView?.saldo_atual,
                unidade_base: produtoView?.unidade_base,
                unidadeDisplay: produtoView?.unidade_base,
                unidadeValorOriginal: produtoView?.unidade_base,
                custo_unitario_base: produtoView?.custo_unitario_base,
              };
            });
            setProdutosAgrupados(gruposComSaldo);
            const valorTotal = await EstoqueService.getValorTotalEstoque();
            atualizarResumo(gruposComSaldo, valorTotal);
            setRemoveModal({ isOpen: false, productGroup: null, quantidade: 1, observacao: '' });
            setToastMessage('Quantidade removida com sucesso!');
            setShowToast(true);
          } catch (err: any) {
            console.error(err);
            alert(`❌ ${err.message || 'Erro ao remover quantidade.'}`);
          }
        }}
        onClose={() => setRemoveModal({ isOpen: false, productGroup: null, quantidade: 1, observacao: '' })}
      />

      {/* inline histórico modal removed; using HistoryMovementsModal component below */}

      {/* Modal de histórico de movimentações */}
      <HistoryMovementsModal
        isOpen={historyModal.isOpen}
        product={historyModal.product}
        onClose={() => setHistoryModal({ isOpen: false, product: null })}
      />
    </div>
    </>
  );
}
