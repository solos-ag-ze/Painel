import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Calendar,
  Filter,
  Download,
  MapPin,
  Package,
  Droplets,
  Bug,
  Scissors,
  Leaf,
  Shield,
  Plus,
  Clock,
  CheckCircle,
  Coffee,
  Paperclip
} from 'lucide-react';
import { AuthService } from '../../services/authService';
import { ActivityService } from '../../services/activityService';
import { TalhaoService } from '../../services/talhaoService';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import ErrorMessage from '../Dashboard/ErrorMessage';
import ActivityAttachmentModal from './ActivityAttachmentModal';
import type { Talhao } from '../../lib/supabase';

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
      ActivityService.getLancamentos(currentUser.user_id, 100),
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

    setAtividades(mapped);
    setTalhoes(talhoesData);
    setTalhaoDefault(talhaoDefaultId); // This should be the returned value from getTalhaoDefaultId

    console.log('Estado final - Atividades:', mapped.length);
    console.log('Estado final - Talhões:', talhoesData.length);
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

  // Função para converter uma string de data para Date sem horário
  const parseDateWithoutTime = (dateString: string) => {
    if (!dateString) return null;
    try {
      // Tenta diferentes formatos de data
      let date: Date;
      
      if (dateString.includes('T')) {
        // ISO format
        date = new Date(dateString);
      } else if (dateString.includes('/')) {
        // Verifica se está no formato DD/MM/YYYY ou MM/DD/YYYY
        const partes = dateString.split('/');
        if (partes.length === 3) {
          const [primeira, segunda, terceira] = partes;
          // Se a terceira parte tem 4 dígitos, é o ano
          if (terceira.length === 4) {
            // DD/MM/YYYY format (formato brasileiro)
            date = new Date(parseInt(terceira), parseInt(segunda) - 1, parseInt(primeira));
          } else {
            // MM/DD/YY format
            date = new Date(parseInt(terceira) + 2000, parseInt(primeira) - 1, parseInt(segunda));
          }
        } else {
          return null;
        }
      } else if (dateString.includes('-')) {
        // YYYY-MM-DD format
        if (dateString.length === 10) {
          date = new Date(dateString);
        } else {
          return null;
        }
      } else {
        return null;
      }
      
      if (isNaN(date.getTime())) {
        return null;
      }
      
      date.setHours(0, 0, 0, 0);
      return date;
    } catch (error) {
      console.error('Erro ao processar data:', error, dateString);
      return null;
    }
  };

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



  const getIconByType = (nomeAtividade: string) => {
    const tipo = nomeAtividade.toLowerCase();
    if (tipo.includes('pulverização') || tipo.includes('pulverizar')) {
      return <Droplets className="w-5 h-5 text-[#00A651]" />;
    }
    if (tipo.includes('adubação') || tipo.includes('adubar')) {
      return <Package className="w-5 h-5 text-[#00A651]" />;
    }
    if (tipo.includes('capina') || tipo.includes('roçada')) {
      return <Leaf className="w-5 h-5 text-[#00A651]" />;
    }
    if (tipo.includes('poda')) {
      return <Scissors className="w-5 h-5 text-[#00A651]" />;
    }
    if (tipo.includes('irrigação') || tipo.includes('irrigar')) {
      return <Droplets className="w-5 h-5 text-[#00A651]" />;
    }
    if (tipo.includes('análise') || tipo.includes('coleta')) {
      return <Bug className="w-5 h-5 text-[#00A651]" />;
    }
    return <Sprout className="w-5 h-5 text-[#00A651]" />;
  };

  const getStatusColorByType = (nomeAtividade: string) => {
    const tipo = nomeAtividade.toLowerCase();
    if (tipo.includes('pulverização') || tipo.includes('pulverizar')) {
      return 'bg-[#00A651]/5 border-[#00A651]/20';
    }
    if (tipo.includes('adubação') || tipo.includes('adubar')) {
      return 'bg-[#00A651]/5 border-[#00A651]/20';
    }
    if (tipo.includes('capina') || tipo.includes('roçada')) {
      return 'bg-[#00A651]/5 border-[#00A651]/20';
    }
    if (tipo.includes('poda')) {
      return 'bg-[#00A651]/5 border-[#00A651]/20';
    }
    if (tipo.includes('irrigação') || tipo.includes('irrigar')) {
      return 'bg-[#00A651]/5 border-[#00A651]/20';
    }
    if (tipo.includes('análise') || tipo.includes('coleta')) {
      return 'bg-[#00A651]/5 border-[#00A651]/20';
    }
    return 'bg-[#00A651]/5 border-[#00A651]/20';
  };

  // Função para mapear campos da atividade real para o formato esperado
  const mapAtividadeToDisplay = (atividade: AtividadeComDataLocal) => {
    return {
      ...atividade,
      tipo: atividade.nome_atividade,
      descricao: atividade.nome_atividade,
      talhao: getNomesTalhoesAtividade(atividade),
      observacoes: atividade.observacao || ''
    };
  };

  // helpers legados removidos — usamos getIconByType / getStatusColorByType atuais

  return (
    <div className="space-y-6">
      {/* Header reduzido: título compacto (resumo removido conforme solicitado) */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#004417]">Manejo Agrícola</h2>
        <p className="text-sm text-[#004417]/75">Controle de atividades técnicas da propriedade</p>
      </div>

      {/* Filtro de Talhões */}
      {talhoes.length > 0 && (
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#004417]">Filtrar por Talhão</h3>
            <div className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium">
              {talhoes.length} {talhoes.length === 1 ? 'talhão encontrado' : 'talhões encontrados'}
            </div>
          </div>
          
            <div className="flex items-center flex-row flex-nowrap gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
            {opcoesFiltraTalhao.map((opcao) => (
              <button
                key={opcao}
                onClick={() => setFiltroTalhao(opcao)}
                className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all duration-200 whitespace-nowrap snap-start flex-shrink-0 ${
                  filtroTalhao === opcao
                    ? 'bg-[rgba(0,166,81,0.10)] border border-[#00A651] text-[#004417] font-semibold'
                    : 'bg-white border border-[rgba(0,68,23,0.10)] text-[#004417] hover:bg-[rgba(0,68,23,0.03)] hover:border-[rgba(0,68,23,0.12)]'
                }`}
              >
                {opcao === 'todos' ? 'Sem Filtro' : getNomeTalhaoPorId(opcao)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando não há talhões */}
      {talhoes.length === 0 && (
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-6">
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-[#00A651] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[#004417] mb-2">Nenhum talhão encontrado</h3>
            <p className="text-[rgba(0,68,23,0.75)] font-medium mb-4">
              Você ainda não possui talhões cadastrados. Os talhões são criados automaticamente 
              quando você registra atividades agrícolas via WhatsApp do Zé.
            </p>
            <div className="bg-[#00A651]/10 p-4 rounded-xl border border-[#00A651]/20">
              <p className="text-sm text-[#004417] font-medium">
                <strong className="text-[#00A651]">Como criar talhões:</strong> Envie informações sobre suas atividades 
                agrícolas no WhatsApp do ZÉ, mencionando a área ou talhão onde foram realizadas.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Painel de Informações do Talhão */}
      {filtroTalhao !== 'todos' && talhaoSelecionado && (
        <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,68,23,0.06)] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#00A651]/20 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#00A651]" />
              </div>
              <h3 className="text-lg font-bold text-[#004417]">Informações Técnicas</h3>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#00A651]">
                {todasAtividades.length} {todasAtividades.length === 1 ? 'atividade' : 'atividades'} neste talhão
              </p>
            </div>
          </div>
          
        <div className="bg-[#00A651]/8 p-4 rounded-xl mb-4">
  <div className="flex flex-wrap items-center gap-4 text-sm md:text-base">
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-[#00A651] rounded-full"></div>
      <span className="font-bold text-[#004417] text-lg">{talhaoSelecionado.nome}</span>
    </div>
    <div className="text-[rgba(0,68,23,0.15)]">|</div>
    <div className="flex items-center space-x-1">
      <span className="font-semibold text-[#004417]">{talhaoSelecionado.area.toFixed(1)} ha</span>
    </div>
    <div className="text-[rgba(0,68,23,0.15)]">|</div>
    <div className="flex items-center space-x-1">
      <Coffee className="w-4 h-4 text-[#00A651]" />
      <span className="text-[#004417] font-medium">{talhaoSelecionado.cultura}</span>
    </div>
    <div className="text-[rgba(0,68,23,0.15)]">|</div>
    <div className="flex items-center space-x-1">
      <Calendar className="w-4 h-4 text-[#00A651]" />
      <span className="text-[#004417] font-medium">
        Criado: {talhaoSelecionado.data_criacao ? new Date(talhaoSelecionado.data_criacao).toLocaleDateString('pt-BR') : 'N/A'}
      </span>
    </div>
    
    {/* Variedade */}
    <div className="text-[rgba(0,68,23,0.15)]">|</div>
    <div className="flex items-center space-x-1">
      <span className="text-[#004417] font-medium">
        Variedade: {talhaoSelecionado.variedade_plantada || '-'}
      </span>
    </div>
    
    {/* Quantidade de Pés */}
    <div className="text-[rgba(0,68,23,0.15)]">|</div>
    <div className="flex items-center space-x-1">
      <span className="text-[#004417] font-medium">
        Quantidade de Pés: {talhaoSelecionado.quantidade_de_pes || '-'}
      </span>
    </div>
    
    {/* Ano de Plantio */}
      <div className="text-[rgba(0,68,23,0.15)]">|</div>
    <div className="flex items-center space-x-1">
      <span className="text-[#004417] font-medium">
        Ano de Plantio: {talhaoSelecionado.ano_de_plantio ? new Date(talhaoSelecionado.ano_de_plantio).getFullYear() : '-'}
      </span>
    </div>
    
    {talhaoSelecionado.produtividade_saca && (
      <>
        <div className="text-[rgba(0,68,23,0.15)]">|</div>
        <div className="flex items-center space-x-1">
          <Sprout className="w-4 h-4 text-[#00A651]" />
          <span className="text-[#004417] font-medium">{talhaoSelecionado.produtividade_saca} sc/ha</span>
        </div>
      </>
    )}
  </div>
</div>

        </div>
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
                  <div key={atividade.id_atividade} className="p-5 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,68,23,0.06)] transition-all duration-200">
        <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
        {getIconByType(atividade.nome_atividade || '')}
                    <div>
                          <h4 className="font-semibold text-[#004417]">{atividadeDisplay.descricao}</h4>
                          <p className="text-[13px] text-[rgba(0,68,23,0.75)] font-medium">{atividade.dataFormatada}</p>
                    </div>
                  </div>
      <span className="text-xs bg-[#00A651]/20 text-[#00A651] font-semibold px-2 py-1 rounded-full">
        {atividadeDisplay.talhao}
      </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[rgba(0,68,23,0.75)] font-medium">Produtos:</span>
                    <ul className="mt-1 space-y-1">
                      {atividade.produtos && atividade.produtos.length > 0 ? (
                        atividade.produtos.map((p, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span className="font-semibold text-[#004417]">{p.nome_produto}</span>
                            <span className="text-[rgba(0,68,23,0.75)] font-medium text-right">
                              {p.quantidade_val ?? '-'} {p.quantidade_un ?? ''}
                              {p.dose_val ? ` · ${p.dose_val} ${p.dose_un ?? ''}` : ''}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[rgba(0,68,23,0.75)] font-medium">Não informado</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[rgba(0,68,23,0.75)] font-medium">Máquinas:</span>
                    <ul className="mt-1 space-y-1">
                      {atividade.maquinas && atividade.maquinas.length > 0 ? (
                        atividade.maquinas.map((m, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span className="font-semibold text-[#004417]">{m.nome_maquina}</span>
                            <span className="text-[rgba(0,68,23,0.75)] font-medium">{m.horas_maquina ?? '-'} h</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[rgba(0,68,23,0.75)] font-medium">Não informado</li>
                      )}
                    </ul>

                    <div className="mt-2">
                      <span className="text-[rgba(0,68,23,0.75)] font-medium">Responsável:</span>
                      <p className="mt-1 text-sm text-[rgba(0,68,23,0.75)]">{atividade.responsaveis && atividade.responsaveis.length > 0 ? atividade.responsaveis.map(r => r.nome).join(', ') : 'Não informado'}</p>
                    </div>
                  </div>
                </div>

                    {atividadeDisplay.observacoes && (
                  <div className="mt-3 pt-3 border-t border-[rgba(0,68,23,0.08)]">
                    <div className="flex items-start justify-between">
                      <div className="flex-shrink-0 text-xs text-[#004417]/65 mr-3">
                        {atividade.created_at && (
                          <>Lançado em {new Date(atividade.created_at).toLocaleString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-[rgba(0,68,23,0.75)] font-medium text-sm">Observações:</span>
                        <p className="text-sm text-[#00A651] mt-1">{atividadeDisplay.observacoes}</p>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        <button
                          onClick={() => openAttachmentModal(
                            atividade.id_atividade || '',
                            atividade.nome_atividade || 'Atividade'
                          )}
                          className="p-2 text-[#00A651] hover:opacity-90 bg-transparent border-0 shadow-none flex-shrink-0"
                          title="Gerenciar anexo"
                        >
                          <Paperclip className="w-4 h-4 text-[#00A651]" />
                        </button>
                      </div>
                    </div>
                  </div>
                    )}
                    {!atividadeDisplay.observacoes && (
                  <div className="mt-3 pt-3 border-t border-[rgba(0,68,23,0.08)]">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#004417]/65">
                        {atividade.created_at && (
                          <>Lançado em {new Date(atividade.created_at).toLocaleString('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</>
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() => openAttachmentModal(
                            atividade.id_atividade || '',
                            atividade.nome_atividade || 'Atividade'
                          )}
                          className="p-2 text-[#00A651] hover:opacity-90 bg-transparent border-0 shadow-none"
                          title="Gerenciar anexo"
                        >
                          <Paperclip className="w-4 h-4 text-[#00A651]" />
                        </button>
                      </div>
                    </div>
                  </div>
                    )}
              </div>
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

      <ActivityAttachmentModal
        isOpen={attachmentModal.isOpen}
        onClose={closeAttachmentModal}
        activityId={attachmentModal.activityId}
        activityDescription={attachmentModal.description}
      />
    </div>
  );
}