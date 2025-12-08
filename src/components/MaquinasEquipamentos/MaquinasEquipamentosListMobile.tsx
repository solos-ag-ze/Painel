import { Truck, Paperclip } from 'lucide-react';
import { MaquinasEquipamentos } from '../../lib/supabase';

interface Props {
  maquinas: MaquinasEquipamentos[];
  onOpenAttachments: (maquina: MaquinasEquipamentos) => void;
}

export default function MaquinasEquipamentosListMobile({ maquinas, onOpenAttachments }: Props) {
  const formatHours = (h?: number | null) =>
    h !== null && h !== undefined ? `${h.toLocaleString('pt-BR')} h` : '-';

  const formatBRL = (v?: number | null) =>
    v !== null && v !== undefined
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
      : '-';

  const formatDate = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  if (maquinas.length === 0) {
    return (
      <div className="block md:hidden">
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.04)] border border-[rgba(0,68,23,0.08)] p-6 text-center">
          <Truck className="w-12 h-12 text-[rgba(0,68,23,0.3)] mx-auto mb-4" />
          <h3 className="text-[16px] font-semibold text-[#004417] mb-2">
            Nenhuma máquina ativa encontrada
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="block md:hidden space-y-3">
      {maquinas.map((maquina) => (
        <div
          key={maquina.id_maquina}
          className="bg-white rounded-xl border border-[rgba(0,68,23,0.06)] p-4 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="text-[15px] font-bold text-[#004417] mb-1">
                {maquina.nome}
              </h4>
              <p className="text-[14px] text-[rgba(0,68,23,0.7)] mb-2">
                {maquina.marca_modelo || '-'}
              </p>
              <span className="inline-block text-[12px] font-medium px-2 py-0.5 text-[#004417] border border-[rgba(0,68,23,0.06)] rounded-xl">
                {maquina.categoria || '-'}
              </span>
            </div>
            <button
              onClick={() => onOpenAttachments(maquina)}
              title="Gerenciar anexos"
              aria-label={`Gerenciar anexos de ${maquina.nome}`}
              className="p-2 text-[#004417] rounded-lg transition-colors"
            >
              <Paperclip className="w-[18px] h-[18px]" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[rgba(0,68,23,0.08)]">
            <div>
              <p className="text-[13px] font-semibold text-[rgba(0,68,23,0.6)] mb-1">Horímetro Atual</p>
              <p className="text-[14px] font-semibold text-[#004417]">
                {formatHours(maquina.horimetro_atual)}
              </p>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[rgba(0,68,23,0.6)] mb-1">Valor de Compra</p>
              <p className="text-[15px] font-bold text-[#004417]">
                {formatBRL(maquina.valor_compra)}
              </p>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[rgba(0,68,23,0.6)] mb-1">Data de Compra</p>
              <p className="text-[13px] text-[rgba(0,68,23,0.7)]">
                {formatDate(maquina.data_compra)}
              </p>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-[rgba(0,68,23,0.6)] mb-1">Fornecedor</p>
              <p className="text-[14px] text-[#004417] truncate">
                {maquina.fornecedor || '-'}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-[13px] font-semibold text-[rgba(0,68,23,0.6)] mb-1">Número de Série</p>
              <p className="text-[13px] text-[rgba(0,68,23,0.7)] truncate">
                {maquina.numero_serie || '-'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
