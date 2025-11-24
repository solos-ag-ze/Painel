import { useState, useEffect } from 'react';
import { Truck, Paperclip } from 'lucide-react';
import { AuthService } from '../../services/authService';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import ErrorMessage from '../Dashboard/ErrorMessage';
import { MaquinaService } from '../../services/maquinaService';
import FileAttachmentModal from './FileAttachmentModal';
import FormMaquinaModal from './FormMaquinaModal';
import MaquinasEquipamentosHeaderMobile from './MaquinasEquipamentosHeaderMobile';
import MaquinasEquipamentosListMobile from './MaquinasEquipamentosListMobile';
import { MaquinasEquipamentos } from '../../lib/supabase';
import { formatCurrency } from '../../lib/currencyFormatter';


export default function MaquinasEquipamentosPanel() {
  const [maquinas, setMaquinas] = useState<MaquinasEquipamentos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numeroMaquinas, setNumeroMaquinas] = useState(0);
  const [custoTotal, setCustoTotal] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [selectedMaquina, setSelectedMaquina] = useState<{id: string, description: string} | null>(null);
  
  const authService = AuthService.getInstance();
  const maquinaService = new MaquinaService();
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.user_id || '';

  useEffect(() => {
    if (userId) {
      loadMaquinasData();
    }
  }, [userId]);

  const loadMaquinasData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [numeroMaquinasResult, custoTotalResult, maquinasResult] = await Promise.all([
        maquinaService.numeroMaquinas(userId),
        maquinaService.custoTotalMaquinas(userId),
        maquinaService.getMaquinasByUserId(userId)
      ]);

      setNumeroMaquinas(numeroMaquinasResult);
      setCustoTotal(custoTotalResult);
      setMaquinas(maquinasResult);
    } catch (error) {
      console.error('Error loading machines data:', error);
      setError('Failed to load machines data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAttachments = (maquina: MaquinasEquipamentos) => {
    setSelectedMaquina({
      id: maquina.id_maquina,
      description: maquina.nome || maquina.marca_modelo || 'Máquina sem nome'
    });
    setShowAttachmentModal(true);
  };

  const handleMaquinaCreated = (novaMaquina: MaquinasEquipamentos) => {
    setMaquinas((prev) => [...prev, novaMaquina]);
    loadMaquinasData();
  };

  const MaquinaList = ({
  maquinas,
  title,
  emptyMessage,
}: {
  maquinas: MaquinasEquipamentos[];
  title: string;
  emptyMessage: string;
}) => {
  const formatHours = (h?: number | null) =>
    h !== null && h !== undefined ? `${h.toLocaleString('pt-BR')} h` : '-';

  const formatBRL = (v?: number | null) =>
    v !== null && v !== undefined
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
      : '-';

  const formatDate = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <div className="bg-white rounded-[14px] border border-[rgba(0,68,23,0.06)] shadow-[0_1px_3px_rgba(0,68,23,0.06)] p-6">
      <div className="px-0 py-0">
        <h3 className="text-[16px] font-bold text-[#004417]">{title}</h3>
      </div>
      {maquinas.length === 0 ? (
        <div className="p-6 text-center bg-white rounded-[12px] shadow-[0_1px_3px_rgba(0,68,23,0.04)] mt-4">
          <Truck className="w-12 h-12 text-[#00A651] mx-auto mb-4" />
          <h3 className="text-[16px] font-semibold text-[#004417] mb-2">{emptyMessage}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 p-0 mt-4">
          {maquinas.map((maquina) => (
            <div key={maquina.id_maquina} className="relative bg-white rounded-[16px] p-6 border border-[rgba(0,68,23,0.04)] transition-all">
              {/* Cabeçalho do card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-[18px] font-bold text-[#004417] mb-1">
                    {maquina.nome}
                  </h4>
                  <p className="text-[14px] text-[#00441799] mb-2">
                    {maquina.marca_modelo || '-'}
                  </p>
                  <span className="inline-block text-[12px] font-medium px-2 py-0.5 text-[#004417] border border-[rgba(0,68,23,0.06)] rounded-[20px]">
                    {maquina.categoria || '-'}
                  </span>
                </div>
                
                {/* Ícone de anexo */}
                <button
                  onClick={() => handleOpenAttachments(maquina)}
                  title="Gerenciar anexos"
                  aria-label={`Gerenciar anexos de ${maquina.nome}`}
                  className="p-2 text-[#00A651] hover:text-[#004417] rounded-lg transition-colors"
                >
                  <Paperclip className="w-[18px] h-[18px]" />
                </button>
              </div>

              {/* Grid de informações 2x3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <span className="text-[13px] font-semibold text-[#004417B3] block mb-1">Horímetro Atual</span>
                  <span className="text-[14px] font-bold text-[#00A651]">{formatHours(maquina.horimetro_atual)}</span>
                </div>

                <div>
                  <span className="text-[13px] font-semibold text-[#004417B3] block mb-1">Valor de Compra</span>
                  <span className="text-[15px] font-bold text-[#00A651]">{formatBRL(maquina.valor_compra)}</span>
                </div>

                <div>
                  <span className="text-[13px] font-semibold text-[#004417B3] block mb-1">Data de Compra</span>
                  <span className="text-[13px] text-[#00A651]">{formatDate(maquina.data_compra)}</span>
                </div>

                <div>
                  <span className="text-[13px] font-semibold text-[#004417B3] block mb-1">Fornecedor</span>
                  <span className="text-[14px] text-[#004417] truncate block">{maquina.fornecedor || '-'}</span>
                </div>

                <div className="md:col-span-2">
                  <span className="text-[13px] font-semibold text-[#004417B3] block mb-1">Número de Série</span>
                  <span className="text-[13px] text-[#004417]">{maquina.numero_serie || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};



  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-6">
      <div className="hidden md:block">
        <h2 className="text-xl font-bold text-[#004417] mb-4">Máquinas e Equipamentos</h2>
        <div className="bg-white rounded-[14px] shadow-[0_1px_4px_rgba(0,68,23,0.08)] p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-[12px] transition-transform hover:scale-[1.005] shadow-[0_1px_3px_rgba(0,68,23,0.04)] border border-[rgba(0,68,23,0.04)]">
              <p className="text-[13px] text-[#00441799] mb-1">Total de Máquinas</p>
              <p className="text-[22px] font-bold text-[#004417]">{numeroMaquinas}</p>
            </div>
            <div className="bg-white p-6 rounded-[12px] transition-transform hover:scale-[1.005] shadow-[0_1px_3px_rgba(0,68,23,0.04)] border border-[rgba(0,68,23,0.04)]">
              <p className="text-[13px] text-[#00441799] mb-1">Valor Total</p>
              <p className="text-[22px] font-bold text-[#004417]">
                {formatCurrency(custoTotal)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-[12px] border-2 border-dashed border-[rgba(0,68,23,0.08)] transition-all duration-200 shadow-[0_1px_3px_rgba(0,68,23,0.04)]">
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full h-[60px] text-[#004417] font-bold flex items-center justify-center gap-2"
              >
                <span className="text-[#00A651] text-xl">➕</span>
                Cadastrar Máquinas e Equipamentos
              </button>
            </div>
          </div>
        </div>
      </div>
      <MaquinasEquipamentosHeaderMobile
        numeroMaquinas={numeroMaquinas}
        custoTotal={custoTotal}
        onOpenModal={() => setShowAddForm(true)}
      />

      <div className="hidden md:block">
        <MaquinaList
          maquinas={maquinas}
          title="Máquinas Ativas"
          emptyMessage="Nenhuma máquina ativa encontrada"
        />
      </div>

      <MaquinasEquipamentosListMobile
        maquinas={maquinas}
        onOpenAttachments={handleOpenAttachments}
      />

      {showAttachmentModal && selectedMaquina && (
        <FileAttachmentModal
          isOpen={showAttachmentModal}
          onClose={() => setShowAttachmentModal(false)}
          maquinaId={selectedMaquina.id}
          maquinaDescription={selectedMaquina.description}
        />
      )}

      <FormMaquinaModal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onCreated={handleMaquinaCreated}
      />
    </div>
  );
}