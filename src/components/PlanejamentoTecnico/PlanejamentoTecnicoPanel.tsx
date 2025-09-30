import React from 'react';
import { 
  Calendar, 
  Coffee, 
  Droplets,
  Bug,
  Scissors,
  Thermometer,
  Leaf,
  Package,
  TrendingUp,
  AlertTriangle,
  Sprout,
  Shield
} from 'lucide-react';

export default function PlanejamentoTecnicoPanel() {
  const meses = [
    {
      nome: 'Janeiro',
      icon: Droplets,
      color: 'bg-[#397738]/10 border-[#397738]/30',
      iconColor: 'text-[#397738]',
      atividades: [
        'Limpeza da lavoura e desbrota de ramos ladrões',
        'Monitoramento de pragas: bicho-mineiro e ferrugem',
        'Adubação de manutenção com nitrogênio e potássio',
        'Irrigação em áreas com déficit hídrico',
        'Coleta de folhas para análise foliar, se necessário'
      ]
    },
    {
      nome: 'Fevereiro',
      icon: Bug,
      color: 'bg-[#86b646]/10 border-[#86b646]/30',
      iconColor: 'text-[#86b646]',
      atividades: [
        'Roçada ou capina nas entrelinhas',
        'Aplicação preventiva de fungicidas para cercospora e ferrugem',
        'Monitoramento da broca-do-café',
        'Continuação da adubação de manutenção',
        'Revisão do planejamento de colheita'
      ]
    },
    {
      nome: 'Março',
      icon: Package,
      color: 'bg-[#86b646]/10 border-[#86b646]/30',
      iconColor: 'text-[#86b646]',
      atividades: [
        'Análise de solo para ajustes de adubação pós-colheita',
        'Monitoramento de pragas e doenças com foco na broca',
        'Revisão e manutenção de equipamentos de colheita e secagem',
        'Limpeza de terreiros e armazéns',
        'Avaliação de maturação dos frutos por talhão'
      ]
    },
    {
      nome: 'Abril',
      icon: Coffee,
      color: 'bg-[#397738]/10 border-[#397738]/30',
      iconColor: 'text-[#397738]',
      atividades: [
        'Início da colheita nas áreas precoces',
        'Controle de fungos como phoma durante colheita',
        'Organização da logística de transporte e armazenamento',
        'Aplicação de cobre em caso de alta umidade',
        'Registro técnico de produtividade'
      ]
    },
    {
      nome: 'Maio',
      icon: TrendingUp,
      color: 'bg-[#092f20]/10 border-[#092f20]/30',
      iconColor: 'text-[#092f20]',
      atividades: [
        'Pico da colheita nas principais áreas',
        'Gestão de secagem: controle de temperatura e umidade',
        'Monitoramento de broca residual',
        'Classificação do café colhido (peneira e bebida)',
        'Consolidação dos custos operacionais da colheita'
      ]
    },
    {
      nome: 'Junho',
      icon: Scissors,
      color: 'bg-[#8fa49d]/10 border-[#8fa49d]/30',
      iconColor: 'text-[#8fa49d]',
      atividades: [
        'Poda (esqueletamento, decote ou recepa conforme manejo adotado)',
        'Avaliação de replantio ou renovação de área improdutiva',
        'Adubação pós-colheita rica em fósforo e potássio',
        'Avaliação de doenças após colheita',
        'Atualização dos registros técnicos da propriedade'
      ]
    },
    {
      nome: 'Julho',
      icon: Leaf,
      color: 'bg-[#8fa49d]/10 border-[#8fa49d]/30',
      iconColor: 'text-[#8fa49d]',
      atividades: [
        'Correção de solo com calcário ou gesso, se necessário',
        'Aplicação de micronutrientes como boro e zinco',
        'Manutenção geral dos equipamentos',
        'Avaliação da produtividade comparada à estimativa',
        'Planejamento da próxima safra'
      ]
    },
    {
      nome: 'Agosto',
      icon: Thermometer,
      color: 'bg-[#397738]/10 border-[#397738]/30',
      iconColor: 'text-[#397738]',
      atividades: [
        'Monitoramento de geadas em regiões de altitude',
        'Aplicação de adubos foliares com micronutrientes',
        'Controle de ervas daninhas nas entrelinhas',
        'Revisão do sistema de irrigação',
        'Análise de custos da safra anterior'
      ]
    },
    {
      nome: 'Setembro',
      icon: Sprout,
      color: 'bg-[#86b646]/10 border-[#86b646]/30',
      iconColor: 'text-[#86b646]',
      atividades: [
        'Início do período chuvoso: monitoramento de drenagem',
        'Florada principal: cuidados especiais com irrigação',
        'Aplicação de boro para melhorar a florada',
        'Controle preventivo de antracnose',
        'Planejamento de adubação para formação dos frutos'
      ]
    },
    {
      nome: 'Outubro',
      icon: Coffee,
      color: 'bg-[#8fa49d]/10 border-[#8fa49d]/30',
      iconColor: 'text-[#8fa49d]',
      atividades: [
        'Formação dos frutos: adubação com nitrogênio',
        'Monitoramento de pragas emergentes com as chuvas',
        'Controle de cercospora e ferrugem',
        'Aplicação de fungicidas preventivos',
        'Avaliação do pegamento da florada'
      ]
    },
    {
      nome: 'Novembro',
      icon: Shield,
      color: 'bg-[#397738]/10 border-[#397738]/30',
      iconColor: 'text-[#397738]',
      atividades: [
        'Desenvolvimento dos frutos: adubação balanceada',
        'Intensificação do controle de bicho-mineiro',
        'Monitoramento de ácaros e cochonilhas',
        'Aplicação de inseticidas seletivos',
        'Controle de plantas invasoras'
      ]
    },
    {
      nome: 'Dezembro',
      icon: AlertTriangle,
      color: 'bg-[#86b646]/10 border-[#86b646]/30',
      iconColor: 'text-[#86b646]',
      atividades: [
        'Crescimento dos frutos: cuidados com estresse hídrico',
        'Controle rigoroso de ferrugem do cafeeiro',
        'Monitoramento de broca-do-café',
        'Aplicação de fungicidas sistêmicos',
        'Preparação para o período de granação'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Nota PRO */}
        <div className="bg-[#86b646]/10 border border-[#86b646]/30 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-[#86b646] rounded-full"></div>
            <span className="text-sm font-medium text-[#092f20]">Calendário Demonstrativo</span>
          </div>
          <p className="text-sm text-[#397738] mt-1">
            O calendário apresentado é um modelo genérico. No plano PRO, você terá um calendário 
            personalizado para sua região e variedades, com lembretes automáticos via WhatsApp.
          </p>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#092f20]">Planejamento Técnico</h2>
              <p className="text-sm text-gray-600">Calendário Agrícola Anual - Café Arábica</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[#397738]">Regiões Produtoras</p>
            <p className="text-xs text-gray-500">Sul de Minas • Cerrado Mineiro • Mogiana</p>
          </div>
        </div>
        
        <div className="bg-[#8fa49d]/10 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Coffee className="w-5 h-5 text-[#397738]" />
            <span className="font-medium text-[#092f20]">Safra 2024/25</span>
          </div>
          <p className="text-sm text-[#397738]">
            Calendário especializado para manejo sustentável do café arábica, 
            adaptado às condições climáticas e técnicas das principais regiões produtoras.
          </p>
        </div>
      </div>

      {/* Calendário em Grade */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {meses.map((mes, index) => (
          <div 
            key={index} 
            className={`bg-white rounded-xl shadow-sm border-2 ${mes.color} p-4 md:p-6 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#092f20]">{mes.nome}</h3>
              <mes.icon className={`w-6 h-6 ${mes.iconColor}`} />
            </div>
            
            <div className="space-y-3">
              {mes.atividades.map((atividade, atividadeIndex) => (
                <div key={atividadeIndex} className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-[#397738] rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700 leading-relaxed">{atividade}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé com informações adicionais */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#86b646]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Coffee className="w-6 h-6 text-[#86b646]" />
            </div>
            <h4 className="font-semibold text-[#092f20] mb-2">Manejo Integrado</h4>
            <p className="text-sm text-gray-600">
              Práticas sustentáveis que consideram aspectos técnicos, econômicos e ambientais
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-[#397738]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-[#397738]" />
            </div>
            <h4 className="font-semibold text-[#092f20] mb-2">Controle Preventivo</h4>
            <p className="text-sm text-gray-600">
              Monitoramento constante para prevenção de pragas e doenças
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-[#8fa49d]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-[#8fa49d]" />
            </div>
            <h4 className="font-semibold text-[#092f20] mb-2">Produtividade</h4>
            <p className="text-sm text-gray-600">
              Otimização dos recursos para máxima eficiência produtiva
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}