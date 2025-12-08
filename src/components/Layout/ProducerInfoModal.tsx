import React from 'react';
import { Phone, MapPin, Coffee, Calendar, User as UserIcon } from 'lucide-react';
import InfoModal from '../Dashboard/InfoModal';
import { Usuario } from '../../lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: Usuario | null;
}

export default function ProducerInfoModal({ isOpen, onClose, user }: Props) {
  // Link de suporte humano fornecido pelo usuário
  const waLink = 'https://api.whatsapp.com/send?phone=5511914112288&text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20o%20time%20humano%20do%20Z%C3%A9!';

  return (
    <InfoModal
      isOpen={isOpen}
      onClose={onClose}
      title={user?.nome || 'Produtor'}
      icon={UserIcon}
      iconColor="text-[#86b646]"
      showFooter={false}
      showHeader={false}
      contentClassName="pt-2 px-4 pb-4"
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#86b646] to-[#397738] rounded-full flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#004417]">{user?.nome || 'Usuário'}</h3>
            <p className="text-sm text-[#004417]/70">Produtor(a) Rural</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {user?.telefone && (
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-[#397738]" />
              <div>
                <p className="text-sm text-[#004417]/70">Telefone</p>
                <p className="font-medium text-[#004417]">{user.telefone}</p>
              </div>
            </div>
          )}

          {(user?.cidade || user?.estado) && (
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-[#397738]" />
              <div>
                <p className="text-sm text-[#004417]/70">Localização</p>
                <p className="font-medium text-[#004417]">{user?.cidade}{user?.cidade && user?.estado ? ', ' : ''}{user?.estado}</p>
              </div>
            </div>
          )}

          {user?.cultura && (
            <div className="flex items-center space-x-3">
              <Coffee className="w-5 h-5 text-[#397738]" />
              <div>
                <p className="text-sm text-[#004417]/70">Cultura Principal</p>
                <p className="font-medium text-[#004417]">{user.cultura}</p>
              </div>
            </div>
          )}

          {user?.tamanho_area && (
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-[#397738]" />
              <div>
                <p className="text-sm text-[#004417]/70">Área Total</p>
                <p className="font-medium text-[#004417]">{user.tamanho_area}</p>
              </div>
            </div>
          )}
        </div>

        {user?.data_registro && (
          <div className="pt-2 border-t border-[rgba(0,68,23,0.06)]">
            <p className="text-xs text-[#004417]/70">Cadastrado em {new Date(user.data_registro).toLocaleDateString('pt-BR')}</p>
          </div>
        )}

        <div className="pt-4 flex justify-center">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir WhatsApp de Suporte"
            className="inline-block"
          >
            <img src="/35.png" alt="Atendimento Solos.ag" className="h-12 w-auto block" />
          </a>
        </div>
      </div>
    </InfoModal>
  );
}
