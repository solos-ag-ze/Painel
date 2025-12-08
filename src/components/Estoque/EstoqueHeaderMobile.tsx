// src/components/Estoque/EstoqueHeaderMobile.tsx
import { formatCurrency } from '../../lib/currencyFormatter';

interface Props {
  resumoEstoque: {
    total: number;
    valorTotal: number;
  };
  onOpenModal: () => void;
}

export default function EstoqueHeaderMobile({ resumoEstoque, onOpenModal }: Props) {
  return (
    <div className="block md:hidden">
      <div className="bg-white rounded-[14px] shadow-[0_1px_4px_rgba(0,68,23,0.10)] p-6">
        {/* Título e subtítulo */}
        <div className="mb-4">
          <h2 className="text-[18px] font-bold text-[#004417]">Controle de Estoque</h2>
          <p className="text-[13px] text-[rgba(0,68,23,0.7)]">Produtos cadastrados via WhatsApp</p>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-1 gap-4">
          {/* Total de Produtos */}
          <div className="bg-white p-6 rounded-[12px] text-center transition-transform active:scale-[0.98] shadow-[0_1px_3px_rgba(0,68,23,0.06)]">
            <p className="text-[13px] text-[rgba(0,68,23,0.7)] mb-1">Total de Produtos</p>
            <p className="text-[22px] font-bold text-[#004417]">{resumoEstoque.total}</p>
          </div>

          {/* Valor Total */}
          <div className="bg-white p-6 rounded-[12px] text-center transition-transform active:scale-[0.98] shadow-[0_1px_3px_rgba(0,68,23,0.06)]">
            <p className="text-[13px] text-[rgba(0,68,23,0.7)] mb-1">Valor Total</p>
            <p className="text-[22px] font-bold text-[#004417]">
              {formatCurrency(resumoEstoque.valorTotal)}
            </p>
          </div>

          {/* Botão cadastrar */}
          <div className="bg-white p-6 rounded-[12px] border-2 border-dashed border-[rgba(0,68,23,0.08)] active:bg-[rgba(0,166,81,0.04)] transition-all shadow-[0_1px_3px_rgba(0,68,23,0.06)]">
            <button
              onClick={onOpenModal}
              className="w-full h-[60px] text-[#004417] font-bold flex items-center justify-center gap-2"
            >
              <span className="text-[#00A651] text-xl">➕</span>
              Cadastrar Produto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
