import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Ocorrencia } from './mockOcorrencias';
import OcorrenciaCard from './OcorrenciaCard';
import OcorrenciaDetailPanel from './OcorrenciaDetailPanel';
import OcorrenciaFormModal from './OcorrenciaFormModal';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import { PragasDoencasService, PragaDoencaComTalhoes } from '../../services/pragasDoencasService';

const TEMP_USER_ID = 'c7f13743-67ef-45d4-807c-9f5de81d4999';

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
  };
}

export default function PragasDoencasPanel() {
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaComTalhaoIds[]>([]);
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<OcorrenciaComTalhaoIds | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOcorrencia, setEditingOcorrencia] = useState<OcorrenciaComTalhaoIds | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOcorrencias();
  }, []);

  const loadOcorrencias = async () => {
    setLoading(true);
    try {
      const data = await PragasDoencasService.getOcorrencias(TEMP_USER_ID);
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
    const { error } = await PragasDoencasService.updateStatus(
      ocorrencia.id,
      'Resolvida',
      TEMP_USER_ID
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

  const handleFormSubmit = async (formData: Partial<Ocorrencia>, talhaoIds: string[]) => {
    if (editingOcorrencia) {
      const payload = {
        user_id: TEMP_USER_ID,
        talhoes: formData.talhao,
        data_da_ocorrencia: formData.dataOcorrencia,
        fase_da_lavoura: formData.faseLavoura,
        tipo_de_ocorrencia: formData.tipoOcorrencia,
        nivel_da_gravidade: formData.severidade,
        area_afetada: formData.areaAfetada,
        sintomas_observados: formData.sintomas,
        acao_tomada: formData.acaoTomada,
        nome_praga: formData.nomePraga,
        diagnostico: formData.diagnostico,
        descricao_detalhada: formData.descricaoDetalhada,
        clima_recente: formData.climaRecente,
        produtos_aplicados: formData.produtosAplicados,
        data_aplicacao: formData.dataAplicacao,
        recomendacoes: formData.recomendacoes,
        status: formData.status,
        origem: formData.origem || 'Painel',
        foto_principal: formData.fotoPrincipal,
      };

      const { error } = await PragasDoencasService.updateOcorrencia(
        editingOcorrencia.id,
        payload,
        talhaoIds.length > 0 ? talhaoIds : undefined
      );

      if (error) {
        console.error('Erro ao atualizar ocorrencia:', error);
        return;
      }

      await loadOcorrencias();
      setEditingOcorrencia(null);
    } else {
      const payload = {
        user_id: TEMP_USER_ID,
        talhoes: formData.talhao,
        data_da_ocorrencia: formData.dataOcorrencia || new Date().toISOString().split('T')[0],
        fase_da_lavoura: formData.faseLavoura || 'Vegetativo',
        tipo_de_ocorrencia: formData.tipoOcorrencia || 'Praga',
        nivel_da_gravidade: formData.severidade || 'Media',
        area_afetada: formData.areaAfetada || '',
        sintomas_observados: formData.sintomas || '',
        acao_tomada: formData.acaoTomada || '',
        nome_praga: formData.nomePraga,
        diagnostico: formData.diagnostico,
        descricao_detalhada: formData.descricaoDetalhada,
        clima_recente: formData.climaRecente,
        produtos_aplicados: formData.produtosAplicados || [],
        data_aplicacao: formData.dataAplicacao,
        recomendacoes: formData.recomendacoes,
        status: formData.status || 'Nova',
        origem: 'Painel',
        foto_principal: formData.fotoPrincipal || PragasDoencasService.getOcorrenciaIcon(formData.tipoOcorrencia),
        anexos: [],
      };

      const { error } = await PragasDoencasService.createOcorrencia(payload, talhaoIds);

      if (error) {
        console.error('Erro ao criar ocorrencia:', error);
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
          <h1 className="text-3xl font-bold text-gray-900">Pragas e Doencas</h1>
        </div>
        <button
          onClick={handleNewOcorrencia}
          className="flex items-center gap-2 px-4 py-2 bg-[#00A651] hover:bg-[#008c44] text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Ocorrencia
        </button>
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
        userId={TEMP_USER_ID}
        initialTalhaoIds={editingOcorrencia?.talhaoIds || []}
      />
    </div>
  );
}
