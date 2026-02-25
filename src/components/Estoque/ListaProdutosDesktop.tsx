// src/components/Estoque/ListaProdutosDesktop.tsx
import { ProdutoAgrupado } from '../../services/agruparProdutosService';
import { formatUnitFull, formatUnitAbbreviated } from '../../lib/formatUnit';
import { formatCurrency } from '../../lib/currencyFormatter';
import { AlertTriangle } from 'lucide-react';

type ModalParams = {
  isOpen: boolean;
  product: ProdutoAgrupado | null;
  quantidade?: number;
  observacao?: string;
};

interface Props {
  produtos: ProdutoAgrupado[];
  getCategoryIcon: (categoria: string) => JSX.Element;
  setHistoryModal: (params: ModalParams) => void;
  setRemoveModal: (params: ModalParams) => void;
  onAjustarEstoque?: (product: ProdutoAgrupado) => void;
}

export default function ListaProdutosDesktop({
  produtos,
  getCategoryIcon,
  setHistoryModal,
  setRemoveModal,
  onAjustarEstoque,
}: Props) {
  const produtosSafe = Array.isArray(produtos) ? produtos : [];

  return (
    <div className="hidden md:block bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,68,23,0.08)] overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 py-5 border-b border-[rgba(0,68,23,0.08)]">
        <h3 className="text-[16px] font-bold text-[#004417]">Produtos em Estoque</h3>
      </div>

      {/* Lista */}
      <div className="divide-y divide-[rgba(0,68,23,0.08)]">
        {produtosSafe
          .filter(item => (
            item.saldo_atual !== undefined &&
            item.unidade_base &&
            item.nome &&
            Array.isArray(item.categorias) && item.categorias.length > 0 &&
            (item.mediaPrecoAtual !== undefined || item.mediaPrecoDisplay !== undefined)
          ))
          .map((item) => {
          // Log para debug visual
          console.log(`[ListaProdutosDesktop] item:`, {
            nome: item.nome,
            saldo_atual: item.saldo_atual,
            unidade_base: item.unidade_base,
            unidadeDisplay: item.unidadeDisplay,
            quantidade: item.saldo_atual,
            unidade: item.unidadeDisplay,
          });
          const categoriaIcon =
            Array.isArray(item.categorias) && item.categorias.length > 0 ? item.categorias[0] : '';

          const categoriasLabel =
            Array.isArray(item.categorias) && item.categorias.length > 0 ? item.categorias.join(', ') : '';

          // Exibir exatamente os campos do log
          const quantidade = item.saldo_atual;
          const unidade = item.unidade_base || item.unidadeDisplay;

          // Usar custo_unitario_base da view como valor médio, se existir
          const valorMedio = item.custo_unitario_base ?? item.mediaPrecoAtual ?? item.mediaPrecoDisplay;
          const unidadeValor = item.unidadeValorOriginal || item.unidadeDisplay || item.unidade_base;

          const isNegativo = typeof item.totalEstoqueDisplay === 'number' && item.totalEstoqueDisplay < 0;
          const deficit = isNegativo ? Math.abs(item.totalEstoqueDisplay) : 0;

          return (
            <div
              key={item.nome}
              className="relative flex flex-col lg:flex-row lg:items-center gap-4 p-6 hover:bg-[rgba(0,68,23,0.02)] transition-all hover:scale-[1.005]"
            >
              {/* 1) ÍCONE */}
              <div className="w-12 h-12 flex items-center justify-center bg-[rgba(0,68,23,0.05)] rounded-xl shrink-0">
                {getCategoryIcon(categoriaIcon)}
              </div>

              {/* 2) NOME / CATEGORIA */}
              <div className="flex-1 min-w-0">
                <h4 className="text-[15px] font-bold text-[#004417] truncate mb-1">{item.nome}</h4>
                <div className="flex items-center gap-2">
                  <span className="inline-block text-[12px] font-medium px-2 py-0.5 bg-[rgba(0,166,81,0.1)] text-[#00A651] rounded-xl">
                    {categoriasLabel}
                  </span>
                </div>
              </div>

              {/* 3) QUANTIDADE + VALOR MÉDIO */}
              <div className="flex flex-row items-center gap-12 shrink-0 min-w-[320px]">
                <div className="flex flex-col items-start min-w-[120px]">
                  <p className="text-[13px] text-[rgba(0,68,23,0.6)] mb-0.5">Quantidade</p>
                  <p className="text-[15px] font-semibold text-[#004417]">
                    {quantidade !== undefined && unidade ? (
                      <>
                        {quantidade}{' '}
                        <span className="text-[13px] text-[rgba(0,68,23,0.7)]">{unidade}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-start min-w-[140px]">
                  <p className="text-[13px] text-[rgba(0,68,23,0.6)] mb-0.5">Valor Médio</p>
                  <p className="text-[15px] font-bold text-[#004417]">
                    {valorMedio !== undefined && unidadeValor
                      ? `${formatCurrency(Number(valorMedio))} / ${formatUnitFull(unidadeValor)}`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* 4) ALERTA ESTOQUE NEGATIVO */}
              {isNegativo && (
                <div className="flex-shrink-0">
                  <div className="bg-[#FFF6EB] border border-[rgba(247,148,31,0.45)] rounded-xl px-3.5 py-3 max-w-[240px] shadow-[0_4px_12px_rgba(0,68,23,0.06)]">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[rgba(247,148,31,0.16)] flex items-center justify-center text-[#F7941F]">
                        <AlertTriangle className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#B85800] truncate">Estoque negativo</p>
                        <p className="text-[12px] text-[#7A4A0E]">
                          {deficit.toFixed(2)} {formatUnitAbbreviated(item.unidadeDisplay)} em déficit
                        </p>

                        <button
                          type="button"
                          onClick={() => onAjustarEstoque?.(item)}
                          className="mt-3 inline-flex items-center justify-center w-full px-3 py-1.5 text-[12px] font-semibold text-[#004417] bg-white border border-[rgba(0,68,23,0.18)] rounded-lg hover:bg-[rgba(0,68,23,0.05)] transition-colors"
                        >
                          Ajustar estoque
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5) AÇÕES */}
              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setHistoryModal({ isOpen: true, product: item })}
                  className="px-3 py-2 bg-[rgba(0,68,23,0.05)] text-[#004417] hover:bg-[rgba(0,166,81,0.12)] rounded-lg text-[13px] font-medium transition-all"
                >
                  Histórico
                </button>

                <button
                  type="button"
                  onClick={() => setRemoveModal({ isOpen: true, product: item })}
                  className="px-3 py-2 bg-[rgba(247,148,31,0.1)] text-[#F7941F] hover:bg-[rgba(247,148,31,0.15)] rounded-lg text-[13px] font-medium transition-all"
                >
                  Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}