import React, { useState } from 'react';
import { 
  Home, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Calendar, 
  Settings,
  Coffee,
  ChevronRight,
  X,
  Sprout,
  Calculator,
  LandPlot,
  BarChart3,
  FileText,
  Folder,
  Bug,
  TrendingDown
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose?: () => void;
}

const menuItems = [
  { id: 'dashboard', icon: Home, label: 'Dashboard', description: 'Visão geral' },
  { id: 'financeiro', icon: DollarSign, label: 'Financeiro', description: 'Fluxo de caixa' },
  { id: 'dividas-financiamentos', icon: FileText, label: 'Dívidas e Financiamentos', description: 'Gestão de dívidas' },
  { id: 'custo-safra', icon: Calculator, label: 'Custo Safra', description: 'Análise de custos' },
  { id: 'custo-por-talhao', icon: BarChart3, label: 'Custo por Talhão', description: 'Competência por Área' },
  { id: 'dre', icon: TrendingDown, label: 'Resultados da Operação (DRE)', description: 'DRE da Fazenda' },
  { id: 'manejo-agricola', icon: Sprout, label: 'Manejo Agrícola', description: 'Atividades técnicas' },
  { id: 'pragas-doencas', icon: Bug, label: 'Pragas e Doenças', description: 'Ocorrências de pragas' },
  { id: 'minha-fazenda', icon: LandPlot, label: 'Minha Fazenda', description: 'Detalhes dos talhões'},
  { id: 'documentos', icon: Folder, label: 'Documentos', description: 'Gestão de arquivos' },
  { id: 'estoque', icon: Package, label: 'Estoque', description: 'Controle de insumos' },
  { id: 'maquinas', icon: Settings, label: 'Máquinas e Equipamentos', description: 'Controle de máquinas' },
  // { id: 'estoque-cafe', icon: Coffee, label: 'Estoque de Café', description: 'Armazenamento' },
  // { id: 'vendas', icon: TrendingUp, label: 'Vendas', description: 'Simulador e histórico' },
  // { id: 'agenda', icon: Calendar, label: 'Agenda', description: 'Atividades técnicas' },
  // { id: 'configuracoes', icon: Settings, label: 'Configurações', description: 'Privacidade e dados' }
];

export default function Sidebar({ activeTab, setActiveTab, onClose }: SidebarProps) {
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  return (
    <div className="fixed top-0 left-0 w-72 bg-[#004417] shadow-lg h-full flex flex-col font-nunito z-30">
      <div className="pt-4 pb-2 px-4 relative">
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:hidden p-1 text-[rgba(255,255,255,0.85)] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-start justify-center">
          <img src="/21.png" alt="solos.ag" className="h-8 w-auto object-contain mx-auto" />
        </div>
      </div>
      
      <nav className="px-4 py-3 space-y-2 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center justify-between py-[14px] px-[16px] transition-all duration-200 group ${
                active
                  ? 'bg-[#003015] text-white rounded-[8px]'
                  : 'text-[rgba(255,255,255,0.85)] hover:bg-[rgba(255,255,255,0.08)] rounded-[8px]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className={`w-[18px] h-[18px] ${active ? 'text-[#00A651]' : 'text-[rgba(255,255,255,0.7)]'}`} />
                <div className="text-left">
                  <div className={`font-medium text-[15px] ${active ? 'text-white' : 'text-[rgba(255,255,255,0.85)]'}`}>{item.label}</div>
                  <div className={`text-xs ${active ? 'text-white/80' : 'text-[rgba(255,255,255,0.7)]'}`}>{item.description}</div>
                </div>
              </div>
              <ChevronRight className={`w-[14px] h-[14px] ${active ? 'text-[#00A651]' : 'text-[rgba(255,255,255,0.7)]'}`} />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
