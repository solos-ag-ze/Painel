import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Ocorrencia } from './mockOcorrencias';
import OcorrenciaCard from './OcorrenciaCard';
import OcorrenciaDetailPanel from './OcorrenciaDetailPanel';
import OcorrenciaFormModal from './OcorrenciaFormModal';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import { PragasDoencasService, PragaDoencaComTalhoes } from '../../services/pragasDoencasService';
import { AuthService } from '../../services/authService';

interface OcorrenciaComTalhaoIds extends Ocorrencia {
  talhaoIds?: string[];
}

function adaptarParaOcorrencia(praga: PragaDoencaComTalhoes): OcorrenciaComTalhaoIds {
  const talhaoNames = praga.talhoes_vinculados && praga.talhoes_vinculados.length > 0
    ? praga.talhoes_vinculados.map(t => t.nome_talhao || 'Sem nome').join(', ')
    : praga.talhoes || 'Sem talhao';

  const talhaoIds = praga.talhoes_vinculados?.map(t => t.talhao_id) || [];

  return {
    id: praga.id,
    origem: (praga.origem as 'WhatsApp' | 'Painel') || 'Painel',
    talhao: talhaoNames,
    dataOcorrencia: praga.data_da_ocorrencia,
    faseLavoura: (praga.fase_da_lavoura as any) || 'Vegetativo',
    tipoOcorrencia: (praga.tipo_de_ocorrencia as any) || 'Praga',
    severidade: (praga.nivel_da_gravidade as any) || 'Media',
    areaAfetada: praga.area_afetada || '',
    sintomas: praga.sintomas_observados || '',
    acaoTomada: praga.acao_tomada || '',
    nomePraga: praga.nome_praga,
    diagnostico: (praga.diagnostico as any),
    descricaoDetalhada: praga.descricao_detalhada,
    climaRecente: praga.clima_recente,
    produtosAplicados: praga.produtos_aplicados,
    dataAplicacao: praga.data_aplicacao,
    recomendacoes: praga.recomendacoes,
    status: (praga.status as any) || 'Nova',
    anexos: praga.anexos,
    fotoPrincipal: praga.foto_principal || PragasDoencasService.getOcorrenciaIcon(praga.tipo_de_ocorrencia),
    talhaoIds,
    // Propagar created_at do banco para o componente (usar createdAt camelCase)
    created_at: praga.created_at,
    createdAt: praga.created_at,
  };
}

export default function PragasDoencasPanel() {
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaComTalhaoIds[]>([]);
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<OcorrenciaComTalhaoIds | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOcorrencia, setEditingOcorrencia] = useState<OcorrenciaComTalhaoIds | null>(null);
  const [loading, setLoading] = useState(true);

  const authService = AuthService.getInstance();
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.user_id;

  useEffect(() => {
    if (!userId) {
      console.error('Usuário não autenticado');
      setLoading(false);
      return;
    }
    loadOcorrencias();
  }, [userId]);

  const loadOcorrencias = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const data = await PragasDoencasService.getOcorrencias(userId);
      const adaptadas = data.map(adaptarParaOcorrencia);
      setOcorrencias(adaptadas);
    } catch (error) {
      console.error('Erro ao carregar ocorrencias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (ocorrencia: Ocorrencia) => {
    const fullOcorrencia = ocorrencias.find(o => o.id === ocorrencia.id);
    setSelectedOcorrencia(fullOcorrencia || ocorrencia as OcorrenciaComTalhaoIds);
    setIsDetailOpen(true);
  };

  const handleEdit = (ocorrencia: Ocorrencia) => {
    const fullOcorrencia = ocorrencias.find(o => o.id === ocorrencia.id);
    setEditingOcorrencia(fullOcorrencia || ocorrencia as OcorrenciaComTalhaoIds);
    setIsFormOpen(true);
    setIsDetailOpen(false);
  };

  const handleMarkResolved = async (ocorrencia: Ocorrencia) => {
    if (!userId) {
      console.error('Usuário não autenticado');
      return;
    }

    const { error } = await PragasDoencasService.updateStatus(
      ocorrencia.id,
      'Resolvida',
      userId
    );

    if (error) {
      console.error('Erro ao atualizar status:', error);
      return;
    }

    const updated = ocorrencias.map((o) =>
      o.id === ocorrencia.id ? { ...o, status: 'Resolvida' as const } : o
    );
    setOcorrencias(updated);
    setSelectedOcorrencia(updated.find((o) => o.id === ocorrencia.id) || null);
  };

  const handleDelete = async (ocorrenciaId: number) => {
    const { error } = await PragasDoencasService.deleteOcorrencia(ocorrenciaId);

    if (error) {
      console.error('Erro ao deletar ocorrencia:', error);
      return;
    }

    setOcorrencias(ocorrencias.filter((o) => o.id !== ocorrenciaId));
    setIsDetailOpen(false);
    setSelectedOcorrencia(null);
  };

  const handleFormSubmit = async (values: any, talhaoIds?: string[], imageFile?: File) => {
    if (!userId) {
      console.error('Usuário não autenticado');
      return;
    }


    if (editingOcorrencia) {
      const payload = {
        user_id: userId,
        talhoes: values.talhao,
        data_da_ocorrencia: values.dataOcorrencia,
        fase_da_lavoura: values.faseLavoura,
        tipo_de_ocorrencia: values.tipoOcorrencia,
        nivel_da_gravidade: values.severidade,
        area_afetada: values.areaAfetada,
        sintomas_observados: values.sintomas,
        acao_tomada: values.acaoTomada,
        nome_praga: values.nomePraga || null,
        diagnostico: values.diagnostico || null,
        descricao_detalhada: values.descricaoDetalhada || null,
        clima_recente: values.climaRecente || null,
        produtos_aplicados: values.produtosAplicados,
        data_aplicacao: values.dataAplicacao || null,
        recomendacoes: values.recomendacoes || null,
        status: values.status,
        origem: values.origem || 'Painel',
        foto_principal: values.fotoPrincipal,
      };

      const { error } = await PragasDoencasService.updateOcorrencia(
        editingOcorrencia.id,
        payload,
        talhaoIds && talhaoIds.length > 0 ? talhaoIds : undefined,
        imageFile // passar imageFile para substituição
      );

      if (error) {
        console.error('Erro ao atualizar ocorrencia:', error);
        alert('Erro ao atualizar ocorrência. Verifique o console para mais detalhes.');
        return;
      }

      await loadOcorrencias();
      setEditingOcorrencia(null);

    } else {
      const payload = {
        user_id: userId,
        talhoes: values.talhao,
        data_da_ocorrencia: values.dataOcorrencia || new Date().toISOString().split('T')[0],
        fase_da_lavoura: values.faseLavoura || 'Vegetativo',
        tipo_de_ocorrencia: values.tipoOcorrencia || 'Praga',
        nivel_da_gravidade: values.severidade || 'Media',
        area_afetada: values.areaAfetada || '',
        sintomas_observados: values.sintomas || '',
        acao_tomada: values.acaoTomada || '',
        nome_praga: values.nomePraga || null,
        diagnostico: values.diagnostico || null,
        descricao_detalhada: values.descricaoDetalhada || null,
        clima_recente: values.climaRecente || null,
        produtos_aplicados: values.produtosAplicados || [],
        data_aplicacao: values.dataAplicacao || null,
        recomendacoes: values.recomendacoes || null,
        status: values.status || 'Nova',
        origem: 'Painel',
        foto_principal: values.fotoPrincipal || PragasDoencasService.getOcorrenciaIcon(values.tipoOcorrencia),
        anexos: [],
      };

      const { error } = await PragasDoencasService.createOcorrencia(payload, talhaoIds, imageFile);

      if (error) {
        console.error('Erro ao criar ocorrencia:', error);
        alert('Erro ao salvar ocorrência. Verifique o console para mais detalhes.');
        return;
      }

      await loadOcorrencias();
    }
    setIsFormOpen(false);
  };

  const handleNewOcorrencia = () => {
    setEditingOcorrencia(null);
    setIsFormOpen(true);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#004417] mb-4">Pragas e Doenças</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop: botão com texto */}
          <button
            onClick={handleNewOcorrencia}
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nova Ocorrencia</span>
          </button>

          {/* Mobile: somente ícone + */}
          <button
            onClick={handleNewOcorrencia}
            className="inline-flex md:hidden items-center justify-center p-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-full"
            aria-label="Nova Ocorrencia"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {ocorrencias.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🌾</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma ocorrencia registrada</h3>
          <p className="text-gray-600 mb-6">
            Comece registrando uma nova ocorrencia de praga ou doenca
          </p>
          <button
            onClick={handleNewOcorrencia}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Registrar Ocorrencia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ocorrencias.map((ocorrencia) => (
            <OcorrenciaCard
              key={ocorrencia.id}
              ocorrencia={ocorrencia}
              onViewDetails={handleViewDetails}
              onEdit={handleEdit}
              onMarkResolved={handleMarkResolved}
            />
          ))}
        </div>
      )}

      {isDetailOpen && selectedOcorrencia && (
        <OcorrenciaDetailPanel
          ocorrencia={selectedOcorrencia}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedOcorrencia(null);
          }}
          onEdit={handleEdit}
          onMarkResolved={handleMarkResolved}
          onDelete={handleDelete}
        />
      )}

      <OcorrenciaFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingOcorrencia(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingOcorrencia}
        userId={userId || ''}
        initialTalhaoIds={editingOcorrencia?.talhaoIds || []}
      />
    </div>
  );
}
