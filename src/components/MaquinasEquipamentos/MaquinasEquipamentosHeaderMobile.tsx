import React from "react";

interface Props {
  numeroMaquinas: number;
  custoTotal: number;
  onOpenModal: () => void;
}

export default function MaquinasEquipamentosHeaderMobile({ numeroMaquinas, custoTotal, onOpenModal }: Props) {
  return (
    <div className="block md:hidden">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#092f20]">Máquinas e Equipamentos</h2>
          <p className="text-xs text-gray-600">Controle de máquinas e equipamentos da fazenda</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-[#86b646]/10 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600">Total de Máquinas</p>
            <p className="text-xl font-bold text-[#092f20]">{numeroMaquinas}</p>
          </div>

          <div className="bg-[#8fa49d]/10 p-4 rounded-lg text-center">
            <p className="text-xs text-gray-600">Valor Total</p>
            <p className="text-xl font-bold text-[#092f20] flex items-baseline justify-center gap-1">
              <span className="text-base">R$</span>
              <span>{custoTotal.toLocaleString('pt-BR')}</span>
            </p>
          </div>

          <div className="bg-[#397738]/10 p-4 rounded-lg border-2 border-dashed border-[#397738]/30">
            <button
              onClick={onOpenModal}
              className="w-full text-[#397738] font-medium"
            >
              + Cadastrar Máquinas e Equipamentos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
