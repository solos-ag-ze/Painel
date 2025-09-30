import React from 'react';
import { User, MapPin, Coffee, Calendar, Phone } from 'lucide-react';
import { Usuario } from '../../lib/supabase';

interface UserProfileProps {
  user: Usuario;
}

export default function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#092f20]">{user?.nome || 'Usuário'}</h2>
          <p className="text-sm text-gray-600">Produtor(a) Rural</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {user.telefone && (
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-[#397738]" />
            <div>
              <p className="text-sm text-gray-600">Telefone</p>
              <p className="font-medium text-[#092f20]">{user.telefone}</p>
            </div>
          </div>
        )}

        {(user.cidade || user.estado) && (
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-[#397738]" />
            <div>
              <p className="text-sm text-gray-600">Localização</p>
              <p className="font-medium text-[#092f20]">
                {user.cidade}{user.cidade && user.estado ? ', ' : ''}{user.estado}
              </p>
            </div>
          </div>
        )}

        {user.cultura && (
          <div className="flex items-center space-x-3">
            <Coffee className="w-5 h-5 text-[#397738]" />
            <div>
              <p className="text-sm text-gray-600">Cultura Principal</p>
              <p className="font-medium text-[#092f20]">{user.cultura}</p>
            </div>
          </div>
        )}

        {user.tamanho_area && (
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-[#397738]" />
            <div>
              <p className="text-sm text-gray-600">Área Total</p>
              <p className="font-medium text-[#092f20]">{user.tamanho_area}</p>
            </div>
          </div>
        )}
      </div>

      {user.data_registro && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Cadastrado em {new Date(user.data_registro).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
}