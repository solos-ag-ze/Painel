import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Home,
  Sprout
} from 'lucide-react';
import { AuthService } from '../../services/authService';
import { TalhaoService } from '../../services/talhaoService';
import { UserService } from '../../services/userService';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import ErrorMessage from '../Dashboard/ErrorMessage';
import type { Talhao, Usuario, Propriedade } from '../../lib/supabase';

interface TalhaoDetalhado extends Talhao {
  propriedade?: Propriedade;
}

export default function MinhaFazendaPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<Usuario | null>(null);
  const [talhoes, setTalhoes] = useState<TalhaoDetalhado[]>([]);
  const [areaCultivada, setAreaCultivada] = useState(0);
  const [areaTotal, setAreaTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedTalhao, setSelectedTalhao] = useState<TalhaoDetalhado | null>(null);

  const authService = AuthService.getInstance();
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.user_id || '';

  useEffect(() => {
    if (userId) {
      loadFarmData();
    }
  }, [userId]);

  const loadFarmData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [user, talhoesDetalhados, areaCafe, areatotal] = await Promise.all([
        UserService.getUserById(userId),
        TalhaoService.getTalhoesNonDefault(userId, { onlyActive: false }),
        TalhaoService.getAreaCultivadaCafe(userId),
        TalhaoService.getTotalAreaFazenda(userId)
      ]);

      setUserData(user);
      setTalhoes(talhoesDetalhados as TalhaoDetalhado[]);
      setAreaCultivada(areaCafe);
      setAreaTotal(areatotal);

    } catch (err) {
      console.error('Erro ao carregar dados da fazenda:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClick = (talhao: TalhaoDetalhado) => {
    setSelectedTalhao(talhao);
    setShowModal(true);
  };

  const handleConfirmToggle = async () => {
    if (!selectedTalhao) return;
    
    try {
      const result = await TalhaoService.toggleTalhaoStatus(selectedTalhao.id_talhao);
      if (result.success) {
        setTalhoes(prev => prev.map(t => 
          t.id_talhao === selectedTalhao.id_talhao 
            ? { ...t, ativo: result.newStatus }
            : t
        ));
        const novaArea = await TalhaoService.getAreaCultivadaCafe(userId);
        setAreaCultivada(novaArea);
      }
    } catch (error) {
      console.error('Erro ao alterar status do talhão:', error);
    } finally {
      setShowModal(false);
      setSelectedTalhao(null);
    }
  };

  const handleCancelToggle = () => {
    setShowModal(false);
    setSelectedTalhao(null);
  };

  const getStatusColor = (ativo: boolean) => {
    return ativo 
      ? 'bg-[#397738]/10 text-[#397738] border-[#397738]/30'
      : 'bg-gray-100 text-gray-600 border-gray-300';
  };

  const getStatusIcon = (ativo: boolean) => {
    return ativo 
      ? <ToggleRight className="w-5 h-5 text-[#397738]" />
      : <ToggleLeft className="w-5 h-5 text-gray-500" />;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadFarmData} />;
  }

  const talhoesCafe = talhoes.filter(t => t.cultura === 'Café');
  const talhoesAtivos = talhoesCafe.filter(t => t.ativo);
  const talhoesInativos = talhoesCafe.filter(t => !t.ativo);

  // Confirmation Modal Component
  const ConfirmationModal = () => {
    if (!showModal || !selectedTalhao) return null;

    const isActivating = !selectedTalhao.ativo;
    const actionText = isActivating ? 'ATIVAR' : 'DESATIVAR';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-full flex items-center justify-center mx-auto mb-4">
              {isActivating ? (
                <ToggleRight className="w-8 h-8 text-white" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-white" />
              )}
            </div>
            
            <h3 className="text-lg font-bold text-[#092f20] mb-2">
              Confirmar Ação
            </h3>
            
            <p className="text-gray-600 mb-6">
              DESEJA REALMENTE {actionText} ESTE TALHÃO?
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <Sprout className="w-5 h-5 text-[#397738]" />
                <span className="font-semibold text-[#092f20]">{selectedTalhao.nome}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {selectedTalhao.area?.toFixed(2)} ha • {selectedTalhao.cultura}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancelToggle}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmToggle}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                  isActivating 
                    ? 'bg-[#397738] hover:bg-[#2d5c2a]'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionText}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Component to render talhão list
  const TalhaoList = ({ talhoes, title, emptyMessage }: { 
    talhoes: TalhaoDetalhado[], 
    title: string, 
    emptyMessage: string 
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#092f20]">{title}</h3>
      </div>

      {talhoes.length === 0 ? (
        <div className="p-6 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#092f20] mb-2">{emptyMessage}</h3>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {talhoes.map((talhao) => (
            <div key={talhao.id_talhao} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h4 className="text-lg font-semibold text-[#092f20]">{talhao.nome}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(talhao.ativo || false)}`}>
                      {talhao.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wide">Área</span>
                      <p className="font-medium text-[#092f20]">{talhao.area?.toFixed(2) || '0.00'} ha</p>
                    </div>
                    {/*<div>
                      <span className="text-gray-500 text-xs uppercase tracking-wide">Cultura</span>
                      <p className="font-medium text-[#092f20]">{talhao.cultura}</p>
                    </div>*/}
                    <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wide">Produtividade</span>
                      <p className="font-medium text-[#397738]">
                        {talhao.produtividade_saca ? `${talhao.produtividade_saca} sc/ha` : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wide">Variedade</span>
                      <p className="font-medium text-[#092f20]">{talhao.variedade_plantada || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wide">Quantidade de Pés</span>
                      <p className="font-medium text-[#092f20]">
                        {talhao.quantidade_de_pes ? Number(talhao.quantidade_de_pes).toLocaleString() : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wide">Ano de Plantio</span>
                      <p className="font-medium text-[#092f20]">{talhao.ano_de_plantio ? String(talhao.ano_de_plantio).substring(0, 4) : '-'}</p>
                    </div>
                      <div>
                      <span className="text-gray-500 text-xs uppercase tracking-wide">Ativar/Desativar</span>
                      <button
                        onClick={() => handleToggleClick(talhao)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
                        title={talhao.ativo ? 'Desativar talhão' : 'Ativar talhão'}
                      >
                        {getStatusIcon(talhao.ativo || false)}
                      </button>
                    </div>
                  </div>
                  
                </div>                
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header com informações principais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#092f20]">Minha Fazenda</h2>
              <p className="text-sm text-gray-600">
                {userData?.nome && userData?.cidade && userData?.estado 
                  ? `${userData.nome} - ${userData.cidade}, ${userData.estado}`
                  : 'Informações da propriedade'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Informações resumidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#86b646]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-[#86b646]" />
              <span className="text-sm font-medium text-[#092f20]">Área Total da Fazenda</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20] mt-2">{areaTotal.toFixed(1)} ha</p>
          </div>
          
          <div className="bg-[#397738]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Sprout className="w-5 h-5 text-[#397738]" />
              <span className="text-sm font-medium text-[#092f20]">Área Ativa</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20] mt-2">{areaCultivada.toFixed(1)} ha</p>
            <p className="text-xs text-gray-600 mt-1">Soma das áreas dos talhões ativos</p>
          </div>
          
          <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-[#8fa49d]" />
              <span className="text-sm font-medium text-[#092f20]">Total de Talhões</span>
            </div>
            <p className="text-2xl font-bold text-[#092f20] mt-2">{talhoesCafe.length}</p>
            <p className="text-xs text-gray-600 mt-1">{talhoesAtivos.length} ativos</p>
          </div>
        </div>
      </div>

      {/* Talhões Ativos */}
      <TalhaoList 
        talhoes={talhoesAtivos}
        title="Talhões Ativos"
        emptyMessage="Nenhum talhão ativo encontrado"
      />

      {/* Talhões Inativos */}
      <TalhaoList 
        talhoes={talhoesInativos}
        title="Talhões Inativos"
        emptyMessage="Nenhum talhão inativo encontrado"
      />

      {/* Confirmation Modal */}
      <ConfirmationModal />
    </div>
  );
}