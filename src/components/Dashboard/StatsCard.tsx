import React, { useState } from 'react';
import { Info } from 'lucide-react';
import InfoModal from './InfoModal';

const StatsCard = ({ 
  title, 
  subtitle, 
  value, 
  change, 
  changeType = 'neutral', 
  icon: Icon,
  color = 'blue',
  modalContent
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const colorClasses = {
    green: {
      bg: 'bg-[#397738]/10',
      icon: 'text-[#397738]',
      iconBg: 'bg-[#397738]'
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      iconBg: 'bg-orange-600'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      iconBg: 'bg-red-600'
    },
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-600'
    }
  };

  const changeTypeClasses = {
    positive: 'text-[#397738] bg-[#397738]/10',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-gray-600 bg-gray-100'
  };

  const currentColor = colorClasses.green;

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 relative">
        <div className={`absolute top-4 right-4 w-10 h-10 ${currentColor.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        
        {modalContent && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="absolute top-4 right-16 p-1 hover:bg-gray-100 rounded-full transition-colors group z-10"
            aria-label="Mais informações"
          >
            <Info 
              size={14} 
              className="text-gray-400 group-hover:text-gray-600 transition-colors" 
            />
          </button>
        )}
        
        <div className="pr-16">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 leading-tight flex-1">
              {title}
            </h3>
          </div>
          
          {subtitle && (
            <div className="text-xs text-gray-600 mb-3 leading-tight">
              {subtitle}
            </div>
          )}
          
          <div className="mb-2">
            {typeof value === 'string' ? (
              <span className="text-sm md:text-base font-semibold text-gray-900 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {value}
              </span>
            ) : (
              value
            )}
          </div>
          
          {change && (
            <div className={`text-xs px-2 py-1 rounded-md inline-block ${changeTypeClasses[changeType] || changeTypeClasses.neutral} leading-tight`}>
              {change}
            </div>
          )}
        </div>
      </div>

      <InfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
        icon={Icon}
        iconColor="text-[#86b646]"
      >
        {modalContent ? modalContent : (
          <div className="space-y-3">
            <div className="text-gray-700">
              {typeof subtitle === 'string' ? (
                <p>{subtitle}</p>
              ) : (
                <div>{subtitle}</div>
              )}
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                Valor Atual:
              </h4>
              <p className="text-lg font-bold text-gray-800">
                {value}
              </p>
              {change && (
                <p className={`text-sm mt-1 ${(changeTypeClasses[changeType] || changeTypeClasses.neutral).split(' ')[0]}`}>
                  {change}
                </p>
              )}
            </div>
          </div>
        )}
      </InfoModal>
    </>
  );
};

export default StatsCard;