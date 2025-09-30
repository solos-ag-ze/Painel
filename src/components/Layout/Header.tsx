import React, { useState, useEffect } from 'react';
import { User, Bell, MessageSquare, Wifi, Menu, LogOut } from 'lucide-react';
import { Usuario } from '../../lib/supabase';
import { AuthService } from '../../services/authService';
import { UserService } from '../../services/userService';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
  user: { nome: string } | null; // Mantém para compatibilidade, mas será substituído
  onLogout: () => void;
}

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
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-[#092f20]">
              Bom dia, {displayName}!
            </h1>
            <p className="text-xs md:text-sm text-gray-600">Safra 2025/26</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-[#397738]">
            <Wifi className="w-4 h-4" />
            <span className="text-xs md:text-sm font-medium">WhatsApp conectado</span>
          </div>
          
         
          
          <div className="flex items-center space-x-1 md:space-x-3 pl-2 md:pl-4 border-l border-gray-200">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-[#092f20] to-[#397738] rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs md:text-sm font-medium text-[#092f20]">{displayName}</p>
              <p className="text-xs text-gray-500">Produtor(a) Rural</p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}