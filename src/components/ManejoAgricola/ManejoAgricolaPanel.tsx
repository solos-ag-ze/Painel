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
import { ActivityService, AtividadeComData } from '../../services/activityService';
import { TalhaoService } from '../../services/talhaoService';
import LoadingSpinner from '../Dashboard/LoadingSpinner';
import ErrorMessage from '../Dashboard/ErrorMessage';
import ActivityAttachmentModal from './ActivityAttachmentModal';
import type { Talhao } from '../../lib/supabase';

export default function ManejoAgricolaPanel() {
  const [filtroTalhao, setFiltroTalhao] = useState('todos');
  const [atividades, setAtividades] = useState<AtividadeComData[]>([]);
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
    
    // Busca atividades, talhões e talhão default do usuário em paralelo
    const [atividadesData, talhoesData, talhaoDefaultId] = await Promise.all([
      ActivityService.getAtividades(currentUser.user_id, 100),
      TalhaoService.getTalhoesPorCriador(currentUser.user_id, { onlyActive: false }),
      TalhaoService.getTalhaoDefaultId(currentUser.user_id)
    ]);
    
    console.log('Atividades carregadas:', atividadesData);
    console.log('Talhões carregados:', talhoesData);
    console.log('Talhão default ID:', talhaoDefaultId);
    
    setAtividades(atividadesData);
    setTalhoes(talhoesData);
    setTalhaoDefault(talhaoDefaultId); // This should be the returned value from getTalhaoDefaultId
    
    console.log('Estado final - Atividades:', atividadesData.length);
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
  const filtrarAtividadesPorTalhao = (atividades: AtividadeComData[]) => {
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
  const getNomesTalhoesAtividade = (atividade: AtividadeComData): string => {
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
      return <Droplets className="w-5 h-5 text-[#397738]" />;
    }
    if (tipo.includes('adubação') || tipo.includes('adubar')) {
      return <Package className="w-5 h-5 text-[#86b646]" />;
    }
    if (tipo.includes('capina') || tipo.includes('roçada')) {
      return <Leaf className="w-5 h-5 text-[#397738]" />;
    }
    if (tipo.includes('poda')) {
      return <Scissors className="w-5 h-5 text-[#8fa49d]" />;
    }
    if (tipo.includes('irrigação') || tipo.includes('irrigar')) {
      return <Droplets className="w-5 h-5 text-[#86b646]" />;
    }
    if (tipo.includes('análise') || tipo.includes('coleta')) {
      return <Bug className="w-5 h-5 text-[#8fa49d]" />;
    }
    return <Sprout className="w-5 h-5 text-[#397738]" />;
  };

  const getStatusColorByType = (nomeAtividade: string) => {
    const tipo = nomeAtividade.toLowerCase();
    if (tipo.includes('pulverização') || tipo.includes('pulverizar')) {
      return 'bg-[#397738]/10 border-[#397738]/30';
    }
    if (tipo.includes('adubação') || tipo.includes('adubar')) {
      return 'bg-[#86b646]/10 border-[#86b646]/30';
    }
    if (tipo.includes('capina') || tipo.includes('roçada')) {
      return 'bg-[#397738]/10 border-[#397738]/30';
    }
    if (tipo.includes('poda')) {
      return 'bg-[#8fa49d]/10 border-[#8fa49d]/30';
    }
    if (tipo.includes('irrigação') || tipo.includes('irrigar')) {
      return 'bg-[#86b646]/10 border-[#86b646]/30';
    }
    if (tipo.includes('análise') || tipo.includes('coleta')) {
      return 'bg-[#8fa49d]/10 border-[#8fa49d]/30';
    }
    return 'bg-[#397738]/10 border-[#397738]/30';
  };

  // Função para mapear campos da atividade real para o formato esperado
  const mapAtividadeToDisplay = (atividade: AtividadeComData) => {
    return {
      ...atividade,
      tipo: atividade.nome_atividade,
      descricao: atividade.nome_atividade,
      talhao: getNomesTalhoesAtividade(atividade),
      produto: atividade.produto_usado || 'Não informado',
      dose: atividade.dose_usada || 'Não informado',
      quantidade: atividade.quantidade || 'Não informado',
      responsavel: atividade.responsavel || 'Não informado',
      observacoes: atividade.observacao || ''
    };
  };

  // Função legada para compatibilidade
  const getIconByTypeLegacy = (tipo: string) => {
    switch (tipo) {
      case 'Pulverização': return <Droplets className="w-5 h-5 text-[#397738]" />;
      case 'Adubação': return <Package className="w-5 h-5 text-[#86b646]" />;
      case 'Capina': return <Leaf className="w-5 h-5 text-[#397738]" />;
      case 'Poda': return <Scissors className="w-5 h-5 text-[#8fa49d]" />;
      case 'Irrigação': return <Droplets className="w-5 h-5 text-[#86b646]" />;
      case 'Análise': return <Bug className="w-5 h-5 text-[#8fa49d]" />;
      default: return <Sprout className="w-5 h-5 text-[#397738]" />;
    }
  };

  const getStatusColorLegacy = (tipo: string) => {
    switch (tipo) {
      case 'Pulverização': return 'bg-[#397738]/10 border-[#397738]/30';
      case 'Adubação': return 'bg-[#86b646]/10 border-[#86b646]/30';
      case 'Capina': return 'bg-[#397738]/10 border-[#397738]/30';
      case 'Poda': return 'bg-[#8fa49d]/10 border-[#8fa49d]/30';
      case 'Irrigação': return 'bg-[#86b646]/10 border-[#86b646]/30';
      case 'Análise': return 'bg-[#8fa49d]/10 border-[#8fa49d]/30';
      default: return 'bg-[#397738]/10 border-[#397738]/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#092f20]">Manejo Agrícola</h2>
              <p className="text-sm text-gray-600">Controle de atividades técnicas da propriedade</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-[#397738]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-[#397738]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Concluídas</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">{atividadesPassadas.length}</p>
          </div>
          <div className="bg-[#86b646]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#86b646]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Programadas</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">{atividadesFuturas.length}</p>
          </div>
          <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-[#8fa49d]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Talhões</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">{talhoes.length}</p>
          </div>
          <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-[#8fa49d]" />
              <span className="text-xs md:text-sm font-medium text-[#092f20]">Total</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-[#092f20] mt-2">{todasAtividades.length}</p>
          </div>
        </div>
      </div>

      {/* Filtro de Talhões */}
      {talhoes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#092f20]">Filtrar por Talhão</h3>
            <div className="text-sm text-gray-600">
              {talhoes.length} {talhoes.length === 1 ? 'talhão encontrado' : 'talhões encontrados'}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {opcoesFiltraTalhao.map((opcao) => (
              <button
                key={opcao}
                onClick={() => setFiltroTalhao(opcao)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filtroTalhao === opcao
                    ? 'bg-[#397738] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#092f20] mb-2">Nenhum talhão encontrado</h3>
            <p className="text-gray-600 mb-4">
              Você ainda não possui talhões cadastrados. Os talhões são criados automaticamente 
              quando você registra atividades agrícolas via WhatsApp do ZÉ DA SAFRA.
            </p>
            <div className="bg-[#86b646]/10 p-4 rounded-lg">
              <p className="text-sm text-[#397738]">
                <strong>Como criar talhões:</strong> Envie informações sobre suas atividades 
                agrícolas no WhatsApp do ZÉ, mencionando a área ou talhão onde foram realizadas.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Painel de Informações do Talhão */}
      {filtroTalhao !== 'todos' && talhaoSelecionado && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#092f20]">Informações Técnicas</h3>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-[#397738]">
                {todasAtividades.length} {todasAtividades.length === 1 ? 'atividade' : 'atividades'} neste talhão
              </p>
            </div>
          </div>
          
        <div className="bg-[#8fa49d]/10 p-4 rounded-lg mb-4">
  <div className="flex flex-wrap items-center gap-4 text-sm md:text-base">
    <div className="flex items-center space-x-2">
      <div className="w-3 h-3 bg-[#092f20] rounded-full"></div>
      <span className="font-bold text-[#092f20] text-lg">{talhaoSelecionado.nome}</span>
    </div>
    <div className="text-gray-400">|</div>
    <div className="flex items-center space-x-1">
      <span className="font-semibold text-[#397738]">{talhaoSelecionado.area.toFixed(1)} ha</span>
    </div>
    <div className="text-gray-400">|</div>
    <div className="flex items-center space-x-1">
      <Coffee className="w-4 h-4 text-[#86b646]" />
      <span className="text-[#092f20]">{talhaoSelecionado.cultura}</span>
    </div>
    <div className="text-gray-400">|</div>
    <div className="flex items-center space-x-1">
      <Calendar className="w-4 h-4 text-[#8fa49d]" />
      <span className="text-[#092f20]">
        Criado: {talhaoSelecionado.data_criacao ? new Date(talhaoSelecionado.data_criacao).toLocaleDateString('pt-BR') : 'N/A'}
      </span>
    </div>
    
    {/* Variedade */}
    <div className="text-gray-400">|</div>
    <div className="flex items-center space-x-1">
      <span className="text-[#092f20]">
        Variedade: {talhaoSelecionado.variedade_plantada || '-'}
      </span>
    </div>
    
    {/* Quantidade de Pés */}
    <div className="text-gray-400">|</div>
    <div className="flex items-center space-x-1">
      <span className="text-[#092f20]">
        Quantidade de Pés: {talhaoSelecionado.quantidade_de_pes || '-'}
      </span>
    </div>
    
    {/* Ano de Plantio */}
      <div className="text-gray-400">|</div>
    <div className="flex items-center space-x-1">
      <span className="text-[#092f20]">
        Ano de Plantio: {talhaoSelecionado.ano_de_plantio ? new Date(talhaoSelecionado.ano_de_plantio).getFullYear() : '-'}
      </span>
    </div>
    
    {talhaoSelecionado.produtividade_saca && (
      <>
        <div className="text-gray-400">|</div>
        <div className="flex items-center space-x-1">
          <Sprout className="w-4 h-4 text-[#397738]" />
          <span className="text-[#092f20]">{talhaoSelecionado.produtividade_saca} sc/ha</span>
        </div>
      </>
    )}
  </div>
</div>
          
         
          </div>
        
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Atividades Recentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#092f20]">Atividades Recentes</h3>
            <div className="flex items-center space-x-2 text-[#397738]">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                {filtroTalhao === 'todos' ? 'Sem Filtro' : getNomeTalhaoPorId(filtroTalhao)} ({atividadesRecentes.length})
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {atividadesRecentes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Sprout className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma atividade encontrada</p>
                <p className="text-sm">Registre atividades via WhatsApp do ZÉ</p>
              </div>
            ) : (
              atividadesRecentes.map((atividade) => {
                const atividadeDisplay = mapAtividadeToDisplay(atividade);
                return (
                  <div key={atividade.id_atividade} className={`p-4 rounded-lg border-2 ${getStatusColorByType(atividade.nome_atividade)} hover:shadow-sm transition-shadow`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                        {getIconByType(atividade.nome_atividade)}
                    <div>
                          <h4 className="font-medium text-[#092f20]">{atividadeDisplay.descricao}</h4>
                          <p className="text-sm text-gray-600">{atividade.dataFormatada}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-[#397738]/10 text-[#397738] px-2 py-1 rounded-full">
                        {atividadeDisplay.talhao}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Produto:</span>
                        <p className="font-medium text-[#092f20]">{atividadeDisplay.produto}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Dose:</span>
                        <p className="font-medium text-[#092f20]">{atividadeDisplay.dose}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantidade:</span>
                        <p className="font-medium text-[#092f20]">{atividadeDisplay.quantidade}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Responsável:</span>
                        <p className="font-medium text-[#092f20]">{atividadeDisplay.responsavel}</p>
                  </div>
                </div>

                    {atividadeDisplay.observacoes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="text-gray-600 text-sm">Observações:</span>
                        <p className="text-sm text-[#397738] mt-1">{atividadeDisplay.observacoes}</p>
                      </div>
                      <button
                        onClick={() => openAttachmentModal(
                          atividade.id_atividade || '',
                          atividade.nome_atividade || 'Atividade'
                        )}
                        className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200 flex-shrink-0 ml-2"
                        title="Gerenciar anexo"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                    )}
                    {!atividadeDisplay.observacoes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => openAttachmentModal(
                          atividade.id_atividade || '',
                          atividade.nome_atividade || 'Atividade'
                        )}
                        className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200"
                        title="Gerenciar anexo"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#092f20]">Atividades Futuras</h3>
            <div className="flex items-center space-x-2 text-[#86b646]">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {filtroTalhao === 'todos' ? 'Sem Filtro' : getNomeTalhaoPorId(filtroTalhao)} ({atividadesFuturas.length})
              </span>
            </div>
          </div>
          
          <div className="space-y-4">
            {atividadesFuturas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma atividade futura programada</p>
                <p className="text-sm">Programe atividades via WhatsApp do ZÉ</p>
              </div>
            ) : (
              atividadesFuturas.map((atividade) => {
                const atividadeDisplay = mapAtividadeToDisplay(atividade);
                return (
                  <div key={atividade.id_atividade} className={`p-4 rounded-lg border-2 ${getStatusColorByType(atividade.nome_atividade)} hover:shadow-sm transition-shadow`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                        {getIconByType(atividade.nome_atividade)}
                    <div>
                          <h4 className="font-medium text-[#092f20]">{atividadeDisplay.descricao}</h4>
                          <p className="text-sm text-gray-600">{atividade.dataFormatada}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-[#86b646]/10 text-[#86b646] px-2 py-1 rounded-full">
                        {atividadeDisplay.talhao}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Produto:</span>
                        <p className="font-medium text-[#092f20]">{atividadeDisplay.produto}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Dose:</span>
                        <p className="font-medium text-[#092f20]">{atividadeDisplay.dose}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantidade:</span>
                        <p className="font-medium text-[#092f20]">{atividadeDisplay.quantidade}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Responsável:</span>
                        <p className="font-medium text-[#092f20]">{atividadeDisplay.responsavel}</p>
                  </div>
                </div>

                    {atividadeDisplay.observacoes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="text-gray-600 text-sm">Observações:</span>
                        <p className="text-sm text-[#397738] mt-1">{atividadeDisplay.observacoes}</p>
                      </div>
                      <button
                        onClick={() => openAttachmentModal(
                          atividade.id_atividade || '',
                          atividade.nome_atividade || 'Atividade'
                        )}
                        className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200 flex-shrink-0 ml-2"
                        title="Gerenciar anexo"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                    )}
                    {!atividadeDisplay.observacoes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => openAttachmentModal(
                          atividade.id_atividade || '',
                          atividade.nome_atividade || 'Atividade'
                        )}
                        className="p-2 text-gray-500 hover:text-[#397738] hover:bg-white rounded-lg transition-colors shadow-sm border border-gray-200"
                        title="Gerenciar anexo"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                    )}
              </div>
                );
              })
            )}
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