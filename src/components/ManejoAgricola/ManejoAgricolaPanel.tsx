import { useState, useEffect } from 'react';
import {
  Sprout,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { parseDateWithoutTime, mapAtividadeToDisplay as mapAtividadeUtil } from './manejoUtils';
import { AuthService } from '../../services/authService';
import { ActivityService } from '../../services/activityService';
import { TalhaoService } from '../../services/talhaoService';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import ErrorMessage from '../Dashboard/ErrorMessage';
import ActivityAttachmentModal from './ActivityAttachmentModal';
import type { Talhao } from '../../lib/supabase';
import ActivityEditModal from './ActivityEditModal';
import ActivityHistoricoModal from './ActivityHistoricoModal';
import ActivityCard from './ActivityCard';
import TalhaoFilter from './TalhaoFilter';
import TalhaoInfoCard from './TalhaoInfoCard';
import TalhaoEmptyState from './TalhaoEmptyState';

export default function ManejoAgricolaPanel() {
  const [filtroTalhao, setFiltroTalhao] = useState('todos');
  type AtividadeComDataLocal = {
    id_atividade: string;
    user_id?: string;
    nome_atividade?: string;
    data?: string;
    dataFormatada?: string;
    created_at?: string;
    area?: string;
    // produtos, maquinas e responsaveis agora representam os dados reais
    produtos?: Array<{
      nome_produto?: string;
      quantidade_val?: number | null;
      quantidade_un?: string | null;
      dose_val?: number | null;
      dose_un?: string | null;
    }>;
    maquinas?: Array<{
      nome_maquina?: string | null;
      horas_maquina?: number | null;
    }>;
    responsaveis?: Array<{
      nome?: string | null;
    }>;
    observacao?: string;
    id_talhoes?: string; // CSV of talhao ids
  };

  const [atividades, setAtividades] = useState<AtividadeComDataLocal[]>([]);
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [talhaoDefault, setTalhaoDefault] = useState<string | null>(null);
  const [attachmentModal, setAttachmentModal] = useState<{
    isOpen: boolean;
    activityId: string;
    description: string;
  }>({
    isOpen: false,
    activityId: '',
    description: ''
  });
  const [editingActivity, setEditingActivity] = useState<any | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyActivityId, setHistoryActivityId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const openAttachmentModal = (activityId: string, description: string) => {
    setAttachmentModal({
      isOpen: true,
      activityId,
      description
    });
  };

  const openEditModal = (atividade: any) => {
    // montar payload mínimo esperado pelo ActivityEditModal (usa transaction.id)
    const tx = {
      id: atividade.id_atividade,
      descricao: atividade.nome_atividade || atividade.descricao,
      data_atividade: atividade.data || atividade.data_atividade,
      nome_talhao: atividade.area || atividade.nome_talhao,
      talhao_ids: atividade.id_talhoes ? atividade.id_talhoes.split(',').map((s: string) => s.trim()) : [],
      produtos: atividade.produtos || [],
      maquinas: atividade.maquinas || [],
      responsaveis: atividade.responsaveis || [],
      observacoes: atividade.observacao || atividade.observacoes || '',
    };
    setEditingActivity(tx);
  };

  const closeEditModal = () => setEditingActivity(null);

  const openHistory = (atividadeId: string) => {
    setHistoryActivityId(atividadeId);
    setHistoryOpen(true);
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryActivityId(null);
  };

  const closeAttachmentModal = () => {
    setAttachmentModal({
      isOpen: false,
      activityId: '',
      description: ''
    });
  };

 const loadData = async () => {
  try {
    setLoading(true);
    setError(null);

    const authService = AuthService.getInstance();
    const currentUser = authService.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }

    console.log('Carregando dados para user_id:', currentUser.user_id);

    // Verificar estrutura da tabela (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      await TalhaoService.verificarEstruturaTalhoes();
    }
    
    // Busca lançamentos (novo modelo), talhões e talhão default do usuário em paralelo
    const [lancamentosData, talhoesData, talhaoDefaultId] = await Promise.all([
      ActivityService.getLancamentos(currentUser.user_id, 100, true),
      TalhaoService.getTalhoesPorCriador(currentUser.user_id, { onlyActive: false }),
      TalhaoService.getTalhaoDefaultId(currentUser.user_id)
    ]);

    console.log('Lançamentos carregados:', lancamentosData);
    console.log('Talhões carregados:', talhoesData);
    console.log('Talhão default ID:', talhaoDefaultId);

    // Mapear lançamentos para o formato legado esperado pela UI
    const mapped = (lancamentosData || []).map((l: any) => {
      const produtos = l.lancamento_produtos || l.produtos || [];
      const responsaveis = l.lancamento_responsaveis || l.responsaveis || [];
      const talhoesLanc = l.lancamento_talhoes || l.talhoes || [];

  // produtos, maquinas e responsaveis são tratados como arrays; não geramos campos legados
      const id_talhoes = talhoesLanc.map((t: any) => t.talhao_id).join(',');

      return {
        id_atividade: l.atividade_id,
        user_id: l.user_id,
        nome_atividade: l.nome_atividade || '',
        data: l.data_atividade || l.created_at || '',
        dataFormatada: l.dataFormatada || '',
        created_at: l.created_at || '',
        area: l.area_atividade || '',
        observacao: l.observacao || '',
        id_talhoes,
        produtos: produtos.map((p: any) => ({
          nome_produto: p.nome_produto,
          quantidade_val: p.quantidade_val,
          quantidade_un: p.quantidade_un,
          dose_val: p.dose_val,
          dose_un: p.dose_un
        })),
        maquinas: (l.lancamento_maquinas || l.maquinas || []).map((m: any) => ({
          nome_maquina: m.nome_maquina,
          horas_maquina: m.horas_maquina
        })),
        responsaveis: responsaveis.map((r: any) => ({ nome: r.nome })),
      };
    });

    // Filtrar talhões: apenas completos (is_completed=true) e não-default (talhao_default=false)
    const talhoesFiltrados = (talhoesData || []).filter(t => 
      t.is_completed === true && t.talhao_default !== true
    );

    setAtividades(mapped);
    setTalhoes(talhoesFiltrados);
    setTalhaoDefault(talhaoDefaultId); // This should be the returned value from getTalhaoDefaultId

    console.log('Estado final - Atividades:', mapped.length);
    console.log('Estado final - Talhões (filtrados):', talhoesFiltrados.length, 'de', talhoesData.length, 'total');
    console.log('talhao defaultId final:', talhaoDefaultId);
    
  } catch (err) {
    console.error('Erro ao carregar dados:', err);
    setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  // Encontra o talhão selecionado pelos dados reais
  const talhaoSelecionado = talhoes.find(t => t.id_talhao === filtroTalhao);
  
  // Lista de opções para o filtro (todos + IDs dos talhões reais)
  const opcoesFiltraTalhao = ['todos', ...talhoes.map(t => t.id_talhao)];

  // Função para filtrar atividades por talhão
  const filtrarAtividadesPorTalhao = (atividades: AtividadeComDataLocal[]) => {
    if (filtroTalhao === 'todos') {
      return atividades;
    }
    
    return atividades.filter(atividade => {
      if (!atividade.id_talhoes) return false;
      
      // A coluna id_talhoes pode conter múltiplos IDs separados por vírgula
      const talhoesIds = atividade.id_talhoes.split(',').map(id => id.trim());
      return talhoesIds.includes(filtroTalhao);
    });
  };

  // Função para obter o nome do talhão pelo ID
  const getNomeTalhaoPorId = (talhaoId: string): string => {
  const talhao = talhoes.find(t => t.id_talhao === talhaoId);
  if (!talhao) return 'Talhão não encontrado';
  

  return talhaoId === talhaoDefault ? 'Sem talhão vinculado' : talhao.nome;
};

  // Função para obter nomes dos talhões de uma atividade
  const getNomesTalhoesAtividade = (atividade: AtividadeComDataLocal): string => {
    if (!atividade.id_talhoes) return 'Área não informada';
    
    const talhoesIds = atividade.id_talhoes.split(',').map(id => id.trim());
    const nomes = talhoesIds.map(id => getNomeTalhaoPorId(id)).filter(nome => nome !== 'Talhão não encontrado');
    
    return nomes.length > 0 ? nomes.join(', ') : 'Área não informada';
  };

  // Separa atividades por data (passadas e futuras)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // parseDateWithoutTime moved to manejoUtils

  // Todas as atividades do banco de dados (filtradas por talhão se selecionado)
  const todasAtividades = filtrarAtividadesPorTalhao(atividades);

  // Atividades passadas (do dia atual para trás) ou sem data válida
  const atividadesPassadas = todasAtividades.filter(atividade => {
    if (!atividade.data) return true; // Considera atividades sem data como passadas

    const dataAtividade = parseDateWithoutTime(atividade.data);
    if (!dataAtividade) return true; // Considera atividades com data inválida como passadas

    return dataAtividade <= hoje;
  });

  // Atividades recentes - últimas 10 atividades passadas
  const atividadesRecentes = atividadesPassadas;

  // Atividades futuras (apenas após hoje) com datas válidas
  const atividadesFuturas = todasAtividades.filter(atividade => {
    if (!atividade.data) return false;

    const dataAtividade = parseDateWithoutTime(atividade.data);
    if (!dataAtividade) return false;

    return dataAtividade > hoje;
  });



  // getIconByType moved to manejoUtils

  // Função para mapear campos da atividade real para o formato esperado
  const mapAtividadeToDisplay = (atividade: AtividadeComDataLocal) => mapAtividadeUtil(atividade, getNomesTalhoesAtividade);

  // helpers legados removidos — usamos getIconByType / getStatusColorByType atuais

  return (
    <div className="space-y-6">
      {/* Header reduzido: título compacto (resumo removido conforme solicitado) */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#004417] mb-4">Manejo Agrícola</h2>
      </div>

      {/* Filtro de Talhões */}
      {talhoes.length > 0 && (
        <TalhaoFilter talhoes={talhoes} value={filtroTalhao} onChange={setFiltroTalhao} talhaoDefault={talhaoDefault} />
      )}

      {/* Mensagem quando não há talhões */}
      {talhoes.length === 0 && <TalhaoEmptyState />}
      {/* Painel de Informações do Talhão */}
      {filtroTalhao !== 'todos' && talhaoSelecionado && (
        <TalhaoInfoCard talhao={talhaoSelecionado} atividadesCount={todasAtividades.length} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividades Recentes */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h3 className="text-lg font-bold text-[#004417]">Atividades Recentes</h3>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-[#00A651]" />
              <span className="text-sm font-semibold text-[#00A651]">
                {filtroTalhao === 'todos' ? 'Sem Filtro' : getNomeTalhaoPorId(filtroTalhao)} ({atividadesRecentes.length})
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
              {atividadesRecentes.length === 0 ? (
              <div className="text-center py-8 text-[rgba(0,68,23,0.75)]">
                <Sprout className="w-12 h-12 text-[#00A651] mx-auto mb-3" />
                <p className="font-medium">Nenhuma atividade encontrada</p>
                <p className="text-sm">Registre atividades via WhatsApp do ZÉ</p>
              </div>
            ) : (
              atividadesRecentes.map((atividade) => {
                const atividadeDisplay = mapAtividadeToDisplay(atividade);
                return (
                  <ActivityCard
                    key={atividade.id_atividade}
                    atividade={atividade}
                    atividadeDisplay={atividadeDisplay}
                    talhaoDefault={talhaoDefault}
                    onEdit={openEditModal}
                    onHistory={openHistory}
                    onAttachment={openAttachmentModal}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Atividades Futuras */}
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-[#004417]">Atividades Futuras</h3>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-[#00A651]" />
              <span className="text-sm font-semibold text-[#00A651]">
                {filtroTalhao === 'todos' ? 'Sem Filtro' : getNomeTalhaoPorId(filtroTalhao)} ({atividadesFuturas.length})
              </span>
            </div>
          </div>

          <div className="text-center py-8 rounded-xl p-6">
            <Clock className="w-12 h-12 text-[#00A651] mx-auto mb-3" />
            <p className="text-[#004417] font-medium">Em breve</p>
          </div>
        </div>
      </div>

      <ActivityEditModal
        isOpen={!!editingActivity}
        transaction={editingActivity}
        onClose={closeEditModal}
        onSave={async (id: string, payload: any) => {
          try {
            await ActivityService.updateLancamento(id, payload);
            closeEditModal();
            await loadData();
          } catch (err) {
            console.error('Erro ao salvar edição da atividade:', err);
          }
        }}
      />

      <ActivityHistoricoModal
        isOpen={historyOpen}
        onClose={closeHistory}
        atividadeId={historyActivityId || ''}
      />

      <ActivityAttachmentModal
        isOpen={attachmentModal.isOpen}
        onClose={closeAttachmentModal}
        activityId={attachmentModal.activityId}
        activityDescription={attachmentModal.description}
      />
    </div>
  );
}