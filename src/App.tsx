// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Coffee } from 'lucide-react';
import { AuthService } from './services/authService';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import DashboardOverview from './components/Dashboard/DashboardOverview';
import FinanceiroPanel from './components/Financeiro/FinanceiroPanel';
import CustoSafraPanel from './components/CustoSafra/CustoSafraPanel';
import CustoPorTalhaoPanel from './components/CustoPorTalhao/CustoPorTalhaoPanel';
import ManejoAgricolaPanel from './components/ManejoAgricola/ManejoAgricolaPanel';
import MinhaFazendaPanel from './components/MinhaFazenda/MinhaFazendaPanel';
import SimuladorVendaPanel from './components/SimuladorVenda/SimuladorVendaPanel';
import EstoqueCafePanel from './components/EstoqueCafe/EstoqueCafePanel';
import EstoquePanel from './components/Estoque/EstoquePanel';
import VendasPanel from './components/Vendas/VendasPanel';
import PlanejamentoTecnicoPanel from './components/PlanejamentoTecnico/PlanejamentoTecnicoPanel';
import AgendaTecnicaPanel from './components/AgendaTecnica/AgendaTecnicaPanel';
import MaquinasEquipamentosPanel from './components/MaquinasEquipamentos/MaquinasEquipamentosPanel';

const authService = AuthService.getInstance();

function App() {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    user: { user_id: string; nome: string } | null;
  }>({
    isAuthenticated: false,
    user: null,
  });

  // 🔑 Captura token da URL e salva no localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("ze_safra_token", token);
      // Remove o token da URL sem recarregar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 🔑 Inicializa sessão
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await authService.init();
        if (user) {
          setAuthState({ isAuthenticated: true, user });
        } else {
          setAuthState({ isAuthenticated: false, user: null });
        }
      } catch (err) {
        console.error('Erro ao inicializar autenticação:', err);
        setAuthState({ isAuthenticated: false, user: null });
      }
    };

    initAuth();
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    setAuthState({ isAuthenticated: false, user: null });
    setActiveTab('dashboard');
    setSidebarOpen(false);
    window.location.href = '/';
  };

  const proTabs = ['custo-safra', 'planejamento', 'estoque', 'estoque-cafe', 'vendas', 'maquinas'];
  const isProTab = proTabs.includes(activeTab);

  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-full flex items-center justify-center mx-auto mb-6">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#092f20] mb-4">Acesso Restrito</h1>
          <p className="text-gray-600 mb-6">
            Para acessar o painel do Zé, você precisa de um link de acesso válido.
          </p>
          <div className="bg-[#86b646]/10 p-4 rounded-lg">
            <p className="text-sm text-[#397738]">
              <strong>Como acessar:</strong> Envie a palavra "PAINEL" no WhatsApp do ZÉ para receber seu link personalizado de acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'financeiro':
        return <FinanceiroPanel />;
      case 'custo-safra':
        return <CustoSafraPanel />;
      case 'custo-por-talhao':
        return <CustoPorTalhaoPanel />;
      case 'manejo-agricola':
        return <ManejoAgricolaPanel />;
      case 'minha-fazenda':
        return <MinhaFazendaPanel />;
      case 'vendas':
        return <VendasPanel />;
      case 'estoque-cafe':
        return <EstoqueCafePanel />;
      case 'estoque':
        return <EstoquePanel />;
      case 'planejamento':
        return <PlanejamentoTecnicoPanel />;
      case 'agenda':
        return <AgendaTecnicaPanel />;
      case 'maquinas':
        return <MaquinasEquipamentosPanel />;
      case 'configuracoes':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-[#092f20] mb-4">Configurações</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento - Configurações de privacidade</p>
          </div>
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
      >
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
          user={authState.user}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">{renderContent()}</main>
      </div>
    </div>
  );
}

export default App;
