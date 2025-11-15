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

  const changeTypeClasses = {
    positive: 'text-[#00A651] bg-[#00A651]/10',
    negative: 'text-[#F7941F] bg-[#F7941F]/10',
    neutral: 'text-[#004417]/65 bg-gray-100'
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[rgba(0,68,23,0.08)] p-5 relative transition-transform duration-200 hover:scale-[1.01]">
        <div className="absolute top-5 right-5 w-10 h-10 bg-[#00A651]/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#00A651]" />
        </div>
        
        {modalContent && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="absolute top-5 right-[72px] p-1 hover:bg-gray-100 rounded-full transition-colors group z-10"
            aria-label="Mais informações"
          >
            <Info 
              size={14} 
              className="text-gray-400 group-hover:text-[#00A651] transition-colors" 
            />
          </button>
        )}
        
        <div className="pr-16">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-sm font-semibold text-[#004417] leading-tight flex-1">
              {title}
            </h3>
          </div>
          
          {subtitle && (
            <div className="text-xs text-[#004417]/65 mb-3 leading-tight">
              {subtitle}
            </div>
          )}
          
          <div className="mb-2">
            {typeof value === 'string' ? (
              <span className="text-base md:text-lg font-bold text-[#004417] leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {value}
              </span>
            ) : (
              value
            )}
          </div>
          
          {change && (
            <div className={`text-xs px-2 py-1 rounded-md inline-block ${changeTypeClasses[changeType] || changeTypeClasses.neutral} leading-tight font-medium`}>
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