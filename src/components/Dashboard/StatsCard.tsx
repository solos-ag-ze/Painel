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
    positive: 'text-[#00A651] bg-[rgba(0,166,81,0.08)]',
    negative: 'text-[#F7941F] bg-[rgba(247,148,31,0.08)]',
    neutral: 'text-[#004417]/70 bg-[rgba(0,166,81,0.06)]'
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-card p-6 relative transition-transform duration-200 hover:scale-[1.01]">
        <div className="absolute top-5 right-5 w-10 h-10 bg-[rgba(0,166,81,0.06)] rounded-md flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#004417]/90" />
        </div>
        
        {modalContent && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute top-5 right-[72px] p-1 hover:bg-[rgba(0,166,81,0.06)] rounded-full transition-colors group z-10"
          aria-label="Mais informações"
        >
          <Info 
            size={14} 
            className="text-[#004417]/60 group-hover:text-[#00A651] transition-colors" 
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
        showFooter={false}
      >
        {modalContent ? modalContent : (
          <div className="space-y-3">
            <div className="text-[#004417]/80">
              {typeof subtitle === 'string' ? (
                <p>{subtitle}</p>
              ) : (
                <div>{subtitle}</div>
              )}
            </div>

            <div className="bg-white p-3 rounded-lg shadow-[0_1px_4px_rgba(0,68,23,0.04)]">
              <h4 className="text-sm font-medium text-[#004417] mb-1">
                Valor Atual:
              </h4>
              <p className="text-lg font-bold text-[#004417]">
                {value}
              </p>
              {change && (
                <p className={`text-sm mt-1 text-[#004417]/70`}>
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