import React, { useState, useEffect } from 'react';
import { User, Menu, Code, Wifi } from 'lucide-react';
import ProducerInfoModal from './ProducerInfoModal';
import { Usuario } from '../../lib/supabase';
import { AuthService } from '../../services/authService';
import { UserService } from '../../services/userService';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
  user: { nome: string } | null; // Mantém para compatibilidade, mas será substituído
  onLogout: () => void;
}

const isDevelopment = import.meta.env.MODE === 'development' ||
                      import.meta.env.DEV === true ||
                      import.meta.env.VITE_ZE_AMBIENTE === 'development';

export default function Header({ onMenuClick, sidebarOpen, user: _user, onLogout: _onLogout }: HeaderProps) {
  const [userData, setUserData] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [isProducerModalOpen, setIsProducerModalOpen] = useState(false);

  useEffect(() => {
    loadUserData();
    // Exibe menu flutuante só quando header não está visível
    const handleScroll = () => {
      const header = document.querySelector('header');
      if (!header) return;
      const rect = header.getBoundingClientRect();
      setShowFloatingMenu(rect.bottom < 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadUserData = async () => {
    try {
      const authService = AuthService.getInstance();
      const currentUser = authService.getCurrentUser();
      
      if (currentUser) {
        const userFromDb = await UserService.getUserById(currentUser.user_id);
        if (userFromDb) {
          setUserData(userFromDb);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário no header:', error);
    } finally {
      setLoading(false);
    }
  };

  // Usa dados do Supabase se disponível, senão usa o fallback do prop
  const displayName = userData?.nome || (_user as any)?.nome || 'Usuário';
  // Mostrar apenas o primeiro nome (ex: 'Gabriel Carvalho' -> 'Gabriel')
  const firstName = displayName ? String(displayName).trim().split(/\s+/)[0] : 'Usuário';

  return (
    <header className="bg-white shadow-sm border-b-2 border-[rgba(0,68,23,0.12)] px-6 h-[72px] flex items-center">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          {/* Botão menu hamburguer flutuante (mobile) */}
          <button
            onClick={onMenuClick}
            className={`md:hidden p-3 bg-white/10 hover:bg-white/80 active:bg-white/90 shadow-lg border border-gray-200/30 text-[#004417] hover:text-[#00A651] rounded-full transition-all duration-200 backdrop-blur-sm ${showFloatingMenu ? 'fixed left-4 top-4 z-50' : ''}`}
            style={showFloatingMenu ? { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' } : {}}
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Avatar (moved to left) */}
          <button
            onClick={() => setIsProducerModalOpen(true)}
            aria-label="Abrir informações do produtor"
            className="w-9 h-9 bg-[#004417] rounded-full flex items-center justify-center"
          >
            <User className="w-5 h-5 text-white" />
          </button>

          <div>
            <h1 className="text-lg md:text-2xl font-bold text-[#004417]">
              Bom dia, {firstName}!
            </h1>
            <div className="flex items-center space-x-2 text-[#00A651] mt-1">
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">WhatsApp conectado</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isDevelopment && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Code className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">MODO DEV</span>
            </div>
          )}



          {/* Botão Zé (oculto em mobile ≤1024px) - abre WhatsApp */}
          <div className="hidden lg:block px-2 py-1 shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg">
            <a
              href="https://api.whatsapp.com/send?phone=5511914112288&text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20o%20time%20humano%20do%20Z%C3%A9!"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir chat com o Zé no WhatsApp"
              className="inline-block"
            >
              <img src="/34.png" alt="o Zé" className="h-12 w-auto block" />
            </a>
          </div>

          
        </div>
      </div>

      {/* Producer info modal */}
      <ProducerInfoModal
        isOpen={isProducerModalOpen}
        onClose={() => setIsProducerModalOpen(false)}
        user={userData}
      />
    </header>
  );
}