// src/components/Estoque/EstoquePanel.tsx
import { useState, useEffect, useMemo } from 'react';
import {
  Package, Sprout, Hammer, Bug,
  Microscope, Droplets, X
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
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // ...existing code...

  // 🔄 Carregar produtos ao montar
  useEffect(() => {
    const carregar = async () => {
      try {
        const authService = AuthService.getInstance();
        const user = authService.getCurrentUser();
        if (!user) {
          console.warn("⚠️ Nenhum usuário autenticado");
          return;
        }
        const dados = await EstoqueService.getProdutos();
        setProdutos(dados);
        setProdutosAgrupados(agruparProdutos(dados));

        const valorTotal = await EstoqueService.calcularValorTotalEstoque();
        setResumoEstoque(prev => ({ ...prev, valorTotal }));
      } catch (error) {
        console.error("❌ Erro ao carregar estoque:", error);
      }
    };
    carregar();
  }, []);

  // � Sempre que a lista de produtos mudar, reagrupa para atualizar a UI automaticamente
  useEffect(() => {
    try {
      setProdutosAgrupados(agruparProdutos(produtos));
      setResumoEstoque(prev => ({ ...prev, total: produtos.length }));
    } catch (err) {
      console.error('Erro ao reagrupar produtos:', err);
    }
  }, [produtos]);

  // ...existing code...

  // �📌 Ícone por categoria
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
        produtos={gruposExibidos}
        getCategoryIcon={getCategoryIcon}
        setHistoryModal={setHistoryModal}
        setRemoveModal={(params) => {
          const { isOpen, product } = params;
          setRemoveModal(prev => ({
            ...prev,
            isOpen,
            productGroup: product,
            selectedProduto: product?.produtos[0] || null,
            quantidade: 1,
            observacao: '',
          }));
        }}
      />

            <ListaProdutosMobile
        produtos={gruposExibidos}
        getCategoryIcon={getCategoryIcon}
        setHistoryModal={setHistoryModal}
        setRemoveModal={(params) => {
          const { isOpen, product } = params;
          setRemoveModal(prev => ({
            ...prev,
            isOpen,
            productGroup: product,
            selectedProduto: product?.produtos[0] || null,
            quantidade: 1,
            observacao: '',
          }));
        }}
      />

      {/* Botões de Ver mais / Ver menos */}
      {produtosAgrupadosFiltrados.length > INITIAL_ITEM_COUNT && (
        <div className="flex justify-center pt-4">
          {!mostrarTodos ? (
            <button
              onClick={() => setMostrarTodos(true)}
              className="px-4 py-2 text-sm font-semibold text-[#397738] bg-white border-2 border-[#86b646] rounded-lg hover:bg-[#86b646]/10 transition-colors"
            >
              Ver todos ({produtosAgrupadosFiltrados.length} grupos)
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
              onCreated={async (produto) => {
                setProdutos((prev) => [produto, ...prev]);
                const valorTotal = await EstoqueService.calcularValorTotalEstoque();
                setResumoEstoque(prev => ({ ...prev, valorTotal }));
              }}
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
            // Calcula nova quantidade
            const novaQuantidade = removeModal.selectedProduto.quantidade - removeModal.quantidade;
            
            // Atualiza quantidade no banco
            await EstoqueService.atualizarQuantidade(
              removeModal.selectedProduto.id,
              novaQuantidade
            );
            
            // Registra movimentação
            await EstoqueService.registrarMovimentacao(
              removeModal.selectedProduto.id,
              'saida',
              removeModal.quantidade,
              removeModal.observacao
            );
            
            // Recarrega produtos
            const produtosAtualizados = await EstoqueService.getProdutos();
            setProdutos(produtosAtualizados);
            setProdutosAgrupados(agruparProdutos(produtosAtualizados));

            // Recalcula valor total
            const valorTotal = await EstoqueService.calcularValorTotalEstoque();
            setResumoEstoque(prev => ({ ...prev, valorTotal }));

            setRemoveModal({ isOpen: false, productGroup: null, selectedProduto: null, quantidade: 1, observacao: '' });
            setToastMessage('Quantidade removida e movimentação registrada!');
            setShowToast(true);
          } catch (err: any) {
            console.error(err);
            alert(`❌ ${err.message || 'Erro ao remover quantidade.'}`);
          }
        }}
        onClose={() => setRemoveModal({ isOpen: false, productGroup: null, selectedProduto: null, quantidade: 1, observacao: '' })}
      />

      {/* inline histórico modal removed; using HistoryMovementsModal component below */}

      {/* Mantém também o modal de histórico original para movimentações detalhadas */}
      <HistoryMovementsModal
        isOpen={historyModal.isOpen}
        product={historyModal.product}
        onClose={() => setHistoryModal({ isOpen: false, product: null })}
      />
    </div>
    </>
  );
}
