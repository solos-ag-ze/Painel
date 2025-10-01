// src/components/Estoque/EstoquePanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Minus, Paperclip, Sprout, Hammer, Bug,
  Microscope, Droplets, X
} from 'lucide-react';
import { AuthService } from '../../services/authService';
import { EstoqueService, ProdutoEstoque } from '../../services/estoqueService';
import AttachmentProductModal from './AttachmentProductModal';
import { AttachmentProductService } from '../../services/attachmentProductService';
import RemoveQuantityModal from './RemoveQuantityModal';
import HistoryMovementsModal from './HistoryMovementsModal';
import FormProdutoModal from './FormProdutoModal';
import EstoqueHeaderDesktop from "./EstoqueHeaderDesktop";
import EstoqueHeaderMobile from "./EstoqueHeaderMobile";
import ListaProdutosDesktop from "./ListaProdutosDesktop";
import ListaProdutosMobile from "./ListaProdutosMobile";
import EstoqueFiltros from "./EstoqueFiltros";
import { agruparProdutos, ProdutoAgrupado } from '../../services/agruparProdutosService';

export default function EstoquePanel() {
  // 📌 Constantes
  const INITIAL_ITEM_COUNT = 10;

  // 📌 Estados principais
  const [showModal, setShowModal] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtosAgrupados, setProdutosAgrupados] = useState<ProdutoAgrupado[]>([]);

  // 📌 Estados dos filtros
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ordem, setOrdem] = useState("");
  const [ordemDirecao, setOrdemDirecao] = useState<"asc" | "desc">("asc");

  // 📌 Controle de exibição (Ver mais / Ver menos)
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [produtosVisiveis, setProdutosVisiveis] = useState<ProdutoEstoque[]>([]);

  // 📌 Estados para os modais
  const [removeModal, setRemoveModal] = useState({
    isOpen: false,
    productGroup: null as ProdutoAgrupado | null,
    selectedProduto: null as ProdutoEstoque | null,
    quantidade: 1,
    observacao: '',
  });
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    product: null as ProdutoAgrupado | null,
  });
  const [attachmentModal, setAttachmentModal] = useState({
    isOpen: false,
    productId: '',
    productName: ''
  });

  // 🔄 Carregar produtos ao montar
  useEffect(() => {
    const carregar = async () => {
      try {
        const authService = AuthService.getInstance();
        const user = authService.getCurrentUser();
        if (!user) {
          console.warn("⚠️ Nenhum usuário autenticado");
          setLoading(false);
          return;
        }
        const dados = await EstoqueService.getProdutos();
        setProdutos(dados);
        setProdutosAgrupados(agruparProdutos(dados));
      } catch (error) {
        console.error("❌ Erro ao carregar estoque:", error);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  // 📌 Função para formatar datas em dd/mm/aaaa
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const formatted = date.toLocaleDateString('pt-BR');
    return formatted === '31/12/1999' ? '-' : formatted;
  };

  // 📌 Ícone por categoria
  const getCategoryIcon = (categoria: string) => {
    const c = categoria.toLowerCase();
    if (c.includes('fertilizante')) return <Sprout className="w-6 h-6 text-[#86b646]" />;
    if (c.includes('corretivo')) return <Hammer className="w-6 h-6 text-[#8fa49d]" />;
    if (c.includes('herbicida')) return <Package className="w-6 h-6 text-[#397738]" />;
    if (c.includes('inseticida')) return <Bug className="w-6 h-6 text-[#86b646]" />;
    if (c.includes('fungicida')) return <Microscope className="w-6 h-6 text-[#8fa49d]" />;
    if (c.includes('foliar') || c.includes('nutricional')) return <Droplets className="w-6 h-6 text-[#397738]" />;
    if (c.includes('adjuvante') || c.includes('óleo')) return <Droplets className="w-6 h-6 text-[#86b646]" />;
    return <Package className="w-6 h-6 text-[#397738]" />;
  };

  // 📊 Resumo estoque
  const resumoEstoque = {
    total: produtos.length,
    valorTotal: produtos.reduce((acc, item) => acc + (item.quantidade * (item.valor || 0)), 0)
  };

  // 🔎 Aplicação dos filtros e ordenação (useMemo para evitar loops)
  const produtosFiltrados = useMemo(() => {
    return produtos
      .filter((p) => p.nome_produto.toLowerCase().includes(search.toLowerCase()))
      .filter((p) => (categoria ? p.categoria === categoria : true))
      .sort((a, b) => {
        if (ordem === "alfabetica") {
          return ordemDirecao === "asc"
            ? a.nome_produto.localeCompare(b.nome_produto)
            : b.nome_produto.localeCompare(a.nome_produto);
        }
        if (ordem === "dataLancamento") {
          const da = new Date(a.created_at || "").getTime();
          const db = new Date(b.created_at || "").getTime();
          return ordemDirecao === "asc" ? da - db : db - da;
        }
        if (ordem === "validade") {
          const va = new Date(a.validade || "").getTime();
          const vb = new Date(b.validade || "").getTime();
          return ordemDirecao === "asc" ? va - vb : vb - va;
        }
        return 0;
      });
  }, [produtos, search, categoria, ordem, ordemDirecao]);

  // 👀 Sempre que filtros ou mostrarTodos mudam → atualiza lista visível
  useEffect(() => {
    if (mostrarTodos) {
      setProdutosVisiveis(produtosFiltrados);
    } else {
      setProdutosVisiveis(produtosFiltrados.slice(0, INITIAL_ITEM_COUNT));
    }
  }, [produtosFiltrados, mostrarTodos]);

  return (
    <div className="space-y-6">
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
        produtos={produtosAgrupados}
        formatDate={formatDate}
        getCategoryIcon={getCategoryIcon}
        openAttachmentModal={(id, nome) => setAttachmentModal({ isOpen: true, productId: id, productName: nome })}
        setHistoryModal={setHistoryModal}
        setRemoveModal={({ isOpen, product, quantidade, observacao }) =>
          setRemoveModal((prev) => ({
            ...prev,
            isOpen,
            productGroup: product,
            selectedProduto: product && product.produtos[0] ? product.produtos[0] : null,
            quantidade: quantidade ?? 1,
            observacao: observacao ?? '',
          }))
        }
      />

      <ListaProdutosMobile
        produtos={produtosAgrupados}
        formatDate={formatDate}
        getCategoryIcon={getCategoryIcon}
        openAttachmentModal={(id, nome) => setAttachmentModal({ isOpen: true, productId: id, productName: nome })}
        setHistoryModal={setHistoryModal}
        setRemoveModal={({ isOpen, product, quantidade, observacao }) =>
          setRemoveModal((prev) => ({
            ...prev,
            isOpen,
            productGroup: product,
            selectedProduto: product && product.produtos[0] ? product.produtos[0] : null,
            quantidade: quantidade ?? 1,
            observacao: observacao ?? '',
          }))
        }
      />

      {/* Botões de Ver mais / Ver menos */}
      {produtosFiltrados.length > INITIAL_ITEM_COUNT && (
        <div className="flex justify-center pt-4">
          {!mostrarTodos ? (
            <button
              onClick={() => setMostrarTodos(true)}
              className="px-4 py-2 text-sm font-semibold text-[#397738] bg-white border-2 border-[#86b646] rounded-lg hover:bg-[#86b646]/10 transition-colors"
            >
              Ver todos ({produtosFiltrados.length})
            </button>
          ) : (
            <button
              onClick={() => setMostrarTodos(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold">Cadastrar Novo Produto</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <FormProdutoModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              onCreated={(produto) => setProdutos((prev) => [produto, ...prev])}
            />
          </div>
        </div>
      )}

      {/* Modal de Remover Quantidade */}
      <RemoveQuantityModal
        isOpen={removeModal.isOpen}
        productGroup={removeModal.productGroup}
        selectedProduto={removeModal.selectedProduto}
        setSelectedProduto={(p) => setRemoveModal((prev) => ({ ...prev, selectedProduto: p }))}
        quantidade={removeModal.quantidade}
        setQuantidade={(q) => setRemoveModal((prev) => ({ ...prev, quantidade: q }))}
        observacao={removeModal.observacao}
        setObservacao={(obs) => setRemoveModal((prev) => ({ ...prev, observacao: obs }))}
        onConfirm={async () => {
          if (!removeModal.selectedProduto) return;
          try {
            const atualizado = await EstoqueService.removerQuantidade(
              removeModal.selectedProduto.id,
              removeModal.quantidade,
              removeModal.observacao
            );
            // Atualiza lista de produtos
            const produtosAtualizados = produtos.map((p) => p.id === atualizado.id ? atualizado : p);
            setProdutos(produtosAtualizados);
            
            // Recalcula agrupamentos
            setProdutosAgrupados(agruparProdutos(produtosAtualizados));
            setRemoveModal({ isOpen: false, productGroup: null, selectedProduto: null, quantidade: 1, observacao: '' });
            alert('✅ Quantidade removida e movimentação registrada!');
          } catch (err: any) {
            console.error(err);
            alert(`❌ ${err.message || 'Erro ao remover quantidade.'}`);
          }
        }}
        onClose={() => setRemoveModal({ isOpen: false, productGroup: null, selectedProduto: null, quantidade: 1, observacao: '' })}
      />

      {/* Modal de Histórico */}
      <HistoryMovementsModal
        isOpen={historyModal.isOpen}
        product={historyModal.product}
        onClose={() => setHistoryModal({ isOpen: false, product: null })}
      />
    </div>
  );
}
