import React, { useState, useEffect } from 'react';
import { User, Bell, MessageSquare, Wifi, Menu, LogOut, Code } from 'lucide-react';
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

export default function Header({ onMenuClick, sidebarOpen, user, onLogout }: HeaderProps) {
  const [userData, setUserData] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
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
  const displayName = userData?.nome || user?.nome || 'Usuário';

  return (
    <header className="bg-white shadow-sm border-b-2 border-[rgba(0,68,23,0.12)] px-6 h-[72px] flex items-center">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-[#004417]">
              Bom dia, {displayName}!
            </h1>
            <p className="text-xs md:text-sm text-[#004417]/65">Safra 2025/26</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isDevelopment && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Code className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">MODO DEV</span>
            </div>
          )}

          {/* WhatsApp conectado */}
          <div className="flex items-center space-x-2 text-[#00A651]">
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">WhatsApp conectado</span>
          </div>

          {/* Logo Zé (oculto em mobile ≤1024px) */}
          <div className="hidden lg:block px-2 py-1 shadow-[0_4px_10px_rgba(0,0,0,0.05)] rounded-lg">
            <span className="text-sm font-bold text-[#004417]">Zé — a IA da Solos.ag</span>
          </div>

          {/* Avatar */}
          <div className="w-9 h-9 bg-[#004417] rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}