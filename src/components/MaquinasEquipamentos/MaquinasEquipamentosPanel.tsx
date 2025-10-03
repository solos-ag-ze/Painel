import React, { useState, useEffect } from 'react';
import { Settings, Plus, CreditCard as Edit, Trash2, CheckCircle, AlertTriangle, XCircle, Save, X, Wrench, Truck, Paperclip } from 'lucide-react';
import { AuthService } from '../../services/authService';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import ErrorMessage from '../Dashboard/ErrorMessage';
import { MaquinaService } from '../../services/maquinaService';
import FileAttachmentModal from './FileAttachmentModal';
import FormMaquinaModal from './FormMaquinaModal';
import MaquinasEquipamentosHeaderMobile from './MaquinasEquipamentosHeaderMobile';
import MaquinasEquipamentosListMobile from './MaquinasEquipamentosListMobile';
import { MaquinasEquipamentos } from '../../lib/supabase';


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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#092f20]">{title}</h3>
      </div>

      {maquinas.length === 0 ? (
        <div className="p-6 text-center">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#092f20] mb-2">{emptyMessage}</h3>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {maquinas.map((maquina) => (
            <div key={maquina.id_maquina} className="p-6 hover:bg-gray-50 transition-colors">
              {/* linha principal: flex com wrap para responsividade */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* 1ª coluna (ocupa o máximo à esquerda) */}
                <div className="flex-1 min-w-[220px]">
                  <h4 className="text-lg font-semibold text-[#092f20] mb-1 truncate">
                    {maquina.nome}
                  </h4>
                  <p className="text-sm font-medium text-[#092f20] mb-1 truncate">
                    {maquina.marca_modelo || '-'}
                  </p>
                  <p className="text-sm px-2 py-1 bg-green-100 text-green-700 rounded-full inline-block">
                    {maquina.categoria || '-'}
                  </p>
                </div>

                {/* Demais colunas — cada uma com min-width para controlar quando quebram */}
                <div className="flex flex-col min-w-[130px]">
                  <span className="text-xs text-gray-500">Horímetro Atual</span>
                  <span className="text-sm font-medium text-[#092f20]">{formatHours(maquina.horimetro_atual)}</span>
                </div>

                <div className="flex flex-col min-w-[140px]">
                  <span className="text-xs text-gray-500">Valor de Compra</span>
                  <span className="text-sm font-medium text-[#397738]">{formatBRL(maquina.valor_compra)}</span>
                </div>

                <div className="flex flex-col min-w-[140px]">
                  <span className="text-xs text-gray-500">Data de Compra</span>
                  <span className="text-sm font-medium text-[#092f20]">{formatDate(maquina.data_compra)}</span>
                </div>

                <div className="flex flex-col min-w-[160px]">
                  <span className="text-xs text-gray-500">Fornecedor</span>
                  <span className="text-sm font-medium text-[#092f20] truncate">{maquina.fornecedor || '-'}</span>
                </div>

                <div className="flex flex-col min-w-[150px]">
                  <span className="text-xs text-gray-500">Número de Série</span>
                  <span className="text-sm font-medium text-[#092f20] truncate">{maquina.numero_serie || '-'}</span>
                </div>

                {/* Paperclip (último) */}
                <div className="ml-auto">
                  <button
                    onClick={() => handleOpenAttachments(maquina)}
                    title="Gerenciar arquivos"
                    aria-label={`Gerenciar arquivos de ${maquina.nome}`}
                    className="p-2 bg-gray-200 text-gray-600 hover:text-[#397738] hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
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
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#092f20]">Máquinas e Equipamentos</h2>
          <p className="text-sm font-medium text-[#397738]">
            Controle de máquinas e equipamentos da fazenda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#86b646]/10 p-6 rounded-lg">
            <p>Total de Máquinas</p>
            <p className="text-3xl font-bold">{numeroMaquinas}</p>
          </div>
          <div className="bg-[#8fa49d]/10 p-6 rounded-lg">
            <p>Valor Total</p>
            <p className="text-3xl font-bold">
              R$ {custoTotal.toLocaleString()}
            </p>
          </div>
          <div className="bg-[#397738]/10 p-6 rounded-lg border-2 border-dashed border-[#397738]/30">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full h-full text-[#397738]"
            >
              + Cadastrar Máquinas e Equipamentos
            </button>
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