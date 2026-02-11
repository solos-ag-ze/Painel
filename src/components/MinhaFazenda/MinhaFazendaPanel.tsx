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

      console.log('='.repeat(80));
      console.log('🌾 [MinhaFazenda] Talhões carregados (ANTES do filtro):', talhoesDetalhados.length);
      console.log('🌾 [MinhaFazenda] Todos os talhões:', talhoesDetalhados.map((t: any) => ({
        nome: t.nome,
        cultura: t.cultura,
        is_completed: t.is_completed,
        ativo: t.ativo,
        talhao_default: t.talhao_default
      })));
      
      const talhoesCafe = talhoesDetalhados.filter((t: any) => t.cultura === 'Café' && t.is_completed === true);
      console.log('☕ [MinhaFazenda] Talhões após filtro (Café + is_completed=true):', talhoesCafe.length);
      console.log('☕ [MinhaFazenda] Talhões filtrados:', talhoesCafe.map((t: any) => ({
        nome: t.nome,
        ativo: t.ativo
      })));
      console.log('='.repeat(80));

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
    // Selo menor e discreto: sem fundo verde, apenas texto com borda sutil
    return ativo
      ? 'text-[#004417] text-xs font-medium px-2 py-0.5 rounded-full border border-[rgba(0,68,23,0.06)]'
      : 'text-[rgba(0,68,23,0.6)] text-xs font-medium px-2 py-0.5 rounded-full border border-[rgba(0,68,23,0.04)]';
  };

  const getStatusIcon = (ativo: boolean) => {
    // Minimal icon used in the action button (always using dark green)
    return ativo 
      ? <ToggleRight className="w-5 h-5 text-[#004417]" />
      : <ToggleLeft className="w-5 h-5 text-[#004417]" />;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadFarmData} />;
  }

  const talhoesCafe = talhoes.filter(t => t.cultura === 'Café' && t.is_completed === true);
  // Separar entre ativos e inativos baseado no campo 'ativo'
  const talhoesAtivos = talhoesCafe.filter(t => t.ativo === true);
  const talhoesInativos = talhoesCafe.filter(t => t.ativo !== true);

  console.log('📊 [MinhaFazenda RENDER] Total talhões no state:', talhoes.length);
  console.log('☕ [MinhaFazenda RENDER] Talhões de café com is_completed=true:', talhoesCafe.length);
  console.log('✅ [MinhaFazenda RENDER] Talhões ativos:', talhoesAtivos.length);
  console.log('⏸️  [MinhaFazenda RENDER] Talhões inativos:', talhoesInativos.length);

  // Confirmation Modal Component
  const ConfirmationModal = () => {
    if (!showModal || !selectedTalhao) return null;

    const isActivating = !selectedTalhao.ativo;
    const actionText = isActivating ? 'ATIVAR' : 'DESATIVAR';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-[rgba(0,166,81,0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
              {isActivating ? (
                <ToggleRight className="w-8 h-8 text-[#00A651]" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-[#004417]" />
              )}
            </div>
            
            <h3 className="text-lg font-bold text-[#004417] mb-2">
              Confirmar Ação
            </h3>
            
            <p className="text-[rgba(0,68,23,0.65)] mb-6">
              DESEJA REALMENTE {actionText} ESTE TALHÃO?
            </p>
            
            <div className="bg-[rgba(0,68,23,0.05)] rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <Sprout className="w-5 h-5 text-[#00A651]" />
                <span className="font-semibold text-[#004417]">{selectedTalhao.nome}</span>
              </div>
              <p className="text-sm text-[rgba(0,68,23,0.7)] mt-1">
                {selectedTalhao.area?.toFixed(2)} ha • {selectedTalhao.cultura}
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancelToggle}
                className="flex-1 px-4 py-2.5 text-[#004417] border border-[rgba(0,68,23,0.2)] rounded-lg hover:bg-[rgba(0,68,23,0.05)] transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmToggle}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors font-medium ${
                  isActivating 
                    ? 'bg-[#00A651] hover:bg-[#008a44]'
                    : 'bg-[#F7941F] hover:bg-[#e08419]'
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
    <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,68,23,0.10)]">
      <div className="px-6 py-5 border-b border-[rgba(0,68,23,0.08)]">
        <h3 className="text-base font-bold text-[#004417]">{title}</h3>
        {talhoes.length > 0 && (
          <p className="text-sm text-[rgba(0,68,23,0.7)] mt-1">{talhoes.length} {talhoes.length === 1 ? 'talhão' : 'talhões'}</p>
        )}
      </div>

      {talhoes.length === 0 ? (
        <div className="p-6 text-center bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,68,23,0.10)]">
          <MapPin className="w-12 h-12 text-[rgba(0,68,23,0.35)] mx-auto mb-4" />
          <h3 className="text-base font-semibold text-[rgba(0,68,23,0.6)] mb-2">{emptyMessage}</h3>
        </div>
      ) : (
        <div className="p-4">
          {talhoes.map((talhao) => (
            <div 
              key={talhao.id_talhao} 
              className="relative bg-white rounded-[14px] p-5 transition-all mb-5 min-h-[140px] shadow-[0_1px_3px_rgba(0,68,23,0.10)] hover:shadow-[0_2px_6px_rgba(0,68,23,0.12)]"
            >
              {/* Badge no canto superior direito */}
              <span className={`absolute right-4 top-4 ${getStatusColor(talhao.ativo || false)}`}>
                {talhao.ativo ? 'Ativo' : 'Inativo'}
              </span>

              <div className="mb-3">
                <h4 className="text-lg">
                  <span className="inline-block bg-[rgba(0,166,81,0.12)] text-[#004417] rounded-full px-3 py-1 text-sm font-semibold">{talhao.nome}</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-[rgba(0,68,23,0.6)] uppercase tracking-wide block mb-1">Área</span>
                  <p className="text-sm font-semibold text-[#004417]">
                    {talhao.area?.toFixed(2) || '0.00'} <span className="text-[#004417]">ha</span>
                  </p>
                </div>

                <div>
                  <span className="text-xs text-[rgba(0,68,23,0.6)] uppercase tracking-wide block mb-1">Produtividade</span>
                  <p className="text-sm font-semibold text-[#004417]">
                    {talhao.produtividade_saca ? (
                      <>
                        {talhao.produtividade_saca} <span className="text-[#004417]">sc/ha</span>
                      </>
                    ) : '-'}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-[rgba(0,68,23,0.6)] uppercase tracking-wide block mb-1">Variedade</span>
                  <p className="text-sm font-semibold text-[#004417]">{talhao.variedade_plantada || '-'}</p>
                </div>

                <div>
                  <span className="text-xs text-[rgba(0,68,23,0.6)] uppercase tracking-wide block mb-1">Quantidade de Pés</span>
                  <p className="text-sm font-semibold text-[#004417]">
                    {talhao.quantidade_de_pes ? (
                      <>
                        {Number(talhao.quantidade_de_pes).toLocaleString()} <span className="text-[#004417]">pés</span>
                      </>
                    ) : '-'}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-xs text-[rgba(0,68,23,0.6)] uppercase tracking-wide block mb-1">Ano de Plantio</span>
                  <p className="text-sm font-semibold text-[#004417]">{talhao.ano_de_plantio ? String(talhao.ano_de_plantio).substring(0, 4) : '-'}</p>
                </div>
              </div>

              {/* Botão minimalista no canto inferior direito */}
              <button
                onClick={() => handleToggleClick(talhao)}
                className="absolute right-4 bottom-4 p-2 text-[#004417] hover:opacity-90"
                title={talhao.ativo ? 'Desativar talhão' : 'Ativar talhão'}
              >
                {getStatusIcon(talhao.ativo || false)}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header com informações principais */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.08)] border border-[rgba(0,68,23,0.08)] p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-[rgba(0,166,81,0.1)] rounded-full flex items-center justify-center flex-shrink-0">
            <Home className="w-6 h-6 text-[#00A651]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#004417]">Minha Fazenda</h2>
            <p className="text-sm text-[rgba(0,68,23,0.65)]">
              {userData?.nome && userData?.cidade && userData?.estado 
                ? `${userData.nome} - ${userData.cidade}, ${userData.estado}`
                : 'Informações da propriedade'
              }
            </p>
          </div>
        </div>

        {/* Informações resumidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="bg-[rgba(0,166,81,0.08)] rounded-xl p-5">
            <div className="flex items-center space-x-4 mb-3">
              <BarChart3 className="w-5 h-5 text-[#004417]" />
              <span className="text-sm font-medium text-[#004417]">Área Total da Fazenda</span>
            </div>
            <p className="text-2xl font-bold text-[#004417]">{areaTotal.toFixed(1)} ha</p>
          </div>
          
          <div className="bg-[rgba(202,219,42,0.12)] rounded-xl p-5">
            <div className="flex items-center space-x-4 mb-3">
              <Sprout className="w-5 h-5 text-[#004417]" />
              <span className="text-sm font-medium text-[#004417]">Área Ativa</span>
            </div>
            <p className="text-2xl font-bold text-[#004417] mb-1">{areaCultivada.toFixed(1)} ha</p>
            <p className="text-xs text-[rgba(0,68,23,0.7)]">Soma das áreas dos talhões ativos</p>
          </div>
          
          <div className="bg-[rgba(0,68,23,0.05)] rounded-xl p-5">
            <div className="flex items-center space-x-4 mb-3">
              <MapPin className="w-5 h-5 text-[#004417]" />
              <span className="text-sm font-medium text-[#004417]">Total de Talhões</span>
            </div>
            <p className="text-2xl font-bold text-[#004417] mb-1">{talhoesCafe.length}</p>
            <p className="text-xs text-[rgba(0,68,23,0.7)]">{talhoesAtivos.length} ativos • {talhoesInativos.length} inativos</p>
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