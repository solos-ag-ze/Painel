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
import EstoqueHeaderDesktop from "./EstoqueHeaderDesktop";
import EstoqueHeaderMobile from "./EstoqueHeaderMobile";
import ListaProdutosDesktop from "./ListaProdutosDesktop";
import ListaProdutosMobile from "./ListaProdutosMobile";
import EstoqueFiltros from "./EstoqueFiltros";
import { agruparProdutos, ProdutoAgrupado } from '../../services/agruparProdutosService';
import SuccessToast from '../common/SuccessToast';
import AjusteEstoqueModal from './AjusteEstoqueModal';
import { convertBetweenUnits, convertValueBetweenUnits } from '../../lib/unitConverter';

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

  const atualizarResumo = (grupos: ProdutoAgrupado[]) => {
    const total = grupos.length;
    const valorTotal = grupos.reduce((acc, grupo) => {
      if (grupo.valorAtualEstoque != null) return acc + grupo.valorAtualEstoque;
      const estoqueLiquidoFallback = Number(grupo.totalEstoqueDisplay) || 0;
      const precoMedioFallback = Number(grupo.mediaPrecoDisplay) || 0;
      return acc + estoqueLiquidoFallback * precoMedioFallback;
    }, 0);

    setResumoEstoque({
      total,
      valorTotal: Number(valorTotal.toFixed(2)),
    });
  };

  const refetchAll = async () => {
    try {
      const dados = await EstoqueService.getProdutos();
      const grupos = await agruparProdutos(dados);
      setProdutos(dados);
      const gruposEnriquecidos = enriquecerGruposComValor(grupos);
      setProdutosAgrupados(gruposEnriquecidos);
      atualizarResumo(gruposEnriquecidos);
    } catch (err) {
      console.error('Erro ao refetch all:', err);
    }
  };

  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const [attachmentModal, setAttachmentModal] = useState<{ isOpen: boolean; productId: string; productName: string }>({ isOpen: false, productId: '', productName: '' });

  // ...existing code...

  // 🔄 Carregar produtos ao montar
  useEffect(() => {
    const carregarDados = async () => {
      try {
        const authService = AuthService.getInstance();
        const user = authService.getCurrentUser();
        if (!user) {
          console.warn("⚠️ Nenhum usuário autenticado");
          return;
        }

        const dados = await EstoqueService.getProdutos();
        const grupos = await agruparProdutos(dados);
        const gruposEnriquecidos = enriquecerGruposComValor(grupos);
        setProdutos(dados);
        setProdutosAgrupados(gruposEnriquecidos);
        atualizarResumo(gruposEnriquecidos);
      } catch (error) {
        console.error("❌ Erro ao carregar estoque:", error);
      }
    };

    carregarDados();

    // 🔄 Auto-atualização a cada 30 segundos para pegar valores atualizados pelo trigger
    const intervalo = setInterval(async () => {
      try {
        await carregarDados();
      } catch (error) {
        console.error("❌ Erro ao atualizar estoque automaticamente:", error);
      }
    }, 30000); // 30 segundos

    // Limpar intervalo ao desmontar
    return () => clearInterval(intervalo);
  }, []);

  // 💠 Sempre que a lista de produtos mudar, reagrupa para atualizar a UI automaticamente
  useEffect(() => {
    const reagrupar = async () => {
      try {
        const grupos = await agruparProdutos(produtos);
        const gruposEnriquecidos = enriquecerGruposComValor(grupos);
        setProdutosAgrupados(gruposEnriquecidos);
        atualizarResumo(gruposEnriquecidos);
      } catch (err) {
        console.error('Erro ao reagrupar produtos:', err);
      }
    };
    reagrupar();
  }, [produtos]);

  // ...existing code...

  // 📌 Ícone por categoria
  const getCategoryIcon = (categoria: string) => {
    const c = categoria.toLowerCase();
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
      .filter((grupo) => grupo.nome.toLowerCase().includes(search.toLowerCase()))
      .filter((grupo) => (categoria ? grupo.categorias.includes(categoria) : true))
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
      {/* Headers */}
      <EstoqueHeaderDesktop resumoEstoque={resumoEstoque} onOpenModal={() => setShowModal(true)} />
      <EstoqueHeaderMobile resumoEstoque={resumoEstoque} onOpenModal={() => setShowModal(true)} />

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
              className="px-6 py-2.5 text-[13px] font-semibold text-[#004417] bg-white border-2 border-[#00A651] rounded-xl hover:bg-[rgba(0,166,81,0.08)] transition-all"
            >
              Ver todos ({produtosAgrupadosFiltrados.length} grupos)
            </button>
          ) : (
            <button
              onClick={() => setMostrarTodos(false)}
              className="px-6 py-2.5 text-[13px] font-semibold text-[rgba(0,68,23,0.7)] bg-[rgba(0,68,23,0.03)] border-2 border-[rgba(0,68,23,0.1)] rounded-xl hover:bg-[rgba(0,68,23,0.05)] transition-all"
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
            // Remove quantidade usando FIFO (First In, First Out)
            // quantidadeConvertida já vem na unidade de referência do produto (kg, L, un, etc.)
            // ✅ Passar média ponderada do grupo para registrar valor histórico correto
            const idsEntradas = removeModal.productGroup.entradas.map(e => e.id);
            console.log('📤 Enviando IDs para remoção:', idsEntradas);

            await EstoqueService.removerQuantidadeFIFO(
              removeModal.productGroup.nome,
              quantidadeConvertida,
              removeModal.observacao,
              removeModal.productGroup.mediaPrecoAtual ?? removeModal.productGroup.mediaPrecoDisplay,
              removeModal.productGroup.unidadeValorOriginal,
              idsEntradas
            );
            
            // Recarrega produtos
            const produtosAtualizados = await EstoqueService.getProdutos();
            setProdutos(produtosAtualizados);
            const gruposAtualizados = await agruparProdutos(produtosAtualizados);
            const gruposEnriquecidos = enriquecerGruposComValor(gruposAtualizados);
            setProdutosAgrupados(gruposEnriquecidos);
            atualizarResumo(gruposEnriquecidos);

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
