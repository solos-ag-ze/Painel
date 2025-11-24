import { formatCurrency } from '../../lib/currencyFormatter';

interface Props {
  numeroMaquinas: number;
  custoTotal: number;
  onOpenModal: () => void;
}

export default function MaquinasEquipamentosHeaderMobile({ numeroMaquinas, custoTotal, onOpenModal }: Props) {
  return (
    <div className="block md:hidden">
      <div>
        <h3 className="text-[18px] font-bold text-[#004417] mb-3">Máquinas e Equipamentos</h3>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(0,68,23,0.06)] p-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="p-4 rounded-xl text-center transition-transform active:scale-[0.98] border border-[rgba(0,68,23,0.04)]">
            <p className="text-[13px] text-[rgba(0,68,23,0.7)] mb-1">Total de Máquinas</p>
            <p className="text-[22px] font-bold text-[#004417]">{numeroMaquinas}</p>
          </div>

          <div className="p-4 rounded-xl text-center transition-transform active:scale-[0.98] border border-[rgba(0,68,23,0.04)]">
            <p className="text-[13px] text-[rgba(0,68,23,0.7)] mb-1">Valor Total</p>
            <p className="text-[22px] font-bold text-[#004417]">
              {formatCurrency(custoTotal)}
            </p>
          </div>

          <div className="p-4 rounded-xl border-2 border-dashed border-[rgba(0,68,23,0.06)] transition-all">
            <button
              onClick={onOpenModal}
              className="w-full h-[60px] text-[#004417] font-bold flex items-center justify-center gap-2"
            >
              <span className="text-[#00A651] text-xl">➕</span>
              Cadastrar Máquinas e Equipamentos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
