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
  LandPlot
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose?: () => void;
}

const menuItems = [
  { id: 'dashboard', icon: Home, label: 'Dashboard', description: 'Visão geral' },
  { id: 'financeiro', icon: DollarSign, label: 'Financeiro', description: 'Fluxo de caixa' },
  { id: 'manejo-agricola', icon: Sprout, label: 'Manejo Agrícola', description: 'Atividades técnicas' },
  { id: 'custo-safra', icon: Calculator, label: 'Custo Safra', description: 'Análise de custos' },
  { id: 'minha-fazenda', icon: LandPlot, label: 'Minha Fazenda', description: 'Detalhes dos talhões'},
  { id: 'estoque', icon: Package, label: 'Estoque', description: 'Controle de insumos' },
  { id: 'maquinas', icon: Settings, label: 'Máquinas e Equipamentos', description: 'Controle de máquinas' },
  { id: 'estoque-cafe', icon: Coffee, label: 'Estoque de Café', description: 'Armazenamento' },
  { id: 'vendas', icon: TrendingUp, label: 'Vendas', description: 'Simulador e histórico' },
  { id: 'agenda', icon: Calendar, label: 'Agenda', description: 'Atividades técnicas' },
  { id: 'configuracoes', icon: Settings, label: 'Configurações', description: 'Privacidade e dados' }
];

export default function Sidebar({ activeTab, setActiveTab, onClose }: SidebarProps) {
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  return (
    <div className="w-72 bg-[#004417] shadow-lg h-full flex flex-col">
      <div className="p-4 md:p-6 border-b border-gray-200 relative">
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:hidden p-1 text-gray-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center space-x-3">
          <img 
            src="/LOGO-ZE.png" 
            alt="ZÉ DA SAFRA" 
            className="w-10 h-10 object-contain rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <div className="w-10 h-10 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-full flex items-center justify-center hidden">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">ZÉ DA SAFRA</h2>
            <p className="text-sm text-[#cadb2a]">Painel da Fazenda</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {menuItems.map((item, index) => {
          const isHighlighted = index < 7;
          const textColor = isHighlighted 
            ? (activeTab === item.id ? 'text-white' : 'text-[#cadb2a]') 
            : (activeTab === item.id ? 'text-white' : 'text-gray-300');
          const descriptionColor = isHighlighted
            ? (activeTab === item.id ? 'text-gray-200' : 'text-[#cadb2a]/80')
            : (activeTab === item.id ? 'text-gray-200' : 'text-gray-400');
    
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group opacity-100 hover:bg-[#397738]/20 hover:text-white ${
                activeTab === item.id 
                  ? 'bg-[#86b646]/20 border-l-4 border-[#86b646] text-white' 
                  : `${textColor}`
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-[#cadb2a]' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className={`font-medium text-sm md:text-base ${textColor}`}>{item.label}</div>
                  <div className={`text-xs ${descriptionColor}`}>{item.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
